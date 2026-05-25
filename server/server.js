import http from "node:http";
import crypto from "node:crypto";
import { WebSocketServer } from "ws";
import { applyMove, fallbackAnalysis, passTurn, sortHand, startGame, summarizeForAI } from "./engine.js";

const port = Number(process.env.PORT || 8787);
const roomTtlMs = Number(process.env.ROOM_TTL_MS || 1000 * 60 * 90);
const cleanupEveryMs = Number(process.env.CLEANUP_EVERY_MS || 1000 * 60 * 5);
const openAiKey = process.env.OPENAI_API_KEY;
const rooms = new Map();
const clients = new Map();

function id(prefix = "") {
  return `${prefix}${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

function roomCode() {
  let code = id("").slice(0, 6);
  while (rooms.has(code)) code = id("").slice(0, 6);
  return code;
}

function safeText(value, max = 80) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function send(ws, type, payload = {}) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...payload }));
}

function event(room, text) {
  const payload = { id: id("E"), text, at: Date.now() };
  room.history.push(payload);
  room.history = room.history.slice(-60);
  broadcast(room);
  broadcastEvent(room, payload);
}

function broadcastEvent(room, payload) {
  room.players.forEach((player) => {
    const ws = clients.get(player.socketId);
    if (ws) send(ws, "event", { payload });
  });
}

function playerSnapshot(room, player) {
  const rankingFor = (playerId) => room.rankings.find((ranking) => ranking.playerId === playerId)?.rank || null;
  return {
    roomCode: room.code,
    roomName: room.roomName,
    status: room.status,
    me: player.id,
    maxPlayers: room.maxPlayers,
    currentPlayerId: room.currentPlayerId,
    table: room.table,
    tablePlays: (room.tablePlays || []).map((play) => ({
      ...play,
      playerName: room.players.find((item) => item.id === play.playerId)?.name || "Player",
    })),
    hand: sortHand([...(room.hands[player.id] || [])]),
    players: room.players.map((item) => ({
      id: item.id,
      name: item.name,
      host: item.host,
      ready: item.ready,
      connected: Boolean(clients.get(item.socketId)),
      cardCount: room.hands[item.id]?.length || 0,
      rank: rankingFor(item.id),
    })),
    chat: room.chat.slice(-40),
    history: room.history.slice(-40),
  };
}

function broadcast(room) {
  room.lastActiveAt = Date.now();
  room.players.forEach((player) => {
    const ws = clients.get(player.socketId);
    if (ws) send(ws, "snapshot", { payload: playerSnapshot(room, player) });
  });
}

function findPlayer(ws) {
  for (const room of rooms.values()) {
    const player = room.players.find((item) => item.socketId === ws.clientId);
    if (player) return { room, player };
  }
  return {};
}

async function generateAIAnalysis(room) {
  if (!openAiKey) return fallbackAnalysis(room);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: "You analyze a finished card game called Doogi Central. Be fun, concise, strategic, and friendly. Never mention hidden cards during active gameplay because the game is over now.",
          },
          {
            role: "user",
            content: JSON.stringify(summarizeForAI(room)),
          },
        ],
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || fallbackAnalysis(room);
  } catch {
    return fallbackAnalysis(room);
  }
}

function createRoom(ws, payload) {
  const code = roomCode();
  const player = {
    id: id("P"),
    socketId: ws.clientId,
    name: safeText(payload.name || "Host"),
    ready: false,
    host: true,
  };
  const room = {
    code,
    roomName: safeText(payload.roomName || "Doogi Room"),
    password: safeText(payload.password || "", 60),
    maxPlayers: Math.min(6, Math.max(2, Number(payload.maxPlayers || 4))),
    turnTimer: Math.min(90, Math.max(20, Number(payload.turnTimer || 45))),
    status: "lobby",
    players: [player],
    hands: {},
    table: { combo: null, rank: null, rankValue: -1, cards: [], lastPlayerId: null },
    passes: new Set(),
    chat: [],
    history: [],
    moves: [],
    tablePlays: [],
    rankings: [],
    currentPlayerId: null,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
  rooms.set(code, room);
  send(ws, "room_created", { roomCode: code });
  broadcast(room);
}

function joinRoom(ws, payload) {
  const code = safeText(payload.roomCode || "").toUpperCase();
  const room = rooms.get(code);
  if (!room) return send(ws, "error", { message: "Room not found." });
  if (room.status !== "lobby") return send(ws, "error", { message: "Game already started." });
  if (room.password && room.password !== safeText(payload.password || "", 60)) return send(ws, "error", { message: "Incorrect room password." });
  if (room.players.length >= room.maxPlayers) return send(ws, "error", { message: "Room is full." });

  room.players.push({
    id: id("P"),
    socketId: ws.clientId,
    name: safeText(payload.name || "Player"),
    ready: false,
    host: false,
  });
  event(room, `${room.players.at(-1).name} joined the room.`);
  broadcast(room);
}

function handleMessage(ws, message) {
  const { type, payload = {} } = JSON.parse(message);
  const found = findPlayer(ws);

  if (type === "create_room") return createRoom(ws, payload);
  if (type === "join_room") return joinRoom(ws, payload);
  if (!found.room || !found.player) return send(ws, "error", { message: "Join or create a room first." });

  const { room, player } = found;
  if (type === "player_ready") {
    player.ready = !player.ready;
    event(room, `${player.name} is ${player.ready ? "ready" : "not ready"}.`);
  }

  if (type === "start_game") {
    if (!player.host) return send(ws, "error", { message: "Only host can start the game." });
    const result = startGame(room);
    if (!result.ok) return send(ws, "error", { message: result.message });
    event(room, "Game started.");
  }

  if (type === "play_cards") {
    const result = applyMove(room, player.id, payload.cardIds || []);
    if (!result.ok) return send(ws, "error", { message: result.message });
    event(room, `${player.name} played ${result.move.cards.map((card) => card.rank).join(", ")}.`);
    if (result.gameOver) {
      event(room, "Game over. Generating AI analysis.");
      generateAIAnalysis(room).then((analysis) => {
        room.players.forEach((item) => {
          const client = clients.get(item.socketId);
          if (client) send(client, "ai_analysis_ready", { analysis });
        });
      });
    }
  }

  if (type === "pass_turn") {
    const result = passTurn(room, player.id);
    if (!result.ok) return send(ws, "error", { message: result.message });
    event(room, `${player.name} passed.`);
    if (result.roundWinnerId) {
      const winner = room.players.find((item) => item.id === result.roundWinnerId);
      event(room, `${winner?.name || "Player"} won the round and starts fresh.`);
    }
  }

  if (type === "send_chat_message") {
    const messageText = safeText(payload.message, 180);
    if (!messageText) return;
    room.chat.push({ id: id("C"), name: player.name, message: messageText, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    room.chat = room.chat.slice(-50);
    broadcast(room);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: "/doogi-ws" });
wss.on("connection", (ws) => {
  ws.clientId = id("S");
  clients.set(ws.clientId, ws);
  send(ws, "welcome", { clientId: ws.clientId });
  ws.on("message", (message) => {
    try {
      handleMessage(ws, message.toString());
    } catch {
      send(ws, "error", { message: "Invalid realtime message." });
    }
  });
  ws.on("close", () => {
    clients.delete(ws.clientId);
    const { room, player } = findPlayer(ws);
    if (room && player) event(room, `${player.name} disconnected.`);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const activeSockets = room.players.some((player) => clients.has(player.socketId));
    if (!activeSockets || now - room.lastActiveAt > roomTtlMs) rooms.delete(code);
  }
}, cleanupEveryMs).unref();

server.listen(port, () => {
  console.log(`Doogi Central realtime server listening on ${port}`);
});

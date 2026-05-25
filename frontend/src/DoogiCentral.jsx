import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Crown,
  Gamepad2,
  Link as LinkIcon,
  Lock,
  MessageCircle,
  Play,
  Send,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import nexusLogo from "./assets/NexusSyncLogo.png";

const WS_URL =
  import.meta.env.VITE_DOOGI_WS_URL ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "ws://127.0.0.1:8787/doogi-ws"
    : "wss://doogicentralserver.onrender.com/doogi-ws");

const tutorialSlides = [
  {
    title: "Rank order",
    body: "Cards rank from 3 up to 2. Suits do not matter. 3 is weakest and 2 is strongest.",
    cards: ["3", "7", "J", "A", "2"],
  },
  {
    title: "Start a round",
    body: "The player with control can start with a single, pair, or triplet.",
    cards: ["8", "8", "8"],
  },
  {
    title: "Match the combo",
    body: "If the round starts with a pair, everyone must play a pair. Singles and triplets are not allowed.",
    cards: ["Q", "Q"],
  },
  {
    title: "Beat or pass",
    body: "You can play the same rank or a higher rank. If you cannot or do not want to play, pass.",
    cards: ["K", "A"],
  },
  {
    title: "Win control",
    body: "When all other active players pass, the last unbeaten player wins the round and starts fresh.",
    cards: ["A"],
  },
  {
    title: "Finish first",
    body: "The first player to empty their hand gets 1st place. The game continues until rankings are assigned.",
    cards: ["WIN"],
  },
];

const ranks = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const badWords = ["damn", "stupid", "idiot", "hate"];

function cleanChat(value) {
  return value
    .slice(0, 180)
    .replace(/[<>]/g, "")
    .split(/\s+/)
    .map((word) => (badWords.includes(word.toLowerCase()) ? "****" : word))
    .join(" ");
}

function cardLabel(card) {
  return typeof card === "string" ? card : card?.rank || "";
}

function cardKey(card) {
  return typeof card === "string" ? card : card?.id || card?.rank || "";
}

function useDoogiSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError("Realtime server is not connected. Check VITE_DOOGI_WS_URL or start the Doogi server.");
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "welcome") setClientId(message.clientId);
      if (message.type === "snapshot") setSnapshot(message.payload);
      if (message.type === "error") setError(message.message);
      if (message.type === "ai_analysis_ready") setAnalysis(message.analysis);
      if (message.type === "event") setEvents((items) => [message.payload, ...items].slice(0, 40));
    };

    return () => ws.close();
  }, []);

  const send = (type, payload = {}) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Realtime server is not connected yet.");
      return;
    }
    socketRef.current.send(JSON.stringify({ type, payload }));
  };

  return { connected, clientId, snapshot, error, setError, analysis, events, send };
}

const Card = memo(function Card({ card, selected, playable, onClick, small = false }) {
  const label = cardLabel(card);
  const isSpecial = label === "2" || label === "A";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      animate={{ y: selected ? -16 : 0 }}
      onClick={onClick}
      className={[
        "relative shrink-0 rounded-xl border font-black shadow-lg transition",
        small ? "h-16 w-11 text-lg" : "h-24 w-16 text-2xl sm:h-28 sm:w-20",
        selected ? "border-cyan-200 bg-cyan-100 text-slate-950 shadow-cyan-400/30" : "border-white/15 bg-white text-slate-950",
        playable ? "ring-2 ring-cyan-300/70" : "opacity-90",
      ].join(" ")}
    >
      <span className="absolute left-2 top-1 text-xs text-slate-500">DOOGI</span>
      <span className={isSpecial ? "text-cyan-700" : ""}>{label}</span>
    </motion.button>
  );
});

function Tutorial({ onClose }) {
  const [index, setIndex] = useState(0);
  const slide = tutorialSlides[index];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl rounded-3xl border border-cyan-300/30 bg-[#071421] p-5 shadow-2xl shadow-cyan-950/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">Quick Guide</p>
            <h2 className="mt-2 text-3xl font-black text-white">{slide.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 p-2 text-white"><X size={18} /></button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={slide.title} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="mt-6">
            <div className="flex min-h-28 items-center justify-center gap-3 rounded-2xl bg-black/30 p-4">
              {slide.cards.map((card) => (
                <Card key={card} card={card} small />
              ))}
            </div>
            <p className="mt-5 text-lg leading-8 text-gray-200">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => localStorage.setItem("doogi_tutorial_seen", "1") || onClose()} className="text-sm font-semibold text-gray-300 underline">
            Do not show again
          </button>
          <div className="flex gap-2">
            {tutorialSlides.map((item, i) => <span key={item.title} className={`h-2 w-8 rounded-full ${i === index ? "bg-cyan-300" : "bg-white/20"}`} />)}
          </div>
          <button
            type="button"
            onClick={() => (index === tutorialSlides.length - 1 ? onClose() : setIndex((i) => i + 1))}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-bold text-slate-950"
          >
            {index === tutorialSlides.length - 1 ? "Start Playing" : "Next"} <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Landing({ connected, onMode }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-sm font-semibold text-cyan-100">
          <Shield size={16} /> Server-authoritative realtime card play
        </div>
        <h1 className="mt-6 text-5xl font-black leading-tight text-white sm:text-7xl">
          Doogi <span className="text-cyan-300">Central</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
          Create private rooms, play singles, pairs, and triplets in realtime, chat live, and get a fun post-match AI strategy breakdown.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => onMode("create")} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-4 font-black text-slate-950 shadow-lg shadow-cyan-950/30">
            <Play size={18} /> Create Room
          </button>
          <button type="button" onClick={() => onMode("join")} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-4 font-black text-white">
            <Users size={18} /> Join Room
          </button>
        </div>
        <p className={`mt-5 text-sm ${connected ? "text-emerald-300" : "text-amber-300"}`}>
          {connected ? "Realtime server connected." : "Realtime server not connected. Start the Doogi WebSocket server for online rooms."}
        </p>
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-cyan-950/20">
        <div className="rounded-[1.5rem] bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-blue-500/20 p-5">
          <div className="flex items-center justify-between">
            <img src={nexusLogo} alt="NexusSync Solutions" className="h-14 rounded-xl bg-white p-2" />
            <Gamepad2 className="text-cyan-200" />
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {["7", "7", "Q", "Q", "Q", "2"].map((card, index) => (
              <motion.div key={`${card}-${index}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
                <Card card={card} small />
              </motion.div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-black/30 p-4">
            <h2 className="font-bold text-white">MVP rules</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">Singles, pairs, triplets. Equal or higher rank allowed. Last unbeaten player wins control.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoomForm({ mode, send }) {
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("Doogi Room");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [password, setPassword] = useState("");
  const [turnTimer, setTurnTimer] = useState(45);

  const submit = (event) => {
    event.preventDefault();
    if (mode === "create") send("create_room", { name, roomName, maxPlayers, password, turnTimer });
    if (mode === "join") send("join_room", { name, roomCode: roomCode.toUpperCase(), password });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl rounded-3xl border border-cyan-300/20 bg-white/[0.04] p-5 shadow-xl shadow-cyan-950/20">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">{mode === "create" ? "Create Room" : "Join Room"}</p>
      <h2 className="mt-2 text-3xl font-black text-white">{mode === "create" ? "Host a new Doogi table" : "Enter an existing room"}</h2>
      <div className="mt-6 grid gap-4">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your player name" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300" />
        {mode === "create" ? (
          <>
            <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room name" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300" />
            <label className="text-sm font-semibold text-gray-300">Players: {maxPlayers}</label>
            <input type="range" min="2" max="6" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
            <label className="text-sm font-semibold text-gray-300">Turn timer: {turnTimer}s</label>
            <input type="range" min="20" max="90" step="5" value={turnTimer} onChange={(e) => setTurnTimer(Number(e.target.value))} />
          </>
        ) : (
          <input required value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="Room code" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 uppercase text-white outline-none focus:border-cyan-300" />
        )}
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Optional room password" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300" />
      </div>
      <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-4 font-black text-slate-950">
        {mode === "create" ? "Create Room" : "Join Room"} <ArrowRight size={18} />
      </button>
    </form>
  );
}

function Lobby({ snapshot, send, onTutorial }) {
  const invite = `${window.location.origin}/doogicentral?room=${snapshot.roomCode}`;
  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-3xl border border-cyan-300/20 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Lobby</p>
            <h1 className="mt-2 text-4xl font-black text-white">{snapshot.roomName}</h1>
            <p className="mt-2 text-gray-300">Room code: <span className="font-black text-cyan-200">{snapshot.roomCode}</span></p>
          </div>
          <button type="button" onClick={() => navigator.clipboard?.writeText(invite)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm font-bold text-white">
            <Copy size={16} /> Copy Invite
          </button>
        </div>
        <div className="mt-6 grid gap-3">
          {snapshot.players.map((player, index) => (
            <div key={player.id} className="flex items-center justify-between rounded-2xl bg-black/25 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 font-black text-slate-950">{index + 1}</span>
                <div>
                  <p className="font-bold text-white">{player.name}</p>
                  <p className="text-xs text-gray-400">{player.ready ? "Ready" : "Waiting"}</p>
                </div>
              </div>
              {player.host && <Crown className="text-yellow-300" size={18} />}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => send("player_ready")} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 font-black text-slate-950"><Check size={18} /> Ready</button>
          <button type="button" onClick={() => send("start_game")} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-black text-slate-950"><Play size={18} /> Start Game</button>
          <button type="button" onClick={onTutorial} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 font-black text-white"><BookOpen size={18} /> Tutorial</button>
          <a href={invite} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 font-black text-white"><LinkIcon size={18} /> Invite Link</a>
        </div>
      </div>
    </section>
  );
}

function Chat({ messages = [], send }) {
  const [text, setText] = useState("");
  const submit = (event) => {
    event.preventDefault();
    const message = cleanChat(text);
    if (!message) return;
    send("send_chat_message", { message });
    setText("");
  };
  return (
    <aside className="rounded-3xl border border-white/10 bg-black/30 p-4">
      <h2 className="flex items-center gap-2 font-black text-white"><MessageCircle size={18} /> Live Chat</h2>
      <div className="mt-4 max-h-64 space-y-3 overflow-auto pr-1">
        {messages.slice(-30).map((message) => (
          <div key={message.id} className="rounded-2xl bg-white/5 p-3">
            <p className="text-xs text-cyan-200">{message.name} | {message.time}</p>
            <p className="mt-1 text-sm text-gray-200">{message.message}</p>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300" />
        <button type="submit" className="rounded-full bg-cyan-400 p-3 text-slate-950"><Send size={18} /></button>
      </form>
    </aside>
  );
}

function Game({ snapshot, send, analysis, onTutorial }) {
  const [selected, setSelected] = useState([]);
  const hand = snapshot.hand || [];
  const selectedCards = hand.filter((card) => selected.includes(cardKey(card)));
  const myTurn = snapshot.currentPlayerId === snapshot.me;
  const currentPlayer = snapshot.players.find((player) => player.id === snapshot.currentPlayerId);

  const playable = useMemo(() => {
    if (!myTurn) return new Set();
    if (!snapshot.table?.combo) return new Set(hand.map(cardKey));
    return new Set(hand.filter((card) => card.rankValue >= snapshot.table.rankValue).map(cardKey));
  }, [hand, myTurn, snapshot.table]);

  const toggle = (card) => {
    const key = cardKey(card);
    setSelected((items) => (items.includes(key) ? items.filter((item) => item !== key) : [...items, key]));
  };

  const play = () => {
    send("play_cards", { cardIds: selected });
    setSelected([]);
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 pt-4 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <div className="rounded-3xl border border-cyan-300/20 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Room {snapshot.roomCode}</p>
              <h1 className="text-2xl font-black text-white">{myTurn ? "Your turn" : `${currentPlayer?.name || "Player"} is thinking`}</h1>
            </div>
            <button type="button" onClick={onTutorial} className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white">Rules</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {snapshot.players.map((player) => (
              <div key={player.id} className={`rounded-2xl border p-3 ${player.id === snapshot.currentPlayerId ? "border-cyan-300 bg-cyan-400/10" : "border-white/10 bg-black/20"}`}>
                <p className="truncate font-bold text-white">{player.name}</p>
                <p className="text-sm text-gray-400">{player.cardCount} cards</p>
                {player.rank && <p className="mt-1 text-xs text-yellow-200">Rank #{player.rank}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-60 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/70 via-slate-950 to-cyan-950/60 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Table</p>
          <div className="mt-6 flex min-h-28 flex-wrap items-center justify-center gap-3">
            {(snapshot.table?.cards || []).length ? snapshot.table.cards.map((card) => <Card key={cardKey(card)} card={card} small />) : <p className="text-gray-300">Table is clear. Start any valid move.</p>}
          </div>
          <p className="mt-5 text-center text-sm text-gray-300">{snapshot.table?.combo ? `${snapshot.table.combo} | rank ${snapshot.table.rank}` : "Fresh round"}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black text-white">Your Hand</h2>
            <div className="flex gap-2">
              <button type="button" disabled={!myTurn} onClick={play} className="rounded-full bg-cyan-400 px-5 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Play</button>
              <button type="button" disabled={!myTurn} onClick={() => send("pass_turn")} className="rounded-full border border-white/15 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Pass</button>
            </div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-5 pt-3">
            {hand.map((card) => <Card key={cardKey(card)} card={card} selected={selected.includes(cardKey(card))} playable={playable.has(cardKey(card))} onClick={() => toggle(card)} />)}
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <Chat messages={snapshot.chat} send={send} />
        <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
          <h2 className="font-black text-white">Move History</h2>
          <div className="mt-4 max-h-56 space-y-2 overflow-auto">
            {(snapshot.history || []).slice(-20).reverse().map((item) => <p key={item.id} className="rounded-xl bg-white/5 p-2 text-sm text-gray-300">{item.text}</p>)}
          </div>
        </div>
        {snapshot.status === "finished" && (
          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
            <h2 className="flex items-center gap-2 font-black text-white"><Sparkles size={18} /> AI Analysis</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-200">{analysis || "Generating post-match analysis..."}</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default function DoogiCentral() {
  const { connected, snapshot, error, setError, analysis, send } = useDoogiSocket();
  const [mode, setMode] = useState("landing");
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    document.title = "Doogi Central | NexusSync Solutions";
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) setMode("join");
    if (!localStorage.getItem("doogi_tutorial_seen")) setShowTutorial(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#020711] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020711]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={nexusLogo} alt="NexusSync Solutions" className="h-11 rounded-xl bg-white p-1.5" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">NexusSync Games</p>
              <p className="font-black text-white">Doogi Central</p>
            </div>
          </div>
          <div className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:block ${connected ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
            {connected ? "Online" : "Server offline"}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-4xl px-4">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
            <p>{error}</p>
            <button type="button" onClick={() => setError("")}><X size={18} /></button>
          </div>
        </div>
      )}

      {!snapshot && mode === "landing" && <Landing connected={connected} onMode={setMode} />}
      {!snapshot && mode !== "landing" && <RoomForm mode={mode} send={send} />}
      {snapshot?.status === "lobby" && <Lobby snapshot={snapshot} send={send} onTutorial={() => setShowTutorial(true)} />}
      {snapshot && snapshot.status !== "lobby" && <Game snapshot={snapshot} send={send} analysis={analysis} onTutorial={() => setShowTutorial(true)} />}
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
}

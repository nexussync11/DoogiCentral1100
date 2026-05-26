import React, { memo, useEffect, useMemo, useRef, useState } from "react";
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
import uditaImage from "./assets/Udita.webp";

const WS_URL =
  import.meta.env.VITE_DOOGI_WS_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
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

const suitIcons = {
  S: "\u2660",
  H: "\u2665",
  D: "\u2666",
  C: "\u2663",
};

function suitIcon(card) {
  return typeof card === "string" ? "" : suitIcons[card?.suit] || "";
}

function isRedCard(card) {
  return card?.suit === "H" || card?.suit === "D";
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
    if (typeof WebSocket === "undefined") {
      setError("This browser does not support WebSockets.");
      return undefined;
    }

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError("Realtime server is not connected. Check VITE_DOOGI_WS_URL or start the Doogi server.");
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "welcome") setClientId(message.clientId);
        if (message.type === "snapshot") setSnapshot(message.payload);
        if (message.type === "error") setError(message.message);
        if (message.type === "ai_analysis_ready") setAnalysis(message.analysis);
        if (message.type === "event") setEvents((items) => [message.payload, ...items].slice(0, 40));
      } catch {
        setError("Realtime server sent an unreadable message.");
      }
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

function CardBack({ small = false, offset = 0 }) {
  return (
    <div
      className={[
        "card-back pointer-events-none relative shrink-0 rounded-xl border border-white/80 shadow-lg",
        small ? "h-16 w-11" : "h-28 w-20 sm:h-32 sm:w-24",
      ].join(" ")}
      style={{ transform: `translate(${offset}px, ${offset * -0.5}px)` }}
      aria-hidden="true"
    />
  );
}

const Card = memo(function Card({ card, selected, playable, onClick, onDragStart, onDragEnd, small = false, variant = "hand", draggable = false, index = 0 }) {
  const label = cardLabel(card);
  const suit = suitIcon(card);
  const red = isRedCard(card);
  const displaySuit = suit || (label === "WIN" ? "\u2605" : "\u2660");
  const sizeClass = small
    ? "h-16 w-11 text-base"
    : variant === "table"
      ? "h-28 w-20 text-2xl sm:h-36 sm:w-24"
      : "h-24 w-16 text-xl sm:h-28 sm:w-20 sm:text-2xl";
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 18, rotate: index % 2 ? 1.5 : -1.5 }}
      animate={{ opacity: 1, y: selected ? -18 : 0, rotate: selected ? 0 : index % 2 ? 1 : -1 }}
      transition={{ delay: small ? Math.min(index * 0.025, 0.2) : 0, type: "spring", stiffness: 520, damping: 36 }}
      whileTap={{ scale: 0.95 }}
      drag={draggable ? true : false}
      dragSnapToOrigin
      dragElastic={0.18}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={[
        "playing-card relative shrink-0 overflow-hidden rounded-xl border font-black shadow-lg transition touch-none",
        sizeClass,
        selected ? "border-cyan-200 bg-cyan-50 text-slate-950 shadow-cyan-400/30" : "border-slate-200 bg-white text-slate-950",
        playable ? "ring-2 ring-cyan-300/70" : "opacity-90",
      ].join(" ")}
    >
      <span className={`card-corner card-corner-top absolute left-1.5 top-1 flex flex-col items-center leading-none ${red ? "text-red-600" : "text-slate-950"}`}>
        <span className={`card-corner-rank ${small ? "text-[10px]" : "text-xs"}`}>{label}</span>
        <span className={`card-corner-suit ${small ? "text-[10px]" : "text-sm"}`}>{displaySuit}</span>
      </span>
      <span className={`card-corner card-corner-bottom absolute right-1.5 bottom-1 flex rotate-180 flex-col items-center leading-none ${red ? "text-red-600" : "text-slate-950"}`}>
        <span className={`card-corner-rank ${small ? "text-[10px]" : "text-xs"}`}>{label}</span>
        <span className={`card-corner-suit ${small ? "text-[10px]" : "text-sm"}`}>{displaySuit}</span>
      </span>
      <span className={`card-center grid h-full place-items-center ${red ? "text-red-600" : "text-slate-950"}`}>
        <span className="flex flex-col items-center leading-none">
          <span className={`card-center-suit ${small ? "text-lg" : "text-3xl sm:text-4xl"}`}>{displaySuit}</span>
          <span className={`card-center-rank ${small ? "mt-0.5 text-sm" : "mt-1 text-xl sm:text-2xl"}`}>{label}</span>
        </span>
      </span>
    </motion.button>
  );
});

function UditaDock() {
  return (
    <aside className="udita-dock fixed right-2 top-24 z-30 w-20 overflow-hidden rounded-2xl border border-amber-200/30 bg-black/70 shadow-2xl shadow-black/40 backdrop-blur md:right-4 md:top-auto md:bottom-4 md:w-28 md:rounded-3xl">
      <img src={uditaImage} alt="Udita game guide" className="h-24 w-full object-cover object-left-top md:h-32" />
      <div className="border-t border-amber-200/20 p-2 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-200 md:text-xs md:tracking-[0.16em]">Udita</p>
        <p className="mt-1 hidden text-[11px] font-semibold leading-4 text-amber-50 md:block">Game guide</p>
      </div>
    </aside>
  );
}

function DealAnimation({ players = [], onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  const targets = [
    { x: "-34vw", y: "-24vh", rotate: -18 },
    { x: "34vw", y: "-24vh", rotate: 18 },
    { x: "-36vw", y: "18vh", rotate: -12 },
    { x: "36vw", y: "18vh", rotate: 12 },
    { x: "-8vw", y: "30vh", rotate: -8 },
    { x: "8vw", y: "30vh", rotate: 8 },
  ];
  const count = Math.min(Math.max(players.length * 4, 8), 24);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden bg-black/30 backdrop-blur-[1px]">
      <div className="absolute left-1/2 top-1/2 h-24 w-20 -translate-x-1/2 -translate-y-1/2">
        <CardBack />
      </div>
      {Array.from({ length: count }).map((_, index) => {
        const target = targets[index % Math.max(players.length, 1)] || targets[0];
        return (
          <motion.div
            key={index}
            className="absolute left-1/2 top-1/2"
            initial={{ x: "-50%", y: "-50%", scale: 0.75, opacity: 0.95, rotate: 0 }}
            animate={{ x: target.x, y: target.y, scale: 0.42, opacity: 0, rotate: target.rotate }}
            transition={{ delay: index * 0.045, duration: 0.72, ease: "easeOut" }}
          >
            <CardBack />
          </motion.div>
        );
      })}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-amber-200/30 bg-black/70 px-5 py-3 text-sm font-black text-amber-100">
        Udita is dealing the cards...
      </div>
    </div>
  );
}

function FirstPlaceCelebration({ playerName, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4200);
    return () => clearTimeout(timer);
  }, [onDone]);

  const floaters = Array.from({ length: 34 }, (_, index) => ({
    id: index,
    icon: index % 3 === 0 ? "\uD83D\uDC8B" : index % 3 === 1 ? "\u2665" : "\uD83D\uDC96",
    left: 8 + ((index * 23) % 84),
    delay: (index % 10) * 0.12,
    drift: -30 + ((index * 17) % 60),
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <div className="absolute inset-0 bg-black/20" />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        className="winner-celebration-card absolute left-1/2 w-[min(92vw,520px)] -translate-x-1/2 overflow-hidden rounded-[2rem] border border-amber-200/40 bg-black/85 p-4 shadow-2xl shadow-amber-950/40 backdrop-blur"
      >
        <div className="flex items-center gap-4">
          <img src={uditaImage} alt="Udita celebrating" className="h-28 w-20 rounded-2xl object-cover object-left-top" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-200">Rank #1</p>
            <h2 className="mt-1 text-2xl font-black text-white">{playerName || "Winner"} wins first!</h2>
            <p className="mt-2 text-sm font-semibold text-amber-50">Udita sends kisses, hearts, and a champion salute.</p>
          </div>
        </div>
      </motion.div>
      {floaters.map((item) => (
        <motion.div
          key={item.id}
          className="absolute bottom-16 text-3xl"
          style={{ left: `${item.left}%` }}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.6, rotate: -12 }}
          animate={{ opacity: [0, 1, 1, 0], y: -520, x: item.drift, scale: [0.6, 1.25, 1], rotate: 18 }}
          transition={{ delay: item.delay, duration: 3.2, ease: "easeOut" }}
        >
          {item.icon}
        </motion.div>
      ))}
    </div>
  );
}

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
              {slide.cards.map((card, index) => (
                <Card key={card} card={card} small index={index} />
              ))}
            </div>
            <p className="mt-5 text-lg leading-8 text-gray-200">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => {
            try {
              localStorage.setItem("doogi_tutorial_seen", "1");
            } catch {
              // Private browsing can block storage. The tutorial still closes normally.
            }
            onClose();
          }} className="text-sm font-semibold text-gray-300 underline">
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
    <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-8 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-sm font-semibold text-cyan-100">
          <Shield size={16} /> Server-authoritative realtime card play
        </div>
        <h1 className="mt-6 text-5xl font-black leading-tight text-white sm:text-7xl">
          Doogi <span className="text-amber-200">Central</span>
        </h1>
        <p className="mt-3 text-xl font-semibold text-amber-100">Meet Udita, your game guide.</p>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
          Create private rooms, play singles, pairs, and triplets in realtime, chat live, and let Udita guide the table from first deal to final strategy breakdown.
        </p>
        <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
          {[
            ["\u2660", "Your game guide"],
            ["\u2665", "Always by your side"],
            ["\u2666", "Smart moves, smooth play"],
          ].map(([icon, text]) => (
            <div key={text} className="rounded-2xl border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm font-bold text-amber-50">
              <span className="mr-2 text-amber-200">{icon}</span>{text}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => onMode("create")} className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-6 py-4 font-black text-slate-950 shadow-lg shadow-amber-950/30">
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
      <div className="udita-panel rounded-[2rem] border border-amber-200/30 bg-white/[0.04] p-4 shadow-2xl shadow-amber-950/20">
        <div className="grid gap-4 lg:grid-cols-[1fr_.72fr]">
          <div className="relative min-h-[420px] overflow-hidden rounded-[1.5rem] border border-amber-200/20 bg-black">
            <img src={uditaImage} alt="Udita, Doogi Central game guide" className="absolute inset-0 h-full w-full object-cover object-left-top" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200">Meet</p>
              <h2 className="text-4xl font-black text-amber-100">Udita</h2>
              <p className="mt-1 text-sm font-semibold text-amber-50">Your game guide</p>
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-gradient-to-br from-amber-300/16 via-emerald-400/10 to-cyan-500/10 p-5">
            <div className="flex items-center justify-between">
              <img src={nexusLogo} alt="NexusSync Solutions" className="h-14 rounded-xl bg-white p-2" />
              <Gamepad2 className="text-amber-200" />
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {["A", "2", "2", "K", "K", "K"].map((card, index) => (
                <motion.div key={`${card}-${index}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
                  <Card card={card} small index={index} />
                </motion.div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-amber-300/20 bg-black/35 p-4">
              <h2 className="font-bold text-white">Let the game begin</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">Your game, your rules, your moment. Play clean sets, win control, and finish first.</p>
            </div>
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
  const invite = `${window.location.origin}?room=${snapshot.roomCode}`;
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

function MoveHistory({ history = [] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
      <h2 className="font-black text-white">Move History</h2>
      <div className="mt-4 max-h-56 space-y-2 overflow-auto">
        {history.slice(-20).reverse().map((item) => <p key={item.id} className="rounded-xl bg-white/5 p-2 text-sm text-gray-300">{item.text}</p>)}
      </div>
    </div>
  );
}

function MobilePanel({ activePanel, onClose, snapshot, send }) {
  if (!activePanel) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/55 p-3 backdrop-blur-sm lg:hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="absolute bottom-3 left-3 right-3 max-h-[78vh] overflow-auto rounded-[1.5rem] border border-cyan-300/20 bg-[#06111f] p-3 shadow-2xl"
      >
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 p-2 text-white"><X size={18} /></button>
        </div>
        {activePanel === "chat" ? <Chat messages={snapshot.chat} send={send} /> : <MoveHistory history={snapshot.history || []} />}
      </motion.div>
    </div>
  );
}

function Game({ snapshot, send, analysis, onTutorial }) {
  const [selected, setSelected] = useState([]);
  const [dropReady, setDropReady] = useState(false);
  const [showDealAnimation, setShowDealAnimation] = useState(() => snapshot.status === "playing");
  const [celebratedFirstRank, setCelebratedFirstRank] = useState("");
  const [activePanel, setActivePanel] = useState("");
  const tableRef = useRef(null);
  const hand = snapshot.hand || [];
  const selectedCards = hand.filter((card) => selected.includes(cardKey(card)));
  const myTurn = snapshot.currentPlayerId === snapshot.me;
  const currentPlayer = snapshot.players.find((player) => player.id === snapshot.currentPlayerId);
  const firstRankPlayer = snapshot.players.find((player) => player.rank === 1);
  const showFirstRankCelebration = firstRankPlayer && celebratedFirstRank !== firstRankPlayer.id;
  const selectedRank = selectedCards[0]?.rank || "";
  const sameRankCards = selectedRank ? hand.filter((card) => card.rank === selectedRank) : [];

  const playable = useMemo(() => {
    if (!myTurn) return new Set();
    if (!snapshot.table?.combo) return new Set(hand.map(cardKey));
    return new Set(hand.filter((card) => card.rankValue >= snapshot.table.rankValue).map(cardKey));
  }, [hand, myTurn, snapshot.table]);

  const toggle = (card) => {
    const key = cardKey(card);
    if (!myTurn || !playable.has(key)) return;
    setSelected((items) => (items.includes(key) ? items.filter((item) => item !== key) : [...items, key]));
  };

  const selectRankSet = (count) => {
    if (!selectedRank) return;
    setSelected(sameRankCards.slice(0, count).map(cardKey));
  };

  const playCards = (cardIds = selected) => {
    if (!myTurn || !cardIds.length) return;
    send("play_cards", { cardIds });
    setSelected([]);
  };

  const play = () => playCards(selected);

  const dragToTable = (card, info) => {
    setDropReady(false);
    if (!myTurn) return;
    const rect = tableRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x, y } = info.point;
    const droppedOnTable = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    const flickedUpToPlay = info.offset?.y < -45;
    if (!droppedOnTable && !flickedUpToPlay) return;
    const key = cardKey(card);
    const group = selected.includes(key) ? selected : [key];
    playCards(group);
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-3 px-2 pb-6 pt-3 sm:px-4 lg:grid-cols-[1fr_320px] lg:gap-4 lg:pb-10 lg:pt-4">
      <AnimatePresence>
        {showDealAnimation && <DealAnimation players={snapshot.players} onDone={() => setShowDealAnimation(false)} />}
        {showFirstRankCelebration && (
          <FirstPlaceCelebration
            playerName={firstRankPlayer.name}
            onDone={() => setCelebratedFirstRank(firstRankPlayer.id)}
          />
        )}
        <MobilePanel activePanel={activePanel} onClose={() => setActivePanel("")} snapshot={snapshot} send={send} />
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setActivePanel("history")}
        className="mobile-side-bubble left-3 lg:hidden"
        aria-label="Open move history"
      >
        <BookOpen size={20} />
      </button>
      <button
        type="button"
        onClick={() => setActivePanel("chat")}
        className="mobile-side-bubble right-3 lg:hidden"
        aria-label="Open live chat"
      >
        <MessageCircle size={20} />
      </button>
      <section className="space-y-4">
        <div className="rounded-3xl border border-cyan-300/20 bg-white/[0.04] p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Room {snapshot.roomCode}</p>
              <h1 className="text-2xl font-black text-white">{myTurn ? "Your turn" : `${currentPlayer?.name || "Player"} is thinking`}</h1>
            </div>
            <button type="button" onClick={onTutorial} className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white">Rules</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            {snapshot.players.map((player) => (
              <div key={player.id} className={`rounded-2xl border p-3 ${player.id === snapshot.currentPlayerId ? "border-cyan-300 bg-cyan-400/10" : "border-white/10 bg-black/20"}`}>
                <p className="truncate font-bold text-white">{player.name}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-400">{player.cardCount} cards</p>
                  <div className="relative h-8 w-10 overflow-hidden">
                    <span className="absolute right-2 top-0"><CardBack small offset={0} /></span>
                    <span className="absolute right-0 top-1"><CardBack small offset={2} /></span>
                  </div>
                </div>
                {player.rank && <p className="mt-1 text-xs text-yellow-200">Rank #{player.rank}</p>}
              </div>
            ))}
          </div>
        </div>

        <div
          ref={tableRef}
          onDragEnter={() => setDropReady(true)}
          onDragLeave={() => setDropReady(false)}
          className={`game-felt min-h-60 rounded-3xl border p-3 transition sm:p-5 ${
            dropReady ? "border-cyan-200 shadow-2xl shadow-cyan-500/20" : "border-white/10"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Table</p>
            <div className="relative h-12 w-16 overflow-hidden">
              <span className="absolute right-4 top-0"><CardBack small offset={0} /></span>
              <span className="absolute right-2 top-1"><CardBack small offset={2} /></span>
              <span className="absolute right-0 top-2"><CardBack small offset={4} /></span>
            </div>
          </div>
          <div className="mt-4 flex min-h-44 flex-col items-center justify-center gap-3 sm:mt-6 sm:gap-4">
            {(snapshot.tablePlays || []).length ? (
              <div className="flex w-full flex-wrap items-end justify-center gap-4">
                {snapshot.tablePlays.map((play, playIndex) => {
                  const latest = playIndex === snapshot.tablePlays.length - 1;
                  return (
                    <motion.div
                      key={play.id}
                      initial={{ opacity: 0, y: 24, scale: 0.92 }}
                      animate={{ opacity: latest ? 1 : 0.7, y: 0, scale: latest ? 1 : 0.82 }}
                      className="rounded-2xl border border-white/10 bg-black/20 p-2 sm:p-3"
                    >
                      <p className="mb-2 text-center text-xs font-bold text-amber-100">{play.playerName}</p>
                      <div className="flex justify-center">
                        {play.cards.map((card, index) => (
                          <div key={cardKey(card)} className={index ? "-ml-4 sm:-ml-5" : ""}>
                            <Card card={card} variant={latest ? "table" : "hand"} index={index} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-300">Table is clear. Start any valid move.</p>
            )}
          </div>
          <p className="mt-4 text-center text-sm text-gray-300 sm:mt-5">{snapshot.table?.combo ? `${snapshot.table.combo} | rank ${snapshot.table.rank}` : "Fresh round"}</p>
          {myTurn && <p className="mt-2 text-center text-xs font-semibold text-cyan-100">Drag upward or drop selected cards here. You can also tap Play.</p>}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black text-white">Your Hand</h2>
            <div className="flex gap-2">
              <button type="button" disabled={!myTurn} onClick={play} className="rounded-full bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:text-base">Play</button>
              <button type="button" disabled={!myTurn} onClick={() => send("pass_turn")} className="rounded-full border border-white/15 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:text-base">Pass</button>
            </div>
          </div>
          {myTurn && selectedRank && sameRankCards.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200/15 bg-amber-200/10 p-2 text-sm text-amber-50">
              <span className="font-bold">Selected {selectedRank}</span>
              {sameRankCards.length >= 2 && (
                <button type="button" onClick={() => selectRankSet(2)} className="rounded-full bg-amber-300 px-3 py-2 text-xs font-black text-slate-950">
                  Select Pair
                </button>
              )}
              {sameRankCards.length >= 3 && (
                <button type="button" onClick={() => selectRankSet(3)} className="rounded-full bg-amber-300 px-3 py-2 text-xs font-black text-slate-950">
                  Select Triplet
                </button>
              )}
              <button type="button" onClick={() => setSelected([])} className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-white">
                Clear
              </button>
            </div>
          )}
          <div className={`hand-fan relative mt-4 pb-6 pt-5 ${hand.length <= 4 ? "hand-fan-small" : ""}`}>
            {hand.map((card, index) => (
              <div
                key={cardKey(card)}
                className="hand-card absolute top-4"
                style={{
                  left: hand.length <= 1 ? "50%" : `${(index / (hand.length - 1)) * 100}%`,
                  transform: `translateX(-50%) rotate(${hand.length <= 1 ? 0 : -13 + (26 * index) / (hand.length - 1)}deg)`,
                  zIndex: selected.includes(cardKey(card)) ? 80 : index + 1,
                }}
              >
                <Card
                  card={card}
                  index={index}
                  selected={selected.includes(cardKey(card))}
                  playable={playable.has(cardKey(card))}
                  draggable={myTurn && playable.has(cardKey(card))}
                  onClick={() => toggle(card)}
                  onDragStart={() => {
                    const key = cardKey(card);
                    if (myTurn && playable.has(key) && !selected.includes(key)) setSelected((items) => [...items, key]);
                  }}
                  onDragEnd={(_, info) => dragToTable(card, info)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="hidden space-y-4 lg:block">
        <Chat messages={snapshot.chat} send={send} />
        <MoveHistory history={snapshot.history || []} />
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
    try {
      if (!localStorage.getItem("doogi_tutorial_seen")) setShowTutorial(true);
    } catch {
      setShowTutorial(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#020711] text-white">
      <UditaDock />
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

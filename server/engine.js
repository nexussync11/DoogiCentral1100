export const rankOrder = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const suits = ["S", "H", "D", "C"];

export function rankValue(rank) {
  return rankOrder.indexOf(rank);
}

export function createDeck() {
  return suits.flatMap((suit) => rankOrder.map((rank) => ({ id: `${rank}-${suit}`, rank, suit, rankValue: rankValue(rank) })));
}

export function shuffleDeck(deck) {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function dealCards(players) {
  const deck = shuffleDeck(createDeck());
  const hands = Object.fromEntries(players.map((player) => [player.id, []]));
  deck.forEach((card, index) => {
    hands[players[index % players.length].id].push(card);
  });
  reduceHeavyRankClusters(hands, players);
  Object.values(hands).forEach(sortHand);
  return hands;
}

function countRank(hand, rank) {
  return hand.filter((card) => card.rank === rank).length;
}

function reduceHeavyRankClusters(hands, players) {
  players.forEach((player) => {
    const hand = hands[player.id];
    rankOrder.forEach((rank) => {
      while (countRank(hand, rank) > 2) {
        const extraIndex = hand.findIndex((card) => card.rank === rank);
        const extra = hand[extraIndex];
        const target = players.find((candidate) => candidate.id !== player.id && countRank(hands[candidate.id], rank) < 2);
        if (!target) break;
        const targetHand = hands[target.id];
        const swapIndex = targetHand.findIndex((card) => countRank(hand, card.rank) < 2 && card.rank !== rank);
        if (swapIndex < 0) break;
        hand[extraIndex] = targetHand[swapIndex];
        targetHand[swapIndex] = extra;
      }
    });
  });
}

export function sortHand(hand) {
  hand.sort((a, b) => a.rankValue - b.rankValue || a.suit.localeCompare(b.suit));
  return hand;
}

export function makeMove(cards) {
  if (!cards.length || cards.length > 3) return null;
  const rank = cards[0].rank;
  if (!cards.every((card) => card.rank === rank)) return null;
  return {
    combo: cards.length === 1 ? "single" : cards.length === 2 ? "pair" : "triplet",
    rank,
    rankValue: cards[0].rankValue,
    cards,
  };
}

export function validateMove(room, playerId, cardIds) {
  if (room.status !== "playing") return { ok: false, message: "Game is not active." };
  if (room.currentPlayerId !== playerId) return { ok: false, message: "It is not your turn." };
  if (room.rankings.some((ranking) => ranking.playerId === playerId)) return { ok: false, message: "You have already finished." };

  const hand = room.hands[playerId] || [];
  const selected = cardIds.map((id) => hand.find((card) => card.id === id));
  if (selected.some((card) => !card)) return { ok: false, message: "Selected cards are not in your hand." };

  const move = makeMove(selected);
  if (!move) return { ok: false, message: "Play a single, pair, or triplet of the same rank." };
  if (room.table.combo && move.combo !== room.table.combo) return { ok: false, message: `Round requires a ${room.table.combo}.` };
  if (room.table.combo && move.rankValue < room.table.rankValue) return { ok: false, message: "Play an equal or higher rank." };

  return { ok: true, move };
}

export function nextActivePlayer(room, fromId = room.currentPlayerId) {
  const activeIds = room.players
    .filter((player) => !room.rankings.some((ranking) => ranking.playerId === player.id))
    .map((player) => player.id);
  if (activeIds.length <= 1) return activeIds[0] || null;
  const currentIndex = activeIds.indexOf(fromId);
  return activeIds[(currentIndex + 1 + activeIds.length) % activeIds.length];
}

export function remainingActivePlayers(room) {
  return room.players.filter((player) => !room.rankings.some((ranking) => ranking.playerId === player.id));
}

export function shouldEndRound(room) {
  if (!room.table.lastPlayerId) return false;
  const active = remainingActivePlayers(room).map((player) => player.id);
  const challengers = active.filter((id) => id !== room.table.lastPlayerId);
  return challengers.length > 0 && challengers.every((id) => room.passes.has(id));
}

export function clearTableForWinner(room, winnerId) {
  room.table = { combo: null, rank: null, rankValue: -1, cards: [], lastPlayerId: null };
  room.tablePlays = [];
  room.passes = new Set();
  room.currentPlayerId = winnerId;
}

export function applyMove(room, playerId, cardIds) {
  const validation = validateMove(room, playerId, cardIds);
  if (!validation.ok) return validation;

  const { move } = validation;
  room.hands[playerId] = room.hands[playerId].filter((card) => !cardIds.includes(card.id));
  room.table = { ...move, lastPlayerId: playerId };
  room.tablePlays = [
    ...(room.tablePlays || []),
    { id: `${Date.now()}-${playerId}`, playerId, cards: move.cards, combo: move.combo, rank: move.rank },
  ].slice(-8);
  room.passes = new Set();
  room.moves.push({
    type: "play",
    playerId,
    cards: move.cards,
    combo: move.combo,
    rank: move.rank,
    at: Date.now(),
  });

  if (room.hands[playerId].length === 0 && !room.rankings.some((ranking) => ranking.playerId === playerId)) {
    room.rankings.push({ playerId, rank: room.rankings.length + 1 });
  }

  const active = remainingActivePlayers(room);
  if (active.length <= 1) {
    if (active[0] && !room.rankings.some((ranking) => ranking.playerId === active[0].id)) {
      room.rankings.push({ playerId: active[0].id, rank: room.rankings.length + 1 });
    }
    room.status = "finished";
    room.currentPlayerId = null;
    return { ok: true, move, gameOver: true };
  }

  room.currentPlayerId = nextActivePlayer(room, playerId);
  return { ok: true, move };
}

export function passTurn(room, playerId) {
  if (room.status !== "playing") return { ok: false, message: "Game is not active." };
  if (room.currentPlayerId !== playerId) return { ok: false, message: "It is not your turn." };
  if (!room.table.lastPlayerId) return { ok: false, message: "You cannot pass on a fresh table." };

  room.passes.add(playerId);
  room.moves.push({ type: "pass", playerId, at: Date.now() });

  if (shouldEndRound(room)) {
    const winnerId = room.table.lastPlayerId;
    clearTableForWinner(room, winnerId);
    room.moves.push({ type: "round_won", playerId: winnerId, at: Date.now() });
    return { ok: true, roundWinnerId: winnerId };
  }

  room.currentPlayerId = nextActivePlayer(room, playerId);
  return { ok: true };
}

export function startGame(room) {
  if (room.players.length < 2) return { ok: false, message: "At least 2 players required." };
  if (room.players.length > room.maxPlayers) return { ok: false, message: "Too many players." };
  room.hands = dealCards(room.players);
  room.table = { combo: null, rank: null, rankValue: -1, cards: [], lastPlayerId: null };
  room.tablePlays = [];
  room.passes = new Set();
  room.rankings = [];
  room.moves = [];
  room.status = "playing";
  room.currentPlayerId = room.players[0].id;
  room.startedAt = Date.now();
  return { ok: true };
}

export function summarizeForAI(room) {
  const nameFor = (id) => room.players.find((player) => player.id === id)?.name || "Player";
  return {
    roomName: room.roomName,
    players: room.players.map((player) => player.name),
    rankings: room.rankings.map((ranking) => ({ rank: ranking.rank, name: nameFor(ranking.playerId) })),
    moves: room.moves.slice(-120).map((move) => ({
      type: move.type,
      player: nameFor(move.playerId),
      cards: move.cards?.map((card) => card.rank).join(", ") || "",
      combo: move.combo || "",
      rank: move.rank || "",
    })),
  };
}

export function fallbackAnalysis(room) {
  const summary = summarizeForAI(room);
  const winner = summary.rankings[0]?.name || "the winner";
  return [
    `Game summary: ${winner} finished first in ${room.roomName}.`,
    "Best moves: Players who saved higher cards for control had the strongest end-game position.",
    "Missed opportunities: Passing too early can give control away. Watch the combo type before committing strong cards.",
    "Strategy insight: Keep pairs and triplets intact until they can win control or force passes.",
    `MVP player: ${winner}.`,
    "Friendly note: Doogi rewards patience, clean timing, and knowing when to pass.",
  ].join("\n\n");
}

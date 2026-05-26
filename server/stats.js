const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MILESTONES = [50, 100];

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function createBucket(date = todayKey()) {
  return {
    date,
    totalVisits: 0,
    visitorIds: new Set(),
    uniquePlayerIds: new Set(),
    gamesStarted: 0,
    gamesCompleted: 0,
    totalGameDurationMs: 0,
    completedGamePlayerCountTotal: 0,
    milestoneAlertsSent: new Set(),
    lastResetAt: Date.now(),
  };
}

let bucket = createBucket();

function ensureToday() {
  const currentDate = todayKey();
  if (bucket.date !== currentDate || Date.now() - bucket.lastResetAt > MS_PER_DAY * 2) {
    bucket = createBucket(currentDate);
  }
  return bucket;
}

function number(value) {
  return Number.isFinite(value) ? value : 0;
}

function minutes(ms) {
  return Math.round((ms / 60000) * 10) / 10;
}

function snapshot() {
  const stats = ensureToday();
  return {
    date: stats.date,
    totalVisits: stats.totalVisits,
    uniqueVisitors: stats.visitorIds.size,
    gamesStarted: stats.gamesStarted,
    gamesCompleted: stats.gamesCompleted,
    uniquePlayers: stats.uniquePlayerIds.size,
    averageGameDurationMinutes: stats.gamesCompleted ? minutes(stats.totalGameDurationMs / stats.gamesCompleted) : 0,
    averagePlayersPerGame: stats.gamesCompleted
      ? Math.round((stats.completedGamePlayerCountTotal / stats.gamesCompleted) * 10) / 10
      : 0,
    milestoneStatus: MILESTONES.map((milestone) => ({
      milestone,
      reached: stats.gamesCompleted >= milestone,
      alertSent: stats.milestoneAlertsSent.has(milestone),
    })),
  };
}

function safeId(value, fallback = "") {
  return String(value || fallback).replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 96);
}

export function trackVisit(visitorId) {
  const stats = ensureToday();
  stats.totalVisits += 1;
  stats.visitorIds.add(safeId(visitorId, `visit-${stats.totalVisits}`));
}

export function trackPlayer(playerId) {
  if (!playerId) return;
  ensureToday().uniquePlayerIds.add(safeId(playerId));
}

export function trackGameStarted(room) {
  const stats = ensureToday();
  stats.gamesStarted += 1;
  room.analytics = {
    ...(room.analytics || {}),
    startedAt: Date.now(),
    startedPlayerCount: room.players?.length || 0,
    completed: false,
  };
}

async function sendMilestoneEmail(milestone, statsSnapshot) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "alerts@doogicentral.com";
  const to = (process.env.ADMIN_ALERT_EMAILS || "testdevds20@gmail.com,info@nexussyncsolutions.com")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!resendApiKey || !to.length) {
    console.log(`Doogi stats milestone ${milestone} reached, but email is not configured.`);
    return;
  }

  const recommendation =
    milestone >= 100
      ? "At 100+ completed games/day, light monetization testing such as banner ads or end-game ads may now be considered."
      : "At 50+ completed games/day, focus should remain on gameplay optimization, retention, and replayability.";

  const subject = `Doogi Central Alert: ${milestone}+ Daily Completed Games Reached`;
  const text = [
    subject,
    "",
    `Date: ${statsSnapshot.date}`,
    `Total visits today: ${statsSnapshot.totalVisits}`,
    `Unique visitors: ${statsSnapshot.uniqueVisitors}`,
    `Games started: ${statsSnapshot.gamesStarted}`,
    `Games completed: ${statsSnapshot.gamesCompleted}`,
    `Unique players: ${statsSnapshot.uniquePlayers}`,
    `Average game duration: ${statsSnapshot.averageGameDurationMinutes} minutes`,
    `Average players per game: ${statsSnapshot.averagePlayersPerGame}`,
    "",
    recommendation,
  ].join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      text,
    }),
  });
}

export function trackGameCompleted(room) {
  const stats = ensureToday();
  if (room.analytics?.completed) return;

  const startedAt = number(room.analytics?.startedAt || room.createdAt || Date.now());
  const playerCount = number(room.analytics?.startedPlayerCount || room.players?.length || 0);
  stats.gamesCompleted += 1;
  stats.totalGameDurationMs += Math.max(0, Date.now() - startedAt);
  stats.completedGamePlayerCountTotal += playerCount;
  room.analytics = { ...(room.analytics || {}), completed: true, completedAt: Date.now() };

  const statsSnapshot = snapshot();
  MILESTONES.forEach((milestone) => {
    if (stats.gamesCompleted >= milestone && !stats.milestoneAlertsSent.has(milestone)) {
      stats.milestoneAlertsSent.add(milestone);
      sendMilestoneEmail(milestone, statsSnapshot).catch((error) => {
        console.error(`Doogi milestone ${milestone} email failed:`, error?.message || error);
      });
    }
  });
}

export function getStatsSnapshot() {
  return snapshot();
}


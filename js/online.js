// The family scoreboard online, through the Shed service: sends finished games and reads the board.
// Games wait in the phone's outbox until they get through, so playing with no signal is fine.
// With no scoresUrl configured everything here quietly does nothing and the boards stay local.
import { CONFIG } from "./config.js";
import * as store from "./storage.js";

const TIMEOUT_MS = 5000;

export function enabled() {
  return Boolean(CONFIG.scoresUrl);
}

async function call(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(CONFIG.scoresUrl.replace(/\/$/, "") + path, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Queues a finished game for the family board and tries to send everything waiting.
export function postGame(score, night, stats) {
  if (!enabled()) return;
  const player = store.get("player");
  const game = {
    board: store.BOARD, score, night, initials: player.initials, player: player.id, at: Date.now(),
    counts: { house: houseCounts(stats) },
  };
  store.set("outbox", [...store.get("outbox"), game].slice(-50));
  return flush();
}

// The Shed takes 1 to 100 of each counter per game; zeros are left out.
function houseCounts(stats) {
  const counts = {};
  for (const name of ["fixed", "close"]) if (stats[name] > 0) counts[name] = Math.min(100, stats[name]);
  return counts;
}

let flushing = null;
export function flush() {
  if (!enabled() || flushing) return flushing;
  flushing = (async () => {
    let sent = 0;
    while (store.get("outbox").length) {
      const [game, ...rest] = store.get("outbox");
      try {
        await call("/scores", game);
      } catch (err) {
        // The service turned this game down (4xx): sending it again won't help, so let it go.
        // Anything else is no signal or the service being down: try again next time.
        if (!(err.status >= 400 && err.status < 500 && err.status !== 429)) break;
      }
      store.set("outbox", rest);
      sent++;
    }
    return sent;
  })().finally(() => (flushing = null));
  return flushing;
}

// The family's top 10. period: "all" or "week". → [{ initials, score, at }] or null
export async function topScores(period = "all") {
  if (!enabled()) return null;
  try {
    const q = new URLSearchParams({ board: store.BOARD, period });
    return (await call(`/scores?${q}`)).scores;
  } catch {
    return null;
  }
}

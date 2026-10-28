// Everything the game remembers, in localStorage on this phone only.
// The browser may clear it (clearing site data, or uninstalling the app); that only costs scores.
const KEY = "lights.v1";
const BOARD_SIZE = 10;
export const BOARD = "house"; // one high-score board: every game starts on night 1

const DEFAULTS = {
  player: null,    // { id, initials }: who plays on this phone; id tells two "GEN"s apart online
  sound: true,
  board: [],       // this phone's top 10, [{ initials, score, night, at }], best first
  totals: { fixed: 0, close: 0, popped: 0, canes: 0, games: 0, bestNight: 0 },
  outbox: [],      // finished games waiting to be sent to the family board
  challenge: null, // { initials, score } from a dare link, until it is played
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked (private window): keep playing, just without saving.
  }
}

export function get(name) {
  return load()[name];
}

export function set(name, value) {
  load()[name] = value;
  persist();
}

export function setInitials(initials) {
  const data = load();
  data.player = { id: data.player?.id || randomId(), initials };
  persist();
}

function randomId() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function board() {
  return load().board;
}

export function topScore() {
  return Math.max(0, ...load().board.map((r) => r.score));
}

// Saves a finished game. stats: { fixed, close, popped, canes }.
// → { rank (1-10, or 0 if it missed the board), previousTop }
export function recordGame(score, night, stats) {
  const data = load();
  const previousTop = topScore();
  const entry = { initials: data.player.initials, score, night, at: Date.now() };
  if (score > 0) {
    data.board = [...data.board, entry].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, BOARD_SIZE);
  }
  const t = { ...DEFAULTS.totals, ...data.totals };
  for (const k of ["fixed", "close", "popped", "canes"]) t[k] += stats[k] || 0;
  t.games++;
  t.bestNight = Math.max(t.bestNight || 0, night);
  data.totals = t;
  persist();
  return { rank: score > 0 ? data.board.indexOf(entry) + 1 : 0, previousTop };
}

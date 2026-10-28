// Dad's lines, loaded from sayings/sayings.json. Adding a line is an entry in that file, and
// a line marked "voiced" also plays sayings/voices/<id>.mp3 (none are recorded yet).

let sayings = {};

export function setData(json) {
  sayings = json;
}

// A random line of one kind ("feed", "punch", ...), avoiding the one said last time.
const lastSaid = {};
export function random(kind) {
  const list = sayings[kind] || [];
  if (list.length === 0) return { text: "" };
  let pick = list[Math.floor(Math.random() * list.length)];
  if (list.length > 1 && pick === lastSaid[kind]) pick = list[(list.indexOf(pick) + 1) % list.length];
  lastSaid[kind] = pick;
  return pick;
}

// A line by its id, from any kind; e.g. the line that opens a night.
export function byId(id) {
  for (const list of Object.values(sayings)) {
    if (!Array.isArray(list)) continue;
    const found = list.find((s) => s.id === id);
    if (found) return found;
  }
  return { text: "" };
}

// The recorded clip of a line, or null when it has not been recorded yet.
export function clip(saying) {
  return saying?.id && saying.voiced ? `sayings/voices/${saying.id}.mp3` : null;
}

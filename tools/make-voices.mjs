// Records the lines in sayings/sayings.json with Chatterbox on cerebro: Dad's, Grandma's and the
// kids', each in their own voice (SPEAKERS below).
// Run from the project folder:  node tools/make-voices.mjs [--force] [--samples]
// Writes sayings/voices/<saying id>.mp3 and marks each recorded line "voiced": true. Lines already
// recorded are skipped unless --force is given. --samples records a line in a few voices for each
// speaker into sayings/voice-samples/, to pick from; then change SPEAKERS and run --force.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHATTERBOX = process.env.CHATTERBOX_URL || "http://192.168.40.110:8004";
const SAMPLE_RATE = 24000;

// Who says what. pitch below 1 = deeper and slower (Dad's a grumpy old so-and-so), above 1 = higher
// and quicker (Grandma's a touch shrill, the kids are kids). drama is Chatterbox's "exaggeration":
// 0.5 is plain, higher is more worked up.
const SPEAKERS = {
  dad: {
    voice: "Leonardo.wav", pitch: 0.88, drama: 0.7,
    samples: ["Henry.wav", "Thomas.wav", "Everett.wav", "Alexander.wav", "Gabriel.wav", "Leonardo.wav", "Miles.wav", "Julian.wav"],
  },
  grandma: { voice: "Abigail.wav", pitch: 1.1, drama: 0.7, samples: ["Cora.wav", "Abigail.wav", "Alice.wav", "Elena.wav"] },
  kid: { voice: "Emily.wav", pitch: 1.22, drama: 0.6, samples: ["Jade.wav", "Emily.wav", "Eli.wav", "Taylor.wav"] },
};
// The kinds of line each speaker says (every other kind is Dad's), and kinds nobody says out loud.
const SAID_BY = { grandma: "grandma", "kid-watch": "kid" };
const UNSPOKEN = ["trash", "title"];

const args = process.argv.slice(2);
const force = args.includes("--force");
const sayingsPath = "sayings/sayings.json";
const sayings = JSON.parse(readFileSync(sayingsPath, "utf8"));
const tmp = "sayings/.raw.wav";
const kinds = Object.keys(sayings).filter((k) => Array.isArray(sayings[k]) && !UNSPOKEN.includes(k));

// The words as they should be said. The lines shout in capitals ("Ho ho HO!", "BURGLAR!"), but
// Chatterbox spells out a word in capitals letter by letter, so it gets them in plain case.
function spoken(text) {
  return text.replace(/\b[A-Z][A-Z']+\b/g, (w) => (w === "I" ? w : w[0] + w.slice(1).toLowerCase()));
}

async function record(text, { voice, pitch, drama }, out) {
  const res = await fetch(`${CHATTERBOX}/tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: spoken(text), voice_mode: "predefined", predefined_voice_id: voice, output_format: "wav",
      exaggeration: drama, cfg_weight: 0.4, temperature: 0.8, split_text: false,
    }),
  });
  if (!res.ok) throw new Error(`Chatterbox said HTTP ${res.status} for "${text}" (${voice})`);
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  // change the pitch, trim the silence at the start, and even out the loudness between clips
  const filters = [
    `asetrate=${SAMPLE_RATE}*${pitch}`, `aresample=${SAMPLE_RATE}`,
    "silenceremove=start_periods=1:start_threshold=-45dB", "loudnorm=I=-16:TP=-1.5",
  ].join(",");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", tmp, "-af", filters, "-ac", "1", "-c:a", "libmp3lame", "-q:a", "5", out]);
}

if (args.includes("--samples")) {
  mkdirSync("sayings/voice-samples", { recursive: true });
  // a page to listen to them on (open /sayings/voice-samples/ from the game's address)
  const lines = {
    dad: "Oh, come on! Why does this always happen to me? Get off my wires, you rodent!",
    grandma: sayings.grandma[0].text,
    kid: sayings["kid-watch"][0].text,
  };
  const only = args.find((a) => a.startsWith("--who="))?.slice(6);
  let page = "<!doctype html><meta name=viewport content='width=device-width'><title>Voices</title><body style='font:18px sans-serif;margin:16px'>";
  for (const [who, sp] of Object.entries(SPEAKERS)) {
    if (only && who !== only) continue;
    page += `<h2>${who}: "${lines[who]}"</h2>`;
    for (const voice of sp.samples) {
      const name = `${who}-${voice.replace(".wav", "")}.mp3`;
      await record(lines[who], { ...sp, voice }, `sayings/voice-samples/${name}`);
      page += `<p>${voice.replace(".wav", "")}<br><audio controls preload=none src="${name}"></audio></p>`;
      console.log(name);
    }
  }
  writeFileSync("sayings/voice-samples/index.html", page);
} else {
  mkdirSync("sayings/voices", { recursive: true });
  let made = 0;
  for (const kind of kinds) {
    const sp = SPEAKERS[SAID_BY[kind] || "dad"];
    for (const line of sayings[kind]) {
      const out = `sayings/voices/${line.id}.mp3`;
      if (!force && existsSync(out)) continue;
      await record(line.text, sp, out);
      made++;
      console.log(line.text);
    }
  }
  // Mark which lines have a clip, so the game (and the offline cache) know what to load.
  for (const kind of Object.keys(sayings).filter((k) => Array.isArray(sayings[k]))) {
    for (const line of sayings[kind]) {
      if (existsSync(`sayings/voices/${line.id}.mp3`)) line.voiced = true;
      else delete line.voiced;
    }
  }
  writeFileSync(sayingsPath, JSON.stringify(sayings, null, 2) + "\n");
  console.log(`Recorded ${made} clips.`);
}
execFileSync("rm", ["-f", tmp]);

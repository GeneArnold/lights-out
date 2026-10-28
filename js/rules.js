// How hard each night is, and how points are scored. Pure functions with no Phaser, so they can be
// tested on their own (node tools/test-rules.mjs).
//
// A game is a run of nights on the same house. Each night adds a strand of lights and something new
// to deal with; after the last row of NIGHTS the nights come round again, a little harder each time,
// for as long as you last. Tuning the game is changing the numbers in NIGHTS.

// Like Tapper: every bulb that pops costs a heart, and the last heart lost is the end of the game.
// Hearts come back from candy canes: now and then one hangs on the lights for CANE_STAYS seconds,
// and every CANES_PER_HEART that Dad grabs is a heart back (no more than MAX_HEARTS; past that, a
// bonus instead).
export const START_HEARTS = 5;
export const MAX_HEARTS = 5;
export const CANES_PER_HEART = 5;
export const CANE_STAYS = 8;

// How a strand works: now and then a bulb starts to blink. It blinks faster and faster, and if Dad
// hasn't swapped it by the end of its `life` it pops and goes black (a heart lost), then a moment
// later it's back on.
//
// One row per night.
//   strands     how many strands are up (porch, porch roof, ...; see js/house.js)
//   burnEvery   [min, max] seconds between bulbs starting to blink, at the start of the night
//   life        seconds a bulb blinks before it pops
//   bag         bulbs Dad carries; refill at the bulb box
//   length      seconds from 6 PM to midnight
//   kid         the kid wanders by now and then (he never helps)
//   cane        [min, max] seconds between candy canes showing up on the lights
//   grandma     [min, max] seconds between Grandma checking the windows for burglars; null: not yet
//   cat         [min, max] seconds between the cat coming to sit on the lights, blocking them; null: not yet
//   squirrel    [min, max] seconds between the squirrel running along a wire, knocking bulbs loose
//   dog         [min, max] seconds between the dog trying to steal Dad's bag of bulbs
//   snowball    [min, max] seconds between the neighbour kid throwing snowballs
// Only one troublemaker is about at a time, with at least TROUBLE_GAP seconds between them.
const NIGHT_1 = { strands: 1, burnEvery: [4.4, 6.0], life: 12, bag: 8, length: 45, kid: true, cane: [10, 15], grandma: null, cat: null, squirrel: null, dog: null, snowball: null };
export const NIGHTS = [
  NIGHT_1,
  { ...NIGHT_1, strands: 2, burnEvery: [4.0, 5.6], life: 12, length: 55, grandma: [12, 18], cat: [20, 28] },
  { ...NIGHT_1, strands: 3, burnEvery: [3.7, 5.2], life: 11.5, length: 60, grandma: [14, 20], cat: [22, 30], squirrel: [16, 24] },
  { ...NIGHT_1, strands: 3, burnEvery: [3.5, 5.0], life: 11, length: 65, grandma: [16, 24], cat: [24, 32], squirrel: [20, 28], dog: [16, 24] },
  { ...NIGHT_1, strands: 3, burnEvery: [3.3, 4.8], life: 10.5, length: 70, grandma: [18, 26], cat: [26, 34], squirrel: [22, 30], dog: [20, 28], snowball: [14, 20] },
];
export const TROUBLE_GAP = 9;

// The rules for night 1, 2, 3, ... Past the last row, every extra night bulbs start to go about 6%
// more often and blink about 3% less long, down to a floor.
export function nightRules(night) {
  const i = Math.max(0, night - 1);
  const base = NIGHTS[Math.min(i, NIGHTS.length - 1)];
  const extra = Math.max(0, i - (NIGHTS.length - 1));
  return {
    ...base,
    night: i + 1,
    extra,
    burnEvery: base.burnEvery.map((s) => Math.max(1.2, s * 0.94 ** extra)),
    life: Math.max(6, base.life * 0.97 ** extra),
  };
}

// Bulbs go more often as the night goes on: 15% sooner by midnight than at 6 PM.
export function burnGapAt(rules, seconds) {
  const k = Math.min(seconds, rules.length) / rules.length;
  return rules.burnEvery.map((s) => s / (1 + 0.15 * k));
}

// How often a blinking bulb blinks, in milliseconds, given how far through its life it is (0 to 1):
// lazily at first, frantic at the end, so you can see which one to get to first.
export function blinkMs(progress) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.round(520 - 450 * p ** 1.5);
}

// A one-line clock: 0 seconds is 6:00 PM, the end of the night is 12:00 midnight.
export function clockAt(rules, seconds) {
  const minutes = Math.min(360, Math.floor((360 * Math.min(seconds, rules.length)) / rules.length));
  if (minutes >= 360) return "MIDNIGHT";
  const h = 6 + Math.floor(minutes / 60);
  const m = Math.floor((minutes % 60) / 10) * 10;
  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} PM`;
}

export const POINTS = {
  save: 25,       // a blinking bulb swapped before it popped
  closeCall: 50,  // ... in the last moments of its life
  lit: 5,         // each bulb burning at midnight
  perfect: 250,   // no bulb popped all night
  cane: 50,       // a candy cane grabbed
  caneFull: 250,  // ... the one that would have been a heart, with the hearts already full
  dodge: 50,      // up the ladder when Grandma looked out, but not beside her window
  shoo: 30,       // a pest sent packing
  caught: 75,     // the dog caught and the bag of bulbs back
};
export const CLOSE_CALL = 0.8; // how far through its life a bulb is when saving it is a close call

// What a swap is worth. progress: how far through its life the bulb was. → { points, close }
export function swapPoints(progress) {
  const close = progress >= CLOSE_CALL;
  return { points: POINTS.save + (close ? POINTS.closeCall : 0), close };
}

// What midnight is worth. → { points, perfect }
export function midnight(litBulbs, popped) {
  const perfect = popped === 0;
  return { points: litBulbs * POINTS.lit + (perfect ? POINTS.perfect : 0), perfect };
}

// Grandma only comes to the window when Dad's up the ladder. Her curtain twitches this long before she
// flings it open. If he's within REACH of her window she whacks the "burglar" off the ladder with her
// rolling pin; if not, she throws her slipper at him, and he'd better have moved.
export const GRANDMA_WARN = 1.2;
export const GRANDMA_REACH = 110;

// The pests. Tap one and Dad goes over and swats it (+SHOO points); otherwise it gets its way:
//   the cat sits on a strand, and Dad can't get at the bulbs within CAT_BLOCK of her;
//   the squirrel runs along a wire and each bulb it passes may get knocked loose (starts blinking);
//   the dog grabs Dad's bag of bulbs and runs round the yard with it until Dad swats him;
//   the neighbour kid winds up (SNOWBALL_WINDUP seconds) and throws, a few times over: at Dad if
//   he's up the ladder (knocked off), otherwise at a bulb (it starts blinking, half gone already).
export const CAT_BLOCK = 80;
export const SQUIRREL_KNOCK = 0.35;
export const SNOWBALL_WINDUP = 2.6;

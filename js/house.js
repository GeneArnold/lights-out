// The house: the same one every night, laid out on the W x 540 screen (W follows the phone's shape,
// see js/ui.js, so the house is as wide as the phone allows). Each night puts one more strand of
// lights up (STRANDS, in order). Dad stands on a row: row 0 is the ground, row 1 and up are rungs of
// the ladder, level with a strand. The painted house is placeholder art; the artist's picture
// replaces paintHouse, and the positions here are lined up with it (?debug shows them).
import { H, W } from "./ui.js";

export const GROUND = 488; // where feet stand in the yard

// The house runs from HX1 to HX2; the garage is to its left, the neighbours' to its right.
const HX1 = 210;
const HX2 = W - 170;
const HM = (HX1 + HX2) / 2;
const across = (k) => HX1 + (HX2 - HX1) * k;

// Dad's feet sit this far below a strand's wire when he's working on it from the ladder.
const REACH = 100;
// About this far between bulbs: wide enough to tap the one you mean.
const SPACING = 88;

//   wire     y of the wire; bulbs hang just under it
//   x1, x2   the first and last bulb
//   count    bulbs on the strand
//   plug     the end the power comes in (the lights come on with a shower of sparks there)
function strand(name, wire, x1, x2, plug) {
  return { name, wire, x1, x2, count: Math.round((x2 - x1) / SPACING) + 1, plug };
}
export const STRANDS = [
  strand("porch railing", 404, HX1 + 50, HX2 - 30, "right"),
  strand("porch roof", 262, HX1 + 30, HX2 - 20, "left"),
  strand("the eaves", 150, HX1 + 10, HX2 - 10, "right"),
];

// Where Dad stands on each row, and how far along it he can go.
export const ROWS = [
  { feet: GROUND, x1: 60, x2: W - 60 }, // the yard, from the box to the neighbours' kid
  ...STRANDS.slice(1).map((s) => ({ feet: s.wire + REACH, x1: s.x1 - 12, x2: s.x2 + 12 })),
];

export const BOX = { x: 96, y: GROUND };  // the bulb box, by the garage
export const SWITCH = { x: 160, y: 404 }; // the light switch on the garage wall
export const KID_PATH = { from: -40, to: W + 40, y: GROUND + 34 }; // across the front of the yard

// The upstairs windows, where Grandma keeps watch for burglars.
export const WINDOWS = [0.2, 0.5, 0.8].map((k) => ({ x: across(k), y: 205, w: 76, h: 64 }));
const DOWNSTAIRS = [0.24, 0.76].map((k) => ({ x: across(k), y: 334, w: 104, h: 72 }));

// Bulb positions along a strand, left to right, with a little sag between the hooks.
export function bulbSpots(def) {
  const step = (def.x2 - def.x1) / (def.count - 1);
  return Array.from({ length: def.count }, (_, i) => ({ x: def.x1 + i * step, y: def.wire + 10 + (i % 2) * 3 }));
}

// The night sky (a painted picture, img/sky.jpg), the house, the garage and the snowy yard, in the
// same cartoon style as the characters: bold dark outlines and flat colours. `strands` is how many
// strands are up tonight; the hooks for the rest show where they'll go.
const OL = 0x1a0f14; // the outline colour

function shape(g, points, fill, width = 3) {
  g.fillStyle(fill).fillPoints(points, true);
  g.lineStyle(width, OL).strokePoints(points, true, true);
}

function box(g, x, y, w, h, fill, r = 0, width = 3) {
  g.fillStyle(fill);
  g.lineStyle(width, OL);
  if (r) g.fillRoundedRect(x, y, w, h, r).strokeRoundedRect(x, y, w, h, r);
  else g.fillRect(x, y, w, h).strokeRect(x, y, w, h);
}

// A cap of snow along a line from (x1, y1) to (x2, y2), with drips hanging off its lower edge.
function snowCap(g, x1, y1, x2, y2, thick = 9) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 26));
  const top = [];
  const bottom = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = x1 + (x2 - x1) * k;
    const y = y1 + (y2 - y1) * k;
    top.push({ x, y: y - thick * 0.6 });
    bottom.unshift({ x, y: y + (i % 2 ? thick * 0.9 : thick * 0.3) });
  }
  shape(g, [...top, ...bottom], 0xf7fbff, 2.5);
}

// A window: warm light, curtains, a cross of glazing bars, a sill and green shutters.
function windowAt(g, win) {
  const x = win.x - win.w / 2;
  const y = win.y - win.h / 2;
  box(g, x - 20, y, 16, win.h, 0x2e6b4a, 0, 2.5);
  box(g, x + win.w + 4, y, 16, win.h, 0x2e6b4a, 0, 2.5);
  box(g, x, y, win.w, win.h, 0xffd88a);
  g.fillStyle(0xd9534f);
  g.fillTriangle(x + 2, y + 2, x + win.w * 0.3, y + 2, x + 2, y + win.h * 0.7);
  g.fillTriangle(x + win.w - 2, y + 2, x + win.w * 0.7, y + 2, x + win.w - 2, y + win.h * 0.7);
  g.lineStyle(4, 0xf7f1e3).lineBetween(win.x, y + 2, win.x, y + win.h - 2).lineBetween(x + 2, win.y, x + win.w - 2, win.y);
  box(g, x - 8, y + win.h, win.w + 16, 8, 0xf7f1e3, 0, 2.5);
  snowCap(g, x - 8, y + win.h, x + win.w + 8, y + win.h, 6);
}

// A picture from img/, `height` tall, standing on (x, y).
function prop(scene, key, x, y, height, depth) {
  if (!scene.textures.exists(key)) return null;
  const img = scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(depth);
  return img.setScale(height / img.height);
}

export function paintHouse(scene, strands = 1) {
  // the sky: a plain gradient, then the painted sky on top when it has loaded
  const sky = scene.add.graphics().setDepth(-4);
  sky.fillGradientStyle(0x0b1433, 0x0b1433, 0x23305e, 0x23305e, 1).fillRect(0, 0, W, H);
  if (scene.textures.exists("sky")) {
    const img = scene.add.image(W / 2, 0, "sky").setOrigin(0.5, 0).setDepth(-3);
    img.setScale(Math.max(W / img.width, (GROUND + 30) / img.height));
  }
  prop(scene, "pine", 28, GROUND + 4, 250, -2);
  prop(scene, "pine", W - 40, GROUND + 4, 230, -2);

  const g = scene.add.graphics();

  // the yard: snow, a path to the front steps
  g.fillStyle(0xeef4fb).fillRect(0, GROUND, W, H - GROUND);
  g.lineStyle(3, OL).lineBetween(0, GROUND, W, GROUND);
  g.fillStyle(0xd3e1f2);
  for (let i = 0; i < 30; i++) g.fillEllipse((i * 83) % W, GROUND + 16 + ((i * 29) % 30), 60, 7);
  shape(g, [{ x: HM - 46, y: GROUND + 22 }, { x: HM + 46, y: GROUND + 22 }, { x: HM + 70, y: H + 2 }, { x: HM - 70, y: H + 2 }], 0xc9cfd8, 2.5);

  // the neighbours' house, off to the right, its lights off (for now)
  box(g, W - 140, 282, 220, GROUND - 282, 0x2b3358);
  shape(g, [{ x: W - 158, y: 284 }, { x: W + 80, y: 284 }, { x: W - 30, y: 186 }], 0x1f2442);
  snowCap(g, W - 158, 284, W - 30, 186, 8);
  box(g, W - 112, 330, 42, 50, 0x6f6a4a);

  // the garage
  box(g, 16, 322, 176, GROUND - 322, 0xb07a55);
  for (let y = 336; y < GROUND; y += 14) g.lineStyle(1.5, 0x8f5f40).lineBetween(18, y, 190, y);
  shape(g, [{ x: 2, y: 324 }, { x: 206, y: 324 }, { x: 104, y: 262 }], 0x5a3d33);
  snowCap(g, 2, 324, 104, 262, 10);
  snowCap(g, 104, 262, 206, 324, 10);
  box(g, 30, 362, 100, GROUND - 362, 0xe3ddd0);
  for (let y = 384; y < GROUND; y += 26) g.lineStyle(2, 0xb8b0a0).lineBetween(32, y, 128, y);

  // the house walls, with siding
  box(g, HX1, 150, HX2 - HX1, GROUND - 150, 0x8fb3d9);
  g.lineStyle(1.5, 0x7a9cc2);
  for (let y = 164; y < GROUND; y += 14) g.lineBetween(HX1 + 2, y, HX2 - 2, y);

  // the roof, with rows of shingles, a chimney and snow
  const roof = [{ x: HX1 - 16, y: 152 }, { x: HX2 + 16, y: 152 }, { x: HM, y: 40 }];
  shape(g, roof, 0x7a3b4e);
  g.fillStyle(0x642f40);
  for (let y = 62; y < 150; y += 15) {
    const half = ((HX2 + 16 - HM) * (y - 40)) / 112 - 8;
    for (let x = HM - half + 8; x < HM + half - 4; x += 22) g.fillEllipse(x + ((y / 15) % 2) * 11, y + 5, 18, 9);
  }
  const cx = HM + (HX2 - HM) * 0.5;
  const roofY = 40 + (112 * (cx - HM)) / (HX2 + 16 - HM);
  box(g, cx - 22, roofY - 62, 44, 70, 0xa84a3a);
  for (let y = roofY - 50; y < roofY + 4; y += 12) g.lineStyle(1.5, 0x7d3428).lineBetween(cx - 20, y, cx + 20, y);
  box(g, cx - 28, roofY - 70, 56, 12, 0x7d3428, 0, 2.5);
  snowCap(g, cx - 28, roofY - 70, cx + 28, roofY - 70, 8);
  snowCap(g, HX1 - 16, 150, HM, 40, 11);
  snowCap(g, HM, 40, HX2 + 16, 150, 11);
  box(g, HX1 - 16, 146, HX2 - HX1 + 32, 8, 0xf7f1e3, 0, 2.5); // the eaves

  for (const win of WINDOWS) windowAt(g, win);

  // the porch roof, with snow on it
  shape(g, [{ x: HX1 + 6, y: 266 }, { x: HX2 - 6, y: 266 }, { x: HX2 - 24, y: 244 }, { x: HX1 + 24, y: 244 }], 0x7a3b4e);
  snowCap(g, HX1 + 24, 245, HX2 - 24, 245, 8);
  box(g, HX1 + 6, 262, HX2 - HX1 - 12, 6, 0xf7f1e3, 0, 2.5);

  for (const win of DOWNSTAIRS) windowAt(g, win);

  // the front door, with a wreath, and the porch light
  box(g, HM - 28, 312, 56, GROUND - 312, 0xb3262b);
  g.lineStyle(2, 0x7d1a1e).strokeRoundedRect(HM - 20, 366, 40, 46, 4).strokeRoundedRect(HM - 20, 420, 40, 56, 4);
  g.fillStyle(0xf2c94c).fillCircle(HM + 18, 420, 4);
  g.lineStyle(9, 0x2e7d32).strokeCircle(HM, 338, 13);
  g.lineStyle(2, OL).strokeCircle(HM, 338, 18).strokeCircle(HM, 338, 8);
  g.fillStyle(0xd62828).fillTriangle(HM - 9, 352, HM, 346, HM - 3, 360).fillTriangle(HM + 9, 352, HM, 346, HM + 3, 360);
  box(g, HM + 40, 330, 12, 18, 0xffe9a8, 3, 2);

  // porch posts, railing and floor
  for (const x of [HX1 + 14, HX2 - 24]) box(g, x, 266, 12, GROUND - 266, 0xf7f1e3, 0, 2.5);
  box(g, HX1 + 20, 396, HM - 36 - HX1 - 20, 8, 0xf7f1e3, 0, 2.5);
  box(g, HM + 36, 396, HX2 - 20 - HM - 36, 8, 0xf7f1e3, 0, 2.5);
  for (let x = HX1 + 34; x < HX2 - 26; x += 22) if (Math.abs(x - HM) > 44) box(g, x, 404, 6, GROUND - 404 - 10, 0xf7f1e3, 0, 1.5);
  box(g, HX1 + 6, GROUND - 10, HX2 - HX1 - 12, 10, 0xd8d2c4, 0, 2.5);
  box(g, HM - 46, GROUND, 92, 11, 0xd8d2c4, 0, 2.5); // the front steps
  box(g, HM - 54, GROUND + 11, 108, 11, 0xd8d2c4, 0, 2.5);

  // hooks for the strands not up yet
  g.fillStyle(0x6a6f7a);
  for (const s of STRANDS.slice(strands)) for (const b of bulbSpots(s)) g.fillRect(b.x - 1.5, s.wire - 2, 3, 4);

  // things in the yard, in front of the house
  prop(scene, "bush", HX1 - 6, GROUND + 6, 66, 1);
  prop(scene, "bush", HX2 + 2, GROUND + 6, 58, 1);
  prop(scene, "snowman", W - 100, GROUND + 26, 112, 1);
  for (const dx of [-74, 74]) prop(scene, "candycane", HM + dx, GROUND + 40, 46, 1);
  return g;
}

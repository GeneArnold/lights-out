// Art drawn in code at start-up: the bulbs and the little things (the bulb box, the switch, hearts),
// plus stand-ins for the characters. The characters' real pictures are in img/ (made on cerebro, see
// tools/swarm.py); BootScene loads them first, and a drawing here is skipped when a picture already
// has its key. Everything is shown at a set height, so a new picture of any size just drops in.

function draw(scene, key, w, h, paint) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, Math.ceil(w), Math.ceil(h));
  g.destroy();
}

// Dad on a 64 x 100 grid, times `s`: wild hair under a Santa hat, a huge grin, a tan winter coat,
// jeans and boots. Feet at (32, 100). `reach` puts his right arm up, swapping a bulb.
export const DAD_SIZE = { w: 64, h: 100 };
function paintDad(g, s, { reach = false, dangle = false } = {}) {
  const p = (v) => v * s;
  // boots and jeans
  g.fillStyle(0x4a2f1c);
  g.fillRoundedRect(p(17), p(90), p(13), p(10), p(3));
  g.fillRoundedRect(p(34), p(90), p(13), p(10), p(3));
  g.fillStyle(0x34518f);
  g.fillRoundedRect(p(19), p(64), p(11), p(28), p(4));
  g.fillRoundedRect(p(34), p(64), p(11), p(28), p(4));
  // arms: both up holding on (dangling), right one up (reaching), or both down
  g.fillStyle(0xc9a46a);
  if (dangle) {
    g.fillRoundedRect(p(8), p(4), p(10), p(40), p(5));
    g.fillRoundedRect(p(46), p(4), p(10), p(40), p(5));
    g.fillStyle(0xf1c9a0);
    g.fillCircle(p(13), p(4), p(5));
    g.fillCircle(p(51), p(4), p(5));
  } else {
    g.fillRoundedRect(p(6), p(38), p(10), p(28), p(5));
    if (reach) g.fillRoundedRect(p(48), p(12), p(10), p(30), p(5));
    else g.fillRoundedRect(p(48), p(38), p(10), p(28), p(5));
    g.fillStyle(0xf1c9a0);
    g.fillCircle(p(11), p(67), p(4.5));
    g.fillCircle(p(53), reach ? p(11) : p(67), p(4.5));
  }
  // the coat, with a fur collar and buttons
  g.fillStyle(0xc9a46a);
  g.fillRoundedRect(p(14), p(36), p(36), p(32), p(8));
  g.fillStyle(0xa7834c);
  g.fillRect(p(31), p(38), p(2), p(30));
  g.fillStyle(0x6b4a2a);
  for (const y of [46, 54, 62]) g.fillCircle(p(36), p(y), p(1.6));
  g.fillStyle(0xf4ede0);
  g.fillEllipse(p(32), p(37), p(34), p(9));
  // head
  g.fillStyle(0xf1c9a0);
  g.fillRoundedRect(p(19), p(14), p(26), p(24), p(10));
  g.fillCircle(p(19), p(26), p(3.5));
  g.fillCircle(p(45), p(26), p(3.5));
  // wild hair sticking out from under the hat
  g.fillStyle(0x5a3a22);
  for (const [x, y, r] of [[17, 17, 5], [13, 21, 4], [47, 17, 5], [51, 21, 4], [21, 13, 4], [43, 13, 4]]) g.fillCircle(p(x), p(y), p(r));
  // eyebrows up, wide eyes, the big grin
  g.fillStyle(0x3b2416);
  g.fillRect(p(23), p(18), p(7), p(2));
  g.fillRect(p(34), p(18), p(7), p(2));
  g.fillStyle(0xffffff);
  g.fillCircle(p(27), p(23), p(3.4));
  g.fillCircle(p(37), p(23), p(3.4));
  g.fillStyle(0x1e1e1e);
  g.fillCircle(p(27.5), p(23.5), p(1.7));
  g.fillCircle(p(37.5), p(23.5), p(1.7));
  g.fillStyle(0xd98a6a);
  g.fillEllipse(p(32), p(28), p(5), p(4));
  g.fillStyle(0x7a1e1e);
  g.fillEllipse(p(32), p(33), p(15), p(6));
  g.fillStyle(0xffffff);
  g.fillRect(p(26), p(30.5), p(12), p(2.2));
  // the Santa hat, flopped over to one side
  g.fillStyle(0xd62828);
  g.fillPoints([{ x: p(16), y: p(14) }, { x: p(48), y: p(14) }, { x: p(40), y: p(2) }, { x: p(56), y: p(6) }, { x: p(30), y: p(0) }], true);
  g.fillStyle(0xffffff);
  g.fillRoundedRect(p(14), p(11), p(36), p(6), p(3));
  g.fillCircle(p(57), p(7), p(4));
}

// The kid on a 36 x 62 grid: beanie, puffy jacket. `watch` has him looking at his bare wrist.
function paintKid(g, watch) {
  g.fillStyle(0x2b2b2b);
  g.fillRoundedRect(9, 54, 8, 8, 2);
  g.fillRoundedRect(19, 54, 8, 8, 2);
  g.fillStyle(0x3d3d5c);
  g.fillRect(10, 40, 7, 16);
  g.fillRect(19, 40, 7, 16);
  g.fillStyle(0x2a9d8f);
  g.fillRoundedRect(6, 22, 24, 22, 7);
  if (watch) {
    g.fillRoundedRect(14, 26, 18, 7, 3); // arm across, wrist up
    g.fillStyle(0xf1c9a0);
    g.fillCircle(31, 29, 3);
  } else {
    g.fillRoundedRect(1, 24, 7, 16, 3);
    g.fillRoundedRect(28, 24, 7, 16, 3);
  }
  g.fillStyle(0xf1c9a0);
  g.fillCircle(18, 15, 9);
  g.fillStyle(0x1e1e1e);
  g.fillCircle(watch ? 20 : 15, watch ? 17 : 15, 1.4);
  g.fillCircle(watch ? 25 : 21, watch ? 17 : 15, 1.4);
  g.fillStyle(0xe76f51);
  g.fillRoundedRect(8, 3, 20, 9, 4);
  g.fillCircle(18, 3, 3);
}

// Grandma in her window on a 64 x 64 grid: grey bun, big glasses, pink robe, and a rolling pin
// held high (`angry`) or just peeking out (not).
function paintGrandma(g, angry) {
  g.fillStyle(0xf4a6c8);
  g.fillRoundedRect(12, 40, 40, 30, 10); // robe
  g.fillStyle(0xffffff);
  g.fillTriangle(26, 40, 38, 40, 32, 50); // lace collar
  g.fillStyle(0xf1d2b4);
  g.fillCircle(32, 28, 13);
  g.fillStyle(0xc9c9cf);
  g.fillCircle(32, 14, 8); // the bun
  g.fillEllipse(32, 19, 30, 10);
  g.lineStyle(2, 0x3b2416);
  g.strokeCircle(26, 28, 5);
  g.strokeCircle(38, 28, 5);
  g.lineBetween(31, 28, 33, 28);
  g.fillStyle(0x1e1e1e);
  g.fillCircle(26, 28, 1.6);
  g.fillCircle(38, 28, 1.6);
  if (angry) {
    g.lineStyle(2.5, 0x3b2416);
    g.lineBetween(21, 20, 29, 23);
    g.lineBetween(43, 20, 35, 23);
    g.fillStyle(0x7a1e1e);
    g.fillEllipse(32, 36, 9, 6); // yelling
    // arm up with the rolling pin
    g.fillStyle(0xf4a6c8);
    g.fillRoundedRect(48, 18, 9, 26, 4);
    g.fillStyle(0xc89a62);
    g.fillRoundedRect(36, 6, 34, 9, 4);
    g.fillStyle(0x9a6f42);
    g.fillRect(33, 8, 4, 5);
    g.fillRect(69, 8, 4, 5);
  } else {
    g.fillStyle(0x7a1e1e);
    g.fillRect(29, 35, 6, 2);
  }
}

// An old-fashioned C9 bulb, white so it can be tinted any colour: glass pointing down, cap on top.
function paintBulbGlass(g) {
  g.fillStyle(0xffffff);
  g.fillPoints([{ x: 2, y: 8 }, { x: 14, y: 8 }, { x: 13, y: 16 }, { x: 8, y: 24 }, { x: 3, y: 16 }], true);
  g.fillEllipse(8, 12, 12, 10);
  g.fillStyle(0xffffff, 0.6);
  g.fillEllipse(5.5, 12, 3, 6);
}

function paintBulbCap(g) {
  g.fillStyle(0x2f6b2f);
  g.fillRoundedRect(3, 0, 10, 9, 2);
  g.fillStyle(0x1f4a1f);
  g.fillRect(3, 3, 10, 1.5);
  g.fillRect(3, 6, 10, 1.5);
}

function radial(scene, key, size, inner = 1) {
  if (scene.textures.exists(key)) return;
  const c = scene.textures.createCanvas(key, size, size);
  const ctx = c.getContext();
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(255,255,255,${inner})`);
  grad.addColorStop(0.35, `rgba(255,255,255,${inner * 0.45})`);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  c.refresh();
}

export function makeTextures(scene) {
  draw(scene, "dad", DAD_SIZE.w, DAD_SIZE.h, (g) => paintDad(g, 1));
  draw(scene, "dad-reach", DAD_SIZE.w, DAD_SIZE.h, (g) => paintDad(g, 1, { reach: true }));
  draw(scene, "dad-dangle", DAD_SIZE.w, DAD_SIZE.h, (g) => paintDad(g, 1, { dangle: true }));
  draw(scene, "dad-big", DAD_SIZE.w * 2.4, DAD_SIZE.h * 2.4, (g) => paintDad(g, 2.4, { reach: true }));
  draw(scene, "kid", 36, 62, (g) => paintKid(g, false));
  draw(scene, "kid-watch", 36, 62, (g) => paintKid(g, true));
  draw(scene, "grandma", 76, 72, (g) => paintGrandma(g, false));
  draw(scene, "grandma-angry", 76, 72, (g) => paintGrandma(g, true));
  draw(scene, "bulb-glass", 16, 25, paintBulbGlass);
  draw(scene, "bulb-cap", 16, 10, paintBulbCap);
  radial(scene, "glow", 64);
  radial(scene, "light", 256, 0.9);

  // the cardboard box of spare bulbs
  draw(scene, "box", 76, 50, (g) => {
    g.fillStyle(0xb98a4e).fillRect(0, 10, 76, 40);
    g.fillStyle(0xd1a46a).fillPoints([{ x: 0, y: 10 }, { x: 14, y: 0 }, { x: 62, y: 0 }, { x: 76, y: 10 }], true);
    g.fillStyle(0x8d6534).fillRect(0, 10, 76, 3);
    const colours = [0xff3b3b, 0x2ee66b, 0x3b8bff, 0xffd23b, 0xff8a2b];
    colours.forEach((c, i) => g.fillStyle(c).fillEllipse(16 + i * 11, 6, 8, 10));
  });

  // the light switch on the garage wall, off and on
  for (const on of [false, true]) {
    draw(scene, on ? "switch-on" : "switch", 26, 38, (g) => {
      g.fillStyle(0xf4ede0).fillRoundedRect(0, 0, 26, 38, 4);
      g.lineStyle(2, 0x9a8f7a).strokeRoundedRect(1, 1, 24, 36, 4);
      g.fillStyle(0x6b6250).fillRect(9, 10, 8, 18);
      g.fillStyle(on ? 0x3ad65a : 0xd64545).fillRoundedRect(8, on ? 8 : 18, 10, 12, 3);
    });
  }

  const heart = (g, fill, line) => {
    g.fillStyle(fill);
    g.fillCircle(8, 9, 7);
    g.fillCircle(20, 9, 7);
    g.fillTriangle(1.5, 12, 26.5, 12, 14, 26);
    if (line) {
      g.lineStyle(2, line);
      g.strokeCircle(8, 9, 7);
      g.strokeCircle(20, 9, 7);
    }
  };
  draw(scene, "heart", 28, 28, (g) => heart(g, 0xe63946));
  draw(scene, "heart-empty", 28, 28, (g) => heart(g, 0x2a2030, 0xb8a8bc));

  draw(scene, "ring", 80, 80, (g) => g.lineStyle(6, 0xffffff).strokeCircle(40, 40, 36));
  draw(scene, "snowball", 22, 22, (g) => {
    g.fillStyle(0xffffff).fillCircle(11, 11, 10);
    g.fillStyle(0xd6e4f5).fillCircle(13, 13, 6);
    g.lineStyle(2, 0x1a0f14).strokeCircle(11, 11, 10);
  });
  // Grandma's fluffy pink slipper
  draw(scene, "slipper", 34, 18, (g) => {
    g.fillStyle(0xf4a6c8).fillEllipse(17, 11, 32, 13);
    g.fillStyle(0xffffff).fillEllipse(11, 7, 16, 9);
    g.lineStyle(2, 0x1a0f14).strokeEllipse(17, 11, 32, 13);
  });
  draw(scene, "snow", 8, 8, (g) => g.fillStyle(0xffffff).fillCircle(4, 4, 4));
  draw(scene, "spark", 6, 6, (g) => g.fillStyle(0xffffff).fillCircle(3, 3, 3));
}

// Bulb colours, in the order they go along a strand.
export const BULB_COLOURS = [0xff3b3b, 0x2ee66b, 0x3b8bff, 0xffd23b, 0xff8a2b];
export const BULB_OFF = 0x4a4f5c;
export const BULB_DEAD = 0x1c1c22;

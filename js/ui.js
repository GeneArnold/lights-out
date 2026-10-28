// Small pieces of screen shared by the scenes: text styles, speech bubbles, floating points, signs.
// The screen is always 540 tall, and as wide as the phone is (from 16:9 up to about 2.2:1), so a
// long phone gets a wider house instead of empty bars down the sides. Picked once, at start-up,
// as if the phone were sideways even when it isn't yet.
export const H = 540;
export const W = (() => {
  const long = Math.max(innerWidth, innerHeight);
  const short = Math.max(1, Math.min(innerWidth, innerHeight));
  return Math.round(Math.min(1200, Math.max(960, (H * long) / short)) / 2) * 2;
})();
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

// Drawing order. The house is at the back, then the lights, the ladder and Dad, then effects.
export const DEPTH = { house: 0, wire: 10, bulbs: 11, glow: 12, ladder: 19, dad: 20, kid: 21, dark: 800, effects: 900, hud: 1000, bubble: 1100, overlay: 1200 };

// The game is laid out on a W x 540 screen but drawn at twice that, so it stays sharp on phones.
// Every scene calls this first; positions everywhere are in the W x 540 layout.
export const ZOOM = 2;
export function setupCamera(scene) {
  scene.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);
}

// Where a finger is, in the W x 540 layout.
export function fingerAt(scene, pointer) {
  const p = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
  return { x: p.x, y: p.y, t: performance.now() };
}

// Shows an image `height` tall, whatever size its picture is (generated art, or the code-drawn stand-in).
export function fit(img, height) {
  return img.setScale(height / img.frame.height);
}

export function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function text(scene, x, y, str, size = 28, opts = {}) {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: opts.bold === false ? "normal" : "bold",
      color: opts.color || "#ffffff",
      stroke: opts.stroke || "#1a0f14",
      strokeThickness: opts.strokeThickness ?? Math.round(size / 6),
      align: opts.align || "center",
      resolution: ZOOM,
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    })
    .setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
}

// A speech bubble above a point, kept inside the screen, gone after `ms`. One at a time: a new
// bubble replaces the last one, so quick lines never stack up unreadable bubbles.
// It sits up and to the left of the speaker's head, with no tail (a tail never lines up while
// people move). `follow` (anything with x and y, at its feet) makes it ride along, `above` higher
// than its feet.
export function bubble(scene, x, y, words, ms = 1700, { follow = null, above = 104, lift = 0 } = {}) {
  scene.lastBubble?.destroy();
  const label = scene.add.text(0, 0, words, {
    fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: "#1a0f14", align: "center",
    wordWrap: { width: 260 }, resolution: ZOOM,
  }).setOrigin(0.5);
  const w = label.width + 28;
  const h = label.height + 18;
  const g = scene.add.graphics();
  const c = scene.add.container(0, 0, [g, label]).setDepth(DEPTH.bubble).setScale(0.6);
  const place = (px, py) => {
    const cx = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, px - w / 2 + 40));
    const cy = Math.max(h / 2 + 50, py - h / 2 - 14 - lift);
    c.setPosition(cx, cy);
    g.clear();
    g.fillStyle(0xffffff, 0.97);
    g.lineStyle(3, 0x1a0f14);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  place(x, y);
  if (follow) {
    const tick = () => c.active && place(follow.x, follow.y - above);
    scene.events.on("update", tick);
    c.once("destroy", () => scene.events.off("update", tick));
  }
  scene.lastBubble = c;
  scene.tweens.add({ targets: c, scale: 1, duration: 160, ease: "Back.easeOut" });
  scene.tweens.add({ targets: c, alpha: 0, delay: ms, duration: 250, onComplete: () => c.destroy() });
  return c;
}

export function floatText(scene, x, y, words, colour = "#ffe066", size = 24) {
  const t = text(scene, x, y, words, size, { color: colour }).setDepth(DEPTH.effects);
  scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1100, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  return t;
}

// A red sign with a gold edge, like a Christmas card, for titles and panels.
export function sign(scene, x, y, w, h) {
  const g = scene.add.graphics();
  g.fillStyle(0x1a0f14);
  g.fillRoundedRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, 16);
  g.fillStyle(0xd6b04a);
  g.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 14);
  g.fillStyle(0xa4161a);
  g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, 11);
  return g;
}

// A rounded button: { x, y, w, h } in the layout, a colour and its words.
export function button(scene, r, colour, words, size = 28) {
  const g = scene.add.graphics();
  g.fillStyle(0x1a0f14).fillRoundedRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 22);
  g.fillStyle(colour).fillRoundedRect(r.x, r.y, r.w, r.h, 18);
  return [g, text(scene, r.x + r.w / 2, r.y + r.h / 2, words, size)];
}

// Speech over someone's head: a plain bubble (no tail) whose bottom-left corner is (left, bottom).
export function speech(scene, left, bottom, words, size = 22, wrap = 300) {
  const label = text(scene, 0, 0, words, size, { color: "#1a0f14", strokeThickness: 0, wrap });
  const w = label.width + 32;
  const h = label.height + 22;
  label.setPosition(left + w / 2, bottom - h / 2);
  const g = scene.add.graphics();
  g.fillStyle(0xffffff).lineStyle(3, 0x1a0f14);
  g.fillRoundedRect(left, bottom - h, w, h, 18);
  g.strokeRoundedRect(left, bottom - h, w, h, 18);
  label.setDepth(1);
  return [g, label];
}

// One strand of lights on the house. Now and then a bulb starts to blink, faster and faster as it
// gets near the end; if Dad hasn't swapped it by then it pops and goes black (a heart lost), and a
// moment later it's back on.
import { DEPTH } from "./ui.js";
import { BULB_COLOURS, BULB_DEAD, BULB_OFF } from "./textures.js";
import { bulbSpots } from "./house.js";
import { blinkMs } from "./rules.js";

const DARK_MS = 1500;  // how long a popped bulb stays black before it's back on
const BULB_SCALE = 1.6;

export class Strand {
  constructor(scene, def, index) {
    this.scene = scene;
    this.def = def;
    this.index = index;
    this.on = false; // off until the switch is flipped at the start of the night
    this.step = (def.x2 - def.x1) / (def.count - 1);
    this.bulbs = bulbSpots(def).map((p, i) => ({
      ...p,
      i,
      colour: BULB_COLOURS[(i + index * 2) % BULB_COLOURS.length],
      state: "lit", // lit | blink | popped
      start: 0,     // blink: when it started, and when it pops; popped: when it's back on
      until: 0,
      phase: 0,     // blink: how far through its on-off cycle
    }));

    const wire = scene.add.graphics().setDepth(DEPTH.wire);
    wire.lineStyle(2.5, 0x1f3d1f);
    wire.beginPath();
    wire.moveTo(def.x1 - 14, def.wire);
    for (const b of this.bulbs) wire.lineTo(b.x, def.wire + (b.i % 2) * 3);
    wire.lineTo(def.x2 + 14, def.wire);
    wire.strokePath();
    // where the power comes in: the sparks fly from here when the lights come on
    this.plug = { x: def.plug === "left" ? def.x1 : def.x2, y: def.wire };

    for (const b of this.bulbs) {
      b.glow = scene.add.image(b.x, b.y + 14, "glow").setDepth(DEPTH.glow).setScale(BULB_SCALE).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      b.glass = scene.add.image(b.x, b.y, "bulb-glass").setOrigin(0.5, 0.2).setScale(BULB_SCALE).setDepth(DEPTH.bulbs);
      b.cap = scene.add.image(b.x, b.y, "bulb-cap").setOrigin(0.5, 0.7).setScale(BULB_SCALE).setDepth(DEPTH.bulbs);
    }
    this.lastNow = 0;
    this.draw(0);
  }

  // Bulbs that can start to go.
  burnable() {
    if (!this.on) return [];
    return this.bulbs.filter((b) => b.state === "lit");
  }

  burn(bulb, now, lifeSeconds) {
    bulb.state = "blink";
    bulb.start = now;
    bulb.until = now + lifeSeconds * 1000;
    bulb.phase = 0;
  }

  // How far through its life a blinking bulb is, 0 to 1.
  progress(bulb, now) {
    return Math.max(0, Math.min(1, (now - bulb.start) / (bulb.until - bulb.start)));
  }

  // → the bulbs that just popped (usually none).
  update(now) {
    const popped = [];
    for (const b of this.bulbs) {
      if (b.state === "popped" && now >= b.until) b.state = "lit";
      if (b.state !== "blink" || now < b.until) continue;
      b.state = "popped";
      b.until = now + DARK_MS;
      popped.push(b);
    }
    this.draw(now);
    return popped;
  }

  // Dad puts a new bulb in. Only a blinking bulb can be saved: once one has popped it stays black
  // until it comes back on by itself.
  // → null if the bulb wasn't blinking, else { progress }.
  swap(bulb, now) {
    if (bulb.state !== "blink") return null;
    const progress = this.progress(bulb, now);
    bulb.state = "lit";
    return { progress };
  }

  litCount() {
    if (!this.on) return 0;
    return this.bulbs.filter((b) => b.state !== "popped").length;
  }

  // The blinking bulb for a tap at x: of those within `reach` bulbs either side, the one closest to
  // popping. Popped bulbs can't be tapped. null if none.
  troubleNear(x, reach = 1.6) {
    const near = this.bulbs.filter((b) => b.state === "blink" && Math.abs(b.x - x) <= this.step * reach);
    near.sort((a, b) => a.until - b.until);
    return near[0] || null;
  }

  // The bulb nearest across to x, or null when x is off either end of the strand.
  bulbAt(x) {
    if (x < this.def.x1 - this.step * 0.7 || x > this.def.x2 + this.step * 0.7) return null;
    return this.bulbs[Math.max(0, Math.min(this.bulbs.length - 1, Math.round((x - this.def.x1) / this.step)))];
  }

  draw(now) {
    const dt = Math.max(0, now - this.lastNow);
    this.lastNow = now;
    const live = this.on;
    for (const b of this.bulbs) {
      let colour = b.colour;
      let glow = 0.6;
      let shake = 0;
      if (!live) {
        colour = BULB_OFF;
        glow = 0;
      } else if (b.state === "popped") {
        colour = BULB_DEAD;
        glow = 0;
      } else if (b.state === "blink") {
        const p = this.progress(b, now);
        b.phase = (b.phase + dt / blinkMs(p)) % 1;
        const on = b.phase < 0.55;
        colour = on ? b.colour : BULB_OFF;
        glow = on ? 0.9 : 0;
        if (p > 0.7) shake = Math.sin(now / 25) * 2 * p; // about to go: it rattles
      }
      b.glass.setTint(colour).setX(b.x + shake);
      b.glow.setTint(b.colour).setAlpha(glow);
    }
  }
}

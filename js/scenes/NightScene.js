// Before each night: "NIGHT 2", what's up on the house tonight, Dad saying his piece, and a tip.
// Tap (or swipe up) to start the night.
import * as audio from "../audio.js";
import * as sayings from "../sayings.js";
import { lightsBackdrop } from "../backdrop.js";
import { listenForGestures } from "../gestures.js";
import { STRANDS } from "../house.js";
import { CANES_PER_HEART, MAX_HEARTS, NIGHTS, nightRules } from "../rules.js";
import { W, fit, setupCamera, sign, speech, text } from "../ui.js";

// What's new each night. Night 1 explains how the lights work with pictures (see legend()).
// Past the last one: the same, faster.
const TIPS = [
  null,
  "A second strand, up the ladder: just tap its blinking bulbs (or swipe up and down to climb). " +
    "Grandma thinks anyone up a ladder is a burglar: when her curtain twitches, get away from her window, " +
    "and keep moving, she throws her slipper! And the cat sits on the lights batting at the bulbs: tap her and Dad swats her off.",
  "Up to the eaves! And here comes the squirrel, running along the wires knocking bulbs loose. Tap him and Dad goes after him!",
  "The dog's out. He'll grab Dad's bag of bulbs and run off with it: tap him and Dad chases him down to get it back.",
  "The kid next door has snowballs, and he'll keep throwing them at Dad and the bulbs until Dad goes over there. Tap him and go get him!",
];

export class NightScene extends Phaser.Scene {
  constructor() {
    super("Night");
  }

  create(round) {
    setupCamera(this);
    this.round = round;
    const { night, hearts } = round;
    const rules = nightRules(night);
    const again = night > NIGHTS.length;

    lightsBackdrop(this, rules.strands, 0.55);

    sign(this, W / 2, 70, 420, 110);
    text(this, W / 2, 54, `NIGHT ${night}`, 56, { color: "#ffe066", strokeThickness: 9 });
    const tonight = STRANDS.slice(0, rules.strands).map((s) => s.name).join(" + ");
    text(this, W / 2, 104, again ? `${tonight}  ${"+".repeat(Math.min(rules.extra, 5))}` : tonight, 20, { color: "#fff3c4", strokeThickness: 4 });

    for (let i = 0; i < MAX_HEARTS; i++) {
      this.add.image(W / 2 - ((MAX_HEARTS - 1) * 32) / 2 + i * 32, 158, i < hearts ? "heart" : "heart-empty");
    }
    if (hearts >= MAX_HEARTS) text(this, W / 2, 184, "hearts full!", 14, { color: "#7CFC9A", strokeThickness: 3 });

    const tip = again ? "Same house, faster bulbs. Good luck!" : TIPS[night - 1];
    const left = Math.max(W / 2 - 170, 330); // clear of Dad's speech bubble
    const box = { x: left, y: 196, w: W - 30 - left, h: 186 };
    this.add.graphics().fillStyle(0x000000, 0.55).fillRoundedRect(box.x, box.y, box.w, box.h, 18);
    if (tip) text(this, box.x + box.w / 2, box.y + box.h / 2, tip, 20, { color: "#ffffff", strokeThickness: 4, wrap: box.w - 40 });
    else this.legend(box);

    const dad = fit(this.add.image(120, 540, "dad-big").setOrigin(0.5, 1), 210);
    this.tweens.add({ targets: dad, y: 534, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const line = again ? sayings.byId("night-again") : sayings.byId(`night-${night}`);
    if (line.text) {
      const [g, label] = speech(this, 24, 318, line.text, 22, 260);
      for (const o of [g, label]) o.setAlpha(0);
      this.tweens.add({ targets: [g, label], alpha: 1, duration: 250, delay: 200 });
    }
    this.time.delayedCall(350, () => audio.playVoice(sayings.clip(line)));

    const go = text(this, W - 190, 486, "TAP TO START", 32, { color: "#ffe066", strokeThickness: 6 });
    this.tweens.add({ targets: go, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    listenForGestures(this, {
      lockMs: 700,
      onTap: () => this.start(),
      onSwipe: (dir) => dir === "up" && this.start(),
    });
  }

  // How the lights work, a picture a line: blinking, popped, candy canes.
  legend(box) {
    const x = box.x + 44;
    const tx = box.x + 84;
    // the pictures sit on a patch of house wall, so a black bulb shows up
    this.add.graphics().fillStyle(0x7b8fa6).fillRoundedRect(x - 26, box.y + 12, 52, box.h - 24, 12);
    // each line starts below the last, so long lines on a narrow phone don't run into each other
    let y = box.y + 14;
    const say = (words) => {
      const t = text(this, tx, y, words, 19, { originX: 0, originY: 0, align: "left", color: "#ffffff", strokeThickness: 4, wrap: box.w - 106 });
      const mid = y + t.height / 2;
      y += t.height + 8;
      return mid;
    };
    const bulb = (y, tint) => [
      this.add.image(x, y - 14, "bulb-cap").setScale(1.6),
      this.add.image(x, y - 12, "bulb-glass").setOrigin(0.5, 0.2).setScale(1.6).setTint(tint),
    ];
    const [, blinking] = bulb(say("BLINKING? It's burning out. TAP IT and Dad swaps it. The faster it blinks, the sooner it goes!"), 0xffd23b);
    this.tweens.add({ targets: blinking, alpha: 0.15, duration: 140, yoyo: true, repeat: -1, repeatDelay: 140 });
    bulb(say("Too slow and it POPS: you lose a ❤. Lose them all and it's lights out!"), 0x1c1c22);
    const cy = say(`Grab the CANDY CANES that show up on the lights: every ${CANES_PER_HEART} gets you a ❤ back. Out of bulbs? Tap the box.`);
    fit(this.add.image(x, cy, "candycane"), 40);
  }

  start() {
    audio.unlock();
    this.scene.start("Play", this.round);
  }
}

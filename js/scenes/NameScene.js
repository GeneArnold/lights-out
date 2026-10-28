// Arcade-style initials, once, the first time the game is opened (and again from the title).
// Swipe up or down to change a letter, right for the next letter, left to go back; swipe right on
// the last letter (or tap DONE) to finish. Taps work too: above or below a letter changes it.
import * as audio from "../audio.js";
import * as store from "../storage.js";
import { lightsBackdrop } from "../backdrop.js";
import { listenForGestures } from "../gestures.js";
import { W, button, setupCamera, sign, text } from "../ui.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SLOT_X = [W / 2 - 120, W / 2, W / 2 + 120];
const SLOT_Y = 270;
const DONE = { x: W / 2 + 280, y: 232, w: 150, h: 76 };

export class NameScene extends Phaser.Scene {
  constructor() {
    super("Name");
  }

  create() {
    setupCamera(this);
    lightsBackdrop(this, 2, 0.5);
    const current = store.get("player")?.initials || "AAA";
    this.letters = current.padEnd(3, "A").split("").map((c) => Math.max(0, LETTERS.indexOf(c)));
    this.cursor = 0;

    sign(this, W / 2, 70, 520, 96);
    text(this, W / 2, 56, "WHO'S ON THE LADDER?", 36, { color: "#ffe066" });
    text(this, W / 2, 96, "Enter your initials", 20, { color: "#fff3c4" });
    sign(this, W / 2, SLOT_Y, 400, 150);
    this.slots = SLOT_X.map((x) => text(this, x, SLOT_Y, "A", 90, { color: "#ffffff" }));
    this.arrows = this.add.graphics();
    this.underline = this.add.graphics();
    const [, doneText] = button(this, DONE, 0x2a9d3a, "DONE", 34);
    this.doneText = doneText;
    text(this, W / 2, 470, "swipe ↑ ↓ to change a letter, → for the next one", 22, { color: "#ffffff", strokeThickness: 4 });
    this.draw();

    listenForGestures(this, {
      lockMs: 300,
      onSwipe: (dir) => {
        if (dir === "up") this.change(1);
        else if (dir === "down") this.change(-1);
        else if (dir === "right") this.cursor === 2 ? this.finish() : this.move(1);
        else this.move(-1);
      },
      onTap: (x, y) => {
        if (x > DONE.x && x < DONE.x + DONE.w && y > DONE.y && y < DONE.y + DONE.h) return this.finish();
        const slot = SLOT_X.findIndex((sx) => Math.abs(x - sx) < 60);
        if (slot < 0 || Math.abs(y - SLOT_Y) > 140) return;
        if (slot !== this.cursor) this.move(slot - this.cursor);
        else this.change(y < SLOT_Y ? 1 : -1);
      },
    });
  }

  change(step) {
    this.letters[this.cursor] = (this.letters[this.cursor] + step + LETTERS.length) % LETTERS.length;
    audio.play("tick");
    this.draw();
    const slot = this.slots[this.cursor];
    this.tweens.add({ targets: slot, y: SLOT_Y - step * 12, duration: 70, yoyo: true });
  }

  move(step) {
    this.cursor = Phaser.Math.Clamp(this.cursor + step, 0, 2);
    audio.play("boing");
    this.draw();
  }

  draw() {
    this.slots.forEach((s, i) => s.setText(LETTERS[this.letters[i]]).setColor(i === this.cursor ? "#ffe066" : "#ffffff"));
    const x = SLOT_X[this.cursor];
    this.arrows.clear().fillStyle(0xffe066).lineStyle(3, 0x1a0f14);
    for (const [a, b] of [[-86, -110], [86, 110]]) {
      this.arrows.fillTriangle(x - 20, SLOT_Y + a, x + 20, SLOT_Y + a, x, SLOT_Y + b);
      this.arrows.strokeTriangle(x - 20, SLOT_Y + a, x + 20, SLOT_Y + a, x, SLOT_Y + b);
    }
    this.underline.clear().fillStyle(0xffe066);
    this.underline.fillRect(x - 36, SLOT_Y + 52, 72, 6);
  }

  finish() {
    const initials = this.letters.map((i) => LETTERS[i]).join("");
    store.setInitials(initials);
    audio.play("cheer");
    this.doneText.setText(`HI ${initials}!`).setFontSize(26);
    this.time.delayedCall(700, () => this.scene.start("Title"));
  }
}

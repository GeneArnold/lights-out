// The title: Dad in front of his house, lights blazing. Swipe up (or tap) to play, swipe down for the
// high scores. Tap your initials to change them, or SOUND to mute.
// At the bottom: the version, and an update button when a newer release is out (js/update.js).
import * as audio from "../audio.js";
import * as sayings from "../sayings.js";
import * as store from "../storage.js";
import { install, installHint, onHintChange } from "../install.js";
import { lightsBackdrop } from "../backdrop.js";
import { listenForGestures } from "../gestures.js";
import { checkForUpdate, update, versionLabel } from "../update.js";
import { START_HEARTS } from "../rules.js";
import { W, fit, inside, setupCamera, sign, speech, text } from "../ui.js";

const INSTALL = { x: W / 2 - 300, y: 484, w: 600, h: 28 }; // the install hint, or the update button
const VERSION_AREA = { x: W / 2 - 240, y: 514, w: 480, h: 26 };
// ?night=2 starts on night 2, for trying out the later nights.
const START_NIGHT = Math.max(1, parseInt(new URLSearchParams(location.search).get("night"), 10) || 1);

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    setupCamera(this);
    lightsBackdrop(this, 2, 0.35);

    sign(this, W / 2, 86, 500, 120);
    const title = text(this, W / 2, 86, "LIGHTS OUT!", 64, { color: "#ffe066", strokeThickness: 10 });
    title.setScale(Math.min(1, 450 / title.width)); // phones draw the font wider: keep it inside the sign

    const dad = fit(this.add.image(120, 540, "dad-big").setOrigin(0.5, 1), 260);
    this.tweens.add({ targets: dad, scaleY: dad.scaleY * 0.97, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const [g, label] = speech(this, 24, 268, sayings.byId("title-1").text, 22, 300);
    this.tweens.add({ targets: [g, label], y: "-=5", duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Who is playing (tap to change initials), and sound on or off (tap to change).
    const badge = this.add.graphics();
    badge.fillStyle(0x000000, 0.4).fillRoundedRect(W - 118, 14, 104, 58, 14);
    text(this, W - 66, 40, store.get("player").initials, 32, { color: "#ffe066" });
    text(this, W - 66, 84, "CHANGE", 13, { color: "#ffffff", strokeThickness: 3 });
    this.meArea = { x: W - 140, y: 0, w: 140, h: 100 };
    this.soundText = text(this, 18, 30, "", 18, { originX: 0, color: "#ffffff" });
    this.soundArea = { x: 0, y: 0, w: 140, h: 70 };
    this.showSound();

    // the score and what to do, on a dark panel in the middle so they read over the house
    const best = store.topScore();
    const challenge = store.get("challenge");
    const top = best || challenge ? 300 : 352;
    this.add.graphics().fillStyle(0x000000, 0.5).fillRoundedRect(W / 2 - 230, top, 460, 464 - top, 20);
    if (challenge) {
      const banner = text(this, W / 2, 336, `${challenge.initials} DARES YOU: BEAT ${challenge.score.toLocaleString()}!`, 24, { color: "#7CFC9A" });
      this.tweens.add({ targets: banner, scale: 1.06, duration: 400, yoyo: true, repeat: -1 });
    } else if (best) {
      text(this, W / 2, 336, `YOUR BEST  ${best.toLocaleString()}`, 20, { color: "#ffffff", strokeThickness: 4 });
    }

    const go = text(this, W / 2, 392, "SWIPE UP TO PLAY", 38, { color: "#ffe066", strokeThickness: 7 });
    this.tweens.add({ targets: go, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    text(this, W / 2, 436, "swipe down for the high scores", 18, { color: "#ffffff", strokeThickness: 4 });
    this.installBox = this.add.graphics();
    this.installText = text(this, INSTALL.x + INSTALL.w / 2, INSTALL.y + INSTALL.h / 2, "", 16, { color: "#ffffff", strokeThickness: 3 });
    this.versionText = text(this, W / 2, 527, versionLabel(), 12, { color: "#d8e2f5", strokeThickness: 2 });
    this.showInstall();
    onHintChange(() => this.scene.isActive() && this.showInstall());
    this.lookForUpdate(false);
    // Coming back to the game from another app checks again: a phone often keeps the game open for days.
    const back = () => !document.hidden && this.lookForUpdate(false);
    document.addEventListener("visibilitychange", back);
    this.events.once("shutdown", () => document.removeEventListener("visibilitychange", back));

    listenForGestures(this, {
      onSwipe: (dir) => {
        if (dir === "up") this.play();
        else if (dir === "down") this.scene.start("Board");
      },
      onTap: (x, y) => {
        if (inside(x, y, this.meArea)) this.scene.start("Name");
        else if (this.hint?.update && inside(x, y, INSTALL)) this.runUpdate();
        else if (this.hint?.tap && inside(x, y, INSTALL)) install();
        else if (inside(x, y, VERSION_AREA)) this.lookForUpdate(true);
        else if (inside(x, y, this.soundArea)) this.toggleSound();
        else if (y > 150 && y < INSTALL.y - 6) this.play();
      },
    });
  }

  play() {
    audio.unlock();
    audio.play("tada");
    this.scene.start("Night", { night: START_NIGHT, score: 0, hearts: START_HEARTS, stats: null });
  }

  // Asks the site whether a newer release is out. `asked` is a tap on the version, which gets an answer.
  async lookForUpdate(asked) {
    if (asked) this.versionText.setText("checking for an update…");
    const newer = await checkForUpdate();
    if (!this.scene.isActive()) return;
    this.updateReady = newer === true;
    this.showInstall();
    if (!asked) return;
    const answer = newer === null ? "couldn't check (no signal?)" : newer ? "an update is ready" : "you have the latest version ✓";
    this.versionText.setText(answer);
    this.time.delayedCall(2500, () => this.versionText.setText(versionLabel()));
  }

  runUpdate() {
    this.installText.setText("⏳ UPDATING…");
    this.hint = null;
    update();
  }

  // "Install me", while the game is playing in a browser tab on a phone (js/install.js), or the
  // update button when a newer release is out.
  showInstall() {
    this.hint = this.updateReady ? { words: "⬆ NEW VERSION! TAP TO UPDATE", tap: true, update: true } : installHint();
    this.installBox.clear();
    this.installText.setText(this.hint?.words ?? "");
    if (!this.hint) return;
    this.installBox.fillStyle(this.hint.update ? 0xe07a1f : this.hint.tap ? 0x2a9d8f : 0x000000, this.hint.tap ? 1 : 0.4);
    this.installBox.fillRoundedRect(INSTALL.x, INSTALL.y, INSTALL.w, INSTALL.h, 14);
  }

  toggleSound() {
    const on = !store.get("sound");
    store.set("sound", on);
    audio.setEnabled(on);
    this.showSound();
    audio.play("tick");
  }

  showSound() {
    this.soundText.setText(store.get("sound") ? "SOUND ON" : "SOUND OFF");
  }
}

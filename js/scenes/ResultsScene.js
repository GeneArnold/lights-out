// After a game: the score, how far you got, where it landed on the board, and a dare's outcome.
// Swipe up to play again, down for the high scores, right for the menu; swipe left or tap
// TRASH TALK to text the score to someone. With the family board online, the first swipe up
// posts the score there instead (swipe down skips).
import * as audio from "../audio.js";
import * as online from "../online.js";
import { lightsBackdrop } from "../backdrop.js";
import { shareGame, snapshot } from "../share.js";
import { listenForGestures } from "../gestures.js";
import { START_HEARTS } from "../rules.js";
import * as store from "../storage.js";
import { W, setupCamera, sign, text } from "../ui.js";

const SHARE = { x: W - 350, y: 330, w: 260, h: 60 };

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super("Results");
  }

  create({ score, night, stats, rank, previousTop, challenge }) {
    setupCamera(this);
    lightsBackdrop(this, 2, 0.55);
    this.game_ = { score, night, stats };
    const me = store.get("player");

    sign(this, 260, 170, 420, 270);
    text(this, 260, 66, "LIGHTS OUT!", 42, { color: "#ffe066" });
    text(this, 260, 106, `${me.initials} · made it to night ${night}`, 22, { color: "#fff3c4", strokeThickness: 4 });
    const scoreText = text(this, 260, 176, "0", 84, { color: "#ffffff", strokeThickness: 10 });
    const countUp = Math.min(1200, 200 + score / 4);
    this.tweens.addCounter({
      from: 0, to: score, duration: countUp, ease: "Cubic.easeOut",
      onUpdate: (t) => scoreText.setText(Math.round(t.getValue()).toLocaleString()),
    });

    // The headline: a dare's outcome first, then a new high score, then the board.
    let headline;
    let colour = "#ffe066";
    let cheer = score > 0;
    if (challenge) {
      const won = score > challenge.score;
      headline = won ? `YOU BEAT ${challenge.initials}!` : `${challenge.initials} STILL RULES (${challenge.score.toLocaleString()})`;
      colour = won ? "#7CFC9A" : "#ff9e9e";
      cheer = won;
      store.set("challenge", null);
    } else if (score > previousTop && score > 0) {
      headline = "NEW HIGH SCORE!";
      colour = "#7CFC9A";
    } else if (rank) {
      headline = `#${rank} ON THIS PHONE`;
    } else {
      headline = `YOUR BEST ${previousTop.toLocaleString()}`;
      cheer = false;
    }
    const head = text(this, 260, 260, headline, 28, { color: colour, strokeThickness: 6 });
    if (colour === "#7CFC9A") this.tweens.add({ targets: head, scale: 1.1, duration: 450, yoyo: true, repeat: -1 });
    audio.play(cheer ? "cheer" : "groan");

    const rows = [
      ["Bulbs swapped", stats.fixed],
      ["Close calls", stats.close],
      ["Bulbs popped", stats.popped],
    ];
    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.45).fillRoundedRect(W - 420, 40, 400, 250, 20);
    rows.forEach(([label, n], i) => {
      const y = 90 + i * 72;
      this.add.image(W - 380, y, "bulb-glass").setTint([0xffd23b, 0x2ee66b, 0x4a4f5c][i]).setScale(1.4);
      text(this, W - 348, y, label, 24, { originX: 0, strokeThickness: 5 });
      text(this, W - 50, y, String(n), 30, { originX: 1, color: "#ffe066", strokeThickness: 5 });
    });

    const pill = this.add.graphics();
    pill.fillStyle(0x1a0f14).fillRoundedRect(SHARE.x - 4, SHARE.y - 4, SHARE.w + 8, SHARE.h + 8, 34);
    pill.fillStyle(0xe63946).fillRoundedRect(SHARE.x, SHARE.y, SHARE.w, SHARE.h, 30);
    this.shareText = text(this, SHARE.x + SHARE.w / 2, SHARE.y + SHARE.h / 2, "📣 TRASH TALK", 26);
    this.hintBig = text(this, W / 2, 460, "", 30, { color: "#ffe066", strokeThickness: 6 });
    this.hintSmall = text(this, W / 2, 500, "", 18, { color: "#ffffff", strokeThickness: 4 });
    this.asking = online.enabled() && score > 0; // offer to post to the family board first
    this.showHints();

    // The share picture is this screen, taken once the score has finished counting up.
    this.time.delayedCall(countUp + 150, () => {
      this.hintBig.setVisible(false);
      this.hintSmall.setVisible(false);
      snapshot(this.game).then((png) => {
        this.picture = png;
        this.hintBig.setVisible(true);
        this.hintSmall.setVisible(true);
      });
    });

    listenForGestures(this, {
      lockMs: 900,
      onSwipe: (dir) => {
        if (this.asking) {
          if (dir === "up") this.post();
          else if (dir === "down") this.skipPost();
          return;
        }
        if (dir === "up") this.scene.start("Night", { night: 1, score: 0, hearts: START_HEARTS, stats: null });
        else if (dir === "down") this.scene.start("Board");
        else if (dir === "left") this.share();
        else this.scene.start("Title");
      },
      onTap: (x, y) => {
        if (x > SHARE.x && x < SHARE.x + SHARE.w && y > SHARE.y && y < SHARE.y + SHARE.h) this.share();
      },
    });
  }

  showHints() {
    if (this.asking) {
      this.hintBig.setText("SWIPE UP: POST TO THE FAMILY BOARD").setFontSize(26);
      this.hintSmall.setText("swipe down to skip");
    } else {
      this.hintBig.setText("SWIPE UP TO PLAY AGAIN").setFontSize(30);
      this.hintSmall.setText("↓ high scores   ← trash talk   → menu");
    }
  }

  async post() {
    this.asking = false;
    this.hintBig.setText("Posting...");
    const { score, night, stats } = this.game_;
    await online.postGame(score, night, stats);
    const waiting = store.get("outbox").length > 0;
    audio.play(waiting ? "pop" : "cheer");
    this.showHints();
    this.hintSmall.setText(waiting ? "no signal: it'll post next time you play" : "posted to the family board!");
    this.time.delayedCall(2200, () => this.scene.isActive() && this.showHints());
  }

  skipPost() {
    this.asking = false;
    this.showHints();
  }

  async share() {
    audio.play("pop");
    const outcome = await shareGame({ ...this.game_, picture: this.picture || null });
    if (outcome !== "cancelled") this.shareText.setText("📣 SENT! AGAIN?");
  }
}

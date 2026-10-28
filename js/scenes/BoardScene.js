// The high scores, arcade style: a top 10 with the night each player reached, in two columns.
// Swipe or tap to go back. With the family board online it shows the whole family; otherwise this phone.
import * as online from "../online.js";
import * as store from "../storage.js";
import { lightsBackdrop } from "../backdrop.js";
import { listenForGestures } from "../gestures.js";
import { H, W, setupCamera, sign, text } from "../ui.js";

const MEDALS = ["#ffd700", "#e8eef5", "#e0995e"];

export class BoardScene extends Phaser.Scene {
  constructor() {
    super("Board");
  }

  create() {
    setupCamera(this);
    lightsBackdrop(this, 2, 0.6);
    sign(this, W / 2, 62, 400, 96);
    text(this, W / 2, 50, "HIGH SCORES", 44, { color: "#ffe066" });
    this.whose = text(this, W / 2, 92, "THIS PHONE", 15, { color: "#fff3c4", strokeThickness: 3 });
    this.content = this.add.container(0, 0);
    text(this, W / 2, H - 22, "tap or swipe to go back", 17, { color: "#ffffff", strokeThickness: 4 });
    this.drawScores(store.board());
    this.showFamily();

    listenForGestures(this, {
      onSwipe: () => this.scene.start("Title"),
      onTap: () => this.scene.start("Title"),
    });
  }

  async showFamily() {
    const family = await online.topScores();
    // Until anyone has posted, the phone's own board is more fun than an empty one.
    if (family?.length && this.scene.isActive()) {
      this.whose.setText("THE WHOLE FAMILY");
      this.drawScores(family);
    }
  }

  drawScores(rows) {
    this.content.removeAll(true);
    const me = store.get("player");
    if (rows.length === 0) {
      this.content.add(text(this, W / 2, 290, "Nobody yet.\nGo light up that house!", 34));
      return;
    }
    rows.slice(0, 10).forEach((r, i) => {
      const left = i < 5 ? W / 2 - 410 : W / 2 + 30;
      const y = 160 + (i % 5) * 66;
      const mine = r.player ? r.player === me.id : r.initials === me.initials;
      const colour = MEDALS[i] || (mine ? "#7CFC9A" : "#ffffff");
      if (mine) {
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 0.16).fillRoundedRect(left - 20, y - 26, 400, 52, 12);
        this.content.add(g);
      }
      this.content.add(text(this, left + 26, y, `${i + 1}`, 30, { color: colour, originX: 1 }));
      this.content.add(text(this, left + 50, y, r.initials, 34, { color: colour, originX: 0 }));
      if (r.night) this.content.add(text(this, left + 200, y, `night ${r.night}`, 18, { color: "#fff3c4", strokeThickness: 3 }));
      this.content.add(text(this, left + 370, y, r.score.toLocaleString(), 32, { color: colour, originX: 1 }));
    });
  }
}

// The pause screen, over a frozen night: KEEP PLAYING, or QUIT (the score is saved and the results
// come up, as if the game had ended).
import * as audio from "../audio.js";
import { listenForGestures } from "../gestures.js";
import { H, W, button, inside, setupCamera, sign, text } from "../ui.js";

const RESUME = { x: W / 2 - 320, y: 240, w: 300, h: 84 };
const QUIT = { x: W / 2 + 20, y: 240, w: 300, h: 84 };

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("Pause");
  }

  create() {
    setupCamera(this);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    sign(this, W / 2, 130, 340, 100);
    text(this, W / 2, 130, "PAUSED", 56, { color: "#ffe066" });
    button(this, RESUME, 0x2a9d3a, "KEEP PLAYING", 32);
    button(this, QUIT, 0xc0392b, "QUIT", 32);
    text(this, W / 2, 400, "Quitting ends the game. Your score is still saved.", 20, { color: "#ffffff", strokeThickness: 4 });

    listenForGestures(this, {
      lockMs: 250,
      onTap: (x, y) => {
        if (inside(x, y, RESUME)) this.resume();
        else if (inside(x, y, QUIT)) this.quit();
      },
    });
  }

  resume() {
    audio.play("pop");
    this.scene.stop();
    this.scene.resume("Play");
  }

  quit() {
    audio.play("groan");
    const play = this.scene.get("Play");
    this.scene.stop();
    play.quit();
  }
}

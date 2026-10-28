// Loads Dad's lines and the characters' pictures, draws the rest of the art, then opens the game.
import * as online from "../online.js";
import * as sayings from "../sayings.js";
import * as store from "../storage.js";
import { readChallenge } from "../share.js";
import { makeTextures } from "../textures.js";
import { H, W, setupCamera, text } from "../ui.js";

// The pictures in img/ (the characters and the things in the yard), loaded under their file names.
export const SPRITES = [
  "bush",
  "candycane",
  "cat",
  "cat-run",
  "dad",
  "dad-big",
  "dad-dangle",
  "dad-reach",
  "dog-run",
  "dog-sit",
  "grandma",
  "grandma-angry",
  "kid",
  "kid-watch",
  "pine",
  "snowman",
  "squirrel",
  "squirrel-bulb",
  "thrower",
  "thrower-laugh",
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    setupCamera(this);
    const status = text(this, W / 2, H / 2, "Untangling the lights...", 28);
    this.load.json("sayings", "sayings/sayings.json");
    for (const key of SPRITES) this.load.image(key, `img/${key}.png`);
    this.load.image("sky", "img/sky.jpg");
    this.load.on("progress", (v) => status.setText(`Untangling the lights... ${Math.round(v * 100)}%`));
    this.load.on("loaderror", (file) => console.warn("Could not load", file.src));
  }

  create() {
    sayings.setData(this.cache.json.get("sayings") || {});
    makeTextures(this);
    readChallenge();
    online.flush(); // games played offline last time
    this.scene.start(store.get("player") ? "Title" : "Name");
  }
}

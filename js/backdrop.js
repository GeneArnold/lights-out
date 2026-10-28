// The house at night with its lights on, behind the menu screens.
import { paintHouse, STRANDS } from "./house.js";
import { Strand } from "./strand.js";
import { DEPTH, H, W } from "./ui.js";

// `strands` lit strands (and their twinkle), then a dark wash so words on top stay readable.
export function lightsBackdrop(scene, strands = 2, shade = 0.3) {
  paintHouse(scene, strands).setDepth(DEPTH.house);
  const lit = STRANDS.slice(0, strands).map((def, i) => new Strand(scene, def, i));
  for (const s of lit) {
    s.on = true;
    s.draw(0);
    for (const b of s.bulbs) {
      scene.tweens.add({ targets: b.glow, alpha: 0.3, duration: 700 + ((b.i * 137) % 600), yoyo: true, repeat: -1, delay: (b.i * 91) % 700 });
    }
  }
  if (shade) scene.add.rectangle(0, 0, W, H, 0x000000, shade).setOrigin(0).setDepth(DEPTH.glow + 1);
  // all of it behind whatever the screen puts on top
  for (const o of scene.children.list) o.setDepth(o.depth - 100);
}

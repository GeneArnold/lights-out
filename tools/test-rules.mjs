// Checks the difficulty climbs and the scoring adds up. Run:  node tools/test-rules.mjs
import assert from "node:assert/strict";
import { NIGHTS, blinkMs, burnGapAt, clockAt, midnight, nightRules, swapPoints } from "../js/rules.js";

let prev = null;
for (let night = 1; night <= 30; night++) {
  const r = nightRules(night);
  assert.equal(r.night, night);
  assert.ok(r.burnEvery[0] <= r.burnEvery[1], `night ${night}: burnEvery backwards`);
  assert.ok(r.bag >= 1 && r.cane[0] <= r.cane[1]);
  if (prev) {
    assert.ok(r.strands >= prev.strands, `night ${night}: fewer strands`);
    assert.ok(r.burnEvery[1] <= prev.burnEvery[1], `night ${night}: bulbs went slower`);
    assert.ok(r.life <= prev.life, `night ${night}: bulbs blink longer`);
  }
  prev = r;
}
assert.equal(nightRules(1).strands, 1, "night 1 is the porch only");
assert.equal(nightRules(2).strands, 2, "the ladder comes out on night 2");
assert.equal(nightRules(1).grandma, null, "Grandma stays inside on night 1");
assert.ok(nightRules(2).grandma, "Grandma watches the windows from night 2");
// one new pest a night, and once a pest arrives it stays
const PESTS = ["grandma", "cat", "squirrel", "dog", "snowball"];
for (let n = 2; n <= 8; n++) for (const p of PESTS) if (nightRules(n - 1)[p]) assert.ok(nightRules(n)[p], `night ${n}: the ${p} left`);
assert.ok(nightRules(3).squirrel && !nightRules(2).squirrel, "the squirrel arrives on night 3");
assert.ok(nightRules(4).dog && !nightRules(3).dog, "the dog arrives on night 4");
assert.ok(nightRules(5).snowball && !nightRules(4).snowball, "snowballs start on night 5");
assert.ok(nightRules(40).burnEvery[0] >= 1.2, "bulbs never go more than about once a second");
assert.ok(nightRules(40).life >= 6, "a bulb always blinks long enough to get to");

// Dad can cross the whole house (about 4 seconds at worst, up a ladder) in a bulb's life.
for (let i = 0; i < NIGHTS.length; i++) assert.ok(nightRules(i + 1).life >= 5, `night ${i + 1}: bulbs pop too fast`);

// blinking speeds up through a bulb's life
assert.ok(blinkMs(0) > blinkMs(0.5) && blinkMs(0.5) > blinkMs(0.9));
assert.ok(blinkMs(1) >= 60);

const r = nightRules(1);
assert.deepEqual(burnGapAt(r, 0), r.burnEvery);
assert.ok(burnGapAt(r, r.length)[1] < r.burnEvery[1]);
assert.equal(clockAt(r, 0), "6:00 PM");
assert.equal(clockAt(r, r.length / 2), "9:00 PM");
assert.equal(clockAt(r, r.length), "MIDNIGHT");

assert.deepEqual(swapPoints(0.3), { points: 25, close: false });
assert.deepEqual(swapPoints(0.9), { points: 75, close: true });

assert.deepEqual(midnight(20, 0), { points: 350, perfect: true });
assert.deepEqual(midnight(20, 1), { points: 100, perfect: false });
console.log("rules ok");

// Dad: walks along a row, climbs his ladder (he drags it along with him), swaps bulbs and refills his
// bag at the box. goTo() plans the trip, a step at a time: walk, climb a row, climb another, walk,
// then do the job. A new goTo() lets a climb or a swap he's in the middle of finish first.
// Things happen to him, too: he can get knocked off the ladder and lie in the snow seeing stars.
import { DEPTH, fit } from "./ui.js";
import { GROUND, ROWS } from "./house.js";

const SPEED = 300;    // pixels per second along a row
const CLIMB_S = 0.32; // seconds to climb one row
const JOB_S = 0.25;   // seconds to swap a bulb or flip a switch
const REFILL_S = 0.4;
const HEIGHT = 128;   // how tall he is on screen
const STUNNED_MS = 1100;

export class Dad {
  constructor(scene, x, bag) {
    this.scene = scene;
    this.x = x;
    this.y = GROUND;
    this.row = 0;
    this.bag = bag;
    this.bagSize = bag;
    this.steps = [];
    this.step = null;
    this.falling = null;  // { vy } while he's coming down off the ladder
    this.queued = null;   // where he was told to go while he was down
    this.stunnedUntil = 0;
    this.now = 0;
    this.ladder = scene.add.graphics().setDepth(DEPTH.ladder);
    this.sprite = scene.add.image(x, GROUND, "dad").setOrigin(0.5, 1).setDepth(DEPTH.dad);
    this.pose("dad");
  }

  // target: { row, x, job } where job is { kind: "bulb", strand, bulb } | { kind: "box" } |
  // { kind: "switch" } | null.
  goTo(target) {
    // knocked down: he'll get to it when he's back on his feet
    if (this.falling || this.now < this.stunnedUntil) {
      this.queued = target;
      return;
    }
    this.queued = null;
    const busy = this.step && (this.step.kind === "climb" || this.step.kind === "job");
    const from = busy && this.step.kind === "climb" ? { row: this.step.to, x: this.x } : { row: this.row, x: this.x };
    this.steps = plan(from, target);
    if (!busy) this.next();
  }

  next() {
    this.step = this.steps.shift() || null;
    if (!this.step) return;
    this.step.t = 0;
    if (this.step.kind === "climb") {
      this.step.fromY = ROWS[this.row].feet;
      this.step.toY = ROWS[this.step.to].feet;
      this.scene.onClimb?.();
    }
  }

  // Shoved off the ladder: he flies off, lands in the snow at the foot of it and sees stars.
  knockOff() {
    this.steps = [];
    this.step = null;
    this.row = 0;
    this.falling = { vy: -220 };
    this.pose("dad-dangle");
  }

  pose(key) {
    this.sprite.setTexture(key);
    return fit(this.sprite, HEIGHT);
  }

  get stunned() {
    return this.now < this.stunnedUntil;
  }

  update(dt, now) {
    this.now = now;
    const s = this.step;
    let bob = 0;
    if (this.falling) {
      this.falling.vy += 1500 * dt;
      this.y = Math.min(GROUND, this.y + this.falling.vy * dt);
      this.sprite.setPosition(this.x, this.y).setAngle(this.sprite.angle + 540 * dt);
      if (this.y >= GROUND) {
        this.falling = null;
        this.stunnedUntil = now + STUNNED_MS;
        this.pose("dad-dangle").setAngle(90);
        this.scene.onLanded?.();
      }
      this.ladder.clear();
      return;
    }
    if (this.stunned) {
      this.sprite.setPosition(this.x, this.y).setAngle(90);
      return;
    }
    if (this.sprite.texture.key === "dad-dangle") this.pose("dad"); // back on his feet
    if (this.queued) this.goTo(this.queued);
    if (s?.kind === "walk") {
      const d = s.x - this.x;
      const move = Math.min(Math.abs(d), SPEED * dt);
      this.x += Math.sign(d) * move;
      if (d !== 0) this.sprite.setFlipX(d > 0); // his walking picture faces left
      bob = Math.abs(Math.sin(now / 70)) * 3;
      if (Math.abs(s.x - this.x) < 0.5) {
        this.x = s.x;
        this.next();
      }
    } else if (s?.kind === "climb") {
      s.t += dt;
      const k = Math.min(1, s.t / CLIMB_S);
      this.y = s.fromY + (s.toY - s.fromY) * k;
      bob = Math.sin(k * Math.PI * 4) * 2;
      if (k >= 1) {
        this.row = s.to;
        this.next();
      }
    } else if (s?.kind === "job") {
      if (s.t === 0) this.pose(s.job.kind === "box" ? "dad" : "dad-reach");
      s.t += dt;
      if (s.t >= (s.job.kind === "box" ? REFILL_S : JOB_S)) {
        this.pose("dad");
        this.scene.onJob(s.job);
        this.next();
      }
    }
    this.sprite.setPosition(this.x, this.y - bob).setAngle(0);
    this.drawLadder();
  }

  // The ladder stands in the yard beside him whenever he's off the ground.
  drawLadder() {
    const g = this.ladder.clear();
    if (this.y >= GROUND - 1) return;
    const top = this.y - 22;
    const x = this.x + 4;
    g.lineStyle(4, 0x9a6b3c);
    g.lineBetween(x - 15, GROUND + 4, x - 12, top);
    g.lineBetween(x + 15, GROUND + 4, x + 12, top);
    g.lineStyle(3, 0x7d5530);
    for (let y = GROUND - 8; y > top + 4; y -= 17) g.lineBetween(x - 14, y, x + 14, y);
  }

  get busy() {
    return Boolean(this.step);
  }
}

// The steps from where Dad is to a target: walk to a spot both rows reach, climb a row at a time,
// walk along, do the job.
function plan(from, target) {
  const steps = [];
  let x = from.x;
  if (target.row !== from.row) {
    const lo = Math.max(ROWS[from.row].x1, ROWS[target.row].x1);
    const hi = Math.min(ROWS[from.row].x2, ROWS[target.row].x2);
    // climb near where he's headed, so there's less walking at the top
    const at = Math.max(lo, Math.min(hi, from.row === 0 ? target.x : x));
    if (Math.abs(at - x) > 0.5) steps.push({ kind: "walk", x: at });
    x = at;
    const dir = Math.sign(target.row - from.row);
    for (let r = from.row + dir; r !== target.row + dir; r += dir) steps.push({ kind: "climb", to: r });
  }
  const row = ROWS[target.row];
  const tx = Math.max(row.x1, Math.min(row.x2, target.x));
  if (Math.abs(tx - x) > 0.5) steps.push({ kind: "walk", x: tx });
  if (target.job) steps.push({ kind: "job", job: target.job });
  return steps;
}

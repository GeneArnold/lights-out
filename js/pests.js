// The pests that make Dad's night harder. Each comes on, does its thing, and goes, unless Dad gets
// to it first: tap one and Dad goes after it (up the ladder if need be) and swats it when he's close
// enough. PlayScene starts them (see the pest timings in js/rules.js) and asks each one, every
// frame, update(dt, now) → false once it has gone. For the hunt, each pest says where it is (x, and
// the row Dad must be on to reach it), whether it can be swatted right now (huntable), and swat()
// is the swat landing. Each pest knocks loose ONE bulb at most and then it's off: Dad can't carry
// enough bulbs to keep up with more.
//   Cat:      walks along a strand and sits on it, bats one of the bulbs next to her loose, and goes;
//             while she's sitting there Dad can't get at the bulbs beside her.
//   Squirrel: runs along a wire till he knocks a bulb loose, then scarpers.
//   Dog:      runs at Dad and grabs his bag of bulbs, then runs round the yard with it.
//   Thrower:  the neighbour kid stands by the neighbours' house throwing snowballs at Dad up the
//             ladder, until Dad goes over there or he's thrown his last; a snowball at a bulb is
//             always his last.
import { GROUND } from "./house.js";
import { CAT_BLOCK, SNOWBALL_WINDUP, SQUIRREL_KNOCK } from "./rules.js";
import { DEPTH, W, text } from "./ui.js";

// A sprite from a generated picture, shown `height` tall whatever size the picture is.
function sprite(scene, x, y, key, height, depth = DEPTH.kid) {
  const s = scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(depth);
  return s.setScale(height / s.height);
}

function setPose(s, key, height) {
  s.setTexture(key);
  return s.setScale(height / s.frame.height);
}

// Is (x, y) on this sprite, give or take `pad`?
function onSprite(s, x, y, pad = 24) {
  const b = s.getBounds();
  return x > b.x - pad && x < b.right + pad && y > b.y - pad && y < b.bottom + pad;
}

const CAT_H = 52;
export class Cat {
  constructor(scene, strand, lifeSeconds) {
    this.scene = scene;
    this.strand = strand;
    this.life = lifeSeconds;
    this.nextBat = 0;
    this.row = strand.index;
    const { x1, x2, wire } = strand.def;
    this.fromLeft = Math.random() < 0.5;
    this.x = this.fromLeft ? x1 - 60 : x2 + 60;
    this.stopAt = Phaser.Math.Between(x1 + 60, x2 - 60);
    this.y = wire + 2;
    this.state = "in"; // in | sit | off | gone
    this.s = sprite(scene, this.x, this.y, "cat-run", CAT_H).setFlipX(this.fromLeft); // her picture faces left
    this.until = 0;
  }

  // The cat's in the way of this bulb.
  blocks(strand, bulb) {
    return this.state === "sit" && strand === this.strand && Math.abs(bulb.x - this.x) < CAT_BLOCK;
  }

  get huntable() {
    return this.state === "in" || this.state === "sit";
  }

  hit(x, y) {
    return this.huntable && onSprite(this.s, x, y);
  }

  swat() {
    this.leave();
    return "shoo";
  }

  leave() {
    this.state = "off";
    this.dir = this.x > W / 2 ? 1 : -1;
    setPose(this.s, "cat-run", CAT_H).setFlipX(this.dir > 0);
  }

  // A swipe of the paw at a bulb beside her: it's knocked loose and starts blinking, and she's done.
  bat(now) {
    this.nextBat = now + Phaser.Math.Between(1400, 2000);
    const s = this.strand;
    const near = s.bulbs.filter((b) => b.state === "lit" && Math.abs(b.x - this.x) < CAT_BLOCK * 1.4);
    if (!near.length || !s.on) return;
    const b = Phaser.Utils.Array.GetRandom(near);
    s.burn(b, now, this.life * 0.75);
    this.until = Math.min(this.until, now + 1500); // one is enough: she has a lick and wanders off
    this.s.setFlipX(b.x > this.x);
    this.scene.tweens.add({ targets: this.s, angle: b.x > this.x ? 14 : -14, duration: 90, yoyo: true, repeat: 1 });
    this.scene.onCatBat?.(b);
  }

  update(dt, now) {
    if (this.state === "in") {
      const dir = this.fromLeft ? 1 : -1;
      this.x += dir * 110 * dt;
      if ((this.x - this.stopAt) * dir >= 0) {
        this.state = "sit";
        this.until = now + 14000;
        this.nextBat = now + 1200;
        setPose(this.s, "cat", CAT_H).setFlipX(false);
      }
    } else if (this.state === "sit") {
      if (now > this.until) this.leave();
      else if (now > this.nextBat) this.bat(now);
    } else if (this.state === "off") {
      this.x += this.dir * 260 * dt;
      this.y += 120 * dt; // jumps down off the house
      if (this.x < -80 || this.x > W + 80 || this.y > GROUND + 60) this.state = "gone";
    }
    this.s.setPosition(this.x, this.y + (this.state === "sit" ? Math.sin(now / 400) : 0));
    if (this.state === "gone") this.s.destroy();
    return this.state !== "gone";
  }
}

const SQUIRREL_H = 42;
export class Squirrel {
  constructor(scene, strand, lifeSeconds) {
    this.scene = scene;
    this.strand = strand;
    this.row = strand.index;
    this.life = lifeSeconds;
    const { x1, x2, wire } = strand.def;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = this.dir > 0 ? x1 - 50 : x2 + 50;
    this.end = this.dir > 0 ? x2 + 60 : x1 - 60;
    this.y = wire + 1;
    this.passed = new Set();
    this.state = "run"; // run | jump | gone
    this.vy = 0;
    this.s = sprite(scene, this.x, this.y, "squirrel", SQUIRREL_H).setFlipX(this.dir < 0);
  }

  get huntable() {
    return this.state === "run";
  }

  hit(x, y) {
    return this.huntable && onSprite(this.s, x, y, 34);
  }

  swat() {
    this.state = "jump";
    this.vy = -260;
    return "shoo";
  }

  update(dt, now) {
    if (this.state === "run") {
      // he stops now and then to chew on something, which gives Dad a chance to catch up; once
      // he's knocked a bulb loose he's off, fast
      const chewing = !this.knocked && Math.sin(now / 700 + this.end) > 0.6;
      if (!chewing) this.x += this.dir * (this.knocked ? 190 : 95) * dt;
      // a bulb he runs over might get knocked loose (only the one)
      for (const b of this.strand.bulbs) {
        if (this.knocked || this.passed.has(b) || Math.abs(b.x - this.x) > 8) continue;
        this.passed.add(b);
        if (b.state === "lit" && this.strand.on && Math.random() < SQUIRREL_KNOCK) {
          this.strand.burn(b, now, this.life * 0.7);
          this.scene.sparks?.explode(4, b.x, b.y);
          this.knocked = true;
        }
      }
      if ((this.x - this.end) * this.dir > 0) this.state = "gone";
    } else if (this.state === "jump") {
      this.vy += 900 * dt;
      this.y += this.vy * dt;
      this.x += this.dir * 120 * dt;
      this.s.angle += 400 * dt;
      if (this.y > GROUND + 40) this.state = "gone";
    }
    this.s.setPosition(this.x, this.y - (this.state === "run" ? Math.abs(Math.sin(now / 60)) * 4 : 0));
    if (this.state === "gone") this.s.destroy();
    return this.state !== "gone";
  }
}

const DOG_H = 58;
const DOG_Y = GROUND + 40;
export class Dog {
  constructor(scene, dad) {
    this.scene = scene;
    this.dad = dad;
    this.row = 0;
    const fromLeft = dad.x > W / 2; // he comes in from the far side, so there's time to see him
    this.x = fromLeft ? -70 : W + 70;
    this.dir = fromLeft ? 1 : -1;
    this.state = "come"; // come | run | caught | off | gone
    this.bag = 0;
    this.until = 0;
    this.s = sprite(scene, this.x, DOG_Y, "dog-run", DOG_H, DEPTH.kid);
  }

  get huntable() {
    return this.state === "come" || this.state === "run";
  }

  get hasBag() {
    return this.state === "run";
  }

  hit(x, y) {
    return this.huntable && onSprite(this.s, x, y, 30);
  }

  // Swatted on his way in: off he goes. Swatted with the bag: he drops it.
  swat(now) {
    if (this.state === "run") {
      this.dad.bag = Math.max(this.dad.bag, this.bag);
      this.state = "caught";
      this.until = now + 900;
      setPose(this.s, "dog-sit", DOG_H);
      return "caught";
    }
    this.state = "off";
    return "shoo";
  }

  update(dt, now) {
    const d = this.dad;
    if (this.state === "come") {
      this.dir = Math.sign(d.x - this.x) || 1;
      this.x += this.dir * 240 * dt;
      // he gets the bag unless Dad's squaring up to swat him
      if (Math.abs(d.x - this.x) < 24 && this.scene.hunting !== this) {
        if (d.bag > 0) {
          this.bag = d.bag;
          d.bag = 0;
          this.state = "run";
          this.dir = Math.sign(this.x - d.x) || 1; // off he goes, away from Dad
          this.until = now + 12000;
          this.scene.onDogStole?.(this);
        } else {
          this.state = "off";
        }
      }
    } else if (this.state === "run") {
      this.x += this.dir * 200 * dt;
      if (this.x < 40 || this.x > W - 40) this.dir *= -1;
      if (now > this.until) {
        this.state = "off"; // Dad never came after him: the dog keeps the bulbs
        this.scene.onDogGone?.(this);
      }
    } else if (this.state === "caught") {
      if (now > this.until) {
        this.state = "off";
        setPose(this.s, "dog-run", DOG_H);
      }
    } else if (this.state === "off") {
      this.dir = this.x > W / 2 ? 1 : -1;
      this.x += this.dir * 300 * dt;
      if (this.x < -90 || this.x > W + 90) this.state = "gone";
    }
    this.s.setFlipX(this.dir > 0).setPosition(this.x, DOG_Y - (this.state === "caught" ? 0 : Math.abs(Math.sin(now / 70)) * 5));
    if (this.state === "gone") this.s.destroy();
    return this.state !== "gone";
  }
}

const THROWER_H = 96;
const THROWS = 3;
export class Thrower {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target; // () → { x, y, dad: bool } chosen at the moment he throws
    this.x = W - 60;
    this.row = 0;
    this.thrown = 0;
    this.state = "windup"; // windup | laugh | off | gone
    this.until = scene.clock + SNOWBALL_WINDUP * 1000;
    this.s = sprite(scene, this.x + 90, GROUND + 44, "thrower", THROWER_H, DEPTH.kid);
    scene.tweens.add({ targets: this.s, x: this.x, duration: 300, ease: "Back.easeOut" });
    this.warn = text(scene, this.x, GROUND - THROWER_H - 10, "!", 34, { color: "#ff6b6b" }).setDepth(DEPTH.effects);
    scene.tweens.add({ targets: this.warn, scale: 1.4, duration: 180, yoyo: true, repeat: -1 });
  }

  get huntable() {
    return this.state === "windup" || this.state === "laugh";
  }

  hit(x, y) {
    return this.huntable && onSprite(this.s, x, y, 34);
  }

  swat() {
    this.state = "off";
    this.warn.setVisible(false);
    setPose(this.s, "thrower", THROWER_H);
    return "shoo";
  }

  update(dt, now) {
    if (this.state === "windup") {
      this.s.angle = Math.sin(now / 90) * 6;
      this.warn.setVisible(true);
      if (now > this.until) this.throw(now);
    } else if (this.state === "laugh" && now > this.until) {
      // another one, until he's out of snowballs
      if (this.thrown < THROWS) {
        this.state = "windup";
        this.until = now + SNOWBALL_WINDUP * 1000;
        setPose(this.s, "thrower", THROWER_H);
      } else {
        this.state = "off";
      }
    } else if (this.state === "off") {
      this.s.angle = 0;
      this.s.x += 260 * dt;
      if (this.s.x > W + 100) this.state = "gone";
    }
    if (this.state === "gone") {
      this.s.destroy();
      this.warn.destroy();
    }
    return this.state !== "gone";
  }

  throw(now) {
    this.warn.setVisible(false);
    this.s.angle = 0;
    setPose(this.s, "thrower-laugh", THROWER_H);
    this.state = "laugh";
    this.thrown++;
    this.until = now + 1300;
    const to = this.target();
    if (!to.dad) this.thrown = THROWS; // a bulb hit is his last
    const from = { x: this.x - 20, y: GROUND - 60 };
    const ball = this.scene.add.image(from.x, from.y, "snowball").setDepth(DEPTH.effects);
    this.scene.onSnowballThrown?.();
    // a lob: straight across, with an arc 120 higher than the straight line at the top
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 750,
      onUpdate: (t) => {
        const k = t.getValue();
        ball.setPosition(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 120);
      },
      onComplete: () => {
        ball.destroy();
        this.scene.onSnowballLanded?.(to);
      },
    });
  }
}

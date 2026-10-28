// One night on the house. It opens with the big moment: drumroll, plug in... nothing. Tap the switch
// on the garage and the lights come on. Then bulbs start to blink, faster and faster till they pop.
// Tap a blinking bulb and Dad goes and swaps it (up the ladder if it's on a higher strand); a bulb
// that pops costs a heart. Now and then a candy cane hangs on the lights for a few seconds: tap it
// and Dad grabs it, and every few canes is a heart back. Swipe up or down to climb, sideways
// to run along a row; tap the box to refill his bag. The night ends at midnight (on to the next night) or when the
// last heart is gone (game over). From night 2 Grandma keeps watch for burglars at the upstairs
// windows: her curtain twitches, then she flings the window open and shoves Dad off the ladder if
// he's up it beside her. Later nights bring the pests (js/pests.js): the cat, the squirrel, the dog
// and the neighbour kid with his snowballs. Tap one and Dad hollers it away.
import * as audio from "../audio.js";
import * as sayings from "../sayings.js";
import * as store from "../storage.js";
import { Dad } from "../dad.js";
import { Cat, Dog, Squirrel, Thrower } from "../pests.js";
import { readSwipe } from "../gestures.js";
import { BOX, GROUND, KID_PATH, ROWS, STRANDS, SWITCH, WINDOWS, paintHouse } from "../house.js";
import {
  CANES_PER_HEART, CANE_STAYS, GRANDMA_REACH, GRANDMA_WARN, MAX_HEARTS, POINTS, START_HEARTS, TROUBLE_GAP,
  burnGapAt, clockAt, midnight, nightRules, swapPoints,
} from "../rules.js";
import { Strand } from "../strand.js";
import { DEPTH, H, W, bubble, fingerAt, fit, floatText, inside, setupCamera, text } from "../ui.js";

const PAUSE = { x: 0, y: 0, w: 70, h: 56 }; // the II button, top left of the score bar
const STRAND_TAP = 90; // a tap this far above or below a strand means that strand
const BOX_TAP = 80;
const SWITCH_TAP = 100;
const KID_SPEED = 130;
const DAD_HEAD = 134;
const KID_H = 80;
const PEST_KINDS = ["cat", "squirrel", "dog", "snowball"];
const SWAT_REACH = 52; // how close Dad must be to swat a pest
const CANE_TAP = 70;
const CANE_REACH = 36; // how close Dad must get to grab a candy cane
const DEBUG = new URLSearchParams(location.search).has("debug");

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("Play");
  }

  create({ night = 1, score = 0, hearts = START_HEARTS, canes = 0, stats = null } = {}) {
    setupCamera(this);
    // Phaser keeps a paused clock and paused tweens across a restart; start each night running.
    this.time.paused = false;
    this.tweens.resumeAll();
    this.night = night;
    this.score = score;
    this.hearts = hearts;
    this.canes = canes; // candy canes towards the next heart, kept from night to night
    this.cane = null;   // the one on the lights now
    this.stats = stats ? { ...stats } : { fixed: 0, close: 0, popped: 0, canes: 0 };
    this.rules = nightRules(night);
    this.phase = "intro"; // intro | play | midnight | gameover
    this.t = 0;           // seconds since the lights came on
    this.clock = 0;       // milliseconds this scene has run, stopped while paused
    this.poppedTonight = 0;
    this.lastSaidAt = -9999;
    this.lastBubble = null;
    this.touch = null;
    this.shown = {};

    paintHouse(this, this.rules.strands).setDepth(DEPTH.house);
    this.add.image(BOX.x, BOX.y, "box").setOrigin(0.5, 1).setDepth(DEPTH.wire);
    text(this, BOX.x, BOX.y - 20, "BULBS", 13, { color: "#5a3a1e", strokeThickness: 0 }).setDepth(DEPTH.wire);
    this.boxArrow = text(this, BOX.x, BOX.y - 84, "▼", 30, { color: "#ffe066" }).setDepth(DEPTH.effects).setVisible(false);
    this.tweens.add({ targets: this.boxArrow, y: BOX.y - 72, duration: 350, yoyo: true, repeat: -1 });
    this.switchImg = this.add.image(SWITCH.x, SWITCH.y, "switch").setDepth(DEPTH.wire);

    this.strands = STRANDS.slice(0, this.rules.strands).map((def, i) => new Strand(this, def, i));
    this.dad = new Dad(this, BOX.x + 150, this.rules.bag);
    this.kid = null;
    this.nextGrandmaAt = this.rules.grandma ? Phaser.Math.FloatBetween(...this.rules.grandma) : Infinity;
    this.grandma = null;
    this.pests = [];
    this.troubleAt = -Infinity; // when the last troublemaker turned up, or went
    this.hunting = null; // the pest Dad is after, and where he's headed to get it
    this.huntGoal = null;
    // when each pest next turns up, in seconds into the night
    this.pestAt = {};
    this.pestsSeen = {}; // how many times each kind has come tonight
    for (const kind of PEST_KINDS) this.pestAt[kind] = this.rules[kind] ? Phaser.Math.FloatBetween(...this.rules[kind]) : Infinity;
    this.kidAt = this.rules.kid ? this.rules.length * Phaser.Math.FloatBetween(0.3, 0.6) : Infinity;
    this.nextBurnAt = 1.2;
    this.caneAt = Phaser.Math.FloatBetween(...this.rules.cane);
    this.taughtTap = night > 1;

    this.sparks = this.add.particles(0, 0, "spark", {
      emitting: false, speed: { min: 60, max: 200 }, lifespan: 500, gravityY: 300,
      scale: { start: 1, end: 0 }, tint: [0xffe066, 0xffffff, 0xff9e3d],
    }).setDepth(DEPTH.effects);
    this.add.particles(0, 0, "snow", {
      x: { min: -40, max: W + 40 }, y: -10, lifespan: 9000, speedY: { min: 25, max: 60 }, speedX: { min: -15, max: 10 },
      scale: { min: 0.25, max: 0.7 }, alpha: { min: 0.5, max: 0.9 }, frequency: 160, advance: 9000,
    }).setDepth(DEPTH.dark);
    this.makeHud();
    if (DEBUG) this.drawDebug();

    // A tap swaps a bulb, refills the bag or walks; a swipe climbs (up, down) or runs (sideways).
    this.input.on("pointerdown", (p) => {
      audio.unlock();
      if (this.touch) return;
      this.touch = { id: p.id, path: [fingerAt(this, p)] };
    });
    this.input.on("pointermove", (p) => {
      if (this.touch?.id === p.id) this.touch.path.push(fingerAt(this, p));
    });
    const up = (p) => {
      const t = this.touch;
      if (!t || t.id !== p.id) return;
      this.touch = null;
      t.path.push(fingerAt(this, p));
      const start = t.path[0];
      const gesture = readSwipe(t.path);
      if (gesture === "tap" && inside(start.x, start.y, PAUSE)) this.pause();
      else if (gesture === "tap") this.tap(start);
      else if (gesture) this.swipe(gesture);
    };
    this.input.on("pointerup", up);
    this.input.on("pointerupoutside", up);
    // Switching to another app (a call, a text) pauses the night, so no strand goes out meanwhile.
    const away = () => document.hidden && this.pause();
    document.addEventListener("visibilitychange", away);
    this.events.once("shutdown", () => document.removeEventListener("visibilitychange", away));

    this.intro();
  }

  // ---- the big moment ------------------------------------------------------------------------

  intro() {
    const words = text(this, W / 2, 200, "DRUMROLL, PLEASE...", 40, { color: "#ffe066", strokeThickness: 7 }).setDepth(DEPTH.overlay);
    this.time.delayedCall(300, () => audio.play("drumroll"));
    this.time.delayedCall(1700, () => {
      words.destroy();
      audio.play("click");
      this.say("huh");
      this.switchReady = true;
      this.switchHint = text(this, SWITCH.x, SWITCH.y - 60, "TAP THE\nSWITCH!", 22, { color: "#ffe066" }).setDepth(DEPTH.effects);
      this.tweens.add({ targets: [this.switchHint, this.switchImg], scale: 1.25, duration: 300, yoyo: true, repeat: -1 });
    });
  }

  lightsOn() {
    this.switchReady = false;
    this.switchHint?.destroy();
    this.tweens.killTweensOf(this.switchImg);
    this.switchImg.setScale(1).setTexture("switch-on");
    audio.play("click");
    this.strands.forEach((s, i) => this.time.delayedCall(150 + i * 250, () => {
      s.on = true;
      this.sparks.explode(10, s.plug.x, s.plug.y);
    }));
    this.time.delayedCall(150 + this.strands.length * 250, () => {
      audio.play("tada");
      this.say("lights-on");
      this.phase = "play";
      const go = text(this, W / 2, 200, "GO!", 80, { color: "#ffe066" }).setDepth(DEPTH.overlay);
      this.tweens.add({ targets: go, scale: 1.5, alpha: 0, duration: 800, delay: 300, onComplete: () => go.destroy() });
    });
  }

  // ---- input -------------------------------------------------------------------------------

  tap(p) {
    this.tapMarker(p);
    if (this.phase === "intro") {
      if (this.switchReady && Math.hypot(p.x - SWITCH.x, p.y - SWITCH.y) < SWITCH_TAP) {
        this.switchReady = false;
        this.dad.goTo({ row: 0, x: SWITCH.x + 20, job: { kind: "switch" } });
      } else if (this.switchReady) {
        this.say("huh", { quiet: true });
      }
      return;
    }
    if (this.phase !== "play") return;

    // a candy cane: Dad goes and grabs it
    const cane = this.cane;
    if (cane && !cane.taken && Math.hypot(p.x - cane.x, p.y - cane.y) < CANE_TAP) {
      this.hunting = null;
      return this.dad.goTo({ row: cane.row, x: cane.x });
    }
    // a pest: Dad hollers at it (or, if it's the dog with his bag, gives chase)
    const pest = this.pests.find((q) => q.hit(p.x, p.y));
    if (pest) return this.tappedPest(pest);
    this.hunting = null; // anything else calls off a hunt
    if (Math.hypot(p.x - BOX.x, p.y - (BOX.y - 25)) < BOX_TAP) {
      return this.dad.goTo({ row: 0, x: BOX.x + 46, job: { kind: "box" } });
    }
    // The strand nearest the tap, up or down, and on it the bulb in trouble nearest the finger:
    // close is good enough, it doesn't have to be right on the bulb.
    let strand = null;
    let bestD = STRAND_TAP;
    for (const s of this.strands) {
      const d = Math.abs(s.def.wire + 24 - p.y);
      if (d < bestD && s.bulbAt(p.x)) {
        strand = s;
        bestD = d;
      }
    }
    const bulb = strand?.troubleNear(p.x);
    if (bulb) {
      if (this.catBlocking(strand, bulb)) return;
      if (this.dad.bag <= 0) return this.bagEmpty();
      return this.dad.goTo({ row: strand.index, x: bulb.x, job: { kind: "bulb", strand, bulb } });
    }
    if (strand) return this.dad.goTo({ row: strand.index, x: p.x });
    // anywhere else: walk there, on the row nearest the tap
    let row = 0;
    for (let r = 1; r < this.strands.length; r++) {
      if (Math.abs(ROWS[r].feet - 40 - p.y) < Math.abs(ROWS[row].feet - 40 - p.y)) row = r;
    }
    this.dad.goTo({ row, x: p.x });
  }

  swipe(dir) {
    if (this.phase !== "play") return;
    const row = this.dad.step?.kind === "climb" ? this.dad.step.to : this.dad.row;
    if (dir === "up" || dir === "down") {
      const to = Phaser.Math.Clamp(row + (dir === "up" ? 1 : -1), 0, this.strands.length - 1);
      if (to !== row) this.dad.goTo({ row: to, x: this.dad.x });
    } else {
      this.dad.goTo({ row, x: dir === "left" ? ROWS[row].x1 : ROWS[row].x2 });
    }
  }

  tapMarker(p) {
    const ring = this.add.image(p.x, p.y, "ring").setDepth(DEPTH.effects).setScale(0.25).setAlpha(0.9);
    this.tweens.add({ targets: ring, scale: 0.6, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
  }

  // ---- the night going by --------------------------------------------------------------------

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    this.clock += dt * 1000;
    const now = this.clock;
    const playing = this.phase === "play";
    if (playing) this.t += dt;

    if (playing && this.t >= this.nextBurnAt) {
      const [lo, hi] = burnGapAt(this.rules, this.t);
      this.nextBurnAt = this.t + Phaser.Math.FloatBetween(lo, hi);
      if (this.t < this.rules.length - 2) this.burnOne(now);
    }
    for (const s of this.strands) {
      if (!playing) s.draw(now);
      else for (const b of s.update(now)) this.popped(b);
    }
    if (playing && !this.cane && this.t >= this.caneAt && this.t < this.rules.length - CANE_STAYS) this.hangCane();
    if (this.cane) this.updateCane();

    if (playing && this.t >= this.nextGrandmaAt && this.dad.row > 0 && !this.dad.falling && this.troubleFree()) {
      this.troubleAt = this.t;
      this.grandmaLooks();
    }
    if (playing) this.schedulePests();
    const before = this.pests.length;
    this.pests = this.pests.filter((q) => q.update(dt, now));
    if (before && !this.pests.length) this.troubleAt = this.t; // the breather starts when it's gone
    this.hunt();
    this.dad.update(dt, now);
    if (playing && !this.kid && this.t >= this.kidAt) this.kidComesBy();
    this.updateKid(dt);
    this.updateHud();

    if (playing && this.t >= this.rules.length) this.midnight();
  }

  // A random burning bulb starts to blink. It pops when its life runs out.
  burnOne(now) {
    const candidates = this.strands.flatMap((s) => s.burnable().map((bulb) => ({ s, bulb })));
    if (!candidates.length) return;
    const { s, bulb } = Phaser.Utils.Array.GetRandom(candidates);
    s.burn(bulb, now, this.rules.life);
    audio.play("warn");
    if (!this.taughtTap) {
      this.taughtTap = true;
      const hint = text(this, bulb.x, bulb.y - 30, "TAP IT!", 22, { color: "#ffe066" }).setDepth(DEPTH.effects);
      this.tweens.add({ targets: hint, y: bulb.y - 40, duration: 300, yoyo: true, repeat: 6, onComplete: () => hint.destroy() });
    }
  }

  // Called by Dad when a job is done.
  onJob(job) {
    if (job.kind === "switch") return this.lightsOn();
    if (job.kind === "swat") return this.phase === "play" && this.swat(job.pest);
    if (this.phase !== "play") return;
    if (job.kind === "box") return this.refill();
    const { strand, bulb } = job;
    if (bulb.state !== "blink") return; // too late (it popped on the way), or the strand blew and came back
    if (this.catBlocking(strand, bulb)) return;
    if (this.dad.bag <= 0) return this.bagEmpty();
    const result = strand.swap(bulb, this.clock);
    if (!result) return;
    this.dad.bag--;
    this.stats.fixed++;
    const { points, close } = swapPoints(result.progress);
    if (close) this.stats.close++;
    const label = close ? `CLOSE CALL! +${points}` : `+${points}`;
    this.addScore(points, bulb.x, bulb.y - 30, label, close ? "#7CFC9A" : "#ffe066");
    audio.play("swap");
    this.sparks.explode(6, bulb.x, bulb.y + 8);
    if (close) this.say("close");
    else if (Math.random() < 0.25) this.say("swap", { quiet: true });
    if (this.dad.bag === 0) this.boxArrow.setVisible(true);
  }

  bagEmpty() {
    audio.play("empty");
    this.boxArrow.setVisible(true);
    this.tweens.add({ targets: this.bagIcon, scale: 1.8, duration: 120, yoyo: true, repeat: 2 });
    this.say("empty", { quiet: true });
  }

  refill() {
    this.dad.bag = this.dad.bagSize;
    this.boxArrow.setVisible(false);
    audio.play("refill");
    floatText(this, BOX.x, BOX.y - 80, "FULL BAG!", "#fff3c4", 22);
  }

  // Called by Dad as he starts up or down a rung of rows.
  onClimb() {
    audio.play("climb");
  }

  // A bulb Dad didn't get to in time: it pops and goes black, and a heart goes with it. A big heart
  // says so in the middle of the screen, then flies up to the score bar, so it's plain what was lost.
  popped(bulb) {
    if (this.phase !== "play") return;
    this.hearts--;
    this.poppedTonight++;
    this.stats.popped++;
    audio.play("zap");
    this.say("out");
    this.sparks.explode(16, bulb.x, bulb.y + 10);
    this.cameras.main.shake(200, 0.006);
    floatText(this, bulb.x, bulb.y - 26, "POP!", "#ff6b6b", 28);
    const left = this.hearts <= 0 ? "NO LIVES LEFT!" : this.hearts === 1 ? "LAST LIFE!" : `${this.hearts} LIVES LEFT`;
    const lifeText = text(this, W / 2, H / 2 + 20, `-1 ❤  ${left}`, 34, { color: "#ffffff", strokeThickness: 7 }).setDepth(DEPTH.overlay);
    this.tweens.add({ targets: lifeText, alpha: 0, delay: 1300, duration: 400, onComplete: () => lifeText.destroy() });
    const flying = this.add.image(W / 2, H / 2 - 50, "heart").setDepth(DEPTH.overlay).setScale(0.5);
    const lost = this.heartIcons[this.hearts];
    this.tweens.add({ targets: flying, scale: 4, duration: 300, ease: "Back.easeOut" });
    this.tweens.add({
      targets: flying, x: lost?.x ?? W - 30, y: lost?.y ?? 24, scale: 1.2, duration: 700, delay: 800, ease: "Cubic.easeIn",
      onComplete: () => {
        flying.destroy();
        if (lost) this.tweens.add({ targets: lost, scale: 1.8, duration: 150, yoyo: true });
      },
    });
    if (this.hearts <= 0) this.gameOver();
  }

  // ---- candy canes -------------------------------------------------------------------------------

  // A candy cane hangs between two bulbs on one of the strands, sparkling, for CANE_STAYS seconds
  // (it blinks for the last two). Dad grabs it by getting to it.
  hangCane() {
    const strand = Phaser.Utils.Array.GetRandom(this.strands.filter((s) => s.on));
    const k = Phaser.Math.Between(0, strand.bulbs.length - 2);
    const x = (strand.bulbs[k].x + strand.bulbs[k + 1].x) / 2;
    const y = strand.def.wire + 26;
    const glow = this.add.image(x, y, "glow").setDepth(DEPTH.glow).setScale(2.2).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD);
    const img = fit(this.add.image(x, y, "candycane"), 52).setDepth(DEPTH.bulbs + 2);
    this.tweens.add({ targets: img, angle: { from: -12, to: 12 }, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: glow, alpha: 0.35, duration: 400, yoyo: true, repeat: -1 });
    this.cane = { x, y, row: strand.index, img, glow, until: this.t + CANE_STAYS, taken: false };
    audio.play("bells");
  }

  updateCane() {
    const c = this.cane;
    const d = this.dad;
    if (this.phase === "play" && d.row === c.row && Math.abs(d.x - c.x) < CANE_REACH && !d.falling && !d.stunned) return this.grabCane();
    const left = c.until - this.t;
    if (left <= 0 || this.phase !== "play") return this.dropCane();
    if (left < 2) c.img.setVisible(Math.floor(left * 8) % 2 === 0);
  }

  dropCane() {
    this.cane.img.destroy();
    this.cane.glow.destroy();
    this.cane = null;
    this.caneAt = this.t + Phaser.Math.FloatBetween(...this.rules.cane);
  }

  // Every CANES_PER_HEART canes is a heart back, or a bonus when the hearts are already full.
  grabCane() {
    const { x, y } = this.cane;
    this.dropCane();
    this.canes++;
    this.stats.canes = (this.stats.canes || 0) + 1;
    audio.play("swap");
    this.sparks.explode(12, x, y);
    if (this.canes < CANES_PER_HEART) {
      this.addScore(POINTS.cane, x, y - 30, `CANDY CANE ${this.canes}/${CANES_PER_HEART}  +${POINTS.cane}`, "#ffffff");
      this.tweens.add({ targets: this.caneIcon, scale: this.caneIcon.scale * 1.6, duration: 150, yoyo: true });
      return;
    }
    this.canes = 0;
    audio.play("bells");
    if (this.hearts >= MAX_HEARTS) {
      this.addScore(POINTS.caneFull, x, y - 30, `LIVES FULL! +${POINTS.caneFull}`, "#7CFC9A");
      return;
    }
    this.hearts++;
    this.addScore(POINTS.cane, x, y - 30, "EXTRA LIFE!", "#7CFC9A");
    const won = this.heartIcons[this.hearts - 1];
    const flying = this.add.image(x, y, "heart").setDepth(DEPTH.overlay).setScale(2.5);
    won.setVisible(false);
    this.tweens.add({
      targets: flying, x: won.x, y: won.y, scale: 1.15, duration: 800, ease: "Cubic.easeIn",
      onComplete: () => {
        flying.destroy();
        won.setVisible(true);
        this.tweens.add({ targets: won, scale: 1.8, duration: 150, yoyo: true });
      },
    });
  }

  // ---- Grandma ---------------------------------------------------------------------------------

  // Grandma hears someone up a ladder outside. She goes to the window nearest Dad (that's where the
  // noise is). The curtain twitches first: time to move.
  grandmaLooks() {
    const win = WINDOWS.reduce((a, b) => (Math.abs(b.x - this.dad.x) < Math.abs(a.x - this.dad.x) ? b : a));
    const curtain = this.add.rectangle(win.x - win.w / 2 + 2, win.y - win.h / 2 + 2, win.w / 2 - 2, win.h - 4, 0xc0546e).setOrigin(0).setDepth(DEPTH.wire - 1);
    const peek = this.add.image(win.x + win.w / 4, win.y + win.h / 2 - 2, "grandma").setOrigin(0.5, 1).setDepth(DEPTH.wire - 2);
    fit(peek, win.h * 0.7);
    const warn = text(this, win.x, win.y - win.h / 2 - 16, "?!", 26, { color: "#ffe066" }).setDepth(DEPTH.effects);
    this.tweens.add({ targets: curtain, scaleX: 0.6, duration: 160, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: warn, scale: 1.3, duration: 200, yoyo: true, repeat: -1 });
    audio.play("creak");
    this.grandma = { win, curtain, peek, warn };
    this.time.delayedCall(GRANDMA_WARN * 1000, () => this.grandmaPops());
  }

  grandmaPops() {
    const g = this.grandma;
    g.curtain.destroy();
    g.warn.destroy();
    g.peek.destroy();
    if (this.phase !== "play") return this.grandmaDone();
    const { win } = g;
    g.sprite = this.add.image(win.x, win.y + win.h / 2 + 4, "grandma-angry").setOrigin(0.5, 1).setDepth(DEPTH.kid);
    const full = fit(g.sprite, win.h * 1.5).scale;
    g.sprite.setScale(full * 0.35);
    this.tweens.add({ targets: g.sprite, scale: full, duration: 180, ease: "Back.easeOut" });
    this.tweens.add({ targets: g.sprite, angle: 8, duration: 120, yoyo: true, repeat: 5, delay: 180 });
    audio.play("yell");
    const line = sayings.random("grandma");
    bubble(this, win.x, win.y - win.h / 2 - 20, line.text, 1600);
    audio.playVoice(sayings.clip(line));
    const d = this.dad;
    const onLadder = (d.row > 0 || d.step?.kind === "climb") && !d.falling;
    if (onLadder && Math.abs(d.x - win.x) < win.w / 2 + GRANDMA_REACH) {
      this.time.delayedCall(250, () => {
        if (this.phase !== "play") return;
        audio.play("bonk");
        this.cameras.main.shake(200, 0.008);
        d.knockOff();
      });
    } else if (onLadder) {
      this.time.delayedCall(300, () => this.throwSlipper(win));
    }
    this.time.delayedCall(1800, () => {
      this.tweens.add({ targets: g.sprite, scale: 0.3, alpha: 0, duration: 200, onComplete: () => g.sprite.destroy() });
      this.grandmaDone();
    });
  }

  // Out of reach? Her slipper isn't. It flies at where Dad is now; if he's still there, he's off.
  throwSlipper(win) {
    if (this.phase !== "play") return;
    const d = this.dad;
    const to = { x: d.x, y: d.y - 80 };
    const from = { x: win.x, y: win.y };
    const slipper = this.add.image(from.x, from.y, "slipper").setDepth(DEPTH.effects);
    audio.play("whoosh");
    this.tweens.addCounter({
      from: 0, to: 1, duration: 650,
      onUpdate: (t) => {
        const k = t.getValue();
        slipper.setPosition(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 50).setAngle(k * 720);
      },
      onComplete: () => {
        slipper.destroy();
        if (this.phase !== "play") return;
        const onLadder = (d.row > 0 || d.step?.kind === "climb") && !d.falling;
        if (onLadder && Math.abs(d.x - to.x) < 50) {
          audio.play("bonk");
          this.cameras.main.shake(200, 0.008);
          d.knockOff();
        } else {
          audio.play("splat");
          this.addScore(POINTS.dodge, to.x, to.y - 40, `DODGED GRANDMA! +${POINTS.dodge}`, "#8fd3ff");
        }
      },
    });
  }

  grandmaDone() {
    this.grandma = null;
    this.troubleAt = this.t;
    this.nextGrandmaAt = this.t + Phaser.Math.FloatBetween(...this.rules.grandma);
  }

  // Called by Dad when he hits the snow.
  onLanded() {
    audio.play("thud");
    this.sparks.explode(10, this.dad.x, GROUND);
    const stars = text(this, this.dad.x, GROUND - 60, "★ ★ ★", 22, { color: "#ffe066" }).setDepth(DEPTH.effects);
    this.tweens.add({ targets: stars, angle: 360, duration: 1300, onComplete: () => stars.destroy() });
    this.time.delayedCall(1350, () => this.say("knocked"));
  }

  // ---- the pests ---------------------------------------------------------------------------------

  // One troublemaker at a time (Grandma counts), and a breather of TROUBLE_GAP seconds between them.
  troubleFree() {
    return !this.grandma && this.pests.length === 0 && this.t - this.troubleAt >= TROUBLE_GAP && this.t < this.rules.length - 5;
  }

  // Of the pests whose turn has come, the one seen least tonight goes next; on a tie, the newest
  // kind (later in PEST_KINDS), so the night's new pest gets its debut instead of losing out to the
  // old ones while they take turns.
  schedulePests() {
    const due = PEST_KINDS.filter((kind) => this.t >= this.pestAt[kind]);
    if (!due.length || !this.troubleFree()) return;
    const seen = (kind) => this.pestsSeen[kind] || 0;
    const kind = due.reduce((a, b) => (seen(b) <= seen(a) ? b : a));
    const pest = this.makePest(kind);
    if (!pest) {
      this.pestAt[kind] = this.t + Phaser.Math.FloatBetween(2, 5); // can't come now: try again soon
      return;
    }
    this.pestAt[kind] = this.t + Phaser.Math.FloatBetween(...this.rules[kind]);
    this.pestsSeen[kind] = seen(kind) + 1;
    pest.kind = kind;
    this.pests.push(pest);
    this.troubleAt = this.t;
  }

  makePest(kind) {
    const lit = this.strands.filter((s) => s.on);
    if (kind === "cat" && lit.length) {
      audio.play("meow");
      return new Cat(this, Phaser.Utils.Array.GetRandom(lit), this.rules.life);
    }
    if (kind === "squirrel" && lit.length) {
      audio.play("chatter");
      return new Squirrel(this, Phaser.Utils.Array.GetRandom(lit), this.rules.life);
    }
    if (kind === "dog" && this.dad.bag > 0) {
      audio.play("bark");
      this.say("dog-coming", { quiet: true });
      return new Dog(this, this.dad);
    }
    if (kind === "snowball") {
      audio.play("whistle");
      return new Thrower(this, () => this.snowballTarget());
    }
    return null;
  }

  // Tapped a pest: Dad goes after it, up or down the ladder and along, and swats it when he's close.
  tappedPest(pest) {
    this.hunting = pest;
    this.huntGoal = null;
    if (pest.kind === "dog" && pest.hasBag) this.say("dog-chase", { quiet: true });
  }

  // Every frame of a hunt: keep Dad heading for the pest (they move), and swat when he's in reach.
  hunt() {
    const pest = this.hunting;
    if (!pest) return;
    if (!pest.huntable || this.phase !== "play") {
      this.hunting = null;
      return;
    }
    const d = this.dad;
    if (d.falling || d.stunned || d.step?.kind === "climb" || d.step?.kind === "job") return;
    const row = ROWS[pest.row];
    const x = Phaser.Math.Clamp(pest.x, row.x1, row.x2);
    if (d.row === pest.row && Math.abs(d.x - pest.x) < SWAT_REACH) {
      d.goTo({ row: d.row, x: d.x, job: { kind: "swat", pest } });
      this.huntGoal = null;
      return;
    }
    const goal = this.huntGoal;
    if (!d.step || !goal || goal.row !== pest.row || Math.abs(goal.x - x) > 14) {
      this.huntGoal = { row: pest.row, x };
      d.goTo(this.huntGoal);
    }
  }

  // The swat lands, if the pest is still there.
  swat(pest) {
    audio.play("swat");
    const d = this.dad;
    if (!pest.huntable || d.row !== pest.row || Math.abs(d.x - pest.x) > SWAT_REACH * 1.6) {
      floatText(this, d.x, d.y - 140, "MISSED!", "#ffffff", 20);
      return;
    }
    this.hunting = null;
    const whap = text(this, (d.x + pest.x) / 2, pest.s.y - pest.s.displayHeight / 2, "WHAP!", 26, { color: "#ff9e3d", stroke: "#ffffff", strokeThickness: 5 }).setDepth(DEPTH.effects);
    this.tweens.add({ targets: whap, scale: 1.4, alpha: 0, duration: 600, onComplete: () => whap.destroy() });
    this.cameras.main.shake(100, 0.003);
    const result = pest.swat(this.clock);
    audio.play(pest.kind === "cat" ? "hiss" : pest.kind === "dog" ? "yelp" : "pop");
    if (result === "caught") return this.onDogCaught(pest);
    this.addScore(POINTS.shoo, pest.s.x, pest.s.y - pest.s.displayHeight - 10, `SHOO! +${POINTS.shoo}`, "#8fd3ff");
    this.say(`shoo-${pest.kind}`);
  }

  // The cat sitting in front of this bulb? Then Dad can't get at it.
  catBlocking(strand, bulb) {
    const cat = this.pests.find((q) => q.kind === "cat" && q.blocks(strand, bulb));
    if (!cat) return false;
    audio.play("hiss");
    this.say("cat-block", { quiet: true });
    floatText(this, cat.s.x, cat.s.y - cat.s.displayHeight - 8, "TAP THE CAT!", "#ffe066", 18);
    this.tweens.add({ targets: cat.s, scaleY: cat.s.scaleY * 1.2, duration: 120, yoyo: true });
    return true;
  }

  onCatBat(bulb) {
    audio.play("meow");
    this.sparks.explode(5, bulb.x, bulb.y + 6);
    floatText(this, bulb.x, bulb.y - 26, "SWAT!", "#ffb3d9", 16);
  }

  onDogStole() {
    audio.play("bark");
    this.say("dog-stole");
    this.boxArrow.setVisible(true);
  }

  onDogCaught(dog) {
    audio.play("cheer");
    this.addScore(POINTS.caught, dog.x, GROUND - 60, `GOT 'IM! +${POINTS.caught}`, "#7CFC9A");
    this.say("dog-caught");
    this.boxArrow.setVisible(this.dad.bag === 0);
  }

  onDogGone() {
    this.say("dog-gone", { quiet: true });
  }

  // The kid aims at Dad when he's up the ladder, otherwise at a burning bulb.
  snowballTarget() {
    const d = this.dad;
    if (d.row > 0 && !d.falling) return { x: d.x, y: d.y - 70, dad: true };
    const bulbs = this.strands.flatMap((s) => s.burnable().map((bulb) => ({ s, bulb })));
    if (!bulbs.length) return { x: d.x, y: d.y - 70, dad: true };
    const { s, bulb } = Phaser.Utils.Array.GetRandom(bulbs);
    return { x: bulb.x, y: bulb.y + 10, strand: s, bulb };
  }

  onSnowballThrown() {
    audio.play("whoosh");
  }

  onSnowballLanded(to) {
    audio.play("splat");
    this.sparks.explode(10, to.x, to.y);
    if (this.phase !== "play") return;
    const d = this.dad;
    if (to.dad) {
      const onLadder = (d.row > 0 || d.step?.kind === "climb") && !d.falling;
      if (Math.abs(d.x - to.x) < 50 && Math.abs(d.y - 70 - to.y) < 80) {
        this.say("snowball-hit");
        if (onLadder) {
          audio.play("bonk");
          d.knockOff();
        }
      } else {
        floatText(this, to.x, to.y - 20, "MISSED!", "#ffffff", 20);
      }
    } else if (to.bulb.state === "lit" && to.strand.on) {
      // knocked half loose: it's already half way to popping
      const half = this.rules.life * 500;
      to.strand.burn(to.bulb, this.clock - half, this.rules.life);
      floatText(this, to.x, to.y - 30, "SPLAT!", "#ffffff", 20);
    }
  }

  // ---- the kid ---------------------------------------------------------------------------------

  // The kid wanders over, Dad asks for a hand, the kid checks the watch he isn't wearing and leaves.
  kidComesBy() {
    const stopAt = Phaser.Math.Clamp(this.dad.x - 90, 60, W - 260);
    this.kid = { x: KID_PATH.from, stopAt, state: "in", sprite: fit(this.add.image(KID_PATH.from, KID_PATH.y, "kid").setOrigin(0.5, 1).setDepth(DEPTH.kid), KID_H) };
  }

  updateKid(dt) {
    const k = this.kid;
    if (!k || k.state === "done") return;
    if (k.state === "in" || k.state === "out") {
      const to = k.state === "in" ? k.stopAt : KID_PATH.to;
      k.x = Math.min(to, k.x + KID_SPEED * dt);
      k.sprite.setPosition(k.x, KID_PATH.y - Math.abs(Math.sin(this.clock / 110)) * 2);
      if (k.x < to) return;
      if (k.state === "out") {
        k.sprite.destroy();
        k.state = "done";
        return;
      }
      k.state = "waiting";
      if (this.phase !== "play") return void (k.state = "out");
      this.say("kid-ask");
      this.time.delayedCall(1700, () => {
        fit(k.sprite.setTexture("kid-watch"), KID_H);
        const line = sayings.random("kid-watch");
        audio.playVoice(sayings.clip(line));
        bubble(this, k.x, k.sprite.y - 66, line.text, 1500, { follow: { get x() { return k.x; }, get y() { return k.sprite.y; } }, above: 66 });
      });
      this.time.delayedCall(3300, () => {
        fit(k.sprite.setTexture("kid"), KID_H);
        k.state = "out";
      });
    }
  }

  // ---- Dad talks -------------------------------------------------------------------------------

  // A line in a speech bubble over Dad, and his recorded voice if there is one.
  // `quiet` lines give way when he spoke a moment ago.
  say(kind, { quiet = false } = {}) {
    const now = this.clock;
    if (quiet && now - this.lastSaidAt < 2500) return;
    const line = sayings.random(kind);
    if (!line.text) return;
    this.lastSaidAt = now;
    bubble(this, this.dad.x, this.dad.y - DAD_HEAD, line.text, 1600, { follow: this.dad, above: DAD_HEAD });
    audio.playVoice(sayings.clip(line));
  }

  addScore(points, x, y, label, colour) {
    this.score += points;
    floatText(this, x, y, label, colour, 22);
    this.tweens.add({ targets: this.scoreText, scale: 1.2, duration: 90, yoyo: true });
  }

  // ---- the end of a night ----------------------------------------------------------------------

  midnight() {
    this.phase = "midnight";
    this.dad.steps = [];
    this.boxArrow.setVisible(false);
    const lit = this.strands.reduce((n, s) => n + s.litCount(), 0);
    const { points, perfect } = midnight(lit, this.poppedTonight);
    this.score += points;
    audio.play("bells");
    this.say("midnight");
    const lines = [
      [`Bulbs burning: ${lit} × ${POINTS.lit}`, "#ffffff"],
      perfect ? [`PERFECT NIGHT! +${POINTS.perfect}`, "#7CFC9A"] : [`Bulbs popped: ${this.poppedTonight}`, "#ff9e9e"],
      [`SCORE ${this.score.toLocaleString()}`, "#ffe066"],
    ];
    this.panel("MIDNIGHT!", `Night ${this.night} done`, lines, "TAP FOR THE NEXT NIGHT", () => {
      this.scene.start("Night", { night: this.night + 1, score: this.score, hearts: this.hearts, canes: this.canes, stats: this.stats });
    });
  }

  gameOver() {
    this.phase = "gameover";
    this.dad.steps = [];
    this.boxArrow.setVisible(false);
    const { rank, previousTop } = store.recordGame(this.score, this.night, this.stats);
    const challenge = store.get("challenge");
    this.time.delayedCall(900, () => {
      audio.play("groan");
      this.say("gameover");
      this.panel("LIGHTS OUT!", `You made it to night ${this.night}`, [
        [`Bulbs swapped: ${this.stats.fixed}`, "#ffffff"],
        [`Close calls: ${this.stats.close}`, "#ffffff"],
        [`SCORE ${this.score.toLocaleString()}`, "#ffe066"],
      ], "TAP TO GO ON", () => {
        this.scene.start("Results", { score: this.score, night: this.night, stats: this.stats, rank, previousTop, challenge });
      });
    });
  }

  // The II button (or the phone's back gesture): stop everything and ask whether to go on or quit.
  pause() {
    if (this.phase !== "play" && this.phase !== "intro") return;
    this.touch = null;
    audio.play("pop");
    this.scene.pause();
    this.scene.launch("Pause");
  }

  // Quitting from the pause screen ends the game here, score saved, straight to the results.
  quit() {
    this.phase = "gameover";
    const { rank, previousTop } = store.recordGame(this.score, this.night, this.stats);
    const challenge = store.get("challenge");
    this.scene.start("Results", { score: this.score, night: this.night, stats: this.stats, rank, previousTop, challenge });
  }

  panel(title, sub, lines, hint, next) {
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(DEPTH.overlay);
    this.tweens.add({ targets: shade, fillAlpha: 0.5, duration: 500 });
    const box = this.add.container(W / 2, H / 2 + 10).setDepth(DEPTH.overlay + 1).setScale(0.5).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0x1a0f14).fillRoundedRect(-250, -190, 500, 380, 24);
    g.fillStyle(0xd6b04a).fillRoundedRect(-245, -185, 490, 370, 21);
    g.fillStyle(0xa4161a).fillRoundedRect(-240, -180, 480, 360, 18);
    box.add(g);
    box.add(text(this, 0, -132, title, 50, { color: "#ffe066" }));
    box.add(text(this, 0, -82, sub, 22, { color: "#fff3c4", strokeThickness: 4 }));
    lines.forEach(([words, colour], i) => box.add(text(this, 0, -26 + i * 48, words, 24, { color: colour, strokeThickness: 4 })));
    const tapHint = text(this, 0, 146, hint, 20, { color: "#ffffff", strokeThickness: 4 }).setAlpha(0);
    box.add(tapHint);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 350, delay: 300, ease: "Back.easeOut" });
    this.time.delayedCall(1400, () => {
      tapHint.setAlpha(1);
      this.tweens.add({ targets: tapHint, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });
      this.input.once("pointerdown", next);
    });
  }

  // ---- the score bar ---------------------------------------------------------------------------

  makeHud() {
    const d = DEPTH.hud;
    const g = this.add.graphics().setDepth(d);
    g.fillStyle(0x0b0f22, 0.75).fillRect(0, 0, W, 50);
    g.fillStyle(0x1a0f14).fillRoundedRect(8, 6, 40, 38, 9);
    g.fillStyle(0xfff3c4).fillRect(19, 14, 6, 22).fillRect(31, 14, 6, 22);
    text(this, 62, 13, "SCORE", 13, { originX: 0, color: "#c9d3ee", strokeThickness: 0 }).setDepth(d);
    this.scoreText = text(this, 62, 34, "0", 28, { originX: 0, color: "#ffe066", strokeThickness: 5 }).setDepth(d);
    this.bagIcon = this.add.image(250, 25, "bulb-glass").setTint(0xffd23b).setScale(1.4).setDepth(d);
    this.bagText = text(this, 268, 26, "", 26, { originX: 0, color: "#ffffff", strokeThickness: 5 }).setDepth(d);
    text(this, W / 2, 15, `NIGHT ${this.night}`, 22, { color: "#ffffff", strokeThickness: 4 }).setDepth(d);
    this.clockText = text(this, W / 2, 37, "", 17, { color: "#ffe066", strokeThickness: 4 }).setDepth(d);
    this.caneIcon = fit(this.add.image(350, 25, "candycane"), 34).setDepth(d);
    this.caneText = text(this, 366, 26, "", 22, { originX: 0, color: "#ffffff", strokeThickness: 5 }).setDepth(d);
    this.livesText = text(this, 0, 25, "LIVES", 14, { originX: 1, color: "#c9d3ee", strokeThickness: 0 }).setDepth(d);
    this.heartIcons = [];
    for (let i = 0; i < MAX_HEARTS; i++) this.heartIcons.push(this.add.image(W - 28 - i * 38, 25, "heart").setDepth(d).setScale(1.15));
  }

  updateHud() {
    if (this.shown.score !== this.score) this.scoreText.setText(this.score.toLocaleString());
    const clock = this.phase === "intro" ? "6:00 PM" : clockAt(this.rules, this.t);
    if (this.shown.clock !== clock) this.clockText.setText(clock);
    if (this.shown.hearts !== this.hearts) {
      this.heartIcons.forEach((h, i) => {
        h.setTexture(i < this.hearts ? "heart" : "heart-empty");
        h.setVisible(i < Math.max(START_HEARTS, this.hearts));
      });
      this.livesText.setX(W - 28 - (Math.max(START_HEARTS, this.hearts) - 1) * 38 - 22);
    }
    if (this.shown.canes !== this.canes) this.caneText.setText(`${this.canes}/${CANES_PER_HEART}`);
    if (this.shown.bag !== this.dad.bag) this.bagText.setText(`× ${this.dad.bag}`).setColor(this.dad.bag ? "#ffffff" : "#ff6b6b");
    this.shown = { score: this.score, clock, hearts: this.hearts, bag: this.dad.bag, canes: this.canes };
  }

  drawDebug() {
    const g = this.add.graphics().setDepth(DEPTH.overlay);
    g.lineStyle(1, 0xff00ff);
    for (const s of this.strands) g.strokeRect(s.def.x1 - 30, s.def.wire + 24 - STRAND_TAP, s.def.x2 - s.def.x1 + 60, STRAND_TAP * 2);
    g.lineStyle(2, 0x00ffff);
    g.strokeCircle(BOX.x, BOX.y - 25, BOX_TAP);
    g.strokeCircle(SWITCH.x, SWITCH.y, SWITCH_TAP);
    g.lineStyle(2, 0xffaa00);
    ROWS.forEach((r) => g.lineBetween(r.x1, r.feet, r.x2, r.feet));
    g.lineStyle(1, 0xffffff);
    g.lineBetween(0, GROUND, W, GROUND);
  }
}

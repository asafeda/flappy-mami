import { BOSS, BANNER, FIREBALL, GROUND } from "./config.js";
import { createFireballFrames } from "./fireball.js";
import { playSfx } from "./sfx.js";

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInCubic(t) {
  return t * t * t;
}
// Small overshoot ("back") easing gives the name banner a punchy pop instead
// of a flat slide.
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}
function easeInBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
}

// idle -> warning (boss glides in + name banner) -> active (fires fireballs
// for BOSS.durationPipes pipes) -> leaving (glides back off-screen) -> idle.
export class BossManager {
  constructor(worldWidth, worldHeight, getAssets) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.getAssets = getAssets;
    this.reset();
  }

  reset() {
    this.state = "idle";
    this.fightIndex = 0; // 0-based: which fight (also picks boss art + escalation)
    this.timer = 0;
    this.fightStartPipe = 0;
    this.x = this.offX;
    this.y = this.hoverCenterY;
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.fireTimer = 0;
    this.charging = false;
    this.fireballs = [];
  }

  get restX() {
    return this.worldWidth * BOSS.xFraction;
  }
  get offX() {
    return this.worldWidth + BOSS.size;
  }
  get hoverCenterY() {
    return (this.worldHeight - GROUND.height) * 0.42;
  }
  get hoverAmp() {
    const bottom = this.worldHeight - GROUND.height;
    const cy = this.hoverCenterY;
    return Math.max(16, Math.min(BOSS.hoverAmplitude, cy - 50, bottom - cy - 50));
  }

  nextFightPipe() {
    return BOSS.firstPipe + this.fightIndex * BOSS.everyPipes;
  }

  bannerTotalSec() {
    return BANNER.riseSec + BANNER.holdSec + BANNER.fallSec;
  }

  fireIntervalForFight() {
    return Math.max(
      BOSS.fireIntervalMin,
      BOSS.fireIntervalBase - BOSS.fireIntervalPerFight * this.fightIndex
    );
  }

  muzzlePoint() {
    return { x: this.x - BOSS.size * 0.46, y: this.y };
  }

  beginWarning() {
    this.state = "warning";
    this.timer = 0;
    this.hoverPhase = Math.random() * Math.PI * 2;
    playSfx("bossWarn", this.getAssets().sounds?.boss);
  }

  update(dt, speed, pipesPassed, bird) {
    // Fireballs already in flight must keep moving and get pruned once
    // off-screen no matter what the boss itself is doing — otherwise the
    // last shot of a fight freezes in place forever once the boss exits
    // back to "idle" (that state returns early, below, before ever reaching
    // fireball logic).
    this.updateFireballs(dt);

    const hoverStep = dt * ((Math.PI * 2) / BOSS.hoverPeriod);

    if (this.state === "idle") {
      if (pipesPassed >= this.nextFightPipe()) {
        this.beginWarning();
      }
      return;
    }

    if (this.state === "warning") {
      this.timer += dt;
      this.hoverPhase += hoverStep;
      const total = this.bannerTotalSec();
      const enterT = clamp01(this.timer / BANNER.riseSec);
      this.x = lerp(this.offX, this.restX, easeOutCubic(enterT));
      this.y = this.hoverCenterY + Math.sin(this.hoverPhase) * this.hoverAmp * enterT;
      if (this.timer >= total) {
        this.state = "active";
        this.timer = 0;
        this.fightStartPipe = pipesPassed;
        this.fireTimer = this.fireIntervalForFight() * 0.4;
        this.charging = false;
      }
      return;
    }

    if (this.state === "active") {
      this.timer += dt;
      this.hoverPhase += hoverStep;
      this.x = this.restX;
      this.y = this.hoverCenterY + Math.sin(this.hoverPhase) * this.hoverAmp;

      this.fireTimer -= dt;
      this.charging = this.fireTimer <= BOSS.chargeSec && this.fireTimer > 0;
      if (this.fireTimer <= 0 && this.fireballs.length < BOSS.maxActiveFireballs) {
        this.spawnFireballs(bird);
        this.fireTimer = this.fireIntervalForFight();
        this.charging = false;
      }

      if (pipesPassed >= this.fightStartPipe + BOSS.durationPipes) {
        this.state = "leaving";
        this.timer = 0;
        this.charging = false;
      }
    } else if (this.state === "leaving") {
      this.timer += dt;
      this.hoverPhase += hoverStep;
      const t = clamp01(this.timer / BOSS.leaveSec);
      this.x = lerp(this.restX, this.offX, easeInCubic(t));
      this.y = this.hoverCenterY + Math.sin(this.hoverPhase) * this.hoverAmp * (1 - t);
      if (this.timer >= BOSS.leaveSec) {
        this.state = "idle";
        this.fightIndex++;
      }
    }
  }

  spawnFireballs(bird) {
    const muzzle = this.muzzlePoint();
    const speed = Math.min(
      FIREBALL.speedBase + FIREBALL.speedPerFight * this.fightIndex,
      FIREBALL.speedMax
    );
    const volley = this.fightIndex >= BOSS.volleyFromFight ? 2 : 1;

    for (let i = 0; i < volley; i++) {
      const spreadOffset =
        volley === 2 ? (i === 0 ? -BOSS.volleySpread : BOSS.volleySpread) : 0;
      const targetX = bird.x;
      const targetY = bird.y + bird.vy * FIREBALL.leadFactor + spreadOffset;
      const dx = targetX - muzzle.x;
      const dy = targetY - muzzle.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      this.fireballs.push({
        x: muzzle.x,
        y: muzzle.y,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        seed: Math.floor(Math.random() * 3),
      });
    }

    playSfx("fire", this.getAssets().sounds?.fireball);
  }

  updateFireballs(dt) {
    for (const fb of this.fireballs) {
      fb.x += fb.vx * dt;
      fb.y += fb.vy * dt;
    }
    this.fireballs = this.fireballs.filter(
      (fb) =>
        fb.x > -40 &&
        fb.x < this.worldWidth + 40 &&
        fb.y > -40 &&
        fb.y < this.worldHeight + 40
    );
  }

  hitsBird(bird) {
    if (this.fireballs.length === 0) return false;
    const { x: bx, y: by, radius: br } = bird.getBounds();
    for (const fb of this.fireballs) {
      const dist = Math.hypot(fb.x - bx, fb.y - by);
      if (dist < br + FIREBALL.hitboxRadius) return true;
    }
    return false;
  }

  // Returns { y, text } while the intro banner should be shown, else null.
  getBannerInfo() {
    if (this.state !== "warning") return null;
    const restY = this.worldHeight * BANNER.restYFraction;
    const hiddenY = this.worldHeight + 40;
    const t = this.timer;
    let y;
    if (t < BANNER.riseSec) {
      y = lerp(hiddenY, restY, easeOutBack(clamp01(t / BANNER.riseSec)));
    } else if (t < BANNER.riseSec + BANNER.holdSec) {
      y = restY;
    } else {
      const ft = clamp01((t - BANNER.riseSec - BANNER.holdSec) / BANNER.fallSec);
      y = lerp(restY, hiddenY, easeInBack(ft));
    }
    return { y, text: BOSS.name };
  }

  draw(ctx) {
    if (this.state === "idle") return;
    const assets = this.getAssets();
    const bosses = assets.bosses;
    const img = bosses && bosses.length ? bosses[this.fightIndex % bosses.length].image : null;
    const size = BOSS.size;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (img) {
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
    } else {
      drawPlaceholderBoss(ctx, this.x, this.y, size, this.charging);
    }
    ctx.restore();
  }

  drawFireballs(ctx) {
    if (this.fireballs.length === 0) return;
    const frames = createFireballFrames();
    const s = FIREBALL.size;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const fb of this.fireballs) {
      const idx = Math.floor(performance.now() / 90 + fb.seed) % frames.length;
      ctx.drawImage(frames[idx], fb.x - s / 2, fb.y - s / 2, s, s);
    }
    ctx.restore();
  }
}

// Used only until you drop art into assets/boss/ — a simple crowned blob
// facing left (toward the bird), with the mouth flashing bright during the
// charge-up telegraph just before it fires.
function drawPlaceholderBoss(ctx, cx, cy, size, charging) {
  const r = size / 2;
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = "#3a1a52";
  ctx.strokeStyle = "#150826";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffd54f";
  ctx.strokeStyle = "#8a5a00";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.5);
  ctx.lineTo(-r * 0.2, -r * 0.95);
  ctx.lineTo(0, -r * 0.5);
  ctx.lineTo(r * 0.2, -r * 0.95);
  ctx.lineTo(r * 0.4, -r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ff2b4a";
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.05, r * 0.11, 0, Math.PI * 2);
  ctx.arc(r * 0.05, -r * 0.05, r * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = charging ? "#ffe9a0" : "#1a0a24";
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, r * 0.18, r * 0.22, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  if (charging) {
    ctx.strokeStyle = "#ff8a1a";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}

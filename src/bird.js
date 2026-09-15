import { BIRD, PHYSICS } from "./config.js";

export class Bird {
  constructor(worldHeight) {
    this.x = BIRD.startX;
    this.y = worldHeight / 2;
    this.vy = 0;
    this.rotation = 0;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.alive = true;
  }

  flap() {
    if (!this.alive) return;
    this.vy = PHYSICS.flapImpulse;
  }

  update(dt) {
    this.vy += PHYSICS.gravity * dt;
    if (this.vy > PHYSICS.terminalFall) this.vy = PHYSICS.terminalFall;
    this.y += this.vy * dt;

    // Rotation follows velocity: nose up right after a flap, nose down while falling.
    const targetRotation =
      this.vy < 0
        ? PHYSICS.maxRotationUp
        : Math.min(
            PHYSICS.maxRotationDown,
            (this.vy / PHYSICS.terminalFall) * PHYSICS.maxRotationDown
          );
    this.rotation += (targetRotation - this.rotation) * Math.min(1, dt * 10);

    if (this.alive) {
      this.frameTimer += dt;
      const frameDuration = 1 / BIRD.flapAnimFps;
      if (this.frameTimer >= frameDuration) {
        this.frameTimer -= frameDuration;
        this.frameIndex++;
      }
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, radius: BIRD.hitboxRadius };
  }

  draw(ctx, assets) {
    const frames = assets.bird;
    const size = BIRD.frameSize;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    if (frames && frames.length > 0) {
      const deadFrame = !this.alive && assets.birdDead ? assets.birdDead : null;
      const img = deadFrame || frames[this.frameIndex % frames.length];
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      drawPlaceholderBird(ctx, size, this.alive);
    }

    ctx.restore();
  }
}

function drawPlaceholderBird(ctx, size, alive) {
  const r = size / 2.4;
  ctx.fillStyle = alive ? "#f7c948" : "#c9a13b";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 3;
  ctx.stroke();

  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // beak
  ctx.fillStyle = "#ff8c00";
  ctx.beginPath();
  ctx.moveTo(r * 0.8, 0);
  ctx.lineTo(r * 1.5, r * 0.15);
  ctx.lineTo(r * 0.8, r * 0.4);
  ctx.closePath();
  ctx.fill();

  // wing
  ctx.fillStyle = "#e0a92e";
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, r * 0.2, r * 0.55, r * 0.35, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

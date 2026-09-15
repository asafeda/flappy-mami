import { BIRD, PHYSICS } from "./config.js";
import { CLASSIC_SKIN_ID } from "./skins.js";

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

  // `skin` is { id, label, image } — a single static picture (or null for the
  // built-in classic bird). Wing motion is driven by frameIndex regardless of
  // which skin is active, so every skin "flies" the same way.
  draw(ctx, skin) {
    const size = BIRD.frameSize;
    const wingPhase = this.frameIndex % 4;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    if (skin && skin.id !== CLASSIC_SKIN_ID && skin.image) {
      drawPhotoBird(ctx, skin.image, size, wingPhase, this.alive);
    } else {
      drawClassicBird(ctx, size, wingPhase, this.alive);
    }

    ctx.restore();
  }
}

// Shared by hud.js to render a static preview of a skin (e.g. in the
// title-screen picker). Caller is expected to translate ctx to the desired
// center point first.
export function drawSkinPreview(ctx, skin, size, wingPhase = 1) {
  if (skin && skin.id !== CLASSIC_SKIN_ID && skin.image) {
    drawPhotoBird(ctx, skin.image, size, wingPhase, true);
  } else {
    drawClassicBird(ctx, size, wingPhase, true);
  }
}

// A single static photo, circle-masked with a thick pixel outline. The wing
// is drawn first so it flaps *behind* the portrait instead of covering it.
function drawPhotoBird(ctx, image, size, wingPhase, alive) {
  const r = size / 2;
  ctx.imageSmoothingEnabled = false;

  drawPhotoWing(ctx, r, wingPhase, "#f7c948", "#b8860b");

  // Cover-fit crop so any source aspect ratio fills the circle without warping.
  const srcRatio = image.width / image.height;
  let sx, sy, sw, sh;
  if (srcRatio > 1) {
    sh = image.height;
    sw = sh;
    sx = (image.width - sw) / 2;
    sy = 0;
  } else {
    sw = image.width;
    sh = sw;
    sx = 0;
    sy = (image.height - sh) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
  ctx.clip();
  if (!alive) ctx.filter = "grayscale(1) brightness(0.7)";
  ctx.drawImage(image, sx, sy, sw, sh, -r, -r, size, size);
  ctx.restore();

  // Thick pixel-art ring around the portrait.
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
  ctx.stroke();

  drawPhotoBeak(ctx, r, "#ff8c00", "#b8620a");

  if (!alive) drawXEyes(ctx, r);
}

// Blocky 8-bit style bird built from filled rects (no image asset needed).
const CLASSIC_PALETTE = {
  body: "#f7c948",
  bodyDark: "#e0a92e",
  outline: "#5a3a12",
  belly: "#fff4d6",
  beak: "#ff8c00",
  beakDark: "#c96b00",
  eyeWhite: "#ffffff",
  eyeDark: "#222222",
};

function drawClassicBird(ctx, size, wingPhase, alive) {
  const r = size / 2.3;
  ctx.imageSmoothingEnabled = false;

  // Body
  ctx.fillStyle = CLASSIC_PALETTE.body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Belly patch
  ctx.fillStyle = CLASSIC_PALETTE.belly;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, r * 0.35, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hard pixel outline
  ctx.lineWidth = 3;
  ctx.strokeStyle = CLASSIC_PALETTE.outline;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Eye
  if (alive) {
    ctx.fillStyle = CLASSIC_PALETTE.eyeWhite;
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CLASSIC_PALETTE.eyeDark;
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.32, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawXEyes(ctx, r, r * 0.35, -r * 0.3);
  }

  drawBeak(ctx, r, CLASSIC_PALETTE.beak, CLASSIC_PALETTE.beakDark);
  drawWing(ctx, r, wingPhase, CLASSIC_PALETTE.bodyDark, CLASSIC_PALETTE.outline);
}

// Wing angle cycles through 4 phases: up, mid, down, mid — a simple flap loop
// driven by the same frameIndex counter every skin shares.
function drawWing(ctx, r, wingPhase, fill, stroke) {
  const angles = [-0.5, 0.1, 0.6, 0.1];
  const angle = angles[wingPhase] ?? 0.1;

  ctx.save();
  ctx.translate(-r * 0.05, r * 0.05);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.6, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBeak(ctx, r, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 0.75, 0);
  ctx.lineTo(r * 1.45, r * 0.15);
  ctx.lineTo(r * 0.75, r * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Photo-skin wing: pivot on the left edge so only a crescent peeks out from
// behind the portrait as it flaps. Same 4-phase angles as the classic wing.
function drawPhotoWing(ctx, r, wingPhase, fill, stroke) {
  const angles = [-0.5, 0.1, 0.6, 0.1];
  const angle = angles[wingPhase] ?? 0.1;

  ctx.save();
  ctx.translate(-r * 0.75, r * 0.1);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.45, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Short beak that starts at the portrait rim so it doesn't cover the face.
function drawPhotoBeak(ctx, r, fill, stroke) {
  const startX = r - 2;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, -r * 0.05);
  ctx.lineTo(startX + r * 0.42, r * 0.08);
  ctx.lineTo(startX, r * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawXEyes(ctx, r, cx = r * 0.35, cy = -r * 0.1) {
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 3;
  const s = r * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s);
  ctx.lineTo(cx + s, cy + s);
  ctx.moveTo(cx + s, cy - s);
  ctx.lineTo(cx - s, cy + s);
  ctx.stroke();
}

import { PIPES, GROUND } from "./config.js";
import { gapHeightForTier, spacingForTier } from "./difficulty.js";

export class PipeManager {
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.pipes = [];
    this.distanceSinceLastSpawn = Infinity; // forces an immediate first spawn
  }

  reset() {
    this.pipes = [];
    this.distanceSinceLastSpawn = Infinity;
  }

  playableBottom() {
    return this.worldHeight - GROUND.height;
  }

  spawnPipe(tier) {
    const gapHeight = gapHeightForTier(tier);
    const bottom = this.playableBottom();
    const margin = PIPES.minGapCenterMargin;
    const minCenter = margin + gapHeight / 2;
    const maxCenter = bottom - margin - gapHeight / 2;
    const gapCenter =
      minCenter >= maxCenter
        ? bottom / 2
        : minCenter + Math.random() * (maxCenter - minCenter);

    const pipe = {
      x: this.worldWidth + PIPES.width,
      width: PIPES.width,
      gapHeight,
      gapTop: gapCenter - gapHeight / 2,
      gapBottom: gapCenter + gapHeight / 2,
      scored: false,
      collectible: null,
    };
    this.pipes.push(pipe);
    return pipe;
  }

  update(dt, speedPxPerSec, tier, onPipeReady) {
    const dx = speedPxPerSec * dt;
    for (const pipe of this.pipes) {
      pipe.x -= dx;
    }
    this.pipes = this.pipes.filter((p) => p.x + p.width > -10);

    this.distanceSinceLastSpawn += dx;
    const spacing = spacingForTier(tier);
    const lastPipe = this.pipes[this.pipes.length - 1];
    const shouldSpawn = !lastPipe || this.worldWidth - lastPipe.x >= spacing;
    if (shouldSpawn && this.distanceSinceLastSpawn >= spacing) {
      const pipe = this.spawnPipe(tier);
      this.distanceSinceLastSpawn = 0;
      if (onPipeReady) onPipeReady(pipe);
    }
  }

  // Returns 1 for each pipe the bird just cleared (for scoring), else 0.
  collectScoring(birdX) {
    let scored = 0;
    for (const pipe of this.pipes) {
      if (!pipe.scored && pipe.x + pipe.width < birdX) {
        pipe.scored = true;
        scored++;
      }
    }
    return scored;
  }

  collidesWith(bird) {
    const { x, y, radius } = bird.getBounds();
    for (const pipe of this.pipes) {
      if (x + radius < pipe.x || x - radius > pipe.x + pipe.width) continue;
      if (y - radius < pipe.gapTop || y + radius > pipe.gapBottom) {
        return true;
      }
    }
    return false;
  }

  hitsGroundOrCeiling(bird) {
    const { y, radius } = bird.getBounds();
    if (y - radius < 0) return true;
    if (y + radius > this.playableBottom()) return true;
    return false;
  }

  draw(ctx, assets, tier = 0) {
    const palette = paletteForTier(tier);
    for (const pipe of this.pipes) {
      this.drawPipe(ctx, assets, pipe, palette);
    }
  }

  drawPipe(ctx, assets, pipe, palette) {
    const bottom = this.playableBottom();
    if (assets.pipeBody && assets.pipeCap) {
      drawImagePipeSegment(ctx, assets, pipe.x, 0, pipe.width, pipe.gapTop, true);
      drawImagePipeSegment(
        ctx,
        assets,
        pipe.x,
        pipe.gapBottom,
        pipe.width,
        bottom - pipe.gapBottom,
        false
      );
    } else {
      drawPlaceholderPipeSegment(ctx, pipe.x, 0, pipe.width, pipe.gapTop, true, palette);
      drawPlaceholderPipeSegment(
        ctx,
        pipe.x,
        pipe.gapBottom,
        pipe.width,
        bottom - pipe.gapBottom,
        false,
        palette
      );
    }
  }
}

// Pipe color deepens as difficulty ramps up: green -> teal -> violet.
const TIER_PALETTES = [
  { body: "#5fd45f", light: "#8ff08f", dark: "#2e7d32", cap: "#6fe06f" },
  { body: "#3fc7b0", light: "#7fe8d8", dark: "#1f6e63", cap: "#4fd8c0" },
  { body: "#4aa8e0", light: "#8ccdf0", dark: "#245e8a", cap: "#5cb8ec" },
  { body: "#9a6fe0", light: "#c3a6f2", dark: "#4f2e8a", cap: "#a97ef0" },
  { body: "#e05fa0", light: "#f0a0c8", dark: "#8a2e5e", cap: "#ec6fb0" },
];

function paletteForTier(tier) {
  const idx = Math.min(TIER_PALETTES.length - 1, Math.floor(tier / 2));
  return TIER_PALETTES[idx];
}

function drawImagePipeSegment(ctx, assets, x, y, width, height, isTop) {
  if (height <= 0) return;
  ctx.save();
  const capH = PIPES.capHeight;
  const bodyH = Math.max(0, height - capH);
  if (isTop) {
    // body grows downward from the top edge, cap sits just above the gap
    ctx.drawImage(assets.pipeBody, x, y, width, bodyH);
    ctx.drawImage(assets.pipeCap, x - 4, y + bodyH, width + 8, capH);
  } else {
    ctx.drawImage(assets.pipeCap, x - 4, y, width + 8, capH);
    ctx.drawImage(assets.pipeBody, x, y + capH, width, bodyH);
  }
  ctx.restore();
}

function drawPlaceholderPipeSegment(ctx, x, y, width, height, isTop, palette) {
  if (height <= 0) return;
  const pal = palette || TIER_PALETTES[0];
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Body: flat fill + a left highlight band and right shade band for a
  // chunky pixel-art bevel, then a hard dark outline.
  ctx.fillStyle = pal.body;
  ctx.fillRect(x, y, width, height);

  const bandW = Math.max(4, Math.round(width * 0.22));
  ctx.fillStyle = pal.light;
  ctx.fillRect(x, y, bandW, height);
  ctx.fillStyle = pal.dark;
  ctx.fillRect(x + width - bandW, y, bandW, height);

  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);

  // Cap: wider rim with a rivet row.
  const capH = PIPES.capHeight;
  const capY = isTop ? y + height - capH : y;
  ctx.fillStyle = pal.cap;
  ctx.fillRect(x - 4, capY, width + 8, capH);
  ctx.fillStyle = pal.light;
  ctx.fillRect(x - 4, capY, width + 8, Math.max(3, Math.round(capH * 0.25)));
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 4 + 1.5, capY + 1.5, width + 8 - 3, capH - 3);

  ctx.fillStyle = pal.dark;
  const rivetY = capY + capH / 2;
  const rivetR = 2;
  ctx.beginPath();
  ctx.arc(x + 6, rivetY, rivetR, 0, Math.PI * 2);
  ctx.arc(x + width - 6, rivetY, rivetR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

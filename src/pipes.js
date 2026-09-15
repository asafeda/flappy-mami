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

  draw(ctx, assets) {
    for (const pipe of this.pipes) {
      this.drawPipe(ctx, assets, pipe);
    }
  }

  drawPipe(ctx, assets, pipe) {
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
      drawPlaceholderPipeSegment(ctx, pipe.x, 0, pipe.width, pipe.gapTop, true);
      drawPlaceholderPipeSegment(
        ctx,
        pipe.x,
        pipe.gapBottom,
        pipe.width,
        bottom - pipe.gapBottom,
        false
      );
    }
  }
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

function drawPlaceholderPipeSegment(ctx, x, y, width, height, isTop) {
  if (height <= 0) return;
  ctx.save();
  ctx.fillStyle = "#4caf50";
  ctx.strokeStyle = "#2e7d32";
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  const capH = PIPES.capHeight;
  ctx.fillStyle = "#66bb6a";
  if (isTop) {
    ctx.fillRect(x - 4, y + height - capH, width + 8, capH);
    ctx.strokeRect(x - 4, y + height - capH, width + 8, capH);
  } else {
    ctx.fillRect(x - 4, y, width + 8, capH);
    ctx.strokeRect(x - 4, y, width + 8, capH);
  }
  ctx.restore();
}

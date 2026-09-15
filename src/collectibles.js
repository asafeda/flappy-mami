import { COLLECTIBLES, GROUND } from "./config.js";

export class CollectibleManager {
  constructor(worldHeight, getAssets) {
    this.worldHeight = worldHeight;
    this.getAssets = getAssets;
    this.items = [];
  }

  reset() {
    this.items = [];
  }

  playableBottom() {
    return this.worldHeight - GROUND.height;
  }

  spawnChanceForTier(tier) {
    return Math.min(
      COLLECTIBLES.baseSpawnChance + COLLECTIBLES.spawnChancePerTier * tier,
      COLLECTIBLES.maxSpawnChance
    );
  }

  // Called right after a pipe spawns, so the collectible can be placed
  // relative to that pipe's gap.
  maybeSpawnForPipe(pipe, score, tier) {
    const assets = this.getAssets();
    if (!assets.collectibles || assets.collectibles.length === 0) return;
    if (score < COLLECTIBLES.firstScore) return;
    if (Math.random() > this.spawnChanceForTier(tier)) return;

    const def =
      assets.collectibles[Math.floor(Math.random() * assets.collectibles.length)];
    const { x, y } = this.placementForTier(pipe, tier);

    this.items.push({
      x,
      y,
      size: COLLECTIBLES.size,
      radius: COLLECTIBLES.hitboxRadius,
      image: def.image,
      points: def.points ?? COLLECTIBLES.defaultPoints,
      effect: def.effect || null,
      collected: false,
    });
  }

  // Escalating placement difficulty. Tier 1 = easy/central, higher tiers push
  // the collectible toward gap edges, pipe caps, and the ceiling/floor.
  placementForTier(pipe, tier) {
    const gapCenter = (pipe.gapTop + pipe.gapBottom) / 2;
    const gapHalf = (pipe.gapBottom - pipe.gapTop) / 2;
    const cx = pipe.x + pipe.width / 2;
    const bottom = this.playableBottom();

    if (tier <= 1) {
      // Dead center of the gap: essentially free.
      return { x: cx, y: gapCenter };
    }

    if (tier === 2) {
      // Offset ~30% toward a random gap edge.
      const dir = Math.random() < 0.5 ? -1 : 1;
      return { x: cx, y: gapCenter + dir * gapHalf * 0.3 };
    }

    if (tier === 3) {
      // Just inside a gap edge: needs a deliberate flap to line up.
      const dir = Math.random() < 0.5 ? -1 : 1;
      return { x: cx, y: gapCenter + dir * gapHalf * 0.7 };
    }

    if (tier === 4) {
      // Right at the gap edge, plus a lateral offset before the pipe so you
      // have to commit to the line before reaching it.
      const dir = Math.random() < 0.5 ? -1 : 1;
      const lateral = pipe.width * 0.6;
      return {
        x: cx - lateral,
        y: gapCenter + dir * gapHalf * 0.9,
      };
    }

    // Tier 5+: tight pockets right above/below a pipe cap, or out near the
    // ceiling/floor between this pipe and the next one - a real detour.
    const variant = Math.floor(Math.random() * 3);
    if (variant === 0) {
      // Just above the top pipe's cap (inside the gap, hugging the edge).
      return { x: cx, y: pipe.gapTop + 14 };
    }
    if (variant === 1) {
      // Just below the bottom pipe's cap.
      return { x: cx, y: pipe.gapBottom - 14 };
    }
    // Near the ceiling or floor, offset past the pipe.
    const nearTop = Math.random() < 0.5;
    return {
      x: pipe.x + pipe.width + 60,
      y: nearTop ? 40 : bottom - 40,
    };
  }

  update(dt, speedPxPerSec, bird, onCollected) {
    const dx = speedPxPerSec * dt;
    for (const item of this.items) {
      item.x -= dx;
    }
    this.items = this.items.filter((i) => i.x > -40 && !i.collected);

    const { x: bx, y: by, radius: br } = bird.getBounds();
    for (const item of this.items) {
      if (item.collected) continue;
      const dxp = item.x - bx;
      const dyp = item.y - by;
      const dist = Math.hypot(dxp, dyp);
      if (dist < br + item.radius) {
        item.collected = true;
        if (onCollected) onCollected(item);
      }
    }
  }

  draw(ctx) {
    for (const item of this.items) {
      if (item.collected) continue;
      const s = item.size;
      if (item.image) {
        const bob = Math.sin(performance.now() / 220 + item.x * 0.05) * 3;
        ctx.drawImage(item.image, item.x - s / 2, item.y - s / 2 + bob, s, s);
      } else {
        drawPlaceholderCollectible(ctx, item.x, item.y, s);
      }
    }
  }
}

function drawPlaceholderCollectible(ctx, x, y, size) {
  const r = size / 2.3;
  const t = performance.now() / 1000;
  // Per-item phase so stars don't all bob/spin in lockstep.
  const phase = (x * 0.05) % (Math.PI * 2);
  const bob = Math.sin(t * 3 + phase) * 3;
  const wobble = Math.sin(t * 2 + phase) * 0.15;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y + bob);
  ctx.rotate(wobble);

  ctx.fillStyle = "#ffd54f";
  ctx.strokeStyle = "#c9860c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * i) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = Math.cos(angle) * rad;
    const py = Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shine pixel
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(-r * 0.25, -r * 0.4, r * 0.3, r * 0.3);

  ctx.restore();
}

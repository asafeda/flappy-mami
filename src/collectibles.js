import { BIRD, COLLECTIBLES, GROUND } from "./config.js";
import { pickCollectible } from "./coins.js";

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

  // Called right after a new pipe column spawns. The collectible is placed in
  // the open corridor between the previous column and this one — never inside
  // a pipe gap.
  maybeSpawnBetween(prevPipe, nextPipe, score, tier) {
    if (!prevPipe || !nextPipe) return;
    const assets = this.getAssets();
    if (!assets.collectibles || assets.collectibles.length === 0) return;
    if (score < COLLECTIBLES.firstScore) return;
    if (Math.random() > this.spawnChanceForTier(tier)) return;

    const def = pickCollectible(assets.collectibles);
    if (!def) return;
    const { x, y } = this.placementBetween(prevPipe, nextPipe, tier);

    this.items.push({
      x,
      y,
      size: COLLECTIBLES.size,
      radius: COLLECTIBLES.hitboxRadius,
      image: def.image || null,
      frames: def.frames || null,
      points: def.points ?? COLLECTIBLES.defaultPoints,
      effect: def.effect || null,
      collected: false,
    });
  }

  // Random but reachable: sit in the strip between columns, near the flight
  // path between the two gaps, with a vertical detour that grows with tier.
  placementBetween(prevPipe, nextPipe, tier) {
    const padding = COLLECTIBLES.size / 2 + 8;
    const left = prevPipe.x + prevPipe.width + padding;
    const right = nextPipe.x - padding;
    const span = right - left;
    const t = 0.35 + Math.random() * 0.3;
    const x = span > 0 ? left + span * t : (prevPipe.x + prevPipe.width + nextPipe.x) / 2;

    const prevCenter = (prevPipe.gapTop + prevPipe.gapBottom) / 2;
    const nextCenter = (nextPipe.gapTop + nextPipe.gapBottom) / 2;
    const pathY = prevCenter + (nextCenter - prevCenter) * t;

    const bottom = this.playableBottom();
    const margin = BIRD.hitboxRadius + COLLECTIBLES.hitboxRadius + 16;
    const minY = margin;
    const maxY = bottom - margin;
    const playable = Math.max(0, maxY - minY);
    const maxOff = playable * Math.min(0.25 + tier * 0.08, 0.7);
    const offset = (Math.random() * 2 - 1) * maxOff;
    const y = Math.max(minY, Math.min(maxY, pathY + offset));

    return { x, y };
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
      const bob = Math.sin(performance.now() / 220 + item.x * 0.05) * 3;
      const y = item.y + bob;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(item.x, y + s * 0.42, s * 0.28, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      if (item.frames && item.frames.length) {
        const fps = 10;
        const idx =
          Math.floor(performance.now() / (1000 / fps) + item.x * 0.2) %
          item.frames.length;
        ctx.drawImage(item.frames[idx], item.x - s / 2, y - s / 2, s, s);
      } else if (item.image) {
        ctx.drawImage(item.image, item.x - s / 2, y - s / 2, s, s);
      } else {
        drawPlaceholderCollectible(ctx, item.x, item.y, s);
      }

      ctx.restore();
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

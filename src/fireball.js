// Procedural 8-bit fireball projectile for the boss fight. Built the same
// general way as coins.js (baked once onto small offscreen canvases, drawn
// with image smoothing off for a crunchy pixel look) but generated from
// concentric color rings plus scattered ember pixels instead of hand-drawn
// ASCII art — a glowing ball reads fine without a bespoke sprite sheet, and
// this keeps the three flicker frames easy to vary.

const SCALE = 2; // 16px art -> 32px sprite, matches FIREBALL.size
const ART = 16;

// Distance-from-center thresholds, checked in order (tightest first).
const RINGS = [
  { r: 1.4, color: "#fff6c0" }, // white-hot core
  { r: 2.6, color: "#ffcf3a" }, // yellow
  { r: 3.8, color: "#ff8a1a" }, // orange
  { r: 5.0, color: "#e0400a" }, // deep red
  { r: 5.8, color: "#5a0d00" }, // outline
];

function colorForDist(dist) {
  for (const ring of RINGS) {
    if (dist <= ring.r) return ring.color;
  }
  return null;
}

// Tiny deterministic PRNG so each frame's ember scatter is fixed (baked
// once) but different frame-to-frame, giving a flicker when cycled.
function makeRng(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return (state % 1000) / 1000;
  };
}

function bakeFireballFrame(seed) {
  const canvas = document.createElement("canvas");
  canvas.width = ART * SCALE;
  canvas.height = ART * SCALE;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;

  const cx = 7;
  const cy = 8;
  const next = makeRng(seed);

  for (let y = 0; y < ART; y++) {
    for (let x = 0; x < ART; x++) {
      const dx = x - cx;
      const dy = (y - cy) * 1.05;
      const dist = Math.hypot(dx, dy);
      let color = colorForDist(dist);

      // Trailing embers on the rear side (+x — the fireball travels toward
      // -x, so this is "behind" it), reseeded per frame for a lively flicker.
      if (!color && dx > 2 && dx < 7 && Math.abs(dy) < 4) {
        const chance = 0.35 - Math.abs(dy) * 0.05;
        if (next() < chance) {
          color = next() < 0.5 ? "#ff8a1a" : "#ffcf3a";
        }
      }

      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
  return canvas;
}

let cachedFrames = null;

export function createFireballFrames() {
  if (cachedFrames) return cachedFrames;
  cachedFrames = [1, 7, 13].map((seed) => bakeFireballFrame(seed));
  return cachedFrames;
}

// Procedural 8-bit coins used as collectible fallbacks until custom PNGs
// land in assets/collectibles/. Three palettes, four spin frames each
// (front → 3/4 → edge → flipped 3/4), baked once onto offscreen canvases.

const SCALE = 3; // 16px art → 48px sprite, matches COLLECTIBLES.size

const PALETTES = {
  gold: {
    O: "#6b2c00",
    D: "#c06000",
    M: "#f0a800",
    H: "#ffe060",
    W: "#fff8c8",
  },
  red: {
    O: "#5a0008",
    D: "#a01018",
    M: "#e03030",
    H: "#ff8080",
    W: "#ffd0d0",
  },
  silver: {
    O: "#2a2a38",
    D: "#6a6a7a",
    M: "#b8b8c8",
    H: "#e8e8f0",
    W: "#ffffff",
  },
};

// 16x16 Super Mario-ish coin. Letters map to palette keys; "." is transparent.
// Front is a solid disc with a northwest shine; 3/4 shows the rim thickness.
const FRAME_FRONT = [
  "......OOOO......",
  "....OOHHHHOO....",
  "...OHHMMMMHHO...",
  "..OHMMMMMMMMHO..",
  ".OHMMWWMMMMMMHO.",
  ".OHMMWWMMMMMMHO.",
  ".OHMMMMMMMMMMHO.",
  ".OHMMMMMMMMMMHO.",
  ".OHMMMMMMMMMMHO.",
  ".OHMMMMMMMMMMHO.",
  ".OHMMMMMMMMDDHO.",
  ".OHMMMMMMMMDDHO.",
  "..OHMMMMMMMMHO..",
  "...OHHMMMMHHO...",
  "....OOHHHHOO....",
  "......OOOO......",
];

const FRAME_THREE_Q = [
  "................",
  "......OOOO......",
  ".....OHHHHO.....",
  "....OHMMMMHO....",
  "....OHWWMMHO....",
  "....OHWWMMHO....",
  "....OHMMMMHO....",
  "....OHMMMMHO....",
  "....OHMMMMHO....",
  "....OHMMMMHO....",
  "....OHMMDDHO....",
  "....OHMMDDHO....",
  "....OHMMMMHO....",
  ".....OHHHHO.....",
  "......OOOO......",
  "................",
];

const FRAME_EDGE = [
  "................",
  ".......OO.......",
  ".......HH.......",
  ".......MM.......",
  ".......WW.......",
  ".......DD.......",
  ".......WW.......",
  ".......MM.......",
  ".......MM.......",
  ".......WW.......",
  ".......DD.......",
  ".......WW.......",
  ".......MM.......",
  ".......HH.......",
  ".......OO.......",
  "................",
];

function bakeFrame(rows, palette) {
  const artW = rows[0].length;
  const artH = rows.length;
  const canvas = document.createElement("canvas");
  canvas.width = artW * SCALE;
  canvas.height = artH * SCALE;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  for (let y = 0; y < artH; y++) {
    const row = rows[y];
    for (let x = 0; x < artW; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      g.fillStyle = palette[ch] || palette.M;
      g.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
  return canvas;
}

function flipCanvas(src) {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.translate(canvas.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return canvas;
}

function bakeCoin(id, paletteName, points, weight) {
  const palette = PALETTES[paletteName];
  const front = bakeFrame(FRAME_FRONT, palette);
  const threeQ = bakeFrame(FRAME_THREE_Q, palette);
  const edge = bakeFrame(FRAME_EDGE, palette);
  const frames = [front, threeQ, edge, flipCanvas(threeQ)];
  return {
    id,
    points,
    weight,
    effect: null,
    frames,
    image: front,
    builtin: true,
  };
}

let cached = null;

export function createBuiltinCoins() {
  if (cached) return cached;
  cached = [
    bakeCoin("gold-coin", "gold", 3, 5),
    bakeCoin("silver-coin", "silver", 2, 3),
    bakeCoin("red-coin", "red", 5, 2),
  ];
  return cached;
}

export function pickCollectible(pool) {
  if (!pool || pool.length === 0) return null;
  let total = 0;
  for (const item of pool) total += item.weight ?? 1;
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.weight ?? 1;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

// All the tunable numbers for the game live here.

export const WORLD = {
  width: 480, // fixed logical width, height derived from device aspect ratio
  minHeight: 780,
  maxHeight: 1100,
};

export const PHYSICS = {
  gravity: 1500, // units/s^2
  flapImpulse: -430, // units/s
  terminalFall: 700, // units/s max downward speed
  maxRotationDown: 90, // degrees, when falling
  maxRotationUp: -25, // degrees, right after a flap
};

export const BIRD = {
  hitboxRadius: 15,
  frameSize: 48, // on-screen size in world units
  flapAnimFps: 10,
  startX: 120,
};

export const PIPES = {
  baseGapHeight: 210,
  minGapHeight: 140,
  gapShrinkPerTier: 6,
  baseSpacing: 260,
  minSpacing: 190,
  spacingShrinkPerTier: 8,
  width: 64,
  capHeight: 32,
  minGapCenterMargin: 100, // keep the gap center away from the very top/bottom
};

export const SPEED = {
  base: 150, // units/s world scroll speed
  perTierMultiplier: 0.06,
  maxMultiplier: 2.0,
};

export const DIFFICULTY = {
  pointsPerTier: 10,
};

export const COLLECTIBLES = {
  firstScore: 10, // collectibles never spawn before this score
  hitboxRadius: 20,
  size: 40,
  baseSpawnChance: 0.45,
  spawnChancePerTier: 0.05,
  maxSpawnChance: 0.85,
  defaultPoints: 3,
};

export const BACKGROUND = {
  changeEveryPoints: 20,
  crossfadeMs: 600,
  parallaxFactor: 0.35, // fraction of world scroll speed
};

export const GROUND = {
  height: 96,
};

export const STORAGE_KEYS = {
  highScore: "flappyMami.highScore",
  birdSkin: "flappyMami.birdSkin",
};

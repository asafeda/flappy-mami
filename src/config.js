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
  firstScore: 5, // collectibles never spawn before this score
  hitboxRadius: 20,
  size: 48,
  baseSpawnChance: 0.45,
  spawnChancePerTier: 0.05,
  maxSpawnChance: 0.85,
  defaultPoints: 2,
};

export const BACKGROUND = {
  changeEveryPipes: 10,
  crossfadeMs: 600,
  parallaxFactor: 0.35, // fraction of world scroll speed
};

export const BOSS = {
  name: "QUEEN OF JUKIM",
  firstPipe: 10, // fight #1 starts once this many pipes are passed (temp: was 30, revert later)
  everyPipes: 10, // fight #2 at 20, #3 at 30, ... (temp: was 30, revert later)
  durationPipes: 5, // fight stays active for this many pipes, then leaves
  size: 160, // fits within a size x size box, aspect-ratio preserved
  xFraction: 0.78, // fixed screen x, as a fraction of world width
  hoverAmplitude: 90, // vertical sine bob range, clamped to fit the play area
  hoverPeriod: 3.2, // seconds per full bob cycle
  leaveSec: 0.6, // time to slide back off-screen after the fight ends
  fireIntervalBase: 1.35, // seconds between shots on fight #1
  fireIntervalPerFight: 0.15, // interval shrinks by this much each repeat fight
  fireIntervalMin: 0.7,
  chargeSec: 0.25, // mouth flash/telegraph just before a shot fires
  maxActiveFireballs: 3,
  volleyFromFight: 1, // fightIndex >= this fires a 2-shot vertical volley (0 = fight #1)
  volleySpread: 40, // vertical offset between volley shots, at the target
};

export const BANNER = {
  riseSec: 0.5, // flies up from below the ground
  holdSec: 1.8, // holds at rest, readable
  fallSec: 0.5, // flies back down to the ground
  restYFraction: 0.34, // resting y, as a fraction of world height
  scale: 5, // fits "QUEEN OF JUKIM" within the 480-wide world with margin
};

export const FIREBALL = {
  size: 32,
  hitboxRadius: 11,
  speedBase: 210, // world units/sec on fight #1
  speedPerFight: 18,
  speedMax: 340,
  leadFactor: 0.15, // fraction of the bird's vy used to lead-aim the shot
};

export const GROUND = {
  height: 96,
};

export const STORAGE_KEYS = {
  highScore: "flappyMami.highScore",
  birdSkin: "flappyMami.birdSkin",
};

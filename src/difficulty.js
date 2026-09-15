import { DIFFICULTY, PIPES, SPEED } from "./config.js";

export function tierForScore(score) {
  return Math.floor(score / DIFFICULTY.pointsPerTier);
}

export function speedForTier(tier) {
  const mult = Math.min(
    1 + SPEED.perTierMultiplier * tier,
    SPEED.maxMultiplier
  );
  return SPEED.base * mult;
}

export function gapHeightForTier(tier) {
  return Math.max(
    PIPES.baseGapHeight - PIPES.gapShrinkPerTier * tier,
    PIPES.minGapHeight
  );
}

export function spacingForTier(tier) {
  return Math.max(
    PIPES.baseSpacing - PIPES.spacingShrinkPerTier * tier,
    PIPES.minSpacing
  );
}

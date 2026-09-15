import { STORAGE_KEYS } from "./config.js";

export function getHighScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEYS.highScore)) || 0;
  } catch {
    return 0;
  }
}

export function setHighScoreIfBetter(score) {
  const current = getHighScore();
  if (score > current) {
    try {
      localStorage.setItem(STORAGE_KEYS.highScore, String(score));
    } catch {
      // ignore (e.g. private browsing storage errors)
    }
    return score;
  }
  return current;
}

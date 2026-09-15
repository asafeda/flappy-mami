// Unified tap input: pointer (covers touch + mouse) mapped to world-space
// coordinates (so the title-screen skin-picker arrows can be hit-tested),
// plus keyboard shortcuts for desktop testing. Also unlocks iOS audio
// playback on the very first gesture.

import { unlockSfx } from "./sfx.js";

export function initInput(canvas, getWorldSize, handlers) {
  const { onTap, onCycle } = handlers;
  let audioUnlocked = false;

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    unlockSfx();
  }

  function toWorldPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const { worldWidth, worldHeight } = getWorldSize();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * worldWidth,
      y: ((clientY - rect.top) / rect.height) * worldHeight,
    };
  }

  function handleTap(e) {
    unlockAudio();
    const point = toWorldPoint(e.clientX, e.clientY);
    onTap(point);
    if (e && e.preventDefault) e.preventDefault();
  }

  canvas.addEventListener("pointerdown", handleTap, { passive: false });

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        unlockAudio();
        onTap(null);
        e.preventDefault();
      } else if (e.code === "ArrowLeft") {
        unlockAudio();
        if (onCycle) onCycle(-1);
        e.preventDefault();
      } else if (e.code === "ArrowRight") {
        unlockAudio();
        if (onCycle) onCycle(1);
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevent iOS Safari's double-tap-to-zoom and pull-to-refresh from
  // interfering with rapid tapping.
  document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("dblclick", (e) => e.preventDefault());
}

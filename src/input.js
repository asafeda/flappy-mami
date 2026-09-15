// Unified tap input: pointer (covers touch + mouse), plus space/up-arrow for
// desktop testing. Also unlocks iOS audio playback on the very first gesture.

export function initInput(canvas, onTap) {
  let audioUnlocked = false;

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    // Play-and-immediately-pause a silent buffer to satisfy iOS Safari's
    // "must originate from a user gesture" autoplay rule.
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      if (ctx.state === "suspended") ctx.resume();
    } catch {
      // ignore, non-fatal
    }
  }

  function handleTap(e) {
    unlockAudio();
    onTap();
    if (e && e.preventDefault) e.preventDefault();
  }

  canvas.addEventListener("pointerdown", handleTap, { passive: false });

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        handleTap(e);
      }
    },
    { passive: false }
  );

  // Prevent iOS Safari's double-tap-to-zoom and pull-to-refresh from
  // interfering with rapid tapping.
  document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("dblclick", (e) => e.preventDefault());
}

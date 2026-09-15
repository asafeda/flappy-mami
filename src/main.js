import { WORLD } from "./config.js";
import { loadAssets } from "./assets.js";
import { initInput } from "./input.js";
import { Game } from "./game.js";

const stage = document.getElementById("stage");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let worldWidth = WORLD.width;
let worldHeight = WORLD.minHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 3);

function computeWorldHeight() {
  const availW = stage.clientWidth || window.innerWidth;
  const availH = stage.clientHeight || window.innerHeight;
  const aspect = availH / Math.max(1, availW);
  const raw = WORLD.width * aspect;
  return Math.max(WORLD.minHeight, Math.min(WORLD.maxHeight, raw));
}

function resizeCanvas(game) {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  worldWidth = WORLD.width;
  worldHeight = computeWorldHeight();

  const availW = stage.clientWidth || window.innerWidth;
  const availH = stage.clientHeight || window.innerHeight;
  const targetAspect = worldHeight / worldWidth;

  let displayWidth, displayHeight;
  if (availH / availW > targetAspect) {
    displayWidth = availW;
    displayHeight = availW * targetAspect;
  } else {
    displayHeight = availH;
    displayWidth = availH / targetAspect;
  }

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = Math.round(worldWidth * dpr);
  canvas.height = Math.round(worldHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (game) game.resize(worldWidth, worldHeight);
}

async function main() {
  const assets = await loadAssets();
  const game = new Game(assets);

  resizeCanvas(game);
  window.addEventListener("resize", () => resizeCanvas(game));
  window.addEventListener("orientationchange", () => resizeCanvas(game));

  initInput(canvas, () => ({ worldWidth, worldHeight }), {
    onTap: (point) => game.handleTap(point),
    onCycle: (direction) => game.requestCycleSkin(direction),
  });

  let lastTime = performance.now();
  let paused = false;

  document.addEventListener("visibilitychange", () => {
    paused = document.hidden;
    if (!paused) lastTime = performance.now();
  });

  function frame(now) {
    if (!paused) {
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      game.update(dt);
      ctx.clearRect(0, 0, worldWidth, worldHeight);
      game.draw(ctx);
    } else {
      lastTime = now;
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main();

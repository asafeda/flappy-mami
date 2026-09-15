#!/usr/bin/env node
// Scans the assets/ folder and writes manifest.json so the game can discover
// whatever files you dropped in, without needing directory listing at runtime
// (which GitHub Pages, being static hosting, cannot do).

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const AUDIO_EXT = new Set([".mp3", ".ogg", ".wav", ".m4a"]);

async function listFiles(dir, allowedExt) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => allowedExt.has(path.extname(name).toLowerCase()))
    .filter((name) => !name.startsWith("."))
    .sort();
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const [birdFiles, collectibleFiles, backgroundFiles, uiFiles, audioFiles] =
    await Promise.all([
      listFiles(path.join(ASSETS, "bird"), IMAGE_EXT),
      listFiles(path.join(ASSETS, "collectibles"), IMAGE_EXT),
      listFiles(path.join(ASSETS, "backgrounds"), IMAGE_EXT),
      listFiles(path.join(ASSETS, "ui"), IMAGE_EXT),
      listFiles(path.join(ASSETS, "audio"), AUDIO_EXT),
    ]);

  const collectiblesConfig =
    (await readJsonIfExists(
      path.join(ASSETS, "collectibles", "collectibles.config.json")
    )) || {};

  const collectibles = collectibleFiles
    .filter((f) => f !== "collectibles.config.json")
    .map((file) => ({
      file: `assets/collectibles/${file}`,
      points: collectiblesConfig[file]?.points ?? 3,
      effect: collectiblesConfig[file]?.effect ?? null,
    }));

  const backgrounds = backgroundFiles.map((file) => `assets/backgrounds/${file}`);
  // Ensure default.* (if present) is first / always included as the score-0 background.
  const defaultBg = backgrounds.find((b) => /\/default\.(jpg|jpeg|png|webp)$/i.test(b));

  const manifest = {
    generatedAt: new Date().toISOString(),
    bird: birdFiles.map((f) => `assets/bird/${f}`),
    collectibles,
    backgrounds,
    defaultBackground: defaultBg || backgrounds[0] || null,
    ui: {
      title: uiFiles.includes("title.png") ? "assets/ui/title.png" : null,
      pipeBody: uiFiles.includes("pipe-body.png") ? "assets/ui/pipe-body.png" : null,
      pipeCap: uiFiles.includes("pipe-cap.png") ? "assets/ui/pipe-cap.png" : null,
      ground: uiFiles.includes("ground.png") ? "assets/ui/ground.png" : null,
    },
    audio: {
      flap: audioFiles.includes("flap.mp3") ? "assets/audio/flap.mp3" : null,
      point: audioFiles.includes("point.mp3") ? "assets/audio/point.mp3" : null,
      collect: audioFiles.includes("collect.mp3") ? "assets/audio/collect.mp3" : null,
      hit: audioFiles.includes("hit.mp3") ? "assets/audio/hit.mp3" : null,
    },
  };

  const outPath = path.join(ROOT, "manifest.json");
  await writeFile(outPath, JSON.stringify(manifest, null, 2));

  console.log(`manifest.json written with:
  bird frames:   ${manifest.bird.length}
  collectibles:  ${manifest.collectibles.length}
  backgrounds:   ${manifest.backgrounds.length}
  title:         ${manifest.ui.title ? "yes" : "no (placeholder will be used)"}`);
}

main().catch((err) => {
  console.error("Failed to build manifest:", err);
  process.exit(1);
});

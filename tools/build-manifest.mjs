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

// Turns "mami-face_02.png" into "MAMI FACE 02" as a friendly default label.
function labelFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, "");
  const words = base.replace(/[_-]+/g, " ").trim();
  return words.toUpperCase() || base.toUpperCase();
}

async function buildBirdSkins() {
  const [newFolderFiles, legacyFolderFiles] = await Promise.all([
    listFiles(path.join(ASSETS, "birds"), IMAGE_EXT),
    listFiles(path.join(ASSETS, "bird"), IMAGE_EXT),
  ]);

  const config =
    (await readJsonIfExists(path.join(ASSETS, "birds", "birds.config.json"))) ||
    {};

  // Each image file is its own standalone skin (no more multi-frame birds).
  // assets/birds/ is the current home; assets/bird/ (singular, legacy) still
  // works so older drops keep functioning without changes.
  const entries = [
    ...newFolderFiles
      .filter((f) => f !== "birds.config.json")
      .map((file) => ({ file, dir: "birds" })),
    ...legacyFolderFiles.map((file) => ({ file, dir: "bird" })),
  ];

  const seen = new Set();
  const birds = [];
  for (const { file, dir } of entries) {
    if (seen.has(file)) continue; // birds/ wins over legacy bird/ on name clash
    seen.add(file);
    const override = config[file] || {};
    birds.push({
      id: override.id || file.replace(/\.[^.]+$/, ""),
      file: `assets/${dir}/${file}`,
      label: override.label || labelFromFilename(file),
      order: typeof override.order === "number" ? override.order : birds.length,
    });
  }
  birds.sort((a, b) => a.order - b.order);
  return birds;
}

async function main() {
  const [birds, collectibleFiles, backgroundFiles, uiFiles, audioFiles, bossFiles] =
    await Promise.all([
      buildBirdSkins(),
      listFiles(path.join(ASSETS, "collectibles"), IMAGE_EXT),
      listFiles(path.join(ASSETS, "backgrounds"), IMAGE_EXT),
      listFiles(path.join(ASSETS, "ui"), IMAGE_EXT),
      listFiles(path.join(ASSETS, "audio"), AUDIO_EXT),
      listFiles(path.join(ASSETS, "boss"), IMAGE_EXT),
    ]);

  const collectiblesConfig =
    (await readJsonIfExists(
      path.join(ASSETS, "collectibles", "collectibles.config.json")
    )) || {};

  const collectibles = collectibleFiles
    .filter((f) => f !== "collectibles.config.json")
    .map((file) => ({
      file: `assets/collectibles/${file}`,
      points: collectiblesConfig[file]?.points ?? 2,
      effect: collectiblesConfig[file]?.effect ?? null,
    }));

  const backgrounds = backgroundFiles.map((file) => `assets/backgrounds/${file}`);
  // Ensure default.* (if present) is first / always included as the score-0 background.
  const defaultBg = backgrounds.find((b) => /\/default\.(jpg|jpeg|png|webp)$/i.test(b));
  const boss = bossFiles.map((file) => `assets/boss/${file}`);

  const manifest = {
    generatedAt: new Date().toISOString(),
    birds,
    // Legacy key kept for backward compatibility with any cached manifest.json
    // readers; the game itself now reads `birds`.
    bird: birds.map((b) => b.file),
    collectibles,
    backgrounds,
    defaultBackground: defaultBg || null,
    boss,
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
      ui: audioFiles.includes("ui.mp3") ? "assets/audio/ui.mp3" : null,
      boss: audioFiles.includes("boss.mp3") ? "assets/audio/boss.mp3" : null,
      fireball: audioFiles.includes("fireball.mp3") ? "assets/audio/fireball.mp3" : null,
    },
  };

  const outPath = path.join(ROOT, "manifest.json");
  await writeFile(outPath, JSON.stringify(manifest, null, 2));

  console.log(`manifest.json written with:
  bird skins:    ${manifest.birds.length} (+ built-in classic)
  collectibles:  ${manifest.collectibles.length}
  backgrounds:   ${manifest.backgrounds.length}
  boss art:      ${manifest.boss.length} (+ procedural placeholder)
  title:         ${manifest.ui.title ? "yes" : "no (placeholder will be used)"}`);
}

main().catch((err) => {
  console.error("Failed to build manifest:", err);
  process.exit(1);
});

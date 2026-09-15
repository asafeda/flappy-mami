# Flappy Mami

A Flappy-Bird-style mobile web game, built with vanilla JS + Canvas (no build step, no dependencies), deployed to GitHub Pages.

Play it live at: `https://<your-github-username>.github.io/flappy-mami/`

## How the game works

- Tap/click anywhere (or press Space / Up) to flap.
- On the title screen, use the `<` / `>` pixel arrows (or Left/Right arrow keys) to pick a bird skin before you start. Your choice is remembered on this device.
- Every **10 points**, difficulty ramps up: faster scroll speed, a tighter pipe gap, tighter pipe spacing, and collectibles get placed in progressively trickier spots. Pipes also shift through a green → teal → blue → violet → pink palette as tiers climb.
- Collectibles only start appearing from **10 points** onward. Until you drop in your own PNGs, spinning 8-bit gold / silver / red coins spawn as fallbacks (red coins are worth more).
- 8-bit sound effects play on flap, score, coin collect, and crash. Dropping your own `mp3` files in `assets/audio/` replaces the built-in chiptune.
- Every **20 points**, the background crossfades to a new random one (if you've added more than one).
- Until you add your own art, the game runs fully playable with a hand-drawn 8-bit look: blocky bird, pixel-outlined pipes, banded sky with parallax hills/clouds, and a bitmap-font HUD.

## Adding your own assets (no code changes needed)

Drop files into the folders below, `git push`, and the GitHub Action rebuilds `manifest.json` automatically so the live site picks them up. For local testing, run `npm run assets` (or `npm run dev`) after adding files.

Photoshop setup for every asset: **New Document → RGB Color, 8-bit, sRGB, 72 ppi.** Only pixel dimensions matter for the web; 72 ppi is just the conventional metadata value. Export via **File → Export → Export As**, 100% scale (the sizes below are already final pixel sizes, not 2x/3x multipliers).

| Asset | Folder / filename | Canvas size | Notes |
|---|---|---|---|
| Title logo | `assets/ui/title.png` | 1152 x 432 px, transparent | Shown at ~80% screen width on the start screen. Leave ~24px transparent padding on all sides. |
| Bird skins | `assets/birds/*.png` (any filename, one skin per file) | Square, e.g. 288x288 px | Each image is a **complete, static skin** — a face photo, a drawing, anything square. It gets circle-cropped and framed automatically, with a small pixel wing/beak drawn on top so it still flaps like a bird. Drop as many as you want; each becomes a choice in the in-game picker (alongside the built-in "Classic" 8-bit bird, which is always first). Rename files to control the label shown in the picker (e.g. `mami-face.png` → "MAMI FACE"), or set custom labels/order in `assets/birds/birds.config.json`. |
| Collectibles | `assets/collectibles/*.png` (any filename) | 120 x 120 px each, transparent | Add as many as you want — each is picked randomly, and they **replace** the built-in 8-bit coins. Bold silhouette + thick outline so it reads small. Optionally override points/effects per file in `assets/collectibles/collectibles.config.json`. |
| Backgrounds | `assets/backgrounds/default.jpg` (+ any others) | 1440 x 2880 px | Keep key art inside the central 1440x2560 safe area. `default.*` always shows at score 0; every other file joins the random rotation every 20 points. JPEG quality 80–85 (~350KB) or PNG. |
| Pipes (optional) | `assets/ui/pipe-body.png` (192x960, vertically tileable), `assets/ui/pipe-cap.png` (216x96) | Replaces the procedural pixel pipes if both are present. |
| Ground (optional) | `assets/ui/ground.png` (1440x336, horizontally tileable) | Replaces the procedural scrolling ground strip. |
| Sounds (optional) | `assets/audio/flap.mp3`, `point.mp3`, `collect.mp3`, `hit.mp3`, `ui.mp3` | Mono, 44.1kHz, <30KB each. Omit any file to keep the built-in 8-bit version of that cue. |
| Home screen icon (optional) | `assets/ui/icon-512.png` | 512x512 px, opaque | Used for "Add to Home Screen". |

`assets/bird/` (singular, the old folder) still works exactly as before for backward compatibility — each file in it becomes a skin too — but new drops should go in `assets/birds/`.

### Naming/reordering bird skins

Edit `assets/birds/birds.config.json` (create it if it doesn't exist):

```json
{
  "mami-face.png": { "label": "MAMI", "order": 1 }
}
```

Any file without an entry gets an auto-generated label from its filename and appears after the ones you've ordered explicitly.

Collision/render sizes used by the game engine (for reference, no code change needed):
- Bird hitbox: circle, radius 15 world units (art renders at 48x48, circle-cropped).
- Collectible hitbox: circle, radius 20 world units (art renders at 48x48).

### Tuning per-collectible points/effects

Edit `assets/collectibles/collectibles.config.json`:

```json
{
  "star.png": { "points": 5, "effect": null }
}
```

Any collectible file without an entry defaults to 3 points.

Until you add files, the game uses three built-in coins: gold (3 pts), silver (2 pts), and red (5 pts). Red is rarer.

## Local development

```bash
npm run assets   # scans assets/ and writes manifest.json
npm run dev      # same as above, then serves on http://localhost:8080
```

Open the printed URL on your phone (same Wi-Fi, use your computer's LAN IP) to test real touch input.

## Deployment

This repo deploys automatically via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main`:

1. In the repo's Settings → Pages, set **Source** to **GitHub Actions** (one-time setup).
2. Push to `main`. The workflow regenerates `manifest.json` and publishes the whole repo to Pages.
3. Your game is live at `https://<your-github-username>.github.io/flappy-mami/`.

## Project structure

```
index.html / styles.css     Shell page and mobile-friendly CSS
src/
  main.js                   Bootstrap, canvas sizing, RAF loop
  config.js                 All tunable numbers (physics, difficulty, etc.)
  assets.js                 manifest.json fetch + image/audio loading + coin fallbacks
  sfx.js                    Built-in 8-bit sound effects (Web Audio) + file overrides
  input.js                  Tap/keyboard input mapped to world coords, iOS audio unlock
  game.js                   ready / playing / dead state machine, skin picker taps
  skins.js                  Bird skin list + localStorage persistence
  pixelfont.js              Baked-in 5x7 bitmap font used by all HUD text
  coins.js                  Procedural spinning 8-bit Mario-style coin sprites
  bird.js, pipes.js, collectibles.js, background.js, difficulty.js, hud.js, storage.js
assets/                     Your art and audio go here (assets/birds/ for bird skins)
tools/build-manifest.mjs    Generates manifest.json from the assets/ folder
.github/workflows/deploy.yml
```

# Flappy Mami

A Flappy-Bird-style mobile web game, built with vanilla JS + Canvas (no build step, no dependencies), deployed to GitHub Pages.

Play it live at: `https://<your-github-username>.github.io/flappy-mami/`

## How the game works

- Tap/click anywhere (or press Space / Up) to flap.
- Every **10 points**, difficulty ramps up: faster scroll speed, a tighter pipe gap, tighter pipe spacing, and collectibles get placed in progressively trickier spots.
- Collectibles only start appearing from **10 points** onward.
- Every **20 points**, the background crossfades to a new random one (if you've added more than one).
- Until you add your own art, the game runs fully playable with procedurally-drawn placeholder graphics (yellow bird, green pipes, star collectibles, sky-blue background).

## Adding your own assets (no code changes needed)

Drop files into the folders below, `git push`, and the GitHub Action rebuilds `manifest.json` automatically so the live site picks them up. For local testing, run `npm run assets` (or `npm run dev`) after adding files.

Photoshop setup for every asset: **New Document → RGB Color, 8-bit, sRGB, 72 ppi.** Only pixel dimensions matter for the web; 72 ppi is just the conventional metadata value. Export via **File → Export → Export As**, 100% scale (the sizes below are already final pixel sizes, not 2x/3x multipliers).

| Asset | Folder / filename | Canvas size | Notes |
|---|---|---|---|
| Title logo | `assets/ui/title.png` | 1152 x 432 px, transparent | Shown at ~80% screen width on the start screen. Leave ~24px transparent padding on all sides. |
| Bird frames | `assets/bird/bird-01.png`, `bird-02.png`, `bird-03.png` | 144 x 144 px each, transparent | Bird must face **right**. 3 frames = flap animation loop; 1 file is fine (renders static). Optional `bird-dead.png` for the crash pose. |
| Collectibles | `assets/collectibles/*.png` (any filename) | 120 x 120 px each, transparent | Add as many as you want — each is picked randomly. Bold silhouette + thick outline so it reads small. Optionally override points/effects per file in `assets/collectibles/collectibles.config.json`. |
| Backgrounds | `assets/backgrounds/default.jpg` (+ any others) | 1440 x 2880 px | Keep key art inside the central 1440x2560 safe area. `default.*` always shows at score 0; every other file joins the random rotation every 20 points. JPEG quality 80–85 (~350KB) or PNG. |
| Pipes (optional) | `assets/ui/pipe-body.png` (192x960, vertically tileable), `assets/ui/pipe-cap.png` (216x96) | Replaces the procedural green pipes if both are present. |
| Ground (optional) | `assets/ui/ground.png` (1440x336, horizontally tileable) | Replaces the procedural scrolling ground strip. |
| Sounds (optional) | `assets/audio/flap.mp3`, `point.mp3`, `collect.mp3`, `hit.mp3` | Mono, 44.1kHz, <30KB each. |
| Home screen icon (optional) | `assets/ui/icon-512.png` | 512x512 px, opaque | Used for "Add to Home Screen". |

Collision/render sizes used by the game engine (for reference, no code change needed):
- Bird hitbox: circle, radius 15 world units (art renders at 48x48).
- Collectible hitbox: circle, radius 20 world units (art renders at 40x40).

### Tuning per-collectible points/effects

Edit `assets/collectibles/collectibles.config.json`:

```json
{
  "star.png": { "points": 5, "effect": null }
}
```

Any collectible file without an entry defaults to 3 points.

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
  assets.js                 manifest.json fetch + image/audio loading + placeholders
  input.js                  Tap/keyboard input, iOS audio unlock
  game.js                   ready / playing / dead state machine
  bird.js, pipes.js, collectibles.js, background.js, difficulty.js, hud.js, storage.js
assets/                     Your art and audio go here
tools/build-manifest.mjs    Generates manifest.json from the assets/ folder
.github/workflows/deploy.yml
```

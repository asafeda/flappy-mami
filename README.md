# Flappy Mami

A Flappy-Bird-style mobile web game, built with vanilla JS + Canvas (no build step, no dependencies), deployed to GitHub Pages.

Play it live at: `https://<your-github-username>.github.io/flappy-mami/`

## How the game works

- Tap/click anywhere (or press Space / Up) to flap.
- On the title screen, use the `<` / `>` pixel arrows (or Left/Right arrow keys) to pick a bird skin before you start. Your choice is remembered on this device.
- Every **10 points**, difficulty ramps up: faster scroll speed, a tighter pipe gap, tighter pipe spacing, and collectibles get placed in progressively trickier spots. Pipes also shift through a green → teal → blue → violet → pink palette as tiers climb.
- Collectibles start appearing from **5 points** onward and are worth **2 points** each. They spawn in the open space **between** pipe columns (never inside a pipe gap), on a reachable but increasingly tricky flight path. Until you drop in your own PNGs, spinning 8-bit coins spawn as fallbacks.
- 8-bit sound effects play on flap, score, coin collect, and crash. Dropping your own `mp3` files in `assets/audio/` replaces the built-in chiptune.
- The run starts on the built-in 8-bit sky (or `assets/backgrounds/default.*` if you add one). Every **10 pipes** passed, the background crossfades to the next uploaded wallpaper in filename order, then wraps.
- After **pipe 30**, and again every **30 pipes** after that (60, 90, ...), the boss **"QUEEN OF JUKIM"** shows up for **5 pipes**. A fiery name banner flies up from the ground, the boss glides in from the right and hovers there, and it spits fireballs aimed at you (with a short mouth-flash telegraph before each shot) until it leaves. Touching a fireball kills you instantly; pipes keep coming as normal the whole time. Each repeat fight fires faster, and from the second fight onward it fires 2-shot vertical volleys. Drop art into `assets/boss/` to replace the built-in placeholder boss.
- Until you add your own art, the game runs fully playable with a hand-drawn 8-bit look: blocky bird, pixel-outlined pipes, banded sky with parallax hills/clouds, and a bitmap-font HUD.

## Adding your own assets (no code changes needed)

Drop files into the folders below, `git push`, and the GitHub Action rebuilds `manifest.json` automatically so the live site picks them up. For local testing, run `npm run assets` (or `npm run dev`) after adding files.

Photoshop setup for every asset: **New Document → RGB Color, 8-bit, sRGB, 72 ppi.** Only pixel dimensions matter for the web; 72 ppi is just the conventional metadata value. Export via **File → Export → Export As**, 100% scale (the sizes below are already final pixel sizes, not 2x/3x multipliers).

| Asset | Folder / filename | Canvas size | Notes |
|---|---|---|---|
| Title logo | `assets/ui/title.png` | 1152 x 432 px, transparent | Shown at ~80% screen width on the start screen. Leave ~24px transparent padding on all sides. |
| Bird skins | `assets/birds/*.png` (any filename, one skin per file) | Square, e.g. 288x288 px | Each image is a **complete, static skin** — a face photo, a drawing, anything square. It gets circle-cropped and framed automatically, with a small pixel wing/beak drawn on top so it still flaps like a bird. Drop as many as you want; each becomes a choice in the in-game picker (alongside the built-in "Classic" 8-bit bird, which is always first). Rename files to control the label shown in the picker (e.g. `mami-face.png` → "MAMI FACE"), or set custom labels/order in `assets/birds/birds.config.json`. |
| Collectibles | `assets/collectibles/*.png` (any filename) | 120 x 120 px each, transparent | Add as many as you want — each is picked randomly, and they **replace** the built-in 8-bit coins. Bold silhouette + thick outline so it reads small. Optionally override points/effects per file in `assets/collectibles/collectibles.config.json`. |
| Backgrounds | `assets/backgrounds/default.jpg` (optional) + any others (`bg1.png`, …) | 1440 x 2880 px | Keep key art inside the central 1440x2560 safe area. The built-in 8-bit sky (or `default.*` if present) shows at the start; every other file joins a filename-order round-robin every 10 pipes. JPEG quality 80–85 (~350KB) or PNG. |
| Boss | `assets/boss/*.png` (any filename) | 480 x 480 px, transparent, **facing left** | Rendered at 160x160 (any aspect ratio gets fit into that box, so non-square art is fine too). Keep the mouth/muzzle roughly vertically centered — that's where fireballs spawn from. If you export with an opaque background instead of transparency, the game auto-mattes a flat edge-to-edge background color away, so it still floats free. Drop more than one file and each boss fight round-robins to the next, in filename order. |
| Pipes (optional) | `assets/ui/pipe-body.png` (192x960, vertically tileable), `assets/ui/pipe-cap.png` (216x96) | Replaces the procedural pixel pipes if both are present. |
| Ground (optional) | `assets/ui/ground.png` (1440x336, horizontally tileable) | Replaces the procedural scrolling ground strip. |
| Sounds (optional) | `assets/audio/flap.mp3`, `point.mp3`, `collect.mp3`, `hit.mp3`, `ui.mp3`, `boss.mp3`, `fireball.mp3` | Mono, 44.1kHz, <30KB each. Omit any file to keep the built-in 8-bit version of that cue. |
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
- Fireball hitbox: circle, radius 11 world units (art renders at 32x32). The boss sprite itself has no hitbox — only its fireballs can kill you.

### Tuning per-collectible points/effects

Edit `assets/collectibles/collectibles.config.json`:

```json
{
  "star.png": { "points": 5, "effect": null }
}
```

Any collectible file without an entry defaults to 2 points.

Until you add files, the game uses built-in 8-bit coins worth 2 points.

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
  pixelfont.js              Baked-in 5x7 bitmap font used by all HUD text (+ fire-gradient rows)
  coins.js                  Procedural spinning 8-bit Mario-style coin sprites
  fireball.js               Procedural 8-bit fireball projectile sprite
  boss.js                   Boss fight state machine, fireball aiming, name banner timing
  imageutils.js             Auto-mattes a flat opaque background into transparency
  bird.js, pipes.js, collectibles.js, background.js, difficulty.js, hud.js, storage.js
assets/                     Your art and audio go here (assets/birds/ for bird skins, assets/boss/ for boss art)
tools/build-manifest.mjs    Generates manifest.json from the assets/ folder
.github/workflows/deploy.yml
```

import { WORLD, GROUND } from "./config.js";
import { Bird } from "./bird.js";
import { PipeManager } from "./pipes.js";
import { CollectibleManager } from "./collectibles.js";
import { BackgroundManager } from "./background.js";
import { BossManager } from "./boss.js";
import { tierForScore, speedForTier } from "./difficulty.js";
import { drawScore, drawTitleScreen, drawGameOver, drawBossBanner } from "./hud.js";
import { getHighScore, setHighScoreIfBetter } from "./storage.js";
import { playSfx } from "./sfx.js";
import {
  buildSkinList,
  loadSelectedSkinId,
  saveSelectedSkinId,
  indexForSkinId,
} from "./skins.js";

export class Game {
  constructor(assets) {
    this.assets = assets;
    this.worldWidth = WORLD.width;
    this.worldHeight = WORLD.minHeight; // corrected by the first resize()
    this.state = "ready"; // ready | playing | dead
    this.score = 0;
    this.pipesPassed = 0;
    this.highScore = getHighScore();
    this.isNewHighScore = false;
    this.groundScroll = 0;
    this.deadTimer = 0;
    this.scoreFlashTimer = 0;
    this.shakeTimer = 0;
    this.flashTimer = 0;
    this.titleHitRects = null;
    this.deadHitRects = null;

    this.skins = buildSkinList(assets);
    this.skinIndex = indexForSkinId(this.skins, loadSelectedSkinId());

    this.bird = new Bird(this.worldHeight);
    this.pipes = new PipeManager(this.worldWidth, this.worldHeight);
    this.collectibles = new CollectibleManager(this.worldHeight, () => this.assets);
    this.background = new BackgroundManager(this.worldWidth, this.worldHeight, () => this.assets);
    this.boss = new BossManager(this.worldWidth, this.worldHeight, () => this.assets);
  }

  cycleSkin(direction) {
    const len = this.skins.length;
    if (len === 0) return;
    this.skinIndex = (this.skinIndex + direction + len) % len;
    saveSelectedSkinId(this.skins[this.skinIndex].id);
    playSfx("ui", this.assets.sounds.ui);
  }

  // Keyboard shortcut entry point (Left/Right arrows); only active on the
  // title screen so it can't interfere with gameplay controls.
  requestCycleSkin(direction) {
    if (this.state !== "ready") return;
    this.cycleSkin(direction);
  }

  hitTestRect(rect, point) {
    if (!rect || !point) return false;
    // Pad the tappable area beyond the visual button for friendlier touch targets.
    const pad = 14;
    return (
      point.x >= rect.x - pad &&
      point.x <= rect.x + rect.w + pad &&
      point.y >= rect.y - pad &&
      point.y <= rect.y + rect.h + pad
    );
  }

  // Returns to the title screen with score/pipes/collectibles cleared, but
  // keeps the high score and selected skin intact.
  goToMenu() {
    this.reset();
  }

  resize(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.pipes.worldWidth = worldWidth;
    this.pipes.worldHeight = worldHeight;
    this.collectibles.worldHeight = worldHeight;
    this.background.worldWidth = worldWidth;
    this.background.worldHeight = worldHeight;
    this.boss.worldWidth = worldWidth;
    this.boss.worldHeight = worldHeight;
    if (this.state === "ready") {
      this.bird.y = worldHeight / 2;
    }
  }

  reset() {
    this.state = "ready";
    this.score = 0;
    this.pipesPassed = 0;
    this.deadTimer = 0;
    this.groundScroll = 0;
    this.deadHitRects = null;
    this.bird = new Bird(this.worldHeight);
    this.pipes.reset();
    this.collectibles.reset();
    this.background.reset();
    this.boss.reset();
  }

  handleTap(point) {
    if (this.state === "ready") {
      if (this.titleHitRects) {
        if (this.hitTestRect(this.titleHitRects.leftArrow, point)) {
          this.cycleSkin(-1);
          return;
        }
        if (this.hitTestRect(this.titleHitRects.rightArrow, point)) {
          this.cycleSkin(1);
          return;
        }
      }
      this.state = "playing";
      this.bird.flap();
      playSfx("flap", this.assets.sounds.flap);
    } else if (this.state === "playing") {
      this.bird.flap();
      playSfx("flap", this.assets.sounds.flap);
    } else if (this.state === "dead") {
      if (this.deadTimer > 0.4) {
        if (this.deadHitRects && this.hitTestRect(this.deadHitRects.menuButton, point)) {
          this.goToMenu();
          return;
        }
        this.reset();
        this.state = "playing";
        this.bird.flap();
        playSfx("flap", this.assets.sounds.flap);
      }
    }
  }

  update(dt) {
    const tier = tierForScore(this.score);
    const speed = speedForTier(tier);

    if (this.scoreFlashTimer > 0) this.scoreFlashTimer = Math.max(0, this.scoreFlashTimer - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);

    if (this.state === "ready") {
      this.bird.y = this.worldHeight / 2 + Math.sin(performance.now() / 300) * 8;
      this.background.update(dt, speed * 0.3);
      return;
    }

    if (this.state === "dead") {
      this.deadTimer += dt;
      const bottom = this.pipes.playableBottom();
      if (this.bird.y + this.bird.getBounds().radius < bottom) {
        this.bird.update(dt);
      } else {
        this.bird.y = bottom - this.bird.getBounds().radius;
      }
      return;
    }

    // playing
    this.bird.update(dt);
    this.background.update(dt, speed);
    this.groundScroll += speed * dt;

    this.pipes.update(dt, speed, tier, (pipe, prevPipe) => {
      this.collectibles.maybeSpawnBetween(prevPipe, pipe, this.score, tier);
    });

    const scoredCount = this.pipes.collectScoring(this.bird.x);
    if (scoredCount > 0) {
      this.score += scoredCount;
      this.pipesPassed += scoredCount;
      this.scoreFlashTimer = 0.2;
      playSfx("point", this.assets.sounds.point);
      this.background.maybeSwap(this.pipesPassed);
    }

    this.collectibles.update(dt, speed, this.bird, (item) => {
      this.score += item.points;
      this.scoreFlashTimer = 0.2;
      playSfx("collect", this.assets.sounds.collect);
    });

    this.boss.update(dt, speed, this.pipesPassed, this.bird);

    if (
      this.pipes.collidesWith(this.bird) ||
      this.pipes.hitsGroundOrCeiling(this.bird) ||
      this.boss.hitsBird(this.bird)
    ) {
      this.die();
    }
  }

  die() {
    if (this.state !== "playing") return;
    this.state = "dead";
    this.bird.alive = false;
    this.deadTimer = 0;
    this.shakeTimer = 0.3;
    this.flashTimer = 0.15;
    const prevHigh = this.highScore;
    this.highScore = setHighScoreIfBetter(this.score);
    this.isNewHighScore = this.score > prevHigh;
    playSfx("hit", this.assets.sounds.hit);
  }

  drawGround(ctx) {
    const y = this.pipes.playableBottom();
    const h = GROUND.height;
    const w = this.worldWidth;
    if (this.assets.ground) {
      const offset = this.groundScroll % w;
      ctx.drawImage(this.assets.ground, -offset, y, w, h);
      ctx.drawImage(this.assets.ground, w - offset, y, w, h);
      return;
    }

    const tile = getGroundTile(h);
    const tw = tile.width;
    const grassH = GROUND_GRASS_H;
    const scroll = ((this.groundScroll % tw) + tw) % tw;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let x = -Math.floor(scroll); x < w; x += tw) {
      ctx.drawImage(tile, x, y - grassH);
    }
    ctx.restore();
  }

  draw(ctx) {
    ctx.save();
    if (this.shakeTimer > 0) {
      const power = this.shakeTimer / 0.3;
      const dx = (Math.random() - 0.5) * 8 * power;
      const dy = (Math.random() - 0.5) * 8 * power;
      ctx.translate(dx, dy);
    }

    this.background.draw(ctx);
    this.boss.draw(ctx);
    this.pipes.draw(ctx, this.assets, tierForScore(this.score));
    this.collectibles.draw(ctx);
    this.drawGround(ctx);
    this.boss.drawFireballs(ctx);
    // On the title screen the skin picker's own preview bird takes over this
    // role, so the in-world bird stays hidden to avoid a confusing overlap.
    if (this.state !== "ready") {
      this.bird.draw(ctx, this.skins[this.skinIndex]);
    }

    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = (this.flashTimer / 0.15) * 0.7;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
      ctx.restore();
    }

    ctx.restore();

    if (this.state === "ready") {
      this.titleHitRects = drawTitleScreen(
        ctx,
        this.worldWidth,
        this.worldHeight,
        this.assets,
        { skins: this.skins, index: this.skinIndex },
        this.highScore
      );
    } else if (this.state === "playing") {
      drawScore(ctx, this.worldWidth, this.score, this.scoreFlashTimer / 0.2);
      const banner = this.boss.getBannerInfo();
      if (banner) drawBossBanner(ctx, this.worldWidth, banner.y, banner.text);
    } else if (this.state === "dead") {
      drawScore(ctx, this.worldWidth, this.score, 0);
      this.deadHitRects = drawGameOver(
        ctx,
        this.worldWidth,
        this.worldHeight,
        this.score,
        this.highScore,
        this.isNewHighScore
      );
    }
  }
}

// Classic Flappy-style ground: a repeating grass lip over beige dirt, baked
// into one tile so the whole strip scrolls as a single texture.
const GROUND_PX = 4;
const GROUND_GRASS_ART_H = 6;
const GROUND_GRASS_H = GROUND_GRASS_ART_H * GROUND_PX;
const GROUND_COLORS = {
  O: "#3a7a18", // grass outline
  H: "#d4f86c", // grass highlight
  M: "#8ee04a", // grass mid
  S: "#5cb830", // grass shade
  D: "#4aa028", // grass deep
  dirt: "#ded895",
  dirtHi: "#ebe6b4",
  dirtLo: "#c4b86a",
  dirtDot: "#b8ac58",
  seam: "#5a4a1e",
};

// 8-wide repeating scallop on top of a solid grass band. Left slope is
// lit, right slope is shaded — the OG Flappy "little hills of grass" lip.
const GRASS_UNIT = [
  "..OO....",
  ".OHHSO..",
  "OHHMMSSO",
  "MMMMMMMM",
  "MMMMMMDD",
  "DDDDDDDD",
];

let cachedGroundTile = null;
let cachedGroundDirtH = -1;

function getGroundTile(dirtH) {
  if (cachedGroundTile && cachedGroundDirtH === dirtH) return cachedGroundTile;
  cachedGroundDirtH = dirtH;
  cachedGroundTile = buildGroundTile(dirtH);
  return cachedGroundTile;
}

function buildGroundTile(dirtH) {
  const px = GROUND_PX;
  const artW = GRASS_UNIT[0].length * 2; // two mounds
  const tw = artW * px;
  const grassH = GROUND_GRASS_H;
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = grassH + dirtH;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;

  g.fillStyle = GROUND_COLORS.dirt;
  g.fillRect(0, grassH, tw, dirtH);

  // Darker band right under the grass, then a hard seam — reads as the
  // collision lip without looking like a separate scrolling layer.
  g.fillStyle = "#d4cb82";
  g.fillRect(0, grassH, tw, px * 2);
  g.fillStyle = GROUND_COLORS.seam;
  g.fillRect(0, grassH, tw, Math.max(2, Math.round(px / 2)));

  // Sparse pebbles, placed so they wrap cleanly at the tile edges.
  const dirtArtH = Math.ceil(dirtH / px);
  const pebbles = [
    [1, 3, 2, 1, "dirtLo"],
    [7, 2, 1, 1, "dirtHi"],
    [13, 5, 1, 1, "dirtDot"],
    [4, 6, 1, 1, "dirtLo"],
    [10, 8, 2, 1, "dirtHi"],
    [15, 7, 1, 1, "dirtLo"],
    [2, 11, 1, 1, "dirtDot"],
    [8, 10, 1, 2, "dirtLo"],
    [12, 13, 1, 1, "dirtHi"],
    [5, 14, 2, 1, "dirtLo"],
    [0, 16, 1, 1, "dirtHi"],
    [14, 17, 2, 1, "dirtDot"],
    [6, 19, 1, 1, "dirtLo"],
    [11, 20, 1, 1, "dirtHi"],
    [3, 21, 1, 1, "dirtDot"],
    [9, 23, 2, 1, "dirtLo"],
  ];
  for (const [ax, ay, aw, ah, key] of pebbles) {
    if (ay >= dirtArtH) continue;
    g.fillStyle = GROUND_COLORS[key];
    g.fillRect(ax * px, grassH + ay * px, aw * px, ah * px);
  }

  const rows = GRASS_UNIT.length;
  const unitW = GRASS_UNIT[0].length;
  for (let copy = 0; copy < 2; copy++) {
    for (let ry = 0; ry < rows; ry++) {
      const row = GRASS_UNIT[ry];
      for (let rx = 0; rx < unitW; rx++) {
        const ch = row[rx];
        if (ch === ".") continue;
        g.fillStyle = GROUND_COLORS[ch];
        g.fillRect((copy * unitW + rx) * px, ry * px, px, px);
      }
    }
  }

  return canvas;
}

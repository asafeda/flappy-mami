import { WORLD, GROUND } from "./config.js";
import { Bird } from "./bird.js";
import { PipeManager } from "./pipes.js";
import { CollectibleManager } from "./collectibles.js";
import { BackgroundManager } from "./background.js";
import { tierForScore, speedForTier } from "./difficulty.js";
import { drawScore, drawTitleScreen, drawGameOver } from "./hud.js";
import { getHighScore, setHighScoreIfBetter } from "./storage.js";
import { playSound } from "./assets.js";
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
    this.highScore = getHighScore();
    this.isNewHighScore = false;
    this.groundScroll = 0;
    this.deadTimer = 0;
    this.scoreFlashTimer = 0;
    this.shakeTimer = 0;
    this.flashTimer = 0;
    this.titleHitRects = null;

    this.skins = buildSkinList(assets);
    this.skinIndex = indexForSkinId(this.skins, loadSelectedSkinId());

    this.bird = new Bird(this.worldHeight);
    this.pipes = new PipeManager(this.worldWidth, this.worldHeight);
    this.collectibles = new CollectibleManager(this.worldHeight, () => this.assets);
    this.background = new BackgroundManager(this.worldWidth, this.worldHeight, () => this.assets);
  }

  cycleSkin(direction) {
    const len = this.skins.length;
    if (len === 0) return;
    this.skinIndex = (this.skinIndex + direction + len) % len;
    saveSelectedSkinId(this.skins[this.skinIndex].id);
  }

  // Keyboard shortcut entry point (Left/Right arrows); only active on the
  // title screen so it can't interfere with gameplay controls.
  requestCycleSkin(direction) {
    if (this.state !== "ready") return;
    this.cycleSkin(direction);
  }

  hitTestArrow(rect, point) {
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

  resize(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.pipes.worldWidth = worldWidth;
    this.pipes.worldHeight = worldHeight;
    this.collectibles.worldHeight = worldHeight;
    this.background.worldWidth = worldWidth;
    this.background.worldHeight = worldHeight;
    if (this.state === "ready") {
      this.bird.y = worldHeight / 2;
    }
  }

  reset() {
    this.state = "ready";
    this.score = 0;
    this.deadTimer = 0;
    this.groundScroll = 0;
    this.bird = new Bird(this.worldHeight);
    this.pipes.reset();
    this.collectibles.reset();
    this.background.reset();
  }

  handleTap(point) {
    if (this.state === "ready") {
      if (this.titleHitRects) {
        if (this.hitTestArrow(this.titleHitRects.leftArrow, point)) {
          this.cycleSkin(-1);
          return;
        }
        if (this.hitTestArrow(this.titleHitRects.rightArrow, point)) {
          this.cycleSkin(1);
          return;
        }
      }
      this.state = "playing";
      this.bird.flap();
      playSound(this.assets.sounds.flap);
    } else if (this.state === "playing") {
      this.bird.flap();
      playSound(this.assets.sounds.flap);
    } else if (this.state === "dead") {
      if (this.deadTimer > 0.4) {
        this.reset();
        this.state = "playing";
        this.bird.flap();
        playSound(this.assets.sounds.flap);
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

    this.pipes.update(dt, speed, tier, (pipe) => {
      this.collectibles.maybeSpawnForPipe(pipe, this.score, tier);
    });

    const scoredCount = this.pipes.collectScoring(this.bird.x);
    if (scoredCount > 0) {
      this.score += scoredCount;
      this.scoreFlashTimer = 0.2;
      playSound(this.assets.sounds.point);
      this.background.maybeSwap(this.score);
    }

    this.collectibles.update(dt, speed, this.bird, (item) => {
      this.score += item.points;
      this.scoreFlashTimer = 0.2;
      playSound(this.assets.sounds.collect);
      this.background.maybeSwap(this.score);
    });

    if (this.pipes.collidesWith(this.bird) || this.pipes.hitsGroundOrCeiling(this.bird)) {
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
    playSound(this.assets.sounds.hit);
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

    // Dirt band
    ctx.fillStyle = "#d9a441";
    ctx.fillRect(0, y, w, h);

    // Dithered speckle rows for a chunky retro-dirt texture.
    const speckle = 6;
    const rowOffset = Math.floor(this.groundScroll) % (speckle * 2);
    ctx.fillStyle = "#c68a2e";
    for (let row = 0; row < 4; row++) {
      const ry = y + 14 + row * 16;
      const shift = row % 2 === 0 ? -rowOffset : rowOffset;
      for (let x = shift; x < w; x += speckle * 2) {
        ctx.fillRect(x, ry, speckle, speckle);
      }
    }

    // Grass strip with a jagged tooth edge on top.
    const grassH = 14;
    ctx.fillStyle = "#7cd858";
    ctx.fillRect(0, y - grassH, w, grassH);
    ctx.fillStyle = "#5fb844";
    const toothW = 10;
    const toothOffset = Math.floor(this.groundScroll) % (toothW * 2);
    for (let x = -toothOffset; x < w; x += toothW * 2) {
      ctx.fillRect(x, y - grassH, toothW, 5);
    }

    ctx.strokeStyle = "#3f7a2c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y - grassH);
    ctx.lineTo(w, y - grassH);
    ctx.stroke();
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
    this.pipes.draw(ctx, this.assets, tierForScore(this.score));
    this.collectibles.draw(ctx);
    this.drawGround(ctx);
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
    } else if (this.state === "dead") {
      drawScore(ctx, this.worldWidth, this.score, 0);
      drawGameOver(
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

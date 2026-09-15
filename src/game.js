import { WORLD, GROUND } from "./config.js";
import { Bird } from "./bird.js";
import { PipeManager } from "./pipes.js";
import { CollectibleManager } from "./collectibles.js";
import { BackgroundManager } from "./background.js";
import { tierForScore, speedForTier } from "./difficulty.js";
import { drawScore, drawTitleScreen, drawGameOver } from "./hud.js";
import { getHighScore, setHighScoreIfBetter } from "./storage.js";
import { playSound } from "./assets.js";

export class Game {
  constructor(assets) {
    this.assets = assets;
    this.worldWidth = WORLD.width;
    this.worldHeight = WORLD.minHeight; // corrected by the first resize()
    this.state = "ready"; // ready | playing | dead
    this.score = 0;
    this.highScore = getHighScore();
    this.groundScroll = 0;
    this.deadTimer = 0;

    this.bird = new Bird(this.worldHeight);
    this.pipes = new PipeManager(this.worldWidth, this.worldHeight);
    this.collectibles = new CollectibleManager(this.worldHeight, () => this.assets);
    this.background = new BackgroundManager(this.worldWidth, this.worldHeight, () => this.assets);
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

  handleTap() {
    if (this.state === "ready") {
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
      playSound(this.assets.sounds.point);
      this.background.maybeSwap(this.score);
    }

    this.collectibles.update(dt, speed, this.bird, (item) => {
      this.score += item.points;
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
    this.highScore = setHighScoreIfBetter(this.score);
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
    } else {
      ctx.fillStyle = "#ded895";
      ctx.fillRect(0, y, w, h);
      ctx.fillStyle = "#c9c17a";
      const stripeW = 24;
      const offset = this.groundScroll % (stripeW * 2);
      for (let x = -offset; x < w; x += stripeW * 2) {
        ctx.fillRect(x, y, stripeW, h);
      }
      ctx.strokeStyle = "#8a8350";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  draw(ctx) {
    this.background.draw(ctx);
    this.pipes.draw(ctx, this.assets);
    this.collectibles.draw(ctx);
    this.drawGround(ctx);
    this.bird.draw(ctx, this.assets);

    if (this.state === "ready") {
      drawTitleScreen(ctx, this.worldWidth, this.worldHeight, this.assets);
    } else if (this.state === "playing") {
      drawScore(ctx, this.worldWidth, this.score);
    } else if (this.state === "dead") {
      drawScore(ctx, this.worldWidth, this.score);
      drawGameOver(ctx, this.worldWidth, this.worldHeight, this.score, this.highScore);
    }
  }
}

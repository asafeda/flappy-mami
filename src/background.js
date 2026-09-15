import { BACKGROUND } from "./config.js";

// Draws a background image "cover" scaled into a destination rect, optionally
// mirrored horizontally. Mirroring alternate tiles lets any background image
// scroll seamlessly without the artist needing to make the edges tile.
function drawCoverTile(ctx, img, dx, dy, dWidth, dHeight, flip) {
  const srcRatio = img.width / img.height;
  const dstRatio = dWidth / dHeight;
  let sx, sy, sWidth, sHeight;
  if (srcRatio > dstRatio) {
    sHeight = img.height;
    sWidth = sHeight * dstRatio;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = sWidth / dstRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  ctx.save();
  if (flip) {
    ctx.translate(dx + dWidth, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
  } else {
    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }
  ctx.restore();
}

export class BackgroundManager {
  constructor(worldWidth, worldHeight, getAssets) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.getAssets = getAssets;
    this.scrollX = 0;
    this.currentIndex = 0;
    this.nextIndex = null;
    this.fadeProgress = 0;
    this.lastBgTier = 0;
  }

  reset() {
    this.scrollX = 0;
    this.currentIndex = 0;
    this.nextIndex = null;
    this.fadeProgress = 0;
    this.lastBgTier = 0;
  }

  update(dt, speedPxPerSec) {
    this.scrollX += speedPxPerSec * BACKGROUND.parallaxFactor * dt;

    if (this.nextIndex !== null) {
      this.fadeProgress += dt / (BACKGROUND.crossfadeMs / 1000);
      if (this.fadeProgress >= 1) {
        this.currentIndex = this.nextIndex;
        this.nextIndex = null;
        this.fadeProgress = 0;
      }
    }
  }

  maybeSwap(score) {
    const backgrounds = this.getAssets().backgrounds;
    if (!backgrounds || backgrounds.length <= 1) return;

    const tier = Math.floor(score / BACKGROUND.changeEveryPoints);
    if (tier === this.lastBgTier) return;
    this.lastBgTier = tier;

    let idx;
    do {
      idx = Math.floor(Math.random() * backgrounds.length);
    } while (idx === this.currentIndex && backgrounds.length > 1);

    this.nextIndex = idx;
    this.fadeProgress = 0;
  }

  drawLayer(ctx, img) {
    const tileW = this.worldWidth;
    const baseTileIndex = Math.floor(this.scrollX / tileW);
    const offsetWithinTile = this.scrollX % tileW;

    for (let i = 0; i <= 1; i++) {
      const dx = i * tileW - offsetWithinTile;
      const flip = (baseTileIndex + i) % 2 !== 0;
      drawCoverTile(ctx, img, dx, 0, tileW, this.worldHeight, flip);
    }
  }

  draw(ctx) {
    const backgrounds = this.getAssets().backgrounds;
    if (!backgrounds || backgrounds.length === 0) {
      drawPlaceholderSky(ctx, this.worldWidth, this.worldHeight, this.scrollX);
      return;
    }

    const current = backgrounds[this.currentIndex] || backgrounds[0];
    if (current) this.drawLayer(ctx, current.image);

    if (this.nextIndex !== null && backgrounds[this.nextIndex]) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.fadeProgress);
      this.drawLayer(ctx, backgrounds[this.nextIndex].image);
      ctx.restore();
    }
  }
}

function drawPlaceholderSky(ctx, width, height, scrollX = 0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Banded sky gradient (a few flat bands read as "8-bit" better than a
  // smooth canvas gradient).
  const bands = ["#3fb0d8", "#5cc4e0", "#7fd6e8", "#a8e4ee"];
  const bandH = height / bands.length;
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * bandH, width, bandH + 1);
  });

  // Distant hill silhouette, slow parallax.
  const hillScroll = (scrollX * 0.3) % width;
  ctx.fillStyle = "#3f9e6e";
  const hillY = height * 0.62;
  const hillW = width / 3;
  for (let i = -1; i <= Math.ceil(width / hillW) + 1; i++) {
    const hx = i * hillW - hillScroll;
    ctx.beginPath();
    ctx.moveTo(hx, height);
    ctx.lineTo(hx, hillY + 30);
    ctx.lineTo(hx + hillW * 0.5, hillY);
    ctx.lineTo(hx + hillW, hillY + 30);
    ctx.lineTo(hx + hillW, height);
    ctx.closePath();
    ctx.fill();
  }

  // Chunky pixel clouds, faster parallax.
  const cloudScroll = (scrollX * 0.6) % (width + 160);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const cloudY = [height * 0.14, height * 0.24, height * 0.1];
  for (let i = 0; i < 3; i++) {
    const baseX = i * (width / 2.2) - cloudScroll + 60;
    const cx = ((baseX % (width + 160)) + (width + 160)) % (width + 160) - 80;
    drawPixelCloud(ctx, cx, cloudY[i]);
  }

  ctx.restore();
}

function drawPixelCloud(ctx, x, y) {
  const s = 10;
  const cells = [
    [1, 0], [2, 0], [3, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
  ];
  for (const [cx, cy] of cells) {
    ctx.fillRect(x + cx * s, y + cy * s, s, s);
  }
}

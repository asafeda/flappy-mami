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
    // -1 = starter wallpaper (default.* or the built-in 8-bit sky).
    this.currentIndex = -1;
    this.nextIndex = null;
    this.fadeProgress = 0;
  }

  reset() {
    this.scrollX = 0;
    this.currentIndex = -1;
    this.nextIndex = null;
    this.fadeProgress = 0;
  }

  extras() {
    return this.getAssets().backgrounds || [];
  }

  // Pipes 0-9 stay on the starter wallpaper. After that, extras rotate in
  // filename order: bg1, bg2, bg3, bg1, ...
  targetIndex(pipesPassed) {
    const extras = this.extras();
    if (!extras.length) return -1;
    const slot = Math.floor(pipesPassed / BACKGROUND.changeEveryPipes) - 1;
    if (slot < 0) return -1;
    return slot % extras.length;
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

  maybeSwap(pipesPassed) {
    const target = this.targetIndex(pipesPassed);
    if (target === this.currentIndex) return;
    if (target === this.nextIndex) return;
    this.nextIndex = target;
    this.fadeProgress = 0;
  }

  imageForIndex(index) {
    if (index == null || index < 0) {
      return this.getAssets().defaultBackground || null;
    }
    const extras = this.extras();
    return extras[index] || null;
  }

  drawSky(ctx, index) {
    const entry = this.imageForIndex(index);
    if (entry && entry.image) {
      this.drawLayer(ctx, entry.image);
    } else {
      drawPlaceholderSky(ctx, this.worldWidth, this.worldHeight, this.scrollX);
    }
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
    this.drawSky(ctx, this.currentIndex);

    if (this.nextIndex !== null) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.fadeProgress);
      this.drawSky(ctx, this.nextIndex);
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

  // Distant hill silhouette. Tile by one hill-width so the wrap never
  // leaves a sky-colored gap on the right.
  const hillY = height * 0.62;
  const hillW = width / 3;
  const hillScroll = ((scrollX * 0.3) % hillW + hillW) % hillW;
  ctx.fillStyle = "#3f9e6e";
  for (let hx = -hillW - hillScroll; hx < width; hx += hillW) {
    ctx.beginPath();
    ctx.moveTo(hx, height);
    ctx.lineTo(hx, hillY + 30);
    ctx.lineTo(hx + hillW * 0.5, hillY);
    // +1 overlaps the next hill so a hairline of sky can't sneak through.
    ctx.lineTo(hx + hillW + 1, hillY + 30);
    ctx.lineTo(hx + hillW + 1, height);
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

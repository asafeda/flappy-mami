import { drawPixelText, measurePixelText } from "./pixelfont.js";
import { drawSkinPreview } from "./bird.js";
import { BANNER } from "./config.js";

const INK = "#1a1a2e";
const PAPER = "#ffffff";
const GOLD = "#ffd54f";

export function drawScore(ctx, worldWidth, score, pulse = 0) {
  ctx.save();
  const scale = 5 + pulse * 2;
  const text = String(score);
  const { width } = measurePixelText(text, scale);
  drawPixelText(ctx, text, worldWidth / 2 - width / 2, 28, {
    scale,
    color: PAPER,
    shadow: INK,
    shadowOffset: Math.max(2, Math.round(scale / 2)),
  });
  ctx.restore();
}

// Fire-gradient row palette for the boss name banner: hot yellow crown
// fading down to a deep ember red, reusing the flat bitmap font glyphs but
// recoloring per pixel-row so it reads as dancing flame.
const FIRE_ROWS = [
  "#fff2b0",
  "#ffd23f",
  "#ff9d1a",
  "#ff6a00",
  "#ef3d00",
  "#c81e00",
  "#8a1000",
];

// "QUEEN OF JUKIM" boss intro banner. `y` is driven by BossManager's
// rise/hold/fall timeline (see boss.js#getBannerInfo); this just renders the
// flame-colored text with a slight per-frame jitter so it flickers in place.
export function drawBossBanner(ctx, worldWidth, y, text) {
  ctx.save();
  // Shrink to fit with side margins, in case a longer name is ever used —
  // BANNER.scale is just the preferred/starting size.
  const sidePadding = 24;
  let scale = BANNER.scale;
  let { width } = measurePixelText(text, scale);
  const maxWidth = worldWidth - sidePadding * 2;
  if (width > maxWidth) {
    scale = Math.max(1, scale * (maxWidth / width));
    width = measurePixelText(text, scale).width;
  }
  const x = worldWidth / 2 - width / 2;
  const jitter = Math.sin(performance.now() / 42) * 1;

  drawPixelText(ctx, text, x + jitter, y, {
    scale,
    color: "#ff8a1a",
    rowColors: FIRE_ROWS,
    shadow: "#2a0400",
    shadowOffset: 4,
  });
  ctx.restore();
}

// Simple chevron arrow button used by the skin picker. Returns nothing; hit
// testing is done against the rect the caller already knows it drew.
function drawArrowButton(ctx, cx, cy, size, direction, pressed) {
  const half = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = pressed ? "#ffe9a8" : PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(-half, -half, size, size);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = INK;
  const arrowW = size * 0.28;
  const arrowH = size * 0.4;
  ctx.beginPath();
  if (direction < 0) {
    ctx.moveTo(arrowW * 0.4, -arrowH);
    ctx.lineTo(-arrowW * 0.9, 0);
    ctx.lineTo(arrowW * 0.4, arrowH);
  } else {
    ctx.moveTo(-arrowW * 0.4, -arrowH);
    ctx.lineTo(arrowW * 0.9, 0);
    ctx.lineTo(-arrowW * 0.4, arrowH);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSkinFrame(ctx, cx, cy, radius, skin) {
  ctx.save();
  ctx.fillStyle = "#2b2b45";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.translate(cx, cy);
  const bob = Math.sin(performance.now() / 260) * 2;
  ctx.translate(0, bob);
  drawSkinPreview(ctx, skin, radius * 1.6, 1);
  ctx.restore();
}

// Draws the whole title screen, including the bobbing wordmark, the skin
// picker (arrows + preview + label + page dots), the best-score badge, and
// the blinking "tap to start" prompt. Returns the world-space hit rects for
// the two arrow buttons so Game can route taps into cycleSkin().
export function drawTitleScreen(ctx, worldWidth, worldHeight, assets, skinState, highScore) {
  ctx.save();
  const t = performance.now() / 1000;

  // Wordmark
  const titleY = worldHeight * 0.1;
  if (assets.title) {
    const w = worldWidth * 0.8;
    const h = w * (assets.title.height / assets.title.width);
    const bob = Math.sin(t * 2) * 4;
    ctx.drawImage(assets.title, (worldWidth - w) / 2, titleY + bob, w, h);
  } else {
    const bob = Math.sin(t * 2) * 3;
    const scale = Math.min(6, Math.max(3, Math.floor(worldWidth / 90)));
    drawPixelText(ctx, "FLAPPY", worldWidth / 2, titleY + bob, {
      scale,
      color: GOLD,
      shadow: INK,
      shadowOffset: Math.max(2, Math.round(scale / 2)),
      align: "center",
    });
    drawPixelText(ctx, "MAMI", worldWidth / 2, titleY + bob + scale * 9, {
      scale,
      color: PAPER,
      shadow: INK,
      shadowOffset: Math.max(2, Math.round(scale / 2)),
      align: "center",
    });
  }

  // Best score badge
  const bestText = `BEST ${highScore}`;
  drawPixelText(ctx, bestText, worldWidth / 2, titleY - 26, {
    scale: 2,
    color: GOLD,
    shadow: INK,
    shadowOffset: 2,
    align: "center",
  });

  // Skin picker
  const pickerY = worldHeight * 0.46;
  const radius = Math.min(48, worldWidth * 0.12);
  const arrowSize = radius * 0.9;
  const arrowGap = radius + arrowSize * 0.9;
  const skin = skinState.skins[skinState.index];

  drawSkinFrame(ctx, worldWidth / 2, pickerY, radius, skin);

  const leftArrow = {
    x: worldWidth / 2 - arrowGap - arrowSize / 2,
    y: pickerY - arrowSize / 2,
    w: arrowSize,
    h: arrowSize,
  };
  const rightArrow = {
    x: worldWidth / 2 + arrowGap - arrowSize / 2,
    y: pickerY - arrowSize / 2,
    w: arrowSize,
    h: arrowSize,
  };
  drawArrowButton(ctx, leftArrow.x + leftArrow.w / 2, pickerY, arrowSize, -1);
  drawArrowButton(ctx, rightArrow.x + rightArrow.w / 2, pickerY, arrowSize, 1);

  drawPixelText(ctx, skin.label, worldWidth / 2, pickerY + radius + 20, {
    scale: 2,
    color: PAPER,
    shadow: INK,
    shadowOffset: 2,
    align: "center",
  });

  // Page dots
  if (skinState.skins.length > 1) {
    const dotSize = 6;
    const dotGap = 12;
    const totalW = skinState.skins.length * dotGap - (dotGap - dotSize);
    const startX = worldWidth / 2 - totalW / 2;
    const dotY = pickerY + radius + 40;
    skinState.skins.forEach((_, i) => {
      ctx.fillStyle = i === skinState.index ? GOLD : "#5a5a7a";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.fillRect(startX + i * dotGap, dotY, dotSize, dotSize);
      ctx.strokeRect(startX + i * dotGap, dotY, dotSize, dotSize);
    });
  }

  // Tap to start (blinking)
  const blink = Math.sin(t * 4) > -0.2;
  if (blink) {
    drawPixelText(ctx, "TAP TO START", worldWidth / 2, worldHeight * 0.68, {
      scale: 2.5,
      color: PAPER,
      shadow: INK,
      shadowOffset: 2,
      align: "center",
    });
  }

  drawPixelText(ctx, "< > OR TAP ARROWS TO CHOOSE SKIN", worldWidth / 2, worldHeight * 0.75, {
    scale: 1.4,
    color: "#c9c9e8",
    shadow: INK,
    shadowOffset: 1,
    align: "center",
  });

  ctx.restore();

  return { leftArrow, rightArrow };
}

function medalForScore(score) {
  if (score >= 40) return { color: "#b9f2ff", label: "PLATINUM" };
  if (score >= 30) return { color: "#ffd54f", label: "GOLD" };
  if (score >= 20) return { color: "#d7d7d7", label: "SILVER" };
  if (score >= 10) return { color: "#cd7f32", label: "BRONZE" };
  return null;
}

// Bordered pixel-style button with centered label. Returns the world-space
// hit rect so the caller can test taps against it.
function drawPixelButton(ctx, cx, cy, w, h, label, opts = {}) {
  const scale = opts.scale || 1.6;
  ctx.save();
  ctx.fillStyle = opts.fill || PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

  const { height: textH } = measurePixelText(label, scale);
  drawPixelText(ctx, label, cx, cy - textH / 2, {
    scale,
    color: opts.color || INK,
    align: "center",
  });
  ctx.restore();

  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function drawMedal(ctx, cx, cy, radius, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGameOver(ctx, worldWidth, worldHeight, score, highScore, isNewHighScore) {
  ctx.save();
  ctx.fillStyle = "rgba(10,10,20,0.55)";
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  const panelW = Math.min(worldWidth * 0.82, 340);
  const panelH = 288;
  const panelX = (worldWidth - panelW) / 2;
  const panelY = worldHeight * 0.26;

  // Retro panel: paper fill, hard ink border, thin inset highlight border.
  ctx.fillStyle = "#2b2b45";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#5a5a7a";
  ctx.strokeRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16);

  const cx = worldWidth / 2;
  drawPixelText(ctx, "GAME OVER", cx, panelY + 22, {
    scale: 3,
    color: "#ff6b6b",
    shadow: INK,
    shadowOffset: 2,
    align: "center",
  });

  const medal = medalForScore(score);
  const rowY = panelY + 78;
  if (medal) {
    drawMedal(ctx, panelX + 44, rowY + 20, 22, medal.color);
  }

  drawPixelText(ctx, "SCORE", cx, rowY, { scale: 1.8, color: "#c9c9e8", align: "center" });
  drawPixelText(ctx, String(score), cx, rowY + 18, {
    scale: 3,
    color: PAPER,
    shadow: INK,
    shadowOffset: 2,
    align: "center",
  });

  drawPixelText(ctx, "BEST", cx, rowY + 60, { scale: 1.8, color: "#c9c9e8", align: "center" });
  drawPixelText(ctx, String(highScore), cx, rowY + 78, {
    scale: 3,
    color: GOLD,
    shadow: INK,
    shadowOffset: 2,
    align: "center",
  });

  if (isNewHighScore && score > 0) {
    const blink = Math.sin(performance.now() / 180) > -0.3;
    if (blink) {
      drawPixelText(ctx, "NEW BEST!", cx, panelY + 188, {
        scale: 2,
        color: "#7CFC00",
        shadow: INK,
        shadowOffset: 2,
        align: "center",
      });
    }
  }

  const blink = Math.sin(performance.now() / 260) > -0.2;
  if (blink) {
    drawPixelText(ctx, "TAP TO RETRY", cx, panelY + 216, {
      scale: 1.8,
      color: PAPER,
      shadow: INK,
      shadowOffset: 2,
      align: "center",
    });
  }

  const menuButton = drawPixelButton(
    ctx,
    cx,
    panelY + panelH - 32,
    140,
    34,
    "MAIN MENU",
    { scale: 1.4 }
  );

  ctx.restore();

  return { menuButton };
}

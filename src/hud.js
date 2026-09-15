const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export function drawScore(ctx, worldWidth, score) {
  ctx.save();
  ctx.font = `bold 48px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.fillStyle = "#fff";
  const text = String(score);
  ctx.strokeText(text, worldWidth / 2, 40);
  ctx.fillText(text, worldWidth / 2, 40);
  ctx.restore();
}

export function drawTitleScreen(ctx, worldWidth, worldHeight, assets) {
  ctx.save();
  ctx.textAlign = "center";

  if (assets.title) {
    const w = worldWidth * 0.8;
    const h = w * (assets.title.height / assets.title.width);
    ctx.drawImage(assets.title, (worldWidth - w) / 2, worldHeight * 0.22, w, h);
  } else {
    ctx.font = `bold 44px ${FONT_STACK}`;
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.strokeText("Flappy Mami", worldWidth / 2, worldHeight * 0.3);
    ctx.fillText("Flappy Mami", worldWidth / 2, worldHeight * 0.3);
  }

  ctx.font = `600 22px ${FONT_STACK}`;
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  const tapText = "Tap to start";
  const y = worldHeight * 0.55;
  ctx.strokeText(tapText, worldWidth / 2, y);
  ctx.fillText(tapText, worldWidth / 2, y);
  ctx.restore();
}

export function drawGameOver(ctx, worldWidth, worldHeight, score, highScore) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";

  ctx.font = `bold 40px ${FONT_STACK}`;
  ctx.fillText("Game Over", worldWidth / 2, worldHeight * 0.32);

  ctx.font = `600 28px ${FONT_STACK}`;
  ctx.fillText(`Score: ${score}`, worldWidth / 2, worldHeight * 0.42);
  ctx.fillText(`Best: ${highScore}`, worldWidth / 2, worldHeight * 0.48);

  ctx.font = `500 20px ${FONT_STACK}`;
  ctx.fillText("Tap to try again", worldWidth / 2, worldHeight * 0.58);
  ctx.restore();
}

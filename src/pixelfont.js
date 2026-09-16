// Tiny baked-in 5x7 bitmap font so all UI text renders as crisp, scalable
// pixel blocks with zero network dependency (no webfont to load).
// Each glyph is 7 rows of a 5-bit-wide string; "1" = filled pixel.

const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10011", "10101", "10101", "10101", "11001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "00110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "00000", "01100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "'": ["01100", "01100", "01000", "00000", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPH_GAP = 1;

function glyphRows(ch) {
  return GLYPHS[ch.toUpperCase()] || GLYPHS["?"];
}

export function measurePixelText(text, scale = 1) {
  const len = text.length;
  const width = len * (GLYPH_W + GLYPH_GAP) * scale - GLYPH_GAP * scale;
  const height = GLYPH_H * scale;
  return { width: Math.max(0, width), height };
}

// Draws blocky pixel text. `align` is "left" | "center" | "right" (x refers
// to that anchor point); y is the top of the glyph box.
export function drawPixelText(ctx, text, x, y, opts = {}) {
  const scale = opts.scale || 2;
  const color = opts.color || "#ffffff";
  // Optional array of GLYPH_H colors, one per pixel row, top to bottom —
  // lets callers fake a vertical gradient (e.g. a flame effect) on top of
  // the flat bitmap font without a bespoke sprite sheet.
  const rowColors = opts.rowColors || null;
  const shadowColor = opts.shadow || null;
  const shadowOffset = opts.shadowOffset ?? Math.max(1, Math.round(scale / 2));
  const align = opts.align || "left";

  const { width } = measurePixelText(text, scale);
  let startX = x;
  if (align === "center") startX = x - width / 2;
  else if (align === "right") startX = x - width;

  const drawPass = (ox, oy, fill, perRow) => {
    let cx = ox;
    for (const ch of text) {
      const rows = glyphRows(ch);
      for (let ry = 0; ry < GLYPH_H; ry++) {
        const row = rows[ry];
        ctx.fillStyle = perRow ? perRow[ry] : fill;
        for (let rx = 0; rx < GLYPH_W; rx++) {
          if (row[rx] === "1") {
            ctx.fillRect(
              Math.round(cx + rx * scale),
              Math.round(oy + ry * scale),
              scale,
              scale
            );
          }
        }
      }
      cx += (GLYPH_W + GLYPH_GAP) * scale;
    }
  };

  if (shadowColor) {
    drawPass(startX + shadowOffset, y + shadowOffset, shadowColor, null);
  }
  drawPass(startX, y, color, rowColors);

  return { x: startX, y, width, height: GLYPH_H * scale };
}

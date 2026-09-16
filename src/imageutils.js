// Small image post-processing helpers applied at load time so drop-in art
// doesn't need pixel-perfect prep in Photoshop.

function colorAt(data, x, y, width) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function rgbDist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// If an image has a flat, fully-opaque background color running around its
// edges (e.g. exported with white instead of transparency), flood-fills that
// background from the four border edges and clears its alpha, leaving any
// enclosed same-colored pixels (like a white highlight inside the subject)
// untouched. Returns a canvas ready to be drawn just like an <img>. If the
// corners don't agree on one color, or are already transparent, the original
// image is returned unchanged.
export function matteEdgeBackground(img, tolerance = 24) {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return img;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return img; // e.g. a canvas-tainting cross-origin load — leave as-is
  }
  const data = imageData.data;

  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ].map(([x, y]) => colorAt(data, x, y, width));

  const bg = corners[0];
  const allOpaqueAndFlat = corners.every(
    (c) => c[3] === 255 && rgbDist(c, bg) < tolerance
  );
  if (!allOpaqueAndFlat) return img;

  const visited = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) {
    stack.push(x, 0, x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    stack.push(0, y, width - 1, y);
  }

  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const pi = y * width + x;
    if (visited[pi]) continue;
    visited[pi] = 1;
    const c = colorAt(data, x, y, width);
    if (c[3] === 0 || rgbDist(c, bg) >= tolerance) continue;
    data[pi * 4 + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

import {
  ALPHA_THRESHOLD,
  BG_CLUSTER_TOLERANCE,
  BG_TOLERANCE,
  MIN_GAP,
  MIN_REGION_WIDTH,
} from "./constants";
import type { BgColor, DetectedRow, Frame, RawImage, SpriteRegion } from "./types";

function colorDistance(a: BgColor, b: BgColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function detectBgColor(img: RawImage): BgColor {
  const { data, width, height } = img;
  const sample = (x: number, y: number): BgColor => {
    const off = (y * width + x) * 4;
    return { r: data[off], g: data[off + 1], b: data[off + 2] };
  };
  const corners = [
    sample(1, 1),
    sample(width - 2, 1),
    sample(1, height - 2),
    sample(width - 2, height - 2),
  ];
  let best = corners[0];
  let bestCount = 0;
  for (const cand of corners) {
    const count = corners.filter(
      (c) => colorDistance(c, cand) <= BG_CLUSTER_TOLERANCE
    ).length;
    if (count > bestCount) {
      bestCount = count;
      best = cand;
    }
  }
  return best;
}

export function removeBackground(
  img: RawImage,
  bgColor?: BgColor
): { processed: RawImage; bgColor: BgColor } {
  if (img.width < 3 || img.height < 3) {
    throw new Error("image too small for 4-corner sampling");
  }
  const detected = bgColor ?? detectBgColor(img);
  const out = new Uint8ClampedArray(img.data); // copy
  for (let i = 0; i < out.length; i += 4) {
    const px: BgColor = { r: out[i], g: out[i + 1], b: out[i + 2] };
    if (colorDistance(px, detected) <= BG_TOLERANCE) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
    }
  }
  return {
    processed: { data: out, width: img.width, height: img.height },
    bgColor: detected,
  };
}

function detectColumns(
  data: Uint8ClampedArray,
  width: number,
  y1: number,
  y2: number
): SpriteRegion[] {
  const raw: SpriteRegion[] = [];
  let inContent = false;
  let colStart = 0;
  for (let x = 0; x < width; x++) {
    let hasContent = false;
    for (let y = y1; y < y2; y++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        hasContent = true;
        break;
      }
    }
    if (hasContent && !inContent) {
      colStart = x;
      inContent = true;
    } else if (!hasContent && inContent) {
      raw.push({ x1: colStart, x2: x });
      inContent = false;
    }
  }
  if (inContent) raw.push({ x1: colStart, x2: width });
  if (raw.length === 0) return [];

  // Pass 2: bridge gaps < MIN_GAP
  const merged: SpriteRegion[] = [{ ...raw[0] }];
  for (let i = 1; i < raw.length; i++) {
    const gap = raw[i].x1 - merged[merged.length - 1].x2;
    if (gap < MIN_GAP) merged[merged.length - 1].x2 = raw[i].x2;
    else merged.push({ ...raw[i] });
  }

  // Pass 3: absorb narrow slivers into their nearest neighbour.
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i++) {
      const w = merged[i].x2 - merged[i].x1;
      if (w < MIN_REGION_WIDTH && merged.length > 1) {
        if (i === 0) {
          merged[1].x1 = merged[0].x1;
        } else if (i === merged.length - 1) {
          merged[i - 1].x2 = merged[i].x2;
        } else {
          const gapL = merged[i].x1 - merged[i - 1].x2;
          const gapR = merged[i + 1].x1 - merged[i].x2;
          if (gapL <= gapR) merged[i - 1].x2 = merged[i].x2;
          else merged[i + 1].x1 = merged[i].x1;
        }
        merged.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return merged;
}

export function detectRows(img: RawImage): DetectedRow[] {
  const { data, width, height } = img;
  const rows: DetectedRow[] = [];
  let inContent = false;
  let rowStart = 0;
  for (let y = 0; y < height; y++) {
    let hasContent = false;
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        hasContent = true;
        break;
      }
    }
    if (hasContent && !inContent) {
      rowStart = y;
      inContent = true;
    } else if (!hasContent && inContent) {
      rows.push({
        index: rows.length,
        y1: rowStart,
        y2: y,
        sprites: detectColumns(data, width, rowStart, y),
      });
      inContent = false;
    }
  }
  if (inContent) {
    rows.push({
      index: rows.length,
      y1: rowStart,
      y2: height,
      sprites: detectColumns(data, width, rowStart, height),
    });
  }
  return rows;
}

export function extractFrames(rows: DetectedRow[]): Frame[] {
  const frames: Frame[] = [];
  for (const row of rows) {
    for (const col of row.sprites) {
      frames.push({
        index: frames.length,
        x1: col.x1,
        y1: row.y1,
        x2: col.x2,
        y2: row.y2,
      });
    }
  }
  return frames;
}

export function processSheet(img: RawImage): {
  processed: RawImage;
  rows: DetectedRow[];
  frames: Frame[];
  bgColor: BgColor;
} {
  const { processed, bgColor } = removeBackground(img);
  const rows = detectRows(processed);
  const frames = extractFrames(rows);
  return { processed, rows, frames, bgColor };
}

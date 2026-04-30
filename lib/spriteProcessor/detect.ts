import {
  ALPHA_THRESHOLD,
  BG_CLUSTER_TOLERANCE,
  BG_TOLERANCE,
} from "./constants";
import type { BgColor, RawImage } from "./types";

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

// ALPHA_THRESHOLD is used by processSheet (Task 4) — imported here to co-locate
// with the other pixel-level constants consumed by this module.
void ALPHA_THRESHOLD;

import { describe, expect, it } from "vitest";
import { detectBgColor, detectRows, extractFrames, processSheet, removeBackground } from "./detect";
import type { RawImage } from "./types";

/** Build a RawImage filled with bg color, optionally drawing solid rects. */
function makeImage(
  width: number,
  height: number,
  bg: [number, number, number],
  rects: { x: number; y: number; w: number; h: number; rgb: [number, number, number] }[] = []
): RawImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4 + 0] = bg[0];
    data[i * 4 + 1] = bg[1];
    data[i * 4 + 2] = bg[2];
    data[i * 4 + 3] = 255;
  }
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const off = (y * width + x) * 4;
        data[off + 0] = r.rgb[0];
        data[off + 1] = r.rgb[1];
        data[off + 2] = r.rgb[2];
        data[off + 3] = 255;
      }
    }
  }
  return { data, width, height };
}

describe("detectBgColor", () => {
  it("returns the dominant corner color", () => {
    const img = makeImage(20, 20, [10, 20, 30]);
    const bg = detectBgColor(img);
    expect(bg).toEqual({ r: 10, g: 20, b: 30 });
  });

  it("clusters near-equal corners", () => {
    const img = makeImage(20, 20, [10, 20, 30]);
    // Slightly perturb one corner — within BG_CLUSTER_TOLERANCE
    img.data[((19 * 20 + 18) * 4) + 0] = 12;
    const bg = detectBgColor(img);
    expect(bg).toEqual({ r: 10, g: 20, b: 30 });
  });
});

describe("removeBackground", () => {
  it("zeros pixels within tolerance, keeps others opaque", () => {
    const img = makeImage(10, 10, [200, 200, 200], [
      { x: 3, y: 3, w: 4, h: 4, rgb: [50, 50, 50] },
    ]);
    const { processed } = removeBackground(img);
    // Corner is bg → alpha 0
    expect(processed.data[(0 * 10 + 0) * 4 + 3]).toBe(0);
    // Sprite center is non-bg → alpha 255
    expect(processed.data[(4 * 10 + 4) * 4 + 3]).toBe(255);
  });
});

describe("detectRows + extractFrames", () => {
  it("detects two rows of three sprites on bg", () => {
    const img = makeImage(80, 40, [255, 255, 255], [
      // Row 1: three 14x10 sprites at y=2..12
      { x: 5, y: 2, w: 14, h: 10, rgb: [10, 10, 10] },
      { x: 30, y: 2, w: 14, h: 10, rgb: [10, 10, 10] },
      { x: 55, y: 2, w: 14, h: 10, rgb: [10, 10, 10] },
      // Row 2: three 14x10 sprites at y=20..30
      { x: 5, y: 20, w: 14, h: 10, rgb: [10, 10, 10] },
      { x: 30, y: 20, w: 14, h: 10, rgb: [10, 10, 10] },
      { x: 55, y: 20, w: 14, h: 10, rgb: [10, 10, 10] },
    ]);
    const result = processSheet(img);
    expect(result.rows.length).toBe(2);
    expect(result.frames.length).toBe(6);
    expect(result.frames[0].x1).toBe(5);
    expect(result.frames[0].x2).toBe(19);
    expect(result.frames[0].y1).toBe(2);
    expect(result.frames[0].y2).toBe(12);
    expect(result.bgColor).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("merges sprites across MIN_GAP", () => {
    // Two rects 3px apart should merge (MIN_GAP = 5)
    const img = makeImage(50, 20, [255, 255, 255], [
      { x: 5, y: 5, w: 15, h: 10, rgb: [0, 0, 0] },
      { x: 23, y: 5, w: 15, h: 10, rgb: [0, 0, 0] },
    ]);
    const result = processSheet(img);
    expect(result.rows.length).toBe(1);
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].x1).toBe(5);
    expect(result.frames[0].x2).toBe(38);
  });

  it("absorbs slivers narrower than MIN_REGION_WIDTH", () => {
    // 3px sliver between two normal sprites should get absorbed
    const img = makeImage(80, 20, [255, 255, 255], [
      { x: 5, y: 5, w: 15, h: 10, rgb: [0, 0, 0] },
      { x: 30, y: 5, w: 3, h: 10, rgb: [0, 0, 0] },   // sliver
      { x: 50, y: 5, w: 15, h: 10, rgb: [0, 0, 0] },
    ]);
    const result = processSheet(img);
    expect(result.rows.length).toBe(1);
    expect(result.frames.length).toBe(2);
  });
});

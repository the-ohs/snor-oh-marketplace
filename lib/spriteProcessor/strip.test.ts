import { describe, expect, it } from "vitest";
import { createStripFromFrames, gridLayout, getTightBBox } from "./strip";
import { processSheet } from "./detect";
import type { RawImage } from "./types";

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
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const off = (y * width + x) * 4;
        data[off + 0] = r.rgb[0];
        data[off + 1] = r.rgb[1];
        data[off + 2] = r.rgb[2];
        data[off + 3] = 255;
      }
  }
  return { data, width, height };
}

describe("gridLayout", () => {
  it("uses 4096px max width with 128px frames", () => {
    const layout = gridLayout(10);
    expect(layout.cols).toBe(32);
    expect(layout.rows).toBe(1);
    expect(layout.width).toBe(32 * 128);
    expect(layout.height).toBe(128);
  });

  it("wraps when frame count > 32", () => {
    const layout = gridLayout(40);
    expect(layout.cols).toBe(32);
    expect(layout.rows).toBe(2);
    expect(layout.height).toBe(256);
  });
});

describe("getTightBBox", () => {
  it("returns null for empty region", () => {
    const empty = makeImage(20, 20, [0, 0, 0]);
    for (let i = 0; i < empty.data.length; i++) empty.data[i] = 0;
    expect(getTightBBox(empty, 0, 0, 20, 20)).toBeNull();
  });

  it("finds tight bbox inside region", () => {
    const img = makeImage(20, 20, [0, 0, 0]);
    for (let i = 0; i < img.data.length; i += 4) img.data[i + 3] = 0;
    // Set alpha=255 for a 4×3 box at (5..9, 6..9)
    for (let y = 6; y < 9; y++)
      for (let x = 5; x < 9; x++) img.data[(y * 20 + x) * 4 + 3] = 255;
    const bbox = getTightBBox(img, 0, 0, 20, 20);
    expect(bbox).toEqual({ x1: 5, y1: 6, x2: 9, y2: 9 });
  });
});

describe("createStripFromFrames", () => {
  it("packs N frames into a 128*N grid PNG", async () => {
    // Realistic 14px-wide sprites (above MIN_REGION_WIDTH=10) on white bg
    const img = makeImage(80, 20, [255, 255, 255], [
      { x: 5, y: 5, w: 14, h: 10, rgb: [10, 10, 10] },
      { x: 30, y: 5, w: 14, h: 10, rgb: [10, 10, 10] },
      { x: 55, y: 5, w: 14, h: 10, rgb: [10, 10, 10] },
    ]);
    const { processed, frames } = processSheet(img);
    expect(frames.length).toBe(3);

    // Test path: encodePng = sharp adapter (server-side encode for testability)
    const { encodePng } = await import("./serverImage");
    const strip = await createStripFromFrames(
      processed,
      frames,
      [0, 1, 2],
      encodePng
    );
    expect(strip).not.toBeNull();
    expect(strip!.frames).toBe(3);
    expect(strip!.pngBytes.byteLength).toBeGreaterThan(0);

    // PNG magic check
    expect(strip!.pngBytes[0]).toBe(0x89);
    expect(strip!.pngBytes[1]).toBe(0x50);
    expect(strip!.pngBytes[2]).toBe(0x4e);
    expect(strip!.pngBytes[3]).toBe(0x47);
  });

  it("returns null when indices are empty", async () => {
    const img = makeImage(60, 20, [255, 255, 255], [
      { x: 5, y: 5, w: 14, h: 10, rgb: [10, 10, 10] },
    ]);
    const { processed, frames } = processSheet(img);
    const { encodePng } = await import("./serverImage");
    const strip = await createStripFromFrames(processed, frames, [], encodePng);
    expect(strip).toBeNull();
  });
});

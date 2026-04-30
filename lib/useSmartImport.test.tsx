import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSmartImport } from "./useSmartImport";
import { processSheet } from "./spriteProcessor/detect";
import { STATUSES } from "./schema";
import type { RawImage } from "./spriteProcessor/types";

function fixtureImage(): RawImage {
  // 7 sprites in a row on solid white. 14×10 each (above MIN_REGION_WIDTH).
  const w = 140, h = 16;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 0] = 255;
    data[i * 4 + 1] = 255;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  for (let s = 0; s < 7; s++) {
    const sx = 4 + s * 19;
    for (let y = 3; y < 13; y++)
      for (let x = sx; x < sx + 14; x++) {
        const off = (y * w + x) * 4;
        data[off + 0] = 0;
        data[off + 1] = 0;
        data[off + 2] = 0;
        data[off + 3] = 255;
      }
  }
  return { data, width: w, height: h };
}

describe("useSmartImport", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useSmartImport());
    expect(result.current.state.detectedFrames.length).toBe(0);
    expect(result.current.canSave).toBe(false);
  });

  it("auto-distributes frames across the 7 statuses on ingest", () => {
    const { result } = renderHook(() => useSmartImport());
    const img = fixtureImage();
    const { processed, frames } = processSheet(img);
    act(() => {
      result.current.ingestProcessed({
        sourceFile: null,
        sourceImage: null,
        processed,
        frames,
        framePreviews: frames.map(() => null as unknown as HTMLCanvasElement),
        bgColor: { r: 255, g: 255, b: 255 },
        defaultName: "test",
      });
    });
    for (const s of STATUSES) {
      expect(result.current.state.frameInputs[s].length).toBeGreaterThan(0);
    }
  });

  it("buildPackage emits v2 when frames are not edited and source is small", async () => {
    const { result } = renderHook(() => useSmartImport());
    const img = fixtureImage();
    const { processed, frames } = processSheet(img);
    // Tiny fake source file so the v2 path triggers (size <= 2 MiB)
    const fakeFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "f.png", { type: "image/png" });
    act(() => {
      result.current.setName("test");
      result.current.ingestProcessed({
        sourceFile: fakeFile,
        sourceImage: null,
        processed,
        frames,
        framePreviews: frames.map(() => null as unknown as HTMLCanvasElement),
        bgColor: { r: 255, g: 255, b: 255 },
        defaultName: "test",
      });
    });
    const pkg = await result.current.buildPackage();
    expect(pkg.version).toBe(2);
    expect(pkg.smartImportMeta).toBeDefined();
    expect(pkg.sprites).toBeUndefined();
  });

  it("flips framesEdited on deleteFrame and remaps inputs", () => {
    const { result } = renderHook(() => useSmartImport());
    const img = fixtureImage();
    const { processed, frames } = processSheet(img);
    act(() => {
      result.current.ingestProcessed({
        sourceFile: null,
        sourceImage: null,
        processed,
        frames,
        framePreviews: frames.map(() => null as unknown as HTMLCanvasElement),
        bgColor: { r: 255, g: 255, b: 255 },
        defaultName: "test",
      });
    });
    expect(result.current.state.framesEdited).toBe(false);
    act(() => result.current.deleteFrame(0));
    expect(result.current.state.framesEdited).toBe(true);
    expect(result.current.state.detectedFrames.length).toBe(frames.length - 1);
  });
});

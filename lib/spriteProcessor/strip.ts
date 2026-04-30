import { FRAME_SIZE, ALPHA_THRESHOLD, MAX_SHEET_WIDTH } from "./constants";
import type { BBox, Frame, GridLayout, ProcessedStrip, RawImage } from "./types";

export function gridLayout(frameCount: number): GridLayout {
  const cols = Math.max(1, Math.floor(MAX_SHEET_WIDTH / FRAME_SIZE));
  const rows = Math.max(1, Math.ceil(frameCount / cols));
  return { cols, rows, width: cols * FRAME_SIZE, height: rows * FRAME_SIZE };
}

export function getTightBBox(
  img: RawImage,
  x: number,
  y: number,
  width: number,
  height: number
): BBox | null {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
      const a = img.data[(py * img.width + px) * 4 + 3];
      if (a > ALPHA_THRESHOLD) {
        if (dx < minX) minX = dx;
        if (dx > maxX) maxX = dx;
        if (dy < minY) minY = dy;
        if (dy > maxY) maxY = dy;
        found = true;
      }
    }
  }
  return found ? { x1: minX, y1: minY, x2: maxX + 1, y2: maxY + 1 } : null;
}

type EncodePng = (img: RawImage) => Promise<Uint8Array>;

/**
 * Pack the given frame indices into a 128×N grid and encode as PNG.
 * Each sprite is bbox-cropped, scaled-to-fit its own 128×128 cell, and
 * centered. Empty regions stay transparent.
 *
 * encodePng is injected so the same function works in browser (Canvas
 * adapter) and on the server / under test (sharp adapter).
 */
export async function createStripFromFrames(
  processed: RawImage,
  frames: Frame[],
  indices: number[],
  encodePng: EncodePng
): Promise<ProcessedStrip | null> {
  const selected: Frame[] = [];
  for (const i of indices) if (i >= 0 && i < frames.length) selected.push(frames[i]);
  if (selected.length === 0) return null;

  const ready: { frame: Frame; bbox: BBox; cropW: number; cropH: number }[] = [];
  for (const frame of selected) {
    const fw = frame.x2 - frame.x1;
    const fh = frame.y2 - frame.y1;
    const bbox = getTightBBox(processed, frame.x1, frame.y1, fw, fh);
    if (!bbox) continue;
    const cropW = bbox.x2 - bbox.x1;
    const cropH = bbox.y2 - bbox.y1;
    if (cropW <= 0 || cropH <= 0) continue;
    ready.push({ frame, bbox, cropW, cropH });
  }
  if (ready.length === 0) return null;

  const layout = gridLayout(ready.length);
  const out = new Uint8ClampedArray(layout.width * layout.height * 4);

  for (let i = 0; i < ready.length; i++) {
    const { frame, bbox, cropW, cropH } = ready[i];
    const scale = Math.min(FRAME_SIZE / cropW, FRAME_SIZE / cropH);
    const scaledW = Math.round(cropW * scale);
    const scaledH = Math.round(cropH * scale);
    const ox = Math.round((FRAME_SIZE - scaledW) / 2);
    const oy = Math.round((FRAME_SIZE - scaledH) / 2);
    const cellX = (i % layout.cols) * FRAME_SIZE;
    const cellY = Math.floor(i / layout.cols) * FRAME_SIZE;

    // Nearest-neighbour scale into the destination cell. Pure JS, runtime-agnostic.
    for (let dy = 0; dy < scaledH; dy++) {
      const srcY = bbox.y1 + Math.floor(dy / scale);
      const py = frame.y1 + srcY;
      if (py < 0 || py >= processed.height) continue;
      for (let dx = 0; dx < scaledW; dx++) {
        const srcX = bbox.x1 + Math.floor(dx / scale);
        const px = frame.x1 + srcX;
        if (px < 0 || px >= processed.width) continue;
        const sOff = (py * processed.width + px) * 4;
        const a = processed.data[sOff + 3];
        if (a <= ALPHA_THRESHOLD) continue;
        const dxOut = cellX + ox + dx;
        const dyOut = cellY + oy + dy;
        const dOff = (dyOut * layout.width + dxOut) * 4;
        out[dOff + 0] = processed.data[sOff + 0];
        out[dOff + 1] = processed.data[sOff + 1];
        out[dOff + 2] = processed.data[sOff + 2];
        out[dOff + 3] = a;
      }
    }
  }

  const pngBytes = await encodePng({
    data: out,
    width: layout.width,
    height: layout.height,
  });
  return { pngBytes, frames: ready.length };
}

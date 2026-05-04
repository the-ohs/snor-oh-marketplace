import type { RawImage } from "./types";

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Any2dCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Decode a File or Blob to RawImage via OffscreenCanvas (or HTMLCanvas fallback). */
export async function loadImageData(file: Blob): Promise<RawImage> {
  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d") as Any2dCtx | null;
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const imgData = ctx.getImageData(0, 0, w, h);
  return { data: imgData.data, width: w, height: h };
}

/** Encode a RawImage to PNG bytes via Canvas.toBlob('image/png'). */
export async function encodePng(img: RawImage): Promise<Uint8Array> {
  const canvas = makeCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d") as Any2dCtx | null;
  if (!ctx) throw new Error("2d context unavailable");
  const imgData = ctx.createImageData(img.width, img.height);
  imgData.data.set(img.data);
  ctx.putImageData(imgData, 0, 0);
  const blob: Blob = canvas instanceof OffscreenCanvas
    ? await canvas.convertToBlob({ type: "image/png" })
    : await new Promise((res, rej) =>
        (canvas as HTMLCanvasElement).toBlob(
          (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
          "image/png"
        )
      );
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

/** 48×48 thumbnail for a single frame, returned as an HTMLCanvasElement. */
export function frameThumbnail(processed: RawImage, frame: { x1: number; y1: number; x2: number; y2: number }, size = 48): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const fw = frame.x2 - frame.x1;
  const fh = frame.y2 - frame.y1;
  // Build a temp canvas at native size, then draw scaled.
  const tmp = document.createElement("canvas");
  tmp.width = fw;
  tmp.height = fh;
  const tctx = tmp.getContext("2d")!;
  const sliced = new Uint8ClampedArray(fw * fh * 4);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const sOff = ((frame.y1 + y) * processed.width + (frame.x1 + x)) * 4;
      const dOff = (y * fw + x) * 4;
      sliced[dOff + 0] = processed.data[sOff + 0];
      sliced[dOff + 1] = processed.data[sOff + 1];
      sliced[dOff + 2] = processed.data[sOff + 2];
      sliced[dOff + 3] = processed.data[sOff + 3];
    }
  }
  const imgData = tctx.createImageData(fw, fh);
  imgData.data.set(sliced);
  tctx.putImageData(imgData, 0, 0);
  const scale = Math.min(size / fw, size / fh);
  const sw = Math.round(fw * scale);
  const sh = Math.round(fh * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, (size - sw) / 2, (size - sh) / 2, sw, sh);
  return c;
}

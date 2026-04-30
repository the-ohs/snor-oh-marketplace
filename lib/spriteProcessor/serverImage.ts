import sharp from "sharp";
import type { RawImage } from "./types";

export async function loadImageData(buf: Buffer): Promise<RawImage> {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}

export async function encodePng(img: RawImage): Promise<Uint8Array> {
  const buf = await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), {
    raw: { width: img.width, height: img.height, channels: 4 },
  })
    .png()
    .toBuffer();
  // Buffer extends Uint8Array — return as the shared contract.
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

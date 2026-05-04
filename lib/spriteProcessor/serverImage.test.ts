import { describe, expect, it } from "vitest";
import { encodePng, loadImageData } from "./serverImage";

describe("serverImage round-trip", () => {
  it("encodes and decodes back to same dims", async () => {
    const w = 32;
    const h = 16;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4 + 0] = 200;
      data[i * 4 + 1] = 50;
      data[i * 4 + 2] = 50;
      data[i * 4 + 3] = 255;
    }
    const png = await encodePng({ data, width: w, height: h });
    expect(png[0]).toBe(0x89);

    const round = await loadImageData(Buffer.from(png));
    expect(round.width).toBe(w);
    expect(round.height).toBe(h);
    expect(round.data[0]).toBe(200);
    expect(round.data[3]).toBe(255);
  });
});

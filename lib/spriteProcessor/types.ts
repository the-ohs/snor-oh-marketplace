export interface BgColor { r: number; g: number; b: number }

export interface SpriteRegion { x1: number; x2: number }

export interface DetectedRow {
  index: number;
  y1: number;
  y2: number;
  sprites: SpriteRegion[];
}

export interface Frame {
  index: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GridLayout {
  cols: number;
  rows: number;
  width: number;
  height: number;
}

/** Structural ImageData — works in both browser and Node. */
export interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface ProcessedStrip {
  pngBytes: Uint8Array;
  frames: number;
}

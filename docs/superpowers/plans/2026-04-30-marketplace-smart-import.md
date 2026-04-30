# Marketplace Smart Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the desktop snor-oh app's Smart Import sprite-sheet authoring flow to the marketplace website at `the-ohs/snor-oh-marketplace`, so users can create custom pets in the browser and either download a `.snoroh` package or publish it directly to the gallery.

**Architecture:** Hybrid client/server. A pure-TypeScript pipeline (background detection → row/column detection → frame extraction → strip generation) ships as a runtime-agnostic module under `lib/spriteProcessor/`, with thin Canvas (browser) and `sharp` (server) adapters. A headless React hook (`useSmartImport`) owns editor state. Presentational components under `app/create/` render the editor. Two terminal actions: **Download** (purely client-side) and **Publish** (POSTs through the existing `/api/upload` route — no server-side changes).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind, `sharp` (already a dep). New devDeps: Vitest, happy-dom, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `@playwright/test`.

**Spec:** `/Users/apple/snor-oh-marketplace/docs/superpowers/specs/2026-04-30-marketplace-smart-import-design.md`

**Reference (read-only):** `/Users/apple/snor-oh-pro/Sources/Sprites/SmartImport.swift`, `/Users/apple/snor-oh-pro/Sources/Views/SmartImportView.swift`, `/Users/apple/snor-oh-pro/tmp/ani-mime/src/utils/spriteSheetProcessor.ts`, `/Users/apple/snor-oh-pro/Tests/SmartImport*.swift`.

**Test gate convention.** Every task ends in an explicit `### Test Gate`. The task is **not done** until the gate's command exits 0 and prints the expected output. If a gate fails, debug *before* moving on. Commits happen *after* the gate passes — never before.

---

## Task 0: Set up test infrastructure (Vitest + happy-dom + RTL)

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (devDeps + scripts)
- Modify: `tsconfig.json` (add Vitest types)

- [ ] **Step 0.1 — Install devDeps**

```bash
cd /Users/apple/snor-oh-marketplace
npm install --save-dev vitest@^2 happy-dom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react @types/node
```

Expected: `package-lock.json` updates, no install errors.

- [ ] **Step 0.2 — Add test scripts to `package.json`**

In `package.json` `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 0.3 — Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: [
      "lib/**/*.test.{ts,tsx}",
      "app/**/__tests__/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", ".next", "e2e"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
```

- [ ] **Step 0.4 — Create `tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 0.5 — Update `tsconfig.json`**

Add `"vitest/globals"` and `"@testing-library/jest-dom"` to `compilerOptions.types`. Also add `"tests/**/*.ts"` and `"vitest.config.ts"` to `"include"` if not already covered.

- [ ] **Step 0.6 — Sanity test**

Create `tests/sanity.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test infra", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

### Test Gate

```bash
cd /Users/apple/snor-oh-marketplace && npm test -- tests/sanity.test.ts
```

**Pass criterion:** Vitest reports `1 passed`, exit code 0.

- [ ] **Step 0.7 — Verify type-check still green**

```bash
cd /Users/apple/snor-oh-marketplace && npx tsc --noEmit
```

**Pass criterion:** exit 0, no errors.

- [ ] **Step 0.8 — Commit**

```bash
cd /Users/apple/snor-oh-marketplace
git add package.json package-lock.json vitest.config.ts tests/setup.ts tests/sanity.test.ts tsconfig.json
git commit -m "chore: set up vitest + happy-dom + RTL"
```

---

## Task 1: Pipeline types & constants

**Files:**
- Create: `lib/spriteProcessor/types.ts`
- Create: `lib/spriteProcessor/constants.ts`

- [ ] **Step 1.1 — Write `constants.ts`**

```ts
// Mirror of desktop SmartImport constants (Sources/Sprites/SmartImport.swift:18-25)
// and ani-mime's spriteSheetProcessor.ts. Do NOT change without coordinating
// with the desktop app — frame layouts must match across runtimes.
export const FRAME_SIZE = 128;
export const MAX_SHEET_WIDTH = 4096;
export const BG_TOLERANCE = 30;
export const BG_CLUSTER_TOLERANCE = 30;
export const ALPHA_THRESHOLD = 10;
export const MIN_GAP = 5;
export const MIN_REGION_WIDTH = 10;
export const SMALL_COMPONENT_HEIGHT_RATIO = 0.25;
```

- [ ] **Step 1.2 — Write `types.ts`**

```ts
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
```

### Test Gate

```bash
cd /Users/apple/snor-oh-marketplace && npx tsc --noEmit
```

**Pass criterion:** exit 0.

- [ ] **Step 1.3 — Commit**

```bash
git add lib/spriteProcessor/constants.ts lib/spriteProcessor/types.ts
git commit -m "feat(spriteProcessor): add types and constants"
```

---

## Task 2: `parseFrameInput` (TDD)

**Reference:** `Sources/Sprites/SmartImport.swift:522-544` — note reverse ranges and duplicates are intentional.

**Files:**
- Create: `lib/spriteProcessor/parseFrameInput.test.ts`
- Create: `lib/spriteProcessor/parseFrameInput.ts`

- [ ] **Step 2.1 — Write the failing tests first**

Create `lib/spriteProcessor/parseFrameInput.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseFrameInput } from "./parseFrameInput";

describe("parseFrameInput", () => {
  it("parses single number", () => {
    expect(parseFrameInput("3", 10)).toEqual([2]);
  });

  it("parses ascending range", () => {
    expect(parseFrameInput("1-5", 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it("parses reverse range (ping-pong)", () => {
    expect(parseFrameInput("3-1", 10)).toEqual([2, 1, 0]);
  });

  it("parses comma list", () => {
    expect(parseFrameInput("1,3,5", 10)).toEqual([0, 2, 4]);
  });

  it("parses mixed list with ranges", () => {
    expect(parseFrameInput("1-3,5,7-9", 10)).toEqual([0, 1, 2, 4, 6, 7, 8]);
  });

  it("preserves duplicates", () => {
    expect(parseFrameInput("1,1,1", 10)).toEqual([0, 0, 0]);
  });

  it("supports ping-pong like 1-3,3-1", () => {
    expect(parseFrameInput("1-3,3-1", 10)).toEqual([0, 1, 2, 2, 1, 0]);
  });

  it("drops out-of-bounds", () => {
    expect(parseFrameInput("1-5", 3)).toEqual([0, 1, 2]);
    expect(parseFrameInput("0,4", 3)).toEqual([]);
  });

  it("trims whitespace", () => {
    expect(parseFrameInput(" 1 - 3 , 5 ", 10)).toEqual([0, 1, 2, 4]);
  });

  it("returns [] for empty input", () => {
    expect(parseFrameInput("", 10)).toEqual([]);
  });

  it("returns [] for garbage", () => {
    expect(parseFrameInput("abc,xyz", 10)).toEqual([]);
  });
});
```

- [ ] **Step 2.2 — Run, expect FAIL**

```bash
npm test -- lib/spriteProcessor/parseFrameInput.test.ts
```

Expected: cannot find module — fail.

- [ ] **Step 2.3 — Implement**

Create `lib/spriteProcessor/parseFrameInput.ts`:

```ts
/**
 * Parse a 1-based range string into 0-based indices.
 * - Preserves user-written order ("3,1,2" → [2, 0, 1]).
 * - Preserves duplicates ("1,1,1" → [0, 0, 0]).
 * - Reverse ranges allowed ("3-1" → [2, 1, 0]).
 * - Drops out-of-range and unparseable values silently.
 */
export function parseFrameInput(input: string, maxFrames: number): number[] {
  const result: number[] = [];
  if (!input) return result;

  const parts = input.split(",");
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const range = part.split("-").map((s) => s.trim());
    if (range.length === 2) {
      const start = parseInt(range[0], 10);
      const end = parseInt(range[1], 10);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      const step = start <= end ? 1 : -1;
      for (let i = start; step === 1 ? i <= end : i >= end; i += step) {
        if (i >= 1 && i <= maxFrames) result.push(i - 1);
      }
    } else {
      const n = parseInt(part, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= maxFrames) result.push(n - 1);
    }
  }
  return result;
}
```

### Test Gate

```bash
npm test -- lib/spriteProcessor/parseFrameInput.test.ts
```

**Pass criterion:** all 11 tests pass, exit 0.

- [ ] **Step 2.4 — Commit**

```bash
git add lib/spriteProcessor/parseFrameInput.ts lib/spriteProcessor/parseFrameInput.test.ts
git commit -m "feat(spriteProcessor): port parseFrameInput from desktop"
```

---

## Task 3: Background detection & removal

**Reference:** `Sources/Sprites/SmartImport.swift:85-158`.

**Files:**
- Create: `lib/spriteProcessor/detect.test.ts` (will be expanded across Tasks 3 + 4)
- Create: `lib/spriteProcessor/detect.ts`

- [ ] **Step 3.1 — Helper: `makeImage` for tests**

Add to top of `lib/spriteProcessor/detect.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectBgColor, removeBackground } from "./detect";
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
```

- [ ] **Step 3.2 — Failing tests for `detectBgColor`**

```ts
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
```

- [ ] **Step 3.3 — Failing tests for `removeBackground`**

```ts
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
```

- [ ] **Step 3.4 — Run, expect FAIL**

```bash
npm test -- lib/spriteProcessor/detect.test.ts
```

Expected: module not found.

- [ ] **Step 3.5 — Implement detect.ts (this task only)**

Create `lib/spriteProcessor/detect.ts`. Add only `detectBgColor` and `removeBackground` for now (rest comes in Task 4):

```ts
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
```

(Note: `ALPHA_THRESHOLD` import is unused in this task; will be used in Task 4. Keep the import — TypeScript will warn but tests will pass. Or remove and re-add in Task 4.)

### Test Gate

```bash
npm test -- lib/spriteProcessor/detect.test.ts
```

**Pass criterion:** all 4 tests in this task pass; exit 0.

- [ ] **Step 3.6 — Commit**

```bash
git add lib/spriteProcessor/detect.ts lib/spriteProcessor/detect.test.ts
git commit -m "feat(spriteProcessor): port background detection and removal"
```

---

## Task 4: Row/column detection, frame extraction, `processSheet`

**Reference:** `Sources/Sprites/SmartImport.swift:267-374,550-569`.

**Files:**
- Modify: `lib/spriteProcessor/detect.ts`
- Modify: `lib/spriteProcessor/detect.test.ts`

- [ ] **Step 4.1 — Append failing tests for `detectRows`, `detectColumns`, `extractFrames`, `processSheet`**

Append to `lib/spriteProcessor/detect.test.ts`:

```ts
import { detectRows, extractFrames, processSheet } from "./detect";

describe("detectRows + extractFrames", () => {
  it("detects two rows of three sprites on bg", () => {
    const img = makeImage(60, 40, [255, 255, 255], [
      // Row 1: three 8x10 sprites at y=2..12
      { x: 4, y: 2, w: 8, h: 10, rgb: [10, 10, 10] },
      { x: 24, y: 2, w: 8, h: 10, rgb: [10, 10, 10] },
      { x: 44, y: 2, w: 8, h: 10, rgb: [10, 10, 10] },
      // Row 2: three 8x10 sprites at y=20..30
      { x: 4, y: 20, w: 8, h: 10, rgb: [10, 10, 10] },
      { x: 24, y: 20, w: 8, h: 10, rgb: [10, 10, 10] },
      { x: 44, y: 20, w: 8, h: 10, rgb: [10, 10, 10] },
    ]);
    const result = processSheet(img);
    expect(result.rows.length).toBe(2);
    expect(result.frames.length).toBe(6);
    expect(result.frames[0].x1).toBe(4);
    expect(result.frames[0].x2).toBe(12);
    expect(result.frames[0].y1).toBe(2);
    expect(result.frames[0].y2).toBe(12);
    expect(result.bgColor).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("merges sprites across MIN_GAP", () => {
    // Two rects 3px apart should merge (MIN_GAP = 5)
    const img = makeImage(40, 20, [255, 255, 255], [
      { x: 5, y: 5, w: 8, h: 10, rgb: [0, 0, 0] },
      { x: 16, y: 5, w: 8, h: 10, rgb: [0, 0, 0] },
    ]);
    const result = processSheet(img);
    expect(result.rows.length).toBe(1);
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].x1).toBe(5);
    expect(result.frames[0].x2).toBe(24);
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
```

- [ ] **Step 4.2 — Run, expect FAIL**

```bash
npm test -- lib/spriteProcessor/detect.test.ts
```

Expected: imports fail or new assertions fail.

- [ ] **Step 4.3 — Implement remaining detect.ts functions**

> **Note for the implementer:** the snippets below include extra `import` lines. Do **not** literally append them mid-file — TypeScript requires imports at the top. Merge `MIN_GAP`, `MIN_REGION_WIDTH` into the existing `from "./constants"` import, and merge `DetectedRow`, `Frame`, `SpriteRegion` into the existing `from "./types"` import.

Append to `lib/spriteProcessor/detect.ts`:

```ts
import { MIN_GAP, MIN_REGION_WIDTH } from "./constants";
import type { DetectedRow, Frame, SpriteRegion } from "./types";

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

  // Pass 3: absorb slivers
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
```

### Test Gate

```bash
npm test -- lib/spriteProcessor/detect.test.ts
```

**Pass criterion:** all tests in detect.test.ts pass; exit 0.

- [ ] **Step 4.4 — Commit**

```bash
git add lib/spriteProcessor/detect.ts lib/spriteProcessor/detect.test.ts
git commit -m "feat(spriteProcessor): add row/column detection and processSheet"
```

---

## Task 5: `gridLayout`, `getTightBBox`, `createStripFromFrames`

**Reference:** `Sources/Sprites/SmartImport.swift:77-81,392-415,422-513`.

**Files:**
- Create: `lib/spriteProcessor/strip.ts`
- Create: `lib/spriteProcessor/strip.test.ts`

- [ ] **Step 5.1 — Failing tests**

Create `lib/spriteProcessor/strip.test.ts`:

```ts
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
    const img = makeImage(60, 20, [255, 255, 255], [
      { x: 5, y: 5, w: 8, h: 10, rgb: [10, 10, 10] },
      { x: 25, y: 5, w: 8, h: 10, rgb: [10, 10, 10] },
      { x: 45, y: 5, w: 8, h: 10, rgb: [10, 10, 10] },
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
    expect(strip.frames).toBe(3);
    expect(strip.pngBytes.byteLength).toBeGreaterThan(0);

    // PNG magic check
    expect(strip.pngBytes[0]).toBe(0x89);
    expect(strip.pngBytes[1]).toBe(0x50);
    expect(strip.pngBytes[2]).toBe(0x4e);
    expect(strip.pngBytes[3]).toBe(0x47);
  });

  it("returns null when indices are empty", async () => {
    const img = makeImage(60, 20, [255, 255, 255], [
      { x: 5, y: 5, w: 8, h: 10, rgb: [10, 10, 10] },
    ]);
    const { processed, frames } = processSheet(img);
    const { encodePng } = await import("./serverImage");
    const strip = await createStripFromFrames(processed, frames, [], encodePng);
    expect(strip).toBeNull();
  });
});
```

- [ ] **Step 5.2 — Run, expect FAIL**

```bash
npm test -- lib/spriteProcessor/strip.test.ts
```

Expected: module not found.

- [ ] **Step 5.3 — Implement strip.ts**

Create `lib/spriteProcessor/strip.ts`:

```ts
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

  // Compute bboxes and skip frames that have no content.
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

    // Nearest-neighbour scale into the destination cell.
    // Pure JS — runtime-agnostic.
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
```

> Note: this uses nearest-neighbour scaling, divergent from desktop's bicubic. Acceptable for v1 — the strip is rendered at native frame size in the desktop client, so the upscale path rarely matters. We can switch to a higher-quality scale later if the spec follow-ups demand it.

- [ ] **Step 5.4 — Stub `serverImage.ts` so the test import works**

Create `lib/spriteProcessor/serverImage.ts`:

```ts
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
  // Buffer extends Uint8Array — return as-is, typed as the shared contract.
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
```

### Test Gate

```bash
npm test -- lib/spriteProcessor/strip.test.ts
```

**Pass criterion:** all 5 tests pass; exit 0.

- [ ] **Step 5.5 — Commit**

```bash
git add lib/spriteProcessor/strip.ts lib/spriteProcessor/strip.test.ts lib/spriteProcessor/serverImage.ts
git commit -m "feat(spriteProcessor): add gridLayout, getTightBBox, createStripFromFrames + sharp adapter"
```

---

## Task 6: Browser canvas adapter + public `index.ts`

**Files:**
- Create: `lib/spriteProcessor/canvas.ts`
- Create: `lib/spriteProcessor/index.ts`

The Canvas adapter is browser-only and not unit-testable in happy-dom (no real Canvas). The Playwright e2e test in Task 14 covers the live browser path. We type-check it and exercise it indirectly through hook tests that mock its surface.

- [ ] **Step 6.1 — `canvas.ts`**

```ts
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
```

- [ ] **Step 6.2 — Public `index.ts`**

```ts
export * from "./constants";
export * from "./types";
export { parseFrameInput } from "./parseFrameInput";
export {
  detectBgColor,
  removeBackground,
  detectRows,
  extractFrames,
  processSheet,
} from "./detect";
export {
  gridLayout,
  getTightBBox,
  createStripFromFrames,
} from "./strip";
```

### Test Gate

```bash
cd /Users/apple/snor-oh-marketplace && npx tsc --noEmit && npm test
```

**Pass criterion:** type-check exit 0; full Vitest run reports 0 failures.

- [ ] **Step 6.3 — Commit**

```bash
git add lib/spriteProcessor/canvas.ts lib/spriteProcessor/index.ts
git commit -m "feat(spriteProcessor): add browser canvas adapter and public index"
```

---

## Task 7: Server adapter parity test

Confirms the same `RawImage` round-trips through `sharp` cleanly and stays size-stable.

**Files:**
- Create: `lib/spriteProcessor/serverImage.test.ts`

- [ ] **Step 7.1 — Failing test**

```ts
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
```

- [ ] **Step 7.2 — Run, should already PASS**

```bash
npm test -- lib/spriteProcessor/serverImage.test.ts
```

**Pass criterion:** `1 passed`, exit 0. (Uses sharp from existing deps.)

- [ ] **Step 7.3 — Commit**

```bash
git add lib/spriteProcessor/serverImage.test.ts
git commit -m "test(spriteProcessor): add server adapter round-trip"
```

---

## Task 8: `useSmartImport` hook

**Files:**
- Create: `lib/useSmartImport.ts`
- Create: `lib/useSmartImport.test.tsx`

- [ ] **Step 8.1 — Failing tests**

```tsx
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSmartImport } from "./useSmartImport";
import { processSheet } from "./spriteProcessor/detect";
import { STATUSES } from "./schema";
import type { RawImage } from "./spriteProcessor/types";

function fixtureImage(): RawImage {
  // 7×1 rects on solid white, each 8×10
  const w = 100, h = 16;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 0] = 255;
    data[i * 4 + 1] = 255;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  for (let s = 0; s < 7; s++) {
    const sx = 4 + s * 13;
    for (let y = 3; y < 13; y++)
      for (let x = sx; x < sx + 8; x++) {
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
```

- [ ] **Step 8.2 — Run, expect FAIL**

```bash
npm test -- lib/useSmartImport.test.tsx
```

- [ ] **Step 8.3 — Implement hook**

Create `lib/useSmartImport.ts`:

```ts
"use client";

import { useCallback, useMemo, useState } from "react";
import { parseFrameInput } from "./spriteProcessor/parseFrameInput";
import { createStripFromFrames } from "./spriteProcessor/strip";
import { encodePng as encodePngBrowser } from "./spriteProcessor/canvas";
import { STATUSES, type StatusKey, type SnorohFile } from "./schema";
import type { BgColor, Frame, RawImage } from "./spriteProcessor/types";

export interface SmartImportState {
  name: string;
  sourceImage: ImageBitmap | null;
  sourceFile: File | null;
  processed: RawImage | null;
  detectedFrames: Frame[];
  framePreviews: HTMLCanvasElement[];
  bgColor: BgColor | null;
  frameInputs: Record<StatusKey, string>;
  framesEdited: boolean;
  processing: boolean;
  saving: boolean;
  error: string | null;
}

interface IngestArg {
  sourceFile: File | null;
  sourceImage: ImageBitmap | null;
  processed: RawImage;
  frames: Frame[];
  framePreviews: HTMLCanvasElement[];
  bgColor: BgColor;
  defaultName: string;
}

const emptyInputs = (): Record<StatusKey, string> => {
  const o = {} as Record<StatusKey, string>;
  for (const s of STATUSES) o[s] = "";
  return o;
};

// When total < 7 (e.g. a 3-frame sheet), statuses beyond `total` reuse the
// last frame index ("3"). Distribution isn't perfectly uniform in that
// degenerate case, but every status ends up with at least one valid index,
// which is what `canSave` requires. Mirrors desktop fallback behavior.
function autoDistribute(total: number): Record<StatusKey, string> {
  const out = emptyInputs();
  if (total === 0) return out;
  const n = STATUSES.length;
  const per = Math.max(1, Math.floor(total / n));
  let offset = 1;
  for (let i = 0; i < n; i++) {
    const status = STATUSES[i];
    const count = i === n - 1 ? Math.max(1, total - offset + 1) : Math.min(per, total - offset + 1);
    if (offset > total) {
      out[status] = `${total}`;
      continue;
    }
    const end = Math.min(offset + count - 1, total);
    out[status] = end > offset ? `${offset}-${end}` : `${offset}`;
    offset = end + 1;
  }
  return out;
}

function reserialize(indices: number[]): string {
  if (indices.length === 0) return "";
  const parts: string[] = [];
  let start = indices[0];
  let prev = indices[0];
  for (let k = 1; k < indices.length; k++) {
    const curr = indices[k];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
      start = curr;
      prev = curr;
    }
  }
  parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
  return parts.join(",");
}

const initialState: SmartImportState = {
  name: "",
  sourceImage: null,
  sourceFile: null,
  processed: null,
  detectedFrames: [],
  framePreviews: [],
  bgColor: null,
  frameInputs: emptyInputs(),
  framesEdited: false,
  processing: false,
  saving: false,
  error: null,
};

export function useSmartImport() {
  const [state, setState] = useState<SmartImportState>(initialState);

  const setName = useCallback((name: string) => {
    setState((s) => ({ ...s, name: name.slice(0, 20) }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((s) => ({ ...s, error }));
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    setState((s) => ({ ...s, processing }));
  }, []);

  const setSaving = useCallback((saving: boolean) => {
    setState((s) => ({ ...s, saving }));
  }, []);

  const ingestProcessed = useCallback((arg: IngestArg) => {
    setState((s) => ({
      ...s,
      sourceFile: arg.sourceFile,
      sourceImage: arg.sourceImage,
      processed: arg.processed,
      detectedFrames: arg.frames,
      framePreviews: arg.framePreviews,
      bgColor: arg.bgColor,
      frameInputs: autoDistribute(arg.frames.length),
      framesEdited: false,
      name: s.name || arg.defaultName,
      processing: false,
      error: null,
    }));
  }, []);

  const setFrameInput = useCallback((status: StatusKey, value: string) => {
    setState((s) => ({ ...s, frameInputs: { ...s.frameInputs, [status]: value } }));
  }, []);

  const applyRemap = useCallback((oldToNew: (number | null)[]) => {
    setState((s) => {
      const next = emptyInputs();
      for (const status of STATUSES) {
        const oldIdx = parseFrameInput(s.frameInputs[status], oldToNew.length);
        const newIdx: number[] = [];
        for (const i of oldIdx) {
          if (i < oldToNew.length) {
            const m = oldToNew[i];
            if (m !== null) newIdx.push(m);
          }
        }
        next[status] = reserialize(newIdx);
      }
      return { ...s, frameInputs: next };
    });
  }, []);

  const deleteFrame = useCallback((pos: number) => {
    setState((s) => {
      if (pos < 0 || pos >= s.detectedFrames.length) return s;
      const n = s.detectedFrames.length;
      const oldToNew: (number | null)[] = [];
      for (let i = 0; i < n; i++) {
        if (i === pos) oldToNew.push(null);
        else if (i < pos) oldToNew.push(i);
        else oldToNew.push(i - 1);
      }
      const detectedFrames = s.detectedFrames.filter((_, i) => i !== pos);
      const framePreviews = s.framePreviews.filter((_, i) => i !== pos);
      // Remap frameInputs
      const nextInputs = emptyInputs();
      for (const status of STATUSES) {
        const oldIdx = parseFrameInput(s.frameInputs[status], n);
        const newIdx: number[] = [];
        for (const i of oldIdx) {
          const m = oldToNew[i];
          if (m !== null) newIdx.push(m);
        }
        nextInputs[status] = reserialize(newIdx);
      }
      return {
        ...s,
        detectedFrames,
        framePreviews,
        frameInputs: nextInputs,
        framesEdited: true,
      };
    });
  }, []);

  const moveFrame = useCallback((from: number, to: number) => {
    setState((s) => {
      if (from === to) return s;
      const n = s.detectedFrames.length;
      if (from < 0 || from >= n || to < 0 || to >= n) return s;
      const order = Array.from({ length: n }, (_, i) => i);
      const [m] = order.splice(from, 1);
      order.splice(to, 0, m);
      const oldToNew = new Array<number | null>(n).fill(null);
      order.forEach((oldPos, newPos) => (oldToNew[oldPos] = newPos));
      const detectedFrames = order.map((i) => s.detectedFrames[i]);
      const framePreviews = order.map((i) => s.framePreviews[i]);
      const nextInputs = emptyInputs();
      for (const status of STATUSES) {
        const oldIdx = parseFrameInput(s.frameInputs[status], n);
        const newIdx: number[] = [];
        for (const i of oldIdx) {
          const k = oldToNew[i];
          if (k !== null) newIdx.push(k);
        }
        nextInputs[status] = reserialize(newIdx);
      }
      return {
        ...s,
        detectedFrames,
        framePreviews,
        frameInputs: nextInputs,
        framesEdited: true,
      };
    });
  }, []);

  const deleteFromStatus = useCallback((status: StatusKey, pos: number) => {
    setState((s) => {
      const indices = parseFrameInput(s.frameInputs[status], s.detectedFrames.length);
      if (pos < 0 || pos >= indices.length) return s;
      indices.splice(pos, 1);
      return { ...s, frameInputs: { ...s.frameInputs, [status]: reserialize(indices) } };
    });
  }, []);

  const moveInStatus = useCallback((status: StatusKey, from: number, to: number) => {
    setState((s) => {
      const indices = parseFrameInput(s.frameInputs[status], s.detectedFrames.length);
      if (from === to) return s;
      if (from < 0 || from >= indices.length || to < 0 || to >= indices.length) return s;
      const [m] = indices.splice(from, 1);
      indices.splice(to, 0, m);
      return { ...s, frameInputs: { ...s.frameInputs, [status]: reserialize(indices) } };
    });
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const canSave = useMemo(() => {
    if (!state.name) return false;
    if (!state.processed) return false;
    if (state.saving) return false;
    for (const s of STATUSES) {
      if (parseFrameInput(state.frameInputs[s], state.detectedFrames.length).length === 0) return false;
    }
    return true;
  }, [state]);

  /** Build a SnorohFile JSON payload (v2 if !framesEdited and source small, else v1). */
  const buildPackage = useCallback(async (): Promise<SnorohFile> => {
    if (!state.processed) throw new Error("no processed image");
    const useV2 =
      !state.framesEdited &&
      state.sourceFile !== null &&
      state.sourceFile.size <= 2 * 1024 * 1024;

    if (useV2 && state.sourceFile) {
      const buf = await state.sourceFile.arrayBuffer();
      const sourceSheet = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const frameInputs: Record<string, string> = {};
      for (const s of STATUSES) frameInputs[s] = state.frameInputs[s];
      return { version: 2, name: state.name, smartImportMeta: { sourceSheet, frameInputs } };
    }

    const sprites: SnorohFile["sprites"] = {};
    for (const s of STATUSES) {
      const indices = parseFrameInput(state.frameInputs[s], state.detectedFrames.length);
      if (indices.length === 0) throw new Error(`no frames assigned for ${s}`);
      const strip = await createStripFromFrames(state.processed, state.detectedFrames, indices, encodePngBrowser);
      if (!strip) throw new Error(`failed to render strip for ${s}`);
      const b64 = btoa(String.fromCharCode(...strip.pngBytes));
      sprites![s] = { frames: strip.frames, data: b64 };
    }
    return { version: 1, name: state.name, sprites };
  }, [state]);

  return {
    state,
    setName,
    setError,
    setProcessing,
    setSaving,
    ingestProcessed,
    setFrameInput,
    deleteFrame,
    moveFrame,
    deleteFromStatus,
    moveInStatus,
    applyRemap,
    reset,
    canSave,
    buildPackage,
  };
}
```

### Test Gate

```bash
npm test -- lib/useSmartImport.test.tsx
```

**Pass criterion:** all 4 tests pass; exit 0.

- [ ] **Step 8.4 — Commit**

```bash
git add lib/useSmartImport.ts lib/useSmartImport.test.tsx
git commit -m "feat: add headless useSmartImport hook"
```

---

## Task 9: `FrameGrid` component

**Files:**
- Create: `app/create/FrameGrid.tsx`
- Create: `app/create/__tests__/FrameGrid.test.tsx`

- [ ] **Step 9.1 — Failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FrameGrid } from "../FrameGrid";

function stubCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}

describe("FrameGrid", () => {
  it("renders one tile per preview", () => {
    const previews = [stubCanvas(), stubCanvas(), stubCanvas()];
    render(<FrameGrid previews={previews} onDelete={() => {}} onMove={() => {}} />);
    expect(screen.getAllByRole("listitem").length).toBe(3);
  });

  it("invokes onDelete when delete button clicked", () => {
    const previews = [stubCanvas(), stubCanvas()];
    const onDelete = vi.fn();
    render(<FrameGrid previews={previews} onDelete={onDelete} onMove={() => {}} />);
    const buttons = screen.getAllByRole("button", { name: /delete frame/i });
    fireEvent.click(buttons[1]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 9.2 — Run, expect FAIL**

```bash
npm test -- app/create/__tests__/FrameGrid.test.tsx
```

- [ ] **Step 9.3 — Implement `FrameGrid`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  previews: HTMLCanvasElement[];
  onDelete: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function FrameGrid({ previews, onDelete, onMove }: Props) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  return (
    <ul
      role="list"
      className="grid grid-cols-8 gap-1"
      onDragOver={(e) => e.preventDefault()}
    >
      {previews.map((canvas, i) => (
        <Tile
          key={i}
          canvas={canvas}
          index={i}
          dragged={draggedIndex === i}
          onDragStart={() => setDraggedIndex(i)}
          onDrop={() => {
            if (draggedIndex !== null && draggedIndex !== i) onMove(draggedIndex, i);
            setDraggedIndex(null);
          }}
          onDelete={() => onDelete(i)}
        />
      ))}
    </ul>
  );
}

function Tile({
  canvas,
  index,
  dragged,
  onDragStart,
  onDrop,
  onDelete,
}: {
  canvas: HTMLCanvasElement;
  index: number;
  dragged: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !canvas) return;
    el.replaceChildren(canvas);
  }, [canvas]);

  return (
    <li
      role="listitem"
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={["relative flex flex-col items-center gap-0.5", dragged ? "opacity-40" : ""].join(" ")}
    >
      <div
        ref={ref}
        className="size-11 rounded-sm bg-[color:var(--bg-subtle)]"
      />
      <button
        type="button"
        aria-label="delete frame"
        onClick={onDelete}
        className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] hover:flex"
      >
        ×
      </button>
      <span className="font-mono text-[10px] opacity-50">{index + 1}</span>
    </li>
  );
}
```

> NOTE: happy-dom does not implement Canvas; tests pass real `HTMLCanvasElement` stubs that mount but render nothing visible. The `replaceChildren` path is exercised; visual rendering is verified via Playwright in Task 14.

### Test Gate

```bash
npm test -- app/create/__tests__/FrameGrid.test.tsx
```

**Pass criterion:** both tests pass.

- [ ] **Step 9.4 — Commit**

```bash
git add app/create/FrameGrid.tsx app/create/__tests__/FrameGrid.test.tsx
git commit -m "feat(create): add FrameGrid with drag-reorder + hover-delete"
```

---

## Task 10: `StatusRow` + `AnimationPreview`

**Files:**
- Create: `app/create/StatusRow.tsx`
- Create: `app/create/AnimationPreview.tsx`
- Create: `app/create/__tests__/StatusRow.test.tsx`

- [ ] **Step 10.1 — Failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StatusRow } from "../StatusRow";

describe("StatusRow", () => {
  it("renders label, input, badge", () => {
    const setInput = vi.fn();
    render(
      <StatusRow
        status="idle"
        value="1-3"
        previews={[]}
        maxFrames={5}
        onSetInput={setInput}
        onDeleteFromStatus={() => {}}
        onMoveInStatus={() => {}}
      />
    );
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1-3")).toBeInTheDocument();
    expect(screen.getByText("3f")).toBeInTheDocument();
  });

  it("calls onSetInput on typing", () => {
    const setInput = vi.fn();
    render(
      <StatusRow
        status="idle"
        value=""
        previews={[]}
        maxFrames={5}
        onSetInput={setInput}
        onDeleteFromStatus={() => {}}
        onMoveInStatus={() => {}}
      />
    );
    const input = screen.getByPlaceholderText(/e\.g\./i);
    fireEvent.change(input, { target: { value: "1-5" } });
    expect(setInput).toHaveBeenCalledWith("idle", "1-5");
  });
});
```

- [ ] **Step 10.2 — Implement `AnimationPreview`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  frames: HTMLCanvasElement[];
  fps?: number;
}

export function AnimationPreview({ frames, fps = 10 }: Props) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (frames.length <= 1) return;
    const t = setInterval(() => setI((k) => (k + 1) % frames.length), 1000 / fps);
    return () => clearInterval(t);
  }, [frames.length, fps]);
  useEffect(() => {
    const el = ref.current;
    const c = frames[i];
    if (!el || !c) return;
    el.replaceChildren(c);
  }, [frames, i]);
  return <div ref={ref} className="size-24 rounded-sm bg-[color:var(--bg-subtle)]" />;
}
```

- [ ] **Step 10.3 — Implement `StatusRow`**

```tsx
"use client";

import { useState } from "react";
import type { StatusKey } from "@/lib/schema";
import { parseFrameInput } from "@/lib/spriteProcessor/parseFrameInput";
import { AnimationPreview } from "./AnimationPreview";

interface Props {
  status: StatusKey;
  value: string;
  previews: HTMLCanvasElement[];
  maxFrames: number;
  onSetInput: (status: StatusKey, value: string) => void;
  onDeleteFromStatus: (status: StatusKey, pos: number) => void;
  onMoveInStatus: (status: StatusKey, from: number, to: number) => void;
}

export function StatusRow({
  status,
  value,
  previews,
  maxFrames,
  onSetInput,
  onDeleteFromStatus,
  onMoveInStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const indices = parseFrameInput(value, maxFrames);
  const previewFrames = indices
    .map((i) => previews[i])
    .filter((c): c is HTMLCanvasElement => Boolean(c));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="w-20 text-right font-mono text-sm">{status}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onSetInput(status, e.target.value)}
          placeholder="e.g. 1-5"
          className="w-32 rounded-md border bg-transparent px-2 py-1 font-mono text-sm"
        />
        <span className={[
          "w-8 font-mono text-xs",
          indices.length === 0 ? "text-red-500" : "opacity-60",
        ].join(" ")}>
          {indices.length}f
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={indices.length === 0}
          className="rounded px-2 py-1 text-sm disabled:opacity-30"
        >
          ▶
        </button>
      </div>
      {open && previewFrames.length > 0 && (
        <div className="ml-20 rounded-md border p-2">
          <AnimationPreview frames={previewFrames} />
        </div>
      )}
    </div>
  );
}
```

### Test Gate

```bash
npm test -- app/create/__tests__/StatusRow.test.tsx
```

**Pass criterion:** both tests pass.

- [ ] **Step 10.4 — Commit**

```bash
git add app/create/StatusRow.tsx app/create/AnimationPreview.tsx app/create/__tests__/StatusRow.test.tsx
git commit -m "feat(create): add StatusRow + AnimationPreview"
```

---

## Task 11: `Footer` (Download + Publish wiring)

**Files:**
- Create: `app/create/Footer.tsx`
- Create: `app/create/__tests__/Footer.test.tsx`

- [ ] **Step 11.1 — Failing test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Footer } from "../Footer";

describe("Footer", () => {
  it("disables Save when canSave=false", () => {
    render(<Footer canSave={false} busy={false} onDownload={() => {}} onPublish={() => {}} />);
    expect(screen.getByRole("button", { name: /download/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });

  it("calls onDownload on click", () => {
    const onDownload = vi.fn();
    render(<Footer canSave busy={false} onDownload={onDownload} onPublish={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /download/i }));
    expect(onDownload).toHaveBeenCalled();
  });

  it("reveals creator field then submits on Publish", () => {
    const onPublish = vi.fn();
    render(<Footer canSave busy={false} onDownload={() => {}} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    const handle = screen.getByPlaceholderText(/@yourhandle/i);
    fireEvent.change(handle, { target: { value: "@me" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm publish/i }));
    expect(onPublish).toHaveBeenCalledWith("@me");
  });
});
```

- [ ] **Step 11.2 — Implement Footer**

```tsx
"use client";

import { useState } from "react";

interface Props {
  canSave: boolean;
  busy: boolean;
  onDownload: () => void;
  onPublish: (creator: string) => void;
}

export function Footer({ canSave, busy, onDownload, onPublish }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [creator, setCreator] = useState("");

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          disabled={!canSave || busy}
          onClick={onDownload}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Download .snoroh
        </button>
        <button
          type="button"
          disabled={!canSave || busy}
          onClick={() => setRevealed((v) => !v)}
          className="rounded-md bg-[color:var(--accent)] px-3 py-1.5 text-sm font-semibold text-[color:var(--accent-fg)] disabled:opacity-40"
        >
          Publish
        </button>
      </div>
      {revealed && (
        <div className="flex items-center justify-end gap-2">
          <input
            type="text"
            value={creator}
            maxLength={40}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="@yourhandle (optional)"
            className="rounded border px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => onPublish(creator)}
            className="rounded bg-[color:var(--accent)] px-3 py-1 text-sm font-semibold text-[color:var(--accent-fg)]"
          >
            Confirm publish
          </button>
        </div>
      )}
    </div>
  );
}
```

### Test Gate

```bash
npm test -- app/create/__tests__/Footer.test.tsx
```

**Pass criterion:** all 3 tests pass.

- [ ] **Step 11.3 — Commit**

```bash
git add app/create/Footer.tsx app/create/__tests__/Footer.test.tsx
git commit -m "feat(create): add Footer with Download + reveal-on-publish flow"
```

---

## Task 12: Page wiring (`app/create/page.tsx`, header, top section, status assignment)

**Files:**
- Create: `app/create/CreateHeader.tsx`
- Create: `app/create/TopSection.tsx`
- Create: `app/create/StatusAssignment.tsx`
- Create: `app/create/page.tsx`
- Create: `app/create/__tests__/page.test.tsx`

- [ ] **Step 12.1 — Implement `CreateHeader`**

```tsx
interface Props { detectedCount: number }

export function CreateHeader({ detectedCount }: Props) {
  return (
    <header className="flex items-center justify-between border-b pb-3">
      <h1 className="text-lg font-semibold">Smart Import</h1>
      {detectedCount > 0 && (
        <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xs">{detectedCount} frames</span>
      )}
    </header>
  );
}
```

- [ ] **Step 12.2 — Implement `TopSection`**

```tsx
"use client";

import { useRef } from "react";

interface Props {
  name: string;
  onName: (v: string) => void;
  onPickFile: (file: File) => void;
  busy: boolean;
}

export function TopSection({ name, onName, onPickFile, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-3">
        <span className="w-16 text-right font-mono text-sm opacity-60">Name</span>
        <input
          type="text"
          value={name}
          maxLength={20}
          onChange={(e) => onName(e.target.value)}
          className="w-48 rounded border px-2 py-1 text-sm"
        />
      </label>
      <div className="flex items-center gap-3">
        <span className="w-16 text-right font-mono text-sm opacity-60">Source</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded border px-3 py-1 text-sm"
        >
          {busy ? "Processing…" : name ? "Change sprite sheet" : "Pick sprite sheet"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 12.3 — Implement `StatusAssignment`**

```tsx
"use client";

import { STATUSES, type StatusKey } from "@/lib/schema";
import { StatusRow } from "./StatusRow";

interface Props {
  inputs: Record<StatusKey, string>;
  previews: HTMLCanvasElement[];
  maxFrames: number;
  onSetInput: (status: StatusKey, value: string) => void;
  onDeleteFromStatus: (status: StatusKey, pos: number) => void;
  onMoveInStatus: (status: StatusKey, from: number, to: number) => void;
}

export function StatusAssignment(p: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Assign frames to status</h2>
      {STATUSES.map((s) => (
        <StatusRow
          key={s}
          status={s}
          value={p.inputs[s]}
          previews={p.previews}
          maxFrames={p.maxFrames}
          onSetInput={p.onSetInput}
          onDeleteFromStatus={p.onDeleteFromStatus}
          onMoveInStatus={p.onMoveInStatus}
        />
      ))}
      <p className="font-mono text-[11px] opacity-50">
        Ranges: &quot;1-5&quot;, &quot;1,3,5&quot;, or &quot;1-3,5,7-9&quot; (1-based)
      </p>
    </div>
  );
}
```

- [ ] **Step 12.4 — Implement `app/create/page.tsx`**

```tsx
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSmartImport } from "@/lib/useSmartImport";
import { processSheet } from "@/lib/spriteProcessor/detect";
import { loadImageData, frameThumbnail } from "@/lib/spriteProcessor/canvas";
import { CreateHeader } from "./CreateHeader";
import { TopSection } from "./TopSection";
import { FrameGrid } from "./FrameGrid";
import { StatusAssignment } from "./StatusAssignment";
import { Footer } from "./Footer";

export default function CreatePage() {
  const hook = useSmartImport();
  const router = useRouter();

  const onPickFile = useCallback(async (file: File) => {
    hook.setProcessing(true);
    hook.setError(null);
    try {
      const img = await loadImageData(file);
      const result = processSheet(img);
      const previews = result.frames.map((f) => frameThumbnail(result.processed, f, 48));
      const defaultName = file.name.replace(/\.[^.]+$/, "").slice(0, 20);
      hook.ingestProcessed({
        sourceFile: file,
        sourceImage: null,
        processed: result.processed,
        frames: result.frames,
        framePreviews: previews,
        bgColor: result.bgColor,
        defaultName,
      });
    } catch (e) {
      hook.setError(e instanceof Error ? e.message : "Could not load image");
      hook.setProcessing(false);
    }
  }, [hook]);

  const onDownload = useCallback(async () => {
    const pkg = await hook.buildPackage();
    const blob = new Blob([JSON.stringify(pkg)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${hook.state.name}.snoroh`;
    a.click();
    URL.revokeObjectURL(url);
  }, [hook]);

  const onPublish = useCallback(async (creator: string) => {
    if (hook.state.saving) return; // guard against double-submit
    hook.setSaving(true);
    try {
      const pkg = await hook.buildPackage();
      const blob = new Blob([JSON.stringify(pkg)], { type: "application/json" });
      const fd = new FormData();
      fd.set("file", blob, `${hook.state.name}.snoroh`);
      fd.set("filename", `${hook.state.name}.snoroh`);
      if (creator) fd.set("creator", creator);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        hook.setError(data?.error?.message ?? "Publish failed");
        return;
      }
      router.push("/");
    } finally {
      hook.setSaving(false);
    }
  }, [hook, router]);

  const s = hook.state;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <CreateHeader detectedCount={s.detectedFrames.length} />
      {s.error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
          {s.error}
        </p>
      )}
      <TopSection
        name={s.name}
        onName={hook.setName}
        onPickFile={onPickFile}
        busy={s.processing}
      />
      {s.framePreviews.length > 0 && (
        <FrameGrid previews={s.framePreviews} onDelete={hook.deleteFrame} onMove={hook.moveFrame} />
      )}
      {s.detectedFrames.length > 0 && (
        <StatusAssignment
          inputs={s.frameInputs}
          previews={s.framePreviews}
          maxFrames={s.detectedFrames.length}
          onSetInput={hook.setFrameInput}
          onDeleteFromStatus={hook.deleteFromStatus}
          onMoveInStatus={hook.moveInStatus}
        />
      )}
      <Footer
        canSave={hook.canSave}
        busy={s.saving || s.processing}
        onDownload={onDownload}
        onPublish={onPublish}
      />
    </main>
  );
}
```

- [ ] **Step 12.5 — Smoke render test**

Create `app/create/__tests__/page.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CreatePage from "../page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

describe("CreatePage", () => {
  it("renders heading and pick button", () => {
    render(<CreatePage />);
    expect(screen.getByText(/smart import/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pick sprite sheet/i })).toBeInTheDocument();
  });
});
```

(Add `import { vi } from "vitest";` at top.)

### Test Gate

```bash
npm test -- app/create
cd /Users/apple/snor-oh-marketplace && npx tsc --noEmit
```

**Pass criterion:** all `app/create` tests green; type-check exit 0.

- [ ] **Step 12.6 — Commit**

```bash
git add app/create
git commit -m "feat(create): wire create page (header, top, grid, status, footer)"
```

---

## Task 13: Homepage CTA + full build verification

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 13.1 — Add CTA**

In `app/page.tsx`, add a small inline link near the existing upload form:

```tsx
<p className="mt-2 text-sm">
  No package yet?{" "}
  <a href="/create" className="text-[color:var(--accent)] underline">
    Build one from a sprite sheet
  </a>
  .
</p>
```

(Place it adjacent to the upload form. Keep wording minimal.)

### Test Gate

```bash
cd /Users/apple/snor-oh-marketplace && npm run build
```

**Pass criterion:** `next build` exits 0; no type errors; produces `.next/`.

- [ ] **Step 13.2 — Commit**

```bash
git add app/page.tsx
git commit -m "feat: link Smart Import from gallery"
```

---

## Task 14: Playwright e2e smoke

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/create.spec.ts`
- Create: `e2e/fixtures/sheet-3.png` (committed binary, ~1 KB)
- Modify: `package.json` (devDep + script)

- [ ] **Step 14.1 — Install Playwright**

```bash
cd /Users/apple/snor-oh-marketplace
npm install --save-dev @playwright/test
npx playwright install chromium
```

- [ ] **Step 14.2 — Add `e2e:smoke` script**

In `package.json` `"scripts"`:

```json
"e2e:smoke": "playwright test e2e/create.spec.ts"
```

- [ ] **Step 14.3 — `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 60_000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
```

- [ ] **Step 14.4 — Generate fixture sheet**

Run a one-off Node script (commit the resulting PNG, not the script):

```bash
node -e "
const sharp = require('sharp');
const w=60, h=20;
const buf = Buffer.alloc(w*h*4);
for (let i=0;i<w*h;i++) { buf[i*4]=255; buf[i*4+1]=255; buf[i*4+2]=255; buf[i*4+3]=255; }
function rect(x,y,rw,rh){for(let yy=y;yy<y+rh;yy++)for(let xx=x;xx<x+rw;xx++){const o=(yy*w+xx)*4;buf[o]=0;buf[o+1]=0;buf[o+2]=0;buf[o+3]=255;}}
rect(5,5,8,10); rect(25,5,8,10); rect(45,5,8,10);
sharp(buf,{raw:{width:w,height:h,channels:4}}).png().toFile('e2e/fixtures/sheet-3.png');
"
```

- [ ] **Step 14.5 — Write the e2e spec**

```ts
import { test, expect } from "@playwright/test";
import path from "path";

test("user can build and download a v2 .snoroh from a sprite sheet", async ({ page }) => {
  await page.goto("/create");

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /pick sprite sheet/i }).click(),
  ]);

  await fileChooser.setFiles(path.join(__dirname, "fixtures/sheet-3.png"));

  // Wait for the frame badge to show 3 frames
  await expect(page.getByText("3 frames")).toBeVisible({ timeout: 5000 });

  // Auto-distribution should populate all 7 status inputs
  for (const s of [
    "initializing",
    "searching",
    "idle",
    "busy",
    "service",
    "disconnected",
    "visiting",
  ]) {
    await expect(page.getByText(s)).toBeVisible();
  }

  // Trigger download
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.snoroh$/);
});
```

### Test Gate

```bash
cd /Users/apple/snor-oh-marketplace && npm run e2e:smoke
```

**Pass criterion:** Playwright reports `1 passed`, exit 0.

- [ ] **Step 14.6 — Commit**

```bash
git add playwright.config.ts e2e package.json package-lock.json
git commit -m "test(e2e): add Smart Import smoke spec"
```

---

## Task 15: Final verification & PR

- [ ] **Step 15.1 — Full build + full test pass**

```bash
cd /Users/apple/snor-oh-marketplace
npm test
npm run build
```

**Pass criterion:** both exit 0.

- [ ] **Step 15.2 — Push and open PR**

```bash
git push -u origin feat/smart-import
gh pr create --title "feat: Smart Import on the marketplace web" --body "$(cat <<'EOF'
## Summary
- Port the desktop Smart Import sprite-sheet authoring flow to the marketplace
- New `/create` page; pure-TS pipeline shared between browser and server
- Two terminal actions: Download .snoroh / Publish to gallery (existing /api/upload)
- Adds Vitest + happy-dom + RTL test infra and one Playwright smoke spec

## Test plan
- [x] `npm test` — pipeline + hook + components green
- [x] `npm run build` — Next.js production build clean
- [x] `npm run e2e:smoke` — Playwright create-and-download flow passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Pass criterion:** PR URL printed; CI green if applicable.

---

## Risks & rollback

- **Canvas pixel output drifts from CG output.** Mitigation: pixel-equality test on a small synthetic sheet through both adapters (Task 7 covers round-trip, Task 14 covers in-browser end-to-end).
- **Drag-and-drop bug on Firefox/Safari.** Mitigation: manual cross-browser smoke during Task 12 implementation. If blocking, swap to `@dnd-kit/core` (a 1-day refactor of `FrameGrid` / `StatusRow` only).
- **Adoption of sharp on the client?** Never — `sharp` only loads server-side via `lib/spriteProcessor/serverImage.ts`. Hook + components import only `canvas.ts`. Verify with `next build` (Task 13 gate).
- **Rollback:** revert the merge commit on `main`. No data migrations, no schema changes — the marketplace's existing v1/v2 validator already accepts the format.

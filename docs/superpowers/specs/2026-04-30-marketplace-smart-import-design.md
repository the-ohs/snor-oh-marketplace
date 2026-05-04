# Marketplace Smart Import — Design

- **Status:** Draft (awaiting implementation plan)
- **Author / contact:** quang.ho@silentium.io
- **Target repo:** `the-ohs/snor-oh-marketplace`
- **Target branch:** `feat/smart-import`
- **Reference repo (read-only):** `the-ohs/snor-oh` desktop app — `Sources/Sprites/SmartImport.swift`, `Sources/Views/SmartImportView.swift`, `Tests/SmartImport*Tests.swift`
- **Origin of algorithm:** `tmp/ani-mime/src/utils/spriteSheetProcessor.ts` (in the desktop repo) — both Swift and this design port from this TypeScript reference.
- **Date:** 2026-04-30

## Problem

The desktop snor-oh app ships **Smart Import**: a creator workflow that turns an arbitrary sprite sheet PNG into a fully-assigned custom pet (background detection → row/column detection → frame extraction → per-status assignment → animation preview → save). The marketplace site at `the-ohs/snor-oh-marketplace` currently lets users *upload* and *browse* finished `.snoroh` / `.animime` packages but offers no creation path on the web. Creators without a Mac, or creators who only want to share a single character without installing the desktop app, are excluded.

This spec describes how to **replicate the Smart Import feature and algorithm on the marketplace website**, with full feature parity to the desktop sheet, ending in two terminal actions: **Download** the resulting `.snoroh` locally, or **Publish** it directly to the gallery via the existing `/api/upload` route.

## Non-Goals

- Authentication / accounts. Existing marketplace behavior is anonymous + IP-rate-limited; we keep that.
- Real-time collaboration on a sheet. Single-user editor only.
- New file format. We emit `.snoroh` v1 / v2 exactly per `lib/schema.ts` — no schema changes required.
- Server-side processing of the sheet during editing. The server only sees the final v1/v2 package at publish time.
- A Web Worker for the pipeline. Possible v2 follow-up; not v1.

## Approach Overview

**Hybrid client/server** — pipeline runs in the browser for interactive editing; the server's existing validator gives a final pass at publish time. The pipeline (pure pixel math, no DOM dependency) lives in a single TypeScript module that runs unchanged in both environments via two thin runtime adapters (Canvas in the browser, `sharp.raw()` on the server).

The page is a new dedicated route `/create`. The desktop drag-drop, hover-delete, range-input, and per-status animation preview affordances are all reproduced. Two terminal buttons: **Download .snoroh** (purely client-side) and **Publish** (POSTs through `/api/upload`).

## Architecture

### Module layout (new files)

```
lib/spriteProcessor/
  types.ts             # BgColor, DetectedRow, SpriteRegion, Frame, BBox, GridLayout, ProcessedStrip
  parseFrameInput.ts   # "1-5,7,9-3" → number[] (pure)
  detect.ts            # detectBgColor, removeBackground, detectRows, detectColumns,
                       # extractFrames, getTightBBox, processSheet
  strip.ts             # createStripFromFrames → packed grid PNG
  index.ts             # public surface
  canvas.ts            # browser-only adapter (File → ImageData, ImageData → PNG via canvas.toBlob)
  serverImage.ts       # node-only adapter (Buffer → ImageData via sharp.raw, ImageData → PNG via sharp.png())
                       # ships for parity tests + future revalidation; no v1 route consumes it

lib/useSmartImport.ts  # headless React hook — state machine for the editor

app/create/
  page.tsx             # "use client" shell wiring the hook into views
  CreateHeader.tsx
  TopSection.tsx       # name field + source picker (drop zone)
  FrameGrid.tsx        # 8-col grid; drag-reorder; hover-delete
  StatusAssignment.tsx # 7 status rows with range input + thumbnail strip + preview popover
  StatusRow.tsx
  AnimationPreview.tsx # canvas ticker for one status (10 fps)
  Footer.tsx           # Download / Publish buttons

app/page.tsx           # add a CTA link to /create
```

### Data flow

```
File (PNG/JPEG/GIF)
  → canvas.loadImageData()                       [browser]
  → spriteProcessor.processSheet()               [pure]
  → { processed: ImageData, frames, rows, bgColor }
  → useSmartImport state                         [hook]
  → user edits (delete frame / reorder / type ranges)
  → buildPackage()
       ├─ if !framesEdited: { version: 2, name, smartImportMeta: { sourceSheet, frameInputs } }
       └─ if  framesEdited: { version: 1, name, sprites: { status: { frames, data } } }
  → (Download) trigger anchor download           [browser-only]
  → (Publish)  POST /api/upload (existing route, unchanged)
```

### Why these boundaries

- The pipeline is pure pixel math. Keeping it free of DOM and Node-isms means the same code is reachable from `next dev`, server validators, and Vitest. It mirrors the desktop boundary (Swift `SmartImport` enum is also DOM-free Core Graphics math).
- The hook is a single-page state machine. Components do not own state; they fire intents back to the hook. Tests can drive the hook with `renderHook` and assert on derived state without rendering anything.
- The view tree is small and presentational. Each component does one job. `app/create/page.tsx` is the only "client" file that knows the hook exists.

## The Pipeline (pure module)

### Constants (mirrored verbatim from desktop / ani-mime)

```ts
export const FRAME_SIZE = 128;
export const MAX_SHEET_WIDTH = 4096;
export const BG_TOLERANCE = 30;
export const BG_CLUSTER_TOLERANCE = 30;
export const ALPHA_THRESHOLD = 10;
export const MIN_GAP = 5;
export const MIN_REGION_WIDTH = 10;
export const SMALL_COMPONENT_HEIGHT_RATIO = 0.25;
```

### Public surface

```ts
parseFrameInput(input: string, maxFrames: number): number[]
processSheet(img: ImageData): {
  processed: ImageData;
  rows: DetectedRow[];
  frames: Frame[];
  bgColor: BgColor;
}
createStripFromFrames(processed: ImageData, frames: Frame[], indices: number[]): {
  pngBytes: Uint8Array;
  frames: number;
}
gridLayout(frameCount: number): { cols: number; rows: number; width: number; height: number }
```

### Runtime adapters

- **`canvas.ts`** (browser): `loadImageData(file: File): Promise<ImageData>` (via `createImageBitmap` + `OffscreenCanvas`/`<canvas>`); `encodePng(img: ImageData): Promise<Uint8Array>` (via `canvas.toBlob('image/png')` → `arrayBuffer`).
- **`serverImage.ts`** (node): `loadImageData(buf: Buffer): Promise<ImageData>` (via `sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })`); `encodePng(img: ImageData): Promise<Uint8Array>` (via `sharp(img.data, { raw }).png().toBuffer()` — Node `Buffer` is structurally a `Uint8Array`, so this returns the shared contract without coercion).

The pipeline accepts the structural shape `{ data: Uint8ClampedArray, width: number, height: number }`. Both adapters yield this shape. The encoded-PNG return type is `Uint8Array` in both runtimes — `strip.ts` and `buildPackage` consume a single uniform contract and never branch on runtime.

`sharp` is already a runtime dependency of the marketplace (used by `lib/validate.ts`); `serverImage.ts` adds no new packages.

### Differences from the Swift port to flag

- Swift uses CG bitmap contexts (premultiplied alpha) and `interpolationQuality = .high` for the per-frame scale. Browser Canvas uses straight alpha plus `imageSmoothingEnabled = true; imageSmoothingQuality = "high"`. Output should match within rounding error; a fixture pixel-equality test guards against drift.
- Swift handles JPEG/GIF via `CGImageSource`; browsers handle them natively via `createImageBitmap`. Same end behavior.
- `removeSmallComponents` is exported but unused (matches both desktop and ani-mime — the UI flow never calls it).

### Testing

Vitest fixture-based tests under `lib/spriteProcessor/__tests__/`:

- `parseFrameInput.test.ts` — direct port of `Tests/SmartImportFrameInputTests.swift` (reverse ranges, duplicates, out-of-bounds, mixed lists).
- `detect.test.ts` — feeds `tests/fixtures/sheet-12.png` (12 sprites, 2×6 on solid bg), asserts `frames.length === 12`, `rows.length === 2`, `bgColor` matches the sampled corner, exact bbox of frame 0.
- `strip.test.ts` — packs first 5 frames, asserts grid layout dims (`cols * 128 = 640`, `rows * 128 = 128`), confirms the encoded PNG round-trips through `sharp` without error.

## The Hook (`useSmartImport`)

### State

```ts
interface SmartImportState {
  // Input
  name: string;
  sourceImage: ImageBitmap | null;
  sourceFile: File | null;

  // Pipeline output
  processed: ImageData | null;
  detectedFrames: Frame[];
  framePreviews: HTMLCanvasElement[];   // 48×48 thumbnails, pre-rendered once
  bgColor: BgColor | null;

  // User edits
  frameInputs: Record<StatusKey, string>;
  framesEdited: boolean;

  // UI flags
  processing: boolean;
  saving: boolean;
  error: string | null;
}
```

### Actions

```ts
pickSheet(file: File): Promise<void>
setName(name: string): void
setFrameInput(status: StatusKey, value: string): void
deleteFrame(index: number): void
moveFrame(from: number, to: number): void
deleteFromStatus(status: StatusKey, pos: number): void
moveInStatus(status: StatusKey, from: number, to: number): void
buildPackage(): SnorohFile
canSave: boolean
```

### Invariants (mirrored from desktop)

- **Auto-distribute on first import** — split `total` frames evenly across the 7 sprite-bearing statuses. Each status gets `floor(total / 7)` (last one gets the remainder) and the resulting indices are reserialized as compact ranges (e.g. `"1-5"`).
- **`framesEdited` is sticky** — once true, stays true until a fresh `pickSheet`. This is the trigger for v1 vs v2 output format.
- **Range remapping on delete/move** — when frame at index `k` is removed, every frame input string is reparsed with `parseFrameInput` → indices remapped via an `oldToNew: (number | null)[]` table → reserialized via the runs-of-consecutive-ascending compactor (e.g. `[2,3,4,0,1]` → `"3-5,1-2"`).
- **`canSave`** = `name && processed && all 7 statuses have ≥ 1 parsed frame && !saving`.

### Why a hook, not a Provider

The editor lives entirely on one page. No two unrelated components need to read this state. A hook keeps the dependency graph local; tests call it via `renderHook` and assert directly.

### Testing

- `useSmartImport-pickSheet.test.ts` — fixture sheet → state has expected `detectedFrames.length` + auto-distributed `frameInputs`.
- `useSmartImport-edits.test.ts` — delete / move sequences → assert `framesEdited` flips, frameInputs remap correctly, edge cases (delete first / delete last / delete only-frame in a status).
- `useSmartImport-buildPackage.test.ts` — pre-edit → v2 output with embedded base64 sourceSheet; post-edit → v1 output with all 7 strips; `canSave` returns false when any status is empty.

## Views (`app/create/`)

### Component tree

```
page.tsx                                  ("use client")
├── CreateHeader      (title, "N frames" pill)
├── ErrorBanner
├── TopSection
│     NameField (max 20 chars — intentional client-side cap; server allows up to 80, so we stay strictly inside it)
│     SourcePicker (drop zone, accepts image/png, image/jpeg, image/gif)
├── FrameGrid (8-col grid, 44×44 thumbs, hover-delete, draggable)
├── StatusAssignment
│     × 7 StatusRow (label / range input / "Nf" badge / play button / thumb strip)
└── Footer (Download / Publish, busy indicator, creator handle reveal at publish time)
```

### UI mechanics

- **Drag-and-drop reordering**: HTML5 DnD (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) — no library. Two parallel drag contexts (master grid vs per-status strips); the hook tracks `dragOrigin` so cross-context drops are rejected.
- **Hover-delete**: pure CSS hover + JS-tracked hover index for the absolutely-positioned ✕ button overlay. ✕ click → `deleteFrame` / `deleteFromStatus`.
- **Animation preview popover**: small `<canvas>` ticker driven by `setInterval(100ms)`, mounts on toggle, tears down `interval` in cleanup. Renders pre-extracted thumbnails in sequence.
- **Source picker**: same drop-zone pattern as `app/upload-form.tsx`. Calls `pickSheet(file)`.
- **Footer — Download**: `JSON.stringify(buildPackage())` → `Blob` → `URL.createObjectURL` → trigger anchor click → `revokeObjectURL`. Filename `${name}.snoroh`.
- **Footer — Publish**: same blob, wrapped in `FormData` (`file`, `filename`, optional `creator`), POST to `/api/upload`. On 200, redirect to `/`. On error, surface `error.message` from the standard envelope.
- **Creator field**: hidden by default. The Publish button reveals an inline confirmation strip with an optional `@handle` input + final "Publish" button. Keeps the editor focused on frames.

### Styling

Reuse existing CSS variables from `app/globals.css` (`--card`, `--card-border`, `--accent`, `--bg-subtle`). No new tokens. Outer container matches the existing upload form (`rounded-2xl border bg-card shadow-sm`).

### Rendering

`app/create/page.tsx` is a `"use client"` shell with no server-fetched data, so it does **not** need `force-dynamic` (the existing gallery `app/page.tsx` uses `force-dynamic` because it fetches the package list at request time — a different concern). The default rendering behavior is correct here.

### Testing

- `FrameGrid.test.tsx` — N stub previews → assert N tiles → fire drag-and-drop → `onMove` called with the right indices.
- `StatusRow.test.tsx` — type `"1-5"` → assert `setFrameInput` called → assert "5f" badge.
- `Footer.test.tsx` — Download click triggers anchor with right filename; Publish click sends FormData with `file`, `filename`, `creator`.
- `page.test.tsx` — light integration: stub the hook, render the page, assert all sections present.

## Error Handling

| Failure | Where | UI |
|---|---|---|
| File not PNG/JPEG/GIF | `pickSheet` | "File must be PNG, JPEG, or GIF" |
| Decode failure | `pickSheet` | "Could not decode image" |
| Sheet < 3×3 px | `processSheet` returns null | "Sheet too small for frame detection" |
| 0 frames detected | `processSheet` | "No sprites detected — try a sheet with a contrasting background" |
| Sheet > 8192px on either side | `pickSheet` | "Sheet too large (max 8192×8192)" |
| Range references frame > N | `parseFrameInput` silently drops | Red "0f" badge, save disabled |
| All 7 statuses must have ≥ 1 frame | `canSave` derived | Save disabled, tooltip "Assign frames to all 7 statuses" |
| Built package > 3 MiB (server limit) | `buildPackage` short-circuits **before** stringifying: a v2 raw source sheet > 2.0 MiB forces the package builder to emit v1 instead (per-status strips are smaller after BBox + scale). If the v1 form *also* overflows, surface "Package too large — try fewer frames or smaller sheet". | Inline error |
| Network failure on Publish | `/api/upload` POST | Show server-returned `error.message` |
| Rate limit hit | 429 from server | "Daily upload limit reached. Try again tomorrow." |

### Edge cases mirrored from desktop

- Reverse range: `"3-1"` → `[2, 1, 0]` (ping-pong friendly).
- Duplicate frames: `"1,1,1"` → `[0, 0, 0]` (allowed).
- Single-frame status: 1-frame strips render as a single 128×128 cell with no animation timer.
- Delete first/last/only frame: `applyRemap` handles indices going out of range; range strings re-serialize cleanly.
- New sheet picked mid-edit: full state reset, including `framesEdited`.

## Performance

- 4096×4096 RGBA = 64 MB pixel buffer. `processSheet` is O(W×H) — about 150 ms on M1, acceptable on the main thread; `processing: true` shows a spinner during the work. Web Worker is a v2 follow-up if real-world feedback shows jank on weaker hardware.
- Frame thumbnails are pre-rendered to `<canvas>` once, reused across the grid, status thumbnail strips, and animation previews.
- Animation preview ticks at 10 fps (100 ms); stops cleanly on popover close.

## Security

- Image decode happens in the browser. The server only ever sees the final v1/v2 package at publish time, going through the existing `/api/upload` validator (which already enforces ≤ 3 MiB, PNG magic bytes, `sharp` decode, dimension caps, IP rate limit, `IP_HASH_SALT`).
- No new server endpoints. No new server-side dependencies.
- `.snoroh` is JSON; published packages route through the existing validator unchanged.

## Test Strategy

- **Vitest** + **happy-dom** + **@testing-library/react** for the pipeline, the hook, and the components. Fixture PNGs live under `tests/fixtures/`.
- **Playwright** for one e2e smoke spec, added near the end of the implementation. Covers: load `/create` → drop fixture sheet → assert N frames detected → fill ranges → click **Download** → assert downloaded blob parses as valid v2.
- Each plan step ends in an explicit **Test Gate** with a literal command and a pass criterion. Step is not "done" until the gate is green.

## Open Questions

None at design time. All architectural decisions are settled (hybrid client/server, dedicated `/create` page, full feature parity, HTML5 DnD, creator handle revealed at publish, v1-or-v2 emission mirroring desktop's `framesEdited` rule).

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Canvas pixel output drifts from CG output (different interpolation, premultiplied vs straight alpha) | Medium | Fixture pixel-equality test on the same sheet processed by both. Tolerance ≤ 2 LSB per channel. |
| Adding Vitest to a repo with no test runner causes config friction | Low | Vitest works out-of-box with Next.js 15 + TypeScript; no Vite config needed. |
| Drag-and-drop bugs on Firefox/Safari with HTML5 DnD | Medium | Manual cross-browser smoke during step "wire create page"; if blocking, swap in `@dnd-kit/core` (1-day swap). |
| 4 MB+ source sheets push the v2 package over the 3 MiB upload limit | Medium | Detect at `buildPackage`; surface clear error with size; offer to fall back to v1 (per-status strips, smaller). |
| Vercel cold start of `/api/upload` is slow → publish UX feels sluggish | Low | Existing route, already on `runtime = "nodejs"`. Status quo unchanged; out of scope for this spec. |

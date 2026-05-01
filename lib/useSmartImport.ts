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

// Encode bytes to base64 in chunks. `String.fromCharCode(...bigArray)` blows
// the JS argument-list limit (~64K args) for any non-trivial PNG, so we feed
// 32 KiB at a time and concatenate. btoa is supported in all browsers.
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

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
      const sourceSheet = bytesToBase64(new Uint8Array(buf));
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
      const b64 = bytesToBase64(strip.pngBytes);
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

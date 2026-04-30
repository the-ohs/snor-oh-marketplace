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
        <span
          className={[
            "w-8 font-mono text-xs",
            indices.length === 0 ? "text-red-500" : "opacity-60",
          ].join(" ")}
        >
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

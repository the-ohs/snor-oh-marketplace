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
  const empty = indices.length === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <span className="w-24 text-right font-mono text-[11px] uppercase tracking-widest opacity-60">
          {status}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onSetInput(status, e.target.value)}
          placeholder="e.g. 1-5"
          className="w-32 rounded-md border border-[color:var(--border)] bg-transparent px-2.5 py-1.5 font-mono text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
        />
        <span
          className={[
            "w-8 font-mono text-[11px] tracking-widest",
            empty ? "text-[color:var(--accent)]" : "opacity-50",
          ].join(" ")}
        >
          {indices.length}f
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={empty}
          aria-label="preview animation"
          className="rounded-md border border-[color:var(--border)] px-2.5 py-1 text-xs transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          ▶
        </button>
      </div>
      {open && previewFrames.length > 0 && (
        <div className="ml-[6.75rem] inline-flex w-fit rounded-md border border-[color:var(--border)] bg-[color:var(--bg-subtle)] p-3">
          <AnimationPreview frames={previewFrames} />
        </div>
      )}
    </div>
  );
}

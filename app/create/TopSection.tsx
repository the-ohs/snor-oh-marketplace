"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  name: string;
  onName: (v: string) => void;
  creator: string;
  onCreator: (v: string) => void;
  onPickFile: (file: File) => void;
  busy: boolean;
  currentFile: File | null;
}

export function TopSection({
  name,
  onName,
  creator,
  onCreator,
  onPickFile,
  busy,
  currentFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    (f: File | null | undefined) => {
      if (!f) return;
      onPickFile(f);
    },
    [onPickFile]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
            Sprite name
          </span>
          <input
            type="text"
            value={name}
            maxLength={20}
            onChange={(e) => onName(e.target.value)}
            placeholder="my-mascot"
            className="rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
            Creator <span className="opacity-60">(optional)</span>
          </span>
          <input
            type="text"
            value={creator}
            maxLength={40}
            onChange={(e) => onCreator(e.target.value)}
            placeholder="@yourhandle"
            className="rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
          />
        </label>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={[
          "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-8 text-center transition",
          dragging
            ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10"
            : "border-[color:var(--border)] bg-[color:var(--bg-subtle)] hover:bg-[color:var(--bg-subtle)]/70",
          busy ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,.png,.jpg,.jpeg,.gif"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => accept(e.target.files?.[0])}
          disabled={busy}
        />
        <UploadIcon />
        {busy ? (
          <div className="font-mono text-[11px] opacity-60">Processing…</div>
        ) : currentFile ? (
          <div className="space-y-1">
            <div className="font-mono text-sm">{currentFile.name}</div>
            <div className="font-mono text-[11px] opacity-50">
              click or drop a new sheet to swap
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-sm font-medium">Drop a sprite sheet here</div>
            <div className="font-mono text-[11px] opacity-50">
              or click · png / jpg / gif · max 3 MiB
            </div>
          </div>
        )}
      </label>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      className="opacity-60"
      aria-hidden
    >
      <path
        d="M16 22V8M16 8L10 14M16 8L22 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="5" y="24" width="22" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

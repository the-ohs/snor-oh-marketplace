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

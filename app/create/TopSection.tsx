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
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
          Name
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
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
          Source
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-left text-sm transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Processing…" : name ? "Change sprite sheet" : "Pick sprite sheet"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,.png,.jpg,.jpeg,.gif"
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

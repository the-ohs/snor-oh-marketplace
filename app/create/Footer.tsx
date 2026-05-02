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

  const primaryClass =
    "inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40";
  const secondaryClass =
    "inline-flex items-center justify-center rounded-md border border-[color:var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--border)] pt-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          disabled={!canSave || busy}
          onClick={onDownload}
          className={secondaryClass}
        >
          Download .snoroh
        </button>
        <button
          type="button"
          disabled={!canSave || busy}
          onClick={() => setRevealed((v) => !v)}
          className={primaryClass}
        >
          Publish
        </button>
      </div>
      {revealed && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            type="text"
            value={creator}
            maxLength={40}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="@yourhandle (optional)"
            className="w-56 rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onPublish(creator)}
            className={primaryClass}
          >
            Confirm publish
          </button>
        </div>
      )}
    </div>
  );
}

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

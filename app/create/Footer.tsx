"use client";

interface Props {
  canSave: boolean;
  busy: boolean;
  onDownload: () => void;
  onPublish: () => void;
}

export function Footer({ canSave, busy, onDownload, onPublish }: Props) {
  const primaryClass =
    "inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-fg)] shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40";
  const secondaryClass =
    "inline-flex items-center justify-center rounded-md border border-[color:var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[color:var(--border)] pt-5">
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
        onClick={onPublish}
        className={primaryClass}
      >
        {busy ? "Publishing…" : "Publish"}
      </button>
    </div>
  );
}

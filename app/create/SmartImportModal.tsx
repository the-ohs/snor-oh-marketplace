"use client";

import { useEffect, useRef } from "react";
import { SmartImportPanel } from "./SmartImportPanel";

interface Props {
  open: boolean;
  onClose: () => void;
  onPublishSuccess: () => void;
}

export function SmartImportModal({ open, onClose, onPublishSuccess }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[1400px] overflow-hidden rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] p-0 text-[color:var(--fg)] shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="relative h-full overflow-y-auto">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="sticky top-4 z-10 ml-auto mr-4 flex size-8 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--card)] font-mono text-sm opacity-70 shadow-sm transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] hover:opacity-100"
          >
            ×
          </button>
          <div className="-mt-12">
            <SmartImportPanel onPublishSuccess={onPublishSuccess} />
          </div>
        </div>
      )}
    </dialog>
  );
}

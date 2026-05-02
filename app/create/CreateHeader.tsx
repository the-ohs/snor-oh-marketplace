interface Props { detectedCount: number }

export function CreateHeader({ detectedCount }: Props) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-[color:var(--border)] pb-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
          Step · sprite sheet
        </span>
        <h2 className="text-xl font-semibold tracking-tight">Smart Import</h2>
      </div>
      {detectedCount > 0 && (
        <span className="rounded-md border border-[color:var(--accent)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--accent)]">
          {detectedCount} frames
        </span>
      )}
    </header>
  );
}

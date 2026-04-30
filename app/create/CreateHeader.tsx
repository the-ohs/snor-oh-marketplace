interface Props { detectedCount: number }

export function CreateHeader({ detectedCount }: Props) {
  return (
    <header className="flex items-center justify-between border-b pb-3">
      <h1 className="text-lg font-semibold">Smart Import</h1>
      {detectedCount > 0 && (
        <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xs">{detectedCount} frames</span>
      )}
    </header>
  );
}

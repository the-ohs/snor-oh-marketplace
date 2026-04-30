/**
 * Parse a 1-based range string into 0-based indices.
 * - Preserves user-written order ("3,1,2" → [2, 0, 1]).
 * - Preserves duplicates ("1,1,1" → [0, 0, 0]).
 * - Reverse ranges allowed ("3-1" → [2, 1, 0]).
 * - Drops out-of-range and unparseable values silently.
 */
export function parseFrameInput(input: string, maxFrames: number): number[] {
  const result: number[] = [];
  if (!input) return result;

  const parts = input.split(",");
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const range = part.split("-").map((s) => s.trim());
    if (range.length === 2) {
      const start = parseInt(range[0], 10);
      const end = parseInt(range[1], 10);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      const step = start <= end ? 1 : -1;
      for (let i = start; step === 1 ? i <= end : i >= end; i += step) {
        if (i >= 1 && i <= maxFrames) result.push(i - 1);
      }
    } else {
      const n = parseInt(part, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= maxFrames) result.push(n - 1);
    }
  }
  return result;
}

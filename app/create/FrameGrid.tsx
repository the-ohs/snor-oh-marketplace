"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  previews: HTMLCanvasElement[];
  onDelete: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function FrameGrid({ previews, onDelete, onMove }: Props) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
        Detected frames
      </span>
      <ul
        role="list"
        className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8"
        onDragOver={(e) => e.preventDefault()}
      >
        {previews.map((canvas, i) => (
          <Tile
            key={i}
            canvas={canvas}
            index={i}
            dragged={draggedIndex === i}
            onDragStart={() => setDraggedIndex(i)}
            onDrop={() => {
              if (draggedIndex !== null && draggedIndex !== i) onMove(draggedIndex, i);
              setDraggedIndex(null);
            }}
            onDelete={() => onDelete(i)}
          />
        ))}
      </ul>
    </div>
  );
}

function Tile({
  canvas,
  index,
  dragged,
  onDragStart,
  onDrop,
  onDelete,
}: {
  canvas: HTMLCanvasElement;
  index: number;
  dragged: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !canvas) return;
    el.replaceChildren(canvas);
  }, [canvas]);

  return (
    <li
      role="listitem"
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={[
        "group relative flex flex-col items-center gap-1",
        dragged ? "opacity-40" : "",
      ].join(" ")}
    >
      <div
        ref={ref}
        className="size-12 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-subtle)] transition group-hover:border-[color:var(--accent)]/40"
      />
      <button
        type="button"
        aria-label="delete frame"
        onClick={onDelete}
        className="absolute -right-1.5 -top-1.5 hidden size-5 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-[10px] text-[color:var(--fg-muted)] shadow-sm transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] group-hover:flex"
      >
        ×
      </button>
      <span className="font-mono text-[10px] tracking-widest opacity-50">{index + 1}</span>
    </li>
  );
}

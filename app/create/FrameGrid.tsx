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
    <ul
      role="list"
      className="grid grid-cols-8 gap-1"
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
      className={["relative flex flex-col items-center gap-0.5", dragged ? "opacity-40" : ""].join(" ")}
    >
      <div
        ref={ref}
        className="size-11 rounded-sm bg-[color:var(--bg-subtle)]"
      />
      <button
        type="button"
        aria-label="delete frame"
        onClick={onDelete}
        className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] hover:flex"
      >
        ×
      </button>
      <span className="font-mono text-[10px] opacity-50">{index + 1}</span>
    </li>
  );
}

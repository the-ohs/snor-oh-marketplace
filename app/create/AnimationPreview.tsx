"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  frames: HTMLCanvasElement[];
  fps?: number;
}

export function AnimationPreview({ frames, fps = 10 }: Props) {
  const [i, setI] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (frames.length <= 1) return;
    const t = setInterval(() => setI((k) => (k + 1) % frames.length), 1000 / fps);
    return () => clearInterval(t);
  }, [frames.length, fps]);

  useEffect(() => {
    const dest = canvasRef.current;
    const src = frames[i];
    if (!dest || !src) return;
    if (dest.width !== src.width) dest.width = src.width;
    if (dest.height !== src.height) dest.height = src.height;
    const ctx = dest.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, dest.width, dest.height);
    ctx.drawImage(src, 0, 0);
  }, [frames, i]);

  return (
    <canvas
      ref={canvasRef}
      className="size-24 rounded-sm bg-[color:var(--bg-subtle)] pixel"
    />
  );
}

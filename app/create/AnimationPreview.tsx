"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  frames: HTMLCanvasElement[];
  fps?: number;
}

export function AnimationPreview({ frames, fps = 10 }: Props) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (frames.length <= 1) return;
    const t = setInterval(() => setI((k) => (k + 1) % frames.length), 1000 / fps);
    return () => clearInterval(t);
  }, [frames.length, fps]);
  useEffect(() => {
    const el = ref.current;
    const c = frames[i];
    if (!el || !c) return;
    el.replaceChildren(c);
  }, [frames, i]);
  return <div ref={ref} className="size-24 rounded-sm bg-[color:var(--bg-subtle)]" />;
}

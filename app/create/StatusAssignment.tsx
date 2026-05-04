"use client";

import { STATUSES, type StatusKey } from "@/lib/schema";
import { StatusRow } from "./StatusRow";

interface Props {
  inputs: Record<StatusKey, string>;
  previews: HTMLCanvasElement[];
  maxFrames: number;
  onSetInput: (status: StatusKey, value: string) => void;
  onDeleteFromStatus: (status: StatusKey, pos: number) => void;
  onMoveInStatus: (status: StatusKey, from: number, to: number) => void;
}

export function StatusAssignment(p: Props) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
        Assign frames to status
      </span>
      <div className="flex flex-col gap-2">
        {STATUSES.map((s) => (
          <StatusRow
            key={s}
            status={s}
            value={p.inputs[s]}
            previews={p.previews}
            maxFrames={p.maxFrames}
            onSetInput={p.onSetInput}
            onDeleteFromStatus={p.onDeleteFromStatus}
            onMoveInStatus={p.onMoveInStatus}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest opacity-40">
        Ranges: &quot;1-5&quot;, &quot;1,3,5&quot;, or &quot;1-3,5,7-9&quot; (1-based)
      </p>
    </div>
  );
}

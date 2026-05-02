"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSmartImport } from "@/lib/useSmartImport";
import { processSheet } from "@/lib/spriteProcessor/detect";
import { loadImageData, frameThumbnail } from "@/lib/spriteProcessor/canvas";
import { CreateHeader } from "./CreateHeader";
import { TopSection } from "./TopSection";
import { FrameGrid } from "./FrameGrid";
import { StatusAssignment } from "./StatusAssignment";
import { Footer } from "./Footer";

export default function CreatePage() {
  const hook = useSmartImport();
  const router = useRouter();

  const onPickFile = useCallback(async (file: File) => {
    hook.setProcessing(true);
    hook.setError(null);
    try {
      const img = await loadImageData(file);
      const result = processSheet(img);
      const previews = result.frames.map((f) => frameThumbnail(result.processed, f, 48));
      const defaultName = file.name.replace(/\.[^.]+$/, "").slice(0, 20);
      hook.ingestProcessed({
        sourceFile: file,
        sourceImage: null,
        processed: result.processed,
        frames: result.frames,
        framePreviews: previews,
        bgColor: result.bgColor,
        defaultName,
      });
    } catch (e) {
      hook.setError(e instanceof Error ? e.message : "Could not load image");
      hook.setProcessing(false);
    }
  }, [hook]);

  const onDownload = useCallback(async () => {
    const pkg = await hook.buildPackage();
    const blob = new Blob([JSON.stringify(pkg)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${hook.state.name}.snoroh`;
    a.click();
    URL.revokeObjectURL(url);
  }, [hook]);

  const onPublish = useCallback(async (creator: string) => {
    if (hook.state.saving) return; // guard against double-submit
    hook.setSaving(true);
    try {
      const pkg = await hook.buildPackage();
      const blob = new Blob([JSON.stringify(pkg)], { type: "application/json" });
      const fd = new FormData();
      fd.set("file", blob, `${hook.state.name}.snoroh`);
      fd.set("filename", `${hook.state.name}.snoroh`);
      if (creator) fd.set("creator", creator);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        hook.setError(data?.error?.message ?? "Publish failed");
        return;
      }
      router.push("/");
    } finally {
      hook.setSaving(false);
    }
  }, [hook, router]);

  const s = hook.state;
  return (
    <main className="min-h-screen">
      <div className="dot-grid">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-24">
          <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest opacity-60">
                  snor-oh · marketplace
                </div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Smart Import,
                  <br className="hidden sm:block" />
                  <span className="text-[color:var(--accent)]"> build a package</span>.
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest opacity-60">
              <a href="/" className="hover:text-[color:var(--accent)]">
                ← back to gallery
              </a>
            </div>
          </header>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed opacity-70">
            Drop a sprite sheet and we&apos;ll detect frames, then assign them to mascot statuses.
            Export a <code className="font-mono text-[color:var(--accent)]">.snoroh</code> bundle or
            publish it straight to the gallery.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="overflow-hidden rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card)] shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <CreateHeader detectedCount={s.detectedFrames.length} />
            {s.error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                {s.error}
              </p>
            )}
            <TopSection
              name={s.name}
              onName={hook.setName}
              onPickFile={onPickFile}
              busy={s.processing}
            />
            {s.framePreviews.length > 0 && (
              <FrameGrid previews={s.framePreviews} onDelete={hook.deleteFrame} onMove={hook.moveFrame} />
            )}
            {s.detectedFrames.length > 0 && (
              <StatusAssignment
                inputs={s.frameInputs}
                previews={s.framePreviews}
                maxFrames={s.detectedFrames.length}
                onSetInput={hook.setFrameInput}
                onDeleteFromStatus={hook.deleteFromStatus}
                onMoveInStatus={hook.moveInStatus}
              />
            )}
            <Footer
              canSave={hook.canSave}
              busy={s.saving || s.processing}
              onDownload={onDownload}
              onPublish={onPublish}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Logo() {
  return (
    <div
      aria-hidden
      className="grid h-14 w-14 animate-bob shrink-0 grid-cols-8 gap-0 rounded-lg bg-[color:var(--bg-subtle)] p-1.5 shadow-sm ring-1 ring-[color:var(--border)]"
    >
      {PIXELS.map((row, y) =>
        row.split("").map((ch, x) => (
          <span
            key={`${y}-${x}`}
            className="h-1 w-1"
            style={{
              backgroundColor:
                ch === "#" ? "var(--fg)" :
                ch === "o" ? "var(--accent)" :
                "transparent",
            }}
          />
        ))
      )}
    </div>
  );
}

const PIXELS = [
  "..####..",
  ".######.",
  "########",
  "#.####.#",
  "########",
  "#o####o#",
  ".######.",
  "..#..#..",
];

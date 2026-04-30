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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <CreateHeader detectedCount={s.detectedFrames.length} />
      {s.error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
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
    </main>
  );
}

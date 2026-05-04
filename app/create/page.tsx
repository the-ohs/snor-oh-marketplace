"use client";

import { useRouter } from "next/navigation";
import { SmartImportPanel } from "./SmartImportPanel";

export default function CreatePage() {
  const router = useRouter();
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
          <SmartImportPanel onPublishSuccess={() => router.push("/")} />
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

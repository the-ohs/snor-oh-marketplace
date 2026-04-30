// .mts (not .ts) — package.json has no "type":"module", so Node treats plain
// .ts as CJS. @vitejs/plugin-react is ESM-only; the .mts extension forces ESM
// without changing the project-wide module format. Do not rename to .ts.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: [
      "lib/**/*.test.{ts,tsx}",
      "app/**/__tests__/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", ".next", "e2e"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});

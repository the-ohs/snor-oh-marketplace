import { test, expect } from "@playwright/test";
import path from "path";

test("user can build and download a .snoroh from a sprite sheet", async ({ page }) => {
  await page.goto("/create");

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /pick sprite sheet/i }).click(),
  ]);

  await fileChooser.setFiles(path.join(__dirname, "fixtures/sheet-3.png"));

  // Wait for the frame badge to show 3 frames
  await expect(page.getByText("3 frames")).toBeVisible({ timeout: 5000 });

  // Auto-distribution should populate all 7 status labels
  for (const s of [
    "initializing",
    "searching",
    "idle",
    "busy",
    "service",
    "disconnected",
    "visiting",
  ]) {
    await expect(page.getByText(s)).toBeVisible();
  }

  // Trigger download
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.snoroh$/);
});

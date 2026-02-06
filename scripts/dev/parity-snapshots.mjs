#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { chromium, devices } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.PARITY_SCREENSHOT_DIR ?? "docs/plans/artifacts/2026-02-05-parity";
const prepareDemo = process.env.PARITY_PREPARE_DEMO !== "false";
const demoAgents = process.env.PARITY_DEMO_AGENTS ?? "12";

const OUT = path.resolve(process.cwd(), outputDir);
fs.mkdirSync(OUT, { recursive: true });

async function waitForWorld(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
}

async function captureDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await waitForWorld(page);
  await page.screenshot({ path: path.join(OUT, "desktop-overview.png"), fullPage: true });

  const firstRow = page.locator('button[data-leaderboard-row="player"]').first();
  if (await firstRow.count()) {
    await firstRow.click();
    const modal = page.getByRole("dialog");
    await modal.waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "desktop-agent-modal.png"), fullPage: true });
    await page.keyboard.press("Escape");
  }

  await context.close();
}

async function captureMobile(browser) {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  await waitForWorld(page);
  await page.screenshot({ path: path.join(OUT, "mobile-overview.png"), fullPage: true });

  const leaderboardButton = page.getByRole("button", { name: "Leaderboard" });
  await leaderboardButton.click();
  const drawer = page.locator("#mobile-leaderboard-panel");
  await drawer.waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, "mobile-leaderboard-drawer.png"), fullPage: true });

  const firstRow = page.locator('#mobile-leaderboard-panel button[data-leaderboard-row="player"]').first();
  if (await firstRow.count()) {
    await firstRow.click();
    const modal = page.locator('div[role="dialog"][aria-labelledby]').first();
    await modal.waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "mobile-agent-sheet.png"), fullPage: true });
  } else {
    const close = page.getByRole("button", { name: "Close" }).first();
    if (await close.count()) await close.click();
  }

  await context.close();
}

async function main() {
  if (prepareDemo) {
    const reset = spawnSync("npm", ["run", "dev:demo:reset"], { stdio: "inherit", shell: true });
    if (reset.status !== 0) throw new Error("demo reset failed");

    const seed = spawnSync("npm", ["run", "dev:seed"], { stdio: "inherit", shell: true });
    if (seed.status !== 0) throw new Error("demo seed failed");

    const demo = spawnSync("npm", ["run", "dev:demo", "--", "--party"], {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, DEMO_AGENTS: demoAgents }
    });
    if (demo.status !== 0) throw new Error("demo prepare failed");
  }

  const browser = await chromium.launch({ headless: true });
  try {
    await captureDesktop(browser);
    await captureMobile(browser);
  } finally {
    await browser.close();
  }

  const files = fs.readdirSync(OUT).sort();
  console.log(`Saved ${files.length} parity screenshot(s) to ${OUT}`);
  for (const file of files) console.log(` - ${file}`);
}

main().catch((error) => {
  console.error("Failed to capture parity screenshots.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

#!/usr/bin/env node
import { chromium, devices } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForWorld(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
}

async function expectVisible(locator, message) {
  const count = await locator.count();
  assert(count > 0, message);
  await locator.first().waitFor({ state: "visible", timeout: 8000 });
}

async function expectSelected(locator, selected, message) {
  await expectVisible(locator, message);
  const value = await locator.first().getAttribute("aria-selected");
  assert(value === (selected ? "true" : "false"), message);
}

async function desktopFlow(page) {
  await waitForWorld(page);

  await expectVisible(page.getByRole("tablist", { name: "Leaderboard tabs" }), "[sr] desktop: missing Leaderboard tablist");
  const playersTab = page.getByRole("tab", { name: "Players" });
  const guildsTab = page.getByRole("tab", { name: "Guilds" });

  await expectSelected(playersTab, true, "[sr] desktop: Players tab should be selected");
  await expectSelected(guildsTab, false, "[sr] desktop: Guilds tab should not be selected");

  await expectVisible(page.getByLabel("Search players"), "[sr] desktop: missing search input label");

  await playersTab.first().focus();
  await page.keyboard.press("ArrowRight");
  await expectSelected(guildsTab, true, "[sr] desktop: ArrowRight should switch to Guilds");

  await page.keyboard.press("ArrowLeft");
  await expectSelected(playersTab, true, "[sr] desktop: ArrowLeft should switch to Players");

  const firstRow = page.locator('button[data-leaderboard-row="player"]').first();
  try {
    await firstRow.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    console.log("[sr] desktop: no leaderboard rows found; skipping modal checks");
    return;
  }

  await firstRow.click();
  const dialog = page.getByRole("dialog").first();
  await dialog.waitFor({ state: "visible", timeout: 8000 });

  await expectVisible(dialog.getByRole("tablist", { name: "Agent details tabs" }), "[sr] desktop: missing agent tablist");

  const overviewTab = dialog.getByRole("tab", { name: "Overview" });
  const skillsTab = dialog.getByRole("tab", { name: "Skills" });
  const equipmentTab = dialog.getByRole("tab", { name: "Equipment" });
  const journeyTab = dialog.getByRole("tab", { name: "Journey" });

  await expectSelected(overviewTab, true, "[sr] desktop: Overview should be selected by default");
  await expectSelected(skillsTab, false, "[sr] desktop: Skills should not be selected by default");

  await overviewTab.first().focus();
  await page.keyboard.press("ArrowRight");
  await expectSelected(skillsTab, true, "[sr] desktop: ArrowRight should move to Skills");

  await page.keyboard.press("ArrowRight");
  await expectSelected(equipmentTab, true, "[sr] desktop: ArrowRight should move to Equipment");

  await page.keyboard.press("ArrowRight");
  await expectSelected(journeyTab, true, "[sr] desktop: ArrowRight should move to Journey");

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 8000 });
}

async function mobileFlow(page) {
  await waitForWorld(page);

  const openButton = page.getByRole("button", { name: "Leaderboard" }).first();
  await expectVisible(openButton, "[sr] mobile: missing leaderboard open button");
  await openButton.click();

  const drawer = page.getByRole("dialog", { name: "Leaderboard" }).first();
  await drawer.waitFor({ state: "visible", timeout: 8000 });

  await expectVisible(drawer.getByRole("tablist", { name: "Leaderboard tabs" }), "[sr] mobile: missing Leaderboard tablist");
  const playersTab = drawer.getByRole("tab", { name: "Players" });
  const guildsTab = drawer.getByRole("tab", { name: "Guilds" });
  await expectSelected(playersTab, true, "[sr] mobile: Players tab should be selected");

  await expectVisible(drawer.getByLabel("Search players"), "[sr] mobile: missing search input label");

  await playersTab.first().focus();
  await page.keyboard.press("ArrowRight");
  await expectSelected(guildsTab, true, "[sr] mobile: ArrowRight should switch to Guilds");

  await page.keyboard.press("ArrowLeft");
  await expectSelected(playersTab, true, "[sr] mobile: ArrowLeft should switch to Players");

  const firstRow = drawer.locator('button[data-leaderboard-row="player"]').first();
  try {
    await firstRow.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    console.log("[sr] mobile: no leaderboard rows found; skipping agent sheet checks");
    return;
  }

  await firstRow.click();
  // Framer Motion exit animations can keep the drawer in the DOM briefly (especially in headless),
  // so validate state via aria-expanded + agent query param rather than waiting for detach.
  await page.waitForFunction(() => Boolean(new URL(window.location.href).searchParams.get("agent")), { timeout: 8000 });
  await page.waitForTimeout(150);

  const expanded = await openButton.getAttribute("aria-expanded");
  assert(expanded === "false", "[sr] mobile: selecting an agent should close the drawer (aria-expanded=false)");

  const dialog = page.locator('div[role="dialog"][aria-labelledby]').first();
  await dialog.waitFor({ state: "visible", timeout: 8000 });
  await expectVisible(dialog.getByRole("tablist", { name: "Agent details tabs" }), "[sr] mobile: missing agent tablist");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 8000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktop.newPage();
    await desktopFlow(desktopPage);
    await desktop.close();
    console.log("[sr] desktop ok");

    const mobile = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 }
    });
    const mobilePage = await mobile.newPage();
    await mobileFlow(mobilePage);
    await mobile.close();
    console.log("[sr] mobile ok");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

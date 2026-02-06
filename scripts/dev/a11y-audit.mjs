#!/usr/bin/env node
import { chromium, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";

async function auditAxe(page, label) {
  const results = await new AxeBuilder({ page })
    // Focus on the core a11y violations that tend to ship regressions in UIs like this.
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  if (results.violations.length === 0) {
    console.log(`[a11y] ${label}: 0 violations`);
    return;
  }

  console.log(`[a11y] ${label}: ${results.violations.length} violation(s)`);
  for (const v of results.violations) {
    console.log(`- ${v.id}: ${v.help}`);
    for (const node of v.nodes.slice(0, 5)) {
      const target = Array.isArray(node.target) ? node.target.join(", ") : String(node.target);
      console.log(`  - ${target}`);
    }
  }
  throw new Error(`${label} has accessibility violations`);
}

async function gotoHome(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  // Allow TanStack Query world/leaderboard fetches to resolve and UI to settle.
  await page.waitForTimeout(1500);
}

async function tryOpenFirstAgentFromLeaderboard(page) {
  const row = page.locator('button[data-leaderboard-row="player"]').first();
  try {
    await row.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return false;
  }

  await row.click();

  const agentDialog = page.locator('div[role="dialog"][aria-modal="true"]').first();
  try {
    await agentDialog.waitFor({ state: "visible", timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

async function tryOpenMobileDrawer(page) {
  const openButton = page.locator('button[aria-controls="mobile-leaderboard-panel"]').first();
  try {
    await openButton.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return false;
  }

  await openButton.click();
  const drawer = page.locator("#mobile-leaderboard-panel");
  try {
    await drawer.waitFor({ state: "visible", timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

async function tryOpenFirstAgentFromMobileDrawer(page) {
  const drawer = page.locator("#mobile-leaderboard-panel");
  if ((await drawer.count()) === 0) return false;

  const row = drawer.locator('button[data-leaderboard-row="player"]').first();
  try {
    await row.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return false;
  }

  await row.click();

  // Drawer closes on selection.
  try {
    await drawer.waitFor({ state: "hidden", timeout: 8000 });
  } catch {
    // Best-effort; continue.
  }

  const agentDialog = page.locator('div[role="dialog"][aria-modal="true"]').first();
  try {
    await agentDialog.waitFor({ state: "visible", timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

async function auditDesktop(page) {
  await gotoHome(page);
  await auditAxe(page, "desktop / baseline");

  const opened = await tryOpenFirstAgentFromLeaderboard(page);
  if (opened) {
    await page.waitForTimeout(250);
    await auditAxe(page, "desktop / agent modal");
  } else {
    console.log("[a11y] desktop: no leaderboard rows found; skipping modal audit");
  }
}

async function auditMobile(page) {
  await gotoHome(page);
  await auditAxe(page, "mobile / baseline");

  const drawerOpened = await tryOpenMobileDrawer(page);
  if (drawerOpened) {
    await page.waitForTimeout(250);
    await auditAxe(page, "mobile / leaderboard drawer");
  } else {
    console.log("[a11y] mobile: drawer open button not found; skipping drawer audit");
    return;
  }

  const agentOpened = await tryOpenFirstAgentFromMobileDrawer(page);
  if (agentOpened) {
    await page.waitForTimeout(250);
    await auditAxe(page, "mobile / agent sheet");
  } else {
    console.log("[a11y] mobile: no leaderboard rows found; skipping agent sheet audit");
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktop.newPage();
    await auditDesktop(desktopPage);
    await desktop.close();

    const mobile = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 }
    });
    const mobilePage = await mobile.newPage();
    await auditMobile(mobilePage);
    await mobile.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

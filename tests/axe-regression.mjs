import assert from "node:assert/strict";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";

const baseUrl = (process.env.A11Y_BASE_URL || "http://127.0.0.1:4176").replace(/\/+$/, "");
const session = { access_token: "fixture-token", expires_at: new Date(Date.now() + 3600000).toISOString(), user: { id: "fixture-user", email: "fixture-user@life-vlog.local", user_metadata: { username: "fixture-user" } } };

async function openPage(browser, {
  pageName = "gallery",
  authenticated = true,
  dark = false,
  scale = "standard",
  reducedMotion = false,
  viewport = { width: 390, height: 844 },
  secretUnlocked = false,
} = {}) {
  const context = await browser.newContext({ viewport });
  const fixture = createCloudflareApiFixture();
  await fixture.install(context);
  const page = await context.newPage();
  if (authenticated) await page.addInitScript(({ value }) => localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(value)), { value: session });
  if (secretUnlocked) {
    await page.addInitScript(() => {
      sessionStorage.setItem("life-vlog-secret-unlock:fixture-user", JSON.stringify({ unlockedAt: Date.now(), leftAt: 0 }));
    });
  }
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto(`${baseUrl}/?page=${pageName}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 3000 });
  if (pageName === "secret" && secretUnlocked) await page.waitForSelector("#secretPage:not([hidden])");
  if (pageName === "secret" && !secretUnlocked) await page.waitForSelector("#secretPinDialog[open]");
  if (["recipes", "wishlist", "weekend", "wardrobe", "thanks"].includes(pageName)) {
    await page.waitForSelector(`#${pageName}Page:not([hidden])`);
  }
  if (dark) await page.evaluate(() => document.body.classList.add("theme-dark"));
  if (scale !== "standard") await page.evaluate((value) => document.documentElement.dataset.textScale = value, scale);
  // Theme tokens animate for a short, intentional handoff. Scan the settled
  // surface so Axe reports the actual accessible state, not an intermediate
  // blended color during the transition.
  await page.waitForTimeout(220);
  return { context, page };
}

async function scan(result, label) {
  const report = await new AxeBuilder({ page: result.page }).analyze();
  const blocking = report.violations.filter((violation) => ["critical", "serious"].includes(violation.impact) && violation.id !== "meta-viewport");
  assert.deepEqual(blocking, [], `${label} Axe violations: ${JSON.stringify(blocking)}`);
}

async function assertKeyboardAndTouchContracts(result, label) {
  const { page } = result;
  await page.click("#wishlistNav");
  await page.waitForFunction(() => document.activeElement?.dataset.pageHeading === "wishlist");
  assert.equal(await page.locator("#wishlistPage").isVisible(), true, `${label} route did not activate`);

  const undersized = await page.evaluate(() => [...document.querySelectorAll("button, a, input, select, textarea")]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return !element.hidden && styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    })
    .map((element) => element.id || element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 24) || element.tagName));
  assert.deepEqual(undersized, [], `${label} visible interactive target is smaller than 44 CSS px: ${undersized.join(", ")}`);

  await page.click("#avatarButton");
  await page.click("#accountSettingsButton");
  await page.waitForSelector("#settingsDialog[open]");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#settingsDialog")?.open);
  await page.waitForFunction(() => document.activeElement?.id === "avatarButton", null, { timeout: 1000 });
  assert.equal(await page.evaluate(() => document.activeElement?.id), "avatarButton", `${label} dialog close did not restore focus`);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    true,
    `${label} has horizontal overflow`,
  );
}

const browser = await chromium.launch({ headless: true });
try {
  for (const options of [
    { pageName: "gallery", authenticated: false, viewport: { width: 375, height: 812 } },
    { pageName: "gallery", authenticated: true, dark: true, scale: "xlarge", reducedMotion: true, viewport: { width: 390, height: 844 } },
    { pageName: "gallery", authenticated: true, scale: "large", viewport: { width: 430, height: 932 } },
    { pageName: "recipes", authenticated: true, viewport: { width: 768, height: 1024 }, dark: true },
    { pageName: "wishlist", authenticated: true, viewport: { width: 1440, height: 900 } },
    { pageName: "weekend", authenticated: true, viewport: { width: 844, height: 390 }, dark: true, scale: "large", reducedMotion: true },
    { pageName: "wardrobe", authenticated: true, viewport: { width: 430, height: 932 }, scale: "large" },
    { pageName: "thanks", authenticated: true, viewport: { width: 390, height: 844 } },
    { pageName: "secret", authenticated: true, viewport: { width: 375, height: 812 } },
    { pageName: "secret", authenticated: true, secretUnlocked: true, viewport: { width: 390, height: 844 }, dark: true, scale: "xlarge" },
  ]) {
    const result = await openPage(browser, options);
    try { await scan(result, `${options.pageName}-${options.authenticated ? "signed-in" : "guest"}`); }
    finally { await result.context.close(); }
  }
  const dialog = await openPage(browser, { authenticated: true });
  try {
    await dialog.page.click("#avatarButton");
    await dialog.page.click("#accountSettingsButton");
    await dialog.page.waitForSelector("#settingsDialog[open]");
    await scan(dialog, "settings");
    await dialog.page.locator("#settingsDialog").evaluate((element) => element.close());
    await assertKeyboardAndTouchContracts(dialog, "keyboard-touch");
  } finally { await dialog.context.close(); }
  const desktopSettings = await openPage(browser, { authenticated: true, viewport: { width: 1440, height: 900 } });
  try {
    await desktopSettings.page.click("#avatarButton");
    await desktopSettings.page.click("#accountSettingsButton");
    await desktopSettings.page.waitForSelector("#settingsDialog[open]");
    await scan(desktopSettings, "settings-desktop");
  } finally { await desktopSettings.context.close(); }
  console.log(`Axe critical/serious scan passed: ${baseUrl}`);
} finally { await browser.close(); }

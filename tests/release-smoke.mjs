import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = (process.env.RELEASE_BASE_URL || "https://life-vlog-site.pages.dev").replace(/\/+$/, "");
const username = process.env.RELEASE_TEST_USERNAME;
const password = process.env.RELEASE_TEST_PASSWORD;
const displayName = process.env.RELEASE_TEST_DISPLAY_NAME || "呱噗救火大队";

if (!username || !password) {
  console.error("Missing RELEASE_TEST_USERNAME or RELEASE_TEST_PASSWORD. Set them only in the current shell.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });

function attachRuntimeChecks(page, label) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label} console: ${message.text()}`);
  });
  return errors;
}

async function login(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#loginButton", { state: "visible", timeout: 30000 });
  await page.fill("#usernameInput", username);
  await page.fill("#passwordInput", password);
  await page.click("#loginButton");
  await page.waitForFunction(
    () => document.querySelector("#loginButton")?.hidden === true && document.querySelector("#logoutButton")?.hidden === false,
    undefined,
    { timeout: 30000 }
  );
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.document <= dimensions.viewport + 1,
    `${label} horizontal overflow: ${dimensions.document}px > ${dimensions.viewport}px`
  );
}

async function assertAccountIdentity(page, label) {
  await page.waitForFunction(
    () => {
      const avatar = document.querySelector("#avatarImage");
      return avatar && !avatar.hidden && avatar.complete && avatar.naturalWidth > 0;
    },
    undefined,
    { timeout: 20000 }
  );
  const identity = await page.evaluate(() => ({
    displayName: document.querySelector("#profileName")?.textContent?.trim() || "",
    avatarHidden: document.querySelector("#avatarImage")?.hidden ?? true,
    avatarLoaded: (document.querySelector("#avatarImage")?.naturalWidth || 0) > 0,
  }));
  assert.equal(identity.displayName, displayName, `${label} display name mismatch`);
  assert.equal(identity.avatarHidden, false, `${label} avatar is hidden`);
  assert.equal(identity.avatarLoaded, true, `${label} avatar did not load`);
}

try {
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
  });
  const desktop = await desktopContext.newPage();
  const desktopErrors = attachRuntimeChecks(desktop, "desktop");
  await login(desktop);
  await desktop.waitForSelector(".topbar");
  await desktop.waitForSelector("#userMenu:not([hidden])");
  await assertAccountIdentity(desktop, "desktop account");
  await desktop.click("#avatarButton");
  await desktop.waitForSelector("#accountSettingsButton", { state: "visible" });
  await desktop.click("#avatarButton");
  await desktop.waitForSelector("#accountSettingsButton", { state: "hidden" });
  await assertNoHorizontalOverflow(desktop, "desktop home");

  await desktop.click("#recipesNav");
  await desktop.waitForSelector("#recipesPage:not([hidden])");
  await desktop.click("#wishlistNav");
  await desktop.waitForSelector("#wishlistPage:not([hidden])");
  await desktop.click("#galleryNav");
  await desktop.waitForSelector("#galleryFilters");
  await assertNoHorizontalOverflow(desktop, "desktop navigation");
  assert.deepEqual(desktopErrors, [], desktopErrors.join("\n"));
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const mobile = await mobileContext.newPage();
  const mobileErrors = attachRuntimeChecks(mobile, "mobile");
  await login(mobile);
  await mobile.waitForSelector(".topbar");
  await mobile.waitForSelector("#userMenu:not([hidden])");
  await assertAccountIdentity(mobile, "mobile account");
  await mobile.click("#avatarButton");
  await mobile.waitForSelector("#accountSettingsButton", { state: "visible" });
  await mobile.click("#avatarButton");
  await mobile.waitForSelector("#accountSettingsButton", { state: "hidden" });
  await mobile.click("#recipesNav");
  await mobile.waitForSelector("#recipesPage:not([hidden])");
  await mobile.click("#wishlistNav");
  await mobile.waitForSelector("#wishlistPage:not([hidden])");
  await mobile.click("#galleryNav");
  await mobile.waitForSelector("#galleryFilters");
  await assertNoHorizontalOverflow(mobile, "mobile navigation");
  assert.deepEqual(mobileErrors, [], mobileErrors.join("\n"));
  await mobileContext.close();

  console.log(`Release smoke checks passed: ${baseUrl} (desktop + mobile).`);
} finally {
  await browser.close();
}

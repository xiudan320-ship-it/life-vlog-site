import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createCloudflareApiFixture } from "./fixtures/cloudflare-api-fixture.mjs";

const sourceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = join(sourceRoot, "dist");
assert.ok(existsSync(join(distRoot, "index.html")), "settings browser regression requires a built dist directory");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = createServer((request, response) => {
  const rawPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relativePath = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const filePath = normalize(join(distRoot, relativePath));
  const safeRelative = relative(distRoot, filePath);
  if (safeRelative.startsWith("..") || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const pseudoSession = {
  access_token: "fixture-token",
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  user: { id: "fixture-user", user_metadata: { username: "fixture-user" } },
};
const adminSession = {
  ...pseudoSession,
  user: {
    ...pseudoSession.user,
    user_metadata: { username: "xiudan320", login_username: "xiudan320" },
  },
};

const browser = await chromium.launch({ headless: true });

async function openFixturePage({ viewport, session = pseudoSession, fixtureOptions = {} } = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const fixture = createCloudflareApiFixture(fixtureOptions);
  await fixture.install(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((initialSession) => {
    localStorage.setItem("life-vlog-cloudflare-auth", JSON.stringify(initialSession));
  }, session);
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "visible", timeout: 10000 });
  await page.waitForFunction(() => performance.getEntriesByName("remote-sync-complete").length > 0, null, { timeout: 10000 });
  return { context, page, fixture, errors };
}

async function openSettings(page) {
  await page.click("#avatarButton");
  await page.click("#accountSettingsButton");
  await page.waitForSelector("#settingsDialog[open]", { state: "attached" });
}

async function closeFixturePage(result) {
  await result.context.close();
}

async function openSettingsSection(page, sectionId) {
  await page.click(`#settings-tab-${sectionId}`);
  await page.waitForSelector(`#settingsDialog[data-mobile-settings-section="${sectionId}"]`, { state: "attached" });
}

async function waitForFixtureReady(page) {
  await page.waitForSelector("#appSplash[hidden]", { state: "attached", timeout: 10000 });
  await page.waitForSelector('[data-photo-id="fixture-photo"]', { state: "visible", timeout: 10000 });
  await page.waitForFunction(() => performance.getEntriesByName("remote-sync-complete").length > 0, null, { timeout: 10000 });
}

async function enterSecretPin(page, value) {
  for (const digit of String(value)) {
    await page.click(`[data-secret-pin-digit="${digit}"]`);
  }
}

async function seedQueuedUpload(page, id) {
  await page.evaluate(async (uploadId) => {
    const openRequest = indexedDB.open("life-vlog-upload-queue", 1);
    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains("diary-uploads")) {
        const store = db.createObjectStore("diary-uploads", { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    const db = await new Promise((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), (char) => char.charCodeAt(0));
    const file = new File([png], `${uploadId}.png`, { type: "image/png", lastModified: 1893456000000 });
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("diary-uploads", "readwrite");
      transaction.objectStore("diary-uploads").put({
        id: uploadId,
        userId: "fixture-user",
        title: `Fixture queued ${uploadId}`,
        rawTitle: `Fixture queued ${uploadId}`,
        note: "确定性上传队列 fixture",
        category: "日常",
        takenAt: "2030-01-01",
        isPublic: true,
        createdAt: "2030-01-01T00:00:00.000Z",
        queuedAt: "2030-01-01T00:00:00.000Z",
        files: [{ kind: "image", file, name: file.name, type: file.type, size: file.size, lastModified: file.lastModified, motionFile: null }],
        linkUrls: [],
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, id);
}

async function testSettingsPersistenceAndAccountActions() {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const { page, fixture } = result;
    await openSettings(page);
    await openSettingsSection(page, "settingsAppearance");
    await page.click("#renameHomeButton");
    await page.fill("#homeNameInput", "Fixture Home");
    await page.click("#renameHomeForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#homeNameStatus")?.textContent.includes("名称已保存并同步"));
    await page.waitForFunction(() => !document.querySelector("#renameHomeDialog")?.open);
    assert.equal(await page.locator("#settingsHomeNameValue").textContent(), "Fixture Home");
    await page.click("#settingsFeedLayoutButton");
    await page.click('[data-text-scale="large"]');
    assert.equal(await page.evaluate(() => document.body.classList.contains("mobile-feed-single")), true, "single-column layout was not applied");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.textScale), "large", "large text scale was not applied");
    await page.click("#closeSettingsDialog");
    await page.waitForFunction(() => !document.querySelector("#settingsDialog")?.open);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForFixtureReady(page);
    assert.deepEqual(
      await page.evaluate(() => ({
        homeName: localStorage.getItem("life-vlog-home-name:fixture-user"),
        layout: localStorage.getItem("life-vlog-mobile-feed-layout:fixture-user"),
        scale: document.documentElement.dataset.textScale,
        single: document.body.classList.contains("mobile-feed-single"),
      })),
      { homeName: "Fixture Home", layout: "single", scale: "large", single: true },
      "appearance settings did not survive a page refresh",
    );

    await openSettings(page);
    await openSettingsSection(page, "settingsAccount");
    await page.click("#renameProfileButton");
    await page.fill("#profileNicknameInput", "Fixture Nickname");
    await page.click("#renameProfileForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#profileNicknameStatus")?.textContent.includes("昵称已保存"));
    await page.waitForFunction(() => !document.querySelector("#renameProfileDialog")?.open);
    assert.equal(await page.locator("#settingsNicknameValue").textContent(), "Fixture Nickname");
    assert.equal(
      fixture.writes.some(({ path, action }) => path === "/api/table/user_profiles" && action === "update"),
      true,
      "profile nickname did not persist the profile row",
    );

    await page.click("#changePasswordButton");
    await page.fill("#newPasswordInput", "FixturePass123!");
    await page.fill("#confirmPasswordInput", "FixturePassDifferent!");
    await page.click("#changePasswordForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#changePasswordStatus")?.textContent.includes("不一致"));
    await page.fill("#newPasswordInput", "FixturePass123!");
    await page.fill("#confirmPasswordInput", "FixturePass123!");
    await page.click("#changePasswordForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#changePasswordStatus")?.textContent.includes("密码已修改"));
    assert.equal(fixture.requests.some(({ path }) => path === "/api/auth/password"), true, "password success did not reach the fixture endpoint");
    await page.waitForFunction(() => document.querySelector("#settingsDialog")?.open);

    await page.click("#recoveryKeyButton");
    await page.fill("#recoveryKeyInput", "fixture-recovery-key");
    await page.fill("#confirmRecoveryKeyInput", "fixture-recovery-other");
    await page.click("#recoveryKeyForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#recoveryKeyStatus")?.textContent.includes("不一致"));
    await page.fill("#confirmRecoveryKeyInput", "fixture-recovery-key");
    await page.click("#recoveryKeyForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#recoveryKeyStatus")?.textContent.includes("已加密保存"));
    assert.equal(fixture.rpcCalls.some(({ name }) => name === "set_password_recovery_key"), true, "recovery key success did not reach the fixture RPC");
    await page.waitForFunction(() => document.querySelector("#settingsDialog")?.open);

    await page.click("#changeSecretPinButton");
    await page.waitForSelector("#secretPinDialog[open]");
    await enterSecretPin(page, "1234");
    await page.waitForFunction(() => document.querySelector("#secretPinTitle")?.textContent === "确认密码");
    await enterSecretPin(page, "4321");
    await page.waitForFunction(() => document.querySelector("#secretPinStatus")?.textContent.includes("不一致"));
    await enterSecretPin(page, "1234");
    await page.waitForFunction(() => document.querySelector("#secretPinTitle")?.textContent === "确认密码");
    await enterSecretPin(page, "1234");
    await page.waitForFunction(() => document.querySelector("#secretPinStatus")?.textContent.includes("已更新"));
    await page.waitForFunction(() => document.querySelector("#settingsDialog")?.open);
    assert.equal(
      await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("life-vlog-secret-pin:fixture-user") || "null")?.hash)),
      true,
      "secret PIN success did not persist a local hash",
    );

    await page.click("#bindEmailButton");
    await page.waitForSelector("#emailBindingDialog[open]");
    await page.fill("#accountEmailInput", "fixture-settings@example.test");
    await page.click("#emailBindingRequestForm button[type=submit]");
    await page.waitForFunction(() => !document.querySelector("#emailBindingConfirmForm")?.hidden);
    await page.fill("#accountEmailCodeInput", "12");
    await page.click("#emailBindingConfirmForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#emailBindingConfirmStatus")?.textContent.includes("6 位验证码"));
    await page.fill("#accountEmailCodeInput", "123456");
    await page.click("#emailBindingConfirmForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#emailBindingConfirmStatus")?.textContent.includes("邮箱已绑定"));
    assert.equal(fixture.requests.some(({ path }) => path === "/api/account/email/request"), true, "email request did not reach the fixture endpoint");
    assert.equal(fixture.requests.some(({ path }) => path === "/api/account/email/confirm"), true, "email confirmation did not reach the fixture endpoint");
    await page.waitForFunction(() => document.querySelector("#settingsDialog")?.open);
    assert.equal(await page.locator("#settingsEmailValue").textContent(), "fixture-settings@example.test");
    assert.deepEqual(result.errors, [], `settings account page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testFamilyRolesAndActions() {
  const owner = await openFixturePage({
    viewport: { width: 390, height: 844 },
    fixtureOptions: { seedMoodFamily: true },
  });
  try {
    const { page, fixture } = owner;
    await openSettings(page);
    await openSettingsSection(page, "settingsFamily");
    await page.click("#familyAccountButton");
    await page.waitForSelector("#familyDialog[open]");
    await page.waitForSelector("#familyInviteForm:not([hidden])");
    await page.fill("#familyUsernameInput", "fixture-invitee");
    await page.click("#familyInviteForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#familyStatus")?.textContent.includes("已向 fixture-invitee 发送邀请"));
    assert.equal(fixture.rpcCalls.some(({ name, payload }) => name === "add_family_member_by_username" && payload.p_username === "fixture-invitee"), true, "owner family invite did not submit the expected RPC");
    await page.click("#closeFamilyDialog");
    await page.waitForSelector("#settingsDialog[open]");
    await page.click("#familyTaglineButton");
    await page.fill("#familyTaglineInput", "fixture family signature");
    await page.click("#familyTaglineForm button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#familyTaglineStatus")?.textContent.includes("家庭签名已同步"));
    assert.equal(fixture.rpcCalls.some(({ name, payload }) => name === "update_family_tagline" && payload.p_tagline === "fixture family signature"), true, "family tagline did not submit the expected RPC");
    await page.waitForFunction(() => document.querySelector("#settingsDialog")?.open);
    assert.deepEqual(owner.errors, [], `family owner page errors: ${owner.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(owner);
  }

  const memberSession = {
    ...pseudoSession,
    user: {
      id: "fixture-partner",
      user_metadata: { username: "fixture-member", login_username: "fixture-partner" },
    },
  };
  const member = await openFixturePage({
    viewport: { width: 390, height: 844 },
    session: memberSession,
    fixtureOptions: { seedMoodFamily: true },
  });
  try {
    const { page, fixture } = member;
    await openSettings(page);
    await openSettingsSection(page, "settingsFamily");
    await page.click("#familyAccountButton");
    await page.waitForSelector("#familyDialog[open]");
    assert.equal(await page.locator("#familyInviteForm").isHidden(), true, "a family member can see the owner-only invite form");
    assert.match(await page.locator("#familyMembers").textContent(), /小咻（我）/);
    assert.equal(fixture.rpcCalls.some(({ name }) => name === "add_family_member_by_username"), false, "member fixture unexpectedly submitted an owner-only invite RPC");
    assert.deepEqual(member.errors, [], `family member page errors: ${member.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(member);
  }
}

async function testSettingsDataSafetyAndQueue() {
  const result = await openFixturePage({
    viewport: { width: 390, height: 844 },
    fixtureOptions: {
      seedTrashItems: [
        {
          id: "fixture-trash-restore",
          user_id: "fixture-user",
          item_type: "wish",
          item_id: "fixture-trashed-wish",
          label: "Fixture restore wish",
          payload: { id: "fixture-trashed-wish", user_id: "fixture-user", title: "Fixture restored wish", is_done: false },
          deleted_at: "2030-01-01T00:00:00.000Z",
          expires_at: "2030-02-01T00:00:00.000Z",
          owner_username: "fixture-user",
          deleted_by_username: "fixture-user",
        },
        {
          id: "fixture-trash-delete",
          user_id: "fixture-user",
          item_type: "wish",
          item_id: "fixture-trashed-wish-delete",
          label: "Fixture delete wish",
          payload: { id: "fixture-trashed-wish-delete", user_id: "fixture-user", title: "Fixture deleted wish", is_done: false },
          deleted_at: "2030-01-01T00:00:00.000Z",
          expires_at: "2030-02-01T00:00:00.000Z",
          owner_username: "fixture-user",
          deleted_by_username: "fixture-user",
        },
      ],
    },
  });
  try {
    const { page, fixture } = result;
    await openSettings(page);
    await openSettingsSection(page, "settingsStorage");
    await page.waitForSelector('[data-refresh-backups]');
    await page.click("[data-create-backup]");
    await page.locator(".mini-toast.visible").filter({ hasText: "加密备份已生成" }).waitFor();
    await page.waitForSelector('[data-backup-key="d1-fixture-01.backup"]');
    assert.equal(fixture.requests.some(({ method, path }) => method === "POST" && path === "/api/backups/run"), true, "backup creation did not reach the fixture endpoint");
    assert.equal(fixture.requests.some(({ method, path }) => method === "GET" && path === "/api/backups"), true, "backup creation did not refresh the backup list");
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-backup-key="d1-fixture-01.backup"]');
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "d1-fixture-01.json");
    await page.locator(".mini-toast.visible").filter({ hasText: "加密备份已解密下载" }).waitFor();
    assert.equal(fixture.requests.some(({ method, path }) => method === "GET" && path === "/api/backups/d1-fixture-01.backup"), true, "backup download did not reach the fixture endpoint");

    await page.click("[data-refresh-trash]");
    await page.waitForSelector('[data-trash-id="fixture-trash-restore"]');
    await page.locator('[data-trash-id="fixture-trash-restore"] [data-trash-restore]').click();
    await page.locator(".mini-toast.visible").filter({ hasText: "已恢复" }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-trash-id="fixture-trash-restore"]'));
    assert.equal(fixture.rpcCalls.some(({ name, payload }) => name === "restore_trash_item" && payload.p_trash_id === "fixture-trash-restore"), true, "trash restore did not submit the expected RPC or remove the restored row");

    await page.click("[data-refresh-trash]");
    await page.waitForSelector('[data-trash-id="fixture-trash-delete"]');
    await page.locator('[data-trash-id="fixture-trash-delete"] [data-trash-delete]').click();
    await page.waitForSelector("dialog.action-confirm-dialog[open]");
    await page.locator('dialog.action-confirm-dialog button[value="confirm"]').click();
    await page.locator(".mini-toast.visible").filter({ hasText: "已永久删除" }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-trash-id="fixture-trash-delete"]'));
    assert.equal(fixture.rpcCalls.some(({ name, payload }) => name === "permanently_delete_trash_item" && payload.p_trash_id === "fixture-trash-delete"), true, "trash permanent delete did not submit the expected RPC or remove the deleted row");

    await page.click("[data-run-diagnostics]");
    await page.waitForFunction(() => {
      const text = document.querySelector("#diagnosticResults")?.textContent || "";
      return text.includes("当前网络") && text.includes("上传队列") && !text.includes("正在检查");
    });
    assert.ok((await page.locator("#diagnosticResults .diagnostic-row").count()) >= 8, "successful diagnostics did not render the runtime result rows");

    await seedQueuedUpload(page, "fixture-upload-retry");
    await page.click("[data-settings-back]");
    await openSettingsSection(page, "settingsStorage");
    await page.waitForSelector('[data-upload-id="fixture-upload-retry"]');
    await page.click("[data-retry-uploads]");
    await page.waitForFunction(() => !document.querySelector('[data-upload-id="fixture-upload-retry"]'), null, { timeout: 15000 });
    assert.equal(fixture.uploads.length >= 1, true, "queue retry did not upload the synthetic fixture file");
    assert.equal(fixture.writes.some(({ path, action }) => path === "/api/table/photos" && action === "insert"), true, "queue retry did not persist the synthetic diary row");

    await seedQueuedUpload(page, "fixture-upload-remove");
    await page.click("[data-settings-back]");
    await openSettingsSection(page, "settingsStorage");
    await page.waitForSelector('[data-upload-id="fixture-upload-remove"]');
    await page.locator('[data-upload-id="fixture-upload-remove"] [data-remove-upload]').click();
    await page.waitForFunction(() => !document.querySelector('[data-upload-id="fixture-upload-remove"]'));
    const remainingQueueItems = await page.evaluate(async () => {
      const openRequest = indexedDB.open("life-vlog-upload-queue", 1);
      const db = await new Promise((resolve, reject) => {
        openRequest.onsuccess = () => resolve(openRequest.result);
        openRequest.onerror = () => reject(openRequest.error);
      });
      const items = await new Promise((resolve, reject) => {
        const request = db.transaction("diary-uploads", "readonly").objectStore("diary-uploads").getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return items.map((item) => item.id);
    });
    assert.equal(remainingQueueItems.includes("fixture-upload-remove"), false, "queue remove did not delete the synthetic IndexedDB item");
    assert.deepEqual(result.errors, [], `settings data-safety page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testSettingsActionsAndRetention() {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const { page } = result;
    await openSettings(page);

    await page.click("#settings-tab-settingsStorage");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsStorage"]');
    await page.evaluate(async () => {
      const response = new Response("fixture-cache-body", { headers: { "content-length": "102400", "content-type": "image/svg+xml" } });
      const cache = await caches.open("life-vlog-diary-image-cache");
      await cache.put(new Request("/settings-fixture-cache"), response);
      localStorage.setItem("life-vlog-photo-feed-cache:fixture-user", "managed-feed");
      localStorage.setItem("life-vlog-secret-items-cache:fixture-user", "managed-secret");
      localStorage.setItem("life-vlog-diary-draft", "draft-to-keep");
      localStorage.setItem("life-vlog-diary-cache-mb:fixture-user", "100");
    });
    await page.waitForFunction(() => !document.querySelector("#settingsCacheValue")?.textContent.includes("计算中"));
    await page.click("#refreshCacheInfoButton");
    await page.waitForFunction(() => {
      const value = document.querySelector("#settingsCacheValue")?.textContent || "";
      const kb = Number.parseInt(value, 10);
      return /KB/.test(value) && kb >= 100;
    });
    await page.evaluate(() => {
      window.__fixtureCacheKeysDescriptor = Object.getOwnPropertyDescriptor(caches, "keys");
      Object.defineProperty(caches, "keys", {
        configurable: true,
        value: async () => { throw new Error("fixture cache read denied"); },
      });
    });
    await page.click("#refreshCacheInfoButton");
    await page.waitForFunction(() => document.querySelector("#settingsCacheValue")?.textContent === "读取失败");
    assert.equal(await page.locator("#settingsCacheValue").textContent(), "读取失败", "cache read failure did not reach the settings retry state");
    await page.evaluate(() => {
      if (window.__fixtureCacheKeysDescriptor) {
        Object.defineProperty(caches, "keys", window.__fixtureCacheKeysDescriptor);
      } else {
        delete caches.keys;
      }
    });
    await page.click("#refreshCacheInfoButton");
    await page.waitForFunction(() => {
      const value = document.querySelector("#settingsCacheValue")?.textContent || "";
      return /KB/.test(value) && !value.includes("读取失败");
    });

    await page.click("#cacheLimitButton");
    await page.waitForSelector("#cacheLimitDialog[open]");
    await page.click('[data-cache-limit-preset="50"]');
    assert.deepEqual(
      await page.evaluate(() => [document.querySelector("#cacheLimitInput")?.value, document.querySelector("#secretCacheLimitInput")?.value]),
      ["50", "150"],
      "capacity preset did not update both pools",
    );
    await page.fill("#cacheLimitInput", "220");
    await page.fill("#secretCacheLimitInput", "660");
    await page.click("#cacheLimitForm button[type=submit]");
    await page.waitForFunction(() => !document.querySelector("#cacheLimitDialog")?.open);
    await page.waitForSelector("#settingsDialog[open]");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "cacheLimitButton", "capacity dialog did not restore its trigger focus");
    assert.equal(await page.locator("#settingsCacheLimitValue").textContent(), "日记 220 MB · 秘藏 660 MB");
    assert.deepEqual(
      await page.evaluate(() => [
        localStorage.getItem("life-vlog-diary-cache-mb:fixture-user"),
        localStorage.getItem("life-vlog-secret-cache-mb:fixture-user"),
      ]),
      ["220", "660"],
      "capacity save did not persist both pools",
    );

    await page.locator(".settings-danger-zone summary").click();
    await page.click("#clearAppCacheButton");
    await page.waitForSelector("dialog.action-confirm-dialog[open]");
    await page.locator('dialog.action-confirm-dialog button[value="cancel"]').click();
    assert.equal(await page.evaluate(() => localStorage.getItem("life-vlog-photo-feed-cache:fixture-user")), "managed-feed", "cancelled clear-all changed managed indexes");
    await page.click("#clearAppCacheButton");
    await page.waitForSelector("dialog.action-confirm-dialog[open]");
    await page.locator('dialog.action-confirm-dialog button[value="confirm"]').click();
    await page.waitForFunction(async () => !(await caches.has("life-vlog-diary-image-cache")));
    const retained = await page.evaluate(() => ({
      managedFeed: localStorage.getItem("life-vlog-photo-feed-cache:fixture-user"),
      managedSecret: localStorage.getItem("life-vlog-secret-items-cache:fixture-user"),
      draft: localStorage.getItem("life-vlog-diary-draft"),
      capacity: localStorage.getItem("life-vlog-diary-cache-mb:fixture-user"),
    }));
    assert.deepEqual(retained, {
      managedFeed: null,
      managedSecret: null,
      draft: "draft-to-keep",
      capacity: "220",
    }, "clear-all removed more than managed offline content");

    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => { throw new Error("clipboard denied"); } },
      });
    });
    await page.click("[data-performance-copy]");
    const copyToast = page.locator(".mini-toast.visible").filter({ hasText: "无法复制" });
    await copyToast.waitFor();
    assert.match(await copyToast.textContent(), /无法复制/);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    });
    await page.click("[data-performance-copy]");
    const unavailableToast = page.locator(".mini-toast.visible").filter({ hasText: "当前浏览器不支持复制" });
    await unavailableToast.waitFor();
    assert.match(await unavailableToast.textContent(), /不支持复制/);
    await page.evaluate(() => {
      window.__fixtureCopiedDiagnostic = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (text) => { window.__fixtureCopiedDiagnostic = text; } },
      });
    });
    await page.click("[data-performance-copy]");
    const successCopyToast = page.locator(".mini-toast.visible").filter({ hasText: "已复制脱敏诊断信息" });
    await successCopyToast.waitFor();
    assert.equal(await page.evaluate(() => Boolean(window.__fixtureCopiedDiagnostic)), true, "successful diagnostics copy did not write to the fixture clipboard");
    assert.deepEqual(result.errors, [], `settings action page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

async function testEarlyInstallPromptAndRoleSearch() {
  const ordinary = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const { page } = ordinary;
    await page.evaluate(() => {
      window.__fixturePromptCalls = 0;
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = () => { window.__fixturePromptCalls += 1; };
      event.userChoice = Promise.resolve({ outcome: "dismissed" });
      window.dispatchEvent(event);
    });
    await openSettings(page);
    await page.fill("#settingsSearchInput", "R2");
    await page.waitForFunction(() => document.querySelector("[data-settings-search-status]")?.textContent.includes("没有找到"));
    assert.equal(await page.locator('[data-settings-search-result="adminStorageMeter"]').count(), 0, "ordinary member search exposed administrator storage");
    assert.equal(ordinary.fixture.requests.some(({ path }) => path === "/api/admin/r2-usage"), false, "ordinary member triggered administrator storage request");
    await page.fill("#settingsSearchInput", "安装");
    await page.waitForSelector('[data-settings-search-result="settingsInstallApp"]');
    await page.click('[data-settings-search-result="settingsInstallApp"]');
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsAppearance"]');
    assert.equal(await page.locator("#installAppButton").isVisible(), true, "early install event was lost before settings mounted");
    await page.click("#installAppButton");
    assert.equal(await page.evaluate(() => window.__fixturePromptCalls), 1, "install prompt was not invoked by the user action");
    await page.click("[data-settings-back]");
    await page.fill("#settingsSearchInput", "");
    await page.click("#closeSettingsDialog");
    assert.deepEqual(ordinary.errors, [], `ordinary settings page errors: ${ordinary.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(ordinary);
  }

  const admin = await openFixturePage({ viewport: { width: 1440, height: 900 }, session: adminSession });
  try {
    const { page } = admin;
    await openSettings(page);
    await page.fill("#settingsSearchInput", "R2");
    await page.waitForSelector('[data-settings-search-result="adminStorageMeter"]');
    assert.equal(await page.locator('[data-settings-search-result="adminStorageMeter"]').count(), 1);
    await page.click('[data-settings-search-result="adminStorageMeter"]');
    await page.waitForTimeout(50);
    assert.equal(admin.fixture.requests.some(({ path }) => path === "/api/admin/r2-usage"), true, "administrator storage did not request usage after navigation");
    assert.deepEqual(admin.errors, [], `administrator settings page errors: ${admin.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(admin);
  }
}

async function testSettingsTouchGeometry() {
  const result = await openFixturePage({ viewport: { width: 390, height: 844 } });
  try {
    const { page } = result;
    await openSettings(page);
    const header = await page.evaluate(() => ({
      title: document.querySelector(".settings-header")?.getBoundingClientRect().height || 0,
      search: document.querySelector(".settings-search")?.getBoundingClientRect().height || 0,
      close: document.querySelector("#closeSettingsDialog")?.getBoundingClientRect().height || 0,
    }));
    assert.ok(header.title + header.search < 210, `mobile settings top area remains too tall: ${JSON.stringify(header)}`);
    await page.click("#settings-tab-settingsAppearance");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsAppearance"]');
    const navigationHeights = await page.locator(".settings-primary-navigation-row").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
    assert.ok(navigationHeights.every((height) => height >= 92 && height <= 132), `primary navigation rows are not compact: ${navigationHeights.join(", ")}`);
    await page.click("[data-settings-back]");
    await page.click("#settings-tab-settingsTools");
    await page.waitForSelector('#settingsDialog[data-mobile-settings-section="settingsTools"]');
    const toolButtonHeights = await page.locator("[data-tool-order-move]").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    assert.ok(toolButtonHeights.length > 0 && toolButtonHeights.every((height) => height >= 44), `tool sort touch targets are too small: ${toolButtonHeights.join(", ")}`);
    assert.deepEqual(result.errors, [], `settings geometry page errors: ${result.errors.join(" | ")}`);
  } finally {
    await closeFixturePage(result);
  }
}

try {
  await testSettingsActionsAndRetention();
  await testSettingsPersistenceAndAccountActions();
  await testFamilyRolesAndActions();
  await testSettingsDataSafetyAndQueue();
  await testEarlyInstallPromptAndRoleSearch();
  await testSettingsTouchGeometry();
  console.log("Settings reliability browser checks passed: cache failure/retry, persistence, account and family actions, backup/trash, diagnostics, upload queue, install timing, role search, focus, clipboard, and touch geometry.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

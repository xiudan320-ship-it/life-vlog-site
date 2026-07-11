import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, css, worker, schema] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../redesign.css", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare-worker/src/worker.js", import.meta.url), "utf8"),
  readFile(new URL("../cloudflare-worker/schema.d1.sql", import.meta.url), "utf8"),
]);
const serviceWorker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

assert.match(app, /createTrashItem\("photo"/);
assert.match(app, /createTrashItem\(\s*"secret"/);
assert.match(app, /downloadFamilyBackup/);
assert.match(app, /placement: "center"/);
assert.match(css, /\.mini-toast-host-center[\s\S]*?top: 50% !important/);
assert.match(css, /body\.mobile-diary-page-open \.topbar/);
assert.match(worker, /Only image files are allowed/);
assert.match(worker, /configuredOrigins\.includes/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS trash_items/);
assert.match(app, /thumbnail_url/);
assert.match(app, /settings-account-overview/);
assert.match(css, /#settingsTools \.settings-tool-card/);
assert.match(worker, /createDailyBackup/);
assert.match(worker, /cleanupExpiredTrash/);
assert.match(worker, /AES-GCM/);
assert.match(worker, /handleBackupDownload/);
assert.match(worker, /handleBackupRun/);
assert.match(app, /backfillLegacyThumbnails/);
assert.match(css, /body\.mobile-diary-page-open \.topbar \.main-nav/);
assert.match(serviceWorker, /!isSameOrigin && isImageRequest/);
assert.match(serviceWorker, /caches\.match\(request, \{ ignoreVary: true \}\)/);
assert.match(app, /shouldAutoCacheMedia/);
assert.match(app, /downloadOfflinePool/);
assert.match(app, /Number\.POSITIVE_INFINITY/);
assert.match(app, /await getCachedResponseBytes\(response\)/);

console.log("Smoke checks passed.");

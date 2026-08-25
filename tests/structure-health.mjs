import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");

const [html, app, serviceWorker, moduleMap] = await Promise.all([
  read("index.html"),
  read("app.js"),
  read("service-worker.js"),
  read("docs/MODULE_MAP.md"),
]);

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert.deepEqual(duplicateIds, [], `Duplicate HTML ids: ${duplicateIds.join(", ")}`);

const localModuleImports = [...app.matchAll(/from\s+["'](\.\/?[^"']+?\.js)(?:\?[^"']*)?["']/g)]
  .map((match) => match[1]);
await Promise.all(localModuleImports.map((modulePath) => access(path.resolve(root, modulePath))));

const checkedSources = [app, serviceWorker, await read("tests/offline-start.mjs")];
assert.equal(
  checkedSources.some((source) => /[A-Z]:\\Users\\|file:\/\/[A-Z]:\//i.test(source)),
  false,
  "Runtime or test code contains a machine-specific absolute path.",
);

assert.equal(
  html.includes("cdn.jsdelivr.net"),
  false,
  "The app shell preconnects to an unused third-party CDN.",
);

const sizeBudgets = new Map([
  ["app.js", 90_000],
  ["modules/app-event-bindings.js", 12_000],
  ["modules/secret-controller.js", 65_000],
  ["redesign.css", 350_000],
]);
for (const [file, limit] of sizeBudgets) {
  const { size } = await stat(path.join(root, file));
  assert.ok(
    size <= limit,
    `${file} is ${size.toLocaleString()} bytes; split or simplify it before exceeding ${limit.toLocaleString()} bytes.`,
  );
}

for (const requiredModule of [
  "content-form-event-bindings.js",
  "media-event-bindings.js",
  "settings-event-bindings.js",
  "secret-filter-domain.js",
  "secret-folder-controller.js",
]) {
  assert.ok(moduleMap.includes(requiredModule), `Module map is missing ${requiredModule}.`);
  assert.ok(serviceWorker.includes(`./modules/${requiredModule}`), `Offline shell is missing ${requiredModule}.`);
}

const appLineCount = app.split(/\r?\n/).length;
assert.ok(
  appLineCount <= 2300,
  `app.js is ${appLineCount.toLocaleString()} lines; keep feature logic in modules instead of expanding the application shell.`,
);
for (const forbiddenDefinition of [
  "function updateAuthUI(",
  "function switchPage(",
  "function showMiniToast(",
  "function renderAccountAvatar(",
  "function getFinalTitle(",
]) {
  assert.equal(
    app.includes(forbiddenDefinition),
    false,
    `${forbiddenDefinition} belongs in a focused module, not app.js.`,
  );
}

const headers = await read("_headers");
for (const requiredHeader of [
  "Content-Security-Policy:",
  "X-Content-Type-Options:",
  "Referrer-Policy:",
  "Permissions-Policy:",
]) {
  assert.ok(headers.includes(requiredHeader), `Missing security header: ${requiredHeader}`);
}

console.log("Structure health checks passed.");

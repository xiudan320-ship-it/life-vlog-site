import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const run = (command, args) => new Promise((resolveRun, rejectRun) => {
  execFile(command, args, { cwd: root, encoding: "utf8" }, (error, stdout, stderr) => {
    if (error) rejectRun(Object.assign(error, { stdout, stderr }));
    else resolveRun(stdout);
  });
});
const read = (file) => readFile(join(root, file), "utf8");
const modulesRoot = join(root, "modules");
const html = await read("index.html");
const app = await read("app.js");
const appRuntime = await read("modules/app-runtime-assembly.js");
const appRuntimeController = await read("modules/app-runtime-controller-assembly.js");
const appRuntimeInfrastructure = await read("modules/app-runtime-infrastructure.js");
const appRuntimeRoute = await read("modules/app-runtime-route-assembly.js");
const appRuntimeStartup = await read("modules/app-runtime-startup.js");
const appRuntimeState = await read("modules/app-runtime-state.js");
const routeContext = await read("modules/app-route-context.js");
const moduleMap = await read("docs/MODULE_MAP.md");
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "duplicate HTML id");
assert.ok(!app.includes("function switchPage("), "navigation belongs in its module");
assert.ok(!app.includes("function showMiniToast("), "feedback belongs in its module");
assert.ok(!app.includes("?v="), "manual version query remains");
assert.ok(appRuntime.includes("startAppRuntime"), "runtime assembly is not wired");
assert.ok(appRuntimeInfrastructure.includes("createAppServices"), "infrastructure graph is not owned by app-services");
assert.ok(appRuntimeState.includes("createRuntimeStateAccessors"), "shared runtime state accessors are missing");
assert.ok(appRuntimeRoute.includes("createRouteControllerOptions"), "route options are not owned by route assembly");
assert.ok(appRuntimeStartup.includes("createAppStartupController"), "startup controller is not owned by startup assembly");
assert.ok(appRuntimeStartup.includes("createPwaInstallController"), "PWA lifecycle is not owned by startup assembly");
assert.doesNotMatch(appRuntimeController, /createAppServices|createRouteControllerOptions|createAppRouteContext|createAppStartupController|createPwaInstallController|createPwaUpdateController/, "core runtime assembly reclaimed an owned boundary");
assert.ok(routeContext.includes("createRouteControllerOptions"), "route options did not move to route context");
assert.ok(appRuntime.split(/\r?\n/).length <= 80, "runtime assembly grew beyond the startup boundary");
assert.ok(moduleMap.includes("app-navigation-controller.js"));
assert.ok(moduleMap.includes("app-session-controller.js"));
assert.ok(moduleMap.includes("mood-diary-controller.js"));
assert.ok(moduleMap.includes("mood-diary-shared.js"));
assert.ok(moduleMap.includes("comment-thread-domain.js"));
assert.ok(moduleMap.includes("mood-jar-physics.js"));
const runtimeFiles = (await readdir(modulesRoot))
  .filter((file) => /^app-runtime-.*\.js$/.test(file))
  .sort();
assert.ok(runtimeFiles.length >= 8, "runtime assembly modules are missing");
const ownershipSignatures = {
  pageState: /createRuntimeStateAccessors|createRuntimeStateView|familySettingsState|dataSafetyState/,
  serviceBuild: /createAppServices|createRuntimeInfrastructure/,
  routeOptions: /createRouteControllerOptions|createAppRouteContext/,
  startup: /createAppStartupController|createPwaInstallController|createPwaUpdateController/,
};
for (const file of runtimeFiles) {
  const source = await read(join("modules", file));
  const lines = source.trimEnd().split(/\r?\n/).length;
  assert.ok(lines <= 1_200, `${file} is a giant runtime substitute: ${lines} lines`);
  const ownedResponsibilities = Object.values(ownershipSignatures).filter((pattern) => pattern.test(source));
  assert.ok(ownedResponsibilities.length <= 2, `${file} combines too many runtime responsibilities`);
}
for (const file of [
  "modules/app-startup-controller.js",
  "modules/app-runtime-assembly.js",
  "modules/app-runtime-controller-assembly.js",
  "modules/app-runtime-infrastructure.js",
  "modules/app-runtime-route-assembly.js",
  "modules/app-runtime-startup.js",
  "modules/app-runtime-state.js",
  "modules/app-route-domain.js",
  "modules/primary-navigation-domain.js",
  "modules/primary-navigation-view.js",
  "modules/primary-navigation-controller.js",
  "modules/route-loader.js",
  "modules/text-scale-controller.js",
  "modules/pwa-install-controller.js",
  "modules/pwa-update-controller.js",
  "modules/performance-monitor.js",
  "modules/performance-diagnostics-view.js",
  "modules/routes/settings-route.js",
  "modules/comment-thread-domain.js",
  "modules/mood-jar-physics.js",
  "modules/mobile-diary-view.js",
  "modules/social-controller.js",
  "modules/mood-diary-shared.js",
  "modules/mood-diary-domain.js",
  "modules/mood-month-summary-domain.js",
  "modules/mood-month-summary-view.js",
  "modules/mood-diary-repository.js",
  "modules/mood-entry-overlay-view.js",
  "modules/mood-entry-overlay-controller.js",
  "modules/mood-diary-view.js",
  "modules/mood-diary-controller.js",
  "modules/today-mood-view.js",
  "modules/today-mood-controller.js",
  "modules/routes/mood-diary-route.js",
  "modules/routes/templates/mood-diary.html",
  "styles/mood-diary.css",
  "tests/mood-diary-domain.mjs",
  "tests/comment-thread-domain.mjs",
  "tests/mood-jar-physics.mjs",
  "tests/mood-month-summary-domain.mjs",
  "tests/mood-entry-overlay-controller.mjs",
  "tests/mood-diary-controller.mjs",
  "tests/today-mood-controller.mjs",
  "tests/mood-diary-worker.mjs",
  "src/sw.js",
  "vite.config.js",
  "public/_headers",
  "scripts/optimize-assets.mjs",
  "tests/build-budget.mjs",
  "tests/asset-budget.mjs",
]) await access(join(root, file));
for (const old of ["service-worker.js", "manifest.webmanifest"]) {
  assert.equal(await access(join(root, old)).then(() => true, () => false), false, `legacy ${old} remains`);
}
const trackedLegacyOutput = await run("git", ["ls-files", "--", ".cloudflare-pages-dist"]);
assert.equal(trackedLegacyOutput.trim(), "", "legacy .cloudflare-pages-dist is tracked");
const { size } = await stat(join(root, "app.js"));
assert.ok(size < 300_000, `app.js grew unexpectedly: ${size}`);
assert.ok(app.split(/\r?\n/).length <= 1_200, `app.js exceeds the 1,200-line assembly budget: ${app.split(/\r?\n/).length}`);
console.log("Structure health checks passed.");

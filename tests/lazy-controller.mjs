import assert from "node:assert/strict";
import test from "node:test";
import { createLazyControllerProxy } from "../modules/lazy-controller.js";
import { createRouteLoader } from "../modules/route-loader.js";

test("lazy controller proxy fails explicitly before its route is loaded", () => {
  const registry = {};
  const proxy = createLazyControllerProxy(registry, "recipes");

  assert.equal(proxy.isLoaded, false);
  assert.throws(() => proxy.render(), /Page controller "recipes" is not loaded/);

  registry.recipes = { render: () => "rendered" };
  assert.equal(proxy.isLoaded, true);
  assert.equal(proxy.get(), registry.recipes);
  assert.equal(proxy.render(), "rendered");
});

test("route loader mounts, collects, initializes, binds, and activates once per route", async () => {
  const events = [];
  let activationCount = 0;
  let imports = 0;
  const loader = createRouteLoader({
    imports: {
      wishlist: async () => {
        imports += 1;
        await new Promise((resolve) => setTimeout(resolve, 1));
        return {
        mount: () => events.push("mount"),
        initialize: () => events.push("initialize"),
        activate: () => { events.push("activate"); activationCount += 1; },
        };
      },
    },
  });
  const context = {
    collect: () => events.push("collect"),
    refreshElements: () => events.push("refresh"),
    bindRouteEvents: () => events.push("bind"),
  };

  await Promise.all([loader.load("wishlist", context), loader.load("wishlist", context)]);
  await loader.load("wishlist", context);

  assert.deepEqual(events, [
    "mount", "collect", "initialize", "bind", "activate", "activate", "activate",
  ]);
  assert.equal(imports, 1);
  assert.equal(activationCount, 3);
  assert.deepEqual(loader.getLoadedPages(), ["wishlist"]);
});

test("route loader does not activate an obsolete navigation transaction", async () => {
  let active = false;
  const loader = createRouteLoader({
    imports: {
      weekend: async () => ({ activate: () => { active = true; } }),
    },
  });
  await loader.load("weekend", { isCurrent: () => false });
  assert.equal(active, false);
  await loader.load("weekend", { isCurrent: () => true });
  assert.equal(active, true);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createAppNavigationController } from "../modules/app-navigation-controller.js";

test("a vetoed navigation clears busy state and invalidates a previously loading route", async () => {
  const attributes = new Map();
  const main = {
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  };
  let canLeave = true;
  let finishLoading;
  let startLoading;
  const started = new Promise((resolve) => { startLoading = resolve; });
  const state = { activePage: "mood" };
  const { switchPage } = createAppNavigationController({
    elements: { main },
    state,
    controllers: { moodDiary: { beforeLeave: () => canLeave } },
    routeLoader: {
      load() {
        startLoading();
        return new Promise((resolve) => { finishLoading = resolve; });
      },
    },
    documentTarget: {},
    windowTarget: {},
  });
  const first = switchPage("weekend");
  await started;
  assert.equal(attributes.get("aria-busy"), "true");
  canLeave = false;
  assert.equal(await switchPage("wishlist"), false);
  assert.equal(attributes.size, 0);
  finishLoading();
  assert.equal(await first, false);
  assert.equal(state.activePage, "mood");
});

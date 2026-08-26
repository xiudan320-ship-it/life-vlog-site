import assert from "node:assert/strict";
import test from "node:test";

import { createShoppingController } from "../modules/shopping-controller.js";

function createElements() {
  return {
    shoppingStatus: { textContent: "" },
    shoppingList: { innerHTML: "" },
    shoppingFilters: { querySelectorAll: () => [] },
    shoppingAllCount: { textContent: "" },
    shoppingOpenCount: { textContent: "" },
    shoppingDoneCount: { textContent: "" },
    shoppingSummary: { textContent: "" },
  };
}

function createController({ elements, items, repository, cleanupStoredImagePaths }) {
  let currentItems = items;
  return createShoppingController({
    elements,
    repository,
    getSession: () => ({ user: { id: "user-1" } }),
    getDatabase: () => ({}),
    getItems: () => currentItems,
    setItems: (next) => { currentItems = next; },
    getActiveFilter: () => "all",
    setActiveFilter: () => {},
    getDataState: () => "ready",
    canSync: () => true,
    canManageItem: () => true,
    normalizeUuid: (value) => value || "generated-id",
    compressImage: async (file) => ({ blob: file }),
    uploadToR2: async () => ({ url: "https://example.com/image.jpg", key: "shopping/image.jpg" }),
    cleanupStoredImagePaths,
    slugify: (value) => value,
    formatFileSize: (value) => String(value),
    escapeHtml: (value) => String(value),
    confirmAction: async () => true,
    showToast: () => {},
  });
}

test("shopping deletion renders before a failed R2 cleanup finishes", async () => {
  const elements = createElements();
  const items = [{
    id: "item-1",
    userId: "user-1",
    name: "待删除商品",
    imagePath: "r2:shopping/item-1.jpg",
    imageUrl: "https://example.com/item-1.jpg",
    completed: false,
    createdAt: "2026-08-26T00:00:00.000Z",
  }];
  let rejectCleanup;
  let cleanupStarted = false;
  const cleanupPromise = new Promise((resolve, reject) => {
    rejectCleanup = reject;
  });
  const controller = createController({
    elements,
    items,
    repository: {
      remove: async () => ({ data: [{ id: "item-1" }], error: null }),
    },
    cleanupStoredImagePaths: async () => {
      cleanupStarted = true;
      await cleanupPromise;
    },
  });

  const removePromise = controller.remove("item-1");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(cleanupStarted, true);
  assert.equal(elements.shoppingAllCount.textContent, "0");
  assert.equal(elements.shoppingOpenCount.textContent, "0");
  assert.equal(elements.shoppingSummary.textContent, "0 件商品 · 0 件已完成");
  assert.match(elements.shoppingList.innerHTML, /购物车还是空的/);
  assert.equal(elements.shoppingStatus.textContent, "商品已删除。");

  rejectCleanup(new Error("R2 unavailable"));
  await removePromise;
  assert.equal(elements.shoppingStatus.textContent, "商品已删除，但图片清理失败。");
});

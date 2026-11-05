import assert from "node:assert/strict";
import test from "node:test";

import { createShoppingController } from "../modules/shopping-controller.js";

function createElements() {
  return {
    shoppingStatus: { textContent: "" },
    shoppingList: { innerHTML: "" },
    shoppingFilters: { querySelectorAll: () => [] },
    shoppingOpenCount: { textContent: "" },
    shoppingDoneCount: { textContent: "" },
    shoppingSummary: { textContent: "" },
  };
}

function createController({ elements, items, repository, cleanupStoredImagePaths, activeFilter = "open", onSetActiveFilter = () => {}, getSession = () => ({ user: { id: "user-1" } }), onSetItems = () => {} }) {
  let currentItems = items;
  return createShoppingController({
    elements,
    repository,
    getSession,
    getDatabase: () => ({}),
    getItems: () => currentItems,
    setItems: (next) => { currentItems = next; onSetItems(next); },
    getActiveFilter: () => activeFilter,
    setActiveFilter: onSetActiveFilter,
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

test("shopping completion keeps the current filter for consecutive checks", async () => {
  const elements = createElements();
  const items = [
    {
      id: "item-1",
      userId: "user-1",
      name: "先买咖啡",
      completed: false,
      createdAt: "2026-08-26T00:00:00.000Z",
    },
    {
      id: "item-2",
      userId: "user-1",
      name: "再买面包",
      completed: false,
      createdAt: "2026-08-25T00:00:00.000Z",
    },
  ];
  const filterChanges = [];
  const controller = createController({
    elements,
    items,
    repository: {
      update: async () => ({
        data: {
          id: "item-1",
          user_id: "user-1",
          name: "先买咖啡",
          is_completed: true,
          completed_at: "2026-08-27T00:00:00.000Z",
          sort_order: 0,
          created_at: "2026-08-26T00:00:00.000Z",
          updated_at: "2026-08-27T00:00:00.000Z",
        },
        error: null,
      }),
    },
    cleanupStoredImagePaths: async () => {},
    onSetActiveFilter: (filter) => filterChanges.push(filter),
  });

  await controller.toggle("item-1");

  assert.deepEqual(filterChanges, []);
  assert.match(elements.shoppingList.innerHTML, /再买面包/);
  assert.doesNotMatch(elements.shoppingList.innerHTML, /先买咖啡/);
  assert.equal(elements.shoppingStatus.textContent, "已标记为已购买。");
});

function createSaveElements() {
  const element = (value = "") => ({
    value,
    hidden: false,
    disabled: false,
    textContent: "",
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { delete this[name]; },
    classList: { toggle() {} },
  });
  const elements = createElements();
  for (const name of ["shoppingNameInput", "shoppingPriceInput", "shoppingLinkInput", "shoppingNoteInput", "shoppingToggle", "shoppingSubmitButton", "shoppingComposer", "shoppingFormTitle", "shoppingCancelEdit", "shoppingImageInput", "shoppingImagePreview", "shoppingImageName", "shoppingRemoveImage"]) {
    elements[name] = element();
  }
  elements.shoppingNameInput.value = "咖啡豆";
  elements.shoppingNoteInput.value = "保留这份备注";
  elements.shoppingForm = {
    ...element(),
    querySelectorAll: () => [elements.shoppingNameInput, elements.shoppingSubmitButton],
    reset() { elements.shoppingNameInput.value = ""; elements.shoppingNoteInput.value = ""; },
  };
  return elements;
}

test("shopping save writes once during a slow request and preserves concurrent list changes", async () => {
  const elements = createSaveElements();
  const items = [];
  let writes = 0;
  let finishWrite;
  let written;
  const controller = createController({
    elements, items,
    repository: { upsert: async (table, row) => {
      writes += 1;
      written = row;
      return new Promise((resolve) => { finishWrite = resolve; });
    } },
    onSetItems: (next) => { items.splice(0, items.length, ...next); },
  });
  const saving = controller.submit({ preventDefault() {} });
  await new Promise(setImmediate);
  await controller.submit({ preventDefault() {} });
  assert.equal(writes, 1);
  assert.equal(elements.shoppingSubmitButton.disabled, true);
  assert.equal(elements.shoppingForm["aria-busy"], "true");
  items.push({ id: "another-item", userId: "user-1", name: "面包" });
  finishWrite({ data: written, error: null });
  await saving;
  assert.equal(items.length, 2);
  assert.equal(elements.shoppingSubmitButton.disabled, false);
  assert.equal(elements.shoppingNameInput.value, "");
  assert.match(elements.shoppingList.innerHTML, /咖啡豆/);
});

test("shopping rejected save keeps the draft and allows retry", async () => {
  const elements = createSaveElements();
  let writes = 0;
  const controller = createController({
    elements, items: [],
    repository: { upsert: async (table, row) => {
      writes += 1;
      if (writes === 1) throw new Error("网络断开");
      return { data: row, error: null };
    } },
  });
  await controller.submit({ preventDefault() {} });
  assert.equal(elements.shoppingNameInput.value, "咖啡豆");
  assert.equal(elements.shoppingNoteInput.value, "保留这份备注");
  assert.equal(elements.shoppingSubmitButton.disabled, false);
  assert.match(elements.shoppingStatus.textContent, /网络断开/);
  await controller.submit({ preventDefault() {} });
  assert.equal(writes, 2);
  assert.match(elements.shoppingStatus.textContent, /已加入/);
});

test("shopping response from a signed-out session does not replace the next account list", async () => {
  const elements = createSaveElements();
  let session = { user: { id: "user-1" } };
  let finishWrite;
  let written;
  const updates = [];
  const controller = createController({
    elements, items: [], getSession: () => session,
    repository: { upsert: async (table, row) => {
      written = row;
      return new Promise((resolve) => { finishWrite = resolve; });
    } },
    onSetItems: (items) => updates.push(items),
  });
  const saving = controller.submit({ preventDefault() {} });
  await new Promise(setImmediate);
  session = { user: { id: "user-2" } };
  finishWrite({ data: written, error: null });
  await saving;
  assert.deepEqual(updates, []);
  assert.equal(elements.shoppingNameInput.value, "咖啡豆");
  assert.equal(elements.shoppingSubmitButton.disabled, false);
});

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
  assert.equal(elements.shoppingOpenCount.textContent, "0");
  assert.equal(elements.shoppingSummary.textContent, "0 件商品 · 0 件已完成");
  assert.match(elements.shoppingList.innerHTML, /购物车还是空的/);
  assert.equal(elements.shoppingStatus.textContent, "商品已删除。");

  rejectCleanup(new Error("R2 unavailable"));
  await removePromise;
  assert.equal(elements.shoppingStatus.textContent, "商品已删除，但图片清理失败。");
});

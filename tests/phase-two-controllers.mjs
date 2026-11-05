import assert from "node:assert/strict";
import test from "node:test";
import { createDiaryComposerController } from "../modules/diary-composer-controller.js";
import { createRecipeController } from "../modules/recipe-controller.js";
import { createWishlistController } from "../modules/wishlist-controller.js";
import { extractImageUrls } from "../modules/media-metadata.js";

function makeStorage({ throwOnWrite = false } = {}) {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => {
      if (throwOnWrite) throw new Error("storage full");
      values.set(key, String(value));
    },
    removeItem: (key) => values.delete(key),
  };
}

function makeElement({ value = "", hidden = false, files = [] } = {}) {
  return {
    value,
    hidden,
    files,
    textContent: "",
    disabled: false,
    open: false,
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
    },
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { delete this[name]; },
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    contains() { return false; },
    scrollIntoView() {},
    focus() {},
    showModal() { this.open = true; },
    close() { this.open = false; },
  };
}

function createWishFixture({ repository, awardExperience = async () => 0, cleanupStoredImagePaths = async () => {} } = {}) {
  const elements = {};
  for (const key of ["wishlistStatus", "wishlistList", "wishTabs", "wishOpenCount", "wishDoneCount", "wishlistSummary", "wishlistComposer", "wishlistToggle", "wishlistForm", "wishlistFormTitle", "wishSubmitButton", "wishCancelEdit", "wishTitleInput", "wishTypeInput", "wishDateInput", "wishPriorityInput", "wishNoteInput", "wishCompletionNoteInput", "wishImageInput", "wishImagePreview", "wishImageName", "wishRemoveImage", "wishImageLinkInput", "wishCompleteDialog", "wishCompleteTitle", "wishCompleteMeta", "wishCompleteNoteInput", "wishCompleteStatus", "wishCompletePreview", "wishCompleteForm", "wishCompleteSubmit"]) {
    elements[key] = makeElement();
  }
  elements.wishTitleInput.value = "看一次日出";
  elements.wishNoteInput.value = "留给明天";
  elements.wishTypeInput.value = "想做";
  elements.wishPriorityInput.value = "普通";
  elements.wishlistForm.querySelectorAll = () => [elements.wishTitleInput, elements.wishSubmitButton];
  elements.wishlistForm.reset = () => { elements.wishTitleInput.value = ""; };
  elements.wishCompleteForm.reset = () => { elements.wishCompleteNoteInput.value = ""; };
  let session = { user: { id: "user-a" } };
  const wishes = [];
  let activeView = "open";
  const controller = createWishlistController({
    elements, repository,
    getSession: () => session,
    getDatabase: () => ({}),
    getWishes: () => wishes,
    setWishes: (next) => { wishes.splice(0, wishes.length, ...next); },
    getActiveView: () => activeView,
    setActiveView: (next) => { activeView = next; },
    getDataState: () => "ready",
    canSync: () => true,
    getAuthorName: () => "测试成员",
    canManageItem: () => true,
    normalizeUuid: (id) => id || "00000000-0000-4000-8000-000000000001",
    awardExperience, cleanupStoredImagePaths, extractImageUrls,
    slugify: (value) => value,
    escapeHtml: (value) => String(value),
    copyUrlToR2: async () => ({ url: "https://cdn.example/wish.jpg", key: "wish.jpg" }),
    confirmAction: async () => true,
  });
  return { controller, elements, wishes, setSession: (next) => { session = next; } };
}

function wishRow(updates = {}) {
  return { id: "wish-1", user_id: "user-a", title: "看一次日出", wish_type: "想做", priority: "普通", note: "", completion_note: "值得记住的一天", is_done: true, created_at: "2026-10-01T00:00:00.000Z", ...updates };
}

test("wish submit blocks duplicate writes and renders before the reward resolves", async () => {
  let finishWrite;
  let written;
  let writes = 0;
  const fixture = createWishFixture({
    repository: { upsert: async (table, row) => {
      writes += 1;
      written = row;
      return new Promise((resolve) => { finishWrite = resolve; });
    } },
    awardExperience: () => new Promise(() => {}),
  });
  const { controller, elements, wishes } = fixture;
  const saving = controller.submit({ preventDefault() {} });
  await new Promise(setImmediate);
  await controller.submit({ preventDefault() {} });
  assert.equal(writes, 1);
  assert.equal(elements.wishSubmitButton.disabled, true);
  finishWrite({ data: written, error: null });
  await saving;
  assert.equal(wishes.length, 1);
  assert.match(elements.wishlistList.innerHTML, /看一次日出/);
  assert.equal(elements.wishSubmitButton.disabled, false);
});

test("wish save failure retains its draft even when uploaded-image cleanup fails", async () => {
  let writes = 0;
  const { controller, elements, wishes } = createWishFixture({
    repository: { upsert: async (table, row) => {
      writes += 1;
      return writes === 1 ? { error: new Error("保存未完成") } : { data: row, error: null };
    } },
    cleanupStoredImagePaths: async () => { throw new Error("清理未完成"); },
  });
  controller.applyImageUrl("https://cdn.example/source.jpg");
  await controller.submit({ preventDefault() {} });
  assert.equal(elements.wishTitleInput.value, "看一次日出");
  assert.equal(elements.wishNoteInput.value, "留给明天");
  assert.equal(elements.wishSubmitButton.disabled, false);
  assert.equal(wishes.length, 0);
  assert.match(elements.wishlistStatus.textContent, /保存未完成.*图片清理失败/);
  await controller.submit({ preventDefault() {} });
  assert.equal(writes, 2);
  assert.equal(wishes.length, 1);
});

test("wish reopening retains the completion receipt in the server update", async () => {
  let update;
  const { controller, wishes } = createWishFixture({ repository: {
    update: async (table, changes) => { update = changes; return { data: wishRow(changes), error: null }; },
  } });
  wishes.push({ id: "wish-1", userId: "user-a", title: "看一次日出", done: true, completionNote: "值得记住的一天" });
  await controller.toggle("wish-1");
  assert.equal(update.completion_note, "值得记住的一天");
  assert.equal(update.is_done, false);
  assert.equal(wishes[0].completionNote, "值得记住的一天");
});

test("wish completion rejection unlocks the form, retains the receipt draft and can retry", async () => {
  let writes = 0;
  const { controller, elements, wishes } = createWishFixture({ repository: {
    update: async (table, changes) => {
      writes += 1;
      if (writes === 1) throw new Error("临时断网");
      return { data: wishRow(changes), error: null };
    },
  } });
  wishes.push({ id: "wish-1", userId: "user-a", title: "看一次日出", done: false });
  controller.openCompleteDialog("wish-1");
  elements.wishCompleteNoteInput.value = "继续保留这段感想";
  await controller.submitCompletion({ preventDefault() {} });
  assert.equal(elements.wishCompleteDialog.open, true);
  assert.equal(elements.wishCompleteSubmit.disabled, false);
  assert.equal(elements.wishCompleteNoteInput.value, "继续保留这段感想");
  assert.match(elements.wishCompleteStatus.textContent, /临时断网/);
  await controller.submitCompletion({ preventDefault() {} });
  assert.equal(elements.wishCompleteDialog.open, false);
  assert.equal(wishes[0].completionNote, "继续保留这段感想");
});

test("late wish completion leaves a newly opened completion dialog intact", async () => {
  let finishWrite;
  const { controller, elements, wishes } = createWishFixture({ repository: {
    update: async (table, changes) => new Promise((resolve) => { finishWrite = () => resolve({ data: wishRow(changes), error: null }); }),
  } });
  wishes.push({ id: "wish-1", userId: "user-a", title: "看一次日出", done: false });
  controller.openCompleteDialog("wish-1");
  elements.wishCompleteNoteInput.value = "已提交的感想";
  const saving = controller.submitCompletion({ preventDefault() {} });
  controller.closeCompleteDialog();
  controller.openCompleteDialog("wish-1");
  elements.wishCompleteNoteInput.value = "重新打开后的输入";
  finishWrite();
  await saving;
  assert.equal(elements.wishCompleteDialog.open, true);
  assert.equal(elements.wishCompleteNoteInput.value, "重新打开后的输入");
});

test("wish response does not replace state after account switching", async () => {
  let finishWrite;
  const { controller, wishes, setSession } = createWishFixture({ repository: {
    upsert: async (table, row) => new Promise((resolve) => { finishWrite = () => resolve({ data: row, error: null }); }),
  } });
  const saving = controller.submit({ preventDefault() {} });
  await new Promise(setImmediate);
  setSession({ user: { id: "user-b" } });
  finishWrite();
  await saving;
  assert.equal(wishes.length, 0);
});

function makeRecipeFixture() {
  const fields = {
    recipeNameInput: makeElement({ value: "番茄炒蛋" }),
    recipeCategoryInput: makeElement({ value: "家常菜" }),
    recipeTimeInput: makeElement({ value: "15 分钟" }),
    recipeServingsInput: makeElement({ value: "2 人" }),
    recipeIngredientsInput: makeElement({ value: "番茄\n鸡蛋" }),
    recipeStepsInput: makeElement({ value: "翻炒" }),
    recipeNoteInput: makeElement({ value: "" }),
    recipeCoverInput: makeElement({ files: [] }),
    recipeCoverPreview: makeElement(),
    recipeCoverName: makeElement({ value: "还没有选择封面" }),
    recipeCoverLinkInput: makeElement(),
  };
  const recipeForm = makeElement({ hidden: false });
  recipeForm.reset = () => {};
  const elements = {
    ...fields,
    recipeComposer: makeElement(),
    recipeForm,
    recipeToggle: makeElement(),
    recipeStatus: makeElement(),
    recipeFormStatus: makeElement(),
    recipeFormTitle: makeElement(),
    recipeSubmitButton: makeElement(),
    recipeCancelEdit: makeElement({ hidden: true }),
    recipesList: { innerHTML: "", ownerDocument: { activeElement: null }, contains: () => false, querySelectorAll: () => [] },
  };
  return { elements, fields };
}

function createRecipeFixture({ repository, getSession = () => ({ user: { id: "user-a" } }), awardExperience = async () => 0, compressImage = async () => ({ blob: new Blob(["cover"], { type: "image/jpeg" }) }) } = {}) {
  const { elements, fields } = makeRecipeFixture();
  const recipes = [];
  const controller = createRecipeController({
    elements,
    storageKey: "recipe-test",
    repository: repository || { upsert: async () => ({ data: null, error: null }) },
    getSession,
    getDisplayName: () => "测试用户",
    getRecipes: () => recipes,
    setRecipes: (items) => { recipes.splice(0, recipes.length, ...items); },
    canSync: () => true,
    getAuthorName: () => "测试用户",
    canManageItem: () => true,
    normalizeUuid: (id) => id || "recipe-new",
    getClipboardFiles: () => [],
    getClipboardImageUrl: () => "",
    copyUrlToR2: async () => ({ url: "https://cdn.example/cover.jpg", key: "cover" }),
    compressImage,
    uploadToR2: async () => ({ url: "https://cdn.example/cover.jpg", key: "cover" }),
    slugify: (value) => value,
    awardExperience,
    renderFoodWheel: () => {},
    confirmAction: async () => true,
    createTrashItem: async () => null,
    rollbackTrashItem: async () => {},
  });
  return { controller, elements, fields, recipes };
}

function recipeRow() {
  return {
    id: "recipe-new",
    user_id: "user-a",
    name: "番茄炒蛋",
    category: "家常菜",
    cooking_time: "15 分钟",
    servings: "2 人",
    cover_image: "",
    ingredients: ["番茄", "鸡蛋"],
    steps: ["翻炒"],
    seasonings: [],
    note: "",
    created_at: "2026-09-18T00:00:00.000Z",
    updated_at: "2026-09-18T00:00:00.000Z",
  };
}

test("recipe submit locks before the first await and writes once", async () => {
  const originalStorage = globalThis.localStorage;
  const originalDocument = globalThis.document;
  globalThis.localStorage = makeStorage();
  globalThis.document = { querySelectorAll: () => [] };
  let writes = 0;
  let resolveWrite;
  const repository = {
    upsert: () => {
      writes += 1;
      return new Promise((resolve) => { resolveWrite = resolve; });
    },
  };
  const { controller, elements } = createRecipeFixture({ repository });
  try {
    const first = controller.submit({ preventDefault() {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = controller.submit({ preventDefault() {} });
    assert.equal(writes, 1);
    assert.equal(elements.recipeSubmitButton.disabled, true);
    assert.match(elements.recipeStatus.textContent, /重复提交/);
    resolveWrite({ data: recipeRow(), error: null });
    await first;
    assert.equal(elements.recipeSubmitButton.disabled, false);
  } finally {
    globalThis.localStorage = originalStorage;
    globalThis.document = originalDocument;
  }
});

test("recipe cover upload failure stops the write and keeps the form input", async () => {
  const originalDocument = globalThis.document;
  globalThis.document = { querySelectorAll: () => [] };
  let writes = 0;
  const { controller, elements } = createRecipeFixture({
    repository: { upsert: async () => { writes += 1; return { data: recipeRow(), error: null }; } },
    compressImage: async () => { throw new Error("封面损坏"); },
  });
  elements.recipeCoverInput.files = [{ name: "broken.jpg" }];
  const originalName = elements.recipeNameInput.value;
  try {
    await controller.submit({ preventDefault() {} });
    assert.equal(writes, 0);
    assert.equal(elements.recipeNameInput.value, originalName);
    assert.deepEqual(elements.recipeCoverInput.files, [{ name: "broken.jpg" }]);
    assert.match(elements.recipeStatus.textContent, /封面损坏/);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("recipe linked cover is retained when a failed save is retried", async () => {
  const originalStorage = globalThis.localStorage;
  const originalDocument = globalThis.document;
  globalThis.localStorage = makeStorage();
  globalThis.document = { querySelectorAll: () => [] };
  const writes = [];
  const { controller, elements } = createRecipeFixture({
    repository: { upsert: async (table, row) => {
      writes.push(row);
      return writes.length === 1 ? { error: new Error("稍后再试") } : { data: row, error: null };
    } },
  });
  try {
    controller.applyCoverUrl("https://cdn.example/original.jpg");
    await controller.submit({ preventDefault() {} });
    assert.equal(elements.recipeNameInput.value, "番茄炒蛋");
    await controller.submit({ preventDefault() {} });
    assert.equal(writes.length, 2);
    assert.equal(writes[0].cover_image, "https://cdn.example/cover.jpg");
    assert.equal(writes[1].cover_image, writes[0].cover_image);
  } finally {
    globalThis.localStorage = originalStorage;
    globalThis.document = originalDocument;
  }
});

test("recipe reward failure does not repeat the successful write", async () => {
  const originalStorage = globalThis.localStorage;
  const originalDocument = globalThis.document;
  globalThis.localStorage = makeStorage();
  globalThis.document = { querySelectorAll: () => [] };
  let writes = 0;
  const { controller, elements, recipes } = createRecipeFixture({
    repository: { upsert: async () => { writes += 1; return { data: recipeRow(), error: null }; } },
    awardExperience: async () => { throw new Error("reward unavailable"); },
  });
  try {
    await controller.submit({ preventDefault() {} });
    assert.equal(writes, 1);
    assert.equal(recipes.length, 1);
    assert.match(elements.recipeStatus.textContent, /奖励稍后补发/);
  } finally {
    globalThis.localStorage = originalStorage;
    globalThis.document = originalDocument;
  }
});

function makeComposerFixture({ storage, confirmAction = async () => true } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const fields = {
    titleInput: makeElement(),
    noteInput: makeElement(),
    categoryInput: makeElement({ value: "日常" }),
    dateInput: makeElement({ value: today }),
    publicInput: makeElement({ value: "true" }),
    photoInput: makeElement(),
    photoMotionInput: makeElement(),
    photoLinkInput: makeElement(),
    photoPreview: makeElement(),
    photoVideoPreview: makeElement(),
    uploadMainPreview: makeElement({ hidden: true }),
    previewStrip: makeElement({ hidden: true }),
    fileName: makeElement(),
  };
  fields.photoVideoPreview.pause = () => {};
  const uploadForm = makeElement({ hidden: false });
  uploadForm.reset = () => {
    fields.titleInput.value = "";
    fields.noteInput.value = "";
    fields.categoryInput.value = "日常";
    fields.dateInput.value = today;
    fields.publicInput.value = "true";
  };
  const elements = {
    ...fields,
    composer: makeElement(),
    uploadForm,
    uploadToggle: makeElement(),
    uploadStatus: makeElement(),
    uploadFormStatus: makeElement(),
    draftStatus: makeElement(),
    composerOptionsSummary: makeElement(),
    uploadOptionsDisclosure: makeElement(),
    clearDiaryDraft: makeElement(),
    uploadCenterLink: makeElement({ hidden: true }),
  };
  elements.uploadToggle.disabled = false;
  const controller = createDiaryComposerController({
    elements,
    queue: { enqueue: async () => {}, list: async () => [], remove: async () => {} },
    repository: { insert: async () => ({ error: null }) },
    assets: {},
    vlogMode: { isActive: () => false, close: () => {} },
    draftKey: "diary-test",
    getCloudDatabase: () => ({}),
    getSession: () => ({ user: { id: "user-a" } }),
    getCurrentImageLimit: () => 9,
    getFinalTitle: () => fields.titleInput.value.trim(),
    getUploadFileNameBase: () => "diary",
    formatFileSize: (value) => String(value),
    escapeHtml: (value) => String(value),
    setGlobalStatus: () => {},
    awardExperience: async () => 0,
    loadPhotos: async () => {},
    switchPage: async () => true,
    renderUploadCenter: async () => {},
    confirmAction,
  });
  return { controller, elements };
}

test("diary draft persistence removes an empty account draft and never overwrites current input", () => {
  const originalStorage = globalThis.localStorage;
  const storage = makeStorage();
  globalThis.localStorage = storage;
  try {
    const { controller, elements } = makeComposerFixture({ storage });
    storage.setItem("diary-test:user-a", JSON.stringify({ title: "旧草稿", note: "旧内容" }));
    controller.saveDraft();
    assert.equal(storage.getItem("diary-test:user-a"), null);
    storage.setItem("diary-test:user-a", JSON.stringify({ title: "旧草稿", note: "旧内容", category: "日常", isPublic: "true" }));
    elements.titleInput.value = "当前输入";
    controller.restoreDraft();
    assert.equal(elements.titleInput.value, "当前输入");
    assert.equal(storage.getItem("diary-test:user-a") !== null, true);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

test("diary draft storage errors keep input and expose a not-saved status", () => {
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = makeStorage({ throwOnWrite: true });
  try {
    const { controller, elements } = makeComposerFixture();
    elements.titleInput.value = "输入仍保留";
    controller.saveDraft();
    assert.match(elements.draftStatus.textContent, /未暂存/);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

test("clearing a non-empty diary draft requires confirmation", async () => {
  const originalStorage = globalThis.localStorage;
  const storage = makeStorage();
  globalThis.localStorage = storage;
  try {
    const { controller, elements } = makeComposerFixture({ storage, confirmAction: async () => false });
    elements.titleInput.value = "保留";
    storage.setItem("diary-test:user-a", JSON.stringify({ title: "保留", note: "内容" }));
    const cleared = await controller.clearDraft();
    assert.equal(cleared, false);
    assert.notEqual(storage.getItem("diary-test:user-a"), null);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

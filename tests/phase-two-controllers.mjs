import assert from "node:assert/strict";
import test from "node:test";
import { createDiaryComposerController } from "../modules/diary-composer-controller.js";
import { createRecipeController } from "../modules/recipe-controller.js";

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
  };
}

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

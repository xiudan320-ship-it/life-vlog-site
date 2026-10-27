import { createSecretController } from "/modules/secret-controller.js";
import { createImageService } from "/modules/image-service.js";
import { createAssetController } from "/modules/asset-controller.js";
import { secretFromCloudRow } from "/modules/cloud-models.js";

const elements = Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => [element.id, element]));
const rows = new Map();
const fixture = window.fixture = {
  uploads: [], saves: [], errors: [], failName: "", failSave: false, hold: false, release: null, rateLimit: false, retryWait: null,
  state: {
    session: { user: { id: "fixture-user" } }, cloudDb: {}, secretCloudAvailable: true,
    secretItems: [], secretFolders: [], photos: [], secretSearchQuery: "", activeSecretFolderId: "all",
    secretDefaultFolderId: "", activeSecretAlbumId: "", activeSecretFilter: "全部", selectedSecretImageIndexes: new Set(),
  },
};
const imageUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='%235b9834'/%3E%3C/svg%3E";
const imageService = createImageService({
  endpoint: "https://synthetic.fixture", getAccessToken: () => "fixture-only",
  getUploadQuality: () => ({ maxSide: 2048, targetBytes: 1024 * 1024, jpeg: 0.85, minJpeg: 0.5 }),
  sleepApi: async (delay) => { fixture.retryDelay = delay; await new Promise((resolve) => { fixture.retryWait = resolve; }); },
  async fetchApi(url, options) {
    const name = options.body instanceof FormData ? options.body.get("name") : JSON.parse(options.body).name;
    fixture.uploads.push(name);
    if (fixture.hold) await new Promise((resolve) => { fixture.release = resolve; });
    if (fixture.rateLimit) { fixture.rateLimit = false; return new Response("{}", { status: 429 }); }
    if (fixture.failName && name === fixture.failName) return new Response(JSON.stringify({ error: "fixture 图片格式无法上传" }), { status: 400 });
    return new Response(JSON.stringify({ key: `fixture-user/secrets/${name}.jpg`, url: imageUrl }), { status: 200 });
  },
});
const assets = createAssetController({ imageService, formatFileSize: (bytes) => `${bytes} B`, setStatus: (message) => { elements.secretStatus.textContent = message; } });
const repository = {
  async saveItem(row) {
    fixture.saves.push(row.images.length);
    if (fixture.failSave) return { error: new Error("fixture 相册保存暂时失败") };
    rows.set(row.id, structuredClone(row));
    return { error: null };
  },
  async updateOwnedItem(id, updates) { return this.saveItem({ ...rows.get(id), ...updates }); },
};
const controller = createSecretController({
  elements, state: fixture.state, repository, assets,
  dataService: { async load() { fixture.state.secretItems = [...rows.values()].map(secretFromCloudRow); } },
  albumImageLimit: 500, allFolderId: "all", favoritesFolderId: "favorites", mobileDialogBreakpoint: 700,
  getSecretDefaultFolderId: () => "", setSecretDefaultFolderId() {}, saveSecretItemsCache() {}, renderCachedSecretItems() {},
  setSecretStatus: (message) => { elements.secretStatus.textContent = message; },
  showMiniToast: (message) => { fixture.errors.push(message); }, isMobileViewport: () => innerWidth <= 700,
  getSortedPhotos: (photos) => photos, getDisplayTitle: () => "", getPlainNote: () => "", isMissingCloudSchema: () => false,
  updateSecretToolbarTop() {},
});
elements.secretPage.hidden = false;
elements.secretComposer.hidden = false;
elements.secretToggle.addEventListener("click", () => controller.setSecretExpanded(elements.secretForm.hidden));
elements.secretForm.addEventListener("submit", controller.saveSecretItem);
elements.secretImageInput.addEventListener("change", controller.updateSecretPreview);
fixture.controller = controller;
fixture.rows = rows;
fixture.seedAlbum = () => {
  rows.clear();
  rows.set("fixture-existing", { id: "fixture-existing", user_id: "fixture-user", title: "追加测试", category: "未分类", images: [{ image_url: imageUrl, image_path: "r2:fixture-user/existing.jpg" }], created_at: "2030-01-01T00:00:00Z" });
  fixture.state.secretItems = [...rows.values()].map(secretFromCloudRow);
  fixture.state.activeSecretAlbumId = "fixture-existing";
  fixture.state.secretAppendExpanded = true;
  controller.renderSecretGallery();
};
const urls = new Set();
const originalCreate = URL.createObjectURL.bind(URL);
const originalRevoke = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = (file) => { const url = originalCreate(file); urls.add(url); return url; };
URL.revokeObjectURL = (url) => { urls.delete(url); originalRevoke(url); };
fixture.urls = urls;
fixture.selectFiles = (selector, count, longName = false) => {
  const transfer = new DataTransfer();
  for (let index = 0; index < count; index++) {
    transfer.items.add(new File([`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#5b9834"/></svg>`], `${longName ? "很长的合成图片文件名".repeat(20) : "fixture"}-${index + 1}.svg`, { type: "image/svg+xml" }));
  }
  const input = document.querySelector(selector);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};
controller.renderSecretGallery();
controller.setSecretExpanded(true);
fixture.ready = true;

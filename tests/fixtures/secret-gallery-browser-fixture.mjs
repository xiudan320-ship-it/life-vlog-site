import { createSecretController } from "/modules/secret-controller.js";
import { secretFromCloudRow } from "/modules/cloud-models.js";
import { createSecretDataService } from "/modules/secret-data-service.js";

document.body.insertAdjacentHTML("beforeend", `<dialog id="fixtureViewer"><button id="closeViewer">关闭图片</button><h2 id="dialogTitle"></h2><p id="dialogMeta"></p><p id="dialogNote"></p><img id="dialogImage" alt="选中图片" /><section id="photoCommentsSection"></section></dialog>`);
const elements = Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => [element.id, element]));
elements.dialog = elements.fixtureViewer;
elements.closeDialog = elements.closeViewer;
const state = {
  session: { user: { id: "synthetic-user" } }, cloudDb: {}, secretCloudAvailable: true,
  secretItems: [], secretFolders: [{ id: "travel", name: "旅行文件夹" }, { id: "home", name: "生活文件夹" }],
  photos: [], secretSearchQuery: "", activeSecretFolderId: "all", activeSecretAlbumId: "", activeSecretFilter: "全部", selectedSecretImageIndexes: new Set(),
};
const rows = new Map();
const fixture = window.fixture = { state, rows, failId: "", trash: [], writes: [], cleaned: [] };
function image(id, tag, date, favorite = false) {
  const hue = { ten: 90, two: 35, one: 170, indoor: 230 }[id];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="hsl(${hue},30%,70%)"/><circle cx="360" cy="260" r="140" fill="hsl(${hue},40%,50%)"/><path d="M0 600L220 420L600 700V800H0" fill="hsl(${hue},25%,35%)"/><text x="30" y="80" font-size="48">${id}</text></svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return { image_url: url, thumbnail_url: url, image_path: id, tags: tag, uploadedAt: date, favorite, width: 600, height: 800 };
}
fixture.seed = async () => {
  rows.clear();
  rows.set("a", { id: "a", user_id: "synthetic-user", folder_id: "travel", title: "海边相册", images: [image("ten", ["日落", "10"], "2030-01-03", true), image("two", ["日落", "2"], "2030-01-01"), image("one", ["山景", "1"], "2030-01-02")], photo_sort_mode: "time", photo_sort_descending: 1, created_at: "2030-01-01" });
  rows.set("b", { id: "b", user_id: "synthetic-user", folder_id: "home", title: "日落灵感", images: [image("indoor", ["室内"], "2030-01-01", true)], photo_sort_mode: "time", photo_sort_descending: 1, created_at: "2030-01-01" });
  state.activeSecretAlbumId = "";
  state.activeSecretFolderId = "all";
  state.secretSearchQuery = "";
  state.secretSelectionMode = false;
  state.selectedSecretImageIndexes = new Set();
  elements.secretSearchInput.value = "";
  await controller.loadSecretItems();
};
const repository = {
  async listItems() { return { data: [...rows.values()].map((row) => structuredClone(row)) }; },
  async listFolders() { return { data: state.secretFolders.map((folder) => ({ id: folder.id, name: folder.name })) }; },
  async updateItem(id, updates) {
    if (fixture.failId === id) { fixture.failId = ""; return { error: new Error("合成保存失败") }; }
    fixture.writes.push({ id, updates });
    rows.set(id, { ...rows.get(id), ...structuredClone(updates) });
    return { error: null };
  },
  async updateOwnedItem(id, updates) { return this.updateItem(id, updates); },
  async removeItem(id) { rows.delete(id); return { error: null }; },
};
const dataService = createSecretDataService({ repository, getDatabase: () => state.cloudDb, getSession: () => state.session,
  setItems: (items) => { state.secretItems = items; }, setFolders: (folders) => { state.secretFolders = folders; }, setCloudAvailable: (value) => { state.secretCloudAvailable = value; } });
const noop = () => {};
const controller = fixture.controller = createSecretController({
  elements, state, repository, dataService,
  assets: { cleanupStoredImagePaths: async (paths) => { fixture.cleaned.push(...paths); } },
  albumImageLimit: 500, allFolderId: "all", favoritesFolderId: "favorites", mobileDialogBreakpoint: 700,
  getSecretDefaultFolderId: () => "", setSecretDefaultFolderId: noop, saveSecretItemsCache: noop, renderCachedSecretItems: noop,
  setSecretStatus: (message) => { elements.secretStatus.textContent = message; }, setGlobalStatus: noop, showMiniToast: noop,
  isMobileViewport: () => innerWidth <= 700, getSortedPhotos: () => [], getDisplayTitle: () => "", getPlainNote: () => "", isMissingCloudSchema: () => false,
  createTrashItem: async (...entry) => { fixture.trash.push(entry); return "fixture-trash"; }, rollbackTrashItem: noop,
  showPhotoDialogPreservingScroll: () => elements.dialog.showModal(),
  renderDialogMedia: async () => { elements.dialogImage.src = state.dialogImages[state.dialogImageIndex].image_url; },
  fitSecretViewerImage: noop, resetSecretImageZoom: noop, updateSecretToolbarTop: noop,
});
elements.closeViewer.onclick = () => { elements.dialog.close(); document.documentElement.classList.remove("dialog-scroll-locked"); document.body.classList.remove("dialog-scroll-locked"); state.secretViewerReturnFocus?.focus(); };
elements.secretSearchInput.addEventListener("input", () => { state.secretSearchQuery = elements.secretSearchInput.value; controller.renderSecretGallery(); });
elements.secretPage.hidden = false;
await fixture.seed();
fixture.reload = async () => { state.secretItems = [...rows.values()].map(secretFromCloudRow); controller.renderSecretGallery(); };
fixture.ready = true;

import assert from "node:assert/strict";
import {
  redesignStyleUrls,
  app,
  redesignStyles,
  styles,
  worker,
  schema,
  index,
  manifestText,
  css,
  serviceWorker,
  diaryDetailCss,
  weekendBoardCss,
  weekendGalleryModule,
  wishlistViewModule,
  shoppingViewModule,
  shoppingController,
  shoppingControllerModule,
  wishlistHubController,
  diaryUploadDomainModule,
  notificationViewModule,
  diaryGalleryViewModule,
  mobileDiaryViewModule,
  mediaGestureDomainModule,
  secretGalleryViewModule,
  accountViewModule,
  photoDialogViewModule,
  familyActivityViewModule,
  cacheManagementViewModule,
  gamificationViewModule,
  accountSyncDomain,
  appElements,
  foodWheelController,
  pushController,
  anniversaryController,
  gratitudeController,
  recipeController,
  recipeControllerModule,
  anniversaryControllerModule,
  gratitudeControllerModule,
  pushControllerModule,
  wishlistController,
  wishlistControllerModule,
  weekendController,
  weekendControllerModule,
  authController,
  offlineCacheController,
  offlineCacheControllerModule,
  offlineSettingsController,
  offlineSettingsControllerModule,
  dataSafetyController,
  dataSafetyControllerModule,
  accountSyncController,
  accountSyncControllerModule,
  trashController,
  trashControllerModule,
  diaryFeedController,
  diaryFeedControllerModule,
  socialController,
  socialControllerModule,
  familySettingsController,
  familySettingsControllerModule,
  familyActivityController,
  familyActivityControllerModule,
  toolDockController,
  toolDockControllerModule,
  layoutSettingsController,
  layoutSettingsControllerModule,
  appEventBindings,
  appEventBindingsModule,
  contentFormEventBindingsModule,
  mediaEventBindingsModule,
  settingsEventBindingsModule,
  appNavigationControllerModule,
  appIdentityControllerModule,
  appSessionControllerModule,
  householdBrandingControllerModule,
  diaryMetadataModule,
  assetController,
  assetControllerModule,
  diaryComposerController,
  diaryComposerControllerModule,
  gamificationController,
  gamificationControllerModule,
  profilePreferencesController,
  profilePreferencesControllerModule,
  secretController,
  secretControllerModule,
  secretComposerControllerModule,
  secretAlbumActionsControllerModule,
  secretFolderControllerModule,
  secretFilterDomainModule,
  secretPinController,
  secretPinControllerModule,
  photoViewerController,
  photoViewerControllerModule,
  photoDetailController,
  photoDetailControllerModule,
  photoEditorControllerModule,
  mobileDiaryControllerModule,
  applicationSource,
  deployScript,
  releaseTestScript,
  secretViewerCss,
  appLifecycle,
  pageHeaders,
  confirmDialogModule,
  cachePolicyModule,
  cachePolicy,
  diaryDomain,
  notificationDomain,
  photoFavoritesDomain,
  wishlistView,
  diaryUploadDomain,
  foodWheelView,
  recipeView,
  anniversaryView,
  weekendPlansView,
  gratitudeView,
  notificationView,
  vipCenter,
  diaryGalleryView,
  mobileDiaryView,
  mediaGestureDomain,
  secretGalleryView,
  accountView,
  photoDialogView,
  familyActivityView,
  gamificationView,
  secretDomain,
  diaryDomainModule,
  notificationDomainModule,
  secretDomainModule,
  cloudflareClientModule,
  repositoryModule,
  wardrobeModule,
  wardrobeCss,
  mediaCacheModule,
  vlogModeModule,
  diaryVideoLayoutModule,
  mediaCache,
  mediaMetadataModule,
  adminStorageModule,
  mediaMetadata,
  uploadQueueModule,
  imageServiceModule,
  gamificationDomain,
  gamificationArchiveModule,
  preferencesStoreModule,
  householdRepositoryModule,
  uiFormatters,
  offlineRecords,
  expandedTrashMigration,
} from "./smoke-fixture.mjs";

assert.equal(cachePolicy.normalizeCacheMb("5", 100), 20);
assert.equal(cachePolicy.normalizeCacheMb("5000", 100), 2000);
assert.equal(
  cachePolicy.getCacheCapacityStorageKey("secret", "user-1", {
    diary: "diary",
    secret: "secret",
  }),
  "secret:user-1"
);
assert.equal(cachePolicy.isClearlyUnmeteredConnection({ connection: { type: "wifi" } }), true);
assert.equal(cachePolicy.isClearlyUnmeteredConnection({ connection: { effectiveType: "4g" } }), false);
assert.equal(uiFormatters.escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#039;");
const weekendMetadata = mediaMetadata.parseWeekendStoredNote(
  mediaMetadata.composeWeekendStoredNote(
    "带上相机。",
    [{ image_url: "https://example.com/plan.jpg", image_path: "r2:plan.jpg" }],
    "天气很好，也终于吃到了想吃的店。",
    [{ image_url: "https://example.com/recap.jpg", image_path: "r2:recap.jpg" }],
    "2026-08-09T12:00:00.000Z"
  )
);
assert.equal(weekendMetadata.note, "带上相机。");
assert.equal(weekendMetadata.images.length, 1);
assert.equal(weekendMetadata.completionNote, "天气很好，也终于吃到了想吃的店。");
assert.equal(weekendMetadata.completionImages.length, 1);
assert.equal(weekendMetadata.completedAt, "2026-08-09T12:00:00.000Z");
assert.equal(uiFormatters.slugify("Hello World"), "hello-world");
assert.equal(uiFormatters.slugify(""), "photo");
assert.equal(uiFormatters.formatDate("not-a-date"), "\u672a\u8bb0\u5f55\u65e5\u671f");
assert.equal(uiFormatters.formatDateTime("not-a-date"), "\u672a\u77e5\u65f6\u95f4");
assert.deepEqual(
  offlineRecords.sanitizeDiaryRecord({
    id: "photo-1",
    category: "",
    is_public: 1,
    is_featured: 0,
  }),
  {
    id: "photo-1",
    user_id: undefined,
    title: "",
    note: "",
    category: "\u65e5\u5e38",
    taken_at: "",
    created_at: "",
    image_path: "",
    image_url: "",
    width: null,
    height: null,
    is_public: true,
    is_featured: false,
    is_pinned: false,
  }
);
assert.deepEqual(
  offlineRecords.sanitizeSecretRecord(
    { id: "secret-1", createdAt: "2026-07-31" },
    { images: [{ image_url: "one.jpg" }], defaultSortOrder: 123 }
  ),
  {
    id: "secret-1",
    userId: "",
    title: "",
    category: "\u672a\u5206\u7c7b",
    note: "",
    coverImage: "",
    coverPath: "",
    images: [{ image_url: "one.jpg" }],
    linkedPhotoId: "",
    sortOrder: 123,
    createdAt: "2026-07-31",
    updatedAt: "",
  }
);
const usageStorageValues = new Map([
  ["life-vlog-one", "abc"],
  ["other", "ignored"],
]);
const usageStorage = {
  get length() {
    return usageStorageValues.size;
  },
  key: (index) => [...usageStorageValues.keys()][index] || null,
  getItem: (key) => usageStorageValues.get(key) || null,
};
assert.equal(
  offlineRecords.getStorageUsageBytes(usageStorage),
  new Blob(["life-vlog-one", "abc"]).size
);

let lifecycleNow = 1_000;
let lifecycleVisibility = "visible";
let lifecycleForegroundRuns = 0;
let lifecyclePollRuns = 0;
let lifecycleIntervalsStarted = 0;
let lifecycleIntervalsCleared = 0;
const lifecycleDocument = new EventTarget();
const lifecycleWindow = new EventTarget();
Object.defineProperty(lifecycleDocument, "visibilityState", {
  get: () => lifecycleVisibility,
});
const lifecycleController = appLifecycle.createAppLifecycleController({
  documentTarget: lifecycleDocument,
  windowTarget: lifecycleWindow,
  now: () => lifecycleNow,
  foregroundThrottleMs: 10_000,
  onForeground: async () => {
    lifecycleForegroundRuns += 1;
  },
  onPoll: async () => {
    lifecyclePollRuns += 1;
  },
  setIntervalApi: () => {
    lifecycleIntervalsStarted += 1;
    return lifecycleIntervalsStarted;
  },
  clearIntervalApi: () => {
    lifecycleIntervalsCleared += 1;
  },
});
lifecycleController.start();
assert.equal(lifecycleController.getState().polling, true);
await lifecycleController.requestForeground();
await lifecycleController.requestForeground();
assert.equal(lifecycleForegroundRuns, 1);
lifecycleNow += 11_000;
await lifecycleController.requestForeground();
assert.equal(lifecycleForegroundRuns, 2);
lifecycleVisibility = "hidden";
lifecycleDocument.dispatchEvent(new Event("visibilitychange"));
assert.equal(lifecycleController.getState().polling, false);
await lifecycleController.requestPoll();
assert.equal(lifecyclePollRuns, 0);
lifecycleVisibility = "visible";
lifecycleNow += 11_000;
lifecycleDocument.dispatchEvent(new Event("visibilitychange"));
await Promise.resolve();
await Promise.resolve();
assert.equal(lifecycleController.getState().polling, true);
assert.equal(lifecycleForegroundRuns, 3);
lifecycleController.stop();
assert.equal(lifecycleController.getState().started, false);
assert.ok(lifecycleIntervalsStarted >= 2);
assert.ok(lifecycleIntervalsCleared >= 2);

let scheduledFrameCallback = null;
let frameRuns = 0;
let latestFrameValue = 0;
const frameScheduler = appLifecycle.createFrameScheduler(
  (value) => {
    frameRuns += 1;
    latestFrameValue = value;
  },
  {
    requestFrame: (callback) => {
      scheduledFrameCallback = callback;
      return 1;
    },
    cancelFrame: () => {
      scheduledFrameCallback = null;
    },
  }
);
frameScheduler(1);
frameScheduler(2);
frameScheduler(3);
assert.equal(frameScheduler.pending(), true);
assert.equal(frameRuns, 0);
scheduledFrameCallback();
assert.equal(frameRuns, 1);
assert.equal(latestFrameValue, 3);
assert.equal(frameScheduler.pending(), false);

let activeMediaFetches = 0;
let maxActiveMediaFetches = 0;
const fakeMediaResponse = {
  ok: true,
  type: "basic",
  headers: { get: () => "1" },
  clone() {
    return this;
  },
};
const fakeMediaCache = {
  keys: async () => [],
  match: async () => null,
  put: async () => {},
  delete: async () => true,
};
const serializedMediaCache = mediaCache.createMediaCacheService({
  appCachePrefix: "app-",
  diaryCacheName: "diary",
  secretCacheName: "secret",
  legacyCacheName: "legacy",
  cacheStorage: {
    open: async () => fakeMediaCache,
    keys: async () => [],
  },
  fetchApi: async () => {
    activeMediaFetches += 1;
    maxActiveMediaFetches = Math.max(maxActiveMediaFetches, activeMediaFetches);
    await new Promise((resolve) => setTimeout(resolve, 5));
    activeMediaFetches -= 1;
    return fakeMediaResponse;
  },
  RequestApi: class {
    constructor(url) {
      this.url = url;
    }
  },
  navigatorApi: {},
});
await Promise.all([
  serializedMediaCache.fillWithinCapacity("diary", ["one.jpg"], 100, 1),
  serializedMediaCache.fillWithinCapacity("diary", ["two.jpg"], 100, 1),
]);
assert.equal(maxActiveMediaFetches, 1);

const rollingEntries = new Map([
  ["https://example.com/old-1.jpg", {
    ok: true,
    type: "basic",
    headers: { get: () => "40" },
    clone() { return this; },
  }],
  ["https://example.com/old-2.jpg", {
    ok: true,
    type: "basic",
    headers: { get: () => "40" },
    clone() { return this; },
  }],
]);
const rollingCache = {
  keys: async () => [...rollingEntries.keys()].map((url) => ({ url })),
  match: async (request) => rollingEntries.get(typeof request === "string" ? request : request.url) || null,
  put: async (request, response) => rollingEntries.set(request.url, response),
  delete: async (request) => rollingEntries.delete(typeof request === "string" ? request : request.url),
};
const rollingMediaCache = mediaCache.createMediaCacheService({
  appCachePrefix: "app-",
  diaryCacheName: "diary",
  secretCacheName: "secret",
  legacyCacheName: "legacy",
  cacheStorage: {
    open: async () => rollingCache,
    keys: async () => ["diary"],
  },
  fetchApi: async () => ({
    ok: true,
    type: "basic",
    headers: { get: () => "40" },
    clone() { return this; },
  }),
  RequestApi: class {
    constructor(url) {
      this.url = url;
    }
  },
  navigatorApi: {},
});
await rollingMediaCache.fillWithinCapacity(
  "diary",
  ["https://example.com/new.jpg", "https://example.com/old-2.jpg"],
  80,
  1
);
assert.equal(rollingEntries.has("https://example.com/new.jpg"), true);
assert.equal(rollingEntries.has("https://example.com/old-2.jpg"), true);
assert.equal(rollingEntries.has("https://example.com/old-1.jpg"), false);

const memoryStorage = new Map();
const preferenceStore = preferencesStoreModule.createPreferenceStore({
  storage: {
    getItem: (key) => memoryStorage.has(key) ? memoryStorage.get(key) : null,
    setItem: (key, value) => memoryStorage.set(key, value),
  },
});
preferenceStore.writeScoped("theme", "user-1", "dark");
assert.equal(preferenceStore.readScoped("theme", "user-1", "light"), "dark");
assert.equal(
  preferenceStore.readEnum("layout", ["single", "double"], "double", { scope: "user-1" }),
  "double"
);
preferenceStore.writeJson("tools", ["food", "secret"], { scope: "user-1" });
assert.deepEqual(
  preferenceStore.readJson("tools", [], { scope: "user-1" }),
  ["food", "secret"]
);
assert.equal(gamificationDomain.getVipExpMultiplier(0), 1);
assert.equal(gamificationDomain.getVipExpMultiplier(5), 1.5);
assert.equal(gamificationDomain.getDailyLoginReward(1, 0), 25);
assert.ok(gamificationDomain.getDailyLoginReward(7, 0) > 25);

function createFakeDatabase() {
  const calls = [];
  const result = { data: [{ id: "row-1" }], error: null };
  function query(tableName) {
    const chain = {
      delete() {
        calls.push(["delete", tableName]);
        return chain;
      },
      eq(column, value) {
        calls.push(["eq", column, value]);
        return chain;
      },
      in(column, value) {
        calls.push(["in", column, value]);
        return chain;
      },
      insert(payload) {
        calls.push(["insert", tableName, payload]);
        return chain;
      },
      limit(value) {
        calls.push(["limit", value]);
        return chain;
      },
      maybeSingle() {
        calls.push(["maybeSingle"]);
        return chain;
      },
      order(column, options) {
        calls.push(["order", column, options]);
        return chain;
      },
      select(columns) {
        calls.push(["select", tableName, columns]);
        return chain;
      },
      single() {
        calls.push(["single"]);
        return chain;
      },
      update(payload) {
        calls.push(["update", tableName, payload]);
        return chain;
      },
      upsert(payload, options) {
        calls.push(["upsert", tableName, payload, options]);
        return chain;
      },
      then(resolve) {
        resolve(result);
      },
    };
    return chain;
  }
  return {
    calls,
    from(tableName) {
      calls.push(["from", tableName]);
      return query(tableName);
    },
    rpc(name, args) {
      calls.push(["rpc", name, args]);
      return Promise.resolve(result);
    },
  };
}

const fakeDatabase = createFakeDatabase();
const householdRepository = householdRepositoryModule.createHouseholdRepository({
  getDatabase: () => fakeDatabase,
  getSession: () => ({ user: { id: "user-1" } }),
});
await householdRepository.list("recipes", {
  filters: { user_id: "user-1" },
  order: [{ column: "created_at", ascending: false }],
  limit: 10,
});
assert.deepEqual(fakeDatabase.calls.slice(0, 4), [
  ["from", "recipes"],
  ["select", "recipes", "*"],
  ["eq", "user_id", "user-1"],
  ["order", "created_at", { ascending: false }],
]);
await householdRepository.updateOwned(
  "gratitude_notes",
  { body: "谢谢" },
  { id: "note-1" }
);
assert.ok(
  fakeDatabase.calls.some(
    (call) => call[0] === "eq" && call[1] === "user_id" && call[2] === "user-1"
  )
);
await assert.rejects(
  () => householdRepository.list("unknown_table"),
  /不允许访问数据表/
);

const sortedDiaryIds = diaryDomain
  .sortDiaryEntries([
    { id: "normal-new", created_at: "2026-07-30T10:00:00Z" },
    { id: "featured", is_featured: true, created_at: "2026-07-20T10:00:00Z" },
    { id: "pinned", is_pinned: true, created_at: "2026-07-10T10:00:00Z" },
    { id: "normal-old", created_at: "2026-07-01T10:00:00Z" },
  ])
  .map((entry) => entry.id);
assert.deepEqual(sortedDiaryIds, ["pinned", "featured", "normal-new", "normal-old"]);
assert.deepEqual(
  diaryDomain
    .filterDiaryEntries(
      [
        { id: "match", text: "东京 深夜 拉面" },
        { id: "partial", text: "东京 散步" },
      ],
      "东京 拉面",
      (entry) => entry.text
    )
    .map((entry) => entry.id),
  ["match"]
);
assert.equal(
  diaryDomain.isDiaryWithinDays(
    { created_at: "2026-07-25T23:00:00Z" },
    7,
    new Date("2026-07-31T12:00:00+09:00")
  ),
  true
);
assert.equal(
  diaryDomain.isDiaryWithinDays(
    { created_at: "2026-07-24T23:00:00Z" },
    7,
    new Date("2026-07-31T12:00:00+09:00")
  ),
  false
);

const taggedSecretImage = secretDomain.addSecretImageTag(
  { image_url: "one.jpg", tags: [secretDomain.DEFAULT_SECRET_PHOTO_TAG] },
  "旅行"
);
assert.deepEqual(taggedSecretImage.tags, ["旅行"]);
assert.deepEqual(secretDomain.addSecretImageTag(taggedSecretImage, "夜景").tags, [
  "旅行",
  "夜景",
]);
assert.deepEqual(
  secretDomain.removeSecretImageTag(
    secretDomain.removeSecretImageTag(
      secretDomain.addSecretImageTag(taggedSecretImage, "夜景"),
      "旅行"
    ),
    "夜景"
  ).tags,
  [secretDomain.DEFAULT_SECRET_PHOTO_TAG]
);
assert.deepEqual(
  secretDomain.normalizeSecretPhotoTags({
    tag: secretDomain.DEFAULT_SECRET_PHOTO_TAG,
    tags: ["旅行"],
  }),
  ["旅行"]
);
assert.equal(
  secretDomain.normalizeSecretImages([
    {
      image_url: "one.jpg",
      tags: ["旅行", secretDomain.FAVORITE_SECRET_PHOTO_TAG],
    },
  ])[0].favorite,
  true
);
const secretEntries = [
  { index: 0, image: { uploadedAt: "2026-07-02T00:00:00Z" } },
  { index: 1, image: { uploadedAt: "2026-07-01T00:00:00Z" } },
];
assert.deepEqual(
  secretDomain.sortSecretDisplayEntries(secretEntries, true).map((entry) => entry.index),
  [1, 0]
);
assert.deepEqual(
  secretDomain.sortSecretDisplayEntries(secretEntries, false).map((entry) => entry.index),
  [0, 1]
);
assert.equal(secretDomain.isSecretNumericTag("01"), true);
assert.equal(secretDomain.isSecretNumericTag(" 002 "), true);
assert.equal(secretDomain.isSecretNumericTag("A02"), false);
assert.equal(
  secretDomain.getSecretImageNumericOrder({ tags: ["旅行", "09", "02"] }),
  9
);
const numberedSecretEntries = [
  { index: 0, image: { tags: ["01"] } },
  { index: 1, image: { tags: ["12"] } },
  { index: 2, image: { tags: ["02"] } },
  { index: 3, image: { tags: [secretDomain.DEFAULT_SECRET_PHOTO_TAG] } },
];
assert.deepEqual(
secretDomain.sortSecretDisplayEntries(numberedSecretEntries, false).map((entry) => entry.index),
  [0, 2, 1, 3]
);
assert.deepEqual(
  secretDomain.sortSecretDisplayEntries(numberedSecretEntries, true).map((entry) => entry.index),
  [0, 2, 1, 3]
);

const aggregatedNotifications = notificationDomain.aggregateInteractionNotifications([
  {
    id: "n1",
    actor_id: "user-2",
    type: "reply",
    photo_id: "photo-1",
    created_at: "2026-07-31T10:00:00Z",
    is_read: true,
  },
  {
    id: "n2",
    actor_id: "user-2",
    type: "reply",
    photo_id: "photo-1",
    created_at: "2026-07-31T10:05:00Z",
    is_read: false,
  },
  {
    id: "n3",
    actor_id: "user-2",
    type: "reply",
    photo_id: "photo-1",
    created_at: "2026-07-31T10:30:00Z",
    is_read: false,
  },
]);
assert.equal(aggregatedNotifications.length, 2);
assert.equal(aggregatedNotifications[0].aggregateCount, 2);
assert.equal(aggregatedNotifications[0].is_read, false);
assert.equal(
  notificationDomain.buildNotificationText(
    { type: "reply", aggregateCount: 3 },
    "蛋"
  ),
  "蛋 回复了你 3 次"
);

const uploadStill = { name: "IMG_0001.HEIC", type: "image/heic", size: 10, lastModified: 1 };
const uploadMotion = { name: "IMG_0001.MOV", type: "video/quicktime", size: 20, lastModified: 2 };
const uploadVideo = { name: "weekend.mp4", type: "video/mp4", size: 30, lastModified: 3 };
const uploadUnsupported = { name: "notes.txt", type: "text/plain", size: 4, lastModified: 4 };
const uploadPairing = diaryUploadDomain.pairDiaryUploadFiles([
  uploadStill,
  uploadMotion,
  uploadVideo,
  uploadUnsupported,
]);
assert.equal(uploadPairing.entries.length, 1);
assert.equal(uploadPairing.entries[0].motionFile, uploadMotion);
assert.deepEqual(uploadPairing.videoFiles, [uploadVideo]);
assert.deepEqual(uploadPairing.unsupportedFiles, [uploadUnsupported]);
assert.equal(diaryUploadDomain.getDiaryUploadEntryCount(uploadPairing), 2);
assert.equal(diaryUploadDomain.getDiaryUploadFileExtension(uploadMotion), "mov");
assert.equal(diaryUploadDomain.isDiaryUploadStillFile(uploadStill), true);
assert.equal(diaryUploadDomain.isDiaryUploadMotionFile(uploadVideo), true);
const previewItems = diaryUploadDomain.getDiaryUploadPreviewItems(
  [uploadStill, uploadMotion, uploadVideo],
  ["https://example.com/photo.jpg"]
);
assert.deepEqual(previewItems.items.map((item) => item.kind), ["live", "video", "link"]);
const uploadPayload = diaryUploadDomain.createDiaryUploadPayload({
  id: "upload-1",
  createdAt: "2026-08-23T00:00:00.000Z",
  title: "周末",
  userId: "user-1",
  files: [uploadStill, uploadMotion],
});
assert.equal(uploadPayload.files[0].kind, "live");
assert.equal(uploadPayload.files[0].motionFile, uploadMotion);
assert.equal(uploadPayload.id, "upload-1");
assert.deepEqual(foodWheelView.normalizeFoodOptions([" 拉面 ", "拉面", "寿司"]), ["拉面", "寿司"]);
assert.deepEqual(
  foodWheelView.buildFoodWheelOptions(["拉面"], [{ name: "寿司" }, { name: "拉面" }]),
  ["拉面", "寿司"]
);
assert.match(recipeView.renderRecipeList(["<盐>"], "空"), /&lt;盐&gt;/);
assert.match(recipeView.renderRecipeCover({ name: "汤", coverImage: "" }), /recipe-cover placeholder/);
const togetherMetrics = anniversaryView.getAnniversaryMetrics(
  { type: "together", date: "2026-08-20" },
  new Date(2026, 7, 23)
);
assert.equal(togetherMetrics.value, 3);
assert.equal(togetherMetrics.unit, "天");
assert.deepEqual(
  weekendPlansView.sortWeekendPlans([
    { id: "done", done: true, date: "2026-08-20" },
    { id: "later", done: false, date: "2026-08-25" },
    { id: "first", done: false, date: "2026-08-24" },
  ]).map((plan) => plan.id),
  ["first", "later", "done"]
);
assert.equal(gratitudeView.normalizeGratitudeColor("#bad", new Set(["#good"])), "#2f6b3b");
assert.equal(notificationView.getUnreadNotificationCount([{ is_read: false }, { is_read: true }]), 1);
assert.equal(vipCenter.getVipLevelByRecharge(68).level, 3);
assert.equal(vipCenter.getVipLevel(5).limit, 18);
assert.equal(vipCenter.formatMoney(29.4), "¥29");
assert.deepEqual(
  diaryGalleryView.getDiaryGalleryEmptyState({
    filter: "favorites",
    signedIn: true,
    favoriteStatus: "loading",
  }),
  { message: "正在同步收藏…", loading: true }
);
assert.equal(diaryGalleryView.getPhotoAspectRatio({ width: 2000, height: 1000 }), "1.550");
assert.equal(
  diaryGalleryView.shouldAutoplayDiaryFeedMedia(4, { mobile: true, connection: null }),
  true
);
assert.equal(
  diaryGalleryView.shouldAutoplayDiaryFeedMedia(5, { mobile: true, connection: null }),
  false
);
assert.equal(
  diaryGalleryView.shouldAutoplayDiaryFeedMedia(0, {
    mobile: false,
    connection: { saveData: true },
  }),
  false
);
assert.match(
  diaryGalleryView.renderPhotoMedia(
    [{ image_url: "one.jpg" }, { image_url: "two.jpg" }],
    "相册",
    0,
    { mobile: false }
  ),
  /media-count[\s\S]*2 张/
);
assert.match(
  diaryGalleryView.renderPhotoMedia(
    [{ type: "video", image_url: "poster.jpg", video_url: "clip.mp4" }],
    "视频",
    0,
    { mobile: false }
  ),
  /live-photo-badge[\s\S]*VIDEO/
);
assert.match(
  diaryGalleryView.renderPhotoMedia(
    [{ image_url: "one.jpg" }, { type: "video", image_url: "poster.jpg", video_url: "clip.mp4" }],
    "混合相册",
    0,
    { mobile: false }
  ),
  /multi-motion-dot/
);
const mobileCommentMarkup = mobileDiaryView.renderMobileDiaryCommentTree({
  comments: [{ id: "c1", user_id: "owner", body: "<你好>", created_at: "2026-08-23T00:00:00Z" }],
  photoOwnerId: "owner",
  currentUserId: "owner",
  getAuthorName: () => "作者",
  renderAvatar: () => "<i></i>",
});
assert.match(mobileCommentMarkup, /photo-comment-author-badge/);
assert.match(mobileCommentMarkup, /&lt;你好&gt;/);
assert.match(mobileCommentMarkup, /data-mobile-diary-delete-comment="c1"/);
assert.match(
  mobileDiaryView.buildMobileDiaryPageMarkup({
    photo: { id: "p1", user_id: "owner", title: "标题", note: "正文", created_at: "2026-08-23T00:00:00Z" },
    images: [{ image_url: "one.jpg" }],
    signedIn: true,
    currentUserId: "owner",
    canComment: true,
    favorite: true,
    getDisplayTitle: (photo) => photo.title,
    getPlainNote: (photo) => photo.note,
    getAuthorName: () => "作者",
    renderAvatar: () => "<i></i>",
  }),
  /data-mobile-diary-favorite[\s\S]*data-mobile-diary-comment-form/
);
const mobileVlogMarkup = mobileDiaryView.buildMobileDiaryPageMarkup({
  photo: { id: "v1", user_id: "owner", title: "有声 VLOG", category: "VLOG", created_at: "2026-08-24T00:00:00Z" },
  images: [{ type: "video", image_url: "poster.jpg", video_url: "vlog.mp4" }],
  getDisplayTitle: (photo) => photo.title,
  getPlainNote: () => "",
  getAuthorName: () => "作者",
  renderAvatar: () => "<i></i>",
});
assert.match(mobileVlogMarkup, /class="mobile-diary-video"[\s\S]*playsinline/);
assert.doesNotMatch(mobileVlogMarkup, /class="mobile-diary-video"[^>]*(?:autoplay|muted|loop|controls)/);
assert.match(mobileVlogMarkup, /mobile-diary-media-badge[\s\S]*VIDEO/);
const mobileLivePhotoMarkup = mobileDiaryView.buildMobileDiaryPageMarkup({
  photo: { id: "l1", user_id: "owner", title: "Live Photo", created_at: "2026-08-24T00:00:00Z" },
  images: [{ type: "live", image_url: "still.jpg", motion_url: "motion.mov" }],
  getDisplayTitle: (photo) => photo.title,
  getPlainNote: () => "",
  getAuthorName: () => "作者",
  renderAvatar: () => "<i></i>",
});
assert.match(mobileLivePhotoMarkup, /class="mobile-diary-motion"[^>]*autoplay muted loop/);
assert.match(mobileLivePhotoMarkup, /mobile-diary-media-badge[\s\S]*LIVE/);
assert.equal(mediaMetadata.isDiaryLiveMedia({ type: "video", video_url: "vlog.mp4" }), false);
assert.equal(mediaMetadata.isDiaryLiveMedia({ type: "live", motion_url: "motion.mov" }), true);
assert.equal(mediaMetadata.isDiaryMotionMedia({ type: "video", video_url: "vlog.mp4" }), true);
assert.equal(mediaMetadata.isDiaryMotionMedia({ type: "image", image_url: "still.jpg" }), false);
assert.equal(mediaGestureDomain.clampNumber(8, 1, 6), 6);
assert.equal(
  mediaGestureDomain.getTouchDistance([
    { clientX: 0, clientY: 0 },
    { clientX: 3, clientY: 4 },
  ]),
  5
);
assert.deepEqual(
  mediaGestureDomain.getTouchCenter([
    { clientX: 0, clientY: 2 },
    { clientX: 4, clientY: 6 },
  ]),
  { x: 2, y: 4 }
);
assert.equal(mediaGestureDomain.getMobileBackEdge(2, { mobile: true, viewportWidth: 400 }), "left");
assert.equal(mediaGestureDomain.getMobileBackEdge(398, { mobile: true, viewportWidth: 400 }), "right");
assert.equal(mediaGestureDomain.getMobileBackEdge(200, { mobile: true, viewportWidth: 400 }), "");
const originalDateNow = Date.now;
Date.now = () => 1000;
assert.equal(
  mediaGestureDomain.isEdgeBackSwipe(
    { edge: "left", x: 0, y: 10, time: 100 },
    { clientX: 100, clientY: 20 }
  ),
  true
);
Date.now = originalDateNow;
assert.match(
  secretGalleryView.buildSecretFolderListMarkup({
    folders: [{ id: "all", name: "全部相册", count: 2, virtual: true, isAll: true }],
    activeFolderId: "all",
  }),
  /is-all[\s\S]*全部相册[\s\S]*2 个相册/
);
assert.match(
  secretGalleryView.buildSecretFavoritesMarkup([
    { item: { id: "a1", title: "旅行" }, image: { image_url: "photo.jpg", tags: ["夜景"] } },
  ]),
  /FAVORITES[\s\S]*旅行 · 夜景/
);
assert.match(
  secretGalleryView.buildSecretCollectionMarkup({
    activeFolderName: "旅行",
    activeFolder: { id: "f1" },
    visible: [{ id: "a1", title: "东京", images: [{ image_url: "photo.jpg" }] }],
  }),
  /旅行[\s\S]*1 个相册，1 件展品[\s\S]*data-secret-folder-rename[\s\S]*东京/
);
assert.match(
  secretGalleryView.buildSecretAlbumMarkup({
    item: { id: "a1", title: "东京" },
    images: [{ image_url: "photo.jpg", tags: ["夜景"] }],
    displayEntries: [{ image: { image_url: "photo.jpg", tags: ["夜景"] }, index: 0 }],
    selectionMode: true,
    selectedIndexes: new Set([0]),
    mobile: true,
  }),
  /已选 1 张[\s\S]*data-secret-set-cover[\s\S]*夜景/
);
assert.match(accountViewModule, /export function buildSettingsFamilyMarkup/);
assert.match(
  accountView.buildSettingsAccountOverviewMarkup({
    signedIn: true,
    displayName: "测试账号",
    username: "tester",
    avatarMarkup: "<i></i>",
  }),
  /测试账号[\s\S]*@tester[\s\S]*Cloudflare/
);
assert.match(
  accountView.buildSettingsFamilyMarkup({
    signedIn: true,
    familyInfo: { name: "测试家庭", isOwner: true },
    members: [{ user_id: "u1", username: "成员", role: "owner" }],
    currentUserId: "u1",
    invitations: [],
    renderAvatar: () => "<i></i>",
  }),
  /测试家庭[\s\S]*成员（我）[\s\S]*data-settings-signup-invite/
);
assert.match(
  photoDialogView.renderSecretDialogControls({ favorite: true, tags: ["夜景"] }),
  /已收藏[\s\S]*data-secret-dialog-remove-tag="夜景"/
);
assert.match(familyActivityViewModule, /export function buildWeeklyReviewMarkup/);
assert.match(
  familyActivityView.buildWeeklyReviewMarkup({
    summary: "本周很好",
    photoCount: 2,
    interactionCount: 3,
    completedWishCount: 1,
    weekendCount: 1,
    activity: [{ type: "日记", title: "散步", userId: "u1", date: "2026-08-23T00:00:00Z", photoId: "p1" }],
    getAuthorName: () => "成员",
  }),
  /本周很好[\s\S]*2[\s\S]*3[\s\S]*data-weekly-photo="p1"[\s\S]*散步/
);
assert.match(gamificationViewModule, /export function buildLevelWorkspaceMarkup/);
assert.equal(
  gamificationView.getAchievementConditionText({
    unlocked: false,
    detail: "发布 5 篇日记",
    current: 2,
    target: 5,
  }),
  "达成条件：发布 5 篇日记。当前 2 / 5，还差 3。"
);
assert.match(
  gamificationView.buildLevelWorkspaceMarkup({
    sections: [{ id: "ranking", label: "家庭排行", icon: "榜" }],
    activeSection: "ranking",
    content: "排行内容",
  }),
  /level-workspace[\s\S]*active[\s\S]*家庭排行[\s\S]*排行内容/
);
assert.equal(
  accountSyncDomain.resolvePreferredDisplayName({
    loginName: "login",
    sessionDisplayName: "昵称",
    profileDisplayName: "login",
  }),
  "昵称"
);
assert.deepEqual(
  accountSyncDomain.mergeLoginState({
    cloudDate: "2026-08-20",
    cloudStreak: 2,
    localDate: "2026-08-21",
    localStreak: 5,
    today: "2026-08-23",
  }),
  { lastLoginDate: "2026-08-21", loginStreak: 5 }
);

const favoriteWrites = [];
const favoriteStore = photoFavoritesDomain.createPhotoFavoritesStore({
  repository: {
    async listFavorites() {
      return { data: [{ photo_id: "photo-1" }, { photo_id: " photo-2 " }, { photo_id: "" }], error: null };
    },
    async setFavorite(photoId, favorite) {
      favoriteWrites.push([photoId, favorite]);
      return photoId === "broken" ? { error: new Error("offline") } : { error: null };
    },
  },
  logger: { warn() {} },
});
favoriteStore.reset("loading");
assert.equal(favoriteStore.status, "loading");
await favoriteStore.synchronize();
assert.deepEqual(favoriteStore.sortedIds(), ["photo-1", "photo-2"]);
assert.equal(favoriteStore.cloudAvailable, true);
assert.equal(favoriteStore.has({ id: "photo-1" }), true);
assert.deepEqual(await favoriteStore.toggle("photo-1"), { favorite: false, error: null });
assert.equal(favoriteStore.has("photo-1"), false);
assert.deepEqual(await favoriteStore.toggle("photo-3"), { favorite: true, error: null });
assert.equal(favoriteStore.has("photo-3"), true);
const failedFavorite = await favoriteStore.toggle("broken");
assert.equal(failedFavorite.error.message, "offline");
assert.equal(favoriteStore.status, "error");
assert.equal(favoriteStore.cloudAvailable, false);
assert.deepEqual(favoriteWrites, [
  ["photo-1", false],
  ["photo-3", true],
  ["broken", true],
]);
const wishlistState = wishlistView.buildWishlistView([
  { id: "normal", done: false, priority: "普通", date: "2026-08-24", createdAt: "2026-08-20" },
  { id: "soon", done: false, priority: "想尽快", date: "2026-08-25", createdAt: "2026-08-21" },
  { id: "must", done: false, priority: "一定要做", date: "2026-09-01", createdAt: "2026-08-22" },
  { id: "done", done: true, priority: "普通", createdAt: "2026-08-23" },
]);
assert.equal(wishlistState.openCount, 3);
assert.equal(wishlistState.doneCount, 1);
assert.deepEqual(wishlistState.visibleWishes.map((wish) => wish.id), ["must", "soon", "normal"]);
assert.equal(wishlistView.buildWishlistView([], "done").emptyMessage, "已完成里还没有记录。完成心愿后会放到这里。");
assert.match(wishlistView.formatWishDate("2026-08-23"), /2026/);
assert.doesNotThrow(() => JSON.parse(manifestText));

console.log("Smoke checks passed.");

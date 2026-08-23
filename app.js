const CONFIG_KEY = "life-vlog-cloudflare-config";
import { confirmAction } from "./modules/confirm-dialog.js";
import { createOfflineCacheController } from "./modules/offline-cache-controller.js";
import { createAssetController } from "./modules/asset-controller.js";
import { createDiaryComposerController } from "./modules/diary-composer-controller.js";
import { createGamificationController } from "./modules/gamification-controller.js";
import { createProfilePreferencesController } from "./modules/profile-preferences-controller.js";
import { createSecretPinController } from "./modules/secret-pin-controller.js";
import { createSecretController } from "./modules/secret-controller.js";
import { createCloudflareBackend } from "./modules/cloudflare-client.js?v=20260811-010";
import { createMediaCacheService } from "./modules/media-cache.js";
import { createUploadQueue } from "./modules/upload-queue.js";
import { createPhotoFavoritesStore } from "./modules/photo-favorites.js";
import { formatWishDate } from "./modules/wishlist-view.js";
import { createWishlistController } from "./modules/wishlist-controller.js";
import { normalizeFoodOptions } from "./modules/food-wheel-view.js";
import { createFoodWheelController } from "./modules/food-wheel-controller.js";
import { createPushController } from "./modules/push-controller.js";
import { createAuthController } from "./modules/auth-controller.js";
import { createRecipeController } from "./modules/recipe-controller.js";
import { createAnniversaryController } from "./modules/anniversary-controller.js";
import {
  createWeekendController,
  getNextWeekendDate,
} from "./modules/weekend-controller.js";
import { createGratitudeController } from "./modules/gratitude-controller.js";
import { renderNotificationsView } from "./modules/notification-view.js";
import {
  getVipLevel,
  getVipLevelByRecharge,
} from "./modules/vip-center.js";
import {
  getDiaryGalleryEmptyState,
  prepareFeedImages,
  renderDiaryGalleryCards,
  updateReadMoreHints,
} from "./modules/diary-gallery-view.js";
import {
  buildMobileDiaryPageMarkup,
  createMobileDiaryPage,
  refreshMobileDiaryComments,
} from "./modules/mobile-diary-view.js";
import {
  clampNumber,
  getMobileBackEdge,
  getTouchCenter,
  getTouchDistance,
  isEdgeBackSwipe,
} from "./modules/media-gesture-domain.js";
import {
  bindSecretAlbumActions,
  bindSecretCollectionActions,
  bindSecretFavoritesActions,
  bindSecretFilterActions,
  buildSecretAlbumMarkup,
  buildSecretCategoryOptions,
  buildSecretCollectionMarkup,
  buildSecretFavoritesMarkup,
  buildSecretFilterMarkup,
  buildSecretFolderListMarkup,
  buildSecretFolderOptions,
} from "./modules/secret-gallery-view.js";
import {
  buildFamilyInvitationsMarkup,
  buildFamilyMembersMarkup,
  buildFamilyOutgoingInvitationsMarkup,
  buildSettingsAccountOverviewMarkup,
  buildSettingsFamilyMarkup,
  buildSettingsToolOrderMarkup,
} from "./modules/account-view.js";
import {
  bindSecretDialogControls as bindSecretDialogControlsView,
  fitDialogMedia,
  renderDialogPagination,
  renderSecretDialogControls as buildSecretDialogControls,
  setViewerStatus,
  updateDiaryViewerToolbar,
  updateSecretViewerToolbar,
} from "./modules/photo-dialog-view.js";
import {
  buildFamilyMemoryMarkup,
  buildFamilyTimelineMarkup,
  buildWeeklyReviewMarkup,
} from "./modules/family-activity-view.js";
import { configureCacheManagementUi } from "./modules/cache-management-view.js";
import {
  getProfileCapabilities,
  mergeLoginState,
  resolvePreferredDisplayName,
  resolvePreferredHomeName,
} from "./modules/account-sync-domain.js";
import { collectAppElements } from "./modules/app-elements.js";
import { refreshAdminStorage as refreshStorage } from "./modules/admin-storage.js";
import { createVlogMode, filterVlogPhotos } from "./modules/vlog-mode.js";
import {
  createDiaryRepository,
  createNotificationRepository,
  createSecretRepository,
  createWardrobeRepository,
} from "./modules/data-repositories.js?v=20260814-008";
import { createWardrobeController } from "./modules/wardrobe.js?v=20260811-005";
import {
  composeDiaryStoredNote,
  composeWeekendStoredNote,
  composeWishStoredNote,
  extractImageUrls,
  getClipboardImageUrl,
  getDiaryMediaPosterUrl,
  getDiaryMediaType,
  getDiaryMediaVideoUrl,
  isDiaryLiveMedia,
  parseDiaryStoredImages,
  parseWeekendStoredNote,
  parseWishStoredNote,
  stripDiaryMediaMetadata,
} from "./modules/media-metadata.js";
import {
  recipeFromCloudRow,
  secretFolderFromCloudRow,
  secretFromCloudRow,
  secretToCloudRow,
  weekendFromCloudRow,
  wishFromCloudRow,
} from "./modules/cloud-models.js";
import {
  createImageService,
  getVideoContentType,
  getVideoFileExtension,
} from "./modules/image-service.js";
import { createPreferenceStore } from "./modules/preferences-store.js";
import { createHouseholdRepository } from "./modules/household-repository.js";
import {
  startDiaryMotionVideo,
  stopDiaryMotionVideo,
} from "./modules/diary-video-layout.js";
import {
  createAppLifecycleController,
  createFrameScheduler,
} from "./modules/app-lifecycle.js";
import {
  escapeHtml,
  formatCommentTime,
  formatDate,
  formatDateTime,
  formatFileSize,
  getInitial,
  slugify,
} from "./modules/ui-formatters.js";
import {
  filterDiaryEntries,
  isDiaryWithinDays,
  normalizeDiarySearchText,
  sortDiaryEntries,
} from "./modules/diary-domain.js";
import { buildNotificationText } from "./modules/notification-domain.js";
import {
  DEFAULT_SECRET_PHOTO_TAG,
  FAVORITE_SECRET_PHOTO_TAG,
  STORY_SECRET_PHOTO_TAG,
  addSecretImageTag,
  getDefaultSecretSortOrder,
  getSecretImageNumericOrder,
  isSecretNumericTag,
  normalizeSecretImages,
  normalizeSecretPhotoTag,
  normalizeSecretPhotoTags,
  removeSecretImageTag,
  secretImageHasTag,
  setSecretImageTags,
  sortSecretDisplayEntries as sortSecretEntriesByAlbumOrder,
  sortSecretItems,
} from "./modules/secret-domain.js?v=20260810-004";

const CLOUDFLARE_AUTH_KEY = "life-vlog-cloudflare-auth";
const AUTH_BACKUP_DB = "life-vlog-auth-backup";
const AUTH_BACKUP_STORE = "session";
const THEME_KEY = "life-vlog-theme";
const HOME_NAME_KEY = "life-vlog-home-name";
const FAMILY_TAGLINE_KEY = "life-vlog-family-tagline";
const DEFAULT_FAMILY_TAGLINE = "收藏生活里值得回看的照片、味道和还没完成的小愿望。";
const VIP_RECHARGE_KEY = "life-vlog-vip-recharge";
const RECIPES_KEY = "life-vlog-recipes";
const WEEKEND_KEY = "life-vlog-weekend-plans";
const ANNIVERSARY_KEY = "life-vlog-anniversaries";
const FOOD_OPTIONS_KEY = "life-vlog-food-options";
const TODAY_POSTS_SEEN_KEY = "life-vlog-today-posts-seen";
const PHOTO_FEED_CACHE_KEY = "life-vlog-photo-feed-cache";
const SECRET_ITEMS_CACHE_KEY = "life-vlog-secret-items-cache";
const SECRET_PIN_KEY = "life-vlog-secret-pin";
const SECRET_UNLOCK_KEY = "life-vlog-secret-unlock";
const SECRET_UNLOCK_MAX_MS = 15 * 60 * 1000;
const LEGACY_MEDIA_CACHE_NAME = "life-vlog-media-cache";
const DIARY_MEDIA_CACHE_NAME = "life-vlog-diary-image-cache";
const SECRET_MEDIA_CACHE_NAME = "life-vlog-secret-media-cache";
const DIARY_CACHE_MB_KEY = "life-vlog-diary-cache-mb";
const SECRET_CACHE_MB_KEY = "life-vlog-secret-cache-mb";
const preferenceStore = createPreferenceStore();
const MEDIA_CACHE_POLICY_KEY = "life-vlog-media-cache-policy";
const DIARY_DRAFT_KEY = "life-vlog-diary-draft";
const UPLOAD_QUEUE_DB = "life-vlog-upload-queue";
const UPLOAD_QUEUE_STORE = "diary-uploads";
const mediaCacheService = createMediaCacheService({
  appCachePrefix: "life-vlog-site-",
  diaryCacheName: DIARY_MEDIA_CACHE_NAME,
  secretCacheName: SECRET_MEDIA_CACHE_NAME,
  legacyCacheName: LEGACY_MEDIA_CACHE_NAME,
});
const diaryUploadQueue = createUploadQueue({
  dbName: UPLOAD_QUEUE_DB,
  storeName: UPLOAD_QUEUE_STORE,
  onChanged: () => void renderUploadCenter(),
});
const EXPERIENCE_KEY = "life-vlog-experience";
const TODAY_EXPERIENCE_KEY = "life-vlog-today-experience";
const THANKS_COLOR_KEY = "life-vlog-thanks-color";
const AVATAR_CACHE_KEY = "life-vlog-avatar-cache";
const MOBILE_FEED_LAYOUT_KEY = "life-vlog-mobile-feed-layout";
const MOBILE_SECRET_LAYOUT_KEY = "life-vlog-mobile-secret-layout";
const THANKS_COLORS = new Set(["#2f6b3b", "#d6544d", "#2e6da4", "#81559b", "#a66b12"]);
const DEFAULT_THANKS_COLOR = "#2f6b3b";
const PHOTO_CATEGORIES = ["日常", "旅行", "食物", "卢浮宫", "城市"];
const BUCKET = "life-photos";
const PRODUCTION_URL = "https://life-vlog-site.pages.dev/";
const R2_UPLOAD_ENDPOINT = "https://life-vlog-r2-upload.xiudan320-life.workers.dev";
const R2_PUBLIC_URL = "https://pub-47959f26cde042c3b37bc0f8f3f441ce.r2.dev";
const PAGE_SIZE = 6;
const VIP_USERS = new Set(["xiao980320", "xiudan320"]);
const PHOTO_COMMENT_PREVIEW_LIMIT = 3;
const METADATA_CACHE_ITEM_LIMIT = 120;
const AUTO_DIARY_CACHE_ITEM_LIMIT = 20;
const DEFAULT_DIARY_CACHE_MB = 100;
const DEFAULT_SECRET_CACHE_MB = 300;
const MIN_CACHE_MB = 20;
const MAX_CACHE_MB = 2000;
const SECRET_ALBUM_IMAGE_LIMIT = 80;
const DEFAULT_SECRET_SORT_STEP = 1000;
const TOOL_DOCK_ORDER_KEY = "life-vlog-tool-dock-order";
const TOOL_DOCK_DEFAULT_ORDER = ["food", "recipes", "anniversary", "memory", "weekly", "timeline", "secret", "thanks"];
const TOOL_DOCK_LABELS = {
  food: { title: "今日吃什么", subtitle: "转盘" },
  recipes: { title: "菜谱", subtitle: "家庭菜谱" },
  anniversary: { title: "时间纪念册", subtitle: "纪念日" },
  memory: { title: "随机回忆", subtitle: "抽一篇日记" },
  weekly: { title: "本周回顾", subtitle: "共同生活周报" },
  timeline: { title: "家庭足迹", subtitle: "动态与回顾" },
  secret: { title: "秘藏", subtitle: "相册展览" },
  thanks: { title: "留言", subtitle: "留下生活里的话" },
};
const MOBILE_DIALOG_BREAKPOINT = 920;
const SECRET_ALL_FOLDER_ID = "all";
const SECRET_FAVORITES_FOLDER_ID = "favorites";
const DEFAULT_FOOD_OPTIONS = ["拉面", "寿喜烧", "咖喱饭", "烤肉", "火锅", "寿司", "麻婆豆腐", "披萨"];
const GENERATED_TITLE_PREFIXES = ["今日小星星", "软乎乎的一天", "闪闪生活碎片", "快乐收藏夹"];

const demoPhotos = [
  {
    title: "雨后的街角",
    note: "路灯亮起来的时候，整条街像刚洗过一样安静。",
    category: "城市",
    taken_at: "2026-06-01",
    image_url:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "早餐小记",
    note: "慢一点吃饭，今天就从这里开始。",
    category: "食物",
    taken_at: "2026-05-28",
    image_url:
      "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "海边风很大",
    note: "照片里没有声音，但那天的风应该会一直记得。",
    category: "旅行",
    taken_at: "2026-05-18",
    image_url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  },
];

let cloudDb = null;
let session = null;
let photos = [];
let recipes = [];
let wishes = [];
let weekendPlans = [];
let anniversaries = [];
let gratitudeNotes = [];
let secretItems = [];
let secretFolders = [];
let familyInfo = null;
let familyMembers = [];
let familyInvitations = [];
let familyMemberMap = new Map();
let familyLevelProfiles = new Map();
let levelGuideVisible = false;
let activeDialogPhoto = null;
let mobileDiaryPhoto = null;
let mobileDiaryPage = null;
let mobileDiaryRestoreScrollY = 0;
let mobileDiaryImageIndex = 0;
let mobileDiaryReplyToId = null;
let mobileDiaryBackSwipeStart = null;
let mobileDiaryImageSwipeStart = null;
let mobileDiarySuppressImageClickUntil = 0;
let photoComments = [];
let photoCommentPreviewMap = new Map();
let notifications = [];
let commentReplyToId = null;
let photosLoadPromise = null;
let notificationsLoadPromise = null;
let secretLoadPromise = null;
let lastSecretSyncAt = 0;
let galleryRenderSignature = "";
let lastAppBadgeCount = -1;
let pendingNewPhotos = [];
let dismissedFeedRefreshIds = new Set();
let feedRefreshCheckInFlight = false;
let returnToSettingsAfterDialog = false;
let activeSettingsSection = "settingsGeneral";
let dialogRestoreScrollY = 0;
let dialogRestorePhotoId = "";
let dialogRestorePhotoTop = 0;
let dialogRestoreSecretImageUrl = "";
let dialogRestoreElementTop = 0;
let foodOptions = [];
let activePage = "gallery";
let activeFilter = "全部";
const vlogMode = createVlogMode({
  canOpen: () => Boolean(session),
  onOpen: () => {
    activeFilter = "VLOG";
    switchPage("gallery");
    visiblePhotoCount = PAGE_SIZE;
    updateFilterChips();
    renderGallery();
    setUploadExpanded(false);
  },
  onClose: () => {
    if (activeFilter !== "VLOG") return;
    activeFilter = "全部";
    updateFilterChips();
  },
});
let activeSecretFilter = "全部";
let activeSecretAlbumId = "";
let activeSecretFolderId = SECRET_ALL_FOLDER_ID;
let secretDefaultFolderId = "";
let secretFolderContextMenu = null;
let secretAlbumContextMenu = null;
let secretSearchQuery = "";
let secretSelectionMode = false;
let selectedSecretImageIndexes = new Set();
let secretAlbumEditing = false;
let secretAppendExpanded = false;
let secretMobileToolsExpanded = false;
let diarySearchQuery = "";
let activeWishView = "open";
const activeUploadTasks = new Map();
let visiblePhotoCount = PAGE_SIZE;
let filteredPhotoCount = 0;
let showingCachedFeed = false;
let feedObserver = null;
let feedLoading = false;
let pullRefreshState = null;
let galleryMasonryObserver = null;
let galleryMasonryTimer = null;
let editingPhoto = null;
let editingImages = [];
let editingImageFiles = new Map();
let editingRemovedPaths = new Set();
let editingReplaceIndex = -1;
let editingPreviewUrls = [];
let dialogImages = [];
let dialogImageIndex = 0;
let dialogImageRequestId = 0;
let dialogSwipeStart = null;
let desktopImagePan = null;
let dialogBackSwipeStart = null;
let globalMobileBackSwipeStart = null;
let secretImageGesture = null;
let secretImageZoom = { scale: 1, x: 0, y: 0 };
let diaryImageRotation = 0;
let secretViewerReturnFocus = null;
let secretViewerInfoOpen = false;
let secretViewerResizeTimer = null;
let suppressDialogImageClickUntil = 0;
let suppressDialogSwipeUntil = 0;
let dialogWheelAccumulator = 0;
let dialogWheelResetTimer = null;
let dialogWheelLockedUntil = 0;
let lockedDialogScrollY = 0;
let dialogLockUsesFixed = false;
let dialogRandomMode = false;
let dialogSecretSourceItem = null;
let activeSecretDialogItem = null;
let secretWheelDelta = 0;
let secretWheelLockedUntil = 0;
let photoDialogBackdrop = null;
let mobileDiaryImageViewerOpen = false;
let toolDockDragState = null;
let suppressToolDockClick = false;
let activeVipLevel = 1;
let weekendCloudAvailable = false;
let anniversaryCloudAvailable = false;
let secretCloudAvailable = false;
let photoFlagsCloudAvailable = false;
let foodOptionsCloudAvailable = false;
let profilePreferencesCloudAvailable = false;
let thanksColorCloudAvailable = false;
let cloudSyncAvailable = false;
let cloudSyncInFlight = null;
let syncedUserId = "";
let accountDataState = "idle";
let accountProfile = {
  rechargeTotal: 0,
  vipLevel: 0,
  experienceTotal: 0,
  lastLoginDate: "",
  loginStreak: 0,
  todayExperienceDate: "",
  todayExperienceAmount: 0,
  themePreference: "",
  homeName: "咻蛋之家",
  familyTagline: DEFAULT_FAMILY_TAGLINE,
  thanksColor: DEFAULT_THANKS_COLOR,
  avatarUrl: "",
  avatarPath: "",
  foodOptions: [],
};

const els = collectAppElements(document);

els.dateInput.valueAsDate = new Date();
els.weekendDateInput.value = getNextWeekendDate();

const cloudflareBackend = createCloudflareBackend({
  endpoint: R2_UPLOAD_ENDPOINT,
  publicUrl: R2_PUBLIC_URL,
  authKey: CLOUDFLARE_AUTH_KEY,
  backupDb: AUTH_BACKUP_DB,
  backupStore: AUTH_BACKUP_STORE,
  usernameToEmail,
  getActiveSession: () => session,
});

const {
  createClient: createCloudflareClient,
  getEndpoint: getCloudflareEndpoint,
  readSession: readCloudflareSession,
  request: cloudflareRequest,
  restoreSessionBackup: restoreCloudflareSessionBackup,
  writeSession: writeCloudflareSession,
  writeSessionBackup: writeCloudflareSessionBackup,
} = cloudflareBackend;
const diaryRepository = createDiaryRepository({
  getDatabase: () => cloudDb,
  getSession: () => session,
});
const photoFavorites = createPhotoFavoritesStore({ repository: diaryRepository });
const isFavoritePhoto = (photoOrId) => photoFavorites.has(photoOrId);
const secretRepository = createSecretRepository({
  getDatabase: () => cloudDb,
  getSession: () => session,
});
const notificationRepository = createNotificationRepository({
  getDatabase: () => cloudDb,
});
const householdRepository = createHouseholdRepository({
  getDatabase: () => cloudDb,
  getSession: () => session,
});
const wardrobeRepository = createWardrobeRepository({
  getDatabase: () => cloudDb,
});
const appLifecycleController = createAppLifecycleController({
  documentTarget: document,
  windowTarget: window,
  foregroundThrottleMs: 10_000,
  pollIntervalMs: 30_000,
  onForeground: async () => {
    if (!session) return;
    await Promise.allSettled([
      loadNotifications(),
      checkForNewPhotos(),
      processDiaryUploadQueue(),
      syncExistingPushSubscription(),
    ]);
  },
  onPoll: async () => {
    if (!session) return;
    await Promise.allSettled([
      loadNotifications(),
      checkForNewPhotos(),
    ]);
  },
});
const imageService = createImageService({
  endpoint: R2_UPLOAD_ENDPOINT,
  getAccessToken: () => session?.access_token || "",
  getUploadQuality: () => getUploadQuality(),
  isNetworkError: (error) => isNetworkLikeError(error),
  taskMap: activeUploadTasks,
  onTaskChanged: () => void renderUploadCenter(),
});
const assetController = createAssetController({
  imageService,
  publicUrl: R2_PUBLIC_URL,
  legacyBucket: BUCKET,
  formatFileSize,
  getVideoContentType,
  getVideoFileExtension,
  slugify,
  setStatus,
});
const {
  cleanupStoredImagePaths,
  compressImage,
  copyUrlToR2,
  deleteR2Object,
  getProfileAvatarUrl,
  getR2Key,
  getR2PublicAssetUrl,
  isR2Path,
  isR2Url,
  migrateImageAsset,
  resolveStoredAssetUrl,
  shouldMigrateImageAsset,
  uploadDiaryMotionFile,
  uploadDiaryVideoFile,
  uploadImageFile,
  uploadToR2,
} = assetController;
const gamificationState = {
  get session() { return session; },
  get accountProfile() { return accountProfile; },
  get activeVipLevel() { return activeVipLevel; },
  set activeVipLevel(value) { activeVipLevel = value; },
  get cloudSyncAvailable() { return cloudSyncAvailable; },
  get cloudDb() { return cloudDb; },
  get familyInfo() { return familyInfo; },
  get familyMemberMap() { return familyMemberMap; },
  get familyMembers() { return familyMembers; },
  set familyMembers(value) { familyMembers = value; },
  get familyLevelProfiles() { return familyLevelProfiles; },
  set familyLevelProfiles(value) { familyLevelProfiles = value; },
};
const gamificationController = createGamificationController({
  elements: els,
  state: gamificationState,
  householdRepository,
  keys: {
    vipRecharge: VIP_RECHARGE_KEY,
    experience: EXPERIENCE_KEY,
    todayExperience: TODAY_EXPERIENCE_KEY,
  },
  vipUsers: VIP_USERS,
  getSessionDisplayName,
  getSessionLoginName,
  getProfileAvatarUrl,
  loadCachedAvatarUrl,
  saveCachedAvatarUrl,
  getArchiveData: () => ({
    photos,
    recipes,
    wishes,
    weekendPlans,
    secretItems,
    comments: [...photoCommentPreviewMap.values()].flat(),
    gratitudeNotes,
    favoriteCount: photoFavorites.size,
  }),
  getLocalDateKey,
  getOffsetLocalDateKey,
  normalizeLoginDateKey,
  isYesterdayLoginDate,
  updateAuthUI,
  renderOverview,
});
const {
  addTodayExperience,
  awardDailyExperience,
  awardExperience,
  getCurrentImageLimit,
  getDailyLoginReward,
  getExperienceLevel,
  getLoginStreakBonusBase,
  getNextLoginStreak,
  getTodayExperienceStorageKey,
  getUploadQuality,
  getUpgradeEta,
  getVipAdjustedExperience,
  getVipExpMultiplier,
  isVipUser,
  loadExperience,
  loadLocalExperienceAliases,
  loadFamilyLevelProfiles,
  loadRechargeTotal,
  loadTodayExperience,
  openAchievementDialog,
  openLevelDialog,
  openLevelGuidePage,
  rechargeVip,
  renderAchievementDialog,
  renderExperience,
  renderLevelDialog,
  renderTopLevelBadge,
  renderVipCenter,
  saveExperience,
  saveRechargeTotal,
} = gamificationController;
const profilePreferencesController = createProfilePreferencesController({
  elements: els,
  preferenceStore,
  householdRepository,
  assets: assetController,
  keys: { theme: THEME_KEY },
  state: gamificationState,
  normalizeHomeName,
  applyHomeName,
  normalizeNickname,
  getSessionDisplayName,
  updateSessionDisplayName,
  isMissingCloudSchema,
  loadFamilyContext,
  renderGallery,
  renderAccountAvatar,
  renderSettingsSummary,
  renderPhotoComments,
  saveCachedAvatarUrl,
});
const {
  applyTheme,
  clearAvatarPreviewUrl,
  loadTheme,
  normalizeTheme,
  persistHomeNameToCloud,
  restoreDefaultHomeName,
  saveAvatar,
  saveHomeName,
  saveProfileNickname,
  setAvatarPreview,
  toggleTheme,
  updateAvatarPreview,
} = profilePreferencesController;
applyTheme(loadTheme(null), { persist: false, userId: null });
const secretPinController = createSecretPinController({
  elements: els,
  pinKey: SECRET_PIN_KEY,
  unlockKey: SECRET_UNLOCK_KEY,
  maxUnlockMs: SECRET_UNLOCK_MAX_MS,
  getSession: () => session,
  openSecretPage: () => switchPage("secret", { skipSecretGate: true }),
});
const {
  appendDigit: appendSecretPinDigit,
  clearUnlockState: clearSecretUnlockState,
  deleteDigit: deleteSecretPinDigit,
  isUnlocked: isSecretUnlocked,
  markLeft: markSecretLeft,
  openDialog: openSecretPinDialog,
  openSettings: openSecretPinSettings,
} = secretPinController;
const secretState = {
  get cloudDb() { return cloudDb; }, set cloudDb(value) { cloudDb = value; },
  get session() { return session; }, set session(value) { session = value; },
  get photos() { return photos; }, set photos(value) { photos = value; },
  get secretItems() { return secretItems; }, set secretItems(value) { secretItems = value; },
  get secretFolders() { return secretFolders; }, set secretFolders(value) { secretFolders = value; },
  get activeDialogPhoto() { return activeDialogPhoto; }, set activeDialogPhoto(value) { activeDialogPhoto = value; },
  get secretLoadPromise() { return secretLoadPromise; }, set secretLoadPromise(value) { secretLoadPromise = value; },
  get lastSecretSyncAt() { return lastSecretSyncAt; }, set lastSecretSyncAt(value) { lastSecretSyncAt = value; },
  get dialogRestoreScrollY() { return dialogRestoreScrollY; }, set dialogRestoreScrollY(value) { dialogRestoreScrollY = value; },
  get dialogRestorePhotoId() { return dialogRestorePhotoId; }, set dialogRestorePhotoId(value) { dialogRestorePhotoId = value; },
  get dialogRestorePhotoTop() { return dialogRestorePhotoTop; }, set dialogRestorePhotoTop(value) { dialogRestorePhotoTop = value; },
  get dialogRestoreSecretImageUrl() { return dialogRestoreSecretImageUrl; }, set dialogRestoreSecretImageUrl(value) { dialogRestoreSecretImageUrl = value; },
  get dialogRestoreElementTop() { return dialogRestoreElementTop; }, set dialogRestoreElementTop(value) { dialogRestoreElementTop = value; },
  get activeFilter() { return activeFilter; }, set activeFilter(value) { activeFilter = value; },
  get activeSecretFilter() { return activeSecretFilter; }, set activeSecretFilter(value) { activeSecretFilter = value; },
  get activeSecretAlbumId() { return activeSecretAlbumId; }, set activeSecretAlbumId(value) { activeSecretAlbumId = value; },
  get activeSecretFolderId() { return activeSecretFolderId; }, set activeSecretFolderId(value) { activeSecretFolderId = value; },
  get secretDefaultFolderId() { return secretDefaultFolderId; }, set secretDefaultFolderId(value) { secretDefaultFolderId = value; },
  get secretFolderContextMenu() { return secretFolderContextMenu; }, set secretFolderContextMenu(value) { secretFolderContextMenu = value; },
  get secretAlbumContextMenu() { return secretAlbumContextMenu; }, set secretAlbumContextMenu(value) { secretAlbumContextMenu = value; },
  get secretSearchQuery() { return secretSearchQuery; }, set secretSearchQuery(value) { secretSearchQuery = value; },
  get secretSelectionMode() { return secretSelectionMode; }, set secretSelectionMode(value) { secretSelectionMode = value; },
  get selectedSecretImageIndexes() { return selectedSecretImageIndexes; }, set selectedSecretImageIndexes(value) { selectedSecretImageIndexes = value; },
  get secretAlbumEditing() { return secretAlbumEditing; }, set secretAlbumEditing(value) { secretAlbumEditing = value; },
  get secretAppendExpanded() { return secretAppendExpanded; }, set secretAppendExpanded(value) { secretAppendExpanded = value; },
  get secretMobileToolsExpanded() { return secretMobileToolsExpanded; }, set secretMobileToolsExpanded(value) { secretMobileToolsExpanded = value; },
  get dialogImages() { return dialogImages; }, set dialogImages(value) { dialogImages = value; },
  get dialogImageIndex() { return dialogImageIndex; }, set dialogImageIndex(value) { dialogImageIndex = value; },
  get secretImageZoom() { return secretImageZoom; }, set secretImageZoom(value) { secretImageZoom = value; },
  get secretViewerReturnFocus() { return secretViewerReturnFocus; }, set secretViewerReturnFocus(value) { secretViewerReturnFocus = value; },
  get secretViewerInfoOpen() { return secretViewerInfoOpen; }, set secretViewerInfoOpen(value) { secretViewerInfoOpen = value; },
  get suppressDialogImageClickUntil() { return suppressDialogImageClickUntil; }, set suppressDialogImageClickUntil(value) { suppressDialogImageClickUntil = value; },
  get lockedDialogScrollY() { return lockedDialogScrollY; }, set lockedDialogScrollY(value) { lockedDialogScrollY = value; },
  get dialogLockUsesFixed() { return dialogLockUsesFixed; }, set dialogLockUsesFixed(value) { dialogLockUsesFixed = value; },
  get dialogRandomMode() { return dialogRandomMode; }, set dialogRandomMode(value) { dialogRandomMode = value; },
  get dialogSecretSourceItem() { return dialogSecretSourceItem; }, set dialogSecretSourceItem(value) { dialogSecretSourceItem = value; },
  get activeSecretDialogItem() { return activeSecretDialogItem; }, set activeSecretDialogItem(value) { activeSecretDialogItem = value; },
  get secretCloudAvailable() { return secretCloudAvailable; }, set secretCloudAvailable(value) { secretCloudAvailable = value; },
};
const secretController = createSecretController({
  elements: els,
  state: secretState,
  repository: secretRepository,
  assets: assetController,
  albumImageLimit: SECRET_ALBUM_IMAGE_LIMIT,
  allFolderId: SECRET_ALL_FOLDER_ID,
  favoritesFolderId: SECRET_FAVORITES_FOLDER_ID,
  mobileDialogBreakpoint: MOBILE_DIALOG_BREAKPOINT,
  getSecretDefaultFolderId,
  setSecretDefaultFolderId,
  saveSecretItemsCache: (...args) => saveSecretItemsCache(...args),
  renderCachedSecretItems: (...args) => renderCachedSecretItems(...args),
  setGlobalStatus,
  setSecretStatus,
  showMiniToast,
  dismissMiniToast,
  isMobileViewport,
  getSortedPhotos,
  getDisplayTitle,
  getPlainNote,
  isMissingCloudSchema,
  openPhoto,
  createTrashItem,
  rollbackTrashItem,
  showPhotoDialogPreservingScroll,
  renderDialogMedia,
  fitSecretViewerImage,
  refreshDiaryViewerToolbar,
  refreshSecretViewerToolbar,
  resetSecretImageZoom,
  setSecretViewerStatus,
  updateSecretToolbarTop,
});
const {
  addSecretImageLinks,
  appendSecretAlbumImages,
  closeSecretAlbumContextMenu,
  closeSecretFolderContextMenu,
  createSecretFolder,
  deleteActiveSecretFolder,
  deleteCurrentSecretTag,
  deleteSecretItem,
  deleteSelectedSecretImages,
  getImageFilesFromClipboard,
  getSecretAlbumFilterTags,
  getSecretFavoriteEntries,
  handleSecretPaste,
  loadSecretItems,
  moveSecretAlbum,
  moveSelectedSecretImage,
  moveSelectedSecretImagesToAlbum,
  openSecretAlbumFolderDialog,
  openSecretItem,
  openSecretLinkedDiary,
  removeSecretPhotoTagFromSelection,
  renderSecretFolderControls,
  renderSecretGallery,
  renderSecretLinkedPhotoOptions,
  returnToSecretItem,
  saveSecretAlbumEdit,
  saveSecretItem,
  setSecretExpanded,
  setSelectedSecretCover,
  toggleDialogImageFullscreen,
  updateSecretDialogImage,
  updateSecretPreview,
} = secretController;
const diaryComposerController = createDiaryComposerController({
  elements: els,
  queue: diaryUploadQueue,
  repository: diaryRepository,
  assets: assetController,
  vlogMode,
  draftKey: DIARY_DRAFT_KEY,
  getCloudDatabase: () => cloudDb,
  getSession: () => session,
  getCurrentImageLimit,
  getFinalTitle,
  getUploadFileNameBase,
  formatFileSize,
  escapeHtml,
  setStatus,
  awardExperience,
  loadPhotos,
  switchPage,
  renderUploadCenter,
});
const {
  getQueuedUploads: getQueuedDiaryUploads,
  isProcessing: isDiaryUploadQueueProcessing,
  isNetworkLikeError,
  processQueue: processDiaryUploadQueue,
  removeQueuedUpload: removeQueuedDiaryUpload,
  setExpanded: setUploadExpanded,
} = diaryComposerController;
const wardrobeController = createWardrobeController({
  root: els.wardrobeRoot,
  repository: wardrobeRepository,
  getSession: () => session,
  getFamilyMembers: () => familyMembers.map((member) => ({
    ...member,
    username: getAuthorName(member.user_id),
  })),
  uploadFile: (file, safeName, index, total, statusSetter) => uploadImageFile(
    file,
    slugify(safeName),
    index,
    total,
    { folder: "wardrobe", statusSetter, thumbnail: true }
  ),
  importUrl: (url, safeName) => copyUrlToR2(url, slugify(safeName), "wardrobe"),
  deleteAsset: (path) => deleteR2Object(path),
  confirmAction,
  notify: showMiniToast,
  onExperience: (action) => awardExperience(action),
});
function saveConfig() {
  els.setupPanel.hidden = true;
  setHint("Cloudflare 已接管登录、数据库和图片存储。");
}

function getHomeNameStorageKey(userId = session?.user?.id || null) {
  return userId ? preferenceStore.scopedKey(HOME_NAME_KEY, userId) : HOME_NAME_KEY;
}

function normalizeHomeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 20);
}

function normalizeFamilyTagline(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function getFamilyTaglineStorageKey(familyId = familyInfo?.id || session?.user?.id || "guest") {
  return preferenceStore.scopedKey(FAMILY_TAGLINE_KEY, familyId || "guest");
}

function loadFamilyTagline() {
  return normalizeFamilyTagline(preferenceStore.read(getFamilyTaglineStorageKey())) || DEFAULT_FAMILY_TAGLINE;
}

function applyFamilyTagline(value, { persist = false } = {}) {
  const tagline = normalizeFamilyTagline(value) || DEFAULT_FAMILY_TAGLINE;
  if (els.heroSignature) els.heroSignature.textContent = tagline;
  accountProfile.familyTagline = tagline;
  if (persist) preferenceStore.write(getFamilyTaglineStorageKey(), tagline);
  const settingsValue = document.querySelector("#settingsFamilyTaglineValue");
  if (settingsValue) settingsValue.textContent = tagline;
  return tagline;
}

function loadHomeName(userId = session?.user?.id || null) {
  return normalizeHomeName(preferenceStore.read(getHomeNameStorageKey(userId))) || "咻蛋之家";
}

function applyHomeName(value, { persist = false, userId = session?.user?.id || null } = {}) {
  const homeName = normalizeHomeName(value) || "咻蛋之家";
  els.brandName.textContent = homeName;
  els.heroHomeName.textContent = homeName;
  els.vipHomeName.textContent = homeName;
  els.brandName.title = homeName;
  els.heroHomeName.classList.toggle("long-home-name", Array.from(homeName).length > 8);
  document.title = homeName;
  accountProfile.homeName = homeName;
  if (persist && userId) {
    localStorage.setItem(getHomeNameStorageKey(userId), homeName);
  }
  renderSettingsSummary();
  return homeName;
}

async function initializeCloudflare() {
  els.setupToggle.hidden = true;
  els.setupPanel.hidden = true;
  cloudDb = createCloudflareClient();
  ensurePushSettingsPage();

  cloudDb.auth.onAuthStateChange((_event, nextSession) => {
    const previousUserId = session?.user?.id || "";
    const nextUserId = nextSession?.user?.id || "";
    if (previousUserId !== nextUserId) {
      secretPinController.resetSession();
    }
    session = nextSession;
    updateAuthUI();
    renderCachedPhotoFeed(session?.user?.id || "public");
    loadPhotos();
    if (session) {
      void loadNotifications();
      void processDiaryUploadQueue();
      void syncExistingPushSubscription();
    }
  });

  const { data } = await cloudDb.auth.getSession();
  session = data.session;
  updateAuthUI();
  if (session) void syncExistingPushSubscription();
  renderCachedPhotoFeed(session?.user?.id || "public");
  await loadPhotos();
  if (new URLSearchParams(location.search).has("pushPhoto") || new URLSearchParams(location.search).has("pushType")) {
    void openPushDestination();
  }
  syncMobileComposerPlacement();
  void processDiaryUploadQueue();

  appLifecycleController.start();
}

function updateAuthUI() {
  const signedIn = Boolean(session);
  const needsAccountSync = Boolean(signedIn && session.user.id !== syncedUserId);
  if (!signedIn) vlogMode.close();
  const displayName = signedIn ? getSessionDisplayName() : "";
  if (signedIn && !accountProfile.avatarUrl) {
    accountProfile.avatarUrl = loadCachedAvatarUrl(session.user.id);
  }
  const localHomeName = signedIn ? loadHomeName(session.user.id) : "咻蛋之家";
  applyHomeName(localHomeName, { persist: false, userId: signedIn ? session.user.id : null });
  applyFamilyTagline(loadFamilyTagline(), { persist: false });
  applyTheme(loadTheme(signedIn ? session.user.id : null), {
    persist: false,
    userId: signedIn ? session.user.id : null,
  });
  applyMobileFeedLayout(loadMobileFeedLayout(signedIn ? session.user.id : "guest"));
  applyMobileSecretLayout(loadMobileSecretLayout(signedIn ? session.user.id : "guest"));
  const rechargeTotal = signedIn ? loadRechargeTotal(displayName) : 0;
  activeVipLevel = signedIn ? getVipLevelByRecharge(rechargeTotal)?.level || 0 : 0;
  const vip = signedIn && activeVipLevel > 0;
  document.body.classList.toggle("signed-in", signedIn);
  document.body.classList.toggle("vip-member", vip);
  document.body.dataset.vipLevel = String(activeVipLevel);
  els.composer.hidden = !signedIn;
  els.anniversarySection.hidden = !signedIn;
  els.anniversaryOpen.hidden = !signedIn;
  els.memoryButton.hidden = !signedIn;
  if (els.vlogNav) els.vlogNav.hidden = !signedIn;
  if (els.weeklyReviewOpen) els.weeklyReviewOpen.hidden = !signedIn;
  const timelineTool = document.querySelector('[data-tool-id="timeline"]');
  if (timelineTool) timelineTool.hidden = !signedIn;
  if (els.secretOpen) els.secretOpen.hidden = !signedIn;
  if (els.thanksOpen) els.thanksOpen.hidden = !signedIn;
  applyToolDockOrder(signedIn ? session.user.id : "guest");
  els.authCard.hidden = signedIn;
  els.userMenu.hidden = !signedIn;
  els.notificationButton.hidden = !signedIn;
  els.loginButton.hidden = signedIn;
  els.signupButton.hidden = signedIn;
  els.usernameInput.hidden = signedIn;
  els.passwordInput.hidden = signedIn;
  if (els.inviteCodeInput) els.inviteCodeInput.hidden = signedIn;
  els.userPopover.hidden = true;
  els.profileName.textContent = displayName;
  els.avatarInitial.textContent = getInitial(displayName);
  renderAccountAvatar(accountProfile.avatarUrl, displayName);
  renderSettingsSummary();
  if (signedIn) {
    setSelectedThanksColor(accountProfile.thanksColor || loadThanksColor(session.user.id));
    renderExperience(displayName);
  }
  els.vipBadge.hidden = !signedIn;
  els.vipPopoverBadge.hidden = !signedIn;
  els.vipPopoverBadge.textContent = vip
    ? `${localHomeName} ${getVipLevel(activeVipLevel).label}`
    : `开通 ${localHomeName} VIP`;
  if (signedIn) renderTopLevelBadge();
  renderVipCenter();
  recipes = signedIn ? loadRecipes() : [];
  wishes = signedIn && !needsAccountSync ? wishes : [];
  weekendPlans = signedIn ? loadWeekendPlans() : [];
  anniversaries = signedIn ? loadAnniversaries() : [];
  if (needsAccountSync) photoFavorites.reset("loading");
  else if (!signedIn) photoFavorites.reset();
  accountDataState = needsAccountSync ? "loading" : signedIn ? accountDataState : "idle";
  renderOverview();
  renderRecipes();
  renderWishes();
  renderWeekendPlans();
  renderAnniversaries();
  renderGratitudeNotes();
  renderFoodWheel();
  switchPage(activePage);
  setHint(
    signedIn
      ? ""
      : "输入用户名和密码登录。注册新账号需要 xiudan320 给的邀请码。"
  );
  setGlobalStatus("");
  if (!signedIn) {
    void refreshStorage(cloudflareRequest, () => false);
    cloudSyncAvailable = false;
    weekendCloudAvailable = false;
    anniversaryCloudAvailable = false;
    photoFlagsCloudAvailable = false;
    secretCloudAvailable = false;
    foodOptionsCloudAvailable = false;
      profilePreferencesCloudAvailable = false;
      thanksColorCloudAvailable = false;
    gratitudeNotes = [];
    secretItems = [];
    secretDefaultFolderId = "";
    closeSecretFolderContextMenu();
    closeSecretAlbumContextMenu();
    secretAlbumContextMenu = null;
    notifications = [];
    commentReplyToId = null;
    familyInfo = null;
    familyMembers = [];
    familyInvitations = [];
    familyMemberMap = new Map();
    wardrobeController.clear();
    photoComments = [];
    activeDialogPhoto = null;
    cloudSyncInFlight = null;
    accountDataState = "idle";
    syncedUserId = "";
    accountProfile = {
      rechargeTotal: 0,
      vipLevel: 0,
      experienceTotal: 0,
      lastLoginDate: "",
      loginStreak: 0,
      todayExperienceDate: "",
      todayExperienceAmount: 0,
      themePreference: "",
      homeName: "咻蛋之家",
      familyTagline: DEFAULT_FAMILY_TAGLINE,
      thanksColor: DEFAULT_THANKS_COLOR,
      avatarUrl: "",
      avatarPath: "",
      foodOptions: [],
    };
    renderNotifications();
    renderSettingsSummary();
    applyHomeName("咻蛋之家");
    return;
  }

  if (needsAccountSync) {
    syncedUserId = session.user.id;
    void synchronizeAccountData();
  }
}

const authController = createAuthController({
  elements: els,
  endpoint: R2_UPLOAD_ENDPOINT,
  getDatabase: () => cloudDb,
  getSession: () => session,
  usernameToEmail,
  getRedirectUrl,
  setHint,
  getBoundEmail: getSessionBoundEmail,
  renderSettingsSummary,
  isMissingCloudSchema,
  closeMobileDiaryPage,
  clearSecretUnlockState,
});
const {
  changePassword,
  confirmEmailBinding,
  confirmEmailPasswordReset,
  login: loginWithPassword,
  logout,
  requestEmailBinding,
  requestEmailPasswordReset,
  resetEmailBindingDialog,
  resetEmailRecoveryUi,
  resetForgottenPassword,
  saveRecoveryKey,
  signup: signupWithPassword,
} = authController;

async function loadPhotosInternal() {
  if (!cloudDb) {
    photos = demoPhotos;
    renderGallery();
    return;
  }

  const { data, error } = await diaryRepository.list({
    includePrivate: Boolean(session),
  });

  if (error) {
    if (!navigator.onLine || /failed to fetch|network/i.test(error.message || "")) {
      renderCachedPhotoFeed(session?.user?.id || "public");
      setGlobalStatus("当前离线，正在显示本机缓存。");
    } else {
      setGlobalStatus(`读取日记失败：${error.message}`);
      if (!photos.length) photos = [];
    }
    photoFlagsCloudAvailable = false;
    if (session) photoFavorites.markError();
  } else {
    setGlobalStatus("");
    photos = data || [];
    pendingNewPhotos = [];
    dismissedFeedRefreshIds = new Set();
    showingCachedFeed = false;
    if (session) {
      await Promise.all([
        verifyPhotoFlagSchema(),
        photoFavorites.synchronize(),
        loadPhotoCommentPreviews(),
      ]);
    } else {
      photoCommentPreviewMap = new Map();
    }
    savePhotoFeedCache(session?.user?.id || "public");
  }
  updateDiarySearchSuggestions();

  visiblePhotoCount = Math.min(
    Math.max(PAGE_SIZE, visiblePhotoCount || PAGE_SIZE),
    Math.max(PAGE_SIZE, photos.length)
  );
  renderFeedRefreshNotice();
  renderGallery();
  if (cloudSyncAvailable) updateCloudSyncStatus();
}

async function loadPhotos() {
  if (photosLoadPromise) return photosLoadPromise;
  photosLoadPromise = loadPhotosInternal().finally(() => {
    photosLoadPromise = null;
  });
  return photosLoadPromise;
}

async function loadPhotoCommentPreviews() {
  photoCommentPreviewMap = new Map();
  if (!cloudDb || !session) return;
  const { data, error } = await diaryRepository.listCommentPreviews(300);
  if (error) return;
  (data || []).forEach((comment) => {
    const photoId = comment.photo_id;
    if (!photoId) return;
    const list = photoCommentPreviewMap.get(photoId) || [];
    if (list.length >= PHOTO_COMMENT_PREVIEW_LIMIT) return;
    list.push(comment);
    photoCommentPreviewMap.set(photoId, list);
  });
  photoCommentPreviewMap.forEach((list) => {
    list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  });
}

const offlineCacheController = createOfflineCacheController({
  elements: els,
  preferenceStore,
  mediaCacheService,
  keys: {
    photoFeed: PHOTO_FEED_CACHE_KEY,
    secretItems: SECRET_ITEMS_CACHE_KEY,
    diaryCapacity: DIARY_CACHE_MB_KEY,
    secretCapacity: SECRET_CACHE_MB_KEY,
    policy: MEDIA_CACHE_POLICY_KEY,
  },
  cacheNames: {
    diary: DIARY_MEDIA_CACHE_NAME,
    secret: SECRET_MEDIA_CACHE_NAME,
    legacy: LEGACY_MEDIA_CACHE_NAME,
  },
  limits: {
    minMb: MIN_CACHE_MB,
    maxMb: MAX_CACHE_MB,
    defaultDiaryMb: DEFAULT_DIARY_CACHE_MB,
    defaultSecretMb: DEFAULT_SECRET_CACHE_MB,
    autoDiaryItems: AUTO_DIARY_CACHE_ITEM_LIMIT,
    metadataItems: METADATA_CACHE_ITEM_LIMIT,
    commentPreviews: PHOTO_COMMENT_PREVIEW_LIMIT,
    pageSize: PAGE_SIZE,
  },
  getSession: () => session,
  getPhotos: () => photos,
  setPhotos: (items) => {
    photos = items;
  },
  getSortedPhotos,
  getPhotoImages,
  getPhotoCommentPreviews: () => photoCommentPreviewMap,
  setPhotoCommentPreviews: (map) => {
    photoCommentPreviewMap = map;
  },
  setShowingCachedFeed: (value) => {
    showingCachedFeed = value;
  },
  setVisiblePhotoCount: (value) => {
    visiblePhotoCount = value;
  },
  getActivePage: () => activePage,
  renderGallery,
  setGlobalStatus,
  getSecretItems: () => secretItems,
  setSecretItems: (items) => {
    secretItems = items;
  },
  setSecretCloudAvailable: (value) => {
    secretCloudAvailable = value;
  },
  renderSecretGallery,
  setSecretStatus,
  normalizeSecretImages,
  getDefaultSecretSortOrder,
  getProfileAvatarUrl,
  getAccountProfile: () => accountProfile,
  getFamilyMembers: () => familyMemberMap,
  getFamilyLevelProfiles: () => familyLevelProfiles,
  renderSettingsSummary,
  formatFileSize,
});
const {
  cacheMedia: cacheOfflineMedia,
  clear: clearAppCache,
  collectDiaryUrls: collectDiaryOfflineMediaUrls,
  collectSecretUrls: collectSecretOfflineMediaUrls,
  getCapacityStorageKey: getCacheCapacityStorageKey,
  getPhotoFeedStorageKey: getPhotoFeedCacheStorageKey,
  getPolicyKey: getMediaCachePolicyKey,
  getSecretStorageKey: getSecretItemsCacheStorageKey,
  getStats: getAppCacheStats,
  isUnmetered: isClearlyUnmeteredConnection,
  loadCapacityMb: loadCacheCapacityMb,
  loadPolicy: loadMediaCachePolicy,
  refreshInfo: refreshCacheInfo,
  renderCachedPhotoFeed,
  renderCachedSecretItems,
  renderStats: renderCacheStats,
  saveCapacityMb: saveCacheCapacityMb,
  savePhotoFeed: savePhotoFeedCache,
  savePolicy: saveMediaCachePolicy,
  saveSecretItems: saveSecretItemsCache,
  schedule: scheduleOfflineMediaCache,
  shouldAutoCache: shouldAutoCacheMedia,
} = offlineCacheController;

function getLocalDateKeyFromValue(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isPhotoPublishedToday(photo) {
  return getLocalDateKeyFromValue(photo?.created_at) === getLocalDateKey();
}

function getTodayPostsSeenStorageKey(dateKey = getLocalDateKey()) {
  const userId = session?.user?.id || "guest";
  return `${TODAY_POSTS_SEEN_KEY}:${userId}:${dateKey}`;
}

function loadTodaySeenPostIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getTodayPostsSeenStorageKey()) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveTodaySeenPostIds(ids) {
  localStorage.setItem(
    getTodayPostsSeenStorageKey(),
    JSON.stringify([...new Set([...ids].map(String))])
  );
}

function getSortedPhotos(photoList = photos) {
  return sortDiaryEntries(photoList);
}

function getTodayPublishedPhotos() {
  const currentUserId = String(session?.user?.id || "");
  return getSortedPhotos(photos).filter(
    (photo) => photo.category !== "VLOG" && isPhotoPublishedToday(photo) && String(photo?.user_id || "") !== currentUserId
  );
}

function getUpcomingWeekendPlans() {
  const today = new Date(`${getLocalDateKey()}T00:00:00`);
  return weekendPlans
    .filter((plan) => !plan.done && plan.date)
    .map((plan) => {
      const target = new Date(`${plan.date}T00:00:00`);
      return { plan, days: Math.round((target - today) / 86400000) };
    })
    .filter(({ days }) => days >= 0 && days <= 2)
    .sort((a, b) => a.days - b.days || String(a.plan.title).localeCompare(String(b.plan.title)));
}

function getWeekendReminderDismissKey() {
  return `life-vlog-weekend-reminder:${session?.user?.id || "guest"}:${getLocalDateKey()}`;
}

function renderWeekendReminderNotice() {
  if (!els.weekendReminderNotice) return;
  const upcoming = session ? getUpcomingWeekendPlans() : [];
  const dismissed = localStorage.getItem(getWeekendReminderDismissKey()) === "1";
  if (!upcoming.length || dismissed || activePage !== "gallery") {
    els.weekendReminderNotice.hidden = true;
    els.weekendReminderNotice.innerHTML = "";
    return;
  }
  const nearest = upcoming[0];
  const timing = nearest.days === 0 ? "就是今天" : nearest.days === 1 ? "明天" : "后天";
  els.weekendReminderNotice.hidden = false;
  els.weekendReminderNotice.innerHTML = `
    <div>
      <span>Weekend</span>
      <strong>${escapeHtml(timing)}：${escapeHtml(nearest.plan.title || "周末计划")}</strong>
      <p>${upcoming.length > 1 ? `还有 ${upcoming.length - 1} 个临近安排` : escapeHtml(nearest.plan.location || "记得提前准备一下")}</p>
    </div>
    <div>
      <button class="today-posts-primary" type="button" data-open-weekend-reminder>查看计划</button>
      <button type="button" data-dismiss-weekend-reminder>今天不再提醒</button>
    </div>
  `;
  els.weekendReminderNotice.querySelector("[data-open-weekend-reminder]")?.addEventListener("click", () => switchPage("weekend"));
  els.weekendReminderNotice.querySelector("[data-dismiss-weekend-reminder]")?.addEventListener("click", () => {
    localStorage.setItem(getWeekendReminderDismissKey(), "1");
    renderWeekendReminderNotice();
  });
}

function markTodayPostsViewed(ids) {
  const seen = loadTodaySeenPostIds();
  ids.filter(Boolean).forEach((id) => seen.add(String(id)));
  saveTodaySeenPostIds(seen);
}

async function acknowledgeViewedDiary(photoId) {
  const id = String(photoId || "");
  if (!id) return;

  markTodayPostsViewed([id]);
  pendingNewPhotos = pendingNewPhotos.filter((photo) => String(photo?.id || "") !== id);
  dismissedFeedRefreshIds.add(id);
  renderFeedRefreshNotice();
  updateTodayPostsNotice();

  let changed = false;
  notifications.forEach((item) => {
    if (item.type === "diary" && String(item.photo_id || "") === id && !item.is_read) {
      item.is_read = true;
      item.just_seen = false;
      changed = true;
    }
  });
  if (changed) renderNotifications();

  if (cloudDb && session) {
    const { error } = await notificationRepository.markDiaryRead(session.user.id, id);
    if (!error && !changed) void loadNotifications();
  }

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const visibleNotifications = await Promise.resolve(registration?.getNotifications?.() || []).catch(() => []);
    (visibleNotifications || []).forEach((notification) => {
      if (String(notification?.data?.photoId || "") === id) notification.close();
    });
  }
}

function renderFeedRefreshNotice() {
  if (!els.feedRefreshNotice) return;
  if (activePage !== "gallery" || !pendingNewPhotos.length) {
    els.feedRefreshNotice.hidden = true;
    els.feedRefreshNotice.innerHTML = "";
    return;
  }

  const latest = pendingNewPhotos[0];
  els.feedRefreshNotice.hidden = false;
  els.feedRefreshNotice.innerHTML = `
    <div>
      <span>New diary</span>
      <strong>有 ${pendingNewPhotos.length} 篇新日记</strong>
      <p>最新：${escapeHtml(getPhotoLabel(latest))} · ${escapeHtml(getAuthorName(latest.user_id))}</p>
    </div>
    <div>
      <button class="today-posts-primary" type="button" data-refresh-feed>点击查看</button>
      <button type="button" data-dismiss-feed-refresh>稍后</button>
    </div>
  `;
  els.feedRefreshNotice
    .querySelector("[data-refresh-feed]")
    ?.addEventListener("click", refreshFeedForNewPhotos);
  els.feedRefreshNotice
    .querySelector("[data-dismiss-feed-refresh]")
    ?.addEventListener("click", () => {
      pendingNewPhotos.forEach((photo) => {
        if (photo.id) dismissedFeedRefreshIds.add(photo.id);
      });
      pendingNewPhotos = [];
      renderFeedRefreshNotice();
    });
}

async function checkForNewPhotos() {
  if (!cloudDb || !session || feedRefreshCheckInFlight) return;
  if (showingCachedFeed) return;
  feedRefreshCheckInFlight = true;
  try {
    const currentIds = new Set(photos.map((photo) => photo.id).filter(Boolean));
    const { data, error } = await diaryRepository.listRecent(
      "id,user_id,title,category,taken_at,created_at",
      12
    );
    if (error) return;
    pendingNewPhotos = (data || []).filter(
      (photo) =>
        photo.id &&
        photo.category !== "VLOG" &&
        String(photo.user_id || "") !== String(session.user.id) &&
        !currentIds.has(photo.id) &&
        !dismissedFeedRefreshIds.has(photo.id)
    );
    renderFeedRefreshNotice();
  } finally {
    feedRefreshCheckInFlight = false;
  }
}

async function refreshFeedForNewPhotos() {
  const targetId = pendingNewPhotos[0]?.id || "";
  pendingNewPhotos = [];
  renderFeedRefreshNotice();
  activeFilter = "全部";
  updateFilterChips();
  await loadPhotos();
  requestAnimationFrame(() => {
    const target = targetId ? els.gallery.querySelector(`[data-photo-id="${targetId}"]`) : null;
    (target || els.gallery)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function updateTodayPostsNotice() {
  if (!els.todayPostsNotice) return;
  if (activePage !== "gallery") {
    els.todayPostsNotice.hidden = true;
    return;
  }
  const todayPhotos = getTodayPublishedPhotos();
  const seen = loadTodaySeenPostIds();
  const unseen = todayPhotos.filter((photo) => photo.id && !seen.has(String(photo.id)));
  if (!unseen.length) {
    els.todayPostsNotice.hidden = true;
    els.todayPostsNotice.innerHTML = "";
    return;
  }
  const latest = unseen[0];
  els.todayPostsNotice.hidden = false;
  els.todayPostsNotice.innerHTML = `
    <div>
      <span>今日新帖</span>
      <strong>今天有 ${unseen.length} 篇新日记</strong>
      <p>最新：${escapeHtml(getPhotoLabel(latest))} · ${escapeHtml(getAuthorName(latest.user_id))}</p>
    </div>
    <div>
      <button class="today-posts-primary" type="button" data-view-today-posts>查看今天</button>
      <button type="button" data-dismiss-today-posts>知道了</button>
    </div>
  `;
  els.todayPostsNotice
    .querySelector("[data-view-today-posts]")
    ?.addEventListener("click", showTodayPosts);
  els.todayPostsNotice
    .querySelector("[data-dismiss-today-posts]")
    ?.addEventListener("click", () => {
      markTodayPostsViewed(unseen.map((photo) => photo.id));
      updateTodayPostsNotice();
    });
}

function updateFilterChips() {
  els.chips.forEach((item) => item.classList.toggle("active", item.dataset.filter === activeFilter));
  els.galleryNav.classList.toggle("active", activePage === "gallery" && activeFilter !== "VLOG");
  els.vlogNav?.classList.toggle("active", activePage === "gallery" && activeFilter === "VLOG");
}

function showTodayPosts() {
  const todayPhotos = getTodayPublishedPhotos();
  if (!todayPhotos.length) return;
  const targetId = todayPhotos[0].id;
  activeFilter = "全部";
  updateFilterChips();
  const targetIndex = getSortedPhotos(photos).findIndex((photo) => photo.id === targetId);
  visiblePhotoCount = Math.max(PAGE_SIZE, targetIndex + 1);
  markTodayPostsViewed(todayPhotos.map((photo) => photo.id));
  renderGallery();
  requestAnimationFrame(() => {
    const target = targetId
      ? els.gallery.querySelector(`[data-photo-id="${targetId}"]`)
      : null;
    (target || els.gallery)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function renderPhotoCommentPreview(photoId, visibleIndex) {
  const comments = photoCommentPreviewMap.get(photoId) || [];
  if (!comments.length) return "";
  const totalText =
    comments.length >= PHOTO_COMMENT_PREVIEW_LIMIT ? `最近 ${comments.length} 条留言` : `${comments.length} 条留言`;
  return `
    <section class="photo-card-comments">
      <header>
        <span>${totalText}</span>
        <button type="button" data-open-comments-index="${visibleIndex}">回复</button>
      </header>
      ${comments
        .map(
          (comment) => `
            <article>
              ${renderAvatarMarkup(comment.user_id, "photo-card-comment-avatar")}
              <div>
                <strong>${escapeHtml(getAuthorName(comment.user_id))}</strong>
                <p>${escapeHtml(comment.body)}</p>
              </div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

async function verifyPhotoFlagSchema() {
  if (!cloudDb || !session) {
    photoFlagsCloudAvailable = false;
    return;
  }
  const { error } = await diaryRepository.verifyFlags();
  photoFlagsCloudAvailable = !error;
}

function renderGallery() {
  renderOverview();
  updateTodayPostsNotice();
  const sortedPhotos = getSortedPhotos(photos);
  const categoryFiltered = filterVlogPhotos(
    sortedPhotos,
    activeFilter,
    isFavoritePhoto,
    isPhotoWithinSevenDays
  );
  const filtered = filterPhotosBySearch(categoryFiltered);

  filteredPhotoCount = filtered.length;
  visiblePhotoCount = Math.min(
    Math.max(PAGE_SIZE, visiblePhotoCount),
    Math.max(PAGE_SIZE, filteredPhotoCount)
  );
  const visible = filtered.slice(0, visiblePhotoCount);
  const p=!galleryRenderSignature;
  const nextSignature = JSON.stringify({
    filter: activeFilter,
    search: diarySearchQuery,
    layout: document.body.dataset.mobileFeedLayout || "",
    visible: visiblePhotoCount,
    favorites: photoFavorites.sortedIds(),
    photos: visible.map((photo) => [photo.id, photo.updated_at, photo.is_featured, photo.is_pinned, getPhotoImages(photo).length]),
    comments: visible.map((photo) => (photoCommentPreviewMap.get(photo.id) || []).map((comment) => [comment.id, comment.updated_at, comment.body])),
  });
  if (nextSignature === galleryRenderSignature && els.gallery.childElementCount) {
    updateFeedLoader(filteredPhotoCount);
    return;
  }
  if (!visible.length) {
    const empty = getDiaryGalleryEmptyState({
      search: diarySearchQuery,
      filter: activeFilter,
      signedIn: Boolean(session),
      favoriteStatus: photoFavorites.status,
    });
    els.gallery.innerHTML = `<div class="empty"${empty.loading ? " data-favorite-sync-loading role=\"status\"" : ""}>${empty.message}</div>`;
    updateFeedLoader(0);
    return;
  }

  galleryRenderSignature = nextSignature;
  renderDiaryGalleryCards({
    container: els.gallery,
    photos: visible,
    initialRender: p,
    signedIn: Boolean(session),
    currentUserId: session?.user?.id || "",
    admin: isAdminAccount(),
    mobile: isMobileViewport(),
    getPhotoOwnerId,
    getDisplayTitle,
    getPhotoImages,
    getPlainNote,
    getAuthorName,
    renderAvatar: renderAvatarMarkup,
    renderCommentPreview: renderPhotoCommentPreview,
    isFavorite: isFavoritePhoto,
    handlers: {
      open: openPhoto,
      delete: deletePhoto,
      favorite: togglePhotoFavorite,
      flag: togglePhotoFlag,
      edit: openEditPhoto,
      adminCategory: adminUpdatePhotoCategory,
    },
  });
  observeGalleryMasonry();
  layoutGalleryMasonry();
  warmUpcomingFeedImages(filtered, visible.length);
  updateFeedLoader(filtered.length);
}

function layoutGalleryMasonry() {
  if (!els.gallery || els.gallery.hidden) return;
  const cards = [...els.gallery.querySelectorAll(".photo-card")];
  if (!cards.length) return;
  const styles = window.getComputedStyle(els.gallery);
  const columnCount = styles.gridTemplateColumns.split(" ").filter(Boolean).length;
  if (columnCount < 2) {
    cards.forEach((card) => card.style.removeProperty("--masonry-span"));
    return;
  }
  const rowHeight = Number.parseFloat(styles.getPropertyValue("grid-auto-rows")) || 8;
  const gap = Number.parseFloat(styles.getPropertyValue("row-gap")) || 24;
  window.requestAnimationFrame(() => {
    cards.forEach((card) => {
      const height = card.getBoundingClientRect().height;
      const span = Math.max(1, Math.ceil((height + gap) / (rowHeight + gap)));
      card.style.setProperty("--masonry-span", String(span));
    });
  });
}

function scheduleGalleryMasonryLayout() {
  window.clearTimeout(galleryMasonryTimer);
  galleryMasonryTimer = window.setTimeout(layoutGalleryMasonry, 60);
}

function ensurePullRefreshIndicator() {
  let indicator = document.querySelector("#pullRefreshIndicator");
  if (indicator) return indicator;
  indicator = document.createElement("div");
  indicator.id = "pullRefreshIndicator";
  indicator.className = "pull-refresh-indicator";
  indicator.innerHTML = `<i></i><span>下拉刷新</span>`;
  document.body.append(indicator);
  return indicator;
}

function initializePullToRefresh() {
  const indicator = ensurePullRefreshIndicator();
  document.addEventListener("touchstart", (event) => {
    if (!isMobileViewport() || activePage !== "gallery" || window.scrollY > 2 || mobileDiaryPhoto || event.touches.length !== 1) return;
    if (event.target.closest("dialog, input, textarea, select, .photo-media, .tool-dock")) return;
    const touch = event.touches[0];
    pullRefreshState = { x: touch.clientX, y: touch.clientY, distance: 0, tracking: false };
  }, { passive: true });
  document.addEventListener("touchmove", (event) => {
    if (!pullRefreshState || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dy = touch.clientY - pullRefreshState.y;
    const dx = Math.abs(touch.clientX - pullRefreshState.x);
    if (dy <= 0 || dx > dy * .8) {
      pullRefreshState = null;
      return;
    }
    if (dy < 8) return;
    pullRefreshState.tracking = true;
    pullRefreshState.distance = Math.min(110, dy * .55);
    event.preventDefault();
    const ready = pullRefreshState.distance >= 64;
    indicator.classList.add("visible");
    indicator.classList.toggle("ready", ready);
    indicator.style.setProperty("--pull-y", `${pullRefreshState.distance}px`);
    indicator.querySelector("span").textContent = ready ? "松开刷新" : "下拉刷新";
  }, { passive: false });
  document.addEventListener("touchend", async () => {
    if (!pullRefreshState) return;
    const shouldRefresh = pullRefreshState.tracking && pullRefreshState.distance >= 64;
    pullRefreshState = null;
    if (!shouldRefresh) {
      indicator.classList.remove("visible", "ready");
      indicator.style.removeProperty("--pull-y");
      return;
    }
    indicator.classList.add("refreshing");
    indicator.querySelector("span").textContent = "正在刷新";
    try {
      await Promise.all([loadPhotos(), loadNotifications()]);
      indicator.querySelector("span").textContent = "已更新";
    } finally {
      window.setTimeout(() => {
        indicator.classList.remove("visible", "ready", "refreshing");
        indicator.style.removeProperty("--pull-y");
      }, 420);
    }
  }, { passive: true });
  document.addEventListener("touchcancel", () => {
    pullRefreshState = null;
    indicator.classList.remove("visible", "ready", "refreshing");
    indicator.style.removeProperty("--pull-y");
  }, { passive: true });
}

function observeGalleryMasonry() {
  galleryMasonryObserver?.disconnect();
  if (!("ResizeObserver" in window) || !els.gallery) return;
  galleryMasonryObserver = new ResizeObserver(scheduleGalleryMasonryLayout);
  els.gallery.querySelectorAll(".photo-card").forEach((card) => {
    galleryMasonryObserver.observe(card);
  });
}

function getPhotoSearchText(photo) {
  return [
    getDisplayTitle(photo),
    getPlainNote(photo),
    photo.category,
    photo.taken_at,
    photo.created_at,
    formatDate(photo.taken_at),
    formatDateTime(photo.created_at),
    getAuthorName(photo.user_id),
  ]
    .map(normalizeDiarySearchText)
    .join(" ");
}

function updateDiarySearchSuggestions() {
  const list = document.querySelector("#diarySearchSuggestions");
  if (!list) return;
  const values = new Set();
  photos.forEach((photo) => {
    const title = getDisplayTitle(photo);
    if (title) values.add(title);
    if (photo.category) values.add(photo.category);
    const date = formatDate(photo.taken_at || photo.created_at);
    if (date) values.add(date);
  });
  list.innerHTML = [...values].slice(0, 100).map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function filterPhotosBySearch(photoList) {
  return filterDiaryEntries(photoList, diarySearchQuery, getPhotoSearchText);
}

function updateDiarySearchUi() {
  if (els.diarySearchInput && els.diarySearchInput.value !== diarySearchQuery) {
    els.diarySearchInput.value = diarySearchQuery;
  }
  if (els.clearDiarySearch) {
    els.clearDiarySearch.hidden = !diarySearchQuery;
  }
}

function isPhotoWithinSevenDays(photo) {
  return isDiaryWithinDays(photo, 7);
}

async function togglePhotoFlag(photo, field, { adminUnpin = false } = {}) {
  const photoOwnerId = getPhotoOwnerId(photo);
  const canAdminUnpin = Boolean(
    adminUnpin &&
      field === "is_pinned" &&
      session &&
      isAdminAccount() &&
      photo?.is_pinned
  );
  if (
    !cloudDb ||
    !session ||
    !photo ||
    (photoOwnerId && photoOwnerId !== session.user.id && !canAdminUnpin)
  ) return;
  const label = field === "is_pinned" ? "置顶" : "精选";
  if (!photoFlagsCloudAvailable) await verifyPhotoFlagSchema();
  if (!photoFlagsCloudAvailable) {
    setGlobalStatus(`Cloudflare D1 尚未启用${label}字段，请先部署最新版数据库结构。`);
    return;
  }
  const nextValue = canAdminUnpin ? false : !Boolean(photo[field]);
  setGlobalStatus(`正在更新${label}状态...`);

  const result = canAdminUnpin
    ? await diaryRepository.updateAdminUnpin(photo.id, {
        select: "id,is_featured,is_pinned",
        single: true,
      })
    : await diaryRepository.updateOwned(
        photo.id,
        { [field]: nextValue },
        { select: "id,is_featured,is_pinned", single: true }
      );
  const { data, error } = result;

  if (error) {
    setGlobalStatus(
      isMissingCloudSchema(error)
        ? `请先部署最新版 Cloudflare D1 结构，再使用${label}功能。`
        : `${label}更新失败：${error.message}`
    );
    return;
  }

  Object.assign(photo, data || { is_pinned: false });
  setGlobalStatus(nextValue ? `已设为${label}。` : `已取消${label}。`);
  renderGallery();
  if (mobileDiaryPhoto?.id === photo.id && !mobileDiaryPage?.hidden) {
    renderMobileDiaryPage();
  }
}

async function togglePhotoFavorite(photo, button) {
  if (!session || !photo) {
    setGlobalStatus("登录后可以收藏日记。");
    return;
  }

  if (!photo.id) return;
  if (button) button.disabled = true;
  const { favorite: nextFavorite, error } = await photoFavorites.toggle(photo.id);

  if (error) {
    if (button) button.disabled = false;
    setGlobalStatus(
      isMissingCloudSchema(error)
        ? "收藏表尚未启用，请先部署最新版 Cloudflare D1 结构。"
        : `收藏更新失败：${error.message}`
    );
    return;
  }

  if (button) button.disabled = false;
  if (button) {
    button.classList.toggle("active", nextFavorite);
    button.classList.toggle("is-active", nextFavorite);
    button.setAttribute("aria-pressed", String(nextFavorite));
    button.innerHTML = button.hasAttribute("data-mobile-diary-favorite")
      ? `<span class="mobile-diary-action-mark" aria-hidden="true">${nextFavorite ? "♥" : "♡"}</span><span>${nextFavorite ? "已收藏" : "收藏"}</span>`
      : `${nextFavorite ? "♥ 已收藏" : "♡ 收藏"}`;
  }
  setGlobalStatus(nextFavorite ? "已收藏。" : "已取消收藏。");
  renderGallery();
}

function warmUpcomingFeedImages(filteredPhotos, startIndex) {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (isMobileViewport() || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "")) return;
  const upcoming = filteredPhotos.slice(startIndex, startIndex + PAGE_SIZE);
  if (!upcoming.length) return;

  const preload = () => {
    upcoming.forEach((photo) => {
      const image = getPhotoImages(photo)[0];
      const source = image?.thumbnail_url || image?.image_url;
      if (!source) return;
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = source;
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 1200 });
    return;
  }

  window.setTimeout(preload, 80);
}

function getPhotoImages(photo) {
  const storedImages = parseDiaryStoredImages(photo.note);
  const primary = {
    type: photo.type || (photo.motion_url ? "live" : photo.video_url ? "video" : "image"),
    image_url: photo.image_url,
    image_path: photo.image_path || "",
    width: photo.width ?? null,
    height: photo.height ?? null,
    thumbnail_url: photo.thumbnail_url || "",
    thumbnail_path: photo.thumbnail_path || "",
    motion_url: photo.motion_url || "",
    motion_path: photo.motion_path || "",
    motion_type: photo.motion_type || "",
    video_url: photo.video_url || "",
    video_path: photo.video_path || "",
    video_type: photo.video_type || "",
    poster_url: photo.poster_url || photo.image_url || "",
    poster_path: photo.poster_path || photo.image_path || "",
  };
  const images = storedImages.length ? storedImages : [primary];
  const seen = new Set();

  return images
    .map((image) => ({
      type: getDiaryMediaType(image),
      image_url: image.image_url || image.poster_url || image.posterUrl || image.url,
      image_path: image.image_path || image.path || "",
      width: image.width ?? null,
      height: image.height ?? null,
      thumbnail_url: image.thumbnail_url || image.thumb_url || "",
      thumbnail_path: image.thumbnail_path || image.thumb_path || "",
      motion_url: image.motion_url || image.motionUrl || "",
      motion_path: image.motion_path || image.motionPath || "",
      motion_type: image.motion_type || image.motionType || "",
      video_url: image.video_url || image.videoUrl || "",
      video_path: image.video_path || image.videoPath || "",
      video_type: image.video_type || image.videoType || "",
      poster_url: image.poster_url || image.posterUrl || image.image_url || image.url || "",
      poster_path: image.poster_path || image.posterPath || image.image_path || image.path || "",
    }))
    .filter((image) => image.image_url)
    .filter((image) => {
      if (seen.has(image.image_url)) return false;
      seen.add(image.image_url);
      return true;
    });
}

function getPlainNote(photo) {
  return stripDiaryMediaMetadata(photo.note || "");
}

function isSecretImageDialogOpen() {
  return Boolean(els.dialog?.open && els.dialog.classList.contains("secret-image-dialog"));
}

function isSecretImageViewerOpen() {
  return Boolean(isSecretImageDialogOpen() && els.dialog.classList.contains("secret-image-fullscreen"));
}

function isZoomableImageDialogOpen() {
  return Boolean(
    els.dialog?.open &&
      (isSecretImageViewerOpen() ||
        els.dialog.classList.contains("mobile-diary-image-viewer") ||
        els.dialog.classList.contains("diary-image-fullscreen"))
  );
}

function isFittableImageDialogOpen() {
  return Boolean(
    els.dialog?.open &&
      (isZoomableImageDialogOpen() ||
        isSecretImageDialogOpen() ||
        els.dialog.classList.contains("diary-detail-dialog"))
  );
}

function applySecretImageZoom() {
  if (!els.dialogImage) return;
  const { scale, x, y } = secretImageZoom;
  const diaryFullscreen = Boolean(els.dialog?.classList.contains("diary-image-fullscreen"));
  const rotation = diaryFullscreen ? diaryImageRotation : 0;
  const mediaRect = els.dialogMedia?.getBoundingClientRect();
  const rotationFit = rotation % 180 && mediaRect
    ? Math.min(1, mediaRect.width / Math.max(1, mediaRect.height), mediaRect.height / Math.max(1, mediaRect.width))
    : 1;
  const transformScale = scale * rotationFit;
  els.dialogImage.style.transform = scale > 1.01 || rotation
    ? `translate3d(${x}px, ${y}px, 0) scale(${transformScale}) rotate(${rotation}deg)`
    : "";
  els.dialogImage.classList.toggle("is-zoomed", scale > 1.01);
  els.dialogMedia?.classList.toggle("is-zoomed", scale > 1.01);
  refreshDiaryViewerToolbar();
  refreshSecretViewerToolbar();
}

function refreshDiaryViewerToolbar() {
  updateDiaryViewerToolbar({
    toolbar: els.diaryViewerToolbar,
    counter: els.diaryViewerCounter,
    zoomValue: els.diaryViewerZoomValue,
    previousButton: els.diaryViewerPrev,
    nextButton: els.diaryViewerNext,
    open: Boolean(els.dialog?.classList.contains("diary-image-fullscreen")),
    total: dialogImages.length,
    index: dialogImageIndex,
    zoomScale: secretImageZoom.scale,
  });
}

function refreshSecretViewerToolbar() {
  updateSecretViewerToolbar({
    toolbar: els.secretViewerToolbar,
    counter: els.secretViewerCounter,
    zoomValue: els.secretViewerZoomValue,
    previousButton: els.secretViewerPrev,
    nextButton: els.secretViewerNext,
    zoomOutButton: els.secretViewerZoomOut,
    zoomInButton: els.secretViewerZoomIn,
    infoButton: els.secretViewerInfo,
    open: Boolean(isSecretImageDialogOpen() && els.dialog.classList.contains("secret-image-fullscreen")),
    total: dialogImages.length,
    index: dialogImageIndex,
    zoomScale: secretImageZoom.scale,
    infoOpen: secretViewerInfoOpen,
  });
}

function setSecretViewerStatus(state, message = "") {
  setViewerStatus(
    { status: els.secretViewerStatus, text: els.secretViewerStatusText },
    state,
    message
  );
}

function fitSecretViewerImage() {
  if (!isFittableImageDialogOpen()) return;
  fitDialogMedia({ image: els.dialogImage, video: els.dialogVideo, container: els.dialogMedia });
}

function normalizeSecretImageZoom(zoom) {
  const scale = clampNumber(Number(zoom.scale) || 1, 1, 6);
  if (scale <= 1.03) return { scale: 1, x: 0, y: 0 };
  const mediaStyle = els.dialogMedia ? getComputedStyle(els.dialogMedia) : null;
  const mediaWidth = Math.max(
    0,
    (els.dialogMedia?.clientWidth || 0) -
      parseFloat(mediaStyle?.paddingLeft || 0) -
      parseFloat(mediaStyle?.paddingRight || 0)
  );
  const mediaHeight = Math.max(
    0,
    (els.dialogMedia?.clientHeight || 0) -
      parseFloat(mediaStyle?.paddingTop || 0) -
      parseFloat(mediaStyle?.paddingBottom || 0)
  );
  const imageWidth = els.dialogImage?.clientWidth || 0;
  const imageHeight = els.dialogImage?.clientHeight || 0;
  const maxX = Math.max(0, (imageWidth * scale - mediaWidth) / 2);
  const maxY = Math.max(0, (imageHeight * scale - mediaHeight) / 2);
  return {
    scale,
    x: clampNumber(Number(zoom.x) || 0, -maxX, maxX),
    y: clampNumber(Number(zoom.y) || 0, -maxY, maxY),
  };
}

function zoomImageViewerAt(nextScale, clientX, clientY) {
  const currentScale = secretImageZoom.scale;
  const scale = clampNumber(Number(nextScale) || 1, 1, 6);
  if (scale <= 1.03) {
    resetSecretImageZoom();
    return;
  }
  const mediaRect = els.dialogMedia?.getBoundingClientRect();
  const pointX = mediaRect ? clientX - (mediaRect.left + mediaRect.width / 2) : 0;
  const pointY = mediaRect ? clientY - (mediaRect.top + mediaRect.height / 2) : 0;
  const ratio = scale / Math.max(1, currentScale);
  secretImageZoom = normalizeSecretImageZoom({
    scale,
    x: pointX - (pointX - secretImageZoom.x) * ratio,
    y: pointY - (pointY - secretImageZoom.y) * ratio,
  });
  applySecretImageZoom();
}

function resetSecretImageZoom() {
  secretImageGesture = null;
  secretImageZoom = { scale: 1, x: 0, y: 0 };
  diaryImageRotation = 0;
  applySecretImageZoom();
}

function adjustDiaryViewerZoom(delta) {
  if (!els.dialog?.classList.contains("diary-image-fullscreen")) return;
  secretImageZoom = normalizeSecretImageZoom({
    ...secretImageZoom,
    scale: secretImageZoom.scale + delta,
  });
  applySecretImageZoom();
}

async function downloadCurrentDiaryImage() {
  const image = dialogImages[dialogImageIndex] || {};
  const url = image.image_url || "";
  if (!url) return;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("download failed");
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    const safeTitle = String(activeDialogPhoto?.title || "diary-photo").replace(/[\\/:*?\"<>|]+/g, "-");
    link.href = blobUrl;
    link.download = `${safeTitle}-${dialogImageIndex + 1}.jpg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (_error) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function beginSecretImageTouch(event) {
  if (!isZoomableImageDialogOpen()) return;
  if (event.touches.length === 2) {
    const touches = Array.from(event.touches);
    dialogSwipeStart = null;
    secretImageGesture = {
      type: "pinch",
      startDistance: getTouchDistance(touches),
      startCenter: getTouchCenter(touches),
      startScale: secretImageZoom.scale,
      startX: secretImageZoom.x,
      startY: secretImageZoom.y,
    };
    suppressDialogImageClickUntil = Date.now() + 450;
    suppressDialogSwipeUntil = Date.now() + 700;
    event.preventDefault();
    return;
  }
  if (event.touches.length === 1 && secretImageZoom.scale > 1.01) {
    const touch = event.touches[0];
    dialogSwipeStart = null;
    secretImageGesture = {
      type: "pan",
      startTouchX: touch.clientX,
      startTouchY: touch.clientY,
      startX: secretImageZoom.x,
      startY: secretImageZoom.y,
    };
    suppressDialogSwipeUntil = Date.now() + 500;
    event.preventDefault();
  }
}

function moveSecretImageTouch(event) {
  if (!isZoomableImageDialogOpen() || !secretImageGesture) return;
  if (secretImageGesture.type === "pinch" && event.touches.length >= 2) {
    const touches = Array.from(event.touches);
    const distance = getTouchDistance(touches);
    const center = getTouchCenter(touches);
    const nextScale = clampNumber(
      secretImageGesture.startScale * (distance / Math.max(1, secretImageGesture.startDistance)),
      1,
      6
    );
    const mediaRect = els.dialogMedia?.getBoundingClientRect();
    const anchorX = mediaRect
      ? secretImageGesture.startCenter.x - (mediaRect.left + mediaRect.width / 2)
      : 0;
    const anchorY = mediaRect
      ? secretImageGesture.startCenter.y - (mediaRect.top + mediaRect.height / 2)
      : 0;
    const ratio = nextScale / Math.max(1, secretImageGesture.startScale);
    secretImageZoom = normalizeSecretImageZoom({
      scale: nextScale,
      x: anchorX - (anchorX - secretImageGesture.startX) * ratio + (center.x - secretImageGesture.startCenter.x),
      y: anchorY - (anchorY - secretImageGesture.startY) * ratio + (center.y - secretImageGesture.startCenter.y),
    });
    applySecretImageZoom();
    suppressDialogImageClickUntil = Date.now() + 450;
    suppressDialogSwipeUntil = Date.now() + 800;
    event.preventDefault();
    return;
  }
  if (secretImageGesture.type === "pan" && event.touches.length === 1) {
    const touch = event.touches[0];
    secretImageZoom = normalizeSecretImageZoom({
      ...secretImageZoom,
      x: secretImageGesture.startX + touch.clientX - secretImageGesture.startTouchX,
      y: secretImageGesture.startY + touch.clientY - secretImageGesture.startTouchY,
    });
    applySecretImageZoom();
    suppressDialogImageClickUntil = Date.now() + 250;
    suppressDialogSwipeUntil = Date.now() + 500;
    event.preventDefault();
  }
}

function endSecretImageTouch(event) {
  if (!isZoomableImageDialogOpen()) return;
  if (event.touches.length >= 2) {
    beginSecretImageTouch(event);
    return;
  }
  if (event.touches.length === 1 && secretImageZoom.scale > 1.01) {
    const touch = event.touches[0];
    secretImageGesture = {
      type: "pan",
      startTouchX: touch.clientX,
      startTouchY: touch.clientY,
      startX: secretImageZoom.x,
      startY: secretImageZoom.y,
    };
    return;
  }
  secretImageGesture = null;
  suppressDialogSwipeUntil = Date.now() + 600;
  if (secretImageZoom.scale <= 1.03) resetSecretImageZoom();
}

function handleSecretViewerWheel(event) {
  if (isMobileViewport() || !els.dialog?.open || !dialogImages.length) return;

  const isDiaryDetail = els.dialog.classList.contains("diary-detail-dialog");
  const isDiaryViewer = els.dialog.classList.contains("diary-image-fullscreen");
  const isSecretDialog = isSecretImageDialogOpen();
  const isSecretViewer = isSecretImageViewerOpen();
  if (!isDiaryDetail && !isDiaryViewer && !isSecretDialog) return;

  if (isDiaryViewer || isSecretViewer) {
    if (secretImageZoom.scale > 1.01) {
      event.preventDefault();
      const step = event.deltaY > 0 ? -0.18 : 0.18;
      zoomImageViewerAt(secretImageZoom.scale + step, event.clientX, event.clientY);
      return;
    }
  }

  if (dialogImages.length > 1 && Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    dialogWheelAccumulator += event.deltaY * unit;
    window.clearTimeout(dialogWheelResetTimer);
    dialogWheelResetTimer = window.setTimeout(() => {
      dialogWheelAccumulator = 0;
    }, 180);

    const threshold = 88;
    const now = Date.now();
    if (Math.abs(dialogWheelAccumulator) < threshold || now < dialogWheelLockedUntil) return;

    const direction = dialogWheelAccumulator > 0 ? 1 : -1;
    dialogWheelAccumulator = 0;
    dialogWheelLockedUntil = now + 260;
    moveDialogImage(direction, true);
  }
}

function preloadDialogNeighbors() {
  if (dialogImages.length <= 1) return;
  [-1, 1].forEach((step) => {
    const index = (dialogImageIndex + step + dialogImages.length) % dialogImages.length;
    const url = dialogImages[index]?.image_url;
    if (!url) return;
    const preloader = new Image();
    preloader.decoding = "async";
    preloader.src = url;
  });
}

function renderDialogMedia(entryDirection = 0) {
  resetSecretImageZoom();
  if (!isSecretImageViewerOpen()) {
    els.dialogImage.style.removeProperty("width");
    els.dialogImage.style.removeProperty("height");
  }
  if (els.dialogMedia) {
    els.dialogMedia.scrollTop = 0;
    els.dialogMedia.scrollLeft = 0;
  }
  const image = dialogImages[dialogImageIndex] || dialogImages[0] || {};
  const imageUrl = getDiaryMediaPosterUrl(image);
  const motionUrl = getDiaryMediaVideoUrl(image);
  const hasMotion = Boolean(motionUrl);
  const dialogVisual = hasMotion ? els.dialogVideo : els.dialogImage;
  const imageRequestId = ++dialogImageRequestId;
  const secretTags = normalizeSecretPhotoTags(image);
  els.dialogImage.hidden = hasMotion;
  els.dialogImage.style.display = hasMotion ? "none" : "";
  els.dialogImage.classList.toggle("is-loading", Boolean(imageUrl && !hasMotion));
  els.dialogImage.classList.remove("is-load-error");
  els.dialogImage.dataset.dialogImageRequestId = String(imageRequestId);
  els.dialogImage.removeAttribute("src");
  if (els.dialogVideo) {
    els.dialogVideo.controls = !isMobileViewport();
    stopDiaryMotionVideo(els.dialogVideo);
    els.dialogVideo.hidden = !hasMotion;
    els.dialogVideo.style.display = hasMotion ? "block" : "none";
    if (hasMotion) {
      els.dialogVideo.poster = imageUrl;
      els.dialogVideo.src = motionUrl;
      startDiaryMotionVideo(els.dialogVideo, els.dialogMedia);
    }
  }
  if (isSecretImageViewerOpen()) {
    setSecretViewerStatus(imageUrl ? "loading" : "", imageUrl ? "正在加载图片" : "");
  }
  if (imageUrl && !hasMotion) {
    const preloader = new Image();
    preloader.decoding = "async";
    preloader.onload = () => {
      if (imageRequestId !== dialogImageRequestId) return;
      els.dialogImage.src = imageUrl;
      els.dialogImage.classList.remove("is-loading", "is-load-error");
      if (isSecretImageViewerOpen()) setSecretViewerStatus("");
      if (isFittableImageDialogOpen()) {
        requestAnimationFrame(() => {
          if (imageRequestId !== dialogImageRequestId) return;
          fitSecretViewerImage();
        });
      }
    };
    preloader.onerror = () => {
      if (imageRequestId !== dialogImageRequestId) return;
      els.dialogImage.classList.remove("is-loading");
      els.dialogImage.classList.add("is-load-error");
      if (isSecretImageViewerOpen()) setSecretViewerStatus("error", "图片加载失败，请稍后重试");
    };
    preloader.src = imageUrl;
  }
  if (!hasMotion && isFittableImageDialogOpen()) {
    requestAnimationFrame(() => {
      if (imageRequestId !== dialogImageRequestId || !isFittableImageDialogOpen() || !els.dialogImage.complete || !els.dialogImage.naturalWidth) return;
      fitSecretViewerImage();
      els.dialogImage.classList.remove("is-loading", "is-load-error");
      setSecretViewerStatus("");
    });
  }
  els.dialog?.style.setProperty("--diary-viewer-backdrop", `url(${JSON.stringify(imageUrl)})`);
  els.dialogImage.style.removeProperty("transition");
  els.dialogImage.style.removeProperty("opacity");
  els.dialogVideo?.style.removeProperty("transition");
  els.dialogVideo?.style.removeProperty("transform");
  els.dialogVideo?.style.removeProperty("opacity");
  els.dialogImage.alt = `${els.dialogTitle.textContent} ${dialogImageIndex + 1}`;
  if (els.dialogVideo) els.dialogVideo.setAttribute("aria-label", `${els.dialogTitle.textContent} ${dialogImageIndex + 1}`);
  if (entryDirection) {
    dialogVisual.style.transition = "none";
    dialogVisual.style.transform = `translate3d(${entryDirection * 24}vw, 0, 0)`;
    dialogVisual.style.opacity = "0.6";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialogVisual.style.transition = "transform 190ms cubic-bezier(0.22, 0.78, 0.2, 1), opacity 170ms ease";
        dialogVisual.style.transform = "translate3d(0, 0, 0)";
        dialogVisual.style.opacity = "1";
      });
    });
  }
  preloadDialogNeighbors();
  if (activeSecretDialogItem) {
    els.dialogMeta.textContent = `${secretTags.slice(0, 2).join(" · ")} · ${dialogImageIndex + 1} / ${dialogImages.length}`;
    els.dialogNote.innerHTML = renderSecretDialogControls(image);
  } else {
    els.dialogNote.textContent = els.dialogNote.textContent || "";
  }
  renderDialogPagination({
    images: dialogImages,
    index: dialogImageIndex,
    secret: Boolean(activeSecretDialogItem),
    previousButton: els.dialogPrev,
    nextButton: els.dialogNext,
    counter: els.dialogCounter,
    dots: els.dialogDots,
    thumbs: els.dialogThumbs,
    onSelect: (index) => {
      dialogImageIndex = index;
      renderDialogMedia();
    },
  });
  refreshSecretViewerToolbar();
  bindSecretDialogControls();
}

function renderSecretDialogControls(image) {
  return buildSecretDialogControls(image);
}

function bindSecretDialogControls() {
  if (!activeSecretDialogItem) return;
  bindSecretDialogControlsView({
    container: els.dialogNote,
    onFavorite: () => {
      const current = dialogImages[dialogImageIndex] || {};
      void updateSecretDialogImage({ favorite: !current.favorite });
    },
    onRemoveTag: (tag) => void updateSecretDialogImage({ removeTag: tag }),
    onAddTag: (tag) => void updateSecretDialogImage({ addTag: tag }),
  });
}

function moveDialogImage(step, animate = false) {
  if (dialogImages.length <= 1) return;
  const nextIndex = activeSecretDialogItem
    ? clampNumber(dialogImageIndex + step, 0, dialogImages.length - 1)
    : (dialogImageIndex + step + dialogImages.length) % dialogImages.length;
  if (nextIndex === dialogImageIndex) {
    els.dialogImage.style.transition = "transform 160ms ease, opacity 160ms ease";
    els.dialogImage.style.transform = "";
    els.dialogImage.style.opacity = "1";
    return;
  }
  dialogImageIndex = nextIndex;
  renderDialogMedia(animate ? (step > 0 ? 1 : -1) : 0);
}

function beginDialogSwipe(event) {
  if (event.target.closest("button")) return;
  if (
    (els.dialog?.classList.contains("diary-image-fullscreen") || isSecretImageViewerOpen()) &&
    !isMobileViewport() &&
    secretImageZoom.scale > 1.01
  ) {
    desktopImagePan = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: secretImageZoom.x,
      startY: secretImageZoom.y,
    };
    suppressDialogImageClickUntil = Date.now() + 450;
    els.dialogMedia?.setPointerCapture?.(event.pointerId);
    return;
  }
  if (dialogImages.length <= 1) return;
  if (isZoomableImageDialogOpen()) {
    if (secretImageGesture || secretImageZoom.scale > 1.01 || Date.now() < suppressDialogSwipeUntil) return;
  }
  dialogSwipeStart = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    time: Date.now(),
    tracking: false,
  };
  els.dialogMedia?.setPointerCapture?.(event.pointerId);
}

function moveDialogSwipe(event) {
  if (desktopImagePan?.id === event.pointerId) {
    secretImageZoom = normalizeSecretImageZoom({
      ...secretImageZoom,
      x: desktopImagePan.startX + event.clientX - desktopImagePan.x,
      y: desktopImagePan.startY + event.clientY - desktopImagePan.y,
    });
    applySecretImageZoom();
    return;
  }
  if (!dialogSwipeStart || dialogSwipeStart.id !== event.pointerId) return;
  if (isZoomableImageDialogOpen() && (secretImageGesture || secretImageZoom.scale > 1.01)) return;
  const deltaX = event.clientX - dialogSwipeStart.x;
  const deltaY = Math.abs(event.clientY - dialogSwipeStart.y);
  if (!dialogSwipeStart.tracking && Math.abs(deltaX) < 7) return;
  if (!dialogSwipeStart.tracking && deltaY > Math.abs(deltaX)) {
    cancelDialogSwipe();
    return;
  }
  dialogSwipeStart.tracking = true;
  suppressDialogImageClickUntil = Date.now() + 450;
  els.dialogMedia?.classList.add("is-image-swiping");
  els.dialogImage.style.transition = "none";
  els.dialogImage.style.transform = `translate3d(${deltaX * 0.82}px, 0, 0)`;
  els.dialogImage.style.opacity = String(Math.max(0.72, 1 - Math.abs(deltaX) / Math.max(1, window.innerWidth * 1.8)));
}

function finishDialogSwipe(event) {
  if (desktopImagePan?.id === event.pointerId) {
    desktopImagePan = null;
    suppressDialogImageClickUntil = Date.now() + 180;
    return;
  }
  if (!dialogSwipeStart || dialogSwipeStart.id !== event.pointerId) return;
  if (isZoomableImageDialogOpen()) {
    if (secretImageGesture || secretImageZoom.scale > 1.01 || Date.now() < suppressDialogSwipeUntil) {
      dialogSwipeStart = null;
      return;
    }
  }
  const deltaX = event.clientX - dialogSwipeStart.x;
  const deltaY = event.clientY - dialogSwipeStart.y;
  const elapsed = Date.now() - dialogSwipeStart.time;
  dialogSwipeStart = null;

  const swipeThreshold = isSecretImageDialogOpen() ? 52 : 48;
  const swipeRatio = isSecretImageDialogOpen() ? 1.2 : 1.25;
  const horizontal = Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * swipeRatio;
  els.dialogMedia?.classList.remove("is-image-swiping");
  if (!horizontal || elapsed > 1200) {
    els.dialogImage.style.transition = "transform 180ms cubic-bezier(0.22, 0.78, 0.2, 1), opacity 180ms ease";
    els.dialogImage.style.transform = "translate3d(0, 0, 0)";
    els.dialogImage.style.opacity = "1";
    return;
  }
  els.dialogImage.style.transition = "transform 140ms ease, opacity 140ms ease";
  els.dialogImage.style.transform = `translate3d(${deltaX < 0 ? "-36vw" : "36vw"}, 0, 0)`;
  els.dialogImage.style.opacity = "0.55";
  window.setTimeout(() => moveDialogImage(deltaX < 0 ? 1 : -1, true), 120);
}

function cancelDialogSwipe() {
  desktopImagePan = null;
  dialogSwipeStart = null;
  els.dialogMedia?.classList.remove("is-image-swiping");
  if (secretImageZoom.scale <= 1.01) {
    els.dialogImage.style.transition = "transform 180ms cubic-bezier(0.22, 0.78, 0.2, 1), opacity 180ms ease";
    els.dialogImage.style.transform = "translate3d(0, 0, 0)";
    els.dialogImage.style.opacity = "1";
  }
}

function beginDialogBackSwipe(event) {
  if (!isMobileViewport() || !els.dialog.open) return;
  if (!els.dialog.classList.contains("mobile-page-dialog") && !els.dialog.classList.contains("secret-image-dialog")) return;
  if (event.target.closest("button, input, textarea, select, a")) return;
  const edge = getMobileBackEdge(event.clientX);
  if (!edge) return;
  dialogBackSwipeStart = {
    id: event.pointerId,
    edge,
    x: event.clientX,
    y: event.clientY,
    time: Date.now(),
  };
}

function finishDialogBackSwipe(event) {
  if (!dialogBackSwipeStart || dialogBackSwipeStart.id !== event.pointerId) return;
  const edgeBack = isEdgeBackSwipe(dialogBackSwipeStart, event);
  dialogBackSwipeStart = null;
  if (edgeBack) closePhotoDialog();
}

function cancelDialogBackSwipe() {
  dialogBackSwipeStart = null;
}

function updateFeedLoader(totalItems) {
  if (!els.feedLoader) return;
  els.feedLoader.hidden = activePage !== "gallery" || totalItems === 0;
  if (els.feedLoader.hidden) return;

  const hasMore = visiblePhotoCount < totalItems;
  els.feedLoader.classList.toggle("complete", !hasMore);
  els.feedLoaderText.textContent = hasMore
    ? `继续下滑加载 · ${Math.min(visiblePhotoCount, totalItems)} / ${totalItems}`
    : `已经到底了 · 共 ${totalItems} 篇`;
}

function initializeFeedObserver() {
  if (!els.feedLoader || feedObserver) return;
  feedObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (
        !entry?.isIntersecting ||
        feedLoading ||
        activePage !== "gallery" ||
        visiblePhotoCount >= filteredPhotoCount
      ) {
        return;
      }

      feedLoading = true;
      els.feedLoader.classList.add("loading");
      visiblePhotoCount = Math.min(
        visiblePhotoCount + PAGE_SIZE,
        filteredPhotoCount
      );
      renderGallery();
      feedLoading = false;
      els.feedLoader.classList.remove("loading");
    },
    { rootMargin: "1200px 0px 900px", threshold: 0.01 }
  );
  feedObserver.observe(els.feedLoader);
}

async function createTrashItem(itemType, itemId, label, payload) {
  if (!cloudDb || !session || !itemId) return false;
  const deletedAt = new Date();
  const expiresAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const trashId = crypto.randomUUID();
  const { error } = await householdRepository.insert("trash_items", {
    id: trashId,
    user_id: session.user.id,
    item_type: itemType,
    item_id: itemId,
    label: String(label || "").slice(0, 120),
    payload,
    deleted_at: deletedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    console.warn("Trash write failed:", error);
    return false;
  }
  return trashId;
}

async function snapshotPhotoCommentsForTrash(photoId) {
  if (!photoId) return [];
  const { data, error } = await diaryRepository.listComments(photoId);
  if (error) {
    throw new Error(`删除前读取留言失败，已取消删除：${error.message}`);
  }
  return (data || []).map((comment) => ({
    id: comment.id,
    photo_id: photoId,
    user_id: comment.user_id,
    parent_id: comment.parent_id || null,
    body: String(comment.body || ""),
    created_at: comment.created_at,
    updated_at: comment.updated_at || comment.created_at,
  }));
}

async function rollbackTrashItem(trashId) {
  if (!trashId || !cloudDb || !session) return;
  await householdRepository.remove("trash_items", { id: trashId }, { owned: true });
}

function confirmWishDeletion(wish) {
  return confirmAction({
    eyebrow: "移到回收站",
    title: "删除这个心愿？",
    message: `“${wish.title}”会保留 30 天，期间可以从设置里的回收站恢复。`,
    confirmLabel: "删除心愿",
    cancelLabel: "先保留",
    danger: true,
  });
}

function getTrashImagePaths(item) {
  const payload = item?.payload || {};
  if (item?.item_type === "photo") {
    return getPhotoImages(payload).flatMap(getStoredPhotoMediaPaths);
  }
  if (item?.item_type === "secret") {
    return [
      payload.cover_path,
      ...normalizeSecretImages(payload.images).flatMap((image) => [image.image_path, image.thumbnail_path]),
    ].filter(Boolean);
  }
  if (item?.item_type === "wish") {
    const media = parseWishStoredNote(payload.note);
    return [media.imagePath].filter(Boolean);
  }
  if (item?.item_type === "weekend") {
    const media = parseWeekendStoredNote(payload.note);
    return media.images
      .flatMap((image) => [image.image_path, image.thumbnail_path])
      .filter(Boolean);
  }
  return [];
}

function getStoredPhotoMediaPaths(image = {}) {
  return [
    image.image_path,
    image.thumbnail_path,
    image.motion_path,
    image.poster_path,
    image.video_path,
  ].filter(Boolean);
}

async function loadTrashItems() {
  if (!cloudDb || !session) return [];
  const { data, error } = await householdRepository.rpc("list_trash_items", { p_limit: 500 });
  if (error) throw error;
  return data || [];
}

async function restoreTrashItem(item) {
  if (!item || !cloudDb || !session) return;
  const { error: restoreError } = await householdRepository.rpc("restore_trash_item", {
    p_trash_id: item.id,
  });
  if (restoreError) {
    showMiniToast(`恢复失败：${restoreError.message}`, { kind: "error", duration: 3200 });
    return;
  }
  showMiniToast("已恢复", { kind: "success" });
  await Promise.all([
    loadPhotos(),
    loadSecretItems(),
    loadGratitudeNotes(),
    synchronizeWeekendPlans(),
    synchronizeAnniversaries(),
    synchronizeAccountData(),
  ]);
  await renderTrashItems();
}

async function permanentlyDeleteTrashItem(item) {
  if (!item) return;
  const confirmed = await confirmAction({
    eyebrow: "永久删除",
    title: "彻底删除这条记录？",
    message: "关联图片也会一并清理，之后无法恢复。",
    confirmLabel: "永久删除",
    cancelLabel: "取消",
    danger: true,
  });
  if (!confirmed) return;
  const { error } = await householdRepository.rpc("permanently_delete_trash_item", {
    p_trash_id: item.id,
  });
  if (error) {
    showMiniToast(`永久删除失败：${error.message}`, { kind: "error" });
    return;
  }
  const paths = [...new Set(getTrashImagePaths(item))];
  if (paths.length) cleanupStoredImagePaths(paths).catch(() => {});
  showMiniToast("已永久删除", { kind: "success" });
  await renderTrashItems();
}

function getTrashOwnershipLabel(item) {
  const ownerName = String(item?.owner_username || "").trim();
  const deletedByName = String(item?.deleted_by_username || "").trim();
  if (ownerName && deletedByName && ownerName !== deletedByName) {
    return `原发布者：${ownerName} · 删除者：${deletedByName}`;
  }
  return `发布者：${ownerName || deletedByName || "家庭成员"}`;
}

async function deletePhoto(photo, triggerButton = null) {
  if (!cloudDb || !session || !photo) {
    setGlobalStatus("请先登录后再删除日记。");
    return false;
  }

  if (photo.user_id && photo.user_id !== session.user.id) {
    setGlobalStatus("只能删除自己发布的日记。");
    return false;
  }

  const ok = await confirmAction({
    eyebrow: "移到回收站",
    title: "删除这篇日记？",
    message: `“${getPhotoLabel(photo)}”会保留 30 天，期间可以恢复。`,
    confirmLabel: "删除日记",
    cancelLabel: "先保留",
    danger: true,
  });
  if (!ok) return false;

  setGlobalStatus("正在删除日记...");
  const originalButtonText = triggerButton?.textContent || "删除";
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "删除中";
  }

  try {
    const comments = await snapshotPhotoCommentsForTrash(photo.id);
    const trashPayload = { ...photo, comments };
    const trashSaved = await createTrashItem("photo", photo.id, getPhotoLabel(photo), trashPayload);
    if (!trashSaved) throw new Error("无法写入回收站，已取消删除。");
    const { data: deletedRows, error: deleteError } = await diaryRepository.remove(photo.id, {
      select: "id",
    });

    if (deleteError) {
      await rollbackTrashItem(trashSaved);
      throw new Error(`数据库删除失败：${deleteError.message}`);
    }
    if (!deletedRows?.length) {
      await rollbackTrashItem(trashSaved);
      throw new Error("数据库没有删除任何记录，请确认 Cloudflare D1 权限和表结构已部署。");
    }

    photos = photos.filter((item) => item.id !== photo.id);
    photoFavorites.remove(photo.id);
    renderGallery();
    setGlobalStatus("日记已移到回收站，可在设置中恢复。");
    showMiniToast("已移到回收站", { kind: "success" });

    await loadPhotos();
    return true;
  } catch (error) {
    setGlobalStatus(error.message || "删除失败，请稍后重试。");
    if (triggerButton?.isConnected) {
      triggerButton.disabled = false;
      triggerButton.textContent = originalButtonText;
    }
    return false;
  }
}

function lockDialogBackgroundScroll(scrollY = window.scrollY || window.pageYOffset || 0) {
  lockedDialogScrollY = Math.max(0, Number(scrollY) || 0);
  dialogLockUsesFixed = isMobileViewport();
  if (!dialogLockUsesFixed) return;
  document.documentElement.classList.add("dialog-scroll-locked");
  document.body.classList.add("dialog-scroll-locked");
  document.body.classList.add("dialog-scroll-fixed");
  document.body.style.top = `-${lockedDialogScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockDialogBackgroundScroll(restoreScroll = lockedDialogScrollY) {
  const nextScroll = Math.max(0, Number(restoreScroll) || lockedDialogScrollY || 0);
  const shouldRestore = dialogLockUsesFixed;
  document.documentElement.classList.remove("dialog-scroll-locked");
  document.body.classList.remove("dialog-scroll-locked");
  document.body.classList.remove("dialog-scroll-fixed");
  document.body.style.removeProperty("top");
  document.body.style.removeProperty("left");
  document.body.style.removeProperty("right");
  document.body.style.removeProperty("width");
  lockedDialogScrollY = 0;
  dialogLockUsesFixed = false;
  if (shouldRestore) {
    window.scrollTo({ top: nextScroll, behavior: "auto" });
  }
}

function ensurePhotoDialogBackdrop() {
  if (photoDialogBackdrop) return photoDialogBackdrop;
  photoDialogBackdrop = document.createElement("div");
  photoDialogBackdrop.className = "photo-dialog-backdrop";
  photoDialogBackdrop.hidden = true;
  photoDialogBackdrop.addEventListener("click", closePhotoDialog);
  photoDialogBackdrop.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );
  document.body.append(photoDialogBackdrop);
  return photoDialogBackdrop;
}

function closePhotoDialog() {
  if (mobileDiaryImageViewerOpen) {
    closeMobileDiaryImageViewer();
    return;
  }
  if (mobileDiaryPage && !mobileDiaryPage.hidden) {
    closeMobileDiaryPage();
    return;
  }
  if (els.dialog?.classList.contains("diary-image-fullscreen")) {
    els.dialog.classList.remove("diary-image-fullscreen");
    resetSecretImageZoom();
    els.dialog.scrollTop = 0;
    return;
  }
  if (!els.dialog.open) return;
  els.dialog.removeAttribute("open");
  ensurePhotoDialogBackdrop().hidden = true;
  document.body.classList.remove("photo-dialog-open");
  els.dialog.dispatchEvent(new Event("close"));
}

function openMobileDiaryImageViewer() {
  if (!mobileDiaryPhoto) return;
  mobileDiaryImageViewerOpen = true;
  resetSecretImageZoom();
  if (mobileDiaryPage) mobileDiaryPage.hidden = true;
  activeDialogPhoto = mobileDiaryPhoto;
  activeSecretDialogItem = null;
  dialogImages = getPhotoImages(mobileDiaryPhoto);
  dialogImageIndex = Math.min(Math.max(0, mobileDiaryImageIndex), Math.max(0, dialogImages.length - 1));
  els.dialog.className = "no-comments-dialog mobile-diary-image-viewer";
  els.dialogTitle.textContent = getDisplayTitle(mobileDiaryPhoto) || "日记图片";
  els.dialogMeta.textContent = `${dialogImageIndex + 1} / ${dialogImages.length}`;
  els.dialogNote.textContent = "";
  els.photoCommentsSection.hidden = true;
  if (els.dialogRandomButton) els.dialogRandomButton.hidden = true;
  if (els.dialogSecretReturnButton) els.dialogSecretReturnButton.hidden = true;
  if (els.dialogSecretLinkButton) els.dialogSecretLinkButton.hidden = true;
  renderDialogMedia();
  ensurePhotoDialogBackdrop().hidden = true;
  els.dialog.setAttribute("open", "");
}

function closeMobileDiaryImageViewer() {
  if (!mobileDiaryImageViewerOpen) return;
  mobileDiaryImageViewerOpen = false;
  resetSecretImageZoom();
  mobileDiaryImageIndex = dialogImageIndex;
  els.dialog.removeAttribute("open");
  els.dialog.classList.remove("mobile-diary-image-viewer", "no-comments-dialog");
  els.dialogImage.hidden = false;
  if (els.dialogVideo) {
    stopDiaryMotionVideo(els.dialogVideo);
    els.dialogVideo.hidden = true;
  }
  els.dialogImage.style.transform = "";
  els.dialogMedia?.classList.remove("is-zoomed");
  document.body.classList.remove("photo-dialog-open", "mobile-dialog-open");
  if (photoDialogBackdrop) photoDialogBackdrop.hidden = true;
  if (mobileDiaryPage) {
    mobileDiaryPage.hidden = false;
    renderMobileDiaryPage();
  }
}

function showPhotoDialogPreservingScroll() {
  const restoreScroll = dialogRestoreScrollY;
  ensurePhotoDialogBackdrop().hidden = false;
  document.body.classList.add("photo-dialog-open");
  if (!els.dialog.open) els.dialog.setAttribute("open", "");
  if (!dialogLockUsesFixed && Math.abs((window.scrollY || window.pageYOffset || 0) - restoreScroll) > 2) {
    window.scrollTo({ top: restoreScroll, behavior: "auto" });
  }
}

function captureDialogReturnTarget(photo) {
  dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
  dialogRestorePhotoId = photo?.id || "";
  dialogRestorePhotoTop = 0;
  dialogRestoreSecretImageUrl = "";
  dialogRestoreElementTop = 0;
  if (!dialogRestorePhotoId || !els.gallery) return;
  const card = els.gallery.querySelector(`[data-photo-id="${cssEscapeValue(dialogRestorePhotoId)}"]`);
  if (card) {
    dialogRestorePhotoTop = card.getBoundingClientRect().top;
  }
}

function restoreDialogReturnTarget(restoreScroll = dialogRestoreScrollY) {
  const photoId = dialogRestorePhotoId;
  const cardTop = dialogRestorePhotoTop;
  const secretImageUrl = dialogRestoreSecretImageUrl;
  const secretImageTop = dialogRestoreElementTop;
  const fallback = Math.max(0, Number(restoreScroll) || 0);
  const restore = () => {
    if (secretImageUrl && els.secretGallery) {
      const image = [...els.secretGallery.querySelectorAll(".secret-album-photo img[data-full-src]")]
        .find((entry) => entry.dataset.fullSrc === secretImageUrl);
      const tile = image?.closest(".secret-album-photo");
      if (tile) {
        const target = Math.max(
          0,
          (window.scrollY || window.pageYOffset || 0) + tile.getBoundingClientRect().top - secretImageTop
        );
        window.scrollTo({ top: target, behavior: "auto" });
        return;
      }
    }
    if (!photoId || !els.gallery) {
      window.scrollTo({ top: fallback, behavior: "auto" });
      return;
    }
    const card = els.gallery.querySelector(`[data-photo-id="${cssEscapeValue(photoId)}"]`);
    if (!card) {
      window.scrollTo({ top: fallback, behavior: "auto" });
      return;
    }
    const currentTop = card.getBoundingClientRect().top;
    const target = Math.max(0, (window.scrollY || window.pageYOffset || 0) + currentTop - cardTop);
    window.scrollTo({ top: target, behavior: "auto" });
  };
  requestAnimationFrame(() => {
    restore();
    window.setTimeout(restore, 80);
  });
}

function ensureMobileDiaryPage() {
  if (mobileDiaryPage) return mobileDiaryPage;
  mobileDiaryPage = createMobileDiaryPage({
    handlers: {
      close: closeMobileDiaryPage,
      selectImage: (index) => {
        mobileDiaryImageIndex = index;
        renderMobileDiaryPage();
      },
      openImage: () => {
        if (!mobileDiaryPhoto || Date.now() < mobileDiarySuppressImageClickUntil) return;
        openMobileDiaryImageViewer();
      },
      reply: startMobileDiaryReply,
      deleteComment: (id) => void deletePhotoComment(id),
      cancelReply: cancelMobileDiaryReply,
      favorite: (button) => {
        if (!mobileDiaryPhoto) return;
        void togglePhotoFavorite(mobileDiaryPhoto, button).then(() => {
          if (!mobileDiaryPage?.hidden && mobileDiaryPhoto) renderMobileDiaryPage();
        });
      },
      edit: () => {
        if (!mobileDiaryPhoto) return;
        const photo = mobileDiaryPhoto;
        closeMobileDiaryPage();
        openEditPhoto(photo);
      },
      adminCategory: () => {
        if (mobileDiaryPhoto) void adminUpdatePhotoCategory(mobileDiaryPhoto);
      },
      adminUnpin: () => {
        if (mobileDiaryPhoto) void togglePhotoFlag(mobileDiaryPhoto, "is_pinned", { adminUnpin: true });
      },
      deleteDiary: () => {
        if (!mobileDiaryPhoto) return;
        const photo = mobileDiaryPhoto;
        void deletePhoto(photo).then((deleted) => {
          if (deleted) closeMobileDiaryPage();
        });
      },
      submitComment: (event) => void saveMobileDiaryComment(event),
      beginBackSwipe: beginMobileDiaryBackSwipe,
      moveBackSwipe: moveMobileDiaryBackSwipe,
      endBackSwipe: endMobileDiaryBackSwipe,
      cancelBackSwipe: cancelMobileDiaryBackSwipe,
      beginImageSwipe: beginMobileDiaryImageSwipe,
      moveImageSwipe: moveMobileDiaryImageSwipe,
      endImageSwipe: endMobileDiaryImageSwipe,
      cancelImageSwipe: cancelMobileDiaryImageSwipe,
    },
  });
  return mobileDiaryPage;
}
function renderMobileDiaryComments() {
  refreshMobileDiaryComments({
    page: mobileDiaryPage,
    comments: photoComments,
    replyToId: mobileDiaryReplyToId,
    photoOwnerId: mobileDiaryPhoto?.user_id || "",
    currentUserId: session?.user?.id || "",
    getAuthorName,
    renderAvatar: renderAvatarMarkup,
  });
}

function renderMobileDiaryPage() {
  const page = ensureMobileDiaryPage();
  const photo = mobileDiaryPhoto;
  if (!photo) return;
  const images = getPhotoImages(photo);
  mobileDiaryImageIndex = Math.min(Math.max(0, mobileDiaryImageIndex), Math.max(0, images.length - 1));
  const canComment = Boolean(
    session &&
      photo &&
      (photo.user_id === session.user.id || familyMemberMap.has(photo.user_id))
  );
  page.innerHTML = buildMobileDiaryPageMarkup({
    photo,
    images,
    imageIndex: mobileDiaryImageIndex,
    comments: photoComments,
    signedIn: Boolean(session),
    currentUserId: session?.user?.id || "",
    canComment,
    admin: isAdminAccount(),
    favorite: isFavoritePhoto(photo),
    getDisplayTitle,
    getPlainNote,
    getAuthorName,
    renderAvatar: renderAvatarMarkup,
  });
  startDiaryMotionVideo(page.querySelector(".mobile-diary-motion"));
  renderMobileDiaryComments();
}

function moveMobileDiaryImage(step) {
  const images = getPhotoImages(mobileDiaryPhoto);
  if (images.length <= 1) return;
  mobileDiaryImageIndex = (mobileDiaryImageIndex + step + images.length) % images.length;
  renderMobileDiaryPage();
}

function openMobileDiaryPage(photo, initialImageIndex = 0, options = {}) {
  if (!photo) return;
  mobileDiaryRestoreScrollY = window.scrollY || window.pageYOffset || 0;
  mobileDiaryPhoto = photo;
  mobileDiaryImageIndex = Math.max(0, Number(initialImageIndex) || 0);
  mobileDiaryReplyToId = null;
  activeDialogPhoto = photo;
  dialogRandomMode = Boolean(options.randomMode);
  dialogSecretSourceItem = options.secretSourceItem || null;
  photoComments = [];
  if (photo.id) void acknowledgeViewedDiary(photo.id);
  ensureMobileDiaryPage().hidden = false;
  document.body.classList.add("mobile-diary-page-open");
  renderMobileDiaryPage();
  mobileDiaryPage.scrollTop = 0;
  requestAnimationFrame(() => {
    mobileDiaryPage.scrollTop = 0;
  });
  void loadPhotoComments(photo.id);
}

function closeMobileDiaryPage() {
  if (!mobileDiaryPage || mobileDiaryPage.hidden) return;
  mobileDiaryPage.hidden = true;
  mobileDiaryPhoto = null;
  mobileDiaryReplyToId = null;
  mobileDiaryBackSwipeStart = null;
  photoComments = [];
  activeDialogPhoto = null;
  dialogRandomMode = false;
  dialogSecretSourceItem = null;
  document.body.classList.remove("mobile-diary-page-open");
  mobileDiaryPage.classList.remove("is-back-swiping", "is-back-committing");
  mobileDiaryPage.style.removeProperty("--back-swipe-x");
  mobileDiaryPage.style.removeProperty("--back-swipe-progress");
}

function startMobileDiaryReply(commentId) {
  const comment = photoComments.find((item) => item.id === commentId);
  if (!comment) return;
  mobileDiaryReplyToId = comment.id;
  renderMobileDiaryComments();
  mobileDiaryPage?.querySelector("[data-mobile-diary-comment-input]")?.focus();
}

function cancelMobileDiaryReply() {
  mobileDiaryReplyToId = null;
  renderMobileDiaryComments();
}

async function saveMobileDiaryComment(event) {
  event.preventDefault();
  if (!cloudDb || !session || !mobileDiaryPhoto) return;
  const input = mobileDiaryPage?.querySelector("[data-mobile-diary-comment-input]");
  const status = mobileDiaryPage?.querySelector("[data-mobile-diary-comment-status]");
  const body = input?.value.trim() || "";
  if (!body) return;
  if (status) status.textContent = "正在发送...";
  const { error } = await diaryRepository.addComment({
    photo_id: mobileDiaryPhoto.id,
    user_id: session.user.id,
    body,
    parent_id: mobileDiaryReplyToId,
  });
  if (error) {
    if (status) status.textContent = isMissingCloudSchema(error) ? "请先部署最新版 Cloudflare D1 结构。" : `发送失败：${error.message}`;
    return;
  }
  if (input) input.value = "";
  mobileDiaryReplyToId = null;
  await loadPhotoComments(mobileDiaryPhoto.id);
  await loadPhotoCommentPreviews();
  const gainedExp = await awardExperience("comment");
  if (status) status.textContent = gainedExp ? `留言已发送。修为 +${gainedExp}` : "留言已发送。";
}

function beginMobileDiaryBackSwipe(event) {
  if (!mobileDiaryPage || mobileDiaryPage.hidden || event.pointerType === "mouse") return;
  if (event.target.closest(".mobile-diary-media, .mobile-diary-thumbs, button, input, textarea, select, a")) return;
  mobileDiaryBackSwipeStart = { id: event.pointerId, edge: "right", x: event.clientX, y: event.clientY, time: Date.now(), tracking: false };
  try {
    mobileDiaryPage.setPointerCapture(event.pointerId);
  } catch {
  }
}

function moveMobileDiaryBackSwipe(event) {
  if (!mobileDiaryBackSwipeStart || mobileDiaryBackSwipeStart.id !== event.pointerId) return;
  const rawDeltaX = event.clientX - mobileDiaryBackSwipeStart.x;
  const deltaX = mobileDiaryBackSwipeStart.edge === "left" ? Math.max(0, rawDeltaX) : Math.min(0, rawDeltaX);
  const deltaY = Math.abs(event.clientY - mobileDiaryBackSwipeStart.y);
  if (!mobileDiaryBackSwipeStart.tracking && Math.abs(deltaX) < 5) return;
  if (!mobileDiaryBackSwipeStart.tracking && deltaY > Math.abs(deltaX)) {
    mobileDiaryBackSwipeStart = null;
    return;
  }
  mobileDiaryBackSwipeStart.tracking = true;
  if (event.cancelable) event.preventDefault();
}

function endMobileDiaryBackSwipe(event) {
  if (!mobileDiaryBackSwipeStart) return;
  const elapsed = Math.max(1, Date.now() - mobileDiaryBackSwipeStart.time);
  const distance = Math.abs(event.clientX - mobileDiaryBackSwipeStart.x);
  const velocity = distance / elapsed;
  const shouldClose =
    isEdgeBackSwipe(mobileDiaryBackSwipeStart, event, { threshold: 48, ratio: 1.08, maxElapsed: 1200 }) ||
    (distance > 26 && velocity > 0.32);
  mobileDiaryBackSwipeStart = null;
  if (shouldClose) {
    closeMobileDiaryPage();
  }
}

function cancelMobileDiaryBackSwipe() {
  mobileDiaryBackSwipeStart = null;
  if (!mobileDiaryPage) return;
  mobileDiaryPage.classList.remove("is-back-swiping", "is-back-committing");
  mobileDiaryPage.style.removeProperty("--back-swipe-x");
  mobileDiaryPage.style.removeProperty("--back-swipe-progress");
}

function beginMobileDiaryImageSwipe(event) {
  if (!mobileDiaryPage || mobileDiaryPage.hidden || event.pointerType === "mouse") return;
  if (!event.target.closest(".mobile-diary-media")) return;
  if (getPhotoImages(mobileDiaryPhoto).length <= 1) return;
  mobileDiaryImageSwipeStart = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    time: Date.now(),
    tracking: false,
  };
}

function moveMobileDiaryImageSwipe(event) {
  if (!mobileDiaryImageSwipeStart || mobileDiaryImageSwipeStart.id !== event.pointerId) return;
  const deltaX = event.clientX - mobileDiaryImageSwipeStart.x;
  const deltaY = Math.abs(event.clientY - mobileDiaryImageSwipeStart.y);
  if (!mobileDiaryImageSwipeStart.tracking && Math.abs(deltaX) < 5) return;
  if (!mobileDiaryImageSwipeStart.tracking && deltaY > Math.abs(deltaX) * 1.05) {
    cancelMobileDiaryImageSwipe();
    return;
  }
  mobileDiaryImageSwipeStart.tracking = true;
  mobileDiarySuppressImageClickUntil = Date.now() + 450;
  const button = mobileDiaryPage?.querySelector(".mobile-diary-image-button");
  if (!button) return;
  button.classList.add("is-swiping");
  button.style.setProperty("--diary-image-swipe-x", `${clampNumber(deltaX * 0.82, -window.innerWidth, window.innerWidth)}px`);
}

function cancelMobileDiaryImageSwipe() {
  mobileDiaryImageSwipeStart = null;
  const button = mobileDiaryPage?.querySelector(".mobile-diary-image-button");
  if (!button) return;
  button.classList.remove("is-swiping");
  button.style.setProperty("--diary-image-swipe-x", "0px");
  window.setTimeout(() => button.style.removeProperty("--diary-image-swipe-x"), 180);
}

function endMobileDiaryImageSwipe(event) {
  if (!mobileDiaryImageSwipeStart || mobileDiaryImageSwipeStart.id !== event.pointerId) return;
  const deltaX = event.clientX - mobileDiaryImageSwipeStart.x;
  const deltaY = Math.abs(event.clientY - mobileDiaryImageSwipeStart.y);
  const elapsed = Date.now() - mobileDiaryImageSwipeStart.time;
  mobileDiaryImageSwipeStart = null;
  const velocity = Math.abs(deltaX) / Math.max(1, elapsed);
  const horizontal =
    Math.abs(deltaX) > 26 &&
    Math.abs(deltaX) > deltaY * 1.05 &&
    elapsed < 1200 &&
    (Math.abs(deltaX) > 42 || velocity > 0.28);
  if (!horizontal) {
    cancelMobileDiaryImageSwipe();
    return;
  }
  mobileDiarySuppressImageClickUntil = Date.now() + 450;
  moveMobileDiaryImage(deltaX < 0 ? 1 : -1);
}

function canStartGlobalMobileBackSwipe(event) {
  if (!isMobileViewport() || event.pointerType === "mouse") return false;
  if (mobileDiaryImageViewerOpen) return false;
  if (mobileDiaryPage && !mobileDiaryPage.hidden) return false;
  if (els.dialog?.open) return false;
  if (event.target.closest("button, input, textarea, select, a, .dialog-media, .mobile-diary-media, .secret-photo-grid, .diary-card-media")) return false;
  return Boolean(getMobileBackEdge(event.clientX));
}

function performGlobalMobileBack() {
  if (!els.setupPanel.hidden) {
    els.setupPanel.hidden = true;
    return true;
  }
  if (activePage !== "gallery") {
    switchPage("gallery");
    window.scrollTo({ top: 0, behavior: "auto" });
    return true;
  }
  if (window.history.length > 1) {
    window.history.back();
    return true;
  }
  return false;
}

function beginGlobalMobileBackSwipe(event) {
  if (!canStartGlobalMobileBackSwipe(event)) return;
  globalMobileBackSwipeStart = {
    id: event.pointerId,
    edge: getMobileBackEdge(event.clientX),
    x: event.clientX,
    y: event.clientY,
    time: Date.now(),
    tracking: false,
  };
}

function moveGlobalMobileBackSwipe(event) {
  if (!globalMobileBackSwipeStart || globalMobileBackSwipeStart.id !== event.pointerId) return;
  if (globalMobileBackSwipeStart.edge !== "left") return;
  const deltaX = Math.max(0, event.clientX - globalMobileBackSwipeStart.x);
  const deltaY = Math.abs(event.clientY - globalMobileBackSwipeStart.y);
  if (!globalMobileBackSwipeStart.tracking && deltaX < 8) return;
  if (!globalMobileBackSwipeStart.tracking && deltaY > deltaX) {
    cancelGlobalMobileBackSwipe();
    return;
  }
  globalMobileBackSwipeStart.tracking = true;
}

function finishGlobalMobileBackSwipe(event) {
  if (!globalMobileBackSwipeStart || globalMobileBackSwipeStart.id !== event.pointerId) return;
  const shouldGoBack = isEdgeBackSwipe(globalMobileBackSwipeStart, event, {
    threshold: 74,
    ratio: 1.35,
    maxElapsed: 1100,
  });
  globalMobileBackSwipeStart = null;
  if (shouldGoBack) {
    performGlobalMobileBack();
  }
}

function cancelGlobalMobileBackSwipe() {
  globalMobileBackSwipeStart = null;
  document.body.classList.remove("mobile-global-back-swiping", "mobile-global-back-committing");
  document.documentElement.style.removeProperty("--global-back-swipe-x");
}

function openPhoto(photo, initialImageIndex = 0, options = {}) {
  if (isMobileViewport() && !options.forceDialog) {
    openMobileDiaryPage(photo, initialImageIndex, options);
    return;
  }
  captureDialogReturnTarget(photo);
  lockDialogBackgroundScroll(dialogRestoreScrollY);
  activeDialogPhoto = photo;
  dialogRandomMode = Boolean(options.randomMode);
  activeSecretDialogItem = null;
  dialogSecretSourceItem = options.secretSourceItem || null;
  els.dialog.classList.remove("no-comments-dialog", "secret-image-dialog", "mobile-page-dialog", "secret-image-fullscreen", "diary-detail-dialog", "diary-image-fullscreen", "wish-detail-dialog", "wish-detail-no-image");
  els.dialog.classList.add("diary-detail-dialog");
  if (els.wishDialogFeedback) {
    els.wishDialogFeedback.hidden = true;
    els.wishDialogFeedback.classList.remove("empty");
    els.wishDialogFeedbackText.textContent = "";
    els.wishDialogCompletedAt.textContent = "";
  }
  if (photo.id) void acknowledgeViewedDiary(photo.id);
  els.photoCommentsSection.hidden = false;
  const displayTitle = getDisplayTitle(photo);
  dialogImages = getPhotoImages(photo);
  dialogImageIndex = Math.min(
    Math.max(0, Number(initialImageIndex) || 0),
    Math.max(0, dialogImages.length - 1)
  );
  els.dialogTitle.textContent = displayTitle || "日记";
  els.dialogMeta.textContent = `${photo.category || "日常"} · ${formatDateTime(photo.created_at)} · ${getAuthorName(photo.user_id)}`;
  els.dialogNote.textContent = getPlainNote(photo);
  if (els.dialogRandomButton) {
    els.dialogRandomButton.hidden = !dialogRandomMode;
  }
  if (els.dialogSecretLinkButton) {
    els.dialogSecretLinkButton.hidden = true;
  }
  if (els.dialogSecretReturnButton) {
    els.dialogSecretReturnButton.hidden = !dialogSecretSourceItem;
  }
  renderDialogMedia();
  void loadPhotoComments(photo.id);
  if (isMobileViewport()) {
    els.dialog.classList.add("mobile-page-dialog");
    document.body.classList.add("mobile-dialog-open");
  } else {
    document.body.classList.remove("mobile-dialog-open");
  }
  showPhotoDialogPreservingScroll();
}

function openWishImage(wish) {
  if (!wish) return;
  dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
  dialogRestorePhotoId = "";
  dialogRestorePhotoTop = 0;
  dialogRestoreSecretImageUrl = "";
  dialogRestoreElementTop = 0;
  lockDialogBackgroundScroll(dialogRestoreScrollY);
  activeDialogPhoto = null;
  dialogRandomMode = false;
  activeSecretDialogItem = null;
  dialogSecretSourceItem = null;
  els.dialog.classList.remove("mobile-page-dialog", "secret-image-dialog", "secret-image-fullscreen", "diary-detail-dialog", "diary-image-fullscreen", "wish-detail-no-image");
  els.dialog.classList.add("no-comments-dialog", "wish-detail-dialog");
  document.body.classList.remove("mobile-dialog-open");
  photoComments = [];
  dialogImages = wish.imageUrl ? [{ image_url: wish.imageUrl }] : [];
  dialogImageIndex = 0;
  els.dialog.classList.toggle("wish-detail-no-image", !wish.imageUrl);
  els.dialogTitle.textContent = wish.title || "心愿";
  els.dialogMeta.textContent = `${wish.type || "心愿"} · ${wish.priority || "普通"} · ${getAuthorName(wish.userId)} 发布`;
  els.dialogNote.textContent = wish.note || "";
  if (els.wishDialogFeedback) {
    els.wishDialogFeedback.hidden = !wish.done;
    els.wishDialogCompletedAt.textContent = wish.completedAt ? `完成于 ${formatWishDate(wish.completedAt)}` : "已经完成";
    els.wishDialogFeedbackText.textContent = wish.completionNote || "这个心愿已经完成，还没有留下完成感想。";
    els.wishDialogFeedback.classList.toggle("empty", !wish.completionNote);
  }
  if (els.dialogRandomButton) {
    els.dialogRandomButton.hidden = true;
  }
  els.photoCommentsSection.hidden = true;
  renderDialogMedia();
  els.dialog.scrollTop = 0;
  showPhotoDialogPreservingScroll();
}

function openEditPhoto(photo) {
  if (!photo) return;
  resetEditImageState();
  editingPhoto = photo;
  editingImages = getPhotoImages(photo).map((image) => ({ ...image }));
  els.deleteEditingPhoto.disabled = false;
  els.deleteEditingPhoto.textContent = "删除整篇";
  els.saveEditStatus.textContent = "";
  els.editTitleInput.value = getDisplayTitle(photo);
  els.editDateInput.value = toDateInputValue(photo.taken_at);
  els.editCategoryInput.value = photo.category || "日常";
  els.editPublicInput.value = String(photo.is_public !== false);
  els.editNoteInput.value = getPlainNote(photo);
  renderEditImages();
  els.editDialog.showModal();
}

async function savePhotoEdit(event) {
  event.preventDefault();
  if (!cloudDb || !session || !editingPhoto || !editingImages.length) {
    els.saveEditStatus.textContent = "请先登录，并至少保留一张图片。";
    return;
  }

  const takenAt = els.editDateInput.value || toDateInputValue(new Date());
  const title = els.editTitleInput.value.trim();
  const nextImages = [];
  const newlyUploadedPaths = [];
  els.saveEditStatus.textContent = "正在处理图片...";

  try {
    for (const [index, image] of editingImages.entries()) {
      const replacement = editingImageFiles.get(index);
      if (!replacement) {
        nextImages.push(image);
        continue;
      }

      const uploaded = await uploadImageFile(
        replacement,
        `${slugify(title || "photo")}-edit-${index + 1}`,
        index + 1,
        editingImages.length
      );
      if (!uploaded) throw new Error("替换图片上传失败。");
      nextImages.push(uploaded);
      if (uploaded.image_path) newlyUploadedPaths.push(uploaded.image_path);
      if (uploaded.motion_path) newlyUploadedPaths.push(uploaded.motion_path);
      if (uploaded.poster_path) newlyUploadedPaths.push(uploaded.poster_path);
      if (uploaded.video_path) newlyUploadedPaths.push(uploaded.video_path);
      if (image.image_path) editingRemovedPaths.add(image.image_path);
      if (image.thumbnail_path) editingRemovedPaths.add(image.thumbnail_path);
      if (image.motion_path) editingRemovedPaths.add(image.motion_path);
      if (image.poster_path) editingRemovedPaths.add(image.poster_path);
      if (image.video_path) editingRemovedPaths.add(image.video_path);
    }

    const primaryImage = nextImages[0];
    const updates = {
      title,
      note: composeDiaryStoredNote(els.editNoteInput.value.trim(), nextImages),
      category: els.editCategoryInput.value,
      taken_at: takenAt,
      is_public: els.editPublicInput.value === "true",
      image_path: primaryImage.image_path || "",
      image_url: primaryImage.image_url,
      width: primaryImage.width,
      height: primaryImage.height,
    };

    els.saveEditStatus.textContent = "正在保存...";
    const { error } = await diaryRepository.updateOwned(editingPhoto.id, updates);
    if (error) throw error;

    const nextImagePaths = new Set(nextImages.flatMap(getStoredPhotoMediaPaths));
    const pathsToRemove = [...editingRemovedPaths].filter(
      (path) => path && !nextImagePaths.has(path)
    );
    if (pathsToRemove.length) {
      const cleanupError = await cleanupStoredImagePaths(pathsToRemove).then(() => null).catch((error) => error);
      if (cleanupError) {
        console.warn("Album saved, but old image cleanup failed:", cleanupError);
      }
    }

    els.editDialog.close();
    editingPhoto = null;
    resetEditImageState();
    await loadPhotos();
    const gainedExp = await awardExperience("diaryEdit");
    setGlobalStatus(`日记和合集内容已更新。${gainedExp ? ` 修为 +${gainedExp}` : ""}`);
  } catch (error) {
    els.saveEditStatus.textContent = error.message || "保存失败，请稍后重试。";
    if (newlyUploadedPaths.length) {
      void cleanupStoredImagePaths(newlyUploadedPaths);
    }
  }
}

function renderEditImages() {
  els.editImageCount.textContent = `${editingImages.length} 张`;
  els.editImageList.innerHTML = editingImages
    .map((image, index) => {
      const file = editingImageFiles.get(index);
      const previewUrl = file ? getEditPreviewUrl(file, index) : image.image_url;
      return `
        <article class="edit-image-item">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <img src="${escapeHtml(previewUrl || "")}" alt="合集第 ${index + 1} 张" />
          <div>
            <label class="edit-image-picker" for="editImageInput" data-replace-edit-image="${index}">替换</label>
            <button type="button" data-delete-edit-image="${index}">删除</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.editImageList.querySelectorAll("[data-replace-edit-image]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      editingReplaceIndex = Number(trigger.dataset.replaceEditImage);
      els.editImageInput.value = "";
    });
  });
  els.editImageList.querySelectorAll("[data-delete-edit-image]").forEach((button) => {
    button.addEventListener("click", () => removeEditingImage(Number(button.dataset.deleteEditImage)));
  });
}

function getEditPreviewUrl(file, index) {
  if (editingPreviewUrls[index]) return editingPreviewUrls[index];
  const url = URL.createObjectURL(file);
  editingPreviewUrls[index] = url;
  return url;
}

function replaceEditingImage() {
  const files = Array.from(els.editImageInput.files || []);
  if (!files.length) return;
  if (editingReplaceIndex < 0) {
    appendEditingImageFiles(files);
    return;
  }
  const file = files[0];
  if (!file || !editingImages[editingReplaceIndex]) return;
  if (editingPreviewUrls[editingReplaceIndex]) {
    URL.revokeObjectURL(editingPreviewUrls[editingReplaceIndex]);
    editingPreviewUrls[editingReplaceIndex] = "";
  }
  editingImageFiles.set(editingReplaceIndex, file);
  els.saveEditStatus.textContent = `第 ${editingReplaceIndex + 1} 张将在保存时替换。`;
  editingReplaceIndex = -1;
  renderEditImages();
}

function appendEditingImageFiles(files) {
  if (!editingPhoto) return;
  const imageLimit = getCurrentImageLimit();
  const remaining = imageLimit - editingImages.length;
  if (remaining <= 0) {
    els.saveEditStatus.textContent = `当前 VIP 等级单篇最多 ${imageLimit} 张图。`;
    return;
  }
  const nextFiles = files.slice(0, remaining);
  nextFiles.forEach((file) => {
    const index = editingImages.length;
    editingImages.push({
      image_path: "",
      image_url: "",
      width: 0,
      height: 0,
    });
    editingImageFiles.set(index, file);
  });
  editingReplaceIndex = -1;
  els.saveEditStatus.textContent =
    files.length > remaining
      ? `已追加 ${nextFiles.length} 张，当前等级最多 ${imageLimit} 张。`
      : `已追加 ${nextFiles.length} 张图片，保存后上传。`;
  renderEditImages();
}

function startAppendEditingImages() {
  if (!editingPhoto) return;
  editingReplaceIndex = -1;
  els.editImageInput.value = "";
}

function handleEditImagePaste(event) {
  if (!editingPhoto) return;
  const items = Array.from(event.clipboardData?.items || []);
  const imageItems = items.filter((item) => item.type.startsWith("image/"));
  if (!imageItems.length) return;
  const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  const normalizedFiles = files.map((file, index) => {
    const extension = file.type?.split("/")[1] || "png";
    return new File([file], `edit-pasted-${Date.now()}-${index + 1}.${extension}`, {
      type: file.type || "image/png",
    });
  });
  appendEditingImageFiles(normalizedFiles);
}

async function removeEditingImage(index) {
  if (editingImages.length <= 1) {
    els.saveEditStatus.textContent = "一篇笔记至少保留一张图片。";
    return;
  }
  const image = editingImages[index];
  if (!image) return;
  const confirmed = await confirmAction({
    eyebrow: "编辑日记图片",
    title: `删除第 ${index + 1} 张图片？`,
    message: "保存日记修改后，这张图片才会从合集里移除。",
    confirmLabel: "移除图片",
    cancelLabel: "取消",
    danger: true,
  });
  if (!confirmed) return;
  if (image.image_path) editingRemovedPaths.add(image.image_path);
  if (image.thumbnail_path) editingRemovedPaths.add(image.thumbnail_path);
  if (image.motion_path) editingRemovedPaths.add(image.motion_path);
  if (image.poster_path) editingRemovedPaths.add(image.poster_path);
  if (image.video_path) editingRemovedPaths.add(image.video_path);
  if (editingPreviewUrls[index]) URL.revokeObjectURL(editingPreviewUrls[index]);
  editingImages.splice(index, 1);
  editingPreviewUrls.splice(index, 1);

  const nextFiles = new Map();
  editingImageFiles.forEach((file, fileIndex) => {
    if (fileIndex < index) nextFiles.set(fileIndex, file);
    if (fileIndex > index) nextFiles.set(fileIndex - 1, file);
  });
  editingImageFiles = nextFiles;
  els.saveEditStatus.textContent = "图片将在保存后从合集中删除。";
  renderEditImages();
}

function resetEditImageState() {
  editingPreviewUrls.forEach((url) => {
    if (url) URL.revokeObjectURL(url);
  });
  editingImages = [];
  editingImageFiles = new Map();
  editingRemovedPaths = new Set();
  editingReplaceIndex = -1;
  editingPreviewUrls = [];
  if (els.editImageList) els.editImageList.innerHTML = "";
}

async function deletePhotoFromEditor() {
  if (!editingPhoto) return;
  const photo = editingPhoto;
  const deleted = await deletePhoto(photo, els.deleteEditingPhoto);
  if (deleted) {
    els.editDialog.close();
    els.deleteEditingPhoto.disabled = false;
    els.deleteEditingPhoto.textContent = "删除整篇";
    editingPhoto = null;
    resetEditImageState();
  }
}

function toDateInputValue(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function getFinalTitle() {
  return els.titleInput.value.trim();
}

function getUploadFileNameBase(title, index = 0, total = 1) {
  const dateText = els.dateInput.value || toDateInputValue(new Date());
  const base = title || `photo-${dateText}`;
  return total > 1 ? `${slugify(base)}-${String(index + 1).padStart(2, "0")}` : slugify(base);
}

function getDisplayTitle(photo) {
  const title = String(photo.title || "").trim();
  if (!title || isGeneratedTitle(title)) return "";

  return title;
}

function getPhotoLabel(photo) {
  return getDisplayTitle(photo) || "无标题日记";
}

function isGeneratedTitle(title) {
  if (title === "未命名照片") return true;
  return GENERATED_TITLE_PREFIXES.some((prefix) => title.startsWith(`${prefix} · `));
}

function makeCuteTitle(date) {
  const label = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const seed = date.getFullYear() + date.getMonth() + date.getDate();
  return `${GENERATED_TITLE_PREFIXES[seed % GENERATED_TITLE_PREFIXES.length]} · ${label}`;
}

function cssEscapeValue(value) {
  if (window.CSS?.escape) return window.CSS.escape(String(value || ""));
  return String(value || "").replace(/["\\]/g, "\\$&");
}

function getRedirectUrl() {
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return PRODUCTION_URL;
  }

  return new URL("./", window.location.href).toString();
}

function usernameToEmail(username) {
  const normalized = username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\-\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) return "";

  const ascii = normalized
    .replace(/[\u4e00-\u9fa5]/g, (char) => `u${char.codePointAt(0).toString(16)}`)
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 48);

  return `${ascii || "user"}@life-vlog.local`;
}

function getSessionDisplayName() {
  const metadataName = session?.user?.user_metadata?.username;
  if (metadataName) return metadataName;

  const emailPrefix = session?.user?.email?.split("@")[0];
  return emailPrefix || "User";
}

function getSessionBoundEmail() {
  const metadataEmail = String(session?.user?.user_metadata?.bound_email || "").trim().toLowerCase();
  if (metadataEmail) return metadataEmail;
  const sessionEmail = String(session?.user?.email || "").trim().toLowerCase();
  return /@life-vlog\.local$/i.test(sessionEmail) ? "" : sessionEmail;
}

function getAvatarCacheKey(userId = session?.user?.id) {
  return userId ? `${AVATAR_CACHE_KEY}:${userId}` : "";
}

function loadCachedAvatarUrl(userId = session?.user?.id) {
  const key = getAvatarCacheKey(userId);
  if (!key) return "";
  try {
    return String(localStorage.getItem(key) || "").trim();
  } catch {
    return "";
  }
}

function saveCachedAvatarUrl(userId, avatarUrl) {
  const key = getAvatarCacheKey(userId);
  if (!key) return;
  try {
    if (avatarUrl) localStorage.setItem(key, String(avatarUrl));
    else localStorage.removeItem(key);
  } catch {
  }
}

function getSessionLoginName() {
  const metadataName = session?.user?.user_metadata?.login_username;
  if (metadataName) return metadataName;

  const emailPrefix = session?.user?.email?.split("@")[0];
  return emailPrefix || getSessionDisplayName();
}

function getPhotoOwnerId(photo) {
  return String(photo?.user_id || photo?.userId || photo?.owner_id || "").trim();
}

function isAdminAccount() {
  if (!session?.user?.id) return false;
  if (familyInfo?.isOwner) return true;
  return [
    getSessionLoginName(),
    getSessionDisplayName(),
    session.user.user_metadata?.username,
    session.user.user_metadata?.login_username,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .includes("xiudan320");
}

async function adminUpdatePhotoCategory(photo) {
  if (!photo || !cloudDb || !session || !isAdminAccount()) return;
  const category = await choosePhotoCategory(photo.category || "日常");
  if (!category || category === photo.category) return;
  const { data, error } = await cloudDb.rpc("admin_update_photo_category", {
    p_photo_id: photo.id,
    p_category: category,
  });
  if (error) {
    showMiniToast(`分类修改失败：${error.message}`, { kind: "error", duration: 3200 });
    return;
  }
  photo.category = data?.category || category;
  if (mobileDiaryPhoto?.id === photo.id) {
    mobileDiaryPhoto.category = photo.category;
    renderMobileDiaryPage();
  }
  renderGallery();
  showMiniToast(`已改为“${photo.category}”`, { kind: "success" });
}

function choosePhotoCategory(current = "日常") {
  return new Promise((resolve) => {
    let dialog = document.querySelector("#adminCategoryDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "adminCategoryDialog";
      dialog.className = "admin-category-dialog";
      document.body.append(dialog);
    }
    dialog.innerHTML = `
      <form method="dialog">
        <div><p class="kicker">Admin</p><h2>修改日记分类</h2><p>选择正确的现有分类。</p></div>
        <label>分类<select name="category">${PHOTO_CATEGORIES.map((item) => `<option value="${item}" ${item === current ? "selected" : ""}>${item}</option>`).join("")}</select></label>
        <div class="admin-category-actions"><button value="cancel" type="submit">取消</button><button class="primary" value="confirm" type="submit">保存分类</button></div>
      </form>`;
    const finish = () => {
      const value = dialog.returnValue === "confirm" ? dialog.querySelector("select")?.value || "" : "";
      dialog.removeEventListener("close", finish);
      resolve(value);
    };
    dialog.addEventListener("close", finish);
    dialog.showModal();
  });
}

function normalizeNickname(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

function updateSessionDisplayName(nickname) {
  const nextName = normalizeNickname(nickname);
  if (!nextName || !session?.user) return;
  session.user.user_metadata = {
    ...(session.user.user_metadata || {}),
    username: nextName,
    login_username: getSessionLoginName(),
  };
  els.profileName.textContent = nextName;
  renderAccountAvatar(accountProfile.avatarUrl, nextName);
  renderSettingsSummary();
  renderExperience(nextName);
}

function isMissingCloudSchema(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

function normalizeUuid(value) {
  const candidate = String(value || "");
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)) {
    return candidate;
  }
  return crypto.randomUUID();
}

function getAuthorName(userId) {
  if (!userId) return "我";
  if (userId === session?.user?.id) return getSessionDisplayName();
  return (
    familyMemberMap.get(userId)?.username ||
    familyLevelProfiles.get(userId)?.username ||
    "其他用户"
  );
}

function getAuthorAvatar(userId) {
  const familyAvatar = getProfileAvatarUrl(familyMemberMap.get(userId) || {});
  const cloudAvatar = getProfileAvatarUrl(familyLevelProfiles.get(userId) || {});
  if (userId === session?.user?.id) {
    return (
      getProfileAvatarUrl(accountProfile) ||
      cloudAvatar ||
      familyAvatar ||
      loadCachedAvatarUrl(userId)
    );
  }
  return cloudAvatar || familyAvatar || loadCachedAvatarUrl(userId);
}

function renderAvatarMarkup(userId, className = "photo-comment-avatar") {
  const name = getAuthorName(userId);
  const avatarUrl = getAuthorAvatar(userId);
  return avatarUrl
    ? `<span class="${className}" data-avatar-fallback="${escapeHtml(getInitial(name))}"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}的头像" decoding="async" /></span>`
    : `<span class="${className}">${escapeHtml(getInitial(name))}</span>`;
}

document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const avatar = image.closest("[data-avatar-fallback]");
    if (!avatar) return;
    avatar.textContent = avatar.dataset.avatarFallback || "";
  },
  true
);

function renderAccountAvatar(avatarUrl = "", displayName = getSessionDisplayName()) {
  const resolvedAvatarUrl =
    getProfileAvatarUrl({
      avatar_url: avatarUrl || accountProfile.avatarUrl,
      avatar_path: accountProfile.avatarPath,
    }) ||
    loadCachedAvatarUrl(session?.user?.id);
  const hasAvatar = Boolean(resolvedAvatarUrl);
  els.avatarImage.hidden = !hasAvatar;
  els.avatarInitial.hidden = hasAvatar;
  if (hasAvatar) {
    els.avatarImage.src = resolvedAvatarUrl;
    if (session?.user?.id) saveCachedAvatarUrl(session.user.id, resolvedAvatarUrl);
  }
  else els.avatarImage.removeAttribute("src");
  els.avatarInitial.textContent = getInitial(displayName);
}

function getMobileFeedLayoutKey(userId = session?.user?.id || "guest") {
  return preferenceStore.scopedKey(MOBILE_FEED_LAYOUT_KEY, userId || "guest");
}

function loadMobileFeedLayout(userId = session?.user?.id || "guest") {
  return preferenceStore.readEnum(
    MOBILE_FEED_LAYOUT_KEY,
    ["single", "double"],
    "double",
    { scope: userId || "guest" }
  );
}

function applyMobileFeedLayout(layout = loadMobileFeedLayout()) {
  const nextLayout = layout === "single" ? "single" : "double";
  document.body.classList.toggle("mobile-feed-single", nextLayout === "single");
  document.body.classList.toggle("mobile-feed-double", nextLayout === "double");
  if (els.settingsFeedLayoutValue) {
    els.settingsFeedLayoutValue.textContent = nextLayout === "single" ? "单列" : "双列";
  }
  scheduleGalleryMasonryLayout();
}

function setMobileFeedLayout(layout) {
  const nextLayout = layout === "single" ? "single" : "double";
  preferenceStore.write(getMobileFeedLayoutKey(), nextLayout);
  applyMobileFeedLayout(nextLayout);
  renderSettingsSummary();
}

function getMobileSecretLayoutKey(userId = session?.user?.id || "guest") {
  return preferenceStore.scopedKey(MOBILE_SECRET_LAYOUT_KEY, userId || "guest");
}

function loadMobileSecretLayout(userId = session?.user?.id || "guest") {
  return preferenceStore.readEnum(
    MOBILE_SECRET_LAYOUT_KEY,
    ["single", "double"],
    "double",
    { scope: userId || "guest" }
  );
}

function ensureSecretLayoutToggle() {
  if (!els.secretPage) return null;
  let button = els.secretPage.querySelector("[data-secret-layout-toggle]");
  if (button) return button;
  const head = els.secretPage.querySelector(".secret-head");
  if (!head) return null;
  button = document.createElement("button");
  button.className = "secret-layout-toggle";
  button.type = "button";
  button.dataset.secretLayoutToggle = "true";
  button.addEventListener("click", () => {
    setMobileSecretLayout(loadMobileSecretLayout() === "single" ? "double" : "single");
  });
  head.append(button);
  return button;
}

function applyMobileSecretLayout(layout = loadMobileSecretLayout()) {
  const nextLayout = layout === "single" ? "single" : "double";
  document.body.classList.toggle("mobile-secret-single", nextLayout === "single");
  document.body.classList.toggle("mobile-secret-double", nextLayout === "double");
  const button = ensureSecretLayoutToggle();
  if (button) {
    button.textContent = nextLayout === "single" ? "单列" : "双列";
    button.title = nextLayout === "single" ? "秘藏当前为单列显示" : "秘藏当前为双列显示";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", nextLayout === "single" ? "true" : "false");
  }
}

function setMobileSecretLayout(layout) {
  const nextLayout = layout === "single" ? "single" : "double";
  preferenceStore.write(getMobileSecretLayoutKey(), nextLayout);
  applyMobileSecretLayout(nextLayout);
}

function updateSecretToolbarTop() {
  const toolbar = els.secretGallery?.querySelector(".secret-album-toolbar");
  const head = els.secretGallery?.querySelector(".secret-album-head");
  if (!toolbar || !head) return;
  if (window.matchMedia(`(max-width: ${MOBILE_DIALOG_BREAKPOINT}px)`).matches) {
    toolbar.style.removeProperty("--secret-toolbar-top");
    const albumView = head.closest(".secret-album-view");
    const topbarBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom || 136;
    albumView?.classList.toggle("show-mobile-back", head.getBoundingClientRect().bottom < topbarBottom + 8);
    return;
  }
  const topbarBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom || 76;
  const pinnedTop = Math.ceil(topbarBottom + 78);
  toolbar.style.setProperty("--secret-toolbar-top", `${pinnedTop}px`);
}

function syncMobileComposerPlacement() {
  if (!els.composer || !els.galleryHead) return;
  const isMobile = window.matchMedia(`(max-width: ${MOBILE_DIALOG_BREAKPOINT}px)`).matches;
  const isInsideHead = els.composer.parentElement === els.galleryHead;
  if (isMobile && !isInsideHead) {
    els.galleryHead.append(els.composer);
    return;
  }
  if (!isMobile && isInsideHead) {
    els.galleryHead.parentElement?.insertBefore(els.composer, els.galleryHead);
  }
}

function changeCacheLimit() {
  ensureCacheManagementUi();
  if (!els.cacheLimitDialog || !els.cacheLimitInput) return;
  const secretInput = document.querySelector("#secretCacheLimitInput");
  els.cacheLimitInput.value = String(loadCacheCapacityMb("diary"));
  if (secretInput) secretInput.value = String(loadCacheCapacityMb("secret"));
  if (els.cacheLimitStatus) {
    els.cacheLimitStatus.textContent = `日记 ${els.cacheLimitInput.value} MB · 秘藏 ${secretInput?.value || DEFAULT_SECRET_CACHE_MB} MB`;
  }
  openSettingsChildDialog(els.cacheLimitDialog, () => {
    requestAnimationFrame(() => {
      els.cacheLimitInput.focus();
      els.cacheLimitInput.select();
    });
  });
}

function saveCacheLimitFromDialog(event) {
  event.preventDefault();
  const diaryMb = saveCacheCapacityMb("diary", els.cacheLimitInput?.value);
  const secretMb = saveCacheCapacityMb("secret", document.querySelector("#secretCacheLimitInput")?.value);
  scheduleOfflineMediaCache();
  renderSettingsSummary();
  void refreshCacheInfo();
  if (els.cacheLimitStatus) {
    els.cacheLimitStatus.textContent = `已保存：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
  }
  if (els.settingsCacheStatus) {
    els.settingsCacheStatus.textContent = `容量上限：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
  }
  window.setTimeout(() => {
    if (els.cacheLimitDialog?.open) els.cacheLimitDialog.close();
  }, 420);
}

function applyCacheLimitPreset(value) {
  if (!els.cacheLimitInput) return;
  const diaryMb = normalizeCacheMb(value, DEFAULT_DIARY_CACHE_MB);
  const secretMb = normalizeCacheMb(diaryMb * 3, DEFAULT_SECRET_CACHE_MB);
  els.cacheLimitInput.value = String(diaryMb);
  const secretInput = document.querySelector("#secretCacheLimitInput");
  if (secretInput) secretInput.value = String(secretMb);
  if (els.cacheLimitStatus) {
    els.cacheLimitStatus.textContent = `已选择：日记 ${diaryMb} MB · 秘藏 ${secretMb} MB`;
  }
}

function ensureCacheManagementUi() {
  configureCacheManagementUi({
    elements: {
      cacheLimitDialog: els.cacheLimitDialog,
      cacheLimitInput: els.cacheLimitInput,
      cacheLimitButton: els.cacheLimitButton,
      settingsDialog: els.settingsDialog,
      refreshCacheInfoButton: els.refreshCacheInfoButton,
      clearAppCacheButton: els.clearAppCacheButton,
      cacheLimitForm: els.cacheLimitForm,
    },
    minMb: MIN_CACHE_MB,
    maxMb: MAX_CACHE_MB,
    setActiveSection: setActiveSettingsSection,
    loadPolicy: loadMediaCachePolicy,
    savePolicy: saveMediaCachePolicy,
    showToast: showMiniToast,
    downloadPool: downloadOfflinePool,
    clearPool: clearCachePool,
  });
}
async function downloadOfflinePool(type) {
  if (!navigator.onLine) {
    showMiniToast("当前离线，无法补充缓存", { kind: "error" });
    return;
  }
  const isSecret = type === "secret";
  const urls = isSecret ? collectSecretOfflineMediaUrls() : collectDiaryOfflineMediaUrls();
  if (!urls.length) {
    showMiniToast(isSecret ? "请先打开秘藏并同步相册" : "请先打开日记并同步内容", { kind: "error" });
    return;
  }
  const button = document.querySelector(isSecret ? "#downloadSecretOfflineButton" : "#downloadDiaryOfflineButton");
  if (button) button.disabled = true;
  const toast = showMiniToast(`正在下载${isSecret ? "秘藏" : "日记"}离线包…`, {
    kind: "loading",
    persist: true,
    placement: "center",
  });
  try {
    await navigator.storage?.persist?.().catch(() => false);
    const result = await cacheOfflineMedia(session?.user?.id || "public", { explicit: true, type });
    dismissMiniToast(toast);
    const completion = result.complete
      ? `已完整缓存 ${result.cached} 个资源`
      : `已缓存 ${result.cached}/${result.requested} 个资源，已达到容量上限`;
    showMiniToast(`${completion} · ${formatFileSize(result.bytes)}`, {
      kind: "success",
      duration: 3200,
      placement: "center",
    });
  } catch (error) {
    dismissMiniToast(toast);
    showMiniToast(`离线包下载失败：${error.message}`, { kind: "error", duration: 3600, placement: "center" });
  } finally {
    dismissMiniToast(toast);
    if (button) button.disabled = false;
  }
}

async function downloadFamilyBackup() {
  if (!session) return;
  const button = document.querySelector("#downloadFamilyBackupButton");
  if (button) button.disabled = true;
  showMiniToast("正在整理家庭数据…", { kind: "loading", duration: 1600 });
  try {
    const data = await cloudflareRequest("/api/export");
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), ...data }, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `life-vlog-backup-${getLocalDateKey()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showMiniToast("家庭数据备份已下载", { kind: "success" });
  } catch (error) {
    showMiniToast(`备份失败：${error.message}`, { kind: "error", duration: 3200 });
  } finally {
    if (button) button.disabled = false;
  }
}

async function renderTrashItems() {
  const list = document.querySelector("#trashItemsList");
  if (!list) return;
  if (!session) {
    list.innerHTML = '<p class="settings-empty">登录后可以查看回收站。</p>';
    return;
  }
  list.innerHTML = '<p class="settings-empty">正在读取回收站…</p>';
  try {
    const items = await loadTrashItems();
    if (!items.length) {
      list.innerHTML = '<p class="settings-empty">回收站是空的。</p>';
      return;
    }
    const typeLabels = {
      photo: "日记",
      secret: "秘藏",
      recipe: "菜谱",
      wish: "心愿",
      weekend: "周末",
      anniversary: "纪念日",
      gratitude: "留言",
    };
    list.innerHTML = items.map((item) => `
      <article class="trash-item" data-trash-id="${escapeHtml(item.id)}">
        <div><small>${typeLabels[item.item_type] || "内容"} · ${formatDateTime(item.deleted_at)}</small><strong>${escapeHtml(item.label || "未命名")}</strong><span>${escapeHtml(getTrashOwnershipLabel(item))}</span><span>${Math.max(0, Math.ceil((new Date(item.expires_at) - Date.now()) / 86400000))} 天后过期</span></div>
        <div><button type="button" data-trash-restore>恢复</button><button class="danger" type="button" data-trash-delete>永久删除</button></div>
      </article>`).join("");
    list.querySelectorAll("[data-trash-id]").forEach((row) => {
      const item = items.find((entry) => entry.id === row.dataset.trashId);
      row.querySelector("[data-trash-restore]")?.addEventListener("click", () => restoreTrashItem(item));
      row.querySelector("[data-trash-delete]")?.addEventListener("click", () => permanentlyDeleteTrashItem(item));
    });
  } catch (error) {
    list.innerHTML = `<p class="settings-empty">读取失败：${escapeHtml(error.message || "请稍后重试")}</p>`;
  }
}

async function downloadCloudBackup(key) {
  if (!session?.access_token || !key) return;
  try {
    const endpoint = R2_UPLOAD_ENDPOINT.replace(/\/+$/, "");
    const response = await fetch(`${endpoint}/api/backups/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `下载失败（${response.status}）`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = key.split("/").pop().replace(/\.backup$/, ".json");
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showMiniToast("加密备份已解密下载", { kind: "success" });
  } catch (error) {
    showMiniToast(error.message || "备份下载失败", { kind: "error", duration: 3200 });
  }
}

async function renderCloudBackups() {
  const list = document.querySelector("#cloudBackupList");
  if (!list) return;
  list.innerHTML = '<p class="settings-empty">正在读取加密备份…</p>';
  try {
    const result = await cloudflareRequest("/api/backups");
    const backups = Array.isArray(result.data) ? result.data : [];
    const latest = document.querySelector("#latestBackupStatus");
    if (latest) {
      latest.textContent = backups.length
        ? `最近备份：${String(backups[0].key).split("/").pop().replace(/^d1-|\.backup$/g, "")} · ${formatFileSize(backups[0].size)}`
        : "尚未生成自动备份";
    }
    if (!backups.length) {
      list.innerHTML = '<p class="settings-empty">每天凌晨自动生成，保留最近 7 天的备份。</p>';
      return;
    }
    list.innerHTML = backups.slice(0, 7).map((backup) => `
      <button class="cloud-backup-item" type="button" data-backup-key="${escapeHtml(backup.key)}">
        <span>${escapeHtml(String(backup.key).split("/").pop().replace(/^d1-|\.backup$/g, ""))}</span>
        <strong>${formatFileSize(backup.size)}<small>下载解密副本</small></strong>
      </button>`).join("");
    list.querySelectorAll("[data-backup-key]").forEach((button) => {
      button.addEventListener("click", () => downloadCloudBackup(button.dataset.backupKey));
    });
  } catch (error) {
    const latest = document.querySelector("#latestBackupStatus");
    if (latest) latest.textContent = "仅家庭创始人可以查看备份";
    list.innerHTML = `<p class="settings-empty">${escapeHtml(error.message || "仅家庭创始人可以查看自动备份")}</p>`;
  }
}

async function createCloudBackupNow() {
  const button = document.querySelector("[data-create-backup]");
  if (button) button.disabled = true;
  const toast = showMiniToast("正在生成加密备份…", { kind: "loading", persist: true, placement: "center" });
  try {
    await cloudflareRequest("/api/backups/run", { method: "POST", body: "{}" });
    dismissMiniToast(toast);
    showMiniToast("加密备份已生成", { kind: "success", placement: "center" });
    await renderCloudBackups();
  } catch (error) {
    dismissMiniToast(toast);
    showMiniToast(error.message || "备份生成失败", { kind: "error", duration: 3200, placement: "center" });
  } finally {
    dismissMiniToast(toast);
    if (button) button.disabled = false;
  }
}

async function createThumbnailForExistingImage(image, safeName, folder) {
  const response = await fetch(image.image_url, { mode: "cors" });
  if (!response.ok) throw new Error(`读取旧图失败（${response.status}）`);
  const source = await response.blob();
  const compressed = await compressImage(
    new File([source], `${safeName}.jpg`, { type: source.type || "image/jpeg" }),
    { maxSide: 640, targetBytes: 140 * 1024, jpeg: 0.76, minJpeg: 0.5, rotatePortrait: false }
  );
  const uploaded = await uploadToR2(compressed.blob, `${safeName}-thumb`, `${folder}-thumbs`);
  return { ...image, thumbnail_url: uploaded.url, thumbnail_path: `r2:${uploaded.key}` };
}

async function backfillLegacyThumbnails() {
  if (!cloudDb || !session || !navigator.onLine) {
    showMiniToast("需要登录并联网后执行", { kind: "error" });
    return;
  }
  const button = document.querySelector("#backfillThumbnailsButton");
  if (button) button.disabled = true;
  let completed = 0;
  const limit = 20;
  const toast = showMiniToast("正在补齐旧图缩略图…", { kind: "loading", persist: true, placement: "center" });
  try {
    for (const photo of photos.filter((item) => item.user_id === session.user.id)) {
      if (completed >= limit) break;
      const images = getPhotoImages(photo);
      let changed = false;
      for (let index = 0; index < images.length && completed < limit; index += 1) {
        if (images[index].thumbnail_path) continue;
        images[index] = await createThumbnailForExistingImage(images[index], `legacy-photo-${photo.id}-${index + 1}`, "photos");
        completed += 1;
        changed = true;
      }
      if (changed) {
        await diaryRepository.updateOwned(photo.id, {
          note: composeDiaryStoredNote(getPlainNote(photo), images),
          updated_at: new Date().toISOString(),
        });
      }
    }
    for (const item of secretItems.filter((entry) => entry.userId === session.user.id)) {
      if (completed >= limit) break;
      const images = normalizeSecretImages(item.images);
      let changed = false;
      for (let index = 0; index < images.length && completed < limit; index += 1) {
        if (images[index].thumbnail_path) continue;
        images[index] = await createThumbnailForExistingImage(images[index], `legacy-secret-${item.id}-${index + 1}`, "secrets");
        completed += 1;
        changed = true;
      }
      if (changed) {
        await secretRepository.updateOwnedItem(item.id, {
          images,
          updated_at: new Date().toISOString(),
        });
      }
    }
    await Promise.all([loadPhotos(), loadSecretItems()]);
    dismissMiniToast(toast);
    showMiniToast(completed ? `已补齐 ${completed} 张缩略图` : "旧图缩略图已经齐全", { kind: "success", placement: "center" });
  } catch (error) {
    dismissMiniToast(toast);
    showMiniToast(`处理暂停：${error.message}`, { kind: "error", duration: 3600, placement: "center" });
  } finally {
    dismissMiniToast(toast);
    if (button) button.disabled = false;
  }
}

function ensureDataSafetyUi() {
  const settingsNav = els.settingsDialog?.querySelector(".settings-sidebar nav");
  const content = els.settingsDialog?.querySelector(".settings-content");
  if (!settingsNav || !content) return;
  let nav = settingsNav.querySelector('[data-settings-section="settingsSafety"]');
  if (!nav) {
    nav = document.createElement("button");
    nav.type = "button";
    nav.dataset.settingsSection = "settingsSafety";
    nav.setAttribute("aria-selected", "false");
    nav.textContent = "数据安全";
    nav.addEventListener("click", () => setActiveSettingsSection("settingsSafety"));
    settingsNav.append(nav);
  }
  if (document.querySelector("#settingsSafety")) return;
  const group = document.createElement("section");
  group.className = "settings-group settings-safety";
  group.id = "settingsSafety";
  group.hidden = true;
  group.innerHTML = `
    <p class="kicker">Backup & Recycle Bin</p><h3>数据安全</h3>
    <div class="trash-head"><div><strong>每日云端备份</strong><small>每天凌晨 03:20（日本时间）生成 1 份，自动保留最近 7 天</small><em id="latestBackupStatus">正在读取最近备份…</em></div><div class="backup-head-actions"><button type="button" data-refresh-backups aria-label="刷新备份">↻</button><button type="button" data-create-backup>立即备份</button></div></div>
    <div class="cloud-backup-list" id="cloudBackupList"></div>
    <button id="backfillThumbnailsButton" type="button"><span>优化旧图片</span><strong>每次为最多 20 张旧图生成列表缩略图</strong></button>
    <div class="trash-head"><div><strong>最近删除</strong><small>日记、秘藏、菜谱、心愿、周末计划、纪念日和留言保留 30 天</small></div><button type="button" data-refresh-trash aria-label="刷新回收站">↻</button></div>
    <div class="trash-items" id="trashItemsList"></div>`;
  content.append(group);
  group.querySelector("#backfillThumbnailsButton").addEventListener("click", backfillLegacyThumbnails);
  group.querySelector("[data-refresh-backups]").addEventListener("click", renderCloudBackups);
  group.querySelector("[data-create-backup]").addEventListener("click", createCloudBackupNow);
  group.querySelector("[data-refresh-trash]").addEventListener("click", renderTrashItems);
}

function createSettingsSection(id, label, title, kicker = "System") {
  const settingsNav = els.settingsDialog?.querySelector(".settings-sidebar nav");
  const content = els.settingsDialog?.querySelector(".settings-content");
  if (!settingsNav || !content) return null;
  if (!settingsNav.querySelector(`[data-settings-section="${id}"]`)) {
    const nav = document.createElement("button");
    nav.type = "button";
    nav.dataset.settingsSection = id;
    nav.setAttribute("aria-selected", "false");
    nav.textContent = label;
    nav.addEventListener("click", () => setActiveSettingsSection(id));
    settingsNav.append(nav);
  }
  let group = document.querySelector(`#${id}`);
  if (!group) {
    group = document.createElement("section");
    group.id = id;
    group.className = "settings-group stability-settings";
    group.hidden = true;
    group.innerHTML = `<p class="kicker">${kicker}</p><h3>${title}</h3>`;
    content.append(group);
  }
  return group;
}

async function getCachedUrlHitCount(urls) {
  return mediaCacheService.getHitCount(urls);
}

function diagnosticRow(label, value, state = "ok", detail = "") {
  return `<article class="diagnostic-row ${state}"><i>${state === "ok" ? "✓" : state === "warn" ? "!" : "×"}</i><div><strong>${label}</strong>${detail ? `<small>${detail}</small>` : ""}</div><em>${value}</em></article>`;
}

async function runOfflineDiagnostics() {
  const output = document.querySelector("#diagnosticResults");
  if (!output) return;
  output.innerHTML = '<p class="settings-empty">正在检查应用、缓存和上传队列…</p>';
  const [stats, diaryHits, secretHits, queued, persisted] = await Promise.all([
    getAppCacheStats(),
    getCachedUrlHitCount(collectDiaryOfflineMediaUrls()),
    getCachedUrlHitCount(collectSecretOfflineMediaUrls()),
    getQueuedDiaryUploads().catch(() => []),
    navigator.storage?.persisted?.().catch(() => false) || false,
  ]);
  const controlled = Boolean(navigator.serviceWorker?.controller);
  const shellReady = stats.appEntries > 0 && controlled;
  const navigation = performance.getEntriesByType?.("navigation")?.[0];
  const interactiveMs = Math.round(navigation?.domInteractive || 0);
  const renderedCards = document.querySelectorAll(".photo-card, .wish-card, .recipe-card, .weekend-card, .secret-album-card").length;
  const pendingImages = [...document.images].filter((image) => !image.complete).length;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  output.innerHTML = [
    diagnosticRow("当前网络", navigator.onLine ? "在线" : "离线", navigator.onLine ? "ok" : "warn", navigator.onLine ? "云端同步可用" : "正在使用本机内容"),
    diagnosticRow("离线启动", shellReady ? "可用" : "需要联网打开一次", shellReady ? "ok" : "bad", `应用外壳 ${stats.appEntries} 项`),
    diagnosticRow("登录凭据", session ? "已保留" : "未登录", session ? "ok" : "warn", session?.offline_only ? "当前为离线只读身份" : "可访问家庭云端"),
    diagnosticRow("日记图片", `${diaryHits.cached}/${diaryHits.total}`, diaryHits.total && diaryHits.cached === diaryHits.total ? "ok" : "warn", `${formatFileSize(stats.diaryBytes)} 已缓存`),
    diagnosticRow("秘藏图片", `${secretHits.cached}/${secretHits.total}`, secretHits.total && secretHits.cached === secretHits.total ? "ok" : "warn", `${formatFileSize(stats.secretBytes)} 已缓存`),
    diagnosticRow("上传队列", `${queued.length} 项`, queued.length ? "warn" : "ok", queued.length ? "联网后可在上传中心重试" : "没有等待上传的内容"),
    diagnosticRow("持久存储", persisted ? "已授权" : "由系统管理", persisted ? "ok" : "warn", persisted ? "系统会尽量避免回收缓存" : "空间紧张时浏览器可能回收缓存"),
    diagnosticRow("首屏可交互", interactiveMs ? `${interactiveMs} ms` : "等待采样", !interactiveMs || interactiveMs < 1800 ? "ok" : interactiveMs < 3200 ? "warn" : "bad", "当前设备本次打开的 DOM 可交互时间"),
    diagnosticRow("长列表负载", `${renderedCards} 个卡片`, renderedCards <= 40 ? "ok" : "warn", "屏幕外卡片已启用浏览器跳过渲染"),
    diagnosticRow("图片解码", pendingImages ? `${pendingImages} 张等待` : "已稳定", pendingImages < 6 ? "ok" : "warn", "手机首屏仅优先加载前两张日记图片"),
    diagnosticRow("网络策略", connection?.saveData ? "省流量" : (connection?.effectiveType || "自动"), connection?.saveData ? "ok" : "ok", "移动端不会在后台预热后续原图"),
    diagnosticRow("同步防重", photosLoadPromise || notificationsLoadPromise || secretLoadPromise ? "同步中" : "空闲", "ok", "重复切页和前台恢复会复用同一次请求"),
  ].join("");
}

async function renderUploadCenter() {
  const list = document.querySelector("#uploadCenterList");
  if (!list) return;
  const queued = await getQueuedDiaryUploads().catch(() => []);
  const active = [...activeUploadTasks.values()];
  const status = document.querySelector("#uploadCenterStatus");
  if (status) {
    status.textContent = active.length
      ? `${active.length} 个图片任务处理中`
      : isDiaryUploadQueueProcessing()
        ? "正在补传日记…"
        : queued.length
          ? `${queued.length} 篇日记等待上传`
          : "队列为空";
  }
  if (!queued.length && !active.length) {
    list.innerHTML = '<p class="settings-empty">没有等待上传的日记。弱网或断网发布时，任务会自动出现在这里。</p>';
    return;
  }
  const folderLabels = { photos: "日记", secrets: "秘藏", weekend: "周末", wishes: "心愿", recipes: "菜谱" };
  const activeMarkup = active.map((item) => `
    <article class="upload-queue-item ${escapeHtml(item.state)}">
      <div><strong>${escapeHtml(folderLabels[item.folder] || "图片")} · ${escapeHtml(item.title)}</strong><small>${item.state === "done" ? "上传完成" : item.state === "failed" ? "上传失败" : `正在上传 · 第 ${item.attempt}/3 次`} · ${formatFileSize(item.size)}</small></div>
      <i aria-hidden="true"></i>
    </article>`).join("");
  const queuedMarkup = queued.map((item) => {
    const bytes = (item.files || []).reduce((sum, entry) => sum + Number(entry.size || entry.file?.size || 0), 0);
    return `<article class="upload-queue-item" data-upload-id="${escapeHtml(item.id)}"><div><strong>${escapeHtml(item.title || item.rawTitle || "无标题日记")}</strong><small>${formatDateTime(item.queuedAt || item.createdAt)} · ${(item.files || []).length} 张 · ${formatFileSize(bytes)}</small></div><button class="danger" type="button" data-remove-upload>移除</button></article>`;
  }).join("");
  list.innerHTML = activeMarkup + queuedMarkup;
  list.querySelectorAll("[data-upload-id]").forEach((row) => {
    row.querySelector("[data-remove-upload]")?.addEventListener("click", () => removeQueuedDiaryUpload(row.dataset.uploadId));
  });
}

function ensureStabilitySettingsUi() {
  const diagnostics = createSettingsSection("settingsDiagnostics", "诊断", "离线与运行诊断", "Diagnostics");
  if (diagnostics && !diagnostics.querySelector("#diagnosticResults")) {
    diagnostics.insertAdjacentHTML("beforeend", `<p>检查当前设备是否真的可以离线启动，以及日记和秘藏图片的实际缓存命中情况。</p><button type="button" data-run-diagnostics><span>开始诊断</span><strong>不会上传任何设备信息</strong></button><div class="diagnostic-results" id="diagnosticResults"></div>`);
    diagnostics.querySelector("[data-run-diagnostics]").addEventListener("click", runOfflineDiagnostics);
  }
  const uploads = createSettingsSection("settingsUploads", "上传", "上传任务中心", "Transfers");
  if (uploads && !uploads.querySelector("#uploadCenterList")) {
    uploads.insertAdjacentHTML("beforeend", `<div class="upload-center-head"><strong id="uploadCenterStatus">正在读取…</strong><button type="button" data-retry-uploads>立即重试</button></div><div class="upload-center-list" id="uploadCenterList"></div>`);
    uploads.querySelector("[data-retry-uploads]").addEventListener("click", () => processDiaryUploadQueue());
  }
}

function ensureFamilySignatureUi() {
  const general = document.querySelector("#settingsGeneral");
  if (!general || document.querySelector("#familyTaglineButton")) return;
  const button = document.createElement("button");
  button.id = "familyTaglineButton";
  button.type = "button";
  button.innerHTML = `<span>家庭签名</span><strong><em id="settingsFamilyTaglineValue"></em><small>所有家庭成员共享可见</small></strong>`;
  document.querySelector("#renameProfileButton")?.before(button);

  const dialog = document.createElement("dialog");
  dialog.className = "account-dialog";
  dialog.id = "familyTaglineDialog";
  dialog.innerHTML = `
    <button class="dialog-close" type="button" data-close-family-tagline aria-label="关闭">×</button>
    <form id="familyTaglineForm">
      <div><p class="kicker">Family Signature</p><h2>家庭签名</h2><p>会显示在封面上，并同步给当前家庭的所有成员。</p></div>
      <label>签名<textarea id="familyTaglineInput" rows="3" maxlength="120" required></textarea></label>
      <p class="status-line" id="familyTaglineStatus"></p>
      <div class="rename-home-actions"><button class="ghost-button" type="button" data-reset-family-tagline>恢复默认</button><button class="primary" type="submit">保存签名</button></div>
    </form>`;
  document.body.append(dialog);
  const input = dialog.querySelector("#familyTaglineInput");
  const status = dialog.querySelector("#familyTaglineStatus");
  button.addEventListener("click", () => openSettingsChildDialog(dialog, () => {
    input.value = accountProfile.familyTagline || loadFamilyTagline();
    status.textContent = "";
    input.focus();
  }));
  dialog.querySelector("[data-close-family-tagline]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-reset-family-tagline]").addEventListener("click", () => {
    input.value = DEFAULT_FAMILY_TAGLINE;
  });
  dialog.addEventListener("close", reopenSettingsAfterChildDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const tagline = normalizeFamilyTagline(input.value);
    if (!tagline || !cloudDb || !session) return;
    status.textContent = "正在同步...";
    const { error } = await cloudDb.rpc("update_family_tagline", { p_tagline: tagline });
    if (error) {
      status.textContent = `保存失败：${error.message}`;
      return;
    }
    if (familyInfo) familyInfo.tagline = tagline;
    applyFamilyTagline(tagline, { persist: true });
    status.textContent = "家庭签名已同步。";
    window.setTimeout(() => dialog.close(), 380);
  });
  applyFamilyTagline(accountProfile.familyTagline || loadFamilyTagline());
}

async function clearCachePool(type) {
  const isSecret = type === "secret";
  const cacheName = isSecret ? SECRET_MEDIA_CACHE_NAME : DIARY_MEDIA_CACHE_NAME;
  await mediaCacheService.deleteCache(cacheName);
  const prefix = isSecret ? `${SECRET_ITEMS_CACHE_KEY}:` : `${PHOTO_FEED_CACHE_KEY}:`;
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index) || "";
    if (key.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
  await refreshCacheInfo();
  if (els.settingsCacheStatus) els.settingsCacheStatus.textContent = `${isSecret ? "秘藏" : "日记"}缓存已清除`;
}

function renderSettingsSummary() {
  ensureCacheManagementUi();
  ensureFamilySignatureUi();
  ensureDataSafetyUi();
  ensureStabilitySettingsUi();
  renderSettingsAccountOverview();
  if (els.settingsHomeNameValue) {
    els.settingsHomeNameValue.textContent =
      accountProfile.homeName || loadHomeName(session?.user?.id) || "咻蛋之家";
  }
  if (els.settingsNicknameValue) {
    els.settingsNicknameValue.textContent = session ? getSessionDisplayName() : "未登录";
  }
  if (els.settingsAvatarValue) {
    els.settingsAvatarValue.textContent = accountProfile.avatarUrl ? "已设置头像" : "文字头像";
  }
  if (els.settingsEmailValue) {
    els.settingsEmailValue.textContent = getSessionBoundEmail() || "未绑定";
  }
  if (els.settingsFeedLayoutValue) {
    els.settingsFeedLayoutValue.textContent =
      loadMobileFeedLayout() === "single" ? "单列" : "双列";
  }
  if (els.settingsCacheLimitValue) {
    els.settingsCacheLimitValue.textContent = `日记 ${loadCacheCapacityMb("diary")} MB · 秘藏 ${loadCacheCapacityMb("secret")} MB`;
  }
  const policyButton = document.querySelector("#mediaCachePolicyButton");
  if (policyButton) {
    const wifiOnly = loadMediaCachePolicy() === "wifi";
    policyButton.innerHTML = `<span>自动缓存</span><strong><em>${wifiOnly ? "Wi-Fi · 最新 20 条" : "已关闭"}</em><small>${wifiOnly ? "自动保留最新日记；蜂窝网络和无法识别的网络不会下载" : "只通过下面按钮手动下载"}</small></strong>`;
  }
}

function canManageItem(item) {
  if (!session) return false;
  const ownerId = item?.userId || item?.user_id || "";
  if (!ownerId) return true;
  return ownerId === session.user.id || familyMemberMap.has(ownerId);
}

function renderAuthorMeta(userId) {
  return `<span class="author-meta">${escapeHtml(getAuthorName(userId))} 发布</span>`;
}

async function loadFamilyContext() {
  familyInfo = null;
  familyMembers = [];
  familyInvitations = [];
  familyMemberMap = new Map();
  if (!cloudDb || !session) return;

  const [membersResult, invitationsResult] = await Promise.all([
    cloudDb.rpc("get_my_family_members"),
    cloudDb.rpc("get_my_family_invitations"),
  ]);
  if (membersResult.error || invitationsResult.error) {
    const error = membersResult.error || invitationsResult.error;
    if (!isMissingCloudSchema(error)) {
      console.warn("Family context failed:", error);
    }
    return;
  }

  familyMembers = membersResult.data || [];
  familyInvitations = invitationsResult.data || [];
  familyMembers.forEach((member) => {
    familyMemberMap.set(member.user_id, member);
    const avatarUrl = getProfileAvatarUrl(member);
    if (avatarUrl) saveCachedAvatarUrl(member.user_id, avatarUrl);
  });
  const ownMember = familyMemberMap.get(session.user.id);
  const ownMemberAvatar = getProfileAvatarUrl(ownMember || {});
  if (ownMemberAvatar) {
    saveCachedAvatarUrl(session.user.id, ownMemberAvatar);
    if (!getProfileAvatarUrl(accountProfile)) {
      accountProfile.avatarUrl = ownMemberAvatar;
      accountProfile.avatarPath = ownMember.avatar_path || accountProfile.avatarPath;
      renderAccountAvatar(ownMemberAvatar, getSessionDisplayName());
      renderSettingsSummary();
    }
  }
  if (familyMembers.length) {
    familyInfo = {
      id: familyMembers[0].family_id,
      name: normalizeHomeName(familyMembers[0].family_name) || loadHomeName(),
      tagline: normalizeFamilyTagline(familyMembers[0].family_tagline) || loadFamilyTagline(),
      isOwner: familyMembers.some(
        (member) => member.user_id === session.user.id && member.role === "owner"
      ),
    };
    applyHomeName(familyInfo.name, { persist: true });
    applyFamilyTagline(familyInfo.tagline, { persist: true });
  } else {
    applyFamilyTagline(loadFamilyTagline(), { persist: false });
  }
  renderFamilyDialog();
}

async function loadGratitudeNotes() {
  if (!cloudDb || !session) {
    gratitudeNotes = [];
    renderGratitudeNotes();
    return;
  }

  const { data, error } = await householdRepository.list("gratitude_notes", {
    order: [{ column: "created_at", ascending: false }],
  });
  if (error) {
    gratitudeNotes = [];
    els.thanksStatus.textContent = isMissingCloudSchema(error)
      ? "请先部署最新版 Cloudflare D1 结构，启用感谢留言板。"
      : `留言读取失败：${error.message}`;
  } else {
    gratitudeNotes = data || [];
    els.thanksStatus.textContent = "";
  }
  renderGratitudeNotes();
}

async function synchronizeWeekendPlans(userId = session?.user?.id) {
  if (!cloudDb || !session || !userId) return;
  try {
    const { data, error } = await householdRepository.list("weekend_plans", {
      order: [{ column: "plan_date", ascending: true }],
    });
    if (error) throw error;

    let cloudPlans = data || [];
    const localPlans = loadWeekendPlans();
    const cloudIds = new Set(cloudPlans.map((plan) => plan.id));
    const missingLocalPlans = localPlans.filter(
      (plan) => (!plan.userId || plan.userId === userId) && !cloudIds.has(plan.id)
    );
    if (missingLocalPlans.length) {
      const { error: migrateError } = await householdRepository.upsert(
        "weekend_plans",
        missingLocalPlans.map((plan) => weekendToCloudRow(plan, userId)),
        { onConflict: "id" }
      );
      if (migrateError) throw migrateError;
      const refreshed = await householdRepository.list("weekend_plans", {
        order: [{ column: "plan_date", ascending: true }],
      });
      if (refreshed.error) throw refreshed.error;
      cloudPlans = refreshed.data || [];
    }

    weekendCloudAvailable = true;
    weekendPlans = cloudPlans.map(weekendFromCloudRow);
    saveWeekendPlans();
    renderWeekendPlans();
  } catch (error) {
    weekendCloudAvailable = false;
    if (isMissingCloudSchema(error)) {
      setWeekendStatus("周末计划云表尚未初始化，暂时保存在当前浏览器。");
    } else {
      setWeekendStatus(`周末计划同步失败：${error.message || "请稍后重试"}`);
    }
  }
}

async function synchronizeAccountData() {
  if (!cloudDb || !session) return;
  if (cloudSyncInFlight) return cloudSyncInFlight;

  const userId = session.user.id;
  const displayName = getSessionDisplayName();
  cloudSyncInFlight = (async () => {
    try {
      setGlobalStatus("正在同步账户数据…");
      await loadFamilyContext();
      const [profileResult, recipesResult, wishesResult] = await Promise.all([
        householdRepository.list("user_profiles", {
          filters: { user_id: userId },
          maybeSingle: true,
        }),
        householdRepository.list("recipes", {
          order: [{ column: "created_at", ascending: false }],
        }),
        householdRepository.list("wishes", {
          order: [{ column: "created_at", ascending: false }],
        }),
      ]);

      const firstError = profileResult.error || recipesResult.error || wishesResult.error;
      if (firstError) throw firstError;
      if (!session || session.user.id !== userId) return;

      const localRecharge = loadRechargeTotal(displayName);
      const localExperience = loadLocalExperienceAliases(displayName);
      const localFoodOptions = loadFoodOptions(userId);
      const localThanksColor = loadThanksColor(userId);
      let profile = profileResult.data;

      if (!profile) {
        const initialRecharge = Math.max(localRecharge, isVipUser(displayName) ? 298 : 0);
        const { data, error } = await householdRepository.insert(
          "user_profiles",
          {
            user_id: userId,
            username: displayName,
            recharge_total: initialRecharge,
            vip_level: getVipLevelByRecharge(initialRecharge)?.level || 0,
            experience_total: localExperience.total,
            last_login_date: localExperience.lastLoginDate || null,
            login_streak: Math.max(0, Number(localExperience.loginStreak) || 0),
            secret_default_folder_id: null,
          },
          { select: "*", single: true }
        );
        if (error) throw error;
        profile = data;
      }

      secretDefaultFolderId = String(profile.secret_default_folder_id || "");
      if (secretDefaultFolderId === "unfiled") secretDefaultFolderId = "";

      const loginName = normalizeNickname(getSessionLoginName());
      const sessionDisplayName = normalizeNickname(getSessionDisplayName());
      const profileDisplayName = normalizeNickname(profile.username);
      const preferredDisplayName = resolvePreferredDisplayName({
        loginName,
        sessionDisplayName,
        profileDisplayName,
        fallback: displayName,
      });
      if (preferredDisplayName && preferredDisplayName !== getSessionDisplayName()) {
        updateSessionDisplayName(preferredDisplayName);
      }

      const cloudRecipes = recipesResult.data || [];
      const cloudWishes = wishesResult.data || [];

      const today = getLocalDateKey();
      let rechargeTotal = Math.max(
        Number(profile.recharge_total) || 0,
        isVipUser(displayName) ? 298 : 0
      );
      let experienceTotal = Math.max(
        Number(profile.experience_total) || 0,
        Number(localExperience.total) || 0
      );
      const cloudLastLoginDate = normalizeLoginDateKey(profile.last_login_date);
      const localLastLoginDate = normalizeLoginDateKey(localExperience.lastLoginDate);
      let { lastLoginDate, loginStreak } = mergeLoginState({
        cloudDate: cloudLastLoginDate,
        cloudStreak: profile.login_streak,
        localDate: localLastLoginDate,
        localStreak: localExperience.loginStreak,
        today,
      });
      let todayExperienceDate = profile.today_experience_date || "";
      let todayExperienceAmount = todayExperienceDate === today
        ? Math.max(0, Number(profile.today_experience_amount) || 0)
        : 0;
      const cloudFoodOptions = normalizeFoodOptions(profile.food_options);
      const preferredFoodOptions = cloudFoodOptions.length
        ? cloudFoodOptions
        : localFoodOptions;
      const cloudTheme = normalizeTheme(profile.theme_preference);
      const preferredTheme = cloudTheme || loadTheme(userId);
      const cloudHomeName = normalizeHomeName(familyInfo?.name || profile.home_name);
      const localHomeName = loadHomeName(userId);
      const preferredHomeName = resolvePreferredHomeName({
        cloudName: cloudHomeName,
        localName: localHomeName,
      });
      const cloudThanksColor = normalizeThanksColor(profile.preferred_thanks_color);
      const preferredThanksColor =
        Object.prototype.hasOwnProperty.call(profile, "preferred_thanks_color") &&
        cloudThanksColor
          ? cloudThanksColor
          : localThanksColor;
      const capabilities = getProfileCapabilities(profile);
      foodOptionsCloudAvailable = capabilities.foodOptions;
      thanksColorCloudAvailable = capabilities.thanksColor;
      profilePreferencesCloudAvailable = capabilities.preferences;

      const vipLevel = getVipLevelByRecharge(rechargeTotal)?.level || 0;
      let loginRewardGained = 0;
      if (lastLoginDate !== today) {
        loginStreak = isYesterdayLoginDate(lastLoginDate) ? loginStreak + 1 : 1;
        loginRewardGained = getDailyLoginReward(loginStreak, vipLevel);
        experienceTotal += loginRewardGained;
        todayExperienceAmount += loginRewardGained;
      }
      lastLoginDate = today;
      todayExperienceDate = today;

      const profileUpdates = {
        username: preferredDisplayName,
        recharge_total: rechargeTotal,
        vip_level: vipLevel,
        experience_total: experienceTotal,
        last_login_date: lastLoginDate,
        today_experience_date: todayExperienceDate,
        today_experience_amount: todayExperienceAmount,
        secret_default_folder_id: secretDefaultFolderId || null,
        updated_at: new Date().toISOString(),
      };
      profileUpdates.login_streak = loginStreak;
      if (foodOptionsCloudAvailable) {
        profileUpdates.food_options = preferredFoodOptions;
      }
      if (profilePreferencesCloudAvailable) {
        profileUpdates.theme_preference = preferredTheme;
        profileUpdates.home_name = preferredHomeName;
      }
      if (thanksColorCloudAvailable) {
        profileUpdates.preferred_thanks_color = preferredThanksColor;
      }

      const { data: savedProfile, error: profileError } = await householdRepository.update(
        "user_profiles",
        profileUpdates,
        { user_id: userId },
        { select: "*", single: true }
      );
      if (profileError) throw profileError;

      const familyAvatarProfile = familyMemberMap.get(userId) || {};
      const syncedAvatarProfile = {
        avatar_url:
          savedProfile.avatar_url ||
          profile.avatar_url ||
          familyAvatarProfile.avatar_url ||
          accountProfile.avatarUrl ||
          "",
        avatar_path:
          savedProfile.avatar_path ||
          profile.avatar_path ||
          familyAvatarProfile.avatar_path ||
          accountProfile.avatarPath ||
          "",
      };
      const syncedAvatarUrl =
        getProfileAvatarUrl(syncedAvatarProfile) || loadCachedAvatarUrl(userId);
      const syncedAvatarPath = syncedAvatarProfile.avatar_path;
      if (syncedAvatarUrl) saveCachedAvatarUrl(userId, syncedAvatarUrl);

      cloudSyncAvailable = true;
      accountDataState = "ready";
      accountProfile = {
        rechargeTotal: Number(savedProfile.recharge_total) || 0,
        vipLevel: Number(savedProfile.vip_level) || 0,
        experienceTotal: Number(savedProfile.experience_total) || 0,
        lastLoginDate: savedProfile.last_login_date || "",
        loginStreak: Math.max(0, Number(savedProfile.login_streak) || loginStreak || 0),
        todayExperienceDate: savedProfile.today_experience_date || todayExperienceDate,
        todayExperienceAmount: Math.max(0, Number(savedProfile.today_experience_amount) || 0),
        themePreference: preferredTheme,
        homeName: preferredHomeName,
        familyTagline: loadFamilyTagline(),
        thanksColor: thanksColorCloudAvailable
          ? normalizeThanksColor(savedProfile.preferred_thanks_color)
          : preferredThanksColor,
        avatarUrl: syncedAvatarUrl,
        avatarPath: syncedAvatarPath,
        foodOptions: foodOptionsCloudAvailable
          ? normalizeFoodOptions(savedProfile.food_options)
          : localFoodOptions,
      };
      applyTheme(preferredTheme, { userId, syncCloud: false });
      applyHomeName(preferredHomeName, { persist: true, userId });
      renderAccountAvatar(accountProfile.avatarUrl, preferredDisplayName);
      saveThanksColorPreference(accountProfile.thanksColor, { userId, syncCloud: false });
      setSelectedThanksColor(accountProfile.thanksColor);
      recipes = cloudRecipes.map(recipeFromCloudRow);
      wishes = cloudWishes.map(wishFromCloudRow);
      foodOptions = accountProfile.foodOptions.length
        ? accountProfile.foodOptions
        : [...DEFAULT_FOOD_OPTIONS];

      saveRechargeTotal(accountProfile.rechargeTotal, preferredDisplayName);
      saveExperience(
        {
          total: accountProfile.experienceTotal,
          lastLoginDate: accountProfile.lastLoginDate,
          loginStreak: accountProfile.loginStreak,
          gainedToday: accountProfile.lastLoginDate === today,
        },
        preferredDisplayName
      );
      localStorage.setItem(
        getTodayExperienceStorageKey(userId),
        JSON.stringify({ date: accountProfile.todayExperienceDate, amount: accountProfile.todayExperienceAmount })
      );
      saveRecipes();
      saveFoodOptionsCache(userId);

      activeVipLevel = accountProfile.vipLevel;
      document.body.classList.toggle("vip-member", activeVipLevel > 0);
      document.body.dataset.vipLevel = String(activeVipLevel);
      els.vipPopoverBadge.textContent =
        activeVipLevel > 0
          ? `${preferredHomeName} ${getVipLevel(activeVipLevel).label}`
          : `开通 ${preferredHomeName} VIP`;
      renderExperience(preferredDisplayName);
      renderVipCenter();
      renderRecipes();
      renderWishes();
      renderFoodWheel();
      await synchronizeWeekendPlans(userId);
      await synchronizeAnniversaries(userId);
      await loadGratitudeNotes();
      await loadPhotos();
      await loadSecretItems();
      await loadNotifications();
      updateCloudSyncStatus();
      void refreshStorage(cloudflareRequest, () => Boolean(session && isAdminAccount()));
    } catch (error) {
      cloudSyncAvailable = false;
      accountDataState = "error";
      renderWishes();
      awardDailyExperience(displayName);
      renderExperience(displayName);
      if (isMissingCloudSchema(error)) {
        setGlobalStatus("Cloudflare D1 尚未初始化，请先部署最新版数据库结构。");
      } else {
        setGlobalStatus(`云同步失败：${error.message || "请稍后重试"}`);
      }
    } finally {
      cloudSyncInFlight = null;
    }
  })();

  return cloudSyncInFlight;
}

function updateCloudSyncStatus() {
  if (!session || !cloudSyncAvailable) return;
  if (!isAdminAccount()) {
    setGlobalStatus("");
    return;
  }
  const missing = [];
  if (!photoFlagsCloudAvailable) missing.push("置顶/精选");
  if (!photoFavorites.cloudAvailable) missing.push("收藏");
  if (!weekendCloudAvailable) missing.push("周末计划");
  if (!anniversaryCloudAvailable) missing.push("纪念日");
  if (!foodOptionsCloudAvailable) missing.push("转盘候选");
  if (!profilePreferencesCloudAvailable) missing.push("主题/主页名称");
  if (!thanksColorCloudAvailable) missing.push("留言颜色");
  if (!secretCloudAvailable) missing.push("秘藏");
  setGlobalStatus(
    missing.length
      ? `Cloudflare D1 仍缺少：${missing.join("、")}。请部署最新版数据库结构。`
      : "全部账户数据已同步到云端"
  );
}

function getLocalDateKey() {
  return getOffsetLocalDateKey(0);
}

function normalizeLoginDateKey(value) {
  const match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function isYesterdayLoginDate(value) {
  return normalizeLoginDateKey(value) === getOffsetLocalDateKey(-1);
}

function getOffsetLocalDateKey(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getSecretDefaultFolderId() {
  return session ? secretDefaultFolderId || SECRET_ALL_FOLDER_ID : SECRET_ALL_FOLDER_ID;
}

async function setSecretDefaultFolderId(folderId) {
  if (!session) return;
  const nextFolderId = folderId && ![SECRET_ALL_FOLDER_ID, SECRET_FAVORITES_FOLDER_ID].includes(folderId)
    ? folderId
    : "";
  secretDefaultFolderId = nextFolderId;
  renderSecretFolderControls();
  try {
    const { error } = await householdRepository.update(
      "user_profiles",
      { secret_default_folder_id: nextFolderId || null },
      { user_id: session.user.id }
    );
    if (error) throw error;
  } catch (error) {
    setGlobalStatus(`默认入口同步失败：${error.message || "请稍后重试"}`);
  }
}

function switchPage(page, { skipSecretGate = false } = {}) {
  const requestedPage = ["recipes", "wishlist", "weekend", "wardrobe", "thanks", "secret"].includes(page) ? page : "gallery";
  if (requestedPage === "secret" && !skipSecretGate && !isSecretUnlocked()) {
    openSecretPinDialog();
    return false;
  }
  if (activePage === "gallery" && requestedPage !== "gallery") setUploadExpanded(false);
  if (requestedPage !== "gallery") vlogMode.close();
  const enteringSecret = activePage !== "secret" && requestedPage === "secret";
  if (activePage === "secret" && requestedPage !== "secret") markSecretLeft();
  closeMobileDiaryPage();
  activePage = requestedPage;
  if (enteringSecret) {
    activeSecretAlbumId = "";
    activeSecretFolderId = getSecretDefaultFolderId();
    secretSelectionMode = false;
    selectedSecretImageIndexes.clear();
  }
  const showRecipes = activePage === "recipes";
  const showWishlist = activePage === "wishlist";
  const showWeekend = activePage === "weekend";
  const showWardrobe = activePage === "wardrobe";
  const showThanks = activePage === "thanks";
  const showSecret = activePage === "secret";
  els.galleryNav.classList.toggle("active", activePage === "gallery" && activeFilter !== "VLOG");
  els.vlogNav?.classList.toggle("active", activePage === "gallery" && activeFilter === "VLOG");
  els.recipesNav?.classList.toggle("active", showRecipes);
  els.wishlistNav.classList.toggle("active", showWishlist);
  els.weekendNav.classList.toggle("active", showWeekend);
  els.wardrobeNav?.classList.toggle("active", showWardrobe);
  els.thanksNav?.classList.toggle("active", showThanks);
  els.secretNav?.classList.toggle("active", showSecret);
  els.composer.hidden = activePage !== "gallery" || !session;
  els.overview.hidden = activePage !== "gallery" || !session;
  els.foodWheelSection.hidden = !session;
  els.galleryHead.hidden = activePage !== "gallery";
  els.feedRefreshNotice.hidden = activePage !== "gallery" || !pendingNewPhotos.length;
  els.todayPostsNotice.hidden = activePage !== "gallery";
  renderWeekendReminderNotice();
  els.galleryFilters.hidden = activePage !== "gallery";
  els.gallery.hidden = activePage !== "gallery";
  if (activePage !== "gallery") {
    els.feedLoader.hidden = true;
  }
  els.recipesPage.hidden = !showRecipes;
  els.wishlistPage.hidden = !showWishlist;
  els.weekendPage.hidden = !showWeekend;
  els.wardrobePage.hidden = !showWardrobe;
  els.thanksPage.hidden = !showThanks;
  els.secretPage.hidden = !showSecret;
  els.recipeComposer.hidden = !showRecipes || !session;
  els.wishlistComposer.hidden = !showWishlist || !session;
  els.weekendComposer.hidden = !showWeekend || !session;
  els.thanksForm.hidden = !showThanks || !session;
  els.secretComposer.hidden = !showSecret || !session;
  if (showRecipes) renderRecipes();
  if (showWishlist) renderWishes();
  if (showWeekend) renderWeekendPlans();
  if (showWardrobe) void wardrobeController.load();
  if (showThanks) renderGratitudeNotes();
  if (showSecret) {
    applyMobileSecretLayout();
    if (!secretItems.length && session) renderCachedSecretItems(session.user.id);
    renderSecretGallery();
    if (session && cloudDb && Date.now() - lastSecretSyncAt > 60000) void loadSecretItems();
  }
  if (activePage === "gallery") {
    if (session && !isAdminAccount()) setGlobalStatus("");
    renderFeedRefreshNotice();
    renderGallery();
    updateFeedLoader(filteredPhotoCount);
  }
  return true;
}

function renderOverview() {
  if (!els.overview) return;
  const signedIn = Boolean(session);
  els.overview.hidden = !signedIn || activePage !== "gallery";
  if (!signedIn) return;

  const familyVisiblePhotos = getMemoryPhotos();
  const unfinishedWishes = wishes.filter((wish) => !wish.done).length;
  const experience = loadExperience();
  const progress = getExperienceLevel(experience.total);
  els.overviewPhotos.textContent = String(familyVisiblePhotos.length);
  els.overviewRecipes.textContent = String(recipes.length);
  els.overviewWishes.textContent = String(unfinishedWishes);
  els.overviewLevel.textContent = progress.title;
  els.overviewProgress.style.width = `${progress.percent}%`;
  els.memoryButton.disabled = familyVisiblePhotos.length === 0;
}

function getMemoryPhotos() {
  if (!session) return [];
  return photos.filter((photo) => photo.category !== "VLOG" && (photo?.image_url || getPhotoImages(photo).length));
}

function openRandomMemory() {
  const memoryPhotos = getMemoryPhotos();
  if (!memoryPhotos.length) return;
  const currentId = activeDialogPhoto?.id;
  const candidates =
    memoryPhotos.length > 1
      ? memoryPhotos.filter((photo) => photo.id !== currentId)
      : memoryPhotos;
  const randomPhoto = candidates[Math.floor(Math.random() * candidates.length)];
  openPhoto(randomPhoto, 0, { randomMode: true });
}

function setSecretStatus(message) {
  if (els.secretStatus) els.secretStatus.textContent = message;
}

function isMobileViewport() {
  return window.innerWidth <= MOBILE_DIALOG_BREAKPOINT;
}

function showMiniToast(message, { kind = "info", duration = 2200, persist = false, placement = "corner" } = {}) {
  const centered = placement === "center";
  const hostId = centered ? "miniToastHostCenter" : "miniToastHost";
  let host = document.querySelector(`#${hostId}`);
  if (!host) {
    host = document.createElement("div");
    host.id = hostId;
    host.className = centered ? "mini-toast-host mini-toast-host-center" : "mini-toast-host";
    document.body.appendChild(host);
  }
  const toast = document.createElement("div");
  toast.className = `mini-toast mini-toast-${kind}`;
  toast.innerHTML = `
    <span class="mini-toast-icon" aria-hidden="true"></span>
    <span class="mini-toast-text">${escapeHtml(message || "")}</span>
  `;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  if (persist) return toast;
  window.setTimeout(() => dismissMiniToast(toast), duration);
  return toast;
}

function dismissMiniToast(toast) {
  if (!toast) return;
  toast.classList.remove("visible");
  window.setTimeout(() => toast.remove(), 180);
}

function updateNetworkStatus() {
  let badge = document.querySelector("#offlineStatusBadge");
  if (!navigator.onLine) {
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "offlineStatusBadge";
      badge.className = "offline-status-badge";
      badge.textContent = "离线模式 · 正在显示本地缓存";
      document.body.append(badge);
    }
    badge.hidden = false;
    return;
  }
  if (badge) badge.hidden = true;
}

function getToolDockOrderStorageKey(userId = session?.user?.id || "guest") {
  return preferenceStore.scopedKey(TOOL_DOCK_ORDER_KEY, userId);
}

function getFamilyTimelineEntries() {
  const entries = [];
  photos.forEach((photo) => entries.push({
    type: "日记",
    title: getPhotoLabel(photo),
    detail: photo.category || "日常",
    date: photo.created_at,
    userId: photo.user_id,
    photoId: photo.id,
  }));
  recipes.forEach((item) => entries.push({
    type: "菜谱", title: item.name, detail: item.category || "家常菜",
    date: item.createdAt, userId: item.userId,
  }));
  wishes.forEach((item) => entries.push({
    type: item.done ? "完成心愿" : "心愿", title: item.title,
    detail: item.done ? (item.completionNote || "愿望达成") : (item.priority || "普通"),
    date: item.completedAt || item.updatedAt || item.createdAt, userId: item.userId,
  }));
  weekendPlans.forEach((item) => entries.push({
    type: item.done ? "完成周末" : "周末", title: item.title,
    detail: item.location || item.type || "周末安排",
    date: item.updatedAt || item.createdAt, userId: item.userId,
  }));
  gratitudeNotes.forEach((item) => entries.push({
    type: "留言", title: item.body, detail: "感谢留言板",
    date: item.created_at, userId: item.user_id,
  }));
  return entries
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getCurrentWeekRange(reference = new Date()) {
  const start = new Date(reference);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function isWithinRange(value, start, end) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
}

async function loadWeeklyReview() {
  if (!session || !cloudDb || !els.weeklyReviewContent) return;
  const { start, end } = getCurrentWeekRange();
  els.weeklyReviewRange.textContent = `${formatDate(start)} - ${formatDate(new Date(end.getTime() - 1))}`;
  els.weeklyReviewLoading.hidden = false;
  els.weeklyReviewContent.innerHTML = "";
  els.weeklyReviewStatus.textContent = "";

  try {
    const { data: comments, error } = await diaryRepository.listCommentPreviews(500);
    if (error) throw error;

    const weekPhotos = getSortedPhotos(photos).filter((photo) => isWithinRange(photo.created_at, start, end));
    const weekComments = (comments || []).filter((comment) => isWithinRange(comment.created_at, start, end));
    const completedWishes = wishes.filter((wish) => wish.done && isWithinRange(wish.completedAt || wish.updatedAt, start, end));
    const weekendMoments = weekendPlans.filter((plan) =>
      isWithinRange(plan.date || plan.updatedAt || plan.createdAt, start, end)
    );
    const thanks = gratitudeNotes.filter((note) => isWithinRange(note.created_at, start, end));
    const activity = [
      ...weekPhotos.map((photo) => ({ type: "日记", title: getPhotoLabel(photo), date: photo.created_at, userId: photo.user_id, photoId: photo.id })),
      ...weekComments.map((comment) => ({ type: comment.parent_id ? "回复" : "留言", title: comment.body, date: comment.created_at, userId: comment.user_id, photoId: comment.photo_id })),
      ...completedWishes.map((wish) => ({ type: "心愿达成", title: wish.title, date: wish.completedAt || wish.updatedAt, userId: wish.userId })),
      ...weekendMoments.map((plan) => ({ type: plan.done ? "周末完成" : "周末安排", title: plan.title, date: plan.date || plan.updatedAt, userId: plan.userId })),
      ...thanks.map((note) => ({ type: "感谢留言", title: note.body, date: note.created_at, userId: note.user_id })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const memberCounts = new Map();
    activity.forEach((item) => memberCounts.set(item.userId, (memberCounts.get(item.userId) || 0) + 1));
    const leadingMember = [...memberCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const summary = activity.length
      ? `这一周留下了 ${weekPhotos.length} 篇日记和 ${weekComments.length + thanks.length} 次交流${completedWishes.length ? `，还完成了 ${completedWishes.length} 个心愿` : ""}。`
      : "这一周还很安静。生活没有缺席，只是暂时没有被写下来。";

    els.weeklyReviewContent.innerHTML = buildWeeklyReviewMarkup({
      summary,
      leadingMember,
      photoCount: weekPhotos.length,
      interactionCount: weekComments.length + thanks.length,
      completedWishCount: completedWishes.length,
      weekendCount: weekendMoments.length,
      activity,
      getAuthorName,
    });
    els.weeklyReviewContent.querySelectorAll("[data-weekly-photo]").forEach((button) => {
      button.addEventListener("click", () => {
        const photo = photos.find((item) => item.id === button.dataset.weeklyPhoto);
        if (!photo) return;
        els.weeklyReviewDialog.close();
        openPhoto(photo);
      });
    });
  } catch (error) {
    els.weeklyReviewStatus.textContent = `本周回顾整理失败：${error.message}`;
  } finally {
    els.weeklyReviewLoading.hidden = true;
  }
}

function openWeeklyReview() {
  if (!session || !els.weeklyReviewDialog) return;
  els.weeklyReviewDialog.showModal();
  void loadWeeklyReview();
}

function renderFamilyTimeline(mode = "activity") {
  const dialog = document.querySelector("#familyTimelineDialog");
  const output = dialog?.querySelector("[data-family-timeline-content]");
  if (!output) return;
  dialog.dataset.mode = mode;
  dialog.querySelectorAll("[data-family-timeline-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.familyTimelineMode === mode);
  });
  const now = new Date();
  if (mode === "memory") {
    const sameDayPhotos = getSortedPhotos(photos).filter((photo) => {
      const date = new Date(photo.created_at || photo.taken_at);
      return date.getFullYear() < now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    });
    const monthPhotos = photos.filter((photo) => {
      const date = new Date(photo.created_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    const monthWishes = wishes.filter((wish) => wish.done && new Date(wish.completedAt || wish.updatedAt).getMonth() === now.getMonth());
    output.innerHTML = buildFamilyMemoryMarkup({
      monthPhotoCount: monthPhotos.length,
      monthWishCount: monthWishes.length,
      monthMessageCount: gratitudeNotes.filter((note) => new Date(note.created_at).getMonth() === now.getMonth()).length,
      photos: sameDayPhotos,
      getImage: (photo) => getPhotoImages(photo)[0],
      getLabel: getPhotoLabel,
    });
  } else {
    const entries = getFamilyTimelineEntries().slice(0, 60);
    output.innerHTML = buildFamilyTimelineMarkup(entries, getAuthorName);
  }
  output.querySelectorAll("[data-timeline-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      const photo = photos.find((item) => item.id === button.dataset.timelinePhoto);
      if (!photo) return;
      dialog.close();
      openPhoto(photo, 0);
    });
  });
}

function ensureFamilyTimelineUi() {
  if (!els.toolDock || document.querySelector("#familyTimelineDialog")) return;
  const button = document.createElement("button");
  button.className = "tool-dock-button timeline-tool-button";
  button.type = "button";
  button.dataset.toolId = "timeline";
  button.innerHTML = '<span class="tool-dock-mark timeline-mark" aria-hidden="true">迹</span><span><strong>家庭足迹</strong><small>动态与往年今日</small></span>';
  els.toolDock.append(button);
  const dialog = document.createElement("dialog");
  dialog.className = "account-dialog family-timeline-dialog";
  dialog.id = "familyTimelineDialog";
  dialog.innerHTML = `
    <button class="dialog-close" type="button" data-close-family-timeline aria-label="关闭">×</button>
    <header><p class="kicker">Family Timeline</p><h2>家庭足迹</h2><p>把家里最近发生的事和值得重看的日子放在一起。</p></header>
    <nav><button class="active" type="button" data-family-timeline-mode="activity">最近动态</button><button type="button" data-family-timeline-mode="memory">时间回顾</button></nav>
    <div class="family-timeline-content" data-family-timeline-content></div>`;
  document.body.append(dialog);
  button.addEventListener("click", () => {
    renderFamilyTimeline("activity");
    dialog.showModal();
  });
  dialog.querySelector("[data-close-family-timeline]").addEventListener("click", () => dialog.close());
  dialog.querySelectorAll("[data-family-timeline-mode]").forEach((tab) => tab.addEventListener("click", () => renderFamilyTimeline(tab.dataset.familyTimelineMode)));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
}

function normalizeToolDockOrder(order) {
  const seen = new Set();
  const normalized = Array.isArray(order)
    ? order.filter((id) => {
        const valid = TOOL_DOCK_DEFAULT_ORDER.includes(id) && !seen.has(id);
        if (valid) seen.add(id);
        return valid;
      })
    : [];
  return [
    ...normalized,
    ...TOOL_DOCK_DEFAULT_ORDER.filter((id) => !seen.has(id)),
  ];
}

function loadToolDockOrder(userId = session?.user?.id || "guest") {
  const order = preferenceStore.readJson(TOOL_DOCK_ORDER_KEY, [], {
    scope: userId,
    legacyKey: TOOL_DOCK_ORDER_KEY,
  });
  return normalizeToolDockOrder(order);
}

function writeToolDockOrder(order, userId = session?.user?.id || "guest") {
  preferenceStore.writeJson(TOOL_DOCK_ORDER_KEY, normalizeToolDockOrder(order), {
    scope: userId,
  });
}

function saveToolDockOrder(userId = session?.user?.id || "guest") {
  if (!els.toolDock) return;
  const order = Array.from(els.toolDock.querySelectorAll("[data-tool-id]")).map(
    (button) => button.dataset.toolId
  );
  writeToolDockOrder(order, userId);
  renderSettingsToolOrderPanel();
}

function applyToolDockOrder(userId = session?.user?.id || "guest") {
  if (!els.toolDock) return;
  const buttons = new Map(
    Array.from(els.toolDock.querySelectorAll("[data-tool-id]")).map((button) => [
      button.dataset.toolId,
      button,
    ])
  );
  loadToolDockOrder(userId).forEach((id) => {
    const button = buttons.get(id);
    if (button) els.toolDock.appendChild(button);
  });
  ensureToolDockSortControls();
  renderSettingsToolOrderPanel();
}

function renderSettingsToolOrderPanel() {
  if (!els.settingsToolOrderList) return;
  const order = loadToolDockOrder();
  els.settingsToolOrderList.innerHTML = buildSettingsToolOrderMarkup(order, TOOL_DOCK_LABELS);
  els.settingsToolOrderList
    .querySelectorAll("[data-tool-order-move]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const [id, directionText] = String(button.dataset.toolOrderMove || "").split(":");
        const direction = Number(directionText || 0);
        const nextOrder = [...loadToolDockOrder()];
        const index = nextOrder.indexOf(id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= nextOrder.length) return;
        [nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]];
        writeToolDockOrder(nextOrder);
        applyToolDockOrder();
      });
    });
}

function renderSettingsAccountOverview() {
  const group = document.querySelector("#settingsAccount");
  if (!group) return;
  let overview = group.querySelector(".settings-account-overview");
  if (!overview) {
    overview = document.createElement("div");
    overview.className = "settings-account-overview";
    group.querySelector("h3")?.after(overview);
  }
  const displayName = session ? getSessionDisplayName() : "未登录";
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split("@")[0] || "";
  overview.innerHTML = buildSettingsAccountOverviewMarkup({
    signedIn: Boolean(session),
    displayName,
    username,
    avatarMarkup: renderAvatarMarkup(session?.user?.id, "settings-account-avatar-image"),
  });
}

function ensureToolDockSortControls() {
  if (!els.toolDock) return;
  els.toolDock.querySelectorAll(".tool-sort-controls").forEach((node) => node.remove());
}

function startToolDockPointer(event) {
  return;
}

function beginToolDockTouchSort(button) {
  if (!toolDockDragState || toolDockDragState.button !== button) return;
  ensureToolDockSortControls();
  suppressToolDockClick = true;
  toolDockDragState.dragging = false;
  toolDockDragState.sortingOnly = true;
  els.toolDock.classList.add("sorting", "touch-sorting");
  els.toolDock
    .querySelectorAll(".tool-dock-button.sort-selected")
    .forEach((item) => item.classList.remove("sort-selected"));
  button.classList.add("sort-selected");
}

function beginToolDockDrag(button, pointerId) {
  if (!toolDockDragState || toolDockDragState.button !== button) return;
  toolDockDragState.dragging = true;
  suppressToolDockClick = true;
  els.toolDock.classList.add("sorting");
  button.classList.add("dragging");
  button.style.width = `${button.getBoundingClientRect().width}px`;
  button.setPointerCapture?.(pointerId);
}

function moveToolDockPointer(event) {
  if (!toolDockDragState) return;

  const dx = Math.abs(event.clientX - toolDockDragState.startX);
  const dy = Math.abs(event.clientY - toolDockDragState.startY);
  if (toolDockDragState.sortingOnly) {
    event.preventDefault();
    return;
  }
  if (!toolDockDragState.dragging && Math.max(dx, dy) > 12) {
    window.clearTimeout(toolDockDragState.timer);
    if (toolDockDragState.touchMode) return;
    beginToolDockDrag(toolDockDragState.button, toolDockDragState.pointerId);
  }
  if (!toolDockDragState?.dragging) return;

  event.preventDefault();
  const draggingButton = toolDockDragState.button;
  const siblings = Array.from(
    els.toolDock.querySelectorAll(".tool-dock-button[data-tool-id]:not(.dragging)")
  ).filter((button) => !button.hidden);
  const pointerX = event.clientX;
  const pointerY = event.clientY;
  const nextSibling =
    siblings.find((button) => {
      const rect = button.getBoundingClientRect();
      return pointerY < rect.top + rect.height && pointerX < rect.left + rect.width / 2;
    }) ||
    siblings.find((button) => {
      const rect = button.getBoundingClientRect();
      return pointerY < rect.top + rect.height / 2;
    }) ||
    null;
  els.toolDock.insertBefore(draggingButton, nextSibling);
}

function finishToolDockPointer() {
  if (!toolDockDragState) return;
  window.clearTimeout(toolDockDragState.timer);
  if (toolDockDragState.dragging) {
    toolDockDragState.button.classList.remove("dragging");
    toolDockDragState.button.style.removeProperty("width");
    els.toolDock.classList.remove("sorting");
    saveToolDockOrder();
    window.setTimeout(() => {
      suppressToolDockClick = false;
    }, 0);
  }
  toolDockDragState = null;
}

function handleToolDockClick(event) {
  const sortButton = event.target.closest("[data-tool-sort]");
  if (sortButton && els.toolDock?.classList.contains("touch-sorting")) {
    event.preventDefault();
    event.stopPropagation();
    const item = sortButton.closest(".tool-dock-button[data-tool-id]");
    moveToolDockItem(item, Number(sortButton.dataset.toolSort) || 0);
    suppressToolDockClick = true;
    return;
  }
  if (els.toolDock?.classList.contains("touch-sorting")) {
    const item = event.target.closest(".tool-dock-button[data-tool-id]");
    if (item) {
      event.preventDefault();
      event.stopPropagation();
      els.toolDock
        .querySelectorAll(".tool-dock-button.sort-selected")
        .forEach((button) => button.classList.remove("sort-selected"));
      item.classList.add("sort-selected");
      suppressToolDockClick = true;
      return;
    }
  }
  if (!suppressToolDockClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressToolDockClick = false;
}

function moveToolDockItem(item, direction) {
  if (!item || !direction || !els.toolDock) return;
  const visible = Array.from(els.toolDock.querySelectorAll(".tool-dock-button[data-tool-id]")).filter(
    (button) => !button.hidden
  );
  const index = visible.indexOf(item);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= visible.length) return;
  if (direction < 0) {
    els.toolDock.insertBefore(item, visible[targetIndex]);
  } else {
    els.toolDock.insertBefore(visible[targetIndex], item);
  }
  item.classList.add("sort-selected");
  saveToolDockOrder();
}

function exitToolDockTouchSort() {
  if (!els.toolDock?.classList.contains("touch-sorting")) return;
  els.toolDock.classList.remove("sorting", "touch-sorting");
  els.toolDock
    .querySelectorAll(".tool-dock-button.sort-selected")
    .forEach((button) => button.classList.remove("sort-selected"));
  saveToolDockOrder();
  window.setTimeout(() => {
    suppressToolDockClick = false;
  }, 0);
}

const foodWheelController = createFoodWheelController({
  elements: els,
  storageKey: FOOD_OPTIONS_KEY,
  defaultOptions: DEFAULT_FOOD_OPTIONS,
  repository: householdRepository,
  getSession: () => session,
  getRecipes: () => recipes,
  getOptions: () => foodOptions,
  setOptions: (nextOptions) => {
    foodOptions = nextOptions;
    accountProfile.foodOptions = [...nextOptions];
  },
  canPersist: () => Boolean(
    cloudDb && cloudSyncAvailable && foodOptionsCloudAvailable
  ),
  closeMobileDiaryPage,
  closePhotoDialog,
});
const {
  addOption: addFoodOption,
  close: closeFoodWheel,
  getStorageKey: getFoodOptionsStorageKey,
  getWheelOptions,
  loadOptions: loadFoodOptions,
  open: openFoodWheel,
  persistOptions: persistFoodOptions,
  removeOption: removeFoodOption,
  render: renderFoodWheel,
  saveOptionsCache: saveFoodOptionsCache,
  spin: spinFoodWheel,
} = foodWheelController;
foodOptions = loadFoodOptions();

const recipeController = createRecipeController({
  elements: els,
  storageKey: RECIPES_KEY,
  repository: householdRepository,
  getSession: () => session,
  getDisplayName: getSessionDisplayName,
  getRecipes: () => recipes,
  setRecipes: (items) => {
    recipes = items;
  },
  canSync: () => cloudSyncAvailable,
  getAuthorName,
  canManageItem,
  normalizeUuid,
  getClipboardFiles: getImageFilesFromClipboard,
  getClipboardImageUrl,
  copyUrlToR2,
  compressImage,
  uploadToR2,
  slugify,
  awardExperience,
  renderOverview,
  renderFoodWheel,
  confirmAction,
  createTrashItem,
  rollbackTrashItem,
});
const {
  applyCoverUrl: applyRecipeCoverUrl,
  edit: editRecipe,
  handleCoverPaste: handleRecipeCoverPaste,
  load: loadRecipes,
  remove: deleteRecipe,
  render: renderRecipes,
  resetForm: resetRecipeForm,
  save: saveRecipes,
  setExpanded: setRecipeExpanded,
  setStatus: setRecipeStatus,
  submit: saveRecipe,
  updateCoverPreview: updateRecipeCoverPreview,
} = recipeController;

const wishlistController = createWishlistController({
  elements: els,
  repository: householdRepository,
  getSession: () => session,
  getDatabase: () => cloudDb,
  getWishes: () => wishes,
  setWishes: (items) => {
    wishes = items;
  },
  getActiveView: () => activeWishView,
  setActiveView: (view) => {
    activeWishView = view;
  },
  getDataState: () => accountDataState,
  canSync: () => cloudSyncAvailable,
  getAuthorName,
  canManageItem,
  normalizeUuid,
  extractImageUrls,
  getClipboardImageUrl,
  copyUrlToR2,
  compressImage,
  uploadToR2,
  cleanupStoredImagePaths,
  slugify,
  formatFileSize,
  awardExperience,
  renderOverview,
  openWishImage,
  escapeHtml,
  confirmAction,
  confirmWishDeletion,
  createTrashItem,
  rollbackTrashItem,
  showToast: showMiniToast,
});
const {
  applyImageUrl: applyWishImageUrl,
  clearImagePreview: clearWishImagePreview,
  closeCompleteDialog: closeWishCompleteDialog,
  edit: editWish,
  handleImagePaste: handleWishImagePaste,
  openCompleteDialog: openWishCompleteDialog,
  remove: deleteWish,
  removeImage: removeWishImage,
  render: renderWishes,
  resetForm: resetWishForm,
  saveCompletionState: saveWishCompletionState,
  setExpanded: setWishlistExpanded,
  setImagePreview: setWishImagePreview,
  setStatus: setWishlistStatus,
  submit: saveWish,
  submitCompletion: submitWishCompletion,
  toggle: toggleWish,
  updateImagePreview: updateWishImagePreview,
} = wishlistController;

const pushController = createPushController({
  elements: els,
  request: cloudflareRequest,
  notificationRepository,
  diaryRepository,
  getSession: () => session,
  getDatabase: () => cloudDb,
  getPhotos: () => photos,
  prependPhoto: (photo) => photos.unshift(photo),
  loadNotifications,
  openNotificationsPanel,
  setActiveSettingsSection,
  switchPage,
  openPhoto,
  showToast: showMiniToast,
});
const {
  disable: disableWebPush,
  enable: enableWebPush,
  ensureSettingsPage: ensurePushSettingsPage,
  openDestination: openPushDestination,
  refreshSettings: refreshPushSettings,
  registerWorker: registerAppShellWorker,
  syncExistingSubscription: syncExistingPushSubscription,
} = pushController;

const anniversaryController = createAnniversaryController({
  elements: els,
  storageKey: ANNIVERSARY_KEY,
  repository: householdRepository,
  getSession: () => session,
  getDatabase: () => cloudDb,
  getItems: () => anniversaries,
  setItems: (items) => {
    anniversaries = items;
  },
  isCloudAvailable: () => anniversaryCloudAvailable,
  setCloudAvailable: (available) => {
    anniversaryCloudAvailable = available;
  },
  getAuthorName,
  canManageItem,
  normalizeUuid,
  awardExperience,
  confirmAction,
  createTrashItem,
  rollbackTrashItem,
  isMissingCloudSchema,
});
const {
  edit: editAnniversary,
  load: loadAnniversaries,
  remove: deleteAnniversary,
  render: renderAnniversaries,
  resetForm: resetAnniversaryForm,
  save: saveAnniversaries,
  setFormExpanded: setAnniversaryFormExpanded,
  submit: saveAnniversary,
  synchronize: synchronizeAnniversaries,
} = anniversaryController;

function openWeekendImageGallery(plan, initialIndex = 0, kind = "plan") {
  const galleryImages = kind === "completion" ? plan?.completionImages : plan?.images;
  if (!galleryImages?.length) return;
  dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
  lockDialogBackgroundScroll(dialogRestoreScrollY);
  activeDialogPhoto = null;
  activeSecretDialogItem = null;
  dialogSecretSourceItem = null;
  els.dialog.classList.remove("mobile-page-dialog", "secret-image-dialog", "secret-image-fullscreen");
  els.dialog.classList.add("no-comments-dialog");
  dialogImages = galleryImages;
  dialogImageIndex = Math.max(0, Math.min(initialIndex, dialogImages.length - 1));
  els.dialogTitle.textContent = kind === "completion" ? `${plan.title || "周末"} · 完成回顾` : plan.title || "周末场景";
  els.dialogMeta.textContent = `${formatDate(plan.date)} · ${getAuthorName(plan.userId)}`;
  els.dialogNote.textContent = kind === "completion" ? plan.completionNote || "" : plan.note || "";
  els.photoCommentsSection.hidden = true;
  if (els.dialogRandomButton) els.dialogRandomButton.hidden = true;
  renderDialogMedia();
  showPhotoDialogPreservingScroll();
}

const weekendController = createWeekendController({
  elements: els,
  storageKey: WEEKEND_KEY,
  repository: householdRepository,
  getSession: () => session,
  getDisplayName: getSessionDisplayName,
  getPlans: () => weekendPlans,
  setPlans: (items) => {
    weekendPlans = items;
  },
  canSync: () => weekendCloudAvailable,
  getAuthorName,
  canManageItem,
  getClipboardFiles: getImageFilesFromClipboard,
  getClipboardImageUrl,
  extractImageUrls,
  escapeHtml,
  formatDate,
  slugify,
  normalizeUuid,
  uploadImageFile,
  copyUrlToR2,
  cleanupStoredImagePaths,
  awardExperience,
  renderReminder: renderWeekendReminderNotice,
  openGallery: openWeekendImageGallery,
  confirmAction,
  createTrashItem,
  rollbackTrashItem,
});
const {
  addCompletionFiles: addWeekendCompletionFiles,
  addCompletionLinks: addWeekendCompletionLinks,
  addFiles: addWeekendFiles,
  addImageLinks: addWeekendImageLinks,
  clearCompletionState: clearWeekendCompletionState,
  clearImageState: clearWeekendImageState,
  closeCompletionDialog: closeWeekendCompletionDialog,
  edit: editWeekendPlan,
  handleImagePaste: handleWeekendImagePaste,
  load: loadWeekendPlans,
  openCompletionDialog: openWeekendCompletionDialog,
  remove: deleteWeekendPlan,
  removeCompletionEntry: removeWeekendCompletionEntry,
  removeImageEntry: removeWeekendImageEntry,
  render: renderWeekendPlans,
  renderCompletionPreviews: renderWeekendCompletionPreviews,
  renderImagePreviews: renderWeekendImagePreviews,
  resetForm: resetWeekendForm,
  save: saveWeekendPlans,
  saveCompletion: saveWeekendCompletion,
  setExpanded: setWeekendExpanded,
  setStatus: setWeekendStatus,
  submit: saveWeekendPlan,
  toggle: toggleWeekendPlan,
} = weekendController;

const gratitudeController = createGratitudeController({
  elements: els,
  storageKey: THANKS_COLOR_KEY,
  allowedColors: THANKS_COLORS,
  defaultColor: DEFAULT_THANKS_COLOR,
  repository: householdRepository,
  getSession: () => session,
  getDatabase: () => cloudDb,
  getNotes: () => gratitudeNotes,
  getProfileColor: () => accountProfile.thanksColor,
  setProfileColor: (color) => {
    accountProfile.thanksColor = color;
  },
  isCloudAvailable: () => thanksColorCloudAvailable,
  setCloudAvailable: (available) => {
    thanksColorCloudAvailable = available;
  },
  getAuthorName,
  canManageItem,
  loadNotes: loadGratitudeNotes,
  awardExperience,
  isMissingCloudSchema,
  confirmAction,
  createTrashItem,
  rollbackTrashItem,
});
const {
  edit: editGratitudeNote,
  getSelectedColor: getSelectedThanksColor,
  loadColor: loadThanksColor,
  normalizeColor: normalizeThanksColor,
  persistColor: persistThanksColorToCloud,
  remove: deleteGratitudeNote,
  render: renderGratitudeNotes,
  resetForm: resetGratitudeForm,
  saveColor: saveThanksColorPreference,
  setSelectedColor: setSelectedThanksColor,
  submit: saveGratitudeNote,
} = gratitudeController;

function renderFamilyDialog() {
  if (!els.familyDialog) return;
  const hasFamily = Boolean(familyInfo);
  renderSettingsFamilyPanel();
  els.familyEmpty.hidden = hasFamily;
  els.familyContent.hidden = !hasFamily;
  if (!hasFamily) {
    els.familyMembers.innerHTML = "";
    const incoming = familyInvitations.filter((invitation) => invitation.is_incoming);
    els.familyInvitations.innerHTML = buildFamilyInvitationsMarkup(incoming);
    els.familyInvitations.querySelectorAll("[data-family-response]").forEach((button) => {
      button.addEventListener("click", () =>
        respondFamilyInvitation(button.dataset.familyResponse, button.dataset.accept === "true")
      );
    });
    return;
  }

  els.familyInvitations.innerHTML = "";
  els.familyName.textContent = familyInfo.name;
  els.familyInviteForm.hidden = !familyInfo.isOwner;
  els.familyMembers.innerHTML = buildFamilyMembersMarkup({
    members: familyMembers,
    currentUserId: session?.user?.id || "",
    owner: familyInfo.isOwner,
    renderAvatar: renderAvatarMarkup,
  });
  els.familyMembers.querySelectorAll("[data-remove-family-member]").forEach((button) => {
    button.addEventListener("click", () => removeFamilyMember(button.dataset.removeFamilyMember));
  });
  const outgoing = familyInvitations.filter((invitation) => !invitation.is_incoming);
  els.familyOutgoingInvitations.innerHTML = buildFamilyOutgoingInvitationsMarkup(outgoing);
}

function renderSettingsFamilyPanel() {
  if (!els.settingsFamilyPanel) return;
  els.settingsFamilyPanel.innerHTML = buildSettingsFamilyMarkup({
    signedIn: Boolean(session),
    familyInfo,
    members: familyMembers,
    invitations: familyInvitations,
    currentUserId: session?.user?.id || "",
    renderAvatar: renderAvatarMarkup,
  });
  bindSettingsFamilyActions();
}
async function readSignupInviteCode(button) {
  if (!session?.access_token || !familyInfo?.isOwner) return;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "读取中…";
  try {
    const response = await fetch(`${R2_UPLOAD_ENDPOINT}/api/admin/signup-invite`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.data?.code) {
      throw new Error(payload?.error || "暂时无法读取邀请码");
    }
    const container = button.closest(".settings-family-invite-code");
    const value = container?.querySelector("[data-settings-signup-invite-value]");
    if (value) {
      value.hidden = false;
      value.textContent = String(payload.data.code);
    }
    try {
      await navigator.clipboard?.writeText(String(payload.data.code));
    } catch {}
    button.textContent = "已复制";
    window.setTimeout(() => {
      button.textContent = originalLabel;
    }, 1800);
  } catch (error) {
    console.error("read signup invite failed", error);
    button.textContent = "获取失败";
    window.setTimeout(() => {
      button.textContent = originalLabel;
    }, 1800);
  } finally {
    button.disabled = false;
  }
}

function bindSettingsFamilyActions() {
  els.settingsFamilyPanel
    ?.querySelectorAll("[data-settings-family-response]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        respondFamilyInvitation(
          button.dataset.settingsFamilyResponse,
          button.dataset.accept === "true"
        )
      );
    });
  els.settingsFamilyPanel
    ?.querySelector("[data-settings-signup-invite]")
    ?.addEventListener("click", (event) => readSignupInviteCode(event.currentTarget));
}

function setActiveSettingsSection(sectionId = "settingsGeneral") {
  const allowedSections = ["settingsGeneral", "settingsNotifications", "settingsCache", "settingsTools", "settingsAccount", "settingsFamily", "settingsSafety", "settingsDiagnostics", "settingsUploads"];
  const nextSection = allowedSections.includes(sectionId) ? sectionId : "settingsGeneral";
  activeSettingsSection = nextSection;

  els.settingsDialog.querySelectorAll(".settings-group").forEach((group) => {
    group.hidden = group.id !== nextSection;
  });
  els.settingsDialog.querySelectorAll("[data-settings-section]").forEach((button) => {
    const active = button.dataset.settingsSection === nextSection;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  if (nextSection === "settingsTools") renderSettingsToolOrderPanel();
  if (nextSection === "settingsNotifications") void refreshPushSettings();
  if (nextSection === "settingsFamily") renderSettingsFamilyPanel();
  if (nextSection === "settingsSafety") {
    void renderCloudBackups();
    void renderTrashItems();
  }
  if (nextSection === "settingsDiagnostics") void runOfflineDiagnostics();
  if (nextSection === "settingsUploads") void renderUploadCenter();
}

function openSettingsDialog(sectionId = activeSettingsSection || "settingsGeneral") {
  renderSettingsSummary();
  void refreshCacheInfo();
  setActiveSettingsSection(sectionId);
  if (!els.settingsDialog.open) els.settingsDialog.showModal();
}

function openSettingsChildDialog(dialog, prepare = null) {
  if (!dialog) return;
  els.userPopover.hidden = true;
  returnToSettingsAfterDialog = true;
  if (els.settingsDialog.open) els.settingsDialog.close();
  dialog.showModal();
  if (typeof prepare === "function") prepare();
}

function reopenSettingsAfterChildDialog() {
  if (!returnToSettingsAfterDialog) return;
  returnToSettingsAfterDialog = false;
  if (!session) return;
  window.setTimeout(() => openSettingsDialog(activeSettingsSection), 0);
}

function closeSettingsDialog() {
  returnToSettingsAfterDialog = false;
  els.settingsDialog.close();
}

async function refreshSharedContent() {
  if (!cloudDb || !session) return;
  await loadFamilyLevelProfiles();
  const [recipesResult, wishesResult] = await Promise.all([
    householdRepository.list("recipes", {
      order: [{ column: "created_at", ascending: false }],
    }),
    householdRepository.list("wishes", {
      order: [{ column: "created_at", ascending: false }],
    }),
  ]);
  if (!recipesResult.error) recipes = (recipesResult.data || []).map(recipeFromCloudRow);
  if (!wishesResult.error) wishes = (wishesResult.data || []).map(wishFromCloudRow);
  await Promise.all([
    loadPhotos(),
    synchronizeWeekendPlans(session.user.id),
    synchronizeAnniversaries(session.user.id),
    loadGratitudeNotes(),
    loadSecretItems(),
  ]);
  renderRecipes();
  renderWishes();
  renderWeekendPlans();
  renderAnniversaries();
}

async function createFamily(event) {
  event.preventDefault();
  if (!cloudDb || !session) return;
  els.familyStatus.textContent = "正在创建家庭组...";
  const { error } = await cloudDb.rpc("create_family", {
    p_name: els.familyNameInput.value.trim() || "我们的家",
  });
  if (error) {
    els.familyStatus.textContent = isMissingCloudSchema(error)
      ? "请先部署最新版 Cloudflare D1 结构。"
      : `创建失败：${error.message}`;
    return;
  }
  els.createFamilyForm.reset();
  await loadFamilyContext();
  els.familyStatus.textContent = "家庭组已创建。现在可以输入另一位用户的用户名。";
  await refreshSharedContent();
}

async function addFamilyMember(event) {
  event.preventDefault();
  if (!cloudDb || !session || !familyInfo?.isOwner) return;
  const username = els.familyUsernameInput.value.trim();
  if (!username) return;
  els.familyStatus.textContent = "正在添加家庭成员...";
  const { error } = await cloudDb.rpc("add_family_member_by_username", {
    p_username: username,
  });
  if (error) {
    els.familyStatus.textContent = `添加失败：${error.message}`;
    return;
  }
  els.familyInviteForm.reset();
  await loadFamilyContext();
  els.familyStatus.textContent = `已向 ${username} 发送邀请，等对方登录后接受。`;
}

async function respondFamilyInvitation(invitationId, accept) {
  if (!cloudDb || !session) return;
  els.familyStatus.textContent = accept ? "正在加入家庭..." : "正在拒绝邀请...";
  const { error } = await cloudDb.rpc("respond_family_invitation", {
    p_invitation_id: invitationId,
    p_accept: accept,
  });
  if (error) {
    els.familyStatus.textContent = `处理邀请失败：${error.message}`;
    return;
  }
  await loadFamilyContext();
  els.familyStatus.textContent = accept ? "已加入家庭，正在同步共同生活记录。" : "已拒绝邀请。";
  if (accept) await refreshSharedContent();
}

async function removeFamilyMember(userId) {
  const member = familyMembers.find((item) => item.user_id === userId);
  if (!member) return;
  const confirmed = await confirmAction({
    eyebrow: "家庭成员管理",
    title: `移出 ${member.username}？`,
    message: "对方将无法继续查看家庭共享内容，自己的私人数据不会被删除。",
    confirmLabel: "移出家庭",
    cancelLabel: "取消",
    danger: true,
  });
  if (!confirmed) return;
  const { error } = await cloudDb.rpc("remove_family_member", { p_user_id: userId });
  if (error) {
    els.familyStatus.textContent = `移除失败：${error.message}`;
    return;
  }
  await loadFamilyContext();
  els.familyStatus.textContent = `${member.username} 已移出家庭组。`;
  await refreshSharedContent();
}

async function syncAppIconBadge(count = 0) {
  const nextCount = Math.max(0, Number(count) || 0);
  if (nextCount === lastAppBadgeCount) return;
  if (!("setAppBadge" in navigator) && !("clearAppBadge" in navigator)) return;
  lastAppBadgeCount = nextCount;

  try {
    if (nextCount > 0 && navigator.setAppBadge) {
      await navigator.setAppBadge(nextCount);
    } else if (navigator.clearAppBadge) {
      await navigator.clearAppBadge();
    } else if (navigator.setAppBadge) {
      await navigator.setAppBadge(0);
    }
  } catch {}
}

function getNotificationText(item) {
  return buildNotificationText(item, getNotificationActorName(item));
}

function getNotificationActorName(item) {
  const fromFamily = item?.actor_id ? familyMemberMap.get(item.actor_id)?.username : "";
  return item?.actor_username || fromFamily || "有人";
}

function getNotificationActorAvatar(item) {
  const fromFamily = item?.actor_id
    ? getProfileAvatarUrl(familyMemberMap.get(item.actor_id) || {})
    : "";
  const fromProfiles = item?.actor_id
    ? getProfileAvatarUrl(familyLevelProfiles.get(item.actor_id) || {})
    : "";
  return getProfileAvatarUrl(item) || fromProfiles || fromFamily || loadCachedAvatarUrl(item?.actor_id) || "";
}

async function loadNotificationsInternal() {
  if (!cloudDb || !session) {
    notifications = [];
    renderNotifications();
    return;
  }
  const { data, error } = await notificationRepository.list(50);
  if (error) {
    notifications = [];
    els.notificationStatus.textContent = isMissingCloudSchema(error)
      ? "运行本次互动通知数据库补丁后即可使用。"
      : `通知读取失败：${error.message}`;
  } else {
    notifications = data || [];
    els.notificationStatus.textContent = "";
  }
  renderNotifications();
}

async function loadNotifications() {
  if (notificationsLoadPromise) return notificationsLoadPromise;
  notificationsLoadPromise = loadNotificationsInternal().finally(() => {
    notificationsLoadPromise = null;
  });
  return notificationsLoadPromise;
}

function renderNotifications() {
  const unread = renderNotificationsView({
    listElement: els.notificationList,
    badgeElement: els.notificationBadge,
    notifications,
    getText: getNotificationText,
    getActorName: getNotificationActorName,
    getActorAvatar: getNotificationActorAvatar,
    onOpen: openNotification,
  });
  void syncAppIconBadge(unread);
}

async function openNotification(button) {
  const id = button.dataset.notificationId;
  const photoId = button.dataset.notificationPhoto;
  const type = button.dataset.notificationType;
  const item = notifications.find((entry) => (entry.notification_id || entry.id) === id);
  if (item) item.is_read = true;
  renderNotifications();
  let photo = photos.find((entry) => entry.id === photoId);
  if (!photo && photoId && cloudDb && session) {
    const { data, error } = await diaryRepository.getById(photoId);
    if (!error && data) {
      photo = data;
      if (!photos.some((entry) => entry.id === data.id)) photos.unshift(data);
      savePhotoFeedCache(session.user.id);
      renderGallery();
    }
  }
  if (photo) {
    els.notificationDialog.close();
    switchPage("gallery");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    openPhoto(photo);
  } else if (type === "thanks") {
    els.notificationDialog.close();
    switchPage("thanks");
  } else {
    showMiniToast("这条日记可能已删除或暂时无法读取。", { kind: "error", duration: 2600 });
  }
}

async function openNotificationsPanel() {
  await loadNotifications();
  const justSeenIds = notifications
    .filter((item) => !item.is_read)
    .map((item) => item.notification_id || item.id)
    .filter(Boolean);
  if (justSeenIds.length) {
    notifications.forEach((item) => {
      if (justSeenIds.includes(item.notification_id || item.id)) {
        item.is_read = true;
        item.just_seen = true;
      } else {
        item.just_seen = false;
      }
    });
    renderNotifications();
  }
  els.notificationDialog.showModal();
  if (justSeenIds.length) await markUnreadNotificationsRead();
}

async function markUnreadNotificationsRead() {
  if (!cloudDb || !session) return;
  const { error } = await notificationRepository.markAllUnread(session.user.id);
  if (error) {
    els.notificationStatus.textContent = `更新失败：${error.message}`;
    return;
  }
  notifications.forEach((item) => {
    item.is_read = true;
  });
  renderNotifications();
}

async function loadPhotoComments(photoId) {
  photoComments = [];
  els.photoCommentStatus.textContent = "";
  const canComment = Boolean(
    session &&
      activeDialogPhoto &&
      (activeDialogPhoto.user_id === session.user.id ||
        familyMemberMap.has(activeDialogPhoto.user_id))
  );
  els.photoCommentForm.hidden = !canComment;
  if (!cloudDb || !session || !photoId) {
    renderPhotoComments();
    return;
  }
  const { data, error } = await diaryRepository.listComments(photoId);
  if (error) {
    els.photoCommentStatus.textContent = isMissingCloudSchema(error)
      ? "运行最新版数据库脚本后即可留言。"
      : `留言读取失败：${error.message}`;
  } else {
    photoComments = data || [];
  }
  renderPhotoComments();
  renderMobileDiaryComments();
}

function renderPhotoComments() {
  if (!els.photoCommentsList) return;
  const heading = els.photoCommentsSection?.querySelector(".photo-comments-head h3");
  if (heading) heading.textContent = `共 ${photoComments.length} 条评论`;
  if (!photoComments.length) {
    els.photoCommentsList.innerHTML = `<p class="photo-comments-empty">还没有留言。</p>`;
    return;
  }
  const byParent = new Map();
  photoComments.forEach((comment) => {
    const parentId = comment.parent_id || "root";
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(comment);
  });

  const renderBranch = (parentId = "root", depth = 0) =>
    (byParent.get(parentId) || [])
      .map((comment) => {
        const authorName = getAuthorName(comment.user_id);
        const replyTarget = comment.parent_id
          ? photoComments.find((item) => item.id === comment.parent_id)
          : null;
        const isAuthor = comment.user_id === activeDialogPhoto?.user_id;
        return `
          <div class="photo-comment-thread" style="--comment-depth:${Math.min(depth, 3)}">
            <article class="photo-comment">
              ${renderAvatarMarkup(comment.user_id)}
              <div class="photo-comment-main">
                <header>
                  <span class="photo-comment-author-line">
                    <strong>${escapeHtml(authorName)}</strong>
                    ${isAuthor ? `<small class="photo-comment-author-badge">作者</small>` : ""}
                  </span>
                </header>
                ${replyTarget ? `<small class="reply-target">回复 ${escapeHtml(getAuthorName(replyTarget.user_id))}</small>` : ""}
                <p>${escapeHtml(comment.body)}</p>
                <time>${formatCommentTime(comment.created_at)}</time>
                <div class="photo-comment-actions">
                  <button type="button" data-reply-comment="${escapeHtml(comment.id)}">回复</button>
                  ${comment.user_id === session?.user?.id ? `<button type="button" data-delete-comment="${escapeHtml(comment.id)}">删除</button>` : ""}
                </div>
              </div>
            </article>
            ${renderBranch(comment.id, depth + 1)}
          </div>
        `;
      })
      .join("");

  els.photoCommentsList.innerHTML = renderBranch();
  els.photoCommentsList.querySelectorAll("[data-reply-comment]").forEach((button) => {
    button.addEventListener("click", () => startCommentReply(button.dataset.replyComment));
  });
  els.photoCommentsList.querySelectorAll("[data-delete-comment]").forEach((button) => {
    button.addEventListener("click", () => deletePhotoComment(button.dataset.deleteComment));
  });
}

function startCommentReply(commentId) {
  const comment = photoComments.find((item) => item.id === commentId);
  if (!comment) return;
  commentReplyToId = comment.id;
  els.commentReplyingText.textContent = `正在回复 ${getAuthorName(comment.user_id)}`;
  els.commentReplying.hidden = false;
  els.photoCommentInput.placeholder = `回复 ${getAuthorName(comment.user_id)}`;
  els.photoCommentInput.focus();
}

function cancelCommentReply() {
  commentReplyToId = null;
  els.commentReplying.hidden = true;
  els.commentReplyingText.textContent = "";
  els.photoCommentInput.placeholder = "给这篇日记留句话";
}

async function savePhotoComment(event) {
  event.preventDefault();
  if (!cloudDb || !session || !activeDialogPhoto) return;
  const body = els.photoCommentInput.value.trim();
  if (!body) return;
  els.photoCommentStatus.textContent = "正在发送...";
  const { error } = await diaryRepository.addComment({
    photo_id: activeDialogPhoto.id,
    user_id: session.user.id,
    body,
    parent_id: commentReplyToId,
  });
  if (error) {
    els.photoCommentStatus.textContent = isMissingCloudSchema(error)
      ? "请先部署最新版 Cloudflare D1 结构。"
      : `发送失败：${error.message}`;
    return;
  }
  els.photoCommentForm.reset();
  cancelCommentReply();
  await loadPhotoComments(activeDialogPhoto.id);
  await loadPhotoCommentPreviews();
  const gainedExp = await awardExperience("comment");
  els.photoCommentStatus.textContent = gainedExp ? `留言已发送。修为 +${gainedExp}` : "留言已发送。";
  if (activePage === "gallery") renderGallery();
}

async function deletePhotoComment(id) {
  const comment = photoComments.find((item) => item.id === id);
  if (!comment || comment.user_id !== session?.user?.id) return;
  const { error } = await diaryRepository.removeComment(id);
  if (error) {
    els.photoCommentStatus.textContent = `删除失败：${error.message}`;
    return;
  }
  await loadPhotoComments(activeDialogPhoto?.id);
  await loadPhotoCommentPreviews();
  if (activePage === "gallery") renderGallery();
}

function setHint(message) {
  els.authHint.textContent = message;
}

function setGlobalStatus(message) {
  if (!els.globalStatus) return;
  els.globalStatus.textContent = message || "";
  els.globalStatus.hidden = !message;
}

function updateDiaryBackTopButton() {
  let button = document.querySelector("#diaryBackTop");
  const shouldShow = !isMobileViewport() && activePage === "gallery" && window.scrollY > 720;
  if (!button && shouldShow) {
    button = document.createElement("button");
    button.id = "diaryBackTop";
    button.className = "diary-back-top";
    button.type = "button";
    button.textContent = "↑";
    button.setAttribute("aria-label", "回到日记顶部");
    button.title = "回到顶部";
    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.append(button);
  }
  if (button) button.hidden = !shouldShow;
}

function setStatus(message) {
  els.uploadStatus.textContent = message;
}

els.setupToggle.addEventListener("click", () => {
  els.setupPanel.hidden = !els.setupPanel.hidden;
});
els.themeToggle.addEventListener("click", toggleTheme);
els.galleryNav.addEventListener("click", () => {
  setUploadExpanded(false);
  vlogMode.close();
  switchPage("gallery");
});
els.recipesNav?.addEventListener("click", () => {
  switchPage("recipes");
  els.recipesPage?.scrollIntoView({ behavior: "smooth", block: "start" });
});
els.recipesToolOpen?.addEventListener("click", () => {
  switchPage("recipes");
  els.recipesPage?.scrollIntoView({ behavior: "smooth", block: "start" });
});
els.wishlistNav.addEventListener("click", () => switchPage("wishlist"));
els.weekendNav.addEventListener("click", () => switchPage("weekend"));
els.wardrobeNav?.addEventListener("click", () => switchPage("wardrobe"));
els.thanksNav?.addEventListener("click", () => switchPage("thanks"));
els.secretNav?.addEventListener("click", () => switchPage("secret"));
els.brand?.addEventListener("click", (event) => {
  event.preventDefault();
  switchPage("gallery");
  window.scrollTo({ top: 0, behavior: "smooth" });
});
els.toolDock?.addEventListener("click", handleToolDockClick, true);
els.toolDock?.addEventListener("pointerdown", startToolDockPointer);
els.toolDock?.addEventListener("pointermove", moveToolDockPointer);
els.toolDock?.addEventListener("pointerup", finishToolDockPointer);
els.toolDock?.addEventListener("pointercancel", finishToolDockPointer);
els.toolDock?.addEventListener("lostpointercapture", finishToolDockPointer);
document.addEventListener("click", (event) => {
  if (!els.toolDock?.classList.contains("touch-sorting")) return;
  if (els.toolDock.contains(event.target)) return;
  exitToolDockTouchSort();
});
document.addEventListener("pointerdown", beginGlobalMobileBackSwipe, { passive: true, capture: true });
document.addEventListener("pointermove", moveGlobalMobileBackSwipe, { passive: true, capture: true });
document.addEventListener("pointerup", finishGlobalMobileBackSwipe, { passive: true, capture: true });
document.addEventListener("pointercancel", cancelGlobalMobileBackSwipe, { passive: true, capture: true });
els.foodWheelOpen.addEventListener("click", openFoodWheel);
els.foodWheelClose.addEventListener("click", closeFoodWheel);
els.foodWheelDialog.addEventListener("click", (event) => {
  if (event.target === els.foodWheelDialog) closeFoodWheel();
});
els.spinFoodWheel.addEventListener("click", spinFoodWheel);
els.addFoodOption.addEventListener("click", addFoodOption);
els.foodOptionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addFoodOption();
});
els.anniversaryOpen.addEventListener("click", () => {
  renderAnniversaries();
  els.anniversaryDialog.showModal();
});
els.anniversaryClose.addEventListener("click", () => els.anniversaryDialog.close());
els.anniversaryDialog.addEventListener("click", (event) => {
  if (event.target === els.anniversaryDialog) els.anniversaryDialog.close();
});
els.anniversaryAdd.addEventListener("click", () => {
  const shouldExpand = els.anniversaryForm.hidden;
  if (shouldExpand) resetAnniversaryForm();
  setAnniversaryFormExpanded(shouldExpand);
});
els.anniversaryForm.addEventListener("submit", saveAnniversary);
els.anniversaryCancel.addEventListener("click", () => {
  resetAnniversaryForm();
  setAnniversaryFormExpanded(false);
});
els.memoryButton.addEventListener("click", openRandomMemory);
els.weeklyReviewOpen?.addEventListener("click", openWeeklyReview);
els.weeklyReviewClose?.addEventListener("click", () => els.weeklyReviewDialog.close());
els.weeklyReviewDialog?.addEventListener("click", (event) => {
  if (event.target === els.weeklyReviewDialog) els.weeklyReviewDialog.close();
});
els.secretOpen?.addEventListener("click", () => {
  if (switchPage("secret")) {
    els.secretPage?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
els.thanksOpen?.addEventListener("click", () => switchPage("thanks"));
els.secretPinClose?.addEventListener("click", () => els.secretPinDialog?.close());
els.secretPinDialog?.addEventListener("close", () => {
  reopenSettingsAfterChildDialog();
  secretPinController.resetManageMode();
});
els.secretPinDialog?.addEventListener("click", (event) => {
  if (event.target === els.secretPinDialog) els.secretPinDialog.close();
});
els.secretPinKeypad?.addEventListener("click", (event) => {
  const digitButton = event.target.closest("[data-secret-pin-digit]");
  if (digitButton) appendSecretPinDigit(digitButton.dataset.secretPinDigit || "");
  if (event.target.closest("[data-secret-pin-delete]")) deleteSecretPinDigit();
});
document.addEventListener("keydown", (event) => {
  if (!els.secretPinDialog?.open) return;
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    appendSecretPinDigit(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    deleteSecretPinDigit();
  }
});
els.quickPhoto.addEventListener("click", () => {
  vlogMode.close();
  switchPage("gallery");
  setUploadExpanded(true);
  els.composer.scrollIntoView({ behavior: "smooth", block: "start" });
});
els.quickRecipe.addEventListener("click", () => {
  switchPage("recipes");
  setRecipeExpanded(true);
  els.recipeComposer.scrollIntoView({ behavior: "smooth", block: "start" });
});
els.quickWish.addEventListener("click", () => {
  switchPage("wishlist");
  setWishlistExpanded(true);
  els.wishlistComposer.scrollIntoView({ behavior: "smooth", block: "start" });
});
  els.quickWeekend.addEventListener("click", () => {
  switchPage("weekend");
  setWeekendExpanded(true);
  els.weekendComposer.scrollIntoView({ behavior: "smooth", block: "start" });
});
els.overviewLevelButton?.addEventListener("click", openLevelDialog);
els.xpPanel?.addEventListener("click", openLevelDialog);
els.saveConfig.addEventListener("click", saveConfig);
els.loginButton.addEventListener("click", loginWithPassword);
els.signupButton.addEventListener("click", signupWithPassword);
els.forgotPasswordButton.addEventListener("click", () => {
  els.forgotPasswordForm.reset();
  resetEmailRecoveryUi();
  els.recoveryUsernameInput.value = els.usernameInput.value.trim();
  els.forgotPasswordStatus.textContent = "";
  els.forgotPasswordDialog.showModal();
  els.resetEmailInput?.focus();
});
els.recipeToggle.addEventListener("click", () => {
  setRecipeExpanded(els.recipeForm.hidden);
});
els.recipeCoverInput.addEventListener("change", updateRecipeCoverPreview);
els.recipeCoverDrop.addEventListener("paste", handleRecipeCoverPaste);
els.recipeCoverLinkAdd?.addEventListener("click", () => applyRecipeCoverUrl(els.recipeCoverLinkInput?.value));
els.recipeCoverLinkInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyRecipeCoverUrl(els.recipeCoverLinkInput.value);
  }
});
document.addEventListener("paste", (event) => {
  if (event.defaultPrevented || activePage !== "recipes" || els.recipeForm.hidden) return;
  const hasImage = Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/"));
  if (!hasImage && event.target !== els.recipeCoverLinkInput && event.target !== els.recipeCoverDrop) return;
  handleRecipeCoverPaste(event);
});
document.addEventListener("paste", (event) => {
  if (event.defaultPrevented || !session) return;
  const hasImage = Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/"));
  if (activePage === "wishlist" && !els.wishlistForm.hidden && (hasImage || event.target === els.wishImageLinkInput)) {
    handleWishImagePaste(event);
  } else if (activePage === "weekend" && !els.weekendForm.hidden && (hasImage || event.target === els.weekendImageLinkInput)) {
    handleWeekendImagePaste(event);
  } else if (activePage === "secret" && !els.secretForm.hidden && (hasImage || event.target === els.secretImageLinkInput)) {
    handleSecretPaste(event);
  }
});
els.recipeForm.addEventListener("submit", saveRecipe);
els.recipeCancelEdit.addEventListener("click", () => {
  resetRecipeForm();
  setRecipeExpanded(false);
  setRecipeStatus("");
});
els.wishlistToggle.addEventListener("click", () => {
  setWishlistExpanded(els.wishlistForm.hidden);
});
els.wishImageInput.addEventListener("change", updateWishImagePreview);
els.wishImageDrop.addEventListener("paste", handleWishImagePaste);
els.wishImageLinkAdd?.addEventListener("click", () => applyWishImageUrl(els.wishImageLinkInput?.value));
els.wishImageLinkInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyWishImageUrl(els.wishImageLinkInput.value);
  }
});
els.wishRemoveImage.addEventListener("click", removeWishImage);
els.wishlistForm.addEventListener("submit", saveWish);
els.wishCancelEdit.addEventListener("click", () => {
  resetWishForm();
  setWishlistExpanded(false);
  setWishlistStatus("");
});
els.wishTabs?.querySelectorAll("[data-wish-view]").forEach((button) => {
  button.addEventListener("click", () => {
    activeWishView = button.dataset.wishView === "done" ? "done" : "open";
    renderWishes();
  });
});
els.wishCompleteForm.addEventListener("submit", submitWishCompletion);
els.wishCompleteClose.addEventListener("click", closeWishCompleteDialog);
els.wishCompleteCancel.addEventListener("click", closeWishCompleteDialog);
els.wishCompleteDialog.addEventListener("click", (event) => {
  if (event.target === els.wishCompleteDialog) closeWishCompleteDialog();
});
els.weekendToggle.addEventListener("click", () => {
  setWeekendExpanded(els.weekendForm.hidden);
});
els.weekendImageInput?.addEventListener("change", () => addWeekendFiles(els.weekendImageInput.files));
els.weekendImageDrop?.addEventListener("paste", handleWeekendImagePaste);
els.weekendImageLinkAdd?.addEventListener("click", () => addWeekendImageLinks());
els.weekendImageLinkInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addWeekendImageLinks();
  }
});
els.weekendImagePreviews?.addEventListener("click", (event) => {
  const existingButton = event.target.closest("[data-remove-weekend-existing]");
  const selectedButton = event.target.closest("[data-remove-weekend-selected]");
  const linkButton = event.target.closest("[data-remove-weekend-link]");
  if (!existingButton && !selectedButton && !linkButton) return;
  event.preventDefault();
  event.stopPropagation();
  if (existingButton) removeWeekendImageEntry("existing", Number(existingButton.dataset.removeWeekendExisting));
  if (selectedButton) removeWeekendImageEntry("selected", Number(selectedButton.dataset.removeWeekendSelected));
  if (linkButton) removeWeekendImageEntry("link", Number(linkButton.dataset.removeWeekendLink));
  setWeekendStatus("已移除场景图片，保存计划后生效。");
});
els.weekendForm.addEventListener("submit", saveWeekendPlan);
els.weekendCancelEdit.addEventListener("click", () => {
  resetWeekendForm();
  setWeekendExpanded(false);
  setWeekendStatus("");
});
els.weekendCompletionInput?.addEventListener("change", () => addWeekendCompletionFiles(els.weekendCompletionInput.files));
els.weekendCompletionDrop?.addEventListener("paste", (event) => {
  const files = getImageFilesFromClipboard(event, "weekend-recap");
  if (files.length) {
    event.preventDefault();
    addWeekendCompletionFiles(files);
    return;
  }
  const url = getClipboardImageUrl(event.clipboardData);
  if (addWeekendCompletionLinks(url)) event.preventDefault();
});
els.weekendCompletionPreviews?.addEventListener("click", (event) => {
  const existing = event.target.closest("[data-remove-weekend-completion-existing]");
  const file = event.target.closest("[data-remove-weekend-completion-file]");
  const link = event.target.closest("[data-remove-weekend-completion-link]");
  if (!existing && !file && !link) return;
  event.preventDefault();
  event.stopPropagation();
  if (existing) removeWeekendCompletionEntry("existing", Number(existing.dataset.removeWeekendCompletionExisting));
  if (file) removeWeekendCompletionEntry("file", Number(file.dataset.removeWeekendCompletionFile));
  if (link) removeWeekendCompletionEntry("link", Number(link.dataset.removeWeekendCompletionLink));
});
els.weekendCompletionLinkAdd?.addEventListener("click", () => addWeekendCompletionLinks());
els.weekendCompletionLinkInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addWeekendCompletionLinks();
});
els.weekendCompletionForm?.addEventListener("submit", saveWeekendCompletion);
els.weekendCompletionClose?.addEventListener("click", closeWeekendCompletionDialog);
els.weekendCompletionCancel?.addEventListener("click", closeWeekendCompletionDialog);
els.weekendCompletionDialog?.addEventListener("click", (event) => {
  if (event.target === els.weekendCompletionDialog) closeWeekendCompletionDialog();
});
document.addEventListener("paste", (event) => {
  if (!els.weekendCompletionDialog?.open || event.defaultPrevented) return;
  const files = getImageFilesFromClipboard(event, "weekend-recap");
  if (files.length) {
    event.preventDefault();
    addWeekendCompletionFiles(files);
    return;
  }
  const url = getClipboardImageUrl(event.clipboardData);
  if (url && addWeekendCompletionLinks(url)) event.preventDefault();
});
els.thanksForm.addEventListener("submit", saveGratitudeNote);
els.thanksCancelEdit.addEventListener("click", resetGratitudeForm);
els.thanksForm.querySelectorAll('input[name="thanksColor"]').forEach((input) => {
  input.addEventListener("change", () => {
    setSelectedThanksColor(input.value);
    if (session) {
      saveThanksColorPreference(input.value, {
        userId: session.user.id,
        syncCloud: true,
      });
    }
  });
});
els.secretToggle?.addEventListener("click", () => {
  renderSecretLinkedPhotoOptions();
  setSecretExpanded(els.secretForm.hidden);
});
els.secretImageInput?.addEventListener("click", () => {
  els.secretImageInput.value = "";
});
els.secretImageInput?.addEventListener("input", updateSecretPreview);
els.secretImageInput?.addEventListener("change", updateSecretPreview);
els.secretImageDrop?.addEventListener("paste", handleSecretPaste);
els.secretImageLinkAdd?.addEventListener("click", () => addSecretImageLinks());
els.secretImageLinkInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addSecretImageLinks();
  }
});
els.secretForm?.addEventListener("submit", saveSecretItem);
els.avatarButton.addEventListener("click", () => {
  els.userPopover.hidden = !els.userPopover.hidden;
});
els.accountSettingsButton.addEventListener("click", () => {
  els.userPopover.hidden = true;
  openSettingsDialog("settingsGeneral");
});
els.closeSettingsDialog.addEventListener("click", closeSettingsDialog);
els.settingsDialog.addEventListener("click", (event) => {
  if (event.target === els.settingsDialog) closeSettingsDialog();
});
els.settingsNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveSettingsSection(button.dataset.settingsSection);
  });
});
els.notificationButton.addEventListener("click", async () => {
  await openNotificationsPanel();
});
els.closeNotificationDialog.addEventListener("click", () => els.notificationDialog.close());
els.notificationDialog.addEventListener("click", (event) => {
  if (event.target === els.notificationDialog) els.notificationDialog.close();
});
window.addEventListener("online", () => {
  updateNetworkStatus();
  showMiniToast("网络已恢复，正在同步", { kind: "success" });
  void processDiaryUploadQueue();
});
window.addEventListener("offline", updateNetworkStatus);
updateNetworkStatus();
(navigator.connection || navigator.mozConnection || navigator.webkitConnection)?.addEventListener?.("change", () => {
  if (shouldAutoCacheMedia()) scheduleOfflineMediaCache();
  if (activePage === "gallery") renderGallery();
});
els.renameHomeButton.addEventListener("click", () => {
  openSettingsChildDialog(els.renameHomeDialog, () => {
    els.homeNameInput.value = accountProfile.homeName || loadHomeName(session?.user?.id);
    els.homeNameStatus.textContent = "";
    els.homeNameInput.focus();
  });
});
els.closeRenameHome.addEventListener("click", () => els.renameHomeDialog.close());
els.renameHomeDialog.addEventListener("click", (event) => {
  if (event.target === els.renameHomeDialog) els.renameHomeDialog.close();
});
els.renameHomeDialog.addEventListener("close", reopenSettingsAfterChildDialog);
els.renameHomeForm.addEventListener("submit", saveHomeName);
els.resetHomeName.addEventListener("click", restoreDefaultHomeName);
els.renameProfileButton.addEventListener("click", () => {
  openSettingsChildDialog(els.renameProfileDialog, () => {
    els.profileNicknameInput.value = getSessionDisplayName();
    els.profileNicknameStatus.textContent = "";
    els.profileNicknameInput.focus();
    els.profileNicknameInput.select();
  });
});
els.closeRenameProfile.addEventListener("click", () => els.renameProfileDialog.close());
els.renameProfileDialog.addEventListener("click", (event) => {
  if (event.target === els.renameProfileDialog) els.renameProfileDialog.close();
});
els.renameProfileDialog.addEventListener("close", reopenSettingsAfterChildDialog);
els.renameProfileForm.addEventListener("submit", saveProfileNickname);
els.changeAvatarButton.addEventListener("click", () => {
  openSettingsChildDialog(els.avatarDialog, () => {
    els.avatarForm.reset();
    els.avatarStatus.textContent = "";
    setAvatarPreview(accountProfile.avatarUrl);
  });
});
els.settingsFeedLayoutButton?.addEventListener("click", () => {
  setMobileFeedLayout(loadMobileFeedLayout() === "single" ? "double" : "single");
});
els.refreshCacheInfoButton?.addEventListener("click", () => {
  void refreshCacheInfo();
});
els.cacheLimitButton?.addEventListener("click", changeCacheLimit);
els.closeCacheLimitDialog?.addEventListener("click", () => els.cacheLimitDialog.close());
els.cancelCacheLimit?.addEventListener("click", () => els.cacheLimitDialog.close());
els.cacheLimitDialog?.addEventListener("click", (event) => {
  if (event.target === els.cacheLimitDialog) els.cacheLimitDialog.close();
});
els.cacheLimitDialog?.addEventListener("close", reopenSettingsAfterChildDialog);
els.cacheLimitForm?.addEventListener("submit", saveCacheLimitFromDialog);
els.cacheLimitDialog?.querySelectorAll("[data-cache-limit-preset]").forEach((button) => {
  button.addEventListener("click", () => applyCacheLimitPreset(button.dataset.cacheLimitPreset));
});
els.clearAppCacheButton?.addEventListener("click", () => {
  void clearAppCache();
});
els.closeAvatarDialog.addEventListener("click", () => els.avatarDialog.close());
els.avatarDialog.addEventListener("click", (event) => {
  if (event.target === els.avatarDialog) els.avatarDialog.close();
});
els.avatarDialog.addEventListener("close", () => {
  clearAvatarPreviewUrl();
  reopenSettingsAfterChildDialog();
});
els.avatarInput.addEventListener("change", updateAvatarPreview);
els.avatarForm.addEventListener("submit", saveAvatar);
els.familyAccountButton.addEventListener("click", () => {
  openSettingsChildDialog(els.familyDialog, () => {
    els.familyStatus.textContent = "";
    els.familyNameInput.value = accountProfile.homeName || "我们的家";
    renderFamilyDialog();
  });
});
els.closeFamilyDialog.addEventListener("click", () => els.familyDialog.close());
els.familyDialog.addEventListener("click", (event) => {
  if (event.target === els.familyDialog) els.familyDialog.close();
});
els.familyDialog.addEventListener("close", reopenSettingsAfterChildDialog);
els.createFamilyForm.addEventListener("submit", createFamily);
els.familyInviteForm.addEventListener("submit", addFamilyMember);
els.changePasswordButton.addEventListener("click", () => {
  openSettingsChildDialog(els.changePasswordDialog, () => {
    els.changePasswordForm.reset();
    els.changePasswordStatus.textContent = "";
    els.newPasswordInput.focus();
  });
});
els.closeChangePassword.addEventListener("click", () => els.changePasswordDialog.close());
els.changePasswordDialog.addEventListener("click", (event) => {
  if (event.target === els.changePasswordDialog) els.changePasswordDialog.close();
});
els.changePasswordDialog.addEventListener("close", reopenSettingsAfterChildDialog);
els.changePasswordForm.addEventListener("submit", changePassword);
els.recoveryKeyButton.addEventListener("click", () => {
  openSettingsChildDialog(els.recoveryKeyDialog, () => {
    els.recoveryKeyForm.reset();
    els.recoveryKeyStatus.textContent = "";
    els.recoveryKeyInput.focus();
  });
});
els.closeRecoveryKey.addEventListener("click", () => els.recoveryKeyDialog.close());
els.recoveryKeyDialog.addEventListener("click", (event) => {
  if (event.target === els.recoveryKeyDialog) els.recoveryKeyDialog.close();
});
els.recoveryKeyDialog.addEventListener("close", reopenSettingsAfterChildDialog);
els.recoveryKeyForm.addEventListener("submit", saveRecoveryKey);
els.changeSecretPinButton?.addEventListener("click", () => {
  openSettingsChildDialog(els.secretPinDialog, openSecretPinSettings);
});
els.bindEmailButton?.addEventListener("click", () => {
  openSettingsChildDialog(els.emailBindingDialog, resetEmailBindingDialog);
});
els.closeEmailBinding?.addEventListener("click", () => els.emailBindingDialog?.close());
els.emailBindingDialog?.addEventListener("click", (event) => {
  if (event.target === els.emailBindingDialog) els.emailBindingDialog.close();
});
els.emailBindingDialog?.addEventListener("close", reopenSettingsAfterChildDialog);
els.emailBindingRequestForm?.addEventListener("submit", requestEmailBinding);
els.emailBindingConfirmForm?.addEventListener("submit", confirmEmailBinding);
els.closeLevelDialog?.addEventListener("click", () => els.levelDialog.close());
els.closeAchievementDialog?.addEventListener("click", () => els.achievementDialog.close());
els.achievementDialog?.addEventListener("click", (event) => {
  if (event.target === els.achievementDialog) els.achievementDialog.close();
});
els.levelDialog?.addEventListener("click", (event) => {
  if (event.target === els.levelDialog) els.levelDialog.close();
});
els.levelCurrentTitle?.addEventListener("click", () => {
  openLevelGuidePage();
});
els.closeForgotPassword.addEventListener("click", () => els.forgotPasswordDialog.close());
els.forgotPasswordDialog.addEventListener("click", (event) => {
  if (event.target === els.forgotPasswordDialog) els.forgotPasswordDialog.close();
});
els.emailResetRequestForm?.addEventListener("submit", requestEmailPasswordReset);
els.emailResetConfirmForm?.addEventListener("submit", confirmEmailPasswordReset);
els.forgotPasswordForm.addEventListener("submit", resetForgottenPassword);
els.vipBadge.addEventListener("click", () => {
  openLevelDialog();
});
els.vipPopoverBadge.addEventListener("click", () => {
  renderVipCenter();
  els.vipDialog.showModal();
});
els.passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loginWithPassword();
  }
});
els.logoutButton.addEventListener("click", logout);
document.addEventListener("click", (event) => {
  if (!els.userMenu.hidden && !els.userMenu.contains(event.target)) {
    els.userPopover.hidden = true;
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.dialog.open) {
    event.preventDefault();
    closePhotoDialog();
    return;
  }
  if (isSecretImageDialogOpen() && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    moveDialogImage(event.key === "ArrowLeft" ? -1 : 1, true);
    return;
  }
  if (isSecretImageDialogOpen() && event.key === "Tab") {
    const focusable = [...els.dialog.querySelectorAll(
      'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
    )].filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
diaryComposerController.bind();
els.closeDialog.addEventListener("click", closePhotoDialog);
els.dialog.addEventListener("click", (event) => {
  if (event.target === els.dialog) {
    closePhotoDialog();
  }
});
els.dialog.addEventListener("close", () => {
  const restoreScroll = dialogRestoreScrollY;
  const restorePhotoId = dialogRestorePhotoId;
  const restorePhotoTop = dialogRestorePhotoTop;
  activeDialogPhoto = null;
  dialogRandomMode = false;
  activeSecretDialogItem = null;
  dialogSecretSourceItem = null;
  photoComments = [];
  cancelDialogSwipe();
  cancelDialogBackSwipe();
  window.clearTimeout(dialogWheelResetTimer);
  dialogWheelResetTimer = null;
  dialogWheelAccumulator = 0;
  dialogWheelLockedUntil = 0;
  resetSecretImageZoom();
  if (els.dialogMedia) {
    els.dialogMedia.scrollTop = 0;
    els.dialogMedia.scrollLeft = 0;
  }
  els.photoCommentsSection.hidden = false;
  document.body.classList.remove("mobile-dialog-open");
  if (els.dialogRandomButton) {
    els.dialogRandomButton.hidden = true;
  }
  if (els.dialogSecretLinkButton) {
    els.dialogSecretLinkButton.hidden = true;
  }
  if (els.dialogSecretReturnButton) {
    els.dialogSecretReturnButton.hidden = true;
  }
  els.photoCommentForm.reset();
  cancelCommentReply();
  els.photoCommentStatus.textContent = "";
  els.dialog.classList.remove("no-comments-dialog", "secret-image-dialog", "mobile-page-dialog", "secret-image-fullscreen", "diary-detail-dialog", "diary-image-fullscreen", "wish-detail-dialog", "wish-detail-no-image");
  if (els.wishDialogFeedback) {
    els.wishDialogFeedback.hidden = true;
    els.wishDialogFeedback.classList.remove("empty");
    els.wishDialogFeedbackText.textContent = "";
    els.wishDialogCompletedAt.textContent = "";
  }
  if (photoDialogBackdrop) photoDialogBackdrop.hidden = true;
  document.body.classList.remove("photo-dialog-open");
  unlockDialogBackgroundScroll(restoreScroll);
  dialogRestorePhotoId = restorePhotoId;
  dialogRestorePhotoTop = restorePhotoTop;
  restoreDialogReturnTarget(restoreScroll);
  dialogRestoreScrollY = 0;
  dialogRestorePhotoId = "";
  dialogRestorePhotoTop = 0;
  dialogRestoreSecretImageUrl = "";
  dialogRestoreElementTop = 0;
  const returnFocus = secretViewerReturnFocus;
  secretViewerReturnFocus = null;
  secretViewerInfoOpen = false;
  dialogImageRequestId += 1;
  els.dialogImage.removeAttribute("src");
  els.dialogImage.hidden = false;
  els.dialogImage.classList.remove("is-loading", "is-load-error");
  if (els.dialogVideo) {
    stopDiaryMotionVideo(els.dialogVideo);
    els.dialogVideo.hidden = true;
  }
  setSecretViewerStatus("");
  window.clearTimeout(secretViewerResizeTimer);
  els.dialog.removeAttribute("aria-modal");
  els.dialogImage.style.removeProperty("width");
  els.dialogImage.style.removeProperty("height");
  requestAnimationFrame(() => {
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  });
});
els.photoCommentForm.addEventListener("submit", savePhotoComment);
els.cancelCommentReply.addEventListener("click", cancelCommentReply);
els.dialogRandomButton?.addEventListener("click", openRandomMemory);
els.dialogSecretLinkButton?.addEventListener("click", openSecretLinkedDiary);
els.dialogSecretReturnButton?.addEventListener("click", returnToSecretItem);
els.dialogPrev.addEventListener("click", () => moveDialogImage(-1));
els.dialogNext.addEventListener("click", () => moveDialogImage(1));
els.dialogDots?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-dialog-dot]");
  if (!button || !dialogImages.length) return;
  const nextIndex = Number(button.dataset.dialogDot);
  if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= dialogImages.length) return;
  const previousIndex = dialogImageIndex;
  dialogImageIndex = nextIndex;
  renderDialogMedia(nextIndex === previousIndex ? 0 : nextIndex > previousIndex ? 1 : -1);
});
els.diaryViewerPrev?.addEventListener("click", () => moveDialogImage(-1));
els.diaryViewerNext?.addEventListener("click", () => moveDialogImage(1));
els.diaryViewerZoomOut?.addEventListener("click", () => adjustDiaryViewerZoom(-0.25));
els.diaryViewerZoomIn?.addEventListener("click", () => adjustDiaryViewerZoom(0.25));
els.diaryViewerFit?.addEventListener("click", resetSecretImageZoom);
els.diaryViewerRotate?.addEventListener("click", () => {
  if (!els.dialog?.classList.contains("diary-image-fullscreen")) return;
  diaryImageRotation = (diaryImageRotation + 90) % 360;
  applySecretImageZoom();
});
els.diaryViewerDownload?.addEventListener("click", downloadCurrentDiaryImage);
els.secretViewerPrev?.addEventListener("click", () => moveDialogImage(-1, true));
els.secretViewerNext?.addEventListener("click", () => moveDialogImage(1, true));
els.secretViewerZoomOut?.addEventListener("click", () => {
  const rect = els.dialogMedia.getBoundingClientRect();
  zoomImageViewerAt(secretImageZoom.scale - 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
});
els.secretViewerZoomIn?.addEventListener("click", () => {
  const rect = els.dialogMedia.getBoundingClientRect();
  zoomImageViewerAt(secretImageZoom.scale + 0.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
});
els.secretViewerFit?.addEventListener("click", resetSecretImageZoom);
els.secretViewerInfo?.addEventListener("click", () => {
  if (!isSecretImageDialogOpen()) return;
  secretViewerInfoOpen = !secretViewerInfoOpen;
  els.dialog.classList.toggle("secret-viewer-info-open", secretViewerInfoOpen);
  refreshSecretViewerToolbar();
});
els.dialogMedia.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  if (event.target === els.dialogVideo) return;
  if (
    activeSecretDialogItem &&
    isSecretImageViewerOpen() &&
    event.target === els.dialogImage
  ) {
    if (Date.now() >= suppressDialogImageClickUntil && secretImageZoom.scale > 1.01) {
      event.preventDefault();
      event.stopPropagation();
      resetSecretImageZoom();
    }
    return;
  }
  if (
    isMobileViewport() &&
    isZoomableImageDialogOpen() &&
    event.target === els.dialogImage &&
    secretImageZoom.scale > 1.01
  ) {
    if (Date.now() < suppressDialogImageClickUntil) return;
    event.preventDefault();
    event.stopPropagation();
    resetSecretImageZoom();
    return;
  }
  if (activeSecretDialogItem) {
    if (isSecretImageViewerOpen()) {
      if (event.target === els.dialogMedia && secretImageZoom.scale <= 1.01) closePhotoDialog();
    } else if (event.target === els.dialogImage) {
      toggleDialogImageFullscreen();
    }
    return;
  }
  if (activeDialogPhoto) {
    toggleDiaryImageFullscreen();
  }
});
els.dialogImage.addEventListener("click", (event) => {
  if (activeSecretDialogItem && isSecretImageViewerOpen()) {
    event.preventDefault();
    event.stopPropagation();
    if (secretImageZoom.scale > 1.01 && Date.now() >= suppressDialogImageClickUntil) {
      resetSecretImageZoom();
    }
    return;
  }
  if (activeSecretDialogItem && isMobileViewport()) {
    event.preventDefault();
    event.stopPropagation();
    if (secretImageZoom.scale > 1.01 && Date.now() >= suppressDialogImageClickUntil) {
      resetSecretImageZoom();
    }
    return;
  }
  if (activeSecretDialogItem && !isSecretImageViewerOpen()) {
    event.preventDefault();
    event.stopPropagation();
    suppressDialogImageClickUntil = 0;
    toggleDialogImageFullscreen();
    return;
  }
  if (!activeDialogPhoto || activeSecretDialogItem || isMobileViewport()) return;
  event.stopPropagation();
  toggleDiaryImageFullscreen();
});
els.dialogExpandImage?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  suppressDialogImageClickUntil = 0;
  if (activeSecretDialogItem) {
    toggleDialogImageFullscreen({ bypassSuppression: true });
    return;
  }
  if (activeDialogPhoto) toggleDiaryImageFullscreen({ bypassSuppression: true });
});
els.dialogImage.addEventListener("dblclick", (event) => {
  if (!isSecretImageViewerOpen()) return;
  event.preventDefault();
  event.stopPropagation();
  if (secretImageZoom.scale > 1.01) resetSecretImageZoom();
  else zoomImageViewerAt(2, event.clientX, event.clientY);
});
els.dialogImage.addEventListener("load", () => {
  if (isFittableImageDialogOpen()) fitSecretViewerImage();
  els.dialogImage.classList.remove("is-loading", "is-load-error");
  setSecretViewerStatus("");
  resetSecretImageZoom();
});
els.dialogImage.addEventListener("error", () => {
  if (!isSecretImageViewerOpen()) return;
  els.dialogImage.classList.remove("is-loading");
  els.dialogImage.classList.add("is-load-error");
  setSecretViewerStatus("error", "图片加载失败，请稍后重试");
});
els.dialogMedia.addEventListener("touchstart", beginSecretImageTouch, { passive: false });
els.dialogMedia.addEventListener("touchmove", moveSecretImageTouch, { passive: false });
els.dialogMedia.addEventListener("touchend", endSecretImageTouch, { passive: false });
els.dialogMedia.addEventListener("touchcancel", endSecretImageTouch, { passive: false });
els.dialogMedia.addEventListener("wheel", handleSecretViewerWheel, { passive: false });
els.dialog.addEventListener("pointerdown", beginDialogBackSwipe, true);
els.dialog.addEventListener("pointerup", finishDialogBackSwipe, true);
els.dialog.addEventListener("pointercancel", cancelDialogBackSwipe, true);
els.dialog.addEventListener("lostpointercapture", cancelDialogBackSwipe, true);
els.dialogMedia.addEventListener("pointerdown", beginDialogSwipe);
els.dialogMedia.addEventListener("pointermove", moveDialogSwipe);
els.dialogMedia.addEventListener("pointerup", finishDialogSwipe);
els.dialogMedia.addEventListener("pointercancel", cancelDialogSwipe);
els.dialogMedia.addEventListener("lostpointercapture", cancelDialogSwipe);
window.addEventListener("resize", () => {
  if (!isZoomableImageDialogOpen()) return;
  window.clearTimeout(secretViewerResizeTimer);
  secretViewerResizeTimer = window.setTimeout(() => {
    fitSecretViewerImage();
    secretImageZoom = normalizeSecretImageZoom(secretImageZoom);
    applySecretImageZoom();
  }, 120);
});
els.editForm.addEventListener("submit", savePhotoEdit);
els.editImageInput.addEventListener("change", replaceEditingImage);
els.addEditImageButton?.addEventListener("click", startAppendEditingImages);
els.editMediaManager?.addEventListener("paste", handleEditImagePaste);
els.deleteEditingPhoto.addEventListener("click", deletePhotoFromEditor);
els.closeEditDialog.addEventListener("click", () => {
  editingPhoto = null;
  resetEditImageState();
  els.editDialog.close();
});
els.closeVipDialog.addEventListener("click", () => els.vipDialog.close());
els.chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    vlogMode.close();
    activeFilter = chip.dataset.filter;
    visiblePhotoCount = PAGE_SIZE;
    updateFilterChips();
    renderGallery();
  });
});
els.diarySearchInput?.addEventListener("input", () => {
  diarySearchQuery = els.diarySearchInput.value;
  visiblePhotoCount = PAGE_SIZE;
  updateDiarySearchUi();
  renderGallery();
});
els.secretSearchInput?.addEventListener("input", () => {
  secretSearchQuery = els.secretSearchInput.value;
  renderSecretGallery();
});
els.secretCreateFolderButton?.addEventListener("click", createSecretFolder);
els.clearDiarySearch?.addEventListener("click", () => {
  diarySearchQuery = "";
  visiblePhotoCount = PAGE_SIZE;
  updateDiarySearchUi();
  renderGallery();
  els.diarySearchInput?.focus();
});
const scheduleViewportLayout = createFrameScheduler(() => {
  syncMobileComposerPlacement();
  window.clearTimeout(updateReadMoreHints.resizeTimer);
  updateReadMoreHints.resizeTimer = window.setTimeout(() => updateReadMoreHints(els.gallery), 120);
  scheduleGalleryMasonryLayout();
  updateSecretToolbarTop();
  updateDiaryBackTopButton();
});
const scheduleScrollUiUpdate = createFrameScheduler(() => {
  updateSecretToolbarTop();
  updateDiaryBackTopButton();
});
window.addEventListener("resize", scheduleViewportLayout, { passive: true });
window.addEventListener("scroll", scheduleScrollUiUpdate, { passive: true });

navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.type === "OPEN_PUSH_NOTIFICATION") {
    void openPushDestination(event.data.data || {});
  }
});

registerAppShellWorker();
ensureFamilyTimelineUi();
updateDiarySearchUi();
renderFoodWheel();
initializeFeedObserver();
initializePullToRefresh();
applyMobileFeedLayout();
applyMobileSecretLayout();
syncMobileComposerPlacement();
restoreCloudflareSessionBackup().finally(() => initializeCloudflare());


import { confirmAction } from "./modules/confirm-dialog.js";
import { createOfflineCacheController } from "./modules/offline-cache-controller.js";
import { createOfflineSettingsController } from "./modules/offline-settings-controller.js";
import { createDataSafetyController } from "./modules/data-safety-controller.js";
import { createAccountSyncController } from "./modules/account-sync-controller.js";
import { createTrashController } from "./modules/trash-controller.js";
import { createDiaryFeedController } from "./modules/diary-feed-controller.js?v=20260824-032";
import { createSocialController } from "./modules/social-controller.js";
import { createFamilySettingsController } from "./modules/family-settings-controller.js";
import { createFamilyActivityController } from "./modules/family-activity-controller.js";
import { createToolDockController } from "./modules/tool-dock-controller.js";
import { createLayoutSettingsController } from "./modules/layout-settings-controller.js";
import { bindAppEvents } from "./modules/app-event-bindings.js?v=20260826-001";
import { createAssetController } from "./modules/asset-controller.js";
import { createDiaryComposerController } from "./modules/diary-composer-controller.js";
import { createGamificationController } from "./modules/gamification-controller.js?v=20260826-002";
import { createProfilePreferencesController } from "./modules/profile-preferences-controller.js";
import { createSecretPinController } from "./modules/secret-pin-controller.js";
import { createSecretController } from "./modules/secret-controller.js?v=20260826-001";
import { createPhotoViewerController } from "./modules/photo-viewer-controller.js?v=20260826-001";
import { createPhotoDetailController } from "./modules/photo-detail-controller.js?v=20260825-003";
import { createCloudflareBackend } from "./modules/cloudflare-client.js?v=20260811-010";
import { createMediaCacheService } from "./modules/media-cache.js";
import { createUploadQueue } from "./modules/upload-queue.js";
import { createPhotoFavoritesStore } from "./modules/photo-favorites.js";
import { createWishlistController } from "./modules/wishlist-controller.js";
import { createShoppingController } from "./modules/shopping-controller.js?v=20260826-002";
import { createWishlistHubController } from "./modules/wishlist-hub-controller.js?v=20260824-031";
import { createFoodWheelController } from "./modules/food-wheel-controller.js";
import { createPushController } from "./modules/push-controller.js";
import { createAuthController } from "./modules/auth-controller.js";
import { createRecipeController } from "./modules/recipe-controller.js";
import { createAnniversaryController } from "./modules/anniversary-controller.js";
import {
  createWeekendController,
  getNextWeekendDate,
} from "./modules/weekend-controller.js?v=20260824-030";
import { createGratitudeController } from "./modules/gratitude-controller.js";
import { configureCacheManagementUi } from "./modules/cache-management-view.js";
import { collectAppElements } from "./modules/app-elements.js";
import { refreshAdminStorage as refreshStorage } from "./modules/admin-storage.js";
import { createVlogMode } from "./modules/vlog-mode.js";
import {
  createDiaryRepository,
  createNotificationRepository,
  createSecretRepository,
  createWardrobeRepository,
} from "./modules/data-repositories.js?v=20260814-008";
import { createWardrobeController } from "./modules/wardrobe.js?v=20260811-005";
import {
  extractImageUrls,
  getClipboardImageUrl,
} from "./modules/media-metadata.js";
import {
  createImageService,
  getVideoContentType,
  getVideoFileExtension,
} from "./modules/image-service.js";
import { createPreferenceStore } from "./modules/preferences-store.js";
import { createHouseholdRepository } from "./modules/household-repository.js";
import { createAppLifecycleController } from "./modules/app-lifecycle.js";
import { createAppFeedbackView } from "./modules/app-feedback-view.js";
import { createAppNavigationController } from "./modules/app-navigation-controller.js";
import { createAppIdentityController } from "./modules/app-identity-controller.js";
import { createAppSessionController } from "./modules/app-session-controller.js";
import { createDiaryMetadata } from "./modules/diary-metadata.js";
import { createHouseholdBrandingController } from "./modules/household-branding-controller.js";
import { createSecretEntryPreferenceController } from "./modules/secret-entry-preference-controller.js";
import {
  getLocalDateKey,
  getOffsetLocalDateKey,
  getPhotoOwnerId,
  getRedirectUrl as resolveRedirectUrl,
  isMissingCloudSchema,
  isYesterdayLoginDate,
  normalizeLoginDateKey,
  normalizeNickname,
  normalizeUuid,
  toDateInputValue,
  usernameToEmail,
} from "./modules/app-domain.js";
import {
  escapeHtml,
  formatDate,
  formatFileSize,
  slugify,
} from "./modules/ui-formatters.js";
import {
  getDefaultSecretSortOrder,
  normalizeSecretImages,
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
let shoppingItems = [];
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
let appNavigationController = null;
const switchPage = (...args) => appNavigationController?.switchPage(...args) ?? false;
const renderOverview = (...args) => appNavigationController?.renderOverview(...args);
const getMemoryPhotos = (...args) => appNavigationController?.getMemoryPhotos(...args) || [];
const openRandomMemory = (...args) => appNavigationController?.openRandomMemory(...args);
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
let activeShoppingFilter = "open";
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
const DEFAULT_ACCOUNT_PROFILE = Object.freeze({
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
});
let accountProfile = { ...DEFAULT_ACCOUNT_PROFILE, foodOptions: [] };

const els = collectAppElements(document);
const appFeedbackView = createAppFeedbackView({
  elements: els,
  escapeHtml,
  getActivePage: () => activePage,
});
const {
  dismissMiniToast,
  isMobileViewport,
  setGlobalStatus,
  setHint,
  setSecretStatus,
  setStatus,
  showMiniToast,
  updateDiaryBackTopButton,
  updateNetworkStatus,
} = appFeedbackView;

const diaryMetadata = createDiaryMetadata({
  elements: els,
  generatedTitlePrefixes: GENERATED_TITLE_PREFIXES,
  slugify,
});
const {
  getDisplayTitle,
  getFinalTitle,
  getPhotoLabel,
  getUploadFileNameBase,
} = diaryMetadata;

const identityState = {
  get session() { return session; },
  get cloudDb() { return cloudDb; },
  get familyInfo() { return familyInfo; },
  get familyMemberMap() { return familyMemberMap; },
  get familyLevelProfiles() { return familyLevelProfiles; },
  get accountProfile() { return accountProfile; },
  get mobileDiaryPhoto() { return mobileDiaryPhoto; },
};
const identityController = createAppIdentityController({
  elements: els,
  state: identityState,
  avatarCacheKey: AVATAR_CACHE_KEY,
  photoCategories: PHOTO_CATEGORIES,
  getProfileAvatarUrl: (...args) => getProfileAvatarUrl(...args),
  renderSettingsSummary: (...args) => renderSettingsSummary(...args),
  renderExperience: (...args) => renderExperience(...args),
  renderGallery: (...args) => renderGallery(...args),
  renderMobileDiaryPage: (...args) => renderMobileDiaryPage(...args),
  showToast: showMiniToast,
});
const {
  adminUpdatePhotoCategory,
  canManageItem,
  getAuthorName,
  getSessionBoundEmail,
  getSessionDisplayName,
  getSessionLoginName,
  isAdminAccount,
  loadCachedAvatarUrl,
  renderAccountAvatar,
  renderAvatarMarkup,
  saveCachedAvatarUrl,
  updateSessionDisplayName,
} = identityController;

const brandingState = {
  get session() { return session; },
  get familyInfo() { return familyInfo; },
  get accountProfile() { return accountProfile; },
};
const householdBrandingController = createHouseholdBrandingController({
  elements: els,
  state: brandingState,
  preferenceStore,
  keys: { homeName: HOME_NAME_KEY, familyTagline: FAMILY_TAGLINE_KEY },
  defaults: { homeName: "咻蛋之家", familyTagline: DEFAULT_FAMILY_TAGLINE },
  renderSettingsSummary: (...args) => renderSettingsSummary(...args),
  setHint,
});
const {
  applyFamilyTagline,
  applyHomeName,
  loadFamilyTagline,
  loadHomeName,
  normalizeFamilyTagline,
  normalizeHomeName,
  saveConfig,
} = householdBrandingController;

let appSessionController = null;
const updateAuthUI = (...args) => appSessionController?.updateAuthUI(...args);

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
const diaryFeedState = {
  get cloudDb() { return cloudDb; },
  get photos() { return photos; }, set photos(value) { photos = value; },
  get session() { return session; },
  get photoFlagsCloudAvailable() { return photoFlagsCloudAvailable; }, set photoFlagsCloudAvailable(value) { photoFlagsCloudAvailable = value; },
  get pendingNewPhotos() { return pendingNewPhotos; }, set pendingNewPhotos(value) { pendingNewPhotos = value; },
  get dismissedFeedRefreshIds() { return dismissedFeedRefreshIds; }, set dismissedFeedRefreshIds(value) { dismissedFeedRefreshIds = value; },
  get showingCachedFeed() { return showingCachedFeed; }, set showingCachedFeed(value) { showingCachedFeed = value; },
  get photoCommentPreviewMap() { return photoCommentPreviewMap; }, set photoCommentPreviewMap(value) { photoCommentPreviewMap = value; },
  get photosLoadPromise() { return photosLoadPromise; }, set photosLoadPromise(value) { photosLoadPromise = value; },
  get visiblePhotoCount() { return visiblePhotoCount; }, set visiblePhotoCount(value) { visiblePhotoCount = value; },
  get weekendPlans() { return weekendPlans; },
  get activePage() { return activePage; },
  get notifications() { return notifications; },
  get feedRefreshCheckInFlight() { return feedRefreshCheckInFlight; }, set feedRefreshCheckInFlight(value) { feedRefreshCheckInFlight = value; },
  get activeFilter() { return activeFilter; }, set activeFilter(value) { activeFilter = value; },
  get filteredPhotoCount() { return filteredPhotoCount; }, set filteredPhotoCount(value) { filteredPhotoCount = value; },
  get galleryRenderSignature() { return galleryRenderSignature; }, set galleryRenderSignature(value) { galleryRenderSignature = value; },
  get galleryMasonryTimer() { return galleryMasonryTimer; }, set galleryMasonryTimer(value) { galleryMasonryTimer = value; },
  get pullRefreshState() { return pullRefreshState; }, set pullRefreshState(value) { pullRefreshState = value; },
  get mobileDiaryPhoto() { return mobileDiaryPhoto; },
  get galleryMasonryObserver() { return galleryMasonryObserver; }, set galleryMasonryObserver(value) { galleryMasonryObserver = value; },
  get diarySearchQuery() { return diarySearchQuery; }, set diarySearchQuery(value) { diarySearchQuery = value; },
  get mobileDiaryPage() { return mobileDiaryPage; },
  get feedObserver() { return feedObserver; }, set feedObserver(value) { feedObserver = value; },
  get feedLoading() { return feedLoading; }, set feedLoading(value) { feedLoading = value; },
  get cloudSyncAvailable() { return cloudSyncAvailable; },
};
const diaryFeedController = createDiaryFeedController({
  elements: els,
  state: diaryFeedState,
  constants: {
    todayPostsSeenKey: TODAY_POSTS_SEEN_KEY,
    photoCommentPreviewLimit: PHOTO_COMMENT_PREVIEW_LIMIT,
    pageSize: PAGE_SIZE,
  },
  demoPhotos,
  diaryRepository,
  notificationRepository: {
    markDiaryRead: (...args) => notificationRepository.markDiaryRead(...args),
  },
  photoFavorites,
  isFavoritePhoto,
  renderCachedPhotoFeed: (...args) => renderCachedPhotoFeed(...args),
  savePhotoFeedCache: (...args) => savePhotoFeedCache(...args),
  setGlobalStatus,
  updateCloudSyncStatus: (...args) => updateCloudSyncStatus(...args),
  loadNotifications: (...args) => loadNotifications(...args),
  renderNotifications: (...args) => renderNotifications(...args),
  switchPage,
  getLocalDateKey,
  getPhotoLabel,
  getAuthorName,
  renderOverview,
  renderAvatarMarkup,
  isAdminAccount,
  isMobileViewport,
  getPhotoOwnerId,
  getDisplayTitle,
  openPhoto: (...args) => openPhoto(...args),
  deletePhoto: (...args) => deletePhoto(...args),
  openEditPhoto: (...args) => openEditPhoto(...args),
  adminUpdatePhotoCategory,
  renderMobileDiaryPage: (...args) => renderMobileDiaryPage(...args),
  isMissingCloudSchema,
});
const {
  loadPhotos,
  loadPhotoCommentPreviews,
  getLocalDateKeyFromValue,
  isPhotoPublishedToday,
  getTodayPostsSeenStorageKey,
  loadTodaySeenPostIds,
  saveTodaySeenPostIds,
  getSortedPhotos,
  getTodayPublishedPhotos,
  getUpcomingWeekendPlans,
  getWeekendReminderDismissKey,
  renderWeekendReminderNotice,
  markTodayPostsViewed,
  acknowledgeViewedDiary,
  renderFeedRefreshNotice,
  checkForNewPhotos,
  refreshFeedForNewPhotos,
  updateTodayPostsNotice,
  updateFilterChips,
  showTodayPosts,
  renderPhotoCommentPreview,
  verifyPhotoFlagSchema,
  renderGallery,
  layoutGalleryMasonry,
  scheduleGalleryMasonryLayout,
  ensurePullRefreshIndicator,
  initializePullToRefresh,
  observeGalleryMasonry,
  getPhotoSearchText,
  updateDiarySearchSuggestions,
  filterPhotosBySearch,
  updateDiarySearchUi,
  isPhotoWithinSevenDays,
  togglePhotoFlag,
  togglePhotoFavorite,
  warmUpcomingFeedImages,
  getPhotoImages,
  getPlainNote,
  updateFeedLoader,
  initializeFeedObserver,
} = diaryFeedController;
const secretRepository = createSecretRepository({
  getDatabase: () => cloudDb,
  getSession: () => session,
});
const notificationRepository = createNotificationRepository({
  getDatabase: () => cloudDb,
});
const socialState = {
  get lastAppBadgeCount() { return lastAppBadgeCount; }, set lastAppBadgeCount(value) { lastAppBadgeCount = value; },
  get familyMemberMap() { return familyMemberMap; },
  get familyLevelProfiles() { return familyLevelProfiles; },
  get cloudDb() { return cloudDb; },
  get session() { return session; },
  get notifications() { return notifications; }, set notifications(value) { notifications = value; },
  get notificationsLoadPromise() { return notificationsLoadPromise; }, set notificationsLoadPromise(value) { notificationsLoadPromise = value; },
  get photos() { return photos; }, set photos(value) { photos = value; },
  get activeDialogPhoto() { return activeDialogPhoto; },
  get photoComments() { return photoComments; }, set photoComments(value) { photoComments = value; },
  get commentReplyToId() { return commentReplyToId; }, set commentReplyToId(value) { commentReplyToId = value; },
  get activePage() { return activePage; },
};
const socialController = createSocialController({
  elements: els,
  state: socialState,
  notificationRepository,
  diaryRepository,
  getProfileAvatarUrl: (...args) => getProfileAvatarUrl(...args),
  loadCachedAvatarUrl,
  isMissingCloudSchema,
  savePhotoFeedCache: (...args) => savePhotoFeedCache(...args),
  renderGallery,
  switchPage,
  openPhoto: (...args) => openPhoto(...args),
  showMiniToast,
  renderMobileDiaryComments: (...args) => renderMobileDiaryComments(...args),
  getAuthorName,
  renderAvatarMarkup,
  loadPhotoCommentPreviews,
  awardExperience: (...args) => awardExperience(...args),
});
const {
  syncAppIconBadge,
  getNotificationText,
  getNotificationActorName,
  getNotificationActorAvatar,
  loadNotifications,
  renderNotifications,
  openNotification,
  openNotificationsPanel,
  markUnreadNotificationsRead,
  loadPhotoComments,
  renderPhotoComments,
  startCommentReply,
  cancelCommentReply,
  savePhotoComment,
  deletePhotoComment,
} = socialController;
const familyActivityState = {
  get photos() { return photos; },
  get recipes() { return recipes; },
  get wishes() { return wishes; },
  get weekendPlans() { return weekendPlans; },
  get gratitudeNotes() { return gratitudeNotes; },
  get session() { return session; },
  get cloudDb() { return cloudDb; },
};
const familyActivityController = createFamilyActivityController({
  elements: els,
  state: familyActivityState,
  diaryRepository,
  getPhotoLabel,
  getSortedPhotos,
  getAuthorName,
  getPhotoImages,
  openPhoto: (...args) => openPhoto(...args),
});
const {
  getFamilyTimelineEntries,
  getCurrentWeekRange,
  isWithinRange,
  loadWeeklyReview,
  openWeeklyReview,
  renderFamilyTimeline,
  ensureFamilyTimelineUi,
} = familyActivityController;
const toolDockState = {
  get session() { return session; },
  get toolDockDragState() { return toolDockDragState; }, set toolDockDragState(value) { toolDockDragState = value; },
  get suppressToolDockClick() { return suppressToolDockClick; }, set suppressToolDockClick(value) { suppressToolDockClick = value; },
};
const toolDockController = createToolDockController({
  elements: els,
  state: toolDockState,
  preferenceStore,
  constants: {
    toolDockOrderKey: TOOL_DOCK_ORDER_KEY,
    toolDockDefaultOrder: TOOL_DOCK_DEFAULT_ORDER,
    toolDockLabels: TOOL_DOCK_LABELS,
  },
  getSessionDisplayName,
  renderAvatarMarkup,
});
const {
  getToolDockOrderStorageKey,
  normalizeToolDockOrder,
  loadToolDockOrder,
  writeToolDockOrder,
  saveToolDockOrder,
  applyToolDockOrder,
  renderSettingsToolOrderPanel,
  renderSettingsAccountOverview,
  ensureToolDockSortControls,
  startToolDockPointer,
  beginToolDockTouchSort,
  beginToolDockDrag,
  moveToolDockPointer,
  finishToolDockPointer,
  handleToolDockClick,
  moveToolDockItem,
  exitToolDockTouchSort,
} = toolDockController;
const layoutSettingsState = {
  get session() { return session; },
  get accountProfile() { return accountProfile; },
  get cloudDb() { return cloudDb; },
  get familyInfo() { return familyInfo; },
};
const layoutSettingsController = createLayoutSettingsController({
  elements: els,
  state: layoutSettingsState,
  preferenceStore,
  constants: {
    mobileFeedLayoutKey: MOBILE_FEED_LAYOUT_KEY,
    mobileSecretLayoutKey: MOBILE_SECRET_LAYOUT_KEY,
    mobileDialogBreakpoint: MOBILE_DIALOG_BREAKPOINT,
    defaultFamilyTagline: DEFAULT_FAMILY_TAGLINE,
  },
  scheduleGalleryMasonryLayout,
  openSettingsChildDialog: (...args) => openSettingsChildDialog(...args),
  reopenSettingsAfterChildDialog: (...args) => reopenSettingsAfterChildDialog(...args),
  loadFamilyTagline,
  normalizeFamilyTagline,
  applyFamilyTagline,
  ensureCacheManagementUi: (...args) => ensureCacheManagementUi(...args),
  ensureDataSafetyUi: (...args) => ensureDataSafetyUi(...args),
  ensureStabilitySettingsUi: (...args) => ensureStabilitySettingsUi(...args),
  renderSettingsAccountOverview,
  loadHomeName,
  getSessionDisplayName,
  getSessionBoundEmail,
  loadCacheCapacityMb: (...args) => loadCacheCapacityMb(...args),
  loadMediaCachePolicy: (...args) => loadMediaCachePolicy(...args),
});
const {
  getMobileFeedLayoutKey,
  loadMobileFeedLayout,
  applyMobileFeedLayout,
  setMobileFeedLayout,
  getMobileSecretLayoutKey,
  loadMobileSecretLayout,
  ensureSecretLayoutToggle,
  applyMobileSecretLayout,
  setMobileSecretLayout,
  updateSecretToolbarTop,
  syncMobileComposerPlacement,
  ensureFamilySignatureUi,
  renderSettingsSummary,
} = layoutSettingsController;
const householdRepository = createHouseholdRepository({
  getDatabase: () => cloudDb,
  getSession: () => session,
});
const secretEntryPreferenceState = {
  get session() { return session; },
  get secretDefaultFolderId() { return secretDefaultFolderId; },
  set secretDefaultFolderId(value) { secretDefaultFolderId = value; },
};
const secretEntryPreferenceController = createSecretEntryPreferenceController({
  state: secretEntryPreferenceState,
  repository: householdRepository,
  allFolderId: SECRET_ALL_FOLDER_ID,
  favoritesFolderId: SECRET_FAVORITES_FOLDER_ID,
  renderFolderControls: (...args) => renderSecretFolderControls(...args),
  setGlobalStatus,
});
const {
  getDefaultFolderId: getSecretDefaultFolderId,
  setDefaultFolderId: setSecretDefaultFolderId,
} = secretEntryPreferenceController;
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
const accountSyncState = {
  get familyInfo() { return familyInfo; }, set familyInfo(value) { familyInfo = value; },
  get familyMembers() { return familyMembers; }, set familyMembers(value) { familyMembers = value; },
  get familyInvitations() { return familyInvitations; }, set familyInvitations(value) { familyInvitations = value; },
  get familyMemberMap() { return familyMemberMap; }, set familyMemberMap(value) { familyMemberMap = value; },
  get cloudDb() { return cloudDb; },
  get session() { return session; },
  get accountProfile() { return accountProfile; }, set accountProfile(value) { accountProfile = value; },
  get gratitudeNotes() { return gratitudeNotes; }, set gratitudeNotes(value) { gratitudeNotes = value; },
  get weekendCloudAvailable() { return weekendCloudAvailable; }, set weekendCloudAvailable(value) { weekendCloudAvailable = value; },
  get weekendPlans() { return weekendPlans; }, set weekendPlans(value) { weekendPlans = value; },
  get cloudSyncInFlight() { return cloudSyncInFlight; }, set cloudSyncInFlight(value) { cloudSyncInFlight = value; },
  get secretDefaultFolderId() { return secretDefaultFolderId; }, set secretDefaultFolderId(value) { secretDefaultFolderId = value; },
  get foodOptionsCloudAvailable() { return foodOptionsCloudAvailable; }, set foodOptionsCloudAvailable(value) { foodOptionsCloudAvailable = value; },
  get thanksColorCloudAvailable() { return thanksColorCloudAvailable; }, set thanksColorCloudAvailable(value) { thanksColorCloudAvailable = value; },
  get profilePreferencesCloudAvailable() { return profilePreferencesCloudAvailable; }, set profilePreferencesCloudAvailable(value) { profilePreferencesCloudAvailable = value; },
  get cloudSyncAvailable() { return cloudSyncAvailable; }, set cloudSyncAvailable(value) { cloudSyncAvailable = value; },
  get accountDataState() { return accountDataState; }, set accountDataState(value) { accountDataState = value; },
  get recipes() { return recipes; }, set recipes(value) { recipes = value; },
  get wishes() { return wishes; }, set wishes(value) { wishes = value; },
  get shoppingItems() { return shoppingItems; }, set shoppingItems(value) { shoppingItems = value; },
  get foodOptions() { return foodOptions; }, set foodOptions(value) { foodOptions = value; },
  get activeVipLevel() { return activeVipLevel; }, set activeVipLevel(value) { activeVipLevel = value; },
  get photoFlagsCloudAvailable() { return photoFlagsCloudAvailable; },
  get anniversaryCloudAvailable() { return anniversaryCloudAvailable; },
  get secretCloudAvailable() { return secretCloudAvailable; },
};
const accountSyncController = createAccountSyncController({
  elements: els,
  state: accountSyncState,
  householdRepository,
  photoFavorites,
  defaultFoodOptions: DEFAULT_FOOD_OPTIONS,
  isMissingCloudSchema,
  getProfileAvatarUrl,
  saveCachedAvatarUrl,
  renderAccountAvatar,
  getSessionDisplayName,
  renderSettingsSummary,
  normalizeHomeName,
  loadHomeName,
  normalizeFamilyTagline,
  loadFamilyTagline,
  applyHomeName,
  applyFamilyTagline,
  renderFamilyDialog: (...args) => renderFamilyDialog(...args),
  renderGratitudeNotes: (...args) => renderGratitudeNotes(...args),
  loadWeekendPlans: (...args) => loadWeekendPlans(...args),
  saveWeekendPlans: (...args) => saveWeekendPlans(...args),
  renderWeekendPlans: (...args) => renderWeekendPlans(...args),
  setWeekendStatus: (...args) => setWeekendStatus(...args),
  loadRechargeTotal,
  loadLocalExperienceAliases,
  loadFoodOptions: (...args) => loadFoodOptions(...args),
  loadThanksColor: (...args) => loadThanksColor(...args),
  isVipUser,
  normalizeNickname,
  getSessionLoginName,
  getLocalDateKey,
  normalizeLoginDateKey,
  normalizeTheme: (...args) => normalizeTheme(...args),
  loadTheme: (...args) => loadTheme(...args),
  normalizeThanksColor: (...args) => normalizeThanksColor(...args),
  getDailyLoginReward,
  isYesterdayLoginDate,
  updateSessionDisplayName,
  applyTheme: (...args) => applyTheme(...args),
  saveThanksColorPreference: (...args) => saveThanksColorPreference(...args),
  setSelectedThanksColor: (...args) => setSelectedThanksColor(...args),
  saveRechargeTotal,
  saveExperience,
  getTodayExperienceStorageKey,
  saveRecipes: (...args) => saveRecipes(...args),
  saveFoodOptionsCache: (...args) => saveFoodOptionsCache(...args),
  renderExperience,
  renderVipCenter,
  renderRecipes: (...args) => renderRecipes(...args),
  renderWishes: (...args) => renderWishes(...args),
  renderShopping: (...args) => renderShopping(...args),
  renderFoodWheel: (...args) => renderFoodWheel(...args),
  synchronizeAnniversaries: (...args) => synchronizeAnniversaries(...args),
  loadPhotos,
  loadSecretItems: (...args) => loadSecretItems(...args),
  loadNotifications,
  refreshStorage,
  cloudflareRequest,
  isAdminAccount,
  setGlobalStatus,
  awardDailyExperience,
});
const {
  loadFamilyContext,
  loadGratitudeNotes,
  synchronizeWeekendPlans,
  synchronizeAccountData,
  updateCloudSyncStatus,
} = accountSyncController;
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
  get accountProfile() { return accountProfile; }, set accountProfile(value) { accountProfile = value; },
  get activePage() { return activePage; }, set activePage(value) { activePage = value; },
  get activeWishView() { return activeWishView; }, set activeWishView(value) { activeWishView = value; },
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
  get visiblePhotoCount() { return visiblePhotoCount; }, set visiblePhotoCount(value) { visiblePhotoCount = value; },
  get diarySearchQuery() { return diarySearchQuery; }, set diarySearchQuery(value) { diarySearchQuery = value; },
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
  get dialogImageRequestId() { return dialogImageRequestId; }, set dialogImageRequestId(value) { dialogImageRequestId = value; },
  get dialogSwipeStart() { return dialogSwipeStart; }, set dialogSwipeStart(value) { dialogSwipeStart = value; },
  get desktopImagePan() { return desktopImagePan; }, set desktopImagePan(value) { desktopImagePan = value; },
  get dialogBackSwipeStart() { return dialogBackSwipeStart; }, set dialogBackSwipeStart(value) { dialogBackSwipeStart = value; },
  get secretImageGesture() { return secretImageGesture; }, set secretImageGesture(value) { secretImageGesture = value; },
  get secretImageZoom() { return secretImageZoom; }, set secretImageZoom(value) { secretImageZoom = value; },
  get diaryImageRotation() { return diaryImageRotation; }, set diaryImageRotation(value) { diaryImageRotation = value; },
  get secretViewerReturnFocus() { return secretViewerReturnFocus; }, set secretViewerReturnFocus(value) { secretViewerReturnFocus = value; },
  get secretViewerInfoOpen() { return secretViewerInfoOpen; }, set secretViewerInfoOpen(value) { secretViewerInfoOpen = value; },
  get secretViewerResizeTimer() { return secretViewerResizeTimer; }, set secretViewerResizeTimer(value) { secretViewerResizeTimer = value; },
  get suppressDialogImageClickUntil() { return suppressDialogImageClickUntil; }, set suppressDialogImageClickUntil(value) { suppressDialogImageClickUntil = value; },
  get suppressDialogSwipeUntil() { return suppressDialogSwipeUntil; }, set suppressDialogSwipeUntil(value) { suppressDialogSwipeUntil = value; },
  get dialogWheelAccumulator() { return dialogWheelAccumulator; }, set dialogWheelAccumulator(value) { dialogWheelAccumulator = value; },
  get dialogWheelResetTimer() { return dialogWheelResetTimer; }, set dialogWheelResetTimer(value) { dialogWheelResetTimer = value; },
  get dialogWheelLockedUntil() { return dialogWheelLockedUntil; }, set dialogWheelLockedUntil(value) { dialogWheelLockedUntil = value; },
  get lockedDialogScrollY() { return lockedDialogScrollY; }, set lockedDialogScrollY(value) { lockedDialogScrollY = value; },
  get dialogLockUsesFixed() { return dialogLockUsesFixed; }, set dialogLockUsesFixed(value) { dialogLockUsesFixed = value; },
  get dialogRandomMode() { return dialogRandomMode; }, set dialogRandomMode(value) { dialogRandomMode = value; },
  get dialogSecretSourceItem() { return dialogSecretSourceItem; }, set dialogSecretSourceItem(value) { dialogSecretSourceItem = value; },
  get activeSecretDialogItem() { return activeSecretDialogItem; }, set activeSecretDialogItem(value) { activeSecretDialogItem = value; },
  get secretCloudAvailable() { return secretCloudAvailable; }, set secretCloudAvailable(value) { secretCloudAvailable = value; },
  get familyMemberMap() { return familyMemberMap; }, set familyMemberMap(value) { familyMemberMap = value; },
  get mobileDiaryPhoto() { return mobileDiaryPhoto; }, set mobileDiaryPhoto(value) { mobileDiaryPhoto = value; },
  get mobileDiaryPage() { return mobileDiaryPage; }, set mobileDiaryPage(value) { mobileDiaryPage = value; },
  get mobileDiaryRestoreScrollY() { return mobileDiaryRestoreScrollY; }, set mobileDiaryRestoreScrollY(value) { mobileDiaryRestoreScrollY = value; },
  get mobileDiaryImageIndex() { return mobileDiaryImageIndex; }, set mobileDiaryImageIndex(value) { mobileDiaryImageIndex = value; },
  get mobileDiaryReplyToId() { return mobileDiaryReplyToId; }, set mobileDiaryReplyToId(value) { mobileDiaryReplyToId = value; },
  get mobileDiaryBackSwipeStart() { return mobileDiaryBackSwipeStart; }, set mobileDiaryBackSwipeStart(value) { mobileDiaryBackSwipeStart = value; },
  get mobileDiaryImageSwipeStart() { return mobileDiaryImageSwipeStart; }, set mobileDiaryImageSwipeStart(value) { mobileDiaryImageSwipeStart = value; },
  get mobileDiarySuppressImageClickUntil() { return mobileDiarySuppressImageClickUntil; }, set mobileDiarySuppressImageClickUntil(value) { mobileDiarySuppressImageClickUntil = value; },
  get photoComments() { return photoComments; }, set photoComments(value) { photoComments = value; },
  get editingPhoto() { return editingPhoto; }, set editingPhoto(value) { editingPhoto = value; },
  get editingImages() { return editingImages; }, set editingImages(value) { editingImages = value; },
  get editingImageFiles() { return editingImageFiles; }, set editingImageFiles(value) { editingImageFiles = value; },
  get editingRemovedPaths() { return editingRemovedPaths; }, set editingRemovedPaths(value) { editingRemovedPaths = value; },
  get editingReplaceIndex() { return editingReplaceIndex; }, set editingReplaceIndex(value) { editingReplaceIndex = value; },
  get editingPreviewUrls() { return editingPreviewUrls; }, set editingPreviewUrls(value) { editingPreviewUrls = value; },
  get globalMobileBackSwipeStart() { return globalMobileBackSwipeStart; }, set globalMobileBackSwipeStart(value) { globalMobileBackSwipeStart = value; },
  get photoDialogBackdrop() { return photoDialogBackdrop; }, set photoDialogBackdrop(value) { photoDialogBackdrop = value; },
  get mobileDiaryImageViewerOpen() { return mobileDiaryImageViewerOpen; }, set mobileDiaryImageViewerOpen(value) { mobileDiaryImageViewerOpen = value; },
};
const photoViewerController = createPhotoViewerController({
  elements: els,
  state: secretState,
  isMobileViewport,
  closePhotoDialog: (...args) => closePhotoDialog(...args),
  getSecretAlbumFilterTags: (...args) => getSecretAlbumFilterTags(...args),
  deleteSecretDialogImage: (...args) => deleteSecretDialogImage(...args),
  updateSecretDialogImage: (...args) => updateSecretDialogImage(...args),
});
const {
  adjustDiaryViewerZoom,
  applySecretImageZoom,
  beginDialogBackSwipe,
  beginDialogSwipe,
  beginSecretImageTouch,
  bindSecretDialogControls,
  cancelDialogBackSwipe,
  cancelDialogSwipe,
  downloadCurrentDiaryImage,
  endSecretImageTouch,
  finishDialogBackSwipe,
  finishDialogSwipe,
  fitSecretViewerImage,
  handleSecretViewerWheel,
  isFittableImageDialogOpen,
  isSecretImageDialogOpen,
  isSecretImageViewerOpen,
  isZoomableImageDialogOpen,
  moveDialogImage,
  moveDialogSwipe,
  moveSecretImageTouch,
  normalizeSecretImageZoom,
  preloadDialogNeighbors,
  refreshDiaryViewerToolbar,
  refreshSecretViewerToolbar,
  renderDialogMedia,
  renderSecretDialogControls,
  resetSecretImageZoom,
  setSecretViewerStatus,
  zoomImageViewerAt,
} = photoViewerController;
const photoDetailController = createPhotoDetailController({
  elements: els,
  state: secretState,
  repository: diaryRepository,
  assets: assetController,
  acknowledgeViewedDiary,
  adminUpdatePhotoCategory,
  awardExperience,
  deletePhotoComment: (...args) => deletePhotoComment(...args),
  getAuthorName,
  getCurrentImageLimit,
  getDisplayTitle,
  getPhotoImages,
  getPlainNote,
  isAdminAccount,
  isFavoritePhoto,
  isMissingCloudSchema,
  isMobileViewport,
  loadPhotoCommentPreviews,
  loadPhotoComments: (...args) => loadPhotoComments(...args),
  loadPhotos,
  renderAvatarMarkup,
  renderDialogMedia,
  resetSecretImageZoom,
  setGlobalStatus,
  switchPage,
  toDateInputValue,
  togglePhotoFavorite,
  togglePhotoFlag,
  deletePhoto: (...args) => deletePhoto(...args),
});
const {
  lockDialogBackgroundScroll,
  unlockDialogBackgroundScroll,
  ensurePhotoDialogBackdrop,
  closePhotoDialog,
  openMobileDiaryImageViewer,
  closeMobileDiaryImageViewer,
  showPhotoDialogPreservingScroll,
  captureDialogReturnTarget,
  restoreDialogReturnTarget,
  ensureMobileDiaryPage,
  renderMobileDiaryComments,
  renderMobileDiaryPage,
  moveMobileDiaryImage,
  openMobileDiaryPage,
  closeMobileDiaryPage,
  startMobileDiaryReply,
  cancelMobileDiaryReply,
  saveMobileDiaryComment,
  beginMobileDiaryBackSwipe,
  moveMobileDiaryBackSwipe,
  endMobileDiaryBackSwipe,
  cancelMobileDiaryBackSwipe,
  beginMobileDiaryImageSwipe,
  moveMobileDiaryImageSwipe,
  cancelMobileDiaryImageSwipe,
  endMobileDiaryImageSwipe,
  canStartGlobalMobileBackSwipe,
  performGlobalMobileBack,
  beginGlobalMobileBackSwipe,
  moveGlobalMobileBackSwipe,
  finishGlobalMobileBackSwipe,
  cancelGlobalMobileBackSwipe,
  openPhoto,
  openWishImage,
  openEditPhoto,
  savePhotoEdit,
  renderEditImages,
  getEditPreviewUrl,
  replaceEditingImage,
  appendEditingImageFiles,
  startAppendEditingImages,
  handleEditImagePaste,
  removeEditingImage,
  resetEditImageState,
  deletePhotoFromEditor,
  openWeekendImageGallery,
} = photoDetailController;
const trashState = {
  get cloudDb() { return cloudDb; },
  get session() { return session; },
  get photos() { return photos; }, set photos(value) { photos = value; },
};
const trashController = createTrashController({
  state: trashState,
  householdRepository,
  diaryRepository,
  photoFavorites,
  getPhotoImages,
  normalizeSecretImages,
  cleanupStoredImagePaths,
  showMiniToast,
  setGlobalStatus,
  getPhotoLabel,
  renderGallery,
  loadPhotos,
  loadSecretItems: (...args) => loadSecretItems(...args),
  loadGratitudeNotes,
  synchronizeWeekendPlans,
  synchronizeAnniversaries: (...args) => synchronizeAnniversaries(...args),
  synchronizeAccountData,
  renderTrashItems: (...args) => renderTrashItems(...args),
});
const {
  createTrashItem,
  snapshotPhotoCommentsForTrash,
  rollbackTrashItem,
  confirmWishDeletion,
  getTrashImagePaths,
  loadTrashItems,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
  getTrashOwnershipLabel,
  deletePhoto,
} = trashController;
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
  deleteSecretDialogImage,
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
  toggleDiaryImageFullscreen,
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
  renderUploadCenter: (...args) => renderUploadCenter(...args),
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
const authController = createAuthController({
  elements: els,
  endpoint: R2_UPLOAD_ENDPOINT,
  getDatabase: () => cloudDb,
  getSession: () => session,
  usernameToEmail,
  getRedirectUrl: () => resolveRedirectUrl(PRODUCTION_URL),
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
const familySettingsState = {
  get familyInfo() { return familyInfo; },
  get familyMembers() { return familyMembers; },
  get familyInvitations() { return familyInvitations; },
  get session() { return session; },
  get activeSettingsSection() { return activeSettingsSection; }, set activeSettingsSection(value) { activeSettingsSection = value; },
  get returnToSettingsAfterDialog() { return returnToSettingsAfterDialog; }, set returnToSettingsAfterDialog(value) { returnToSettingsAfterDialog = value; },
  get cloudDb() { return cloudDb; },
  get recipes() { return recipes; }, set recipes(value) { recipes = value; },
  get wishes() { return wishes; }, set wishes(value) { wishes = value; },
};
const familySettingsController = createFamilySettingsController({
  elements: els,
  state: familySettingsState,
  r2UploadEndpoint: R2_UPLOAD_ENDPOINT,
  householdRepository,
  renderAvatarMarkup,
  renderSettingsToolOrderPanel,
  refreshPushSettings: (...args) => refreshPushSettings(...args),
  renderCloudBackups: (...args) => renderCloudBackups(...args),
  renderTrashItems: (...args) => renderTrashItems(...args),
  runOfflineDiagnostics: (...args) => runOfflineDiagnostics(...args),
  renderUploadCenter: (...args) => renderUploadCenter(...args),
  renderSettingsSummary,
  refreshCacheInfo,
  loadFamilyLevelProfiles,
  loadPhotos,
  synchronizeWeekendPlans,
  synchronizeAnniversaries: (...args) => synchronizeAnniversaries(...args),
  loadGratitudeNotes,
  loadSecretItems,
  renderRecipes: (...args) => renderRecipes(...args),
  renderWishes: (...args) => renderWishes(...args),
  renderWeekendPlans: (...args) => renderWeekendPlans(...args),
  renderAnniversaries: (...args) => renderAnniversaries(...args),
  isMissingCloudSchema,
  loadFamilyContext,
});
const {
  renderFamilyDialog,
  renderSettingsFamilyPanel,
  readSignupInviteCode,
  bindSettingsFamilyActions,
  setActiveSettingsSection,
  openSettingsDialog,
  openSettingsChildDialog,
  reopenSettingsAfterChildDialog,
  closeSettingsDialog,
  refreshSharedContent,
  createFamily,
  addFamilyMember,
  respondFamilyInvitation,
  removeFamilyMember,
} = familySettingsController;
const offlineSettingsController = createOfflineSettingsController({
  elements: els,
  constants: {
    defaultDiaryCacheMb: DEFAULT_DIARY_CACHE_MB,
    defaultSecretCacheMb: DEFAULT_SECRET_CACHE_MB,
    minCacheMb: MIN_CACHE_MB,
    maxCacheMb: MAX_CACHE_MB,
    secretMediaCacheName: SECRET_MEDIA_CACHE_NAME,
    diaryMediaCacheName: DIARY_MEDIA_CACHE_NAME,
    secretItemsCacheKey: SECRET_ITEMS_CACHE_KEY,
    photoFeedCacheKey: PHOTO_FEED_CACHE_KEY,
  },
  mediaCacheService,
  getUserId: () => session?.user?.id,
  loadCacheCapacityMb,
  saveCacheCapacityMb,
  scheduleOfflineMediaCache,
  refreshCacheInfo,
  renderSettingsSummary,
  configureCacheManagementUi,
  setActiveSettingsSection,
  loadMediaCachePolicy,
  saveMediaCachePolicy,
  showMiniToast,
  dismissMiniToast,
  collectSecretOfflineMediaUrls,
  collectDiaryOfflineMediaUrls,
  cacheOfflineMedia,
  formatFileSize,
  openSettingsChildDialog,
});
const {
  changeCacheLimit,
  saveCacheLimitFromDialog,
  applyCacheLimitPreset,
  ensureCacheManagementUi,
  downloadOfflinePool,
  clearCachePool,
} = offlineSettingsController;
const dataSafetyState = {
  get session() { return session; },
  get cloudDb() { return cloudDb; },
  get photos() { return photos; },
  get secretItems() { return secretItems; },
  get activeUploadTasks() { return activeUploadTasks; },
  get photosLoadPromise() { return photosLoadPromise; },
  get notificationsLoadPromise() { return notificationsLoadPromise; },
  get secretLoadPromise() { return secretLoadPromise; },
};
const dataSafetyController = createDataSafetyController({
  elements: els,
  state: dataSafetyState,
  r2UploadEndpoint: R2_UPLOAD_ENDPOINT,
  cloudflareRequest,
  getLocalDateKey,
  showMiniToast,
  dismissMiniToast,
  loadTrashItems,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
  getTrashOwnershipLabel,
  compressImage,
  uploadToR2,
  getPhotoImages,
  getPlainNote,
  diaryRepository,
  normalizeSecretImages,
  secretRepository,
  loadPhotos,
  loadSecretItems,
  setActiveSettingsSection,
  mediaCacheService,
  getAppCacheStats,
  collectDiaryOfflineMediaUrls,
  collectSecretOfflineMediaUrls,
  getQueuedDiaryUploads,
  isDiaryUploadQueueProcessing,
  removeQueuedDiaryUpload,
  processDiaryUploadQueue,
});
const {
  downloadFamilyBackup,
  renderTrashItems,
  downloadCloudBackup,
  renderCloudBackups,
  createCloudBackupNow,
  backfillLegacyThumbnails,
  ensureDataSafetyUi,
  createSettingsSection,
  runOfflineDiagnostics,
  renderUploadCenter,
  ensureStabilitySettingsUi,
} = dataSafetyController;

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

const shoppingController = createShoppingController({
  elements: els,
  repository: householdRepository,
  getSession: () => session,
  getDatabase: () => cloudDb,
  getItems: () => shoppingItems,
  setItems: (items) => {
    shoppingItems = items;
  },
  getActiveFilter: () => activeShoppingFilter,
  setActiveFilter: (filter) => {
    activeShoppingFilter = ["open", "done"].includes(filter) ? filter : "open";
  },
  getDataState: () => accountDataState,
  canSync: () => cloudSyncAvailable,
  canManageItem,
  normalizeUuid,
  compressImage,
  uploadToR2,
  cleanupStoredImagePaths,
  slugify,
  formatFileSize,
  escapeHtml,
  confirmAction,
  showToast: showMiniToast,
});
const { render: renderShopping } = shoppingController;

const wishlistHubController = createWishlistHubController({
  elements: els,
  renderWishes,
  renderShopping,
});
wishlistController.bind();
shoppingController.bind();
wishlistHubController.bind();

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

const appNavigationState = {
  get activePage() { return activePage; }, set activePage(value) { activePage = value; },
  get activeFilter() { return activeFilter; },
  get activeSecretAlbumId() { return activeSecretAlbumId; }, set activeSecretAlbumId(value) { activeSecretAlbumId = value; },
  get activeSecretFolderId() { return activeSecretFolderId; }, set activeSecretFolderId(value) { activeSecretFolderId = value; },
  get secretSelectionMode() { return secretSelectionMode; }, set secretSelectionMode(value) { secretSelectionMode = value; },
  get selectedSecretImageIndexes() { return selectedSecretImageIndexes; },
  get session() { return session; },
  get cloudDb() { return cloudDb; },
  get pendingNewPhotos() { return pendingNewPhotos; },
  get secretItems() { return secretItems; },
  get lastSecretSyncAt() { return lastSecretSyncAt; },
  get filteredPhotoCount() { return filteredPhotoCount; },
  get photos() { return photos; },
  get wishes() { return wishes; },
  get recipes() { return recipes; },
  get activeDialogPhoto() { return activeDialogPhoto; },
};
appNavigationController = createAppNavigationController({
  elements: els,
  state: appNavigationState,
  vlogMode,
  controllers: {
    wardrobe: wardrobeController,
    wishlistHub: wishlistHubController,
  },
  actions: {
    applyMobileSecretLayout,
    closeMobileDiaryPage,
    getExperienceLevel,
    getPhotoImages,
    getSecretDefaultFolderId,
    isAdminAccount,
    isSecretUnlocked,
    loadExperience,
    loadSecretItems,
    markSecretLeft,
    openPhoto,
    openSecretPinDialog,
    renderCachedSecretItems,
    renderFeedRefreshNotice,
    renderGallery,
    renderGratitudeNotes,
    renderRecipes,
    renderSecretGallery,
    renderWeekendPlans,
    renderWeekendReminderNotice,
    setGlobalStatus,
    setUploadExpanded,
    updateFeedLoader,
  },
});

const appSessionState = {
  get cloudDb() { return cloudDb; }, set cloudDb(value) { cloudDb = value; },
  get session() { return session; }, set session(value) { session = value; },
  get syncedUserId() { return syncedUserId; }, set syncedUserId(value) { syncedUserId = value; },
  get accountProfile() { return accountProfile; }, set accountProfile(value) { accountProfile = value; },
  get activeVipLevel() { return activeVipLevel; }, set activeVipLevel(value) { activeVipLevel = value; },
  get recipes() { return recipes; }, set recipes(value) { recipes = value; },
  get wishes() { return wishes; }, set wishes(value) { wishes = value; },
  get shoppingItems() { return shoppingItems; }, set shoppingItems(value) { shoppingItems = value; },
  get weekendPlans() { return weekendPlans; }, set weekendPlans(value) { weekendPlans = value; },
  get anniversaries() { return anniversaries; }, set anniversaries(value) { anniversaries = value; },
  get accountDataState() { return accountDataState; }, set accountDataState(value) { accountDataState = value; },
  get activePage() { return activePage; },
  get cloudSyncAvailable() { return cloudSyncAvailable; }, set cloudSyncAvailable(value) { cloudSyncAvailable = value; },
  get weekendCloudAvailable() { return weekendCloudAvailable; }, set weekendCloudAvailable(value) { weekendCloudAvailable = value; },
  get anniversaryCloudAvailable() { return anniversaryCloudAvailable; }, set anniversaryCloudAvailable(value) { anniversaryCloudAvailable = value; },
  get photoFlagsCloudAvailable() { return photoFlagsCloudAvailable; }, set photoFlagsCloudAvailable(value) { photoFlagsCloudAvailable = value; },
  get secretCloudAvailable() { return secretCloudAvailable; }, set secretCloudAvailable(value) { secretCloudAvailable = value; },
  get foodOptionsCloudAvailable() { return foodOptionsCloudAvailable; }, set foodOptionsCloudAvailable(value) { foodOptionsCloudAvailable = value; },
  get profilePreferencesCloudAvailable() { return profilePreferencesCloudAvailable; }, set profilePreferencesCloudAvailable(value) { profilePreferencesCloudAvailable = value; },
  get thanksColorCloudAvailable() { return thanksColorCloudAvailable; }, set thanksColorCloudAvailable(value) { thanksColorCloudAvailable = value; },
  get gratitudeNotes() { return gratitudeNotes; }, set gratitudeNotes(value) { gratitudeNotes = value; },
  get secretItems() { return secretItems; }, set secretItems(value) { secretItems = value; },
  get secretDefaultFolderId() { return secretDefaultFolderId; }, set secretDefaultFolderId(value) { secretDefaultFolderId = value; },
  get secretAlbumContextMenu() { return secretAlbumContextMenu; }, set secretAlbumContextMenu(value) { secretAlbumContextMenu = value; },
  get notifications() { return notifications; }, set notifications(value) { notifications = value; },
  get commentReplyToId() { return commentReplyToId; }, set commentReplyToId(value) { commentReplyToId = value; },
  get familyInfo() { return familyInfo; }, set familyInfo(value) { familyInfo = value; },
  get familyMembers() { return familyMembers; }, set familyMembers(value) { familyMembers = value; },
  get familyInvitations() { return familyInvitations; }, set familyInvitations(value) { familyInvitations = value; },
  get familyMemberMap() { return familyMemberMap; }, set familyMemberMap(value) { familyMemberMap = value; },
  get photoComments() { return photoComments; }, set photoComments(value) { photoComments = value; },
  get activeDialogPhoto() { return activeDialogPhoto; }, set activeDialogPhoto(value) { activeDialogPhoto = value; },
  get cloudSyncInFlight() { return cloudSyncInFlight; }, set cloudSyncInFlight(value) { cloudSyncInFlight = value; },
};
appSessionController = createAppSessionController({
  elements: els,
  state: appSessionState,
  defaults: {
    homeName: "咻蛋之家",
    accountProfile: DEFAULT_ACCOUNT_PROFILE,
  },
  vlogMode,
  photoFavorites,
  controllers: {
    wardrobe: wardrobeController,
    secretPin: secretPinController,
    lifecycle: appLifecycleController,
  },
  backend: {
    createClient: createCloudflareClient,
    request: cloudflareRequest,
  },
  actions: {
    applyFamilyTagline,
    applyHomeName,
    applyMobileFeedLayout,
    applyMobileSecretLayout,
    applyTheme,
    applyToolDockOrder,
    closeSecretAlbumContextMenu,
    closeSecretFolderContextMenu,
    ensurePushSettingsPage,
    getSessionDisplayName,
    loadAnniversaries,
    loadCachedAvatarUrl,
    loadFamilyTagline,
    loadHomeName,
    loadMobileFeedLayout,
    loadMobileSecretLayout,
    loadNotifications,
    loadPhotos,
    loadRechargeTotal,
    loadRecipes,
    loadThanksColor,
    loadTheme,
    loadWeekendPlans,
    openPushDestination,
    processDiaryUploadQueue,
    refreshStorage,
    renderAccountAvatar,
    renderAnniversaries,
    renderCachedPhotoFeed,
    renderExperience,
    renderFoodWheel,
    renderGratitudeNotes,
    renderNotifications,
    renderOverview,
    renderRecipes,
    renderSettingsSummary,
    renderShopping,
    renderTopLevelBadge,
    renderVipCenter,
    renderWeekendPlans,
    renderWishes,
    setGlobalStatus,
    setHint,
    setSelectedThanksColor,
    switchPage,
    syncExistingPushSubscription,
    syncMobileComposerPlacement,
    synchronizeAccountData,
  },
});

bindAppEvents({
  elements: els,
  state: secretState,
  pageSize: PAGE_SIZE,
  controllers: {
    toolDock: toolDockController,
    familyActivity: familyActivityController,
    profilePreferences: profilePreferencesController,
    secretPin: secretPinController,
    photoViewer: photoViewerController,
    photoDetail: photoDetailController,
    secret: secretController,
    diaryFeed: diaryFeedController,
    diaryComposer: diaryComposerController,
    foodWheel: foodWheelController,
    anniversary: anniversaryController,
    recipe: recipeController,
    wishlist: wishlistController,
    wishlistHub: wishlistHubController,
    weekend: weekendController,
    gratitude: gratitudeController,
    familySettings: familySettingsController,
    social: socialController,
    auth: authController,
    offlineCache: offlineCacheController,
    offlineSettings: offlineSettingsController,
    layoutSettings: layoutSettingsController,
    gamification: gamificationController,
    push: pushController,
  },
  vlogMode,
  core: {
    saveConfig,
    switchPage,
    openRandomMemory,
    updateNetworkStatus,
    showMiniToast,
    loadHomeName,
    getSessionDisplayName,
    updateDiaryBackTopButton,
    isMobileViewport,
  },
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
restoreCloudflareSessionBackup().finally(() => appSessionController.initialize());


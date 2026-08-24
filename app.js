const CONFIG_KEY = "life-vlog-cloudflare-config";
import { confirmAction } from "./modules/confirm-dialog.js";
import { createOfflineCacheController } from "./modules/offline-cache-controller.js";
import { createOfflineSettingsController } from "./modules/offline-settings-controller.js";
import { createDataSafetyController } from "./modules/data-safety-controller.js";
import { createAccountSyncController } from "./modules/account-sync-controller.js";
import { createTrashController } from "./modules/trash-controller.js";
import { createDiaryFeedController } from "./modules/diary-feed-controller.js?v=20260824-028";
import { createSocialController } from "./modules/social-controller.js";
import { createFamilySettingsController } from "./modules/family-settings-controller.js";
import { createFamilyActivityController } from "./modules/family-activity-controller.js";
import { createToolDockController } from "./modules/tool-dock-controller.js";
import { createLayoutSettingsController } from "./modules/layout-settings-controller.js";
import { bindAppEvents } from "./modules/app-event-bindings.js";
import { createAssetController } from "./modules/asset-controller.js";
import { createDiaryComposerController } from "./modules/diary-composer-controller.js";
import { createGamificationController } from "./modules/gamification-controller.js";
import { createProfilePreferencesController } from "./modules/profile-preferences-controller.js";
import { createSecretPinController } from "./modules/secret-pin-controller.js";
import { createSecretController } from "./modules/secret-controller.js";
import { createPhotoViewerController } from "./modules/photo-viewer-controller.js?v=20260824-029";
import { createPhotoDetailController } from "./modules/photo-detail-controller.js?v=20260824-029";
import { createCloudflareBackend } from "./modules/cloudflare-client.js?v=20260811-010";
import { createMediaCacheService } from "./modules/media-cache.js";
import { createUploadQueue } from "./modules/upload-queue.js";
import { createPhotoFavoritesStore } from "./modules/photo-favorites.js";
import { createWishlistController } from "./modules/wishlist-controller.js";
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
import {
  getVipLevel,
  getVipLevelByRecharge,
} from "./modules/vip-center.js";
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
import {
  escapeHtml,
  formatDate,
  formatFileSize,
  getInitial,
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
  getStoredPhotoMediaPaths,
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

function canManageItem(item) {
  if (!session) return false;
  const ownerId = item?.userId || item?.user_id || "";
  if (!ownerId) return true;
  return ownerId === session.user.id || familyMemberMap.has(ownerId);
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
restoreCloudflareSessionBackup().finally(() => initializeCloudflare());


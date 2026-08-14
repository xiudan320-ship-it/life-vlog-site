const CONFIG_KEY = "life-vlog-cloudflare-config";
import { confirmAction } from "./modules/confirm-dialog.js";
import {
  getCacheCapacityStorageKey as buildCacheCapacityStorageKey,
  isClearlyUnmeteredConnection as detectUnmeteredConnection,
  normalizeCacheMb as clampCacheMb,
} from "./modules/cache-policy.js";
import { createCloudflareBackend } from "./modules/cloudflare-client.js?v=20260811-010";
import {
  createMediaCacheService,
  normalizeMediaUrl,
} from "./modules/media-cache.js";
import { createUploadQueue } from "./modules/upload-queue.js";
import {
  CULTIVATION_DESCRIPTIONS,
  CULTIVATION_REALMS,
  DAILY_LOGIN_EXP,
  EXPERIENCE_REWARDS,
  getDailyLoginReward as calculateDailyLoginReward,
  getExperienceLevel as calculateExperienceLevel,
  getLoginStreakBonusBase as calculateLoginStreakBonusBase,
  getUpgradeEta as calculateUpgradeEta,
  getVipAdjustedExperience as calculateVipAdjustedExperience,
  getVipExpMultiplier as calculateVipExpMultiplier,
} from "./modules/gamification-domain.js?v=20260810-003";
import {
  createDiaryRepository,
  createNotificationRepository,
  createSecretRepository,
  createWardrobeRepository,
} from "./modules/data-repositories.js?v=20260810-003";
import { createWardrobeController } from "./modules/wardrobe.js?v=20260811-005";
import {
  composeDiaryStoredNote,
  composeWeekendStoredNote,
  composeWishStoredNote,
  extractImageUrls,
  getClipboardImageUrl,
  parseDiaryStoredImages,
  parseWeekendStoredNote,
  parseWishStoredNote,
  stripDiaryMediaMetadata,
} from "./modules/media-metadata.js";
import {
  anniversaryFromCloudRow,
  anniversaryToCloudRow,
  recipeFromCloudRow,
  recipeToCloudRow,
  secretFolderFromCloudRow,
  secretFromCloudRow,
  secretToCloudRow,
  weekendFromCloudRow,
  weekendToCloudRow,
  wishFromCloudRow,
  wishToCloudRow,
  wishToLegacyCloudRow,
} from "./modules/cloud-models.js";
import { buildCultivationArchive } from "./modules/gamification-archive.js";
import { createImageService } from "./modules/image-service.js";
import { createPreferenceStore } from "./modules/preferences-store.js";
import { createHouseholdRepository } from "./modules/household-repository.js";
import {
  createAppLifecycleController,
  createFrameScheduler,
} from "./modules/app-lifecycle.js";
import {
  escapeHtml,
  formatCommentTime,
  formatDate,
  formatDateTime,
  getInitial,
  slugify,
} from "./modules/ui-formatters.js";
import {
  getStorageUsageBytes,
  sanitizeCommentRecord,
  sanitizeDiaryRecord,
  sanitizeSecretRecord,
} from "./modules/offline-records.js";
import {
  filterDiaryEntries,
  isDiaryWithinDays,
  normalizeDiarySearchText,
  sortDiaryEntries,
} from "./modules/diary-domain.js";
import {
  aggregateInteractionNotifications,
  buildNotificationText,
} from "./modules/notification-domain.js";
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
const WISHLIST_KEY = "life-vlog-wishlist";
const WEEKEND_KEY = "life-vlog-weekend-plans";
const ANNIVERSARY_KEY = "life-vlog-anniversaries";
const FOOD_OPTIONS_KEY = "life-vlog-food-options";
const PHOTO_FAVORITES_KEY = "life-vlog-photo-favorites";
const TODAY_POSTS_SEEN_KEY = "life-vlog-today-posts-seen";
const PHOTO_FEED_CACHE_KEY = "life-vlog-photo-feed-cache";
const SECRET_ITEMS_CACHE_KEY = "life-vlog-secret-items-cache";
const SECRET_PIN_KEY = "life-vlog-secret-pin";
const SECRET_UNLOCK_KEY = "life-vlog-secret-unlock";
const SECRET_DEFAULT_FOLDER_KEY = "life-vlog-secret-default-folder";
const SECRET_UNLOCK_MAX_MS = 15 * 60 * 1000;
const LEGACY_MEDIA_CACHE_NAME = "life-vlog-media-cache";
const DIARY_MEDIA_CACHE_NAME = "life-vlog-diary-media-cache";
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
const CLOUDFLARE_SESSION_KEY = "life-vlog-cloudflare-session";
const PAGE_SIZE = 6;
const VIP_USERS = new Set(["xiao980320", "xiudan320"]);
const PHOTO_COMMENT_PREVIEW_LIMIT = 3;
const METADATA_CACHE_ITEM_LIMIT = 120;
const AUTO_DIARY_CACHE_ITEM_LIMIT = 20;
const DEFAULT_DIARY_CACHE_MB = 100;
const DEFAULT_SECRET_CACHE_MB = 300;
const MIN_CACHE_MB = 20;
const MAX_CACHE_MB = 2000;
const EAGER_IMAGE_CARD_COUNT = 4;
const SECRET_ALBUM_IMAGE_LIMIT = 80;
const DEFAULT_SECRET_SORT_STEP = 1000;
const TOOL_DOCK_ORDER_KEY = "life-vlog-tool-dock-order";
const TOOL_DOCK_DEFAULT_ORDER = ["food", "anniversary", "memory", "weekly", "timeline", "secret", "thanks"];
const TOOL_DOCK_LABELS = {
  food: { title: "今日吃什么", subtitle: "转盘" },
  anniversary: { title: "时间纪念册", subtitle: "纪念日" },
  memory: { title: "随机回忆", subtitle: "抽一篇日记" },
  weekly: { title: "本周回顾", subtitle: "共同生活周报" },
  timeline: { title: "家庭足迹", subtitle: "动态与回顾" },
  secret: { title: "秘藏", subtitle: "相册展览" },
  thanks: { title: "留言", subtitle: "留下生活里的话" },
};
const MOBILE_DIALOG_BREAKPOINT = 920;
const DEFAULT_FOOD_OPTIONS = ["拉面", "寿喜烧", "咖喱饭", "烤肉", "火锅", "寿司", "麻婆豆腐", "披萨"];
const GENERATED_TITLE_PREFIXES = ["今日小星星", "软乎乎的一天", "闪闪生活碎片", "快乐收藏夹"];

const VIP_LEVELS = [
  {
    level: 1,
    name: "小窝",
    label: "小窝会员",
    price: 9,
    limit: 3,
    perks: ["修炼经验 +5%", "专属 VIP 标识", "一篇笔记最多 3 张图"],
  },
  {
    level: 2,
    name: "同行",
    label: "同行会员",
    price: 29,
    limit: 6,
    perks: ["修炼经验 +10%", "合集九宫格封面", "一篇笔记最多 6 张图"],
  },
  {
    level: 3,
    name: "珍藏",
    label: "珍藏会员",
    price: 68,
    limit: 9,
    perks: ["修炼经验 +20%", "高质压缩上传", "9 图完整宫格"],
  },
  {
    level: 4,
    name: "星河",
    label: "星河会员",
    price: 128,
    limit: 12,
    perks: ["修炼经验 +35%", "私密内容共享", "一篇笔记最多 12 张图"],
  },
  {
    level: 5,
    name: "传说",
    label: "传说会员",
    price: 298,
    limit: 18,
    perks: ["修炼经验 +50%", "黑金导演模式", "一篇笔记最多 18 张图"],
  },
];

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
let favoritePhotoIds = new Set();
let favoritesCloudAvailable = false;
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
let achievementFilter = "全部";
let gratitudeEditingId = null;
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
let avatarPreviewUrl = "";
let photosLoadPromise = null;
let notificationsLoadPromise = null;
let secretLoadPromise = null;
let lastSecretSyncAt = 0;
let pushSubscriptionSyncPromise = null;
const PUSH_SUBSCRIPTION_SYNC_KEY = "life-vlog-push-subscription-sync";
const PUSH_SUBSCRIPTION_SYNC_INTERVAL = 6 * 60 * 60 * 1000;
let galleryRenderSignature = "";
let activeLevelSection = "ranking";
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
let activeSecretFilter = "全部";
let activeSecretAlbumId = "";
let activeSecretFolderId = "unfiled";
let secretFolderContextMenu = null;
let secretSearchQuery = "";
let secretPinEntry = "";
let secretPinSetupValue = "";
let secretPinMode = "unlock";
let secretPinManageMode = false;
let secretUnlockedAt = 0;
let secretLeftAt = 0;
let secretSelectionMode = false;
let selectedSecretImageIndexes = new Set();
let secretAlbumEditing = false;
let secretAppendExpanded = false;
let secretMobileToolsExpanded = false;
let secretPhotoLongPressTimer = null;
let secretPhotoLongPressTriggered = false;
let diarySearchQuery = "";
let activeWishView = "open";
let previewUrls = [];
let selectedUploadFiles = [];
let uploadInFlight = false;
let uploadQueueProcessing = false;
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
let recipeEditingId = null;
let recipeExistingCover = "";
let recipeCoverLink = "";
let recipeCoverPreviewUrl = "";
let activeUploadPreviewIndex = 0;
let selectedUploadLinks = [];
let wishEditingId = null;
let wishExistingImage = "";
let wishExistingImagePath = "";
let wishImageLink = "";
let wishImagePreviewUrl = "";
let wishRemoveImageRequested = false;
let wishCompletingId = null;
let weekendEditingId = null;
let weekendSelectedFiles = [];
let weekendSelectedLinks = [];
let weekendExistingImages = [];
let weekendPreviewUrls = [];
let weekendCompletionPlanId = null;
let weekendCompletionFiles = [];
let weekendCompletionLinks = [];
let weekendCompletionExistingImages = [];
let weekendCompletionPreviewUrls = [];
let weekendCloudAvailable = false;
let anniversaryEditingId = null;
let anniversaryCloudAvailable = false;
let secretCloudAvailable = false;
let photoFlagsCloudAvailable = false;
let foodOptionsCloudAvailable = false;
let profilePreferencesCloudAvailable = false;
let thanksColorCloudAvailable = false;
let wishCompletionNoteCloudAvailable = true;
let foodWheelRotation = 0;
let foodWheelSpinning = false;
let cloudSyncAvailable = false;
let cloudSyncInFlight = null;
let syncedUserId = "";
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

const els = {
  brand: document.querySelector(".brand"),
  themeToggle: document.querySelector("#themeToggle"),
  galleryNav: document.querySelector("#galleryNav"),
  recipesNav: document.querySelector("#recipesNav"),
  wishlistNav: document.querySelector("#wishlistNav"),
  weekendNav: document.querySelector("#weekendNav"),
  wardrobeNav: document.querySelector("#wardrobeNav"),
  thanksNav: document.querySelector("#thanksNav"),
  secretNav: document.querySelector("#secretNav"),
  setupToggle: document.querySelector("#setupToggle"),
  setupPanel: document.querySelector("#setupPanel"),
  notificationButton: document.querySelector("#notificationButton"),
  notificationBadge: document.querySelector("#notificationBadge"),
  notificationDialog: document.querySelector("#notificationDialog"),
  closeNotificationDialog: document.querySelector("#closeNotificationDialog"),
  notificationList: document.querySelector("#notificationList"),
  notificationStatus: document.querySelector("#notificationStatus"),
  cloudflareEndpoint: document.querySelector("#cloudflareEndpoint"),
  saveConfig: document.querySelector("#saveConfig"),
  authCard: document.querySelector("#authCard"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  inviteCodeInput: document.querySelector("#inviteCodeInput"),
  loginButton: document.querySelector("#loginButton"),
  signupButton: document.querySelector("#signupButton"),
  logoutButton: document.querySelector("#logoutButton"),
  authHint: document.querySelector("#authHint"),
  userMenu: document.querySelector("#userMenu"),
  avatarButton: document.querySelector("#avatarButton"),
  avatarInitial: document.querySelector("#avatarInitial"),
  avatarImage: document.querySelector("#avatarImage"),
  userPopover: document.querySelector("#userPopover"),
  accountSettingsButton: document.querySelector("#accountSettingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  closeSettingsDialog: document.querySelector("#closeSettingsDialog"),
  settingsNavButtons: document.querySelectorAll("[data-settings-section]"),
  settingsGroups: document.querySelectorAll(".settings-group"),
  settingsToolOrderList: document.querySelector("#settingsToolOrderList"),
  settingsFamilyPanel: document.querySelector("#settingsFamilyPanel"),
  settingsHomeNameValue: document.querySelector("#settingsHomeNameValue"),
  settingsNicknameValue: document.querySelector("#settingsNicknameValue"),
  settingsAvatarValue: document.querySelector("#settingsAvatarValue"),
  settingsFeedLayoutButton: document.querySelector("#settingsFeedLayoutButton"),
  settingsFeedLayoutValue: document.querySelector("#settingsFeedLayoutValue"),
  refreshCacheInfoButton: document.querySelector("#refreshCacheInfoButton"),
  cacheLimitButton: document.querySelector("#cacheLimitButton"),
  cacheLimitDialog: document.querySelector("#cacheLimitDialog"),
  closeCacheLimitDialog: document.querySelector("#closeCacheLimitDialog"),
  cacheLimitForm: document.querySelector("#cacheLimitForm"),
  cacheLimitInput: document.querySelector("#cacheLimitInput"),
  cacheLimitStatus: document.querySelector("#cacheLimitStatus"),
  cancelCacheLimit: document.querySelector("#cancelCacheLimit"),
  clearAppCacheButton: document.querySelector("#clearAppCacheButton"),
  settingsCacheValue: document.querySelector("#settingsCacheValue"),
  settingsCacheLimitValue: document.querySelector("#settingsCacheLimitValue"),
  settingsCacheStatus: document.querySelector("#settingsCacheStatus"),
  profileName: document.querySelector("#profileName"),
  xpPanel: document.querySelector("#xpPanel"),
  brandName: document.querySelector("#brandName"),
  heroHomeName: document.querySelector("#heroHomeName"),
  heroSignature: document.querySelector(".hero-copy > p:last-child"),
  vipHomeName: document.querySelector("#vipHomeName"),
  renameHomeButton: document.querySelector("#renameHomeButton"),
  renameProfileButton: document.querySelector("#renameProfileButton"),
  changeAvatarButton: document.querySelector("#changeAvatarButton"),
  familyAccountButton: document.querySelector("#familyAccountButton"),
  renameHomeDialog: document.querySelector("#renameHomeDialog"),
  closeRenameHome: document.querySelector("#closeRenameHome"),
  renameHomeForm: document.querySelector("#renameHomeForm"),
  homeNameInput: document.querySelector("#homeNameInput"),
  homeNameStatus: document.querySelector("#homeNameStatus"),
  resetHomeName: document.querySelector("#resetHomeName"),
  renameProfileDialog: document.querySelector("#renameProfileDialog"),
  closeRenameProfile: document.querySelector("#closeRenameProfile"),
  renameProfileForm: document.querySelector("#renameProfileForm"),
  profileNicknameInput: document.querySelector("#profileNicknameInput"),
  profileNicknameStatus: document.querySelector("#profileNicknameStatus"),
  avatarDialog: document.querySelector("#avatarDialog"),
  closeAvatarDialog: document.querySelector("#closeAvatarDialog"),
  avatarForm: document.querySelector("#avatarForm"),
  avatarInput: document.querySelector("#avatarInput"),
  avatarPreview: document.querySelector("#avatarPreview"),
  avatarPreviewInitial: document.querySelector("#avatarPreviewInitial"),
  avatarStatus: document.querySelector("#avatarStatus"),
  changePasswordButton: document.querySelector("#changePasswordButton"),
  changePasswordDialog: document.querySelector("#changePasswordDialog"),
  closeChangePassword: document.querySelector("#closeChangePassword"),
  changePasswordForm: document.querySelector("#changePasswordForm"),
  newPasswordInput: document.querySelector("#newPasswordInput"),
  confirmPasswordInput: document.querySelector("#confirmPasswordInput"),
  changePasswordStatus: document.querySelector("#changePasswordStatus"),
  recoveryKeyButton: document.querySelector("#recoveryKeyButton"),
  recoveryKeyDialog: document.querySelector("#recoveryKeyDialog"),
  closeRecoveryKey: document.querySelector("#closeRecoveryKey"),
  recoveryKeyForm: document.querySelector("#recoveryKeyForm"),
  recoveryKeyInput: document.querySelector("#recoveryKeyInput"),
  confirmRecoveryKeyInput: document.querySelector("#confirmRecoveryKeyInput"),
  recoveryKeyStatus: document.querySelector("#recoveryKeyStatus"),
  changeSecretPinButton: document.querySelector("#changeSecretPinButton"),
  settingsEmailValue: document.querySelector("#settingsEmailValue"),
  bindEmailButton: document.querySelector("#bindEmailButton"),
  emailBindingDialog: document.querySelector("#emailBindingDialog"),
  closeEmailBinding: document.querySelector("#closeEmailBinding"),
  emailBindingRequestForm: document.querySelector("#emailBindingRequestForm"),
  emailBindingConfirmForm: document.querySelector("#emailBindingConfirmForm"),
  accountEmailInput: document.querySelector("#accountEmailInput"),
  accountEmailCodeInput: document.querySelector("#accountEmailCodeInput"),
  emailBindingStatus: document.querySelector("#emailBindingStatus"),
  emailBindingConfirmStatus: document.querySelector("#emailBindingConfirmStatus"),
  requestEmailBindingButton: document.querySelector("#requestEmailBindingButton"),
  forgotPasswordButton: document.querySelector("#forgotPasswordButton"),
  forgotPasswordDialog: document.querySelector("#forgotPasswordDialog"),
  closeForgotPassword: document.querySelector("#closeForgotPassword"),
  forgotPasswordForm: document.querySelector("#forgotPasswordForm"),
  emailResetRequestForm: document.querySelector("#emailResetRequestForm"),
  emailResetConfirmForm: document.querySelector("#emailResetConfirmForm"),
  resetEmailInput: document.querySelector("#resetEmailInput"),
  resetEmailCodeInput: document.querySelector("#resetEmailCodeInput"),
  emailResetNewPasswordInput: document.querySelector("#emailResetNewPasswordInput"),
  emailResetConfirmPasswordInput: document.querySelector("#emailResetConfirmPasswordInput"),
  emailResetStatus: document.querySelector("#emailResetStatus"),
  recoveryUsernameInput: document.querySelector("#recoveryUsernameInput"),
  recoverySecretInput: document.querySelector("#recoverySecretInput"),
  recoveryNewPasswordInput: document.querySelector("#recoveryNewPasswordInput"),
  recoveryConfirmPasswordInput: document.querySelector("#recoveryConfirmPasswordInput"),
  forgotPasswordStatus: document.querySelector("#forgotPasswordStatus"),
  xpPanel: document.querySelector("#xpPanel"),
  xpLevel: document.querySelector("#xpLevel"),
  xpText: document.querySelector("#xpText"),
  xpBar: document.querySelector("#xpBar"),
  xpHint: document.querySelector("#xpHint"),
  vipBadge: document.querySelector("#vipBadge"),
  vipPopoverBadge: document.querySelector("#vipPopoverBadge"),
  globalStatus: document.querySelector("#globalStatus"),
  composer: document.querySelector("#composer"),
  uploadToggle: document.querySelector("#uploadToggle"),
  uploadForm: document.querySelector("#uploadForm"),
  photoDrop: document.querySelector("#photoDrop"),
  photoInput: document.querySelector("#photoInput"),
  photoLinkInput: document.querySelector("#photoLinkInput"),
  photoLinkAdd: document.querySelector("#photoLinkAdd"),
  uploadMainPreview: document.querySelector("#uploadMainPreview"),
  photoPreview: document.querySelector("#photoPreview"),
  removeUploadPreview: document.querySelector("#removeUploadPreview"),
  previewStrip: document.querySelector("#previewStrip"),
  fileName: document.querySelector("#fileName"),
  titleInput: document.querySelector("#titleInput"),
  dateInput: document.querySelector("#dateInput"),
  categoryInput: document.querySelector("#categoryInput"),
  publicInput: document.querySelector("#publicInput"),
  noteInput: document.querySelector("#noteInput"),
  uploadStatus: document.querySelector("#uploadStatus"),
  galleryHead: document.querySelector("#galleryHead"),
  feedRefreshNotice: document.querySelector("#feedRefreshNotice"),
  todayPostsNotice: document.querySelector("#todayPostsNotice"),
  weekendReminderNotice: document.querySelector("#weekendReminderNotice"),
  galleryFilters: document.querySelector("#galleryFilters"),
  diarySearchInput: document.querySelector("#diarySearchInput"),
  clearDiarySearch: document.querySelector("#clearDiarySearch"),
  gallery: document.querySelector("#gallery"),
  feedLoader: document.querySelector("#feedLoader"),
  feedLoaderText: document.querySelector("#feedLoaderText"),
  chips: document.querySelectorAll(".chip"),
  dialog: document.querySelector("#photoDialog"),
  dialogMedia: document.querySelector("#photoDialog .dialog-media"),
  closeDialog: document.querySelector("#closeDialog"),
  dialogImage: document.querySelector("#dialogImage"),
  dialogExpandImage: document.querySelector("#dialogExpandImage"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogMeta: document.querySelector("#dialogMeta"),
  dialogNote: document.querySelector("#dialogNote"),
  wishDialogFeedback: document.querySelector("#wishDialogFeedback"),
  wishDialogCompletedAt: document.querySelector("#wishDialogCompletedAt"),
  wishDialogFeedbackText: document.querySelector("#wishDialogFeedbackText"),
  dialogPrev: document.querySelector("#dialogPrev"),
  dialogNext: document.querySelector("#dialogNext"),
  diaryViewerToolbar: document.querySelector("#diaryViewerToolbar"),
  diaryViewerPrev: document.querySelector("#diaryViewerPrev"),
  diaryViewerCounter: document.querySelector("#diaryViewerCounter"),
  diaryViewerNext: document.querySelector("#diaryViewerNext"),
  diaryViewerZoomOut: document.querySelector("#diaryViewerZoomOut"),
  diaryViewerZoomValue: document.querySelector("#diaryViewerZoomValue"),
  diaryViewerZoomIn: document.querySelector("#diaryViewerZoomIn"),
  diaryViewerFit: document.querySelector("#diaryViewerFit"),
  diaryViewerRotate: document.querySelector("#diaryViewerRotate"),
  diaryViewerDownload: document.querySelector("#diaryViewerDownload"),
  secretViewerStatus: document.querySelector("#secretViewerStatus"),
  secretViewerStatusText: document.querySelector("#secretViewerStatusText"),
  secretViewerToolbar: document.querySelector("#secretViewerToolbar"),
  secretViewerPrev: document.querySelector("#secretViewerPrev"),
  secretViewerCounter: document.querySelector("#secretViewerCounter"),
  secretViewerNext: document.querySelector("#secretViewerNext"),
  secretViewerZoomOut: document.querySelector("#secretViewerZoomOut"),
  secretViewerZoomValue: document.querySelector("#secretViewerZoomValue"),
  secretViewerZoomIn: document.querySelector("#secretViewerZoomIn"),
  secretViewerFit: document.querySelector("#secretViewerFit"),
  secretViewerInfo: document.querySelector("#secretViewerInfo"),
  dialogCounter: document.querySelector("#dialogCounter"),
  dialogDots: document.querySelector("#dialogDots"),
  dialogThumbs: document.querySelector("#dialogThumbs"),
  dialogRandomButton: document.querySelector("#dialogRandomButton"),
  dialogSecretLinkButton: document.querySelector("#dialogSecretLinkButton"),
  dialogSecretReturnButton: document.querySelector("#dialogSecretReturnButton"),
  editDialog: document.querySelector("#editDialog"),
  closeEditDialog: document.querySelector("#closeEditDialog"),
  editForm: document.querySelector("#editForm"),
  editTitleInput: document.querySelector("#editTitleInput"),
  editDateInput: document.querySelector("#editDateInput"),
  editCategoryInput: document.querySelector("#editCategoryInput"),
  editPublicInput: document.querySelector("#editPublicInput"),
  editNoteInput: document.querySelector("#editNoteInput"),
  editMediaManager: document.querySelector("#editMediaManager"),
  editImageInput: document.querySelector("#editImageInput"),
  editImageList: document.querySelector("#editImageList"),
  editImageCount: document.querySelector("#editImageCount"),
  addEditImageButton: document.querySelector("#addEditImageButton"),
  deleteEditingPhoto: document.querySelector("#deleteEditingPhoto"),
  saveEditStatus: document.querySelector("#saveEditStatus"),
  vipDialog: document.querySelector("#vipDialog"),
  closeVipDialog: document.querySelector("#closeVipDialog"),
  levelDialog: document.querySelector("#levelDialog"),
  closeLevelDialog: document.querySelector("#closeLevelDialog"),
  levelSummary: document.querySelector("#levelSummary"),
  levelCurrentTitle: document.querySelector("#levelCurrentTitle"),
  levelUpgradeEta: document.querySelector("#levelUpgradeEta"),
  levelList: document.querySelector("#levelList"),
  achievementDialog: document.querySelector("#achievementDialog"),
  closeAchievementDialog: document.querySelector("#closeAchievementDialog"),
  achievementSummary: document.querySelector("#achievementSummary"),
  achievementFilters: document.querySelector("#achievementFilters"),
  achievementGrid: document.querySelector("#achievementGrid"),
  vipSummary: document.querySelector("#vipSummary"),
  vipCurrentLevel: document.querySelector("#vipCurrentLevel"),
  vipCurrentName: document.querySelector("#vipCurrentName"),
  vipRechargeTotal: document.querySelector("#vipRechargeTotal"),
  vipTierAmount: document.querySelector("#vipTierAmount"),
  vipNext: document.querySelector("#vipNext"),
  vipLevels: document.querySelector("#vipLevels"),
  vipRecharge: document.querySelector("#vipRecharge"),
  vipPerks: document.querySelector("#vipPerks"),
  vipStatus: document.querySelector("#vipStatus"),
  overview: document.querySelector("#overview"),
  overviewPhotos: document.querySelector("#overviewPhotos"),
  overviewRecipes: document.querySelector("#overviewRecipes"),
  overviewWishes: document.querySelector("#overviewWishes"),
  overviewLevelButton: document.querySelector("#overviewLevelButton"),
  overviewLevel: document.querySelector("#overviewLevel"),
  overviewProgress: document.querySelector("#overviewProgress"),
  memoryButton: document.querySelector("#memoryButton"),
  weeklyReviewOpen: document.querySelector("#weeklyReviewOpen"),
  weeklyReviewDialog: document.querySelector("#weeklyReviewDialog"),
  weeklyReviewClose: document.querySelector("#weeklyReviewClose"),
  weeklyReviewRange: document.querySelector("#weeklyReviewRange"),
  weeklyReviewLoading: document.querySelector("#weeklyReviewLoading"),
  weeklyReviewContent: document.querySelector("#weeklyReviewContent"),
  weeklyReviewStatus: document.querySelector("#weeklyReviewStatus"),
  secretOpen: document.querySelector("#secretOpen"),
  thanksOpen: document.querySelector("#thanksOpen"),
  toolDock: document.querySelector("#toolDock"),
  quickPhoto: document.querySelector("#quickPhoto"),
  quickRecipe: document.querySelector("#quickRecipe"),
  quickWish: document.querySelector("#quickWish"),
  quickWeekend: document.querySelector("#quickWeekend"),
  foodWheelSection: document.querySelector("#foodWheelSection"),
  foodWheelOpen: document.querySelector("#foodWheelOpen"),
  foodWheelDialog: document.querySelector("#foodWheelDialog"),
  foodWheelClose: document.querySelector("#foodWheelClose"),
  foodWheelPeek: document.querySelector("#foodWheelPeek"),
  foodWheel: document.querySelector("#foodWheel"),
  spinFoodWheel: document.querySelector("#spinFoodWheel"),
  foodWheelResult: document.querySelector("#foodWheelResult"),
  foodOptionInput: document.querySelector("#foodOptionInput"),
  addFoodOption: document.querySelector("#addFoodOption"),
  foodOptions: document.querySelector("#foodOptions"),
  anniversarySection: document.querySelector("#anniversarySection"),
  anniversaryOpen: document.querySelector("#anniversaryOpen"),
  anniversaryPeek: document.querySelector("#anniversaryPeek"),
  anniversaryDialog: document.querySelector("#anniversaryDialog"),
  anniversaryClose: document.querySelector("#anniversaryClose"),
  anniversaryList: document.querySelector("#anniversaryList"),
  anniversaryAdd: document.querySelector("#anniversaryAdd"),
  anniversaryForm: document.querySelector("#anniversaryForm"),
  anniversaryTitleInput: document.querySelector("#anniversaryTitleInput"),
  anniversaryTypeInput: document.querySelector("#anniversaryTypeInput"),
  anniversaryDateInput: document.querySelector("#anniversaryDateInput"),
  anniversaryNoteInput: document.querySelector("#anniversaryNoteInput"),
  anniversaryStatus: document.querySelector("#anniversaryStatus"),
  anniversarySubmit: document.querySelector("#anniversarySubmit"),
  anniversaryCancel: document.querySelector("#anniversaryCancel"),
  recipesPage: document.querySelector("#recipesPage"),
  recipeComposer: document.querySelector("#recipeComposer"),
  recipeToggle: document.querySelector("#recipeToggle"),
  recipeFormTitle: document.querySelector("#recipeFormTitle"),
  recipeForm: document.querySelector("#recipeForm"),
  recipeCoverDrop: document.querySelector("#recipeCoverDrop"),
  recipeCoverInput: document.querySelector("#recipeCoverInput"),
  recipeCoverLinkInput: document.querySelector("#recipeCoverLinkInput"),
  recipeCoverLinkAdd: document.querySelector("#recipeCoverLinkAdd"),
  recipeCoverPreview: document.querySelector("#recipeCoverPreview"),
  recipeCoverName: document.querySelector("#recipeCoverName"),
  recipeNameInput: document.querySelector("#recipeNameInput"),
  recipeCategoryInput: document.querySelector("#recipeCategoryInput"),
  recipeTimeInput: document.querySelector("#recipeTimeInput"),
  recipeServingsInput: document.querySelector("#recipeServingsInput"),
  recipeIngredientsInput: document.querySelector("#recipeIngredientsInput"),
  recipeStepsInput: document.querySelector("#recipeStepsInput"),
  recipeNoteInput: document.querySelector("#recipeNoteInput"),
  recipeSubmitButton: document.querySelector("#recipeSubmitButton"),
  recipeCancelEdit: document.querySelector("#recipeCancelEdit"),
  recipeStatus: document.querySelector("#recipeStatus"),
  recipesList: document.querySelector("#recipesList"),
  wishlistPage: document.querySelector("#wishlistPage"),
  wishlistComposer: document.querySelector("#wishlistComposer"),
  wishlistToggle: document.querySelector("#wishlistToggle"),
  wishlistFormTitle: document.querySelector("#wishlistFormTitle"),
  wishlistForm: document.querySelector("#wishlistForm"),
  wishImageDrop: document.querySelector("#wishImageDrop"),
  wishImageInput: document.querySelector("#wishImageInput"),
  wishImageLinkInput: document.querySelector("#wishImageLinkInput"),
  wishImageLinkAdd: document.querySelector("#wishImageLinkAdd"),
  wishImagePreview: document.querySelector("#wishImagePreview"),
  wishImageName: document.querySelector("#wishImageName"),
  wishRemoveImage: document.querySelector("#wishRemoveImage"),
  wishTitleInput: document.querySelector("#wishTitleInput"),
  wishTypeInput: document.querySelector("#wishTypeInput"),
  wishDateInput: document.querySelector("#wishDateInput"),
  wishPriorityInput: document.querySelector("#wishPriorityInput"),
  wishNoteInput: document.querySelector("#wishNoteInput"),
  wishCompletionNoteInput: document.querySelector("#wishCompletionNoteInput"),
  wishSubmitButton: document.querySelector("#wishSubmitButton"),
  wishCancelEdit: document.querySelector("#wishCancelEdit"),
  wishlistStatus: document.querySelector("#wishlistStatus"),
  wishTabs: document.querySelector("#wishTabs"),
  wishOpenCount: document.querySelector("#wishOpenCount"),
  wishDoneCount: document.querySelector("#wishDoneCount"),
  wishlistList: document.querySelector("#wishlistList"),
  wishCompleteDialog: document.querySelector("#wishCompleteDialog"),
  wishCompleteClose: document.querySelector("#wishCompleteClose"),
  wishCompleteForm: document.querySelector("#wishCompleteForm"),
  wishCompleteTitle: document.querySelector("#wishCompleteTitle"),
  wishCompleteMeta: document.querySelector("#wishCompleteMeta"),
  wishCompletePreview: document.querySelector("#wishCompletePreview"),
  wishCompleteNoteInput: document.querySelector("#wishCompleteNoteInput"),
  wishCompleteStatus: document.querySelector("#wishCompleteStatus"),
  wishCompleteCancel: document.querySelector("#wishCompleteCancel"),
  wishCompleteSubmit: document.querySelector("#wishCompleteSubmit"),
  weekendPage: document.querySelector("#weekendPage"),
  weekendComposer: document.querySelector("#weekendComposer"),
  weekendToggle: document.querySelector("#weekendToggle"),
  weekendFormTitle: document.querySelector("#weekendFormTitle"),
  weekendForm: document.querySelector("#weekendForm"),
  weekendImageDrop: document.querySelector("#weekendImageDrop"),
  weekendImageInput: document.querySelector("#weekendImageInput"),
  weekendImageLinkInput: document.querySelector("#weekendImageLinkInput"),
  weekendImageLinkAdd: document.querySelector("#weekendImageLinkAdd"),
  weekendImagePreviews: document.querySelector("#weekendImagePreviews"),
  weekendTitleInput: document.querySelector("#weekendTitleInput"),
  weekendDateInput: document.querySelector("#weekendDateInput"),
  weekendLocationInput: document.querySelector("#weekendLocationInput"),
  weekendTypeInput: document.querySelector("#weekendTypeInput"),
  weekendNoteInput: document.querySelector("#weekendNoteInput"),
  weekendSubmitButton: document.querySelector("#weekendSubmitButton"),
  weekendCancelEdit: document.querySelector("#weekendCancelEdit"),
  weekendStatus: document.querySelector("#weekendStatus"),
  weekendList: document.querySelector("#weekendList"),
  weekendCompletionDialog: document.querySelector("#weekendCompletionDialog"),
  weekendCompletionClose: document.querySelector("#weekendCompletionClose"),
  weekendCompletionForm: document.querySelector("#weekendCompletionForm"),
  weekendCompletionPlanTitle: document.querySelector("#weekendCompletionPlanTitle"),
  weekendCompletionNote: document.querySelector("#weekendCompletionNote"),
  weekendCompletionDrop: document.querySelector("#weekendCompletionDrop"),
  weekendCompletionInput: document.querySelector("#weekendCompletionInput"),
  weekendCompletionPreviews: document.querySelector("#weekendCompletionPreviews"),
  weekendCompletionLinkInput: document.querySelector("#weekendCompletionLinkInput"),
  weekendCompletionLinkAdd: document.querySelector("#weekendCompletionLinkAdd"),
  weekendCompletionStatus: document.querySelector("#weekendCompletionStatus"),
  weekendCompletionCancel: document.querySelector("#weekendCompletionCancel"),
  weekendCompletionSubmit: document.querySelector("#weekendCompletionSubmit"),
  wardrobePage: document.querySelector("#wardrobePage"),
  wardrobeRoot: document.querySelector("#wardrobeRoot"),
  thanksPage: document.querySelector("#thanksPage"),
  secretPage: document.querySelector("#secretPage"),
  secretPinDialog: document.querySelector("#secretPinDialog"),
  secretPinClose: document.querySelector("#secretPinClose"),
  secretPinEyebrow: document.querySelector("#secretPinEyebrow"),
  secretPinTitle: document.querySelector("#secretPinTitle"),
  secretPinDescription: document.querySelector("#secretPinDescription"),
  secretPinDots: document.querySelector("#secretPinDots"),
  secretPinStatus: document.querySelector("#secretPinStatus"),
  secretPinKeypad: document.querySelector("#secretPinKeypad"),
  secretStatus: document.querySelector("#secretStatus"),
  secretSearchInput: document.querySelector("#secretSearchInput"),
  secretSearchSuggestions: document.querySelector("#secretSearchSuggestions"),
  secretCreateFolderButton: document.querySelector("#secretCreateFolderButton"),
  secretFolderList: document.querySelector("#secretFolderList"),
  secretComposer: document.querySelector("#secretComposer"),
  secretToggle: document.querySelector("#secretToggle"),
  secretForm: document.querySelector("#secretForm"),
  secretImageDrop: document.querySelector("#secretImageDrop"),
  secretImageInput: document.querySelector("#secretImageInput"),
  secretImageLinkInput: document.querySelector("#secretImageLinkInput"),
  secretImageLinkAdd: document.querySelector("#secretImageLinkAdd"),
  secretCoverInput: document.querySelector("#secretCoverInput"),
  secretImagePreview: document.querySelector("#secretImagePreview"),
  secretPreviewStrip: document.querySelector("#secretPreviewStrip"),
  secretImageName: document.querySelector("#secretImageName"),
  secretTitleInput: document.querySelector("#secretTitleInput"),
  secretCategoryInput: document.querySelector("#secretCategoryInput"),
  secretFolderInput: document.querySelector("#secretFolderInput"),
  secretCategoryList: document.querySelector("#secretCategoryList"),
  secretCategoryTags: document.querySelector("#secretCategoryTags"),
  secretLinkedPhotoInput: document.querySelector("#secretLinkedPhotoInput"),
  secretNoteInput: document.querySelector("#secretNoteInput"),
  secretSubmitButton: document.querySelector("#secretSubmitButton"),
  secretFilters: document.querySelector("#secretFilters"),
  secretGallery: document.querySelector("#secretGallery"),
  thanksForm: document.querySelector("#thanksForm"),
  thanksBodyInput: document.querySelector("#thanksBodyInput"),
  thanksStatus: document.querySelector("#thanksStatus"),
  thanksSubmitButton: document.querySelector("#thanksSubmitButton"),
  thanksCancelEdit: document.querySelector("#thanksCancelEdit"),
  thanksBoard: document.querySelector("#thanksBoard"),
  familyDialog: document.querySelector("#familyDialog"),
  closeFamilyDialog: document.querySelector("#closeFamilyDialog"),
  familyEmpty: document.querySelector("#familyEmpty"),
  createFamilyForm: document.querySelector("#createFamilyForm"),
  familyNameInput: document.querySelector("#familyNameInput"),
  familyContent: document.querySelector("#familyContent"),
  familyName: document.querySelector("#familyName"),
  familyInviteForm: document.querySelector("#familyInviteForm"),
  familyUsernameInput: document.querySelector("#familyUsernameInput"),
  familyMembers: document.querySelector("#familyMembers"),
  familyInvitations: document.querySelector("#familyInvitations"),
  familyOutgoingInvitations: document.querySelector("#familyOutgoingInvitations"),
  familyStatus: document.querySelector("#familyStatus"),
  photoCommentsList: document.querySelector("#photoCommentsList"),
  photoCommentsSection: document.querySelector("#photoCommentsSection"),
  photoCommentForm: document.querySelector("#photoCommentForm"),
  photoCommentInput: document.querySelector("#photoCommentInput"),
  photoCommentStatus: document.querySelector("#photoCommentStatus"),
  commentReplying: document.querySelector("#commentReplying"),
  commentReplyingText: document.querySelector("#commentReplyingText"),
  cancelCommentReply: document.querySelector("#cancelCommentReply"),
};

els.dateInput.valueAsDate = new Date();
els.weekendDateInput.value = getNextWeekendDate();
foodOptions = loadFoodOptions();
applyTheme(loadTheme(null), { persist: false, userId: null });

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

  cloudDb.auth.onAuthStateChange((_event, nextSession) => {
    const previousUserId = session?.user?.id || "";
    const nextUserId = nextSession?.user?.id || "";
    if (previousUserId !== nextUserId) {
      secretUnlockedAt = 0;
      secretLeftAt = 0;
      secretPinEntry = "";
      secretPinSetupValue = "";
      els.secretPinDialog?.close();
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
  appLifecycleController.start();
}

function updateAuthUI() {
  const signedIn = Boolean(session);
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
  wishes = signedIn ? loadWishes() : [];
  weekendPlans = signedIn ? loadWeekendPlans() : [];
  anniversaries = signedIn ? loadAnniversaries() : [];
  favoritePhotoIds = signedIn ? loadLocalFavoritePhotoIds() : new Set();
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
    cloudSyncAvailable = false;
    weekendCloudAvailable = false;
    anniversaryCloudAvailable = false;
    favoritesCloudAvailable = false;
    photoFlagsCloudAvailable = false;
    secretCloudAvailable = false;
    foodOptionsCloudAvailable = false;
      profilePreferencesCloudAvailable = false;
      thanksColorCloudAvailable = false;
    gratitudeNotes = [];
    secretItems = [];
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

  if (session.user.id !== syncedUserId) {
    syncedUserId = session.user.id;
    void synchronizeAccountData();
  }
}

async function loginWithPassword() {
  if (!cloudDb) {
    setHint("Cloudflare 服务正在初始化，请稍后再试。");
    return;
  }

  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value;
  const email = usernameToEmail(username);
  if (!email || !password) {
    setHint("请输入用户名和密码。");
    return;
  }

  setHint("正在登录...");

  try {
    const { error } = await cloudDb.auth.signInWithPassword({
      email,
      password,
    });

    setHint(error ? error.message : "登录成功。");
  } catch (error) {
    setHint(`登录失败：${error.message || "网络或配置错误"}`);
  }
}

async function verifyInviteCode(inviteCode) {
  const endpoint = R2_UPLOAD_ENDPOINT.replace(/\/+$/, "");
  let response;
  try {
    response = await fetch(`${endpoint}/api/invite/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: inviteCode }),
    });
  } catch (error) {
    throw new Error(`邀请码校验失败：${error.message || "无法连接服务"}`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "邀请码不正确。");
  }
}

async function signupWithPassword() {
  if (!cloudDb) {
    setHint("Cloudflare 服务正在初始化，请稍后再试。");
    return;
  }

  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value;
  const inviteCode = els.inviteCodeInput?.value.trim() || "";
  const email = usernameToEmail(username);
  if (!email || !password) {
    setHint("请输入用户名和密码。用户名只能用中文、英文、数字、下划线或短横线。");
    return;
  }

  if (password.length < 6) {
    setHint("密码至少需要 6 位。");
    return;
  }

  if (!inviteCode) {
    setHint("注册需要邀请码，请找 xiudan320 获取。");
    els.inviteCodeInput?.focus();
    return;
  }

  setHint("正在校验邀请码...");

  try {
    await verifyInviteCode(inviteCode);
    setHint("邀请码通过，正在注册...");
    const { error } = await cloudDb.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl(),
        data: { username, inviteCode },
      },
    });

    setHint(error ? error.message : "注册完成，可以直接登录。");
  } catch (error) {
    setHint(`注册失败：${error.message || "网络或配置错误"}`);
  }
}

async function logout() {
  if (!cloudDb) return;
  closeMobileDiaryPage();
  clearSecretUnlockState();
  els.secretPinDialog?.close();
  await cloudDb.auth.signOut();
}

function passwordsMatch(password, confirmation, statusElement) {
  if (password.length < 6) {
    statusElement.textContent = "密码至少需要 6 位。";
    return false;
  }
  if (password !== confirmation) {
    statusElement.textContent = "两次输入的密码不一致。";
    return false;
  }
  return true;
}

async function changePassword(event) {
  event.preventDefault();
  if (!cloudDb || !session) return;
  const password = els.newPasswordInput.value;
  if (!passwordsMatch(password, els.confirmPasswordInput.value, els.changePasswordStatus)) {
    return;
  }
  els.changePasswordStatus.textContent = "正在修改密码…";
  const { error } = await cloudDb.auth.updateUser({ password });
  if (error) {
    els.changePasswordStatus.textContent = `修改失败：${error.message}`;
    return;
  }
  els.changePasswordForm.reset();
  els.changePasswordStatus.textContent = "密码已修改。";
  window.setTimeout(() => els.changePasswordDialog.close(), 650);
}

async function saveRecoveryKey(event) {
  event.preventDefault();
  if (!cloudDb || !session) return;
  const recoveryKey = els.recoveryKeyInput.value.trim();
  if (recoveryKey.length < 12) {
    els.recoveryKeyStatus.textContent = "恢复密钥至少需要 12 位。";
    return;
  }
  if (recoveryKey !== els.confirmRecoveryKeyInput.value.trim()) {
    els.recoveryKeyStatus.textContent = "两次输入的恢复密钥不一致。";
    return;
  }
  els.recoveryKeyStatus.textContent = "正在保存恢复密钥…";
  const { error } = await cloudDb.rpc("set_password_recovery_key", {
    p_recovery_key: recoveryKey,
  });
  if (error) {
    els.recoveryKeyStatus.textContent = isMissingCloudSchema(error)
      ? "恢复功能尚未初始化，请先部署最新版 Cloudflare D1 结构。"
      : `保存失败：${error.message}`;
    return;
  }
  els.recoveryKeyForm.reset();
  els.recoveryKeyStatus.textContent = "恢复密钥已加密保存，请妥善保管。";
  window.setTimeout(() => els.recoveryKeyDialog.close(), 900);
}

function isValidEmailInput(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());
}

function resetEmailBindingDialog() {
  if (!els.emailBindingDialog) return;
  const boundEmail = getSessionBoundEmail();
  els.emailBindingRequestForm?.reset();
  els.emailBindingConfirmForm?.reset();
  if (els.accountEmailInput) els.accountEmailInput.value = boundEmail;
  if (els.accountEmailInput) els.accountEmailInput.disabled = false;
  if (els.emailBindingConfirmForm) els.emailBindingConfirmForm.hidden = true;
  if (els.emailBindingStatus) els.emailBindingStatus.textContent = "";
  if (els.emailBindingConfirmStatus) els.emailBindingConfirmStatus.textContent = "";
}

async function requestEmailBinding(event) {
  event.preventDefault();
  if (!cloudDb?.account || !session) return;
  const email = String(els.accountEmailInput?.value || "").trim().toLowerCase();
  if (!isValidEmailInput(email)) {
    if (els.emailBindingStatus) els.emailBindingStatus.textContent = "请输入有效的邮箱地址。";
    return;
  }
  if (els.requestEmailBindingButton) els.requestEmailBindingButton.disabled = true;
  if (els.emailBindingStatus) els.emailBindingStatus.textContent = "正在发送验证码…";
  const { error } = await cloudDb.account.requestEmailBind(email);
  if (error) {
    if (els.emailBindingStatus) els.emailBindingStatus.textContent = "发送失败：" + error.message;
    if (els.requestEmailBindingButton) els.requestEmailBindingButton.disabled = false;
    return;
  }
  if (els.accountEmailInput) els.accountEmailInput.disabled = true;
  if (els.emailBindingConfirmForm) els.emailBindingConfirmForm.hidden = false;
  if (els.emailBindingStatus) els.emailBindingStatus.textContent = "验证码已发送，10 分钟内有效。";
  els.accountEmailCodeInput?.focus();
  if (els.requestEmailBindingButton) els.requestEmailBindingButton.disabled = false;
}

async function confirmEmailBinding(event) {
  event.preventDefault();
  if (!cloudDb?.account || !session) return;
  const email = String(els.accountEmailInput?.value || "").trim().toLowerCase();
  const code = String(els.accountEmailCodeInput?.value || "").trim();
  if (!/^\d{6}$/.test(code)) {
    if (els.emailBindingConfirmStatus) els.emailBindingConfirmStatus.textContent = "请输入 6 位验证码。";
    return;
  }
  if (els.emailBindingConfirmStatus) els.emailBindingConfirmStatus.textContent = "正在验证…";
  const { data, error } = await cloudDb.account.confirmEmailBind(email, code);
  if (error) {
    if (els.emailBindingConfirmStatus) els.emailBindingConfirmStatus.textContent = "绑定失败：" + error.message;
    return;
  }
  const savedEmail = String(data?.email || email).trim().toLowerCase();
  const { error: sessionError } = await cloudDb.auth.updateUser({
    data: { bound_email: savedEmail },
  });
  if (sessionError) {
    if (els.emailBindingConfirmStatus) els.emailBindingConfirmStatus.textContent = "本地同步失败：" + sessionError.message;
    return;
  }
  if (session?.user) {
    session.user.email = savedEmail;
    session.user.user_metadata = {
      ...(session.user.user_metadata || {}),
      bound_email: savedEmail,
    };
  }
  if (els.emailBindingConfirmStatus) els.emailBindingConfirmStatus.textContent = "邮箱已绑定，可用于找回用户名和密码。";
  renderSettingsSummary();
  window.setTimeout(() => els.emailBindingDialog?.close(), 900);
}

function resetEmailRecoveryUi() {
  els.emailResetRequestForm?.reset();
  els.emailResetConfirmForm?.reset();
  if (els.emailResetConfirmForm) els.emailResetConfirmForm.hidden = true;
  if (els.resetEmailInput) els.resetEmailInput.disabled = false;
  if (els.emailResetStatus) els.emailResetStatus.textContent = "";
}

async function requestEmailPasswordReset(event) {
  event.preventDefault();
  if (!cloudDb?.account) return;
  const email = String(els.resetEmailInput?.value || "").trim().toLowerCase();
  if (!isValidEmailInput(email)) {
    if (els.emailResetStatus) els.emailResetStatus.textContent = "请输入有效的绑定邮箱。";
    return;
  }
  if (els.emailResetStatus) els.emailResetStatus.textContent = "正在发送验证码…";
  const { error } = await cloudDb.account.requestPasswordReset(email);
  if (error) {
    if (els.emailResetStatus) els.emailResetStatus.textContent = "发送失败：" + error.message;
    return;
  }
  if (els.resetEmailInput) els.resetEmailInput.disabled = true;
  if (els.emailResetConfirmForm) els.emailResetConfirmForm.hidden = false;
  if (els.emailResetStatus) els.emailResetStatus.textContent = "验证码已发送，邮件中也会告诉你用户名。";
  els.resetEmailCodeInput?.focus();
}

async function confirmEmailPasswordReset(event) {
  event.preventDefault();
  if (!cloudDb?.account) return;
  const email = String(els.resetEmailInput?.value || "").trim().toLowerCase();
  const code = String(els.resetEmailCodeInput?.value || "").trim();
  const password = els.emailResetNewPasswordInput?.value || "";
  const confirmation = els.emailResetConfirmPasswordInput?.value || "";
  if (!/^\d{6}$/.test(code)) {
    if (els.emailResetStatus) els.emailResetStatus.textContent = "请输入 6 位验证码。";
    return;
  }
  if (!passwordsMatch(password, confirmation, els.emailResetStatus)) return;
  if (els.emailResetStatus) els.emailResetStatus.textContent = "正在重设密码…";
  const { data, error } = await cloudDb.account.confirmPasswordReset(email, code, password);
  if (error) {
    if (els.emailResetStatus) els.emailResetStatus.textContent = "重设失败：" + error.message;
    return;
  }
  if (data?.username) els.usernameInput.value = data.username;
  els.passwordInput.value = "";
  if (els.emailResetStatus) els.emailResetStatus.textContent = "密码已重设，请使用邮件中的用户名登录。";
  window.setTimeout(() => els.forgotPasswordDialog?.close(), 1000);
}

async function resetForgottenPassword(event) {
  event.preventDefault();
  if (!cloudDb) return;
  const username = els.recoveryUsernameInput.value.trim();
  const recoveryKey = els.recoverySecretInput.value.trim();
  const password = els.recoveryNewPasswordInput.value;
  if (!username || recoveryKey.length < 12) {
    els.forgotPasswordStatus.textContent = "请输入用户名和至少 12 位的恢复密钥。";
    return;
  }
  if (
    !passwordsMatch(
      password,
      els.recoveryConfirmPasswordInput.value,
      els.forgotPasswordStatus
    )
  ) {
    return;
  }
  els.forgotPasswordStatus.textContent = "正在验证恢复密钥…";
  const { data, error } = await cloudDb.rpc("reset_password_with_recovery_key", {
    p_username: username,
    p_recovery_key: recoveryKey,
    p_new_password: password,
  });
  if (error) {
    els.forgotPasswordStatus.textContent = isMissingCloudSchema(error)
      ? "恢复功能尚未初始化，请先部署最新版 Cloudflare D1 结构。"
      : `重设失败：${error.message}`;
    return;
  }
  if (!data) {
    els.forgotPasswordStatus.textContent = "用户名或恢复密钥不正确。";
    return;
  }
  els.forgotPasswordForm.reset();
  els.usernameInput.value = username;
  els.passwordInput.value = "";
  els.forgotPasswordStatus.textContent = "密码已重设，可以使用新密码登录。";
  window.setTimeout(() => els.forgotPasswordDialog.close(), 1000);
}

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
      // Keep the locally rendered feed during an offline cold start. Replacing
      // it with an empty network result makes a valid offline cache look broken.
      renderCachedPhotoFeed(session?.user?.id || "public");
      setGlobalStatus("当前离线，正在显示本机缓存。");
    } else {
      setGlobalStatus(`读取日记失败：${error.message}`);
      if (!photos.length) photos = [];
    }
    photoFlagsCloudAvailable = false;
  } else {
    setGlobalStatus("");
    photos = data || [];
    pendingNewPhotos = [];
    dismissedFeedRefreshIds = new Set();
    showingCachedFeed = false;
    if (session) {
      await Promise.all([
        verifyPhotoFlagSchema(),
        synchronizePhotoFavorites(),
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

function getPhotoFeedCacheStorageKey(userId = session?.user?.id || "public") {
  return `${PHOTO_FEED_CACHE_KEY}:${userId || "public"}`;
}

function normalizeCacheMb(value, fallback) {
  return clampCacheMb(value, fallback, { min: MIN_CACHE_MB, max: MAX_CACHE_MB });
}

function getCacheCapacityStorageKey(type, userId = session?.user?.id || "guest") {
  return buildCacheCapacityStorageKey(type, userId, {
    diary: DIARY_CACHE_MB_KEY,
    secret: SECRET_CACHE_MB_KEY,
  });
}

function loadCacheCapacityMb(type, userId = session?.user?.id || "guest") {
  const fallback = type === "secret" ? DEFAULT_SECRET_CACHE_MB : DEFAULT_DIARY_CACHE_MB;
  return normalizeCacheMb(localStorage.getItem(getCacheCapacityStorageKey(type, userId)), fallback);
}

function saveCacheCapacityMb(type, value, userId = session?.user?.id || "guest") {
  const fallback = type === "secret" ? DEFAULT_SECRET_CACHE_MB : DEFAULT_DIARY_CACHE_MB;
  const capacity = normalizeCacheMb(value, fallback);
  localStorage.setItem(getCacheCapacityStorageKey(type, userId), String(capacity));
  return capacity;
}

function getPhotoCacheImages(photo) {
  const images = getPhotoImages(photo);
  if (images.length) {
    return images.flatMap((image) => [image.thumbnail_url, image.image_url]).filter(Boolean);
  }
  return [photo?.image_url].filter(Boolean);
}

function getSecretItemCacheImages(item) {
  return [
    item?.coverImage || item?.cover_image || "",
    ...normalizeSecretImages(item?.images).flatMap((image) => [image.thumbnail_url, image.image_url]),
  ].filter(Boolean);
}

function normalizeMediaCacheUrl(url) {
  return normalizeMediaUrl(url, window.location.href);
}

function collectDiaryOfflineMediaUrls(itemLimit = Number.POSITIVE_INFINITY) {
  const urls = [];
  getSortedPhotos(photos)
    .slice(0, itemLimit)
    .forEach((photo) => urls.push(...getPhotoCacheImages(photo)));
  urls.push(accountProfile.avatarUrl || "");
  familyMemberMap.forEach((member) => urls.push(member?.avatar_url || ""));
  return [...new Set(urls.map(normalizeMediaCacheUrl).filter(Boolean))];
}

function collectSecretOfflineMediaUrls() {
  const urls = [];
  secretItems.forEach((item) => urls.push(...getSecretItemCacheImages(item)));
  return [...new Set(urls.map(normalizeMediaCacheUrl).filter(Boolean))];
}

let mediaCacheTimer = 0;
function getMediaCachePolicyKey(userId = session?.user?.id || "guest") {
  return preferenceStore.scopedKey(MEDIA_CACHE_POLICY_KEY, userId || "guest");
}

function loadMediaCachePolicy(userId = session?.user?.id || "guest") {
  return preferenceStore.readEnum(
    MEDIA_CACHE_POLICY_KEY,
    ["off", "wifi"],
    "wifi",
    { scope: userId || "guest" }
  );
}

function saveMediaCachePolicy(policy, userId = session?.user?.id || "guest") {
  const next = policy === "off" ? "off" : "wifi";
  preferenceStore.write(getMediaCachePolicyKey(userId), next);
  renderSettingsSummary();
  return next;
}

function isClearlyUnmeteredConnection() {
  return detectUnmeteredConnection(navigator);
}

function shouldAutoCacheMedia(userId = session?.user?.id || "guest") {
  return navigator.onLine && loadMediaCachePolicy(userId) === "wifi" && isClearlyUnmeteredConnection();
}

function scheduleOfflineMediaCache(userId = session?.user?.id || "public") {
  if (!("caches" in window)) return;
  if (!shouldAutoCacheMedia(userId)) return;
  window.clearTimeout(mediaCacheTimer);
  mediaCacheTimer = window.setTimeout(() => {
    cacheOfflineMedia(userId, { explicit: false }).catch((error) => {
      console.warn("Offline media cache failed:", error);
    });
  }, 900);
}

async function cacheOfflineMedia(userId = session?.user?.id || "public", options = {}) {
  if (!("caches" in window)) return;
  const explicit = Boolean(options.explicit);
  const type = options.type || "all";
  if (!explicit && !shouldAutoCacheMedia(userId)) return;
  const tasks = [];
  if (type === "all" || type === "diary") {
    const diaryItemLimit = explicit
      ? Number.POSITIVE_INFINITY
      : AUTO_DIARY_CACHE_ITEM_LIMIT;
    tasks.push(mediaCacheService.fillWithinCapacity(
      DIARY_MEDIA_CACHE_NAME,
      collectDiaryOfflineMediaUrls(diaryItemLimit),
      loadCacheCapacityMb("diary", userId) * 1024 * 1024,
      explicit ? 40 : Number.POSITIVE_INFINITY
    ));
  }
  if (type === "all" || type === "secret") {
    tasks.push(mediaCacheService.fillWithinCapacity(
      SECRET_MEDIA_CACHE_NAME,
      collectSecretOfflineMediaUrls(),
      loadCacheCapacityMb("secret", userId) * 1024 * 1024,
      explicit ? Number.POSITIVE_INFINITY : 4
    ));
  }
  const results = await Promise.all(tasks);
  await caches.delete(LEGACY_MEDIA_CACHE_NAME);
  await refreshCacheInfo();
  return results.reduce((summary, result) => ({
    cached: summary.cached + result.cached,
    downloaded: summary.downloaded + result.downloaded,
    bytes: summary.bytes + result.bytes,
    requested: summary.requested + result.requested,
    complete: summary.complete && result.complete,
  }), { cached: 0, downloaded: 0, bytes: 0, requested: 0, complete: true });
}

function savePhotoFeedCache(userId = session?.user?.id || "public") {
  if (!photos.length) return;
  const cachedPhotos = getSortedPhotos(photos).slice(0, METADATA_CACHE_ITEM_LIMIT);
  const cachedIds = new Set(cachedPhotos.map((photo) => photo.id).filter(Boolean));
  const comments = [];
  cachedIds.forEach((photoId) => {
    (photoCommentPreviewMap.get(photoId) || [])
      .slice(0, PHOTO_COMMENT_PREVIEW_LIMIT)
      .forEach((comment) => comments.push(sanitizeCommentRecord(comment)));
  });
  const payload = {
    savedAt: new Date().toISOString(),
    photos: cachedPhotos.map(sanitizeDiaryRecord),
    comments,
  };
  try {
    localStorage.setItem(getPhotoFeedCacheStorageKey(userId), JSON.stringify(payload));
    scheduleOfflineMediaCache(userId);
  } catch {
    // Local storage can be full or unavailable; the live cloud feed still works.
  }
}

function renderCachedPhotoFeed(userId = session?.user?.id || "public") {
  if (activePage !== "gallery") return false;
  try {
    const raw = localStorage.getItem(getPhotoFeedCacheStorageKey(userId));
    if (!raw) return false;
    const cached = JSON.parse(raw);
    if (!Array.isArray(cached.photos) || !cached.photos.length) return false;
    photos = cached.photos.map((photo) => ({ ...photo, __cached: true }));
    photoCommentPreviewMap = new Map();
    (Array.isArray(cached.comments) ? cached.comments : []).forEach((comment) => {
      if (!comment.photo_id) return;
      const list = photoCommentPreviewMap.get(comment.photo_id) || [];
      if (list.length >= PHOTO_COMMENT_PREVIEW_LIMIT) return;
      list.push(comment);
      photoCommentPreviewMap.set(comment.photo_id, list);
    });
    showingCachedFeed = true;
    visiblePhotoCount = Math.max(PAGE_SIZE, Math.min(METADATA_CACHE_ITEM_LIMIT, cached.photos.length));
    renderGallery();
    setGlobalStatus("先显示上次缓存，正在同步最新内容…");
    return true;
  } catch {
    return false;
  }
}

function getSecretItemsCacheStorageKey(userId = session?.user?.id || "guest") {
  return `${SECRET_ITEMS_CACHE_KEY}:${userId || "guest"}`;
}

function saveSecretItemsCache(userId = session?.user?.id || "guest") {
  if (!secretItems.length) return;
  try {
    localStorage.setItem(
      getSecretItemsCacheStorageKey(userId),
      JSON.stringify({
        savedAt: new Date().toISOString(),
        items: secretItems.slice(0, METADATA_CACHE_ITEM_LIMIT).map((item) =>
          sanitizeSecretRecord(item, {
            images: normalizeSecretImages(item.images),
            defaultSortOrder: getDefaultSecretSortOrder(item.createdAt),
          })
        ),
      })
    );
    scheduleOfflineMediaCache(userId);
  } catch {
    // The cloud copy remains the source of truth if local storage is full.
  }
}

function renderCachedSecretItems(userId = session?.user?.id || "guest") {
  try {
    const raw = localStorage.getItem(getSecretItemsCacheStorageKey(userId));
    if (!raw) return false;
    const cached = JSON.parse(raw);
    if (!Array.isArray(cached.items) || !cached.items.length) return false;
    secretItems = cached.items.map((item) => ({ ...item, __cached: true }));
    secretCloudAvailable = true;
    renderSecretGallery();
    setSecretStatus("先显示上次缓存，正在同步秘藏...");
    return true;
  } catch {
    return false;
  }
}

async function getAppCacheStats() {
  return mediaCacheService.getStats(getStorageUsageBytes(localStorage));
}
function renderCacheStats(stats) {
  if (!els.settingsCacheValue) return;
  els.settingsCacheValue.textContent = `${formatFileSize(stats.totalBytes)} 本地离线缓存`;
  const cacheHelp = els.settingsCacheValue.nextElementSibling;
  if (cacheHelp) {
    cacheHelp.textContent = `日记 ${stats.diaryEntries} 项 / ${loadCacheCapacityMb("diary")} MB · 秘藏 ${stats.secretEntries} 项 / ${loadCacheCapacityMb("secret")} MB`;
  }
  if (els.settingsCacheStatus) {
    els.settingsCacheStatus.textContent = `日记 ${formatFileSize(stats.diaryBytes)} · 秘藏 ${formatFileSize(stats.secretBytes)} · 应用外壳 ${formatFileSize(stats.appShellBytes)} · 文字索引 ${formatFileSize(stats.localBytes)}`;
    const clearHelp = els.settingsCacheStatus.nextElementSibling;
    if (clearHelp) clearHelp.textContent = "清除以上离线内容，账号和个人设置仍保留";
  }
}

async function refreshCacheInfo() {
  if (els.settingsCacheValue) els.settingsCacheValue.textContent = "计算中...";
  const stats = await getAppCacheStats();
  renderCacheStats(stats);
}

async function clearAppCache() {
  if (els.settingsCacheStatus) els.settingsCacheStatus.textContent = "正在清除...";
  const keysToRemove = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index) || "";
    if (
      key.startsWith(`${PHOTO_FEED_CACHE_KEY}:`) ||
      key.startsWith(`${SECRET_ITEMS_CACHE_KEY}:`)
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  await mediaCacheService.deleteManagedCaches();

  await refreshCacheInfo();
  if (els.settingsCacheStatus) els.settingsCacheStatus.textContent = "缓存已清除，账号和设置已保留";
}

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
    (photo) => isPhotoPublishedToday(photo) && String(photo?.user_id || "") !== currentUserId
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

function getPhotoFavoritesStorageKey(userId = session?.user?.id || "guest") {
  return `${PHOTO_FAVORITES_KEY}:${userId}`;
}

function loadLocalFavoritePhotoIds() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(getPhotoFavoritesStorageKey()) || "[]"
    );
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveLocalFavoritePhotoIds() {
  localStorage.setItem(
    getPhotoFavoritesStorageKey(),
    JSON.stringify([...favoritePhotoIds])
  );
}

async function synchronizePhotoFavorites() {
  if (!cloudDb || !session) return;
  const userId = session.user.id;
  const visiblePhotoIds = new Set(photos.map((photo) => photo.id));
  const localIds = [...loadLocalFavoritePhotoIds()].filter((id) =>
    visiblePhotoIds.has(id)
  );
  try {
    const { data, error } = await diaryRepository.listFavorites();
    if (error) throw error;

    const cloudIdSet = new Set((data || []).map((row) => row.photo_id));
    const missingLocalIds = localIds.filter((id) => !cloudIdSet.has(id));
    if (missingLocalIds.length) {
      const { error: migrateError } = await diaryRepository.upsertFavorites(missingLocalIds);
      if (migrateError) throw migrateError;
      missingLocalIds.forEach((id) => cloudIdSet.add(id));
    }

    favoritesCloudAvailable = true;
    favoritePhotoIds = cloudIdSet;
    saveLocalFavoritePhotoIds();
  } catch (error) {
    favoritesCloudAvailable = false;
    favoritePhotoIds = new Set(localIds);
    if (!isMissingCloudSchema(error)) {
      console.warn("Favorite sync failed:", error);
    }
  }
}

async function uploadPhoto(event) {
  event.preventDefault();
  if (uploadInFlight) {
    setStatus("正在上传，先别连点。");
    return;
  }
  if (!cloudDb || !session) {
    setStatus("请先登录。");
    return;
  }

  const files = selectedUploadFiles.length ? selectedUploadFiles : Array.from(els.photoInput.files || []);
  const linkUrls = [...selectedUploadLinks];
  if (!files.length && !linkUrls.length) {
    setStatus("请选择图片，或粘贴图片链接。");
    return;
  }

  const imageLimit = getCurrentImageLimit();
  if (files.length + linkUrls.length > imageLimit) {
    setStatus(`当前 VIP 等级单篇最多 ${imageLimit} 张图。`);
    return;
  }

  const finalTitle = getFinalTitle();
  const payload = getDiaryUploadPayload(finalTitle, files, linkUrls);
  uploadInFlight = true;
  setUploadSubmitting(true);
  try {
    if (!navigator.onLine) {
      await enqueueDiaryUpload(payload);
      clearDiaryDraft();
      clearPhotoPreview();
      setStatus("网络不稳定，已加入上传队列。恢复网络后会自动上传。");
      return;
    }
    await publishDiaryPayload(payload);
  } catch (error) {
    if (isNetworkLikeError(error)) {
      await enqueueDiaryUpload(payload);
      clearDiaryDraft();
      clearPhotoPreview();
      setStatus("上传中断，已加入上传队列。恢复网络后会自动上传。");
      return;
    }
    setStatus(error.message || "上传失败。");
  } finally {
    uploadInFlight = false;
    setUploadSubmitting(false);
    void processDiaryUploadQueue();
  }
}

function getDiaryUploadPayload(finalTitle, files, linkUrls = []) {
  return {
    id: crypto.randomUUID(),
    userId: session?.user?.id || "",
    title: finalTitle,
    rawTitle: els.titleInput.value.trim(),
    note: els.noteInput.value.trim(),
    category: els.categoryInput.value,
    takenAt: els.dateInput.value,
    isPublic: els.publicInput.value === "true",
    createdAt: new Date().toISOString(),
    files: files.map((file) => ({
      file,
      name: file.name || "diary-image",
      type: file.type || "image/jpeg",
      size: file.size || 0,
      lastModified: file.lastModified || Date.now(),
    })),
    linkUrls: [...linkUrls],
  };
}

async function publishDiaryPayload(payload, { queued = false } = {}) {
  const images = [];
  const files = payload.files.map((entry) => entry.file);
  const finalTitle = payload.title || "";

  for (const [index, file] of files.entries()) {
    const safeName = getUploadFileNameBase(finalTitle, index, files.length);
    const imageData = await uploadImageFile(file, safeName, index + 1, files.length);
    if (!imageData) throw new Error("图片上传失败。");
    images.push(imageData);
  }
  const linkUrls = Array.isArray(payload.linkUrls) ? payload.linkUrls : [];
  for (const [index, url] of linkUrls.entries()) {
    const safeName = `${getUploadFileNameBase(finalTitle, files.length + index, files.length + linkUrls.length)}-link`;
    const copied = await copyUrlToR2(url, safeName, "photos");
    images.push({
      image_path: `r2:${copied.key}`,
      image_url: copied.url,
      thumbnail_path: "",
      thumbnail_url: copied.url,
      width: 0,
      height: 0,
    });
  }

  const insertError = await insertPhotoRecordFromPayload(payload, images);
  if (insertError) {
    throw new Error(insertError.message);
  }

  if (!queued) {
    els.uploadForm.reset();
    els.dateInput.valueAsDate = new Date();
    clearDiaryDraft();
    clearPhotoPreview();
    setUploadExpanded(false);
  }
  const localImages = images.filter((image) => Number.isFinite(image.original_size));
  const originalBytes = localImages.reduce((sum, image) => sum + image.original_size, 0);
  const uploadedBytes = localImages.reduce((sum, image) => sum + image.compressed_size, 0);
  const savings =
    originalBytes > 0 ? Math.max(0, Math.round((1 - uploadedBytes / originalBytes) * 100)) : 0;
  const compressionSummary = originalBytes
    ? ` 自动压缩 ${formatFileSize(originalBytes)} → ${formatFileSize(uploadedBytes)}，节省 ${savings}%。`
    : "";
  const gainedExp = await awardExperience("diary");
  setStatus(
    `${queued ? "队列日记已发布。" : images.length > 1 ? `已发布 1 篇合集，共 ${images.length} 张图。` : "上传完成。"}${compressionSummary}${gainedExp ? ` 修为 +${gainedExp}` : ""}`
  );
  await loadPhotos();
  switchPage("gallery");
  els.galleryHead?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function insertPhotoRecord(finalTitle, images) {
  return insertPhotoRecordFromPayload(
    {
      title: finalTitle,
      note: els.noteInput.value.trim(),
      category: els.categoryInput.value,
      takenAt: els.dateInput.value,
      isPublic: els.publicInput.value === "true",
    },
    images
  );
}

async function insertPhotoRecordFromPayload(payload, images) {
  const primaryImage = images[0];
  const record = {
    user_id: session.user.id,
    title: payload.title || "",
    note: composeDiaryStoredNote(payload.note || "", images),
    category: payload.category || "日常",
    taken_at: payload.takenAt || new Date().toISOString().slice(0, 10),
    is_public: payload.isPublic !== false,
    image_path: primaryImage.image_path,
    image_url: primaryImage.image_url,
    width: primaryImage.width,
    height: primaryImage.height,
  };

  const { error } = await diaryRepository.insert(record);
  return error;
}

function setUploadSubmitting(isSubmitting) {
  const submitButton = els.uploadForm?.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = Boolean(isSubmitting);
    submitButton.textContent = isSubmitting ? "上传中..." : "上传并发布";
  }
  els.uploadToggle.disabled = Boolean(isSubmitting);
}

function getDiaryDraftStorageKey(userId = session?.user?.id || "guest") {
  return `${DIARY_DRAFT_KEY}:${userId}`;
}

function getDiaryDraftPayload() {
  return {
    title: els.titleInput.value,
    note: els.noteInput.value,
    category: els.categoryInput.value,
    takenAt: els.dateInput.value,
    isPublic: els.publicInput.value,
    savedAt: new Date().toISOString(),
  };
}

function saveDiaryDraft() {
  if (!session || !els.uploadForm || els.uploadForm.hidden) return;
  const draft = getDiaryDraftPayload();
  const hasText = [draft.title, draft.note].some((value) => String(value || "").trim());
  const hasNonDefault =
    draft.category !== "日常" ||
    draft.isPublic !== "true" ||
    draft.takenAt !== new Date().toISOString().slice(0, 10);
  if (!hasText && !hasNonDefault) return;
  localStorage.setItem(getDiaryDraftStorageKey(), JSON.stringify(draft));
}

function restoreDiaryDraft() {
  if (!session) return;
  try {
    const raw = localStorage.getItem(getDiaryDraftStorageKey());
    if (!raw) return;
    const draft = JSON.parse(raw);
    els.titleInput.value = draft.title || "";
    els.noteInput.value = draft.note || "";
    els.categoryInput.value = draft.category || "日常";
    els.dateInput.value = draft.takenAt || els.dateInput.value || new Date().toISOString().slice(0, 10);
    els.publicInput.value = draft.isPublic || "true";
    setStatus("已恢复上次未发布的日记草稿。");
  } catch {
    localStorage.removeItem(getDiaryDraftStorageKey());
  }
}

function clearDiaryDraft() {
  localStorage.removeItem(getDiaryDraftStorageKey());
}

function isNetworkLikeError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return !navigator.onLine || message.includes("failed to fetch") || message.includes("network");
}

async function enqueueDiaryUpload(payload) {
  return diaryUploadQueue.enqueue(payload);
}

async function getQueuedDiaryUploads(userId = session?.user?.id || "") {
  return diaryUploadQueue.list(userId);
}

async function removeQueuedDiaryUpload(id) {
  return diaryUploadQueue.remove(id);
}

async function processDiaryUploadQueue() {
  if (uploadQueueProcessing || !session || !cloudDb || !navigator.onLine) return;
  uploadQueueProcessing = true;
  try {
    const queuedItems = await getQueuedDiaryUploads(session.user.id);
    if (!queuedItems.length) return;
    setStatus(`正在补传队列中的 ${queuedItems.length} 篇日记...`);
    for (const item of queuedItems) {
      await publishDiaryPayload(item, { queued: true });
      await removeQueuedDiaryUpload(item.id);
    }
    setStatus("上传队列已清空。");
  } catch (error) {
    setStatus(`上传队列等待网络恢复：${error.message || "稍后重试"}`);
  } finally {
    uploadQueueProcessing = false;
    void renderUploadCenter();
  }
}
function compressImage(file, options = null) {
  return imageService.compressImage(file, options);
}

async function uploadImageFile(file, safeName, index = 1, total = 1, options = {}) {
  const folder = options.folder || "photos";
  const statusSetter = options.statusSetter || setStatus;
  const prefix = total > 1 ? `${index}/${total} · ` : "";
  statusSetter(`${prefix}正在自动压缩图片...`);
  let compressed;
  try {
    compressed = await compressImage(file);
  } catch (error) {
    statusSetter(error.message || "图片压缩失败。");
    return null;
  }
  statusSetter(
    `${prefix}已压缩 ${formatFileSize(file.size)} → ${formatFileSize(compressed.blob.size)}，正在上传...`
  );
  try {
    const uploaded = await uploadToR2(compressed.blob, safeName, folder);
    let thumbnail = null;
    if (options.thumbnail !== false && Math.max(compressed.width, compressed.height) > 720) {
      try {
        const thumbCompressed = await compressImage(file, {
          maxSide: 640,
          targetBytes: 140 * 1024,
          jpeg: 0.76,
          minJpeg: 0.5,
          rotatePortrait: false,
        });
        thumbnail = await uploadToR2(thumbCompressed.blob, `${safeName}-thumb`, `${folder}-thumbs`);
      } catch (error) {
        console.warn("Thumbnail upload skipped:", error);
      }
    }
    return {
      image_path: `r2:${uploaded.key}`,
      image_url: uploaded.url,
      thumbnail_path: thumbnail?.key ? `r2:${thumbnail.key}` : "",
      thumbnail_url: thumbnail?.url || uploaded.url,
      width: compressed.width,
      height: compressed.height,
      original_size: compressed.originalBytes,
      compressed_size: compressed.compressedBytes,
    };
  } catch (error) {
    statusSetter(`R2 上传失败：${error.message}`);
    return null;
  }
}
async function uploadToR2(blob, safeName, folder = "photos") {
  return imageService.uploadToR2(blob, safeName, folder);
}
async function copyUrlToR2(url, safeName, folder = "migrated") {
  return imageService.copyUrlToR2(url, safeName, folder);
}

function isR2Path(path) {
  return String(path || "").startsWith("r2:");
}

function isR2Url(url) {
  const value = String(url || "");
  return Boolean(R2_PUBLIC_URL && value.startsWith(`${R2_PUBLIC_URL.replace(/\/+$/, "")}/`));
}

function getR2Key(path) {
  return String(path || "").replace(/^r2:/, "");
}

function getLegacyStoragePublicUrl(path) {
  return path && !isR2Path(path) ? "" : "";
}

function getLegacyStoragePathFromPublicUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const value = String(url || "");
  const index = value.indexOf(marker);
  if (index === -1) return "";
  return decodeURIComponent(value.slice(index + marker.length).split("?")[0]);
}

function isLegacyStorageAsset(url, path = "") {
  if (path && !isR2Path(path)) return true;
  return Boolean(getLegacyStoragePathFromPublicUrl(url));
}

function isDataImageUrl(url) {
  return String(url || "").startsWith("data:image/");
}

function shouldMigrateImageAsset(url, path = "") {
  if (!url && !path) return false;
  if (isR2Path(path) || isR2Url(url)) return false;
  return isLegacyStorageAsset(url, path) || isDataImageUrl(url);
}

async function uploadDataUrlToR2(dataUrl, safeName, folder) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Could not read data image.");
  const blob = await response.blob();
  const file = new File([blob], `${safeName}.jpg`, { type: blob.type || "image/jpeg" });
  const compressed = await compressImage(file, {
    maxSide: 1600,
    jpeg: 0.84,
    minJpeg: 0.62,
    targetBytes: 650_000,
  });
  return uploadToR2(compressed.blob, safeName, folder);
}

async function migrateImageAsset({ url = "", path = "", name = "image", folder = "migrated" }) {
  if (!shouldMigrateImageAsset(url, path)) {
    return { changed: false, image_url: url, image_path: path, oldPath: "" };
  }

  const safeName = slugify(name || folder || "image");
  const sourceUrl = isDataImageUrl(url) ? url : url || getLegacyStoragePublicUrl(path);
  if (!sourceUrl) {
    return { changed: false, image_url: url, image_path: path, oldPath: "" };
  }

  const uploaded = isDataImageUrl(sourceUrl)
    ? await uploadDataUrlToR2(sourceUrl, safeName, folder)
    : await copyUrlToR2(sourceUrl, safeName, folder);
  const oldPath = path && !isR2Path(path) ? path : getLegacyStoragePathFromPublicUrl(url);
  return {
    changed: true,
    image_url: uploaded.url,
    image_path: `r2:${uploaded.key}`,
    oldPath,
  };
}
async function deleteR2Object(path) {
  return imageService.deleteR2Object(getR2Key(path));
}

async function cleanupStoredImagePaths(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const r2Paths = uniquePaths.filter(isR2Path);
  const errors = [];

  for (const path of r2Paths) {
    try {
      await deleteR2Object(path);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw errors[0];
}

function renderGallery() {
  renderOverview();
  updateTodayPostsNotice();
  const sortedPhotos = getSortedPhotos(photos);
  const categoryFiltered =
    activeFilter === "全部"
      ? sortedPhotos
      : activeFilter === "featured7"
        ? sortedPhotos.filter(
            (photo) => Boolean(photo.is_featured) && isPhotoWithinSevenDays(photo)
          )
        : activeFilter === "favorites"
          ? sortedPhotos.filter((photo) => favoritePhotoIds.has(photo.id))
          : sortedPhotos.filter((photo) => photo.category === activeFilter);
  const filtered = filterPhotosBySearch(categoryFiltered);

  filteredPhotoCount = filtered.length;
  visiblePhotoCount = Math.min(
    Math.max(PAGE_SIZE, visiblePhotoCount),
    Math.max(PAGE_SIZE, filteredPhotoCount)
  );
  const visible = filtered.slice(0, visiblePhotoCount);
  const nextSignature = JSON.stringify({
    filter: activeFilter,
    search: diarySearchQuery,
    layout: document.body.dataset.mobileFeedLayout || "",
    visible: visiblePhotoCount,
    favorites: [...favoritePhotoIds].sort(),
    photos: visible.map((photo) => [photo.id, photo.updated_at, photo.is_featured, photo.is_pinned, getPhotoImages(photo).length]),
    comments: visible.map((photo) => (photoCommentPreviewMap.get(photo.id) || []).map((comment) => [comment.id, comment.updated_at, comment.body])),
  });
  if (nextSignature === galleryRenderSignature && els.gallery.childElementCount) {
    updateFeedLoader(filteredPhotoCount);
    return;
  }
  galleryRenderSignature = nextSignature;

  if (!visible.length) {
    const emptyMessage =
      diarySearchQuery
        ? "没有找到匹配的日记。换个日期或关键词试试看。"
        : activeFilter === "featured7"
        ? "最近七天还没有精选日记。"
        : activeFilter === "favorites"
          ? session
            ? "还没有收藏日记。"
            : "登录后可以收藏喜欢的日记。"
          : "还没有这个分类的日记。";
    els.gallery.innerHTML = `<div class="empty">${emptyMessage}</div>`;
    updateFeedLoader(0);
    return;
  }

  els.gallery.innerHTML = visible
    .map(
        (photo, index) => {
          const canManage = Boolean(session && (!photo.user_id || photo.user_id === session.user.id));
          const canAdminCategorize = Boolean(session && isAdminAccount() && photo.user_id && photo.user_id !== session.user.id);
          const displayTitle = getDisplayTitle(photo);
          const images = getPhotoImages(photo);
          const noteText = getPlainNote(photo);
          const sequence = String(index + 1).padStart(2, "0");
          const titleMarkup = displayTitle ? `<h3>${escapeHtml(displayTitle)}</h3>` : "";
          const noteMarkup = noteText
            ? `<p class="diary-excerpt">${escapeHtml(noteText)}</p><span class="read-more-hint" hidden>点击阅读全文</span>`
            : "";
          return `
        <article class="photo-card" data-photo-id="${escapeHtml(photo.id || "")}">
          <span class="strand-index">${sequence}</span>
          <div class="photo-status-badges">
            ${photo.is_pinned ? `<span class="pin-badge">置顶</span>` : ""}
            ${photo.is_featured ? `<span class="featured-badge">精选</span>` : ""}
          </div>
          <div class="photo-open">
            ${renderPhotoMedia(images, displayTitle, index)}
            <button class="photo-copy-open" type="button" data-photo-index="${index}" data-image-index="0">
              <p class="kicker diary-card-meta">
                <span>${formatDate(photo.taken_at || photo.created_at)}</span>
                <span class="diary-card-author">
                  ${renderAvatarMarkup(photo.user_id, "diary-card-author-avatar")}
                  <span>${escapeHtml(getAuthorName(photo.user_id))}</span>
                </span>
              </p>
              ${titleMarkup}
              ${noteMarkup}
            </button>
          </div>
          <div class="card-actions">
            ${
              session
                ? `<button class="favorite-photo ${favoritePhotoIds.has(photo.id) ? "active" : ""}" type="button" data-favorite-index="${index}">
                    ${favoritePhotoIds.has(photo.id) ? "♥ 已收藏" : "♡ 收藏"}
                  </button>`
                : ""
            }
            ${
              canManage
                ? `<button class="feature-photo ${photo.is_featured ? "active" : ""}" type="button" data-feature-index="${index}">
                    ${photo.is_featured ? "取消精选" : "设为精选"}
                  </button>
                  <button class="pin-photo ${photo.is_pinned ? "active" : ""}" type="button" data-pin-index="${index}">
                    ${photo.is_pinned ? "取消置顶" : "置顶"}
                  </button>
                  <button class="edit-photo" type="button" data-edit-index="${index}" title="编辑日记">编辑</button>
                  <button class="delete-photo" type="button" data-delete-index="${index}" title="删除日记">删除</button>`
                : ""
            }
            ${canAdminCategorize ? `<button class="edit-photo" type="button" data-admin-category-index="${index}" title="管理员修改分类">修改分类</button>` : ""}
          </div>
          ${renderPhotoCommentPreview(photo.id, index)}
        </article>
      `;
      }
    )
    .join("");

  els.gallery.querySelectorAll(".photo-media").forEach((media) => {
    media.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest("button[data-photo-index][data-image-index]");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        openPhoto(
          visible[Number(button.dataset.photoIndex)],
          Number(button.dataset.imageIndex)
        );
      },
      true
    );
  });

  els.gallery.querySelectorAll("button[data-photo-index][data-image-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openPhoto(
        visible[Number(button.dataset.photoIndex)],
        Number(button.dataset.imageIndex)
      );
    });
  });

  els.gallery.querySelectorAll("button[data-delete-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      await deletePhoto(visible[Number(button.dataset.deleteIndex)], button);
    });
  });

  els.gallery.querySelectorAll("button[data-favorite-index]").forEach((button) => {
    button.addEventListener("click", () => {
      togglePhotoFavorite(visible[Number(button.dataset.favoriteIndex)], button);
    });
  });

  els.gallery.querySelectorAll("button[data-feature-index]").forEach((button) => {
    button.addEventListener("click", () => {
      togglePhotoFlag(visible[Number(button.dataset.featureIndex)], "is_featured");
    });
  });

  els.gallery.querySelectorAll("button[data-pin-index]").forEach((button) => {
    button.addEventListener("click", () => {
      togglePhotoFlag(visible[Number(button.dataset.pinIndex)], "is_pinned");
    });
  });

  els.gallery.querySelectorAll("button[data-edit-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openEditPhoto(visible[Number(button.dataset.editIndex)]);
    });
  });

  els.gallery.querySelectorAll("button[data-admin-category-index]").forEach((button) => {
    button.addEventListener("click", () => {
      void adminUpdatePhotoCategory(visible[Number(button.dataset.adminCategoryIndex)]);
    });
  });

  els.gallery.querySelectorAll("button[data-open-comments-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openPhoto(visible[Number(button.dataset.openCommentsIndex)]);
    });
  });

  prepareFeedImages(els.gallery);
  updateReadMoreHints(els.gallery);
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

async function togglePhotoFlag(photo, field) {
  if (!cloudDb || !session || !photo || photo.user_id !== session.user.id) return;
  const label = field === "is_pinned" ? "置顶" : "精选";
  if (!photoFlagsCloudAvailable) {
    setGlobalStatus(`Cloudflare D1 尚未启用${label}字段，请先部署最新版数据库结构。`);
    return;
  }
  const nextValue = !Boolean(photo[field]);
  setGlobalStatus(`正在更新${label}状态...`);

  const { data, error } = await diaryRepository.updateOwned(
    photo.id,
    { [field]: nextValue },
    { select: "id,is_featured,is_pinned", single: true }
  );

  if (error) {
    setGlobalStatus(
      isMissingCloudSchema(error)
        ? `请先部署最新版 Cloudflare D1 结构，再使用${label}功能。`
        : `${label}更新失败：${error.message}`
    );
    return;
  }

  Object.assign(photo, data);
  setGlobalStatus(nextValue ? `已设为${label}。` : `已取消${label}。`);
  renderGallery();
}

async function togglePhotoFavorite(photo, button) {
  if (!session || !photo) {
    setGlobalStatus("登录后可以收藏日记。");
    return;
  }

  if (!favoritesCloudAvailable) {
    setGlobalStatus("Cloudflare D1 尚未启用收藏表，请先部署最新版数据库结构。");
    return;
  }

  const wasFavorite = favoritePhotoIds.has(photo.id);
  button.disabled = true;
  favoritePhotoIds[wasFavorite ? "delete" : "add"](photo.id);
  button.classList.toggle("active", !wasFavorite);
  button.classList.toggle("is-active", !wasFavorite);
  button.setAttribute("aria-pressed", String(!wasFavorite));
  button.innerHTML = button.hasAttribute("data-mobile-diary-favorite")
    ? `<span class="mobile-diary-action-mark" aria-hidden="true">${wasFavorite ? "♡" : "♥"}</span><span>${wasFavorite ? "收藏" : "已收藏"}</span>`
    : `${wasFavorite ? "♡ 收藏" : "♥ 已收藏"}`;
  const { error } = await diaryRepository.setFavorite(photo.id, !wasFavorite);
  if (error) {
    favoritePhotoIds[wasFavorite ? "add" : "delete"](photo.id);
    renderGallery();
    if (!mobileDiaryPage?.hidden && mobileDiaryPhoto?.id === photo.id) renderMobileDiaryPage();
    setGlobalStatus(`收藏更新失败：${error.message}`);
    return;
  }

  saveLocalFavoritePhotoIds();
  setGlobalStatus(wasFavorite ? "已取消收藏。" : "已收藏。");
  renderGallery();
}

function renderPhotoMedia(images, title, photoIndex) {
  const altText = title || "日记图片";
  if (images.length <= 1) {
    const image = images[0] || {};
    return `
      <div class="photo-media single"${getPhotoAspectStyle(image)}>
        <button type="button" data-photo-index="${photoIndex}" data-image-index="0">
          ${renderFeedImage(image, altText, photoIndex, 0)}
        </button>
      </div>
    `;
  }

  const previewImages = images.slice(0, 9);
  return `
    <div class="photo-media collage count-${previewImages.length}">
      ${previewImages
        .map(
          (image, index) => `
            <button type="button" data-photo-index="${photoIndex}" data-image-index="${index}">
              ${renderFeedImage(image, `${altText} ${index + 1}`, photoIndex, index)}
            </button>
          `
        )
        .join("")}
      <span class="media-count">${images.length} 张</span>
    </div>
  `;
}

function renderFeedImage(image, altText, photoIndex, imageIndex) {
  const eagerCount = isMobileViewport() ? 2 : EAGER_IMAGE_CARD_COUNT;
  const loading = photoIndex < eagerCount ? "eager" : "lazy";
  const fetchPriority = photoIndex < (isMobileViewport() ? 1 : 2) && imageIndex === 0 ? "high" : "low";
  const width = Number(image?.width);
  const height = Number(image?.height);
  const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${Math.round(width)}"` : "";
  const heightAttr = Number.isFinite(height) && height > 0 ? ` height="${Math.round(height)}"` : "";

  return `<img class="feed-image" src="${escapeHtml(image?.thumbnail_url || image?.image_url || "")}" data-full-src="${escapeHtml(image?.image_url || "")}" alt="${escapeHtml(altText)}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"${widthAttr}${heightAttr} />`;
}

function getPhotoAspectStyle(image) {
  return ` style="aspect-ratio: ${getPhotoAspectRatio(image)};"`;
}

function getPhotoAspectRatio(image) {
  const width = Number(image?.width);
  const height = Number(image?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "0.8";
  }

  const ratio = width / height;
  return String(Math.min(1.55, Math.max(0.72, ratio)).toFixed(3));
}

function prepareFeedImages(root = document) {
  root.querySelectorAll("img.feed-image, img.secret-progressive-image").forEach((image) => {
    const markLoaded = () => {
      image.classList.add("is-loaded");
      image.closest("button")?.classList.add("media-loaded");
    };

    if (image.complete) {
      markLoaded();
      return;
    }

    image.addEventListener("load", markLoaded, { once: true });
    image.addEventListener("error", markLoaded, { once: true });
  });
}

function updateReadMoreHints(root = document) {
  root.querySelectorAll(".diary-excerpt").forEach((excerpt) => {
    const hint = excerpt.nextElementSibling;
    if (!hint?.classList.contains("read-more-hint")) return;
    const isClamped = excerpt.scrollHeight > excerpt.clientHeight + 1;
    hint.hidden = !isClamped;
  });
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
    image_url: photo.image_url,
    image_path: photo.image_path || "",
    width: photo.width ?? null,
    height: photo.height ?? null,
    thumbnail_url: photo.thumbnail_url || "",
    thumbnail_path: photo.thumbnail_path || "",
  };
  const images = storedImages.length ? storedImages : [primary];
  const seen = new Set();

  return images
    .filter((image) => image?.image_url)
    .map((image) => ({
      image_url: image.image_url || image.url,
      image_path: image.image_path || image.path || "",
      width: image.width ?? null,
      height: image.height ?? null,
      thumbnail_url: image.thumbnail_url || image.thumb_url || "",
      thumbnail_path: image.thumbnail_path || image.thumb_path || "",
    }))
    .filter((image) => {
      if (seen.has(image.image_url)) return false;
      seen.add(image.image_url);
      return true;
    });
}

function getPlainNote(photo) {
  return stripDiaryMediaMetadata(photo.note || "");
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
  updateDiaryViewerToolbar();
  updateSecretViewerToolbar();
}

function updateDiaryViewerToolbar() {
  if (!els.diaryViewerToolbar) return;
  const isOpen = Boolean(els.dialog?.classList.contains("diary-image-fullscreen"));
  els.diaryViewerToolbar.hidden = !isOpen;
  if (!isOpen) return;
  const total = Math.max(1, dialogImages.length);
  els.diaryViewerCounter.textContent = `${Math.min(dialogImageIndex + 1, total)} / ${total}`;
  els.diaryViewerZoomValue.textContent = `${Math.round(secretImageZoom.scale * 100)}%`;
  els.diaryViewerPrev.disabled = total <= 1;
  els.diaryViewerNext.disabled = total <= 1;
}

function updateSecretViewerToolbar() {
  if (!els.secretViewerToolbar) return;
  const isOpen = Boolean(isSecretImageDialogOpen() && els.dialog.classList.contains("secret-image-fullscreen"));
  els.secretViewerToolbar.hidden = !isOpen;
  if (!isOpen) return;
  const total = Math.max(1, dialogImages.length);
  els.secretViewerCounter.textContent = `${Math.min(dialogImageIndex + 1, total)} / ${total}`;
  els.secretViewerZoomValue.textContent = `${Math.round(secretImageZoom.scale * 100)}%`;
  els.secretViewerPrev.disabled = dialogImageIndex <= 0;
  els.secretViewerNext.disabled = dialogImageIndex >= total - 1;
  els.secretViewerZoomOut.disabled = secretImageZoom.scale <= 1.01;
  els.secretViewerZoomIn.disabled = secretImageZoom.scale >= 5.99;
  els.secretViewerInfo.setAttribute("aria-pressed", String(secretViewerInfoOpen));
  els.secretViewerInfo.classList.toggle("active", secretViewerInfoOpen);
}

function setSecretViewerStatus(state, message = "") {
  if (!els.secretViewerStatus) return;
  const visible = Boolean(state);
  els.secretViewerStatus.hidden = !visible;
  els.secretViewerStatus.dataset.state = state || "";
  els.secretViewerStatusText.textContent = message || (state === "error" ? "图片加载失败" : "正在加载图片");
}

function fitSecretViewerImage() {
  if (!isFittableImageDialogOpen() || !els.dialogImage?.naturalWidth || !els.dialogMedia) return;
  const mediaStyle = getComputedStyle(els.dialogMedia);
  const availableWidth = Math.max(
    1,
    els.dialogMedia.clientWidth - parseFloat(mediaStyle.paddingLeft || 0) - parseFloat(mediaStyle.paddingRight || 0)
  );
  const availableHeight = Math.max(
    1,
    els.dialogMedia.clientHeight - parseFloat(mediaStyle.paddingTop || 0) - parseFloat(mediaStyle.paddingBottom || 0)
  );
  const fitScale = Math.min(
    availableWidth / els.dialogImage.naturalWidth,
    availableHeight / els.dialogImage.naturalHeight
  );
  els.dialogImage.style.setProperty(
    "width",
    `${Math.max(1, els.dialogImage.naturalWidth * fitScale)}px`,
    "important"
  );
  els.dialogImage.style.setProperty(
    "height",
    `${Math.max(1, els.dialogImage.naturalHeight * fitScale)}px`,
    "important"
  );
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

function getTouchDistance(touches) {
  const [first, second] = touches;
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function getTouchCenter(touches) {
  const [first, second] = touches;
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
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
    // Once the image is zoomed, the wheel belongs to the image rather than
    // the carousel, so tall and wide images remain navigable without jumps.
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
  const imageUrl = image.image_url || "";
  const imageRequestId = ++dialogImageRequestId;
  const secretTags = normalizeSecretPhotoTags(image);
  els.dialogImage.classList.toggle("is-loading", Boolean(imageUrl));
  els.dialogImage.classList.remove("is-load-error");
  els.dialogImage.dataset.dialogImageRequestId = String(imageRequestId);
  els.dialogImage.removeAttribute("src");
  if (isSecretImageViewerOpen()) {
    setSecretViewerStatus(imageUrl ? "loading" : "", imageUrl ? "正在加载图片" : "");
  }
  if (imageUrl) {
    // Preload the selected image before attaching it to the visible img. This
    // prevents the previous diary image from flashing while the new one loads.
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
  if (isFittableImageDialogOpen()) {
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
  els.dialogImage.alt = `${els.dialogTitle.textContent} ${dialogImageIndex + 1}`;
  if (entryDirection) {
    els.dialogImage.style.transition = "none";
    els.dialogImage.style.transform = `translate3d(${entryDirection * 24}vw, 0, 0)`;
    els.dialogImage.style.opacity = "0.6";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        els.dialogImage.style.transition = "transform 190ms cubic-bezier(0.22, 0.78, 0.2, 1), opacity 170ms ease";
        els.dialogImage.style.transform = "translate3d(0, 0, 0)";
        els.dialogImage.style.opacity = "1";
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
  const hasMultiple = dialogImages.length > 1;
  els.dialogPrev.hidden = !hasMultiple;
  els.dialogNext.hidden = !hasMultiple;
  els.dialogCounter.hidden = !hasMultiple;
  els.dialogDots.hidden = !hasMultiple;
  els.dialogThumbs.hidden = !hasMultiple;
  els.dialogCounter.textContent = hasMultiple
    ? `${dialogImageIndex + 1}/${dialogImages.length}`
    : "";
  els.dialogPrev.disabled = activeSecretDialogItem ? dialogImageIndex <= 0 : !hasMultiple;
  els.dialogNext.disabled = activeSecretDialogItem ? dialogImageIndex >= dialogImages.length - 1 : !hasMultiple;
  updateSecretViewerToolbar();

  if (!hasMultiple) {
    els.dialogDots.innerHTML = "";
    els.dialogThumbs.innerHTML = "";
    bindSecretDialogControls();
    return;
  }

  els.dialogDots.innerHTML = dialogImages
    .map(
      (_, index) => `
        <button
          class="${index === dialogImageIndex ? "active" : ""}"
          type="button"
          role="tab"
          data-dialog-dot="${index}"
          aria-label="查看第 ${index + 1} 张"
          aria-selected="${index === dialogImageIndex}"
        ></button>
      `
    )
    .join("");

  els.dialogThumbs.innerHTML = dialogImages
    .map(
      (thumb, index) => `
        <button class="${index === dialogImageIndex ? "active" : ""}" type="button" data-dialog-thumb="${index}" aria-label="查看第 ${index + 1} 张">
          <img src="${escapeHtml(thumb.image_url)}" alt="" />
        </button>
      `
    )
    .join("");

  els.dialogThumbs.querySelectorAll("button[data-dialog-thumb]").forEach((button) => {
    button.addEventListener("click", () => {
      dialogImageIndex = Number(button.dataset.dialogThumb);
      renderDialogMedia();
    });
  });
  bindSecretDialogControls();
}

function renderSecretDialogControls(image) {
  const tags = normalizeSecretPhotoTags(image);
  const favorite = Boolean(image?.favorite);
  return `
    <div class="secret-dialog-tools secret-dialog-readonly-tools">
      <button class="secret-dialog-favorite ${favorite ? "active" : ""}" type="button" data-secret-dialog-favorite>
        ${favorite ? "♥ 已收藏" : "♡ 收藏"}
      </button>
      <div class="secret-dialog-current-tags">
        <span>展品 Tag</span>
        <div>
        ${tags
          .map(
            (tag) => `
              <button type="button" data-secret-dialog-remove-tag="${escapeHtml(tag)}">
                ${escapeHtml(tag)} <b>×</b>
              </button>
            `
          )
          .join("")}
        </div>
      </div>
      <form class="secret-dialog-add-tag" data-secret-dialog-tag-form>
        <label>
          <span>添加 Tag</span>
          <input name="secretDialogTag" maxlength="32" list="secretCategoryList" autocomplete="off" placeholder="输入或选择已有 Tag" />
        </label>
        <button type="submit">添加</button>
      </form>
      <p data-secret-dialog-status></p>
    </div>
  `;
}

function bindSecretDialogControls() {
  // Controls are rendered before showModal() opens the dialog, so checking
  // dialog.open here prevents every tag/favorite handler from being attached.
  if (!activeSecretDialogItem) return;
  els.dialogNote.querySelector("[data-secret-dialog-favorite]")?.addEventListener("click", () => {
    const current = dialogImages[dialogImageIndex] || {};
    void updateSecretDialogImage({ favorite: !current.favorite });
  });
  els.dialogNote.querySelectorAll("[data-secret-dialog-remove-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      void updateSecretDialogImage({ removeTag: button.dataset.secretDialogRemoveTag || "" });
    });
  });
  els.dialogNote.querySelector("[data-secret-dialog-tag-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.secretDialogTag;
    const tag = String(input?.value || "").trim();
    if (!tag) return;
    void updateSecretDialogImage({ addTag: tag });
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

function isEdgeBackSwipe(start, event, { threshold = 72, ratio = 1.35, maxElapsed = 1200 } = {}) {
  if (!start) return false;
  const deltaX = event.clientX - start.x;
  const deltaY = Math.abs(event.clientY - start.y);
  const elapsed = Date.now() - start.time;
  const fromLeft = start.edge === "left" && deltaX > threshold;
  const fromRight = start.edge === "right" && deltaX < -threshold;
  return (fromLeft || fromRight) && Math.abs(deltaX) > deltaY * ratio && elapsed < maxElapsed;
}

function getMobileBackEdge(clientX) {
  if (!isMobileViewport()) return "";
  const edgeSize = 38;
  if (clientX <= edgeSize) return "left";
  if (clientX >= window.innerWidth - edgeSize) return "right";
  return "";
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
    return getPhotoImages(payload).flatMap((image) => [image.image_path, image.thumbnail_path]).filter(Boolean);
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
    const trashSaved = await createTrashItem("photo", photo.id, getPhotoLabel(photo), photo);
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
    favoritePhotoIds.delete(photo.id);
    saveLocalFavoritePhotoIds();
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
  if (isSecretImageViewerOpen()) {
    toggleDialogImageFullscreen();
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
  els.dialog.classList.remove("secret-image-dialog", "mobile-page-dialog", "secret-image-fullscreen");
  els.dialog.classList.add("no-comments-dialog", "mobile-diary-image-viewer");
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
  mobileDiaryPage = document.createElement("section");
  mobileDiaryPage.className = "mobile-diary-page";
  mobileDiaryPage.hidden = true;
  mobileDiaryPage.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-mobile-diary-close]");
    if (closeButton) {
      closeMobileDiaryPage();
      return;
    }
    const imageButton = event.target.closest("[data-mobile-diary-image]");
    if (imageButton) {
      mobileDiaryImageIndex = Number(imageButton.dataset.mobileDiaryImage) || 0;
      renderMobileDiaryPage();
      return;
    }
    const openImageButton = event.target.closest("[data-mobile-diary-open-image]");
    if (openImageButton && mobileDiaryPhoto) {
      if (Date.now() < mobileDiarySuppressImageClickUntil) return;
      openMobileDiaryImageViewer();
      return;
    }
    const replyButton = event.target.closest("[data-mobile-diary-reply]");
    if (replyButton) {
      startMobileDiaryReply(replyButton.dataset.mobileDiaryReply);
      return;
    }
    const deleteButton = event.target.closest("[data-mobile-diary-delete-comment]");
    if (deleteButton) {
      void deletePhotoComment(deleteButton.dataset.mobileDiaryDeleteComment);
      return;
    }
    const cancelReply = event.target.closest("[data-mobile-diary-cancel-reply]");
    if (cancelReply) {
      cancelMobileDiaryReply();
      return;
    }
    const favoriteButton = event.target.closest("[data-mobile-diary-favorite]");
    if (favoriteButton && mobileDiaryPhoto) {
      void togglePhotoFavorite(mobileDiaryPhoto, favoriteButton).then(() => {
        if (!mobileDiaryPage?.hidden && mobileDiaryPhoto) renderMobileDiaryPage();
      });
      return;
    }
    if (event.target.closest("[data-mobile-diary-edit]") && mobileDiaryPhoto) {
      const photo = mobileDiaryPhoto;
      closeMobileDiaryPage();
      openEditPhoto(photo);
      return;
    }
    if (event.target.closest("[data-mobile-diary-admin-category]") && mobileDiaryPhoto) {
      void adminUpdatePhotoCategory(mobileDiaryPhoto);
      return;
    }
    if (event.target.closest("[data-mobile-diary-delete]") && mobileDiaryPhoto) {
      const photo = mobileDiaryPhoto;
      void deletePhoto(photo).then((deleted) => {
        if (deleted) closeMobileDiaryPage();
      });
    }
  });
  mobileDiaryPage.addEventListener("submit", (event) => {
    if (event.target.matches("[data-mobile-diary-comment-form]")) {
      void saveMobileDiaryComment(event);
    }
  });
  mobileDiaryPage.addEventListener("pointerdown", beginMobileDiaryBackSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointermove", moveMobileDiaryBackSwipe, { passive: false });
  mobileDiaryPage.addEventListener("pointerup", endMobileDiaryBackSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointerdown", beginMobileDiaryImageSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointermove", moveMobileDiaryImageSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointerup", endMobileDiaryImageSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointercancel", () => {
    cancelMobileDiaryBackSwipe();
    cancelMobileDiaryImageSwipe();
  });
  document.body.append(mobileDiaryPage);
  return mobileDiaryPage;
}

function renderMobileDiaryCommentTree() {
  if (!photoComments.length) return `<p class="photo-comments-empty">还没有留言。</p>`;
  const byParent = new Map();
  photoComments.forEach((comment) => {
    const parentId = comment.parent_id || "root";
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(comment);
  });
  const renderBranch = (parentId = "root", depth = 0) =>
    (byParent.get(parentId) || [])
      .map((comment) => {
        const replyTarget = comment.parent_id
          ? photoComments.find((item) => item.id === comment.parent_id)
          : null;
        const isAuthor = comment.user_id === mobileDiaryPhoto?.user_id;
        return `
          <div class="photo-comment-thread" style="--comment-depth:${Math.min(depth, 3)}">
            <article class="photo-comment">
              ${renderAvatarMarkup(comment.user_id)}
              <div class="photo-comment-main">
                <header>
                  <span class="photo-comment-author-line">
                    <strong>${escapeHtml(getAuthorName(comment.user_id))}</strong>
                    ${isAuthor ? `<small class="photo-comment-author-badge">作者</small>` : ""}
                  </span>
                </header>
                ${replyTarget ? `<small class="reply-target">回复 ${escapeHtml(getAuthorName(replyTarget.user_id))}</small>` : ""}
                <p>${escapeHtml(comment.body)}</p>
                <time>${formatCommentTime(comment.created_at)}</time>
                <div class="photo-comment-actions">
                  <button type="button" data-mobile-diary-reply="${escapeHtml(comment.id)}">回复</button>
                  ${comment.user_id === session?.user?.id ? `<button type="button" data-mobile-diary-delete-comment="${escapeHtml(comment.id)}">删除</button>` : ""}
                </div>
              </div>
            </article>
            ${renderBranch(comment.id, depth + 1)}
          </div>
        `;
      })
      .join("");
  return renderBranch();
}

function renderMobileDiaryComments() {
  if (!mobileDiaryPage || mobileDiaryPage.hidden) return;
  const list = mobileDiaryPage.querySelector("[data-mobile-diary-comments]");
  if (list) list.innerHTML = renderMobileDiaryCommentTree();
  const heading = mobileDiaryPage.querySelector(".photo-comments-head h3");
  if (heading) heading.textContent = `共 ${photoComments.length} 条评论`;
  const replyBar = mobileDiaryPage.querySelector("[data-mobile-diary-replying]");
  const replyText = mobileDiaryPage.querySelector("[data-mobile-diary-replying-text]");
  const input = mobileDiaryPage.querySelector("[data-mobile-diary-comment-input]");
  const replyComment = photoComments.find((item) => item.id === mobileDiaryReplyToId);
  if (replyBar) replyBar.hidden = !replyComment;
  if (replyText) replyText.textContent = replyComment ? `正在回复 ${getAuthorName(replyComment.user_id)}` : "";
  if (input) input.placeholder = replyComment ? `回复 ${getAuthorName(replyComment.user_id)}` : "给这篇日记留句话";
}

function renderMobileDiaryPage() {
  const page = ensureMobileDiaryPage();
  const photo = mobileDiaryPhoto;
  if (!photo) return;
  const images = getPhotoImages(photo);
  mobileDiaryImageIndex = Math.min(Math.max(0, mobileDiaryImageIndex), Math.max(0, images.length - 1));
  const image = images[mobileDiaryImageIndex] || images[0] || {};
  const canComment = Boolean(
    session &&
      photo &&
      (photo.user_id === session.user.id || familyMemberMap.has(photo.user_id))
  );
  const canManageDiary = Boolean(session && photo.user_id === session.user.id);
  const canAdminCategorize = Boolean(session && isAdminAccount() && photo.user_id && photo.user_id !== session.user.id);
  page.innerHTML = `
    <button class="mobile-diary-close" type="button" data-mobile-diary-close aria-label="返回">返回</button>
    <div class="mobile-diary-media">
      <button class="mobile-diary-image-button" type="button" data-mobile-diary-open-image aria-label="放大查看日记图片">
        <img src="${escapeHtml(image.image_url || "")}" alt="${escapeHtml(getDisplayTitle(photo) || "日记图片")}" />
      </button>
      ${images.length > 1 ? `<span>${mobileDiaryImageIndex + 1} / ${images.length}</span>` : ""}
    </div>
    ${
      images.length > 1
        ? `<div class="mobile-diary-thumbs">
            ${images
              .map(
                (thumb, index) => `
                  <button class="${index === mobileDiaryImageIndex ? "active" : ""}" type="button" data-mobile-diary-image="${index}">
                    <img src="${escapeHtml(thumb.image_url)}" alt="" />
                  </button>
                `
              )
              .join("")}
          </div>`
        : ""
    }
    <article class="mobile-diary-article">
      <p class="kicker mobile-diary-meta">
        <span>${escapeHtml(photo.category || "日常")} · ${formatDateTime(photo.created_at)}</span>
        <span class="diary-card-author">
          ${renderAvatarMarkup(photo.user_id, "diary-card-author-avatar")}
          <span>${escapeHtml(getAuthorName(photo.user_id))}</span>
        </span>
      </p>
      ${getDisplayTitle(photo) ? `<h1>${escapeHtml(getDisplayTitle(photo))}</h1>` : ""}
      ${getPlainNote(photo) ? `<p class="mobile-diary-note">${escapeHtml(getPlainNote(photo))}</p>` : ""}
      ${session ? `<div class="mobile-diary-actions" aria-label="日记操作">
        <button class="mobile-diary-action ${favoritePhotoIds.has(photo.id) ? "is-active" : ""}" type="button" data-mobile-diary-favorite aria-pressed="${favoritePhotoIds.has(photo.id)}">
          <span class="mobile-diary-action-mark" aria-hidden="true">${favoritePhotoIds.has(photo.id) ? "♥" : "♡"}</span>
          <span>${favoritePhotoIds.has(photo.id) ? "已收藏" : "收藏"}</span>
        </button>
        ${canManageDiary ? `<button class="mobile-diary-action" type="button" data-mobile-diary-edit><span class="mobile-diary-action-mark" aria-hidden="true">编</span><span>编辑</span></button>` : ""}
        ${canAdminCategorize ? `<button class="mobile-diary-action" type="button" data-mobile-diary-admin-category><span class="mobile-diary-action-mark" aria-hidden="true">类</span><span>分类</span></button>` : ""}
        ${canManageDiary ? `<button class="mobile-diary-action danger" type="button" data-mobile-diary-delete><span class="mobile-diary-action-mark" aria-hidden="true">删</span><span>删除</span></button>` : ""}
      </div>` : ""}
    </article>
    <section class="mobile-diary-comments">
      <div class="photo-comments-head">
        <p class="kicker">Family Comments</p>
        <h3>共 ${photoComments.length} 条评论</h3>
      </div>
      <div class="photo-comments-list" data-mobile-diary-comments>${renderMobileDiaryCommentTree()}</div>
      ${
        canComment
          ? `<form data-mobile-diary-comment-form>
              <div class="comment-replying" data-mobile-diary-replying hidden>
                <span data-mobile-diary-replying-text></span>
                <button type="button" data-mobile-diary-cancel-reply aria-label="取消回复">×</button>
              </div>
              <input data-mobile-diary-comment-input maxlength="300" required placeholder="给这篇日记留句话" />
              <button type="submit">发送</button>
              <p class="status-line" data-mobile-diary-comment-status></p>
            </form>`
          : ""
      }
    </section>
  `;
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
    // Pointer capture is optional on older iOS versions.
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

async function savePhotoEditLegacy(event) {
  event.preventDefault();
  if (!cloudDb || !session || !editingPhoto) {
    els.saveEditStatus.textContent = "请先登录后再编辑。";
    return;
  }

  const takenAt = els.editDateInput.value || toDateInputValue(new Date());
  const title = els.editTitleInput.value.trim();
  const updates = {
    title,
    note: composeDiaryStoredNote(els.editNoteInput.value.trim(), getPhotoImages(editingPhoto)),
    category: els.editCategoryInput.value,
    taken_at: takenAt,
    is_public: els.editPublicInput.value === "true",
  };

  els.saveEditStatus.textContent = "正在保存...";
  const { error } = await diaryRepository.update(editingPhoto.id, updates);

  if (error) {
    els.saveEditStatus.textContent = error.message;
    return;
  }

  els.editDialog.close();
  editingPhoto = null;
  await loadPhotos();
  const gainedExp = await awardExperience("diaryEdit");
  setGlobalStatus(`日记信息已更新。${gainedExp ? ` 修为 +${gainedExp}` : ""}`);
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
      if (image.image_path) editingRemovedPaths.add(image.image_path);
      if (image.thumbnail_path) editingRemovedPaths.add(image.thumbnail_path);
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

    const pathsToRemove = [...editingRemovedPaths].filter(
      (path) => path && !nextImages.some((image) => image.image_path === path)
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
    // Local storage is only a fast offline fallback; cloud profile data remains authoritative.
  }
}

function getSessionLoginName() {
  const metadataName = session?.user?.user_metadata?.login_username;
  if (metadataName) return metadataName;

  const emailPrefix = session?.user?.email?.split("@")[0];
  return emailPrefix || getSessionDisplayName();
}

function isAdminAccount() {
  return String(getSessionLoginName() || "").trim().toLowerCase() === "xiudan320";
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
  return familyMemberMap.get(userId)?.username || "其他用户";
}

function getAuthorAvatar(userId) {
  const familyAvatar = familyMemberMap.get(userId)?.avatar_url || "";
  if (userId === session?.user?.id) {
    return accountProfile.avatarUrl || familyAvatar || loadCachedAvatarUrl(userId);
  }
  return familyAvatar;
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
  const hasAvatar = Boolean(avatarUrl);
  els.avatarImage.hidden = !hasAvatar;
  els.avatarInitial.hidden = hasAvatar;
  if (hasAvatar) els.avatarImage.src = avatarUrl;
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
  if (!els.cacheLimitDialog || !els.cacheLimitInput || !els.cacheLimitButton) return;
  const settingsNav = els.settingsDialog?.querySelector(".settings-sidebar nav");
  let cacheNav = settingsNav?.querySelector('[data-settings-section="settingsCache"]');
  if (settingsNav && !cacheNav) {
    cacheNav = document.createElement("button");
    cacheNav.type = "button";
    cacheNav.dataset.settingsSection = "settingsCache";
    cacheNav.setAttribute("aria-selected", "false");
    cacheNav.textContent = "缓存";
    cacheNav.addEventListener("click", () => setActiveSettingsSection("settingsCache"));
    settingsNav.insertBefore(cacheNav, settingsNav.querySelector('[data-settings-section="settingsAccount"]'));
  }
  let cacheGroup = document.querySelector("#settingsCache");
  if (!cacheGroup) {
    cacheGroup = document.createElement("section");
    cacheGroup.className = "settings-group";
    cacheGroup.id = "settingsCache";
    cacheGroup.hidden = true;
    cacheGroup.innerHTML = '<p class="kicker">Offline</p><h3>缓存与离线</h3>';
    document.querySelector("#settingsTools")?.before(cacheGroup);
  }
  [els.refreshCacheInfoButton, els.cacheLimitButton, document.querySelector("#clearDiaryCacheButton"), document.querySelector("#clearSecretCacheButton"), els.clearAppCacheButton]
    .filter(Boolean)
    .forEach((button) => cacheGroup.append(button));
  els.cacheLimitButton.querySelector("span").textContent = "缓存容量上限";
  const summary = els.cacheLimitButton.querySelector("small");
  if (summary) summary.textContent = "日记和秘藏分别按容量自动淘汰旧图片";

  let policyButton = document.querySelector("#mediaCachePolicyButton");
  if (!policyButton) {
    policyButton = document.createElement("button");
    policyButton.id = "mediaCachePolicyButton";
    policyButton.type = "button";
    policyButton.addEventListener("click", () => {
      const next = loadMediaCachePolicy() === "wifi" ? "off" : "wifi";
      saveMediaCachePolicy(next);
      showMiniToast(next === "wifi" ? "仅在明确识别为 Wi-Fi 时自动缓存" : "已关闭自动缓存", { kind: "success" });
    });
    cacheGroup.insertBefore(policyButton, els.cacheLimitButton);
  }

  if (!document.querySelector("#downloadDiaryOfflineButton")) {
    const diaryDownload = document.createElement("button");
    diaryDownload.id = "downloadDiaryOfflineButton";
    diaryDownload.type = "button";
    diaryDownload.innerHTML = "<span>下载日记离线包</span><strong>手动缓存当前日记文字和图片</strong>";
    diaryDownload.addEventListener("click", () => downloadOfflinePool("diary"));
    cacheGroup.insertBefore(diaryDownload, els.clearAppCacheButton);

    const secretDownload = document.createElement("button");
    secretDownload.id = "downloadSecretOfflineButton";
    secretDownload.type = "button";
    secretDownload.innerHTML = "<span>下载全部秘藏离线包</span><strong>缓存全部秘藏相册和图片，直到达到容量上限</strong>";
    secretDownload.addEventListener("click", () => downloadOfflinePool("secret"));
    cacheGroup.insertBefore(secretDownload, els.clearAppCacheButton);
  }

  const form = els.cacheLimitForm;
  const heading = form?.querySelector("h2");
  const intro = heading?.nextElementSibling;
  if (heading) heading.textContent = "本地缓存容量";
  if (intro) intro.textContent = "分别设置日记和秘藏图片在本机可占用的空间。达到上限后自动淘汰较旧图片，不影响云端原图。";
  const diaryLabel = els.cacheLimitInput.closest("label");
  if (diaryLabel?.querySelector("span")) diaryLabel.querySelector("span").textContent = "日记图片（MB）";
  els.cacheLimitInput.min = String(MIN_CACHE_MB);
  els.cacheLimitInput.max = String(MAX_CACHE_MB);
  els.cacheLimitInput.step = "10";

  if (!document.querySelector("#secretCacheLimitInput") && diaryLabel) {
    const label = document.createElement("label");
    label.className = "cache-limit-field";
    label.innerHTML = `<span>秘藏图片（MB）</span><input id="secretCacheLimitInput" type="number" min="${MIN_CACHE_MB}" max="${MAX_CACHE_MB}" step="10" inputmode="numeric" required />`;
    diaryLabel.after(label);
  }
  const presets = form?.querySelectorAll("[data-cache-limit-preset]") || [];
  const presetValues = [50, 100, 200, 500];
  presets.forEach((button, index) => {
    const value = presetValues[index] || 100;
    button.dataset.cacheLimitPreset = String(value);
    button.textContent = `${value} / ${value * 3} MB`;
  });
  const hint = form?.querySelector(".cache-limit-hint");
  if (hint) hint.textContent = "前一个数字是日记容量，后一个是秘藏容量。Wi-Fi 下自动保留最新 20 条日记；手动离线包会缓存到容量上限。";

  const group = els.cacheLimitButton.parentElement;
  if (group && !document.querySelector("#clearDiaryCacheButton")) {
    const diaryClear = document.createElement("button");
    diaryClear.id = "clearDiaryCacheButton";
    diaryClear.type = "button";
    diaryClear.innerHTML = "<span>清除日记缓存</span><strong>只清除日记文字与图片</strong>";
    diaryClear.addEventListener("click", () => clearCachePool("diary"));
    group.insertBefore(diaryClear, els.clearAppCacheButton);

    const secretClear = document.createElement("button");
    secretClear.id = "clearSecretCacheButton";
    secretClear.type = "button";
    secretClear.innerHTML = "<span>清除秘藏缓存</span><strong>只清除秘藏相册与图片</strong>";
    secretClear.addEventListener("click", () => clearCachePool("secret"));
    group.insertBefore(secretClear, els.clearAppCacheButton);
  }
  [document.querySelector("#clearDiaryCacheButton"), document.querySelector("#clearSecretCacheButton")]
    .filter(Boolean)
    .forEach((button) => cacheGroup.append(button));
  cacheGroup.append(els.clearAppCacheButton);
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
      list.innerHTML = '<p class="settings-empty">自动备份将在每天凌晨生成。</p>';
      return;
    }
    list.innerHTML = backups.slice(0, 30).map((backup) => `
      <button class="cloud-backup-item" type="button" data-backup-key="${escapeHtml(backup.key)}">
        <span>${escapeHtml(String(backup.key).split("/").pop().replace(/^d1-|\.backup$/g, ""))}</span>
        <strong>${formatFileSize(backup.size)}<small>下载解密副本</small></strong>
      </button>`).join("");
    list.querySelectorAll("[data-backup-key]").forEach((button) => {
      button.addEventListener("click", () => downloadCloudBackup(button.dataset.backupKey));
    });
  } catch (error) {
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
    nav.addEventListener("click", () => {
      setActiveSettingsSection("settingsSafety");
      void renderTrashItems();
    });
    settingsNav.append(nav);
  }
  if (document.querySelector("#settingsSafety")) return;
  const group = document.createElement("section");
  group.className = "settings-group settings-safety";
  group.id = "settingsSafety";
  group.hidden = true;
  group.innerHTML = `
    <p class="kicker">Recycle Bin</p><h3>回收站</h3>
    <button id="backfillThumbnailsButton" type="button"><span>优化旧图片</span><strong>每次为最多 20 张旧图生成列表缩略图</strong></button>
    <div class="trash-head"><div><strong>最近删除</strong><small>日记、秘藏、菜谱、心愿、周末计划、纪念日和留言保留 30 天</small></div><button type="button" data-refresh-trash aria-label="刷新回收站">↻</button></div>
    <div class="trash-items" id="trashItemsList"></div>`;
  content.append(group);
  group.querySelector("#backfillThumbnailsButton").addEventListener("click", backfillLegacyThumbnails);
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
      : uploadQueueProcessing
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
  familyMembers.forEach((member) => familyMemberMap.set(member.user_id, member));
  const ownMember = familyMemberMap.get(session.user.id);
  if (ownMember?.avatar_url) {
    saveCachedAvatarUrl(session.user.id, ownMember.avatar_url);
    if (!accountProfile.avatarUrl) {
      accountProfile.avatarUrl = ownMember.avatar_url;
      accountProfile.avatarPath = ownMember.avatar_path || accountProfile.avatarPath;
      renderAccountAvatar(accountProfile.avatarUrl, getSessionDisplayName());
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

      const localRecipes = loadRecipes();
      const localWishes = loadWishes();
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
          },
          { select: "*", single: true }
        );
        if (error) throw error;
        profile = data;
      }

      const loginName = normalizeNickname(getSessionLoginName());
      const sessionDisplayName = normalizeNickname(getSessionDisplayName());
      const profileDisplayName = normalizeNickname(profile.username);
      const preferredDisplayName =
        profileDisplayName &&
        !(loginName && profileDisplayName === loginName && sessionDisplayName && sessionDisplayName !== loginName)
          ? profileDisplayName
          : sessionDisplayName || profileDisplayName || displayName;
      if (preferredDisplayName && preferredDisplayName !== getSessionDisplayName()) {
        updateSessionDisplayName(preferredDisplayName);
      }

      let cloudRecipes = recipesResult.data || [];
      let cloudWishes = wishesResult.data || [];
      const needsLocalMigration = !profile.local_data_migrated;

      if (needsLocalMigration) {
        const personalLocalRecipes = localRecipes.filter(
          (recipe) => !recipe.userId || recipe.userId === userId
        );
        const personalLocalWishes = localWishes.filter(
          (wish) => !wish.userId || wish.userId === userId
        );
        if (personalLocalRecipes.length) {
          const rows = personalLocalRecipes.map((recipe) => recipeToCloudRow(recipe, userId));
          const { error } = await householdRepository.upsert("recipes", rows, {
            onConflict: "id",
          });
          if (error) throw error;
        }
        if (personalLocalWishes.length) {
          const rows = personalLocalWishes.map((wish) => wishToCloudRow(wish, userId));
          let { error } = await householdRepository.upsert("wishes", rows, {
            onConflict: "id",
          });
          if (error && isMissingCloudSchema(error)) {
            wishCompletionNoteCloudAvailable = false;
            const legacyRows = personalLocalWishes.map((wish) =>
              wishToLegacyCloudRow(wish, userId)
            );
            const retry = await householdRepository.upsert("wishes", legacyRows, {
              onConflict: "id",
            });
            error = retry.error;
          }
          if (error) throw error;
        }

        const [migratedRecipes, migratedWishes] = await Promise.all([
          householdRepository.list("recipes", {
            order: [{ column: "created_at", ascending: false }],
          }),
          householdRepository.list("wishes", {
            order: [{ column: "created_at", ascending: false }],
          }),
        ]);
        if (migratedRecipes.error || migratedWishes.error) {
          throw migratedRecipes.error || migratedWishes.error;
        }
        cloudRecipes = migratedRecipes.data || [];
        cloudWishes = migratedWishes.data || [];
      }

      const today = getLocalDateKey();
      let rechargeTotal = Math.max(
        Number(profile.recharge_total) || 0,
        needsLocalMigration ? localRecharge : 0,
        isVipUser(displayName) ? 298 : 0
      );
      let experienceTotal = Math.max(
        Number(profile.experience_total) || 0,
        Number(localExperience.total) || 0
      );
      const cloudLastLoginDate = normalizeLoginDateKey(profile.last_login_date);
      const localLastLoginDate = normalizeLoginDateKey(localExperience.lastLoginDate);
      let lastLoginDate = cloudLastLoginDate || localLastLoginDate || "";
      let loginStreak = Math.max(0, Number(profile.login_streak) || 0);
      const localLoginStreak = Math.max(0, Number(localExperience.loginStreak) || 0);
      if (
        localLastLoginDate &&
        (!cloudLastLoginDate || localLastLoginDate > cloudLastLoginDate)
      ) {
        lastLoginDate = localLastLoginDate;
        loginStreak = localLoginStreak;
      } else if (
        localLastLoginDate &&
        localLastLoginDate === cloudLastLoginDate
      ) {
        loginStreak = Math.max(loginStreak, localLoginStreak);
      }
      if (lastLoginDate === today) loginStreak = Math.max(1, loginStreak);
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
      const preferredHomeName =
        cloudHomeName && (cloudHomeName !== "咻蛋之家" || localHomeName === "咻蛋之家")
          ? cloudHomeName
          : localHomeName;
      const cloudThanksColor = normalizeThanksColor(profile.preferred_thanks_color);
      const preferredThanksColor =
        Object.prototype.hasOwnProperty.call(profile, "preferred_thanks_color") &&
        cloudThanksColor
          ? cloudThanksColor
          : localThanksColor;
      foodOptionsCloudAvailable = Object.prototype.hasOwnProperty.call(
        profile,
        "food_options"
      );
      thanksColorCloudAvailable = Object.prototype.hasOwnProperty.call(
        profile,
        "preferred_thanks_color"
      );
      profilePreferencesCloudAvailable =
        Object.prototype.hasOwnProperty.call(profile, "theme_preference") &&
        Object.prototype.hasOwnProperty.call(profile, "home_name");

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
        local_data_migrated: true,
        today_experience_date: todayExperienceDate,
        today_experience_amount: todayExperienceAmount,
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

      const familyAvatarUrl = familyMemberMap.get(userId)?.avatar_url || "";
      const syncedAvatarUrl =
        savedProfile.avatar_url ||
        profile.avatar_url ||
        familyAvatarUrl ||
        accountProfile.avatarUrl ||
        loadCachedAvatarUrl(userId);
      const syncedAvatarPath =
        savedProfile.avatar_path || profile.avatar_path || accountProfile.avatarPath || "";
      if (syncedAvatarUrl) saveCachedAvatarUrl(userId, syncedAvatarUrl);

      if (cloudWishes.length) {
        wishCompletionNoteCloudAvailable = Object.prototype.hasOwnProperty.call(
          cloudWishes[0],
          "completion_note"
        );
      }
      cloudSyncAvailable = true;
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
      saveWishes();
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
    } catch (error) {
      cloudSyncAvailable = false;
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
  if (!favoritesCloudAvailable) missing.push("收藏");
  if (!weekendCloudAvailable) missing.push("周末计划");
  if (!anniversaryCloudAvailable) missing.push("纪念日");
  if (!foodOptionsCloudAvailable) missing.push("转盘候选");
  if (!profilePreferencesCloudAvailable) missing.push("主题/主页名称");
  if (!thanksColorCloudAvailable) missing.push("留言颜色");
  if (!wishCompletionNoteCloudAvailable) missing.push("心愿完成感想");
  if (!secretCloudAvailable) missing.push("秘藏");
  setGlobalStatus(
    missing.length
      ? `Cloudflare D1 仍缺少：${missing.join("、")}。请部署最新版数据库结构。`
      : "全部账户数据已同步到云端"
  );
}

function isVipUser(value) {
  return VIP_USERS.has(String(value || "").trim().toLowerCase());
}

function getVipLevel(level = activeVipLevel) {
  return VIP_LEVELS.find((item) => item.level === level) || VIP_LEVELS[0];
}

function getVipLevelByRecharge(amount) {
  return [...VIP_LEVELS]
    .reverse()
    .find((level) => amount >= level.price) || null;
}

function getCurrentImageLimit() {
  return activeVipLevel > 0 ? getVipLevel(activeVipLevel).limit : 1;
}

function getUploadQuality() {
  if (activeVipLevel >= 5) {
    return { maxSide: 2800, jpeg: 0.9, minJpeg: 0.69, targetBytes: 1_600_000 };
  }
  if (activeVipLevel >= 3) {
    return { maxSide: 2200, jpeg: 0.87, minJpeg: 0.66, targetBytes: 1_200_000 };
  }
  return { maxSide: 1800, jpeg: 0.84, minJpeg: 0.62, targetBytes: 850_000 };
}

function formatFileSize(bytes) {
  const size = Math.max(0, Number(bytes) || 0);
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getRechargeStorageKey(displayName = getSessionDisplayName()) {
  return `${VIP_RECHARGE_KEY}:${String(displayName || "guest").toLowerCase()}`;
}

function loadRechargeTotal(displayName = getSessionDisplayName()) {
  if (cloudSyncAvailable && session) {
    return Math.max(0, Number(accountProfile.rechargeTotal) || 0);
  }
  const key = getRechargeStorageKey(displayName);
  const stored = Number(localStorage.getItem(key));
  if (Number.isFinite(stored) && stored >= 0) return stored;
  return isVipUser(displayName) ? 298 : 0;
}

function saveRechargeTotal(amount, displayName = getSessionDisplayName()) {
  const normalized = Math.max(0, Math.round(amount));
  localStorage.setItem(getRechargeStorageKey(displayName), String(normalized));
  if (session) accountProfile.rechargeTotal = normalized;
}

function renderVipCenter() {
  const displayName = session ? getSessionDisplayName() : "";
  const rechargeTotal = session ? loadRechargeTotal(displayName) : 0;
  const currentLevel = getVipLevelByRecharge(rechargeTotal);
  const nextLevel = VIP_LEVELS.find((level) => rechargeTotal < level.price);
  const vip = Boolean(currentLevel);
  els.vipCurrentLevel.textContent = currentLevel ? `LV.${currentLevel.level}` : "FREE";
  els.vipCurrentName.textContent = currentLevel?.name || "Visitor";
  els.vipRechargeTotal.textContent = formatMoney(rechargeTotal);
  els.vipTierAmount.textContent = currentLevel ? formatMoney(currentLevel.price) : "¥0";
  els.vipSummary.textContent = session
    ? `${displayName} 累计充值 ${formatMoney(rechargeTotal)}，${currentLevel ? `当前为 ${currentLevel.label}，修炼经验 ${getVipExpMultiplier(currentLevel.level)}x` : "还未开通 VIP"}。`
    : "登录后可充值激活 5 个 VIP 档位。";
  els.vipNext.innerHTML = nextLevel
    ? `<strong>下一档 ${nextLevel.label}</strong><span>还差 ${formatMoney(nextLevel.price - rechargeTotal)}</span>`
    : `<strong>已解锁最高档</strong><span>传说档位已满级</span>`;

  els.vipLevels.innerHTML = VIP_LEVELS.map((level) => {
    const unlocked = rechargeTotal >= level.price;
    const active = currentLevel?.level === level.level;
    const diff = Math.max(0, level.price - rechargeTotal);
    return `
      <article class="vip-level ${active ? "active" : ""} ${unlocked ? "unlocked" : ""}">
        <span>LV.${level.level}</span>
        <strong>${escapeHtml(level.name)}</strong>
        <p>${escapeHtml(level.label)} · 累计 ${formatMoney(level.price)}</p>
        <small>最多 ${level.limit} 张/篇 · 经验 ${getVipExpMultiplier(level.level)}x</small>
        <button type="button" data-top-up-level="${level.level}" ${!session || active || unlocked ? "disabled" : ""}>
          ${active ? "当前档位" : unlocked ? "已解锁" : `补 ${formatMoney(diff)}`}
        </button>
      </article>
    `;
  }).join("");

  const rechargePacks = VIP_LEVELS.map((level) => {
    const amount = Math.max(0, level.price - rechargeTotal);
    return { level, amount: amount || level.price };
  });

  els.vipRecharge.innerHTML = rechargePacks
    .map(
      ({ level, amount }) => `
        <button type="button" data-recharge-amount="${amount}">
          <span>${level.label}</span>
          <strong>${formatMoney(amount)}</strong>
        </button>
      `
    )
    .join("");

  els.vipPerks.innerHTML = (currentLevel || VIP_LEVELS[0]).perks
    .map((perk) => `<span>${escapeHtml(perk)}</span>`)
    .join("");
  els.vipStatus.textContent = session
    ? cloudSyncAvailable
      ? "这是模拟充值，不会真实扣款；会员档位已同步到你的云端账户。"
      : "这是模拟充值，不会真实扣款；数据库初始化前暂存于当前浏览器。"
    : "请先登录再使用充值档位。";

  els.vipLevels.querySelectorAll("button[data-top-up-level]").forEach((button) => {
    button.addEventListener("click", () => topUpToLevel(Number(button.dataset.topUpLevel)));
  });
  els.vipRecharge.querySelectorAll("button[data-recharge-amount]").forEach((button) => {
    button.addEventListener("click", () => rechargeVip(Number(button.dataset.rechargeAmount)));
  });
}

function topUpToLevel(level) {
  if (!session) {
    els.vipStatus.textContent = "请先登录。";
    return;
  }

  const target = getVipLevel(level);
  const current = loadRechargeTotal();
  const diff = Math.max(0, target.price - current);
  rechargeVip(diff);
}

async function rechargeVip(amount) {
  if (!session) {
    els.vipStatus.textContent = "请先登录。";
    return;
  }

  const numericAmount = Math.max(0, Math.round(Number(amount) || 0));
  if (!numericAmount) {
    els.vipStatus.textContent = "这个档位已经解锁。";
    return;
  }
  if (!cloudSyncAvailable) {
    els.vipStatus.textContent =
      "Cloudflare D1 尚未升级，本次充值没有保存。请先部署最新版数据库结构。";
    return;
  }

  const nextTotal = loadRechargeTotal() + numericAmount;
  const nextLevel = getVipLevelByRecharge(nextTotal)?.level || 0;

  const { error } = await householdRepository.update(
    "user_profiles",
    {
      recharge_total: nextTotal,
      vip_level: nextLevel,
      updated_at: new Date().toISOString(),
    },
    { user_id: session.user.id }
  );
  if (error) {
    els.vipStatus.textContent = `会员同步失败：${error.message}`;
    return;
  }

  saveRechargeTotal(nextTotal);
  accountProfile.vipLevel = nextLevel;
  activeVipLevel = nextLevel;
  updateAuthUI();
  renderVipCenter();
  els.vipStatus.textContent = `模拟充值 ${formatMoney(numericAmount)} 成功，累计 ${formatMoney(nextTotal)}，已同步。`;
}

function formatMoney(value) {
  return `¥${Math.max(0, Math.round(Number(value) || 0))}`;
}

function getExperienceStorageKey(displayName = getSessionDisplayName()) {
  return `${EXPERIENCE_KEY}:${String(displayName || "guest").toLowerCase()}`;
}

function loadLocalExperienceAliases(displayName = getSessionDisplayName()) {
  const names = new Set(
    [
      displayName,
      getSessionDisplayName(),
      getSessionLoginName(),
      session?.user?.user_metadata?.username,
      session?.user?.user_metadata?.login_username,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const result = {
    total: 0,
    lastLoginDate: "",
    loginStreak: 0,
    gainedToday: false,
  };

  for (const name of names) {
    try {
      const parsed = JSON.parse(localStorage.getItem(getExperienceStorageKey(name)) || "{}");
      const lastLoginDate = normalizeLoginDateKey(parsed.lastLoginDate);
      result.total = Math.max(result.total, Number(parsed.total) || 0);
      result.loginStreak = Math.max(result.loginStreak, Number(parsed.loginStreak) || 0);
      if (lastLoginDate > result.lastLoginDate) result.lastLoginDate = lastLoginDate;
      result.gainedToday = result.gainedToday || Boolean(parsed.gainedToday);
    } catch {
      // Ignore malformed local snapshots and keep the usable records.
    }
  }

  return result;
}

function loadExperience(displayName = getSessionDisplayName()) {
  if (cloudSyncAvailable && session) {
    return {
      total: Math.max(0, Number(accountProfile.experienceTotal) || 0),
      lastLoginDate: accountProfile.lastLoginDate || "",
      loginStreak: Math.max(0, Number(accountProfile.loginStreak) || 0),
      gainedToday: accountProfile.lastLoginDate === getLocalDateKey(),
    };
  }
  return loadLocalExperienceAliases(displayName);
}

function saveExperience(data, displayName = getSessionDisplayName()) {
  localStorage.setItem(getExperienceStorageKey(displayName), JSON.stringify(data));
  if (session) {
    accountProfile.experienceTotal = Number(data.total) || 0;
    accountProfile.lastLoginDate = data.lastLoginDate || "";
    accountProfile.loginStreak = Math.max(0, Number(data.loginStreak) || 0);
  }
}

function getTodayExperienceStorageKey(userId = session?.user?.id || getSessionLoginName()) {
  return `${TODAY_EXPERIENCE_KEY}:${userId || "guest"}`;
}

function loadTodayExperience(userId = session?.user?.id || getSessionLoginName()) {
  if (
    cloudSyncAvailable &&
    session &&
    accountProfile.todayExperienceDate === getLocalDateKey()
  ) {
    return Math.max(0, Number(accountProfile.todayExperienceAmount) || 0);
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(getTodayExperienceStorageKey(userId)) || "{}");
    return parsed.date === getLocalDateKey() ? Math.max(0, Number(parsed.amount) || 0) : 0;
  } catch {
    return 0;
  }
}

function addTodayExperience(amount, userId = session?.user?.id || getSessionLoginName()) {
  const numericAmount = Math.max(0, Number(amount) || 0);
  if (!numericAmount) return loadTodayExperience(userId);
  const nextAmount = loadTodayExperience(userId) + numericAmount;
  localStorage.setItem(
    getTodayExperienceStorageKey(userId),
    JSON.stringify({ date: getLocalDateKey(), amount: nextAmount })
  );
  if (session && userId === session.user.id) {
    accountProfile.todayExperienceDate = getLocalDateKey();
    accountProfile.todayExperienceAmount = nextAmount;
  }
  return nextAmount;
}

function getVipExpMultiplier(level = activeVipLevel) {
  return calculateVipExpMultiplier(level);
}

function getVipAdjustedExperience(base, level = activeVipLevel) {
  return calculateVipAdjustedExperience(base, level);
}

function getLoginStreakBonusBase(streak) {
  return calculateLoginStreakBonusBase(streak);
}

function getDailyLoginReward(streak = accountProfile.loginStreak || 1, level = activeVipLevel) {
  return calculateDailyLoginReward(streak, level);
}

function getNextLoginStreak(experience = loadExperience()) {
  const lastLoginDate = normalizeLoginDateKey(experience.lastLoginDate);
  const streak = Math.max(0, Number(experience.loginStreak) || 0);
  if (lastLoginDate === getLocalDateKey() || lastLoginDate === getOffsetLocalDateKey(-1)) {
    return streak + 1;
  }
  return 1;
}

function awardDailyExperience(displayName = getSessionDisplayName()) {
  const today = getLocalDateKey();
  const data = loadExperience(displayName);
  const lastLoginDate = normalizeLoginDateKey(data.lastLoginDate);
  if (lastLoginDate === today) return data;
  const streak = isYesterdayLoginDate(lastLoginDate) ? (Number(data.loginStreak) || 0) + 1 : 1;
  const amount = getDailyLoginReward(streak);
  addTodayExperience(amount);

  const next = {
    total: data.total + amount,
    lastLoginDate: today,
    loginStreak: streak,
    gainedToday: true,
  };
  saveExperience(next, displayName);
  return next;
}

function getExperienceLevel(totalExp) {
  return calculateExperienceLevel(totalExp);
}

function formatUpgradeDays(days) {
  if (!Number.isFinite(days)) return "已到最高境界";
  if (days <= 0) return "今天就能突破";
  if (days === 1) return "约 1 天";
  return `约 ${days} 天`;
}

function getUpgradeEta(progress) {
  const dailyExp = getDailyLoginReward(getNextLoginStreak());
  return calculateUpgradeEta(progress, dailyExp);
}

function getLevelRankProfiles() {
  if (!session) return [];
  const currentAvatarUrl = accountProfile.avatarUrl || loadCachedAvatarUrl(session.user.id);
  const ownProfile = {
    user_id: session.user.id,
    username: getSessionDisplayName(),
    avatar_url: currentAvatarUrl,
    role: familyInfo?.isOwner ? "owner" : familyMemberMap.get(session.user.id)?.role || "member",
    experience_total: loadExperience().total,
    login_streak: accountProfile.loginStreak || loadExperience().loginStreak || 0,
  };
  const profiles = new Map([[ownProfile.user_id, ownProfile]]);
  familyMembers.forEach((member) => {
    const cloudProfile = familyLevelProfiles.get(member.user_id) || {};
    const cachedAvatarUrl = loadCachedAvatarUrl(member.user_id);
    profiles.set(member.user_id, {
      ...member,
      username: cloudProfile.username || member.username || "家庭成员",
      avatar_url:
        cloudProfile.avatar_url ||
        member.avatar_url ||
        cachedAvatarUrl ||
        (member.user_id === session.user.id ? ownProfile.avatar_url : ""),
      experience_total: Number(cloudProfile.experience_total) || (member.user_id === session.user.id ? ownProfile.experience_total : 0),
      login_streak: Number(cloudProfile.login_streak) || 0,
    });
  });
  return [...profiles.values()]
    .map((profile) => ({
      ...profile,
      progress: getExperienceLevel(profile.experience_total),
    }))
    .sort((a, b) => {
      if (b.experience_total !== a.experience_total) return b.experience_total - a.experience_total;
      return String(a.username || "").localeCompare(String(b.username || ""), "zh-Hans-CN");
    });
}

async function loadFamilyLevelProfiles() {
  if (!cloudDb || !session) return;
  const ids = [...new Set([session.user.id, ...familyMembers.map((member) => member.user_id).filter(Boolean)])];
  const entries = await Promise.all(
    ids.map(async (userId) => {
      const { data, error } = await householdRepository.list("user_profiles", {
        filters: { user_id: userId },
        maybeSingle: true,
      });
      if (error || !data) return null;
      if (data.avatar_url) saveCachedAvatarUrl(userId, data.avatar_url);
      return [userId, data];
    })
  );
  familyLevelProfiles = new Map(entries.filter(Boolean));
}

function renderLevelLeaderboard() {
  const ranks = getLevelRankProfiles();
  if (!ranks.length) return `<div class="level-rank-empty">登录后显示家庭修为排行。</div>`;
  return `
    <div class="level-rank-list">
      ${ranks
        .map((profile, index) => {
          const isCurrent = profile.user_id === session?.user?.id;
          return `
            <article class="level-rank-row ${isCurrent ? "current" : ""}">
              <span class="level-rank-index">${index + 1}</span>
              ${profile.avatar_url
                ? `<span class="level-rank-avatar" data-avatar-fallback="${escapeHtml(getInitial(profile.username))}"><img src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(profile.username)}的头像" decoding="async" /></span>`
                : `<span class="level-rank-avatar">${escapeHtml(getInitial(profile.username))}</span>`}
              <div>
                <strong>${escapeHtml(profile.username || "家庭成员")}${isCurrent ? "（我）" : ""}</strong>
                <small>${escapeHtml(profile.progress.title)} · ${Number(profile.experience_total || 0).toLocaleString()} EXP</small>
              </div>
              <em>${profile.role === "owner" ? "创始人" : "成员"}</em>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function getCultivationArchive() {
  return buildCultivationArchive({
    photos,
    recipes,
    wishes,
    weekendPlans,
    secretItems,
    comments: [...photoCommentPreviewMap.values()].flat(),
    gratitudeNotes,
    currentUserId: session?.user?.id || "",
    streak: Math.max(
      0,
      Number(accountProfile.loginStreak) || Number(loadExperience().loginStreak) || 0
    ),
    favoriteCount: favoritePhotoIds.size,
  });
}
function renderCultivationArchive() {
  const archive = getCultivationArchive();
  const previewBadges = [
    ...archive.badges.filter((badge) => badge.unlocked),
    ...archive.badges.filter((badge) => !badge.unlocked).sort((a, b) => b.percent - a.percent),
  ].slice(0, 4);
  const monthLabel = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(new Date());
  return `
    <section class="cultivation-archive">
      <div class="cultivation-panel cultivation-badges">
        <div class="cultivation-panel-head"><span>称号与徽章</span><button type="button" data-open-achievements>查看全部 · ${archive.badges.filter((badge) => badge.unlocked).length}/${archive.badges.length}</button></div>
        <div class="cultivation-badge-grid">
          ${previewBadges.map((badge) => `
            <article class="cultivation-badge ${badge.unlocked ? "unlocked" : "locked"}">
              <i>${badge.icon}</i><div><strong>${badge.title}</strong><small>${badge.unlocked ? "已解锁" : badge.detail}</small></div>
            </article>`).join("")}
        </div>
      </div>
      <div class="cultivation-panel cultivation-monthly">
        <div class="cultivation-panel-head"><span>修行月报</span><strong>${monthLabel}</strong></div>
        <div class="cultivation-month-grid">
          <span><b>${archive.month.diaries}</b><small>日记</small></span>
          <span><b>${archive.month.comments}</b><small>留言</small></span>
          <span><b>${archive.month.wishes}</b><small>圆梦</small></span>
          <span><b>${archive.month.recipes}</b><small>菜谱</small></span>
          <span><b>${archive.month.secrets}</b><small>秘藏</small></span>
        </div>
      </div>
      <div class="cultivation-panel cultivation-roots">
        <div class="cultivation-panel-head"><span>灵根谱</span><strong>主灵根 · ${archive.primaryRoot}</strong></div>
        <div class="cultivation-root-list">
          ${archive.roots.map((root) => `<div><span>${root.key}</span><i><b style="width:${root.percent}%"></b></i><em>${root.percent}%</em></div>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function openLevelGuidePage() {
  activeLevelSection = "atlas";
  renderLevelDialog();
}

function closeLevelGuidePage() {
  activeLevelSection = "ranking";
  renderLevelDialog();
}

function getRealmMilestoneStorageKey() {
  return `life-vlog-realm-milestones:${session?.user?.id || getSessionLoginName() || "guest"}`;
}

function loadRealmMilestones(experience) {
  let milestones = {};
  try {
    milestones = JSON.parse(localStorage.getItem(getRealmMilestoneStorageKey()) || "{}") || {};
  } catch {
    milestones = {};
  }
  const reachedAt = new Date().toISOString();
  let changed = false;
  CULTIVATION_REALMS.forEach((realm) => {
    if (experience.total >= realm.threshold && !milestones[realm.name]) {
      milestones[realm.name] = reachedAt;
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(getRealmMilestoneStorageKey(), JSON.stringify(milestones));
  }
  return milestones;
}

function formatRealmMilestoneDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function scrollLevelAtlasToCurrent() {
  if (activeLevelSection !== "atlas" || !els.levelList) return;
  requestAnimationFrame(() => {
    const scroller = els.levelList.querySelector(".level-section-content");
    const current = scroller?.querySelector(".level-guide-timeline article.active");
    if (!scroller || !current) return;
    const scrollerBox = scroller.getBoundingClientRect();
    const currentBox = current.getBoundingClientRect();
    scroller.scrollTop += currentBox.top - scrollerBox.top - 16;
  });
}

function renderLevelAtlasPanel(experience, progress) {
  const dailyExp = getDailyLoginReward(getNextLoginStreak(experience));
  const milestones = loadRealmMilestones(experience);
  return `<section class="level-atlas-panel"><div class="level-atlas-intro"><strong>${experience.total.toLocaleString()} EXP</strong><span>${escapeHtml(getUpgradeEta(progress))}</span></div>
    <div class="level-guide-timeline">${CULTIVATION_REALMS.map((realm, index) => {
      const nextThreshold = Number.isFinite(realm.next) ? realm.next : Infinity;
      const unlocked = experience.total >= realm.threshold;
      const active = progress.realm === realm.name;
      const remaining = Math.max(0, realm.threshold - experience.total);
      const reachedDate = formatRealmMilestoneDate(milestones[realm.name]);
      const eta = unlocked ? (active ? "当前境界" : `达成于 ${reachedDate}`) : `${formatUpgradeDays(Math.ceil(remaining / Math.max(1, dailyExp)))}可抵达`;
      const range = Number.isFinite(nextThreshold) ? `${realm.threshold.toLocaleString()} - ${(nextThreshold - 1).toLocaleString()} EXP` : `${realm.threshold.toLocaleString()}+ EXP`;
      return `<article class="${active ? "active" : ""} ${unlocked ? "unlocked" : "locked"}"><i>${String(index + 1).padStart(2, "0")}</i><div><small>${range}</small><h2>${escapeHtml(realm.name)}</h2><p>${escapeHtml(CULTIVATION_DESCRIPTIONS[realm.name] || "")}</p><em>${eta}</em></div></article>`;
  }).join("")}</div></section>`;
}

function renderExperienceRulesPanel(experience) {
  const currentStreak = Math.max(0, Number(experience.loginStreak) || 0);
  const nextStreak = getNextLoginStreak(experience);
  const streakBonus = getLoginStreakBonusBase(nextStreak);
  const rules = [
    ["每日登录", `+${DAILY_LOGIN_EXP} EXP`, "每天首次进入并完成同步时获得一次。"],
    ["发布日记", `+${EXPERIENCE_REWARDS.diary} EXP`, "发布一篇日记，记录一次真实发生。"],
    ["留言 / 回复", `+${EXPERIENCE_REWARDS.comment} EXP`, "给家庭成员的日记留下评论或回复。"],
    ["发布菜谱", `+${EXPERIENCE_REWARDS.recipe} EXP`, "保存一份新的菜谱。"],
    ["发布心愿", `+${EXPERIENCE_REWARDS.wish} EXP`, "把想做、想去或想吃的事写进心愿单。"],
    ["完成心愿", `+${EXPERIENCE_REWARDS.wishDone} EXP`, "完成心愿后补上一句感想，获得额外修为。"],
    ["安排周末", `+${EXPERIENCE_REWARDS.weekend} EXP`, "新增一次周末计划。"],
    ["时间纪念册", `+${EXPERIENCE_REWARDS.anniversary} EXP`, "新增一个值得记住的日期。"],
    ["感谢留言", `+${EXPERIENCE_REWARDS.thanks} EXP`, "在感谢留言板留下新的记录。"],
    ["编辑已有日记", `+${EXPERIENCE_REWARDS.diaryEdit} EXP`, "补充或修改已经发布的日记内容。"],
  ];
  const vipRows = [0, 1, 2, 3, 4, 5].map((level) => {
    const multiplier = getVipExpMultiplier(level);
    return `<span><b>LV.${level}</b><small>${multiplier}x 经验倍率</small></span>`;
  }).join("");
  return `<section class="experience-rules-panel">
    <header class="experience-rules-head">
      <div><small>HOW EXP GROWS</small><h3>经验增加规则</h3><p>经验只记录你们认真生活的痕迹，不会扣除，也不会因为切换设备而分开计算。</p></div>
      <strong>今日 +${loadTodayExperience()} EXP</strong>
    </header>
    <div class="experience-streak-card">
      <div><span>连续登录</span><strong>${currentStreak} 天</strong></div>
      <p>连续第 ${nextStreak} 天预计登录基础 +${DAILY_LOGIN_EXP} EXP${streakBonus ? `，本次连续奖励 +${streakBonus} EXP` : ""}。连续奖励每 2 天增加 5 EXP，最高 +40 EXP。</p>
    </div>
    <div class="experience-rule-list">
      ${rules.map(([label, amount, detail]) => `<article class="experience-rule-row"><div><strong>${label}</strong><small>${detail}</small></div><b>${amount}</b></article>`).join("")}
    </div>
    <section class="experience-vip-rules"><div><small>MEMBER BONUS</small><h4>会员经验倍率</h4></div><div class="experience-vip-grid">${vipRows}</div><p>倍率会作用于发布、互动和每日登录奖励；升级境界仍只看累计 EXP。</p></section>
  </section>`;
}

function renderLevelAchievementPanel() {
  const badges = getCultivationArchive().badges;
  return `<section class="level-achievement-panel"><div class="level-section-heading"><div><small>Achievements</small><h3>成就徽章</h3></div><span>${badges.filter((badge) => badge.unlocked).length}/${badges.length}</span></div>
    <div class="level-achievement-grid">${badges.map((badge) => `<button type="button" data-level-achievement="${escapeHtml(badge.id)}" class="${badge.unlocked ? "unlocked" : "locked"}"><i>${escapeHtml(badge.icon)}</i><span><strong>${escapeHtml(badge.title)}</strong><small>${escapeHtml(getAchievementConditionText(badge))}</small><em>${badge.unlocked ? "已达成" : `${Math.min(badge.current, badge.target)} / ${badge.target}`}</em></span></button>`).join("")}</div></section>`;
}

function getAchievementConditionText(badge) {
  if (!badge) return "查看具体达成条件";
  if (badge.unlocked) return `达成条件：${badge.detail}。已经完成。`;
  const remaining = Math.max(0, Number(badge.target) - Number(badge.current));
  return `达成条件：${badge.detail}。当前 ${Math.min(badge.current, badge.target)} / ${badge.target}，还差 ${remaining}。`;
}

function openAchievementDetail(badge) {
  if (!badge) return;
  let dialog = document.querySelector("#achievementDetailDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "achievementDetailDialog";
    dialog.className = "achievement-detail-dialog";
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-close-achievement-detail]")) dialog.close();
    });
    document.body.append(dialog);
  }
  dialog.innerHTML = `<button type="button" data-close-achievement-detail aria-label="关闭">×</button>
    <div class="achievement-detail-icon ${badge.unlocked ? "unlocked" : ""}">${escapeHtml(badge.icon)}</div>
    <small>${escapeHtml(badge.category)} · ${badge.unlocked ? "已解锁" : "修行中"}</small>
    <h2>${escapeHtml(badge.title)}</h2>
    <p>${escapeHtml(badge.lore || "每一枚徽章，都是普通日子认真发生过的证据。")}</p>
    <section><span>详细达成条件</span><strong>${escapeHtml(badge.detail)}</strong><p>${escapeHtml(getAchievementConditionText(badge))}</p><em>${Math.min(badge.current, badge.target)} / ${badge.target}</em><i><b style="width:${badge.percent}%"></b></i></section>`;
  dialog.showModal();
}

function renderLevelDialog() {
  if (!els.levelDialog) return;
  const experience = loadExperience();
  const progress = getExperienceLevel(experience.total);
  const nextStreak = getNextLoginStreak(experience);
  const dailyExp = getDailyLoginReward(nextStreak);
  els.levelCurrentTitle.textContent = progress.title;
  els.levelCurrentTitle.title = "打开境界图鉴";
  els.levelUpgradeEta.textContent = getUpgradeEta(progress);
  els.levelSummary.textContent = `当前 ${progress.total.toLocaleString()} EXP。连续签到 ${Math.max(0, Number(experience.loginStreak) || 0)} 天，下次登录预计 +${dailyExp} EXP。`;
  const sections = [
    { id: "ranking", label: "家庭排行", icon: "榜" },
    { id: "atlas", label: "境界图鉴", icon: "境" },
    { id: "achievements", label: "成就徽章", icon: "章" },
    { id: "monthly", label: "修行月报", icon: "月" },
    { id: "rules", label: "经验规则", icon: "律" },
  ];
  let content = "";
  if (activeLevelSection === "atlas") {
    content = renderLevelAtlasPanel(experience, progress);
  } else if (activeLevelSection === "achievements") {
    content = renderLevelAchievementPanel();
  } else if (activeLevelSection === "monthly") {
    content = renderCultivationArchive();
  } else if (activeLevelSection === "rules") {
    content = renderExperienceRulesPanel(experience);
  } else {
    content = `<section class="level-rank-panel"><div class="level-rank-head"><div><span>Family Ranking</span><strong>家庭修为榜</strong></div><small>共同记录，各自成长</small></div>${renderLevelLeaderboard()}</section>`;
  }
  els.levelList.innerHTML = `<div class="level-workspace">
    <nav class="level-section-nav" aria-label="成长等级页面">${sections.map((section) => `<button class="${activeLevelSection === section.id ? "active" : ""}" type="button" data-level-section="${section.id}"><i>${section.icon}</i><span>${section.label}</span></button>`).join("")}</nav>
    <div class="level-section-content">${content}</div>
  </div>`;
  els.levelList.querySelectorAll("[data-level-section]").forEach((button) => {
    button.addEventListener("click", () => {
      activeLevelSection = button.dataset.levelSection || "ranking";
      renderLevelDialog();
    });
  });
  els.levelList.querySelectorAll("[data-level-achievement]").forEach((button) => {
    const badges = getCultivationArchive().badges;
    button.addEventListener("click", () => openAchievementDetail(badges.find((badge) => badge.id === button.dataset.levelAchievement)));
  });
  els.levelList.querySelector("[data-open-achievements]")?.addEventListener("click", () => {
    activeLevelSection = "achievements";
    renderLevelDialog();
  });
  scrollLevelAtlasToCurrent();
}

function renderAchievementDialog() {
  if (!els.achievementGrid) return;
  const badges = getCultivationArchive().badges;
  const unlocked = badges.filter((badge) => badge.unlocked).length;
  const categories = ["全部", "记录", "陪伴", "探索", "料理", "收藏"];
  els.achievementSummary.textContent = `已解锁 ${unlocked} / ${badges.length} · 成就只记录生活，不影响境界强弱。`;
  els.achievementFilters.innerHTML = categories.map((category) => `
    <button class="${achievementFilter === category ? "active" : ""}" type="button" data-achievement-filter="${category}">${category}</button>
  `).join("");
  const visible = achievementFilter === "全部" ? badges : badges.filter((badge) => badge.category === achievementFilter);
  els.achievementGrid.innerHTML = visible.map((badge) => `
    <button class="achievement-card ${badge.unlocked ? "unlocked" : "locked"}" type="button" data-achievement-id="${escapeHtml(badge.id)}">
      <i>${badge.icon}</i>
      <div><small>${badge.category} · ${badge.unlocked ? "已达成" : "进行中"}</small><strong>${badge.title}</strong><p>${escapeHtml(getAchievementConditionText(badge))}</p></div>
      <em>${badge.unlocked ? "完成" : `${Math.min(badge.current, badge.target)} / ${badge.target}`}</em>
      <span><b style="width:${badge.percent}%"></b></span>
    </button>
  `).join("");
  els.achievementFilters.querySelectorAll("[data-achievement-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      achievementFilter = button.dataset.achievementFilter || "全部";
      renderAchievementDialog();
    });
  });
  els.achievementGrid.querySelectorAll("[data-achievement-id]").forEach((button) => {
    button.addEventListener("click", () => openAchievementDetail(badges.find((badge) => badge.id === button.dataset.achievementId)));
  });
}

function openAchievementDialog() {
  if (!els.achievementDialog) return;
  achievementFilter = "全部";
  renderAchievementDialog();
  els.achievementDialog.showModal();
}

async function openLevelDialog() {
  if (!session) return;
  await loadFamilyLevelProfiles();
  activeLevelSection = "ranking";
  renderLevelDialog();
  els.levelDialog.showModal();
}

function getLevelNeed(level) {
  return 80 + level * 20;
}

function renderExperience(displayName = getSessionDisplayName()) {
  const data = loadExperience(displayName);
  const progress = getExperienceLevel(data.total);
  els.xpLevel.textContent = progress.title;
  els.xpText.textContent = `${progress.current} / ${progress.needed} EXP`;
  els.xpBar.style.width = `${progress.percent}%`;
  const nextStreak = getNextLoginStreak(data);
  const loginExp = getDailyLoginReward(data.lastLoginDate === getLocalDateKey() ? data.loginStreak || 1 : nextStreak);
  const multiplier = getVipExpMultiplier();
  els.xpHint.textContent =
    data.lastLoginDate === getLocalDateKey()
      ? `今日吐纳 +${loginExp} EXP 已领取 · 连续 ${Math.max(1, Number(data.loginStreak) || 1)} 天${multiplier > 1 ? ` · VIP ${multiplier}x` : ""}`
      : `下次吐纳 +${loginExp} EXP · 连续 ${nextStreak} 天`;
  renderTopLevelBadge(progress);
  if (els.levelDialog?.open) renderLevelDialog();
}

function renderTopLevelBadge(progress = getExperienceLevel(loadExperience().total)) {
  if (!els.vipBadge) return;
  const todayExp = loadTodayExperience();
  const ranks = getLevelRankProfiles();
  const myRank = ranks.findIndex((profile) => profile.user_id === session?.user?.id) + 1;
  els.vipBadge.innerHTML = `
    <span>${escapeHtml(progress.title)}</span>
    <small>${myRank ? `第 ${myRank} 名 · ` : ""}今日 +${todayExp} EXP</small>
  `;
  els.vipBadge.title = `当前等级：${progress.title}，今日获得 ${todayExp} EXP`;
}

async function awardExperience(action, options = {}) {
  if (!session) return 0;
  const base = EXPERIENCE_REWARDS[action] || 0;
  if (!base) return 0;
  const amount = getVipAdjustedExperience(base);
  const current = loadExperience();
  const next = {
    ...current,
    total: Math.max(0, Number(current.total) || 0) + amount,
  };
  const todayAmount = addTodayExperience(amount);
  saveExperience(next);
  renderExperience();
  renderOverview();

  if (cloudSyncAvailable && cloudDb) {
    const { error } = await householdRepository.update(
      "user_profiles",
      {
        experience_total: next.total,
        today_experience_date: getLocalDateKey(),
        today_experience_amount: todayAmount,
        updated_at: new Date().toISOString(),
      },
      { user_id: session.user.id }
    );
    if (error) {
      console.warn("Experience sync failed:", error);
    }
  }

  if (options.statusElement) {
    options.statusElement.textContent = `${options.statusElement.textContent} 修为 +${amount}`;
  }
  return amount;
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

function normalizeTheme(theme) {
  return theme === "dark" || theme === "light" ? theme : "";
}

function getThemeStorageKey(userId = session?.user?.id || null) {
  return preferenceStore.scopedKey(THEME_KEY, userId || "guest");
}

function loadTheme(userId = session?.user?.id || null) {
  const fallback = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return preferenceStore.readEnum(THEME_KEY, ["dark", "light"], fallback, {
    scope: userId || "guest",
    legacyKey: THEME_KEY,
  });
}

function applyTheme(
  theme,
  { persist = true, userId = session?.user?.id || null, syncCloud = false } = {}
) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("theme-dark", nextTheme === "dark");
  document.documentElement.style.colorScheme = nextTheme;
  if (persist) {
    localStorage.setItem(getThemeStorageKey(userId), nextTheme);
    if (userId && session?.user?.id === userId) {
      accountProfile.themePreference = nextTheme;
    }
  }
  els.themeToggle.querySelector("span").textContent = nextTheme === "dark" ? "☀" : "☾";
  els.themeToggle.title = nextTheme === "dark" ? "切换白天模式" : "切换黑夜模式";
  if (syncCloud) void persistThemeToCloud(nextTheme);
}

function toggleTheme() {
  applyTheme(document.body.classList.contains("theme-dark") ? "light" : "dark", {
    syncCloud: Boolean(session),
  });
}

async function persistThemeToCloud(theme) {
  const nextTheme = normalizeTheme(theme);
  if (!nextTheme || !cloudDb || !session || !cloudSyncAvailable) return;
  const userId = session.user.id;
  const { error } = await householdRepository.update(
    "user_profiles",
    {
      theme_preference: nextTheme,
      updated_at: new Date().toISOString(),
    },
    { user_id: userId }
  );
  if (!error && session?.user?.id === userId) {
    accountProfile.themePreference = nextTheme;
  }
}

async function persistHomeNameToCloud(homeName) {
  if (!cloudDb || !session) return false;
  const { error } = await cloudDb.rpc("update_family_name", { p_name: homeName });
  if (error) {
    els.homeNameStatus.textContent = `云端保存失败：${error.message}`;
    return false;
  }
  accountProfile.homeName = homeName;
  if (familyInfo) familyInfo.name = homeName;
  familyMembers = familyMembers.map((member) => ({ ...member, family_name: homeName }));
  return true;
}

async function saveProfileNickname(event) {
  event.preventDefault();
  if (!cloudDb || !session) return;
  const nickname = normalizeNickname(els.profileNicknameInput.value);
  if (!nickname) {
    els.profileNicknameStatus.textContent = "昵称不能为空。";
    return;
  }

  els.profileNicknameStatus.textContent = "正在保存昵称...";
  const { error: authError } = await cloudDb.auth.updateUser({
    data: { username: nickname },
  });
  if (authError) {
    els.profileNicknameStatus.textContent = `保存失败：${authError.message}`;
    return;
  }

  const { error: profileError } = await householdRepository.update(
    "user_profiles",
    {
      username: nickname,
      updated_at: new Date().toISOString(),
    },
    { user_id: session.user.id }
  );

  if (profileError) {
    els.profileNicknameStatus.textContent = isMissingCloudSchema(profileError)
      ? "昵称已更新，运行最新版数据库脚本后家庭账户也会同步显示。"
      : `资料保存失败：${profileError.message}`;
  } else {
    els.profileNicknameStatus.textContent = "昵称已保存。";
  }

  updateSessionDisplayName(nickname);
  await loadFamilyContext();
  renderGallery();
  setTimeout(() => els.renameProfileDialog.close(), 500);
}

function setAvatarPreview(src = "") {
  const hasImage = Boolean(src);
  els.avatarPreview.hidden = !hasImage;
  els.avatarPreviewInitial.hidden = hasImage;
  if (hasImage) els.avatarPreview.src = src;
  else els.avatarPreview.removeAttribute("src");
  els.avatarPreviewInitial.textContent = getInitial(getSessionDisplayName());
}

function updateAvatarPreview() {
  const file = els.avatarInput.files?.[0];
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = file ? URL.createObjectURL(file) : "";
  setAvatarPreview(avatarPreviewUrl || accountProfile.avatarUrl);
}

async function saveAvatar(event) {
  event.preventDefault();
  if (!cloudDb || !session) return;
  const file = els.avatarInput.files?.[0];
  if (!file) {
    els.avatarStatus.textContent = "先选择一张图片。";
    return;
  }

  els.avatarStatus.textContent = "正在压缩头像...";
  let compressed;
  try {
    compressed = await compressImage(file, {
      maxSide: 640,
      jpeg: 0.86,
      minJpeg: 0.68,
      targetBytes: 220000,
    });
  } catch (error) {
    els.avatarStatus.textContent = `头像处理失败：${error.message}`;
    return;
  }

  els.avatarStatus.textContent = "正在上传头像...";
  let uploaded;
  try {
    uploaded = await uploadToR2(compressed.blob, "avatar", "avatars");
  } catch (error) {
    els.avatarStatus.textContent = `上传失败：${error.message}`;
    return;
  }

  const avatarUrl = uploaded.url;
  const path = `r2:${uploaded.key}`;
  const previousPath = accountProfile.avatarPath;
  const { error: profileError } = await householdRepository.update(
    "user_profiles",
    {
      avatar_url: avatarUrl,
      avatar_path: path,
      updated_at: new Date().toISOString(),
    },
    { user_id: session.user.id }
  );

  if (profileError) {
    await cleanupStoredImagePaths([path]).catch(() => {});
    els.avatarStatus.textContent = isMissingCloudSchema(profileError)
      ? "请先运行本次头像数据库补丁。"
      : `资料保存失败：${profileError.message}`;
    return;
  }

  accountProfile.avatarUrl = avatarUrl;
  accountProfile.avatarPath = path;
  saveCachedAvatarUrl(session.user.id, avatarUrl);
  renderAccountAvatar(avatarUrl);
  renderSettingsSummary();
  await loadFamilyContext();
  renderPhotoComments();
  if (previousPath && previousPath !== path) {
    void cleanupStoredImagePaths([previousPath]);
  }
  els.avatarStatus.textContent = "头像已保存。";
  setTimeout(() => els.avatarDialog.close(), 500);
}

async function saveHomeName(event) {
  event.preventDefault();
  if (!session) return;
  const homeName = normalizeHomeName(els.homeNameInput.value);
  if (!homeName) {
    els.homeNameStatus.textContent = "请先输入一个名称。";
    return;
  }
  els.homeNameStatus.textContent = "正在保存…";
  const cloudSaved = await persistHomeNameToCloud(homeName);
  if (cloudSaved) {
    applyHomeName(homeName, { persist: true, userId: session.user.id });
    els.vipPopoverBadge.textContent =
      activeVipLevel > 0
        ? `${homeName} ${getVipLevel(activeVipLevel).label}`
        : `开通 ${homeName} VIP`;
    els.homeNameStatus.textContent = "名称已保存并同步。";
    window.setTimeout(() => els.renameHomeDialog.close(), 450);
  }
}

async function restoreDefaultHomeName() {
  if (!session) return;
  els.homeNameInput.value = "咻蛋之家";
  els.homeNameStatus.textContent = "正在恢复默认名称…";
  const cloudSaved = await persistHomeNameToCloud("咻蛋之家");
  if (cloudSaved) {
    applyHomeName("咻蛋之家", { persist: true, userId: session.user.id });
    els.vipPopoverBadge.textContent =
      activeVipLevel > 0
        ? `咻蛋之家 ${getVipLevel(activeVipLevel).label}`
        : "开通 咻蛋之家 VIP";
    els.homeNameStatus.textContent = "已恢复默认名称。";
  }
}

function initializePhotoDropHint() {
  const hint = els.photoDrop?.querySelector("[for='photoInput']");
  if (!hint) return;
  els.fileName.textContent = "展开后直接粘贴图片，或点上面选择";
}

function updatePhotoPreview() {
  const files = selectedUploadFiles;
  const media = [
    ...files.map((file) => ({ file, label: file.name })),
    ...selectedUploadLinks.map((url) => ({ url, label: "图片链接" })),
  ];
  if (!media.length) {
    clearPhotoPreview();
    return;
  }

  revokePreviewUrls();
  const imageLimit = getCurrentImageLimit();
  if (media.length > imageLimit) {
    setStatus(`当前 VIP 等级单篇最多 ${imageLimit} 张图。`);
  } else {
    setStatus(media.length > 1 ? `将发布为 1 篇合集，共 ${media.length} 张图。` : "");
  }
  syncPhotoInputFiles();
  previewUrls = media.map((item) => item.file ? URL.createObjectURL(item.file) : item.url);
  activeUploadPreviewIndex = Math.min(activeUploadPreviewIndex, media.length - 1);
  els.photoPreview.src = previewUrls[activeUploadPreviewIndex];
  els.uploadMainPreview.hidden = false;
  els.fileName.textContent =
    media.length > 1 ? `已选择 ${media.length} 张图片` : media[0].label;
  renderPreviewStrip(media, previewUrls);
}

function handlePasteUpload(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItems = items.filter((item) => item.type.startsWith("image/"));

  if (imageItems.length) {
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    if (!files.length) return;

    event.preventDefault();
    const pastedFiles = files.map((file, index) => {
      const extension = file.type?.split("/")[1] || "png";
      return new File([file], `pasted-${Date.now()}-${index + 1}.${extension}`, {
        type: file.type || "image/png",
      });
    });
    selectedUploadFiles = [...selectedUploadFiles, ...pastedFiles];
    updatePhotoPreview();
    saveDiaryDraft();
    setStatus(files.length > 1 ? `已读取 ${files.length} 张剪贴板图片。` : "已读取剪贴板图片。");
    return;
  }
  const urls = extractImageUrls(getClipboardImageUrl(event.clipboardData));
  if (urls.length) {
    event.preventDefault();
    addDiaryImageLinks(urls);
  }
}

function addDiaryImageLinks(rawLinks = els.photoLinkInput?.value || "") {
  const urls = Array.isArray(rawLinks) ? rawLinks : extractImageUrls(rawLinks);
  if (!urls.length) {
    setStatus("请输入完整的 http 或 https 图片链接。");
    return false;
  }
  selectedUploadLinks = [...new Set([...selectedUploadLinks, ...urls])];
  if (els.photoLinkInput) els.photoLinkInput.value = "";
  updatePhotoPreview();
  saveDiaryDraft();
  setStatus(`已添加 ${urls.length} 个图片链接，发布时会复制到 R2。`);
  return true;
}

function clearPhotoPreview() {
  revokePreviewUrls();
  selectedUploadFiles = [];
  selectedUploadLinks = [];
  els.photoInput.value = "";
  if (els.photoLinkInput) els.photoLinkInput.value = "";

  activeUploadPreviewIndex = 0;
  els.photoPreview.removeAttribute("src");
  els.uploadMainPreview.hidden = true;
  els.previewStrip.innerHTML = "";
  els.previewStrip.hidden = true;
  els.fileName.textContent = "展开后直接粘贴图片，或点上面选择";
}

function revokePreviewUrls() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
}

function syncPhotoInputFiles() {
  const transfer = new DataTransfer();
  selectedUploadFiles.forEach((file) => transfer.items.add(file));
  els.photoInput.files = transfer.files;
}

function renderPreviewStrip(files, urls) {
  if (!files.length) {
    els.previewStrip.innerHTML = "";
    els.previewStrip.hidden = true;
    return;
  }

  els.previewStrip.innerHTML = urls
    .map(
      (url, index) => `
        <span class="preview-thumb" data-preview-index="${index}" role="button" tabindex="0" aria-label="预览第 ${index + 1} 张">
          <img src="${url}" alt="" />
          <button class="preview-remove" type="button" data-remove-preview="${index}" aria-label="删除第 ${index + 1} 张">×</button>
        </span>
      `
    )
    .join("");
  els.previewStrip.hidden = false;

  els.previewStrip.querySelectorAll("[data-preview-index]").forEach((thumb) => {
    const showPreview = (event) => {
      event.preventDefault();
      const index = Number(thumb.dataset.previewIndex);
      activeUploadPreviewIndex = index;
      els.photoPreview.src = urls[index];
    };
    thumb.addEventListener("click", showPreview);
    thumb.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") showPreview(event);
    });
  });
}

function removeUploadPreview(index) {
  const total = selectedUploadFiles.length + selectedUploadLinks.length;
  if (index < 0 || index >= total) return;
  if (index < selectedUploadFiles.length) {
    selectedUploadFiles = selectedUploadFiles.filter((_, itemIndex) => itemIndex !== index);
  } else {
    const linkIndex = index - selectedUploadFiles.length;
    selectedUploadLinks = selectedUploadLinks.filter((_, itemIndex) => itemIndex !== linkIndex);
  }
  const nextTotal = selectedUploadFiles.length + selectedUploadLinks.length;
  activeUploadPreviewIndex = Math.max(0, Math.min(activeUploadPreviewIndex, nextTotal - 1));
  if (!nextTotal) {
    clearPhotoPreview();
    setStatus("已移除图片。");
    return;
  }
  updatePhotoPreview();
  setStatus("已移除图片。");
}

function getSecretPinStorageKey() {
  return `${SECRET_PIN_KEY}:${session?.user?.id || "guest"}`;
}

function getSecretUnlockStorageKey() {
  return `${SECRET_UNLOCK_KEY}:${session?.user?.id || "guest"}`;
}

function getSecretDefaultFolderStorageKey() {
  return `${SECRET_DEFAULT_FOLDER_KEY}:${session?.user?.id || "guest"}`;
}

function getSecretDefaultFolderId() {
  if (!session) return "unfiled";
  return localStorage.getItem(getSecretDefaultFolderStorageKey()) || "unfiled";
}

function setSecretDefaultFolderId(folderId) {
  if (!session) return;
  const nextFolderId = folderId || "unfiled";
  localStorage.setItem(getSecretDefaultFolderStorageKey(), nextFolderId);
  renderSecretFolderControls();
}

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function hashSecretPin(pin, salt) {
  const encoded = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

function readSecretPinRecord() {
  if (!session) return null;
  try {
    const record = JSON.parse(localStorage.getItem(getSecretPinStorageKey()) || "null");
    return record?.salt && record?.hash ? record : null;
  } catch {
    return null;
  }
}

function restoreSecretUnlockState() {
  if (!session) return;
  try {
    const state = JSON.parse(sessionStorage.getItem(getSecretUnlockStorageKey()) || "null");
    secretUnlockedAt = Number(state?.unlockedAt) || 0;
    secretLeftAt = Number(state?.leftAt) || 0;
  } catch {
    secretUnlockedAt = 0;
    secretLeftAt = 0;
  }
}

function persistSecretUnlockState() {
  if (!session) return;
  sessionStorage.setItem(getSecretUnlockStorageKey(), JSON.stringify({
    unlockedAt: secretUnlockedAt,
    leftAt: secretLeftAt,
  }));
}

function clearSecretUnlockState() {
  if (session) sessionStorage.removeItem(getSecretUnlockStorageKey());
  secretUnlockedAt = 0;
  secretLeftAt = 0;
}

function isSecretUnlocked() {
  restoreSecretUnlockState();
  const now = Date.now();
  const withinMaximum = secretUnlockedAt > 0 && now - secretUnlockedAt < SECRET_UNLOCK_MAX_MS;
  if (withinMaximum) return true;
  clearSecretUnlockState();
  return false;
}

function markSecretLeft() {
  if (!secretUnlockedAt) return;
  secretLeftAt = Date.now();
  persistSecretUnlockState();
}

function renderSecretPinEntry() {
  const count = secretPinEntry.length;
  els.secretPinDots?.querySelectorAll("i").forEach((dot, index) => {
    dot.classList.toggle("filled", index < count);
  });
  els.secretPinDots?.setAttribute("aria-label", `已输入 ${count} 位密码`);
}

function setSecretPinStatus(message = "", kind = "") {
  if (!els.secretPinStatus) return;
  els.secretPinStatus.textContent = message;
  els.secretPinStatus.dataset.kind = kind;
}

function setSecretPinDialogMode(mode) {
  secretPinMode = mode;
  secretPinEntry = "";
  renderSecretPinEntry();
  setSecretPinStatus("");
  const setup = mode === "setup";
  const confirm = mode === "confirm" || mode === "change-confirm";
  const changing = ["change-current", "change-new", "change-confirm"].includes(mode);
  const copy = {
    setup: {
      eyebrow: "Create Private PIN",
      title: "设置秘藏密码",
      description: "设置四位数字，只用于保护这台设备上的秘藏入口",
    },
    confirm: {
      eyebrow: "Create Private PIN",
      title: "再输入一次",
      description: "确认两次输入一致，之后离线也能进入",
    },
    "change-current": {
      eyebrow: "Private Archive",
      title: "验证当前密码",
      description: "先输入当前四位密码，再设置新的秘藏密码",
    },
    "change-new": {
      eyebrow: "Private Archive",
      title: "设置新密码",
      description: "输入新的四位数字密码",
    },
    "change-confirm": {
      eyebrow: "Private Archive",
      title: "确认新密码",
      description: "再输入一次新的四位数字密码",
    },
    unlock: {
      eyebrow: "Private Archive",
      title: "进入秘藏",
      description: "输入这台设备的四位数字密码",
    },
  }[mode] || null;
  els.secretPinEyebrow.textContent = copy?.eyebrow || "Private Archive";
  els.secretPinTitle.textContent = copy?.title || "进入秘藏";
  els.secretPinDescription.textContent = copy?.description || "输入这台设备的四位数字密码";
  els.secretPinDialog?.classList.toggle("is-setup", setup || confirm || changing);
}

function openSecretPinDialog() {
  if (!session || !els.secretPinDialog) return;
  secretPinManageMode = false;
  secretPinSetupValue = "";
  setSecretPinDialogMode(readSecretPinRecord() ? "unlock" : "setup");
  if (!els.secretPinDialog.open) els.secretPinDialog.showModal();
}

function openSecretPinSettings() {
  if (!session || !els.secretPinDialog) return;
  secretPinManageMode = true;
  secretPinSetupValue = "";
  setSecretPinDialogMode(readSecretPinRecord() ? "change-current" : "setup");
  if (!els.secretPinDialog.open) els.secretPinDialog.showModal();
}

function finishSecretUnlock() {
  secretPinManageMode = false;
  secretUnlockedAt = Date.now();
  secretLeftAt = 0;
  persistSecretUnlockState();
  els.secretPinDialog?.close();
  secretPinEntry = "";
  switchPage("secret", { skipSecretGate: true });
  requestAnimationFrame(() => els.secretPage?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

async function submitSecretPinEntry() {
  if (secretPinEntry.length !== 4) return;
  const pin = secretPinEntry;
  if (secretPinMode === "change-current") {
    const record = readSecretPinRecord();
    if (record && await hashSecretPin(pin, record.salt) === record.hash) {
      setSecretPinDialogMode("change-new");
      return;
    }
    secretPinEntry = "";
    renderSecretPinEntry();
    setSecretPinStatus("当前密码不正确，请再试一次", "error");
    return;
  }
  if (secretPinMode === "setup" || secretPinMode === "change-new") {
    secretPinSetupValue = pin;
    setSecretPinDialogMode(secretPinMode === "setup" ? "confirm" : "change-confirm");
    return;
  }
  if (secretPinMode === "confirm" || secretPinMode === "change-confirm") {
    if (pin !== secretPinSetupValue) {
      setSecretPinDialogMode(secretPinMode === "confirm" ? "setup" : "change-new");
      setSecretPinStatus("两次输入不一致，请重新设置", "error");
      return;
    }
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashSecretPin(pin, salt);
    localStorage.setItem(getSecretPinStorageKey(), JSON.stringify({ salt, hash, version: 1 }));
    if (secretPinManageMode) {
      secretPinManageMode = false;
      els.secretPinDialog?.close();
      showMiniToast("秘藏密码已更新", { kind: "success", placement: "center" });
      return;
    }
    finishSecretUnlock();
    showMiniToast("秘藏密码已设置", { kind: "success", placement: "center" });
    return;
  }
  const record = readSecretPinRecord();
  if (record && await hashSecretPin(pin, record.salt) === record.hash) {
    finishSecretUnlock();
    return;
  }
  secretPinEntry = "";
  renderSecretPinEntry();
  els.secretPinDialog?.classList.remove("pin-shake");
  requestAnimationFrame(() => els.secretPinDialog?.classList.add("pin-shake"));
  setSecretPinStatus("密码不正确，请再试一次", "error");
}

function appendSecretPinDigit(digit) {
  if (!/^\d$/.test(digit) || secretPinEntry.length >= 4) return;
  secretPinEntry += digit;
  renderSecretPinEntry();
  setSecretPinStatus("");
  if (secretPinEntry.length === 4) window.setTimeout(() => void submitSecretPinEntry(), 110);
}

function deleteSecretPinDigit() {
  secretPinEntry = secretPinEntry.slice(0, -1);
  renderSecretPinEntry();
  setSecretPinStatus("");
}

function switchPage(page, { skipSecretGate = false } = {}) {
  const requestedPage = ["recipes", "wishlist", "weekend", "wardrobe", "thanks", "secret"].includes(page) ? page : "gallery";
  if (requestedPage === "secret" && !skipSecretGate && !isSecretUnlocked()) {
    openSecretPinDialog();
    return false;
  }
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
  els.galleryNav.classList.toggle("active", activePage === "gallery");
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
  return photos.filter((photo) => photo?.image_url || getPhotoImages(photo).length);
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

function setSecretExpanded(expanded) {
  if (!els.secretForm || !els.secretToggle) return;
  els.secretForm.hidden = !expanded;
  els.secretToggle.setAttribute("aria-expanded", String(expanded));
}

function getSecretPhotoSortDescending(item) {
  return item?.photoSortDescending !== false;
}

async function setSecretPhotoSortDescending(item, descending) {
  if (!item?.id || !cloudDb || !session) return false;
  const { error } = await secretRepository.updateItem(item.id, {
    photo_sort_descending: descending ? 1 : 0,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    setSecretStatus(error.message || "照片顺序保存失败。");
    showMiniToast("照片顺序保存失败", { kind: "error" });
    return false;
  }
  item.photoSortDescending = Boolean(descending);
  return true;
}

function sortSecretDisplayEntries(entries, item) {
  return sortSecretEntriesByAlbumOrder(entries, getSecretPhotoSortDescending(item));
}

function getSecretPhotoTags(items = secretItems) {
  const tags = [];
  items.forEach((item) => {
    normalizeSecretImages(item.images).forEach((image) => {
      normalizeSecretPhotoTags(image).forEach((tag) => {
        if (!isSecretNumericTag(tag) && !tags.includes(tag)) tags.push(tag);
      });
    });
  });
  return [
    FAVORITE_SECRET_PHOTO_TAG,
    STORY_SECRET_PHOTO_TAG,
    DEFAULT_SECRET_PHOTO_TAG,
    ...tags.filter(
      (tag) =>
        tag !== FAVORITE_SECRET_PHOTO_TAG &&
        tag !== STORY_SECRET_PHOTO_TAG &&
        tag !== DEFAULT_SECRET_PHOTO_TAG
    ),
  ];
}

function getSecretAlbumFilterTags(item) {
  return getSecretAlbumTagCounts(item).map(({ tag }) => tag).filter((tag) => tag !== "全部");
}

function getSecretAlbumTagCounts(item) {
  const images = normalizeSecretImages(item?.images);
  const counts = new Map();
  images.forEach((image) => {
    normalizeSecretPhotoTags(image).forEach((tag) => {
      if (!isSecretNumericTag(tag)) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    });
    if (image.favorite) {
      counts.set(FAVORITE_SECRET_PHOTO_TAG, (counts.get(FAVORITE_SECRET_PHOTO_TAG) || 0) + 1);
    }
  });
  return [
    { tag: "全部", count: images.length },
    ...[...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN")),
  ];
}

function imageMatchesSecretFilter(image) {
  if (activeSecretFilter === "全部") return true;
  if (activeSecretFilter === FAVORITE_SECRET_PHOTO_TAG) return Boolean(image?.favorite);
  return secretImageHasTag(image, activeSecretFilter);
}

function closeSecretFolderContextMenu() {
  if (!secretFolderContextMenu) return;
  document.removeEventListener("pointerdown", secretFolderContextMenu.closeOnOutside, true);
  window.removeEventListener("resize", closeSecretFolderContextMenu);
  window.removeEventListener("scroll", closeSecretFolderContextMenu, true);
  secretFolderContextMenu.element.remove();
  secretFolderContextMenu = null;
}

function openSecretFolderContextMenu(folder, clientX, clientY) {
  if (!folder || isMobileViewport()) return;
  closeSecretFolderContextMenu();
  const currentDefaultId = getSecretDefaultFolderId();
  const menu = document.createElement("div");
  menu.className = "secret-folder-context-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <span>${escapeHtml(folder.name)}</span>
    <button type="button" role="menuitem" ${currentDefaultId === folder.id ? "disabled" : ""}>
      ${currentDefaultId === folder.id ? "当前默认入口" : "设为默认入口"}
    </button>
  `;
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(10, Math.min(clientX, window.innerWidth - rect.width - 10))}px`;
  menu.style.top = `${Math.max(10, Math.min(clientY, window.innerHeight - rect.height - 10))}px`;
  const closeOnOutside = (event) => {
    if (!menu.contains(event.target)) closeSecretFolderContextMenu();
  };
  secretFolderContextMenu = { element: menu, closeOnOutside };
  document.addEventListener("pointerdown", closeOnOutside, true);
  window.addEventListener("resize", closeSecretFolderContextMenu);
  window.addEventListener("scroll", closeSecretFolderContextMenu, true);
  menu.querySelector("button")?.addEventListener("click", () => {
    setSecretDefaultFolderId(folder.id);
    closeSecretFolderContextMenu();
    showMiniToast(`以后进入秘藏会先打开「${folder.name}」`, { kind: "success" });
  });
}

function renderSecretFolderControls() {
  if (!els.secretFolderList) return;
  const defaultFolderId = getSecretDefaultFolderId();
  const folderButtons = [
    { id: "unfiled", name: "默认文件夹", count: secretItems.filter((item) => !item.folderId).length },
    ...secretFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      count: secretItems.filter((item) => item.folderId === folder.id).length,
    })),
  ];
  els.secretFolderList.hidden = Boolean(activeSecretAlbumId);
  els.secretFolderList.innerHTML = folderButtons.map((folder) => `
    <button class="${activeSecretFolderId === folder.id ? "active" : ""} ${defaultFolderId === folder.id ? "is-default" : ""}" type="button" data-secret-folder="${escapeHtml(folder.id)}" title="右键可设为秘藏默认入口">
      <i class="secret-folder-glyph" aria-hidden="true"></i>
      <span><strong>${escapeHtml(folder.name)}</strong><small>${folder.count} 个相册${defaultFolderId === folder.id ? " · 默认入口" : ""}</small></span>
    </button>
  `).join("");
  els.secretFolderList.querySelectorAll("[data-secret-folder]").forEach((button) => {
    button.addEventListener("click", () => {
      activeSecretFolderId = button.dataset.secretFolder || "unfiled";
      renderSecretGallery();
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const folder = folderButtons.find((entry) => entry.id === (button.dataset.secretFolder || "unfiled"));
      openSecretFolderContextMenu(folder, event.clientX, event.clientY);
    });
  });
  if (els.secretFolderInput) {
    els.secretFolderInput.innerHTML = `<option value="">默认文件夹</option>${secretFolders
      .map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`)
      .join("")}`;
  }
}

async function createSecretFolder() {
  if (!cloudDb || !session) {
    showMiniToast("请先登录后再创建收藏夹", { kind: "error" });
    return;
  }
  const name = await requestSecretFolderName();
  if (!name) return;
  const button = els.secretCreateFolderButton;
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    user_id: session.user.id,
    name,
    sort_order: secretFolders.length * 1000,
    created_at: now,
    updated_at: now,
  };
  if (button) button.disabled = true;
  setSecretStatus("正在创建收藏夹...");
  try {
    const { data, error } = await secretRepository.insertFolder(record, { select: "*", single: true });
    if (error) throw error;
    const saved = data && typeof data === "object" ? data : record;
    secretFolders.push(secretFolderFromCloudRow(saved));
    activeSecretFolderId = saved.id || record.id;
    renderSecretGallery();
    setSecretStatus("");
    showMiniToast(`已创建「${name}」`, { kind: "success" });
  } catch (error) {
    const message = error?.message || "Cloudflare 暂时没有完成创建";
    setSecretStatus(`新建文件夹失败：${message}`);
    showMiniToast("新建收藏夹失败，请稍后重试", { kind: "error" });
  } finally {
    if (button) button.disabled = false;
  }
}

async function renameActiveSecretFolder() {
  const folder = secretFolders.find((entry) => entry.id === activeSecretFolderId);
  if (!folder || !cloudDb || !session) return;
  const name = await requestSecretFolderName({
    value: folder.name,
    title: "重命名收藏夹",
    confirmLabel: "保存名称",
  });
  if (!name || name === folder.name) return;
  const updatedAt = new Date().toISOString();
  const { error } = await secretRepository.updateFolder(folder.id, {
    name,
    updated_at: updatedAt,
  });
  if (error) {
    showMiniToast(error.message || "重命名失败", { kind: "error" });
    return;
  }
  folder.name = name;
  folder.updatedAt = updatedAt;
  renderSecretGallery();
  showMiniToast("收藏夹名称已更新", { kind: "success" });
}

async function deleteActiveSecretFolder() {
  const folder = secretFolders.find((entry) => entry.id === activeSecretFolderId);
  if (!folder || !cloudDb || !session) return;
  const albums = secretItems.filter((item) => item.folderId === folder.id);
  const confirmed = await confirmAction({
    eyebrow: "整理收藏夹",
    title: `删除「${folder.name}」？`,
    message: albums.length
      ? `其中 ${albums.length} 个相册会移回默认文件夹，照片不会被删除。`
      : "这个空收藏夹会被删除，照片和相册不会受到影响。",
    confirmLabel: "删除收藏夹",
    cancelLabel: "保留",
    danger: true,
  });
  if (!confirmed) return;
  setSecretStatus("正在整理收藏夹...");
  for (const album of albums) {
    const { error } = await secretRepository.updateOwnedItem(album.id, {
      folder_id: null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setSecretStatus(error.message || "移动相册失败，收藏夹未删除。");
      showMiniToast("收藏夹删除失败", { kind: "error" });
      return;
    }
    album.folderId = "";
  }
  const { error } = await secretRepository.removeFolder(folder.id);
  if (error) {
    setSecretStatus(error.message || "删除收藏夹失败。");
    showMiniToast("收藏夹删除失败", { kind: "error" });
    return;
  }
  secretFolders = secretFolders.filter((entry) => entry.id !== folder.id);
  if (getSecretDefaultFolderId() === folder.id) {
    setSecretDefaultFolderId("unfiled");
  }
  activeSecretFolderId = "unfiled";
  saveSecretItemsCache(session.user.id);
  renderSecretGallery();
  setSecretStatus("");
  showMiniToast("收藏夹已删除，相册已移回默认文件夹", { kind: "success" });
}

function requestSecretFolderName({ value = "", title = "新建文件夹", confirmLabel = "创建" } = {}) {
  return new Promise((resolve) => {
    let dialog = document.querySelector("#secretFolderDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "secretFolderDialog";
      dialog.className = "secret-folder-dialog";
      document.body.append(dialog);
    }
    dialog.innerHTML = `<form novalidate>
      <button class="secret-folder-dialog-close" data-action="cancel" type="button" aria-label="关闭">×</button>
      <header><span>Collection</span><h2>${escapeHtml(title)}</h2><p>用收藏夹整理相册，不会改变里面的照片。</p></header>
      <label><span>收藏夹名称</span><input name="folderName" maxlength="40" autocomplete="off" value="${escapeHtml(value)}" placeholder="例如：旅行、灵感、一起生活" required /></label>
      <p class="secret-folder-dialog-error" role="alert" hidden></p>
      <div class="secret-folder-dialog-actions"><button data-action="cancel" type="button">取消</button><button class="primary" data-action="confirm" type="submit">${escapeHtml(confirmLabel)}</button></div>
    </form>`;
    const form = dialog.querySelector("form");
    const input = dialog.querySelector("input");
    const errorLabel = dialog.querySelector(".secret-folder-dialog-error");
    let settled = false;
    const cleanup = () => {
      form.removeEventListener("submit", submit);
      dialog.removeEventListener("cancel", cancel);
      dialog.removeEventListener("close", close);
      dialog.querySelectorAll('[data-action="cancel"]').forEach((button) => button.removeEventListener("click", cancel));
    };
    const finish = (result = "") => {
      if (settled) return;
      settled = true;
      cleanup();
      if (dialog.open) dialog.close();
      resolve(result);
    };
    const submit = (event) => {
      event.preventDefault();
      const folderName = String(input.value || "").trim().slice(0, 40);
      if (!folderName) {
        errorLabel.textContent = "请先写一个收藏夹名称";
        errorLabel.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      finish(folderName);
    };
    const cancel = (event) => {
      event?.preventDefault?.();
      finish("");
    };
    const close = () => finish("");
    input.addEventListener("input", () => {
      errorLabel.hidden = true;
      input.removeAttribute("aria-invalid");
    });
    form.addEventListener("submit", submit);
    dialog.addEventListener("cancel", cancel);
    dialog.addEventListener("close", close);
    dialog.querySelectorAll('[data-action="cancel"]').forEach((button) => button.addEventListener("click", cancel));
    if (dialog.open) dialog.close();
    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute("open", "");
    };
    window.setTimeout(() => input.focus({ preventScroll: true }), 0);
  });
}

function updateSecretSearchSuggestions() {
  if (!els.secretSearchSuggestions) return;
  const suggestions = new Set();
  secretItems.forEach((item) => {
    if (item.title) suggestions.add(item.title);
    normalizeSecretImages(item.images).forEach((image) => {
      normalizeSecretPhotoTags(image)
        .filter((tag) => !isSecretNumericTag(tag))
        .forEach((tag) => suggestions.add(tag));
    });
  });
  els.secretSearchSuggestions.innerHTML = [...suggestions]
    .slice(0, 80)
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join("");
}

function secretItemMatchesSearch(item) {
  const query = secretSearchQuery.trim().toLocaleLowerCase("zh-CN");
  if (!query) return true;
  const albumText = `${item.title || ""} ${item.note || ""}`.toLocaleLowerCase("zh-CN");
  if (albumText.includes(query)) return true;
  return normalizeSecretImages(item.images).some((image) =>
    normalizeSecretPhotoTags(image)
      .filter((tag) => !isSecretNumericTag(tag))
      .some((tag) => tag.toLocaleLowerCase("zh-CN").includes(query))
  );
}

function secretImageMatchesSearch(image) {
  const query = secretSearchQuery.trim().toLocaleLowerCase("zh-CN");
  if (!query) return true;
  return normalizeSecretPhotoTags(image)
    .filter((tag) => !isSecretNumericTag(tag))
    .some((tag) => tag.toLocaleLowerCase("zh-CN").includes(query));
}

async function loadSecretItemsInternal() {
  if (!cloudDb || !session) {
    secretItems = [];
    renderSecretGallery();
    return;
  }
  if (!secretItems.length) {
    renderCachedSecretItems(session.user.id);
  }
  try {
    const [itemsResponse, foldersResponse] = await Promise.all([
      secretRepository.listItems(),
      secretRepository.listFolders(),
    ]);
    if (itemsResponse.error) throw itemsResponse.error;
    if (foldersResponse.error) throw foldersResponse.error;
    secretCloudAvailable = true;
    secretItems = sortSecretItems((itemsResponse.data || []).map(secretFromCloudRow));
    secretFolders = (foldersResponse.data || []).map(secretFolderFromCloudRow);
    const validFolderIds = new Set(["unfiled", ...secretFolders.map((folder) => folder.id)]);
    if (!activeSecretAlbumId && !validFolderIds.has(activeSecretFolderId)) {
      const defaultFolderId = getSecretDefaultFolderId();
      activeSecretFolderId = validFolderIds.has(defaultFolderId) ? defaultFolderId : "unfiled";
      if (!validFolderIds.has(defaultFolderId)) setSecretDefaultFolderId("unfiled");
    }
    lastSecretSyncAt = Date.now();
    saveSecretItemsCache(session.user.id);
    renderSecretGallery();
  } catch (error) {
    secretCloudAvailable = false;
    const usedCache = renderCachedSecretItems(session.user.id);
    if (!usedCache) secretItems = [];
    renderSecretGallery();
    if (isMissingCloudSchema(error)) {
      setSecretStatus("秘藏表尚未初始化，请部署最新版 Cloudflare D1 结构。");
    } else {
      setSecretStatus(
        usedCache
          ? `秘藏同步失败，先显示上次缓存：${error.message || "请稍后重试"}`
          : `秘藏同步失败：${error.message || "请稍后重试"}`
      );
    }
  }
}

async function loadSecretItems() {
  if (secretLoadPromise) return secretLoadPromise;
  secretLoadPromise = loadSecretItemsInternal().finally(() => {
    secretLoadPromise = null;
  });
  return secretLoadPromise;
}

function renderSecretLinkedPhotoOptions() {
  if (!els.secretLinkedPhotoInput) return;
  const options = getSortedPhotos(photos)
    .map((photo) => {
      const title = getDisplayTitle(photo) || getPlainNote(photo).slice(0, 18) || "未命名日记";
      return `<option value="${escapeHtml(photo.id || "")}">${escapeHtml(`${formatDate(photo.taken_at)} · ${title}`)}</option>`;
    })
    .join("");
  els.secretLinkedPhotoInput.innerHTML = `<option value="">不关联</option>${options}`;
}

function updateSecretPreview() {
  const files = Array.from(els.secretImageInput?.files || []);
  revokeSecretPreviewUrls();
  const entries = [
    ...files.map((file) => ({ url: URL.createObjectURL(file), label: file.name })),
    ...secretSelectedLinks.map((url) => ({ url, label: "图片链接" })),
  ];
  if (!entries.length) {
    els.secretImagePreview.removeAttribute("src");
    els.secretImagePreview.hidden = true;
    els.secretPreviewStrip.innerHTML = "";
    els.secretPreviewStrip.hidden = true;
    els.secretImageName.textContent = "还没有选择图片";
    return;
  }
  secretPreviewUrls = entries.slice(0, 9).map((entry) => entry.url);
  els.secretImagePreview.src = secretPreviewUrls[0];
  els.secretImagePreview.hidden = false;
  els.secretImageName.textContent =
    entries.length > 1 ? `已选择 ${entries.length} 张图片` : entries[0].label;
  renderSecretPreviewStrip(entries, secretPreviewUrls);
}

function renderSecretPreviewStrip(files, urls) {
  if (files.length <= 1) {
    els.secretPreviewStrip.innerHTML = "";
    els.secretPreviewStrip.hidden = true;
    return;
  }
  els.secretPreviewStrip.hidden = false;
  els.secretPreviewStrip.innerHTML = urls
    .map((url, index) => `<button type="button" data-secret-preview-index="${index}"><img src="${url}" alt="" /></button>`)
    .join("");
  els.secretPreviewStrip.querySelectorAll("[data-secret-preview-index]").forEach((button) => {
    button.addEventListener("click", () => {
      els.secretImagePreview.src = urls[Number(button.dataset.secretPreviewIndex)];
    });
  });
}

let secretPreviewUrls = [];
let secretSelectedLinks = [];
function revokeSecretPreviewUrls() {
  secretPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  secretPreviewUrls = [];
}

function handleSecretPaste(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItems = items.filter((item) => item.type.startsWith("image/"));
  if (!imageItems.length) {
    const pastedUrl = getClipboardImageUrl(event.clipboardData);
    if (addSecretImageLinks(pastedUrl)) event.preventDefault();
    return;
  }
  const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  const transfer = new DataTransfer();
  files.forEach((file, index) => {
    const extension = file.type?.split("/")[1] || "png";
    transfer.items.add(
      new File([file], `secret-pasted-${Date.now()}-${index + 1}.${extension}`, {
        type: file.type || "image/png",
      })
    );
  });
  els.secretImageInput.files = transfer.files;
  updateSecretPreview();
  setSecretStatus(files.length > 1 ? `已读取 ${files.length} 张剪贴板图片。` : "已读取剪贴板图片。");
}

function addSecretImageLinks(rawLinks = els.secretImageLinkInput?.value || "") {
  const urls = extractImageUrls(rawLinks);
  if (!urls.length) {
    if (String(rawLinks || "").trim()) setSecretStatus("请输入完整的 http 或 https 图片链接。");
    return false;
  }
  secretSelectedLinks = [...new Set([...secretSelectedLinks, ...urls])].slice(0, SECRET_ALBUM_IMAGE_LIMIT);
  if (els.secretImageLinkInput) els.secretImageLinkInput.value = "";
  updateSecretPreview();
  setSecretStatus(`已添加 ${urls.length} 个图片链接，保存时会复制到 R2。`);
  return true;
}

async function saveSecretItem(event) {
  event.preventDefault();
  if (!cloudDb || !session) {
    setSecretStatus("请先登录。");
    return;
  }
  if (!secretCloudAvailable) {
    setSecretStatus("请先部署最新版 Cloudflare D1 结构，启用秘藏表。");
    return;
  }
  const files = Array.from(els.secretImageInput.files || []);
  const links = [...secretSelectedLinks];
  if (!files.length && !links.length) {
    setSecretStatus("请先选择图片或粘贴图片链接。");
    return;
  }
  const imageLimit = SECRET_ALBUM_IMAGE_LIMIT;
  if (files.length + links.length > imageLimit) {
    setSecretStatus(`一个秘藏相册最多 ${imageLimit} 张图。`);
    return;
  }
  const coverFile = els.secretCoverInput?.files?.[0] || null;
  els.secretSubmitButton.disabled = true;
  const images = [];
  let loadingToast = null;
  try {
    loadingToast = showMiniToast("秘藏上传中...", {
      kind: "loading",
      persist: true,
      placement: "center",
    });
    for (const [index, file] of files.entries()) {
      const base = slugify(els.secretTitleInput.value || els.secretCategoryInput.value || "secret");
      const uploaded = await uploadImageFile(file, `${base}-${index + 1}`, index + 1, files.length, {
        folder: "secrets",
        statusSetter: setSecretStatus,
      });
      if (!uploaded) throw new Error("秘藏图片上传失败。");
      images.push({
        ...uploaded,
        tag: DEFAULT_SECRET_PHOTO_TAG,
        tags: [DEFAULT_SECRET_PHOTO_TAG],
        uploadedAt: new Date().toISOString(),
      });
    }
    for (const [index, url] of links.entries()) {
      setSecretStatus(`正在导入第 ${index + 1}/${links.length} 个图片链接…`);
      const base = slugify(els.secretTitleInput.value || els.secretCategoryInput.value || "secret-link");
      const copied = await copyUrlToR2(url, `${base}-link-${index + 1}`, "secrets");
      images.push({
        image_path: `r2:${copied.key}`,
        image_url: copied.url,
        thumbnail_path: "",
        thumbnail_url: copied.url,
        width: 0,
        height: 0,
        tag: DEFAULT_SECRET_PHOTO_TAG,
        tags: [DEFAULT_SECRET_PHOTO_TAG],
        uploadedAt: new Date().toISOString(),
      });
    }
    let coverImage = images[0]?.image_url || "";
    let coverPath = images[0]?.image_path || "";
    if (coverFile) {
      const coverBase = slugify(els.secretTitleInput.value || els.secretCategoryInput.value || "secret-cover");
      const uploadedCover = await uploadImageFile(coverFile, `${coverBase}-cover`, 1, 1, {
        folder: "secret-covers",
        statusSetter: setSecretStatus,
      });
      if (!uploadedCover) throw new Error("秘藏封面上传失败。");
      coverImage = uploadedCover.image_url;
      coverPath = uploadedCover.image_path;
    }
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      folderId: els.secretFolderInput?.value || (activeSecretFolderId !== "unfiled" ? activeSecretFolderId : ""),
      title: els.secretTitleInput.value.trim(),
      category: els.secretCategoryInput.value.trim() || "未分类",
      note: els.secretNoteInput.value.trim(),
      coverImage,
      coverPath,
      images,
      linkedPhotoId: els.secretLinkedPhotoInput.value || "",
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await secretRepository.insertItem(
      secretToCloudRow(item, session.user.id)
    );
    if (error) throw error;
    els.secretForm.reset();
    secretSelectedLinks = [];
    updateSecretPreview();
    setSecretExpanded(false);
    setSecretStatus("相册已保存到秘藏。");
    dismissMiniToast(loadingToast);
    showMiniToast("秘藏已保存", { kind: "success" });
    await loadSecretItems();
  } catch (error) {
    dismissMiniToast(loadingToast);
    showMiniToast("上传失败", { kind: "error", duration: 2600 });
    setSecretStatus(error.message || "保存秘藏失败。");
  } finally {
    dismissMiniToast(loadingToast);
    els.secretSubmitButton.disabled = false;
  }
}

function renderSecretGallery() {
  if (!els.secretGallery) return;
  renderSecretLinkedPhotoOptions();
  renderSecretFolderControls();
  updateSecretSearchSuggestions();
  const activeAlbum = secretItems.find((item) => item.id === activeSecretAlbumId);
  const layoutToggle = els.secretPage?.querySelector("[data-secret-layout-toggle]");
  if (layoutToggle) layoutToggle.hidden = Boolean(activeAlbum);
  const allPhotoTags = activeAlbum
    ? getSecretAlbumTagCounts(activeAlbum).map(({ tag }) => tag)
    : [DEFAULT_SECRET_PHOTO_TAG];
  els.secretCategoryList.innerHTML = allPhotoTags
    .filter((tag) => tag !== "全部")
    .map((tag) => `<option value="${escapeHtml(tag)}"></option>`)
    .join("");
  if (els.secretCategoryTags) {
    els.secretCategoryTags.hidden = true;
    els.secretCategoryTags.innerHTML = "";
  }
  if (!session) {
    els.secretFilters.hidden = true;
    els.secretGallery.innerHTML = `<div class="empty">登录后才能进入秘藏。</div>`;
    return;
  }
  if (!secretCloudAvailable) {
    els.secretFilters.hidden = true;
    els.secretGallery.innerHTML = `<div class="empty">秘藏需要先初始化数据库表。</div>`;
    return;
  }
  if (activeAlbum) {
    const photoTagCounts = getSecretAlbumTagCounts(activeAlbum);
    const photoTags = photoTagCounts.map(({ tag }) => tag);
    if (!photoTags.includes(activeSecretFilter)) activeSecretFilter = "全部";
    els.secretFilters.hidden = false;
    els.secretFilters.innerHTML = photoTags
      .map((tag) => {
        const count = photoTagCounts.find((entry) => entry.tag === tag)?.count || 0;
        return `
          <button class="${tag === activeSecretFilter ? "active" : ""}" type="button" data-secret-filter="${escapeHtml(tag)}">
            <span>${escapeHtml(tag)}</span><small>${count}</small>
          </button>
        `;
      }
      )
      .join("");
    els.secretFilters.querySelectorAll("[data-secret-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeSecretFilter = button.dataset.secretFilter || "全部";
        selectedSecretImageIndexes = new Set();
        renderSecretGallery();
      });
    });
    renderSecretAlbumView(activeAlbum);
    return;
  }

  activeSecretFilter = "全部";
  els.secretFilters.hidden = true;
  els.secretFilters.innerHTML = "";
  const activeFolder = secretFolders.find((folder) => folder.id === activeSecretFolderId);
  const activeFolderName = activeFolder?.name || "默认文件夹";
  const visible = sortSecretItems(secretItems).filter((item) => {
    const folderMatch = activeSecretFolderId === "unfiled"
      ? !item.folderId
      : item.folderId === activeSecretFolderId;
    return folderMatch && secretItemMatchesSearch(item);
  });
  const albumCards = visible
    .map((item, index) => {
      const itemImages = normalizeSecretImages(item.images);
      const cover = item.coverImage || itemImages[0]?.image_url || "";
      const mosaicImages = [
        cover,
        ...itemImages.map((image) => image.thumbnail_url || image.image_url),
      ].filter((url, imageIndex, urls) => url && urls.indexOf(url) === imageIndex).slice(0, 3);
      const linkedPhoto = photos.find((photo) => photo.id === item.linkedPhotoId);
      const linkedTitle = linkedPhoto ? getDisplayTitle(linkedPhoto) || "关联日记" : "";
      return `
        <article class="secret-card" data-secret-album-card="${escapeHtml(item.id)}">
          <button class="secret-cover" type="button" data-secret-index="${index}">
            <span class="secret-cover-mosaic secret-cover-mosaic-${Math.max(1, mosaicImages.length)}">
              ${mosaicImages.length
                ? mosaicImages.map((url, mosaicIndex) => `<img src="${escapeHtml(url)}" alt="${mosaicIndex === 0 ? escapeHtml(item.title || item.category || "相册封面") : ""}" loading="lazy" decoding="async" />`).join("")
                : `<i aria-hidden="true">Empty</i>`}
            </span>
            <span class="secret-cover-count">${String(itemImages.length).padStart(2, "0")}</span>
          </button>
          <div class="secret-card-copy">
            <div>
              <p class="kicker">ALBUM</p>
              <h3>${escapeHtml(item.title || "未命名相册")}</h3>
            </div>
            ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
            ${linkedTitle ? `<small>关联：${escapeHtml(linkedTitle)}</small>` : ""}
            <div class="secret-card-sort">
              <button type="button" data-secret-album-move="${escapeHtml(item.id)}:-1" aria-label="向前移动相册" title="向前移动" ${index === 0 ? "disabled" : ""}>↑</button>
              <button type="button" data-secret-album-move="${escapeHtml(item.id)}:1" aria-label="向后移动相册" title="向后移动" ${index === visible.length - 1 ? "disabled" : ""}>↓</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  els.secretGallery.innerHTML = `
    <header class="secret-collection-header">
      <div>
        <p class="kicker">Collection</p>
        <h3>${escapeHtml(activeFolderName)}</h3>
        <p>${visible.length ? `${visible.length} 个相册，${visible.reduce((total, item) => total + normalizeSecretImages(item.images).length, 0)} 件展品` : "这里还没有相册"}</p>
      </div>
      <div class="secret-collection-actions">
        ${activeFolder ? `<button type="button" data-secret-folder-rename>重命名</button><button class="danger" type="button" data-secret-folder-delete>删除收藏夹</button>` : ""}
        <button class="primary" type="button" data-secret-create-album>新建相册</button>
      </div>
    </header>
    ${visible.length
      ? `<div class="secret-album-wall">${albumCards}</div>`
      : `<button class="secret-empty-collection" type="button" data-secret-create-album><span>＋</span><strong>建立第一本相册</strong><small>照片会保存在私人秘藏中</small></button>`}
  `;
  els.secretGallery.querySelectorAll("[data-secret-create-album]").forEach((button) => {
    button.addEventListener("click", () => {
      if (els.secretComposer?.hidden) els.secretComposer.hidden = false;
      setSecretExpanded(true);
      if (els.secretFolderInput) els.secretFolderInput.value = activeSecretFolderId === "unfiled" ? "" : activeSecretFolderId;
      els.secretComposer?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  els.secretGallery.querySelector("[data-secret-folder-rename]")?.addEventListener("click", renameActiveSecretFolder);
  els.secretGallery.querySelector("[data-secret-folder-delete]")?.addEventListener("click", deleteActiveSecretFolder);
  els.secretGallery.querySelectorAll("[data-secret-index]").forEach((button) => {
    let longPressTimer = null;
    let longPressTriggered = false;
    const item = visible[Number(button.dataset.secretIndex)];
    const clearLongPress = () => {
      if (longPressTimer) window.clearTimeout(longPressTimer);
      longPressTimer = null;
    };
    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      clearLongPress();
      longPressTriggered = false;
      longPressTimer = window.setTimeout(() => {
        longPressTimer = null;
        longPressTriggered = true;
        if (navigator.vibrate) navigator.vibrate(24);
        void openSecretAlbumFolderDialog(item);
      }, 480);
    });
    button.addEventListener("pointerup", clearLongPress);
    button.addEventListener("pointercancel", clearLongPress);
    button.addEventListener("pointerleave", clearLongPress);
    button.addEventListener("contextmenu", (event) => {
      if (longPressTriggered) event.preventDefault();
    });
    button.addEventListener("click", () => {
      if (longPressTriggered) {
        longPressTriggered = false;
        return;
      }
      activeSecretAlbumId = visible[Number(button.dataset.secretIndex)]?.id || "";
      activeSecretFilter = "全部";
      secretSelectionMode = false;
      selectedSecretImageIndexes = new Set();
      secretAlbumEditing = false;
      secretAppendExpanded = false;
      secretMobileToolsExpanded = false;
      renderSecretGallery();
    });
  });
  els.secretGallery.querySelectorAll("[data-secret-album-move]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const [id, direction] = String(button.dataset.secretAlbumMove || "").split(":");
      moveSecretAlbum(id, Number(direction) || 0, visible);
    });
  });
}

async function openSecretAlbumFolderDialog(item) {
  if (!item || !session || !cloudDb) return;
  let dialog = document.querySelector("#secretAlbumFolderDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "secretAlbumFolderDialog";
    dialog.className = "secret-album-folder-dialog";
    document.body.append(dialog);
  }
  const choices = [
    { id: "", name: "默认文件夹", count: secretItems.filter((entry) => !entry.folderId).length },
    ...secretFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      count: secretItems.filter((entry) => entry.folderId === folder.id).length,
    })),
  ];
  dialog.innerHTML = `<form method="dialog">
    <header><div><span>Move Album</span><h2>移动相册</h2><p>${escapeHtml(item.title || "未命名相册")}</p></div><button value="cancel" type="submit" aria-label="关闭">×</button></header>
    <div class="secret-folder-choice-list">${choices.map((folder) => {
      const current = (item.folderId || "") === folder.id;
      return `<button class="${current ? "current" : ""}" type="submit" value="${escapeHtml(folder.id || "__default__")}" ${current ? "disabled" : ""}><span><i aria-hidden="true"></i><strong>${escapeHtml(folder.name)}</strong></span><small>${folder.count} 个相册</small></button>`;
    }).join("")}</div>
    <footer>长按相册，可以随时重新整理</footer>
  </form>`;
  dialog.showModal();
  await new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
  const targetFolderId = dialog.returnValue === "__default__" ? "" : dialog.returnValue;
  if (!targetFolderId && dialog.returnValue !== "__default__") return;
  await moveSecretAlbumToFolder(item, targetFolderId);
}

async function moveSecretAlbumToFolder(item, folderId = "") {
  if (!item || !cloudDb || !session || (item.folderId || "") === folderId) return;
  setSecretStatus("正在移动相册...");
  const { error } = await secretRepository.updateOwnedItem(item.id, {
    folder_id: folderId || null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    setSecretStatus(error.message || "移动相册失败。");
    showMiniToast("移动失败", { kind: "error" });
    return;
  }
  item.folderId = folderId;
  item.updatedAt = new Date().toISOString();
  saveSecretItemsCache(session.user.id);
  renderSecretGallery();
  setSecretStatus("相册已移动。");
  showMiniToast("相册已移动", { kind: "success" });
}

function renderSecretAlbumView(item) {
  const images = normalizeSecretImages(item.images);
  const displayEntries = sortSecretDisplayEntries(
    images
      .map((image, index) => ({ image, index }))
      .filter(({ image }) => imageMatchesSecretFilter(image) && secretImageMatchesSearch(image)),
    item
  );
  const photoSortDescending = getSecretPhotoSortDescending(item);
  const hasNumericPhotoOrder = images.some(
    (image) => getSecretImageNumericOrder(image) !== null
  );
  const linkedPhoto = photos.find((photo) => photo.id === item.linkedPhotoId);
  const linkedTitle = linkedPhoto ? getDisplayTitle(linkedPhoto) || "关联日记" : "";
  const validSelectedIndexes = [...selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
  const selectedCount = validSelectedIndexes.length;
  const singleSelectedIndex = selectedCount === 1 ? validSelectedIndexes[0] : -1;
  const singleSelectedDisplayPosition = displayEntries.findIndex(({ index }) => index === singleSelectedIndex);
  const knownTags = getSecretAlbumTagCounts(item)
    .map(({ tag }) => tag)
    .filter((tag) => !["全部", FAVORITE_SECRET_PHOTO_TAG].includes(tag));
  const selectedTags = [...new Set(
    validSelectedIndexes.flatMap((index) => normalizeSecretPhotoTags(images[index]))
  )].filter((tag) => tag !== DEFAULT_SECRET_PHOTO_TAG);
  const moveTargetOptions = sortSecretItems(secretItems)
    .filter((entry) => entry.id !== item.id)
    .map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.title || entry.category || "未命名相册")}</option>`)
    .join("");
  els.secretGallery.innerHTML = `
    <section class="secret-album-view ${secretSelectionMode ? "selection-active" : ""} ${secretSelectionMode && secretMobileToolsExpanded ? "tools-expanded" : ""}">
      <header class="secret-album-head">
        <button class="secret-back-button" type="button" data-secret-back aria-label="返回收藏夹">←</button>
        <div class="secret-album-heading-copy">
          <p class="kicker">ALBUM</p>
          <div class="secret-album-title-row">
            <h3>${escapeHtml(item.title || "未命名相册")}</h3>
          </div>
          <small>${images.length} 件展品${linkedTitle ? ` · 关联 ${escapeHtml(linkedTitle)}` : ""}</small>
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        </div>
        <div class="secret-album-actions">
          <button class="primary" type="button" data-secret-toggle-append aria-label="${secretAppendExpanded ? "收起添加相片" : "添加相片"}">${secretAppendExpanded ? "收起" : "+ 添加相片"}</button>
          <button type="button" data-secret-edit-album aria-label="${secretAlbumEditing ? "收起相册设置" : "相册设置"}">${secretAlbumEditing ? "收起编辑" : "相册设置"}</button>
        </div>
      </header>
      <button class="secret-mobile-back" type="button" data-secret-back aria-label="返回相册">‹ <span>返回相册</span></button>
      <div class="secret-album-toolbar ${secretSelectionMode && secretMobileToolsExpanded ? "tools-expanded" : ""}">
        <div class="secret-toolbar-primary">
          ${
          secretSelectionMode
              ? `<div class="secret-inspector-heading"><span>Selection</span><strong>已选 ${selectedCount} 张</strong></div><div class="secret-selection-primary-actions"><button type="button" data-secret-select-mode>取消选择</button><button class="delete-secret danger" type="button" data-secret-delete-selected ${selectedCount ? "" : "disabled"}>删除</button></div>`
              : `
                <button type="button" data-secret-select-mode>选择图片</button>
              `
          }
        </div>
        ${
          secretSelectionMode
            ? `
              <div class="secret-quick-move-actions">
                <button type="button" data-secret-move="-1" title="${hasNumericPhotoOrder ? "当前相册按数字 Tag 自然顺序排列" : "前移图片"}" ${!hasNumericPhotoOrder && singleSelectedDisplayPosition > 0 ? "" : "disabled"}>前移</button>
                <button type="button" data-secret-move="1" title="${hasNumericPhotoOrder ? "当前相册按数字 Tag 自然顺序排列" : "后移图片"}" ${!hasNumericPhotoOrder && singleSelectedDisplayPosition >= 0 && singleSelectedDisplayPosition < displayEntries.length - 1 ? "" : "disabled"}>后移</button>
              </div>
              <button class="secret-tools-toggle" type="button" data-secret-tools-toggle>
                ${secretMobileToolsExpanded ? "收起工具" : `编辑工具 · 已选 ${selectedCount}`}
              </button>
              <div class="secret-selection-actions">
                <button type="button" data-secret-select-all>${displayEntries.length && displayEntries.every(({ index }) => selectedSecretImageIndexes.has(index)) ? "取消全选" : "全选"}</button>
                <button type="button" data-secret-set-cover ${singleSelectedIndex >= 0 ? "" : "disabled"}>设为封面</button>
                <div class="secret-photo-move-editor">
                  <select data-secret-move-album-select ${selectedCount && moveTargetOptions ? "" : "disabled"}>
                    <option value="">移动到其它相册</option>
                    ${moveTargetOptions}
                  </select>
                  <button type="button" data-secret-move-album ${selectedCount && moveTargetOptions ? "" : "disabled"}>移动</button>
                </div>
                <div class="secret-photo-tag-editor">
                  <span class="secret-editor-label">为选中照片添加 Tag</span>
                  <input data-secret-photo-tag-input maxlength="32" list="secretCategoryList" placeholder="${DEFAULT_SECRET_PHOTO_TAG}" />
                  <button type="button" data-secret-apply-photo-tag ${selectedCount ? "" : "disabled"}>保存 tag</button>
                  ${selectedTags.length ? `<div class="secret-selected-tags">${selectedTags.map((tag) => `<button type="button" data-secret-remove-selected-tag="${escapeHtml(tag)}" title="从选中照片移除">${escapeHtml(tag)} <b>×</b></button>`).join("")}</div>` : ""}
                  <div class="secret-photo-tag-picks">
                    ${knownTags
                      .map((tag) => `<button type="button" data-secret-pick-photo-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
                      .join("")}
                  </div>
                </div>
              </div>
            `
            : ""
        }
      </div>
      <div class="secret-album-content">
      ${
        secretAlbumEditing
          ? `
            <form class="secret-album-edit" data-secret-edit-form>
              <input data-secret-edit-title maxlength="80" value="${escapeHtml(item.title || "")}" placeholder="相册名" />
              <label class="secret-sort-setting">
                <span>照片顺序</span>
                <select data-secret-edit-sort title="${hasNumericPhotoOrder ? "存在数字 Tag 时，始终优先按编号从大到小显示" : "设置没有数字 Tag 的照片顺序"}">
                  <option value="desc" ${photoSortDescending ? "selected" : ""}>新到旧 · 倒序</option>
                  <option value="asc" ${photoSortDescending ? "" : "selected"}>旧到新 · 正序</option>
                </select>
                ${hasNumericPhotoOrder ? `<small>数字 Tag 已优先按自然顺序排列：1、2……9、10……99</small>` : ""}
              </label>
              <select data-secret-edit-folder>
                <option value="" ${item.folderId ? "" : "selected"}>默认文件夹</option>
                ${secretFolders.map((folder) => `<option value="${escapeHtml(folder.id)}" ${item.folderId === folder.id ? "selected" : ""}>${escapeHtml(folder.name)}</option>`).join("")}
              </select>
              <textarea data-secret-edit-note rows="2" placeholder="备注">${escapeHtml(item.note || "")}</textarea>
              <div>
                <button class="primary" type="submit">保存相册</button>
                <button type="button" data-secret-edit-cancel>取消</button>
                <button class="danger" type="button" data-secret-delete-current>删除相册</button>
              </div>
              ${moveTargetOptions ? `
                <div class="secret-album-merge">
                  <span><strong>移动整个相册</strong><small>全部图片将并入目标相册，完成后删除当前空相册。</small></span>
                  <select data-secret-merge-target>
                    <option value="">选择目标相册</option>
                    ${moveTargetOptions}
                  </select>
                  <button class="danger" type="button" data-secret-merge-album>移动并合并</button>
                </div>
              ` : ""}
            </form>
          `
          : ""
      }
      ${
        secretAppendExpanded
          ? `
            <form class="secret-append-panel" data-secret-append-form>
              <textarea data-secret-append-links rows="3" placeholder="粘贴图片链接，每行一个"></textarea>
              <label class="secret-append-files">
                <span>选择图片</span>
                <input data-secret-append-files type="file" accept="image/*" multiple />
              </label>
              <div class="secret-append-actions">
                <button class="primary" type="submit">添加到相册</button>
                ${linkedPhoto ? `<button type="button" data-secret-open-linked>打开关联日记</button>` : ""}
              </div>
            </form>
          `
          : linkedPhoto
            ? `<button class="secret-linked-button" type="button" data-secret-open-linked>打开关联日记</button>`
            : ""
      }
      <button class="secret-back-top" type="button" data-secret-back-top aria-label="回到秘藏相册顶部">↑</button>
      <div class="secret-photo-filter-row">
        <button class="secret-photo-sort" type="button" data-secret-photo-sort aria-label="按上传时间排序">
          ${photoSortDescending ? "新到旧" : "旧到新"} <span>${photoSortDescending ? "↓" : "↑"}</span>
        </button>
        ${
          !["全部", DEFAULT_SECRET_PHOTO_TAG, FAVORITE_SECRET_PHOTO_TAG].includes(activeSecretFilter)
            ? `<button class="secret-delete-tag" type="button" data-secret-delete-tag>删除当前 tag</button>`
            : ""
        }
      </div>
      <div class="secret-album-grid">
        ${displayEntries
          .map(
            ({ image, index }) => `
              <button class="secret-album-photo ${secretSelectionMode ? "selectable" : ""} ${selectedSecretImageIndexes.has(index) ? "selected" : ""} ${Number(image.width) && Number(image.height) && Number(image.height) / Number(image.width) > 1.65 ? "is-long" : ""}" type="button" data-secret-photo="${index}">
                <img class="secret-progressive-image" src="${escapeHtml(isMobileViewport() ? (image.thumbnail_url || image.image_url) : image.image_url)}" data-full-src="${escapeHtml(image.image_url)}" alt="${escapeHtml(item.title || item.category || "秘藏图片")} ${index + 1}" loading="lazy" decoding="async" />
                <small class="secret-photo-tag">${escapeHtml(normalizeSecretPhotoTags(image).slice(0, 2).join(" · "))}</small>
                ${image.favorite ? `<strong class="secret-photo-favorite">♥</strong>` : ""}
                ${secretSelectionMode ? `<span>${selectedSecretImageIndexes.has(index) ? "已选" : String(index + 1).padStart(2, "0")}</span>` : ""}
              </button>
            `
          )
          .join("") || `<div class="empty">这个 tag 下还没有照片。</div>`}
      </div>
      </div>
    </section>
  `;
  updateSecretToolbarTop();
  requestAnimationFrame(updateSecretToolbarTop);
  prepareFeedImages(els.secretGallery);
  els.secretGallery.querySelectorAll("[data-secret-back]").forEach((button) => {
    button.addEventListener("click", () => {
      activeSecretAlbumId = "";
      secretSelectionMode = false;
      selectedSecretImageIndexes = new Set();
      secretAlbumEditing = false;
      secretAppendExpanded = false;
      secretMobileToolsExpanded = false;
      renderSecretGallery();
    });
  });
  els.secretGallery.querySelector("[data-secret-toggle-append]")?.addEventListener("click", () => {
    secretAppendExpanded = !secretAppendExpanded;
    renderSecretGallery();
  });
  els.secretGallery.querySelector("[data-secret-merge-album]")?.addEventListener("click", () => {
    const targetId = els.secretGallery.querySelector("[data-secret-merge-target]")?.value || "";
    mergeSecretAlbumInto(item, targetId);
  });
  els.secretGallery.querySelector("[data-secret-edit-album]")?.addEventListener("click", () => {
    secretAlbumEditing = !secretAlbumEditing;
    renderSecretGallery();
  });
  els.secretGallery.querySelector("[data-secret-edit-cancel]")?.addEventListener("click", () => {
    secretAlbumEditing = false;
    renderSecretGallery();
  });
  els.secretGallery.querySelector("[data-secret-edit-form]")?.addEventListener("submit", (event) => saveSecretAlbumEdit(event, item));
  els.secretGallery.querySelector("[data-secret-append-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    appendSecretAlbumImages({
      files: Array.from(form.querySelector("[data-secret-append-files]")?.files || []),
      linksText: form.querySelector("[data-secret-append-links]")?.value || "",
      form,
    });
  });
  els.secretGallery.querySelector("[data-secret-append-files]")?.addEventListener("click", (event) => {
    event.currentTarget.value = "";
  });
  els.secretGallery.querySelector("[data-secret-append-files]")?.addEventListener("change", (event) => {
    const files = Array.from(event.currentTarget.files || []);
    if (!files.length) return;
    const form = event.currentTarget.closest("[data-secret-append-form]");
    appendSecretAlbumImages({
      files,
      form,
    });
  });
  els.secretGallery.querySelector("[data-secret-append-form]")?.addEventListener("paste", (event) => {
    const pastedFiles = getImageFilesFromClipboard(event, "secret-append-pasted");
    if (!pastedFiles.length) return;
    event.preventDefault();
    appendSecretAlbumImages({
      files: pastedFiles,
      form: event.currentTarget,
    });
  });
  els.secretGallery.querySelector("[data-secret-open-linked]")?.addEventListener("click", () => {
    activeSecretDialogItem = item;
    openSecretLinkedDiary();
  });
  els.secretGallery.querySelector("[data-secret-delete-current]")?.addEventListener("click", () => deleteSecretItem(item));
  els.secretGallery.querySelector("[data-secret-photo-sort]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    const saved = await setSecretPhotoSortDescending(item, !getSecretPhotoSortDescending(item));
    if (saved) renderSecretGallery();
    else button.disabled = false;
  });
  els.secretGallery.querySelector("[data-secret-delete-tag]")?.addEventListener("click", () => deleteCurrentSecretTag(item));
  els.secretGallery.querySelector("[data-secret-select-mode]")?.addEventListener("click", () => {
    secretSelectionMode = !secretSelectionMode;
    secretMobileToolsExpanded = false;
    if (!secretSelectionMode) selectedSecretImageIndexes = new Set();
    renderSecretGallery();
  });
  els.secretGallery.querySelector("[data-secret-tools-toggle]")?.addEventListener("click", () => {
    secretMobileToolsExpanded = !secretMobileToolsExpanded;
    renderSecretGallery();
  });
  els.secretGallery.querySelector("[data-secret-select-all]")?.addEventListener("click", () => {
    if (!secretSelectionMode) return;
    const visibleIndexes = displayEntries.map(({ index }) => index);
    const allVisibleSelected = visibleIndexes.length > 0 && visibleIndexes.every((index) => selectedSecretImageIndexes.has(index));
    selectedSecretImageIndexes =
      allVisibleSelected
        ? new Set()
        : new Set(visibleIndexes);
    renderSecretGallery();
  });
  els.secretGallery.querySelector("[data-secret-delete-selected]")?.addEventListener("click", () => deleteSelectedSecretImages(item));
  els.secretGallery.querySelector("[data-secret-set-cover]")?.addEventListener("click", () => setSelectedSecretCover(item));
  els.secretGallery.querySelector("[data-secret-move-album]")?.addEventListener("click", () => {
    const select = els.secretGallery.querySelector("[data-secret-move-album-select]");
    moveSelectedSecretImagesToAlbum(item, select?.value || "");
  });
  els.secretGallery.querySelector("[data-secret-apply-photo-tag]")?.addEventListener("click", () => {
    const input = els.secretGallery.querySelector("[data-secret-photo-tag-input]");
    applySecretPhotoTag(item, input?.value || "");
  });
  els.secretGallery.querySelectorAll("[data-secret-pick-photo-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = els.secretGallery.querySelector("[data-secret-photo-tag-input]");
      if (input) input.value = button.dataset.secretPickPhotoTag || DEFAULT_SECRET_PHOTO_TAG;
      applySecretPhotoTag(item, button.dataset.secretPickPhotoTag || DEFAULT_SECRET_PHOTO_TAG);
    });
  });
  els.secretGallery.querySelectorAll("[data-secret-remove-selected-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      removeSecretPhotoTagFromSelection(item, button.dataset.secretRemoveSelectedTag || "");
    });
  });
  els.secretGallery.querySelector("[data-secret-back-top]")?.addEventListener("click", () => {
    scrollSecretAlbumToTop();
  });
  els.secretGallery.querySelectorAll("[data-secret-move]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      await moveSelectedSecretImage(item, Number(button.dataset.secretMove) || 0);
    });
  });
  els.secretGallery.querySelectorAll("[data-secret-photo]").forEach((button) => {
    let longPressStart = null;
    const clearLongPress = () => {
      if (!secretPhotoLongPressTimer) return;
      window.clearTimeout(secretPhotoLongPressTimer);
      secretPhotoLongPressTimer = null;
      longPressStart = null;
    };
    button.addEventListener("pointerdown", (event) => {
      if (secretSelectionMode || (event.pointerType === "mouse" && event.button !== 0)) return;
      clearLongPress();
      secretPhotoLongPressTriggered = false;
      longPressStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      const index = Number(button.dataset.secretPhoto) || 0;
      secretPhotoLongPressTimer = window.setTimeout(() => {
        secretPhotoLongPressTriggered = true;
        secretPhotoLongPressTimer = null;
        longPressStart = null;
        secretSelectionMode = true;
        secretMobileToolsExpanded = false;
        selectedSecretImageIndexes = new Set([index]);
        if (navigator.vibrate) navigator.vibrate(18);
        renderSecretGallery();
      }, 450);
    });
    button.addEventListener("pointermove", (event) => {
      if (!longPressStart || longPressStart.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - longPressStart.x, event.clientY - longPressStart.y) > 10) {
        clearLongPress();
      }
    });
    button.addEventListener("pointerup", clearLongPress);
    button.addEventListener("pointercancel", clearLongPress);
    button.addEventListener("pointerleave", clearLongPress);
    button.addEventListener("dragstart", (event) => event.preventDefault());
    button.addEventListener("contextmenu", (event) => {
      if (secretSelectionMode || secretPhotoLongPressTriggered) event.preventDefault();
    });
    button.addEventListener("click", () => {
      if (secretPhotoLongPressTriggered) {
        secretPhotoLongPressTriggered = false;
        return;
      }
      const index = Number(button.dataset.secretPhoto) || 0;
      if (secretSelectionMode) {
        if (selectedSecretImageIndexes.has(index)) selectedSecretImageIndexes.delete(index);
        else selectedSecretImageIndexes.add(index);
        renderSecretGallery();
        return;
      }
      const visibleIndex = displayEntries.findIndex((entry) => entry.index === index);
      openSecretItem(item, Math.max(0, visibleIndex), {
        images: displayEntries.map((entry) => entry.image),
        returnImageUrl: displayEntries[Math.max(0, visibleIndex)]?.image?.image_url || "",
        returnElementTop: button.getBoundingClientRect().top,
        triggerElement: button,
      });
    });
  });
}

function openSecretItem(item, initialImageIndex = 0, options = {}) {
  if (!item) return;
  secretViewerReturnFocus = options.triggerElement || document.activeElement;
  secretViewerInfoOpen = false;
  dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
  dialogRestorePhotoId = "";
  dialogRestorePhotoTop = 0;
  // A full-screen secret viewer does not need the body to be shifted to a
  // negative top offset. Keeping the page in place avoids a visible jump.
  lockedDialogScrollY = dialogRestoreScrollY;
  dialogLockUsesFixed = false;
  document.documentElement.classList.add("dialog-scroll-locked");
  document.body.classList.add("dialog-scroll-locked");
  activeDialogPhoto = null;
  activeSecretDialogItem = item;
  dialogSecretSourceItem = null;
  els.dialog.classList.remove("mobile-page-dialog", "diary-detail-dialog", "diary-image-fullscreen", "secret-viewer-info-open");
  els.dialog.classList.add("no-comments-dialog", "secret-image-dialog");
  if (isMobileViewport()) els.dialog.classList.add("secret-image-fullscreen");
  els.dialog.setAttribute("aria-modal", "true");
  document.body.classList.remove("mobile-dialog-open");
  dialogRandomMode = false;
  dialogImages = Array.isArray(options.images) && options.images.length
    ? options.images
    : normalizeSecretImages(item.images);
  dialogImageIndex = Math.min(
    Math.max(0, Number(initialImageIndex) || 0),
    Math.max(0, dialogImages.length - 1)
  );
  dialogRestoreSecretImageUrl = options.returnImageUrl || dialogImages[dialogImageIndex]?.image_url || "";
  dialogRestoreElementTop = Number(options.returnElementTop) || 0;
  els.dialogTitle.textContent = item.title || item.category || "秘藏相册";
  els.dialogMeta.textContent = `${normalizeSecretPhotoTags(dialogImages[dialogImageIndex]).slice(0, 2).join(" · ")} · ${dialogImageIndex + 1} / ${dialogImages.length}`;
  els.dialogNote.textContent = item.note || "";
  els.photoCommentsSection.hidden = true;
  if (els.dialogRandomButton) els.dialogRandomButton.hidden = true;
  if (els.dialogSecretReturnButton) els.dialogSecretReturnButton.hidden = true;
  if (els.dialogSecretLinkButton) {
    els.dialogSecretLinkButton.hidden = !item.linkedPhotoId;
  }
  showPhotoDialogPreservingScroll();
  renderDialogMedia();
  requestAnimationFrame(() => {
    if (isMobileViewport()) {
      fitSecretViewerImage();
      resetSecretImageZoom();
    }
    els.closeDialog?.focus({ preventScroll: true });
  });
}

function toggleDialogImageFullscreen({ bypassSuppression = false } = {}) {
  if (!dialogImages.length || !els.dialog.open) return;
  if (!bypassSuppression && Date.now() < suppressDialogImageClickUntil) return;
  const opening = !els.dialog.classList.contains("secret-image-fullscreen");
  resetSecretImageZoom();
  els.dialog.classList.toggle("secret-image-fullscreen", opening);
  els.dialog.classList.remove("secret-viewer-info-open");
  secretViewerInfoOpen = false;
  if (opening) {
    requestAnimationFrame(() => {
      fitSecretViewerImage();
      resetSecretImageZoom();
      els.closeDialog?.focus({ preventScroll: true });
    });
  } else {
    els.dialogImage.style.removeProperty("width");
    els.dialogImage.style.removeProperty("height");
    setSecretViewerStatus("");
  }
  updateSecretViewerToolbar();
}

function toggleDiaryImageFullscreen({ bypassSuppression = false } = {}) {
  if (!activeDialogPhoto || isMobileViewport() || !els.dialog?.open) return;
  if (!bypassSuppression && Date.now() < suppressDialogImageClickUntil) return;
  if (secretImageZoom.scale > 1.01) {
    resetSecretImageZoom();
    return;
  }
  const opening = !els.dialog.classList.contains("diary-image-fullscreen");
  els.dialog.classList.toggle("diary-image-fullscreen", opening);
  els.dialog.scrollTop = 0;
  if (opening) {
    requestAnimationFrame(() => {
      fitSecretViewerImage();
      resetSecretImageZoom();
    });
  } else {
    els.dialogImage.style.removeProperty("width");
    els.dialogImage.style.removeProperty("height");
  }
  updateDiaryViewerToolbar();
}

function openSecretLinkedDiary() {
  const item = activeSecretDialogItem;
  if (!item?.linkedPhotoId) return;
  const photo = photos.find((entry) => entry.id === item.linkedPhotoId);
  if (!photo) {
    setGlobalStatus("关联日记暂时没有加载到。");
    return;
  }
  openPhoto(photo, 0, { secretSourceItem: item });
}

function returnToSecretItem() {
  if (dialogSecretSourceItem) {
    openSecretItem(dialogSecretSourceItem);
  }
}

function scrollSecretAlbumToTop() {
  const target = els.secretGallery?.querySelector(".secret-album-head");
  if (!target) return;
  const topbarHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
  const mobileOffset = window.matchMedia(`(max-width: ${MOBILE_DIALOG_BREAKPOINT}px)`).matches
    ? 10
    : topbarHeight + 14;
  const targetY = target.getBoundingClientRect().top + window.scrollY - mobileOffset;
  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: "smooth",
  });
}

function getImageFilesFromClipboard(event, prefix = "pasted") {
  const items = Array.from(event.clipboardData?.items || []);
  return items
    .filter((item) => item.type.startsWith("image/"))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) return null;
      const extension = file.type?.split("/")[1] || "png";
      return new File([file], `${prefix}-${Date.now()}-${index + 1}.${extension}`, {
        type: file.type || "image/png",
      });
    })
    .filter(Boolean);
}

async function updateSecretAlbum(item, updates, successMessage = "相册已更新。") {
  if (!item || !cloudDb || !session) {
    setSecretStatus("请先登录。");
    return false;
  }
  const nextUpdates = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const { error } = await secretRepository.updateItem(item.id, nextUpdates);
  if (error) {
    setSecretStatus(error.message || "相册更新失败。");
    return false;
  }
  setSecretStatus(successMessage);
  await loadSecretItems();
  activeSecretAlbumId = item.id;
  return true;
}

async function moveSecretAlbum(itemId, direction, visibleItems = sortSecretItems(secretItems)) {
  if (!itemId || !direction || !cloudDb || !session) return;
  const ordered = sortSecretItems(visibleItems);
  const index = ordered.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  const current = ordered[index];
  const targetItem = ordered[target];
  const currentOrder = Number.isFinite(Number(current.sortOrder))
    ? Number(current.sortOrder)
    : getDefaultSecretSortOrder(current.createdAt);
  const targetOrder = Number.isFinite(Number(targetItem.sortOrder))
    ? Number(targetItem.sortOrder)
    : getDefaultSecretSortOrder(targetItem.createdAt);
  setSecretStatus("正在保存相册顺序...");
  const now = new Date().toISOString();
  const [first, second] = await Promise.all([
    secretRepository.updateOwnedItem(current.id, {
      sort_order: targetOrder,
      updated_at: now,
    }),
    secretRepository.updateOwnedItem(targetItem.id, {
      sort_order: currentOrder,
      updated_at: now,
    }),
  ]);
  const error = first.error || second.error;
  if (error) {
    setSecretStatus(error.message || "相册排序保存失败。");
    return;
  }
  current.sortOrder = targetOrder;
  targetItem.sortOrder = currentOrder;
  secretItems = sortSecretItems(secretItems);
  saveSecretItemsCache(session.user.id);
  renderSecretGallery();
  setSecretStatus("相册顺序已保存。");
}

async function saveSecretAlbumEdit(event, item) {
  event.preventDefault();
  const form = event.currentTarget;
  const title = form.querySelector("[data-secret-edit-title]")?.value.trim() || "";
  const sortDescending = form.querySelector("[data-secret-edit-sort]")?.value !== "asc";
  const folderId = form.querySelector("[data-secret-edit-folder]")?.value || "";
  const note = form.querySelector("[data-secret-edit-note]")?.value.trim() || "";
  const saved = await updateSecretAlbum(item, {
    title,
    note,
    folder_id: folderId || null,
    photo_sort_descending: sortDescending ? 1 : 0,
  }, "相册资料已保存。");
  if (saved) {
    secretAlbumEditing = false;
    renderSecretGallery();
  }
}

function getSingleSelectedSecretIndex(images) {
  const selected = [...selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
  return selected.length === 1 ? selected[0] : -1;
}

async function moveSelectedSecretImage(item, direction) {
  const images = normalizeSecretImages(item.images);
  const index = getSingleSelectedSecretIndex(images);
  const displayEntries = sortSecretDisplayEntries(
    images
      .map((image, imageIndex) => ({ image, index: imageIndex }))
      .filter(({ image }) => imageMatchesSecretFilter(image) && secretImageMatchesSearch(image)),
    item
  );
  const displayPosition = displayEntries.findIndex((entry) => entry.index === index);
  const targetEntry = displayEntries[displayPosition + direction];
  const target = targetEntry?.index ?? -1;
  if (index < 0 || displayPosition < 0 || target < 0 || target >= images.length) return false;
  const nextImages = [...images];
  [nextImages[index], nextImages[target]] = [nextImages[target], nextImages[index]];
  const saved = await updateSecretAlbum(
    item,
    { images: nextImages, cover_image: item.coverImage || "", cover_path: item.coverPath || "" },
    "图片位置已更新。"
  );
  if (!saved) {
    renderSecretGallery();
    return false;
  }
  selectedSecretImageIndexes = new Set([target]);
  renderSecretGallery();
  showMiniToast("图片位置已更新", { kind: "success" });
  return true;
}

async function setSelectedSecretCover(item) {
  const images = normalizeSecretImages(item.images);
  const index = getSingleSelectedSecretIndex(images);
  const image = images[index];
  if (!image) return;
  await updateSecretAlbum(
    item,
    { cover_image: image.image_url || "", cover_path: image.image_path || "" },
    "相册封面已更新。"
  );
  renderSecretGallery();
}

async function applySecretPhotoTag(item, rawTag) {
  const images = normalizeSecretImages(item.images);
  const selected = [...selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
  if (!selected.length) {
    setSecretStatus("先选择要打 tag 的图片。");
    return;
  }
  const nextTag = normalizeSecretPhotoTag(rawTag);
  const selectedSet = new Set(selected);
  const nextImages = images.map((image, index) =>
    selectedSet.has(index) ? addSecretImageTag(image, nextTag) : image
  );
  const saved = await updateSecretAlbum(item, { images: nextImages }, `已给 ${selected.length} 张图片添加「${nextTag}」tag。`);
  if (saved) {
    activeSecretFilter = nextTag;
    selectedSecretImageIndexes = new Set(selected);
    secretSelectionMode = true;
    renderSecretGallery();
  }
}

async function removeSecretPhotoTagFromSelection(item, rawTag) {
  const tag = normalizeSecretPhotoTag(rawTag);
  if (!item || !tag || tag === DEFAULT_SECRET_PHOTO_TAG) return;
  const images = normalizeSecretImages(item.images);
  const selected = [...selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
  if (!selected.length) return;
  const selectedSet = new Set(selected);
  const affectedCount = selected.filter((index) => secretImageHasTag(images[index], tag)).length;
  if (!affectedCount) return;
  const nextImages = images.map((image, index) =>
    selectedSet.has(index) && secretImageHasTag(image, tag) ? removeSecretImageTag(image, tag) : image
  );
  const saved = await updateSecretAlbum(
    item,
    { images: nextImages },
    `已从 ${affectedCount} 张选中照片移除「${tag}」。`
  );
  if (!saved) return;
  selectedSecretImageIndexes = new Set(selected);
  secretSelectionMode = true;
  renderSecretGallery();
}

async function deleteCurrentSecretTag(item) {
  const tag = normalizeSecretPhotoTag(activeSecretFilter);
  if (!item || ["全部", DEFAULT_SECRET_PHOTO_TAG, FAVORITE_SECRET_PHOTO_TAG].includes(tag)) return;
  const images = normalizeSecretImages(item.images);
  const affectedCount = images.filter((image) => secretImageHasTag(image, tag)).length;
  if (!affectedCount) {
    activeSecretFilter = "全部";
    renderSecretGallery();
    return;
  }
  const confirmed = await confirmAction({
    eyebrow: "整理照片标签",
    title: `删除「${tag}」Tag？`,
    message: `会从当前相册的 ${affectedCount} 张照片上移除，不会删除照片。`,
    confirmLabel: "删除 Tag",
    cancelLabel: "取消",
    danger: true,
  });
  if (!confirmed) return;
  const nextImages = images.map((image) =>
    secretImageHasTag(image, tag) ? removeSecretImageTag(image, tag) : image
  );
  const saved = await updateSecretAlbum(
    item,
    { images: nextImages },
    `已从 ${affectedCount} 张照片移除「${tag}」tag。`
  );
  if (!saved) return;
  activeSecretFilter = DEFAULT_SECRET_PHOTO_TAG;
  selectedSecretImageIndexes = new Set();
  secretSelectionMode = false;
  renderSecretGallery();
}

async function updateSecretDialogImage(updates = {}) {
  const item = activeSecretDialogItem;
  if (!item || !cloudDb || !session) return;
  const status = els.dialogNote?.querySelector("[data-secret-dialog-status]");
  const images = normalizeSecretImages(item.images);
  const displayedImage = dialogImages[dialogImageIndex] || {};
  const matchedIndex = images.findIndex((image) =>
    (displayedImage.image_path && image.image_path === displayedImage.image_path) ||
    image.image_url === displayedImage.image_url
  );
  const index = matchedIndex >= 0
    ? matchedIndex
    : Math.min(Math.max(0, dialogImageIndex), Math.max(0, images.length - 1));
  if (!images[index]) return;
  let nextImage = { ...images[index] };
  if (Object.prototype.hasOwnProperty.call(updates, "tag")) {
    nextImage = setSecretImageTags(nextImage, [updates.tag]);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "addTag")) {
    nextImage = addSecretImageTag(nextImage, updates.addTag);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "removeTag")) {
    nextImage = removeSecretImageTag(nextImage, updates.removeTag);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "favorite")) {
    nextImage.favorite = Boolean(updates.favorite);
  }
  const nextImages = images.map((image, imageIndex) => (imageIndex === index ? nextImage : image));
  if (status) status.textContent = "正在保存...";
  const { error } = await secretRepository.updateItem(item.id, {
    images: nextImages,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (status) status.textContent = error.message || "保存失败。";
    return;
  }
  item.images = nextImages;
  item.updatedAt = new Date().toISOString();
  const itemIndex = secretItems.findIndex((entry) => entry.id === item.id);
  if (itemIndex >= 0) {
    secretItems[itemIndex] = { ...secretItems[itemIndex], images: nextImages, updatedAt: item.updatedAt };
    activeSecretDialogItem = secretItems[itemIndex];
  }
  dialogImages = dialogImages.map((image) =>
    ((displayedImage.image_path && image.image_path === displayedImage.image_path) || image.image_url === displayedImage.image_url)
      ? nextImage
      : image
  );
  if (session?.user?.id) saveSecretItemsCache(session.user.id);
  renderSecretGallery();
  renderDialogMedia();
  const message = Object.prototype.hasOwnProperty.call(updates, "favorite")
    ? nextImage.favorite
      ? "已加入收藏。"
      : "已取消收藏。"
    : Object.prototype.hasOwnProperty.call(updates, "removeTag")
      ? `已移除「${normalizeSecretPhotoTag(updates.removeTag)}」。`
      : `已更新 tag。`;
  const nextStatus = els.dialogNote?.querySelector("[data-secret-dialog-status]");
  if (nextStatus) nextStatus.textContent = message;
}

async function deleteSelectedSecretImages(item) {
  const images = normalizeSecretImages(item.images);
  const selected = [...selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
  if (!selected.length) return;
  if (selected.length >= images.length) {
    setSecretStatus("至少保留一张图片。如果要全部删除，请删除整个相册。");
    return;
  }
  const confirmed = await confirmAction({
    eyebrow: "批量管理",
    title: `删除选中的 ${selected.length} 张图片？`,
    message: "保存后这些图片会从秘藏相册中移除。",
    confirmLabel: "删除图片",
    cancelLabel: "取消",
    danger: true,
  });
  if (!confirmed) return;
  const selectedSet = new Set(selected);
  const removedImages = images.filter((_, index) => selectedSet.has(index));
  const nextImages = images.filter((_, index) => !selectedSet.has(index));
  const coverStillExists = nextImages.some((image) => image.image_url === item.coverImage);
  const cover = coverStillExists ? { cover_image: item.coverImage || "", cover_path: item.coverPath || "" } : {
    cover_image: nextImages[0]?.image_url || "",
    cover_path: nextImages[0]?.image_path || "",
  };
  const saved = await updateSecretAlbum(item, { images: nextImages, ...cover }, `已删除 ${selected.length} 张图片。`);
  if (!saved) return;
  selectedSecretImageIndexes = new Set();
  secretSelectionMode = false;
  const paths = removedImages.flatMap((image) => [image.image_path, image.thumbnail_path]).filter(Boolean);
  if (paths.length) cleanupStoredImagePaths(paths).catch(() => {});
  renderSecretGallery();
}

async function moveSelectedSecretImagesToAlbum(sourceItem, targetId) {
  if (!sourceItem || !targetId || !cloudDb || !session) return;
  const targetItem = secretItems.find((entry) => entry.id === targetId);
  if (!targetItem || targetItem.id === sourceItem.id) return;
  const sourceImages = normalizeSecretImages(sourceItem.images);
  const targetImages = normalizeSecretImages(targetItem.images);
  const selected = [...selectedSecretImageIndexes].filter((index) => index >= 0 && index < sourceImages.length);
  if (!selected.length) {
    setSecretStatus("先选择要移动的图片。");
    return;
  }
  if (selected.length >= sourceImages.length) {
    setSecretStatus("至少给当前相册保留一张图片。");
    return;
  }
  if (targetImages.length + selected.length > SECRET_ALBUM_IMAGE_LIMIT) {
    setSecretStatus(`目标相册最多 ${SECRET_ALBUM_IMAGE_LIMIT} 张图。`);
    return;
  }
  const selectedSet = new Set(selected);
  const movingImages = sourceImages.filter((_, index) => selectedSet.has(index));
  const nextSourceImages = sourceImages.filter((_, index) => !selectedSet.has(index));
  const nextTargetImages = [...targetImages, ...movingImages];
  const sourceCoverStillExists = nextSourceImages.some((image) => image.image_url === sourceItem.coverImage);
  const sourceCover = sourceCoverStillExists
    ? { cover_image: sourceItem.coverImage || "", cover_path: sourceItem.coverPath || "" }
    : {
        cover_image: nextSourceImages[0]?.image_url || "",
        cover_path: nextSourceImages[0]?.image_path || "",
      };
  const targetCover = targetItem.coverImage
    ? { cover_image: targetItem.coverImage || "", cover_path: targetItem.coverPath || "" }
    : {
        cover_image: nextTargetImages[0]?.image_url || "",
        cover_path: nextTargetImages[0]?.image_path || "",
      };
  setSecretStatus("正在移动图片...");
  const now = new Date().toISOString();
  const [sourceResult, targetResult] = await Promise.all([
    secretRepository.updateOwnedItem(sourceItem.id, {
      images: nextSourceImages,
      ...sourceCover,
      updated_at: now,
    }),
    secretRepository.updateOwnedItem(targetItem.id, {
      images: nextTargetImages,
      ...targetCover,
      updated_at: now,
    }),
  ]);
  const error = sourceResult.error || targetResult.error;
  if (error) {
    setSecretStatus(error.message || "移动图片失败。");
    return;
  }
  selectedSecretImageIndexes = new Set();
  secretSelectionMode = false;
  await loadSecretItems();
  activeSecretAlbumId = sourceItem.id;
  renderSecretGallery();
  setSecretStatus(`已移动 ${movingImages.length} 张到「${targetItem.title || targetItem.category || "目标相册"}」。`);
}

async function mergeSecretAlbumInto(sourceItem, targetId) {
  if (!sourceItem || !targetId || !cloudDb || !session) return;
  const targetItem = secretItems.find((entry) => entry.id === targetId);
  if (!targetItem || targetItem.id === sourceItem.id) return;
  const sourceImages = normalizeSecretImages(sourceItem.images);
  const targetImages = normalizeSecretImages(targetItem.images);
  if (targetImages.length + sourceImages.length > SECRET_ALBUM_IMAGE_LIMIT) {
    setSecretStatus(`合并后会超过每个相册 ${SECRET_ALBUM_IMAGE_LIMIT} 张的上限。`);
    return;
  }
  const targetName = targetItem.title || targetItem.category || "目标相册";
  const confirmed = await confirmAction({
    eyebrow: "合并秘藏相册",
    title: `移动到「${targetName}」？`,
    message: `将移动 ${sourceImages.length} 张照片，完成后删除原相册。`,
    confirmLabel: "移动并合并",
    cancelLabel: "取消",
  });
  if (!confirmed) return;

  const originalTargetImages = [...targetImages];
  const mergedImages = [...targetImages, ...sourceImages];
  const now = new Date().toISOString();
  setSecretStatus("正在合并相册...");
  const targetUpdates = {
    images: mergedImages,
    cover_image: targetItem.coverImage || mergedImages[0]?.image_url || "",
    cover_path: targetItem.coverPath || mergedImages[0]?.image_path || "",
    updated_at: now,
  };
  const targetResult = await secretRepository.updateOwnedItem(targetItem.id, targetUpdates);
  if (targetResult.error) {
    setSecretStatus(targetResult.error.message || "无法写入目标相册。");
    return;
  }

  const deleteResult = await secretRepository.removeItem(sourceItem.id);
  if (deleteResult.error) {
    await secretRepository.updateOwnedItem(targetItem.id, {
      images: originalTargetImages,
      updated_at: targetItem.updatedAt || now,
    });
    setSecretStatus(deleteResult.error.message || "删除原相册失败，合并已回滚。");
    return;
  }

  activeSecretAlbumId = targetItem.id;
  activeSecretFilter = "全部";
  await loadSecretItems();
  renderSecretGallery();
  setSecretStatus(`已合并到「${targetName}」。`);
  showMiniToast("相册移动完成", { kind: "success" });
}

async function appendSecretAlbumImages(options = {}) {
  const item = secretItems.find((entry) => entry.id === activeSecretAlbumId);
  const files = Array.isArray(options.files)
    ? options.files
    : [];
  const urls = extractImageUrls(options.linksText || "");
  if (!item) return;
  if (!cloudDb || !session) {
    setSecretStatus("请先登录。");
    return;
  }
  if (!files.length && !urls.length) {
    setSecretStatus("请选择图片，或粘贴至少一个图片链接。");
    return;
  }
  const currentImages = normalizeSecretImages(item.images);
  const remaining = SECRET_ALBUM_IMAGE_LIMIT - currentImages.length;
  if (remaining <= 0) {
    setSecretStatus(`这个相册已经达到 ${SECRET_ALBUM_IMAGE_LIMIT} 张上限。`);
    return;
  }
  const appendFiles = files.slice(0, remaining);
  const appendUrls = urls.slice(0, Math.max(0, remaining - appendFiles.length));
  const skippedCount = Math.max(0, files.length + urls.length - appendFiles.length - appendUrls.length);
  const uploadedImages = [];
  setSecretStatus(`正在追加 ${appendFiles.length + appendUrls.length} 张图片...`);
  let loadingToast = showMiniToast("正在添加相片...", {
    kind: "loading",
    persist: true,
    placement: "center",
  });
  try {
    for (const [index, file] of appendFiles.entries()) {
      const base = slugify(item.title || item.category || "secret");
      const uploaded = await uploadImageFile(
        file,
        `${base}-append-${currentImages.length + index + 1}`,
        index + 1,
        appendFiles.length,
        {
          folder: "secrets",
          statusSetter: setSecretStatus,
        }
      );
      if (!uploaded) throw new Error("追加图片上传失败。");
      uploadedImages.push({
        ...uploaded,
        tag: DEFAULT_SECRET_PHOTO_TAG,
        tags: [DEFAULT_SECRET_PHOTO_TAG],
        uploadedAt: new Date().toISOString(),
      });
    }
    for (const [index, url] of appendUrls.entries()) {
      const safeName = `${slugify(item.title || item.category || "secret-link")}-link-${currentImages.length + appendFiles.length + index + 1}`;
      setSecretStatus(`正在复制第 ${index + 1}/${appendUrls.length} 个链接到 R2...`);
      try {
        const copied = await copyUrlToR2(url, safeName, "secrets");
        uploadedImages.push({
          image_path: `r2:${copied.key}`,
          image_url: copied.url,
          width: 0,
          height: 0,
          tag: DEFAULT_SECRET_PHOTO_TAG,
          tags: [DEFAULT_SECRET_PHOTO_TAG],
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.warn("Secret image link copy failed, using remote URL:", error);
        uploadedImages.push({
          image_path: "",
          image_url: url,
          width: 0,
          height: 0,
          tag: DEFAULT_SECRET_PHOTO_TAG,
          tags: [DEFAULT_SECRET_PHOTO_TAG],
          uploadedAt: new Date().toISOString(),
        });
      }
    }
    const nextImages = [...uploadedImages, ...currentImages];
    const updates = {
      images: nextImages,
      updated_at: new Date().toISOString(),
    };
    if (!item.coverImage && nextImages[0]?.image_url) {
      updates.cover_image = nextImages[0].image_url;
      updates.cover_path = nextImages[0].image_path || "";
    }
    const { error } = await secretRepository.updateOwnedItem(item.id, updates);
    if (error) throw error;
    setSecretStatus(
      skippedCount
        ? `已追加 ${uploadedImages.length} 张，另有 ${skippedCount} 张超过相册上限未添加。`
        : `已追加 ${uploadedImages.length} 张图片。`
    );
    if (options.form) options.form.reset();
    await loadSecretItems();
    activeSecretAlbumId = item.id;
    renderSecretGallery();
    dismissMiniToast(loadingToast);
    showMiniToast("相片已加入相册", { kind: "success", placement: "center" });
  } catch (error) {
    if (uploadedImages.length) {
      cleanupStoredImagePaths(uploadedImages.map((image) => image.image_path).filter(Boolean)).catch(() => {});
    }
    dismissMiniToast(loadingToast);
    showMiniToast("追加失败", { kind: "error", duration: 2600, placement: "center" });
    setSecretStatus(error.message || "追加图片失败。");
  } finally {
    dismissMiniToast(loadingToast);
  }
}

async function deleteSecretItem(item) {
  if (!item || !session) return;
  const confirmed = await confirmAction({
    eyebrow: "移到回收站",
    title: "删除这个秘藏相册？",
    message: "相册会保留 30 天，期间可以从设置里的回收站恢复。",
    confirmLabel: "删除相册",
    cancelLabel: "先保留",
    danger: true,
  });
  if (!confirmed) return;
  const trashSaved = await createTrashItem(
    "secret",
    item.id,
    item.title || item.category || "秘藏相册",
    secretToCloudRow(item, item.userId || session.user.id)
  );
  if (!trashSaved) {
    setSecretStatus("无法写入回收站，已取消删除。");
    return;
  }
  const { error } = await secretRepository.removeItem(item.id);
  if (error) {
    await rollbackTrashItem(trashSaved);
    setSecretStatus(error.message || "删除失败。");
    return;
  }
  if (activeSecretAlbumId === item.id) activeSecretAlbumId = "";
  setSecretStatus("秘藏已移到回收站，可在设置中恢复。");
  showMiniToast("秘藏已移到回收站", { kind: "success" });
  await loadSecretItems();
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

    els.weeklyReviewContent.innerHTML = `
      <section class="weekly-review-intro">
        <span>${activity.length ? "本周共同记录" : "等待第一条记录"}</span>
        <strong>${escapeHtml(summary)}</strong>
        ${leadingMember ? `<small>本周记录最活跃：${escapeHtml(getAuthorName(leadingMember[0]))} · ${leadingMember[1]} 次</small>` : ""}
      </section>
      <section class="weekly-review-stats">
        <article><strong>${weekPhotos.length}</strong><span>篇日记</span></article>
        <article><strong>${weekComments.length + thanks.length}</strong><span>次交流</span></article>
        <article><strong>${completedWishes.length}</strong><span>心愿达成</span></article>
        <article><strong>${weekendMoments.length}</strong><span>周末足迹</span></article>
      </section>
      <section class="weekly-review-stream">
        <header><strong>这一周发生了什么</strong><span>${activity.length} 条共同动态</span></header>
        ${activity.slice(0, 30).map((item) => `
          <button type="button" ${item.photoId ? `data-weekly-photo="${escapeHtml(item.photoId)}"` : ""}>
            <i>${escapeHtml(item.type.slice(0, 1))}</i>
            <span><small>${escapeHtml(item.type)} · ${escapeHtml(getAuthorName(item.userId))}</small><strong>${escapeHtml(item.title || "未命名")}</strong></span>
            <time>${formatCommentTime(item.date)}</time>
          </button>`).join("") || '<p class="settings-empty">本周还没有动态，下周回顾会从第一条记录开始。</p>'}
      </section>`;
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
    output.innerHTML = `
      <section class="family-recap-stats">
        <article><strong>${monthPhotos.length}</strong><span>本月日记</span></article>
        <article><strong>${monthWishes.length}</strong><span>完成心愿</span></article>
        <article><strong>${gratitudeNotes.filter((note) => new Date(note.created_at).getMonth() === now.getMonth()).length}</strong><span>本月留言</span></article>
      </section>
      <div class="family-timeline-title"><strong>往年今日</strong><span>${sameDayPhotos.length ? `${sameDayPhotos.length} 篇回忆` : "今天还没有往年回忆"}</span></div>
      <section class="family-memory-grid">${sameDayPhotos.map((photo) => {
        const image = getPhotoImages(photo)[0];
        return `<button type="button" data-timeline-photo="${escapeHtml(photo.id)}">${image ? `<img src="${escapeHtml(image.thumbnail_url || image.image_url)}" alt="" loading="lazy" decoding="async" />` : ""}<span>${escapeHtml(getPhotoLabel(photo))}</span><small>${new Date(photo.created_at).getFullYear()} 年</small></button>`;
      }).join("") || '<p class="settings-empty">日子继续积累，明年的今天这里就会有故事。</p>'}</section>`;
  } else {
    const entries = getFamilyTimelineEntries().slice(0, 60);
    output.innerHTML = `<section class="family-activity-list">${entries.map((item) => `
      <button type="button" ${item.photoId ? `data-timeline-photo="${escapeHtml(item.photoId)}"` : ""}>
        <i>${escapeHtml(item.type.slice(0, 1))}</i>
        <span><small>${escapeHtml(item.type)} · ${escapeHtml(getAuthorName(item.userId))}</small><strong>${escapeHtml(item.title || "未命名")}</strong><em>${escapeHtml(item.detail || "")}</em></span>
        <time>${formatCommentTime(item.date)}</time>
      </button>`).join("") || '<p class="settings-empty">家庭动态还是空的。</p>'}</section>`;
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
  els.settingsToolOrderList.innerHTML = order
    .map((id, index) => {
      const meta = TOOL_DOCK_LABELS[id] || { title: id, subtitle: "" };
      return `
        <article class="settings-tool-card" data-tool-order-id="${escapeHtml(id)}">
          <div class="settings-tool-copy">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(meta.title)}</strong>
            <small>${escapeHtml(meta.subtitle)}</small>
          </div>
          <div class="settings-tool-actions">
            <button type="button" data-tool-order-move="${escapeHtml(id)}:-1" aria-label="上移${escapeHtml(meta.title)}" title="上移" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-tool-order-move="${escapeHtml(id)}:1" aria-label="下移${escapeHtml(meta.title)}" title="下移" ${index === order.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </article>
      `;
    })
    .join("");
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
  overview.innerHTML = `
    <div class="settings-account-avatar">${renderAvatarMarkup(session?.user?.id, "settings-account-avatar-image")}</div>
    <div><strong>${escapeHtml(displayName)}</strong><span>@${escapeHtml(username || displayName)}</span><small>${session ? "账户已安全同步到 Cloudflare" : "请先登录"}</small></div>`;
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

function normalizeFoodOptions(values) {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim().slice(0, 24))
        .filter(Boolean)
    ),
  ].slice(0, 14);
}

function getFoodOptionsStorageKey(userId = session?.user?.id || "guest") {
  return `${FOOD_OPTIONS_KEY}:${userId}`;
}

function loadFoodOptions(userId = session?.user?.id || "guest") {
  try {
    const stored =
      localStorage.getItem(getFoodOptionsStorageKey(userId)) ||
      localStorage.getItem(FOOD_OPTIONS_KEY) ||
      "[]";
    const parsed = normalizeFoodOptions(JSON.parse(stored));
    return parsed.length ? parsed : [...DEFAULT_FOOD_OPTIONS];
  } catch {
    return [...DEFAULT_FOOD_OPTIONS];
  }
}

function saveFoodOptionsCache(userId = session?.user?.id || "guest") {
  localStorage.setItem(
    getFoodOptionsStorageKey(userId),
    JSON.stringify(foodOptions)
  );
}

async function persistFoodOptions(nextOptions) {
  if (
    !cloudDb ||
    !session ||
    !cloudSyncAvailable ||
    !foodOptionsCloudAvailable
  ) {
    els.foodWheelResult.textContent =
      "Cloudflare D1 尚未升级，候选没有保存。请先部署最新版数据库结构。";
    return false;
  }
  const normalized = normalizeFoodOptions(nextOptions);
  const { data, error } = await householdRepository.update(
    "user_profiles",
    {
      food_options: normalized,
      updated_at: new Date().toISOString(),
    },
    { user_id: session.user.id },
    { select: "food_options", single: true }
  );
  if (error) {
    els.foodWheelResult.textContent = `候选同步失败：${error.message}`;
    return false;
  }
  foodOptions = normalizeFoodOptions(data.food_options);
  accountProfile.foodOptions = [...foodOptions];
  saveFoodOptionsCache(session.user.id);
  return true;
}

function getWheelOptions() {
  return [...new Set([...foodOptions, ...recipes.map((recipe) => recipe.name)].filter(Boolean))].slice(0, 14);
}

function renderFoodWheel() {
  if (!els.foodWheel) return;
  const options = getWheelOptions();
  const canvas = els.foodWheel;
  const context = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 18;
  const colors = ["#55d6b5", "#ff806d", "#8798f2", "#f0c85f", "#e8f2ed", "#bd9ee8"];
  context.clearRect(0, 0, size, size);

  const segment = (Math.PI * 2) / options.length;
  options.forEach((option, index) => {
    const start = -Math.PI / 2 + index * segment;
    const end = start + segment;
    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, start, end);
    context.closePath();
    context.fillStyle = colors[index % colors.length];
    context.fill();
    context.strokeStyle = "#151816";
    context.lineWidth = 5;
    context.stroke();

    context.save();
    context.translate(center, center);
    context.rotate(start + segment / 2);
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillStyle = "#111512";
    context.font = `800 ${options.length > 10 ? 22 : 27}px "Microsoft YaHei", sans-serif`;
    const label = option.length > 7 ? `${option.slice(0, 7)}…` : option;
    context.fillText(label, radius - 30, 0);
    context.restore();
  });

  context.beginPath();
  context.arc(center, center, 62, 0, Math.PI * 2);
  context.fillStyle = "#151816";
  context.fill();
  context.strokeStyle = "#f2f4ef";
  context.lineWidth = 9;
  context.stroke();

  els.foodOptions.innerHTML = options
    .map(
      (option) => `
        <button type="button" data-remove-food="${escapeHtml(option)}" title="从转盘移除">
          ${escapeHtml(option)}<span>×</span>
        </button>
      `
    )
    .join("");
  els.foodOptions.querySelectorAll("[data-remove-food]").forEach((button) => {
    button.addEventListener("click", () => removeFoodOption(button.dataset.removeFood));
  });
}

async function addFoodOption() {
  const value = els.foodOptionInput.value.trim();
  if (!value) return;
  if (foodOptions.includes(value)) {
    els.foodOptionInput.value = "";
    return;
  }
  const saved = await persistFoodOptions([...foodOptions, value]);
  if (!saved) return;
  els.foodOptionInput.value = "";
  renderFoodWheel();
}

async function removeFoodOption(value) {
  const recipeNames = new Set(recipes.map((recipe) => recipe.name));
  if (recipeNames.has(value)) {
    els.foodWheelResult.textContent = "菜谱里的菜会自动保留在转盘中";
    return;
  }
  if (getWheelOptions().length <= 2) {
    els.foodWheelResult.textContent = "至少保留两个候选";
    return;
  }
  const saved = await persistFoodOptions(
    foodOptions.filter((item) => item !== value)
  );
  if (!saved) return;
  renderFoodWheel();
}

function spinFoodWheel() {
  if (foodWheelSpinning) return;
  const options = getWheelOptions();
  if (options.length < 2) return;
  foodWheelSpinning = true;
  els.spinFoodWheel.disabled = true;
  els.spinFoodWheel.textContent = "转动中";
  els.foodWheelResult.textContent = "转盘正在认真思考…";

  const winnerIndex = Math.floor(Math.random() * options.length);
  const segmentDegrees = 360 / options.length;
  const desiredMod = (360 - (winnerIndex * segmentDegrees + segmentDegrees / 2)) % 360;
  const currentMod = ((foodWheelRotation % 360) + 360) % 360;
  const delta = ((desiredMod - currentMod + 360) % 360) + 360 * 6;
  foodWheelRotation += delta;
  els.foodWheel.style.transform = `rotate(${foodWheelRotation}deg)`;

  window.setTimeout(() => {
    foodWheelSpinning = false;
    els.spinFoodWheel.disabled = false;
    els.spinFoodWheel.textContent = "开始转";
    const result = options[winnerIndex];
    els.foodWheelResult.textContent = `今天就吃：${result}`;
    els.foodWheelPeek.textContent = `今天吃 ${result}`;
  }, 4300);
}

function openFoodWheel() {
  els.foodWheelSection.hidden = false;
  closeMobileDiaryPage();
  if (els.dialog?.open) closePhotoDialog();
  if (els.foodWheelDialog.open) return;
  renderFoodWheel();
  els.foodWheelDialog.showModal();
}

function closeFoodWheel() {
  if (els.foodWheelDialog.open) {
    els.foodWheelDialog.close();
  }
}

function getRecipesStorageKey() {
  const name = session ? getSessionDisplayName() : "guest";
  return `${RECIPES_KEY}:${String(name).toLowerCase()}`;
}

function loadRecipes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getRecipesStorageKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecipes() {
  if (!session) return;
  localStorage.setItem(getRecipesStorageKey(), JSON.stringify(recipes));
}

function setRecipeExpanded(expanded) {
  els.recipeComposer.classList.toggle("expanded", expanded);
  els.recipeForm.hidden = !expanded;
  els.recipeToggle.setAttribute("aria-expanded", String(expanded));
}

function getSelectedSeasonings() {
  return Array.from(document.querySelectorAll('input[name="recipeSeasoning"]:checked')).map(
    (input) => input.value
  );
}

function setSelectedSeasonings(values = []) {
  const selected = new Set(values);
  document.querySelectorAll('input[name="recipeSeasoning"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

async function getRecipeCoverForSave() {
  const file = els.recipeCoverInput.files?.[0];
  if (!file && recipeCoverLink) {
    setRecipeStatus("正在把封面链接复制到 R2…");
    const copied = await copyUrlToR2(recipeCoverLink, `${slugify(els.recipeNameInput.value || "recipe-cover")}-link`, "recipes");
    recipeCoverLink = "";
    return copied.url;
  }
  if (!file) return recipeExistingCover;

  try {
    return await compressRecipeCover(file);
  } catch (error) {
    setRecipeStatus(`封面读取失败：${error.message || "请换一张图片"}`);
    return recipeExistingCover;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(blob);
  });
}

async function compressRecipeCover(file) {
  const compressed = await compressImage(file, {
    maxSide: 1200,
    jpeg: 0.82,
    minJpeg: 0.62,
    targetBytes: 360_000,
    rotatePortrait: true,
  });
  if (R2_UPLOAD_ENDPOINT) {
    const uploaded = await uploadToR2(compressed.blob, slugify(file.name || "recipe-cover"), "recipes");
    return uploaded.url;
  }
  return blobToDataUrl(compressed.blob);
}

function updateRecipeCoverPreview() {
  const file = els.recipeCoverInput.files?.[0];
  if (!file) {
    if (!recipeExistingCover) clearRecipeCoverPreview();
    return;
  }

  recipeCoverLink = "";

  if (recipeCoverPreviewUrl) URL.revokeObjectURL(recipeCoverPreviewUrl);
  recipeCoverPreviewUrl = URL.createObjectURL(file);
  els.recipeCoverPreview.src = recipeCoverPreviewUrl;
  els.recipeCoverPreview.hidden = false;
  els.recipeCoverName.textContent = file.name;
}

function setRecipeCoverPreview(src, name = "已保留原封面") {
  clearRecipeCoverPreview();
  if (!src) return;
  els.recipeCoverPreview.src = src;
  els.recipeCoverPreview.hidden = false;
  els.recipeCoverName.textContent = name;
}

function clearRecipeCoverPreview() {
  if (recipeCoverPreviewUrl) {
    URL.revokeObjectURL(recipeCoverPreviewUrl);
    recipeCoverPreviewUrl = "";
  }
  els.recipeCoverPreview.removeAttribute("src");
  els.recipeCoverPreview.hidden = true;
  els.recipeCoverName.textContent = "还没有选择封面";
}

function applyRecipeCoverUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    recipeCoverLink = parsed.href;
    els.recipeCoverInput.value = "";
    setRecipeCoverPreview(parsed.href, "已从剪贴板导入图片链接");
    if (els.recipeCoverLinkInput) els.recipeCoverLinkInput.value = "";
    setRecipeStatus("已添加图片链接，保存时会复制到 R2。");
    return true;
  } catch {
    setRecipeStatus("剪贴板里的图片链接格式不正确。");
    return false;
  }
}

function handleRecipeCoverPaste(event) {
  const files = getImageFilesFromClipboard(event, "recipe-cover-pasted");
  if (files.length) {
    event.preventDefault();
    const transfer = new DataTransfer();
    transfer.items.add(files[0]);
    els.recipeCoverInput.files = transfer.files;
    recipeExistingCover = "";
    recipeCoverLink = "";
    updateRecipeCoverPreview();
    setRecipeStatus("已读取剪贴板图片。");
    return;
  }
  const pastedUrl = getClipboardImageUrl(event.clipboardData);
  if (applyRecipeCoverUrl(pastedUrl)) event.preventDefault();
}

function resetRecipeForm() {
  els.recipeForm.reset();
  recipeEditingId = null;
  recipeExistingCover = "";
  recipeCoverLink = "";
  clearRecipeCoverPreview();
  setSelectedSeasonings([]);
  els.recipeFormTitle.textContent = "添加菜谱";
  els.recipeSubmitButton.textContent = "保存菜谱";
  els.recipeCancelEdit.hidden = true;
}

async function saveRecipe(event) {
  event.preventDefault();
  if (!session) {
    setRecipeStatus("请先登录后再保存菜谱。");
    return;
  }
  if (!cloudSyncAvailable) {
    setRecipeStatus(
      "Cloudflare D1 尚未升级，菜谱没有保存。请先部署最新版数据库结构。"
    );
    return;
  }

  const name = els.recipeNameInput.value.trim();
  if (!name) {
    setRecipeStatus("先写一个菜名。");
    return;
  }

  let coverImage;
  try {
    coverImage = await getRecipeCoverForSave();
  } catch (error) {
    setRecipeStatus(`封面导入失败：${error.message || "请检查图片链接"}`);
    return;
  }
  const previous = recipes.find((item) => item.id === recipeEditingId);
  let recipe = {
    id: normalizeUuid(recipeEditingId),
    userId: previous?.userId || session.user.id,
    name,
    category: els.recipeCategoryInput.value,
    time: els.recipeTimeInput.value.trim(),
    servings: els.recipeServingsInput.value.trim(),
    coverImage,
    seasonings: getSelectedSeasonings(),
    ingredients: splitLines(els.recipeIngredientsInput.value),
    steps: splitLines(els.recipeStepsInput.value),
    note: els.recipeNoteInput.value.trim(),
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const wasEditing = Boolean(recipeEditingId);
  if (cloudSyncAvailable) {
    const { data, error } = await householdRepository.upsert(
      "recipes",
      recipeToCloudRow(recipe, recipe.userId),
      { onConflict: "id", select: "*", single: true }
    );
    if (error) {
      setRecipeStatus(`菜谱同步失败：${error.message}`);
      return;
    }
    recipe = recipeFromCloudRow(data);
  }

  recipes = recipeEditingId
    ? recipes.map((item) => (item.id === recipeEditingId ? recipe : item))
    : [recipe, ...recipes];
  saveRecipes();
  resetRecipeForm();
  setRecipeExpanded(false);
  const gainedExp = await awardExperience(wasEditing ? "recipeEdit" : "recipe");
  setRecipeStatus(`${wasEditing ? "菜谱已更新。" : "菜谱已保存。"}${gainedExp ? ` 修为 +${gainedExp}` : ""}`);
  renderRecipes();
}

function renderRecipes() {
  renderOverview();
  renderFoodWheel();
  if (!els.recipesList) return;
  if (!session) {
    els.recipesList.innerHTML = `<div class="empty">登录后可以记录自己的菜谱。</div>`;
    setRecipeStatus("");
    return;
  }

  if (!recipes.length) {
    els.recipesList.innerHTML = `<div class="empty">还没有菜谱。先记录一道最近想复刻的菜。</div>`;
    return;
  }

  els.recipesList.innerHTML = recipes
    .map((recipe, index) => {
      const canManage = canManageItem(recipe);
      return `
        <article class="recipe-card">
          <div class="recipe-card-head">
            <span>${String(index + 1).padStart(2, "0")}</span>
            ${canManage ? `<div>
              <button type="button" data-edit-recipe="${escapeHtml(recipe.id)}">编辑</button>
              <button type="button" data-delete-recipe="${escapeHtml(recipe.id)}">删除</button>
            </div>` : ""}
          </div>
          ${renderRecipeCover(recipe)}
          <div class="recipe-card-content">
            <p class="kicker">${escapeHtml(recipe.category)} · ${formatRecipeDate(recipe.createdAt)} · ${escapeHtml(getAuthorName(recipe.userId))}</p>
            <h3>${escapeHtml(recipe.name)}</h3>
            <div class="recipe-meta">
              ${recipe.time ? `<span>${escapeHtml(recipe.time)}</span>` : ""}
              ${recipe.servings ? `<span>${escapeHtml(recipe.servings)}</span>` : ""}
            </div>
            ${renderSeasonings(recipe.seasonings)}
            <div class="recipe-columns">
              <section>
                <strong>食材</strong>
                ${renderRecipeList(recipe.ingredients, "还没写食材")}
              </section>
              <section>
                <strong>步骤</strong>
                ${renderRecipeList(recipe.steps, "还没写步骤")}
              </section>
            </div>
            ${recipe.note ? `<p class="recipe-note">${escapeHtml(recipe.note)}</p>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  els.recipesList.querySelectorAll("button[data-edit-recipe]").forEach((button) => {
    button.addEventListener("click", () => editRecipe(button.dataset.editRecipe));
  });
  els.recipesList.querySelectorAll("button[data-delete-recipe]").forEach((button) => {
    button.addEventListener("click", () => deleteRecipe(button.dataset.deleteRecipe));
  });
}

function renderRecipeCover(recipe) {
  if (recipe.coverImage) {
    return `
      <div class="recipe-cover">
        <img class="recipe-cover-backdrop" src="${escapeHtml(recipe.coverImage)}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <img class="recipe-cover-image" src="${escapeHtml(recipe.coverImage)}" alt="${escapeHtml(recipe.name)} 封面" loading="lazy" decoding="async" />
      </div>
    `;
  }

  return `<div class="recipe-cover placeholder"><span>${escapeHtml(recipe.name.slice(0, 1))}</span></div>`;
}

function renderSeasonings(seasonings = []) {
  if (!seasonings.length) return "";
  return `
    <div class="seasoning-tags">
      ${seasonings.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function editRecipe(id) {
  const recipe = recipes.find((item) => item.id === id);
  if (!recipe || !canManageItem(recipe)) return;

  recipeEditingId = id;
  recipeExistingCover = recipe.coverImage || "";
  recipeCoverLink = "";
  els.recipeNameInput.value = recipe.name || "";
  els.recipeCategoryInput.value = recipe.category || "家常菜";
  els.recipeTimeInput.value = recipe.time || "";
  els.recipeServingsInput.value = recipe.servings || "";
  els.recipeIngredientsInput.value = (recipe.ingredients || []).join("\n");
  els.recipeStepsInput.value = (recipe.steps || []).join("\n");
  els.recipeNoteInput.value = recipe.note || "";
  setSelectedSeasonings(recipe.seasonings || []);
  setRecipeCoverPreview(recipeExistingCover);
  els.recipeFormTitle.textContent = "编辑菜谱";
  els.recipeSubmitButton.textContent = "保存修改";
  els.recipeCancelEdit.hidden = false;
  setRecipeExpanded(true);
  setRecipeStatus(`正在编辑：${recipe.name}`);
  els.recipeComposer.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteRecipe(id) {
  const recipe = recipes.find((item) => item.id === id);
  if (!recipe || !canManageItem(recipe)) return;
  const ok = await confirmAction({
    eyebrow: "移到回收站",
    title: "删除这个菜谱？",
    message: `“${recipe.name}”会保留 30 天，期间可以恢复。`,
    confirmLabel: "删除菜谱",
    cancelLabel: "先保留",
    danger: true,
  });
  if (!ok) return;
  if (!cloudSyncAvailable) {
    setRecipeStatus("数据库尚未连接，不能删除菜谱。");
    return;
  }

  const trashSaved = await createTrashItem(
    "recipe",
    recipe.id,
    recipe.name,
    recipeToCloudRow(recipe, recipe.userId || session.user.id)
  );
  if (!trashSaved) {
    setRecipeStatus("无法写入回收站，已取消删除。");
    return;
  }
  const { error } = await householdRepository.remove("recipes", { id });
  if (error) {
    await rollbackTrashItem(trashSaved);
    setRecipeStatus(`删除同步失败：${error.message}`);
    return;
  }

  recipes = recipes.filter((item) => item.id !== id);
  saveRecipes();
  setRecipeStatus("菜谱已移到回收站，30 天内可以恢复。");
  renderRecipes();
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderRecipeList(items, emptyText) {
  if (!items?.length) return `<p class="recipe-empty">${emptyText}</p>`;
  return `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function formatRecipeDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function setRecipeStatus(message) {
  els.recipeStatus.textContent = message;
}

function setWishlistExpanded(expanded) {
  els.wishlistComposer.classList.toggle("expanded", expanded);
  els.wishlistForm.hidden = !expanded;
  els.wishlistToggle.setAttribute("aria-expanded", String(expanded));
}

function updateWishImagePreview() {
  const file = els.wishImageInput.files?.[0];
  if (!file) return;
  wishImageLink = "";
  if (wishImagePreviewUrl) URL.revokeObjectURL(wishImagePreviewUrl);
  wishImagePreviewUrl = URL.createObjectURL(file);
  wishRemoveImageRequested = false;
  els.wishImagePreview.src = wishImagePreviewUrl;
  els.wishImagePreview.hidden = false;
  els.wishImageName.textContent = file.name;
  els.wishRemoveImage.hidden = false;
}

function setWishImagePreview(src, name = "已保存的心愿图片") {
  clearWishImagePreview();
  if (!src) return;
  wishExistingImage = src;
  els.wishImagePreview.src = src;
  els.wishImagePreview.hidden = false;
  els.wishImageName.textContent = name;
  els.wishRemoveImage.hidden = false;
}

function clearWishImagePreview() {
  if (wishImagePreviewUrl) {
    URL.revokeObjectURL(wishImagePreviewUrl);
    wishImagePreviewUrl = "";
  }
  els.wishImageInput.value = "";
  if (els.wishImageLinkInput) els.wishImageLinkInput.value = "";
  wishImageLink = "";
  els.wishImagePreview.removeAttribute("src");
  els.wishImagePreview.hidden = true;
  els.wishImageName.textContent = "还没有选择图片";
  els.wishRemoveImage.hidden = true;
}

function removeWishImage() {
  clearWishImagePreview();
  wishExistingImage = "";
  wishRemoveImageRequested = true;
}

function handleWishImagePaste(event) {
  const imageItem = Array.from(event.clipboardData?.items || []).find((item) =>
    item.type.startsWith("image/")
  );
  if (!imageItem) {
    const pastedUrl = getClipboardImageUrl(event.clipboardData);
    if (applyWishImageUrl(pastedUrl)) event.preventDefault();
    return;
  }
  const file = imageItem.getAsFile();
  if (!file) return;

  event.preventDefault();
  const extension = file.type?.split("/")[1] || "png";
  const transfer = new DataTransfer();
  transfer.items.add(
    new File([file], `wish-${Date.now()}.${extension}`, {
      type: file.type || "image/png",
    })
  );
  els.wishImageInput.files = transfer.files;
  wishImageLink = "";
  updateWishImagePreview();
  setWishlistStatus("已读取剪切板图片。");
}

function applyWishImageUrl(rawUrl) {
  const urls = extractImageUrls(rawUrl);
  if (!urls.length) {
    setWishlistStatus("请输入完整的 http 或 https 图片链接。");
    return false;
  }
  wishImageLink = urls[0];
  wishRemoveImageRequested = false;
  els.wishImageInput.value = "";
  if (els.wishImageLinkInput) els.wishImageLinkInput.value = "";
  els.wishImagePreview.src = wishImageLink;
  els.wishImagePreview.hidden = false;
  els.wishImageName.textContent = "已添加图片链接";
  els.wishRemoveImage.hidden = false;
  setWishlistStatus("已添加图片链接，保存时会复制到 R2。");
  return true;
}

async function uploadWishImage(file, title, linkUrl = wishImageLink) {
  if (!file && linkUrl) {
    setWishlistStatus("正在把图片链接复制到 R2…");
    const copied = await copyUrlToR2(linkUrl, `${slugify(title || "wish")}-link`, "wishes");
    return { imageUrl: copied.url, imagePath: `r2:${copied.key}` };
  }
  if (!file) {
    return {
      imageUrl: wishRemoveImageRequested ? "" : wishExistingImage,
      imagePath: wishRemoveImageRequested ? "" : wishExistingImagePath,
    };
  }

  setWishlistStatus("正在压缩心愿图片…");
  const compressed = await compressImage(file);
  setWishlistStatus(
    `已压缩 ${formatFileSize(file.size)} → ${formatFileSize(compressed.blob.size)}，正在上传心愿图片…`
  );
  const uploaded = await uploadToR2(compressed.blob, slugify(title), "wishes");
  return { imageUrl: uploaded.url, imagePath: `r2:${uploaded.key}` };
}

function resetWishForm() {
  els.wishlistForm.reset();
  wishEditingId = null;
  wishExistingImage = "";
  wishExistingImagePath = "";
  wishImageLink = "";
  wishRemoveImageRequested = false;
  clearWishImagePreview();
  els.wishlistFormTitle.textContent = "添加心愿";
  els.wishSubmitButton.textContent = "保存心愿";
  els.wishCancelEdit.hidden = true;
}

function getWishlistStorageKey() {
  const name = session ? getSessionDisplayName() : "guest";
  return `${WISHLIST_KEY}:${String(name).toLowerCase()}`;
}

function loadWishes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getWishlistStorageKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWishes() {
  if (!session) return;
  localStorage.setItem(getWishlistStorageKey(), JSON.stringify(wishes));
}

async function saveWish(event) {
  event.preventDefault();
  if (!session) {
    setWishlistStatus("请先登录后再保存心愿。");
    return;
  }
  if (!cloudSyncAvailable) {
    setWishlistStatus(
      "Cloudflare D1 尚未升级，心愿没有保存。请先部署最新版数据库结构。"
    );
    return;
  }

  const title = els.wishTitleInput.value.trim();
  if (!title) {
    setWishlistStatus("先写一个心愿。");
    return;
  }

  const previous = wishes.find((item) => item.id === wishEditingId);
  let image;
  try {
    image = await uploadWishImage(els.wishImageInput.files?.[0], title, wishImageLink);
  } catch (error) {
    setWishlistStatus(`图片上传失败：${error.message}`);
    return;
  }

  let wish = {
    id: normalizeUuid(wishEditingId),
    userId: previous?.userId || session.user.id,
    title,
    type: els.wishTypeInput.value,
    date: els.wishDateInput.value,
    priority: els.wishPriorityInput.value,
    note: els.wishNoteInput.value.trim(),
    completionNote: els.wishCompletionNoteInput.value.trim(),
    imageUrl: image.imageUrl,
    imagePath: image.imagePath,
    done: previous?.done || false,
    completedAt: previous?.completedAt || "",
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (cloudSyncAvailable) {
    let row = wishCompletionNoteCloudAvailable
      ? wishToCloudRow(wish, wish.userId)
      : wishToLegacyCloudRow(wish, wish.userId);
    let { data, error } = await householdRepository.upsert("wishes", row, {
      onConflict: "id",
      select: "*",
      single: true,
    });
    if (error && isMissingCloudSchema(error)) {
      wishCompletionNoteCloudAvailable = false;
      row = wishToLegacyCloudRow(wish, wish.userId);
      const retry = await householdRepository.upsert("wishes", row, {
        onConflict: "id",
        select: "*",
        single: true,
      });
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      if (image.imagePath && image.imagePath !== previous?.imagePath) {
        await cleanupStoredImagePaths([image.imagePath]);
      }
      setWishlistStatus(`心愿同步失败：${error.message}`);
      return;
    }
    wish = wishFromCloudRow(data);
    if (!wishCompletionNoteCloudAvailable) {
      wish.completionNote = els.wishCompletionNoteInput.value.trim();
    }
  }

  const wasEditing = Boolean(wishEditingId);
  wishes = wasEditing
    ? wishes.map((item) => (item.id === wishEditingId ? wish : item))
    : [wish, ...wishes];
  saveWishes();
  if (
    previous?.imagePath &&
    previous.imagePath !== wish.imagePath &&
    cloudDb &&
    session
  ) {
    await cleanupStoredImagePaths([previous.imagePath]);
  }
  resetWishForm();
  setWishlistExpanded(false);
  const gainedExp = await awardExperience(wasEditing ? "wishEdit" : "wish");
  setWishlistStatus(
    `${!wishCompletionNoteCloudAvailable && wish.completionNote
      ? "心愿已保存；完成感想字段还没升级，请部署最新版 Cloudflare D1 结构后再编辑同步。"
      : wasEditing
        ? "心愿已更新。"
        : "心愿已保存。"}${gainedExp ? ` 修为 +${gainedExp}` : ""}`
  );
  renderWishes();
}

function renderWishes() {
  renderOverview();
  if (!els.wishlistList) return;
  updateWishTabs();
  if (!session) {
    els.wishlistList.innerHTML = `<div class="empty">登录后可以记录想做、想吃、想去的事。</div>`;
    setWishlistStatus("");
    return;
  }

  if (!wishes.length) {
    els.wishlistList.innerHTML = `<div class="empty">还没有心愿。先写一个以后想完成的小目标。</div>`;
    return;
  }

  const visibleWishes = wishes
    .filter((wish) => (activeWishView === "done" ? wish.done : !wish.done))
    .sort(compareWishesByPriority);

  if (!visibleWishes.length) {
    els.wishlistList.innerHTML =
      activeWishView === "done"
        ? `<div class="empty">已完成里还没有记录。完成心愿后会放到这里。</div>`
        : `<div class="empty">未完成心愿已经清空。现在可以写一个新的小目标。</div>`;
    return;
  }

  els.wishlistList.innerHTML = visibleWishes
    .map((wish, index) => {
      const canManage = canManageItem(wish);
      const stateText = wish.done ? "已完成" : "待实现";
      const completedDate = wish.completedAt ? formatWishDate(wish.completedAt) : "";
      const createdDate = wish.createdAt ? formatWishDate(wish.createdAt) : "";
      return `
        <article class="wish-card ${wish.done ? "done" : ""}">
          <div class="wish-card-top">
            <div class="wish-index-stack">
              <span class="wish-seq">Wish ${String(index + 1).padStart(2, "0")}</span>
              <span class="wish-state-pill ${wish.done ? "done" : "open"}">${stateText}</span>
            </div>
          </div>
          <div class="wish-card-layout">
            ${
              wish.imageUrl
                ? `<button class="wish-card-image-button" type="button" data-view-wish-image="${escapeHtml(wish.id)}" aria-label="查看 ${escapeHtml(wish.title)} 的完整图片和备注">
                    <img class="wish-card-image" src="${escapeHtml(wish.imageUrl)}" alt="${escapeHtml(wish.title)}" loading="lazy" decoding="async" />
                  </button>`
                : `<div class="wish-card-placeholder" aria-hidden="true">
                    <span>${escapeHtml(wish.type || "心愿")}</span>
                  </div>`
            }
            <div class="wish-card-content">
              <p class="kicker">${escapeHtml(wish.type)} · ${escapeHtml(wish.priority)} · ${escapeHtml(getAuthorName(wish.userId))}</p>
              <h3>${escapeHtml(wish.title)}</h3>
              <div class="wish-meta">
                ${createdDate ? `<span>添加 ${createdDate}</span>` : ""}
                ${wish.date ? `<span>计划 ${formatWishDate(wish.date)}</span>` : ""}
                ${completedDate ? `<span>完成 ${completedDate}</span>` : ""}
              </div>
              <div class="wish-card-details">
                ${wish.note ? `<p class="wish-note">${escapeHtml(wish.note)}</p>` : ""}
                ${
                  wish.done && wish.completionNote
                    ? `<div class="wish-completion-note" data-view-wish-detail="${escapeHtml(wish.id)}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(wish.title)} 的完整完成反馈">
                        <span>完成回执 <em>查看完整反馈</em></span>
                        <p>${escapeHtml(wish.completionNote)}</p>
                      </div>`
                    : wish.done
                      ? `<div class="wish-completion-note empty" data-view-wish-detail="${escapeHtml(wish.id)}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(wish.title)} 的完成详情">
                          <span>完成回执 <em>查看详情</em></span>
                          <p>已经完成啦，之后可以编辑补上一句感想。</p>
                        </div>`
                      : ""
                }
              </div>
            </div>
          </div>
          ${canManage ? `<div class="wish-actions">
            <button type="button" data-edit-wish="${escapeHtml(wish.id)}">编辑</button>
            <button class="complete" type="button" data-toggle-wish="${escapeHtml(wish.id)}">
              ${wish.done ? "取消完成" : "写完成感想"}
            </button>
            <button class="danger" type="button" data-delete-wish="${escapeHtml(wish.id)}">删除</button>
          </div>` : ""}
        </article>
      `;
    })
    .join("");

  els.wishlistList.querySelectorAll("button[data-edit-wish]").forEach((button) => {
    button.addEventListener("click", () => editWish(button.dataset.editWish));
  });
  els.wishlistList.querySelectorAll("button[data-view-wish-image]").forEach((button) => {
    button.addEventListener("click", () => {
      openWishImage(wishes.find((wish) => wish.id === button.dataset.viewWishImage));
    });
  });
  els.wishlistList.querySelectorAll("[data-view-wish-detail]").forEach((control) => {
    const openDetail = () => openWishImage(wishes.find((wish) => wish.id === control.dataset.viewWishDetail));
    control.addEventListener("click", openDetail);
    control.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDetail();
    });
  });
  els.wishlistList.querySelectorAll("button[data-toggle-wish]").forEach((button) => {
    button.addEventListener("click", () => toggleWish(button.dataset.toggleWish));
  });
  els.wishlistList.querySelectorAll("button[data-delete-wish]").forEach((button) => {
    button.addEventListener("click", () => deleteWish(button.dataset.deleteWish, button));
  });
}

function updateWishTabs() {
  const openCount = wishes.filter((wish) => !wish.done).length;
  const doneCount = wishes.filter((wish) => wish.done).length;
  if (els.wishOpenCount) els.wishOpenCount.textContent = String(openCount);
  if (els.wishDoneCount) els.wishDoneCount.textContent = String(doneCount);
  els.wishTabs?.querySelectorAll("[data-wish-view]").forEach((button) => {
    const active = button.dataset.wishView === activeWishView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function compareWishesByPriority(a, b) {
  const priorityDifference = getWishPriorityRank(b.priority) - getWishPriorityRank(a.priority);
  if (priorityDifference) return priorityDifference;

  const dateA = a.date ? new Date(`${a.date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  const dateB = b.date ? new Date(`${b.date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  if (dateA !== dateB) return dateA - dateB;

  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

function getWishPriorityRank(priority) {
  if (priority === "一定要做") return 3;
  if (priority === "想尽快") return 2;
  return 1;
}

function editWish(id) {
  const wish = wishes.find((item) => item.id === id);
  if (!wish || !canManageItem(wish)) return;

  wishEditingId = id;
  wishExistingImage = wish.imageUrl || "";
  wishExistingImagePath = wish.imagePath || "";
  wishRemoveImageRequested = false;
  els.wishTitleInput.value = wish.title || "";
  els.wishTypeInput.value = wish.type || "想做";
  els.wishDateInput.value = wish.date || "";
  els.wishPriorityInput.value = wish.priority || "普通";
  els.wishNoteInput.value = wish.note || "";
  els.wishCompletionNoteInput.value = wish.completionNote || "";
  if (wishExistingImage) setWishImagePreview(wishExistingImage);
  else clearWishImagePreview();
  els.wishlistFormTitle.textContent = "编辑心愿";
  els.wishSubmitButton.textContent = "保存修改";
  els.wishCancelEdit.hidden = false;
  setWishlistExpanded(true);
  setWishlistStatus(`正在编辑：${wish.title}`);
  els.wishlistComposer.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openWishCompleteDialog(id) {
  const wish = wishes.find((item) => item.id === id);
  if (!wish || !canManageItem(wish)) return;
  wishCompletingId = id;
  els.wishCompleteTitle.textContent = wish.title || "完成心愿";
  els.wishCompleteMeta.textContent = `${wish.type || "心愿"} · ${wish.priority || "普通"} · ${getAuthorName(wish.userId)} 发布`;
  els.wishCompleteNoteInput.value = wish.completionNote || "";
  els.wishCompleteStatus.textContent = "";
  els.wishCompletePreview.innerHTML = wish.imageUrl
    ? `<img src="${escapeHtml(wish.imageUrl)}" alt="${escapeHtml(wish.title)}" />`
    : `<div><span>${escapeHtml(wish.type || "心愿")}</span><strong>${escapeHtml(wish.title || "完成心愿")}</strong></div>`;
  els.wishCompleteDialog.showModal();
  setTimeout(() => els.wishCompleteNoteInput.focus(), 0);
}

function closeWishCompleteDialog() {
  wishCompletingId = null;
  els.wishCompleteForm.reset();
  els.wishCompleteStatus.textContent = "";
  els.wishCompleteDialog.close();
}

function setWishCompletionMessage(message, target = "page") {
  if (target === "dialog") {
    els.wishCompleteStatus.textContent = message;
  } else {
    setWishlistStatus(message);
  }
}

async function saveWishCompletionState(current, done, completionNote = "", target = "page") {
  if (!cloudSyncAvailable) {
    setWishCompletionMessage("数据库尚未连接，心愿状态没有修改。", target);
    return false;
  }
  const next = {
    ...current,
    done,
    completionNote: done ? completionNote : "",
    completedAt: done ? new Date().toISOString() : "",
    updatedAt: new Date().toISOString(),
  };

  const updatePayload = {
    is_done: next.done,
    completion_note: next.completionNote || "",
    completed_at: next.completedAt || null,
    updated_at: next.updatedAt,
  };
  if (!wishCompletionNoteCloudAvailable) {
    delete updatePayload.completion_note;
  }
  let usedLegacyCompletionNote = !wishCompletionNoteCloudAvailable && done && Boolean(completionNote);
  let result = await householdRepository.update(
    "wishes",
    updatePayload,
    { id: current.id },
    { select: "*", single: true }
  );

  if (result.error && isMissingCloudSchema(result.error)) {
    wishCompletionNoteCloudAvailable = false;
    result = await householdRepository.update(
      "wishes",
      {
        is_done: next.done,
        completed_at: next.completedAt || null,
        updated_at: next.updatedAt,
      },
      { id: current.id },
      { select: "*", single: true }
    );
    if (result.error) {
      setWishCompletionMessage(`心愿同步失败：${result.error.message}`, target);
      return;
    }
    Object.assign(next, wishFromCloudRow(result.data));
    next.done = done;
    next.completionNote = done ? completionNote : "";
    usedLegacyCompletionNote = true;
  } else if (result.error) {
    setWishCompletionMessage(`心愿同步失败：${result.error.message}`, target);
    return false;
  } else {
    wishCompletionNoteCloudAvailable = Object.prototype.hasOwnProperty.call(
      result.data || {},
      "completion_note"
    );
    Object.assign(next, wishFromCloudRow(result.data));
    if (!wishCompletionNoteCloudAvailable) {
      next.completionNote = done ? completionNote : "";
    }
  }

  wishes = wishes.map((wish) => (wish.id === current.id ? next : wish));
  activeWishView = done ? "done" : "open";
  saveWishes();
  const gainedExp = await awardExperience(done ? "wishDone" : "wishEdit");
  setWishlistStatus(
    `${usedLegacyCompletionNote
      ? "心愿已完成；数据库还缺少完成感想字段，请部署最新版 Cloudflare D1 结构后再编辑补上。"
      : done
        ? "心愿已完成，感想已保存。"
        : "已取消完成状态。"}${gainedExp ? ` 修为 +${gainedExp}` : ""}`
  );
  renderWishes();
  return true;
}

async function submitWishCompletion(event) {
  event.preventDefault();
  const current = wishes.find((wish) => wish.id === wishCompletingId);
  if (!current || !canManageItem(current)) return;
  const note = els.wishCompleteNoteInput.value.trim();
  els.wishCompleteSubmit.disabled = true;
  els.wishCompleteSubmit.textContent = "保存中...";
  const saved = await saveWishCompletionState(current, true, note, "dialog");
  els.wishCompleteSubmit.disabled = false;
  els.wishCompleteSubmit.textContent = "保存完成感想";
  if (saved) closeWishCompleteDialog();
}

async function toggleWish(id) {
  const current = wishes.find((wish) => wish.id === id);
  if (!current || !canManageItem(current)) return;
  if (!current.done) {
    openWishCompleteDialog(id);
    return;
  }
  const ok = await confirmAction({
    eyebrow: "更新完成状态",
    title: "改回待实现？",
    message: `“${current.title}”的完成感想会保留，之后仍可再次标记完成。`,
    confirmLabel: "改回待实现",
    cancelLabel: "保持完成",
  });
  if (!ok) return;
  await saveWishCompletionState(current, false, "");
}

async function deleteWish(id, triggerButton = null) {
  const wish = wishes.find((item) => item.id === id);
  if (!wish || !canManageItem(wish)) return;
  const ok = await confirmWishDeletion(wish);
  if (!ok) return;
  if (!cloudSyncAvailable) {
    setWishlistStatus("数据库尚未连接，不能删除心愿。");
    showMiniToast("暂时无法连接云端，请稍后再试", { kind: "error" });
    return;
  }

  const originalLabel = triggerButton?.textContent || "删除";
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "处理中";
  }
  try {
    let result = await householdRepository.rpc("move_family_item_to_trash", {
      p_item_type: "wish",
      p_item_id: wish.id,
    });

    // Keep deletion working across Worker versions and transient RPC route errors.
    // The generic table delete still uses the family write scope, then the
    // recycle-bin row is rolled back if that delete did not complete.
    if (result.error) {
      const trashSaved = await createTrashItem(
        "wish",
        wish.id,
        wish.title,
        wishToCloudRow(wish, wish.userId || session.user.id)
      );
      if (!trashSaved) {
        setWishlistStatus("无法写入回收站，已取消删除。");
        showMiniToast("删除失败，心愿仍然保留", { kind: "error" });
        return;
      }
      const deleteResult = await householdRepository.remove("wishes", { id });
      const deletedRows = Array.isArray(deleteResult.data) ? deleteResult.data : [];
      if (deleteResult.error || !deletedRows.length) {
        await rollbackTrashItem(trashSaved);
        result = deleteResult.error
          ? deleteResult
          : { data: null, error: new Error("数据库没有删除任何记录，请稍后重试。") };
      } else {
        result = { data: deletedRows, error: null };
      }
    }

    if (result.error) {
      const message = String(result.error.message || "删除请求失败");
      setWishlistStatus(`删除同步失败：${message}`);
      showMiniToast("云端删除失败，心愿仍然保留", { kind: "error" });
      return;
    }

    wishes = wishes.filter((item) => item.id !== id);
    saveWishes();
    setWishlistStatus("心愿已移到回收站，30 天内可以恢复。");
    showMiniToast("已移到回收站", { kind: "success" });
    renderWishes();
  } finally {
    if (triggerButton?.isConnected) {
      triggerButton.disabled = false;
      triggerButton.textContent = originalLabel;
    }
  }
}

function formatWishDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function setWishlistStatus(message) {
  els.wishlistStatus.textContent = message;
}

function registerAppShellWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!["https:", "http:"].includes(window.location.protocol)) return;
  navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(() => {
    // The app still works normally if install caching is unavailable.
  });
}

function decodeVapidPublicKey(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function supportsWebPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isStandaloneWebApp() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

async function getPushSubscription() {
  if (!supportsWebPush()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function syncExistingPushSubscription({ force = false } = {}) {
  if (!session || !supportsWebPush() || Notification.permission !== "granted") return false;
  if (pushSubscriptionSyncPromise) return pushSubscriptionSyncPromise;
  const storageKey = `${PUSH_SUBSCRIPTION_SYNC_KEY}:${session.user.id}`;
  const lastSync = Number(localStorage.getItem(storageKey) || 0);
  if (!force && Date.now() - lastSync < PUSH_SUBSCRIPTION_SYNC_INTERVAL) return true;

  pushSubscriptionSyncPromise = (async () => {
    const subscription = await getPushSubscription();
    if (!subscription) return false;
    await cloudflareRequest("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    localStorage.setItem(storageKey, String(Date.now()));
    return true;
  })()
    .catch(() => false)
    .finally(() => {
      pushSubscriptionSyncPromise = null;
    });
  return pushSubscriptionSyncPromise;
}

async function refreshPushSettings() {
  const state = document.querySelector("#pushNotificationState");
  const detail = document.querySelector("#pushNotificationDetail");
  const enable = document.querySelector("#enablePushNotifications");
  const disable = document.querySelector("#disablePushNotifications");
  if (!state || !enable || !disable) return;
  if (!supportsWebPush()) {
    state.textContent = "当前设备不支持";
    detail.textContent = "请使用 iOS 16.4+ 主屏幕 Web App 或现代浏览器。";
    enable.disabled = true;
    disable.hidden = true;
    return;
  }
  const subscription = await getPushSubscription().catch(() => null);
  const enabled = Notification.permission === "granted" && Boolean(subscription);
  state.textContent = enabled ? "已开启" : Notification.permission === "denied" ? "已被系统关闭" : "未开启";
  detail.textContent = enabled
    ? "新日记、评论、回复和感谢留言会发送到这台设备。"
    : (/(iPhone|iPad|iPod)/i.test(navigator.userAgent) && !isStandaloneWebApp())
      ? "请先添加到主屏幕，再从桌面图标打开并开启。"
      : "开启后，即使没有打开页面也能收到家庭消息。";
  enable.hidden = enabled;
  enable.disabled = Notification.permission === "denied";
  disable.hidden = !enabled;
}

async function enableWebPush() {
  if (!session || !supportsWebPush()) return;
  const status = document.querySelector("#pushNotificationStatus");
  if (/(iPhone|iPad|iPod)/i.test(navigator.userAgent) && !isStandaloneWebApp()) {
    if (status) status.textContent = "请先把咻蛋之家添加到主屏幕，再从桌面图标打开。";
    return;
  }
  if (status) status.textContent = "正在向系统申请通知权限...";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    if (status) status.textContent = "没有获得通知权限，可在系统设置中重新允许。";
    await refreshPushSettings();
    return;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const config = await cloudflareRequest("/api/push/config");
    const publicKey = String(config?.data?.publicKey || "");
    if (!publicKey) throw new Error("推送公钥尚未部署");
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidPublicKey(publicKey),
      });
    }
    await cloudflareRequest("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    localStorage.setItem(`${PUSH_SUBSCRIPTION_SYNC_KEY}:${session.user.id}`, String(Date.now()));
    if (status) status.textContent = "通知已开启，这台设备会收到家庭新消息。";
    showMiniToast("通知已开启", { kind: "success", placement: "center" });
  } catch (error) {
    if (status) status.textContent = `开启失败：${error.message}`;
  }
  await refreshPushSettings();
}

async function disableWebPush() {
  const status = document.querySelector("#pushNotificationStatus");
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      await cloudflareRequest("/api/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    if (navigator.clearAppBadge) await navigator.clearAppBadge().catch(() => {});
    if (status) status.textContent = "这台设备的通知已关闭。";
  } catch (error) {
    if (status) status.textContent = `关闭失败：${error.message}`;
  }
  await refreshPushSettings();
}

function ensurePushSettingsPage() {
  const nav = els.settingsDialog?.querySelector(".settings-sidebar nav");
  const content = els.settingsDialog?.querySelector(".settings-content");
  if (!nav || !content) return;
  if (!nav.querySelector('[data-settings-section="settingsNotifications"]')) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.settingsSection = "settingsNotifications";
    button.setAttribute("aria-selected", "false");
    button.textContent = "通知";
    button.addEventListener("click", () => setActiveSettingsSection("settingsNotifications"));
    nav.insertBefore(button, nav.querySelector('[data-settings-section="settingsTools"]'));
  }
  if (!document.querySelector("#settingsNotifications")) {
    const group = document.createElement("section");
    group.className = "settings-group settings-notification-group";
    group.id = "settingsNotifications";
    group.hidden = true;
    group.innerHTML = `<p class="kicker">Web Push</p><h3>消息通知</h3>
      <div class="push-settings-card"><div><span>这台设备</span><strong id="pushNotificationState">检查中</strong><small id="pushNotificationDetail">正在读取通知状态...</small></div>
      <div class="push-settings-actions"><button class="primary" id="enablePushNotifications" type="button">开启通知</button><button id="disablePushNotifications" type="button" hidden>关闭这台设备</button></div></div>
      <p class="status-line" id="pushNotificationStatus"></p>`;
    content.append(group);
    group.querySelector("#enablePushNotifications").addEventListener("click", enableWebPush);
    group.querySelector("#disablePushNotifications").addEventListener("click", disableWebPush);
  }
}

async function openPushDestination(data = {}) {
  if (!session) return;
  const photoId = String(data.photoId || new URLSearchParams(location.search).get("pushPhoto") || "");
  const type = String(data.type || new URLSearchParams(location.search).get("pushType") || "");
  if (data.notificationId && cloudDb) {
    await notificationRepository.markRead(data.notificationId);
    void loadNotifications();
  }
  if (photoId) {
    let photo = photos.find((item) => item.id === photoId);
    if (!photo && cloudDb) {
      const { data: fetched } = await diaryRepository.getById(photoId);
      photo = fetched || null;
      if (photo && !photos.some((item) => item.id === photo.id)) photos.unshift(photo);
    }
    if (photo) {
      switchPage("gallery");
      requestAnimationFrame(() => openPhoto(photo));
    }
  } else if (type === "thanks") {
    switchPage("thanks");
  } else {
    await openNotificationsPanel();
  }
  if (location.search.includes("push")) history.replaceState({}, "", location.pathname);
}

function getAnniversaryStorageKey() {
  const userId = session?.user?.id || "guest";
  return `${ANNIVERSARY_KEY}:${String(userId).toLowerCase()}`;
}

function loadAnniversaries() {
  const stored = localStorage.getItem(getAnniversaryStorageKey());
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((item) => item?.date) : [];
  } catch {
    return [];
  }
}

function saveAnniversaries() {
  if (!session) return;
  localStorage.setItem(getAnniversaryStorageKey(), JSON.stringify(anniversaries));
}

function parseLocalDay(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function differenceInDays(later, earlier) {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 86_400_000));
}

function getCalendarAge(startDate, today) {
  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();
  let days = today.getDate() - startDate.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  };
}

function getAnniversaryMetrics(item) {
  const start = parseLocalDay(item.date);
  if (!start) {
    return {
      pending: true,
      value: "设置日期",
      unit: "",
      detail: "点击编辑，填写这个重要日子的开始日期。",
    };
  }

  const today = startOfToday();
  if (item.type === "pet") {
    const age = getCalendarAge(start, today);
    return {
      value: age.years,
      unit: "岁",
      detail: `${age.months} 个月 ${age.days} 天 · 已来到世界 ${differenceInDays(today, start)} 天`,
    };
  }

  const totalDays = differenceInDays(today, start);
  if (item.type === "together") {
    return {
      value: totalDays,
      unit: "天",
      detail: `从 ${formatDate(item.date)} 开始，一起走过的每一天。`,
    };
  }

  let next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
  const countdown = differenceInDays(next, today);
  return {
    value: countdown,
    unit: countdown === 0 ? "就是今天" : "天后",
    detail: `已经过去 ${totalDays} 天 · 下一次是 ${formatDate(next)}`,
  };
}

function getAnniversaryTypeLabel(type) {
  if (type === "pet") return "宠物年龄";
  if (type === "together") return "相伴天数";
  return "纪念日倒计时";
}

function renderAnniversaries() {
  if (!els.anniversaryList) return;
  if (!session) {
    els.anniversaryList.innerHTML = "";
    els.anniversaryPeek.textContent = "设置重要日子";
    return;
  }

  els.anniversaryList.innerHTML = anniversaries
    .map((item, index) => {
      const metrics = getAnniversaryMetrics(item);
      const canManage = canManageItem(item);
      return `
        <article class="anniversary-card ${metrics.pending ? "pending" : ""}">
          <div class="anniversary-card-head">
            <span class="anniversary-card-index">${getAnniversaryTypeLabel(item.type)} · ${String(index + 1).padStart(2, "0")} · ${escapeHtml(getAuthorName(item.userId))}</span>
            ${canManage ? `<div class="anniversary-card-actions">
              <button type="button" data-edit-anniversary="${escapeHtml(item.id)}">编辑</button>
              <button type="button" data-delete-anniversary="${escapeHtml(item.id)}">删除</button>
            </div>` : ""}
          </div>
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p class="anniversary-value">
              <strong>${escapeHtml(metrics.value)}</strong>
              ${metrics.unit ? `<span>${escapeHtml(metrics.unit)}</span>` : ""}
            </p>
          </div>
          <p class="anniversary-detail">${escapeHtml(item.note || metrics.detail)}</p>
          ${item.note ? `<p class="anniversary-detail">${escapeHtml(metrics.detail)}</p>` : ""}
        </article>
      `;
    })
    .join("");

  els.anniversaryList.querySelectorAll("[data-edit-anniversary]").forEach((button) => {
    button.addEventListener("click", () => editAnniversary(button.dataset.editAnniversary));
  });
  els.anniversaryList.querySelectorAll("[data-delete-anniversary]").forEach((button) => {
    button.addEventListener("click", () => deleteAnniversary(button.dataset.deleteAnniversary));
  });

  const relationship =
    anniversaries.find((item) => item.type === "together" && item.date) ||
    anniversaries.find((item) => item.date);
  if (relationship) {
    const metrics = getAnniversaryMetrics(relationship);
    els.anniversaryPeek.textContent = `${relationship.title} ${metrics.value}${metrics.unit}`;
  } else {
    els.anniversaryPeek.textContent = "设置重要日子";
  }
}

function setAnniversaryFormExpanded(expanded) {
  els.anniversaryForm.hidden = !expanded;
  els.anniversaryAdd.setAttribute("aria-expanded", String(expanded));
  els.anniversaryAdd.textContent = expanded ? "收起编辑器" : "添加纪念日";
}

function resetAnniversaryForm() {
  els.anniversaryForm.reset();
  anniversaryEditingId = null;
  els.anniversarySubmit.textContent = "保存";
  els.anniversaryStatus.textContent = "";
}

function editAnniversary(id) {
  const item = anniversaries.find((entry) => entry.id === id);
  if (!item || !canManageItem(item)) return;
  anniversaryEditingId = id;
  els.anniversaryTitleInput.value = item.title || "";
  els.anniversaryTypeInput.value = item.type || "annual";
  els.anniversaryDateInput.value = item.date || "";
  els.anniversaryNoteInput.value = item.note || "";
  els.anniversarySubmit.textContent = "保存修改";
  setAnniversaryFormExpanded(true);
  els.anniversaryTitleInput.focus();
}

async function saveAnniversary(event) {
  event.preventDefault();
  if (!session) return;
  if (!anniversaryCloudAvailable) {
    els.anniversaryStatus.textContent =
      "Cloudflare D1 尚未升级，纪念日没有保存。请先部署最新版数据库结构。";
    return;
  }
  const title = els.anniversaryTitleInput.value.trim();
  const date = els.anniversaryDateInput.value;
  if (!title || !date) {
    els.anniversaryStatus.textContent = "请填写名称和日期。";
    return;
  }

  const previous = anniversaries.find((item) => item.id === anniversaryEditingId);
  let item = {
    id: normalizeUuid(anniversaryEditingId),
    userId: previous?.userId || session.user.id,
    title,
    type: els.anniversaryTypeInput.value,
    date,
    note: els.anniversaryNoteInput.value.trim(),
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (anniversaryCloudAvailable) {
    const { data, error } = await householdRepository.upsert(
      "anniversaries",
      anniversaryToCloudRow(item, item.userId),
      { onConflict: "id", select: "*", single: true }
    );
    if (error) {
      els.anniversaryStatus.textContent = `同步失败：${error.message}`;
      return;
    }
    item = anniversaryFromCloudRow(data);
  }

  anniversaries = previous
    ? anniversaries.map((entry) => (entry.id === anniversaryEditingId ? item : entry))
    : [item, ...anniversaries];
  saveAnniversaries();
  resetAnniversaryForm();
  setAnniversaryFormExpanded(false);
  const gainedExp = await awardExperience(previous ? "anniversaryEdit" : "anniversary");
  els.anniversaryStatus.textContent = `${previous ? "纪念日已更新。" : "纪念日已保存。"}${gainedExp ? ` 修为 +${gainedExp}` : ""}`;
  renderAnniversaries();
}

async function deleteAnniversary(id) {
  const item = anniversaries.find((entry) => entry.id === id);
  if (!item || !canManageItem(item)) return;
  const confirmed = await confirmAction({
    eyebrow: "移到回收站",
    title: "删除这个纪念日？",
    message: `“${item.title}”会保留 30 天，期间可以恢复。`,
    confirmLabel: "删除纪念日",
    cancelLabel: "先保留",
    danger: true,
  });
  if (!confirmed) return;
  if (!anniversaryCloudAvailable) {
    els.anniversaryStatus.textContent = "数据库尚未连接，不能删除纪念日。";
    return;
  }
  const trashSaved = await createTrashItem(
    "anniversary",
    item.id,
    item.title,
    anniversaryToCloudRow(item, item.userId || session.user.id)
  );
  if (!trashSaved) {
    els.anniversaryStatus.textContent = "无法写入回收站，已取消删除。";
    return;
  }
  const { error } = await householdRepository.remove("anniversaries", { id });
  if (error) {
    await rollbackTrashItem(trashSaved);
    els.anniversaryStatus.textContent = `删除失败：${error.message}`;
    return;
  }
  anniversaries = anniversaries.filter((entry) => entry.id !== id);
  saveAnniversaries();
  els.anniversaryStatus.textContent = "纪念日已删除。";
  renderAnniversaries();
}

async function synchronizeAnniversaries(userId = session?.user?.id) {
  if (!cloudDb || !session || !userId) return;
  try {
    const { data, error } = await householdRepository.list("anniversaries", {
      order: [{ column: "created_at", ascending: true }],
    });
    if (error) throw error;

    const cloudItems = data || [];

    anniversaryCloudAvailable = true;
    const cloudMapped = cloudItems.map(anniversaryFromCloudRow);
    anniversaries = cloudMapped;
    saveAnniversaries();
    renderAnniversaries();
  } catch (error) {
    anniversaryCloudAvailable = false;
    anniversaries = loadAnniversaries();
    renderAnniversaries();
    if (isMissingCloudSchema(error)) {
      els.anniversaryStatus.textContent =
        "纪念日云表尚未初始化，当前先保存在此浏览器。";
    } else {
      els.anniversaryStatus.textContent = `纪念日同步失败：${error.message || "请稍后重试"}`;
    }
  }
}

function getWeekendStorageKey() {
  const name = session ? getSessionDisplayName() : "guest";
  return `${WEEKEND_KEY}:${String(name).toLowerCase()}`;
}

function clearWeekendImageState() {
  weekendPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  weekendPreviewUrls = [];
  weekendSelectedFiles = [];
  weekendSelectedLinks = [];
  weekendExistingImages = [];
  if (els.weekendImageInput) els.weekendImageInput.value = "";
  if (els.weekendImageLinkInput) els.weekendImageLinkInput.value = "";
  renderWeekendImagePreviews();
}

function renderWeekendImagePreviews() {
  if (!els.weekendImagePreviews) return;
  weekendPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  weekendPreviewUrls = weekendSelectedFiles.map((file) => URL.createObjectURL(file));
  const entries = [
    ...weekendExistingImages.map((image, index) => ({ url: image.thumbnail_url || image.image_url, type: "existing", index })),
    ...weekendPreviewUrls.map((url, index) => ({ url, type: "selected", index })),
    ...weekendSelectedLinks.map((url, index) => ({ url, type: "link", index })),
  ];
  els.weekendImagePreviews.hidden = !entries.length;
  els.weekendImagePreviews.innerHTML = entries.map((entry) => `<span><img src="${escapeHtml(entry.url)}" alt="周末场景预览" /><button type="button" data-remove-weekend-${entry.type}="${entry.index}" aria-label="删除这张场景图片">×</button></span>`).join("");
}

function addWeekendFiles(files) {
  const next = Array.from(files || []).filter((file) => file?.type?.startsWith("image/"));
  if (!next.length) return;
  weekendSelectedFiles = [...weekendSelectedFiles, ...next].slice(0, 20);
  renderWeekendImagePreviews();
  setWeekendStatus(`已选择 ${weekendExistingImages.length + weekendSelectedFiles.length + weekendSelectedLinks.length} 张场景图片。`);
}

function handleWeekendImagePaste(event) {
  const files = getImageFilesFromClipboard(event, "weekend-pasted");
  if (files.length) {
    event.preventDefault();
    addWeekendFiles(files);
    return;
  }
  const pastedUrl = getClipboardImageUrl(event.clipboardData);
  if (addWeekendImageLinks(pastedUrl)) event.preventDefault();
}

function addWeekendImageLinks(rawLinks = els.weekendImageLinkInput?.value || "") {
  const urls = extractImageUrls(rawLinks);
  if (!urls.length) {
    if (String(rawLinks || "").trim()) setWeekendStatus("请输入完整的 http 或 https 图片链接。");
    return false;
  }
  weekendSelectedLinks = [...new Set([...weekendSelectedLinks, ...urls])].slice(0, 20);
  if (els.weekendImageLinkInput) els.weekendImageLinkInput.value = "";
  renderWeekendImagePreviews();
  setWeekendStatus(`已添加 ${urls.length} 个图片链接，保存时会复制到 R2。`);
  return true;
}

function clearWeekendCompletionState() {
  weekendCompletionPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  weekendCompletionPreviewUrls = [];
  weekendCompletionFiles = [];
  weekendCompletionLinks = [];
  weekendCompletionExistingImages = [];
  weekendCompletionPlanId = null;
  if (els.weekendCompletionInput) els.weekendCompletionInput.value = "";
  if (els.weekendCompletionLinkInput) els.weekendCompletionLinkInput.value = "";
  if (els.weekendCompletionNote) els.weekendCompletionNote.value = "";
  if (els.weekendCompletionStatus) els.weekendCompletionStatus.textContent = "";
  renderWeekendCompletionPreviews();
}

function renderWeekendCompletionPreviews() {
  if (!els.weekendCompletionPreviews) return;
  weekendCompletionPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  weekendCompletionPreviewUrls = weekendCompletionFiles.map((file) => URL.createObjectURL(file));
  const entries = [
    ...weekendCompletionExistingImages.map((image, index) => ({ url: image.thumbnail_url || image.image_url, type: "existing", index })),
    ...weekendCompletionPreviewUrls.map((url, index) => ({ url, type: "file", index })),
    ...weekendCompletionLinks.map((url, index) => ({ url, type: "link", index })),
  ];
  els.weekendCompletionPreviews.hidden = !entries.length;
  els.weekendCompletionPreviews.innerHTML = entries.map((entry) => `
    <span>
      <img src="${escapeHtml(entry.url)}" alt="完成回顾预览" />
      <button type="button" data-remove-weekend-completion-${entry.type}="${entry.index}" aria-label="删除这张回顾图片">×</button>
    </span>
  `).join("");
}

function addWeekendCompletionFiles(files) {
  const next = Array.from(files || []).filter((file) => file?.type?.startsWith("image/"));
  if (!next.length) return;
  weekendCompletionFiles = [...weekendCompletionFiles, ...next].slice(0, 30);
  renderWeekendCompletionPreviews();
  els.weekendCompletionStatus.textContent = `已加入 ${weekendCompletionExistingImages.length + weekendCompletionFiles.length + weekendCompletionLinks.length} 张照片。`;
}

function addWeekendCompletionLinks(rawLinks = els.weekendCompletionLinkInput?.value || "") {
  const urls = extractImageUrls(rawLinks);
  if (!urls.length) {
    if (String(rawLinks || "").trim()) els.weekendCompletionStatus.textContent = "请输入完整的图片链接。";
    return false;
  }
  weekendCompletionLinks = [...new Set([...weekendCompletionLinks, ...urls])].slice(0, 30);
  els.weekendCompletionLinkInput.value = "";
  renderWeekendCompletionPreviews();
  els.weekendCompletionStatus.textContent = `已加入 ${urls.length} 个图片链接。`;
  return true;
}

function openWeekendCompletionDialog(plan) {
  if (!plan || !els.weekendCompletionDialog) return;
  clearWeekendCompletionState();
  weekendCompletionPlanId = plan.id;
  weekendCompletionExistingImages = Array.isArray(plan.completionImages) ? [...plan.completionImages] : [];
  els.weekendCompletionPlanTitle.textContent = `${plan.title} · ${formatDate(plan.date)}`;
  els.weekendCompletionNote.value = plan.completionNote || "";
  els.weekendCompletionSubmit.textContent = plan.done ? "保存回顾" : "完成并保存";
  renderWeekendCompletionPreviews();
  els.weekendCompletionDialog.showModal();
  requestAnimationFrame(() => els.weekendCompletionNote.focus({ preventScroll: true }));
}

function closeWeekendCompletionDialog() {
  if (els.weekendCompletionDialog?.open) els.weekendCompletionDialog.close();
  clearWeekendCompletionState();
}

async function saveWeekendCompletion(event) {
  event.preventDefault();
  const plan = weekendPlans.find((item) => item.id === weekendCompletionPlanId);
  if (!plan || !canManageItem(plan) || !weekendCloudAvailable) return;
  els.weekendCompletionSubmit.disabled = true;
  els.weekendCompletionStatus.textContent = "正在保存这一天…";
  const uploadedImages = [];
  const newlyUploadedPaths = [];
  const previousCompletionPaths = new Set(
    (plan.completionImages || [])
      .flatMap((image) => [image.image_path, image.thumbnail_path])
      .filter(Boolean)
  );
  try {
    for (let index = 0; index < weekendCompletionFiles.length; index += 1) {
      const uploaded = await uploadImageFile(
        weekendCompletionFiles[index],
        `${slugify(plan.title || "weekend-recap")}-${Date.now()}-${index + 1}`,
        index + 1,
        weekendCompletionFiles.length,
        { folder: "weekend-recap", statusSetter: (message) => { els.weekendCompletionStatus.textContent = message; } }
      );
      if (!uploaded) throw new Error("照片上传失败，请重试。");
      uploadedImages.push(uploaded);
      newlyUploadedPaths.push(...[uploaded.image_path, uploaded.thumbnail_path].filter(Boolean));
    }
    for (let index = 0; index < weekendCompletionLinks.length; index += 1) {
      els.weekendCompletionStatus.textContent = `正在导入第 ${index + 1}/${weekendCompletionLinks.length} 个链接…`;
      const copied = await copyUrlToR2(
        weekendCompletionLinks[index],
        `${slugify(plan.title || "weekend-recap")}-link-${Date.now()}-${index + 1}`,
        "weekend-recap"
      );
      uploadedImages.push({
        image_path: `r2:${copied.key}`,
        image_url: copied.url,
        thumbnail_path: "",
        thumbnail_url: copied.url,
        width: 0,
        height: 0,
      });
      newlyUploadedPaths.push(`r2:${copied.key}`);
    }
    const next = {
      ...plan,
      done: true,
      completionNote: els.weekendCompletionNote.value.trim(),
      completionImages: [...weekendCompletionExistingImages, ...uploadedImages],
      completedAt: plan.completedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { data, error } = await householdRepository.upsert(
      "weekend_plans",
      weekendToCloudRow(next, next.userId || session.user.id),
      { onConflict: "id", select: "*", single: true }
    );
    if (error) throw error;
    const saved = weekendFromCloudRow(data);
    weekendPlans = weekendPlans.map((item) => (item.id === plan.id ? saved : item));
    saveWeekendPlans();
    const retainedCompletionPaths = new Set(
      (saved.completionImages || [])
        .flatMap((image) => [image.image_path, image.thumbnail_path])
        .filter(Boolean)
    );
    const removedCompletionPaths = [...previousCompletionPaths].filter(
      (path) => !retainedCompletionPaths.has(path)
    );
    if (removedCompletionPaths.length) void cleanupStoredImagePaths(removedCompletionPaths);
    closeWeekendCompletionDialog();
    setWeekendStatus("完成回顾已保存。");
    renderWeekendPlans();
  } catch (error) {
    if (newlyUploadedPaths.length) void cleanupStoredImagePaths(newlyUploadedPaths);
    els.weekendCompletionStatus.textContent = error.message || "完成回顾保存失败。";
  } finally {
    els.weekendCompletionSubmit.disabled = false;
  }
}

function loadWeekendPlans() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getWeekendStorageKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWeekendPlans() {
  if (!session) return;
  localStorage.setItem(getWeekendStorageKey(), JSON.stringify(weekendPlans));
}

function setWeekendExpanded(expanded) {
  els.weekendComposer.classList.toggle("expanded", expanded);
  els.weekendForm.hidden = !expanded;
  els.weekendToggle.setAttribute("aria-expanded", String(expanded));
}

function getNextWeekendDate() {
  const date = new Date();
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return date.toISOString().slice(0, 10);
}

function resetWeekendForm() {
  els.weekendForm.reset();
  clearWeekendImageState();
  weekendEditingId = null;
  els.weekendDateInput.value = getNextWeekendDate();
  els.weekendFormTitle.textContent = "安排周末";
  els.weekendSubmitButton.textContent = "保存计划";
  els.weekendCancelEdit.hidden = true;
}

async function saveWeekendPlan(event) {
  event.preventDefault();
  if (!session) {
    setWeekendStatus("请先登录后再保存周末计划。");
    return;
  }
  if (!weekendCloudAvailable) {
    setWeekendStatus(
      "Cloudflare D1 尚未升级，周末计划没有保存。请先部署最新版数据库结构。"
    );
    return;
  }

  const title = els.weekendTitleInput.value.trim();
  if (!title) {
    setWeekendStatus("先写下周末想做什么。");
    return;
  }

  const previous = weekendPlans.find((item) => item.id === weekendEditingId);
  const uploadedImages = [];
  for (let index = 0; index < weekendSelectedFiles.length; index += 1) {
    const uploaded = await uploadImageFile(
      weekendSelectedFiles[index],
      `${slugify(title || "weekend")}-${Date.now()}-${index + 1}`,
      index + 1,
      weekendSelectedFiles.length,
      { folder: "weekend", statusSetter: setWeekendStatus }
    );
    if (!uploaded) {
      setWeekendStatus("场景图片上传失败，请重试。");
      return;
    }
    uploadedImages.push(uploaded);
  }
  for (let index = 0; index < weekendSelectedLinks.length; index += 1) {
    setWeekendStatus(`正在导入第 ${index + 1}/${weekendSelectedLinks.length} 个图片链接…`);
    let copied;
    try {
      copied = await copyUrlToR2(
        weekendSelectedLinks[index],
        `${slugify(title || "weekend")}-link-${Date.now()}-${index + 1}`,
        "weekend"
      );
    } catch (error) {
      setWeekendStatus(`图片链接导入失败：${error.message}`);
      return;
    }
    uploadedImages.push({
      image_path: `r2:${copied.key}`,
      image_url: copied.url,
      thumbnail_path: "",
      thumbnail_url: copied.url,
      width: 0,
      height: 0,
    });
  }
  let plan = {
    id: normalizeUuid(weekendEditingId),
    userId: previous?.userId || session.user.id,
    title,
    date: els.weekendDateInput.value || getNextWeekendDate(),
    location: els.weekendLocationInput.value.trim(),
    type: els.weekendTypeInput.value,
    note: els.weekendNoteInput.value.trim(),
    images: [...weekendExistingImages, ...uploadedImages],
    done: previous?.done || false,
    completionNote: previous?.completionNote || "",
    completionImages: previous?.completionImages || [],
    completedAt: previous?.completedAt || "",
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (weekendCloudAvailable) {
    const { data, error } = await householdRepository.upsert(
      "weekend_plans",
      weekendToCloudRow(plan, plan.userId),
      { onConflict: "id", select: "*", single: true }
    );
    if (error) {
      setWeekendStatus(`周末计划同步失败：${error.message}`);
      return;
    }
    plan = weekendFromCloudRow(data);
  }

  const retainedPaths = new Set((plan.images || []).flatMap((image) => [image.image_path, image.thumbnail_path]).filter(Boolean));
  const removedPaths = (previous?.images || [])
    .flatMap((image) => [image.image_path, image.thumbnail_path])
    .filter((path) => path && !retainedPaths.has(path));
  if (removedPaths.length) void cleanupStoredImagePaths(removedPaths);

  const wasEditing = Boolean(weekendEditingId);
  weekendPlans = wasEditing
    ? weekendPlans.map((item) => (item.id === weekendEditingId ? plan : item))
    : [plan, ...weekendPlans];
  saveWeekendPlans();
  resetWeekendForm();
  setWeekendExpanded(false);
  const gainedExp = await awardExperience(wasEditing ? "weekendEdit" : "weekend");
  setWeekendStatus(`${wasEditing ? "周末计划已更新。" : "周末计划已保存。"}${gainedExp ? ` 修为 +${gainedExp}` : ""}`);
  renderWeekendPlans();
}

function renderWeekendPlans() {
  if (!els.weekendList) return;
  renderWeekendReminderNotice();
  if (!session) {
    els.weekendList.innerHTML = `<div class="empty">登录后可以安排周末去哪、吃什么和做什么。</div>`;
    return;
  }
  if (!weekendPlans.length) {
    els.weekendList.innerHTML = `<div class="empty">这个周末还没有安排。给自己留一个值得期待的计划。</div>`;
    return;
  }

  const sorted = [...weekendPlans].sort(
    (a, b) => Number(a.done) - Number(b.done) || new Date(a.date) - new Date(b.date)
  );
  els.weekendList.innerHTML = sorted
    .map((plan, index) => {
      const canManage = canManageItem(plan);
      return `
        <article class="weekend-card ${plan.done ? "done" : ""}">
          ${plan.done ? `<span class="weekend-complete-mark">完成</span>` : ""}
          <div class="weekend-date">
            <span>${new Intl.DateTimeFormat("zh-CN", { month: "short" }).format(new Date(plan.date))}</span>
            <strong>${new Intl.DateTimeFormat("zh-CN", { day: "2-digit" }).format(new Date(plan.date))}</strong>
            <small>${new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(plan.date))}</small>
          </div>
          <div class="weekend-card-body">
            <p class="kicker">${escapeHtml(plan.type)} · PLAN ${String(index + 1).padStart(2, "0")} · ${escapeHtml(getAuthorName(plan.userId))}</p>
            <h3>${escapeHtml(plan.title)}</h3>
            ${plan.location ? `<p class="weekend-location">地点：${escapeHtml(plan.location)}</p>` : ""}
            ${plan.note ? `<p>${escapeHtml(plan.note)}</p>` : ""}
            ${plan.images?.length ? `<div class="weekend-scenes">${plan.images.map((image, imageIndex) => `<button type="button" data-weekend-gallery="${escapeHtml(plan.id)}" data-weekend-image="${imageIndex}" aria-label="查看第 ${imageIndex + 1} 张场景"><img src="${escapeHtml(image.thumbnail_url || image.image_url)}" alt="${escapeHtml(plan.title)}场景 ${imageIndex + 1}" loading="lazy" decoding="async" /></button>`).join("")}</div>` : ""}
            ${plan.done && (plan.completionNote || plan.completionImages?.length) ? `
              <section class="weekend-recap">
                <header><span>完成回顾</span>${plan.completedAt ? `<time>${escapeHtml(formatCommentTime(plan.completedAt))}</time>` : ""}</header>
                ${plan.completionNote ? `<p>${escapeHtml(plan.completionNote)}</p>` : ""}
                ${plan.completionImages?.length ? `<div class="weekend-scenes weekend-recap-scenes">${plan.completionImages.map((image, imageIndex) => `<button type="button" data-weekend-gallery="${escapeHtml(plan.id)}" data-weekend-gallery-kind="completion" data-weekend-image="${imageIndex}" aria-label="查看第 ${imageIndex + 1} 张回顾照片"><img src="${escapeHtml(image.thumbnail_url || image.image_url)}" alt="${escapeHtml(plan.title)}回顾 ${imageIndex + 1}" loading="lazy" decoding="async" /></button>`).join("")}</div>` : ""}
              </section>
            ` : ""}
            ${canManage ? `<div class="weekend-card-actions">
              <button type="button" data-edit-weekend="${escapeHtml(plan.id)}">编辑</button>
              <button type="button" data-toggle-weekend="${escapeHtml(plan.id)}">
                ${plan.done ? "重新计划" : "完成"}
              </button>
              ${plan.done ? `<button type="button" data-recap-weekend="${escapeHtml(plan.id)}">${plan.completionNote || plan.completionImages?.length ? "编辑回顾" : "补充回顾"}</button>` : ""}
              <button type="button" data-delete-weekend="${escapeHtml(plan.id)}">删除</button>
            </div>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  els.weekendList.querySelectorAll("[data-edit-weekend]").forEach((button) => {
    button.addEventListener("click", () => editWeekendPlan(button.dataset.editWeekend));
  });
  els.weekendList.querySelectorAll("[data-toggle-weekend]").forEach((button) => {
    button.addEventListener("click", () => toggleWeekendPlan(button.dataset.toggleWeekend));
  });
  els.weekendList.querySelectorAll("[data-delete-weekend]").forEach((button) => {
    button.addEventListener("click", () => deleteWeekendPlan(button.dataset.deleteWeekend));
  });
  els.weekendList.querySelectorAll("[data-recap-weekend]").forEach((button) => {
    button.addEventListener("click", () => {
      const plan = weekendPlans.find((item) => item.id === button.dataset.recapWeekend);
      openWeekendCompletionDialog(plan);
    });
  });
  els.weekendList.querySelectorAll("[data-weekend-gallery]").forEach((button) => {
    button.addEventListener("click", () => {
      const plan = weekendPlans.find((item) => item.id === button.dataset.weekendGallery);
      openWeekendImageGallery(plan, Number(button.dataset.weekendImage) || 0, button.dataset.weekendGalleryKind || "plan");
    });
  });
}

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

function editWeekendPlan(id) {
  const plan = weekendPlans.find((item) => item.id === id);
  if (!plan || !canManageItem(plan)) return;
  weekendEditingId = id;
  els.weekendTitleInput.value = plan.title || "";
  els.weekendDateInput.value = plan.date || getNextWeekendDate();
  els.weekendLocationInput.value = plan.location || "";
  els.weekendTypeInput.value = plan.type || "出门玩";
  els.weekendNoteInput.value = plan.note || "";
  weekendExistingImages = Array.isArray(plan.images) ? [...plan.images] : [];
  weekendSelectedFiles = [];
  weekendSelectedLinks = [];
  renderWeekendImagePreviews();
  els.weekendFormTitle.textContent = "编辑周末计划";
  els.weekendSubmitButton.textContent = "保存修改";
  els.weekendCancelEdit.hidden = false;
  setWeekendExpanded(true);
  setWeekendStatus(`正在编辑：${plan.title}`);
  els.weekendComposer.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function toggleWeekendPlan(id) {
  const current = weekendPlans.find((item) => item.id === id);
  if (!current || !canManageItem(current)) return;
  if (!weekendCloudAvailable) {
    setWeekendStatus("数据库尚未连接，计划状态没有修改。");
    return;
  }
  if (!current.done) {
    openWeekendCompletionDialog(current);
    return;
  }
  let next = { ...current, done: false, updatedAt: new Date().toISOString() };
  if (weekendCloudAvailable) {
    const { data, error } = await householdRepository.update(
      "weekend_plans",
      { is_done: next.done, updated_at: next.updatedAt },
      { id },
      { select: "*", single: true }
    );
    if (error) {
      setWeekendStatus(`状态同步失败：${error.message}`);
      return;
    }
    next = weekendFromCloudRow(data);
  }
  weekendPlans = weekendPlans.map((item) => (item.id === id ? next : item));
  saveWeekendPlans();
  setWeekendStatus("周末计划状态已更新。");
  renderWeekendPlans();
}

async function deleteWeekendPlan(id) {
  const plan = weekendPlans.find((item) => item.id === id);
  if (!plan || !canManageItem(plan)) return;
  const confirmed = await confirmAction({
    eyebrow: "移到回收站",
    title: "删除这个周末计划？",
    message: `“${plan.title}”会保留 30 天，期间可以恢复。`,
    confirmLabel: "删除计划",
    cancelLabel: "先保留",
    danger: true,
  });
  if (!confirmed) return;
  if (!weekendCloudAvailable) {
    setWeekendStatus("数据库尚未连接，不能删除周末计划。");
    return;
  }
  const trashSaved = await createTrashItem(
    "weekend",
    plan.id,
    plan.title,
    weekendToCloudRow(plan, plan.userId || session.user.id)
  );
  if (!trashSaved) {
    setWeekendStatus("无法写入回收站，已取消删除。");
    return;
  }
  const { error } = await householdRepository.remove("weekend_plans", { id });
  if (error) {
    await rollbackTrashItem(trashSaved);
    setWeekendStatus(`删除同步失败：${error.message}`);
    return;
  }
  weekendPlans = weekendPlans.filter((item) => item.id !== id);
  saveWeekendPlans();
  setWeekendStatus("周末计划已移到回收站，30 天内可以恢复。");
  renderWeekendPlans();
}

function setWeekendStatus(message) {
  els.weekendStatus.textContent = message;
}

function normalizeThanksColor(color) {
  return THANKS_COLORS.has(color) ? color : DEFAULT_THANKS_COLOR;
}

function getThanksColorStorageKey(userId = session?.user?.id || "guest") {
  return `${THANKS_COLOR_KEY}:${userId}`;
}

function loadThanksColor(userId = session?.user?.id || "guest") {
  const stored =
    localStorage.getItem(getThanksColorStorageKey(userId)) ||
    localStorage.getItem(THANKS_COLOR_KEY);
  return normalizeThanksColor(stored);
}

function saveThanksColorPreference(
  color,
  { userId = session?.user?.id || "guest", syncCloud = false } = {}
) {
  const safeColor = normalizeThanksColor(color);
  localStorage.setItem(getThanksColorStorageKey(userId), safeColor);
  localStorage.setItem(THANKS_COLOR_KEY, safeColor);
  if (session && session.user.id === userId) {
    accountProfile.thanksColor = safeColor;
  }
  if (syncCloud) void persistThanksColorToCloud(safeColor);
  return safeColor;
}

async function persistThanksColorToCloud(color) {
  if (!cloudDb || !session || !thanksColorCloudAvailable) return;
  const safeColor = normalizeThanksColor(color);
  const { error } = await householdRepository.update(
    "user_profiles",
    {
      preferred_thanks_color: safeColor,
      updated_at: new Date().toISOString(),
    },
    { user_id: session.user.id }
  );
  if (error) {
    thanksColorCloudAvailable = false;
    console.warn("Thanks color preference sync failed:", error);
  }
}

function getSelectedThanksColor() {
  const selected = els.thanksForm.querySelector('input[name="thanksColor"]:checked');
  return normalizeThanksColor(selected?.value);
}

function setSelectedThanksColor(color) {
  const safeColor = normalizeThanksColor(color);
  els.thanksForm.querySelectorAll('input[name="thanksColor"]').forEach((input) => {
    input.checked = input.value === safeColor;
    input.closest("label")?.classList.toggle("active", input.checked);
  });
}

function resetGratitudeForm() {
  gratitudeEditingId = null;
  els.thanksForm.reset();
  setSelectedThanksColor(accountProfile.thanksColor || loadThanksColor());
  els.thanksSubmitButton.textContent = "贴到留言板";
  els.thanksCancelEdit.hidden = true;
  els.thanksStatus.textContent = "";
}

function renderGratitudeNotes() {
  if (!els.thanksBoard) return;
  if (!session) {
    els.thanksBoard.innerHTML = `<div class="empty">登录后可以和家人留下一句话。</div>`;
    return;
  }
  if (!gratitudeNotes.length) {
    els.thanksBoard.innerHTML = `<div class="empty">留言板还是空的。先留下一句今天想感谢的话。</div>`;
    return;
  }

  els.thanksBoard.innerHTML = gratitudeNotes
    .map((note, index) => {
      const canManage = canManageItem(note);
      const safeColor = THANKS_COLORS.has(note.text_color) ? note.text_color : "#2f6b3b";
      return `
        <article class="thanks-note" style="--note-color:${safeColor}">
          <span class="thanks-note-index">${String(index + 1).padStart(2, "0")}</span>
          <p>${escapeHtml(note.body)}</p>
          <footer>
            <span>${escapeHtml(getAuthorName(note.user_id))}</span>
            <time>${formatCommentTime(note.created_at)}</time>
            ${canManage ? `<span class="thanks-note-actions">
              <button type="button" data-edit-thanks="${escapeHtml(note.id)}">编辑</button>
              <button type="button" data-delete-thanks="${escapeHtml(note.id)}">删除</button>
            </span>` : ""}
          </footer>
        </article>
      `;
    })
    .join("");

  els.thanksBoard.querySelectorAll("[data-edit-thanks]").forEach((button) => {
    button.addEventListener("click", () => editGratitudeNote(button.dataset.editThanks));
  });
  els.thanksBoard.querySelectorAll("[data-delete-thanks]").forEach((button) => {
    button.addEventListener("click", () => deleteGratitudeNote(button.dataset.deleteThanks));
  });
}

async function saveGratitudeNote(event) {
  event.preventDefault();
  if (!cloudDb || !session) return;
  const body = els.thanksBodyInput.value.trim();
  if (!body) return;
  const selectedColor = getSelectedThanksColor();
  const previousNote = gratitudeNotes.find((item) => item.id === gratitudeEditingId);
  const wasEditing = Boolean(gratitudeEditingId);
  saveThanksColorPreference(selectedColor, {
    userId: session.user.id,
    syncCloud: true,
  });

  const payload = {
    user_id: previousNote?.user_id || session.user.id,
    body,
    text_color: selectedColor,
    updated_at: new Date().toISOString(),
  };
  els.thanksStatus.textContent = "正在保存...";

  const { error } = gratitudeEditingId
    ? await householdRepository.updateOwned(
        "gratitude_notes",
        payload,
        { id: gratitudeEditingId }
      )
    : await householdRepository.insert("gratitude_notes", payload);
  if (error) {
    els.thanksStatus.textContent = isMissingCloudSchema(error)
      ? "请先部署最新版 Cloudflare D1 结构。"
      : `保存失败：${error.message}`;
    return;
  }

  resetGratitudeForm();
  await loadGratitudeNotes();
  const gainedExp = await awardExperience(wasEditing ? "thanksEdit" : "thanks");
  els.thanksStatus.textContent = `${wasEditing ? "留言已更新。" : "留言已保存。"}${gainedExp ? ` 修为 +${gainedExp}` : ""}`;
}

function editGratitudeNote(id) {
  const note = gratitudeNotes.find((item) => item.id === id);
  if (!note || !canManageItem(note)) return;
  gratitudeEditingId = id;
  els.thanksBodyInput.value = note.body;
  setSelectedThanksColor(note.text_color);
  els.thanksSubmitButton.textContent = "保存修改";
  els.thanksCancelEdit.hidden = false;
  els.thanksBodyInput.focus();
}

async function deleteGratitudeNote(id) {
  const note = gratitudeNotes.find((item) => item.id === id);
  if (!note || !canManageItem(note)) return;
  const confirmed = await confirmAction({
    eyebrow: "移到回收站",
    title: "删除这条感谢留言？",
    message: "留言会保留 30 天，期间可以恢复。",
    confirmLabel: "删除留言",
    cancelLabel: "先保留",
    danger: true,
  });
  if (!confirmed) return;
  const trashSaved = await createTrashItem("gratitude", note.id, note.body, note);
  if (!trashSaved) {
    els.thanksStatus.textContent = "无法写入回收站，已取消删除。";
    return;
  }
  const { error } = await householdRepository.remove("gratitude_notes", { id });
  if (error) {
    await rollbackTrashItem(trashSaved);
    els.thanksStatus.textContent = `删除失败：${error.message}`;
    return;
  }
  if (gratitudeEditingId === id) resetGratitudeForm();
  await loadGratitudeNotes();
}

function renderFamilyDialog() {
  if (!els.familyDialog) return;
  const hasFamily = Boolean(familyInfo);
  renderSettingsFamilyPanel();
  els.familyEmpty.hidden = hasFamily;
  els.familyContent.hidden = !hasFamily;
  if (!hasFamily) {
    els.familyMembers.innerHTML = "";
    const incoming = familyInvitations.filter((invitation) => invitation.is_incoming);
    els.familyInvitations.innerHTML = incoming
      .map(
        (invitation) => `
          <article class="family-invitation">
            <div>
              <span>${escapeHtml(invitation.inviter_username)} 邀请你加入</span>
              <strong>${escapeHtml(invitation.family_name)}</strong>
            </div>
            <span class="family-invitation-actions">
              <button type="button" data-family-response="${escapeHtml(invitation.invitation_id)}" data-accept="true">接受</button>
              <button type="button" data-family-response="${escapeHtml(invitation.invitation_id)}" data-accept="false">拒绝</button>
            </span>
          </article>
        `
      )
      .join("");
    els.familyInvitations.querySelectorAll("[data-family-response]").forEach((button) => {
      button.addEventListener("click", () =>
        respondFamilyInvitation(
          button.dataset.familyResponse,
          button.dataset.accept === "true"
        )
      );
    });
    return;
  }

  els.familyInvitations.innerHTML = "";
  els.familyName.textContent = familyInfo.name;
  els.familyInviteForm.hidden = !familyInfo.isOwner;
  els.familyMembers.innerHTML = familyMembers
    .map((member) => {
      const isCurrent = member.user_id === session?.user?.id;
      const canRemove = familyInfo.isOwner && member.role !== "owner";
      return `
        <article class="family-member">
          ${renderAvatarMarkup(member.user_id, "family-member-avatar")}
          <div>
            <strong>${escapeHtml(member.username)}${isCurrent ? "（我）" : ""}</strong>
            <small>${member.role === "owner" ? "家庭创建者" : "家庭成员"}</small>
          </div>
          ${canRemove ? `<button type="button" data-remove-family-member="${escapeHtml(member.user_id)}">移除</button>` : ""}
        </article>
      `;
    })
    .join("");

  els.familyMembers.querySelectorAll("[data-remove-family-member]").forEach((button) => {
    button.addEventListener("click", () => removeFamilyMember(button.dataset.removeFamilyMember));
  });

  const outgoing = familyInvitations.filter((invitation) => !invitation.is_incoming);
  els.familyOutgoingInvitations.innerHTML = outgoing
    .map(
      (invitation) => `
        <article class="family-invitation pending">
          <div>
            <span>等待对方接受邀请</span>
            <strong>${escapeHtml(invitation.invited_username)}</strong>
          </div>
          <small>邀请已发送</small>
        </article>
      `
    )
    .join("");
}

function renderSettingsFamilyPanel() {
  if (!els.settingsFamilyPanel) return;
  if (!session) {
    els.settingsFamilyPanel.innerHTML = `<div class="settings-family-empty">登录后可以查看家庭成员。</div>`;
    return;
  }

  const incoming = familyInvitations.filter((invitation) => invitation.is_incoming);
  if (!familyInfo) {
    els.settingsFamilyPanel.innerHTML = `
      <div class="settings-family-empty">
        <strong>还没有加入家庭</strong>
        <p>创建家庭或接受邀请后，这里会直接显示家庭成员。</p>
      </div>
      ${incoming
        .map(
          (invitation) => `
            <article class="settings-family-invite">
              <div>
                <span>${escapeHtml(invitation.inviter_username)} 邀请你加入</span>
                <strong>${escapeHtml(invitation.family_name)}</strong>
              </div>
              <span>
                <button type="button" data-settings-family-response="${escapeHtml(invitation.invitation_id)}" data-accept="true">接受</button>
                <button type="button" data-settings-family-response="${escapeHtml(invitation.invitation_id)}" data-accept="false">拒绝</button>
              </span>
            </article>
          `
        )
        .join("")}
    `;
    bindSettingsFamilyActions();
    return;
  }

  const outgoing = familyInvitations.filter((invitation) => !invitation.is_incoming);
  els.settingsFamilyPanel.innerHTML = `
    <div class="settings-family-summary">
      <span>当前家庭</span>
      <strong>${escapeHtml(familyInfo.name || "我们的家")}</strong>
      <small>${familyMembers.length} 位成员</small>
    </div>
    <div class="settings-family-members">
      ${familyMembers
        .map((member) => {
          const isCurrent = member.user_id === session?.user?.id;
          return `
            <article class="settings-family-member">
              ${renderAvatarMarkup(member.user_id, "family-member-avatar")}
              <div>
                <strong>${escapeHtml(member.username)}${isCurrent ? "（我）" : ""}</strong>
                <small>${member.role === "owner" ? "家庭创建者" : "家庭成员"}</small>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
    ${outgoing.length
      ? `<div class="settings-family-pending">
          ${outgoing
            .map(
              (invitation) => `
                <article>
                  <span>邀请中</span>
                  <strong>${escapeHtml(invitation.invited_username)}</strong>
                </article>
              `
            )
            .join("")}
        </div>`
      : ""}
  `;
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
  } catch {
    // Some browsers expose the API but only allow it for installed PWAs.
  }
}

function getNotificationText(item) {
  return buildNotificationText(item, getNotificationActorName(item));
}

function getNotificationActorName(item) {
  const fromFamily = item?.actor_id ? familyMemberMap.get(item.actor_id)?.username : "";
  return item?.actor_username || fromFamily || "有人";
}

function getNotificationActorAvatar(item) {
  const fromFamily = item?.actor_id ? familyMemberMap.get(item.actor_id)?.avatar_url : "";
  return item?.actor_avatar_url || fromFamily || "";
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
  const unread = notifications.filter((item) => !item.is_read).length;
  els.notificationBadge.hidden = unread === 0;
  els.notificationBadge.textContent = unread > 99 ? "99+" : String(unread);
  void syncAppIconBadge(unread);
  if (!els.notificationList) return;
  if (!notifications.length) {
    els.notificationList.innerHTML = `<div class="empty">还没有新的互动。</div>`;
    return;
  }
  els.notificationList.innerHTML = aggregateInteractionNotifications(notifications)
    .slice(0, 15)
    .map((item) => {
      const actorName = getNotificationActorName(item);
      const actorAvatar = getNotificationActorAvatar(item);
      const avatar = actorAvatar
        ? `<span class="notification-avatar"><img src="${escapeHtml(actorAvatar)}" alt="" loading="lazy" decoding="async" /></span>`
        : `<span class="notification-avatar">${escapeHtml(getInitial(actorName))}</span>`;
      const stateClass = item.just_seen ? "just-seen" : item.is_read ? "" : "unread";
      return `
        <button class="notification-item ${stateClass}" type="button" data-notification-id="${escapeHtml(item.notification_id || item.id || "")}" data-notification-type="${escapeHtml(item.type || "")}" data-notification-photo="${escapeHtml(item.photo_id || "")}">
          ${avatar}
          <span>
            <strong>${escapeHtml(getNotificationText(item))}${item.just_seen ? `<em>刚看到</em>` : ""}</strong>
            ${item.body ? `<small>${escapeHtml(item.body)}</small>` : ""}
            <time>${formatCommentTime(item.created_at)}</time>
          </span>
          ${item.photo_image_url ? `<img class="notification-photo" src="${escapeHtml(item.photo_image_url)}" alt="" loading="lazy" decoding="async" />` : ""}
        </button>`;
    })
    .join("");
  els.notificationList.querySelectorAll("[data-notification-id]").forEach((button) => {
    button.addEventListener("click", () => openNotification(button));
  });
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

function setUploadExpanded(expanded) {
  els.composer.classList.toggle("expanded", expanded);
  els.uploadForm.hidden = !expanded;
  els.uploadToggle.setAttribute("aria-expanded", String(expanded));
  if (expanded) restoreDiaryDraft();
}

els.setupToggle.addEventListener("click", () => {
  els.setupPanel.hidden = !els.setupPanel.hidden;
});
els.themeToggle.addEventListener("click", toggleTheme);
els.galleryNav.addEventListener("click", () => switchPage("gallery"));
els.recipesNav?.addEventListener("click", () => {
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
  secretPinManageMode = false;
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
els.uploadToggle.addEventListener("click", () => {
  setUploadExpanded(els.uploadForm.hidden);
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
  if (existingButton) weekendExistingImages.splice(Number(existingButton.dataset.removeWeekendExisting), 1);
  if (selectedButton) weekendSelectedFiles.splice(Number(selectedButton.dataset.removeWeekendSelected), 1);
  if (linkButton) weekendSelectedLinks.splice(Number(linkButton.dataset.removeWeekendLink), 1);
  renderWeekendImagePreviews();
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
  if (existing) weekendCompletionExistingImages.splice(Number(existing.dataset.removeWeekendCompletionExisting), 1);
  if (file) weekendCompletionFiles.splice(Number(file.dataset.removeWeekendCompletionFile), 1);
  if (link) weekendCompletionLinks.splice(Number(link.dataset.removeWeekendCompletionLink), 1);
  renderWeekendCompletionPreviews();
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
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = "";
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
initializePhotoDropHint();
els.uploadForm.addEventListener("submit", uploadPhoto);
els.uploadForm.addEventListener("input", saveDiaryDraft);
els.uploadForm.addEventListener("change", saveDiaryDraft);
els.photoDrop.addEventListener("paste", handlePasteUpload);
els.photoLinkAdd?.addEventListener("click", () => addDiaryImageLinks());
els.photoLinkInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addDiaryImageLinks();
  }
});
els.photoInput.addEventListener("change", () => {
  selectedUploadFiles = Array.from(els.photoInput.files || []);
  updatePhotoPreview();
});
els.previewStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-preview]");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  removeUploadPreview(Number(button.dataset.removePreview));
}, true);
els.removeUploadPreview?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  removeUploadPreview(activeUploadPreviewIndex);
});
document.addEventListener("paste", (event) => {
  if (event.defaultPrevented || !session || els.uploadForm.hidden) return;
  const hasImage = Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/"));
  const targetsImageLink = event.target === els.photoLinkInput || event.target === els.photoDrop;
  if (!hasImage && !targetsImageLink) return;
  handlePasteUpload(event);
});
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
  els.dialogImage.classList.remove("is-loading", "is-load-error");
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
  updateSecretViewerToolbar();
});
els.dialogMedia.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
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


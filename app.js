const CONFIG_KEY = "life-vlog-cloudflare-config";
const CLOUDFLARE_AUTH_KEY = "life-vlog-cloudflare-auth";
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
const LEGACY_MEDIA_CACHE_NAME = "life-vlog-media-cache";
const DIARY_MEDIA_CACHE_NAME = "life-vlog-diary-media-cache";
const SECRET_MEDIA_CACHE_NAME = "life-vlog-secret-media-cache";
const DIARY_CACHE_MB_KEY = "life-vlog-diary-cache-mb";
const SECRET_CACHE_MB_KEY = "life-vlog-secret-cache-mb";
const MEDIA_CACHE_POLICY_KEY = "life-vlog-media-cache-policy";
const DIARY_DRAFT_KEY = "life-vlog-diary-draft";
const UPLOAD_QUEUE_DB = "life-vlog-upload-queue";
const UPLOAD_QUEUE_STORE = "diary-uploads";
const EXPERIENCE_KEY = "life-vlog-experience";
const TODAY_EXPERIENCE_KEY = "life-vlog-today-experience";
const THANKS_COLOR_KEY = "life-vlog-thanks-color";
const MOBILE_FEED_LAYOUT_KEY = "life-vlog-mobile-feed-layout";
const MOBILE_SECRET_LAYOUT_KEY = "life-vlog-mobile-secret-layout";
const DEFAULT_SECRET_PHOTO_TAG = "未标记";
const STORY_SECRET_PHOTO_TAG = "故事集";
const FAVORITE_SECRET_PHOTO_TAG = "收藏";
const THANKS_COLORS = new Set(["#2f6b3b", "#d6544d", "#2e6da4", "#81559b", "#a66b12"]);
const DEFAULT_THANKS_COLOR = "#2f6b3b";
const DAILY_LOGIN_EXP = 25;
const EXPERIENCE_REWARDS = {
  diary: 20,
  comment: 5,
  recipe: 14,
  recipeEdit: 3,
  wish: 10,
  wishEdit: 3,
  wishDone: 8,
  weekend: 10,
  weekendEdit: 3,
  anniversary: 8,
  anniversaryEdit: 3,
  thanks: 5,
  thanksEdit: 3,
  diaryEdit: 4,
};
const VIP_EXP_MULTIPLIERS = [1, 1.05, 1.1, 1.2, 1.35, 1.5];
const CULTIVATION_REALMS = [
  { name: "炼气期", threshold: 0, next: 1500, layers: 13 },
  { name: "筑基期", threshold: 1500, next: 4200 },
  { name: "结丹期", threshold: 4200, next: 8200 },
  { name: "元婴期", threshold: 8200, next: 14000 },
  { name: "化神期", threshold: 14000, next: 22000 },
  { name: "炼虚期", threshold: 22000, next: 33000 },
  { name: "合体期", threshold: 33000, next: 47000 },
  { name: "大乘期", threshold: 47000, next: 65000 },
  { name: "真仙境", threshold: 65000, next: 88000 },
  { name: "金仙境", threshold: 88000, next: 116000 },
  { name: "太乙境", threshold: 116000, next: 150000 },
  { name: "大罗境", threshold: 150000, next: 200000 },
  { name: "道祖境", threshold: 200000, next: Infinity },
];
const CHINESE_NUMERALS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三"];
const CULTIVATION_PHASES = ["初期", "中期", "后期", "圆满"];
const CULTIVATION_DESCRIPTIONS = {
  炼气期: "起步洗髓，攒下第一口灵气。",
  筑基期: "根基初成，生活记录开始成体系。",
  结丹期: "金丹成型，长期坚持有了清晰光泽。",
  元婴期: "回忆化婴，重要瞬间有了第二次生命。",
  化神期: "心神通达，日常与愿望开始互相照亮。",
  炼虚期: "能从细碎生活里炼出自己的秩序。",
  合体期: "照片、菜谱、心愿和留言融成完整家谱。",
  大乘期: "几乎每段时间都有可回看的坐标。",
  真仙境: "法则初成，生活档案进入仙界篇。",
  金仙境: "收藏圆满，回忆本身也有了重量。",
  太乙境: "触碰更深的大道，记录成为一种审美。",
  大罗境: "三位一体，文字、影像、关系都稳定发光。",
  道祖境: "大道圆满，你们的家就是自己的时间宇宙。",
};
const BUCKET = "life-photos";
const PRODUCTION_URL = "https://life-vlog-site.pages.dev/";
const R2_UPLOAD_ENDPOINT = "https://life-vlog-r2-upload.xiudan320-life.workers.dev";
const R2_PUBLIC_URL = "https://pub-47959f26cde042c3b37bc0f8f3f441ce.r2.dev";
const CLOUDFLARE_SESSION_KEY = "life-vlog-cloudflare-session";
const PAGE_SIZE = 6;
const VIP_USERS = new Set(["xiao980320", "xiudan320"]);
const MEDIA_META_START = "<!--life-vlog-media:";
const MEDIA_META_END = "-->";
const WISH_MEDIA_META_START = "<!--life-vlog-wish-media:";
const WISH_MEDIA_META_END = "-->";
const PHOTO_COMMENT_PREVIEW_LIMIT = 3;
const METADATA_CACHE_ITEM_LIMIT = 120;
const DEFAULT_DIARY_CACHE_MB = 100;
const DEFAULT_SECRET_CACHE_MB = 300;
const MIN_CACHE_MB = 20;
const MAX_CACHE_MB = 2000;
const EAGER_IMAGE_CARD_COUNT = 8;
const SECRET_ALBUM_IMAGE_LIMIT = 80;
const DEFAULT_SECRET_SORT_STEP = 1000;
const TOOL_DOCK_ORDER_KEY = "life-vlog-tool-dock-order";
const TOOL_DOCK_DEFAULT_ORDER = ["food", "anniversary", "memory", "secret", "recipe"];
const TOOL_DOCK_LABELS = {
  food: { title: "今日吃什么", subtitle: "转盘" },
  anniversary: { title: "时间纪念册", subtitle: "纪念日" },
  memory: { title: "随机回忆", subtitle: "抽一篇日记" },
  secret: { title: "秘藏", subtitle: "相册展览" },
  recipe: { title: "菜谱", subtitle: "厨房收藏" },
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
let notificationPollTimer = null;
let lastAppBadgeCount = -1;
let pendingNewPhotos = [];
let dismissedFeedRefreshIds = new Set();
let feedRefreshCheckInFlight = false;
let returnToSettingsAfterDialog = false;
let activeSettingsSection = "settingsGeneral";
let dialogRestoreScrollY = 0;
let dialogRestorePhotoId = "";
let dialogRestorePhotoTop = 0;
let foodOptions = [];
let activePage = "gallery";
let activeFilter = "全部";
let activeSecretFilter = "全部";
let activeSecretAlbumId = "";
let secretPhotoSortDescending = true;
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
let visiblePhotoCount = PAGE_SIZE;
let filteredPhotoCount = 0;
let showingCachedFeed = false;
let feedObserver = null;
let feedLoading = false;
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
let dialogSwipeStart = null;
let dialogBackSwipeStart = null;
let globalMobileBackSwipeStart = null;
let secretImageGesture = null;
let secretImageZoom = { scale: 1, x: 0, y: 0 };
let suppressDialogImageClickUntil = 0;
let suppressDialogSwipeUntil = 0;
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
let recipeCoverPreviewUrl = "";
let wishEditingId = null;
let wishExistingImage = "";
let wishExistingImagePath = "";
let wishImagePreviewUrl = "";
let wishRemoveImageRequested = false;
let wishCompletingId = null;
let weekendEditingId = null;
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
  forgotPasswordButton: document.querySelector("#forgotPasswordButton"),
  forgotPasswordDialog: document.querySelector("#forgotPasswordDialog"),
  closeForgotPassword: document.querySelector("#closeForgotPassword"),
  forgotPasswordForm: document.querySelector("#forgotPasswordForm"),
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
  photoPreview: document.querySelector("#photoPreview"),
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
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogMeta: document.querySelector("#dialogMeta"),
  dialogNote: document.querySelector("#dialogNote"),
  dialogPrev: document.querySelector("#dialogPrev"),
  dialogNext: document.querySelector("#dialogNext"),
  dialogCounter: document.querySelector("#dialogCounter"),
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
  secretOpen: document.querySelector("#secretOpen"),
  recipeOpen: document.querySelector("#recipeOpen"),
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
  weekendTitleInput: document.querySelector("#weekendTitleInput"),
  weekendDateInput: document.querySelector("#weekendDateInput"),
  weekendLocationInput: document.querySelector("#weekendLocationInput"),
  weekendTypeInput: document.querySelector("#weekendTypeInput"),
  weekendNoteInput: document.querySelector("#weekendNoteInput"),
  weekendSubmitButton: document.querySelector("#weekendSubmitButton"),
  weekendCancelEdit: document.querySelector("#weekendCancelEdit"),
  weekendStatus: document.querySelector("#weekendStatus"),
  weekendList: document.querySelector("#weekendList"),
  thanksPage: document.querySelector("#thanksPage"),
  secretPage: document.querySelector("#secretPage"),
  secretStatus: document.querySelector("#secretStatus"),
  secretComposer: document.querySelector("#secretComposer"),
  secretToggle: document.querySelector("#secretToggle"),
  secretForm: document.querySelector("#secretForm"),
  secretImageDrop: document.querySelector("#secretImageDrop"),
  secretImageInput: document.querySelector("#secretImageInput"),
  secretCoverInput: document.querySelector("#secretCoverInput"),
  secretImagePreview: document.querySelector("#secretImagePreview"),
  secretPreviewStrip: document.querySelector("#secretPreviewStrip"),
  secretImageName: document.querySelector("#secretImageName"),
  secretTitleInput: document.querySelector("#secretTitleInput"),
  secretCategoryInput: document.querySelector("#secretCategoryInput"),
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

function getCloudflareEndpoint() {
  return R2_UPLOAD_ENDPOINT.replace(/\/+$/, "");
}

function readCloudflareSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLOUDFLARE_AUTH_KEY) || "null");
    if (!parsed?.access_token || !parsed?.user?.id) return null;
    if (parsed.expires_at && new Date(parsed.expires_at).getTime() <= Date.now()) {
      // Preserve the last local identity for offline, read-only access. The
      // Worker still rejects expired tokens for online reads and writes.
      parsed.offline_only = true;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCloudflareSession(nextSession) {
  if (nextSession?.access_token) {
    localStorage.setItem(CLOUDFLARE_AUTH_KEY, JSON.stringify(nextSession));
  } else {
    localStorage.removeItem(CLOUDFLARE_AUTH_KEY);
  }
}

function createCloudflareSession(data) {
  const loginName = data?.user?.username || "User";
  const displayName = data?.profile?.username || loginName;
  return {
    access_token: data.token,
    expires_at: data.expires_at,
    user: {
      id: data.user.id,
      email: usernameToEmail(loginName),
      user_metadata: { username: displayName, login_username: loginName },
    },
  };
}

async function cloudflareRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const activeSession = session || readCloudflareSession();
  if (activeSession?.access_token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${activeSession.access_token}`);
  }
  const response = await fetch(`${getCloudflareEndpoint()}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Cloudflare 返回 ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

class CloudflareQueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = "select";
    this.values = null;
    this.filters = [];
    this.orderColumn = "created_at";
    this.ascending = false;
    this.limitCount = 500;
    this.singleMode = false;
    this.onConflict = "";
  }

  select() {
    return this;
  }

  insert(values) {
    this.action = "insert";
    this.values = values;
    return this;
  }

  upsert(values, options = {}) {
    this.action = "upsert";
    this.values = values;
    this.onConflict = options.onConflict || "";
    return this;
  }

  update(values) {
    this.action = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column, value) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ op: "neq", column, value });
    return this;
  }

  order(column, options = {}) {
    this.orderColumn = column;
    this.ascending = Boolean(options.ascending);
    return this;
  }

  limit(value) {
    this.limitCount = value;
    return this;
  }

  single() {
    this.singleMode = true;
    return this.execute();
  }

  maybeSingle() {
    this.singleMode = true;
    return this.execute({ maybe: true });
  }

  async execute() {
    try {
      let payload;
      if (this.action === "select") {
        const params = new URLSearchParams({
          filters: JSON.stringify(this.filters),
          order: this.orderColumn,
          ascending: String(this.ascending),
          limit: String(this.limitCount),
        });
        payload = await cloudflareRequest(`/api/table/${encodeURIComponent(this.table)}?${params}`);
      } else {
        payload = await cloudflareRequest(`/api/table/${encodeURIComponent(this.table)}`, {
          method: "POST",
          body: JSON.stringify({
            action: this.action,
            values: this.values,
            filters: this.filters,
            onConflict: this.onConflict,
          }),
        });
      }
      let data = payload.data ?? [];
      if (this.singleMode) data = Array.isArray(data) ? data[0] || null : data;
      return { data, error: null };
    } catch (error) {
      return { data: this.singleMode ? null : [], error };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

function createCloudflareClient() {
  const listeners = new Set();
  const notify = (event, nextSession) => {
    listeners.forEach((listener) => listener(event, nextSession));
  };
  return {
    auth: {
      async getSession() {
        return { data: { session: readCloudflareSession() } };
      },
      onAuthStateChange(callback) {
        listeners.add(callback);
        return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
      },
      async signInWithPassword({ email, password }) {
        try {
          const username = String(email || "").split("@")[0];
          const data = await cloudflareRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
          });
          const nextSession = createCloudflareSession(data);
          writeCloudflareSession(nextSession);
          notify("SIGNED_IN", nextSession);
          return { data: { session: nextSession }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      async signUp({ email, password, options = {} }) {
        try {
          const username = options.data?.username || String(email || "").split("@")[0];
          const inviteCode = options.data?.inviteCode || options.data?.invite_code || "";
          const data = await cloudflareRequest("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password, invite_code: inviteCode }),
          });
          const nextSession = createCloudflareSession(data);
          writeCloudflareSession(nextSession);
          notify("SIGNED_IN", nextSession);
          return { data: { session: nextSession }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      async signOut() {
        writeCloudflareSession(null);
        notify("SIGNED_OUT", null);
        return { error: null };
      },
      async updateUser(updates) {
        try {
          if (updates.password) {
            await cloudflareRequest("/api/auth/password", {
              method: "POST",
              body: JSON.stringify({ password: updates.password }),
            });
          }
          if (updates.data?.username && session?.user) {
            session.user.user_metadata = {
              ...(session.user.user_metadata || {}),
              username: updates.data.username,
            };
            writeCloudflareSession(session);
          }
          return { data: { user: session?.user || null }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
    },
    from(table) {
      return new CloudflareQueryBuilder(table);
    },
    async rpc(name, payload = {}) {
      try {
        const path =
          name === "reset_password_with_recovery_key"
            ? `/api/rpc/${name}`
            : `/api/rpc/${name}`;
        const data = await cloudflareRequest(path, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        return { data: data.data ?? data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    storage: {
      from() {
        return {
          getPublicUrl(path) {
            return { data: { publicUrl: path ? `${R2_PUBLIC_URL}/${String(path).replace(/^r2:/, "")}` : "" } };
          },
          async upload() {
            return { error: new Error("旧存储已停用，请使用 Cloudflare R2。") };
          },
          async remove() {
            return { error: null };
          },
        };
      },
    },
  };
}

function saveConfig() {
  els.setupPanel.hidden = true;
  setHint("Cloudflare 已接管登录、数据库和图片存储。");
}

function getHomeNameStorageKey(userId = session?.user?.id || null) {
  return userId ? `${HOME_NAME_KEY}:${userId}` : HOME_NAME_KEY;
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
  return `${FAMILY_TAGLINE_KEY}:${familyId || "guest"}`;
}

function loadFamilyTagline() {
  return normalizeFamilyTagline(localStorage.getItem(getFamilyTaglineStorageKey())) || DEFAULT_FAMILY_TAGLINE;
}

function applyFamilyTagline(value, { persist = false } = {}) {
  const tagline = normalizeFamilyTagline(value) || DEFAULT_FAMILY_TAGLINE;
  if (els.heroSignature) els.heroSignature.textContent = tagline;
  accountProfile.familyTagline = tagline;
  if (persist) localStorage.setItem(getFamilyTaglineStorageKey(), tagline);
  const settingsValue = document.querySelector("#settingsFamilyTaglineValue");
  if (settingsValue) settingsValue.textContent = tagline;
  return tagline;
}

function loadHomeName(userId = session?.user?.id || null) {
  return normalizeHomeName(localStorage.getItem(getHomeNameStorageKey(userId))) || "咻蛋之家";
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

  const { data } = await cloudDb.auth.getSession();
  session = data.session;
  updateAuthUI();
  renderCachedPhotoFeed(session?.user?.id || "public");
  await loadPhotos();
  syncMobileComposerPlacement();
  void processDiaryUploadQueue();

  cloudDb.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    updateAuthUI();
    renderCachedPhotoFeed(session?.user?.id || "public");
    loadPhotos();
    if (session) {
      void loadNotifications();
      void processDiaryUploadQueue();
    }
  });
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  notificationPollTimer = setInterval(() => {
    if (session) {
      void loadNotifications();
      if (document.visibilityState === "visible") void checkForNewPhotos();
    }
  }, 45000);
}

function updateAuthUI() {
  const signedIn = Boolean(session);
  const displayName = signedIn ? getSessionDisplayName() : "";
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
  if (els.secretOpen) els.secretOpen.hidden = !signedIn;
  if (els.recipeOpen) els.recipeOpen.hidden = !signedIn;
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

async function loadPhotos() {
  if (!cloudDb) {
    photos = demoPhotos;
    renderGallery();
    return;
  }

  let query = cloudDb.from("photos").select("*");
  query = session ? query : query.eq("is_public", true);

  const { data, error } = await query
    .order("taken_at", { ascending: false })
    .order("created_at", { ascending: false });

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

  visiblePhotoCount = Math.min(
    Math.max(PAGE_SIZE, visiblePhotoCount || PAGE_SIZE),
    Math.max(PAGE_SIZE, photos.length)
  );
  renderFeedRefreshNotice();
  renderGallery();
  if (cloudSyncAvailable) updateCloudSyncStatus();
}

async function loadPhotoCommentPreviews() {
  photoCommentPreviewMap = new Map();
  if (!cloudDb || !session) return;
  const { data, error } = await cloudDb
    .from("photo_comments")
    .select("id,photo_id,user_id,body,parent_id,created_at")
    .order("created_at", { ascending: false })
    .limit(300);
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
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(MAX_CACHE_MB, Math.max(MIN_CACHE_MB, numeric));
}

function getCacheCapacityStorageKey(type, userId = session?.user?.id || "guest") {
  const prefix = type === "secret" ? SECRET_CACHE_MB_KEY : DIARY_CACHE_MB_KEY;
  return `${prefix}:${userId || "guest"}`;
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

function sanitizePhotoForCache(photo) {
  return {
    id: photo.id,
    user_id: photo.user_id,
    title: photo.title || "",
    note: photo.note || "",
    category: photo.category || "日常",
    taken_at: photo.taken_at || "",
    created_at: photo.created_at || "",
    image_path: photo.image_path || "",
    image_url: photo.image_url || "",
    width: photo.width || null,
    height: photo.height || null,
    is_public: Boolean(photo.is_public),
    is_featured: Boolean(photo.is_featured),
    is_pinned: Boolean(photo.is_pinned),
  };
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
  const value = String(url || "").trim();
  if (!value || value.startsWith("blob:") || value.startsWith("data:")) return "";
  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return "";
  }
}

function collectDiaryOfflineMediaUrls() {
  const urls = [];
  getSortedPhotos(photos).forEach((photo) => urls.push(...getPhotoCacheImages(photo)));
  return [...new Set(urls.map(normalizeMediaCacheUrl).filter(Boolean))];
}

function collectSecretOfflineMediaUrls() {
  const urls = [];
  secretItems.forEach((item) => urls.push(...getSecretItemCacheImages(item)));
  return [...new Set(urls.map(normalizeMediaCacheUrl).filter(Boolean))];
}

async function fetchMediaForCache(url) {
  try {
    return await fetch(url, { mode: "cors", cache: "reload" });
  } catch {
    return fetch(url, { mode: "no-cors", cache: "reload" });
  }
}

let mediaCacheTimer = 0;
function getMediaCachePolicyKey(userId = session?.user?.id || "guest") {
  return `${MEDIA_CACHE_POLICY_KEY}:${userId || "guest"}`;
}

function loadMediaCachePolicy(userId = session?.user?.id || "guest") {
  return localStorage.getItem(getMediaCachePolicyKey(userId)) === "off" ? "off" : "wifi";
}

function saveMediaCachePolicy(policy, userId = session?.user?.id || "guest") {
  const next = policy === "off" ? "off" : "wifi";
  localStorage.setItem(getMediaCachePolicyKey(userId), next);
  renderSettingsSummary();
  return next;
}

function isClearlyUnmeteredConnection() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return false;
  if (connection.saveData) return false;
  if (connection.type) return connection.type === "wifi" || connection.type === "ethernet";
  // effectiveType describes speed, not billing. Do not assume 4g means Wi-Fi.
  return false;
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
  const maxDownloads = explicit && type === "secret" ? Number.POSITIVE_INFINITY : explicit ? 40 : 4;
  const tasks = [];
  if (type === "all" || type === "diary") {
    tasks.push(fillMediaCacheWithinCapacity(
      DIARY_MEDIA_CACHE_NAME,
      collectDiaryOfflineMediaUrls(),
      loadCacheCapacityMb("diary", userId) * 1024 * 1024,
      maxDownloads
    ));
  }
  if (type === "all" || type === "secret") {
    tasks.push(fillMediaCacheWithinCapacity(
      SECRET_MEDIA_CACHE_NAME,
      collectSecretOfflineMediaUrls(),
      loadCacheCapacityMb("secret", userId) * 1024 * 1024,
      maxDownloads
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

async function getCachedResponseBytes(response) {
  if (!response) return 0;
  const headerBytes = Number(response.headers.get("content-length")) || 0;
  if (headerBytes) return headerBytes;
  const blob = await response.clone().blob().catch(() => null);
  return blob?.size || 512 * 1024;
}

async function fillMediaCacheWithinCapacity(cacheName, urls, maxBytes, maxDownloads = 4) {
  const cache = await caches.open(cacheName);
  const existingRequests = await cache.keys();
  const existingByUrl = new Map(existingRequests.map((request) => [request.url, request]));
  const keep = new Set();
  let usedBytes = 0;
  let downloads = 0;

  for (const url of urls) {
    if (usedBytes >= maxBytes) break;
    let response = await cache.match(url);
    if (!response) {
      if (downloads >= maxDownloads) continue;
      try {
        response = await fetchMediaForCache(url);
        downloads += 1;
      } catch {
        continue;
      }
    }
    if (!response || (!response.ok && response.type !== "opaque")) continue;
    const bytes = await getCachedResponseBytes(response);
    if (usedBytes + bytes > maxBytes) continue;
    if (!existingByUrl.has(url)) {
      await cache.put(new Request(url, { mode: "no-cors" }), response.clone());
    }
    keep.add(url);
    usedBytes += bytes;
  }

  await Promise.all(
    existingRequests
      .filter((request) => !keep.has(request.url))
      .map((request) => cache.delete(request))
  );
  return {
    cached: keep.size,
    downloaded: downloads,
    bytes: usedBytes,
    requested: urls.length,
    complete: keep.size >= urls.length,
  };
}

function sanitizeCommentForCache(comment) {
  return {
    id: comment.id,
    photo_id: comment.photo_id,
    user_id: comment.user_id,
    body: comment.body || "",
    parent_id: comment.parent_id || null,
    created_at: comment.created_at || "",
  };
}

function savePhotoFeedCache(userId = session?.user?.id || "public") {
  if (!photos.length) return;
  const cachedPhotos = getSortedPhotos(photos).slice(0, METADATA_CACHE_ITEM_LIMIT);
  const cachedIds = new Set(cachedPhotos.map((photo) => photo.id).filter(Boolean));
  const comments = [];
  cachedIds.forEach((photoId) => {
    (photoCommentPreviewMap.get(photoId) || [])
      .slice(0, PHOTO_COMMENT_PREVIEW_LIMIT)
      .forEach((comment) => comments.push(sanitizeCommentForCache(comment)));
  });
  const payload = {
    savedAt: new Date().toISOString(),
    photos: cachedPhotos.map(sanitizePhotoForCache),
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

function sanitizeSecretItemForCache(item) {
  return {
    id: item.id,
    userId: item.userId || item.user_id || "",
    title: item.title || "",
    category: item.category || "未分类",
    note: item.note || "",
    coverImage: item.coverImage || "",
    coverPath: item.coverPath || "",
    images: normalizeSecretImages(item.images),
    linkedPhotoId: item.linkedPhotoId || "",
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : getDefaultSecretSortOrder(item.createdAt),
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}

function saveSecretItemsCache(userId = session?.user?.id || "guest") {
  if (!secretItems.length) return;
  try {
    localStorage.setItem(
      getSecretItemsCacheStorageKey(userId),
      JSON.stringify({
        savedAt: new Date().toISOString(),
        items: secretItems.slice(0, METADATA_CACHE_ITEM_LIMIT).map(sanitizeSecretItemForCache),
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

function getLocalStorageUsageBytes(prefixes = ["life-vlog-"]) {
  let total = 0;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index) || "";
    if (!prefixes.some((prefix) => key.startsWith(prefix))) continue;
    total += new Blob([key, localStorage.getItem(key) || ""]).size;
  }
  return total;
}

async function getCacheStorageUsageBytes() {
  if (!("caches" in window)) return 0;
  let total = 0;
  const names = await caches.keys();
  for (const name of names.filter((entry) => entry.startsWith("life-vlog-site-") || [LEGACY_MEDIA_CACHE_NAME, DIARY_MEDIA_CACHE_NAME, SECRET_MEDIA_CACHE_NAME].includes(entry))) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) continue;
      total += await getCachedResponseBytes(response);
    }
  }
  return total;
}

async function getCacheStorageBreakdown() {
  if (!("caches" in window)) return { appBytes: 0, diaryBytes: 0, secretBytes: 0, appEntries: 0, diaryEntries: 0, secretEntries: 0 };
  let appBytes = 0;
  let diaryBytes = 0;
  let secretBytes = 0;
  let appEntries = 0;
  let diaryEntries = 0;
  let secretEntries = 0;
  const names = await caches.keys();
  for (const name of names.filter((entry) => entry.startsWith("life-vlog-site-") || [LEGACY_MEDIA_CACHE_NAME, DIARY_MEDIA_CACHE_NAME, SECRET_MEDIA_CACHE_NAME].includes(entry))) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    if (name === DIARY_MEDIA_CACHE_NAME) diaryEntries += requests.length;
    else if (name === SECRET_MEDIA_CACHE_NAME || name === LEGACY_MEDIA_CACHE_NAME) secretEntries += requests.length;
    else appEntries += requests.length;
    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) continue;
      const bytes = await getCachedResponseBytes(response);
      if (name === DIARY_MEDIA_CACHE_NAME) diaryBytes += bytes;
      else if (name === SECRET_MEDIA_CACHE_NAME || name === LEGACY_MEDIA_CACHE_NAME) secretBytes += bytes;
      else appBytes += bytes;
    }
  }
  return { appBytes, diaryBytes, secretBytes, appEntries, diaryEntries, secretEntries };
}

async function getAppCacheStats() {
  const [cacheBreakdown, storageEstimate] = await Promise.all([
    getCacheStorageBreakdown().catch(() => ({ appBytes: 0, diaryBytes: 0, secretBytes: 0, appEntries: 0, diaryEntries: 0, secretEntries: 0 })),
    navigator.storage?.estimate?.().catch(() => null) || Promise.resolve(null),
  ]);
  const localBytes = getLocalStorageUsageBytes();
  const cacheBytes = cacheBreakdown.appBytes + cacheBreakdown.diaryBytes + cacheBreakdown.secretBytes;
  return {
    localBytes,
    cacheBytes,
    appShellBytes: cacheBreakdown.appBytes,
    diaryBytes: cacheBreakdown.diaryBytes,
    secretBytes: cacheBreakdown.secretBytes,
    appEntries: cacheBreakdown.appEntries,
    diaryEntries: cacheBreakdown.diaryEntries,
    secretEntries: cacheBreakdown.secretEntries,
    cacheEntries: cacheBreakdown.appEntries + cacheBreakdown.diaryEntries + cacheBreakdown.secretEntries,
    totalBytes: localBytes + cacheBytes,
    browserUsageBytes: Number(storageEstimate?.usage) || 0,
    browserQuotaBytes: Number(storageEstimate?.quota) || 0,
  };
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

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("life-vlog-site-") || [LEGACY_MEDIA_CACHE_NAME, DIARY_MEDIA_CACHE_NAME, SECRET_MEDIA_CACHE_NAME].includes(name))
        .map((name) => caches.delete(name))
    );
  }

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
  return [...photoList].sort((a, b) => {
    const pinnedDifference = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
    if (pinnedDifference) return pinnedDifference;
    const featuredDifference =
      Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
    if (featuredDifference) return featuredDifference;
    return (
      new Date(b.taken_at || b.created_at || 0) -
      new Date(a.taken_at || a.created_at || 0)
    );
  });
}

function getTodayPublishedPhotos() {
  return getSortedPhotos(photos).filter((photo) => isPhotoPublishedToday(photo));
}

function markTodayPostsViewed(ids) {
  const seen = loadTodaySeenPostIds();
  ids.filter(Boolean).forEach((id) => seen.add(String(id)));
  saveTodaySeenPostIds(seen);
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
    const { data, error } = await cloudDb
      .from("photos")
      .select("id,user_id,title,category,taken_at,created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) return;
    pendingNewPhotos = (data || []).filter(
      (photo) =>
        photo.id &&
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
  const { error } = await cloudDb
    .from("photos")
    .select("id,is_featured,is_pinned")
    .limit(1);
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
    const { data, error } = await cloudDb
      .from("photo_favorites")
      .select("photo_id")
      .eq("user_id", userId);
    if (error) throw error;

    const cloudIdSet = new Set((data || []).map((row) => row.photo_id));
    const missingLocalIds = localIds.filter((id) => !cloudIdSet.has(id));
    if (missingLocalIds.length) {
      const { error: migrateError } = await cloudDb
        .from("photo_favorites")
        .upsert(
          missingLocalIds.map((photoId) => ({ user_id: userId, photo_id: photoId })),
          { onConflict: "user_id,photo_id" }
        );
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
  if (!files.length) {
    setStatus("请选择图片，或把剪贴板里的图片粘贴到上传框。");
    return;
  }

  const imageLimit = getCurrentImageLimit();
  if (files.length > imageLimit) {
    setStatus(`当前 VIP 等级单篇最多 ${imageLimit} 张图。`);
    return;
  }

  const finalTitle = getFinalTitle();
  const payload = getDiaryUploadPayload(finalTitle, files);
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

function getDiaryUploadPayload(finalTitle, files) {
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
    note: composeStoredNote(payload.note || "", images),
    category: payload.category || "日常",
    taken_at: payload.takenAt || new Date().toISOString().slice(0, 10),
    is_public: payload.isPublic !== false,
    image_path: primaryImage.image_path,
    image_url: primaryImage.image_url,
    width: primaryImage.width,
    height: primaryImage.height,
  };

  const { error } = await cloudDb.from("photos").insert(record);
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

function openUploadQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(UPLOAD_QUEUE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(UPLOAD_QUEUE_STORE)) {
        const store = db.createObjectStore(UPLOAD_QUEUE_STORE, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("上传队列打开失败。"));
  });
}

async function enqueueDiaryUpload(payload) {
  if (!("indexedDB" in window)) throw new Error("当前浏览器不支持上传队列。");
  const db = await openUploadQueueDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_QUEUE_STORE, "readwrite");
    tx.objectStore(UPLOAD_QUEUE_STORE).put({
      ...payload,
      queuedAt: new Date().toISOString(),
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("写入上传队列失败。"));
  });
  db.close();
}

async function getQueuedDiaryUploads(userId = session?.user?.id || "") {
  if (!("indexedDB" in window) || !userId) return [];
  const db = await openUploadQueueDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_QUEUE_STORE, "readonly");
    const request = tx.objectStore(UPLOAD_QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("读取上传队列失败。"));
  });
  db.close();
  return items
    .filter((item) => item.userId === userId)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
}

async function removeQueuedDiaryUpload(id) {
  const db = await openUploadQueueDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(UPLOAD_QUEUE_STORE, "readwrite");
    tx.objectStore(UPLOAD_QUEUE_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("删除上传队列失败。"));
  });
  db.close();
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
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片压缩失败。"));
      },
      type,
      quality
    );
  });
}

function compressImage(file, options = null) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const settings = options || getUploadQuality();
        const rotatePortrait = Boolean(settings.rotatePortrait && image.height > image.width);
        const sourceWidth = rotatePortrait ? image.height : image.width;
        const sourceHeight = rotatePortrait ? image.width : image.height;
        const scale = Math.min(1, settings.maxSide / Math.max(sourceWidth, sourceHeight));
        let width = Math.max(1, Math.round(sourceWidth * scale));
        let height = Math.max(1, Math.round(sourceHeight * scale));
        let quality = settings.jpeg;
        let blob;

        for (let resizePass = 0; resizePass < 3; resizePass += 1) {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          if (rotatePortrait) {
            context.translate(width, 0);
            context.rotate(Math.PI / 2);
            context.drawImage(image, 0, 0, height, width);
          } else {
            context.drawImage(image, 0, 0, width, height);
          }

          quality = settings.jpeg;
          blob = await canvasToBlob(canvas, "image/jpeg", quality);
          while (blob.size > settings.targetBytes && quality > settings.minJpeg) {
            quality = Math.max(settings.minJpeg, quality - 0.07);
            blob = await canvasToBlob(canvas, "image/jpeg", quality);
          }

          if (blob.size <= settings.targetBytes || resizePass === 2) break;
          const reduction = Math.max(
            0.68,
            Math.min(0.9, Math.sqrt(settings.targetBytes / blob.size) * 0.94)
          );
          width = Math.max(1, Math.round(width * reduction));
          height = Math.max(1, Math.round(height * reduction));
        }

        resolve({
          blob,
          width,
          height,
          originalBytes: file.size,
          compressedBytes: blob.size,
          quality,
        });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败，请换一张图片重试。"));
    };
    image.src = objectUrl;
  });
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
  if (!R2_UPLOAD_ENDPOINT || !session?.access_token) {
    throw new Error("R2 上传服务尚未配置。");
  }
  const endpoint = R2_UPLOAD_ENDPOINT.replace(/\/+$/, "");
  const formData = new FormData();
  formData.set("file", new File([blob], `${safeName}.jpg`, { type: "image/jpeg" }));
  formData.set("name", safeName);
  formData.set("folder", folder);

  const response = await fetch(`${endpoint}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `上传服务返回 ${response.status}`);
  }
  return data;
}

async function copyUrlToR2(url, safeName, folder = "migrated") {
  if (!R2_UPLOAD_ENDPOINT || !session?.access_token) {
    throw new Error("R2 upload service is not configured.");
  }
  const endpoint = R2_UPLOAD_ENDPOINT.replace(/\/+$/, "");
  const response = await fetch(`${endpoint}/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, name: safeName, folder }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Copy service returned ${response.status}`);
  }
  return data;
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
  if (!R2_UPLOAD_ENDPOINT || !session?.access_token) return;
  const endpoint = R2_UPLOAD_ENDPOINT.replace(/\/+$/, "");
  const response = await fetch(`${endpoint}/object`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key: getR2Key(path) }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `R2 删除失败：${response.status}`);
  }
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

function observeGalleryMasonry() {
  galleryMasonryObserver?.disconnect();
  if (!("ResizeObserver" in window) || !els.gallery) return;
  galleryMasonryObserver = new ResizeObserver(scheduleGalleryMasonryLayout);
  els.gallery.querySelectorAll(".photo-card").forEach((card) => {
    galleryMasonryObserver.observe(card);
  });
}

function normalizeDiarySearchText(value) {
  return String(value || "").trim().toLowerCase();
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

function filterPhotosBySearch(photoList) {
  const query = normalizeDiarySearchText(diarySearchQuery);
  if (!query) return photoList;
  const terms = query.split(/\s+/).filter(Boolean);
  return photoList.filter((photo) => {
    const haystack = getPhotoSearchText(photo);
    return terms.every((term) => haystack.includes(term));
  });
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
  const value = photo.taken_at || photo.created_at;
  if (!value) return false;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const difference = Math.floor((today - target) / 86400000);
  return difference >= 0 && difference < 7;
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

  const { data, error } = await cloudDb
    .from("photos")
    .update({ [field]: nextValue })
    .eq("id", photo.id)
    .eq("user_id", session.user.id)
    .select("id,is_featured,is_pinned")
    .single();

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
  const request = wasFavorite
    ? cloudDb
        .from("photo_favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("photo_id", photo.id)
    : cloudDb
        .from("photo_favorites")
        .insert({ user_id: session.user.id, photo_id: photo.id });
  const { error } = await request;
  if (error) {
    button.disabled = false;
    setGlobalStatus(`收藏更新失败：${error.message}`);
    return;
  }

  if (wasFavorite) favoritePhotoIds.delete(photo.id);
  else favoritePhotoIds.add(photo.id);
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
  const loading = photoIndex < EAGER_IMAGE_CARD_COUNT ? "eager" : "lazy";
  const fetchPriority = photoIndex < 3 && imageIndex === 0 ? "high" : "low";
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
  root.querySelectorAll("img.feed-image").forEach((image) => {
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
  const upcoming = filteredPhotos.slice(startIndex, startIndex + PAGE_SIZE);
  if (!upcoming.length) return;

  const preload = () => {
    upcoming.forEach((photo) => {
      const image = getPhotoImages(photo)[0];
      if (!image?.image_url) return;
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = image.image_url;
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 1200 });
    return;
  }

  window.setTimeout(preload, 80);
}

function getPhotoImages(photo) {
  const storedImages = parseStoredImages(photo.note);
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
  return stripMediaMeta(photo.note || "");
}

function composeStoredNote(noteText, images) {
  const cleanNote = stripMediaMeta(noteText).trim();
  const normalizedImages = images.map((image) => ({
    image_url: image.image_url,
    image_path: image.image_path || "",
    width: image.width ?? null,
    height: image.height ?? null,
    thumbnail_url: image.thumbnail_url || "",
    thumbnail_path: image.thumbnail_path || "",
  }));

  if (normalizedImages.length <= 1 && !normalizedImages[0]?.thumbnail_path) return cleanNote;

  const payload = encodeURIComponent(JSON.stringify(normalizedImages));
  return `${cleanNote}${cleanNote ? "\n\n" : ""}${MEDIA_META_START}${payload}${MEDIA_META_END}`;
}

function parseStoredImages(note) {
  const text = String(note || "");
  const start = text.indexOf(MEDIA_META_START);
  if (start === -1) return [];

  const payloadStart = start + MEDIA_META_START.length;
  const end = text.indexOf(MEDIA_META_END, payloadStart);
  if (end === -1) return [];

  try {
    const payload = text.slice(payloadStart, end);
    const parsed = JSON.parse(decodeURIComponent(payload));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stripMediaMeta(note) {
  const text = String(note || "");
  const start = text.indexOf(MEDIA_META_START);
  if (start === -1) return text.trim();

  const end = text.indexOf(MEDIA_META_END, start + MEDIA_META_START.length);
  if (end === -1) return text.trim();

  return `${text.slice(0, start)}${text.slice(end + MEDIA_META_END.length)}`.trim();
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isSecretImageDialogOpen() {
  return Boolean(els.dialog?.open && els.dialog.classList.contains("secret-image-dialog"));
}

function applySecretImageZoom() {
  if (!els.dialogImage) return;
  const { scale, x, y } = secretImageZoom;
  els.dialogImage.style.transform =
    scale > 1.01 ? `translate3d(${x}px, ${y}px, 0) scale(${scale})` : "";
  els.dialogImage.classList.toggle("is-zoomed", scale > 1.01);
  els.dialogMedia?.classList.toggle("is-zoomed", scale > 1.01);
}

function normalizeSecretImageZoom(zoom) {
  const scale = clampNumber(Number(zoom.scale) || 1, 1, 3);
  if (scale <= 1.03) return { scale: 1, x: 0, y: 0 };
  const rect = els.dialogMedia?.getBoundingClientRect();
  const maxX = rect ? Math.max(80, (rect.width * (scale - 1)) / 2 + 80) : 320;
  const maxY = rect ? Math.max(80, (rect.height * (scale - 1)) / 2 + 80) : 320;
  return {
    scale,
    x: clampNumber(Number(zoom.x) || 0, -maxX, maxX),
    y: clampNumber(Number(zoom.y) || 0, -maxY, maxY),
  };
}

function resetSecretImageZoom() {
  secretImageGesture = null;
  secretImageZoom = { scale: 1, x: 0, y: 0 };
  applySecretImageZoom();
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
  if (!isSecretImageDialogOpen()) return;
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
  if (!isSecretImageDialogOpen() || !secretImageGesture) return;
  if (secretImageGesture.type === "pinch" && event.touches.length >= 2) {
    const touches = Array.from(event.touches);
    const distance = getTouchDistance(touches);
    const center = getTouchCenter(touches);
    const nextScale = clampNumber(
      secretImageGesture.startScale * (distance / Math.max(1, secretImageGesture.startDistance)),
      1,
      3
    );
    secretImageZoom = normalizeSecretImageZoom({
      scale: nextScale,
      x: secretImageGesture.startX + (center.x - secretImageGesture.startCenter.x),
      y: secretImageGesture.startY + (center.y - secretImageGesture.startCenter.y),
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
  if (!isSecretImageDialogOpen()) return;
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
  if (!isSecretImageDialogOpen() || isMobileViewport() || dialogImages.length <= 1) return;
  if (secretImageZoom.scale > 1.01 || Date.now() < secretWheelLockedUntil) return;

  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (!delta) return;
  event.preventDefault();
  secretWheelDelta += delta;
  if (Math.abs(secretWheelDelta) < 48) return;

  const direction = secretWheelDelta > 0 ? 1 : -1;
  secretWheelDelta = 0;
  secretWheelLockedUntil = Date.now() + 420;
  moveDialogImage(direction);
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
  const image = dialogImages[dialogImageIndex] || dialogImages[0] || {};
  const secretTags = normalizeSecretPhotoTags(image);
  els.dialogImage.src = image.image_url || "";
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
  els.dialogThumbs.hidden = !hasMultiple;
  els.dialogCounter.textContent = hasMultiple
    ? `${dialogImageIndex + 1} / ${dialogImages.length}`
    : "";

  if (!hasMultiple) {
    els.dialogThumbs.innerHTML = "";
    bindSecretDialogControls();
    return;
  }

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
        <span>当前 tag</span>
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
}

function moveDialogImage(step, animate = false) {
  if (dialogImages.length <= 1) return;
  dialogImageIndex = (dialogImageIndex + step + dialogImages.length) % dialogImages.length;
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
  if (dialogImages.length <= 1 || event.target.closest("button")) return;
  if (isSecretImageDialogOpen()) {
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
  if (!dialogSwipeStart || dialogSwipeStart.id !== event.pointerId) return;
  if (isSecretImageDialogOpen() && (secretImageGesture || secretImageZoom.scale > 1.01)) return;
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
  if (!dialogSwipeStart || dialogSwipeStart.id !== event.pointerId) return;
  if (isSecretImageDialogOpen()) {
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
  const { error } = await cloudDb.from("trash_items").insert({
    id: crypto.randomUUID(),
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
  return true;
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
  return [];
}

async function loadTrashItems() {
  if (!cloudDb || !session) return [];
  const { data, error } = await cloudDb
    .from("trash_items")
    .select("*")
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function restoreTrashItem(item) {
  if (!item || !cloudDb || !session) return;
  const table = item.item_type === "photo" ? "photos" : item.item_type === "secret" ? "secret_items" : "";
  if (!table) return;
  const payload = { ...(item.payload || {}), user_id: session.user.id };
  const { error: restoreError } = await cloudDb.from(table).insert(payload);
  if (restoreError) {
    showMiniToast(`恢复失败：${restoreError.message}`, { kind: "error", duration: 3200 });
    return;
  }
  await cloudDb.from("trash_items").delete().eq("id", item.id).eq("user_id", session.user.id);
  showMiniToast("已恢复", { kind: "success" });
  await Promise.all([loadPhotos(), loadSecretItems()]);
  await renderTrashItems();
}

async function permanentlyDeleteTrashItem(item) {
  if (!item || !confirm("永久删除后无法恢复，确定继续？")) return;
  const { error } = await cloudDb.from("trash_items").delete().eq("id", item.id).eq("user_id", session.user.id);
  if (error) {
    showMiniToast(`永久删除失败：${error.message}`, { kind: "error" });
    return;
  }
  const paths = [...new Set(getTrashImagePaths(item))];
  if (paths.length) cleanupStoredImagePaths(paths).catch(() => {});
  showMiniToast("已永久删除", { kind: "success" });
  await renderTrashItems();
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

  const ok = window.confirm(`把“${getPhotoLabel(photo)}”移到回收站？30 天内可以恢复。`);
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
    const { data: deletedRows, error: deleteError } = await cloudDb
      .from("photos")
      .delete()
      .eq("id", photo.id)
      .eq("user_id", session.user.id)
      .select("id");

    if (deleteError) {
      throw new Error(`数据库删除失败：${deleteError.message}`);
    }
    if (!deletedRows?.length) {
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
  if (!els.dialog.open) return;
  els.dialog.removeAttribute("open");
  ensurePhotoDialogBackdrop().hidden = true;
  document.body.classList.remove("photo-dialog-open");
  els.dialog.dispatchEvent(new Event("close"));
}

function openMobileDiaryImageViewer() {
  if (!mobileDiaryPhoto) return;
  mobileDiaryImageViewerOpen = true;
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
  if (!dialogRestorePhotoId || !els.gallery) return;
  const card = els.gallery.querySelector(`[data-photo-id="${cssEscapeValue(dialogRestorePhotoId)}"]`);
  if (card) {
    dialogRestorePhotoTop = card.getBoundingClientRect().top;
  }
}

function restoreDialogReturnTarget(restoreScroll = dialogRestoreScrollY) {
  const photoId = dialogRestorePhotoId;
  const cardTop = dialogRestorePhotoTop;
  const fallback = Math.max(0, Number(restoreScroll) || 0);
  const restore = () => {
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
    }
  });
  mobileDiaryPage.addEventListener("submit", (event) => {
    if (event.target.matches("[data-mobile-diary-comment-form]")) {
      void saveMobileDiaryComment(event);
    }
  });
  mobileDiaryPage.addEventListener("pointerdown", beginMobileDiaryBackSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointermove", moveMobileDiaryBackSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointerup", endMobileDiaryBackSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointerdown", beginMobileDiaryImageSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointerup", endMobileDiaryImageSwipe, { passive: true });
  mobileDiaryPage.addEventListener("pointercancel", () => {
    cancelMobileDiaryBackSwipe();
    mobileDiaryImageSwipeStart = null;
  });
  mobileDiaryPage.addEventListener("lostpointercapture", cancelMobileDiaryBackSwipe);
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
        return `
          <div class="photo-comment-thread" style="--comment-depth:${Math.min(depth, 3)}">
            <article class="photo-comment">
              ${renderAvatarMarkup(comment.user_id)}
              <div>
                <header>
                  <strong>${escapeHtml(getAuthorName(comment.user_id))}</strong>
                  <time>${formatCommentTime(comment.created_at)}</time>
                </header>
                ${replyTarget ? `<small class="reply-target">回复 ${escapeHtml(getAuthorName(replyTarget.user_id))}</small>` : ""}
                <p>${escapeHtml(comment.body)}</p>
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
    </article>
    <section class="mobile-diary-comments">
      <div class="photo-comments-head">
        <p class="kicker">Family Comments</p>
        <h3>留言</h3>
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
  if (isPhotoPublishedToday(photo) && photo.id) {
    markTodayPostsViewed([photo.id]);
    updateTodayPostsNotice();
  }
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
  const { error } = await cloudDb.from("photo_comments").insert({
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
  const edge = getMobileBackEdge(event.clientX);
  if (!edge) return;
  mobileDiaryBackSwipeStart = { id: event.pointerId, edge, x: event.clientX, y: event.clientY, time: Date.now(), tracking: false };
}

function moveMobileDiaryBackSwipe(event) {
  if (!mobileDiaryBackSwipeStart || mobileDiaryBackSwipeStart.id !== event.pointerId) return;
  const rawDeltaX = event.clientX - mobileDiaryBackSwipeStart.x;
  const deltaX = mobileDiaryBackSwipeStart.edge === "left" ? Math.max(0, rawDeltaX) : Math.min(0, rawDeltaX);
  const deltaY = Math.abs(event.clientY - mobileDiaryBackSwipeStart.y);
  if (!mobileDiaryBackSwipeStart.tracking && Math.abs(deltaX) < 8) return;
  if (!mobileDiaryBackSwipeStart.tracking && deltaY > Math.abs(deltaX)) {
    mobileDiaryBackSwipeStart = null;
    return;
  }
  mobileDiaryBackSwipeStart.tracking = true;
  mobileDiaryPage.classList.add("is-back-swiping");
  mobileDiaryPage.style.setProperty(
    "--back-swipe-x",
    `${clampNumber(deltaX, -window.innerWidth, window.innerWidth)}px`
  );
}

function endMobileDiaryBackSwipe(event) {
  if (!mobileDiaryBackSwipeStart) return;
  const closingEdge = mobileDiaryBackSwipeStart.edge;
  const shouldClose = isEdgeBackSwipe(mobileDiaryBackSwipeStart, event, { threshold: 68, ratio: 1.25, maxElapsed: 1000 });
  mobileDiaryBackSwipeStart = null;
  mobileDiaryPage.classList.remove("is-back-swiping");
  if (shouldClose) {
    mobileDiaryPage.classList.add("is-back-committing");
    mobileDiaryPage.style.setProperty(
      "--back-swipe-x",
      closingEdge === "right" ? "-100vw" : "100vw"
    );
    window.setTimeout(closeMobileDiaryPage, 220);
    return;
  }
  mobileDiaryPage.style.setProperty("--back-swipe-x", "0px");
  window.setTimeout(() => {
    if (!mobileDiaryBackSwipeStart && !mobileDiaryPage.classList.contains("is-back-swiping")) {
      mobileDiaryPage.style.removeProperty("--back-swipe-x");
    }
  }, 200);
}

function cancelMobileDiaryBackSwipe() {
  mobileDiaryBackSwipeStart = null;
  if (!mobileDiaryPage) return;
  mobileDiaryPage.classList.remove("is-back-swiping", "is-back-committing");
  mobileDiaryPage.style.setProperty("--back-swipe-x", "0px");
  window.setTimeout(() => {
    if (mobileDiaryPage && !mobileDiaryBackSwipeStart && !mobileDiaryPage.classList.contains("is-back-swiping")) {
      mobileDiaryPage.style.removeProperty("--back-swipe-x");
    }
  }, 200);
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
  };
}

function endMobileDiaryImageSwipe(event) {
  if (!mobileDiaryImageSwipeStart || mobileDiaryImageSwipeStart.id !== event.pointerId) return;
  const deltaX = event.clientX - mobileDiaryImageSwipeStart.x;
  const deltaY = Math.abs(event.clientY - mobileDiaryImageSwipeStart.y);
  const elapsed = Date.now() - mobileDiaryImageSwipeStart.time;
  mobileDiaryImageSwipeStart = null;
  const horizontal = Math.abs(deltaX) > 48 && Math.abs(deltaX) > deltaY * 1.25 && elapsed < 900;
  if (!horizontal) return;
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
  document.body.classList.add("mobile-global-back-swiping");
  document.documentElement.style.setProperty("--global-back-swipe-x", `${Math.min(window.innerWidth, deltaX)}px`);
}

function finishGlobalMobileBackSwipe(event) {
  if (!globalMobileBackSwipeStart || globalMobileBackSwipeStart.id !== event.pointerId) return;
  const shouldGoBack = isEdgeBackSwipe(globalMobileBackSwipeStart, event, {
    threshold: 74,
    ratio: 1.35,
    maxElapsed: 1100,
  });
  globalMobileBackSwipeStart = null;
  document.body.classList.remove("mobile-global-back-swiping");
  if (shouldGoBack) {
    document.body.classList.add("mobile-global-back-committing");
    document.documentElement.style.setProperty("--global-back-swipe-x", "100vw");
    window.setTimeout(() => {
      performGlobalMobileBack();
      document.body.classList.remove("mobile-global-back-committing");
      document.documentElement.style.removeProperty("--global-back-swipe-x");
    }, 170);
    return;
  }
  document.documentElement.style.setProperty("--global-back-swipe-x", "0px");
  window.setTimeout(() => document.documentElement.style.removeProperty("--global-back-swipe-x"), 190);
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
  els.dialog.classList.remove("no-comments-dialog", "secret-image-dialog", "mobile-page-dialog", "secret-image-fullscreen");
  if (isPhotoPublishedToday(photo) && photo.id) {
    markTodayPostsViewed([photo.id]);
    updateTodayPostsNotice();
  }
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
  if (!wish?.imageUrl) return;
  dialogRestoreScrollY = window.scrollY || window.pageYOffset || 0;
  dialogRestorePhotoId = "";
  dialogRestorePhotoTop = 0;
  lockDialogBackgroundScroll(dialogRestoreScrollY);
  activeDialogPhoto = null;
  dialogRandomMode = false;
  activeSecretDialogItem = null;
  dialogSecretSourceItem = null;
  els.dialog.classList.remove("mobile-page-dialog", "secret-image-dialog", "secret-image-fullscreen");
  els.dialog.classList.add("no-comments-dialog");
  document.body.classList.remove("mobile-dialog-open");
  photoComments = [];
  dialogImages = [{ image_url: wish.imageUrl }];
  dialogImageIndex = 0;
  els.dialogTitle.textContent = wish.title || "心愿图片";
  els.dialogMeta.textContent = `${wish.type || "心愿"} · ${wish.priority || "普通"} · ${getAuthorName(wish.userId)} 发布`;
  els.dialogNote.textContent = wish.note || "";
  if (els.dialogRandomButton) {
    els.dialogRandomButton.hidden = true;
  }
  els.photoCommentsSection.hidden = true;
  renderDialogMedia();
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
    note: composeStoredNote(els.editNoteInput.value.trim(), getPhotoImages(editingPhoto)),
    category: els.editCategoryInput.value,
    taken_at: takenAt,
    is_public: els.editPublicInput.value === "true",
  };

  els.saveEditStatus.textContent = "正在保存...";
  const { error } = await cloudDb.from("photos").update(updates).eq("id", editingPhoto.id);

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
      note: composeStoredNote(els.editNoteInput.value.trim(), nextImages),
      category: els.editCategoryInput.value,
      taken_at: takenAt,
      is_public: els.editPublicInput.value === "true",
      image_path: primaryImage.image_path || "",
      image_url: primaryImage.image_url,
      width: primaryImage.width,
      height: primaryImage.height,
    };

    els.saveEditStatus.textContent = "正在保存...";
    const { error } = await cloudDb
      .from("photos")
      .update(updates)
      .eq("id", editingPhoto.id)
      .eq("user_id", session.user.id);
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
            <button type="button" data-replace-edit-image="${index}">替换</button>
            <button type="button" data-delete-edit-image="${index}">删除</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.editImageList.querySelectorAll("[data-replace-edit-image]").forEach((button) => {
    button.addEventListener("click", () => {
      editingReplaceIndex = Number(button.dataset.replaceEditImage);
      els.editImageInput.value = "";
      els.editImageInput.click();
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
  els.editImageInput.click();
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

function removeEditingImage(index) {
  if (editingImages.length <= 1) {
    els.saveEditStatus.textContent = "一篇笔记至少保留一张图片。";
    return;
  }
  const image = editingImages[index];
  if (!image || !window.confirm(`删除合集中的第 ${index + 1} 张图片？`)) return;
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

function formatDate(value) {
  if (!value) return "未记录日期";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "photo";
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function getSessionLoginName() {
  const metadataName = session?.user?.user_metadata?.login_username;
  if (metadataName) return metadataName;

  const emailPrefix = session?.user?.email?.split("@")[0];
  return emailPrefix || getSessionDisplayName();
}

function isAdminAccount() {
  return String(getSessionLoginName() || "").trim().toLowerCase() === "xiudan320";
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
  if (userId === session?.user?.id) return accountProfile.avatarUrl || "";
  return familyMemberMap.get(userId)?.avatar_url || "";
}

function renderAvatarMarkup(userId, className = "photo-comment-avatar") {
  const name = getAuthorName(userId);
  const avatarUrl = getAuthorAvatar(userId);
  return avatarUrl
    ? `<span class="${className}"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}的头像" /></span>`
    : `<span class="${className}">${escapeHtml(getInitial(name))}</span>`;
}

function renderAccountAvatar(avatarUrl = "", displayName = getSessionDisplayName()) {
  const hasAvatar = Boolean(avatarUrl);
  els.avatarImage.hidden = !hasAvatar;
  els.avatarInitial.hidden = hasAvatar;
  if (hasAvatar) els.avatarImage.src = avatarUrl;
  else els.avatarImage.removeAttribute("src");
  els.avatarInitial.textContent = getInitial(displayName);
}

function getMobileFeedLayoutKey(userId = session?.user?.id || "guest") {
  return `${MOBILE_FEED_LAYOUT_KEY}:${userId || "guest"}`;
}

function loadMobileFeedLayout(userId = session?.user?.id || "guest") {
  return localStorage.getItem(getMobileFeedLayoutKey(userId)) === "single" ? "single" : "double";
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
  localStorage.setItem(getMobileFeedLayoutKey(), nextLayout);
  applyMobileFeedLayout(nextLayout);
  renderSettingsSummary();
}

function getMobileSecretLayoutKey(userId = session?.user?.id || "guest") {
  return `${MOBILE_SECRET_LAYOUT_KEY}:${userId || "guest"}`;
}

function loadMobileSecretLayout(userId = session?.user?.id || "guest") {
  return localStorage.getItem(getMobileSecretLayoutKey(userId)) === "single" ? "single" : "double";
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
  localStorage.setItem(getMobileSecretLayoutKey(), nextLayout);
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
  const headTop = Math.ceil(head.getBoundingClientRect().top);
  toolbar.style.setProperty("--secret-toolbar-top", `${Math.max(pinnedTop, headTop)}px`);
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
  if (hint) hint.textContent = "前一个数字是日记容量，后一个是秘藏容量。仅在缺少图片时补缓存，每次最多下载 6 张。";

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
    list.innerHTML = items.map((item) => `
      <article class="trash-item" data-trash-id="${escapeHtml(item.id)}">
        <div><small>${item.item_type === "photo" ? "日记" : "秘藏"} · ${formatDateTime(item.deleted_at)}</small><strong>${escapeHtml(item.label || "未命名")}</strong><span>${Math.max(0, Math.ceil((new Date(item.expires_at) - Date.now()) / 86400000))} 天后过期</span></div>
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
        await cloudDb.from("photos").update({
          note: composeStoredNote(getPlainNote(photo), images),
          updated_at: new Date().toISOString(),
        }).eq("id", photo.id).eq("user_id", session.user.id);
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
        await cloudDb.from("secret_items").update({ images, updated_at: new Date().toISOString() })
          .eq("id", item.id).eq("user_id", session.user.id);
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
      void renderCloudBackups();
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
    <p class="kicker">Data Safety</p><h3>备份与回收站</h3>
    <button id="downloadFamilyBackupButton" type="button"><span>下载家庭备份</span><strong>导出 D1 中的日记、评论、心愿、菜谱和秘藏索引</strong></button>
    <button id="backfillThumbnailsButton" type="button"><span>优化旧图片</span><strong>每次为最多 20 张旧图生成列表缩略图</strong></button>
    <div class="trash-head"><div><strong>加密自动备份</strong><small>每天生成，保留最近 30 天，仅家庭创始人可下载</small></div><div class="backup-head-actions"><button type="button" data-create-backup>立即备份</button><button type="button" data-refresh-backups aria-label="刷新备份">↻</button></div></div>
    <div class="cloud-backup-list" id="cloudBackupList"></div>
    <div class="trash-head"><div><strong>回收站</strong><small>日记和秘藏保留 30 天，原图在永久删除前不会清理</small></div><button type="button" data-refresh-trash aria-label="刷新回收站">↻</button></div>
    <div class="trash-items" id="trashItemsList"></div>`;
  content.append(group);
  group.querySelector("#downloadFamilyBackupButton").addEventListener("click", downloadFamilyBackup);
  group.querySelector("#backfillThumbnailsButton").addEventListener("click", backfillLegacyThumbnails);
  group.querySelector("[data-create-backup]").addEventListener("click", createCloudBackupNow);
  group.querySelector("[data-refresh-backups]").addEventListener("click", renderCloudBackups);
  group.querySelector("[data-refresh-trash]").addEventListener("click", renderTrashItems);
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
  if ("caches" in window) await caches.delete(cacheName);
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
    policyButton.innerHTML = `<span>自动缓存</span><strong><em>${wifiOnly ? "仅明确 Wi-Fi" : "已关闭"}</em><small>${wifiOnly ? "蜂窝网络和无法识别的网络不会后台下载" : "只通过下面按钮手动下载"}</small></strong>`;
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

  const { data, error } = await cloudDb
    .from("gratitude_notes")
    .select("*")
    .order("created_at", { ascending: false });
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

function recipeToCloudRow(recipe, userId = session?.user?.id) {
  return {
    id: normalizeUuid(recipe.id),
    user_id: userId,
    name: recipe.name,
    category: recipe.category || "家常菜",
    cooking_time: recipe.time || "",
    servings: recipe.servings || "",
    cover_image: recipe.coverImage || "",
    seasonings: recipe.seasonings || [],
    ingredients: recipe.ingredients || [],
    steps: recipe.steps || [],
    note: recipe.note || "",
    created_at: recipe.createdAt || new Date().toISOString(),
    updated_at: recipe.updatedAt || new Date().toISOString(),
  };
}

function recipeFromCloudRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    time: row.cooking_time,
    servings: row.servings,
    coverImage: row.cover_image,
    seasonings: row.seasonings || [],
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wishToCloudRow(wish, userId = session?.user?.id) {
  return {
    id: normalizeUuid(wish.id),
    user_id: userId,
    title: wish.title,
    wish_type: wish.type || "想做",
    planned_date: wish.date || null,
    priority: wish.priority || "普通",
    note: composeWishStoredNote(wish.note, wish.imageUrl, wish.imagePath),
    completion_note: wish.completionNote || "",
    is_done: Boolean(wish.done),
    completed_at: wish.completedAt || null,
    created_at: wish.createdAt || new Date().toISOString(),
    updated_at: wish.updatedAt || new Date().toISOString(),
  };
}

function wishToLegacyCloudRow(wish, userId = session?.user?.id) {
  const row = wishToCloudRow(wish, userId);
  delete row.completion_note;
  return row;
}

function wishFromCloudRow(row) {
  const media = parseWishStoredNote(row.note);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.wish_type,
    date: row.planned_date || "",
    priority: row.priority,
    note: media.note,
    completionNote: row.completion_note || "",
    imageUrl: media.imageUrl,
    imagePath: media.imagePath,
    done: Boolean(row.is_done),
    completedAt: row.completed_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function weekendToCloudRow(plan, userId = session?.user?.id) {
  return {
    id: normalizeUuid(plan.id),
    user_id: userId,
    title: plan.title,
    plan_date: plan.date,
    location: plan.location || "",
    plan_type: plan.type || "出门玩",
    note: plan.note || "",
    is_done: Boolean(plan.done),
    created_at: plan.createdAt || new Date().toISOString(),
    updated_at: plan.updatedAt || new Date().toISOString(),
  };
}

function weekendFromCloudRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.plan_date,
    location: row.location || "",
    type: row.plan_type,
    note: row.note || "",
    done: Boolean(row.is_done),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function synchronizeWeekendPlans(userId = session?.user?.id) {
  if (!cloudDb || !session || !userId) return;
  try {
    const { data, error } = await cloudDb
      .from("weekend_plans")
      .select("*")
      .order("plan_date", { ascending: true });
    if (error) throw error;

    let cloudPlans = data || [];
    const localPlans = loadWeekendPlans();
    const cloudIds = new Set(cloudPlans.map((plan) => plan.id));
    const missingLocalPlans = localPlans.filter(
      (plan) => (!plan.userId || plan.userId === userId) && !cloudIds.has(plan.id)
    );
    if (missingLocalPlans.length) {
      const { error: migrateError } = await cloudDb
        .from("weekend_plans")
        .upsert(missingLocalPlans.map((plan) => weekendToCloudRow(plan, userId)), { onConflict: "id" });
      if (migrateError) throw migrateError;
      const refreshed = await cloudDb
        .from("weekend_plans")
        .select("*")
        .order("plan_date", { ascending: true });
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
        cloudDb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
        cloudDb.from("recipes").select("*").order("created_at", { ascending: false }),
        cloudDb.from("wishes").select("*").order("created_at", { ascending: false }),
      ]);

      const firstError = profileResult.error || recipesResult.error || wishesResult.error;
      if (firstError) throw firstError;
      if (!session || session.user.id !== userId) return;

      const localRecipes = loadRecipes();
      const localWishes = loadWishes();
      const localRecharge = loadRechargeTotal(displayName);
      const localExperience = loadExperience(displayName);
      const localFoodOptions = loadFoodOptions(userId);
      const localThanksColor = loadThanksColor(userId);
      let profile = profileResult.data;

      if (!profile) {
        const initialRecharge = Math.max(localRecharge, isVipUser(displayName) ? 298 : 0);
        const { data, error } = await cloudDb
          .from("user_profiles")
          .insert({
            user_id: userId,
            username: displayName,
            recharge_total: initialRecharge,
            vip_level: getVipLevelByRecharge(initialRecharge)?.level || 0,
            experience_total: localExperience.total,
            last_login_date: localExperience.lastLoginDate || null,
          })
          .select("*")
          .single();
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
          const { error } = await cloudDb.from("recipes").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }
        if (personalLocalWishes.length) {
          const rows = personalLocalWishes.map((wish) => wishToCloudRow(wish, userId));
          let { error } = await cloudDb.from("wishes").upsert(rows, { onConflict: "id" });
          if (error && isMissingCloudSchema(error)) {
            wishCompletionNoteCloudAvailable = false;
            const legacyRows = personalLocalWishes.map((wish) =>
              wishToLegacyCloudRow(wish, userId)
            );
            const retry = await cloudDb.from("wishes").upsert(legacyRows, {
              onConflict: "id",
            });
            error = retry.error;
          }
          if (error) throw error;
        }

        const [migratedRecipes, migratedWishes] = await Promise.all([
          cloudDb.from("recipes").select("*").order("created_at", { ascending: false }),
          cloudDb.from("wishes").select("*").order("created_at", { ascending: false }),
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
        needsLocalMigration ? Number(localExperience.total) || 0 : 0
      );
      let lastLoginDate =
        profile.last_login_date || (needsLocalMigration ? localExperience.lastLoginDate : "") || "";
      let loginStreak = Math.max(0, Number(profile.login_streak) || 0);
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
      const loginStreakCloudAvailable = Object.prototype.hasOwnProperty.call(
        profile,
        "login_streak"
      );
      const previousLoginDate = lastLoginDate;
      let loginRewardGained = 0;
      if (
        profile.last_login_date !== today &&
        (!needsLocalMigration || localExperience.lastLoginDate !== today)
      ) {
        loginStreak = previousLoginDate === getOffsetLocalDateKey(-1) ? loginStreak + 1 : 1;
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
      if (loginStreakCloudAvailable) {
        profileUpdates.login_streak = loginStreak;
      }
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

      const { data: savedProfile, error: profileError } = await cloudDb
        .from("user_profiles")
        .update(profileUpdates)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (profileError) throw profileError;

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
        avatarUrl: savedProfile.avatar_url || "",
        avatarPath: savedProfile.avatar_path || "",
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

  const { error } = await cloudDb
    .from("user_profiles")
    .update({
      recharge_total: nextTotal,
      vip_level: nextLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);
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

function loadExperience(displayName = getSessionDisplayName()) {
  if (cloudSyncAvailable && session) {
    return {
      total: Math.max(0, Number(accountProfile.experienceTotal) || 0),
      lastLoginDate: accountProfile.lastLoginDate || "",
      loginStreak: Math.max(0, Number(accountProfile.loginStreak) || 0),
      gainedToday: accountProfile.lastLoginDate === getLocalDateKey(),
    };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(getExperienceStorageKey(displayName)) || "{}");
    return {
      total: Number(parsed.total) || 0,
      lastLoginDate: parsed.lastLoginDate || "",
      loginStreak: Math.max(0, Number(parsed.loginStreak) || 0),
      gainedToday: Boolean(parsed.gainedToday),
    };
  } catch {
    return { total: 0, lastLoginDate: "", loginStreak: 0, gainedToday: false };
  }
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
  return VIP_EXP_MULTIPLIERS[Math.max(0, Math.min(5, Number(level) || 0))] || 1;
}

function getVipAdjustedExperience(base, level = activeVipLevel) {
  return Math.max(1, Math.round((Number(base) || 0) * getVipExpMultiplier(level)));
}

function getLoginStreakBonusBase(streak) {
  const days = Math.max(0, Number(streak) || 0);
  if (days < 2) return 0;
  return Math.min(40, Math.floor(days / 2) * 5);
}

function getDailyLoginReward(streak = accountProfile.loginStreak || 1, level = activeVipLevel) {
  return getVipAdjustedExperience(DAILY_LOGIN_EXP + getLoginStreakBonusBase(streak), level);
}

function getNextLoginStreak(experience = loadExperience()) {
  const lastLoginDate = experience.lastLoginDate || "";
  const streak = Math.max(0, Number(experience.loginStreak) || 0);
  if (lastLoginDate === getLocalDateKey() || lastLoginDate === getOffsetLocalDateKey(-1)) {
    return streak + 1;
  }
  return 1;
}

function awardDailyExperience(displayName = getSessionDisplayName()) {
  const today = getLocalDateKey();
  const data = loadExperience(displayName);
  if (data.lastLoginDate === today) return data;
  const streak = data.lastLoginDate === getOffsetLocalDateKey(-1) ? (Number(data.loginStreak) || 0) + 1 : 1;
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
  const total = Math.max(0, Number(totalExp) || 0);
  const realmIndex = CULTIVATION_REALMS.findIndex((realm, index) => {
    const next = CULTIVATION_REALMS[index + 1];
    return total >= realm.threshold && (!next || total < next.threshold);
  });
  const realm = CULTIVATION_REALMS[Math.max(0, realmIndex)];
  const nextThreshold = Number.isFinite(realm.next) ? realm.next : Math.max(total, realm.threshold);
  const span = Math.max(1, nextThreshold - realm.threshold);
  const current = Math.min(span, Math.max(0, total - realm.threshold));
  const percent = realm.next === Infinity ? 100 : Math.min(100, Math.round((current / span) * 100));
  const layer =
    realm.layers ? Math.min(realm.layers, Math.floor((current / span) * realm.layers) + 1) : 0;
  const phase = realm.layers
    ? `${CHINESE_NUMERALS[layer]}层`
    : CULTIVATION_PHASES[Math.min(CULTIVATION_PHASES.length - 1, Math.floor((current / span) * CULTIVATION_PHASES.length))];
  return {
    level: realmIndex + 1,
    realm: realm.name,
    phase,
    title: `${realm.name}${phase ? ` · ${phase}` : ""}`,
    current,
    needed: span,
    percent,
    total,
    nextName: CULTIVATION_REALMS[realmIndex + 1]?.name || "大道圆满",
  };
}

function formatUpgradeDays(days) {
  if (!Number.isFinite(days)) return "已到最高境界";
  if (days <= 0) return "今天就能突破";
  if (days === 1) return "约 1 天";
  return `约 ${days} 天`;
}

function getUpgradeEta(progress) {
  if (!progress || progress.nextName === "大道圆满") {
    return "已到最高境界";
  }
  const dailyExp = getDailyLoginReward(getNextLoginStreak());
  const remaining = Math.max(0, progress.needed - progress.current);
  const days = Math.ceil(remaining / Math.max(1, dailyExp));
  return `${formatUpgradeDays(days)}到 ${progress.nextName}`;
}

function getLevelRankProfiles() {
  if (!session) return [];
  const ownProfile = {
    user_id: session.user.id,
    username: getSessionDisplayName(),
    avatar_url: accountProfile.avatarUrl || "",
    role: familyInfo?.isOwner ? "owner" : familyMemberMap.get(session.user.id)?.role || "member",
    experience_total: loadExperience().total,
    login_streak: accountProfile.loginStreak || loadExperience().loginStreak || 0,
  };
  const profiles = new Map([[ownProfile.user_id, ownProfile]]);
  familyMembers.forEach((member) => {
    const cloudProfile = familyLevelProfiles.get(member.user_id) || {};
    profiles.set(member.user_id, {
      ...member,
      username: cloudProfile.username || member.username || "家庭成员",
      avatar_url: cloudProfile.avatar_url || member.avatar_url || "",
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
      const { data, error } = await cloudDb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error || !data) return null;
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
                ? `<span class="level-rank-avatar"><img src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(profile.username)}的头像" /></span>`
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

function belongsToCurrentUser(item) {
  const ownerId = item?.user_id || item?.userId || "";
  return !ownerId || ownerId === session?.user?.id;
}

function isDateInCurrentMonth(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function getCultivationArchive() {
  const ownPhotos = photos.filter(belongsToCurrentUser);
  const ownRecipes = recipes.filter(belongsToCurrentUser);
  const ownWishes = wishes.filter(belongsToCurrentUser);
  const ownWeekendPlans = weekendPlans.filter(belongsToCurrentUser);
  const ownSecrets = secretItems.filter(belongsToCurrentUser);
  const ownComments = [...photoCommentPreviewMap.values()]
    .flat()
    .filter((comment) => comment?.user_id === session?.user?.id);
  const streak = Math.max(0, Number(accountProfile.loginStreak) || Number(loadExperience().loginStreak) || 0);
  const favoriteCount = favoritePhotoIds.size;
  const completedWishes = ownWishes.filter((wish) => wish.is_done || wish.isDone).length;
  const secretPhotoCount = ownSecrets.reduce((total, album) => total + normalizeSecretImages(album.images).length, 0);
  const travelCount = ownPhotos.filter((photo) => ["旅行", "城市", "卢浮宫"].includes(photo.category)).length + ownWeekendPlans.length;

  const makeBadge = (category, icon, title, detail, current, target) => ({
    category, icon, title, detail, current, target, unlocked: current >= target,
    percent: Math.min(100, Math.round((current / Math.max(1, target)) * 100)),
  });
  const collectedCount = favoriteCount + secretPhotoCount;
  const photoHour = (photo) => new Date(photo.created_at || photo.createdAt || 0).getHours();
  const nightDiaryCount = ownPhotos.filter((photo) => photoHour(photo) >= 0 && photoHour(photo) < 5).length;
  const earlyDiaryCount = ownPhotos.filter((photo) => photoHour(photo) >= 5 && photoHour(photo) < 8).length;
  const catDiaryCount = ownPhotos.filter((photo) => /猫|呱呱|噗噗|喵/i.test(`${photo.title || ""} ${photo.note || ""}`)).length;
  const longDiaryCount = ownPhotos.filter((photo) => String(photo.note || "").length >= 800).length;
  const nineImageCount = ownPhotos.filter((photo) => getPhotoImages(photo).length >= 9).length;
  const pinnedCount = ownPhotos.filter((photo) => photo.is_pinned).length;
  const featuredCount = ownPhotos.filter((photo) => photo.is_featured).length;
  const foodDiaryCount = ownPhotos.filter((photo) => photo.category === "食物").length;
  const completedWeekendCount = ownWeekendPlans.filter((plan) => plan.is_done || plan.isDone).length;
  const badgeRules = [
    makeBadge("记录", "初", "初次落笔", "发布第一篇日记", ownPhotos.length, 1),
    makeBadge("记录", "记", "执笔人", "发布 10 篇日记", ownPhotos.length, 10),
    makeBadge("记录", "卷", "生活编年史", "发布 50 篇日记", ownPhotos.length, 50),
    makeBadge("记录", "典", "人间典藏", "发布 100 篇日记", ownPhotos.length, 100),
    makeBadge("陪伴", "恒", "恒心修士", "连续签到 7 天", streak, 7),
    makeBadge("陪伴", "月", "月轮不息", "连续签到 30 天", streak, 30),
    makeBadge("陪伴", "年", "百日同心", "连续签到 100 天", streak, 100),
    makeBadge("陪伴", "愿", "初次圆梦", "完成第一个心愿", completedWishes, 1),
    makeBadge("陪伴", "圆", "圆梦者", "完成 10 个心愿", completedWishes, 10),
    makeBadge("陪伴", "声", "有来有往", "留下 10 条评论", ownComments.length, 10),
    makeBadge("陪伴", "知", "知音常伴", "留下 50 条评论", ownComments.length, 50),
    makeBadge("料理", "味", "初尝百味", "记录第一道菜谱", ownRecipes.length, 1),
    makeBadge("料理", "膳", "百味仙", "记录 10 道菜谱", ownRecipes.length, 10),
    makeBadge("料理", "宴", "家宴宗师", "记录 30 道菜谱", ownRecipes.length, 30),
    makeBadge("探索", "游", "云游者", "留下 10 次探索记录", travelCount, 10),
    makeBadge("探索", "迹", "行遍山河", "留下 30 次探索记录", travelCount, 30),
    makeBadge("收藏", "藏", "藏珍客", "收藏 20 张影像", collectedCount, 20),
    makeBadge("收藏", "阁", "万象阁主", "收藏 100 张影像", collectedCount, 100),
    makeBadge("记录", "夜", "凌晨修仙", "在凌晨记录 3 篇日记", nightDiaryCount, 3),
    makeBadge("记录", "晨", "早起采气", "在早晨 8 点前记录 5 篇日记", earlyDiaryCount, 5),
    makeBadge("记录", "言", "千字真言", "写下 3 篇八百字长日记", longDiaryCount, 3),
    makeBadge("记录", "阵", "九图阵法", "发布 3 篇九图日记", nineImageCount, 3),
    makeBadge("陪伴", "喵", "猫德圆满", "留下 20 篇猫咪记录", catDiaryCount, 20),
    makeBadge("陪伴", "谢", "感恩有你", "写下 10 条感谢留言", gratitudeNotes.length, 10),
    makeBadge("探索", "周", "周末行动派", "完成 10 个周末计划", completedWeekendCount, 10),
    makeBadge("料理", "食", "深夜食堂", "留下 20 篇食物日记", foodDiaryCount, 20),
    makeBadge("收藏", "星", "精选策展人", "设置 7 篇精选日记", featuredCount, 7),
    makeBadge("收藏", "顶", "镇馆之宝", "置顶 5 篇日记", pinnedCount, 5),
  ];

  const rootScores = [
    { key: "记录", score: ownPhotos.length * 3 + ownComments.length },
    { key: "料理", score: ownRecipes.length * 4 + ownPhotos.filter((photo) => photo.category === "食物").length * 2 },
    { key: "探索", score: travelCount * 3 },
    { key: "收藏", score: favoriteCount * 2 + secretPhotoCount },
    { key: "陪伴", score: completedWishes * 2 + ownComments.length * 2 + gratitudeNotes.length },
  ];
  const rootTotal = Math.max(1, rootScores.reduce((sum, root) => sum + root.score, 0));
  const primaryRoot = [...rootScores].sort((a, b) => b.score - a.score)[0];

  return {
    badges: badgeRules,
    roots: rootScores.map((root) => ({ ...root, percent: Math.round((root.score / rootTotal) * 100) })),
    primaryRoot: primaryRoot?.score ? primaryRoot.key : "尚未显现",
    month: {
      diaries: ownPhotos.filter((item) => isDateInCurrentMonth(item.created_at || item.createdAt)).length,
      comments: ownComments.filter((item) => isDateInCurrentMonth(item.created_at || item.createdAt)).length,
      wishes: ownWishes.filter((item) => (item.is_done || item.isDone) && isDateInCurrentMonth(item.completed_at || item.completedAt || item.updated_at || item.updatedAt)).length,
      recipes: ownRecipes.filter((item) => isDateInCurrentMonth(item.created_at || item.createdAt)).length,
      secrets: ownSecrets.reduce(
        (total, album) => total + normalizeSecretImages(album.images).filter((image) => isDateInCurrentMonth(image.created_at || image.createdAt || image.uploadedAt)).length,
        0
      ),
    },
  };
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

function renderLevelDialog() {
  if (!els.levelDialog) return;
  const experience = loadExperience();
  const progress = getExperienceLevel(experience.total);
  const nextStreak = getNextLoginStreak(experience);
  const dailyExp = getDailyLoginReward(nextStreak);
  els.levelCurrentTitle.textContent = progress.title;
  els.levelCurrentTitle.title = levelGuideVisible ? "收起境界说明" : "查看境界说明";
  els.levelUpgradeEta.textContent = getUpgradeEta(progress);
  els.levelSummary.textContent = `当前 ${progress.total.toLocaleString()} EXP。连续签到 ${Math.max(0, Number(experience.loginStreak) || 0)} 天，下次登录预计 +${dailyExp} EXP。`;
  els.levelCurrentTitle.closest(".level-current-card")?.classList.toggle("guide-open", levelGuideVisible);
  const guideButton = `
    <button class="level-guide-toggle" type="button" data-level-guide-toggle>
      ${levelGuideVisible ? "收起境界说明" : "查看境界说明"}
    </button>
  `;
  const leaderboard = `
    <section class="level-rank-panel">
      <div class="level-rank-head">
        <div>
          <span>家庭排行榜</span>
          <strong>修为榜</strong>
        </div>
        ${guideButton}
      </div>
      ${renderLevelLeaderboard()}
    </section>
  `;
  const guide = CULTIVATION_REALMS.map((realm, index) => {
    const nextThreshold = Number.isFinite(realm.next) ? realm.next : Infinity;
    const unlocked = experience.total >= realm.threshold;
    const active = progress.realm === realm.name;
    const completed = experience.total >= nextThreshold;
    const range = Number.isFinite(nextThreshold)
      ? `${realm.threshold.toLocaleString()} - ${(nextThreshold - 1).toLocaleString()} EXP`
      : `${realm.threshold.toLocaleString()}+ EXP`;
    const eta =
      !unlocked && Number.isFinite(realm.threshold)
        ? `${formatUpgradeDays(Math.ceil((realm.threshold - experience.total) / Math.max(1, dailyExp)))}后可达`
        : active
          ? getUpgradeEta(progress)
          : completed
            ? "已突破"
            : "终点境界";
    return `
      <article class="level-row ${active ? "active" : ""} ${completed ? "completed" : ""}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(realm.name)}</strong>
          <p>${escapeHtml(CULTIVATION_DESCRIPTIONS[realm.name] || "")}</p>
          <small>${range} · ${eta}</small>
        </div>
      </article>
    `;
  }).join("");
  els.levelList.innerHTML = `${leaderboard}${renderCultivationArchive()}${levelGuideVisible ? `<section class="level-guide-list">${guide}</section>` : ""}`;
  els.levelList.querySelector("[data-level-guide-toggle]")?.addEventListener("click", () => {
    levelGuideVisible = !levelGuideVisible;
    renderLevelDialog();
  });
  els.levelList.querySelector("[data-open-achievements]")?.addEventListener("click", openAchievementDialog);
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
    <article class="achievement-card ${badge.unlocked ? "unlocked" : "locked"}">
      <i>${badge.icon}</i>
      <div><small>${badge.category}</small><strong>${badge.title}</strong><p>${badge.unlocked ? "已经达成" : badge.detail}</p></div>
      <em>${Math.min(badge.current, badge.target)} / ${badge.target}</em>
      <span><b style="width:${badge.percent}%"></b></span>
    </article>
  `).join("");
  els.achievementFilters.querySelectorAll("[data-achievement-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      achievementFilter = button.dataset.achievementFilter || "全部";
      renderAchievementDialog();
    });
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
    const { error } = await cloudDb
      .from("user_profiles")
      .update({
        experience_total: next.total,
        today_experience_date: getLocalDateKey(),
        today_experience_amount: todayAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id);
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

function getOffsetLocalDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeTheme(theme) {
  return theme === "dark" || theme === "light" ? theme : "";
}

function getThemeStorageKey(userId = session?.user?.id || null) {
  return `${THEME_KEY}:${userId || "guest"}`;
}

function loadTheme(userId = session?.user?.id || null) {
  const stored =
    localStorage.getItem(getThemeStorageKey(userId)) || localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  const { error } = await cloudDb
    .from("user_profiles")
    .update({
      theme_preference: nextTheme,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
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

  const { error: profileError } = await cloudDb
    .from("user_profiles")
    .update({
      username: nickname,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);

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
  const { error: profileError } = await cloudDb
    .from("user_profiles")
    .update({
      avatar_url: avatarUrl,
      avatar_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);

  if (profileError) {
    await cleanupStoredImagePaths([path]).catch(() => {});
    els.avatarStatus.textContent = isMissingCloudSchema(profileError)
      ? "请先运行本次头像数据库补丁。"
      : `资料保存失败：${profileError.message}`;
    return;
  }

  accountProfile.avatarUrl = avatarUrl;
  accountProfile.avatarPath = path;
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
  const hint = els.photoDrop?.querySelector("span");
  if (!hint) return;
  hint.classList.add("upload-pick-button");
  hint.textContent = "选择图片";
  hint.setAttribute("role", "button");
  hint.setAttribute("tabindex", "0");
  hint.addEventListener("click", (event) => {
    event.preventDefault();
    els.photoInput.click();
  });
  hint.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    els.photoInput.click();
  });
  els.fileName.textContent = "展开后直接粘贴图片，或点上面选择";
}

function updatePhotoPreview() {
  const files = selectedUploadFiles;
  if (!files.length) {
    clearPhotoPreview();
    return;
  }

  revokePreviewUrls();
  const imageLimit = getCurrentImageLimit();
  if (files.length > imageLimit) {
    setStatus(`当前 VIP 等级单篇最多 ${imageLimit} 张图。`);
  } else {
    setStatus(files.length > 1 ? `将发布为 1 篇合集，共 ${files.length} 张图。` : "");
  }
  syncPhotoInputFiles();
  previewUrls = files.map((file) => URL.createObjectURL(file));
  els.photoPreview.src = previewUrls[0];
  els.photoPreview.hidden = false;
  els.fileName.textContent =
    files.length > 1 ? `已选择 ${files.length} 张图片` : files[0].name;
  renderPreviewStrip(files, previewUrls);
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
}

function clearPhotoPreview() {
  revokePreviewUrls();
  selectedUploadFiles = [];
  els.photoInput.value = "";

  els.photoPreview.removeAttribute("src");
  els.photoPreview.hidden = true;
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
      els.photoPreview.src = urls[index];
    };
    thumb.addEventListener("click", showPreview);
    thumb.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") showPreview(event);
    });
  });
  els.previewStrip.querySelectorAll("[data-remove-preview]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeUploadPreview(Number(button.dataset.removePreview));
    });
  });
}

function removeUploadPreview(index) {
  if (index < 0 || index >= selectedUploadFiles.length) return;
  selectedUploadFiles = selectedUploadFiles.filter((_, itemIndex) => itemIndex !== index);
  if (!selectedUploadFiles.length) {
    clearPhotoPreview();
    setStatus("已移除图片。");
    return;
  }
  updatePhotoPreview();
  setStatus("已移除图片。");
}

function switchPage(page) {
  closeMobileDiaryPage();
  activePage = ["recipes", "wishlist", "weekend", "thanks", "secret"].includes(page) ? page : "gallery";
  const showRecipes = activePage === "recipes";
  const showWishlist = activePage === "wishlist";
  const showWeekend = activePage === "weekend";
  const showThanks = activePage === "thanks";
  const showSecret = activePage === "secret";
  els.galleryNav.classList.toggle("active", activePage === "gallery");
  els.recipesNav?.classList.toggle("active", showRecipes);
  els.wishlistNav.classList.toggle("active", showWishlist);
  els.weekendNav.classList.toggle("active", showWeekend);
  els.thanksNav.classList.toggle("active", showThanks);
  els.secretNav?.classList.toggle("active", showSecret);
  els.composer.hidden = activePage !== "gallery" || !session;
  els.overview.hidden = activePage !== "gallery" || !session;
  els.foodWheelSection.hidden = !session;
  els.galleryHead.hidden = activePage !== "gallery";
  els.feedRefreshNotice.hidden = activePage !== "gallery" || !pendingNewPhotos.length;
  els.todayPostsNotice.hidden = activePage !== "gallery";
  els.galleryFilters.hidden = activePage !== "gallery";
  els.gallery.hidden = activePage !== "gallery";
  if (activePage !== "gallery") {
    els.feedLoader.hidden = true;
  }
  els.recipesPage.hidden = !showRecipes;
  els.wishlistPage.hidden = !showWishlist;
  els.weekendPage.hidden = !showWeekend;
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
  if (showThanks) renderGratitudeNotes();
  if (showSecret) {
    applyMobileSecretLayout();
    if (!secretItems.length && session) renderCachedSecretItems(session.user.id);
    renderSecretGallery();
    if (session && cloudDb) void loadSecretItems();
  }
  if (activePage === "gallery") {
    if (session && !isAdminAccount()) setGlobalStatus("");
    renderFeedRefreshNotice();
    renderGallery();
    updateFeedLoader(filteredPhotoCount);
  }
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

function secretFromCloudRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "",
    category: row.category || "未分类",
    note: row.note || "",
    coverImage: row.cover_image || "",
    coverPath: row.cover_path || "",
    images: normalizeSecretImages(row.images),
    linkedPhotoId: row.linked_photo_id || "",
    sortOrder: Number.isFinite(Number(row.sort_order))
      ? Number(row.sort_order)
      : getDefaultSecretSortOrder(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function secretToCloudRow(item, userId = session?.user?.id) {
  return {
    id: normalizeUuid(item.id),
    user_id: userId,
    title: item.title || "",
    category: item.category || "未分类",
    note: item.note || "",
    cover_image: item.coverImage || item.images?.[0]?.image_url || "",
    cover_path: item.coverPath || item.images?.[0]?.image_path || "",
    images: normalizeSecretImages(item.images),
    linked_photo_id: item.linkedPhotoId || null,
    sort_order: Number.isFinite(Number(item.sortOrder))
      ? Number(item.sortOrder)
      : getDefaultSecretSortOrder(item.createdAt),
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

function getDefaultSecretSortOrder(createdAt = "") {
  const time = new Date(createdAt || Date.now()).getTime();
  return Number.isFinite(time) ? -time : -Date.now();
}

function sortSecretItems(items = secretItems) {
  return [...items].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : getDefaultSecretSortOrder(a.createdAt);
    const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : getDefaultSecretSortOrder(b.createdAt);
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });
}

function normalizeSecretImages(images) {
  return Array.isArray(images)
    ? images
        .map((image) => {
          const tags = normalizeSecretPhotoTags(image);
          return {
            image_url: image?.image_url || image?.url || "",
            image_path: image?.image_path || image?.path || "",
            width: image?.width ?? null,
            height: image?.height ?? null,
            thumbnail_url: image?.thumbnail_url || image?.thumb_url || image?.image_url || image?.url || "",
            thumbnail_path: image?.thumbnail_path || image?.thumb_path || "",
            tag: tags[0] || DEFAULT_SECRET_PHOTO_TAG,
            tags,
            favorite: Boolean(image?.favorite || image?.is_favorite || image?.tags?.includes?.(FAVORITE_SECRET_PHOTO_TAG)),
            uploadedAt: image?.uploadedAt || image?.uploaded_at || image?.createdAt || image?.created_at || "",
          };
        })
        .filter((image) => image.image_url)
    : [];
}

function getSecretImageSortTime(image, fallbackIndex = 0) {
  const value = image?.uploadedAt || image?.uploaded_at || image?.createdAt || image?.created_at || "";
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : fallbackIndex;
}

function sortSecretDisplayEntries(entries) {
  return [...entries].sort((a, b) => {
    const timeA = getSecretImageSortTime(a.image, a.index);
    const timeB = getSecretImageSortTime(b.image, b.index);
    if (timeA !== timeB) return secretPhotoSortDescending ? timeB - timeA : timeA - timeB;
    return secretPhotoSortDescending ? b.index - a.index : a.index - b.index;
  });
}

function normalizeSecretPhotoTag(value) {
  const tag = String(value || "").trim();
  return tag || DEFAULT_SECRET_PHOTO_TAG;
}

function normalizeSecretPhotoTags(imageOrTags) {
  // `tags` is the canonical field. Falling back to the old single `tag`
  // field only when a multi-tag list does not exist prevents an old
  // “未标记” value from returning after it was removed.
  const hasTagList = !Array.isArray(imageOrTags) && Array.isArray(imageOrTags?.tags);
  const rawTags = Array.isArray(imageOrTags)
    ? imageOrTags
    : hasTagList
      ? imageOrTags.tags
      : [imageOrTags?.tag, imageOrTags?.category];
  const tags = rawTags
    .map((entry) => normalizeSecretPhotoTag(entry))
    .filter((tag) => tag && tag !== FAVORITE_SECRET_PHOTO_TAG);
  const unique = [...new Set(tags)];
  return unique.length ? unique : [DEFAULT_SECRET_PHOTO_TAG];
}

function setSecretImageTags(image, tags) {
  const normalized = [
    ...new Set(
      (Array.isArray(tags) ? tags : [tags])
        .map((entry) => normalizeSecretPhotoTag(entry))
        .filter((tag) => tag && tag !== FAVORITE_SECRET_PHOTO_TAG)
    ),
  ];
  const nextTags = normalized.length ? normalized : [DEFAULT_SECRET_PHOTO_TAG];
  return {
    ...image,
    tag: nextTags[0],
    tags: nextTags,
  };
}

function addSecretImageTag(image, rawTag) {
  const nextTag = normalizeSecretPhotoTag(rawTag);
  const existing = normalizeSecretPhotoTags(image).filter(
    (tag) => tag !== DEFAULT_SECRET_PHOTO_TAG || nextTag === DEFAULT_SECRET_PHOTO_TAG
  );
  return setSecretImageTags(image, [...existing, nextTag]);
}

function removeSecretImageTag(image, rawTag) {
  const removeTag = normalizeSecretPhotoTag(rawTag);
  return setSecretImageTags(
    image,
    normalizeSecretPhotoTags(image).filter((tag) => tag !== removeTag)
  );
}

function secretImageHasTag(image, tag) {
  const target = normalizeSecretPhotoTag(tag);
  return normalizeSecretPhotoTags(image).includes(target);
}

function getSecretPhotoTags(items = secretItems) {
  const tags = [];
  items.forEach((item) => {
    normalizeSecretImages(item.images).forEach((image) => {
      normalizeSecretPhotoTags(image).forEach((tag) => {
        if (!tags.includes(tag)) tags.push(tag);
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
  const images = normalizeSecretImages(item?.images);
  const tags = [];
  if (images.some((image) => image.favorite)) tags.push(FAVORITE_SECRET_PHOTO_TAG);
  images.forEach((image) => {
    normalizeSecretPhotoTags(image).forEach((tag) => {
      if (!tags.includes(tag)) tags.push(tag);
    });
  });
  return tags;
}

function imageMatchesSecretFilter(image) {
  if (activeSecretFilter === "全部") return true;
  if (activeSecretFilter === FAVORITE_SECRET_PHOTO_TAG) return Boolean(image?.favorite);
  return secretImageHasTag(image, activeSecretFilter);
}

async function loadSecretItems() {
  if (!cloudDb || !session) {
    secretItems = [];
    renderSecretGallery();
    return;
  }
  if (!secretItems.length) {
    renderCachedSecretItems(session.user.id);
  }
  try {
    const { data, error } = await cloudDb
      .from("secret_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    secretCloudAvailable = true;
    secretItems = sortSecretItems((data || []).map(secretFromCloudRow));
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
  if (!files.length) {
    els.secretImagePreview.removeAttribute("src");
    els.secretImagePreview.hidden = true;
    els.secretPreviewStrip.innerHTML = "";
    els.secretPreviewStrip.hidden = true;
    els.secretImageName.textContent = "还没有选择图片";
    return;
  }
  secretPreviewUrls = files.slice(0, 9).map((file) => URL.createObjectURL(file));
  els.secretImagePreview.src = secretPreviewUrls[0];
  els.secretImagePreview.hidden = false;
  els.secretImageName.textContent =
    files.length > 1 ? `已选择 ${files.length} 张图片` : files[0].name;
  renderSecretPreviewStrip(files, secretPreviewUrls);
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
function revokeSecretPreviewUrls() {
  secretPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  secretPreviewUrls = [];
}

function handleSecretPaste(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItems = items.filter((item) => item.type.startsWith("image/"));
  if (!imageItems.length) return;
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
  if (!files.length) {
    setSecretStatus("请先选择或粘贴图片。");
    return;
  }
  const imageLimit = SECRET_ALBUM_IMAGE_LIMIT;
  if (files.length > imageLimit) {
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
    const { error } = await cloudDb.from("secret_items").insert(secretToCloudRow(item));
    if (error) throw error;
    els.secretForm.reset();
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
  const activeAlbum = secretItems.find((item) => item.id === activeSecretAlbumId);
  const layoutToggle = els.secretPage?.querySelector("[data-secret-layout-toggle]");
  if (layoutToggle) layoutToggle.hidden = Boolean(activeAlbum);
  const allPhotoTags = activeAlbum
    ? ["全部", ...getSecretAlbumFilterTags(activeAlbum)]
    : ["全部", DEFAULT_SECRET_PHOTO_TAG];
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
    const photoTags = ["全部", ...getSecretAlbumFilterTags(activeAlbum)];
    if (!photoTags.includes(activeSecretFilter)) activeSecretFilter = "全部";
    els.secretFilters.hidden = false;
    els.secretFilters.innerHTML = photoTags
      .map(
        (tag) =>
          `<button class="${tag === activeSecretFilter ? "active" : ""}" type="button" data-secret-filter="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
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
  const visible = sortSecretItems(secretItems);
  if (!visible.length) {
    els.secretGallery.innerHTML = `<div class="empty">这里还没有相册，先上传第一组私人收藏吧。</div>`;
    return;
  }
  els.secretGallery.innerHTML = visible
    .map((item, index) => {
      const itemImages = normalizeSecretImages(item.images);
      const cover = item.coverImage || itemImages[0]?.image_url || "";
      const linkedPhoto = photos.find((photo) => photo.id === item.linkedPhotoId);
      const linkedTitle = linkedPhoto ? getDisplayTitle(linkedPhoto) || "关联日记" : "";
      const tagSummary = [
        ...new Set(itemImages.flatMap((image) => normalizeSecretPhotoTags(image))),
      ].slice(0, 3).join(" · ");
      return `
        <article class="secret-card">
          <button class="secret-cover" type="button" data-secret-index="${index}">
            <img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title || item.category)}" loading="lazy" />
            <span>${String(itemImages.length).padStart(2, "0")}</span>
          </button>
          <div>
             <p class="kicker">${escapeHtml(tagSummary || DEFAULT_SECRET_PHOTO_TAG)}</p>
             ${item.title ? `<h3>${escapeHtml(item.title)}</h3>` : ""}
            ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
            ${linkedTitle ? `<small>关联：${escapeHtml(linkedTitle)}</small>` : ""}
            <div class="secret-card-sort">
              <button type="button" data-secret-album-move="${escapeHtml(item.id)}:-1" ${index === 0 ? "disabled" : ""}>上移</button>
              <button type="button" data-secret-album-move="${escapeHtml(item.id)}:1" ${index === visible.length - 1 ? "disabled" : ""}>下移</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  els.secretGallery.querySelectorAll("[data-secret-index]").forEach((button) => {
    button.addEventListener("click", () => {
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

function renderSecretAlbumView(item) {
  const images = normalizeSecretImages(item.images);
  const displayEntries = sortSecretDisplayEntries(
    images
      .map((image, index) => ({ image, index }))
      .filter(({ image }) => imageMatchesSecretFilter(image))
  );
  const linkedPhoto = photos.find((photo) => photo.id === item.linkedPhotoId);
  const linkedTitle = linkedPhoto ? getDisplayTitle(linkedPhoto) || "关联日记" : "";
  const validSelectedIndexes = [...selectedSecretImageIndexes].filter((index) => index >= 0 && index < images.length);
  const selectedCount = validSelectedIndexes.length;
  const singleSelectedIndex = selectedCount === 1 ? validSelectedIndexes[0] : -1;
  const knownTags = getSecretAlbumFilterTags(item).filter((tag) => tag !== FAVORITE_SECRET_PHOTO_TAG);
  const moveTargetOptions = sortSecretItems(secretItems)
    .filter((entry) => entry.id !== item.id)
    .map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.title || entry.category || "未命名相册")}</option>`)
    .join("");
  els.secretGallery.innerHTML = `
    <section class="secret-album-view ${secretSelectionMode ? "selection-active" : ""} ${secretSelectionMode && secretMobileToolsExpanded ? "tools-expanded" : ""}">
      <header class="secret-album-head">
        <div>
          <p class="kicker">${escapeHtml(item.category || "未分类")}</p>
          <div class="secret-album-title-row">
            <h3>${escapeHtml(item.title || "未命名相册")}</h3>
            <button class="secret-back-button" type="button" data-secret-back>返回相册</button>
          </div>
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
          ${linkedTitle ? `<small>关联：${escapeHtml(linkedTitle)}</small>` : ""}
        </div>
        <div class="secret-album-actions">
          <button type="button" data-secret-new-album>新建相册</button>
          <button class="primary" type="button" data-secret-toggle-append>${secretAppendExpanded ? "收起上传" : "添加相片"}</button>
          <button class="delete-secret danger" type="button" data-secret-delete-current>删除相册</button>
        </div>
      </header>
      <button class="secret-mobile-back" type="button" data-secret-back aria-label="返回相册">‹ <span>返回相册</span></button>
      <div class="secret-album-toolbar ${secretSelectionMode && secretMobileToolsExpanded ? "tools-expanded" : ""}">
        <div class="secret-toolbar-primary">
          ${
            secretSelectionMode
              ? `<button type="button" data-secret-select-mode>取消选择</button>`
              : `
                <button type="button" data-secret-edit-album>${secretAlbumEditing ? "收起编辑" : "编辑相册"}</button>
                <button type="button" data-secret-select-mode>选择图片</button>
              `
          }
        </div>
        ${
          secretSelectionMode
            ? `
              <div class="secret-quick-move-actions">
                <button type="button" data-secret-move="-1" ${singleSelectedIndex > 0 ? "" : "disabled"}>前移</button>
                <button type="button" data-secret-move="1" ${singleSelectedIndex >= 0 && singleSelectedIndex < images.length - 1 ? "" : "disabled"}>后移</button>
              </div>
              <button class="secret-tools-toggle" type="button" data-secret-tools-toggle>
                ${secretMobileToolsExpanded ? "收起工具" : `编辑工具 · 已选 ${selectedCount}`}
              </button>
              <div class="secret-selection-actions">
                <button type="button" data-secret-select-all>${displayEntries.length && displayEntries.every(({ index }) => selectedSecretImageIndexes.has(index)) ? "取消全选" : "全选"}</button>
                <button type="button" data-secret-set-cover ${singleSelectedIndex >= 0 ? "" : "disabled"}>设为封面</button>
                <button class="delete-secret danger" type="button" data-secret-delete-selected ${selectedCount ? "" : "disabled"}>删除选中</button>
                <div class="secret-photo-move-editor">
                  <select data-secret-move-album-select ${selectedCount && moveTargetOptions ? "" : "disabled"}>
                    <option value="">移动到其它相册</option>
                    ${moveTargetOptions}
                  </select>
                  <button type="button" data-secret-move-album ${selectedCount && moveTargetOptions ? "" : "disabled"}>移动</button>
                </div>
                <div class="secret-photo-tag-editor">
                  <input data-secret-photo-tag-input maxlength="32" list="secretCategoryList" placeholder="${DEFAULT_SECRET_PHOTO_TAG}" />
                  <button type="button" data-secret-apply-photo-tag ${selectedCount ? "" : "disabled"}>保存 tag</button>
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
      ${
        secretAlbumEditing
          ? `
            <form class="secret-album-edit" data-secret-edit-form>
              <input data-secret-edit-title maxlength="80" value="${escapeHtml(item.title || "")}" placeholder="相册名" />
              <input data-secret-edit-category maxlength="32" value="${escapeHtml(item.category || "")}" placeholder="分类" />
              <textarea data-secret-edit-note rows="2" placeholder="备注">${escapeHtml(item.note || "")}</textarea>
              <div>
                <button class="primary" type="submit">保存相册</button>
                <button type="button" data-secret-edit-cancel>取消</button>
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
          上传时间 <span>${secretPhotoSortDescending ? "↓" : "↑"}</span>
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
              <button class="secret-album-photo ${secretSelectionMode ? "selectable" : ""} ${selectedSecretImageIndexes.has(index) ? "selected" : ""}" type="button" data-secret-photo="${index}">
                <img src="${escapeHtml(image.thumbnail_url || image.image_url)}" data-full-src="${escapeHtml(image.image_url)}" alt="${escapeHtml(item.title || item.category || "秘藏图片")} ${index + 1}" loading="lazy" decoding="async" />
                <small class="secret-photo-tag">${escapeHtml(normalizeSecretPhotoTags(image).slice(0, 2).join(" · "))}</small>
                ${image.favorite ? `<strong class="secret-photo-favorite">♥</strong>` : ""}
                ${secretSelectionMode ? `<span>${selectedSecretImageIndexes.has(index) ? "已选" : String(index + 1).padStart(2, "0")}</span>` : ""}
              </button>
            `
          )
          .join("") || `<div class="empty">这个 tag 下还没有照片。</div>`}
      </div>
    </section>
  `;
  updateSecretToolbarTop();
  requestAnimationFrame(updateSecretToolbarTop);
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
  els.secretGallery.querySelector("[data-secret-new-album]")?.addEventListener("click", () => {
    activeSecretAlbumId = "";
    activeSecretFilter = "全部";
    secretSelectionMode = false;
    selectedSecretImageIndexes = new Set();
    setSecretExpanded(true);
    renderSecretGallery();
    window.requestAnimationFrame(() => {
      els.secretComposer?.scrollIntoView({ behavior: "smooth", block: "start" });
      els.secretTitleInput?.focus({ preventScroll: true });
    });
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
  els.secretGallery.querySelector("[data-secret-photo-sort]")?.addEventListener("click", () => {
    secretPhotoSortDescending = !secretPhotoSortDescending;
    renderSecretGallery();
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
  els.secretGallery.querySelector("[data-secret-back-top]")?.addEventListener("click", () => {
    scrollSecretAlbumToTop();
  });
  els.secretGallery.querySelectorAll("[data-secret-move]").forEach((button) => {
    button.addEventListener("click", () => moveSelectedSecretImage(item, Number(button.dataset.secretMove) || 0));
  });
  els.secretGallery.querySelectorAll("[data-secret-photo]").forEach((button) => {
    const clearLongPress = () => {
      if (!secretPhotoLongPressTimer) return;
      window.clearTimeout(secretPhotoLongPressTimer);
      secretPhotoLongPressTimer = null;
    };
    button.addEventListener("pointerdown", () => {
      clearLongPress();
      secretPhotoLongPressTriggered = false;
      const index = Number(button.dataset.secretPhoto) || 0;
      secretPhotoLongPressTimer = window.setTimeout(() => {
        secretPhotoLongPressTriggered = true;
        secretPhotoLongPressTimer = null;
        secretSelectionMode = true;
        secretMobileToolsExpanded = false;
        selectedSecretImageIndexes = new Set([index]);
        renderSecretGallery();
      }, 450);
    });
    button.addEventListener("pointerup", clearLongPress);
    button.addEventListener("pointercancel", clearLongPress);
    button.addEventListener("pointerleave", clearLongPress);
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
      });
    });
  });
}

function openSecretItem(item, initialImageIndex = 0, options = {}) {
  if (!item) return;
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
  els.dialog.classList.remove("mobile-page-dialog", "secret-image-fullscreen");
  els.dialog.classList.add("no-comments-dialog", "secret-image-dialog");
  if (isMobileViewport()) els.dialog.classList.add("secret-image-fullscreen");
  document.body.classList.remove("mobile-dialog-open");
  dialogRandomMode = false;
  dialogImages = Array.isArray(options.images) && options.images.length
    ? options.images
    : normalizeSecretImages(item.images);
  dialogImageIndex = Math.min(
    Math.max(0, Number(initialImageIndex) || 0),
    Math.max(0, dialogImages.length - 1)
  );
  els.dialogTitle.textContent = item.title || item.category || "秘藏相册";
  els.dialogMeta.textContent = `${normalizeSecretPhotoTags(dialogImages[dialogImageIndex]).slice(0, 2).join(" · ")} · ${dialogImageIndex + 1} / ${dialogImages.length}`;
  els.dialogNote.textContent = item.note || "";
  els.photoCommentsSection.hidden = true;
  if (els.dialogRandomButton) els.dialogRandomButton.hidden = true;
  if (els.dialogSecretReturnButton) els.dialogSecretReturnButton.hidden = true;
  if (els.dialogSecretLinkButton) {
    els.dialogSecretLinkButton.hidden = !item.linkedPhotoId;
  }
  renderDialogMedia();
  showPhotoDialogPreservingScroll();
}

function toggleDialogImageFullscreen() {
  if (!dialogImages.length || !els.dialog.open) return;
  if (Date.now() < suppressDialogImageClickUntil) return;
  if (isMobileViewport() && activeSecretDialogItem) return;
  resetSecretImageZoom();
  els.dialog.classList.toggle("secret-image-fullscreen");
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

function extractImageUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s"'<>，。；、]+/gi) || [];
  return [...new Set(matches.map((url) => url.trim()).filter(Boolean))];
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
  const { error } = await cloudDb
    .from("secret_items")
    .update(nextUpdates)
    .eq("id", item.id);
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
    cloudDb
      .from("secret_items")
      .update({ sort_order: targetOrder, updated_at: now })
      .eq("id", current.id)
      .eq("user_id", session.user.id),
    cloudDb
      .from("secret_items")
      .update({ sort_order: currentOrder, updated_at: now })
      .eq("id", targetItem.id)
      .eq("user_id", session.user.id),
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
  const category = form.querySelector("[data-secret-edit-category]")?.value.trim() || "未分类";
  const note = form.querySelector("[data-secret-edit-note]")?.value.trim() || "";
  const saved = await updateSecretAlbum(item, { title, category, note }, "相册资料已保存。");
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
  const target = index + direction;
  if (index < 0 || target < 0 || target >= images.length) return;
  const nextImages = [...images];
  [nextImages[index], nextImages[target]] = [nextImages[target], nextImages[index]];
  selectedSecretImageIndexes = new Set([target]);
  const coverImage = item.coverImage === images[index]?.image_url ? nextImages[target]?.image_url : item.coverImage;
  const coverPath = item.coverImage === images[index]?.image_url ? nextImages[target]?.image_path || "" : item.coverPath;
  await updateSecretAlbum(item, { images: nextImages, cover_image: coverImage || "", cover_path: coverPath || "" }, "图片位置已更新。");
  renderSecretGallery();
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
  if (!confirm(`删除当前相册里的「${tag}」tag？会从 ${affectedCount} 张照片上移除。`)) return;
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
  const { error } = await cloudDb
    .from("secret_items")
    .update({
      images: nextImages,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id);
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
  if (!confirm(`删除选中的 ${selected.length} 张图片？`)) return;
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
    cloudDb
      .from("secret_items")
      .update({ images: nextSourceImages, ...sourceCover, updated_at: now })
      .eq("id", sourceItem.id)
      .eq("user_id", session.user.id),
    cloudDb
      .from("secret_items")
      .update({ images: nextTargetImages, ...targetCover, updated_at: now })
      .eq("id", targetItem.id)
      .eq("user_id", session.user.id),
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
  if (!confirm(`把「${sourceItem.title || sourceItem.category || "当前相册"}」的 ${sourceImages.length} 张照片全部移动到「${targetName}」？原相册随后会被删除。`)) return;

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
  const targetResult = await cloudDb
    .from("secret_items")
    .update(targetUpdates)
    .eq("id", targetItem.id)
    .eq("user_id", session.user.id);
  if (targetResult.error) {
    setSecretStatus(targetResult.error.message || "无法写入目标相册。");
    return;
  }

  const deleteResult = await cloudDb
    .from("secret_items")
    .delete()
    .eq("id", sourceItem.id)
    .eq("user_id", session.user.id);
  if (deleteResult.error) {
    await cloudDb
      .from("secret_items")
      .update({ images: originalTargetImages, updated_at: targetItem.updatedAt || now })
      .eq("id", targetItem.id)
      .eq("user_id", session.user.id);
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
    const { error } = await cloudDb
      .from("secret_items")
      .update(updates)
      .eq("id", item.id)
      .eq("user_id", session.user.id);
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
  if (!item || !session || !confirm("把这个秘藏相册移到回收站？30 天内可以恢复。")) return;
  const trashSaved = await createTrashItem(
    "secret",
    item.id,
    item.title || item.category || "秘藏相册",
    secretToCloudRow(item)
  );
  if (!trashSaved) {
    setSecretStatus("无法写入回收站，已取消删除。");
    return;
  }
  const { error } = await cloudDb
    .from("secret_items")
    .delete()
    .eq("id", item.id)
    .eq("user_id", session.user.id);
  if (error) {
    setSecretStatus(error.message || "删除失败。");
    return;
  }
  if (activeSecretAlbumId === item.id) activeSecretAlbumId = "";
  setSecretStatus("秘藏已移到回收站，可在设置中恢复。");
  showMiniToast("秘藏已移到回收站", { kind: "success" });
  await loadSecretItems();
}

function getToolDockOrderStorageKey(userId = session?.user?.id || "guest") {
  return `${TOOL_DOCK_ORDER_KEY}:${userId}`;
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
  try {
    const raw =
      localStorage.getItem(getToolDockOrderStorageKey(userId)) ||
      localStorage.getItem(TOOL_DOCK_ORDER_KEY);
    return normalizeToolDockOrder(JSON.parse(raw || "[]"));
  } catch {
    return [...TOOL_DOCK_DEFAULT_ORDER];
  }
}

function writeToolDockOrder(order, userId = session?.user?.id || "guest") {
  localStorage.setItem(
    getToolDockOrderStorageKey(userId),
    JSON.stringify(normalizeToolDockOrder(order))
  );
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
  const { data, error } = await cloudDb
    .from("user_profiles")
    .update({
      food_options: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id)
    .select("food_options")
    .single();
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

  if (recipeCoverPreviewUrl) URL.revokeObjectURL(recipeCoverPreviewUrl);
  recipeCoverPreviewUrl = URL.createObjectURL(file);
  els.recipeCoverPreview.src = recipeCoverPreviewUrl;
  els.recipeCoverPreview.onload = () => {
    els.recipeCoverPreview.classList.toggle(
      "portrait-recipe-preview",
      els.recipeCoverPreview.naturalHeight > els.recipeCoverPreview.naturalWidth
    );
  };
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

function resetRecipeForm() {
  els.recipeForm.reset();
  recipeEditingId = null;
  recipeExistingCover = "";
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

  const coverImage = await getRecipeCoverForSave();
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
    const { data, error } = await cloudDb
      .from("recipes")
      .upsert(recipeToCloudRow(recipe, recipe.userId), { onConflict: "id" })
      .select("*")
      .single();
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
  els.recipesList.querySelectorAll(".recipe-cover img").forEach((image) => {
    const updateOrientation = () => {
      image.closest(".recipe-cover")?.classList.toggle(
        "portrait-cover",
        image.naturalHeight > image.naturalWidth
      );
    };
    if (image.complete) updateOrientation();
    else image.addEventListener("load", updateOrientation, { once: true });
  });
}

function renderRecipeCover(recipe) {
  if (recipe.coverImage) {
    return `
      <div class="recipe-cover">
        <img src="${recipe.coverImage}" alt="${escapeHtml(recipe.name)} 封面" loading="lazy" />
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
  const ok = window.confirm(`删除菜谱“${recipe.name}”？`);
  if (!ok) return;
  if (!cloudSyncAvailable) {
    setRecipeStatus("数据库尚未连接，不能删除菜谱。");
    return;
  }

  const { error } = await cloudDb.from("recipes").delete().eq("id", id);
  if (error) {
    setRecipeStatus(`删除同步失败：${error.message}`);
    return;
  }

  recipes = recipes.filter((item) => item.id !== id);
  saveRecipes();
  setRecipeStatus("菜谱已从云端删除。");
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

function composeWishStoredNote(note, imageUrl = "", imagePath = "") {
  const cleanNote = String(note || "").trim();
  if (!imageUrl) return cleanNote;
  const payload = encodeURIComponent(JSON.stringify({ imageUrl, imagePath }));
  return `${cleanNote}${cleanNote ? "\n\n" : ""}${WISH_MEDIA_META_START}${payload}${WISH_MEDIA_META_END}`;
}

function parseWishStoredNote(value) {
  const text = String(value || "");
  const start = text.indexOf(WISH_MEDIA_META_START);
  if (start === -1) return { note: text.trim(), imageUrl: "", imagePath: "" };
  const payloadStart = start + WISH_MEDIA_META_START.length;
  const end = text.indexOf(WISH_MEDIA_META_END, payloadStart);
  if (end === -1) return { note: text.trim(), imageUrl: "", imagePath: "" };

  try {
    const media = JSON.parse(decodeURIComponent(text.slice(payloadStart, end)));
    return {
      note: `${text.slice(0, start)}${text.slice(end + WISH_MEDIA_META_END.length)}`.trim(),
      imageUrl: media.imageUrl || "",
      imagePath: media.imagePath || "",
    };
  } catch {
    return { note: text.trim(), imageUrl: "", imagePath: "" };
  }
}

function updateWishImagePreview() {
  const file = els.wishImageInput.files?.[0];
  if (!file) return;
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
  if (!imageItem) return;
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
  updateWishImagePreview();
  setWishlistStatus("已读取剪切板图片。");
}

async function uploadWishImage(file, title) {
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
    image = await uploadWishImage(els.wishImageInput.files?.[0], title);
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
    let { data, error } = await cloudDb
      .from("wishes")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    if (error && isMissingCloudSchema(error)) {
      wishCompletionNoteCloudAvailable = false;
      row = wishToLegacyCloudRow(wish, wish.userId);
      const retry = await cloudDb
        .from("wishes")
        .upsert(row, { onConflict: "id" })
        .select("*")
        .single();
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
                ? `<button class="wish-card-image-button" type="button" data-view-wish-image="${escapeHtml(wish.id)}" aria-label="放大查看 ${escapeHtml(wish.title)}">
                    <img class="wish-card-image" src="${escapeHtml(wish.imageUrl)}" alt="${escapeHtml(wish.title)}" loading="lazy" />
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
              ${wish.note ? `<p class="wish-note">${escapeHtml(wish.note)}</p>` : ""}
              ${
                wish.done && wish.completionNote
                  ? `<div class="wish-completion-note">
                      <span>完成回执</span>
                      <p>${escapeHtml(wish.completionNote)}</p>
                    </div>`
                  : wish.done
                    ? `<div class="wish-completion-note empty">
                        <span>完成回执</span>
                        <p>已经完成啦，之后可以编辑补上一句感想。</p>
                      </div>`
                    : ""
              }
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
  els.wishlistList.querySelectorAll("button[data-toggle-wish]").forEach((button) => {
    button.addEventListener("click", () => toggleWish(button.dataset.toggleWish));
  });
  els.wishlistList.querySelectorAll("button[data-delete-wish]").forEach((button) => {
    button.addEventListener("click", () => deleteWish(button.dataset.deleteWish));
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
  let result = await cloudDb
    .from("wishes")
    .update(updatePayload)
    .eq("id", current.id)
    .select("*")
    .single();

  if (result.error && isMissingCloudSchema(result.error)) {
    wishCompletionNoteCloudAvailable = false;
    result = await cloudDb
      .from("wishes")
      .update({
        is_done: next.done,
        completed_at: next.completedAt || null,
        updated_at: next.updatedAt,
      })
      .eq("id", current.id)
      .select("*")
      .single();
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
  const ok = window.confirm(`把“${current.title}”改回待实现？`);
  if (!ok) return;
  await saveWishCompletionState(current, false, "");
}

async function deleteWish(id) {
  const wish = wishes.find((item) => item.id === id);
  if (!wish || !canManageItem(wish)) return;
  const ok = window.confirm(`删除心愿“${wish.title}”？`);
  if (!ok) return;
  if (!cloudSyncAvailable) {
    setWishlistStatus("数据库尚未连接，不能删除心愿。");
    return;
  }

  if (cloudSyncAvailable) {
    const { error } = await cloudDb.from("wishes").delete().eq("id", id);
    if (error) {
      setWishlistStatus(`删除同步失败：${error.message}`);
      return;
    }
  }

  if (wish.imagePath && cloudDb && session) {
    await cleanupStoredImagePaths([wish.imagePath]);
  }
  wishes = wishes.filter((item) => item.id !== id);
  saveWishes();
  setWishlistStatus("心愿已从云端删除。");
  renderWishes();
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

function getAnniversaryStorageKey() {
  const name = session ? getSessionDisplayName() : "guest";
  return `${ANNIVERSARY_KEY}:${String(name).toLowerCase()}`;
}

function createDefaultAnniversaries() {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      title: "我和妻子",
      type: "together",
      date: "",
      note: "在一起的日子",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "呱呱",
      type: "pet",
      date: "",
      note: "记录呱呱的年龄",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "噗噗",
      type: "pet",
      date: "",
      note: "记录噗噗的年龄",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function loadAnniversaries() {
  const stored = localStorage.getItem(getAnniversaryStorageKey());
  if (!stored) {
    const defaults = createDefaultAnniversaries();
    localStorage.setItem(getAnniversaryStorageKey(), JSON.stringify(defaults));
    return defaults;
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : createDefaultAnniversaries();
  } catch {
    return createDefaultAnniversaries();
  }
}

function saveAnniversaries() {
  if (!session) return;
  localStorage.setItem(getAnniversaryStorageKey(), JSON.stringify(anniversaries));
}

function anniversaryToCloudRow(item, userId = session?.user?.id) {
  return {
    id: normalizeUuid(item.id),
    user_id: userId,
    title: item.title,
    event_type: item.type || "annual",
    event_date: item.date,
    note: item.note || "",
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

function anniversaryFromCloudRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.event_type,
    date: row.event_date || "",
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    const { data, error } = await cloudDb
      .from("anniversaries")
      .upsert(anniversaryToCloudRow(item, item.userId), { onConflict: "id" })
      .select("*")
      .single();
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
  if (!item || !canManageItem(item) || !window.confirm(`删除“${item.title}”？`)) return;
  if (!anniversaryCloudAvailable) {
    els.anniversaryStatus.textContent = "数据库尚未连接，不能删除纪念日。";
    return;
  }
  if (item.date) {
    const { error } = await cloudDb.from("anniversaries").delete().eq("id", id);
    if (error) {
      els.anniversaryStatus.textContent = `删除失败：${error.message}`;
      return;
    }
  }
  anniversaries = anniversaries.filter((entry) => entry.id !== id);
  saveAnniversaries();
  renderAnniversaries();
}

async function synchronizeAnniversaries(userId = session?.user?.id) {
  if (!cloudDb || !session || !userId) return;
  try {
    const { data, error } = await cloudDb
      .from("anniversaries")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;

    let cloudItems = data || [];
    const localItems = loadAnniversaries();
    const cloudIds = new Set(cloudItems.map((item) => item.id));
    const migratableItems = localItems.filter(
      (item) =>
        item.date &&
        (!item.userId || item.userId === userId) &&
        !cloudIds.has(item.id)
    );
    if (migratableItems.length) {
      const { error: migrateError } = await cloudDb
        .from("anniversaries")
        .upsert(migratableItems.map((item) => anniversaryToCloudRow(item, userId)), {
          onConflict: "id",
        });
      if (migrateError) throw migrateError;
      const refreshed = await cloudDb
        .from("anniversaries")
        .select("*")
        .order("created_at", { ascending: true });
      if (refreshed.error) throw refreshed.error;
      cloudItems = refreshed.data || [];
    }

    anniversaryCloudAvailable = true;
    const cloudMapped = cloudItems.map(anniversaryFromCloudRow);
    const mappedCloudIds = new Set(cloudMapped.map((item) => item.id));
    const pendingLocal = localItems.filter(
      (item) =>
        !item.date &&
        (!item.userId || item.userId === userId) &&
        !mappedCloudIds.has(item.id)
    );
    anniversaries = cloudMapped.length ? [...cloudMapped, ...pendingLocal] : localItems;
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
  let plan = {
    id: normalizeUuid(weekendEditingId),
    userId: previous?.userId || session.user.id,
    title,
    date: els.weekendDateInput.value || getNextWeekendDate(),
    location: els.weekendLocationInput.value.trim(),
    type: els.weekendTypeInput.value,
    note: els.weekendNoteInput.value.trim(),
    done: previous?.done || false,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (weekendCloudAvailable) {
    const { data, error } = await cloudDb
      .from("weekend_plans")
      .upsert(weekendToCloudRow(plan, plan.userId), { onConflict: "id" })
      .select("*")
      .single();
    if (error) {
      setWeekendStatus(`周末计划同步失败：${error.message}`);
      return;
    }
    plan = weekendFromCloudRow(data);
  }

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
            ${canManage ? `<div class="weekend-card-actions">
              <button type="button" data-edit-weekend="${escapeHtml(plan.id)}">编辑</button>
              <button type="button" data-toggle-weekend="${escapeHtml(plan.id)}">
                ${plan.done ? "重新计划" : "完成"}
              </button>
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
  let next = { ...current, done: !current.done, updatedAt: new Date().toISOString() };
  if (weekendCloudAvailable) {
    const { data, error } = await cloudDb
      .from("weekend_plans")
      .update({ is_done: next.done, updated_at: next.updatedAt })
      .eq("id", id)
      .select("*")
      .single();
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
  if (!plan || !canManageItem(plan) || !window.confirm(`删除周末计划“${plan.title}”？`)) return;
  if (!weekendCloudAvailable) {
    setWeekendStatus("数据库尚未连接，不能删除周末计划。");
    return;
  }
  const { error } = await cloudDb.from("weekend_plans").delete().eq("id", id);
  if (error) {
    setWeekendStatus(`删除同步失败：${error.message}`);
    return;
  }
  weekendPlans = weekendPlans.filter((item) => item.id !== id);
  saveWeekendPlans();
  setWeekendStatus("周末计划已删除。");
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
  const { error } = await cloudDb
    .from("user_profiles")
    .update({
      preferred_thanks_color: safeColor,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);
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

  const request = gratitudeEditingId
    ? cloudDb
        .from("gratitude_notes")
        .update(payload)
        .eq("id", gratitudeEditingId)
        .eq("user_id", session.user.id)
    : cloudDb.from("gratitude_notes").insert(payload);
  const { error } = await request;
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
  if (!window.confirm("删除这条留言？")) return;
  const { error } = await cloudDb
    .from("gratitude_notes")
    .delete()
    .eq("id", id);
  if (error) {
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
  const allowedSections = ["settingsGeneral", "settingsCache", "settingsTools", "settingsAccount", "settingsFamily", "settingsSafety"];
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
  if (nextSection === "settingsFamily") renderSettingsFamilyPanel();
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
    cloudDb.from("recipes").select("*").order("created_at", { ascending: false }),
    cloudDb.from("wishes").select("*").order("created_at", { ascending: false }),
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
  if (!member || !window.confirm(`把 ${member.username} 移出家庭组？`)) return;
  const { error } = await cloudDb.rpc("remove_family_member", { p_user_id: userId });
  if (error) {
    els.familyStatus.textContent = `移除失败：${error.message}`;
    return;
  }
  await loadFamilyContext();
  els.familyStatus.textContent = `${member.username} 已移出家庭组。`;
  await refreshSharedContent();
}

function formatCommentTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
  const actor = getNotificationActorName(item);
  if (item.type === "diary") return `${actor} 发布了新日记`;
  if (item.type === "thanks") return `${actor} 写了一句感谢留言`;
  if (item.type === "favorite") return `${actor} 收藏了你的日记`;
  if (item.type === "reply") return `${actor} 回复了你的留言`;
  return `${actor} 评论了你的日记`;
}

function getNotificationActorName(item) {
  const fromFamily = item?.actor_id ? familyMemberMap.get(item.actor_id)?.username : "";
  return item?.actor_username || fromFamily || "有人";
}

function getNotificationActorAvatar(item) {
  const fromFamily = item?.actor_id ? familyMemberMap.get(item.actor_id)?.avatar_url : "";
  return item?.actor_avatar_url || fromFamily || "";
}

async function loadNotifications() {
  if (!cloudDb || !session) {
    notifications = [];
    renderNotifications();
    return;
  }
  const { data, error } = await cloudDb.rpc("get_my_notifications", { p_limit: 50 });
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
  els.notificationList.innerHTML = notifications
    .map((item) => {
      const actorName = getNotificationActorName(item);
      const actorAvatar = getNotificationActorAvatar(item);
      const avatar = actorAvatar
        ? `<span class="notification-avatar"><img src="${escapeHtml(actorAvatar)}" alt="" /></span>`
        : `<span class="notification-avatar">${escapeHtml(getInitial(actorName))}</span>`;
      const stateClass = item.just_seen ? "just-seen" : item.is_read ? "" : "unread";
      return `
        <button class="notification-item ${stateClass}" type="button" data-notification-id="${escapeHtml(item.notification_id)}" data-notification-type="${escapeHtml(item.type || "")}" data-notification-photo="${escapeHtml(item.photo_id || "")}">
          ${avatar}
          <span>
            <strong>${escapeHtml(getNotificationText(item))}${item.just_seen ? `<em>刚看到</em>` : ""}</strong>
            ${item.body ? `<small>${escapeHtml(item.body)}</small>` : ""}
            <time>${formatCommentTime(item.created_at)}</time>
          </span>
          ${item.photo_image_url ? `<img class="notification-photo" src="${escapeHtml(item.photo_image_url)}" alt="" />` : ""}
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
  const item = notifications.find((entry) => entry.notification_id === id);
  if (item) item.is_read = true;
  renderNotifications();
  const photo = photos.find((entry) => entry.id === photoId);
  if (photo) {
    els.notificationDialog.close();
    openPhoto(photo);
  } else if (type === "thanks") {
    els.notificationDialog.close();
    switchPage("thanks");
  }
}

async function openNotificationsPanel() {
  await loadNotifications();
  const justSeenIds = notifications
    .filter((item) => !item.is_read)
    .map((item) => item.notification_id)
    .filter(Boolean);
  if (justSeenIds.length) {
    notifications.forEach((item) => {
      if (justSeenIds.includes(item.notification_id)) {
        item.is_read = true;
        item.just_seen = true;
      } else {
        item.just_seen = false;
      }
    });
    renderNotifications();
    void markUnreadNotificationsRead();
  }
  els.notificationDialog.showModal();
}

async function markUnreadNotificationsRead() {
  if (!cloudDb || !session) return;
  const { error } = await cloudDb
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false);
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
  const { data, error } = await cloudDb
    .from("photo_comments")
    .select("*")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });
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
        return `
          <div class="photo-comment-thread" style="--comment-depth:${Math.min(depth, 3)}">
            <article class="photo-comment">
              ${renderAvatarMarkup(comment.user_id)}
              <div>
                <header>
                  <strong>${escapeHtml(authorName)}</strong>
                  <time>${formatCommentTime(comment.created_at)}</time>
                </header>
                ${replyTarget ? `<small class="reply-target">回复 ${escapeHtml(getAuthorName(replyTarget.user_id))}</small>` : ""}
                <p>${escapeHtml(comment.body)}</p>
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
  const { error } = await cloudDb.from("photo_comments").insert({
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
  const { error } = await cloudDb
    .from("photo_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);
  if (error) {
    els.photoCommentStatus.textContent = `删除失败：${error.message}`;
    return;
  }
  await loadPhotoComments(activeDialogPhoto?.id);
  await loadPhotoCommentPreviews();
  if (activePage === "gallery") renderGallery();
}

function getInitial(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed[0].toUpperCase() : "U";
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
els.recipesNav?.addEventListener("click", () => switchPage("recipes"));
els.wishlistNav.addEventListener("click", () => switchPage("wishlist"));
els.weekendNav.addEventListener("click", () => switchPage("weekend"));
els.thanksNav.addEventListener("click", () => switchPage("thanks"));
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
els.secretOpen?.addEventListener("click", () => {
  switchPage("secret");
  els.secretPage?.scrollIntoView({ behavior: "smooth", block: "start" });
});
els.recipeOpen?.addEventListener("click", () => {
  switchPage("recipes");
  els.recipesPage?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  els.recoveryUsernameInput.value = els.usernameInput.value.trim();
  els.forgotPasswordStatus.textContent = "";
  els.forgotPasswordDialog.showModal();
  els.recoveryUsernameInput.focus();
});
els.uploadToggle.addEventListener("click", () => {
  setUploadExpanded(els.uploadForm.hidden);
});
els.recipeToggle.addEventListener("click", () => {
  setRecipeExpanded(els.recipeForm.hidden);
});
els.recipeCoverInput.addEventListener("change", updateRecipeCoverPreview);
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
els.weekendForm.addEventListener("submit", saveWeekendPlan);
els.weekendCancelEdit.addEventListener("click", () => {
  resetWeekendForm();
  setWeekendExpanded(false);
  setWeekendStatus("");
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
document.addEventListener("visibilitychange", () => {
  if (session && document.visibilityState === "visible") {
    void loadNotifications();
    void checkForNewPhotos();
    void processDiaryUploadQueue();
  }
});
window.addEventListener("focus", () => {
  if (session) {
    void loadNotifications();
    void checkForNewPhotos();
    void processDiaryUploadQueue();
  }
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
window.addEventListener("resize", () => {
  syncMobileComposerPlacement();
  updateSecretToolbarTop();
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
els.closeLevelDialog?.addEventListener("click", () => els.levelDialog.close());
els.closeAchievementDialog?.addEventListener("click", () => els.achievementDialog.close());
els.achievementDialog?.addEventListener("click", (event) => {
  if (event.target === els.achievementDialog) els.achievementDialog.close();
});
els.levelDialog?.addEventListener("click", (event) => {
  if (event.target === els.levelDialog) els.levelDialog.close();
});
els.levelCurrentTitle?.addEventListener("click", () => {
  levelGuideVisible = !levelGuideVisible;
  renderLevelDialog();
});
els.closeForgotPassword.addEventListener("click", () => els.forgotPasswordDialog.close());
els.forgotPasswordDialog.addEventListener("click", (event) => {
  if (event.target === els.forgotPasswordDialog) els.forgotPasswordDialog.close();
});
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
  }
});
initializePhotoDropHint();
els.uploadForm.addEventListener("submit", uploadPhoto);
els.uploadForm.addEventListener("input", saveDiaryDraft);
els.uploadForm.addEventListener("change", saveDiaryDraft);
els.photoDrop.addEventListener("paste", handlePasteUpload);
els.photoInput.addEventListener("change", () => {
  selectedUploadFiles = Array.from(els.photoInput.files || []);
  updatePhotoPreview();
});
document.addEventListener("paste", (event) => {
  if (!session || els.uploadForm.hidden) return;
  if (!Array.from(event.clipboardData?.items || []).some((item) => item.type.startsWith("image/"))) return;
  handlePasteUpload(event);
});
els.closeDialog.addEventListener("click", closePhotoDialog);
els.dialog.addEventListener("click", (event) => {
  if (event.target === els.dialog) {
    closePhotoDialog();
  }
});
els.dialog.addEventListener("close", () => {
  const wasSecretDialog = els.dialog.classList.contains("secret-image-dialog");
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
  resetSecretImageZoom();
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
  els.dialog.classList.remove("no-comments-dialog", "secret-image-dialog", "mobile-page-dialog", "secret-image-fullscreen");
  if (photoDialogBackdrop) photoDialogBackdrop.hidden = true;
  document.body.classList.remove("photo-dialog-open");
  unlockDialogBackgroundScroll(restoreScroll);
  dialogRestorePhotoId = restorePhotoId;
  dialogRestorePhotoTop = restorePhotoTop;
  if (!wasSecretDialog) restoreDialogReturnTarget(restoreScroll);
  dialogRestoreScrollY = 0;
  dialogRestorePhotoId = "";
  dialogRestorePhotoTop = 0;
});
els.photoCommentForm.addEventListener("submit", savePhotoComment);
els.cancelCommentReply.addEventListener("click", cancelCommentReply);
els.dialogRandomButton?.addEventListener("click", openRandomMemory);
els.dialogSecretLinkButton?.addEventListener("click", openSecretLinkedDiary);
els.dialogSecretReturnButton?.addEventListener("click", returnToSecretItem);
els.dialogPrev.addEventListener("click", () => moveDialogImage(-1));
els.dialogNext.addEventListener("click", () => moveDialogImage(1));
els.dialogMedia.addEventListener("click", (event) => {
  if (!activeSecretDialogItem || event.target.closest("button")) return;
  toggleDialogImageFullscreen();
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
els.clearDiarySearch?.addEventListener("click", () => {
  diarySearchQuery = "";
  visiblePhotoCount = PAGE_SIZE;
  updateDiarySearchUi();
  renderGallery();
  els.diarySearchInput?.focus();
});
window.addEventListener("resize", () => {
  window.clearTimeout(updateReadMoreHints.resizeTimer);
  updateReadMoreHints.resizeTimer = window.setTimeout(() => updateReadMoreHints(els.gallery), 120);
  scheduleGalleryMasonryLayout();
  updateSecretToolbarTop();
  updateDiaryBackTopButton();
});
window.addEventListener("scroll", () => {
  updateSecretToolbarTop();
  updateDiaryBackTopButton();
}, { passive: true });

registerAppShellWorker();
updateDiarySearchUi();
renderFoodWheel();
initializeFeedObserver();
applyMobileFeedLayout();
applyMobileSecretLayout();
syncMobileComposerPlacement();
initializeCloudflare();


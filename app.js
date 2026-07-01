const CONFIG_KEY = "life-vlog-supabase-config";
const THEME_KEY = "life-vlog-theme";
const HOME_NAME_KEY = "life-vlog-home-name";
const VIP_RECHARGE_KEY = "life-vlog-vip-recharge";
const RECIPES_KEY = "life-vlog-recipes";
const WISHLIST_KEY = "life-vlog-wishlist";
const WEEKEND_KEY = "life-vlog-weekend-plans";
const ANNIVERSARY_KEY = "life-vlog-anniversaries";
const FOOD_OPTIONS_KEY = "life-vlog-food-options";
const PHOTO_FAVORITES_KEY = "life-vlog-photo-favorites";
const TODAY_POSTS_SEEN_KEY = "life-vlog-today-posts-seen";
const PHOTO_FEED_CACHE_KEY = "life-vlog-photo-feed-cache";
const EXPERIENCE_KEY = "life-vlog-experience";
const THANKS_COLOR_KEY = "life-vlog-thanks-color";
const THANKS_COLORS = new Set(["#2f6b3b", "#d6544d", "#2e6da4", "#81559b", "#a66b12"]);
const DEFAULT_THANKS_COLOR = "#2f6b3b";
const DAILY_LOGIN_EXP = 25;
const BUCKET = "life-photos";
const PRODUCTION_URL = "https://xiudan320-ship-it.github.io/life-vlog-site/";
const PAGE_SIZE = 6;
const DEFAULT_SUPABASE_URL = "https://cimejrarjcosgayfnikk.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_G0ZHVQG0XYB2zja9VHiJiQ_HKDUt_fJ";
const VIP_USERS = new Set(["xiao980320"]);
const MEDIA_META_START = "<!--life-vlog-media:";
const MEDIA_META_END = "-->";
const WISH_MEDIA_META_START = "<!--life-vlog-wish-media:";
const WISH_MEDIA_META_END = "-->";
const PHOTO_COMMENT_PREVIEW_LIMIT = 3;
const PHOTO_FEED_CACHE_LIMIT = 3;
const EAGER_IMAGE_CARD_COUNT = 8;
const DEFAULT_FOOD_OPTIONS = ["拉面", "寿喜烧", "咖喱饭", "烤肉", "火锅", "寿司", "麻婆豆腐", "披萨"];
const GENERATED_TITLE_PREFIXES = ["今日小星星", "软乎乎的一天", "闪闪生活碎片", "快乐收藏夹"];

const VIP_LEVELS = [
  {
    level: 1,
    name: "Spark",
    label: "星火会员",
    price: 9,
    limit: 3,
    perks: ["专属 VIP 标识", "日夜模式记忆", "一篇笔记最多 3 张图"],
  },
  {
    level: 2,
    name: "Ribbon",
    label: "丝带会员",
    price: 29,
    limit: 6,
    perks: ["合集九宫格封面", "弹窗左右翻图", "一篇笔记最多 6 张图"],
  },
  {
    level: 3,
    name: "Prism",
    label: "棱镜会员",
    price: 68,
    limit: 9,
    perks: ["高质压缩上传", "9 图完整宫格", "合集计数角标"],
  },
  {
    level: 4,
    name: "Archive",
    label: "档案会员",
    price: 128,
    limit: 12,
    perks: ["私密内容共享", "编辑后保留合集", "一篇笔记最多 12 张图"],
  },
  {
    level: 5,
    name: "Director",
    label: "导演会员",
    price: 298,
    limit: 18,
    perks: ["黑金导演模式", "最高画质上传", "一篇笔记最多 18 张图"],
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

let createClient = null;
let supabase = null;
let session = null;
let photos = [];
let favoritePhotoIds = new Set();
let favoritesCloudAvailable = false;
let recipes = [];
let wishes = [];
let weekendPlans = [];
let anniversaries = [];
let gratitudeNotes = [];
let familyInfo = null;
let familyMembers = [];
let familyInvitations = [];
let familyMemberMap = new Map();
let gratitudeEditingId = null;
let activeDialogPhoto = null;
let photoComments = [];
let photoCommentPreviewMap = new Map();
let notifications = [];
let commentReplyToId = null;
let avatarPreviewUrl = "";
let notificationPollTimer = null;
let foodOptions = [];
let activePage = "gallery";
let activeFilter = "全部";
let previewUrls = [];
let visiblePhotoCount = PAGE_SIZE;
let filteredPhotoCount = 0;
let showingCachedFeed = false;
let feedObserver = null;
let feedLoading = false;
let editingPhoto = null;
let editingImages = [];
let editingImageFiles = new Map();
let editingRemovedPaths = new Set();
let editingReplaceIndex = -1;
let editingPreviewUrls = [];
let dialogImages = [];
let dialogImageIndex = 0;
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
  themePreference: "",
  homeName: "咻蛋之家",
  thanksColor: DEFAULT_THANKS_COLOR,
  avatarUrl: "",
  avatarPath: "",
  foodOptions: [],
};

const els = {
  themeToggle: document.querySelector("#themeToggle"),
  galleryNav: document.querySelector("#galleryNav"),
  recipesNav: document.querySelector("#recipesNav"),
  wishlistNav: document.querySelector("#wishlistNav"),
  weekendNav: document.querySelector("#weekendNav"),
  thanksNav: document.querySelector("#thanksNav"),
  setupToggle: document.querySelector("#setupToggle"),
  setupPanel: document.querySelector("#setupPanel"),
  notificationButton: document.querySelector("#notificationButton"),
  notificationBadge: document.querySelector("#notificationBadge"),
  notificationDialog: document.querySelector("#notificationDialog"),
  closeNotificationDialog: document.querySelector("#closeNotificationDialog"),
  notificationList: document.querySelector("#notificationList"),
  notificationStatus: document.querySelector("#notificationStatus"),
  supabaseUrl: document.querySelector("#supabaseUrl"),
  supabaseAnonKey: document.querySelector("#supabaseAnonKey"),
  saveConfig: document.querySelector("#saveConfig"),
  authCard: document.querySelector("#authCard"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  loginButton: document.querySelector("#loginButton"),
  signupButton: document.querySelector("#signupButton"),
  logoutButton: document.querySelector("#logoutButton"),
  authHint: document.querySelector("#authHint"),
  userMenu: document.querySelector("#userMenu"),
  avatarButton: document.querySelector("#avatarButton"),
  avatarInitial: document.querySelector("#avatarInitial"),
  avatarImage: document.querySelector("#avatarImage"),
  userPopover: document.querySelector("#userPopover"),
  profileName: document.querySelector("#profileName"),
  brandName: document.querySelector("#brandName"),
  heroHomeName: document.querySelector("#heroHomeName"),
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
  imageUrlInput: document.querySelector("#imageUrlInput"),
  useUrlButton: document.querySelector("#useUrlButton"),
  fileName: document.querySelector("#fileName"),
  titleInput: document.querySelector("#titleInput"),
  dateInput: document.querySelector("#dateInput"),
  categoryInput: document.querySelector("#categoryInput"),
  publicInput: document.querySelector("#publicInput"),
  noteInput: document.querySelector("#noteInput"),
  uploadStatus: document.querySelector("#uploadStatus"),
  galleryHead: document.querySelector("#galleryHead"),
  todayPostsNotice: document.querySelector("#todayPostsNotice"),
  galleryFilters: document.querySelector("#galleryFilters"),
  gallery: document.querySelector("#gallery"),
  feedLoader: document.querySelector("#feedLoader"),
  feedLoaderText: document.querySelector("#feedLoaderText"),
  chips: document.querySelectorAll(".chip"),
  dialog: document.querySelector("#photoDialog"),
  closeDialog: document.querySelector("#closeDialog"),
  dialogImage: document.querySelector("#dialogImage"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogMeta: document.querySelector("#dialogMeta"),
  dialogNote: document.querySelector("#dialogNote"),
  dialogPrev: document.querySelector("#dialogPrev"),
  dialogNext: document.querySelector("#dialogNext"),
  dialogCounter: document.querySelector("#dialogCounter"),
  dialogThumbs: document.querySelector("#dialogThumbs"),
  editDialog: document.querySelector("#editDialog"),
  closeEditDialog: document.querySelector("#closeEditDialog"),
  editForm: document.querySelector("#editForm"),
  editTitleInput: document.querySelector("#editTitleInput"),
  editDateInput: document.querySelector("#editDateInput"),
  editCategoryInput: document.querySelector("#editCategoryInput"),
  editPublicInput: document.querySelector("#editPublicInput"),
  editNoteInput: document.querySelector("#editNoteInput"),
  editImageInput: document.querySelector("#editImageInput"),
  editImageList: document.querySelector("#editImageList"),
  editImageCount: document.querySelector("#editImageCount"),
  deleteEditingPhoto: document.querySelector("#deleteEditingPhoto"),
  saveEditStatus: document.querySelector("#saveEditStatus"),
  vipDialog: document.querySelector("#vipDialog"),
  closeVipDialog: document.querySelector("#closeVipDialog"),
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
  overviewLevel: document.querySelector("#overviewLevel"),
  overviewProgress: document.querySelector("#overviewProgress"),
  memoryButton: document.querySelector("#memoryButton"),
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

function loadConfig() {
  if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
    };
  }

  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function getStoredSupabaseUserId(config = loadConfig()) {
  if (!config?.url) return "";
  try {
    const ref = new URL(config.url).hostname.split(".")[0];
    const keys = [`sb-${ref}-auth-token`, "supabase.auth.token"];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const userId =
        parsed?.user?.id ||
        parsed?.currentSession?.user?.id ||
        parsed?.session?.user?.id;
      if (userId) return userId;
    }
  } catch {
    return "";
  }
  return "";
}

function saveConfig() {
  const url = els.supabaseUrl.value.trim();
  const anonKey = els.supabaseAnonKey.value.trim();
  if (!url || !anonKey) {
    setHint("请先填 Supabase URL 和 anon key。");
    return;
  }

  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, anonKey }));
  els.setupPanel.hidden = true;
  initializeSupabase();
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
  return homeName;
}

async function initializeSupabase() {
  const config = loadConfig();
  els.setupToggle.hidden = Boolean(DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY);
  if (!config) {
    els.setupPanel.hidden = false;
    setHint("当前是演示模式。填入 Supabase 配置后可登录上传。");
    photos = demoPhotos;
    renderGallery();
    return;
  }

  els.supabaseUrl.value = config.url;
  els.supabaseAnonKey.value = config.anonKey;
  renderCachedPhotoFeed(getStoredSupabaseUserId(config) || "public");
  if (!createClient) {
    const supabaseModule = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );
    createClient = supabaseModule.createClient;
  }
  supabase = createClient(config.url, config.anonKey);

  const { data } = await supabase.auth.getSession();
  session = data.session;
  updateAuthUI();
  renderCachedPhotoFeed(session?.user?.id || "public");
  await loadPhotos();

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    updateAuthUI();
    renderCachedPhotoFeed(session?.user?.id || "public");
    loadPhotos();
  });
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  notificationPollTimer = setInterval(() => {
    if (session && document.visibilityState === "visible") void loadNotifications();
  }, 45000);
}

function updateAuthUI() {
  const signedIn = Boolean(session);
  const displayName = signedIn ? getSessionDisplayName() : "";
  const localHomeName = signedIn ? loadHomeName(session.user.id) : "咻蛋之家";
  applyHomeName(localHomeName, { persist: false, userId: signedIn ? session.user.id : null });
  applyTheme(loadTheme(signedIn ? session.user.id : null), {
    persist: false,
    userId: signedIn ? session.user.id : null,
  });
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
  els.authCard.hidden = signedIn;
  els.userMenu.hidden = !signedIn;
  els.notificationButton.hidden = !signedIn;
  els.loginButton.hidden = signedIn;
  els.signupButton.hidden = signedIn;
  els.usernameInput.hidden = signedIn;
  els.passwordInput.hidden = signedIn;
  els.userPopover.hidden = true;
  els.profileName.textContent = displayName;
  els.avatarInitial.textContent = getInitial(displayName);
  renderAccountAvatar(accountProfile.avatarUrl, displayName);
  if (signedIn) {
    setSelectedThanksColor(accountProfile.thanksColor || loadThanksColor(session.user.id));
    renderExperience(displayName);
  }
  els.vipBadge.hidden = !signedIn;
  els.vipPopoverBadge.hidden = !signedIn;
  els.vipBadge.textContent = vip ? `VIP LV.${activeVipLevel}` : "开通 VIP";
  els.vipPopoverBadge.textContent = vip
    ? `${localHomeName} ${getVipLevel(activeVipLevel).label}`
    : `开通 ${localHomeName} VIP`;
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
      : "输入用户名和密码登录。第一次使用请先注册。"
  );
  setGlobalStatus("");

  if (!signedIn) {
    cloudSyncAvailable = false;
    weekendCloudAvailable = false;
    anniversaryCloudAvailable = false;
    favoritesCloudAvailable = false;
    photoFlagsCloudAvailable = false;
    foodOptionsCloudAvailable = false;
      profilePreferencesCloudAvailable = false;
      thanksColorCloudAvailable = false;
    gratitudeNotes = [];
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
      themePreference: "",
      homeName: "咻蛋之家",
      thanksColor: DEFAULT_THANKS_COLOR,
      avatarUrl: "",
      avatarPath: "",
      foodOptions: [],
    };
    renderNotifications();
    applyHomeName("咻蛋之家");
    return;
  }

  if (session.user.id !== syncedUserId) {
    syncedUserId = session.user.id;
    void synchronizeAccountData();
  }
}

async function loginWithPassword() {
  if (!supabase) {
    setHint("先点右上角设置，填入 Supabase 配置。");
    els.setupPanel.hidden = false;
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setHint(error ? error.message : "登录成功。");
  } catch (error) {
    setHint(`登录失败：${error.message || "网络或配置错误"}`);
  }
}

async function signupWithPassword() {
  if (!supabase) {
    setHint("先点右上角设置，填入 Supabase 配置。");
    els.setupPanel.hidden = false;
    return;
  }

  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value;
  const email = usernameToEmail(username);
  if (!email || !password) {
    setHint("请输入用户名和密码。用户名只能用中文、英文、数字、下划线或短横线。");
    return;
  }

  if (password.length < 6) {
    setHint("密码至少需要 6 位。");
    return;
  }

  setHint("正在注册...");

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl(),
        data: { username },
      },
    });

    setHint(error ? error.message : "注册完成，可以直接登录。");
  } catch (error) {
    setHint(`注册失败：${error.message || "网络或配置错误"}`);
  }
}

async function logout() {
  if (!supabase) return;
  await supabase.auth.signOut();
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
  if (!supabase || !session) return;
  const password = els.newPasswordInput.value;
  if (!passwordsMatch(password, els.confirmPasswordInput.value, els.changePasswordStatus)) {
    return;
  }
  els.changePasswordStatus.textContent = "正在修改密码…";
  const { error } = await supabase.auth.updateUser({ password });
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
  if (!supabase || !session) return;
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
  const { error } = await supabase.rpc("set_password_recovery_key", {
    p_recovery_key: recoveryKey,
  });
  if (error) {
    els.recoveryKeyStatus.textContent = isMissingCloudSchema(error)
      ? "恢复功能尚未初始化，请先运行最新版 supabase-cloud-sync.sql。"
      : `保存失败：${error.message}`;
    return;
  }
  els.recoveryKeyForm.reset();
  els.recoveryKeyStatus.textContent = "恢复密钥已加密保存，请妥善保管。";
  window.setTimeout(() => els.recoveryKeyDialog.close(), 900);
}

async function resetForgottenPassword(event) {
  event.preventDefault();
  if (!supabase) return;
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
  const { data, error } = await supabase.rpc("reset_password_with_recovery_key", {
    p_username: username,
    p_recovery_key: recoveryKey,
    p_new_password: password,
  });
  if (error) {
    els.forgotPasswordStatus.textContent = isMissingCloudSchema(error)
      ? "恢复功能尚未初始化，请先运行最新版 supabase-cloud-sync.sql。"
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
  if (!supabase) {
    photos = demoPhotos;
    renderGallery();
    return;
  }

  let query = supabase.from("photos").select("*");
  query = session ? query : query.eq("is_public", true);

  const { data, error } = await query
    .order("taken_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    setGlobalStatus(`读取照片失败：${error.message}`);
    if (!photos.length) photos = [];
    photoFlagsCloudAvailable = false;
  } else {
    setGlobalStatus("");
    photos = data || [];
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

  visiblePhotoCount = PAGE_SIZE;
  renderGallery();
  if (cloudSyncAvailable) updateCloudSyncStatus();
}

async function loadPhotoCommentPreviews() {
  photoCommentPreviewMap = new Map();
  if (!supabase || !session) return;
  const { data, error } = await supabase
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
  const cachedPhotos = getSortedPhotos(photos).slice(0, PHOTO_FEED_CACHE_LIMIT);
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
    visiblePhotoCount = Math.max(PAGE_SIZE, PHOTO_FEED_CACHE_LIMIT);
    renderGallery();
    setGlobalStatus("先显示上次缓存，正在同步最新内容…");
    return true;
  } catch {
    return false;
  }
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
      <strong>今天有 ${unseen.length} 篇新照片</strong>
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
  if (!supabase || !session) {
    photoFlagsCloudAvailable = false;
    return;
  }
  const { error } = await supabase
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
  if (!supabase || !session) return;
  const userId = session.user.id;
  const visiblePhotoIds = new Set(photos.map((photo) => photo.id));
  const localIds = [...loadLocalFavoritePhotoIds()].filter((id) =>
    visiblePhotoIds.has(id)
  );
  try {
    const { data, error } = await supabase
      .from("photo_favorites")
      .select("photo_id")
      .eq("user_id", userId);
    if (error) throw error;

    const cloudIdSet = new Set((data || []).map((row) => row.photo_id));
    const missingLocalIds = localIds.filter((id) => !cloudIdSet.has(id));
    if (missingLocalIds.length) {
      const { error: migrateError } = await supabase
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
  if (!supabase || !session) {
    setStatus("请先登录。");
    return;
  }

  const files = Array.from(els.photoInput.files || []);
  const remoteUrl = normalizeImageUrl(els.imageUrlInput.value);
  if (!files.length && !remoteUrl) {
    setStatus("请选择图片或粘贴图片链接。");
    return;
  }

  const imageLimit = getCurrentImageLimit();
  if (files.length > imageLimit) {
    setStatus(`当前 VIP 等级单篇最多 ${imageLimit} 张图。`);
    return;
  }

  const images = [];
  const finalTitle = getFinalTitle();

  for (const [index, file] of files.entries()) {
    const safeName = getUploadFileNameBase(finalTitle, index, files.length);
    const imageData = await uploadImageFile(file, safeName, index + 1, files.length);
    if (!imageData) return;
    images.push(imageData);
  }

  if (!files.length && remoteUrl) {
    images.push({
      image_path: "",
      image_url: remoteUrl,
      width: null,
      height: null,
    });
  }

  const insertError = await insertPhotoRecord(finalTitle, images);
  if (insertError) {
    setStatus(insertError.message);
    return;
  }

  els.uploadForm.reset();
  els.dateInput.valueAsDate = new Date();
  clearPhotoPreview();
  setUploadExpanded(false);
  const localImages = images.filter((image) => Number.isFinite(image.original_size));
  const originalBytes = localImages.reduce((sum, image) => sum + image.original_size, 0);
  const uploadedBytes = localImages.reduce((sum, image) => sum + image.compressed_size, 0);
  const savings =
    originalBytes > 0 ? Math.max(0, Math.round((1 - uploadedBytes / originalBytes) * 100)) : 0;
  const compressionSummary = originalBytes
    ? ` 自动压缩 ${formatFileSize(originalBytes)} → ${formatFileSize(uploadedBytes)}，节省 ${savings}%。`
    : "";
  setStatus(
    `${images.length > 1 ? `已发布 1 篇合集，共 ${images.length} 张图。` : "上传完成。"}${compressionSummary}`
  );
  await loadPhotos();
  switchPage("gallery");
  els.galleryHead?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function insertPhotoRecord(finalTitle, images) {
  const primaryImage = images[0];
  const record = {
    user_id: session.user.id,
    title: finalTitle,
    note: composeStoredNote(els.noteInput.value.trim(), images),
    category: els.categoryInput.value,
    taken_at: els.dateInput.value,
    is_public: els.publicInput.value === "true",
    image_path: primaryImage.image_path,
    image_url: primaryImage.image_url,
    width: primaryImage.width,
    height: primaryImage.height,
  };

  const { error } = await supabase.from("photos").insert(record);
  return error;
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
        const scale = Math.min(1, settings.maxSide / Math.max(image.width, image.height));
        let width = Math.max(1, Math.round(image.width * scale));
        let height = Math.max(1, Math.round(image.height * scale));
        let quality = settings.jpeg;
        let blob;

        for (let resizePass = 0; resizePass < 3; resizePass += 1) {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);

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

async function uploadImageFile(file, safeName, index = 1, total = 1) {
  const prefix = total > 1 ? `${index}/${total} · ` : "";
  setStatus(`${prefix}正在自动压缩图片...`);
  let compressed;
  try {
    compressed = await compressImage(file);
  } catch (error) {
    setStatus(error.message || "图片压缩失败。");
    return null;
  }
  const path = `${session.user.id}/${Date.now()}-${safeName}.jpg`;

  setStatus(
    `${prefix}已压缩 ${formatFileSize(file.size)} → ${formatFileSize(compressed.blob.size)}，正在上传...`
  );
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed.blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    setStatus(uploadError.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    image_path: path,
    image_url: publicUrlData.publicUrl,
    width: compressed.width,
    height: compressed.height,
    original_size: compressed.originalBytes,
    compressed_size: compressed.compressedBytes,
  };
}

function renderGallery() {
  renderOverview();
  updateTodayPostsNotice();
  const sortedPhotos = getSortedPhotos(photos);
  const filtered =
    activeFilter === "全部"
      ? sortedPhotos
      : activeFilter === "featured7"
        ? sortedPhotos.filter(
            (photo) => Boolean(photo.is_featured) && isPhotoWithinSevenDays(photo)
          )
        : activeFilter === "favorites"
          ? sortedPhotos.filter((photo) => favoritePhotoIds.has(photo.id))
          : sortedPhotos.filter((photo) => photo.category === activeFilter);

  filteredPhotoCount = filtered.length;
  visiblePhotoCount = Math.min(
    Math.max(PAGE_SIZE, visiblePhotoCount),
    Math.max(PAGE_SIZE, filteredPhotoCount)
  );
  const visible = filtered.slice(0, visiblePhotoCount);

  if (!visible.length) {
    const emptyMessage =
      activeFilter === "featured7"
        ? "最近七天还没有精选照片。"
        : activeFilter === "favorites"
          ? session
            ? "还没有收藏照片。"
            : "登录后可以收藏喜欢的照片。"
          : "还没有这个分类的照片。";
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
          const noteMarkup = noteText ? `<p>${escapeHtml(noteText)}</p>` : "";
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
              <p class="kicker">${escapeHtml(photo.category || "日常")} · ${formatDate(photo.taken_at)} · 发布：${formatDateTime(photo.created_at)} · ${escapeHtml(getAuthorName(photo.user_id))}</p>
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
                  <button class="edit-photo" type="button" data-edit-index="${index}" title="编辑照片">编辑</button>
                  <button class="delete-photo" type="button" data-delete-index="${index}" title="删除照片">删除</button>`
                : ""
            }
          </div>
          ${renderPhotoCommentPreview(photo.id, index)}
        </article>
      `;
      }
    )
    .join("");

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
  warmUpcomingFeedImages(filtered, visible.length);
  updateFeedLoader(filtered.length);
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
  if (!supabase || !session || !photo || photo.user_id !== session.user.id) return;
  const label = field === "is_pinned" ? "置顶" : "精选";
  if (!photoFlagsCloudAvailable) {
    setGlobalStatus(`数据库尚未启用${label}字段，请先运行最新版 supabase-cloud-sync.sql。`);
    return;
  }
  const nextValue = !Boolean(photo[field]);
  setGlobalStatus(`正在更新${label}状态...`);

  const { data, error } = await supabase
    .from("photos")
    .update({ [field]: nextValue })
    .eq("id", photo.id)
    .eq("user_id", session.user.id)
    .select("id,is_featured,is_pinned")
    .single();

  if (error) {
    setGlobalStatus(
      isMissingCloudSchema(error)
        ? `请先运行最新的 supabase-cloud-sync.sql，再使用${label}功能。`
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
    setGlobalStatus("登录后可以收藏照片。");
    return;
  }

  if (!favoritesCloudAvailable) {
    setGlobalStatus("收藏数据库尚未启用，请先运行最新版 supabase-cloud-sync.sql。");
    return;
  }

  const wasFavorite = favoritePhotoIds.has(photo.id);
  button.disabled = true;
  const request = wasFavorite
    ? supabase
        .from("photo_favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("photo_id", photo.id)
    : supabase
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
  const altText = title || "照片";
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

  return `<img class="feed-image" src="${escapeHtml(image?.image_url || "")}" alt="${escapeHtml(altText)}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"${widthAttr}${heightAttr} />`;
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
  }));

  if (normalizedImages.length <= 1) return cleanNote;

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

function renderDialogMedia() {
  const image = dialogImages[dialogImageIndex] || dialogImages[0] || {};
  els.dialogImage.src = image.image_url || "";
  els.dialogImage.alt = `${els.dialogTitle.textContent} ${dialogImageIndex + 1}`;
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
}

function moveDialogImage(step) {
  if (dialogImages.length <= 1) return;
  dialogImageIndex = (dialogImageIndex + step + dialogImages.length) % dialogImages.length;
  renderDialogMedia();
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

async function deletePhoto(photo, triggerButton = null) {
  if (!supabase || !session || !photo) {
    setGlobalStatus("请先登录后再删除照片。");
    return false;
  }

  if (photo.user_id && photo.user_id !== session.user.id) {
    setGlobalStatus("只能删除自己上传的照片。");
    return false;
  }

  const ok = window.confirm(`删除“${getPhotoLabel(photo)}”？删除后无法恢复。`);
  if (!ok) return false;

  setGlobalStatus("正在删除照片...");
  const originalButtonText = triggerButton?.textContent || "删除";
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "删除中";
  }

  const storagePaths = [
    ...new Set(getPhotoImages(photo).map((image) => image.image_path).filter(Boolean)),
  ];

  try {
    const { data: deletedRows, error: deleteError } = await supabase
      .from("photos")
      .delete()
      .eq("id", photo.id)
      .eq("user_id", session.user.id)
      .select("id");

    if (deleteError) {
      throw new Error(`数据库删除失败：${deleteError.message}`);
    }
    if (!deletedRows?.length) {
      throw new Error("数据库没有删除任何记录，请重新运行最新的 Supabase SQL 权限脚本。");
    }

    photos = photos.filter((item) => item.id !== photo.id);
    favoritePhotoIds.delete(photo.id);
    saveLocalFavoritePhotoIds();
    renderGallery();
    setGlobalStatus("照片已删除。");

    if (storagePaths.length) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove(storagePaths);
      if (storageError) {
        console.warn("Photo record deleted, but storage cleanup failed:", storageError);
        setGlobalStatus("照片已删除，云端原图清理稍后再试，不影响相册。");
      }
    }

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

function openPhoto(photo, initialImageIndex = 0) {
  activeDialogPhoto = photo;
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
  els.dialogTitle.textContent = displayTitle || "照片";
  els.dialogMeta.textContent = `${photo.category || "日常"} · 拍摄 ${formatDate(photo.taken_at)} · 发布 ${formatDateTime(photo.created_at)} · ${getAuthorName(photo.user_id)}`;
  els.dialogNote.textContent = getPlainNote(photo);
  renderDialogMedia();
  void loadPhotoComments(photo.id);
  els.dialog.showModal();
}

function openWishImage(wish) {
  if (!wish?.imageUrl) return;
  activeDialogPhoto = null;
  photoComments = [];
  dialogImages = [{ image_url: wish.imageUrl }];
  dialogImageIndex = 0;
  els.dialogTitle.textContent = wish.title || "心愿图片";
  els.dialogMeta.textContent = `${wish.type || "心愿"} · ${wish.priority || "普通"} · ${getAuthorName(wish.userId)} 发布`;
  els.dialogNote.textContent = wish.note || "";
  els.photoCommentsSection.hidden = true;
  renderDialogMedia();
  els.dialog.showModal();
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
  if (!supabase || !session || !editingPhoto) {
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
  const { error } = await supabase.from("photos").update(updates).eq("id", editingPhoto.id);

  if (error) {
    els.saveEditStatus.textContent = error.message;
    return;
  }

  els.editDialog.close();
  editingPhoto = null;
  await loadPhotos();
  setGlobalStatus("照片信息已更新。");
}

async function savePhotoEdit(event) {
  event.preventDefault();
  if (!supabase || !session || !editingPhoto || !editingImages.length) {
    els.saveEditStatus.textContent = "请先登录，并至少保留一张照片。";
    return;
  }

  const takenAt = els.editDateInput.value || toDateInputValue(new Date());
  const title = els.editTitleInput.value.trim();
  const nextImages = [];
  const newlyUploadedPaths = [];
  els.saveEditStatus.textContent = "正在处理照片...";

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
    const { error } = await supabase
      .from("photos")
      .update(updates)
      .eq("id", editingPhoto.id)
      .eq("user_id", session.user.id);
    if (error) throw error;

    const pathsToRemove = [...editingRemovedPaths].filter(
      (path) => path && !nextImages.some((image) => image.image_path === path)
    );
    if (pathsToRemove.length) {
      const { error: cleanupError } = await supabase.storage
        .from(BUCKET)
        .remove(pathsToRemove);
      if (cleanupError) {
        console.warn("Album saved, but old image cleanup failed:", cleanupError);
      }
    }

    els.editDialog.close();
    editingPhoto = null;
    resetEditImageState();
    await loadPhotos();
    setGlobalStatus("照片和合集内容已更新。");
  } catch (error) {
    els.saveEditStatus.textContent = error.message || "保存失败，请稍后重试。";
    if (newlyUploadedPaths.length) {
      void supabase.storage.from(BUCKET).remove(newlyUploadedPaths);
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
  const file = els.editImageInput.files?.[0];
  if (!file || editingReplaceIndex < 0 || !editingImages[editingReplaceIndex]) return;
  if (editingPreviewUrls[editingReplaceIndex]) {
    URL.revokeObjectURL(editingPreviewUrls[editingReplaceIndex]);
    editingPreviewUrls[editingReplaceIndex] = "";
  }
  editingImageFiles.set(editingReplaceIndex, file);
  els.saveEditStatus.textContent = `第 ${editingReplaceIndex + 1} 张将在保存时替换。`;
  editingReplaceIndex = -1;
  renderEditImages();
}

function removeEditingImage(index) {
  if (editingImages.length <= 1) {
    els.saveEditStatus.textContent = "一篇笔记至少保留一张图片。";
    return;
  }
  const image = editingImages[index];
  if (!image || !window.confirm(`删除合集中的第 ${index + 1} 张图片？`)) return;
  if (image.image_path) editingRemovedPaths.add(image.image_path);
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
  return getDisplayTitle(photo) || "无标题照片";
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
  };
  els.profileName.textContent = nextName;
  renderAccountAvatar(accountProfile.avatarUrl, nextName);
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
  if (!supabase || !session) return;

  const [membersResult, invitationsResult] = await Promise.all([
    supabase.rpc("get_my_family_members"),
    supabase.rpc("get_my_family_invitations"),
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
      name: familyMembers[0].family_name,
      isOwner: familyMembers.some(
        (member) => member.user_id === session.user.id && member.role === "owner"
      ),
    };
  }
  renderFamilyDialog();
}

async function loadGratitudeNotes() {
  if (!supabase || !session) {
    gratitudeNotes = [];
    renderGratitudeNotes();
    return;
  }

  const { data, error } = await supabase
    .from("gratitude_notes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    gratitudeNotes = [];
    els.thanksStatus.textContent = isMissingCloudSchema(error)
      ? "请先运行最新版 supabase-cloud-sync.sql，启用感谢留言板。"
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
  if (!supabase || !session || !userId) return;
  try {
    const { data, error } = await supabase
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
      const { error: migrateError } = await supabase
        .from("weekend_plans")
        .upsert(missingLocalPlans.map((plan) => weekendToCloudRow(plan, userId)), { onConflict: "id" });
      if (migrateError) throw migrateError;
      const refreshed = await supabase
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
  if (!supabase || !session) return;
  if (cloudSyncInFlight) return cloudSyncInFlight;

  const userId = session.user.id;
  const displayName = getSessionDisplayName();
  cloudSyncInFlight = (async () => {
    try {
      setGlobalStatus("正在同步账户数据…");
      await loadFamilyContext();
      const [profileResult, recipesResult, wishesResult] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("recipes").select("*").order("created_at", { ascending: false }),
        supabase.from("wishes").select("*").order("created_at", { ascending: false }),
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
        const { data, error } = await supabase
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
          const { error } = await supabase.from("recipes").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }
        if (personalLocalWishes.length) {
          const rows = personalLocalWishes.map((wish) => wishToCloudRow(wish, userId));
          let { error } = await supabase.from("wishes").upsert(rows, { onConflict: "id" });
          if (error && isMissingCloudSchema(error)) {
            wishCompletionNoteCloudAvailable = false;
            const legacyRows = personalLocalWishes.map((wish) =>
              wishToLegacyCloudRow(wish, userId)
            );
            const retry = await supabase.from("wishes").upsert(legacyRows, {
              onConflict: "id",
            });
            error = retry.error;
          }
          if (error) throw error;
        }

        const [migratedRecipes, migratedWishes] = await Promise.all([
          supabase.from("recipes").select("*").order("created_at", { ascending: false }),
          supabase.from("wishes").select("*").order("created_at", { ascending: false }),
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
      const cloudFoodOptions = normalizeFoodOptions(profile.food_options);
      const preferredFoodOptions = cloudFoodOptions.length
        ? cloudFoodOptions
        : localFoodOptions;
      const cloudTheme = normalizeTheme(profile.theme_preference);
      const preferredTheme = cloudTheme || loadTheme(userId);
      const cloudHomeName = normalizeHomeName(profile.home_name);
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

      if (
        profile.last_login_date !== today &&
        (!needsLocalMigration || localExperience.lastLoginDate !== today)
      ) {
        experienceTotal += DAILY_LOGIN_EXP;
      }
      lastLoginDate = today;
      const vipLevel = getVipLevelByRecharge(rechargeTotal)?.level || 0;

      const profileUpdates = {
        username: displayName,
        recharge_total: rechargeTotal,
        vip_level: vipLevel,
        experience_total: experienceTotal,
        last_login_date: lastLoginDate,
        local_data_migrated: true,
        updated_at: new Date().toISOString(),
      };
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

      const { data: savedProfile, error: profileError } = await supabase
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
        themePreference: preferredTheme,
        homeName: preferredHomeName,
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
      renderAccountAvatar(accountProfile.avatarUrl, displayName);
      saveThanksColorPreference(accountProfile.thanksColor, { userId, syncCloud: false });
      setSelectedThanksColor(accountProfile.thanksColor);
      recipes = cloudRecipes.map(recipeFromCloudRow);
      wishes = cloudWishes.map(wishFromCloudRow);
      foodOptions = accountProfile.foodOptions.length
        ? accountProfile.foodOptions
        : [...DEFAULT_FOOD_OPTIONS];

      saveRechargeTotal(accountProfile.rechargeTotal, displayName);
      saveExperience(
        {
          total: accountProfile.experienceTotal,
          lastLoginDate: accountProfile.lastLoginDate,
          gainedToday: accountProfile.lastLoginDate === today,
        },
        displayName
      );
      saveRecipes();
      saveWishes();
      saveFoodOptionsCache(userId);

      activeVipLevel = accountProfile.vipLevel;
      document.body.classList.toggle("vip-member", activeVipLevel > 0);
      document.body.dataset.vipLevel = String(activeVipLevel);
      els.vipBadge.textContent = activeVipLevel > 0 ? `VIP LV.${activeVipLevel}` : "开通 VIP";
      els.vipPopoverBadge.textContent =
        activeVipLevel > 0
          ? `${preferredHomeName} ${getVipLevel(activeVipLevel).label}`
          : `开通 ${preferredHomeName} VIP`;
      renderExperience(displayName);
      renderVipCenter();
      renderRecipes();
      renderWishes();
      renderFoodWheel();
      await synchronizeWeekendPlans(userId);
      await synchronizeAnniversaries(userId);
      await loadGratitudeNotes();
      await loadPhotos();
      await loadNotifications();
      updateCloudSyncStatus();
    } catch (error) {
      cloudSyncAvailable = false;
      awardDailyExperience(displayName);
      renderExperience(displayName);
      if (isMissingCloudSchema(error)) {
        setGlobalStatus("云同步数据库尚未初始化，请先运行 supabase-cloud-sync.sql");
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
  const missing = [];
  if (!photoFlagsCloudAvailable) missing.push("置顶/精选");
  if (!favoritesCloudAvailable) missing.push("收藏");
  if (!weekendCloudAvailable) missing.push("周末计划");
  if (!anniversaryCloudAvailable) missing.push("纪念日");
  if (!foodOptionsCloudAvailable) missing.push("转盘候选");
  if (!profilePreferencesCloudAvailable) missing.push("主题/主页名称");
  if (!thanksColorCloudAvailable) missing.push("留言颜色");
  if (!wishCompletionNoteCloudAvailable) missing.push("心愿完成感想");
  setGlobalStatus(
    missing.length
      ? `数据库仍缺少：${missing.join("、")}。请运行最新版 supabase-cloud-sync.sql。`
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
    ? `${displayName} 累计充值 ${formatMoney(rechargeTotal)}，${currentLevel ? `当前为 ${currentLevel.label}` : "还未开通 VIP"}。`
    : "登录后可充值激活 5 个 VIP 档位。";
  els.vipNext.innerHTML = nextLevel
    ? `<strong>下一档 ${nextLevel.label}</strong><span>还差 ${formatMoney(nextLevel.price - rechargeTotal)}</span>`
    : `<strong>已解锁最高档</strong><span>Director 档位已满级</span>`;

  els.vipLevels.innerHTML = VIP_LEVELS.map((level) => {
    const unlocked = rechargeTotal >= level.price;
    const active = currentLevel?.level === level.level;
    const diff = Math.max(0, level.price - rechargeTotal);
    return `
      <article class="vip-level ${active ? "active" : ""} ${unlocked ? "unlocked" : ""}">
        <span>LV.${level.level}</span>
        <strong>${escapeHtml(level.name)}</strong>
        <p>${escapeHtml(level.label)} · 累计 ${formatMoney(level.price)}</p>
        <small>最多 ${level.limit} 张/篇</small>
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
      "数据库尚未升级，本次充值没有保存。请先运行最新版 supabase-cloud-sync.sql。";
    return;
  }

  const nextTotal = loadRechargeTotal() + numericAmount;
  const nextLevel = getVipLevelByRecharge(nextTotal)?.level || 0;

  const { error } = await supabase
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
      gainedToday: accountProfile.lastLoginDate === getLocalDateKey(),
    };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(getExperienceStorageKey(displayName)) || "{}");
    return {
      total: Number(parsed.total) || 0,
      lastLoginDate: parsed.lastLoginDate || "",
      gainedToday: Boolean(parsed.gainedToday),
    };
  } catch {
    return { total: 0, lastLoginDate: "", gainedToday: false };
  }
}

function saveExperience(data, displayName = getSessionDisplayName()) {
  localStorage.setItem(getExperienceStorageKey(displayName), JSON.stringify(data));
  if (session) {
    accountProfile.experienceTotal = Number(data.total) || 0;
    accountProfile.lastLoginDate = data.lastLoginDate || "";
  }
}

function awardDailyExperience(displayName = getSessionDisplayName()) {
  const today = getLocalDateKey();
  const data = loadExperience(displayName);
  if (data.lastLoginDate === today) return data;

  const next = {
    total: data.total + DAILY_LOGIN_EXP,
    lastLoginDate: today,
    gainedToday: true,
  };
  saveExperience(next, displayName);
  return next;
}

function getExperienceLevel(totalExp) {
  let level = 1;
  let remaining = Math.max(0, Number(totalExp) || 0);
  let needed = getLevelNeed(level);

  while (remaining >= needed && level < 99) {
    remaining -= needed;
    level += 1;
    needed = getLevelNeed(level);
  }

  return {
    level,
    current: remaining,
    needed,
    percent: Math.min(100, Math.round((remaining / needed) * 100)),
  };
}

function getLevelNeed(level) {
  return 80 + level * 20;
}

function renderExperience(displayName = getSessionDisplayName()) {
  const data = loadExperience(displayName);
  const progress = getExperienceLevel(data.total);
  els.xpLevel.textContent = `Lv.${progress.level}`;
  els.xpText.textContent = `${progress.current} / ${progress.needed} EXP`;
  els.xpBar.style.width = `${progress.percent}%`;
  els.xpHint.textContent =
    data.lastLoginDate === getLocalDateKey()
      ? `今日登录 +${DAILY_LOGIN_EXP} EXP 已领取`
      : `明日登录 +${DAILY_LOGIN_EXP} EXP`;
}

function getLocalDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
  if (!nextTheme || !supabase || !session || !cloudSyncAvailable) return;
  const userId = session.user.id;
  const { error } = await supabase
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
  if (!supabase || !session) return false;
  const { error } = await supabase
    .from("user_profiles")
    .update({
      home_name: homeName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);
  if (error) {
    if (isMissingCloudSchema(error) || String(error.message || "").includes("home_name")) {
      els.homeNameStatus.textContent =
        "名称已保存在此浏览器。运行最新数据库脚本后即可跨设备同步。";
      return false;
    }
    els.homeNameStatus.textContent = `云端保存失败：${error.message}`;
    return false;
  }
  accountProfile.homeName = homeName;
  return true;
}

async function saveProfileNickname(event) {
  event.preventDefault();
  if (!supabase || !session) return;
  const nickname = normalizeNickname(els.profileNicknameInput.value);
  if (!nickname) {
    els.profileNicknameStatus.textContent = "昵称不能为空。";
    return;
  }

  els.profileNicknameStatus.textContent = "正在保存昵称...";
  const { error: authError } = await supabase.auth.updateUser({
    data: { username: nickname },
  });
  if (authError) {
    els.profileNicknameStatus.textContent = `保存失败：${authError.message}`;
    return;
  }

  const { error: profileError } = await supabase
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
  if (!supabase || !session) return;
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

  const path = `${session.user.id}/avatars/avatar-${Date.now()}.jpg`;
  els.avatarStatus.textContent = "正在上传头像...";
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed.blob, { contentType: "image/jpeg", upsert: false });
  if (uploadError) {
    els.avatarStatus.textContent = `上传失败：${uploadError.message}`;
    return;
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = publicData.publicUrl;
  const previousPath = accountProfile.avatarPath;
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      avatar_url: avatarUrl,
      avatar_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id);

  if (profileError) {
    await supabase.storage.from(BUCKET).remove([path]);
    els.avatarStatus.textContent = isMissingCloudSchema(profileError)
      ? "请先运行本次头像数据库补丁。"
      : `资料保存失败：${profileError.message}`;
    return;
  }

  accountProfile.avatarUrl = avatarUrl;
  accountProfile.avatarPath = path;
  renderAccountAvatar(avatarUrl);
  await loadFamilyContext();
  renderPhotoComments();
  if (previousPath && previousPath !== path) {
    void supabase.storage.from(BUCKET).remove([previousPath]);
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

function updatePhotoPreview() {
  const files = Array.from(els.photoInput.files || []);
  if (!files.length) {
    if (!normalizeImageUrl(els.imageUrlInput.value)) {
      clearPhotoPreview();
    }
    return;
  }

  els.imageUrlInput.value = "";
  revokePreviewUrls();
  const imageLimit = getCurrentImageLimit();
  if (files.length > imageLimit) {
    setStatus(`当前 VIP 等级单篇最多 ${imageLimit} 张图。`);
  } else {
    setStatus(files.length > 1 ? `将发布为 1 篇合集，共 ${files.length} 张图。` : "");
  }
  previewUrls = files.slice(0, 9).map((file) => URL.createObjectURL(file));
  els.photoPreview.src = previewUrls[0];
  els.photoPreview.hidden = false;
  els.fileName.textContent =
    files.length > 1 ? `已选择 ${files.length} 张图片` : files[0].name;
  renderPreviewStrip(files, previewUrls);
}

function useImageUrl() {
  const url = normalizeImageUrl(els.imageUrlInput.value);
  if (!url) {
    setStatus("图片链接无效。");
    return;
  }

  els.photoInput.value = "";
  clearPhotoPreview();
  els.imageUrlInput.value = url;
  els.photoPreview.src = url;
  els.photoPreview.hidden = false;
  els.previewStrip.hidden = true;
  els.fileName.textContent = url;
  setStatus("已使用图片链接。");
}

function handlePasteUpload(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItems = items.filter((item) => item.type.startsWith("image/"));

  if (imageItems.length) {
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    if (!files.length) return;

    event.preventDefault();
    const transfer = new DataTransfer();
    files.forEach((file, index) => {
      const extension = file.type?.split("/")[1] || "png";
      const pastedFile = new File([file], `pasted-${Date.now()}-${index + 1}.${extension}`, {
        type: file.type || "image/png",
      });
      transfer.items.add(pastedFile);
    });
    els.photoInput.files = transfer.files;
    updatePhotoPreview();
    setStatus(files.length > 1 ? `已读取 ${files.length} 张剪贴板图片。` : "已读取剪贴板图片。");
    return;
  }

  const text = event.clipboardData?.getData("text") || "";
  const url = normalizeImageUrl(text);
  if (!url) return;

  event.preventDefault();
  els.imageUrlInput.value = url;
  useImageUrl();
}

function normalizeImageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function clearPhotoPreview() {
  revokePreviewUrls();

  els.photoPreview.removeAttribute("src");
  els.photoPreview.hidden = true;
  els.previewStrip.innerHTML = "";
  els.previewStrip.hidden = true;
  els.fileName.textContent = "还没有选择图片";
}

function revokePreviewUrls() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
}

function renderPreviewStrip(files, urls) {
  if (files.length <= 1) {
    els.previewStrip.innerHTML = "";
    els.previewStrip.hidden = true;
    return;
  }

  els.previewStrip.innerHTML = urls
    .map(
      (url, index) => `
        <span class="preview-thumb" data-preview-index="${index}" role="button" tabindex="0" aria-label="预览第 ${index + 1} 张">
          <img src="${url}" alt="" />
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
}

function switchPage(page) {
  activePage = ["recipes", "wishlist", "weekend", "thanks"].includes(page) ? page : "gallery";
  const showRecipes = activePage === "recipes";
  const showWishlist = activePage === "wishlist";
  const showWeekend = activePage === "weekend";
  const showThanks = activePage === "thanks";
  els.galleryNav.classList.toggle("active", activePage === "gallery");
  els.recipesNav.classList.toggle("active", showRecipes);
  els.wishlistNav.classList.toggle("active", showWishlist);
  els.weekendNav.classList.toggle("active", showWeekend);
  els.thanksNav.classList.toggle("active", showThanks);
  els.composer.hidden = activePage !== "gallery" || !session;
  els.overview.hidden = activePage !== "gallery" || !session;
  els.foodWheelSection.hidden = activePage !== "gallery";
  if (activePage !== "gallery" && els.foodWheelDialog.open) {
    els.foodWheelDialog.close();
  }
  els.galleryHead.hidden = activePage !== "gallery";
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
  els.recipeComposer.hidden = !showRecipes || !session;
  els.wishlistComposer.hidden = !showWishlist || !session;
  els.weekendComposer.hidden = !showWeekend || !session;
  els.thanksForm.hidden = !showThanks || !session;
  if (showRecipes) renderRecipes();
  if (showWishlist) renderWishes();
  if (showWeekend) renderWeekendPlans();
  if (showThanks) renderGratitudeNotes();
  if (activePage === "gallery") {
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
  els.overviewLevel.textContent = `Lv.${progress.level}`;
  els.overviewProgress.style.width = `${progress.percent}%`;
  els.memoryButton.disabled = familyVisiblePhotos.length === 0;
}

function getMemoryPhotos() {
  if (!session) return [];
  return photos.filter((photo) => photo?.image_url || getPhotoImages(photo).length);
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
    !supabase ||
    !session ||
    !cloudSyncAvailable ||
    !foodOptionsCloudAvailable
  ) {
    els.foodWheelResult.textContent =
      "数据库尚未升级，候选没有保存。请先运行最新版 supabase-cloud-sync.sql。";
    return false;
  }
  const normalized = normalizeFoodOptions(nextOptions);
  const { data, error } = await supabase
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
  renderFoodWheel();
  if (!els.foodWheelDialog.open) {
    els.foodWheelDialog.showModal();
  }
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
  });
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
      "数据库尚未升级，菜谱没有保存。请先运行最新版 supabase-cloud-sync.sql。"
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
    const { data, error } = await supabase
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
  setRecipeStatus(wasEditing ? "菜谱已更新。" : "菜谱已保存。");
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

  const { error } = await supabase.from("recipes").delete().eq("id", id);
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
  const path = `${session.user.id}/wishes/${Date.now()}-${slugify(title)}.jpg`;
  setWishlistStatus(
    `已压缩 ${formatFileSize(file.size)} → ${formatFileSize(compressed.blob.size)}，正在上传心愿图片…`
  );
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed.blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { imageUrl: data.publicUrl, imagePath: path };
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
      "数据库尚未升级，心愿没有保存。请先运行最新版 supabase-cloud-sync.sql。"
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
    let { data, error } = await supabase
      .from("wishes")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    if (error && isMissingCloudSchema(error)) {
      wishCompletionNoteCloudAvailable = false;
      row = wishToLegacyCloudRow(wish, wish.userId);
      const retry = await supabase
        .from("wishes")
        .upsert(row, { onConflict: "id" })
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      if (image.imagePath && image.imagePath !== previous?.imagePath) {
        await supabase.storage.from(BUCKET).remove([image.imagePath]);
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
    supabase &&
    session
  ) {
    await supabase.storage.from(BUCKET).remove([previous.imagePath]);
  }
  resetWishForm();
  setWishlistExpanded(false);
  setWishlistStatus(
    !wishCompletionNoteCloudAvailable && wish.completionNote
      ? "心愿已保存；完成感想字段还没升级，请运行 supabase-wish-completion-note-patch.sql 后再编辑同步。"
      : wasEditing
        ? "心愿已更新。"
        : "心愿已保存。"
  );
  renderWishes();
}

function renderWishes() {
  renderOverview();
  if (!els.wishlistList) return;
  if (!session) {
    els.wishlistList.innerHTML = `<div class="empty">登录后可以记录想做、想吃、想去的事。</div>`;
    setWishlistStatus("");
    return;
  }

  if (!wishes.length) {
    els.wishlistList.innerHTML = `<div class="empty">还没有心愿。先写一个以后想完成的小目标。</div>`;
    return;
  }

  const sorted = [...wishes].sort((a, b) => Number(a.done) - Number(b.done));
  els.wishlistList.innerHTML = sorted
    .map((wish, index) => {
      const canManage = canManageItem(wish);
      const stateText = wish.done ? "已完成" : "待实现";
      const completedDate = wish.completedAt ? formatWishDate(wish.completedAt) : "";
      return `
        <article class="wish-card ${wish.done ? "done" : ""}">
          <div class="wish-card-top">
            <div class="wish-index-stack">
              <span class="wish-seq">Wish ${String(index + 1).padStart(2, "0")}</span>
              <span class="wish-state-pill ${wish.done ? "done" : "open"}">${stateText}</span>
            </div>
            ${canManage ? `<div class="wish-actions">
              <button type="button" data-edit-wish="${escapeHtml(wish.id)}">编辑</button>
              <button class="complete" type="button" data-toggle-wish="${escapeHtml(wish.id)}">
                ${wish.done ? "取消完成" : "写完成感想"}
              </button>
              <button class="danger" type="button" data-delete-wish="${escapeHtml(wish.id)}">删除</button>
            </div>` : ""}
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
  let result = await supabase
    .from("wishes")
    .update(updatePayload)
    .eq("id", current.id)
    .select("*")
    .single();

  if (result.error && isMissingCloudSchema(result.error)) {
    wishCompletionNoteCloudAvailable = false;
    result = await supabase
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
  saveWishes();
  setWishlistStatus(
    usedLegacyCompletionNote
      ? "心愿已完成；数据库还缺少完成感想字段，请运行 supabase-wish-completion-note-patch.sql 后再编辑补上。"
      : done
        ? "心愿已完成，感想已保存。"
        : "已取消完成状态。"
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
    const { error } = await supabase.from("wishes").delete().eq("id", id);
    if (error) {
      setWishlistStatus(`删除同步失败：${error.message}`);
      return;
    }
  }

  if (wish.imagePath && supabase && session) {
    await supabase.storage.from(BUCKET).remove([wish.imagePath]);
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
      "数据库尚未升级，纪念日没有保存。请先运行最新版 supabase-cloud-sync.sql。";
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
    const { data, error } = await supabase
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
    const { error } = await supabase.from("anniversaries").delete().eq("id", id);
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
  if (!supabase || !session || !userId) return;
  try {
    const { data, error } = await supabase
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
      const { error: migrateError } = await supabase
        .from("anniversaries")
        .upsert(migratableItems.map((item) => anniversaryToCloudRow(item, userId)), {
          onConflict: "id",
        });
      if (migrateError) throw migrateError;
      const refreshed = await supabase
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
      "数据库尚未升级，周末计划没有保存。请先运行最新版 supabase-cloud-sync.sql。"
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
    const { data, error } = await supabase
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
  setWeekendStatus(wasEditing ? "周末计划已更新。" : "周末计划已保存。");
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
    const { data, error } = await supabase
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
  const { error } = await supabase.from("weekend_plans").delete().eq("id", id);
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
  if (!supabase || !session || !thanksColorCloudAvailable) return;
  const safeColor = normalizeThanksColor(color);
  const { error } = await supabase
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
  if (!supabase || !session) return;
  const body = els.thanksBodyInput.value.trim();
  if (!body) return;
  const selectedColor = getSelectedThanksColor();
  const previousNote = gratitudeNotes.find((item) => item.id === gratitudeEditingId);
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
    ? supabase
        .from("gratitude_notes")
        .update(payload)
        .eq("id", gratitudeEditingId)
        .eq("user_id", session.user.id)
    : supabase.from("gratitude_notes").insert(payload);
  const { error } = await request;
  if (error) {
    els.thanksStatus.textContent = isMissingCloudSchema(error)
      ? "请先运行最新版 supabase-cloud-sync.sql。"
      : `保存失败：${error.message}`;
    return;
  }

  resetGratitudeForm();
  await loadGratitudeNotes();
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
  const { error } = await supabase
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

async function refreshSharedContent() {
  if (!supabase || !session) return;
  const [recipesResult, wishesResult] = await Promise.all([
    supabase.from("recipes").select("*").order("created_at", { ascending: false }),
    supabase.from("wishes").select("*").order("created_at", { ascending: false }),
  ]);
  if (!recipesResult.error) recipes = (recipesResult.data || []).map(recipeFromCloudRow);
  if (!wishesResult.error) wishes = (wishesResult.data || []).map(wishFromCloudRow);
  await Promise.all([
    loadPhotos(),
    synchronizeWeekendPlans(session.user.id),
    synchronizeAnniversaries(session.user.id),
    loadGratitudeNotes(),
  ]);
  renderRecipes();
  renderWishes();
  renderWeekendPlans();
  renderAnniversaries();
}

async function createFamily(event) {
  event.preventDefault();
  if (!supabase || !session) return;
  els.familyStatus.textContent = "正在创建家庭组...";
  const { error } = await supabase.rpc("create_family", {
    p_name: els.familyNameInput.value.trim() || "我们的家",
  });
  if (error) {
    els.familyStatus.textContent = isMissingCloudSchema(error)
      ? "请先运行最新版 supabase-cloud-sync.sql。"
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
  if (!supabase || !session || !familyInfo?.isOwner) return;
  const username = els.familyUsernameInput.value.trim();
  if (!username) return;
  els.familyStatus.textContent = "正在添加家庭成员...";
  const { error } = await supabase.rpc("add_family_member_by_username", {
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
  if (!supabase || !session) return;
  els.familyStatus.textContent = accept ? "正在加入家庭..." : "正在拒绝邀请...";
  const { error } = await supabase.rpc("respond_family_invitation", {
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
  const { error } = await supabase.rpc("remove_family_member", { p_user_id: userId });
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

function getNotificationText(item) {
  const actor = item.actor_username || "有人";
  if (item.type === "favorite") return `${actor} 收藏了你的照片`;
  if (item.type === "reply") return `${actor} 回复了你的留言`;
  return `${actor} 评论了你的照片`;
}

async function loadNotifications() {
  if (!supabase || !session) {
    notifications = [];
    renderNotifications();
    return;
  }
  const { data, error } = await supabase.rpc("get_my_notifications", { p_limit: 50 });
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
  if (!els.notificationList) return;
  if (!notifications.length) {
    els.notificationList.innerHTML = `<div class="empty">还没有新的互动。</div>`;
    return;
  }
  els.notificationList.innerHTML = notifications
    .map((item) => {
      const avatar = item.actor_avatar_url
        ? `<span class="notification-avatar"><img src="${escapeHtml(item.actor_avatar_url)}" alt="" /></span>`
        : `<span class="notification-avatar">${escapeHtml(getInitial(item.actor_username))}</span>`;
      const stateClass = item.just_seen ? "just-seen" : item.is_read ? "" : "unread";
      return `
        <button class="notification-item ${stateClass}" type="button" data-notification-id="${escapeHtml(item.notification_id)}" data-notification-photo="${escapeHtml(item.photo_id || "")}">
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
  const item = notifications.find((entry) => entry.notification_id === id);
  if (item) item.is_read = true;
  renderNotifications();
  const photo = photos.find((entry) => entry.id === photoId);
  if (photo) {
    els.notificationDialog.close();
    openPhoto(photo);
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
  if (!supabase || !session) return;
  const { error } = await supabase
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
  if (!supabase || !session || !photoId) {
    renderPhotoComments();
    return;
  }
  const { data, error } = await supabase
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
  els.photoCommentInput.placeholder = "给这张照片留句话";
}

async function savePhotoComment(event) {
  event.preventDefault();
  if (!supabase || !session || !activeDialogPhoto) return;
  const body = els.photoCommentInput.value.trim();
  if (!body) return;
  els.photoCommentStatus.textContent = "正在发送...";
  const { error } = await supabase.from("photo_comments").insert({
    photo_id: activeDialogPhoto.id,
    user_id: session.user.id,
    body,
    parent_id: commentReplyToId,
  });
  if (error) {
    els.photoCommentStatus.textContent = isMissingCloudSchema(error)
      ? "请先运行最新版 supabase-cloud-sync.sql。"
      : `发送失败：${error.message}`;
    return;
  }
  els.photoCommentForm.reset();
  cancelCommentReply();
  await loadPhotoComments(activeDialogPhoto.id);
  await loadPhotoCommentPreviews();
  if (activePage === "gallery") renderGallery();
}

async function deletePhotoComment(id) {
  const comment = photoComments.find((item) => item.id === id);
  if (!comment || comment.user_id !== session?.user?.id) return;
  const { error } = await supabase
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
  els.globalStatus.textContent = message;
}

function setStatus(message) {
  els.uploadStatus.textContent = message;
}

function setUploadExpanded(expanded) {
  els.composer.classList.toggle("expanded", expanded);
  els.uploadForm.hidden = !expanded;
  els.uploadToggle.setAttribute("aria-expanded", String(expanded));
}

els.setupToggle.addEventListener("click", () => {
  els.setupPanel.hidden = !els.setupPanel.hidden;
});
els.themeToggle.addEventListener("click", toggleTheme);
els.galleryNav.addEventListener("click", () => switchPage("gallery"));
els.recipesNav.addEventListener("click", () => switchPage("recipes"));
els.wishlistNav.addEventListener("click", () => switchPage("wishlist"));
els.weekendNav.addEventListener("click", () => switchPage("weekend"));
els.thanksNav.addEventListener("click", () => switchPage("thanks"));
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
els.memoryButton.addEventListener("click", () => {
  const memoryPhotos = getMemoryPhotos();
  if (!memoryPhotos.length) return;
  openPhoto(memoryPhotos[Math.floor(Math.random() * memoryPhotos.length)]);
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
els.avatarButton.addEventListener("click", () => {
  els.userPopover.hidden = !els.userPopover.hidden;
});
els.notificationButton.addEventListener("click", async () => {
  await openNotificationsPanel();
});
els.closeNotificationDialog.addEventListener("click", () => els.notificationDialog.close());
els.notificationDialog.addEventListener("click", (event) => {
  if (event.target === els.notificationDialog) els.notificationDialog.close();
});
els.renameHomeButton.addEventListener("click", () => {
  els.userPopover.hidden = true;
  els.homeNameInput.value = accountProfile.homeName || loadHomeName(session?.user?.id);
  els.homeNameStatus.textContent = "";
  els.renameHomeDialog.showModal();
  els.homeNameInput.focus();
});
els.closeRenameHome.addEventListener("click", () => els.renameHomeDialog.close());
els.renameHomeDialog.addEventListener("click", (event) => {
  if (event.target === els.renameHomeDialog) els.renameHomeDialog.close();
});
els.renameHomeForm.addEventListener("submit", saveHomeName);
els.resetHomeName.addEventListener("click", restoreDefaultHomeName);
els.renameProfileButton.addEventListener("click", () => {
  els.userPopover.hidden = true;
  els.profileNicknameInput.value = getSessionDisplayName();
  els.profileNicknameStatus.textContent = "";
  els.renameProfileDialog.showModal();
  els.profileNicknameInput.focus();
  els.profileNicknameInput.select();
});
els.closeRenameProfile.addEventListener("click", () => els.renameProfileDialog.close());
els.renameProfileDialog.addEventListener("click", (event) => {
  if (event.target === els.renameProfileDialog) els.renameProfileDialog.close();
});
els.renameProfileForm.addEventListener("submit", saveProfileNickname);
els.changeAvatarButton.addEventListener("click", () => {
  els.userPopover.hidden = true;
  els.avatarForm.reset();
  els.avatarStatus.textContent = "";
  setAvatarPreview(accountProfile.avatarUrl);
  els.avatarDialog.showModal();
});
els.closeAvatarDialog.addEventListener("click", () => els.avatarDialog.close());
els.avatarDialog.addEventListener("click", (event) => {
  if (event.target === els.avatarDialog) els.avatarDialog.close();
});
els.avatarDialog.addEventListener("close", () => {
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  avatarPreviewUrl = "";
});
els.avatarInput.addEventListener("change", updateAvatarPreview);
els.avatarForm.addEventListener("submit", saveAvatar);
els.familyAccountButton.addEventListener("click", () => {
  els.userPopover.hidden = true;
  els.familyStatus.textContent = "";
  els.familyNameInput.value = accountProfile.homeName || "我们的家";
  renderFamilyDialog();
  els.familyDialog.showModal();
});
els.closeFamilyDialog.addEventListener("click", () => els.familyDialog.close());
els.familyDialog.addEventListener("click", (event) => {
  if (event.target === els.familyDialog) els.familyDialog.close();
});
els.createFamilyForm.addEventListener("submit", createFamily);
els.familyInviteForm.addEventListener("submit", addFamilyMember);
els.changePasswordButton.addEventListener("click", () => {
  els.userPopover.hidden = true;
  els.changePasswordForm.reset();
  els.changePasswordStatus.textContent = "";
  els.changePasswordDialog.showModal();
  els.newPasswordInput.focus();
});
els.closeChangePassword.addEventListener("click", () => els.changePasswordDialog.close());
els.changePasswordDialog.addEventListener("click", (event) => {
  if (event.target === els.changePasswordDialog) els.changePasswordDialog.close();
});
els.changePasswordForm.addEventListener("submit", changePassword);
els.recoveryKeyButton.addEventListener("click", () => {
  els.userPopover.hidden = true;
  els.recoveryKeyForm.reset();
  els.recoveryKeyStatus.textContent = "";
  els.recoveryKeyDialog.showModal();
  els.recoveryKeyInput.focus();
});
els.closeRecoveryKey.addEventListener("click", () => els.recoveryKeyDialog.close());
els.recoveryKeyDialog.addEventListener("click", (event) => {
  if (event.target === els.recoveryKeyDialog) els.recoveryKeyDialog.close();
});
els.recoveryKeyForm.addEventListener("submit", saveRecoveryKey);
els.closeForgotPassword.addEventListener("click", () => els.forgotPasswordDialog.close());
els.forgotPasswordDialog.addEventListener("click", (event) => {
  if (event.target === els.forgotPasswordDialog) els.forgotPasswordDialog.close();
});
els.forgotPasswordForm.addEventListener("submit", resetForgottenPassword);
els.vipBadge.addEventListener("click", () => {
  renderVipCenter();
  els.vipDialog.showModal();
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
els.uploadForm.addEventListener("submit", uploadPhoto);
els.photoDrop.addEventListener("paste", handlePasteUpload);
els.imageUrlInput.addEventListener("paste", handlePasteUpload);
els.useUrlButton.addEventListener("click", useImageUrl);
els.photoInput.addEventListener("change", () => {
  updatePhotoPreview();
});
els.closeDialog.addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", (event) => {
  if (event.target === els.dialog) {
    els.dialog.close();
  }
});
els.dialog.addEventListener("close", () => {
  activeDialogPhoto = null;
  photoComments = [];
  els.photoCommentsSection.hidden = false;
  els.photoCommentForm.reset();
  cancelCommentReply();
  els.photoCommentStatus.textContent = "";
});
els.photoCommentForm.addEventListener("submit", savePhotoComment);
els.cancelCommentReply.addEventListener("click", cancelCommentReply);
els.dialogPrev.addEventListener("click", () => moveDialogImage(-1));
els.dialogNext.addEventListener("click", () => moveDialogImage(1));
els.editForm.addEventListener("submit", savePhotoEdit);
els.editImageInput.addEventListener("change", replaceEditingImage);
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

registerAppShellWorker();
renderFoodWheel();
initializeFeedObserver();
initializeSupabase();

const CONFIG_KEY = "life-vlog-supabase-config";
const THEME_KEY = "life-vlog-theme";
const VIP_RECHARGE_KEY = "life-vlog-vip-recharge";
const RECIPES_KEY = "life-vlog-recipes";
const WISHLIST_KEY = "life-vlog-wishlist";
const WEEKEND_KEY = "life-vlog-weekend-plans";
const FOOD_OPTIONS_KEY = "life-vlog-food-options";
const EXPERIENCE_KEY = "life-vlog-experience";
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
const DEFAULT_FOOD_OPTIONS = ["拉面", "寿喜烧", "咖喱饭", "烤肉", "火锅", "寿司", "麻婆豆腐", "披萨"];

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
let recipes = [];
let wishes = [];
let weekendPlans = [];
let foodOptions = [];
let activePage = "gallery";
let activeFilter = "全部";
let previewUrls = [];
let currentPage = 1;
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
let weekendEditingId = null;
let weekendCloudAvailable = false;
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
};

const els = {
  themeToggle: document.querySelector("#themeToggle"),
  galleryNav: document.querySelector("#galleryNav"),
  recipesNav: document.querySelector("#recipesNav"),
  wishlistNav: document.querySelector("#wishlistNav"),
  weekendNav: document.querySelector("#weekendNav"),
  setupToggle: document.querySelector("#setupToggle"),
  setupPanel: document.querySelector("#setupPanel"),
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
  userPopover: document.querySelector("#userPopover"),
  profileName: document.querySelector("#profileName"),
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
  galleryFilters: document.querySelector("#galleryFilters"),
  gallery: document.querySelector("#gallery"),
  pager: document.querySelector("#pager"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  pageIndicator: document.querySelector("#pageIndicator"),
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
  wishSubmitButton: document.querySelector("#wishSubmitButton"),
  wishCancelEdit: document.querySelector("#wishCancelEdit"),
  wishlistStatus: document.querySelector("#wishlistStatus"),
  wishlistList: document.querySelector("#wishlistList"),
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
  await loadPhotos();

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    updateAuthUI();
    loadPhotos();
  });
}

function updateAuthUI() {
  const signedIn = Boolean(session);
  const displayName = signedIn ? getSessionDisplayName() : "";
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
  els.authCard.hidden = signedIn;
  els.userMenu.hidden = !signedIn;
  els.loginButton.hidden = signedIn;
  els.signupButton.hidden = signedIn;
  els.usernameInput.hidden = signedIn;
  els.passwordInput.hidden = signedIn;
  els.userPopover.hidden = true;
  els.profileName.textContent = displayName;
  els.avatarInitial.textContent = getInitial(displayName);
  if (signedIn) {
    renderExperience(displayName);
  }
  els.vipBadge.hidden = !signedIn;
  els.vipPopoverBadge.hidden = !signedIn;
  els.vipBadge.textContent = vip ? `VIP LV.${activeVipLevel}` : "开通 VIP";
  els.vipPopoverBadge.textContent = vip
    ? `咻蛋之家 ${getVipLevel(activeVipLevel).label}`
    : "开通咻蛋之家 VIP";
  renderVipCenter();
  recipes = signedIn ? loadRecipes() : [];
  wishes = signedIn ? loadWishes() : [];
  weekendPlans = signedIn ? loadWeekendPlans() : [];
  renderOverview();
  renderRecipes();
  renderWishes();
  renderWeekendPlans();
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
    cloudSyncInFlight = null;
    syncedUserId = "";
    accountProfile = {
      rechargeTotal: 0,
      vipLevel: 0,
      experienceTotal: 0,
      lastLoginDate: "",
      themePreference: "",
    };
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

async function loadPhotos() {
  if (!supabase) {
    photos = demoPhotos;
    renderGallery();
    return;
  }

  let query = supabase.from("photos").select("*");
  query = session
    ? query.or(`is_public.eq.true,user_id.eq.${session.user.id}`)
    : query.eq("is_public", true);

  const { data, error } = await query
    .order("taken_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    setGlobalStatus(`读取照片失败：${error.message}`);
    photos = [];
  } else {
    setGlobalStatus("");
    photos = data || [];
  }

  renderGallery();
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

  for (const [index, file] of files.entries()) {
    const finalTitle = getFinalTitle();
    const safeName = slugify(finalTitle);
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

  const finalTitle = getFinalTitle();
  const insertError = await insertPhotoRecord(finalTitle, images);
  if (insertError) {
    setStatus(insertError.message);
    return;
  }

  els.uploadForm.reset();
  els.dateInput.valueAsDate = new Date();
  clearPhotoPreview();
  setUploadExpanded(false);
  setStatus(images.length > 1 ? `已发布 1 篇合集，共 ${images.length} 张图。` : "上传完成，已回到照片流");
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

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const quality = getUploadQuality();
      const maxSide = quality.maxSide;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("图片压缩失败。"));
            return;
          }
          resolve({ blob, width, height });
        },
        "image/jpeg",
        quality.jpeg
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败。"));
    };
    image.src = objectUrl;
  });
}

async function uploadImageFile(file, safeName, index = 1, total = 1) {
  const prefix = total > 1 ? `${index}/${total} · ` : "";
  setStatus(`${prefix}正在压缩图片...`);
  const compressed = await compressImage(file);
  const path = `${session.user.id}/${Date.now()}-${safeName}.jpg`;

  setStatus(`${prefix}正在上传...`);
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
  };
}

function renderGallery() {
  renderOverview();
  const filtered =
    activeFilter === "全部"
      ? photos
      : photos.filter((photo) => photo.category === activeFilter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  if (!visible.length) {
    els.gallery.innerHTML = `<div class="empty">还没有这个分类的照片。</div>`;
    updatePager(totalPages, filtered.length);
    return;
  }

  els.gallery.innerHTML = visible
    .map(
        (photo, index) => {
          const canManage = Boolean(session && (!photo.user_id || photo.user_id === session.user.id));
          const displayTitle = getDisplayTitle(photo);
          const images = getPhotoImages(photo);
          const noteText = getPlainNote(photo);
          const sequence = String(start + index + 1).padStart(2, "0");
          return `
        <article class="photo-card">
          <span class="strand-index">${sequence}</span>
          <div class="photo-open">
            ${renderPhotoMedia(images, displayTitle, index)}
            <button class="photo-copy-open" type="button" data-photo-index="${index}" data-image-index="0">
              <p class="kicker">${escapeHtml(photo.category || "日常")} · ${formatDate(photo.taken_at)}</p>
              <h3>${escapeHtml(displayTitle)}</h3>
              <p>${escapeHtml(noteText)}</p>
            </button>
          </div>
          <div class="card-actions">
            ${
              canManage
                ? `<button class="edit-photo" type="button" data-edit-index="${index}" title="编辑照片">编辑</button>
                  <button class="delete-photo" type="button" data-delete-index="${index}" title="删除照片">删除</button>`
                : ""
            }
          </div>
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

  els.gallery.querySelectorAll("button[data-edit-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openEditPhoto(visible[Number(button.dataset.editIndex)]);
    });
  });

  updatePager(totalPages, filtered.length);
}

function renderPhotoMedia(images, title, photoIndex) {
  const safeTitle = escapeHtml(title);
  if (images.length <= 1) {
    const image = images[0] || {};
    return `
      <div class="photo-media single">
        <button type="button" data-photo-index="${photoIndex}" data-image-index="0">
          <img src="${escapeHtml(image.image_url || "")}" alt="${safeTitle}" loading="lazy" />
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
              <img src="${escapeHtml(image.image_url)}" alt="${safeTitle} ${index + 1}" loading="lazy" />
            </button>
          `
        )
        .join("")}
      <span class="media-count">${images.length} 张</span>
    </div>
  `;
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

function updatePager(totalPages, totalItems) {
  els.pager.hidden = activePage !== "gallery" || totalItems <= PAGE_SIZE;
  els.pageIndicator.textContent = `${currentPage} / ${totalPages}`;
  els.prevPage.disabled = currentPage <= 1;
  els.nextPage.disabled = currentPage >= totalPages;
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

  const ok = window.confirm(`删除“${getDisplayTitle(photo)}”？删除后无法恢复。`);
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
  const displayTitle = getDisplayTitle(photo);
  dialogImages = getPhotoImages(photo);
  dialogImageIndex = Math.min(
    Math.max(0, Number(initialImageIndex) || 0),
    Math.max(0, dialogImages.length - 1)
  );
  els.dialogTitle.textContent = displayTitle;
  els.dialogMeta.textContent = `${photo.category || "日常"} · ${formatDate(photo.taken_at)}`;
  els.dialogNote.textContent = getPlainNote(photo);
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
  const title =
    els.editTitleInput.value.trim() || makeCuteTitle(takenAt ? new Date(takenAt) : new Date());
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
  const title =
    els.editTitleInput.value.trim() || makeCuteTitle(takenAt ? new Date(takenAt) : new Date());
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
        `${slugify(title)}-edit-${index + 1}`,
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

function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "photo";
}

function getFinalTitle(index = 0, total = 1) {
  const title = els.titleInput.value.trim();
  if (title) return total > 1 ? `${title} ${String(index + 1).padStart(2, "0")}` : title;

  const date = els.dateInput.value ? new Date(els.dateInput.value) : new Date();
  const cuteTitle = makeCuteTitle(date);
  return total > 1 ? `${cuteTitle} ${String(index + 1).padStart(2, "0")}` : cuteTitle;
}

function getDisplayTitle(photo) {
  const title = String(photo.title || "").trim();
  if (title && title !== "未命名照片") return title;

  return makeCuteTitle(photo.taken_at ? new Date(photo.taken_at) : new Date());
}

function makeCuteTitle(date) {
  const label = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const names = ["今日小星星", "软乎乎的一天", "闪闪生活碎片", "快乐收藏夹"];
  const seed = date.getFullYear() + date.getMonth() + date.getDate();
  return `${names[seed % names.length]} · ${label}`;
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

function isMissingCloudSchema(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
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
    is_done: Boolean(wish.done),
    completed_at: wish.completedAt || null,
    created_at: wish.createdAt || new Date().toISOString(),
    updated_at: wish.updatedAt || new Date().toISOString(),
  };
}

function wishFromCloudRow(row) {
  const media = parseWishStoredNote(row.note);
  return {
    id: row.id,
    title: row.title,
    type: row.wish_type,
    date: row.planned_date || "",
    priority: row.priority,
    note: media.note,
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
      .eq("user_id", userId)
      .order("plan_date", { ascending: true });
    if (error) throw error;

    let cloudPlans = data || [];
    const localPlans = loadWeekendPlans();
    if (!cloudPlans.length && localPlans.length) {
      const { error: migrateError } = await supabase
        .from("weekend_plans")
        .upsert(localPlans.map((plan) => weekendToCloudRow(plan, userId)), { onConflict: "id" });
      if (migrateError) throw migrateError;
      const refreshed = await supabase
        .from("weekend_plans")
        .select("*")
        .eq("user_id", userId)
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
      const [profileResult, recipesResult, wishesResult] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("recipes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("wishes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const firstError = profileResult.error || recipesResult.error || wishesResult.error;
      if (firstError) throw firstError;
      if (!session || session.user.id !== userId) return;

      const localRecipes = loadRecipes();
      const localWishes = loadWishes();
      const localRecharge = loadRechargeTotal(displayName);
      const localExperience = loadExperience(displayName);
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
        if (localRecipes.length) {
          const rows = localRecipes.map((recipe) => recipeToCloudRow(recipe, userId));
          const { error } = await supabase.from("recipes").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }
        if (localWishes.length) {
          const rows = localWishes.map((wish) => wishToCloudRow(wish, userId));
          const { error } = await supabase.from("wishes").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }

        const [migratedRecipes, migratedWishes] = await Promise.all([
          supabase.from("recipes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("wishes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
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

      if (
        profile.last_login_date !== today &&
        (!needsLocalMigration || localExperience.lastLoginDate !== today)
      ) {
        experienceTotal += DAILY_LOGIN_EXP;
      }
      lastLoginDate = today;
      const vipLevel = getVipLevelByRecharge(rechargeTotal)?.level || 0;

      const { data: savedProfile, error: profileError } = await supabase
        .from("user_profiles")
        .update({
          username: displayName,
          recharge_total: rechargeTotal,
          vip_level: vipLevel,
          experience_total: experienceTotal,
          last_login_date: lastLoginDate,
          local_data_migrated: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("*")
        .single();
      if (profileError) throw profileError;

      cloudSyncAvailable = true;
      const cloudTheme = normalizeTheme(savedProfile.theme_preference);
      const preferredTheme = cloudTheme || loadTheme(userId);
      accountProfile = {
        rechargeTotal: Number(savedProfile.recharge_total) || 0,
        vipLevel: Number(savedProfile.vip_level) || 0,
        experienceTotal: Number(savedProfile.experience_total) || 0,
        lastLoginDate: savedProfile.last_login_date || "",
        themePreference: preferredTheme,
      };
      applyTheme(preferredTheme, { userId, syncCloud: false });
      if (!cloudTheme) void persistThemeToCloud(preferredTheme);
      recipes = cloudRecipes.map(recipeFromCloudRow);
      wishes = cloudWishes.map(wishFromCloudRow);

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

      activeVipLevel = accountProfile.vipLevel;
      document.body.classList.toggle("vip-member", activeVipLevel > 0);
      document.body.dataset.vipLevel = String(activeVipLevel);
      els.vipBadge.textContent = activeVipLevel > 0 ? `VIP LV.${activeVipLevel}` : "开通 VIP";
      els.vipPopoverBadge.textContent =
        activeVipLevel > 0 ? `咻蛋之家 ${getVipLevel(activeVipLevel).label}` : "开通咻蛋之家 VIP";
      renderExperience(displayName);
      renderVipCenter();
      renderRecipes();
      renderWishes();
      await synchronizeWeekendPlans(userId);
      setGlobalStatus("云端数据已同步");
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
  if (activeVipLevel >= 5) return { maxSide: 3200, jpeg: 0.92 };
  if (activeVipLevel >= 3) return { maxSide: 2400, jpeg: 0.9 };
  return { maxSide: 1800, jpeg: 0.86 };
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

  const nextTotal = loadRechargeTotal() + numericAmount;
  const nextLevel = getVipLevelByRecharge(nextTotal)?.level || 0;

  if (cloudSyncAvailable) {
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
  activePage = ["recipes", "wishlist", "weekend"].includes(page) ? page : "gallery";
  const showRecipes = activePage === "recipes";
  const showWishlist = activePage === "wishlist";
  const showWeekend = activePage === "weekend";
  els.galleryNav.classList.toggle("active", activePage === "gallery");
  els.recipesNav.classList.toggle("active", showRecipes);
  els.wishlistNav.classList.toggle("active", showWishlist);
  els.weekendNav.classList.toggle("active", showWeekend);
  els.composer.hidden = activePage !== "gallery" || !session;
  els.overview.hidden = activePage !== "gallery" || !session;
  els.foodWheelSection.hidden = activePage !== "gallery";
  if (activePage !== "gallery" && els.foodWheelDialog.open) {
    els.foodWheelDialog.close();
  }
  els.galleryHead.hidden = activePage !== "gallery";
  els.galleryFilters.hidden = activePage !== "gallery";
  els.gallery.hidden = activePage !== "gallery";
  els.pager.hidden = activePage !== "gallery" || photos.length <= PAGE_SIZE;
  els.recipesPage.hidden = !showRecipes;
  els.wishlistPage.hidden = !showWishlist;
  els.weekendPage.hidden = !showWeekend;
  els.recipeComposer.hidden = !showRecipes || !session;
  els.wishlistComposer.hidden = !showWishlist || !session;
  els.weekendComposer.hidden = !showWeekend || !session;
  if (showRecipes) renderRecipes();
  if (showWishlist) renderWishes();
  if (showWeekend) renderWeekendPlans();
  if (activePage === "gallery") renderGallery();
}

function renderOverview() {
  if (!els.overview) return;
  const signedIn = Boolean(session);
  els.overview.hidden = !signedIn || activePage !== "gallery";
  if (!signedIn) return;

  const personalPhotos = photos.filter(
    (photo) => !photo.user_id || photo.user_id === session.user.id
  );
  const unfinishedWishes = wishes.filter((wish) => !wish.done).length;
  const experience = loadExperience();
  const progress = getExperienceLevel(experience.total);
  els.overviewPhotos.textContent = String(personalPhotos.length);
  els.overviewRecipes.textContent = String(recipes.length);
  els.overviewWishes.textContent = String(unfinishedWishes);
  els.overviewLevel.textContent = `Lv.${progress.level}`;
  els.overviewProgress.style.width = `${progress.percent}%`;
  els.memoryButton.disabled = personalPhotos.length === 0;
}

function loadFoodOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FOOD_OPTIONS_KEY) || "[]");
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_FOOD_OPTIONS];
  } catch {
    return [...DEFAULT_FOOD_OPTIONS];
  }
}

function saveFoodOptions() {
  localStorage.setItem(FOOD_OPTIONS_KEY, JSON.stringify(foodOptions));
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

function addFoodOption() {
  const value = els.foodOptionInput.value.trim();
  if (!value) return;
  if (!foodOptions.includes(value)) foodOptions.push(value);
  saveFoodOptions();
  els.foodOptionInput.value = "";
  renderFoodWheel();
}

function removeFoodOption(value) {
  const recipeNames = new Set(recipes.map((recipe) => recipe.name));
  if (recipeNames.has(value)) {
    els.foodWheelResult.textContent = "菜谱里的菜会自动保留在转盘中";
    return;
  }
  if (getWheelOptions().length <= 2) {
    els.foodWheelResult.textContent = "至少保留两个候选";
    return;
  }
  foodOptions = foodOptions.filter((item) => item !== value);
  saveFoodOptions();
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

function compressRecipeCover(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1000;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败"));
    };
    image.src = objectUrl;
  });
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

  const name = els.recipeNameInput.value.trim();
  if (!name) {
    setRecipeStatus("先写一个菜名。");
    return;
  }

  const coverImage = await getRecipeCoverForSave();
  let recipe = {
    id: normalizeUuid(recipeEditingId),
    name,
    category: els.recipeCategoryInput.value,
    time: els.recipeTimeInput.value.trim(),
    servings: els.recipeServingsInput.value.trim(),
    coverImage,
    seasonings: getSelectedSeasonings(),
    ingredients: splitLines(els.recipeIngredientsInput.value),
    steps: splitLines(els.recipeStepsInput.value),
    note: els.recipeNoteInput.value.trim(),
    createdAt:
      recipes.find((item) => item.id === recipeEditingId)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const wasEditing = Boolean(recipeEditingId);
  if (cloudSyncAvailable) {
    const { data, error } = await supabase
      .from("recipes")
      .upsert(recipeToCloudRow(recipe), { onConflict: "id" })
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
    .map(
      (recipe, index) => `
        <article class="recipe-card">
          <div class="recipe-card-head">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <button type="button" data-edit-recipe="${escapeHtml(recipe.id)}">编辑</button>
              <button type="button" data-delete-recipe="${escapeHtml(recipe.id)}">删除</button>
            </div>
          </div>
          ${renderRecipeCover(recipe)}
          <p class="kicker">${escapeHtml(recipe.category)} · ${formatRecipeDate(recipe.createdAt)}</p>
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
      `
    )
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
  if (!recipe) return;

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
  if (!recipe) return;
  const ok = window.confirm(`删除菜谱“${recipe.name}”？`);
  if (!ok) return;

  if (cloudSyncAvailable) {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) {
      setRecipeStatus(`删除同步失败：${error.message}`);
      return;
    }
  }

  recipes = recipes.filter((item) => item.id !== id);
  saveRecipes();
  setRecipeStatus(cloudSyncAvailable ? "菜谱已从云端删除。" : "菜谱已删除。");
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
  setWishlistStatus("正在上传心愿图片…");
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
    title,
    type: els.wishTypeInput.value,
    date: els.wishDateInput.value,
    priority: els.wishPriorityInput.value,
    note: els.wishNoteInput.value.trim(),
    imageUrl: image.imageUrl,
    imagePath: image.imagePath,
    done: previous?.done || false,
    completedAt: previous?.completedAt || "",
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (cloudSyncAvailable) {
    const { data, error } = await supabase
      .from("wishes")
      .upsert(wishToCloudRow(wish), { onConflict: "id" })
      .select("*")
      .single();
    if (error) {
      if (image.imagePath && image.imagePath !== previous?.imagePath) {
        await supabase.storage.from(BUCKET).remove([image.imagePath]);
      }
      setWishlistStatus(`心愿同步失败：${error.message}`);
      return;
    }
    wish = wishFromCloudRow(data);
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
  setWishlistStatus(wasEditing ? "心愿已更新。" : "心愿已保存。");
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
    .map(
      (wish, index) => `
        <article class="wish-card ${wish.done ? "done" : ""}">
          <div class="wish-card-head">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <button type="button" data-edit-wish="${escapeHtml(wish.id)}">编辑</button>
              <button type="button" data-toggle-wish="${escapeHtml(wish.id)}">
                ${wish.done ? "取消完成" : "完成"}
              </button>
              <button type="button" data-delete-wish="${escapeHtml(wish.id)}">删除</button>
            </div>
          </div>
          ${
            wish.imageUrl
              ? `<img class="wish-card-image" src="${escapeHtml(wish.imageUrl)}" alt="${escapeHtml(wish.title)}" loading="lazy" />`
              : ""
          }
          <p class="kicker">${escapeHtml(wish.type)} · ${escapeHtml(wish.priority)}</p>
          <h3>${escapeHtml(wish.title)}</h3>
          <div class="wish-meta">
            ${wish.date ? `<span>${formatWishDate(wish.date)}</span>` : ""}
            <span>${wish.done ? "已完成" : "待实现"}</span>
          </div>
          ${wish.note ? `<p>${escapeHtml(wish.note)}</p>` : ""}
        </article>
      `
    )
    .join("");

  els.wishlistList.querySelectorAll("button[data-edit-wish]").forEach((button) => {
    button.addEventListener("click", () => editWish(button.dataset.editWish));
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
  if (!wish) return;

  wishEditingId = id;
  wishExistingImage = wish.imageUrl || "";
  wishExistingImagePath = wish.imagePath || "";
  wishRemoveImageRequested = false;
  els.wishTitleInput.value = wish.title || "";
  els.wishTypeInput.value = wish.type || "想做";
  els.wishDateInput.value = wish.date || "";
  els.wishPriorityInput.value = wish.priority || "普通";
  els.wishNoteInput.value = wish.note || "";
  if (wishExistingImage) setWishImagePreview(wishExistingImage);
  else clearWishImagePreview();
  els.wishlistFormTitle.textContent = "编辑心愿";
  els.wishSubmitButton.textContent = "保存修改";
  els.wishCancelEdit.hidden = false;
  setWishlistExpanded(true);
  setWishlistStatus(`正在编辑：${wish.title}`);
  els.wishlistComposer.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function toggleWish(id) {
  const current = wishes.find((wish) => wish.id === id);
  if (!current) return;
  const next = {
    ...current,
    done: !current.done,
    completedAt: !current.done ? new Date().toISOString() : "",
    updatedAt: new Date().toISOString(),
  };

  if (cloudSyncAvailable) {
    const { data, error } = await supabase
      .from("wishes")
      .update({
        is_done: next.done,
        completed_at: next.completedAt || null,
        updated_at: next.updatedAt,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      setWishlistStatus(`心愿同步失败：${error.message}`);
      return;
    }
    Object.assign(next, wishFromCloudRow(data));
  }

  wishes = wishes.map((wish) => (wish.id === id ? next : wish));
  saveWishes();
  setWishlistStatus(cloudSyncAvailable ? "心愿状态已同步。" : "心愿状态已更新。");
  renderWishes();
}

async function deleteWish(id) {
  const wish = wishes.find((item) => item.id === id);
  if (!wish) return;
  const ok = window.confirm(`删除心愿“${wish.title}”？`);
  if (!ok) return;

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
  setWishlistStatus(cloudSyncAvailable ? "心愿已从云端删除。" : "心愿已删除。");
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

  const title = els.weekendTitleInput.value.trim();
  if (!title) {
    setWeekendStatus("先写下周末想做什么。");
    return;
  }

  const previous = weekendPlans.find((item) => item.id === weekendEditingId);
  let plan = {
    id: normalizeUuid(weekendEditingId),
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
      .upsert(weekendToCloudRow(plan), { onConflict: "id" })
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
    .map(
      (plan, index) => `
        <article class="weekend-card ${plan.done ? "done" : ""}">
          <div class="weekend-date">
            <span>${new Intl.DateTimeFormat("zh-CN", { month: "short" }).format(new Date(plan.date))}</span>
            <strong>${new Intl.DateTimeFormat("zh-CN", { day: "2-digit" }).format(new Date(plan.date))}</strong>
            <small>${new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(plan.date))}</small>
          </div>
          <div class="weekend-card-body">
            <p class="kicker">${escapeHtml(plan.type)} · PLAN ${String(index + 1).padStart(2, "0")}</p>
            <h3>${escapeHtml(plan.title)}</h3>
            ${plan.location ? `<p class="weekend-location">地点：${escapeHtml(plan.location)}</p>` : ""}
            ${plan.note ? `<p>${escapeHtml(plan.note)}</p>` : ""}
            <div class="weekend-card-actions">
              <button type="button" data-edit-weekend="${escapeHtml(plan.id)}">编辑</button>
              <button type="button" data-toggle-weekend="${escapeHtml(plan.id)}">
                ${plan.done ? "重新计划" : "完成"}
              </button>
              <button type="button" data-delete-weekend="${escapeHtml(plan.id)}">删除</button>
            </div>
          </div>
        </article>
      `
    )
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
  if (!plan) return;
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
  if (!current) return;
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
  if (!plan || !window.confirm(`删除周末计划“${plan.title}”？`)) return;
  if (weekendCloudAvailable) {
    const { error } = await supabase.from("weekend_plans").delete().eq("id", id);
    if (error) {
      setWeekendStatus(`删除同步失败：${error.message}`);
      return;
    }
  }
  weekendPlans = weekendPlans.filter((item) => item.id !== id);
  saveWeekendPlans();
  setWeekendStatus("周末计划已删除。");
  renderWeekendPlans();
}

function setWeekendStatus(message) {
  els.weekendStatus.textContent = message;
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
els.memoryButton.addEventListener("click", () => {
  const personalPhotos = photos.filter(
    (photo) => !photo.user_id || photo.user_id === session?.user?.id
  );
  if (!personalPhotos.length) return;
  openPhoto(personalPhotos[Math.floor(Math.random() * personalPhotos.length)]);
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
els.weekendToggle.addEventListener("click", () => {
  setWeekendExpanded(els.weekendForm.hidden);
});
els.weekendForm.addEventListener("submit", saveWeekendPlan);
els.weekendCancelEdit.addEventListener("click", () => {
  resetWeekendForm();
  setWeekendExpanded(false);
  setWeekendStatus("");
});
els.avatarButton.addEventListener("click", () => {
  els.userPopover.hidden = !els.userPopover.hidden;
});
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
    currentPage = 1;
    els.chips.forEach((item) => item.classList.toggle("active", item === chip));
    renderGallery();
  });
});
els.prevPage.addEventListener("click", () => {
  currentPage = Math.max(1, currentPage - 1);
  renderGallery();
  els.galleryHead?.scrollIntoView({ behavior: "smooth" });
});
els.nextPage.addEventListener("click", () => {
  currentPage += 1;
  renderGallery();
  els.galleryHead?.scrollIntoView({ behavior: "smooth" });
});

renderFoodWheel();
initializeSupabase();

const CONFIG_KEY = "life-vlog-supabase-config";
const THEME_KEY = "life-vlog-theme";
const VIP_RECHARGE_KEY = "life-vlog-vip-recharge";
const RECIPES_KEY = "life-vlog-recipes";
const BUCKET = "life-photos";
const PRODUCTION_URL = "https://xiudan320-ship-it.github.io/life-vlog-site/";
const PAGE_SIZE = 6;
const DEFAULT_SUPABASE_URL = "https://cimejrarjcosgayfnikk.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_G0ZHVQG0XYB2zja9VHiJiQ_HKDUt_fJ";
const VIP_USERS = new Set(["xiao980320"]);
const MEDIA_META_START = "<!--life-vlog-media:";
const MEDIA_META_END = "-->";

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
let activePage = "gallery";
let activeFilter = "全部";
let previewUrls = [];
let currentPage = 1;
let editingPhoto = null;
let dialogImages = [];
let dialogImageIndex = 0;
let activeVipLevel = 1;

const els = {
  themeToggle: document.querySelector("#themeToggle"),
  galleryNav: document.querySelector("#galleryNav"),
  recipesNav: document.querySelector("#recipesNav"),
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
  recipesPage: document.querySelector("#recipesPage"),
  recipeForm: document.querySelector("#recipeForm"),
  recipeNameInput: document.querySelector("#recipeNameInput"),
  recipeCategoryInput: document.querySelector("#recipeCategoryInput"),
  recipeTimeInput: document.querySelector("#recipeTimeInput"),
  recipeServingsInput: document.querySelector("#recipeServingsInput"),
  recipeIngredientsInput: document.querySelector("#recipeIngredientsInput"),
  recipeStepsInput: document.querySelector("#recipeStepsInput"),
  recipeNoteInput: document.querySelector("#recipeNoteInput"),
  recipeStatus: document.querySelector("#recipeStatus"),
  recipesList: document.querySelector("#recipesList"),
};

els.dateInput.valueAsDate = new Date();
applyTheme(loadTheme());

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
  els.vipBadge.hidden = !signedIn;
  els.vipPopoverBadge.hidden = !signedIn;
  els.vipBadge.textContent = vip ? `VIP LV.${activeVipLevel}` : "开通 VIP";
  els.vipPopoverBadge.textContent = vip
    ? `咻蛋之家 ${getVipLevel(activeVipLevel).label}`
    : "开通咻蛋之家 VIP";
  renderVipCenter();
  recipes = signedIn ? loadRecipes() : [];
  renderRecipes();
  switchPage(activePage);
  setHint(
    signedIn
      ? ""
      : "输入用户名和密码登录。第一次使用请先注册。"
  );
  setGlobalStatus("");
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
          <button class="photo-open" type="button" data-index="${index}">
            ${renderPhotoMedia(images, displayTitle)}
            <article>
              <p class="kicker">${escapeHtml(photo.category || "日常")} · ${formatDate(photo.taken_at)}</p>
              <h3>${escapeHtml(displayTitle)}</h3>
              <p>${escapeHtml(noteText)}</p>
            </article>
          </button>
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

  els.gallery.querySelectorAll("button[data-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openPhoto(visible[Number(button.dataset.index)]);
    });
  });

  els.gallery.querySelectorAll("button[data-delete-index]").forEach((button) => {
    button.addEventListener("click", () => {
      deletePhoto(visible[Number(button.dataset.deleteIndex)]);
    });
  });

  els.gallery.querySelectorAll("button[data-edit-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openEditPhoto(visible[Number(button.dataset.editIndex)]);
    });
  });

  updatePager(totalPages, filtered.length);
}

function renderPhotoMedia(images, title) {
  const safeTitle = escapeHtml(title);
  if (images.length <= 1) {
    const image = images[0] || {};
    return `
      <div class="photo-media single">
        <img src="${escapeHtml(image.image_url || "")}" alt="${safeTitle}" loading="lazy" />
      </div>
    `;
  }

  const previewImages = images.slice(0, 9);
  return `
    <div class="photo-media collage count-${previewImages.length}">
      ${previewImages
        .map(
          (image, index) => `
            <img src="${escapeHtml(image.image_url)}" alt="${safeTitle} ${index + 1}" loading="lazy" />
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
  els.pager.hidden = activePage === "recipes" || totalItems <= PAGE_SIZE;
  els.pageIndicator.textContent = `${currentPage} / ${totalPages}`;
  els.prevPage.disabled = currentPage <= 1;
  els.nextPage.disabled = currentPage >= totalPages;
}

async function deletePhoto(photo) {
  if (!supabase || !session || !photo) {
    setGlobalStatus("请先登录后再删除照片。");
    return;
  }

  const ok = window.confirm(`删除“${photo.title || "这张照片"}”？`);
  if (!ok) return;

  setGlobalStatus("正在删除照片...");

  const storagePaths = [
    ...new Set(getPhotoImages(photo).map((image) => image.image_path).filter(Boolean)),
  ];

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove(storagePaths);

    if (storageError) {
      setGlobalStatus(`删除图片文件失败：${storageError.message}`);
      return;
    }
  }

  const { error } = await supabase.from("photos").delete().eq("id", photo.id);
  if (error) {
    setGlobalStatus(`删除记录失败：${error.message}`);
    return;
  }

  photos = photos.filter((item) => item.id !== photo.id);
  setGlobalStatus("照片已删除。");
  renderGallery();
}

function openPhoto(photo) {
  const displayTitle = getDisplayTitle(photo);
  dialogImages = getPhotoImages(photo);
  dialogImageIndex = 0;
  els.dialogTitle.textContent = displayTitle;
  els.dialogMeta.textContent = `${photo.category || "日常"} · ${formatDate(photo.taken_at)}`;
  els.dialogNote.textContent = getPlainNote(photo);
  renderDialogMedia();
  els.dialog.showModal();
}

function openEditPhoto(photo) {
  if (!photo) return;
  editingPhoto = photo;
  els.saveEditStatus.textContent = "";
  els.editTitleInput.value = getDisplayTitle(photo);
  els.editDateInput.value = toDateInputValue(photo.taken_at);
  els.editCategoryInput.value = photo.category || "日常";
  els.editPublicInput.value = String(photo.is_public !== false);
  els.editNoteInput.value = getPlainNote(photo);
  els.editDialog.showModal();
}

async function savePhotoEdit(event) {
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
  const key = getRechargeStorageKey(displayName);
  const stored = Number(localStorage.getItem(key));
  if (Number.isFinite(stored) && stored >= 0) return stored;
  return isVipUser(displayName) ? 298 : 0;
}

function saveRechargeTotal(amount, displayName = getSessionDisplayName()) {
  localStorage.setItem(getRechargeStorageKey(displayName), String(Math.max(0, Math.round(amount))));
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
    ? "这是前端模拟充值额度，不会真实扣款；档位会保存在当前浏览器。"
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

function rechargeVip(amount) {
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
  saveRechargeTotal(nextTotal);
  activeVipLevel = getVipLevelByRecharge(nextTotal)?.level || 0;
  updateAuthUI();
  renderVipCenter();
  els.vipStatus.textContent = `模拟充值 ${formatMoney(numericAmount)} 成功，累计 ${formatMoney(nextTotal)}。`;
}

function formatMoney(value) {
  return `¥${Math.max(0, Math.round(Number(value) || 0))}`;
}

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("theme-dark", nextTheme === "dark");
  localStorage.setItem(THEME_KEY, nextTheme);
  els.themeToggle.querySelector("span").textContent = nextTheme === "dark" ? "☀" : "☾";
  els.themeToggle.title = nextTheme === "dark" ? "切换白天模式" : "切换黑夜模式";
}

function toggleTheme() {
  applyTheme(document.body.classList.contains("theme-dark") ? "light" : "dark");
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
  activePage = page === "recipes" ? "recipes" : "gallery";
  const showRecipes = activePage === "recipes";
  els.galleryNav.classList.toggle("active", !showRecipes);
  els.recipesNav.classList.toggle("active", showRecipes);
  els.composer.hidden = showRecipes || !session;
  els.galleryHead.hidden = showRecipes;
  els.galleryFilters.hidden = showRecipes;
  els.gallery.hidden = showRecipes;
  els.pager.hidden = showRecipes || photos.length <= PAGE_SIZE;
  els.recipesPage.hidden = !showRecipes;
  els.recipeForm.hidden = showRecipes && !session;
  if (showRecipes) renderRecipes();
  if (!showRecipes) renderGallery();
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

function saveRecipe(event) {
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

  const recipe = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name,
    category: els.recipeCategoryInput.value,
    time: els.recipeTimeInput.value.trim(),
    servings: els.recipeServingsInput.value.trim(),
    ingredients: splitLines(els.recipeIngredientsInput.value),
    steps: splitLines(els.recipeStepsInput.value),
    note: els.recipeNoteInput.value.trim(),
    createdAt: new Date().toISOString(),
  };

  recipes = [recipe, ...recipes];
  saveRecipes();
  els.recipeForm.reset();
  setRecipeStatus("菜谱已保存。");
  renderRecipes();
}

function renderRecipes() {
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
            <button type="button" data-delete-recipe="${escapeHtml(recipe.id)}">删除</button>
          </div>
          <p class="kicker">${escapeHtml(recipe.category)} · ${formatRecipeDate(recipe.createdAt)}</p>
          <h3>${escapeHtml(recipe.name)}</h3>
          <div class="recipe-meta">
            ${recipe.time ? `<span>${escapeHtml(recipe.time)}</span>` : ""}
            ${recipe.servings ? `<span>${escapeHtml(recipe.servings)}</span>` : ""}
          </div>
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

  els.recipesList.querySelectorAll("button[data-delete-recipe]").forEach((button) => {
    button.addEventListener("click", () => deleteRecipe(button.dataset.deleteRecipe));
  });
}

function deleteRecipe(id) {
  const recipe = recipes.find((item) => item.id === id);
  if (!recipe) return;
  const ok = window.confirm(`删除菜谱“${recipe.name}”？`);
  if (!ok) return;

  recipes = recipes.filter((item) => item.id !== id);
  saveRecipes();
  setRecipeStatus("菜谱已删除。");
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
els.saveConfig.addEventListener("click", saveConfig);
els.loginButton.addEventListener("click", loginWithPassword);
els.signupButton.addEventListener("click", signupWithPassword);
els.uploadToggle.addEventListener("click", () => {
  setUploadExpanded(els.uploadForm.hidden);
});
els.recipeForm.addEventListener("submit", saveRecipe);
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
els.dialogPrev.addEventListener("click", () => moveDialogImage(-1));
els.dialogNext.addEventListener("click", () => moveDialogImage(1));
els.editForm.addEventListener("submit", savePhotoEdit);
els.closeEditDialog.addEventListener("click", () => {
  editingPhoto = null;
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

initializeSupabase();

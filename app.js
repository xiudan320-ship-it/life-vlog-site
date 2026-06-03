const CONFIG_KEY = "life-vlog-supabase-config";
const BUCKET = "life-photos";
const PRODUCTION_URL = "https://xiudan320-ship-it.github.io/life-vlog-site/";

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
let activeFilter = "全部";

const els = {
  setupToggle: document.querySelector("#setupToggle"),
  setupPanel: document.querySelector("#setupPanel"),
  supabaseUrl: document.querySelector("#supabaseUrl"),
  supabaseAnonKey: document.querySelector("#supabaseAnonKey"),
  saveConfig: document.querySelector("#saveConfig"),
  emailInput: document.querySelector("#emailInput"),
  loginButton: document.querySelector("#loginButton"),
  logoutButton: document.querySelector("#logoutButton"),
  authHint: document.querySelector("#authHint"),
  composer: document.querySelector("#composer"),
  uploadForm: document.querySelector("#uploadForm"),
  photoInput: document.querySelector("#photoInput"),
  fileName: document.querySelector("#fileName"),
  titleInput: document.querySelector("#titleInput"),
  dateInput: document.querySelector("#dateInput"),
  categoryInput: document.querySelector("#categoryInput"),
  publicInput: document.querySelector("#publicInput"),
  noteInput: document.querySelector("#noteInput"),
  uploadStatus: document.querySelector("#uploadStatus"),
  gallery: document.querySelector("#gallery"),
  chips: document.querySelectorAll(".chip"),
  dialog: document.querySelector("#photoDialog"),
  closeDialog: document.querySelector("#closeDialog"),
  dialogImage: document.querySelector("#dialogImage"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogMeta: document.querySelector("#dialogMeta"),
  dialogNote: document.querySelector("#dialogNote"),
};

els.dateInput.valueAsDate = new Date();

function loadConfig() {
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
  els.composer.hidden = !signedIn;
  els.loginButton.hidden = signedIn;
  els.logoutButton.hidden = !signedIn;
  els.emailInput.hidden = signedIn;
  setHint(
    signedIn
      ? `已登录：${session.user.email}`
      : "输入邮箱获取登录链接。第一次使用时会自动创建账号。"
  );
}

async function sendLoginLink() {
  if (!supabase) {
    setHint("先点右上角设置，填入 Supabase 配置。");
    els.setupPanel.hidden = false;
    return;
  }

  const email = els.emailInput.value.trim();
  if (!email) {
    setHint("请输入邮箱。");
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getRedirectUrl() },
  });

  setHint(error ? error.message : "登录链接已发送，请检查邮箱。");
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

  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("is_public", true)
    .order("taken_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    setHint(`读取照片失败：${error.message}`);
    photos = [];
  } else {
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

  const file = els.photoInput.files[0];
  if (!file) {
    setStatus("请选择图片。");
    return;
  }

  setStatus("正在压缩图片...");
  const compressed = await compressImage(file);
  const safeName = slugify(els.titleInput.value || "photo");
  const path = `${session.user.id}/${Date.now()}-${safeName}.jpg`;

  setStatus("正在上传...");
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed.blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    setStatus(uploadError.message);
    return;
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const record = {
    user_id: session.user.id,
    title: els.titleInput.value.trim(),
    note: els.noteInput.value.trim(),
    category: els.categoryInput.value,
    taken_at: els.dateInput.value,
    is_public: els.publicInput.value === "true",
    image_path: path,
    image_url: publicUrlData.publicUrl,
    width: compressed.width,
    height: compressed.height,
  };

  const { error: insertError } = await supabase.from("photos").insert(record);
  if (insertError) {
    setStatus(insertError.message);
    return;
  }

  els.uploadForm.reset();
  els.dateInput.valueAsDate = new Date();
  els.fileName.textContent = "还没有选择图片";
  setStatus("上传完成");
  await loadPhotos();
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1800;
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
        0.86
      );
    };
    image.onerror = () => reject(new Error("图片读取失败。"));
    image.src = URL.createObjectURL(file);
  });
}

function renderGallery() {
  const visible =
    activeFilter === "全部"
      ? photos
      : photos.filter((photo) => photo.category === activeFilter);

  if (!visible.length) {
    els.gallery.innerHTML = `<div class="empty">还没有这个分类的照片。</div>`;
    return;
  }

  els.gallery.innerHTML = visible
    .map(
      (photo, index) => `
        <article class="photo-card">
          <button type="button" data-index="${index}">
            <img src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.title)}" loading="lazy" />
            <article>
              <p class="kicker">${escapeHtml(photo.category || "日常")} · ${formatDate(photo.taken_at)}</p>
              <h3>${escapeHtml(photo.title || "未命名照片")}</h3>
              <p>${escapeHtml(photo.note || "")}</p>
            </article>
          </button>
        </article>
      `
    )
    .join("");

  els.gallery.querySelectorAll("button[data-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openPhoto(visible[Number(button.dataset.index)]);
    });
  });
}

function openPhoto(photo) {
  els.dialogImage.src = photo.image_url;
  els.dialogImage.alt = photo.title || "";
  els.dialogTitle.textContent = photo.title || "未命名照片";
  els.dialogMeta.textContent = `${photo.category || "日常"} · ${formatDate(photo.taken_at)}`;
  els.dialogNote.textContent = photo.note || "";
  els.dialog.showModal();
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
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
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

function setHint(message) {
  els.authHint.textContent = message;
}

function setStatus(message) {
  els.uploadStatus.textContent = message;
}

els.setupToggle.addEventListener("click", () => {
  els.setupPanel.hidden = !els.setupPanel.hidden;
});
els.saveConfig.addEventListener("click", saveConfig);
els.loginButton.addEventListener("click", sendLoginLink);
els.logoutButton.addEventListener("click", logout);
els.uploadForm.addEventListener("submit", uploadPhoto);
els.photoInput.addEventListener("change", () => {
  els.fileName.textContent = els.photoInput.files[0]?.name || "还没有选择图片";
});
els.closeDialog.addEventListener("click", () => els.dialog.close());
els.chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter;
    els.chips.forEach((item) => item.classList.toggle("active", item === chip));
    renderGallery();
  });
});

initializeSupabase();

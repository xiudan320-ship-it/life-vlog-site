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
let previewUrl = "";

const els = {
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
  globalStatus: document.querySelector("#globalStatus"),
  composer: document.querySelector("#composer"),
  uploadForm: document.querySelector("#uploadForm"),
  photoInput: document.querySelector("#photoInput"),
  photoPreview: document.querySelector("#photoPreview"),
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
  const displayName = signedIn
    ? session.user.user_metadata?.username || session.user.email
    : "";
  document.body.classList.toggle("signed-in", signedIn);
  els.composer.hidden = !signedIn;
  els.authCard.hidden = signedIn;
  els.userMenu.hidden = !signedIn;
  els.loginButton.hidden = signedIn;
  els.signupButton.hidden = signedIn;
  els.logoutButton.hidden = !signedIn;
  els.usernameInput.hidden = signedIn;
  els.passwordInput.hidden = signedIn;
  els.userPopover.hidden = true;
  els.profileName.textContent = displayName;
  els.avatarInitial.textContent = getInitial(displayName);
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

  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("is_public", true)
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

  const file = els.photoInput.files[0];
  if (!file) {
    setStatus("请选择图片。");
    return;
  }

  setStatus("正在压缩图片...");
  const compressed = await compressImage(file);
  const finalTitle = getFinalTitle();
  const safeName = slugify(finalTitle);
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
    title: finalTitle,
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
  clearPhotoPreview();
  setStatus("上传完成，已回到照片流");
  await loadPhotos();
  document.querySelector(".feed-head")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
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
      (photo, index) => {
        const canDelete = Boolean(session);
        return `
        <article class="photo-card">
          <button class="photo-open" type="button" data-index="${index}">
            <img src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.title)}" loading="lazy" />
            <article>
              <p class="kicker">${escapeHtml(photo.category || "日常")} · ${formatDate(photo.taken_at)}</p>
              <h3>${escapeHtml(photo.title || "未命名照片")}</h3>
              <p>${escapeHtml(photo.note || "")}</p>
            </article>
          </button>
          <div class="card-actions">
            ${
              canDelete
                ? `<button class="delete-photo" type="button" data-delete-index="${index}" title="删除照片">删除</button>`
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
}

async function deletePhoto(photo) {
  if (!supabase || !session || !photo) {
    setGlobalStatus("请先登录后再删除照片。");
    return;
  }

  const ok = window.confirm(`删除“${photo.title || "这张照片"}”？`);
  if (!ok) return;

  setGlobalStatus("正在删除照片...");

  if (photo.image_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([photo.image_path]);

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
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "photo";
}

function getFinalTitle() {
  const title = els.titleInput.value.trim();
  if (title) return title;

  const date = els.dateInput.value ? new Date(els.dateInput.value) : new Date();
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

function updatePhotoPreview() {
  const file = els.photoInput.files[0];
  if (!file) {
    clearPhotoPreview();
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(file);
  els.photoPreview.src = previewUrl;
  els.photoPreview.hidden = false;
  els.fileName.textContent = file.name;
}

function clearPhotoPreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  els.photoPreview.removeAttribute("src");
  els.photoPreview.hidden = true;
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

els.setupToggle.addEventListener("click", () => {
  els.setupPanel.hidden = !els.setupPanel.hidden;
});
els.saveConfig.addEventListener("click", saveConfig);
els.loginButton.addEventListener("click", loginWithPassword);
els.signupButton.addEventListener("click", signupWithPassword);
els.avatarButton.addEventListener("click", () => {
  els.userPopover.hidden = !els.userPopover.hidden;
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
els.photoInput.addEventListener("change", () => {
  updatePhotoPreview();
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

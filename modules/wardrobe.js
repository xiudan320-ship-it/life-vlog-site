const ITEM_TYPES = [
  ["item", "单件"],
  ["outfit", "整套搭配"],
];
const CATEGORIES = ["上装", "下装", "连衣裙", "外套", "鞋", "包", "配饰", "家居服", "整套", "其他"];
const SEASONS = ["春", "夏", "秋", "冬", "四季"];
const OCCASIONS = ["日常", "通勤", "约会", "旅行", "运动", "正式", "居家"];
const STATUSES = [
  ["available", "可穿"],
  ["laundry", "待清洗"],
  ["repair", "待修补"],
  ["retired", "已收起"],
];
const IMAGE_ROLES = [
  ["cover", "封面"],
  ["front", "正面"],
  ["side", "侧面"],
  ["back", "背面"],
  ["detail", "细节"],
  ["tryon", "上身"],
  ["label", "水洗标"],
];

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return String(value).split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  }
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeImage(image, index = 0) {
  return {
    id: image?.id || uid(),
    url: image?.url || image?.image_url || "",
    path: image?.path || image?.image_path || "",
    thumbnailUrl: image?.thumbnailUrl || image?.thumbnail_url || image?.url || image?.image_url || "",
    thumbnailPath: image?.thumbnailPath || image?.thumbnail_path || "",
    width: Number(image?.width) || 0,
    height: Number(image?.height) || 0,
    role: image?.role || (index === 0 ? "cover" : "detail"),
    name: image?.name || `照片 ${index + 1}`,
  };
}

function normalizeItem(item) {
  return {
    ...item,
    seasons: list(item?.seasons),
    occasions: list(item?.occasions),
    style_tags: list(item?.style_tags),
    color_tags: list(item?.color_tags),
    images: arrayValue(item?.images).map(normalizeImage),
    is_favorite: Boolean(item?.is_favorite),
    wear_count: Number(item?.wear_count) || 0,
  };
}

function resultData(result, fallback = null) {
  if (result?.error) throw result.error;
  return result?.data ?? fallback;
}

function statusName(value) {
  return STATUSES.find(([key]) => key === value)?.[1] || "可穿";
}

function typeName(value) {
  return ITEM_TYPES.find(([key]) => key === value)?.[1] || "单件";
}

function mediaUrl(image) {
  return image?.thumbnailUrl || image?.url || "";
}

function dateLabel(value) {
  if (!value) return "还没穿过";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "还没穿过";
  return `${date.getMonth() + 1}月${date.getDate()}日穿过`;
}

function commaList(value) {
  return [...new Set(String(value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean))];
}

function imageCollage(images, alt) {
  const visible = images.filter((image) => image.url).slice(0, 3);
  if (!visible.length) {
    return `<div class="wardrobe-empty-art" aria-hidden="true"><span>衣</span><small>等待试穿照</small></div>`;
  }
  return `<div class="wardrobe-card-media wardrobe-card-media-${visible.length}">
    ${visible.map((image, index) => `<img src="${html(mediaUrl(image))}" alt="${html(index ? `${alt}的细节照片` : alt)}" loading="lazy" />`).join("")}
    ${images.length > 3 ? `<span class="wardrobe-photo-count">+${images.length - 3}</span>` : ""}
  </div>`;
}

export function createWardrobeController({
  root,
  repository,
  getSession,
  getFamilyMembers = () => [],
  uploadFile,
  importUrl,
  deleteAsset,
  confirmAction,
  notify = () => {},
  onExperience = async () => {},
} = {}) {
  let items = [];
  let locations = [];
  let wearLogs = [];
  let loaded = false;
  let loading = false;
  let activeItem = null;
  let editorImages = [];
  let pendingFiles = [];
  let pendingUrls = [];
  let removedPaths = [];
  let detailIndex = 0;
  let currentLocation = "all";
  let search = "";
  let category = "all";
  let season = "all";
  let status = "available";
  let favoritesOnly = false;
  let editingLocationId = "";
  const objectUrls = new Set();
  const cacheKey = () => `life-vlog-wardrobe:${getSession?.()?.user?.id || "guest"}`;

  if (!root) throw new Error("Wardrobe root is required.");

  root.innerHTML = `
    <header class="wardrobe-head">
      <div>
        <p class="kicker">My Wardrobe</p>
        <h1>衣柜</h1>
        <p>把试穿照、搭配和收纳位置放在一起，出门前少找十分钟。</p>
      </div>
      <div class="wardrobe-head-actions">
        <button class="wardrobe-random-button" type="button" data-wardrobe-random><span aria-hidden="true">↻</span>今天穿什么</button>
        <button class="wardrobe-add-button" type="button" data-wardrobe-add><span aria-hidden="true">＋</span>添加衣服</button>
      </div>
    </header>
    <section class="wardrobe-overview" aria-label="衣柜概况">
      <div><small>收录</small><strong data-wardrobe-count>0</strong><span>件</span></div>
      <div><small>可穿</small><strong data-wardrobe-ready>0</strong><span>件</span></div>
      <div><small>搭配</small><strong data-wardrobe-outfits>0</strong><span>套</span></div>
      <div><small>位置</small><strong data-wardrobe-locations>0</strong><span>处</span></div>
    </section>
    <section class="wardrobe-toolbar">
      <label class="wardrobe-search"><span aria-hidden="true">⌕</span><input type="search" data-wardrobe-search placeholder="搜索衣服、颜色或风格" /></label>
      <select data-wardrobe-category aria-label="按分类筛选"><option value="all">全部分类</option>${CATEGORIES.map((value) => `<option>${value}</option>`).join("")}</select>
      <select data-wardrobe-season aria-label="按季节筛选"><option value="all">全部季节</option>${SEASONS.map((value) => `<option>${value}</option>`).join("")}</select>
      <select data-wardrobe-status aria-label="按状态筛选">${[["all", "全部状态"], ...STATUSES].map(([value, label]) => `<option value="${value}"${value === "available" ? " selected" : ""}>${label}</option>`).join("")}</select>
      <button class="wardrobe-favorite-filter" type="button" data-wardrobe-favorites aria-pressed="false" aria-label="只看收藏">♡</button>
    </section>
    <div class="wardrobe-location-bar">
      <div class="wardrobe-location-chips" data-wardrobe-location-chips></div>
      <button type="button" data-wardrobe-manage-locations aria-label="管理衣服放置区域">管理位置</button>
    </div>
    <p class="wardrobe-status" data-wardrobe-status-line aria-live="polite"></p>
    <section class="wardrobe-grid" data-wardrobe-grid aria-live="polite"></section>
  `;

  const editor = createDialog("wardrobe-editor-dialog", `
    <form class="wardrobe-editor" data-wardrobe-editor-form>
      <header class="wardrobe-dialog-head"><div><p class="kicker">Wardrobe Card</p><h2 data-wardrobe-editor-title>添加衣服</h2><p>一件衣服可以保存多张试穿和细节照片。</p></div><button type="button" data-close aria-label="关闭">×</button></header>
      <div class="wardrobe-editor-layout">
        <section class="wardrobe-media-editor">
          <div class="wardrobe-drop" data-wardrobe-drop>
            <input class="native-file-input" id="wardrobeFileInput" type="file" accept="image/*" multiple data-wardrobe-file-input />
            <label class="wardrobe-file-trigger" for="wardrobeFileInput">
              <span aria-hidden="true">＋</span><strong>选择或粘贴照片</strong><small>支持多张，上传时自动压缩</small>
            </label>
          </div>
          <div class="wardrobe-url-row"><input type="url" inputmode="url" data-wardrobe-url placeholder="粘贴图片链接" /><button type="button" data-wardrobe-url-add>加入</button></div>
          <div class="wardrobe-media-previews" data-wardrobe-media-previews></div>
        </section>
        <section class="wardrobe-fields">
          <div class="wardrobe-field-grid">
            <label class="wide">名称<input name="name" maxlength="60" required placeholder="比如：绿色针织开衫" /></label>
            <label>记录方式<select name="item_type">${ITEM_TYPES.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
            <label>分类<select name="category">${CATEGORIES.map((value) => `<option>${value}</option>`).join("")}</select></label>
            <label>给谁穿<select name="wearer_user_id" data-wardrobe-wearer></select></label>
            <label>放置区域<select name="location_id" data-wardrobe-location-select></select></label>
            <label>状态<select name="status">${STATUSES.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
          </div>
          <fieldset><legend>适合季节</legend><div class="wardrobe-checks">${SEASONS.map((value) => `<label><input type="checkbox" name="seasons" value="${value}" /><span>${value}</span></label>`).join("")}</div></fieldset>
          <fieldset><legend>穿着场景</legend><div class="wardrobe-checks">${OCCASIONS.map((value) => `<label><input type="checkbox" name="occasions" value="${value}" /><span>${value}</span></label>`).join("")}</div></fieldset>
          <div class="wardrobe-field-grid">
            <label>颜色<input name="color_tags" maxlength="100" placeholder="绿色、白色" /></label>
            <label>风格<input name="style_tags" maxlength="100" placeholder="复古、通勤" /></label>
            <label class="wide">合身记录<input name="fit_note" maxlength="160" placeholder="袖子略长，里面能加一件薄毛衣" /></label>
            <label class="wide">备注<textarea name="description" rows="4" maxlength="1200" placeholder="搭配想法、面料、购买信息……"></textarea></label>
          </div>
        </section>
      </div>
      <p class="wardrobe-form-status" data-wardrobe-form-status aria-live="polite"></p>
      <footer><button type="button" class="wardrobe-delete-button" data-wardrobe-delete hidden>删除</button><span></span><button type="button" data-close>取消</button><button type="submit" class="primary" data-wardrobe-save>保存衣柜卡</button></footer>
    </form>`);

  const detail = createDialog("wardrobe-detail-dialog", `
    <article class="wardrobe-detail">
      <button class="wardrobe-detail-close" type="button" data-close aria-label="关闭">×</button>
      <section class="wardrobe-detail-media">
        <div class="wardrobe-detail-stage" data-wardrobe-detail-stage></div>
        <div class="wardrobe-detail-thumbs" data-wardrobe-detail-thumbs></div>
      </section>
      <section class="wardrobe-detail-copy" data-wardrobe-detail-copy></section>
    </article>`);

  const locationDialog = createDialog("wardrobe-location-dialog", `
    <section class="wardrobe-location-panel">
      <header class="wardrobe-dialog-head"><div><p class="kicker">Storage Map</p><h2>衣服放在哪里</h2><p>位置会同步给家庭成员，之后可以随时改名。</p></div><button type="button" data-close aria-label="关闭">×</button></header>
      <form data-wardrobe-location-form><input name="name" maxlength="50" required placeholder="例如：主卧衣柜 · 上层" /><input name="note" maxlength="100" placeholder="可选：靠左的收纳箱" /><button type="submit" class="primary">添加位置</button></form>
      <div class="wardrobe-location-list" data-wardrobe-location-list></div>
    </section>`);

  const randomDialog = createDialog("wardrobe-random-dialog", `
    <section class="wardrobe-random-panel">
      <header class="wardrobe-dialog-head"><div><p class="kicker">Outfit Roulette</p><h2>今天穿什么</h2><p>优先抽很久没穿过、并且现在可穿的衣服。</p></div><button type="button" data-close aria-label="关闭">×</button></header>
      <div class="wardrobe-random-filters"><select data-random-wearer></select><select data-random-season><option value="all">不限季节</option>${SEASONS.map((value) => `<option>${value}</option>`).join("")}</select><select data-random-occasion><option value="all">不限场景</option>${OCCASIONS.map((value) => `<option>${value}</option>`).join("")}</select></div>
      <div data-random-result></div>
    </section>`);

  function createDialog(className, content) {
    const node = document.createElement("dialog");
    node.className = className;
    node.innerHTML = content;
    document.body.appendChild(node);
    node.addEventListener("click", (event) => {
      if (event.target === node) node.close();
    });
    node.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => node.close()));
    return node;
  }

  function setStatus(message = "") {
    root.querySelector("[data-wardrobe-status-line]").textContent = message;
  }

  function saveCache() {
    try {
      localStorage.setItem(cacheKey(), JSON.stringify({ items, locations, savedAt: Date.now() }));
    } catch {
      // The cloud copy remains authoritative when local storage is full.
    }
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey()) || "null");
      if (!cached) return false;
      items = (cached.items || []).map(normalizeItem);
      locations = cached.locations || [];
      render();
      return true;
    } catch {
      return false;
    }
  }

  async function load({ force = false } = {}) {
    if (!getSession?.()) {
      items = [];
      locations = [];
      render();
      setStatus("登录后使用家庭衣柜。");
      return;
    }
    if (loading || (loaded && !force)) return;
    if (!loaded) readCache();
    loading = true;
    setStatus(items.length ? "正在同步衣柜…" : "正在打开衣柜…");
    try {
      const [itemResult, locationResult, logResult] = await Promise.all([
        repository.listItems(),
        repository.listLocations(),
        repository.listWearLogs(),
      ]);
      items = (resultData(itemResult, []) || []).map(normalizeItem);
      locations = resultData(locationResult, []) || [];
      wearLogs = resultData(logResult, []) || [];
      loaded = true;
      saveCache();
      setStatus("");
      render();
    } catch (error) {
      setStatus(items.length ? "当前离线，正在显示上次同步的衣柜。" : `衣柜读取失败：${error.message}`);
    } finally {
      loading = false;
    }
  }

  function filteredItems() {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (currentLocation !== "all" && item.location_id !== currentLocation) return false;
      if (category !== "all" && item.category !== category) return false;
      if (season !== "all" && !item.seasons.includes(season)) return false;
      if (status !== "all" && item.status !== status) return false;
      if (favoritesOnly && !item.is_favorite) return false;
      if (!needle) return true;
      return [item.name, item.category, item.description, item.fit_note, ...item.style_tags, ...item.color_tags]
        .join(" ").toLowerCase().includes(needle);
    });
  }

  function locationName(id) {
    return locations.find((location) => location.id === id)?.name || "还没标位置";
  }

  function memberFor(id) {
    return getFamilyMembers().find((member) => member.user_id === id) || null;
  }

  function render() {
    root.querySelector("[data-wardrobe-count]").textContent = items.length;
    root.querySelector("[data-wardrobe-ready]").textContent = items.filter((item) => item.status === "available").length;
    root.querySelector("[data-wardrobe-outfits]").textContent = items.filter((item) => item.item_type === "outfit").length;
    root.querySelector("[data-wardrobe-locations]").textContent = locations.length;
    renderLocationChips();
    const grid = root.querySelector("[data-wardrobe-grid]");
    const visible = filteredItems();
    if (!visible.length) {
      grid.innerHTML = `<div class="wardrobe-empty"><span aria-hidden="true">＋</span><h2>${items.length ? "没有符合条件的衣服" : "从第一件试穿照开始"}</h2><p>${items.length ? "换个筛选条件看看。" : "记录试穿照、搭配和收纳位置，以后找起来会轻松很多。"}</p><button type="button" data-wardrobe-add>添加衣服</button></div>`;
      return;
    }
    grid.innerHTML = visible.map((item) => {
      const member = memberFor(item.wearer_user_id);
      return `<article class="wardrobe-card" data-wardrobe-item="${html(item.id)}" tabindex="0">
        ${imageCollage(item.images, item.name)}
        <div class="wardrobe-card-copy">
          <div class="wardrobe-card-overline"><span>${html(typeName(item.item_type))} · ${html(item.category)}</span><button type="button" data-wardrobe-favorite="${html(item.id)}" aria-label="${item.is_favorite ? "取消收藏" : "收藏"}" aria-pressed="${item.is_favorite}">${item.is_favorite ? "♥" : "♡"}</button></div>
          <h2>${html(item.name)}</h2>
          <p class="wardrobe-card-location"><span aria-hidden="true">⌂</span>${html(locationName(item.location_id))}</p>
          <footer><span class="wardrobe-status-pill" data-status="${html(item.status)}">${html(statusName(item.status))}</span><span>${member ? html(member.username) : "家庭衣柜"}</span><span>${item.wear_count} 次</span></footer>
        </div>
      </article>`;
    }).join("");
  }

  function renderLocationChips() {
    const host = root.querySelector("[data-wardrobe-location-chips]");
    host.innerHTML = `<button type="button" class="${currentLocation === "all" ? "active" : ""}" data-location-filter="all">全部位置 <small>${items.length}</small></button>${locations.map((location) => `<button type="button" class="${currentLocation === location.id ? "active" : ""}" data-location-filter="${html(location.id)}">${html(location.name)} <small>${items.filter((item) => item.location_id === location.id).length}</small></button>`).join("")}`;
  }

  function familyOptions(selected = "") {
    const session = getSession?.();
    const members = [...getFamilyMembers()];
    if (session?.user?.id && !members.some((member) => member.user_id === session.user.id)) {
      members.unshift({ user_id: session.user.id, username: session.user.user_metadata?.username || "我" });
    }
    return `<option value="">家庭共用</option>${members.map((member) => `<option value="${html(member.user_id)}"${member.user_id === selected ? " selected" : ""}>${html(member.username || "家庭成员")}</option>`).join("")}`;
  }

  function locationOptions(selected = "") {
    return `<option value="">暂未标记</option>${locations.map((location) => `<option value="${html(location.id)}"${location.id === selected ? " selected" : ""}>${html(location.name)}</option>`).join("")}`;
  }

  function resetEditorMedia() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
    editorImages = [];
    pendingFiles = [];
    pendingUrls = [];
    removedPaths = [];
  }

  function openEditor(item = null) {
    activeItem = item ? normalizeItem(item) : null;
    resetEditorMedia();
    editorImages = activeItem?.images.map((image) => ({ ...image })) || [];
    const form = editor.querySelector("[data-wardrobe-editor-form]");
    form.reset();
    form.elements.name.value = activeItem?.name || "";
    form.elements.item_type.value = activeItem?.item_type || "item";
    form.elements.category.value = activeItem?.category || "上装";
    form.elements.status.value = activeItem?.status || "available";
    form.elements.fit_note.value = activeItem?.fit_note || "";
    form.elements.description.value = activeItem?.description || "";
    form.elements.color_tags.value = activeItem?.color_tags.join("、") || "";
    form.elements.style_tags.value = activeItem?.style_tags.join("、") || "";
    editor.querySelector("[data-wardrobe-wearer]").innerHTML = familyOptions(activeItem?.wearer_user_id || "");
    editor.querySelector("[data-wardrobe-location-select]").innerHTML = locationOptions(activeItem?.location_id || "");
    form.querySelectorAll('[name="seasons"]').forEach((input) => { input.checked = activeItem?.seasons.includes(input.value) || false; });
    form.querySelectorAll('[name="occasions"]').forEach((input) => { input.checked = activeItem?.occasions.includes(input.value) || false; });
    editor.querySelector("[data-wardrobe-editor-title]").textContent = activeItem ? "编辑衣柜卡" : "添加衣服";
    editor.querySelector("[data-wardrobe-delete]").hidden = !activeItem;
    editor.querySelector("[data-wardrobe-form-status]").textContent = "";
    renderMediaPreviews();
    editor.showModal();
    setTimeout(() => form.elements.name.focus(), 80);
  }

  function addFiles(files) {
    [...files].filter((file) => file.type.startsWith("image/")).forEach((file) => {
      const preview = URL.createObjectURL(file);
      objectUrls.add(preview);
      pendingFiles.push({ id: uid(), file, preview, role: editorImages.length || pendingFiles.length ? "detail" : "cover" });
    });
    renderMediaPreviews();
  }

  function addPendingUrl(value) {
    const url = String(value || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      editor.querySelector("[data-wardrobe-form-status]").textContent = "请输入完整的图片链接。";
      return;
    }
    pendingUrls.push({ id: uid(), url, role: editorImages.length || pendingFiles.length || pendingUrls.length ? "detail" : "cover" });
    editor.querySelector("[data-wardrobe-url]").value = "";
    renderMediaPreviews();
  }

  function renderMediaPreviews() {
    const host = editor.querySelector("[data-wardrobe-media-previews]");
    const entries = [
      ...editorImages.map((image) => ({ ...image, kind: "stored", preview: mediaUrl(image) })),
      ...pendingFiles.map((image) => ({ ...image, kind: "file" })),
      ...pendingUrls.map((image) => ({ ...image, kind: "url", preview: image.url })),
    ];
    host.innerHTML = entries.map((entry) => `<article data-media-id="${html(entry.id)}" data-media-kind="${entry.kind}">
      <img src="${html(entry.preview)}" alt="待保存的衣服照片" />
      <select data-media-role aria-label="照片用途">${IMAGE_ROLES.map(([value, label]) => `<option value="${value}"${entry.role === value ? " selected" : ""}>${label}</option>`).join("")}</select>
      <button type="button" data-remove-media aria-label="移除图片">×</button>
    </article>`).join("");
  }

  async function saveItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const saveButton = form.querySelector("[data-wardrobe-save]");
    const statusLine = form.querySelector("[data-wardrobe-form-status]");
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    statusLine.textContent = "正在整理照片…";
    try {
      const uploaded = [];
      const total = pendingFiles.length + pendingUrls.length;
      let current = 0;
      for (const pending of pendingFiles) {
        current += 1;
        const media = await uploadFile(pending.file, `wardrobe-${Date.now()}-${current}`, current, total, (message) => { statusLine.textContent = message; });
        if (!media) throw new Error("照片上传失败，请重试。");
        uploaded.push(normalizeImage({ ...media, role: pending.role, name: pending.file.name }, editorImages.length + uploaded.length));
      }
      for (const pending of pendingUrls) {
        current += 1;
        statusLine.textContent = `${current}/${total} · 正在导入图片链接…`;
        const media = await importUrl(pending.url, `wardrobe-link-${Date.now()}-${current}`);
        uploaded.push(normalizeImage({ image_url: media.url, image_path: `r2:${media.key}`, thumbnail_url: media.url, role: pending.role }, editorImages.length + uploaded.length));
      }
      const formData = new FormData(form);
      const images = [...editorImages, ...uploaded];
      const record = {
        name: String(formData.get("name") || "").trim(),
        item_type: formData.get("item_type") || "item",
        category: formData.get("category") || "上装",
        wearer_user_id: formData.get("wearer_user_id") || null,
        location_id: formData.get("location_id") || null,
        status: formData.get("status") || "available",
        fit_note: String(formData.get("fit_note") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        seasons: formData.getAll("seasons"),
        occasions: formData.getAll("occasions"),
        color_tags: commaList(formData.get("color_tags")),
        style_tags: commaList(formData.get("style_tags")),
        images,
        updated_at: new Date().toISOString(),
      };
      if (!record.name) throw new Error("请给这件衣服起个名字。");
      const result = activeItem
        ? await repository.updateItem(activeItem.id, record)
        : await repository.insertItem({ id: uid(), ...record, is_favorite: false, wear_count: 0, created_at: new Date().toISOString() });
      const saved = normalizeItem(resultData(result, activeItem ? { ...activeItem, ...record } : record));
      if (activeItem) items = items.map((item) => item.id === activeItem.id ? saved : item);
      else items.unshift(saved);
      for (const path of removedPaths) await deleteAsset(path).catch(() => {});
      saveCache();
      render();
      editor.close();
      notify(activeItem ? "衣柜卡已更新" : "衣服已收入衣柜", { kind: "success" });
      await onExperience(activeItem ? "wardrobeEdit" : "wardrobe");
    } catch (error) {
      statusLine.textContent = error.message || "保存失败，请稍后重试。";
    } finally {
      saveButton.disabled = false;
    }
  }

  function openDetail(item, index = 0) {
    activeItem = normalizeItem(item);
    detailIndex = Math.min(Math.max(0, index), Math.max(0, activeItem.images.length - 1));
    renderDetail();
    detail.showModal();
  }

  function renderDetail() {
    if (!activeItem) return;
    const images = activeItem.images.filter((image) => image.url);
    const activeImage = images[detailIndex];
    const member = memberFor(activeItem.wearer_user_id);
    detail.querySelector("[data-wardrobe-detail-stage]").innerHTML = activeImage
      ? `<button type="button" data-detail-prev aria-label="上一张" ${detailIndex <= 0 ? "disabled" : ""}>‹</button><img src="${html(activeImage.url)}" alt="${html(activeItem.name)}" /><span>${detailIndex + 1} / ${images.length}</span><button type="button" data-detail-next aria-label="下一张" ${detailIndex >= images.length - 1 ? "disabled" : ""}>›</button>`
      : `<div class="wardrobe-empty-art"><span>衣</span><small>还没有照片</small></div>`;
    detail.querySelector("[data-wardrobe-detail-thumbs]").innerHTML = images.map((image, index) => `<button type="button" class="${index === detailIndex ? "active" : ""}" data-detail-index="${index}"><img src="${html(mediaUrl(image))}" alt="${html(IMAGE_ROLES.find(([key]) => key === image.role)?.[1] || "照片")}" /></button>`).join("");
    detail.querySelector("[data-wardrobe-detail-copy]").innerHTML = `
      <div class="wardrobe-detail-overline"><span>${html(typeName(activeItem.item_type))} · ${html(activeItem.category)}</span><button type="button" data-detail-favorite aria-label="收藏" aria-pressed="${activeItem.is_favorite}">${activeItem.is_favorite ? "♥ 已收藏" : "♡ 收藏"}</button></div>
      <h2>${html(activeItem.name)}</h2>
      <div class="wardrobe-find-it"><small>收纳位置</small><strong>${html(locationName(activeItem.location_id))}</strong>${locations.length ? "" : `<button type="button" data-open-locations>添加位置</button>`}</div>
      <div class="wardrobe-detail-meta"><span>${html(statusName(activeItem.status))}</span><span>${member ? html(member.username) : "家庭共用"}</span><span>${activeItem.wear_count} 次穿着</span><span>${html(dateLabel(activeItem.last_worn_at))}</span></div>
      ${activeItem.description ? `<p class="wardrobe-detail-description">${html(activeItem.description)}</p>` : ""}
      <dl>${activeItem.fit_note ? `<div><dt>合身记录</dt><dd>${html(activeItem.fit_note)}</dd></div>` : ""}<div><dt>季节</dt><dd>${html(activeItem.seasons.join(" · ") || "未标记")}</dd></div><div><dt>场景</dt><dd>${html(activeItem.occasions.join(" · ") || "未标记")}</dd></div></dl>
      <div class="wardrobe-tags">${[...activeItem.color_tags, ...activeItem.style_tags].map((tag) => `<span>${html(tag)}</span>`).join("")}</div>
      <footer><button type="button" data-detail-edit>编辑</button><button type="button" class="primary" data-detail-wear>今天穿它</button></footer>`;
  }

  async function toggleFavorite(item) {
    const next = !item.is_favorite;
    const result = await repository.updateItem(item.id, { is_favorite: next, updated_at: new Date().toISOString() });
    const saved = normalizeItem(resultData(result, { ...item, is_favorite: next }));
    items = items.map((entry) => entry.id === item.id ? saved : entry);
    activeItem = activeItem?.id === saved.id ? saved : activeItem;
    saveCache();
    render();
    if (detail.open) renderDetail();
  }

  async function recordWear(item) {
    const now = new Date();
    const wornOn = now.toISOString().slice(0, 10);
    const [logResult, updateResult] = await Promise.all([
      repository.insertWearLog({ id: uid(), wardrobe_item_id: item.id, worn_on: wornOn, note: "" }),
      repository.updateItem(item.id, { wear_count: item.wear_count + 1, last_worn_at: now.toISOString(), updated_at: now.toISOString() }),
    ]);
    resultData(logResult, null);
    const saved = normalizeItem(resultData(updateResult, { ...item, wear_count: item.wear_count + 1, last_worn_at: now.toISOString() }));
    items = items.map((entry) => entry.id === item.id ? saved : entry);
    activeItem = saved;
    saveCache();
    render();
    if (detail.open) renderDetail();
    notify("今天的穿着已记下", { kind: "success" });
    await onExperience("wardrobeWear");
  }

  async function removeItem(item) {
    const confirmed = await confirmAction({ eyebrow: "移出衣柜", title: `删除“${item.name}”？`, message: "衣服卡和穿着记录会删除，上传的照片也会从云端移除。", confirmLabel: "删除", danger: true });
    if (!confirmed) return;
    resultData(await repository.removeItem(item.id), []);
    for (const image of item.images) {
      for (const path of [image.path, image.thumbnailPath]) if (path) await deleteAsset(path).catch(() => {});
    }
    items = items.filter((entry) => entry.id !== item.id);
    saveCache();
    render();
    editor.close();
    detail.close();
    notify("衣服卡已删除", { kind: "success" });
  }

  function renderLocations() {
    const host = locationDialog.querySelector("[data-wardrobe-location-list]");
    host.innerHTML = locations.length ? locations.map((location) => {
      if (editingLocationId === location.id) {
        return `<article class="editing" data-location-row="${html(location.id)}">
          <form data-location-edit-form>
            <label>位置名称<input name="name" maxlength="50" required value="${html(location.name)}" /></label>
            <label>具体说明<input name="note" maxlength="100" value="${html(location.note || "")}" placeholder="比如：左侧第二格" /></label>
            <div><button type="button" data-location-edit-cancel>取消</button><button type="submit" class="primary">保存</button></div>
          </form>
        </article>`;
      }
      return `<article data-location-row="${html(location.id)}"><div><strong>${html(location.name)}</strong><p>${html(location.note || "没有补充说明")}</p><small>${items.filter((item) => item.location_id === location.id).length} 件衣服</small></div><button type="button" data-location-rename>编辑</button><button type="button" data-location-delete aria-label="删除位置">删除</button></article>`;
    }).join("") : `<p class="wardrobe-location-empty">还没有位置。先添加“主卧衣柜”“玄关衣帽架”之类的实际位置吧。</p>`;
  }

  async function addLocation(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    if (!name) return;
    const record = resultData(await repository.insertLocation({ id: uid(), name, note: form.elements.note.value.trim(), sort_order: locations.length, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }), null);
    locations.push(record);
    form.reset();
    saveCache();
    renderLocations();
    render();
  }

  async function updateLocation(event, location) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    if (!name) return;
    const note = form.elements.note.value.trim();
    const updated = resultData(await repository.updateLocation(location.id, { name, note, updated_at: new Date().toISOString() }), { ...location, name, note });
    locations = locations.map((entry) => entry.id === location.id ? updated : entry);
    editingLocationId = "";
    saveCache();
    renderLocations();
    render();
  }

  async function removeLocation(location) {
    const count = items.filter((item) => item.location_id === location.id).length;
    const confirmed = await confirmAction({ eyebrow: "删除收纳位置", title: `删除“${location.name}”？`, message: count ? `这里的 ${count} 件衣服会变成“还没标位置”，衣服本身不会删除。` : "衣服本身不会受到影响。", confirmLabel: "删除位置", danger: true });
    if (!confirmed) return;
    resultData(await repository.removeLocation(location.id), []);
    locations = locations.filter((entry) => entry.id !== location.id);
    items = items.map((item) => item.location_id === location.id ? { ...item, location_id: null } : item);
    if (currentLocation === location.id) currentLocation = "all";
    saveCache();
    renderLocations();
    render();
  }

  function openRandom() {
    randomDialog.querySelector("[data-random-wearer]").innerHTML = `<option value="all">全家都可以</option>${familyOptions().replace('<option value="">家庭共用</option>', "")}`;
    drawRandom();
    randomDialog.showModal();
  }

  function drawRandom() {
    const wearer = randomDialog.querySelector("[data-random-wearer]").value || "all";
    const selectedSeason = randomDialog.querySelector("[data-random-season]").value || "all";
    const occasion = randomDialog.querySelector("[data-random-occasion]").value || "all";
    let candidates = items.filter((item) => item.status === "available");
    if (wearer !== "all") candidates = candidates.filter((item) => !item.wearer_user_id || item.wearer_user_id === wearer);
    if (selectedSeason !== "all") candidates = candidates.filter((item) => !item.seasons.length || item.seasons.includes("四季") || item.seasons.includes(selectedSeason));
    if (occasion !== "all") candidates = candidates.filter((item) => !item.occasions.length || item.occasions.includes(occasion));
    candidates.sort((a, b) => new Date(a.last_worn_at || 0) - new Date(b.last_worn_at || 0));
    const pool = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const host = randomDialog.querySelector("[data-random-result]");
    if (!picked) {
      host.innerHTML = `<div class="wardrobe-random-empty"><h3>暂时没有符合条件的衣服</h3><p>调整季节或场景，再转一次。</p></div>`;
      return;
    }
    host.innerHTML = `<article class="wardrobe-random-result">${imageCollage(picked.images, picked.name)}<div><small>${html(typeName(picked.item_type))} · ${html(picked.category)}</small><h3>${html(picked.name)}</h3><p><span aria-hidden="true">⌂</span>${html(locationName(picked.location_id))}</p><p>${html(dateLabel(picked.last_worn_at))}</p><footer><button type="button" data-random-again>换一套</button><button type="button" class="primary" data-random-wear="${html(picked.id)}">今天穿它</button></footer></div></article>`;
  }

  root.addEventListener("click", (event) => {
    const add = event.target.closest("[data-wardrobe-add]");
    if (add) return openEditor();
    if (event.target.closest("[data-wardrobe-random]")) return openRandom();
    if (event.target.closest("[data-wardrobe-manage-locations]")) { renderLocations(); locationDialog.showModal(); return; }
    const filter = event.target.closest("[data-location-filter]");
    if (filter) { currentLocation = filter.dataset.locationFilter; render(); return; }
    const favorite = event.target.closest("[data-wardrobe-favorite]");
    if (favorite) { event.stopPropagation(); void toggleFavorite(items.find((item) => item.id === favorite.dataset.wardrobeFavorite)); return; }
    const card = event.target.closest("[data-wardrobe-item]");
    if (card) openDetail(items.find((item) => item.id === card.dataset.wardrobeItem));
  });
  root.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-wardrobe-item]")) {
      event.preventDefault();
      openDetail(items.find((item) => item.id === event.target.dataset.wardrobeItem));
    }
  });
  root.querySelector("[data-wardrobe-search]").addEventListener("input", (event) => { search = event.target.value; render(); });
  root.querySelector("[data-wardrobe-category]").addEventListener("change", (event) => { category = event.target.value; render(); });
  root.querySelector("[data-wardrobe-season]").addEventListener("change", (event) => { season = event.target.value; render(); });
  root.querySelector("[data-wardrobe-status]").addEventListener("change", (event) => { status = event.target.value; render(); });
  root.querySelector("[data-wardrobe-favorites]").addEventListener("click", (event) => { favoritesOnly = !favoritesOnly; event.currentTarget.setAttribute("aria-pressed", String(favoritesOnly)); event.currentTarget.textContent = favoritesOnly ? "♥" : "♡"; render(); });

  editor.querySelector("[data-wardrobe-file-input]").addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
  editor.querySelector("[data-wardrobe-url-add]").addEventListener("click", () => addPendingUrl(editor.querySelector("[data-wardrobe-url]").value));
  editor.addEventListener("paste", (event) => {
    if (!editor.open) return;
    const files = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith("image/"));
    if (files.length) { event.preventDefault(); addFiles(files); return; }
    const text = event.clipboardData?.getData("text/plain")?.trim();
    if (/^https?:\/\//i.test(text || "") && event.target !== editor.querySelector("[data-wardrobe-url]")) { event.preventDefault(); addPendingUrl(text); }
  });
  editor.querySelector("[data-wardrobe-media-previews]").addEventListener("change", (event) => {
    const row = event.target.closest("[data-media-id]");
    if (!row || !event.target.matches("[data-media-role]")) return;
    const groups = { stored: editorImages, file: pendingFiles, url: pendingUrls };
    const entry = groups[row.dataset.mediaKind]?.find((image) => image.id === row.dataset.mediaId);
    if (entry) entry.role = event.target.value;
  });
  editor.querySelector("[data-wardrobe-media-previews]").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-media]");
    if (!remove) return;
    const row = remove.closest("[data-media-id]");
    if (row.dataset.mediaKind === "stored") {
      const found = editorImages.find((image) => image.id === row.dataset.mediaId);
      if (found) removedPaths.push(found.path, found.thumbnailPath);
      editorImages = editorImages.filter((image) => image.id !== row.dataset.mediaId);
    } else if (row.dataset.mediaKind === "file") {
      const found = pendingFiles.find((image) => image.id === row.dataset.mediaId);
      if (found?.preview) { URL.revokeObjectURL(found.preview); objectUrls.delete(found.preview); }
      pendingFiles = pendingFiles.filter((image) => image.id !== row.dataset.mediaId);
    } else pendingUrls = pendingUrls.filter((image) => image.id !== row.dataset.mediaId);
    renderMediaPreviews();
  });
  editor.querySelector("[data-wardrobe-editor-form]").addEventListener("submit", saveItem);
  editor.querySelector("[data-wardrobe-delete]").addEventListener("click", () => activeItem && void removeItem(activeItem));
  editor.addEventListener("close", resetEditorMedia);

  detail.addEventListener("click", (event) => {
    if (event.target.closest("[data-detail-prev]") && detailIndex > 0) { detailIndex -= 1; renderDetail(); }
    if (event.target.closest("[data-detail-next]") && detailIndex < activeItem.images.length - 1) { detailIndex += 1; renderDetail(); }
    const thumb = event.target.closest("[data-detail-index]");
    if (thumb) { detailIndex = Number(thumb.dataset.detailIndex); renderDetail(); }
    if (event.target.closest("[data-detail-edit]")) { detail.close(); openEditor(activeItem); }
    if (event.target.closest("[data-detail-favorite]")) void toggleFavorite(activeItem);
    if (event.target.closest("[data-detail-wear]")) void recordWear(activeItem);
    if (event.target.closest("[data-open-locations]")) { renderLocations(); locationDialog.showModal(); }
  });
  let detailTouchX = 0;
  detail.addEventListener("touchstart", (event) => { detailTouchX = event.touches[0]?.clientX || 0; }, { passive: true });
  detail.addEventListener("touchend", (event) => {
    const delta = (event.changedTouches[0]?.clientX || 0) - detailTouchX;
    if (Math.abs(delta) < 55) return;
    if (delta < 0 && detailIndex < activeItem.images.length - 1) detailIndex += 1;
    if (delta > 0 && detailIndex > 0) detailIndex -= 1;
    renderDetail();
  }, { passive: true });

  locationDialog.querySelector("[data-wardrobe-location-form]").addEventListener("submit", addLocation);
  locationDialog.querySelector("[data-wardrobe-location-list]").addEventListener("click", (event) => {
    const row = event.target.closest("[data-location-row]");
    if (!row) return;
    const location = locations.find((entry) => entry.id === row.dataset.locationRow);
    if (event.target.closest("[data-location-rename]")) { editingLocationId = location.id; renderLocations(); }
    if (event.target.closest("[data-location-edit-cancel]")) { editingLocationId = ""; renderLocations(); }
    if (event.target.closest("[data-location-delete]")) void removeLocation(location);
  });
  locationDialog.querySelector("[data-wardrobe-location-list]").addEventListener("submit", (event) => {
    const form = event.target.closest("[data-location-edit-form]");
    if (!form) return;
    const row = form.closest("[data-location-row]");
    const location = locations.find((entry) => entry.id === row?.dataset.locationRow);
    if (location) void updateLocation(event, location);
  });
  randomDialog.addEventListener("change", (event) => { if (event.target.closest(".wardrobe-random-filters")) drawRandom(); });
  randomDialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-random-again]")) drawRandom();
    const wear = event.target.closest("[data-random-wear]");
    if (wear) void recordWear(items.find((item) => item.id === wear.dataset.randomWear));
  });

  return {
    load,
    refresh: () => load({ force: true }),
    clear() {
      loaded = false;
      loading = false;
      items = [];
      locations = [];
      wearLogs = [];
      render();
    },
    destroy() {
      resetEditorMedia();
      [editor, detail, locationDialog, randomDialog].forEach((dialog) => dialog.remove());
    },
  };
}

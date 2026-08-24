import { composeDiaryStoredNote } from "./media-metadata.js";
import { escapeHtml, formatDateTime, formatFileSize } from "./ui-formatters.js";

export function createDataSafetyController({
  elements,
  state,
  r2UploadEndpoint,
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
}) {
  const els = elements;

  async function downloadFamilyBackup() {
    if (!state.session) return;
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
    if (!state.session) {
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
    if (!state.session?.access_token || !key) return;
    try {
      const endpoint = r2UploadEndpoint.replace(/\/+$/, "");
      const response = await fetch(`${endpoint}/api/backups/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${state.session.access_token}` },
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
        list.innerHTML = '<p class="settings-empty">每天凌晨自动生成，保留最近 7 天的备份。</p>';
        return;
      }
      list.innerHTML = backups.slice(0, 7).map((backup) => `
        <button class="cloud-backup-item" type="button" data-backup-key="${escapeHtml(backup.key)}">
          <span>${escapeHtml(String(backup.key).split("/").pop().replace(/^d1-|\.backup$/g, ""))}</span>
          <strong>${formatFileSize(backup.size)}<small>下载解密副本</small></strong>
        </button>`).join("");
      list.querySelectorAll("[data-backup-key]").forEach((button) => {
        button.addEventListener("click", () => downloadCloudBackup(button.dataset.backupKey));
      });
    } catch (error) {
      const latest = document.querySelector("#latestBackupStatus");
      if (latest) latest.textContent = "仅家庭创始人可以查看备份";
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
    if (!state.cloudDb || !state.session || !navigator.onLine) {
      showMiniToast("需要登录并联网后执行", { kind: "error" });
      return;
    }
    const button = document.querySelector("#backfillThumbnailsButton");
    if (button) button.disabled = true;
    let completed = 0;
    const limit = 20;
    const toast = showMiniToast("正在补齐旧图缩略图…", { kind: "loading", persist: true, placement: "center" });
    try {
      for (const photo of state.photos.filter((item) => item.user_id === state.session.user.id)) {
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
      for (const item of state.secretItems.filter((entry) => entry.userId === state.session.user.id)) {
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
      nav.addEventListener("click", () => setActiveSettingsSection("settingsSafety"));
      settingsNav.append(nav);
    }
    if (document.querySelector("#settingsSafety")) return;
    const group = document.createElement("section");
    group.className = "settings-group settings-safety";
    group.id = "settingsSafety";
    group.hidden = true;
    group.innerHTML = `
      <p class="kicker">Backup & Recycle Bin</p><h3>数据安全</h3>
      <div class="trash-head"><div><strong>每日云端备份</strong><small>每天凌晨 03:20（日本时间）生成 1 份，自动保留最近 7 天</small><em id="latestBackupStatus">正在读取最近备份…</em></div><div class="backup-head-actions"><button type="button" data-refresh-backups aria-label="刷新备份">↻</button><button type="button" data-create-backup>立即备份</button></div></div>
      <div class="cloud-backup-list" id="cloudBackupList"></div>
      <button id="backfillThumbnailsButton" type="button"><span>优化旧图片</span><strong>每次为最多 20 张旧图生成列表缩略图</strong></button>
      <div class="trash-head"><div><strong>最近删除</strong><small>日记、秘藏、菜谱、心愿、周末计划、纪念日和留言保留 30 天</small></div><button type="button" data-refresh-trash aria-label="刷新回收站">↻</button></div>
      <div class="trash-items" id="trashItemsList"></div>`;
    content.append(group);
    group.querySelector("#backfillThumbnailsButton").addEventListener("click", backfillLegacyThumbnails);
    group.querySelector("[data-refresh-backups]").addEventListener("click", renderCloudBackups);
    group.querySelector("[data-create-backup]").addEventListener("click", createCloudBackupNow);
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
      diagnosticRow("登录凭据", state.session ? "已保留" : "未登录", state.session ? "ok" : "warn", state.session?.offline_only ? "当前为离线只读身份" : "可访问家庭云端"),
      diagnosticRow("日记图片", `${diaryHits.cached}/${diaryHits.total}`, diaryHits.total && diaryHits.cached === diaryHits.total ? "ok" : "warn", `${formatFileSize(stats.diaryBytes)} 已缓存`),
      diagnosticRow("秘藏图片", `${secretHits.cached}/${secretHits.total}`, secretHits.total && secretHits.cached === secretHits.total ? "ok" : "warn", `${formatFileSize(stats.secretBytes)} 已缓存`),
      diagnosticRow("上传队列", `${queued.length} 项`, queued.length ? "warn" : "ok", queued.length ? "联网后可在上传中心重试" : "没有等待上传的内容"),
      diagnosticRow("持久存储", persisted ? "已授权" : "由系统管理", persisted ? "ok" : "warn", persisted ? "系统会尽量避免回收缓存" : "空间紧张时浏览器可能回收缓存"),
      diagnosticRow("首屏可交互", interactiveMs ? `${interactiveMs} ms` : "等待采样", !interactiveMs || interactiveMs < 1800 ? "ok" : interactiveMs < 3200 ? "warn" : "bad", "当前设备本次打开的 DOM 可交互时间"),
      diagnosticRow("长列表负载", `${renderedCards} 个卡片`, renderedCards <= 40 ? "ok" : "warn", "屏幕外卡片已启用浏览器跳过渲染"),
      diagnosticRow("图片解码", pendingImages ? `${pendingImages} 张等待` : "已稳定", pendingImages < 6 ? "ok" : "warn", "手机首屏仅优先加载前两张日记图片"),
      diagnosticRow("网络策略", connection?.saveData ? "省流量" : (connection?.effectiveType || "自动"), connection?.saveData ? "ok" : "ok", "移动端不会在后台预热后续原图"),
      diagnosticRow("同步防重", state.photosLoadPromise || state.notificationsLoadPromise || state.secretLoadPromise ? "同步中" : "空闲", "ok", "重复切页和前台恢复会复用同一次请求"),
    ].join("");
  }
  
  async function renderUploadCenter() {
    const list = document.querySelector("#uploadCenterList");
    if (!list) return;
    const queued = await getQueuedDiaryUploads().catch(() => []);
    const active = [...state.activeUploadTasks.values()];
    const status = document.querySelector("#uploadCenterStatus");
    if (status) {
      status.textContent = active.length
        ? `${active.length} 个图片任务处理中`
        : isDiaryUploadQueueProcessing()
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
  
  
  return {
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
  };
}

import {
  DEFAULT_SECRET_PHOTO_TAG,
  FAVORITE_SECRET_PHOTO_TAG,
  normalizeSecretImages,
  normalizeSecretPhotoTags,
} from "./secret-domain.js?v=20260810-004";
import { escapeHtml } from "./ui-formatters.js";

export function buildSecretFolderListMarkup({ folders = [], activeFolderId = "", defaultFolderId = "" }) {
  return folders.map((folder) => `
    <button class="${activeFolderId === folder.id ? "active" : ""} ${!folder.virtual && defaultFolderId === folder.id ? "is-default" : ""} ${folder.isFavorites ? "is-favorites" : ""} ${folder.isAll ? "is-all" : ""}" type="button" data-secret-folder="${escapeHtml(folder.id)}" title="${folder.virtual ? (folder.isFavorites ? "查看所有已收藏照片" : "查看全部相册") : "右键可设为秘藏默认入口或删除文件夹"}">
      <i class="secret-folder-glyph" aria-hidden="true"></i>
      <span><strong>${escapeHtml(folder.name)}</strong><small>${folder.isFavorites ? `${folder.count} 张照片` : `${folder.count} 个相册${!folder.virtual && defaultFolderId === folder.id ? " · 默认入口" : ""}`}</small></span>
    </button>
  `).join("");
}

export function buildSecretFolderOptions(folders = []) {
  return `<option value="">不放入文件夹</option>${folders
    .map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`)
    .join("")}`;
}

export function buildSecretCategoryOptions(tags = []) {
  return tags
    .filter((tag) => tag !== "全部")
    .map((tag) => `<option value="${escapeHtml(tag)}"></option>`)
    .join("");
}

export function buildSecretFilterMarkup(tagCounts = [], activeFilter = "全部") {
  return tagCounts.map(({ tag, count = 0 }) => `
    <button class="${tag === activeFilter ? "active" : ""}" type="button" data-secret-filter="${escapeHtml(tag)}">
      <span>${escapeHtml(tag)}</span><small>${count}</small>
    </button>
  `).join("");
}

export function buildSecretFavoritesMarkup(entries = []) {
  const albumCount = new Set(entries.map(({ item }) => item.id)).size;
  return `
    <section class="secret-favorites-view">
      <header class="secret-collection-header">
        <div>
          <p class="kicker">FAVORITES</p>
          <h3>收藏夹</h3>
          <p>${entries.length ? `${entries.length} 张照片 · 来自 ${albumCount} 个相册` : "还没有收藏照片，点开照片后选择收藏即可"}</p>
        </div>
      </header>
      ${entries.length
        ? `<div class="secret-album-grid secret-favorites-grid">
            ${entries.map(({ item, image }, index) => `
              <button class="secret-album-photo" type="button" data-secret-favorite-photo="${index}">
                <img class="secret-progressive-image" src="${escapeHtml(image.thumbnail_url || image.image_url)}" data-full-src="${escapeHtml(image.image_url)}" alt="${escapeHtml(item.title || "收藏照片")}" loading="lazy" decoding="async" />
                <small class="secret-photo-tag">${escapeHtml(item.title || "未命名相册")} · ${escapeHtml(normalizeSecretPhotoTags(image).slice(0, 2).join(" · "))}</small>
                <strong class="secret-photo-favorite">♥</strong>
              </button>
            `).join("")}
          </div>`
        : `<div class="empty">收藏后，照片会自动出现在这里。</div>`}
    </section>
  `;
}

export function bindSecretFavoritesActions(container, entries, onOpen) {
  container.querySelectorAll("[data-secret-favorite-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = entries[Number(button.dataset.secretFavoritePhoto)];
      if (entry) onOpen(entry, button);
    });
  });
}

export function bindSecretFilterActions(container, onSelect) {
  container.querySelectorAll("[data-secret-filter]").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.secretFilter || "全部"));
  });
}

export function buildSecretCollectionMarkup({
  activeFolderName = "全部相册",
  activeFolder = null,
  visible = [],
  getLinkedTitle = () => "",
}) {
  const albumCards = visible.map((item, index) => {
    const images = normalizeSecretImages(item.images);
    const cover = item.coverImage || images[0]?.image_url || "";
    const mosaicImages = [cover, ...images.map((image) => image.thumbnail_url || image.image_url)]
      .filter((url, imageIndex, urls) => url && urls.indexOf(url) === imageIndex)
      .slice(0, 3);
    const linkedTitle = getLinkedTitle(item.linkedPhotoId);
    return `
      <article class="secret-card" data-secret-album-card="${escapeHtml(item.id)}">
        <button class="secret-cover" type="button" data-secret-index="${index}">
          <span class="secret-cover-mosaic secret-cover-mosaic-${Math.max(1, mosaicImages.length)}">
            ${mosaicImages.length
              ? mosaicImages.map((url, mosaicIndex) => `<img src="${escapeHtml(url)}" alt="${mosaicIndex === 0 ? escapeHtml(item.title || item.category || "相册封面") : ""}" loading="lazy" decoding="async" />`).join("")
              : `<i aria-hidden="true">Empty</i>`}
          </span>
          <span class="secret-cover-count">${String(images.length).padStart(2, "0")}</span>
        </button>
        <div class="secret-card-copy">
          <div><p class="kicker">ALBUM</p><h3>${escapeHtml(item.title || "未命名相册")}</h3></div>
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
          ${linkedTitle ? `<small>关联：${escapeHtml(linkedTitle)}</small>` : ""}
          <div class="secret-card-sort">
            <button type="button" data-secret-album-move="${escapeHtml(item.id)}:-1" aria-label="向前移动相册" title="向前移动" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-secret-album-move="${escapeHtml(item.id)}:1" aria-label="向后移动相册" title="向后移动" ${index === visible.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
  const photoCount = visible.reduce((total, item) => total + normalizeSecretImages(item.images).length, 0);
  return `
    <header class="secret-collection-header">
      <div>
        <p class="kicker">Collection</p>
        <h3>${escapeHtml(activeFolderName)}</h3>
        <p>${visible.length ? `${visible.length} 个相册，${photoCount} 件展品` : "这里还没有相册"}</p>
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
}

export function bindSecretCollectionActions({
  container,
  items = [],
  mobile = false,
  onCreate,
  onRename,
  onDelete,
  onMoveToFolder,
  onContextMenu,
  onOpen,
  onMove,
}) {
  container.querySelectorAll("[data-secret-create-album]").forEach((button) => {
    button.addEventListener("click", onCreate);
  });
  container.querySelector("[data-secret-folder-rename]")?.addEventListener("click", onRename);
  container.querySelector("[data-secret-folder-delete]")?.addEventListener("click", onDelete);
  container.querySelectorAll("[data-secret-index]").forEach((button) => {
    let longPressTimer = null;
    let longPressTriggered = false;
    const item = items[Number(button.dataset.secretIndex)];
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
        onMoveToFolder(item);
      }, 480);
    });
    button.addEventListener("pointerup", clearLongPress);
    button.addEventListener("pointercancel", clearLongPress);
    button.addEventListener("pointerleave", clearLongPress);
    button.addEventListener("contextmenu", (event) => {
      if (mobile) {
        if (longPressTriggered) event.preventDefault();
        return;
      }
      event.preventDefault();
      onContextMenu(item, event.clientX, event.clientY);
    });
    button.addEventListener("click", () => {
      if (longPressTriggered) {
        longPressTriggered = false;
        return;
      }
      onOpen(item);
    });
  });
  container.querySelectorAll("[data-secret-album-move]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const [id, direction] = String(button.dataset.secretAlbumMove || "").split(":");
      onMove(id, Number(direction) || 0, items);
    });
  });
}

export function buildSecretAlbumMarkup({
  item,
  images = [],
  displayEntries = [],
  linkedTitle = "",
  selectionMode = false,
  mobileToolsExpanded = false,
  selectedIndexes = new Set(),
  appendExpanded = false,
  albumEditing = false,
  activeFilter = "全部",
  photoSortDescending = true,
  hasNumericPhotoOrder = false,
  knownTags = [],
  selectedTags = [],
  folders = [],
  moveTargets = [],
  mobile = false,
}) {
  const validSelectedIndexes = [...selectedIndexes].filter((index) => index >= 0 && index < images.length);
  const selectedCount = validSelectedIndexes.length;
  const singleSelectedIndex = selectedCount === 1 ? validSelectedIndexes[0] : -1;
  const singleSelectedDisplayPosition = displayEntries.findIndex(({ index }) => index === singleSelectedIndex);
  const moveTargetOptions = moveTargets
    .map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.title || entry.category || "未命名相册")}</option>`)
    .join("");
  return `
    <section class="secret-album-view ${selectionMode ? "selection-active" : ""} ${selectionMode && mobileToolsExpanded ? "tools-expanded" : ""}">
      <header class="secret-album-head">
        <button class="secret-back-button" type="button" data-secret-back aria-label="返回收藏夹">←</button>
        <div class="secret-album-heading-copy">
          <p class="kicker">ALBUM</p>
          <div class="secret-album-title-row"><h3>${escapeHtml(item.title || "未命名相册")}</h3></div>
          <small>${images.length} 件展品${linkedTitle ? ` · 关联 ${escapeHtml(linkedTitle)}` : ""}</small>
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        </div>
        <div class="secret-album-actions">
          <button class="primary" type="button" data-secret-toggle-append aria-label="${appendExpanded ? "收起添加相片" : "添加相片"}">${appendExpanded ? "收起" : "+ 添加相片"}</button>
          <button type="button" data-secret-edit-album aria-label="${albumEditing ? "收起相册设置" : "相册设置"}">${albumEditing ? "收起编辑" : "相册设置"}</button>
        </div>
      </header>
      <button class="secret-mobile-back" type="button" data-secret-back aria-label="返回相册">‹ <span>返回相册</span></button>
      <div class="secret-album-toolbar ${selectionMode && mobileToolsExpanded ? "tools-expanded" : ""}">
        <div class="secret-toolbar-primary">
          ${selectionMode
            ? `<div class="secret-inspector-heading"><span>Selection</span><strong>已选 ${selectedCount} 张</strong></div><div class="secret-selection-primary-actions"><button type="button" data-secret-select-mode>取消选择</button><button class="delete-secret danger" type="button" data-secret-delete-selected ${selectedCount ? "" : "disabled"}>删除</button></div>`
            : `<button type="button" data-secret-select-mode>选择图片</button>`}
        </div>
        ${selectionMode ? `
          <div class="secret-quick-move-actions">
            <button type="button" data-secret-move="-1" title="${hasNumericPhotoOrder ? "当前相册按数字 Tag 自然顺序排列" : "前移图片"}" ${!hasNumericPhotoOrder && singleSelectedDisplayPosition > 0 ? "" : "disabled"}>前移</button>
            <button type="button" data-secret-move="1" title="${hasNumericPhotoOrder ? "当前相册按数字 Tag 自然顺序排列" : "后移图片"}" ${!hasNumericPhotoOrder && singleSelectedDisplayPosition >= 0 && singleSelectedDisplayPosition < displayEntries.length - 1 ? "" : "disabled"}>后移</button>
          </div>
          <button class="secret-tools-toggle" type="button" data-secret-tools-toggle>${mobileToolsExpanded ? "收起工具" : `编辑工具 · 已选 ${selectedCount}`}</button>
          <div class="secret-selection-actions">
            <button type="button" data-secret-select-all>${displayEntries.length && displayEntries.every(({ index }) => selectedIndexes.has(index)) ? "取消全选" : "全选"}</button>
            <button type="button" data-secret-set-cover ${singleSelectedIndex >= 0 ? "" : "disabled"}>设为封面</button>
            <div class="secret-photo-move-editor">
              <select data-secret-move-album-select ${selectedCount && moveTargetOptions ? "" : "disabled"}><option value="">移动到其它相册</option>${moveTargetOptions}</select>
              <button type="button" data-secret-move-album ${selectedCount && moveTargetOptions ? "" : "disabled"}>移动</button>
            </div>
            <div class="secret-photo-tag-editor">
              <span class="secret-editor-label">为选中照片添加 Tag</span>
              <input data-secret-photo-tag-input maxlength="32" list="secretCategoryList" placeholder="${DEFAULT_SECRET_PHOTO_TAG}" />
              <button type="button" data-secret-apply-photo-tag ${selectedCount ? "" : "disabled"}>保存 tag</button>
              ${selectedTags.length ? `<div class="secret-selected-tags">${selectedTags.map((tag) => `<button type="button" data-secret-remove-selected-tag="${escapeHtml(tag)}" title="从选中照片移除">${escapeHtml(tag)} <b>×</b></button>`).join("")}</div>` : ""}
              <div class="secret-photo-tag-picks">${knownTags.map((tag) => `<button type="button" data-secret-pick-photo-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("")}</div>
            </div>
          </div>
        ` : ""}
      </div>
      <div class="secret-album-content">
        ${albumEditing ? `
          <form class="secret-album-edit" data-secret-edit-form>
            <input data-secret-edit-title maxlength="80" value="${escapeHtml(item.title || "")}" placeholder="相册名" />
            <label class="secret-sort-setting"><span>照片顺序</span>
              <select data-secret-edit-sort title="${hasNumericPhotoOrder ? "存在数字 Tag 时，始终优先按编号从大到小显示" : "设置没有数字 Tag 的照片顺序"}">
                <option value="desc" ${photoSortDescending ? "selected" : ""}>新到旧 · 倒序</option>
                <option value="asc" ${photoSortDescending ? "" : "selected"}>旧到新 · 正序</option>
              </select>
              ${hasNumericPhotoOrder ? `<small>数字 Tag 已优先按自然顺序排列：1、2……9、10……99</small>` : ""}
            </label>
            <select data-secret-edit-folder><option value="" ${item.folderId ? "" : "selected"}>不放入文件夹</option>${folders.map((folder) => `<option value="${escapeHtml(folder.id)}" ${item.folderId === folder.id ? "selected" : ""}>${escapeHtml(folder.name)}</option>`).join("")}</select>
            <textarea data-secret-edit-note rows="2" placeholder="备注">${escapeHtml(item.note || "")}</textarea>
            <div><button class="primary" type="submit">保存相册</button><button type="button" data-secret-edit-cancel>取消</button><button class="danger" type="button" data-secret-delete-current>删除相册</button></div>
            ${moveTargetOptions ? `<div class="secret-album-merge"><span><strong>移动整个相册</strong><small>全部图片将并入目标相册，完成后删除当前空相册。</small></span><select data-secret-merge-target><option value="">选择目标相册</option>${moveTargetOptions}</select><button class="danger" type="button" data-secret-merge-album>移动并合并</button></div>` : ""}
          </form>
        ` : ""}
        ${appendExpanded ? `
          <form class="secret-append-panel" data-secret-append-form>
            <textarea data-secret-append-links rows="3" placeholder="粘贴图片链接，每行一个"></textarea>
            <label class="secret-append-files"><span>选择图片</span><input data-secret-append-files type="file" accept="image/*" multiple /></label>
            <div class="secret-append-actions"><button class="primary" type="submit">添加到相册</button>${linkedTitle ? `<button type="button" data-secret-open-linked>打开关联日记</button>` : ""}</div>
          </form>
        ` : linkedTitle ? `<button class="secret-linked-button" type="button" data-secret-open-linked>打开关联日记</button>` : ""}
        <button class="secret-back-top" type="button" data-secret-back-top aria-label="回到秘藏相册顶部">↑</button>
        <div class="secret-photo-filter-row">
          <button class="secret-photo-sort" type="button" data-secret-photo-sort aria-label="按上传时间排序">${photoSortDescending ? "新到旧" : "旧到新"} <span>${photoSortDescending ? "↓" : "↑"}</span></button>
          ${!["全部", DEFAULT_SECRET_PHOTO_TAG, FAVORITE_SECRET_PHOTO_TAG].includes(activeFilter) ? `<button class="secret-delete-tag" type="button" data-secret-delete-tag>删除当前 tag</button>` : ""}
        </div>
        <div class="secret-album-grid">
          ${displayEntries.map(({ image, index }) => `
            <button class="secret-album-photo ${selectionMode ? "selectable" : ""} ${selectedIndexes.has(index) ? "selected" : ""} ${Number(image.width) && Number(image.height) && Number(image.height) / Number(image.width) > 1.65 ? "is-long" : ""}" type="button" data-secret-photo="${index}">
              <img class="secret-progressive-image" src="${escapeHtml(mobile ? (image.thumbnail_url || image.image_url) : image.image_url)}" data-full-src="${escapeHtml(image.image_url)}" alt="${escapeHtml(item.title || item.category || "秘藏图片")} ${index + 1}" loading="lazy" decoding="async" />
              <small class="secret-photo-tag">${escapeHtml(normalizeSecretPhotoTags(image).slice(0, 2).join(" · "))}</small>
              ${image.favorite ? `<strong class="secret-photo-favorite">♥</strong>` : ""}
              ${selectionMode ? `<span>${selectedIndexes.has(index) ? "已选" : String(index + 1).padStart(2, "0")}</span>` : ""}
            </button>
          `).join("") || `<div class="empty">这个 tag 下还没有照片。</div>`}
        </div>
      </div>
    </section>
  `;
}

export function bindSecretAlbumActions({
  container,
  selectionMode = false,
  selectedIndexes = new Set(),
  handlers,
}) {
  container.querySelectorAll("[data-secret-back]").forEach((button) => button.addEventListener("click", handlers.back));
  container.querySelector("[data-secret-toggle-append]")?.addEventListener("click", handlers.toggleAppend);
  container.querySelector("[data-secret-merge-album]")?.addEventListener("click", () => {
    handlers.merge(container.querySelector("[data-secret-merge-target]")?.value || "");
  });
  container.querySelector("[data-secret-edit-album]")?.addEventListener("click", handlers.toggleEdit);
  container.querySelector("[data-secret-edit-cancel]")?.addEventListener("click", handlers.cancelEdit);
  container.querySelector("[data-secret-edit-form]")?.addEventListener("submit", handlers.saveEdit);
  container.querySelector("[data-secret-append-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    handlers.append({
      files: Array.from(form.querySelector("[data-secret-append-files]")?.files || []),
      linksText: form.querySelector("[data-secret-append-links]")?.value || "",
      form,
    });
  });
  container.querySelector("[data-secret-append-files]")?.addEventListener("click", (event) => {
    event.currentTarget.value = "";
  });
  container.querySelector("[data-secret-append-files]")?.addEventListener("change", (event) => {
    const files = Array.from(event.currentTarget.files || []);
    if (files.length) handlers.append({ files, form: event.currentTarget.closest("[data-secret-append-form]") });
  });
  container.querySelector("[data-secret-append-form]")?.addEventListener("paste", (event) => {
    const files = handlers.getClipboardFiles(event);
    if (!files.length) return;
    event.preventDefault();
    handlers.append({ files, form: event.currentTarget });
  });
  container.querySelector("[data-secret-open-linked]")?.addEventListener("click", handlers.openLinked);
  container.querySelector("[data-secret-delete-current]")?.addEventListener("click", handlers.deleteCurrent);
  container.querySelector("[data-secret-photo-sort]")?.addEventListener("click", (event) => handlers.toggleSort(event.currentTarget));
  container.querySelector("[data-secret-delete-tag]")?.addEventListener("click", handlers.deleteTag);
  container.querySelector("[data-secret-select-mode]")?.addEventListener("click", handlers.toggleSelection);
  container.querySelector("[data-secret-tools-toggle]")?.addEventListener("click", handlers.toggleTools);
  container.querySelector("[data-secret-select-all]")?.addEventListener("click", handlers.toggleSelectAll);
  container.querySelector("[data-secret-delete-selected]")?.addEventListener("click", handlers.deleteSelected);
  container.querySelector("[data-secret-set-cover]")?.addEventListener("click", handlers.setCover);
  container.querySelector("[data-secret-move-album]")?.addEventListener("click", () => {
    handlers.moveToAlbum(container.querySelector("[data-secret-move-album-select]")?.value || "");
  });
  container.querySelector("[data-secret-apply-photo-tag]")?.addEventListener("click", () => {
    handlers.applyTag(container.querySelector("[data-secret-photo-tag-input]")?.value || "");
  });
  container.querySelectorAll("[data-secret-pick-photo-tag]").forEach((button) => {
    button.addEventListener("click", () => handlers.applyTag(button.dataset.secretPickPhotoTag || DEFAULT_SECRET_PHOTO_TAG));
  });
  container.querySelectorAll("[data-secret-remove-selected-tag]").forEach((button) => {
    button.addEventListener("click", () => handlers.removeTag(button.dataset.secretRemoveSelectedTag || ""));
  });
  container.querySelector("[data-secret-back-top]")?.addEventListener("click", handlers.backTop);
  container.querySelectorAll("[data-secret-move]").forEach((button) => {
    button.addEventListener("click", () => handlers.moveSelected(Number(button.dataset.secretMove) || 0, button));
  });
  container.querySelectorAll("[data-secret-photo]").forEach((button) => {
    let timer = null;
    let start = null;
    let triggered = false;
    const index = Number(button.dataset.secretPhoto) || 0;
    const clearLongPress = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      start = null;
    };
    button.addEventListener("pointerdown", (event) => {
      if (selectionMode || (event.pointerType === "mouse" && event.button !== 0)) return;
      clearLongPress();
      triggered = false;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
      timer = window.setTimeout(() => {
        triggered = true;
        timer = null;
        start = null;
        if (navigator.vibrate) navigator.vibrate(18);
        handlers.enterSelection(index);
      }, 450);
    });
    button.addEventListener("pointermove", (event) => {
      if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) clearLongPress();
    });
    button.addEventListener("pointerup", clearLongPress);
    button.addEventListener("pointercancel", clearLongPress);
    button.addEventListener("pointerleave", clearLongPress);
    button.addEventListener("dragstart", (event) => event.preventDefault());
    button.addEventListener("contextmenu", (event) => {
      if (selectionMode || triggered) event.preventDefault();
    });
    button.addEventListener("click", () => {
      if (triggered) {
        triggered = false;
        return;
      }
      handlers.selectPhoto(index, button, selectedIndexes.has(index));
    });
  });
}

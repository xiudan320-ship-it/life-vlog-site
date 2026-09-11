import { renderListIcon } from "./list-icons.js";
import {
  CATEGORIES,
  IMAGE_ROLES,
  ITEM_TYPES,
  OCCASIONS,
  SEASONS,
  STATUSES,
  dateLabel,
  statusName,
  typeName,
} from "./wardrobe-domain.js";

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mediaUrl(image) {
  return image?.thumbnailUrl || image?.url || "";
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

export function renderWardrobeShell(root) {
  root.innerHTML = `
    <header class="wardrobe-head">
      <div>
        <p class="kicker">My Wardrobe</p>
        <h1 data-page-heading="wardrobe">衣柜</h1>
        <p>把试穿照、搭配和收纳位置放在一起，出门前少找十分钟。</p>
      </div>
      <div class="wardrobe-head-actions">
        <button class="wardrobe-random-button" type="button" data-wardrobe-random><span aria-hidden="true">${renderListIcon("refresh")}</span>今天穿什么</button>
        <button class="wardrobe-add-button" type="button" data-wardrobe-add><span aria-hidden="true">${renderListIcon("plus")}</span>添加衣服</button>
      </div>
    </header>
    <section class="wardrobe-overview" aria-label="衣柜概况">
      <div><small>收录</small><strong data-wardrobe-count>0</strong><span>件</span></div>
      <div><small>可穿</small><strong data-wardrobe-ready>0</strong><span>件</span></div>
      <div><small>搭配</small><strong data-wardrobe-outfits>0</strong><span>套</span></div>
      <div><small>位置</small><strong data-wardrobe-locations>0</strong><span>处</span></div>
    </section>
    <section class="wardrobe-toolbar">
      <label class="wardrobe-search"><span aria-hidden="true">${renderListIcon("search")}</span><input type="search" data-wardrobe-search placeholder="搜索衣服、颜色或风格" /></label>
      <select data-wardrobe-category aria-label="按分类筛选"><option value="all">全部分类</option>${CATEGORIES.map((value) => `<option>${value}</option>`).join("")}</select>
      <select data-wardrobe-season aria-label="按季节筛选"><option value="all">全部季节</option>${SEASONS.map((value) => `<option>${value}</option>`).join("")}</select>
      <select data-wardrobe-status aria-label="按状态筛选">${[["all", "全部状态"], ...STATUSES].map(([value, label]) => `<option value="${value}"${value === "available" ? " selected" : ""}>${label}</option>`).join("")}</select>
      <button class="wardrobe-favorite-filter" type="button" data-wardrobe-favorites aria-pressed="false" aria-label="只看收藏">${renderListIcon("heart")}</button>
    </section>
    <div class="wardrobe-location-bar">
      <div class="wardrobe-location-chips" data-wardrobe-location-chips></div>
      <button type="button" data-wardrobe-manage-locations aria-label="管理衣服放置区域">管理位置</button>
    </div>
    <p class="wardrobe-status" data-wardrobe-status-line aria-live="polite"></p>
    <section class="wardrobe-grid" data-wardrobe-grid aria-live="polite"></section>
  `;
}

function createDialog(documentTarget, className, content) {
  const node = documentTarget.createElement("dialog");
  node.className = className;
  node.innerHTML = content;
  documentTarget.body.appendChild(node);
  node.addEventListener("click", (event) => {
    if (event.target === node) node.close();
  });
  node.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => node.close()));
  return node;
}

export function createWardrobeDialogs({ documentTarget = globalThis.document } = {}) {
  const editor = createDialog(documentTarget, "wardrobe-editor-dialog", `
    <form class="wardrobe-editor" data-wardrobe-editor-form>
      <header class="wardrobe-dialog-head"><div><p class="kicker">Wardrobe Card</p><h2 data-wardrobe-editor-title>添加衣服</h2><p>一件衣服可以保存多张试穿和细节照片。</p></div><button type="button" data-close aria-label="关闭">×</button></header>
      <div class="wardrobe-editor-layout">
        <section class="wardrobe-media-editor">
          <div class="wardrobe-drop" data-wardrobe-drop>
            <input class="native-file-input" id="wardrobeFileInput" type="file" accept="image/*" multiple data-wardrobe-file-input />
            <label class="wardrobe-file-trigger" for="wardrobeFileInput">
              ${renderListIcon("plus", "ui-icon-inline")}<strong>选择或粘贴照片</strong><small>支持多张，上传时自动压缩</small>
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

  const detail = createDialog(documentTarget, "wardrobe-detail-dialog", `
    <article class="wardrobe-detail">
      <button class="wardrobe-detail-close" type="button" data-close aria-label="关闭">×</button>
      <section class="wardrobe-detail-media">
        <div class="wardrobe-detail-stage" data-wardrobe-detail-stage></div>
        <div class="wardrobe-detail-thumbs" data-wardrobe-detail-thumbs></div>
      </section>
      <section class="wardrobe-detail-copy" data-wardrobe-detail-copy></section>
    </article>`);

  const locationDialog = createDialog(documentTarget, "wardrobe-location-dialog", `
    <section class="wardrobe-location-panel">
      <header class="wardrobe-dialog-head"><div><p class="kicker">Storage Map</p><h2>衣服放在哪里</h2><p>位置会同步给家庭成员，之后可以随时改名。</p></div><button type="button" data-close aria-label="关闭">×</button></header>
      <form data-wardrobe-location-form><input name="name" maxlength="50" required placeholder="例如：主卧衣柜 · 上层" /><input name="note" maxlength="100" placeholder="可选：靠左的收纳箱" /><button type="submit" class="primary">添加位置</button></form>
      <div class="wardrobe-location-list" data-wardrobe-location-list></div>
    </section>`);

  const randomDialog = createDialog(documentTarget, "wardrobe-random-dialog", `
    <section class="wardrobe-random-panel">
      <header class="wardrobe-dialog-head"><div><p class="kicker">Outfit Roulette</p><h2>今天穿什么</h2><p>优先抽很久没穿过、并且现在可穿的衣服。</p></div><button type="button" data-close aria-label="关闭">×</button></header>
      <div class="wardrobe-random-filters"><select data-random-wearer></select><select data-random-season><option value="all">不限季节</option>${SEASONS.map((value) => `<option>${value}</option>`).join("")}</select><select data-random-occasion><option value="all">不限场景</option>${OCCASIONS.map((value) => `<option>${value}</option>`).join("")}</select></div>
      <div data-random-result></div>
    </section>`);

  return { editor, detail, locationDialog, randomDialog };
}

export function renderWardrobeOverview(root, items, locations) {
  root.querySelector("[data-wardrobe-count]").textContent = items.length;
  root.querySelector("[data-wardrobe-ready]").textContent = items.filter((item) => item.status === "available").length;
  root.querySelector("[data-wardrobe-outfits]").textContent = items.filter((item) => item.item_type === "outfit").length;
  root.querySelector("[data-wardrobe-locations]").textContent = locations.length;
}

export function renderWardrobeLocationChips(root, items, locations, currentLocation) {
  const host = root.querySelector("[data-wardrobe-location-chips]");
  host.innerHTML = `<button type="button" class="${currentLocation === "all" ? "active" : ""}" data-location-filter="all">全部位置 <small>${items.length}</small></button>${locations.map((location) => `<button type="button" class="${currentLocation === location.id ? "active" : ""}" data-location-filter="${html(location.id)}">${html(location.name)} <small>${items.filter((item) => item.location_id === location.id).length}</small></button>`).join("")}`;
}

export function renderWardrobeGrid(root, visibleItems, { totalItems, locationName, memberFor }) {
  const grid = root.querySelector("[data-wardrobe-grid]");
  if (!visibleItems.length) {
    grid.innerHTML = `<div class="wardrobe-empty"><span aria-hidden="true">${renderListIcon("plus")}</span><h2>${totalItems ? "没有符合条件的衣服" : "从第一件试穿照开始"}</h2><p>${totalItems ? "换个筛选条件看看。" : "记录试穿照、搭配和收纳位置，以后找起来会轻松很多。"}</p><button type="button" data-wardrobe-add>添加衣服</button></div>`;
    return;
  }
  grid.innerHTML = visibleItems.map((item) => {
    const member = memberFor(item.wearer_user_id);
    return `<article class="wardrobe-card" data-wardrobe-item="${html(item.id)}" tabindex="0">
      ${imageCollage(item.images, item.name)}
      <div class="wardrobe-card-copy">
        <div class="wardrobe-card-overline"><span>${html(typeName(item.item_type))} · ${html(item.category)}</span><button type="button" data-wardrobe-favorite="${html(item.id)}" aria-label="${item.is_favorite ? "取消收藏" : "收藏"}" aria-pressed="${item.is_favorite}">${renderListIcon("heart")}</button></div>
        <h2>${html(item.name)}</h2>
        <p class="wardrobe-card-location"><span aria-hidden="true">${renderListIcon("home")}</span>${html(locationName(item.location_id))}</p>
        <footer><span class="wardrobe-status-pill" data-status="${html(item.status)}">${html(statusName(item.status))}</span><span>${member ? html(member.username) : "家庭衣柜"}</span><span>${item.wear_count} 次</span></footer>
      </div>
    </article>`;
  }).join("");
}

export function renderWardrobeFamilyOptions(selected, session, familyMembers) {
  const members = [...familyMembers];
  if (session?.user?.id && !members.some((member) => member.user_id === session.user.id)) {
    members.unshift({ user_id: session.user.id, username: session.user.user_metadata?.username || "我" });
  }
  return `<option value="">家庭共用</option>${members.map((member) => `<option value="${html(member.user_id)}"${member.user_id === selected ? " selected" : ""}>${html(member.username || "家庭成员")}</option>`).join("")}`;
}

export function renderWardrobeLocationOptions(selected, locations) {
  return `<option value="">暂未标记</option>${locations.map((location) => `<option value="${html(location.id)}"${location.id === selected ? " selected" : ""}>${html(location.name)}</option>`).join("")}`;
}

export function renderWardrobeMediaPreviews(editor, editorImages, pendingFiles, pendingUrls) {
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

export function renderWardrobeDetail(detail, activeItem, { detailIndex, member, locationName, locationCount }) {
  const images = activeItem.images.filter((image) => image.url);
  const activeImage = images[detailIndex];
  detail.querySelector("[data-wardrobe-detail-stage]").innerHTML = activeImage
    ? `<button type="button" data-detail-prev aria-label="上一张" ${detailIndex <= 0 ? "disabled" : ""}>‹</button><img src="${html(activeImage.url)}" alt="${html(activeItem.name)}" /><span>${detailIndex + 1} / ${images.length}</span><button type="button" data-detail-next aria-label="下一张" ${detailIndex >= images.length - 1 ? "disabled" : ""}>›</button>`
    : `<div class="wardrobe-empty-art"><span>衣</span><small>还没有照片</small></div>`;
  detail.querySelector("[data-wardrobe-detail-thumbs]").innerHTML = images.map((image, index) => `<button type="button" class="${index === detailIndex ? "active" : ""}" data-detail-index="${index}"><img src="${html(mediaUrl(image))}" alt="${html(IMAGE_ROLES.find(([key]) => key === image.role)?.[1] || "照片")}" /></button>`).join("");
  detail.querySelector("[data-wardrobe-detail-copy]").innerHTML = `
      <div class="wardrobe-detail-overline"><span>${html(typeName(activeItem.item_type))} · ${html(activeItem.category)}</span><button type="button" data-detail-favorite aria-label="收藏" aria-pressed="${activeItem.is_favorite}">${renderListIcon("heart", "ui-icon-inline")} ${activeItem.is_favorite ? "已收藏" : "收藏"}</button></div>
      <h2>${html(activeItem.name)}</h2>
      <div class="wardrobe-find-it"><small>收纳位置</small><strong>${html(locationName(activeItem.location_id))}</strong>${locationCount ? "" : `<button type="button" data-open-locations>添加位置</button>`}</div>
      <div class="wardrobe-detail-meta"><span>${html(statusName(activeItem.status))}</span><span>${member ? html(member.username) : "家庭共用"}</span><span>${activeItem.wear_count} 次穿着</span><span>${html(dateLabel(activeItem.last_worn_at))}</span></div>
      ${activeItem.description ? `<p class="wardrobe-detail-description">${html(activeItem.description)}</p>` : ""}
      <dl>${activeItem.fit_note ? `<div><dt>合身记录</dt><dd>${html(activeItem.fit_note)}</dd></div>` : ""}<div><dt>季节</dt><dd>${html(activeItem.seasons.join(" · ") || "未标记")}</dd></div><div><dt>场景</dt><dd>${html(activeItem.occasions.join(" · ") || "未标记")}</dd></div></dl>
      <div class="wardrobe-tags">${[...activeItem.color_tags, ...activeItem.style_tags].map((tag) => `<span>${html(tag)}</span>`).join("")}</div>
      <footer><button type="button" data-detail-edit>编辑</button><button type="button" class="primary" data-detail-wear>今天穿它</button></footer>`;
}

export function renderWardrobeLocations(locationDialog, locations, items, editingLocationId) {
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

export function renderWardrobeRandomResult(randomDialog, picked, locationName) {
  const host = randomDialog.querySelector("[data-random-result]");
  if (!picked) {
    host.innerHTML = `<div class="wardrobe-random-empty"><h3>暂时没有符合条件的衣服</h3><p>调整季节或场景，再转一次。</p></div>`;
    return;
  }
  host.innerHTML = `<article class="wardrobe-random-result">${imageCollage(picked.images, picked.name)}<div><small>${html(typeName(picked.item_type))} · ${html(picked.category)}</small><h3>${html(picked.name)}</h3><p><span aria-hidden="true">${renderListIcon("home")}</span>${html(locationName(picked.location_id))}</p><p>${html(dateLabel(picked.last_worn_at))}</p><footer><button type="button" data-random-again>换一套</button><button type="button" class="primary" data-random-wear="${html(picked.id)}">今天穿它</button></footer></div></article>`;
}

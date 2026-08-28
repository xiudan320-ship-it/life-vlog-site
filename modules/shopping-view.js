import {
  filterShoppingItems,
  getShoppingStats,
  sortShoppingItems,
} from "./shopping-domain.js";
import { renderListIcon } from "./list-icons.js";
import { captureListFocus, restoreListFocus } from "./list-render-feedback.js";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `¥${amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}.${values.month}.${values.day}`;
}

function renderImage(item, name, escapeHtml) {
  if (!item.imageUrl) {
    return `<span class="shopping-card-placeholder" aria-hidden="true">${renderListIcon("bag")}</span>`;
  }
  return `<button class="shopping-card-image-button" type="button" data-shopping-image="${escapeHtml(item.imageUrl)}" data-shopping-image-alt="${name}" aria-label="查看${name}大图">
    <img src="${escapeHtml(item.imageUrl)}" alt="${name}" loading="lazy" />
  </button>`;
}

function renderCard(item, { canManageItem, escapeHtml }) {
  const manageable = canManageItem(item);
  const name = escapeHtml(item.name || "未命名商品");
  const price = formatPrice(item.price);
  const note = item.note ? `<p class="shopping-card-note">${escapeHtml(item.note)}</p>` : "";
  const link = item.link
    ? `<a class="shopping-card-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">查看商品链接 ${renderListIcon("external", "list-icon-inline")}</a>`
    : "";
  const completedLabel = item.completed ? "已购买" : "未完成";

  return `
    <article class="shopping-card${item.completed ? " completed" : ""}" data-shopping-id="${escapeHtml(item.id)}" data-shopping-detail="true" aria-label="${name}，${completedLabel}">
      <div class="shopping-card-swipe-actions" aria-hidden="true">
        ${manageable ? `<button type="button" data-shopping-swipe-action="toggle">${item.completed ? "取消完成" : "完成"}</button><button type="button" data-shopping-swipe-action="delete">删除</button>` : ""}
      </div>
      <div class="shopping-card-main">
        <div class="shopping-card-image">${renderImage(item, name, escapeHtml)}</div>
        <div class="shopping-card-body">
          <h3>${name}</h3>
          ${price ? `<strong class="shopping-card-price">${price}</strong>` : ""}
          ${note}
          ${link}
          <time datetime="${escapeHtml(item.createdAt || "")}">${formatDate(item.createdAt)} 加入</time>
        </div>
        ${manageable ? `<div class="shopping-card-tools">
          <button class="shopping-menu-button" type="button" data-shopping-menu="${escapeHtml(item.id)}" aria-label="更多操作" aria-haspopup="menu">${renderListIcon("more")}</button>
          <button class="shopping-check-button${item.completed ? " is-complete" : ""}" type="button" data-toggle-shopping="${escapeHtml(item.id)}" aria-label="${item.completed ? "取消已购买" : "标记为已购买"}" aria-pressed="${String(item.completed)}">${renderListIcon("check")}</button>
        </div>` : ""}
      </div>
    </article>`;
}

export function renderShoppingDetail(item, { escapeHtml }) {
  const name = escapeHtml(item.name || "未命名商品");
  const image = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" alt="${name}" />`
    : `<span class="shopping-detail-placeholder" aria-hidden="true">${renderListIcon("bag")}</span>`;
  const price = formatPrice(item.price);
  return `
    <div class="shopping-detail-image">${image}</div>
    <div class="shopping-detail-copy">
      <p class="shopping-detail-status">${item.completed ? "已购买" : "想买清单"}</p>
      <h2>${name}</h2>
      ${price ? `<strong class="shopping-card-price">${price}</strong>` : ""}
      ${item.note ? `<p class="shopping-detail-note">${escapeHtml(item.note)}</p>` : ""}
      ${item.link ? `<a class="shopping-detail-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">打开商品链接 ${renderListIcon("external", "list-icon-inline")}</a>` : ""}
      <time datetime="${escapeHtml(item.createdAt || "")}">${formatDate(item.createdAt)} 加入</time>
    </div>`;
}

export function renderShoppingItems({
  listElement,
  filtersElement,
  openCountElement,
  doneCountElement,
  summaryElement,
  items,
  activeFilter,
  signedIn,
  dataState,
  canManageItem,
  escapeHtml,
}) {
  const focusSnapshot = captureListFocus(listElement);
  const finishRender = () => restoreListFocus(listElement, focusSnapshot);
  const stats = getShoppingStats(items);
  openCountElement.textContent = String(stats.open);
  doneCountElement.textContent = String(stats.done);
  if (summaryElement) {
    summaryElement.textContent = `${stats.all} 件商品 · ${stats.done} 件已完成`;
  }

  filtersElement.querySelectorAll("[data-shopping-filter]").forEach((button) => {
    const selected = button.dataset.shoppingFilter === activeFilter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  if (!signedIn) {
    listElement.innerHTML = `<div class="shopping-empty"><span class="shopping-empty-icon" aria-hidden="true">${renderListIcon("bag")}</span><strong>登录后开始记录想买的东西</strong></div>`;
    finishRender();
    return;
  }
  if (dataState === "loading") {
    listElement.innerHTML = `<div class="shopping-empty"><span class="shopping-empty-icon is-loading" aria-hidden="true">${renderListIcon("loader")}</span><strong>正在读取购物车</strong></div>`;
    finishRender();
    return;
  }

  const visibleItems = sortShoppingItems(filterShoppingItems(items, activeFilter));
  if (!visibleItems.length) {
    const message = items.length
      ? activeFilter === "done"
        ? "还没有已经买到的商品。"
        : "待购买清单已经完成啦。"
      : "购物车还是空的，把想买的东西放进来吧。";
    listElement.innerHTML = `<div class="shopping-empty"><span class="shopping-empty-icon" aria-hidden="true">${renderListIcon("bag")}</span><strong>${message}</strong><button class="shopping-empty-add" type="button" data-add-shopping>添加商品</button></div>`;
    finishRender();
    return;
  }

  listElement.innerHTML = visibleItems.map((item) => renderCard(item, { canManageItem, escapeHtml })).join("");
  finishRender();
}

import { escapeHtml } from "./ui-formatters.js";
import {
  filterWishlistItems,
  getWishlistStats,
  normalizeWishlistFilter,
  sortWishlistItems,
} from "./wishlist-domain.js";
import { renderListIcon } from "./list-icons.js";

export function getWishPriorityRank(priority) {
  if (priority === "一定要做") return 3;
  if (priority === "想尽快") return 2;
  return 1;
}

export function compareWishesByPriority(a, b) {
  const priorityDifference = getWishPriorityRank(b.priority) - getWishPriorityRank(a.priority);
  if (priorityDifference) return priorityDifference;
  const dateA = a.date ? new Date(`${a.date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  const dateB = b.date ? new Date(`${b.date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  if (dateA !== dateB) return dateA - dateB;
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

export function formatWishDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function buildWishlistView(wishes = [], activeView = "open") {
  const normalizedView = normalizeWishlistFilter(activeView);
  const stats = getWishlistStats(wishes);
  const visibleWishes = sortWishlistItems(filterWishlistItems(wishes, normalizedView));
  return {
    ...stats,
    openCount: stats.open,
    doneCount: stats.done,
    activeView: normalizedView,
    visibleWishes,
    emptyMessage: normalizedView === "done"
      ? "已完成里还没有记录。完成心愿后会放到这里。"
      : "未完成心愿已经清空。现在可以写一个新的小目标。",
  };
}

function updateTabs({ tabsElement, openCountElement, doneCountElement, activeView, view }) {
  if (openCountElement) openCountElement.textContent = String(view.open);
  if (doneCountElement) doneCountElement.textContent = String(view.done);
  tabsElement?.querySelectorAll("[data-wish-view]").forEach((button) => {
    const active = button.dataset.wishView === activeView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function renderWishImage(wish, title) {
  if (!wish.imageUrl) {
    return `<div class="wish-card-placeholder" aria-hidden="true"><span>${escapeHtml(wish.type || "心愿")}</span></div>`;
  }
  return `<button class="wish-card-image-button" type="button" data-wish-image="${escapeHtml(wish.id)}" aria-label="查看 ${title} 的完整图片">
    <img class="wish-card-image" src="${escapeHtml(wish.imageUrl)}" alt="${title}" loading="lazy" decoding="async" />
  </button>`;
}

function renderCompletionNote(wish, title) {
  if (!wish.done) return "";
  const note = wish.completionNote || "已经完成啦，之后可以编辑补上一句感想。";
  return `<div class="wish-completion-note${wish.completionNote ? "" : " empty"}" data-view-wish-detail="${escapeHtml(wish.id)}" role="button" tabindex="0" aria-label="查看 ${title} 的完成回执">
    <div class="wish-completion-header"><strong>完成回执</strong><span>查看详情 ↗</span></div>
    <p>${escapeHtml(note)}</p>
  </div>`;
}

function renderWishCards(wishes, { getAuthorName, canManageItem }) {
  return wishes.map((wish, index) => {
    const canManage = canManageItem(wish);
    const title = escapeHtml(wish.title || "未命名心愿");
    const stateText = wish.done ? "已完成" : "待实现";
    const createdDate = formatWishDate(wish.createdAt);
    const plannedDate = wish.date ? formatWishDate(wish.date) : "";
    const completedDate = wish.completedAt ? formatWishDate(wish.completedAt) : "";
    const meta = [
      createdDate ? `加入 ${createdDate}` : "",
      plannedDate ? `计划 ${plannedDate}` : "",
      completedDate ? `完成 ${completedDate}` : "",
    ].filter(Boolean);
    return `
      <article class="wish-card${wish.done ? " completed" : ""}" data-wish-id="${escapeHtml(wish.id)}" data-wish-detail="true" aria-label="${title}，${stateText}">
        <div class="wish-card-swipe-actions" aria-hidden="true">
          ${canManage ? `<button type="button" data-wish-swipe-action="toggle">${wish.done ? "改回未完成" : "完成"}</button><button type="button" data-wish-swipe-action="delete">删除</button>` : ""}
        </div>
        <div class="wish-card-main">
          <div class="wish-card-image">${renderWishImage(wish, title)}</div>
          <div class="wish-card-body">
            <div class="wish-card-kicker-row">
              <p class="kicker">${escapeHtml(wish.type || "心愿")} · ${escapeHtml(wish.priority || "普通")} · ${escapeHtml(getAuthorName(wish.userId))}</p>
              <span class="wish-state-pill ${wish.done ? "done" : "open"}">${stateText}</span>
            </div>
            <span class="wish-seq">Wish ${String(index + 1).padStart(2, "0")}</span>
            <h3>${title}</h3>
            <div class="wish-card-details">
              ${meta.length ? `<div class="wish-meta">${meta.map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</div>` : ""}
              ${wish.note ? `<p class="wish-note">${escapeHtml(wish.note)}</p>` : ""}
              ${renderCompletionNote(wish, title)}
            </div>
          </div>
          ${canManage ? `<div class="wish-card-tools">
            <button class="wish-menu-button" type="button" data-wish-menu="${escapeHtml(wish.id)}" aria-label="更多操作" aria-haspopup="menu">${renderListIcon("more")}</button>
            <button class="wish-check-button${wish.done ? " is-complete" : ""}" type="button" data-toggle-wish="${escapeHtml(wish.id)}" aria-label="${wish.done ? "取消完成" : "标记完成"}" aria-pressed="${String(wish.done)}">${renderListIcon("check")}</button>
          </div>` : ""}
        </div>
      </article>`;
  }).join("");
}

export function renderWishlist({
  listElement,
  tabsElement,
  openCountElement,
  doneCountElement,
  summaryElement,
  wishes = [],
  activeView = "open",
  signedIn = false,
  dataState = "idle",
  getAuthorName,
  canManageItem,
}) {
  if (!listElement) return null;
  const view = buildWishlistView(wishes, activeView);
  updateTabs({ tabsElement, openCountElement, doneCountElement, activeView: view.activeView, view });
  if (summaryElement) summaryElement.textContent = `${view.all} 个心愿 · ${view.done} 个已完成`;

  if (!signedIn) {
    listElement.innerHTML = `<div class="wishlist-empty"><span class="wishlist-empty-icon" aria-hidden="true">${renderListIcon("heart")}</span><strong>登录后可以记录想做、想吃、想去的事。</strong></div>`;
    return view;
  }
  if (dataState === "loading") {
    listElement.innerHTML = `<div class="wishlist-empty" data-account-sync-loading role="status"><span class="wishlist-empty-icon is-loading" aria-hidden="true">${renderListIcon("loader")}</span><strong>正在同步心愿…</strong></div>`;
    return view;
  }
  if (dataState === "error") {
    listElement.innerHTML = '<div class="wishlist-empty"><strong>心愿同步失败，请稍后刷新重试。</strong></div>';
    return view;
  }
  if (!wishes.length) {
    listElement.innerHTML = `<div class="wishlist-empty"><span class="wishlist-empty-icon" aria-hidden="true">${renderListIcon("heart")}</span><strong>还没有心愿，先写一个以后想完成的小目标。</strong><button class="wishlist-empty-add" type="button" data-add-wish>添加心愿</button></div>`;
    return view;
  }
  if (!view.visibleWishes.length) {
    const icon = view.activeView === "done" ? renderListIcon("check") : renderListIcon("heart");
    listElement.innerHTML = `<div class="wishlist-empty"><span class="wishlist-empty-icon" aria-hidden="true">${icon}</span><strong>${view.emptyMessage}</strong><button class="wishlist-empty-add" type="button" data-add-wish>添加心愿</button></div>`;
    return view;
  }
  listElement.innerHTML = renderWishCards(view.visibleWishes, { getAuthorName, canManageItem });
  return view;
}

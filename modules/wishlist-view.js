import { escapeHtml } from "./ui-formatters.js";

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
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function buildWishlistView(wishes = [], activeView = "open") {
  const openCount = wishes.filter((wish) => !wish.done).length;
  const doneCount = wishes.filter((wish) => wish.done).length;
  const visibleWishes = wishes
    .filter((wish) => (activeView === "done" ? wish.done : !wish.done))
    .sort(compareWishesByPriority);
  return {
    openCount,
    doneCount,
    visibleWishes,
    emptyMessage: activeView === "done"
      ? "已完成里还没有记录。完成心愿后会放到这里。"
      : "未完成心愿已经清空。现在可以写一个新的小目标。",
  };
}

function updateTabs({ tabsElement, openCountElement, doneCountElement, activeView, view }) {
  if (openCountElement) openCountElement.textContent = String(view.openCount);
  if (doneCountElement) doneCountElement.textContent = String(view.doneCount);
  tabsElement?.querySelectorAll("[data-wish-view]").forEach((button) => {
    const active = button.dataset.wishView === activeView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function renderWishCards(wishes, { getAuthorName, canManageItem }) {
  return wishes
    .map((wish, index) => {
      const canManage = canManageItem(wish);
      const stateText = wish.done ? "已完成" : "待实现";
      const completedDate = wish.completedAt ? formatWishDate(wish.completedAt) : "";
      const createdDate = wish.createdAt ? formatWishDate(wish.createdAt) : "";
      return `
        <article class="wish-card ${wish.done ? "done" : ""}">
          <div class="wish-card-top">
            <div class="wish-index-stack">
              <span class="wish-seq">Wish ${String(index + 1).padStart(2, "0")}</span>
              <span class="wish-state-pill ${wish.done ? "done" : "open"}">${stateText}</span>
            </div>
          </div>
          <div class="wish-card-layout">
            ${
              wish.imageUrl
                ? `<button class="wish-card-image-button" type="button" data-view-wish-image="${escapeHtml(wish.id)}" aria-label="查看 ${escapeHtml(wish.title)} 的完整图片和备注">
                    <img class="wish-card-image" src="${escapeHtml(wish.imageUrl)}" alt="${escapeHtml(wish.title)}" loading="lazy" decoding="async" />
                  </button>`
                : `<div class="wish-card-placeholder" aria-hidden="true">
                    <span>${escapeHtml(wish.type || "心愿")}</span>
                  </div>`
            }
            <div class="wish-card-content">
              <p class="kicker">${escapeHtml(wish.type)} · ${escapeHtml(wish.priority)} · ${escapeHtml(getAuthorName(wish.userId))}</p>
              <h3>${escapeHtml(wish.title)}</h3>
              <div class="wish-meta">
                ${createdDate ? `<span>添加 ${createdDate}</span>` : ""}
                ${wish.date ? `<span>计划 ${formatWishDate(wish.date)}</span>` : ""}
                ${completedDate ? `<span>完成 ${completedDate}</span>` : ""}
              </div>
              <div class="wish-card-details">
                ${wish.note ? `<p class="wish-note">${escapeHtml(wish.note)}</p>` : ""}
                ${
                  wish.done && wish.completionNote
                    ? `<div class="wish-completion-note" data-view-wish-detail="${escapeHtml(wish.id)}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(wish.title)} 的完整完成反馈">
                        <div class="wish-completion-header">
                          <strong>完成回执</strong>
                          <span>查看完整反馈</span>
                        </div>
                        <p>${escapeHtml(wish.completionNote)}</p>
                      </div>`
                    : wish.done
                      ? `<div class="wish-completion-note empty" data-view-wish-detail="${escapeHtml(wish.id)}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(wish.title)} 的完成详情">
                          <div class="wish-completion-header">
                            <strong>完成回执</strong>
                            <span>查看详情</span>
                          </div>
                          <p>已经完成啦，之后可以编辑补上一句感想。</p>
                        </div>`
                      : ""
                }
              </div>
            </div>
          </div>
          ${canManage ? `<div class="wish-actions">
            <button type="button" data-edit-wish="${escapeHtml(wish.id)}">编辑</button>
            <button class="complete" type="button" data-toggle-wish="${escapeHtml(wish.id)}">
              ${wish.done ? "取消完成" : "写完成感想"}
            </button>
            <button class="danger" type="button" data-delete-wish="${escapeHtml(wish.id)}">删除</button>
          </div>` : ""}
        </article>
      `;
    })
    .join("");
}

function bindInteractions(listElement, wishes, { onEdit, onOpen, onToggle, onDelete }) {
  const findWish = (id) => wishes.find((wish) => wish.id === id);
  listElement.querySelectorAll("button[data-edit-wish]").forEach((button) => {
    button.addEventListener("click", () => onEdit(button.dataset.editWish));
  });
  listElement.querySelectorAll("button[data-view-wish-image]").forEach((button) => {
    button.addEventListener("click", () => onOpen(findWish(button.dataset.viewWishImage)));
  });
  listElement.querySelectorAll("[data-view-wish-detail]").forEach((control) => {
    const openDetail = () => onOpen(findWish(control.dataset.viewWishDetail));
    control.addEventListener("click", openDetail);
    control.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDetail();
    });
  });
  listElement.querySelectorAll("button[data-toggle-wish]").forEach((button) => {
    button.addEventListener("click", () => onToggle(button.dataset.toggleWish));
  });
  listElement.querySelectorAll("button[data-delete-wish]").forEach((button) => {
    button.addEventListener("click", () => onDelete(button.dataset.deleteWish, button));
  });
}

export function renderWishlist({
  listElement,
  tabsElement,
  openCountElement,
  doneCountElement,
  wishes = [],
  activeView = "open",
  signedIn = false,
  dataState = "idle",
  getAuthorName,
  canManageItem,
  onEdit,
  onOpen,
  onToggle,
  onDelete,
}) {
  if (!listElement) return null;
  const view = buildWishlistView(wishes, activeView);
  updateTabs({ tabsElement, openCountElement, doneCountElement, activeView, view });

  if (!signedIn) {
    listElement.innerHTML = `<div class="empty">登录后可以记录想做、想吃、想去的事。</div>`;
    return view;
  }
  if (dataState === "loading") {
    listElement.innerHTML = `<div class="empty" data-account-sync-loading role="status">正在同步心愿…</div>`;
    return view;
  }
  if (dataState === "error") {
    listElement.innerHTML = `<div class="empty">心愿同步失败，请稍后刷新重试。</div>`;
    return view;
  }
  if (!wishes.length) {
    listElement.innerHTML = `<div class="empty">还没有心愿。先写一个以后想完成的小目标。</div>`;
    return view;
  }
  if (!view.visibleWishes.length) {
    listElement.innerHTML = `<div class="empty">${view.emptyMessage}</div>`;
    return view;
  }

  listElement.innerHTML = renderWishCards(view.visibleWishes, { getAuthorName, canManageItem });
  bindInteractions(listElement, wishes, { onEdit, onOpen, onToggle, onDelete });
  return view;
}

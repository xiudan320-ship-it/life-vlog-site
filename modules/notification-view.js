import { aggregateInteractionNotifications } from "./notification-domain.js";
import { escapeHtml, formatCommentTime, getInitial } from "./ui-formatters.js";

export function getUnreadNotificationCount(notifications = []) {
  return notifications.filter((item) => !item.is_read).length;
}

export function renderNotificationsView({
  listElement,
  badgeElement,
  notifications = [],
  getText,
  getActorName,
  getActorAvatar,
  onOpen,
  status = "idle",
  errorMessage = "",
  onRetry,
}) {
  const unread = getUnreadNotificationCount(notifications);
  if (badgeElement) {
    badgeElement.hidden = unread === 0;
    badgeElement.textContent = unread > 99 ? "99+" : String(unread);
  }
  if (!listElement) return unread;
  const itemMarkup = notifications.length
    ? aggregateInteractionNotifications(notifications)
    .slice(0, 15)
    .map((item) => {
      const actorName = getActorName(item);
      const actorAvatar = getActorAvatar(item);
      const avatar = actorAvatar
        ? `<span class="notification-avatar"><img src="${escapeHtml(actorAvatar)}" alt="" loading="lazy" decoding="async" /></span>`
        : `<span class="notification-avatar">${escapeHtml(getInitial(actorName))}</span>`;
      const stateClass = item.just_seen ? "just-seen" : item.is_read ? "" : "unread";
      return `
        <button class="notification-item ${stateClass}" type="button" data-notification-id="${escapeHtml(item.notification_id || item.id || "")}" data-notification-type="${escapeHtml(item.type || "")}" data-notification-photo="${escapeHtml(item.photo_id || "")}">
          ${avatar}
          <span>
            <strong>${escapeHtml(getText(item))}${item.just_seen ? `<em>刚看到</em>` : ""}</strong>
            ${item.body ? `<small>${escapeHtml(item.body)}</small>` : ""}
            <time>${formatCommentTime(item.created_at)}</time>
          </span>
          ${item.photo_image_url ? `<img class="notification-photo" src="${escapeHtml(item.photo_image_url)}" alt="" loading="lazy" decoding="async" />` : ""}
        </button>`;
    })
    .join("")
    : "";

  let stateMarkup = "";
  if (status === "loading") {
    stateMarkup = `
      <div class="notification-state" data-notification-state="loading" role="status" aria-live="polite">
        <strong>${notifications.length ? "正在刷新通知…" : "正在加载通知…"}</strong>
      </div>`;
  } else if (status === "error") {
    stateMarkup = `
      <div class="notification-state" data-notification-state="error" role="alert">
        <strong>通知读取失败</strong>
        <span>${escapeHtml(errorMessage || "请检查网络后重试。")}</span>
        <button type="button" data-notification-retry>重试</button>
      </div>`;
  } else if (!notifications.length) {
    stateMarkup = `
      <div class="notification-state" data-notification-state="empty" role="status">
        <span>还没有新的互动。</span>
      </div>`;
  }

  listElement.innerHTML = `${itemMarkup}${stateMarkup}`;
  listElement.querySelectorAll("[data-notification-id]").forEach((button) => {
    button.addEventListener("click", () => {
      void Promise.resolve(onOpen(button)).catch(() => undefined);
    });
  });
  listElement.querySelectorAll("[data-notification-retry]").forEach((button) => {
    button.addEventListener("click", () => {
      void Promise.resolve(onRetry?.()).catch(() => undefined);
    });
  });
  return unread;
}

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
}) {
  const unread = getUnreadNotificationCount(notifications);
  if (badgeElement) {
    badgeElement.hidden = unread === 0;
    badgeElement.textContent = unread > 99 ? "99+" : String(unread);
  }
  if (!listElement) return unread;
  if (!notifications.length) {
    listElement.innerHTML = `<div class="empty">还没有新的互动。</div>`;
    return unread;
  }

  listElement.innerHTML = aggregateInteractionNotifications(notifications)
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
    .join("");
  listElement.querySelectorAll("[data-notification-id]").forEach((button) => {
    button.addEventListener("click", () => onOpen(button));
  });
  return unread;
}

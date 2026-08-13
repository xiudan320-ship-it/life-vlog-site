export function buildNotificationText(item, actor = "有人") {
  const count = Math.max(1, Number(item?.aggregateCount) || 1);
  const countText = count > 1 ? ` ${count} 次` : "";
  if (item?.type === "diary") return `${actor} 发布了新日记`;
  if (item?.type === "thanks") return `${actor} 写了一句感谢留言`;
  if (item?.type === "favorite") return `${actor} 收藏了你的日记`;
  if (item?.type === "reply") return `${actor} 回复了你${countText}`;
  return `${actor} 评论了你的日记${countText}`;
}

export function aggregateInteractionNotifications(
  items = [],
  windowMs = 10 * 60 * 1000
) {
  const groups = [];
  const latestByKey = new Map();

  items.forEach((item) => {
    if (!["comment", "reply"].includes(item.type)) {
      groups.push({ ...item, aggregateCount: 1 });
      return;
    }

    const key = `${item.actor_id || ""}:${item.type}:${item.photo_id || ""}`;
    const createdAt = new Date(item.created_at || 0).getTime();
    const existing = latestByKey.get(key);
    const outsideWindow =
      !existing ||
      !Number.isFinite(createdAt) ||
      Math.abs(existing.latestAt - createdAt) > windowMs;

    if (outsideWindow) {
      const group = {
        ...item,
        aggregateCount: 1,
        aggregateIds: [item.notification_id || item.id],
      };
      groups.push(group);
      latestByKey.set(key, { group, latestAt: createdAt });
      return;
    }

    existing.group.aggregateCount += 1;
    existing.group.aggregateIds.push(item.notification_id || item.id);
    existing.group.is_read = Boolean(existing.group.is_read && item.is_read);
    existing.group.just_seen = Boolean(existing.group.just_seen || item.just_seen);
  });

  return groups;
}

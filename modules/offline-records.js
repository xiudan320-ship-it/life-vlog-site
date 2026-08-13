export function sanitizeDiaryRecord(photo = {}) {
  return {
    id: photo.id,
    user_id: photo.user_id,
    title: photo.title || "",
    note: photo.note || "",
    category: photo.category || "\u65e5\u5e38",
    taken_at: photo.taken_at || "",
    created_at: photo.created_at || "",
    image_path: photo.image_path || "",
    image_url: photo.image_url || "",
    width: photo.width || null,
    height: photo.height || null,
    is_public: Boolean(photo.is_public),
    is_featured: Boolean(photo.is_featured),
    is_pinned: Boolean(photo.is_pinned),
  };
}

export function sanitizeCommentRecord(comment = {}) {
  return {
    id: comment.id,
    photo_id: comment.photo_id,
    user_id: comment.user_id,
    body: comment.body || "",
    parent_id: comment.parent_id || null,
    created_at: comment.created_at || "",
  };
}

export function sanitizeSecretRecord(
  item = {},
  {
    images = [],
    defaultSortOrder = 0,
  } = {}
) {
  return {
    id: item.id,
    userId: item.userId || item.user_id || "",
    title: item.title || "",
    category: item.category || "\u672a\u5206\u7c7b",
    note: item.note || "",
    coverImage: item.coverImage || "",
    coverPath: item.coverPath || "",
    images,
    linkedPhotoId: item.linkedPhotoId || "",
    sortOrder: Number.isFinite(Number(item.sortOrder))
      ? Number(item.sortOrder)
      : defaultSortOrder,
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}

export function getStorageUsageBytes(
  storage,
  prefixes = ["life-vlog-"],
  BlobApi = globalThis.Blob
) {
  if (!storage || !BlobApi) return 0;
  let total = 0;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index) || "";
    if (!prefixes.some((prefix) => key.startsWith(prefix))) continue;
    total += new BlobApi([key, storage.getItem(key) || ""]).size;
  }
  return total;
}

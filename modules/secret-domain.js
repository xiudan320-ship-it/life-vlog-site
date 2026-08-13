export const DEFAULT_SECRET_PHOTO_TAG = "未标记";
export const STORY_SECRET_PHOTO_TAG = "故事集";
export const FAVORITE_SECRET_PHOTO_TAG = "收藏";

export function getDefaultSecretSortOrder(createdAt = "") {
  const time = new Date(createdAt || Date.now()).getTime();
  return Number.isFinite(time) ? -time : -Date.now();
}

export function sortSecretItems(items = []) {
  return [...items].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sortOrder))
      ? Number(a.sortOrder)
      : getDefaultSecretSortOrder(a.createdAt);
    const orderB = Number.isFinite(Number(b.sortOrder))
      ? Number(b.sortOrder)
      : getDefaultSecretSortOrder(b.createdAt);
    if (orderA !== orderB) return orderA - orderB;
    return (
      new Date(b.updatedAt || b.createdAt || 0) -
      new Date(a.updatedAt || a.createdAt || 0)
    );
  });
}

export function normalizeSecretPhotoTag(value) {
  const tag = String(value || "").trim();
  return tag || DEFAULT_SECRET_PHOTO_TAG;
}

export function isSecretNumericTag(value) {
  return /^\d+$/.test(String(value || "").trim());
}

export function getSecretImageNumericOrder(image) {
  const numericTags = normalizeSecretPhotoTags(image)
    .filter(isSecretNumericTag)
    .map((tag) => Number.parseInt(tag, 10))
    .filter(Number.isFinite);
  return numericTags.length ? Math.max(...numericTags) : null;
}

export function normalizeSecretPhotoTags(imageOrTags) {
  const hasTagList =
    !Array.isArray(imageOrTags) && Array.isArray(imageOrTags?.tags);
  const rawTags = Array.isArray(imageOrTags)
    ? imageOrTags
    : hasTagList
      ? imageOrTags.tags
      : [imageOrTags?.tag];
  const tags = rawTags
    .map((entry) => normalizeSecretPhotoTag(entry))
    .filter((tag) => tag && tag !== FAVORITE_SECRET_PHOTO_TAG);
  const unique = [...new Set(tags)];
  return unique.length ? unique : [DEFAULT_SECRET_PHOTO_TAG];
}

export function setSecretImageTags(image, tags) {
  const normalized = [
    ...new Set(
      (Array.isArray(tags) ? tags : [tags])
        .map((entry) => normalizeSecretPhotoTag(entry))
        .filter((tag) => tag && tag !== FAVORITE_SECRET_PHOTO_TAG)
    ),
  ];
  const nextTags = normalized.length ? normalized : [DEFAULT_SECRET_PHOTO_TAG];
  return { ...image, tag: nextTags[0], tags: nextTags };
}

export function addSecretImageTag(image, rawTag) {
  const nextTag = normalizeSecretPhotoTag(rawTag);
  const existing = normalizeSecretPhotoTags(image).filter(
    (tag) =>
      tag !== DEFAULT_SECRET_PHOTO_TAG ||
      nextTag === DEFAULT_SECRET_PHOTO_TAG
  );
  return setSecretImageTags(image, [...existing, nextTag]);
}

export function removeSecretImageTag(image, rawTag) {
  const removeTag = normalizeSecretPhotoTag(rawTag);
  return setSecretImageTags(
    image,
    normalizeSecretPhotoTags(image).filter((tag) => tag !== removeTag)
  );
}

export function secretImageHasTag(image, tag) {
  return normalizeSecretPhotoTags(image).includes(normalizeSecretPhotoTag(tag));
}

export function normalizeSecretImages(images) {
  return Array.isArray(images)
    ? images
        .map((image) => {
          const tags = normalizeSecretPhotoTags(image);
          return {
            image_url: image?.image_url || image?.url || "",
            image_path: image?.image_path || image?.path || "",
            width: image?.width ?? null,
            height: image?.height ?? null,
            thumbnail_url:
              image?.thumbnail_url ||
              image?.thumb_url ||
              image?.image_url ||
              image?.url ||
              "",
            thumbnail_path:
              image?.thumbnail_path || image?.thumb_path || "",
            tag: tags[0] || DEFAULT_SECRET_PHOTO_TAG,
            tags,
            favorite: Boolean(
              image?.favorite ||
              image?.is_favorite ||
              image?.tags?.includes?.(FAVORITE_SECRET_PHOTO_TAG)
            ),
            uploadedAt:
              image?.uploadedAt ||
              image?.uploaded_at ||
              image?.createdAt ||
              image?.created_at ||
              "",
          };
        })
        .filter((image) => image.image_url)
    : [];
}

export function getSecretImageSortTime(image, fallbackIndex = 0) {
  const value =
    image?.uploadedAt ||
    image?.uploaded_at ||
    image?.createdAt ||
    image?.created_at ||
    "";
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : fallbackIndex;
}

export function sortSecretDisplayEntries(entries, descending = true) {
  return [...entries].sort((a, b) => {
    const orderA = getSecretImageNumericOrder(a.image);
    const orderB = getSecretImageNumericOrder(b.image);
    const hasOrderA = orderA !== null;
    const hasOrderB = orderB !== null;
    if (hasOrderA && hasOrderB && orderA !== orderB) return orderA - orderB;
    if (hasOrderA !== hasOrderB) return hasOrderA ? -1 : 1;
    return descending ? b.index - a.index : a.index - b.index;
  });
}

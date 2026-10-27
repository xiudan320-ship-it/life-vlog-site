import {
  FAVORITE_SECRET_PHOTO_TAG,
  normalizeSecretImages,
  normalizeSecretPhotoTags,
  secretImageHasTag,
} from "./secret-domain.js";

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

export function getSecretPhotoSortDescending(item) {
  return item?.photoSortDescending !== false;
}

export function getSecretImageSortTime(image) {
  const value =
    image?.uploadedAt ||
    image?.uploaded_at ||
    image?.createdAt ||
    image?.created_at ||
    "";
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

export function getSecretPhotoSortMode(item) {
  return ["time", "number", "manual"].includes(item?.photoSortMode) ? item.photoSortMode : "time";
}

export function sortSecretDisplayEntries(entries, item) {
  const mode = getSecretPhotoSortMode(item);
  const descending = getSecretPhotoSortDescending(item);
  return [...entries].sort((a, b) => {
    if (mode === "manual") return a.index - b.index;
    if (mode === "time") {
      const difference = getSecretImageSortTime(a.image) - getSecretImageSortTime(b.image);
      return (descending ? -difference : difference) || a.index - b.index;
    }
    const orderA = getSecretImageNumericOrder(a.image);
    const orderB = getSecretImageNumericOrder(b.image);
    const hasOrderA = orderA !== null;
    const hasOrderB = orderB !== null;
    if (hasOrderA && hasOrderB && orderA !== orderB) return orderA - orderB;
    if (hasOrderA !== hasOrderB) return hasOrderA ? -1 : 1;
    return a.index - b.index;
  });
}

export function secretImageMatchesQuery(image, query = "") {
  const text = query.trim().toLocaleLowerCase("zh-CN");
  return !text || normalizeSecretPhotoTags(image).some((tag) => tag.toLocaleLowerCase("zh-CN").includes(text));
}

export function getSecretSearchResults(items, query, { folderId = "", favorites = false } = {}) {
  const text = query.trim().toLocaleLowerCase("zh-CN");
  const scoped = items.filter((item) => !folderId || item.folderId === folderId);
  return {
    albums: favorites ? [] : scoped.filter((item) => `${item.title || ""} ${item.note || ""}`.toLocaleLowerCase("zh-CN").includes(text)),
    photos: scoped.flatMap((item) => sortSecretDisplayEntries(normalizeSecretImages(item.images)
      .map((image, index) => ({ item, image, index }))
      .filter(({ image }) => (!favorites || image.favorite) && (secretImageMatchesQuery(image, text) || (favorites && `${item.title || ""} ${item.note || ""}`.toLocaleLowerCase("zh-CN").includes(text)))), item)),
  };
}

export function getSecretAlbumTagCounts(item) {
  const images = normalizeSecretImages(item?.images);
  const counts = new Map();
  images.forEach((image) => {
    normalizeSecretPhotoTags(image).forEach((tag) => {
      if (!isSecretNumericTag(tag)) counts.set(tag, (counts.get(tag) || 0) + 1);
    });
    if (image.favorite) {
      counts.set(FAVORITE_SECRET_PHOTO_TAG, (counts.get(FAVORITE_SECRET_PHOTO_TAG) || 0) + 1);
    }
  });
  return [
    { tag: "全部", count: images.length },
    ...[...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag, "zh-CN")),
  ];
}

export function getSecretAlbumFilterTags(item) {
  return getSecretAlbumTagCounts(item)
    .map(({ tag }) => tag)
    .filter((tag) => tag !== "全部");
}

export function imageMatchesSecretFilter(image, activeFilter) {
  if (activeFilter === "全部") return true;
  if (activeFilter === FAVORITE_SECRET_PHOTO_TAG) return Boolean(image?.favorite);
  return secretImageHasTag(image, activeFilter);
}

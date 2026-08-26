import {
  FAVORITE_SECRET_PHOTO_TAG,
  isSecretNumericTag,
  normalizeSecretImages,
  normalizeSecretPhotoTags,
  secretImageHasTag,
  sortSecretDisplayEntries as sortEntriesByAlbumOrder,
} from "./secret-domain.js?v=20260826-005";

export function getSecretPhotoSortDescending(item) {
  return item?.photoSortDescending !== false;
}

export function sortSecretDisplayEntries(entries, item) {
  return sortEntriesByAlbumOrder(entries, getSecretPhotoSortDescending(item));
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

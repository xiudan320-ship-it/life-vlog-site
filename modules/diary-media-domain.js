import { getDiaryMediaType } from "./media-metadata.js";

const URL_SCHEMES = /^(?:https?:|data:|blob:)/i;
const RELATIVE_MEDIA_URL = /^(?:\/|\.\.?\/)/;

function firstValue(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

export function isDiaryR2Path(value) {
  return String(value || "").trim().startsWith("r2:");
}

export function deriveDiaryR2Url(path, publicUrl) {
  const rawPath = String(path || "").trim();
  const base = String(publicUrl || "").replace(/\/+$/, "");
  if (!isDiaryR2Path(rawPath) || !base) return "";
  const key = rawPath.slice(3).replace(/^\/+/, "");
  if (!key) return "";
  return `${base}/${key.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

function isWorkerMediaUrl(value, workerEndpoint) {
  const url = String(value || "").trim();
  const endpoint = String(workerEndpoint || "").trim().replace(/\/+$/, "");
  return Boolean(endpoint && url && (url === endpoint || url.startsWith(`${endpoint}/`)));
}

export function resolveDiaryMediaUrl(
  value = "",
  path = "",
  { publicUrl = "", getR2PublicAssetUrl = null, resolveStoredAssetUrl = null, workerEndpoint = "" } = {},
) {
  const rawValue = String(value || "").trim();
  const rawPath = String(path || "").trim();

  // A persisted R2 path is authoritative. This branch deliberately runs
  // before any URL supplied by the Worker or a stale database projection.
  if (isDiaryR2Path(rawPath)) {
    return deriveDiaryR2Url(rawPath, publicUrl)
      || (typeof getR2PublicAssetUrl === "function" ? getR2PublicAssetUrl(rawPath) : "")
      || (typeof resolveStoredAssetUrl === "function" ? resolveStoredAssetUrl("", rawPath) : "");
  }
  if (isDiaryR2Path(rawValue)) {
    return deriveDiaryR2Url(rawValue, publicUrl)
      || (typeof getR2PublicAssetUrl === "function" ? getR2PublicAssetUrl(rawValue) : "")
      || (typeof resolveStoredAssetUrl === "function" ? resolveStoredAssetUrl(rawValue, "") : "");
  }
  if (rawPath) return "";
  if (isWorkerMediaUrl(rawValue, workerEndpoint)) return "";
  return URL_SCHEMES.test(rawValue) || RELATIVE_MEDIA_URL.test(rawValue) ? rawValue : "";
}

export function normalizeDiaryMediaImage(image = {}, options = {}) {
  const raw = image || {};
  const type = getDiaryMediaType(raw);
  const imagePath = firstValue(raw.image_path, raw.imagePath, raw.path);
  const posterPath = firstValue(raw.poster_path, raw.posterPath);
  const thumbnailPath = firstValue(raw.thumbnail_path, raw.thumbnailPath, raw.thumb_path, raw.thumbPath);
  const motionPath = firstValue(raw.motion_path, raw.motionPath);
  const videoPath = firstValue(raw.video_path, raw.videoPath);
  const imageRaw = firstValue(raw.image_url, raw.imageUrl, raw.url);
  const posterRaw = firstValue(raw.poster_url, raw.posterUrl);
  const thumbnailRaw = firstValue(raw.thumbnail_url, raw.thumbnailUrl, raw.thumb_url, raw.thumbUrl);
  const motionRaw = firstValue(raw.motion_url, raw.motionUrl);
  const videoRaw = firstValue(raw.video_url, raw.videoUrl);

  const resolve = (value, path) => resolveDiaryMediaUrl(value, path, options);
  const canonicalImage = resolve(imageRaw, imagePath);
  const canonicalPoster = resolve(posterRaw, posterPath) || canonicalImage;
  const canonicalImageWithPoster = canonicalImage || canonicalPoster;
  const canonicalThumbnail = resolve(thumbnailRaw, thumbnailPath) || canonicalImageWithPoster;
  const canonicalMotion = resolve(motionRaw, motionPath);
  const canonicalVideo = resolve(videoRaw, videoPath);

  return {
    ...raw,
    type,
    image_path: imagePath,
    image_url: canonicalImageWithPoster,
    thumbnail_path: thumbnailPath,
    thumbnail_url: canonicalThumbnail,
    poster_path: posterPath,
    poster_url: canonicalPoster || canonicalImageWithPoster,
    motion_path: motionPath,
    motion_url: canonicalMotion,
    video_path: videoPath,
    video_url: canonicalVideo,
  };
}

export function normalizeDiaryMediaImages(images = [], options = {}) {
  const seen = new Set();
  return (Array.isArray(images) ? images : [])
    .map((image) => normalizeDiaryMediaImage(image, options))
    .filter((image) => image.image_url || image.poster_url || image.motion_url || image.video_url)
    .filter((image) => {
      const key = [image.image_path, image.image_url, image.type, image.motion_path, image.video_path].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

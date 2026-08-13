const MEDIA_META_START = "<!--life-vlog-media:";
const MEDIA_META_END = "-->";
const WISH_MEDIA_META_START = "<!--life-vlog-wish-media:";
const WISH_MEDIA_META_END = "-->";
const WEEKEND_MEDIA_META_START = "<!--life-vlog-weekend-media:";
const WEEKEND_MEDIA_META_END = "-->";

function stripEmbeddedPayload(value, startMarker, endMarker) {
  const text = String(value || "");
  const start = text.indexOf(startMarker);
  if (start === -1) return text.trim();
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return text.trim();
  return `${text.slice(0, start)}${text.slice(end + endMarker.length)}`.trim();
}

function readEmbeddedPayload(value, startMarker, endMarker) {
  const text = String(value || "");
  const start = text.indexOf(startMarker);
  if (start === -1) return null;
  const payloadStart = start + startMarker.length;
  const end = text.indexOf(endMarker, payloadStart);
  if (end === -1) return null;
  try {
    return JSON.parse(decodeURIComponent(text.slice(payloadStart, end)));
  } catch {
    return null;
  }
}

function appendEmbeddedPayload(note, value, startMarker, endMarker) {
  const cleanNote = stripEmbeddedPayload(note, startMarker, endMarker);
  const payload = encodeURIComponent(JSON.stringify(value));
  return `${cleanNote}${cleanNote ? "\n\n" : ""}${startMarker}${payload}${endMarker}`;
}

export function composeDiaryStoredNote(noteText, images) {
  const cleanNote = stripDiaryMediaMetadata(noteText);
  const normalizedImages = (Array.isArray(images) ? images : []).map((image) => ({
    image_url: image.image_url,
    image_path: image.image_path || "",
    width: image.width ?? null,
    height: image.height ?? null,
    thumbnail_url: image.thumbnail_url || "",
    thumbnail_path: image.thumbnail_path || "",
  }));
  if (normalizedImages.length <= 1 && !normalizedImages[0]?.thumbnail_path) return cleanNote;
  return appendEmbeddedPayload(
    cleanNote,
    normalizedImages,
    MEDIA_META_START,
    MEDIA_META_END
  );
}

export function parseDiaryStoredImages(note) {
  const parsed = readEmbeddedPayload(note, MEDIA_META_START, MEDIA_META_END);
  return Array.isArray(parsed) ? parsed : [];
}

export function stripDiaryMediaMetadata(note) {
  return stripEmbeddedPayload(note, MEDIA_META_START, MEDIA_META_END);
}

export function composeWishStoredNote(note, imageUrl = "", imagePath = "") {
  const cleanNote = stripEmbeddedPayload(note, WISH_MEDIA_META_START, WISH_MEDIA_META_END);
  if (!imageUrl) return cleanNote;
  return appendEmbeddedPayload(
    cleanNote,
    { imageUrl, imagePath },
    WISH_MEDIA_META_START,
    WISH_MEDIA_META_END
  );
}

export function parseWishStoredNote(value) {
  const media = readEmbeddedPayload(value, WISH_MEDIA_META_START, WISH_MEDIA_META_END);
  return {
    note: stripEmbeddedPayload(value, WISH_MEDIA_META_START, WISH_MEDIA_META_END),
    imageUrl: media?.imageUrl || "",
    imagePath: media?.imagePath || "",
  };
}

export function composeWeekendStoredNote(
  note,
  images = [],
  completionNote = "",
  completionImages = [],
  completedAt = ""
) {
  const cleanNote = stripEmbeddedPayload(note, WEEKEND_MEDIA_META_START, WEEKEND_MEDIA_META_END);
  const normalized = (Array.isArray(images) ? images : []).filter((image) => image?.image_url);
  const normalizedCompletion = (Array.isArray(completionImages) ? completionImages : [])
    .filter((image) => image?.image_url);
  if (!normalized.length && !completionNote && !normalizedCompletion.length && !completedAt) return cleanNote;
  return appendEmbeddedPayload(
    cleanNote,
    {
      images: normalized,
      completionNote: String(completionNote || "").trim(),
      completionImages: normalizedCompletion,
      completedAt: completedAt || "",
    },
    WEEKEND_MEDIA_META_START,
    WEEKEND_MEDIA_META_END
  );
}

export function parseWeekendStoredNote(value) {
  const media = readEmbeddedPayload(value, WEEKEND_MEDIA_META_START, WEEKEND_MEDIA_META_END);
  return {
    note: stripEmbeddedPayload(value, WEEKEND_MEDIA_META_START, WEEKEND_MEDIA_META_END),
    images: Array.isArray(media?.images)
      ? media.images.filter((image) => image?.image_url)
      : [],
    completionNote: String(media?.completionNote || ""),
    completionImages: Array.isArray(media?.completionImages)
      ? media.completionImages.filter((image) => image?.image_url)
      : [],
    completedAt: media?.completedAt || "",
  };
}

export function extractImageUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s"'<>，。；、]+/gi) || [];
  return [...new Set(matches.map((url) => url.trim()).filter(Boolean))];
}

export function getClipboardImageUrl(clipboardData) {
  if (!clipboardData) return "";
  const uriList = clipboardData
    .getData("text/uri-list")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value && !value.startsWith("#"));
  if (uriList) return uriList;
  const plainText = clipboardData.getData("text/plain").trim();
  const plainUrl = plainText.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (plainUrl) return plainUrl;
  const html = clipboardData.getData("text/html");
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
}

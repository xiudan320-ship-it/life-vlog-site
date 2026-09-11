export const ITEM_TYPES = [
  ["item", "单件"],
  ["outfit", "整套搭配"],
];

export const CATEGORIES = ["上装", "下装", "连衣裙", "外套", "鞋", "包", "配饰", "家居服", "整套", "其他"];
export const SEASONS = ["春", "夏", "秋", "冬", "四季"];
export const OCCASIONS = ["日常", "通勤", "约会", "旅行", "运动", "正式", "居家"];
export const STATUSES = [
  ["available", "可穿"],
  ["laundry", "待清洗"],
  ["repair", "待修补"],
  ["retired", "已收起"],
];
export const IMAGE_ROLES = [
  ["cover", "封面"],
  ["front", "正面"],
  ["side", "侧面"],
  ["back", "背面"],
  ["detail", "细节"],
  ["tryon", "上身"],
  ["label", "水洗标"],
];

export function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return String(value).split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  }
}

export function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeImage(image, index = 0) {
  return {
    id: image?.id || uid(),
    url: image?.url || image?.image_url || "",
    path: image?.path || image?.image_path || "",
    thumbnailUrl: image?.thumbnailUrl || image?.thumbnail_url || image?.url || image?.image_url || "",
    thumbnailPath: image?.thumbnailPath || image?.thumbnail_path || "",
    width: Number(image?.width) || 0,
    height: Number(image?.height) || 0,
    role: image?.role || (index === 0 ? "cover" : "detail"),
    name: image?.name || `照片 ${index + 1}`,
  };
}

export function normalizeItem(item) {
  return {
    ...item,
    seasons: list(item?.seasons),
    occasions: list(item?.occasions),
    style_tags: list(item?.style_tags),
    color_tags: list(item?.color_tags),
    images: arrayValue(item?.images).map(normalizeImage),
    is_favorite: Boolean(item?.is_favorite),
    wear_count: Number(item?.wear_count) || 0,
  };
}

export function resultData(result, fallback = null) {
  if (result?.error) throw result.error;
  return result?.data ?? fallback;
}

export function statusName(value) {
  return STATUSES.find(([key]) => key === value)?.[1] || "可穿";
}

export function typeName(value) {
  return ITEM_TYPES.find(([key]) => key === value)?.[1] || "单件";
}

export function dateLabel(value) {
  if (!value) return "还没穿过";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "还没穿过";
  return `${date.getMonth() + 1}月${date.getDate()}日穿过`;
}

export function commaList(value) {
  return [...new Set(String(value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean))];
}

export function filterItems(items, {
  currentLocation = "all",
  search = "",
  category = "all",
  season = "all",
  status = "available",
  favoritesOnly = false,
} = {}) {
  const needle = search.trim().toLowerCase();
  return items.filter((item) => {
    if (currentLocation !== "all" && item.location_id !== currentLocation) return false;
    if (category !== "all" && item.category !== category) return false;
    if (season !== "all" && !item.seasons.includes(season)) return false;
    if (status !== "all" && item.status !== status) return false;
    if (favoritesOnly && !item.is_favorite) return false;
    if (!needle) return true;
    return [item.name, item.category, item.description, item.fit_note, ...item.style_tags, ...item.color_tags]
      .join(" ").toLowerCase().includes(needle);
  });
}

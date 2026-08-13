import {
  composeWeekendStoredNote,
  composeWishStoredNote,
  parseWeekendStoredNote,
  parseWishStoredNote,
} from "./media-metadata.js";
import {
  getDefaultSecretSortOrder,
  normalizeSecretImages,
} from "./secret-domain.js";

function normalizeUuid(value) {
  const candidate = String(value || "");
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      candidate
    )
  ) {
    return candidate;
  }
  return crypto.randomUUID();
}

export function recipeToCloudRow(recipe, userId) {
  return {
    id: normalizeUuid(recipe.id),
    user_id: userId,
    name: recipe.name,
    category: recipe.category || "家常菜",
    cooking_time: recipe.time || "",
    servings: recipe.servings || "",
    cover_image: recipe.coverImage || "",
    seasonings: recipe.seasonings || [],
    ingredients: recipe.ingredients || [],
    steps: recipe.steps || [],
    note: recipe.note || "",
    created_at: recipe.createdAt || new Date().toISOString(),
    updated_at: recipe.updatedAt || new Date().toISOString(),
  };
}

export function recipeFromCloudRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    time: row.cooking_time,
    servings: row.servings,
    coverImage: row.cover_image,
    seasonings: row.seasonings || [],
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function wishToCloudRow(wish, userId) {
  return {
    id: normalizeUuid(wish.id),
    user_id: userId,
    title: wish.title,
    wish_type: wish.type || "想做",
    planned_date: wish.date || null,
    priority: wish.priority || "普通",
    note: composeWishStoredNote(wish.note, wish.imageUrl, wish.imagePath),
    completion_note: wish.completionNote || "",
    is_done: Boolean(wish.done),
    completed_at: wish.completedAt || null,
    created_at: wish.createdAt || new Date().toISOString(),
    updated_at: wish.updatedAt || new Date().toISOString(),
  };
}

export function wishToLegacyCloudRow(wish, userId) {
  const row = wishToCloudRow(wish, userId);
  delete row.completion_note;
  return row;
}

export function wishFromCloudRow(row) {
  const media = parseWishStoredNote(row.note);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.wish_type,
    date: row.planned_date || "",
    priority: row.priority,
    note: media.note,
    completionNote: row.completion_note || "",
    imageUrl: media.imageUrl,
    imagePath: media.imagePath,
    done: Boolean(row.is_done),
    completedAt: row.completed_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function weekendToCloudRow(plan, userId) {
  return {
    id: normalizeUuid(plan.id),
    user_id: userId,
    title: plan.title,
    plan_date: plan.date,
    location: plan.location || "",
    plan_type: plan.type || "出门玩",
    note: composeWeekendStoredNote(
      plan.note,
      plan.images,
      plan.completionNote,
      plan.completionImages,
      plan.completedAt
    ),
    is_done: Boolean(plan.done),
    created_at: plan.createdAt || new Date().toISOString(),
    updated_at: plan.updatedAt || new Date().toISOString(),
  };
}

export function weekendFromCloudRow(row) {
  const media = parseWeekendStoredNote(row.note);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.plan_date,
    location: row.location || "",
    type: row.plan_type,
    note: media.note,
    images: media.images,
    completionNote: media.completionNote,
    completionImages: media.completionImages,
    completedAt: media.completedAt,
    done: Boolean(row.is_done),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function anniversaryToCloudRow(item, userId) {
  return {
    id: normalizeUuid(item.id),
    user_id: userId,
    title: item.title,
    event_type: item.type || "annual",
    event_date: item.date,
    note: item.note || "",
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

export function anniversaryFromCloudRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.event_type,
    date: row.event_date || "",
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function secretFromCloudRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    folderId: row.folder_id || "",
    title: row.title || "",
    category: row.category || "未分类",
    note: row.note || "",
    coverImage: row.cover_image || "",
    coverPath: row.cover_path || "",
    images: normalizeSecretImages(row.images),
    linkedPhotoId: row.linked_photo_id || "",
    photoSortDescending: row.photo_sort_descending !== 0,
    sortOrder: Number.isFinite(Number(row.sort_order))
      ? Number(row.sort_order)
      : getDefaultSecretSortOrder(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function secretToCloudRow(item, userId) {
  return {
    id: normalizeUuid(item.id),
    user_id: userId,
    folder_id: item.folderId || null,
    title: item.title || "",
    category: item.category || "未分类",
    note: item.note || "",
    cover_image: item.coverImage || item.images?.[0]?.image_url || "",
    cover_path: item.coverPath || item.images?.[0]?.image_path || "",
    images: normalizeSecretImages(item.images),
    linked_photo_id: item.linkedPhotoId || null,
    photo_sort_descending: item.photoSortDescending === false ? 0 : 1,
    sort_order: Number.isFinite(Number(item.sortOrder))
      ? Number(item.sortOrder)
      : getDefaultSecretSortOrder(item.createdAt),
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

export function secretFolderFromCloudRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name || "未命名文件夹",
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const NAVIGATION_IDS = Object.freeze([
  "gallery",
  "vlog",
  "wishlist",
  "weekend",
  "wardrobe",
  "recipes",
  "thanks",
  "secret",
]);

export const PRIMARY_NAVIGATION_DEFAULT_IDS = Object.freeze([
  "gallery",
  "vlog",
  "wishlist",
  "weekend",
  "wardrobe",
]);

export const PRIMARY_NAVIGATION_REGISTRY = Object.freeze([
  Object.freeze({
    id: "gallery",
    label: "日记",
    type: "route",
    route: "gallery",
    requiresSession: false,
    defaultEnabled: true,
    description: "生活日记",
  }),
  Object.freeze({
    id: "vlog",
    label: "VLOG",
    type: "mode",
    mode: "vlog",
    requiresSession: true,
    defaultEnabled: true,
    description: "视频日记模式",
  }),
  Object.freeze({
    id: "wishlist",
    label: "心愿",
    type: "route",
    route: "wishlist",
    requiresSession: false,
    defaultEnabled: true,
    description: "家庭心愿清单",
  }),
  Object.freeze({
    id: "weekend",
    label: "周末",
    type: "route",
    route: "weekend",
    requiresSession: false,
    defaultEnabled: true,
    description: "周末计划",
  }),
  Object.freeze({
    id: "wardrobe",
    label: "衣柜",
    type: "route",
    route: "wardrobe",
    requiresSession: false,
    defaultEnabled: true,
    description: "家庭衣柜",
  }),
  Object.freeze({
    id: "recipes",
    label: "菜谱",
    type: "route",
    route: "recipes",
    requiresSession: true,
    defaultEnabled: false,
    description: "私人菜谱",
  }),
  Object.freeze({
    id: "thanks",
    label: "留言",
    type: "route",
    route: "thanks",
    requiresSession: true,
    defaultEnabled: false,
    description: "感谢与留言",
  }),
  Object.freeze({
    id: "secret",
    label: "秘藏",
    type: "route",
    route: "secret",
    requiresSession: true,
    defaultEnabled: false,
    description: "秘密相册",
  }),
]);

const REGISTRY_BY_ID = new Map(PRIMARY_NAVIGATION_REGISTRY.map((item) => [item.id, item]));

function cloneConfig(config) {
  return {
    order: [...config.order],
    enabled: [...config.enabled],
  };
}

function normalizeIds(value) {
  const source = Array.isArray(value) ? value : [];
  const result = [];
  const seen = new Set();
  for (const id of source) {
    const normalizedId = String(id || "").trim();
    if (!REGISTRY_BY_ID.has(normalizedId) || seen.has(normalizedId)) continue;
    seen.add(normalizedId);
    result.push(normalizedId);
  }
  NAVIGATION_IDS.forEach((id) => {
    if (!seen.has(id)) result.push(id);
  });
  return result;
}

export function createDefaultPrimaryNavigationConfig() {
  return {
    order: [...NAVIGATION_IDS],
    enabled: [...PRIMARY_NAVIGATION_DEFAULT_IDS],
  };
}

export function normalizePrimaryNavigationConfig(value) {
  const defaults = createDefaultPrimaryNavigationConfig();
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const order = normalizeIds(value.order);
  const enabledSource = Array.isArray(value.enabled) ? value.enabled : defaults.enabled;
  const enabled = [];
  const seen = new Set();
  for (const id of enabledSource) {
    const normalizedId = String(id || "").trim();
    if (!REGISTRY_BY_ID.has(normalizedId) || seen.has(normalizedId)) continue;
    seen.add(normalizedId);
    enabled.push(normalizedId);
  }
  if (!seen.has("gallery")) enabled.unshift("gallery");
  return { order, enabled };
}

export function getPrimaryNavigationItem(id) {
  return REGISTRY_BY_ID.get(id) || null;
}

export function getPrimaryNavigationItems(
  config,
  { visibleOnly = false, signedIn = true, settings = false } = {}
) {
  const normalized = normalizePrimaryNavigationConfig(config);
  const enabled = new Set(normalized.enabled);
  const items = normalized.order
    .map((id) => REGISTRY_BY_ID.get(id))
    .filter(Boolean)
    .filter((item) => settings || enabled.has(item.id))
    .filter((item) => !visibleOnly || (!item.requiresSession || signedIn));
  return items;
}

export function setPrimaryNavigationEnabled(config, id, enabled) {
  const next = normalizePrimaryNavigationConfig(config);
  if (!REGISTRY_BY_ID.has(id) || id === "gallery") return next;
  const enabledIds = new Set(next.enabled);
  if (enabled) enabledIds.add(id);
  else enabledIds.delete(id);
  next.enabled = next.order.filter((itemId) => enabledIds.has(itemId));
  if (!next.enabled.includes("gallery")) next.enabled.unshift("gallery");
  return next;
}

export function movePrimaryNavigationItem(config, id, direction) {
  const next = normalizePrimaryNavigationConfig(config);
  const enabled = new Set(next.enabled);
  const visibleOrder = next.order.filter((itemId) => enabled.has(itemId));
  const currentVisibleIndex = visibleOrder.indexOf(id);
  if (currentVisibleIndex < 0) return next;
  const offset = direction === "up" || direction === -1 ? -1 : direction === "down" || direction === 1 ? 1 : 0;
  const targetVisibleIndex = currentVisibleIndex + offset;
  if (offset === 0 || targetVisibleIndex < 0 || targetVisibleIndex >= visibleOrder.length) return next;
  const currentIndex = next.order.indexOf(id);
  const targetIndex = next.order.indexOf(visibleOrder[targetVisibleIndex]);
  [next.order[currentIndex], next.order[targetIndex]] = [next.order[targetIndex], next.order[currentIndex]];
  return next;
}

export function isPrimaryNavigationEnabled(config, id) {
  return normalizePrimaryNavigationConfig(config).enabled.includes(id);
}

export function clonePrimaryNavigationConfig(config) {
  return cloneConfig(normalizePrimaryNavigationConfig(config));
}

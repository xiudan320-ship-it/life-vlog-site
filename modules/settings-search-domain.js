import { SETTINGS_ITEM_REGISTRY, SETTINGS_SECTION_REGISTRY } from "./settings-section-registry.js";

const sectionOrder = new Map(SETTINGS_SECTION_REGISTRY.map(({ id }, index) => [id, index]));

export function normalizeSettingsQuery(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function getSearchTokens(query) {
  return normalizeSettingsQuery(query).split(/\s+/).filter(Boolean);
}

function getMatchScore(item, tokens) {
  const label = normalizeSettingsQuery(item.label);
  const description = normalizeSettingsQuery(item.description);
  const keywords = (item.keywords || []).map(normalizeSettingsQuery);
  let score = 0;
  for (const token of tokens) {
    if (label === token) score += 0;
    else if (label.startsWith(token)) score += 1;
    else if (label.includes(token)) score += 2;
    else if (keywords.some((keyword) => keyword === token)) score += 3;
    else if (keywords.some((keyword) => keyword.includes(token))) score += 4;
    else if (description.includes(token)) score += 5;
    else return Number.POSITIVE_INFINITY;
  }
  return score;
}

export function querySettings(query, items = SETTINGS_ITEM_REGISTRY) {
  const tokens = getSearchTokens(query);
  if (!tokens.length) return [];
  return items
    .map((item, sourceIndex) => ({ item, sourceIndex, score: getMatchScore(item, tokens) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => (
      left.score - right.score
      || (sectionOrder.get(left.item.sectionId) ?? Number.MAX_SAFE_INTEGER)
        - (sectionOrder.get(right.item.sectionId) ?? Number.MAX_SAFE_INTEGER)
      || left.sourceIndex - right.sourceIndex
    ))
    .map(({ item }) => item);
}


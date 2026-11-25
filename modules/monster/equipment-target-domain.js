const readIds = (value) => typeof value === "string" ? JSON.parse(value) || [] : value || [];

/** Badges plus non-craftable rare equipment found in the actual loot tables. */
export function listTargetEquipment(catalog) {
  const craftable = new Set(catalog.make.map((recipe) => recipe.itemid));
  const dropped = new Set();
  for (const copy of catalog.copies) {
    for (const value of Object.values(copy.dropGroups || {})) for (const id of readIds(value)) dropped.add(id);
  }
  for (const row of catalog.trials || []) {
    if (row.itemtype === 2 && row.itemnum > 0 && row.itemweight > 0) {
      if (row.itemid) dropped.add(row.itemid);
      else for (const id of readIds(row.items)) dropped.add(id);
    }
  }
  return catalog.items.filter((item) => item.type === 2 && (item.subtype >= 9 && item.subtype <= 14
    || item.subtype >= 1 && item.subtype <= 8 && item.quality >= 5 && !craftable.has(item.id) && dropped.has(item.id)))
    .sort((left, right) => left.subtype - right.subtype || left.level - right.level || left.id - right.id);
}

export function toggleEquipmentTarget(state, catalog, id) {
  if (!listTargetEquipment(catalog).some((item) => item.id === id)) throw new RangeError("请选择徽章或特殊掉落装备");
  const targets = state.equipmentTargets || [];
  return { ...state, equipmentTargets: targets.includes(id) ? targets.filter((value) => value !== id) : [...targets, id] };
}

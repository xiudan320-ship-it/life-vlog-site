// Player::refreshPlayerAttribute (0x99c954): base growth and final core stats.
// attributes is the native aggregate tag list, after equipment/pet/potion
// collection. Collection, VIP rewards and non-core effects are separate work.
const float = Math.fround;

const coreAttributes = Object.freeze([
  ["attack", 150, 15, 1, 12],
  ["defense", 68, 6, 2, 13],
  ["maxHp", 150, 15, 3, 14],
  ["hit", 109, 10, 4, 0],
  ["dodge", 33, 3, 5, 0],
  ["crit", 41, 4, 6, 0],
  ["critHurt", 116, 11, 7, 0],
  ["resistance", 75, 7, 8, 0],
]);

/** Sum already calculated equipment tags; pets, gems and potions are separate sources. */
export function collectEquipmentAttributes(equipment) {
  const attributes = [];
  for (const item of equipment) {
    for (const attribute of [item.mainAttribute, item.secondaryAttribute, ...(item.attributes || [])]) {
      if (!attribute?.type) continue;
      const existing = attributes.find((entry) => entry.type === attribute.type);
      if (existing) existing.value = (existing.value + attribute.value) | 0;
      else attributes.push({ ...attribute });
    }
  }
  return attributes;
}

/** Recalculate core stats while preserving HP, matching refreshPlayerAttribute. */
export function recalculatePlayerFromEquipment(player, equipment) {
  return { ...player, ...calculatePlayerCoreAttributes({
    level: player.level, paragon: player.paragon, attributes: collectEquipmentAttributes(equipment),
  }) };
}

/** Calculate the eight core stats with the original default growth values. */
export function calculatePlayerCoreAttributes({ level, paragon, attributes = [] }) {
  const value = (type) => attributes.find((tag) => tag.type === type)?.value || 0;
  const effectiveLevel = (level + paragon) | 0;
  return Object.fromEntries(coreAttributes.map(([name, base, growth, flatType, percentType]) => {
    let result = (base + Math.imul(effectiveLevel, growth)) | 0;
    if (percentType) {
      const factor = float(float(float(value(percentType)) / float(100)) + float(1));
      result = Math.trunc(float(float(result) * factor));
    }
    return [name, (result + value(flatType)) | 0];
  }));
}

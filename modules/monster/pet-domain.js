const float = Math.fround;
const qualityFactors = [1, 1, 1, 1, 1.1].map(float);
const starFactors = [1, 1.2, 1.4, 1.7, 2].map(float);
const stats = [["attack", "att"], ["defense", "def"], ["maxHp", "hp"], ["hit", "hit"], ["dodge", "spo"], ["crit", "cri"], ["critHurt", "crihurt"], ["resistance", "res"]];

export function getPetLoyaltyOffset(loyalty) {
  return loyalty >= 80 ? 100 : loyalty >= 60 ? 70 : loyalty >= 30 ? 50 : 30;
}

// Pet::getGrowOffset and refreshPetAttr; defaults are the original factory's
// initial values. Loyalty/stars/growth are not yet mutable gameplay features.
export function calculatePetCore({ row, level = row.level, quality = row.quality, loyalty = 90, stars = 0, growth = 0 }) {
  if (!Number.isSafeInteger(level) || level < 1 || !Number.isInteger(quality) || quality < 1 || quality > 5 || !Number.isInteger(stars) || stars < 0 || stars > 4) throw new RangeError("宠物属性参数无效");
  const effectiveQuality = quality === 4 && growth === 100 ? 5 : quality;
  const grow = float(float(growth) / float(10));
  const growthOffset = float(float(float(qualityFactors[effectiveQuality - 1] - float(1)) + starFactors[stars]) + float(float(grow + grow) / float(100)));
  const loyaltyOffset = float(float(getPetLoyaltyOffset(loyalty)) / float(100));
  const factor = float(growthOffset * loyaltyOffset);
  return Object.fromEntries(stats.map(([key, field]) => [key, Math.trunc(float(float(float(Math.trunc(row[field])) * factor) * float(level)))]));
}

export function calculateMainPetContribution({ playerLevel, row, level = row?.level, quality = row?.quality, loyalty = 90, stars = 0, growth = 0 }) {
  if (playerLevel < 35 || !row) return [];
  const core = calculatePetCore({ row, level, quality, loyalty, stars, growth });
  const factor = float(float(getPetLoyaltyOffset(loyalty)) / float(100));
  // Player::refreshPlayerAttribute applies loyalty and truncates a second time.
  return stats.map(([key], index) => ({ type: index + 1, value: Math.trunc(float(float(core[key]) * factor)) }));
}

export function getPetSummary({ state, catalog, target }) {
  const pet = Number.isSafeInteger(target?.index) && target.index >= 0 ? state.inventory.pets[target.index] : null;
  const row = pet && catalog.pets.find((entry) => entry.id === pet.id);
  if (!pet || pet.id !== target.id || pet.type !== 3 || !row) throw new RangeError("请选择当前持有的宠物");
  const input = { row, level: pet.level, quality: pet.quality };
  return { pet, row, core: calculatePetCore(input), contribution: calculateMainPetContribution({ ...input, playerLevel: state.player.level }), selected: pet.main === true, loyalty: 90, stars: 0, growth: 0 };
}

export function collectMainPetAttributes({ state, catalog }) {
  const index = state.inventory.pets.findIndex((pet) => pet.main === true);
  return index < 0 || state.player.level < 35 ? [] : getPetSummary({ state, catalog, target: { index, id: state.inventory.pets[index].id } }).contribution;
}

export function assignMainPet({ state, catalog, target, enabled }) {
  if (state.player.level < 35) throw new RangeError("宠物在 35 级开放");
  const { selected } = getPetSummary({ state, catalog, target });
  if (typeof enabled !== "boolean" || selected === enabled) throw new RangeError(enabled ? "这只宠物已是主宠" : "这只宠物没有担任主宠");
  return { ...state, inventory: { ...state.inventory, pets: state.inventory.pets.map((pet, index) => ({ ...pet, main: enabled ? index === target.index : false })) } };
}

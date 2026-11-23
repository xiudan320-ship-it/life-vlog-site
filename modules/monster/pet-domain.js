import { spendGoods } from "./inventory-domain.js";
import { getPetCare } from "./pet-care-domain.js";

const float = Math.fround;
const qualityFactors = [1, 1, 1, 1, 1.1].map(float);
const starFactors = [1, 1.2, 1.4, 1.7, 2].map(float);
const stats = [["attack", "att"], ["defense", "def"], ["maxHp", "hp"], ["hit", "hit"], ["dodge", "spo"], ["crit", "cri"], ["critHurt", "crihurt"], ["resistance", "res"]];
export const MAX_SIDE_PETS = 4;

export function getPetLoyaltyOffset(loyalty) {
  return loyalty >= 80 ? 100 : loyalty >= 60 ? 70 : loyalty >= 30 ? 50 : 30;
}

// Pet::getGrowOffset and refreshPetAttr; defaults are the original factory's
// initial values. Stars and growth are not yet mutable gameplay features.
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

// Native side pets multiply by float32(0.3) before the second loyalty factor.
export function calculateSidePetContribution({ playerLevel, row, level = row?.level, quality = row?.quality, loyalty = 90, stars = 0, growth = 0 }) {
  if (playerLevel < 35 || !row) return [];
  const core = calculatePetCore({ row, level, quality, loyalty, stars, growth });
  const factor = float(float(getPetLoyaltyOffset(loyalty)) / float(100));
  return stats.map(([key], index) => ({ type: index + 1, value: Math.trunc(float(float(float(core[key]) * float(0.3)) * factor)) }));
}

export function getPetSummary({ state, catalog, target }) {
  const pet = Number.isSafeInteger(target?.index) && target.index >= 0 ? state.inventory.pets[target.index] : null;
  const row = pet && catalog.pets.find((entry) => entry.id === pet.id);
  if (!pet || pet.id !== target.id || pet.type !== 3 || !row) throw new RangeError("请选择当前持有的宠物");
  const { loyalty, killCount } = getPetCare(pet);
  const input = { row, level: pet.level, quality: pet.quality, loyalty };
  return { pet, row, core: calculatePetCore(input), contribution: calculateMainPetContribution({ ...input, playerLevel: state.player.level }),
    sideContribution: calculateSidePetContribution({ ...input, playerLevel: state.player.level }), selected: pet.partyRole === 1, side: pet.partyRole === 2, loyalty, killCount, stars: 0, growth: 0 };
}

export function collectPartyPetAttributes({ state, catalog }) {
  if (state.player.level < 35) return [];
  return state.inventory.pets.flatMap((pet, index) => {
    if (![1, 2].includes(pet.partyRole)) return [];
    const summary = getPetSummary({ state, catalog, target: { index, id: pet.id } });
    return pet.partyRole === 1 ? summary.contribution : summary.sideContribution;
  });
}

export function assignMainPet({ state, catalog, target, enabled }) {
  if (state.player.level < 35) throw new RangeError("宠物在 35 级开放");
  const { selected } = getPetSummary({ state, catalog, target });
  if (typeof enabled !== "boolean" || selected === enabled) throw new RangeError(enabled ? "这只宠物已是主宠" : "这只宠物没有担任主宠");
  return { ...state, inventory: { ...state.inventory, pets: state.inventory.pets.map((pet, index) => ({ ...pet,
    partyRole: enabled && index === target.index ? 1 : pet.partyRole === 1 ? 0 : pet.partyRole ?? 0 })) } };
}

export function assignSidePet({ state, catalog, target, enabled }) {
  if (state.player.level < 35) throw new RangeError("宠物在 35 级开放");
  const { side } = getPetSummary({ state, catalog, target });
  if (typeof enabled !== "boolean" || side === enabled) throw new RangeError(enabled ? "这只宠物已是副宠" : "这只宠物没有担任副宠");
  if (enabled && state.inventory.pets.filter((pet) => pet.partyRole === 2).length >= MAX_SIDE_PETS) throw new RangeError("副宠位置已满，请先卸下一只");
  return { ...state, inventory: { ...state.inventory, pets: state.inventory.pets.map((pet, index) => index === target.index
    ? { ...pet, partyRole: enabled ? 2 : 0 } : pet) } };
}

/** One spirit restores one loyalty; batching is the same transaction repeated. */
export function feedPet({ state, catalog, target, quantity }) {
  if (state.player.level < 35) throw new RangeError("宠物在 35 级开放");
  const { pet, loyalty, killCount } = getPetSummary({ state, catalog, target });
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100 - loyalty) throw new RangeError("喂养数量无效或忠诚已满");
  const inventory = spendGoods(state.inventory, [{ id: 5105, quantity }]);
  return { ...state, inventory: { ...inventory, pets: inventory.pets.map((entry, index) => index === target.index
    ? { ...pet, care: { loyalty: loyalty + quantity, killCount } } : entry) } };
}

import { getPetCare } from "./pet-care-domain.js";
import { getPetLoyaltyOffset } from "./pet-domain.js";
import { getPetTraining } from "./pet-training-domain.js";

const f = Math.fround;
const scalarEffects = { 9: "dropRate", 10: "experienceRate", 19: "goldRate", 21: "procBonus", 27: "buffResistance", 33: "hurtBonus", 40: "critResistance" };
const battleEffects = { 16: "hurtIncrease", 17: "hurtDecrease", 23: "crit", 24: "critHurt", 25: "hit", 26: "dodge" };

/** Pet factory's ordered tagAttr vector, including the normally locked third tag. */
export function getPetPassiveAttributes(row) {
  return [1, 2, 3].filter((index) => row[`skillid${index}`]).map((index) => ({
    type: row[`skillid${index}`], value: row[`skillvalue${index}`], name: row[`skill${index}name`],
  }));
}

/** Pet::getSkillPro; the native roll tests rand() % 101 against this threshold. */
export function getPetPassiveThreshold({ role, loyalty, bonus = 0, stars = 0 }) {
  if (![1, 2].includes(role)) return 0;
  const factor = f(f(f(getPetLoyaltyOffset(loyalty)) * f(f(f(bonus) / f(100)) + f(1))) / f(100));
  let chance = f(f((stars + 15) * 2) * factor);
  if (role === 2) chance = f(chance * f(0.3));
  return Math.trunc(chance);
}

/** Player::changePetAttr adds selected tags directly, without rebuilding core stats. */
export function applyPetPassiveAttributes(player, attributes) {
  const result = { ...player, bonuses: { ...player.bonuses } };
  for (const { type, value } of attributes) {
    const scalar = scalarEffects[type], battle = battleEffects[type];
    if (scalar) result[scalar] = ((result[scalar] || 0) + value) | 0;
    if (battle) result.bonuses[battle] = ((result.bonuses[battle] || 0) + value) | 0;
    if (type === 23) result.flatCrit = ((result.flatCrit || 0) + value) | 0;
  }
  return result;
}

/** Original battle UI selects main, then side tags once and holds them until exit. */
export function preparePetBattle({ prepared, state, catalog, draw }) {
  const triggered = [];
  if (state.player.level >= 35) {
    const pets = state.inventory.pets.map((pet, index) => ({ pet, index }))
      .filter(({ pet }) => pet.partyRole === 1 || pet.partyRole === 2)
      .sort((a, b) => a.pet.partyRole - b.pet.partyRole || a.index - b.index);
    for (const { pet, index } of pets) {
      const row = catalog.pets.find((entry) => entry.id === pet.id);
      if (!row) throw new RangeError(`缺少原版宠物 ${pet.id}`);
      const threshold = getPetPassiveThreshold({ role: pet.partyRole, loyalty: getPetCare(pet).loyalty, stars: getPetTraining(pet).stars, bonus: state.player.petProcBonus || 0 });
      const attributes = getPetPassiveAttributes(row);
      for (const [attributeIndex, attribute] of attributes.entries()) {
        if (attributeIndex === 2 && pet.quality !== 5) continue;
        const roll = draw();
        if (!Number.isInteger(roll) || roll < 0 || roll > 0x7fffffff) throw new RangeError("宠物助战需要有效随机数");
        if (roll % 101 < threshold) triggered.push({ ...attribute, petId: pet.id, index, role: pet.partyRole });
      }
    }
  }
  const player = applyPetPassiveAttributes(prepared.battle.allies[0], triggered);
  return { ...prepared, petPassives: triggered,
    battle: { ...prepared.battle, allies: [player], bonuses: player.bonuses, petPassives: triggered } };
}

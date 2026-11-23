import { getPetExperienceRequired } from "./progression-domain.js";

/** Pet::addExp: per-level remainder and the original level-60 stored XP. */
export function creditPetExperience({ level, experience, amount }) {
  if (!Number.isInteger(level) || level < 1 || level > 60
    || !Number.isSafeInteger(experience) || experience < 0
    || !Number.isSafeInteger(amount) || amount < 0 || experience + amount > 0x7fffffff) {
    throw new RangeError("宠物经验数据超出有效范围");
  }
  let total = experience + amount;
  while (total >= getPetExperienceRequired(level)) {
    const required = getPetExperienceRequired(level);
    level++;
    if (level > 59) return { level: 60, experience: getPetExperienceRequired(59) };
    total -= required;
  }
  return { level, experience: total };
}

/** Apply each original Player::addExp event to the assigned owned records. */
export function creditPartyPetExperience({ inventory, grants }) {
  let growth = null;
  const sideGrowth = [];
  const pets = inventory.pets.map((original, index) => {
    if (![1, 2].includes(original.partyRole)) return original;
    let progress = { level: original.level, experience: original.experience }, amount = 0;
    for (const grant of grants) {
      const credit = original.partyRole === 1 ? grant.active : grant.assist;
      progress = creditPetExperience({ ...progress, amount: credit }); amount += credit;
    }
    const result = { index, id: original.id, amount, previousLevel: original.level, ...progress };
    if (original.partyRole === 1) growth = result; else sideGrowth.push(result);
    return { ...original, ...progress };
  });
  return { inventory: growth || sideGrowth.length ? { ...inventory, pets } : inventory, growth, sideGrowth };
}

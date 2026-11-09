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

/** Apply every Player::addExp grant in order to the selected owned record only. */
export function creditMainPetExperience({ inventory, grants }) {
  const index = inventory.pets.findIndex((pet) => pet.partyRole === 1);
  if (index < 0) return { inventory, growth: null };
  const original = inventory.pets[index];
  let progress = { level: original.level, experience: original.experience }, amount = 0;
  for (const grant of grants) {
    progress = creditPetExperience({ ...progress, amount: grant.active });
    amount += grant.active;
  }
  const pet = { ...original, ...progress };
  return {
    inventory: { ...inventory, pets: inventory.pets.map((entry, ownedIndex) => ownedIndex === index ? pet : entry) },
    growth: { index, id: pet.id, amount, previousLevel: original.level, ...progress },
  };
}

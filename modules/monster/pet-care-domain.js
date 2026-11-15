// An untouched owned pet starts at the original factory's loyalty and counter.
export function getPetCare(pet) {
  return pet.care ?? { loyalty: 90, killCount: 0 };
}

/** Pet::addKillEnemyNum; overflow past the threshold is discarded. */
export function addPetKills({ type, killCount, loyalty, amount }) {
  if (!Number.isSafeInteger(type) || type < 0 || !Number.isSafeInteger(killCount) || killCount < 0
    || !Number.isSafeInteger(loyalty) || loyalty < 30 || loyalty > 100
    || !Number.isSafeInteger(amount) || amount < 0 || killCount + amount > 0x7fffffff) {
    throw new RangeError("宠物忠诚数据无效");
  }
  const total = killCount + amount;
  if (total >= (type === 1 ? 600 : 1800)) return { type, killCount: 0, loyalty: Math.max(30, loyalty - 1) };
  return { type, killCount: total, loyalty };
}

/** Victory credits the actual defeated enemy vector to the current main pet. */
export function recordMainPetKills(state, amount) {
  const index = state.inventory.pets.findIndex((pet) => pet.partyRole === 1);
  if (index < 0 || amount === 0) return state;
  const pet = state.inventory.pets[index];
  const { loyalty, killCount } = addPetKills({ type: 1, ...getPetCare(pet), amount });
  return { ...state, inventory: { ...state.inventory, pets: state.inventory.pets.map((entry, i) => i === index ? { ...entry, care: { loyalty, killCount } } : entry) } };
}

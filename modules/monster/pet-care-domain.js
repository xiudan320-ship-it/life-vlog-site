export const MAIN_PET_KILL_THRESHOLD = 600;
export const SIDE_PET_KILL_THRESHOLD = 1800;

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
  if (total >= (type === 1 ? MAIN_PET_KILL_THRESHOLD : SIDE_PET_KILL_THRESHOLD)) return { type, killCount: 0, loyalty: Math.max(30, loyalty - 1) };
  return { type, killCount: total, loyalty };
}

/** Victory credits the enemy vector to the main and each assigned side pet. */
export function recordPartyPetKills(state, amount) {
  if (amount === 0 || !state.inventory.pets.some((pet) => [1, 2].includes(pet.partyRole))) return state;
  const pets = state.inventory.pets.map((pet) => {
    if (![1, 2].includes(pet.partyRole)) return pet;
    const { loyalty, killCount } = addPetKills({ type: pet.partyRole, ...getPetCare(pet), amount });
    return { ...pet, care: { loyalty, killCount } };
  });
  return { ...state, inventory: { ...state.inventory, pets } };
}

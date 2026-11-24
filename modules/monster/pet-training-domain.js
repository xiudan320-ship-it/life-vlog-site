// Original Pet star table and factory defaults. Training is stored only once a
// pet is trained; an untrained pet has zero stars, star XP and growth.
export const PET_STAR_THRESHOLDS = Object.freeze([1, 2, 4, 6]);

export function getPetTraining(pet) {
  return pet.training ?? { stars: 0, starExperience: 0, growth: 0 };
}

/** Pet::getStarExp returns all invested star XP plus one for the pet itself. */
export function getPetStarValue(pet) {
  const { stars, starExperience } = getPetTraining(pet);
  return 1 + starExperience + PET_STAR_THRESHOLDS.slice(0, stars).reduce((sum, value) => sum + value, 0);
}

/** Pet::fuse / addStarExp and getGropExp / addGropExp. */
export function calculatePetTraining({ mode, target, donor }) {
  const training = { ...getPetTraining(target) };
  const consumed = getPetTraining(donor);
  let amount;
  if (mode === "fuse") {
    amount = getPetStarValue(donor);
    training.starExperience += amount;
    while (training.stars < 4 && training.starExperience >= PET_STAR_THRESHOLDS[training.stars]) {
      training.starExperience -= PET_STAR_THRESHOLDS[training.stars];
      training.stars += 1;
    }
    if (training.stars === 4) training.starExperience = 0;
  } else if (mode === "devour") {
    amount = Math.trunc(consumed.growth + getPetStarValue(donor) * donor.quality * 1.5);
    training.growth = Math.min(100, training.growth + amount);
  } else throw new RangeError("培养方式无效");
  const quality = target.quality === 4 && training.growth === 100 ? 5 : target.quality;
  return { quality, training, amount };
}

function ownedPet(state, target) {
  const pet = Number.isSafeInteger(target?.index) && target.index >= 0 ? state.inventory.pets[target.index] : null;
  if (!pet || pet.type !== 3 || pet.id !== target.id) throw new RangeError("宠物已变化，请重新选择");
  return pet;
}

/** Validate both owned records before displaying a preview or consuming either. */
export function previewPetTraining({ state, catalog, mode, target, donor }) {
  if (state.player.level < 35) throw new RangeError("宠物在 35 级开放");
  const chosen = ownedPet(state, target), material = ownedPet(state, donor);
  if (target.index === donor.index) throw new RangeError("不能消耗正在培养的宠物");
  if (material.partyRole === 1 || material.partyRole === 2) throw new RangeError("主宠和副宠不能作为材料");
  if (!catalog.pets.some((row) => row.id === chosen.id) || !catalog.pets.some((row) => row.id === material.id)) throw new RangeError("宠物目录不完整");
  if (material.quality > chosen.quality) throw new RangeError("材料品质不能高于目标宠物");
  if (mode === "fuse") {
    if (chosen.id !== material.id) throw new RangeError("融合需要同种宠物");
    if (getPetTraining(chosen).stars >= 4) throw new RangeError("宠物已达到 4 星");
  } else if (mode === "devour") {
    if (chosen.quality !== 4 || getPetTraining(chosen).growth >= 100) throw new RangeError("仅品质 4 且成长未满的宠物可吞噬");
  } else throw new RangeError("培养方式无效");
  const cost = mode === "fuse" ? (chosen.quality > 3 ? 300 : 100) : (chosen.quality > 3 ? chosen.quality - 1 : 1) * 30;
  return { target: chosen, donor: material, cost, result: calculatePetTraining({ mode, target: chosen, donor: material }) };
}

export function trainPet(input) {
  const { state, mode, target, donor } = input;
  const preview = previewPetTraining(input);
  if (state.money < preview.cost) throw new RangeError("魔石不足");
  const updated = { ...preview.target, quality: preview.result.quality, training: preview.result.training };
  const pets = state.inventory.pets.flatMap((pet, index) => index === donor.index ? [] : [index === target.index ? updated : pet]);
  return { state: { ...state, money: state.money - preview.cost, inventory: { ...state.inventory, pets } },
    targetIndex: target.index - (donor.index < target.index ? 1 : 0), mode, ...preview };
}

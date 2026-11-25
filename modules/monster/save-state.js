import { getPetExperienceRequired } from "./progression-domain.js";
import { MAX_EQUIPMENT_STRENGTH } from "./equipment-domain.js";
import { MAX_SIDE_PETS } from "./pet-domain.js";
import { SIDE_PET_KILL_THRESHOLD } from "./pet-care-domain.js";
import { PET_STAR_THRESHOLDS } from "./pet-training-domain.js";

export function validateMonsterSave(state) {
  const integer = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
  const player = state?.player;
  if (!player || typeof player.name !== "string" || !integer(player.level, 1) || player.level > 80
    || !integer(player.paragon, 1) || !integer(player.experience) || !integer(state.gold)
    || !Number.isSafeInteger(state.money) || !Array.isArray(player.skills)
    || !Array.isArray(player.equipmentSets) || !integer(player.equipmentSetIndex)
    || !Array.isArray(player.equipmentSets[player.equipmentSetIndex])
    || !Array.isArray(player.equippedSkillIds)
    || !["attack", "defense", "maxHp", "hp", "hit", "dodge", "crit", "critHurt", "resistance"].every((key) => integer(player[key]))
    || !state.inventory || !["equipment", "goods", "wings", "pets"].every((key) => Array.isArray(state.inventory[key]))
    || !state.progress || !integer(state.progress.chapterId, 1) || !integer(state.progress.levelId, 1)
    || !Array.isArray(state.progress.copies) || !Array.isArray(state.progress.special)) {
    throw new TypeError("游戏存档数据不完整，请保留原存档并重试。");
  }
  const mainPets = state.inventory.pets.filter((pet) => pet?.partyRole === 1);
  const sidePets = state.inventory.pets.filter((pet) => pet?.partyRole === 2);
  const equipment = [...state.inventory.equipment, ...player.equipmentSets.flat()];
  if (state.inventory.acquisitionSequence === undefined ? equipment.some((item) => item.acquisitionOrder !== undefined)
    : !integer(state.inventory.acquisitionSequence) || equipment.some((item) => item.acquisitionOrder !== undefined
      && (!integer(item.acquisitionOrder, 1) || item.acquisitionOrder > state.inventory.acquisitionSequence))) {
    throw new TypeError("装备获取顺序无效，请保留原存档并重试。");
  }
  if (state.equipmentTargets !== undefined && (!Array.isArray(state.equipmentTargets)
    || !state.equipmentTargets.every((id) => integer(id, 1)) || new Set(state.equipmentTargets).size !== state.equipmentTargets.length)) {
    throw new TypeError("装备目标数据无效，请保留原存档并重试。");
  }
  if (state.achievementProgress !== undefined) {
    const progress = state.achievementProgress;
    if (!progress || !progress.counters || typeof progress.counters !== "object" || Array.isArray(progress.counters)
      || !Object.entries(progress.counters).every(([id, value]) => /^[1-9]\d*$/.test(id) && integer(value))
      || !Array.isArray(progress.completed) || !progress.completed.every((id) => integer(id, 1))
      || new Set(progress.completed).size !== progress.completed.length || !integer(progress.points) || !integer(progress.titleId)
      || progress.purchasedTitles !== undefined && (!Array.isArray(progress.purchasedTitles)
        || !progress.purchasedTitles.every((id) => integer(id, 1)) || new Set(progress.purchasedTitles).size !== progress.purchasedTitles.length)) {
      throw new TypeError("成就存档数据无效，请保留原存档并重试。");
    }
  }
  if (equipment.some((item) => item?.subtype >= 1 && item.subtype <= 8 && (!integer(item.strength) || item.strength > MAX_EQUIPMENT_STRENGTH))) {
    throw new TypeError("装备强化数据无效，请保留原存档并重试。");
  }
  if (state.crafting !== undefined && (!state.crafting || !state.crafting.counts || typeof state.crafting.counts !== "object"
    || Array.isArray(state.crafting.counts) || !Object.entries(state.crafting.counts).every(([id, count]) => /^[1-9]\d*$/.test(id) && integer(Number(id), 1) && integer(count, 1)))) {
    throw new TypeError("打造记录不完整，请保留原存档并重试。");
  }
  if (mainPets.length > 1 || sidePets.length > MAX_SIDE_PETS || state.inventory.pets.some((pet) => pet?.partyRole !== undefined && ![0, 1, 2].includes(pet.partyRole))
    || state.inventory.pets.some((pet) => !pet || pet.type !== 3 || !integer(pet.id, 1) || !integer(pet.level, 1) || pet.level > 60
      || !integer(pet.quality, 1) || pet.quality > 5 || !integer(pet.experience)
      || pet.experience > getPetExperienceRequired(pet.level) || pet.level < 60 && pet.experience === getPetExperienceRequired(pet.level))) {
    throw new TypeError("宠物存档数据不完整，请保留原存档并重试。");
  }
  if (state.inventory.pets.some((pet) => pet.care !== undefined && (!pet.care || !integer(pet.care.loyalty, 30)
    || pet.care.loyalty > 100 || !integer(pet.care.killCount) || pet.care.killCount >= SIDE_PET_KILL_THRESHOLD))) {
    throw new TypeError("宠物忠诚存档数据不完整，请保留原存档并重试。");
  }
  if (state.inventory.pets.some((pet) => pet.training !== undefined && (!pet.training || Array.isArray(pet.training)
    || !integer(pet.training.stars) || pet.training.stars > 4 || !integer(pet.training.starExperience)
    || (pet.training.stars === 4 ? pet.training.starExperience !== 0 : pet.training.starExperience >= PET_STAR_THRESHOLDS[pet.training.stars])
    || !integer(pet.training.growth) || pet.training.growth > 100))) {
    throw new TypeError("宠物培养存档数据不完整，请保留原存档并重试。");
  }
  if (state.offlineRun !== undefined) {
    const run = state.offlineRun;
    if (!run || !integer(run.copyId, 1) || !integer(run.hard, 1) || run.hard > 6
      || !integer(run.waves, 1) || run.waves > 100 || !integer(run.startedAt, 1)
      || !integer(run.seed, 1) || run.seed > 0x7fffffff) {
      throw new TypeError("离线挂机记录无效，请保留原存档并重试。");
    }
  }
  if (state.trial !== undefined) {
    const trial = state.trial;
    const validReward = (item) => item && integer(item.id, 1) && [1, 2, 3].includes(item.type);
    if (!trial || ![1, 2, 3].includes(trial.hard) || !integer(trial.level, 1) || !integer(trial.score)
      || !["ready", "ended", "claimed"].includes(trial.status) || !trial.bestScores || typeof trial.bestScores !== "object" || Array.isArray(trial.bestScores)
      || !Object.entries(trial.bestScores).every(([hard, score]) => ["1", "2", "3"].includes(hard) && integer(score))
      || !Array.isArray(trial.rewards) || !trial.rewards.every(validReward)) {
      throw new TypeError("试炼存档数据不完整，请保留原存档并重试。");
    }
  }
  if (state.taskBoard !== undefined) {
    const board = state.taskBoard;
    if (!board || !integer(board.points) || !(board.dailyRewardDay === null || /^\d{4}-\d{2}-\d{2}$/.test(board.dailyRewardDay))
      || !Array.isArray(board.entries) || new Set(board.entries.map((entry) => entry.id)).size !== board.entries.length
      || !board.entries.every((entry) => integer(entry.id, 1) && [1, 2, 3, 11, 12, 13, 14, 15, 16, 17].includes(entry.type)
        && integer(entry.target) && integer(entry.need, 1) && integer(entry.count) && entry.count <= entry.need && [0, 1].includes(entry.claimed))) {
      throw new TypeError("任务存档数据不完整，请保留原存档并重试。");
    }
  }
  return state;
}

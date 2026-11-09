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
  if (mainPets.length > 1 || state.inventory.pets.some((pet) => pet?.partyRole !== undefined && ![0, 1].includes(pet.partyRole))
    || mainPets.some((pet) => pet.type !== 3 || !integer(pet.id, 1) || !integer(pet.level, 1) || !integer(pet.quality, 1) || pet.quality > 5 || !integer(pet.experience))) {
    throw new TypeError("主宠存档数据不完整，请保留原存档并重试。");
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

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
  return state;
}

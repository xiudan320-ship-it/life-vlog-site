import { createEnemyFromCatalog } from "./enemy-domain.js";

/** GameData::getLuckCopy uses four categories, or six at paragon difficulty. */
export function selectMapEncounter({ level, hard, copies, draw }) {
  const categories = hard > 3 ? [0, 2, 3, 4, 1, 5] : [0, 2, 3, 4];
  const category = categories[draw() % categories.length];
  let id = { 0: 4001, 1: 4002, 4: 4019, 5: 4020 }[category];
  if (category === 2 || category === 3) {
    const bucket = level > 70 && level <= 80 ? 8 : level > 60 && level <= 70 ? 7 : level > 50 && level <= 60 ? 6 : Math.trunc(level / 10);
    if (bucket <= 0) return null;
    id = (category === 2 ? 4002 : 4010) + bucket;
  }
  return copies.find((copy) => copy.id === id) || null;
}

export function createEncounterEnemy({ copy, player, catalog }) {
  const enemy = { ...createEnemyFromCatalog(catalog.enemies.find((row) => row.id === copy.enemyid1), catalog.skills), quality: 4, isDefBuff: false };
  if (enemy.id === 4320) {
    for (const key of ["level", "attack", "defense", "maxHp", "hit", "dodge", "crit", "critHurt", "resistance"]) enemy[key] = player[key];
  }
  if (enemy.id === 4321) { enemy.baseLevel = enemy.level; enemy.level = player.level; enemy.paragon = player.paragon; }
  return enemy;
}

import { applyEnemyDifficulty, applyEnemyQuality, createEnemyFromCatalog, selectRegularEnemyQuality } from "./enemy-domain.js";
import { prepareCopyDropGroups } from "./loot-domain.js";
import { getBattleQualityRewardRate } from "./reward-domain.js";
import { createEncounterEnemy, selectMapEncounter } from "./encounter-domain.js";

const float = Math.fround;
const scale = (value, factor) => Math.trunc(float(float(value) * float(factor)));

export function copyUsesParagon(copy, hard) {
  if ([1, 4].includes(copy.type)) return hard > 3;
  if ([3, 6].includes(copy.type)) return true;
  return copy.type === 2 && ((copy.id >= 2016 && copy.id <= 2029)
    || (copy.id > 2109 && copy.id <= 2129) || (copy.id > 2049 && copy.id <= 2054));
}

export function applyEnemyParagon(role, player, enabled) {
  if (!enabled || role.id === 4320) return role;
  const baseLevel = role.baseLevel || role.level;
  const levelFactor = baseLevel < player.level ? float(float(float(player.level - baseLevel) / float(baseLevel)) + float(1)) : float(1);
  const factor = float(Math.max(1, float(float(float(player.paragon) / float(800)) * float(1.6666666269302368) + float(1))) * levelFactor);
  const result = { ...role };
  for (const key of ["attack", "maxHp", "defense", "hit", "dodge", "crit", "critHurt", "resistance"]) result[key] = scale(role[key], factor);
  result.hp = result.maxHp;
  return result;
}

export function maximumCopyDifficulty(player) {
  return player.level < 80 || player.paragon < 100 ? 3 : player.paragon < 300 ? 4 : player.paragon < 500 ? 5 : 6;
}

export function getCopyAccess(copy, state, chapters) {
  if (copy.type === 4) return "地图中随机遭遇";
  if (copy.type === 5) {
    if (state.player.level < 30) return "需要等级 30";
    if (copy.id > 5001 && !state.progress.copies.some((row) => row.id === copy.id - 1 && row.value > 0)) return "先通关上一层";
    return "";
  }
  if (copy.type === 1) {
    const chapter = chapters.find((row) => copy.id >= row.minid && copy.id <= row.maxid || row.hideboss === copy.id);
    if (!chapter || chapter.id > state.progress.chapterId) return "尚未解锁章节";
    if (copy.id === chapter.hideboss) return state.progress.copies.some((row) => row.id === chapter.maxid && row.value > 0) ? "" : "先通关本章首领";
    if (chapter.id === state.progress.chapterId && copy.id - chapter.minid >= state.progress.levelId) return "先通关前一关";
    return "";
  }
  const enough = copy.level > 80 ? state.player.level >= 80 && state.player.paragon >= copy.level - 80 : state.player.level >= copy.level;
  return enough ? "" : copy.level > 80 ? `需要巅峰 ${copy.level - 80}` : `需要等级 ${copy.level}`;
}

/** WarLayer::initWarData regular maps and instances; original random draw order. */
export function prepareCopyBattle({ copy, player, clearCount, hard, waves, catalog, draw }) {
  const rewardHard = hard;
  const groups = prepareCopyDropGroups({ copy, roll: [1, 2].includes(copy.type) ? draw() : 0 });
  if (copy.type === 1 && clearCount === 0) { hard = 1; waves = 1; }
  const enemies = [];
  const ids = [1, 2, 3, 4, 5].map((index) => copy[`enemyid${index}`]).filter(Boolean);
  let encounterChance = copy.type === 1
    ? Math.trunc(float(float(float(hard + 0.5) * float(3)) * float(float(float(waves * 4) / float(5)) + float(0.8)))) : 0;
  encounterChance = Math.trunc(float(float(encounterChance) * float(float(float(player.encounterBonus || 0) / float(100)) + float(1))));
  const encounter = encounterChance > 0 && draw() % 1001 < encounterChance && player.level - copy.level <= 10;
  const encounterCopy = encounter ? selectMapEncounter({ level: copy.level, hard: rewardHard, copies: catalog.copies, draw }) : null;
  const specialInstance = copy.type === 2 && copy.id > 2049 && copy.id <= 2055;
  const count = copy.type === 1 ? waves * ids.length : specialInstance ? 20 : copy.type === 6 ? 8 : ids.length;
  for (let index = 0; index < count; index += 1) {
    const id = specialInstance || copy.type === 6 ? ids[draw() % ids.length] : ids[index % ids.length];
    const value = draw() % 101;
    const quality = copy.type === 1 ? selectRegularEnemyQuality(value)
      : copy.type === 5 ? value <= 44 ? 1 : value <= 74 ? 2 : 3
      : copy.type === 3 ? 3 : copy.type === 4 ? 0 : copy.type === 6 ? value === 0 ? 1 : value <= 69 ? 2 : 3
      : specialInstance ? value <= 0 ? 1 : value <= 19 ? 2 : 3 : value <= 69 ? 1 : value <= 84 ? 2 : 3;
    let enemy = { ...createEnemyFromCatalog(catalog.enemies.find((row) => row.id === id), catalog.skills), quality, isDefBuff: false };
    if (copy.type === 3) { enemy.baseLevel = enemy.level; enemy.level = player.level; enemy.paragon = player.paragon; }
    if (copy.type === 6) {
      const growth = 55 * (player.trialLevel || 1) + 5 * ((player.trialHard || 1) - 1);
      for (const [key, value] of [["maxHp", 150], ["attack", 150], ["defense", 68], ["hit", 109], ["dodge", 33], ["crit", 41], ["critHurt", 116], ["resistance", 75]]) enemy[key] += growth * value;
      enemy.hp = enemy.maxHp; enemy.isDefBuff = true; enemy.critResistanceOffset = (player.trialHard || 1) <= 4 ? (player.trialHard || 1) * 20 : 0;
    }
    enemy = applyEnemyQuality(enemy, quality);
    if (copy.type === 1) enemy = applyEnemyDifficulty(enemy, hard);
    if (copy.type !== 6) enemy = applyEnemyParagon(enemy, player, copyUsesParagon(copy, rewardHard));
    if (specialInstance) {
      if (id === 2050) enemy.attack = scale(enemy.attack, 1.2);
      if (id === 2051) { enemy.maxHp = scale(enemy.maxHp, 1.2); enemy.hp = enemy.maxHp; }
      if (id === 2052) enemy.flatCrit = 25;
      if (id === 2053) enemy.buffResistance = 50;
      if (id === 2054) enemy.critResistance = 60;
    }
    enemies.push(enemy);
  }
  if (encounterCopy) enemies.push(applyEnemyParagon(createEncounterEnemy({ copy: encounterCopy, player, catalog }), player, copyUsesParagon(copy, rewardHard)));
  return { hard, rewardHard, groups, encounterCopy, enemyCount: enemies.length, rewardRate: getBattleQualityRewardRate(enemies.map((row) => row.quality)),
    battle: { allies: [{ ...player, hp: player.maxHp, dead: false, acted: false, roleType: 1, buffs: [] }],
      enemies, currentEnemyIndex: 0, phase: 1, wave: 1, outcome: 0, revives: 0, warType: copy.type } };
}

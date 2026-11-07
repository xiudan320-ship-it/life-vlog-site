// Enemy::resetAttByQuality (0x7b9594), resetAttByHard (0x7b9af0).
// These operate on an already constructed enemy; they do not generate one.
const float = Math.fround;
const scale = (value, factor) => Math.trunc(float(float(value) * factor));

/** GameData::getBaseEnemyById (0x7ced6c), before quality/difficulty/paragon. */
export function createEnemyFromCatalog(row, skills) {
  const integer = (value) => Math.trunc(value ?? 0) | 0;
  if (!skills.some((skill) => skill.id === 1)) throw new RangeError("Missing original normal attack skill.");
  const equippedSkillIds = [row.skillid1, row.skillid2]
    .filter((id) => id > 0 && skills.some((skill) => skill.id === id));
  const maxHp = integer(row.hp);
  return {
    // The native factory reads the catalog quality but leaves the constructor's
    // zero value in place; the battle-mode preparation assigns quality later.
    id: integer(row.id), quality: 0, level: integer(row.level), paragon: 1,
    attack: integer(row.att), defense: integer(row.def), maxHp, hp: maxHp,
    hit: integer(row.hit), dodge: integer(row.spo), crit: integer(row.cri),
    critHurt: integer(row.crihurt), resistance: integer(row.res),
    regeneration: 0, hurtBonus: 0, critResistance: 0, critResistanceOffset: 0, flatCrit: 0,
    roleType: 0, acted: false, dead: false, buffs: [],
    equippedSkillIds, skillIds: [1, ...equippedSkillIds],
  };
}

/** Regular-copy quality roll in WarLayer::initWarData (0x9fe6a0). */
export function selectRegularEnemyQuality(roll) {
  if (!Number.isInteger(roll) || roll < 0 || roll > 0x7fffffff) {
    throw new RangeError("Enemy quality requires an original 31-bit random draw.");
  }
  const value = roll % 101;
  return value <= 79 ? 1 : value <= 92 ? 2 : 3;
}

export function applyEnemyQuality(role, quality) {
  const factor = float([1, 1, 1.1, 1.2, 1.3][quality] ?? 1);
  const maxHp = scale(role.maxHp, factor);
  return {
    ...role, maxHp, hp: maxHp, attack: scale(role.attack, factor),
    critResistance: (Math.imul((quality - 1) | 0, 5) + 20) | 0,
  };
}

export function applyEnemyDifficulty(role, hard) {
  const factor = float([1, 0.8, 1.1, 1.3, 1.5, 1.7, 1.95][hard] ?? 1);
  const maxHp = scale(role.maxHp, factor);
  return {
    ...role, maxHp, hp: maxHp, attack: scale(role.attack, factor),
    defense: scale(role.defense, factor),
    critResistance: (role.critResistance + Math.imul(Math.max((hard - 3) | 0, 0), 10)) | 0,
  };
}

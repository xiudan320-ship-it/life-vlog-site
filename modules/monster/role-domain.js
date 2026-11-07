// WarRole::choiceAttackSkill (0xa0ecf0) and chageHp (0xa125ec).
// Presentation, turn scheduling and skill effects are separate operations.
const float = Math.fround;

function requireRoll(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0x7fffffff) {
    throw new TypeError("Skill selection requires explicit original RNG outputs.");
  }
  return value;
}

/** Select from the role's equipped skill IDs; report draws actually consumed. */
export function selectAttackSkill({ equippedSkillIds, isHero, warType, procBonus = 0, rolls }) {
  const count = equippedSkillIds.length;
  if (count === 0) return { skillId: 1, rollsUsed: 0 };
  let chance = [0, 24, 30, 36][count] ?? 10;
  chance = float(chance + float(isHero ? procBonus : (warType === 5 ? 4 : -4)));
  if (requireRoll(rolls?.[0]) % 101 >= chance) return { skillId: 1, rollsUsed: 1 };
  const index = requireRoll(rolls?.[1]) % count;
  return { skillId: equippedSkillIds[index], rollsUsed: 2 };
}

/** Apply the original HP/death/Buff-clear state change without mutating a role. */
export function changeRoleHp(role, delta) {
  let hp = (role.hp + delta) | 0;
  let dead = role.dead;
  let buffs = role.buffs;
  if (hp > role.maxHp) {
    hp = role.maxHp;
  } else if (hp <= 0) {
    hp = 0;
    dead = true;
    buffs = [];
  }
  // Native healing preserves an existing death flag; revival is a separate path.
  return { ...role, hp, dead, buffs };
}

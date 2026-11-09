// Original com.zn.monster 7.1 static vectors recovered from libcocos2dcpp.so.
// Native function outputs, including their current bounds, are regression fixtures.
const PLAYER_EXPERIENCE = Object.freeze([
  20, 30, 80, 100, 120, 140, 240, 360, 500, 660, 960, 1300, 1680, 2250,
  2880, 3740, 4680, 5890, 7200, 8820, 10560, 12650, 15120, 18000, 21060,
  24570, 28560, 33060, 37800, 43400, 49600, 56100, 63580, 71750, 80640,
  90280, 100700, 112320, 124800, 138170, 152880, 168560, 185680, 203850,
  223560, 244400, 267360, 291550, 317000, 344760, 405450, 504100, 631760,
  846400, 1083560, 1363040, 1668400, 2004500, 2400000, 2800000, 3200000,
  3600000, 4000000, 4500000, 5000000, 5500000, 6000000, 6600000, 7200000,
  8000000, 8800000, 9800000, 10800000, 12000000, 13400000, 14800000,
  16400000, 18000000, 20000000, 22000000, 25000000,
]);

const SKILL_COSTS = Object.freeze([
  Object.freeze([5000, 7000, 10000, 200, 400]),
  Object.freeze([6000, 9000, 12000, 300, 600]),
  Object.freeze([7000, 11000, 14000, 400, 800]),
  Object.freeze([8000, 13000, 16000, 500, 1000]),
]);

const STRENGTH_THRESHOLDS = Object.freeze([
  100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 16, 13, 8, 6, 4, 10, 6, 2, 1, 1,
]);

export function getPlayerExperienceRequired(level) {
  if (level === 0) return 1;
  const index = Math.min(level, 79) - 1;
  return index >= 0 && index < PLAYER_EXPERIENCE.length ? PLAYER_EXPERIENCE[index] : 0;
}

export function getPetExperienceRequired(level) {
  if (level === 0) return 1;
  const bounded = Math.min(level, 59);
  return Math.imul(Math.imul(bounded, bounded), 15000);
}

export function getParagonExperienceRequired(level) {
  if (level === 0) return 100;
  const bounded = Math.min(level, 799);
  return Math.imul(bounded, bounded > 400 ? 100000 : bounded > 300 ? 80000 : 50000);
}

export function getSkillUpgradeCost(category, level) {
  // The native function excludes category 4 despite retaining its row in the table.
  if (category >= SKILL_COSTS.length || category < 1 || level < 1 || level > SKILL_COSTS[0].length) return 0;
  return SKILL_COSTS[category - 1][level - 1];
}

export function getEquipmentStrengthThreshold(currentStrength) {
  if (!Number.isInteger(currentStrength) || currentStrength < 0 || currentStrength >= STRENGTH_THRESHOLDS.length) {
    throw new RangeError("Strength outside the original table.");
  }
  // This is the threshold for rand()%101 <= value, rather than a standard percentage.
  return STRENGTH_THRESHOLDS[currentStrength];
}

/**
 * Player::addExp (0x9a01bc), including its original level caps and recursion.
 * Pet grants are returned for settlement to apply in order; unlock/potion
 * callbacks remain separate operations.
 */
export function creditPlayerExperience({ level, paragon, experience, amount, petExperienceBonus = 0 }) {
  const float = Math.fround;
  const petGrants = [];
  const unlockLevels = [];
  const potionLevelUpdates = [];
  function credit(value) {
    const adjusted = Math.trunc(float(float(value)
      * float(float(float(petExperienceBonus) / float(100)) + float(1))));
    petGrants.push({ active: adjusted, assist: Math.trunc(float(float(adjusted) * float(0.3))) });
    const total = (experience + value) | 0;
    if (level < 80) {
      const required = getPlayerExperienceRequired(level);
      if (total < required) {
        experience = total;
        return;
      }
      const nextLevel = level + 1;
      unlockLevels.push(nextLevel);
      if (nextLevel > 79) {
        level = 80;
        experience = 0;
        return;
      }
      level = nextLevel;
      experience = 0;
      credit((total - required) | 0);
      potionLevelUpdates.push(level);
      return;
    }
    const required = getParagonExperienceRequired(paragon);
    if (total < required) {
      experience = total;
      return;
    }
    if (paragon + 1 >= 800) {
      experience = getParagonExperienceRequired(799);
      paragon = 800;
      return;
    }
    paragon += 1;
    experience = 0;
    credit((total - required) | 0);
  }
  credit(amount);
  return { level, paragon, experience, petGrants, unlockLevels, potionLevelUpdates };
}

// Recovered from com.zn.monster 7.1, WarRole::attacked (0xa10098–0xa11460).
// This computes one attack's HP-change request. Turn scheduling, buff application,
// HP clamping, rewards, animation and persistence belong to separate operations.
const float = Math.fround;

function firstBuffValue(role, type) {
  return float(role.buffs?.find((buff) => buff.type === type)?.value || 0);
}

function effectiveAttribute(role, attribute, increaseType, decreaseType) {
  const increased = float(float(role[attribute] || 0)
    * float(float(firstBuffValue(role, increaseType) / float(100)) + float(1)));
  return Math.trunc(float(increased
    * float(float(1) - float(firstBuffValue(role, decreaseType) / float(100)))));
}

function calculateBaseAttack({
  attacker,
  defender,
  rolls,
  skillId = 1,
  skillHurt = 100,
  defenderIsHero = false,
  bonuses = {},
}) {
  const attackerEffectiveLevel = (attacker.level || 0) + 1
    + Math.trunc((attacker.paragon || 0) / 20);
  const defenderEffectiveLevel = (defender.level || 0) + 1
    + Math.trunc((defender.paragon || 0) / 20);

  let critThreshold = Math.trunc(float(float(float(attacker.crit || 0)
    / float(float(attackerEffectiveLevel) * float(136.6))) * float(100)));
  critThreshold += defenderIsHero ? (attacker.flatCrit || 0) : (bonuses.crit || 0);
  const resistance = (defender.critResistance || 0)
    + (defenderIsHero ? 0 : (defender.critResistanceOffset || 0));
  critThreshold = Math.trunc(float(float(critThreshold)
    * float(float(1) - float(float(resistance) / float(100))))) | 0;

  // Native buff IDs: 1/21 increase/reduce attack; 2/22 increase/reduce defense.
  // getBuffRealValue takes the first matching buff, rather than summing duplicates.
  const effectiveDefense = effectiveAttribute(defender, "defense", 2, 22);
  const effectiveAttack = effectiveAttribute(attacker, "attack", 1, 21);
  const mitigation = float(float(effectiveDefense)
    / float(float(effectiveDefense) + float(float(defenderEffectiveLevel) * float(82.5))));
  const damageRandom = rolls[1] % 201;

  // These operations deliberately retain the original double/float32 boundaries.
  let baseDamage = float(((effectiveAttack / 8.1) * float(float(1) - mitigation)
    * skillHurt / 100) * float(float(float(damageRandom) * float(0.001)) + float(0.9)));
  if (skillId !== 1) {
    const skillBonus = float(float(float(attacker.hurtBonus || 0) + float(100)) / float(100));
    baseDamage = float(baseDamage * skillBonus);
  }

  const levelDifference = (attacker.level || 0) - (defender.level || 0);
  return {
    attackerEffectiveLevel,
    defenderEffectiveLevel,
    critThreshold,
    critical: rolls[0] % 101 < critThreshold,
    effectiveDefense,
    mitigation,
    effectiveAttack,
    damageRandom,
    baseDamage,
    levelDifference,
    levelDamageBonus: levelDifference > 0
      ? Math.min(float(float(levelDifference) / float(15)), float(0.8)) : 0,
    levelHitBonus: levelDifference > 0 ? float(float(levelDifference) / float(100)) : 0,
  };
}

/**
 * rolls contains the original RNG outputs at the critical, damage and hit rolls.
 * Random generation itself is deliberately owned by the future battle controller.
 * Supports opposing player/enemy sides, percentage attack/defense buffs and the
 * six recovered account bonuses. It does not apply or expire any buff.
 */
export function calculateAttack(input) {
  if (!Array.isArray(input.rolls) || input.rolls.length !== 3
    || !input.rolls.every((roll) => Number.isInteger(roll) && roll >= 0 && roll <= 0x7fffffff)) {
    throw new TypeError("An attack requires three explicit original RNG outputs.");
  }
  const base = calculateBaseAttack(input);
  const { attacker, defender, defenderIsHero = false, bonuses = {} } = input;
  let criticalMultiplier = null;
  let hitThreshold = null;
  let hpChangeType = null;
  let requestedHpChange = 0;

  const damageFactor = defenderIsHero
    ? float(float(1) - float(float(bonuses.hurtDecrease || 0) / float(100)))
    : float(float(float(bonuses.hurtIncrease || 0) / float(100)) + float(1));

  if (base.critical) {
    const critHurt = float(attacker.critHurt || 0);
    const numerator = float(critHurt * float(0.86));
    const denominator = float(critHurt
      + float(float(base.attackerEffectiveLevel) * float(86.2)));
    criticalMultiplier = float(float(float(numerator / denominator) * float(400)) + float(150));
    if (!defenderIsHero) criticalMultiplier = float(criticalMultiplier + float(bonuses.critHurt || 0));

    // The original enemy -> player branch uses twice the base damage.
    const criticalDamage = defenderIsHero
      ? float(float(-base.baseDamage) + float(-base.baseDamage))
      : float(float(float(-base.baseDamage) * criticalMultiplier) / float(100));
    requestedHpChange = Math.trunc(float(criticalDamage * damageFactor));
    hpChangeType = 2;
  } else {
    const hit = float(float(attacker.hit || 0)
      / float(float(base.attackerEffectiveLevel) * float(113)));
    const dodge = float(defender.dodge || 0);
    const dodgeRatio = float(float(dodge * float(0.95))
      / float(dodge + float(float(base.defenderEffectiveLevel) * float(126))));
    let dodgeRate = float(dodgeRatio + 0.05);
    if (defenderIsHero) dodgeRate = float(dodgeRate + float(float(bonuses.dodge || 0) / float(100)));
    hitThreshold = float(float(float(float(1)
      - float(float(dodgeRate + float(0.05)) / float(hit + float(0.9))))
      + base.levelHitBonus) * float(100));
    if (!defenderIsHero) hitThreshold = float(hitThreshold + float(bonuses.hit || 0));

    if (input.rolls[2] % 101 < hitThreshold) {
      const normalDamage = float(float(-base.baseDamage) * float(float(1) + base.levelDamageBonus));
      requestedHpChange = Math.trunc(float(normalDamage * damageFactor));
      hpChangeType = 0;
    }
  }

  return {
    requestedHpChange: requestedHpChange === 0 ? 0 : requestedHpChange,
    hpChangeType,
    criticalMultiplier,
    hitThreshold,
    ...base,
  };
}

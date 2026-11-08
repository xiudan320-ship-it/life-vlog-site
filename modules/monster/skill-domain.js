import { calculateAttack } from "./combat-domain.js";
import { changeRoleHp } from "./role-domain.js";

const f = Math.fround;

/** WarRole::addBuff replaces duration/real value of every equal type. */
export function addRoleBuff(role, buff) {
  if (buff.type === 5) return changeRoleHp(role, buff.value);
  let found = false;
  const buffs = role.buffs.map((old) => {
    if (old.type !== buff.type) return old;
    found = true;
    return { ...old, rounds: buff.rounds, value: buff.value };
  });
  if (!found) buffs.push({ ...buff });
  return { ...role, buffs };
}

export function expireRoleBuffs(role) {
  return { ...role, buffs: role.buffs.map((buff) => ({ ...buff, rounds: buff.rounds - 1 })).filter((buff) => buff.rounds > 0) };
}

/** Original WarRole::attacked, including the original unusual stun comparison. */
export function applySkillHit({ attacker, defender, skill, sameRole = false, defenderIsHero = false, warType = 1, bonuses = {}, draw }) {
  const value = Number(skill.buffvalue) || 0;
  const buff = { type: skill.bufftype, baseValue: f(value), rounds: Number(skill.buffround) || 0, value: 0 };
  const skillFactor = f(f(f(attacker.hurtBonus || 0) + f(100)) / f(100));
  if (sameRole) {
    if (buff.type === 7) buff.value = Math.trunc(f(f(f(defender.maxHp) * f(value)) / f(100)));
    else if (buff.type === 5) buff.value = Math.trunc(f(f(f(f(defender.maxHp) * f(value)) / f(100)) * skillFactor));
    else buff.value = Math.trunc(f(f(value) * skillFactor));
    const result = addRoleBuff(defender, buff);
    return { attacker: result, defender: result, damage: null };
  }
  const rolls = [draw(), draw(), 0];
  const input = { attacker, defender, skillId: skill.id, skillHurt: skill.hurt, defenderIsHero, bonuses, rolls };
  let damage = calculateAttack(input);
  if (!damage.critical) { rolls[2] = draw(); damage = calculateAttack(input); }
  defender = changeRoleHp(defender, damage.requestedHpChange);
  if (damage.hpChangeType === null || !buff.type || (!defenderIsHero && defender.isDefBuff)) return { attacker, defender, damage };
  const resistance = f(defender.resistance || 0);
  const level = defender.level + 1 + Math.trunc((defender.paragon || 0) / 20);
  const hero = defenderIsHero ? defender : attacker;
  const mitigation = f(f(resistance / f(resistance + f(f(level) * f(60)))) + f(f(hero.buffResistance || 0) / f(100)));
  const modeFactor = defenderIsHero && warType === 5 ? f(1.8) : f(1);
  if (buff.type === 24) {
    attacker = changeRoleHp(attacker, Math.trunc(f(f(f(value) * damage.baseDamage) / f(100))));
  } else {
    if ([26, 28, 29].includes(buff.type)) buff.value = Math.trunc(f(f(f(f(f(value) * damage.baseDamage) / f(100)) * f(f(1) - mitigation)) * modeFactor));
    else if ([21, 22].includes(buff.type)) buff.value = Math.trunc(f(f(f(f(value) * f(f(1) - mitigation)) * modeFactor) * skillFactor));
    else if ([23, 27].includes(buff.type) && f(draw() % 101) < mitigation) return { attacker, defender, damage };
    defender = addRoleBuff(defender, buff);
  }
  return { attacker, defender, damage };
}

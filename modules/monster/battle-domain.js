import { selectAttackSkill, changeRoleHp } from "./role-domain.js";
import { selectBattleActor, selectBattleTargets } from "./battle-turn-domain.js";
import { applySkillHit, expireRoleBuffs } from "./skill-domain.js";

/** Attack queues opposing hits before applying its own regeneration and DoTs. */
export function tickRoleStatus(role, warType) {
  if (role.regeneration > 0 && warType !== 6) role = changeRoleHp(role, role.regeneration);
  for (const type of [7, 26, 29, 28]) {
    const buff = role.buffs.find((entry) => entry.type === type);
    if (buff) role = changeRoleHp(role, type === 7 ? buff.value : -buff.value);
  }
  return role;
}

export function advanceSoloBattle(input, { draw, skills }) {
  if (input.allies.length !== 1 || input.revives > 0) throw new RangeError("Pet parties and revival require their own prepared battle state.");
  if ([1, 3].includes(input.outcome)) throw new RangeError("Battle has already ended.");
  let rollsUsed = 0;
  function random() {
    const value = draw(); rollsUsed += 1;
    if (!Number.isInteger(value) || value < 0 || value > 0x7fffffff) throw new RangeError("Battle requires an original 31-bit random draw.");
    return value;
  }
  let battle = input;
  if (battle.outcome === 2) {
    const currentEnemyIndex = battle.enemies.findIndex((role) => !role.dead);
    if (currentEnemyIndex < 0) throw new RangeError("Next wave has no living enemy.");
    battle = { ...battle, currentEnemyIndex, wave: battle.wave + 1, phase: 1, outcome: 0 };
  }
  const selected = selectBattleActor(battle);
  battle = selected.battle;
  const actor = selected.actor;
  let attacker = battle[actor.side][actor.index];
  const warType = battle.warType || 1;
  const equippedSkillIds = attacker.equippedSkillIds || [];
  const rolls = equippedSkillIds.length ? [random(), 0] : [];
  const choiceInput = { equippedSkillIds, isHero: actor.side === "allies", warType, procBonus: attacker.procBonus || 0, rolls };
  let choice = selectAttackSkill(choiceInput);
  if (choice.rollsUsed === 2) { rolls[1] = random(); choice = selectAttackSkill(choiceInput); }
  const skill = skills.find((entry) => entry.id === choice.skillId);
  if (!skill) throw new RangeError(`Missing original skill ${choice.skillId}.`);
  const randomAllyIndex = actor.side === "enemies" && skill.hurttype === 2 ? random() % battle.allies.length : undefined;
  const targets = selectBattleTargets({ battle, actor, hurtType: skill.hurttype, randomAllyIndex });
  const stunned = attacker.buffs.some((buff) => buff.type === 23 || buff.type === 27);
  const hits = [];
  function hit(target, index) {
    const source = battle[actor.side][actor.index];
    const defender = battle[target.side][target.index];
    const sameRole = target.side === actor.side && target.index === actor.index;
    const result = applySkillHit({ attacker: source, defender, skill, sameRole, defenderIsHero: target.side === "allies", warType, bonuses: battle.bonuses, draw: random });
    battle[actor.side][actor.index] = result.attacker;
    battle[target.side][target.index] = result.defender;
    hits.push({ actor, target, skillId: skill.id, hitIndex: sameRole ? 1 : index, hpBefore: defender.hp, hpAfter: result.defender.hp, dead: result.defender.dead });
  }
  const pending = [];
  if (!stunned) for (const target of targets) for (let i = 0; i < skill.hurtcount; i += 1) {
    if (target.side === actor.side) hit(target, i);
    else pending.push([target, i]);
  }
  attacker = tickRoleStatus(battle[actor.side][actor.index], warType);
  battle[actor.side][actor.index] = attacker;
  for (const [target, index] of pending) hit(target, index);
  battle[actor.side][actor.index] = expireRoleBuffs(battle[actor.side][actor.index]);
  const remaining = battle.enemies.some((role) => !role.dead);
  battle.outcome = battle.allies[0].dead ? 1 : battle.enemies[battle.currentEnemyIndex].dead ? remaining ? 2 : 3 : 0;
  return { battle, hits, rollsUsed };
}

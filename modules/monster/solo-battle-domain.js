import { calculateAttack } from "./combat-domain.js";
import { changeRoleHp } from "./role-domain.js";
import { selectBattleActor, selectBattleTargets } from "./battle-turn-domain.js";

/**
 * One normal-attack action for a solo regular battle. Roles are already prepared.
 * Core RNG inputs exclude presentation/title lottery draws. Skills, regeneration,
 * Buff effects, pets and revives need their own recovered execution paths.
 */
export function advanceSoloNormalBattle(input, drawCore) {
  if (input.allies.length !== 1 || input.revives > 0) {
    throw new RangeError("Solo normal combat does not yet execute pets or revives.");
  }
  for (const role of [...input.allies, ...input.enemies]) {
    if (role.buffs?.length || role.equippedSkillIds?.length || role.regeneration) {
      throw new RangeError("Solo normal combat requires roles without skills, Buffs or regeneration.");
    }
  }
  if (input.outcome === 1 || input.outcome === 3) {
    throw new RangeError("Battle has already ended.");
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
  let rollsUsed = 0;
  function draw() {
    rollsUsed += 1;
    const value = drawCore();
    if (!Number.isInteger(value) || value < 0 || value > 0x7fffffff) {
      throw new RangeError("Battle action requires another original 31-bit core random draw.");
    }
    return value;
  }
  let randomAllyIndex;
  if (actor.side === "enemies") {
    randomAllyIndex = draw() % battle.allies.length;
  }
  const [target] = selectBattleTargets({ battle, actor, hurtType: 2, randomAllyIndex });
  const attacker = battle[actor.side][actor.index];
  const defender = battle[target.side][target.index];
  const coreRolls = [draw(), draw(), 0];
  const attackInput = { attacker, defender, defenderIsHero: target.side === "allies", rolls: coreRolls, bonuses: battle.bonuses };
  let attack = calculateAttack(attackInput);
  if (!attack.critical) {
    coreRolls[2] = draw();
    attack = calculateAttack(attackInput);
  }
  const after = changeRoleHp(defender, attack.requestedHpChange);
  battle[target.side][target.index] = after;
  const remaining = battle.enemies.some((role) => !role.dead);
  battle.outcome = battle.allies[0].dead ? 1 : after.dead && target.side === "enemies" ? remaining ? 2 : 3 : 0;
  return {
    battle, rollsUsed,
    hit: { actor, target, skillId: 1, hitIndex: 0, hpBefore: defender.hp, hpAfter: after.hp, dead: after.dead },
  };
}

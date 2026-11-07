// WarLayer::nextWar (0xa0118c): actor priority, acted flags and target lists.
// Death/outcome checks precede this operation in nextAttackLogic. A dead actor
// can still be selected here; WarRole::attack owns its early-exit behavior.

export function selectBattleActor(battle) {
  const allies = battle.allies.map((role) => ({ ...role }));
  const enemies = battle.enemies.map((role) => ({ ...role }));
  if (!enemies[battle.currentEnemyIndex]) throw new RangeError("Battle has no current enemy.");
  let phase = battle.phase;
  let actor;
  while (!actor) {
    if ((phase & 1) === 0) {
      const index = battle.currentEnemyIndex;
      if (!enemies[index].acted) actor = { side: "enemies", index };
      else {
        phase = (phase + 1) | 0;
        for (const role of allies) role.acted = false;
      }
    } else {
      let index = allies.findLastIndex((role) => role.roleType === 1 && !role.acted);
      if (index < 0) index = allies.findLastIndex((role) => role.roleType !== 1 && !role.acted);
      if (index >= 0) actor = { side: "allies", index };
      else {
        phase = (phase + 1) | 0;
        for (const role of enemies) role.acted = false;
      }
    }
  }
  const next = { ...battle, allies, enemies, phase };
  next[actor.side][actor.index].acted = true;
  return { battle: next, actor };
}

/** randomAllyIndex is chosen by the original living-target rejection rule. */
export function selectBattleTargets({ battle, actor, hurtType, randomAllyIndex }) {
  const living = (side) => battle[side].flatMap((role, index) => role.dead ? [] : [{ side, index }]);
  if (hurtType === 0) return [{ ...actor }];
  if (hurtType === 1) return living(actor.side);
  if (actor.side === "allies") {
    return hurtType === 2 || hurtType === 3 ? [{ side: "enemies", index: battle.currentEnemyIndex }] : [];
  }
  if (hurtType === 3) return living("allies");
  if (hurtType !== 2) return [];
  const target = battle.allies[randomAllyIndex];
  if (!target || target.dead) throw new RangeError("Enemy target must be an explicitly selected living ally.");
  return [{ side: "allies", index: randomAllyIndex }];
}

/** WarLayer::getRandomEnemy retries the original full ally vector on death. */
export function selectRandomLivingAlly({ allies, rolls }) {
  if (!allies.some((role) => !role.dead)) throw new RangeError("Battle has no living ally target.");
  let rollsUsed = 0;
  while (true) {
    const roll = rolls?.[rollsUsed++];
    if (!Number.isInteger(roll) || roll < 0 || roll > 0x7fffffff) {
      throw new RangeError("Target selection requires another original 31-bit random draw.");
    }
    const index = roll % allies.length;
    if (!allies[index].dead) return { index, rollsUsed };
  }
}

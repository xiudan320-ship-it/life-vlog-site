import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { applySkillHit, expireRoleBuffs } from "../modules/monster/skill-domain.js";
import { advanceSoloBattle } from "../modules/monster/battle-domain.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/monster/native-skill-effect-fixtures.json", import.meta.url), "utf8"));
test("all 32 original skill hits and Buff expiry match 256 ARM cases", () => {
  for (const item of fixture.cases) {
    const input = structuredClone(item.input);
    const result = applySkillHit({ ...input, defenderIsHero: input.defender.roleType === 1, draw: () => input.roll });
    assert.deepEqual({ attacker: result.attacker, defender: result.defender }, item.expected, `skill ${input.skill.id}`);
    assert.deepEqual(expireRoleBuffs(result.defender), item.afterOneRound, `expiry ${input.skill.id}`);
    assert.deepEqual(input, item.input);
  }
});

const battles = JSON.parse(await readFile(new URL("./fixtures/monster/native-skill-battle-fixtures.json", import.meta.url), "utf8"));
test("64 complete original skill battles preserve HP, Buffs, waves and 2329 hits", () => {
  for (const item of battles.cases) {
    const original = structuredClone(item.input);
    let battle = item.input;
    let used = 0;
    const trace = [];
    for (let step = 0; step < 1000 && ![1, 3].includes(battle.outcome); step += 1) {
      const action = advanceSoloBattle(battle, { draw: () => item.coreRolls[used++], skills: battles.skills });
      battle = action.battle;
      trace.push(...action.hits);
    }
    assert.deepEqual({ outcome: battle.outcome, allies: battle.allies, enemies: battle.enemies, wave: battle.wave, phase: battle.phase, trace }, item.expected);
    assert.equal(used, item.coreRolls.length);
    assert.deepEqual(item.input, original);
  }
});

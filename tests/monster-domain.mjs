import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateAttack } from "../modules/monster/combat-domain.js";
import { calculatePlayerCoreAttributes, recalculatePlayerFromEquipment } from "../modules/monster/attribute-domain.js";
import { calculateEquipmentMainAttribute } from "../modules/monster/equipment-domain.js";
import { changeRoleHp, selectAttackSkill } from "../modules/monster/role-domain.js";
import { createMaterialDrops, prepareCopyDropGroups, selectCopyDropIds } from "../modules/monster/loot-domain.js";
import { addBagItem, changeGold } from "../modules/monster/inventory-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { calculateRegularCopyRewards, getBattleQualityRewardRate } from "../modules/monster/reward-domain.js";
import { creditBattleLoot } from "../modules/monster/settlement-domain.js";
import { createMonsterSaveStore } from "../modules/monster/save-store.js";
import { applyEnemyDifficulty, applyEnemyQuality, createEnemyFromCatalog, selectRegularEnemyQuality } from "../modules/monster/enemy-domain.js";
import { selectBattleActor, selectBattleTargets, selectRandomLivingAlly } from "../modules/monster/battle-turn-domain.js";
import { advanceSoloBattle } from "../modules/monster/battle-domain.js";
import { incrementCopyClear, recordRegularCopyVictory } from "../modules/monster/copy-progress-domain.js";
import {
  creditPlayerExperience,
  getEquipmentStrengthThreshold,
  getParagonExperienceRequired,
  getPetExperienceRequired,
  getPlayerExperienceRequired,
  getSkillUpgradeCost,
} from "../modules/monster/progression-domain.js";

const fixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/monster/${name}`, import.meta.url), "utf8"));
const numericCases = await fixture("native-rule-fixtures.json");
const combatCases = await fixture("native-combat-fixtures.json");
const attributeCases = await fixture("native-player-attribute-fixtures.json");
const equipmentCases = await fixture("native-equipment-attribute-fixtures.json");
const skillSelectionCases = await fixture("native-skill-selection-fixtures.json");
const hpStateCases = await fixture("native-hp-state-fixtures.json");
const dropGroupCases = await fixture("native-drop-group-fixtures.json");
const dropSelectionCases = await fixture("native-drop-selection-fixtures.json");
const experienceCreditCases = await fixture("native-experience-credit-fixtures.json");
const goldCreditCases = await fixture("native-gold-credit-fixtures.json");
const bagCreditCases = await fixture("native-bag-credit-fixtures.json");
const newGameCase = await fixture("native-new-game-fixture.json");
const regularRewardCases = await fixture("native-regular-reward-fixtures.json");
const firstCreditCase = await fixture("native-first-credit-fixture.json");
const enemyAdjustmentCases = await fixture("native-enemy-adjustment-fixtures.json");
const materialDropCases = await fixture("native-first-material-drop-fixtures.json");
const turnSelectionCases = await fixture("native-turn-selection-fixtures.json");
const enemyFactoryCases = await fixture("native-enemy-factory-fixtures.json");
const battleRandomCases = await fixture("native-battle-random-choice-fixtures.json");
const soloBattleCases = await fixture("native-solo-normal-battle-fixtures.json");
const copyProgressCases = await fixture("native-copy-progress-fixtures.json");
const equippedCoreCases = await fixture("native-equipped-core-fixtures.json");
const battleRewardRateCases = await fixture("native-battle-reward-rate-fixtures.json");

test("monster equipped core refresh preserves 36 complete native collections without healing", () => {
  for (const item of equippedCoreCases.cases) {
    const before = structuredClone(item.input);
    assert.deepEqual(recalculatePlayerFromEquipment(item.input.player, item.input.equipment), item.expected);
    assert.deepEqual(item.input, before);
  }
});

test("monster enemy quality reward averaging preserves 87 original ARM outputs", () => {
  for (const item of battleRewardRateCases) assert.equal(getBattleQualityRewardRate(item.input), item.expected);
  assert.throws(() => getBattleQualityRewardRate([]), /at least one enemy/);
});

test("monster victory progress matches 576 original ARM states and 16 counter boundaries", () => {
  for (const item of copyProgressCases.cases) {
    const before = structuredClone(item.input);
    assert.deepEqual(recordRegularCopyVictory(item.input), item.expected, JSON.stringify(item.input));
    assert.deepEqual(item.input, before);
  }
  for (const item of copyProgressCases.counters) {
    const before = structuredClone(item.input);
    assert.deepEqual(incrementCopyClear(item.input), item.expected, JSON.stringify(item.input));
    assert.deepEqual(item.input, before);
  }
});

test("monster solo normal battles autonomously match 15 complete original ARM loops", () => {
  for (const item of soloBattleCases.cases) {
    const original = structuredClone(item.input);
    let battle = item.input;
    let used = 0;
    const trace = [];
    while (battle.outcome !== 1 && battle.outcome !== 3) {
      let cursor = 0;
      const action = advanceSoloBattle(battle, { draw: () => item.coreRolls[used + cursor++], skills: enemyFactoryCases.skills });
      battle = action.battle;
      used += action.rollsUsed;
      trace.push(...action.hits);
      assert.ok(trace.length < 100);
    }
    assert.deepEqual({
      outcome: battle.outcome, allies: battle.allies, enemies: battle.enemies,
      phase: battle.phase, wave: battle.wave, trace,
    }, item.expected);
    assert.equal(used, item.coreRolls.length);
    assert.deepEqual(item.input, original);
  }
  const input = soloBattleCases.cases[0].input;
  assert.throws(() => advanceSoloBattle({ ...input, revives: 1 }, { draw: () => 0, skills: enemyFactoryCases.skills }), /revival/);
  assert.throws(() => advanceSoloBattle({ ...input, outcome: 3 }, { draw: () => 0, skills: enemyFactoryCases.skills }), /already ended/);
  assert.throws(() => advanceSoloBattle(input, { draw: () => undefined, skills: enemyFactoryCases.skills }), /random draw/);
});

test("monster quality and living-target rejection match 169 original ARM choices", () => {
  for (const item of battleRandomCases.quality) assert.equal(selectRegularEnemyQuality(item.input), item.expected);
  for (const item of battleRandomCases.targets) assert.deepEqual(selectRandomLivingAlly(item.input), item.expected);
  assert.throws(() => selectRegularEnemyQuality(undefined), /random draw/);
  assert.throws(() => selectRandomLivingAlly({ allies: [{ dead: true }], rolls: [0] }), /no living ally/);
  assert.throws(() => selectRandomLivingAlly({ allies: [{ dead: true }, { dead: false }], rolls: [0] }), /another original/);
});

test("monster enemy construction preserves all 849 original ARM catalog outputs", () => {
  for (const item of enemyFactoryCases.cases) {
    assert.deepEqual(createEnemyFromCatalog(item.input, enemyFactoryCases.skills), item.expected, String(item.input.id));
  }
  assert.throws(() => createEnemyFromCatalog(enemyFactoryCases.cases[0].input, []), /normal attack/);
});

test("monster turn actor/targets preserve 384 original ARM selections and acted flags", () => {
  for (const item of turnSelectionCases) {
    const input = structuredClone(item.input);
    const selected = selectBattleActor(input);
    const targets = selectBattleTargets({ ...input, ...selected });
    assert.deepEqual({
      actor: selected.actor, targets, phase: selected.battle.phase,
      allies: selected.battle.allies.map(({ acted }) => ({ acted })),
      enemies: selected.battle.enemies.map(({ acted }) => ({ acted })),
    }, item.expected, JSON.stringify(input));
    assert.deepEqual(input, item.input);
  }
  const battle = turnSelectionCases[0].input;
  assert.throws(() => selectBattleTargets({ battle, actor: { side: "enemies", index: 0 }, hurtType: 2 }), /living ally/);
});

test("monster first-copy material construction matches 48 original ARM drop/merge results", () => {
  for (const item of materialDropCases.cases) {
    const before = structuredClone(item.input);
    const selected = selectCopyDropIds(item.input);
    assert.deepEqual(createMaterialDrops({ itemIds: selected.itemIds, items: materialDropCases.items }), item.expected);
    assert.deepEqual(item.input, before);
  }
  assert.throws(() => createMaterialDrops({ itemIds: [6001], items: newGameCase.input.items }), /material catalog/);
  assert.throws(() => createMaterialDrops({ itemIds: [5003], items: [] }), /material catalog/);
});

test("monster enemy quality and difficulty preserve 168 original ARM result pairs", () => {
  for (const item of enemyAdjustmentCases) {
    const input = structuredClone(item.input);
    const quality = applyEnemyQuality(input.role, input.quality);
    assert.deepEqual(quality, item.expected.quality, JSON.stringify(input));
    assert.deepEqual(applyEnemyDifficulty(quality, input.hard), item.expected.difficulty, JSON.stringify(input));
    assert.deepEqual(input, item.input);
  }
});

test("monster catalog, autonomous first battle, rewards, progress and cloud reload compose against native state", async () => {
  let saved = null;
  let revision = 0;
  const transport = {
    getSession: () => ({ access_token: "fixture-token", user: { id: "fixture-user" } }),
    request: async (_, options) => {
      if (options.method === "PUT") { const payload = JSON.parse(options.body); assert.equal(payload.expectedRevision, revision); saved = JSON.stringify(payload.state); revision += 1; }
      return { userId: "fixture-user", revision, state: saved ? JSON.parse(saved) : null };
    },
  };
  const save = createMonsterSaveStore(transport);
  assert.equal(await save.load(), null);
  const state = createNewGame(newGameCase.input);
  const quality = selectRegularEnemyQuality(firstCreditCase.roll);
  const row = enemyFactoryCases.cases.find((item) => item.input.id === 4001).input;
  const enemy = applyEnemyDifficulty(applyEnemyQuality({
    ...createEnemyFromCatalog(row, enemyFactoryCases.skills), quality,
  }, quality), 1);
  let battle = {
    allies: [{ ...state.player, hp: state.player.maxHp, buffs: [], acted: false, roleType: 1 }],
    enemies: [enemy], currentEnemyIndex: 0, wave: 1, phase: 1, outcome: 0, revives: 0,
  };
  const trace = [];
  while (battle.outcome !== 1 && battle.outcome !== 3) {
    const action = advanceSoloBattle(battle, { draw: () => firstCreditCase.roll, skills: enemyFactoryCases.skills });
    battle = action.battle;
    trace.push(...action.hits);
    assert.ok(trace.length < 100);
  }
  assert.equal(battle.outcome, 3);
  assert.deepEqual(trace, soloBattleCases.cases[0].expected.trace);
  const copy = firstCreditCase.catalog.copy;
  const reward = calculateRegularCopyRewards({
    copy: { ...copy, clearCount: 0 },
    player: { ...state.player, goldRate: 100, dropRate: 100, experienceRate: 100 },
    globalRate: getBattleQualityRewardRate(battle.enemies.map((role) => role.quality)),
    hard: 1, enemyCount: battle.enemies.length, rareRoll: firstCreditCase.roll,
  });
  const selected = selectCopyDropIds({
    groups: prepareCopyDropGroups({ copy, roll: firstCreditCase.roll }), copyType: copy.type,
    hard: 1, activityEnabled: false, dropRate: reward.dropRate, rolls: Array(32).fill(firstCreditCase.roll),
  });
  const items = createMaterialDrops({ itemIds: selected.itemIds, items: materialDropCases.items });
  assert.deepEqual({ gold: reward.gold, experience: reward.experience, items }, firstCreditCase.reward);
  const afterBattle = { ...state, player: { ...state.player, hp: battle.allies[0].hp } };
  const credited = creditBattleLoot(afterBattle, { ...reward, items });
  assert.deepEqual(Object.fromEntries(Object.keys(firstCreditCase.after).map((name) => [
    name, name === "gold" ? credited.state.gold : credited.state.player[name],
  ])), firstCreditCase.after);
  assert.equal(afterBattle.gold, 1000);
  assert.equal(afterBattle.player.experience, 0);
  const progress = recordRegularCopyVictory({
    progress: credited.state.progress, money: credited.state.money,
    copy, chapter: firstCreditCase.catalog.chapter, enemyCount: 1,
  });
  const oracle = copyProgressCases.cases.find((item) => item.input.copy.id === copy.id
    && item.input.progress.chapterId === 1 && item.input.progress.levelId === 1
    && item.input.progress.newChapter && !item.input.progress.finished && item.input.progress.copies.length === 1);
  assert.deepEqual(progress, oracle.expected);
  const final = { ...credited.state, progress: progress.progress, money: progress.money };
  final.player = recalculatePlayerFromEquipment(final.player, [
    ...final.player.equipmentSets[final.player.equipmentSetIndex], ...final.inventory.wings,
  ]);
  await save.save(final);
  const reloaded = await createMonsterSaveStore(transport).load();
  assert.deepEqual(reloaded, final);
  reloaded.player.experience = -1;
  assert.equal((await save.load()).player.experience, 15);
});

test("monster cloud saves report invalid content and write failures without replacing prior data", async () => {
  let value = null;
  let fail = false;
  let revision = 0;
  const transport = {
    getSession: () => ({ access_token: "fixture-token", user: { id: "fixture-user" } }),
    request: async (_, options) => {
      if (options.method === "PUT") {
        if (fail) throw new Error("Synthetic cloud failure");
        value = JSON.stringify(JSON.parse(options.body).state); revision += 1;
      }
      return { userId: "fixture-user", revision, state: value ? JSON.parse(value) : null };
    },
  };
  const save = createMonsterSaveStore(transport);
  const state = createNewGame(newGameCase.input);
  await save.load();
  await save.save(state);
  const before = value;
  fail = true;
  await assert.rejects(save.save({ ...state, gold: 1117 }), /cloud failure/);
  assert.equal(value, before);
  await assert.rejects(save.save({}), /存档数据/);
  value = "{";
  await assert.rejects(save.load(), SyntaxError);
  value = JSON.stringify({});
  await assert.rejects(save.load(), /存档数据/);
});

test("monster regular rewards preserve 1192 original ARM outputs and float boundaries", () => {
  for (const item of regularRewardCases) {
    assert.deepEqual(calculateRegularCopyRewards(item.input), item.expected, JSON.stringify(item.input));
  }
  assert.throws(() => calculateRegularCopyRewards({ ...regularRewardCases[0].input, rareRoll: undefined }), /random draw/);
});

test("monster new game matches the original native fresh-save state", () => {
  const input = structuredClone(newGameCase.input);
  const first = createNewGame(input);
  assert.deepEqual(first, newGameCase.expected);
  assert.deepEqual(input, newGameCase.input);
  const second = createNewGame(input);
  first.player.equipmentSets[0][0].mainAttribute.value = -1;
  first.inventory.wings[0].attributes.push({ type: 1, value: 999 });
  first.player.equippedSkillIds.push(2);
  assert.deepEqual(second, newGameCase.expected);
  assert.throws(() => createNewGame({ ...input, items: [] }), /Missing original catalog/);
});

test("monster gold credit preserves 30 original ARM outputs including cap boundaries", () => {
  for (const item of goldCreditCases) {
    assert.deepEqual(changeGold(item.input), item.expected, JSON.stringify(item.input));
  }
});

test("monster bag credit preserves 12 original ARM outputs without mutating inputs", () => {
  for (const item of bagCreditCases) {
    const before = structuredClone(item.input);
    assert.deepEqual(addBagItem(item.input), item.expected, JSON.stringify(item.input));
    assert.deepEqual(item.input, before);
  }
});

test("monster experience credit preserves 128 original ARM outputs and callback ordering", () => {
  for (const item of experienceCreditCases) {
    assert.deepEqual(creditPlayerExperience(item.input), item.expected, JSON.stringify(item.input));
  }
});

test("monster copy drop preparation preserves 75 original ARM outputs", () => {
  for (const item of dropGroupCases) {
    assert.deepEqual(prepareCopyDropGroups(item.input), item.expected, JSON.stringify(item.input));
  }
});

test("monster drop selection preserves 432 original ARM outputs and RNG consumption", () => {
  for (const item of dropSelectionCases) {
    assert.deepEqual(selectCopyDropIds(item.input), item.expected, JSON.stringify(item.input));
  }
});

test("monster skill selection preserves 360 original ARM outputs and RNG consumption", () => {
  for (const item of skillSelectionCases) {
    assert.deepEqual(selectAttackSkill(item.input), item.expected, JSON.stringify(item.input));
  }
});

test("monster HP state preserves 112 original ARM outputs including dead-role healing", () => {
  for (const item of hpStateCases) {
    const { role, delta } = item.input;
    const before = structuredClone(role);
    const result = changeRoleHp(role, delta);
    assert.deepEqual({ hp: result.hp, dead: result.dead, buffsRemaining: result.buffs.length }, item.expected, JSON.stringify(item.input));
    assert.deepEqual(role, before, "HP changes must not mutate the input role");
  }
});

test("monster skill selection rejects missing required RNG draws", () => {
  const input = { equippedSkillIds: [2], isHero: true, warType: 1 };
  for (const rolls of [undefined, [], [-1, 0], [NaN, 0], [0], [0, 0x80000000]]) {
    assert.throws(() => selectAttackSkill({ ...input, rolls }), TypeError);
  }
  assert.deepEqual(selectAttackSkill({ ...input, rolls: [100] }), { skillId: 1, rollsUsed: 1 });
  assert.deepEqual(selectAttackSkill({ ...input, equippedSkillIds: [] }), { skillId: 1, rollsUsed: 0 });
});

test("monster core attributes preserve 252 original ARM outputs", () => {
  for (const item of attributeCases) {
    assert.deepEqual(calculatePlayerCoreAttributes(item.input), item.expected, JSON.stringify(item.input));
  }
});

test("monster equipment main attributes preserve 180 original ARM outputs", () => {
  for (const item of equipmentCases) {
    assert.equal(calculateEquipmentMainAttribute(item.input), item.expected, JSON.stringify(item.input));
  }
});

test("monster growth rules preserve 213 original ARM outputs", () => {
  const functions = {
    playerExp: getPlayerExperienceRequired,
    petExp: getPetExperienceRequired,
    paragonExp: getParagonExperienceRequired,
    skillCost: getSkillUpgradeCost,
    strengthProbability: getEquipmentStrengthThreshold,
  };
  for (const item of numericCases) {
    assert.equal(functions[item.rule](...item.input), item.expected, JSON.stringify(item));
  }
});

test("monster attack arithmetic preserves 720 original ARM outputs", () => {
  for (const item of combatCases) {
    assert.deepEqual(calculateAttack(item.input), item.expected, JSON.stringify(item.input));
  }
});

test("monster attacks require explicit deterministic random inputs", () => {
  const sample = combatCases[0].input;
  for (const rolls of [undefined, [], [0, 1], [0, 1, NaN], [0, -1, 2], [0, 1, 0x80000000]]) {
    assert.throws(() => calculateAttack({ ...sample, rolls }), TypeError);
  }
});

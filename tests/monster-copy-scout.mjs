import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getCopyScout } from "../modules/monster/copy-scout-domain.js";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, enemies, copies, chapters, groups] = await Promise.all(["item", "skill", "enemy", "copy", "chapter", "drop-groups"].map(read));
const catalog = { items, skills, enemies, chapters, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })) };
const copy = (id) => catalog.copies.find((row) => row.id === id);
test("every catalog copy can be inspected with finite values at early and endgame levels", () => {
  for (const level of [1, 80]) {
    const state = createNewGame(catalog); state.player.level = level; state.player.paragon = 800;
    for (const copy of catalog.copies) {
      const scout = getCopyScout({ state, catalog, copy, settings: { hard: 6, waves: 10 } });
      assert.ok(scout.unavailable || Number.isFinite(scout.recommendedPower), String(copy.id));
    }
  }
});
function fixture() {
  const state = createNewGame(catalog);
  state.player.name = "Scout fixture";
  return state;
}

test("first clear uses one normal wave and shows the native quality bounds without an encounter", () => {
  const state = fixture();
  const before = structuredClone(state), inputCopy = copy(1001);
  const scout = getCopyScout({ state, catalog, copy: inputCopy, settings: { hard: 3, waves: 10 } });
  assert.deepEqual([scout.hard, scout.waves, scout.enemyCount], [1, 1, 1]);
  assert.match(scout.notes.join(" "), /首次通关固定普通难度、单波/);
  assert.match(scout.notes.join(" "), /不包含地图随机遭遇/);
  // Native call uses one fixed group-roll and a quality roll; encounter is suppressed.
  const native = (quality) => { let count = 0; return prepareCopyBattle({ copy: inputCopy,
    player: { ...state.player, encounterBonus: -100 }, clearCount: 0, hard: 3, waves: 10, catalog,
    draw: () => count++ === 0 ? 0 : quality }).battle.enemies[0]; };
  const low = native(0), high = native(100), group = scout.enemyGroups[0];
  for (const key of ["attack", "defense", "maxHp", "hit", "dodge", "crit", "critHurt", "resistance", "critResistance"]) {
    assert.equal(group.min[key], low[key], key); assert.equal(group.max[key], high[key], key);
  }
  assert.ok(high.attack > low.attack);
  assert.deepEqual(state, before);
});

test("cleared maps use selected difficulty and waves, including first-clear paragon scaling", () => {
  const state = fixture(); state.player.level = 80; state.player.paragon = 100;
  const selected = { hard: 4, waves: 3 };
  const first = getCopyScout({ state, catalog, copy: copy(1001), settings: selected });
  assert.deepEqual([first.hard, first.waves, first.enemyCount], [1, 1, 1]);
  state.progress.copies.push({ id: 1001, value: 1 });
  const cleared = getCopyScout({ state, catalog, copy: copy(1001), settings: selected });
  assert.deepEqual([cleared.hard, cleared.waves, cleared.enemyCount], [4, 3, 3]);
  assert.ok(cleared.enemyGroups[0].max.attack > first.enemyGroups[0].max.attack);
  assert.ok(cleared.recommendedPower > first.recommendedPower);
  assert.match(cleared.notes.join(" "), /不预测胜负/);
});

test("locked maps still disclose attributes; encounter-only records are not misrepresented", () => {
  const state = fixture();
  const locked = getCopyScout({ state, catalog, copy: copy(1002), settings: {} });
  assert.equal(locked.locked, "先通关前一关"); assert.ok(locked.enemyGroups.length);
  const encounter = getCopyScout({ state, catalog, copy: copy(4001), settings: {} });
  assert.match(encounter.unavailable, /随机遭遇/); assert.equal(encounter.locked, "地图中随机遭遇");
});

test("random instance and trial bounds cover each possible enemy and real trial state", () => {
  const state = fixture(); state.player.level = 80; state.player.paragon = 100;
  const special = getCopyScout({ state, catalog, copy: copy(2050), settings: {} });
  assert.equal(special.enemyCount, 20);
  assert.deepEqual(special.enemyGroups.map((row) => row.id), [4701, 4702, 4703, 4704, 4705]);
  assert.ok(special.enemyGroups.every((row) => row.count === null && row.max.attack > row.min.attack));
  state.trial = { status: "ready", level: 4, hard: 3 };
  const trial = getCopyScout({ state, catalog, copy: copy(3101), settings: { trialHard: 1 } });
  assert.deepEqual([trial.trialLevel, trial.trialHard, trial.enemyCount], [4, 3, 8]);
  assert.deepEqual(trial.enemyGroups.map((row) => row.id), [4801, 4802, 4803, 4804, 4805]);
  const normal = getCopyScout({ state: { ...state, trial: null }, catalog, copy: copy(3101), settings: { trialHard: 1 } });
  assert.ok(trial.enemyGroups[0].min.attack > normal.enemyGroups[0].min.attack);
  assert.ok(trial.enemyGroups[0].skills.length > 1);
  const ended = getCopyScout({ state: { ...state, trial: { ...state.trial, status: "ended" } }, catalog, copy: copy(3101), settings: {} });
  assert.equal(ended.locked, "本轮试炼已结束，请先结算奖励");
});

test("scout is deterministic and does not call shared RNG", () => {
  const state = fixture(), original = Math.random;
  Math.random = () => { throw new Error("shared RNG must not be used"); };
  try {
    const input = { state, catalog, copy: copy(2001), settings: { hard: 1, waves: 1 } };
    assert.deepEqual(getCopyScout(input), getCopyScout(input));
  } finally { Math.random = original; }
});

test("reference comparison labels are heuristic and do not promise a win", () => {
  const state = fixture();
  const danger = getCopyScout({ state, catalog, copy: copy(2001) });
  assert.equal(danger.risk, "danger"); assert.equal(danger.riskLabel, "参考值偏低");
  assert.ok(danger.reasons.some((reason) => reason.includes(String(danger.recommendedPower))));
  const stronger = structuredClone(state);
  Object.assign(stronger.player, { attack: 1000000, defense: 1000000, maxHp: 1000000 });
  const comfortable = getCopyScout({ state: stronger, catalog, copy: copy(2001) });
  assert.equal(comfortable.risk, "comfortable");
  assert.match(comfortable.notes.join(" "), /不预测胜负/);
  const closePlayer = structuredClone(state);
  Object.assign(closePlayer.player, { attack: danger.recommendedPower, defense: 0, maxHp: 0 });
  const close = getCopyScout({ state: closePlayer, catalog, copy: copy(2001) });
  assert.equal(close.risk, "close");
});

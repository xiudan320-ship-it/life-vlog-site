import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { addPortDrops, addPortTrialRewards } from "../modules/monster/port-drop-domain.js";
import { selectTrialRewards, claimTrialRewards } from "../modules/monster/trial-domain.js";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
import { settleCopyDefeat, settleCopyVictory } from "../modules/monster/adventure-domain.js";
import { findMaterialSources } from "../modules/monster/material-source-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { getCraftRequirements } from "../modules/monster/craft-domain.js";
import { upgradeSpecial } from "../modules/monster/special-upgrade-domain.js";
import { selectCopyDropIds } from "../modules/monster/loot-domain.js";
import { getCopyDropCatalog } from "../modules/monster/copy-drops-domain.js";
import { equipWing } from "../modules/monster/loadout-domain.js";
import { refreshGamePlayer } from "../modules/monster/player-refresh-domain.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, enemies, copies, chapters, groups, equipmentTemplates, trials, make] = await Promise.all(
  ["item", "skill", "enemy", "copy", "chapter", "drop-groups", "equipment-templates", "trial", "make"].map(read));
const catalog = { items, skills, enemies, copies: addPortDrops(copies, groups), chapters, equipmentTemplates, trials, make };
const recipes = new Map([[6807, 6850], [6808, 6855], [6812, 6850], [6813, 6851], [6821, 6855],
  [6823, 6851], [6824, 6853], [6852, 6858], [6814, 6857], [6863, 6864]]);

test("all missing recipe badges have shared sources with correct access locks", () => {
  const state = createNewGame(catalog);
  const native = { ...catalog, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })) };
  for (const id of recipes.keys()) {
    assert.deepEqual(findMaterialSources({ state, catalog: native, itemId: id }), [], `native catalog ${id}`);
    const sources = findMaterialSources({ state, catalog, itemId: id });
    assert.ok(sources.some((source) => source.copyId === 2015 && source.locked === "需要等级 80"), String(id));
    assert.ok(sources.every((source) => source.kind === "drop"));
  }
  assert.ok(findMaterialSources({ state, catalog, itemId: 6807 }).some((source) => source.copyId === 2005 && source.locked === "需要等级 30"));
  state.player.level = 80;
  for (const id of recipes.keys()) assert.ok(findMaterialSources({ state, catalog, itemId: id }).some((source) => source.copyId === 2015 && !source.locked), String(id));
});

test("the added group uses the existing drop threshold", () => {
  const select = (roll) => selectCopyDropIds({ groups: { percent10: [6807] }, copyType: 2, hard: 1,
    activityEnabled: false, dropRate: 100, rolls: [roll] }).itemIds;
  assert.deepEqual(select(74), [6807]);
  assert.deepEqual(select(75), []);
});

test("supplemental catalog does not mutate the original groups", () => {
  const before = structuredClone(groups);
  const assembled = addPortDrops(copies, groups);
  assert.deepEqual(groups, before);
  assert.notStrictEqual(assembled.find((row) => row.id === 2015).dropGroups.percent10, groups[2015].percent10);
  assert.deepEqual(assembled.find((row) => row.id === 2001).dropGroups.percent10.slice(0, groups[2001].percent10.length), groups[2001].percent10);
  assert.deepEqual(assembled.find((row) => row.id === 2015).dropGroups.percent10.slice(0, groups[2015].percent10.length), groups[2015].percent10);
});

test("identified premium shop items and VIP wings have in-game drop sources", async () => {
  const shop = await read("shop");
  const itemIds = new Set([...shop.map((offer) => offer.itemid), 5044, 5056, 5058, 5087, 5092, 5104, 5116,
    6818, 6819, 6820, 6821, 6822, 6823, 6824, 6863, 6902, 6903, 6904, 6905, 6906, 6907]);
  const available = new Set(catalog.copies.flatMap((copy) => getCopyDropCatalog(copy, catalog).map((entry) => entry.id)));
  for (const id of itemIds) assert.ok(available.has(id), `missing drop source ${id}`);
});

test("the first chapter boss awards a usable wing once, including to returning saves", () => {
  const state = createNewGame(catalog);
  state.progress.levelId = 6;
  const copy = catalog.copies.find((row) => row.id === 1006);
  const draw = () => 99;
  const prepared = prepareCopyBattle({ copy, player: state.player, clearCount: 0, hard: 1, waves: 1, catalog, draw });
  const input = { state, copy, prepared, catalog, draw };
  assert.ok(getCopyDropCatalog(copy, catalog).find((drop) => drop.id === 6902).conditions.some((text) => /固定/.test(text)));
  assert.ok(findMaterialSources({ state, catalog, itemId: 6902 }).some((source) => source.copyId === 1006 && source.kind === "milestone" && !source.locked));
  const defeated = settleCopyDefeat({ ...input, battle: { enemies: prepared.battle.enemies.map((enemy) => ({ ...enemy, dead: true })) } });
  assert.equal(defeated.reward.items.some((item) => item.id === 6902), false);
  const first = settleCopyVictory(input);
  assert.deepEqual(first.state.inventory.wings.map((wing) => wing.id), [6901, 6902]);
  assert.equal(first.reward.items.filter((item) => item.id === 6902).length, 1);
  const equipped = refreshGamePlayer(equipWing(first.state, 1), catalog);
  assert.equal(equipped.player.wingId, 6902);
  assert.ok(equipped.player.attack > state.player.attack);
  assert.equal(settleCopyVictory({ ...input, state: first.state }).reward.items.some((item) => item.id === 6902), false);
  const returning = { ...first.state, inventory: { ...first.state.inventory, wings: state.inventory.wings } };
  assert.equal(settleCopyVictory({ ...input, state: returning }).reward.items.filter((item) => item.id === 6902).length, 1);
});

test("a dropped VIP wing goes into the wing inventory and can be equipped", () => {
  const state = createNewGame(catalog);
  const copy = catalog.copies.find((entry) => entry.id === 2015);
  Object.assign(state.player, { level: 80, paragon: 0, dropRate: 100, goldRate: 100, experienceRate: 100 });
  const prepared = prepareCopyBattle({ copy, player: state.player, clearCount: 1, hard: 1, waves: 1, catalog, draw: () => 0 });
  const dropped = settleCopyVictory({ state, copy, prepared, catalog, draw: () => 0 }).state;
  const index = dropped.inventory.wings.findIndex((wing) => wing.id === 6907);
  assert.ok(index >= 0);
  const equipped = refreshGamePlayer(equipWing(dropped, index), catalog);
  assert.equal(equipped.player.wingId, 6907);
  assert.ok(equipped.player.attack > state.player.attack);
  assert.equal(dropped.player.wingId, 6901);
});

test("victory awards complete badges that can each be upgraded for their recipes", () => {
  const state = createNewGame(catalog);
  Object.assign(state.player, { level: 80, paragon: 0, dropRate: 100, goldRate: 100, experienceRate: 100 });
  const copy = catalog.copies.find((row) => row.id === 2015);
  const draw = () => 0;
  const prepared = prepareCopyBattle({ copy, player: state.player, clearCount: 1, hard: 1, waves: 1, catalog, draw });
  const result = settleCopyVictory({ state, copy, prepared, catalog, draw });
  for (const [id, recipeId] of recipes) {
    const badge = result.reward.items.find((item) => item.id === id);
    assert.ok(badge, `victory drop ${id}`);
    assert.equal(badge.type, 2);
    assert.equal(badge.subtype, 9);
    assert.equal(badge.strength, 0);
    assert.ok(Array.isArray(badge.attributes));
    const goods = items.filter((item) => item.type === 1).map((item) => ({ id: item.id, type: 1, quantity: 100000 }));
    let owner = { ...result.state, gold: 1900000000, inventory: { ...result.state.inventory, equipment: [badge], goods } };
    for (let count = 0; count < 5; count++) owner = upgradeSpecial({ state: owner, target: { source: "bag", index: 0, id }, catalog }).state;
    assert.equal(owner.inventory.equipment[0].strength, 5, String(id));
    assert.equal(getCraftRequirements({ state: owner, itemId: recipeId, catalog }).materials.find((material) => material.id === id).owned, 1, String(id));
  }
});

test("exchange pets have an obtainable trial reward pool and enter the pet inventory", async () => {
  const pets = await read("pet");
  const rows = addPortTrialRewards(trials), added = rows.at(-1);
  assert.equal(trials.some((row) => row.id === added.id), false);
  for (const [index, id] of JSON.parse(added.items).entries()) {
    const rolls = [0, index];
    assert.deepEqual(selectTrialRewards({ hard: 3, score: 2000, rows: [added], draw: () => rolls.shift() }), [{ type: 3, id }]);
    const state = createNewGame(catalog);
    state.trial = { hard: 3, level: 30, score: 2000, status: "ended", rewards: [], bestScores: {} };
    const draws = [0, index];
    const claimed = claimTrialRewards({ state, catalog: { ...catalog, pets, trials: [added] }, draw: () => draws.shift() });
    assert.equal(claimed.inventory.pets[0].id, id);
    assert.equal(claimed.trial.status, "claimed");
  }
  assert.deepEqual(selectTrialRewards({ hard: 2, score: 2000, rows: [added], draw: () => 0 }), []);
  assert.deepEqual(selectTrialRewards({ hard: 3, score: 1999, rows: [added], draw: () => 0 }), []);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { addPortDrops } from "../modules/monster/port-drop-domain.js";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
import { settleCopyVictory } from "../modules/monster/adventure-domain.js";
import { findMaterialSources } from "../modules/monster/material-source-domain.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { getCraftRequirements } from "../modules/monster/craft-domain.js";
import { upgradeSpecial } from "../modules/monster/special-upgrade-domain.js";
import { selectCopyDropIds } from "../modules/monster/loot-domain.js";

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
  assert.deepEqual(assembled.find((row) => row.id === 2001).dropGroups, groups[2001]);
  assert.deepEqual(assembled.find((row) => row.id === 2015).dropGroups.percent10.slice(0, groups[2015].percent10.length), groups[2015].percent10);
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

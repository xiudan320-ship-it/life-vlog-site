import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { compareEquipment, getBagItemCount } from "../modules/monster/item-comparison-domain.js";
import { collectEquipmentAttributes } from "../modules/monster/attribute-domain.js";
import { equipBagItem } from "../modules/monster/loadout-domain.js";
import { withEquipmentStrength } from "../modules/monster/equipment-domain.js";
import { addBagItem } from "../modules/monster/inventory-domain.js";
import { createCopyDrops } from "../modules/monster/item-domain.js";
import { getCopyDropCatalog } from "../modules/monster/copy-drops-domain.js";
import { decomposeEquipmentBatch, previewBatchDecomposition, getDecomposableEquipment } from "../modules/monster/bag-batch-domain.js";
import { getItemSalePreview, sellBagItem } from "../modules/monster/bag-item-domain.js";
import { describeEquipmentScore, sortBagEquipment } from "../modules/monster/bag-sort-domain.js";
import { listTargetEquipment, toggleEquipmentTarget } from "../modules/monster/equipment-target-domain.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, copies, groups] = await Promise.all(["item", "skill", "copy", "drop-groups"].map(read));
const catalog = { items, skills };

test("equipment comparison matches the actual replacement and inherited strength", () => {
  const state = createNewGame(catalog);
  const old = state.player.equipmentSets[0][0];
  const row = items.find((entry) => entry.id === old.id);
  state.player.equipmentSets[0][0] = withEquipmentStrength(old, 5, row);
  state.inventory.equipment.push({ ...old, strength: 0, equipped: false, attributes: [{ type: 9, value: 4 }] });
  const before = structuredClone(state);
  const preview = compareEquipment({ state, item: state.inventory.equipment[0], catalog });
  const equipped = equipBagItem(state, 0, catalog).player.equipmentSets[0].find((entry) => entry.subtype === old.subtype);
  assert.equal(preview.inherited, true);
  assert.deepEqual(collectEquipmentAttributes([preview.selected]), collectEquipmentAttributes([equipped]));
  assert.equal(preview.rows.find((entry) => entry.type === 9).delta, 4);
  assert.deepEqual(state, before);
});

test("bag counts distinguish owned inventory from equipped items", () => {
  const state = createNewGame(catalog);
  const sword = state.player.equipmentSets[0][0];
  const row = items.find((entry) => entry.id === sword.id);
  assert.equal(getBagItemCount(state, sword, row), 0);
  state.inventory.equipment.push({ ...sword, equipped: false }, { ...sword, equipped: false });
  assert.equal(getBagItemCount(state, sword, row), 2);
  state.inventory.goods.push({ id: 5003, type: 1, quantity: 7 });
  assert.equal(getBagItemCount(state, { id: 5003 }, items.find((entry) => entry.id === 5003)), 7);
});

test("drop previews list the settlement pool, generated materials and difficulty restrictions", () => {
  const copy = copies.find((entry) => entry.id === 2001);
  const result = getCopyDropCatalog({ ...copy, dropGroups: groups[copy.id] }, catalog);
  assert.ok(result.some((entry) => entry.id === 5003));
  assert.ok(result.some((entry) => entry.id === 6801));
  assert.ok(!result.some((entry) => entry.id === 5100), "inactive event-only drops must not be promised");
  assert.equal(result.length, new Set(result.map((entry) => entry.id)).size);
  const special = getCopyDropCatalog({ id: 5003, type: 5, dropGroups: { percent1: [1], paragondrop10: [6801] }, specialdrop: "null" }, catalog);
  assert.ok(special.some((entry) => entry.id === 6801 && entry.conditions.includes("巅峰难度")));
  assert.ok(special.some((entry) => entry.id === 5086 && entry.conditions.includes("通关奖励")));
});

test("an empty native drop entry does not crash settlement or consume item RNG", () => {
  let draws = 0;
  const drops = createCopyDrops({ itemIds: [0, 5003], catalog, copy: { type: 2 }, player: {}, draw: () => { draws += 1; return 0; } });
  assert.deepEqual(drops, [{ id: 5003, type: 1, quantity: 1 }]);
  assert.equal(draws, 0);
});

test("equipment sorting keeps original indexes and ranks the native score tier before its value", () => {
  const equipment = [{ scoreTier: 1, scoreValue: 100 }, { scoreTier: 4, scoreValue: 1 },
    { scoreTier: 3, scoreValue: 99 }, { scoreTier: 4, scoreValue: 85 }];
  assert.deepEqual(sortBagEquipment(equipment, "score").map((entry) => entry.index), [3, 1, 2, 0]);
  assert.deepEqual(sortBagEquipment(equipment, "recent").map((entry) => entry.index), [3, 2, 1, 0]);
  assert.equal(describeEquipmentScore(equipment[1]), "极品 · 1/100");
  assert.deepEqual(equipment.map((entry) => entry.scoreTier), [1, 4, 3, 4]);
});

test("batch decomposition validates all items before removal, preserves locks and combines the normal refunds", () => {
  const state = createNewGame(catalog);
  const base = { ...state.player.equipmentSets[0][0], equipped: false };
  const row = items.find((entry) => entry.id === base.id);
  state.inventory.equipment.push(withEquipmentStrength(base, 4, row), { ...base, locked: true }, { ...base, quality: 6, godLevel: 1 });
  const targets = getDecomposableEquipment(state);
  assert.deepEqual(targets.map((entry) => entry.index), [0, 2]);
  const before = structuredClone(state);
  const a = getItemSalePreview({ state, target: { ...targets[0], kind: "equipment" }, catalog });
  const b = getItemSalePreview({ state, target: { ...targets[1], kind: "equipment" }, catalog });
  const preview = previewBatchDecomposition({ state, targets, catalog });
  assert.equal(preview.gold, a.gold + b.gold);
  let expected = sellBagItem({ state, target: { ...targets[1], kind: "equipment" }, catalog }).state;
  expected = sellBagItem({ state: expected, target: { ...targets[0], kind: "equipment" }, catalog }).state;
  const result = decomposeEquipmentBatch({ state, targets, catalog });
  assert.deepEqual(result.state, expected);
  assert.equal(result.state.inventory.equipment[0].locked, true);
  assert.deepEqual(state, before);
  assert.throws(() => decomposeEquipmentBatch({ state, targets: [...targets, targets[0]], catalog }), /重复/);
  assert.throws(() => decomposeEquipmentBatch({ state, targets: [{ index: 1, id: base.id }], catalog }), /锁定/);
  assert.deepEqual(state, before);
});

test("equipment targets include every badge, wings and non-craftable rare drops, but exclude ordinary craftable jewelry", async () => {
  const state = createNewGame(catalog);
  const make = await read("make");
  const targetCatalog = { ...catalog, make, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })), trials: await read("trial") };
  const list = listTargetEquipment(targetCatalog);
  assert.equal(list.filter((item) => item.subtype === 9).length, items.filter((item) => item.type === 2 && item.subtype === 9).length);
  assert.ok(list.some((item) => item.id === 6850)); assert.ok(list.some((item) => item.id === 6913)); assert.ok(list.some((item) => item.id === 6907));
  assert.ok(list.some((item) => item.id === 6022)); assert.ok(!list.some((item) => item.id === 6502));
  const tracked = toggleEquipmentTarget(state, targetCatalog, 6801);
  assert.deepEqual(tracked.equipmentTargets, [6801]); assert.equal(state.equipmentTargets, undefined);
  assert.deepEqual(toggleEquipmentTarget(tracked, targetCatalog, 6801).equipmentTargets, []);
  assert.throws(() => toggleEquipmentTarget(state, targetCatalog, 6502), /徽章或特殊掉落/);
});

test("recent sort retains acquisition order when an older item is unequipped", () => {
  let state = createNewGame(catalog);
  const base = state.player.equipmentSets[0][0];
  state.inventory = addBagItem({ inventory: state.inventory, item: { ...base, equipped: false } });
  state.inventory = addBagItem({ inventory: state.inventory, item: { ...base, equipped: false } });
  const older = state.inventory.equipment[0], newer = state.inventory.equipment[1];
  state = equipBagItem(state, 0, catalog);
  state = equipBagItem(state, 1, catalog);
  const sorted = sortBagEquipment(state.inventory.equipment, "recent");
  assert.equal(sorted[0].item.acquisitionOrder, newer.acquisitionOrder);
  assert.equal(state.inventory.equipment.at(-1).acquisitionOrder, older.acquisitionOrder);
  state.inventory = addBagItem({ inventory: state.inventory, item: { ...base, equipped: false } });
  assert.equal(sortBagEquipment(state.inventory.equipment, "recent")[0].item.acquisitionOrder, 3);
});

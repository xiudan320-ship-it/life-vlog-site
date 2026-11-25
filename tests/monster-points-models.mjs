import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { createTaskBoard, claimTask } from "../modules/monster/task-domain.js";
import { getPointShopOffers, purchasePointOffer } from "../modules/monster/point-shop-domain.js";
import { achievementProgress, equipTitle, titleStatus } from "../modules/monster/achievement-domain.js";
import { changeCharacterModel } from "../modules/monster/character-model-domain.js";
import { refreshGamePlayer } from "../modules/monster/player-refresh-domain.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, pets, achievements, exchange, equipmentTemplates, tasks] = await Promise.all(["item", "skill", "pet", "achievement", "exchange", "equipment-templates", "task"].map(read));
const catalog = { items, skills, pets, achievements, exchange, equipmentTemplates, tasks };
const fresh = () => createTaskBoard({ state: createNewGame(catalog), catalog, draw: () => 0 });

test("task points purchase the original material bundle atomically", () => {
  const state = fresh(); state.taskBoard.points = 9;
  const task = tasks.find((row) => row.id === 64);
  state.inventory.goods.push({ id: task.target, type: 1, quantity: task.needcount });
  const earned = claimTask({ state, id: 64, catalog });
  assert.equal(earned.taskBoard.points, 10);
  const before = structuredClone(earned);
  const result = purchasePointOffer({ state: earned, catalog, id: 2 });
  assert.equal(result.state.taskBoard.points, 0);
  assert.equal(result.state.inventory.goods.find((item) => item.id === 5044).quantity, 10);
  assert.throws(() => purchasePointOffer({ state: result.state, catalog, id: 2 }), /积分不足/);
  assert.deepEqual(earned, before); validateMonsterSave(result.state);
});

test("badges, titles and pets follow the original exchange prices and conditions", () => {
  let state = fresh(); state.taskBoard.points = 1000;
  const badge = purchasePointOffer({ state, catalog, id: 22 });
  assert.equal(badge.state.taskBoard.points, 950);
  assert.ok(badge.state.inventory.equipment.some((item) => item.id === 6821 && item.attributes.length));
  const title = purchasePointOffer({ state: badge.state, catalog, id: 30 });
  const titleRow = achievements.find((row) => row.id === 144);
  assert.equal(titleStatus(titleRow, title.state, catalog).unlocked, true);
  assert.equal(equipTitle({ state: title.state, catalog, id: 144 }).achievementProgress.titleId, 144);
  assert.throws(() => purchasePointOffer({ state: title.state, catalog, id: 30 }), /已解锁/);
  state = { ...title.state, player: { ...title.state.player, level: 35 },
    achievementProgress: { ...achievementProgress(title.state), points: 500 },
    inventory: { ...title.state.inventory, goods: [{ id: 5117, type: 1, quantity: 20 }] } };
  const pet = purchasePointOffer({ state, catalog, id: 50 });
  assert.equal(pet.state.taskBoard.points, 350);
  assert.equal(pet.state.inventory.pets.at(-1).id, 4017);
  assert.ok(!pet.state.inventory.goods.some((item) => item.id === 5117)); validateMonsterSave(pet.state);
  assert.match(getPointShopOffers({ state: fresh(), catalog }).find((entry) => entry.id === 1).reason, /尚未开放/);
});

test("switching a model preserves progress and applies its bonus exactly once", () => {
  const state = fresh();
  const normal = refreshGamePlayer(state, catalog);
  const shadow = changeCharacterModel(normal, "ani/2002.png");
  const equipped = refreshGamePlayer(shadow, catalog);
  assert.equal(equipped.player.dropRate, normal.player.dropRate + 5);
  assert.equal(refreshGamePlayer(equipped, catalog).player.dropRate, equipped.player.dropRate);
  assert.deepEqual(equipped.inventory, normal.inventory); assert.equal(equipped.player.level, normal.player.level);
  const restored = refreshGamePlayer(changeCharacterModel(equipped, "ani/2001.png"), catalog);
  assert.equal(restored.player.dropRate, normal.player.dropRate);
  assert.throws(() => changeCharacterModel(state, "https://example.invalid/image.png"), /形象数据无效/);
  validateMonsterSave(equipped);
});

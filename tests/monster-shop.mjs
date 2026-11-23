import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createNewGame } from "../modules/monster/new-game-domain.js";
import { getShopOffers, purchaseShopOffer } from "../modules/monster/shop-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { validateMonsterSave } from "../modules/monster/save-state.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, skills, pets, shop] = await Promise.all(["item", "skill", "pet", "shop"].map(read));
const catalog = { items, skills, pets, shop };
const seed = () => ({ ...createNewGame(catalog), money: 200 });
const find = (state, id, quantity) => getShopOffers({ state, catalog }).find((offer) => offer.item.id === id && (!quantity || offer.quantity === quantity));

test("original magic-stone bundles are distinct and only supported goods are offered", () => {
  const state = seed();
  const offers = getShopOffers({ state, catalog });
  assert.equal(shop.length, 35);
  assert.equal(offers.length, 22);
  assert.deepEqual(offers.filter((offer) => offer.item.id === 5003).map(({ quantity, price }) => [quantity, price]), [[100, 5], [200, 10], [400, 20]]);
  assert.deepEqual(offers.filter((offer) => offer.item.id === 5105).map(({ quantity, price }) => [quantity, price]), [[1, 5], [5, 25]]);
  assert.ok(offers.every((offer) => shop[offer.index].type === 1));
  assert.ok(!offers.some((offer) => [5012, 5101, 5103, 5106, 5107, 5109, 5110].includes(offer.item.id)));
});

test("buying a bundle credits and stacks exactly once without mutating the previous state", () => {
  const state = seed(); state.inventory.goods.push({ id: 5003, type: 1, quantity: 7 });
  const before = structuredClone(state);
  const result = purchaseShopOffer({ state, catalog, index: find(state, 5003, 200).index });
  assert.equal(result.state.money, 190);
  assert.equal(result.state.inventory.goods.find((item) => item.id === 5003).quantity, 207);
  assert.deepEqual(state, before);
  assert.strictEqual(validateMonsterSave(result.state), result.state);
  const second = purchaseShopOffer({ state: result.state, catalog, index: find(result.state, 5105, 5).index });
  assert.equal(second.state.money, 165);
  assert.equal(second.state.inventory.goods.find((item) => item.id === 5105).quantity, 5);
});

test("gold is credited directly, shows the actual capped amount, and does not waste money at the cap", () => {
  const state = seed(); state.gold = 1999950000;
  const offer = find(state, 5083);
  assert.equal(offer.quantity, 50000);
  const result = purchaseShopOffer({ state, catalog, index: offer.index });
  assert.equal(result.state.gold, 2000000000);
  assert.equal(result.state.money, 198);
  assert.equal(result.state.inventory.goods.some((item) => item.id === 5083), false);
  const before = structuredClone(result.state);
  assert.throws(() => purchaseShopOffer({ state: result.state, catalog, index: offer.index }), /上限/);
  assert.deepEqual(result.state, before);
});

test("unavailable, unaffordable, invalid and overflowing purchases leave the state untouched", () => {
  const state = seed(); state.money = 1;
  const before = structuredClone(state);
  assert.throws(() => purchaseShopOffer({ state, catalog, index: find(state, 5105, 1).index }), /魔石不足/);
  for (const index of [-1, 28, 19, NaN, "0"]) assert.throws(() => purchaseShopOffer({ state, catalog, index }), /不可购买/);
  assert.deepEqual(state, before);
  state.money = 200; state.inventory.goods.push({ id: 5003, type: 1, quantity: 2147483600 });
  const overflowing = structuredClone(state);
  assert.throws(() => purchaseShopOffer({ state, catalog, index: find(state, 5003, 100).index }), /上限/);
  assert.deepEqual(state, overflowing);
});

function controllerFixture(initial) {
  let remote = structuredClone(initial);
  const attempts = [], views = [], notices = [];
  const store = {
    fail: true,
    async load() { return structuredClone(remote); },
    async save(state) {
      attempts.push(structuredClone(state));
      if (this.fail) throw Object.assign(new Error("fixture failure"), { status: 503 });
      remote = structuredClone(state);
    },
  };
  const view = {
    async menu() {}, repeatStatus() {}, updateHome() {}, saveStatus() {},
    shop(state, _catalog, options) { views.push({ state: structuredClone(state), options }); },
    notice(message) { notices.push(message); },
    closeMaterialSources() {},
    loadError(message) { throw new Error(message); },
  };
  const controller = createMonsterGameController({ catalog, store, view, random: () => 0, wait: async () => {} });
  return { controller, store, attempts, views, notices, remote: () => structuredClone(remote) };
}

test("a failed account save blocks another purchase and retry commits the same result", async () => {
  const initial = seed(), f = controllerFixture(initial);
  await f.controller.initialize();
  const index = find(initial, 5105, 5).index;
  await f.controller.buyShopOffer(index);
  assert.equal(f.attempts.length, 1);
  assert.equal(f.views.at(-1).options.receipt.saved, false);
  assert.equal(f.views.at(-1).options.receipt.status, 503);
  assert.deepEqual(f.remote(), initial);
  await f.controller.buyShopOffer(index);
  assert.equal(f.attempts.length, 1);
  assert.match(f.notices.at(-1), /重试保存/);
  f.store.fail = false;
  assert.equal(await f.controller.save(), true);
  assert.deepEqual(f.attempts[0], f.attempts[1]);
  assert.equal(f.remote().money, 175);
  assert.equal(f.remote().inventory.goods.find((item) => item.id === 5105).quantity, 5);
});

test("offline runs block purchases before any account mutation", async () => {
  const initial = seed(); initial.offlineRun = { copyId: 1001, hard: 1, waves: 1, startedAt: 1, seed: 1 };
  const f = controllerFixture(initial); await f.controller.initialize();
  await f.controller.buyShopOffer(find(initial, 5105, 1).index);
  assert.equal(f.attempts.length, 0);
  assert.deepEqual(f.remote(), initial);
  assert.match(f.notices.at(-1), /离线挂机/);
});

test("an in-flight purchase cannot be duplicated or redraw a destroyed account session", async () => {
  const initial = seed(), f = controllerFixture(initial);
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  f.store.save = async (state) => { f.attempts.push(structuredClone(state)); await gate; };
  await f.controller.initialize();
  const index = find(initial, 5105, 1).index;
  const first = f.controller.buyShopOffer(index);
  await f.controller.buyShopOffer(index);
  assert.equal(f.attempts.length, 1);
  f.controller.destroy();
  finish(); await first;
  assert.equal(f.views.length, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { findMaterialSources } from "../modules/monster/material-source-domain.js";
import { createMonsterGameController } from "../modules/monster/game-controller.js";
import { createNewGame } from "../modules/monster/new-game-domain.js";

const read = async (name) => JSON.parse(await readFile(new URL(`../public/monster/data/${name}.json`, import.meta.url), "utf8"));
const [items, copies, groups, chapters, trials, skills] = await Promise.all(["item", "copy", "drop-groups", "chapter", "trial", "skill"].map(read));
const catalog = { items, copies: copies.map((copy) => ({ ...copy, dropGroups: groups[copy.id] })), chapters, trials, skills };
const state = { player: { level: 1, paragon: 0 }, progress: { chapterId: 1, levelId: 1, copies: [] } };
const find = (itemId, playerState = state, data = catalog) => findMaterialSources({ state: playerState, catalog: data, itemId });

test("native explicit and generated drops report probability and current map access", () => {
  const explicit = find(5046);
  assert.deepEqual(explicit[0], { copyId: 1001, type: 1, name: "草原白狼", level: 1, chapterId: 1,
    locked: null, kind: "drop", detail: "概率掉落" });
  assert.ok(explicit.some((source) => source.copyId === 1003 && source.locked === "先通关前一关"));
  assert.ok(!explicit.some((source) => source.copyId === 1002 && source.kind === "drop"));
  const generated = find(5003);
  assert.ok(generated.some((source) => source.copyId === 1001 && source.kind === "drop"));
  assert.ok(generated.some((source) => source.copyId === 2001 && source.locked === "需要等级 10"));
  assert.equal(find(5100).length, 0); // activity drops are disabled in settlement
  assert.deepEqual(find(999999), []);
});

test("abyss fixed rewards and trial reward rows retain their real conditions", () => {
  const abyss = find(5086);
  assert.ok(abyss.some((source) => source.copyId === 5003 && source.kind === "milestone"
    && source.locked === "需要等级 30" && source.detail === "通关固定奖励"));
  assert.ok(!abyss.some((source) => source.copyId === 5002 && source.kind === "milestone"));
  assert.ok(find(5058).some((source) => source.copyId === 5006 && source.kind === "milestone"));
  assert.ok(find(5116).some((source) => source.copyId === 3101 && source.kind === "trial"
    && source.detail === "试炼难度 1、积分 50 起概率获得"));
});

test("random encounters point to eligible parent maps, never the non-selectable encounter", () => {
  const sources = find(5102);
  assert.ok(sources.some((source) => source.copyId === 1001 && source.kind === "encounter"
    && source.detail.includes("盗宝哥布林")));
  assert.ok(sources.every((source) => source.type !== 4));
  const overlevelled = { ...state, player: { level: 30, paragon: 0 } };
  assert.ok(!find(5102, overlevelled).some((source) => source.copyId === 1001 && source.kind === "encounter"));
});

test("paragon-only drop and encounter paths show the difficulty lock", () => {
  const data = { items: [{ id: 7000, type: 1 }], chapters: [{ id: 1, minid: 1001, maxid: 1001 }], trials: [],
    copies: [{ id: 1001, type: 1, name: "地图", level: 1, dropGroups: { paragondrop10: [7000] } },
      { id: 4002, type: 4, name: "巅峰遭遇", level: 1, dropGroups: { percent300: [7000] } }] };
  const locked = find(7000, state, data);
  assert.equal(locked.length, 2);
  assert.ok(locked.every((source) => source.locked === "需要等级 80 且巅峰 100"));
  assert.ok(locked.every((source) => source.hard === 4));
  assert.ok(locked.some((source) => source.kind === "encounter" && source.detail.includes("巅峰难度")));
  const capable = { ...state, player: { level: 80, paragon: 100 } };
  assert.equal(find(7000, capable, data).find((source) => source.kind === "drop").locked, null);
});

test("source navigation opens locations without starting battles or saving", async () => {
  const seed = createNewGame(catalog);
  seed.player.level = 10;
  seed.progress.chapterId = 2;
  const calls = { sources: [], selections: [], notices: [], closed: 0, saves: 0, battles: 0 };
  const view = {
    menu() {}, loadError(message) { throw new Error(message); },
    materialSources(current, data, itemId, sources) { calls.sources.push({ current, data, itemId, sources }); },
    selectCopy(current, data, settings) { calls.selections.push(structuredClone(settings)); },
    closeMaterialSources() { calls.closed++; }, notice(message) { calls.notices.push(message); },
    battle() { calls.battles++; },
  };
  const store = { async load() { return structuredClone(seed); }, async save() { calls.saves++; } };
  const controller = createMonsterGameController({ catalog, store, view, random: () => 0, wait: async () => {} });
  await controller.initialize();
  controller.materialSources(5046);
  assert.equal(calls.sources.length, 1);
  assert.equal(calls.sources[0].itemId, 5046);
  assert.equal(calls.sources[0].data, catalog);
  assert.ok(calls.sources[0].sources.some((source) => source.copyId === 1001 && !source.locked));
  assert.ok(calls.sources[0].sources.some((source) => source.copyId === 1003 && !source.locked));
  controller.closeMaterialSources();
  assert.equal(calls.closed, 1);

  controller.goToCopy(1007);
  assert.deepEqual({ type: calls.selections[0].type, chapterId: calls.selections[0].chapterId,
    focusCopyId: calls.selections[0].focusCopyId, repeat: calls.selections[0].repeat },
  { type: 1, chapterId: 2, focusCopyId: 1007, repeat: false });
  controller.goToCopy(2001);
  assert.equal(calls.selections[1].type, 2);
  assert.equal(calls.selections[1].focusCopyId, 2001);
  controller.goToCopy(1001, { hard: 4 });
  controller.goToCopy(1008);
  controller.goToCopy(4001);
  assert.equal(calls.selections.length, 2);
  assert.deepEqual(calls.notices, ["当前角色尚未解锁此难度", "先通关前一关"]);
  assert.equal(calls.battles, 0);
  assert.equal(calls.saves, 0);
});

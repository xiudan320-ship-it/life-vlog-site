import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { prepareCopyBattle } from "../modules/monster/copy-domain.js";
import { calculateInstanceRewards } from "../modules/monster/reward-domain.js";
import { createAbyssMilestoneDrops } from "../modules/monster/loot-domain.js";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const catalog = Object.fromEntries(await Promise.all(["copy", "enemy", "skill"].map(async (name) => [name === "copy" ? "copies" : `${name === "enemy" ? "enemie" : name}s`, await read(`../public/monster/data/${name}.json`)])));
const groups = await read("../public/monster/data/drop-groups.json");
catalog.copies = catalog.copies.map((row) => ({ ...row, dropGroups: groups[row.id] }));
const fixture = await read("./fixtures/monster/native-copy-preparation-fixtures.json");
test("every regular map and instance matches original preparation in 576 cases", () => {
  for (const item of fixture.cases) {
    const input = item.input;
    let draws = 0;
    const prepared = prepareCopyBattle({ copy: catalog.copies.find((row) => row.id === input.copyId), player: { level: input.level, paragon: input.paragon }, clearCount: input.cleared, hard: input.hard, waves: input.waves, catalog, draw: () => { draws += 1; return input.roll; } });
    const enemies = prepared.battle.enemies.map((enemy) => Object.fromEntries(Object.keys(item.expected.enemies[0]).map((key) => [key, enemy[key]])));
    assert.deepEqual({ copyId: input.copyId, hard: prepared.hard, enemyCount: prepared.enemyCount, enemies, rewardRate: prepared.rewardRate }, item.expected, String(input.copyId));
    assert.equal(draws, item.drawCount, `RNG ${input.copyId}`);
  }
});

const rewards = await read("./fixtures/monster/native-instance-reward-fixtures.json");
test("instance, boss, abyss and trial rewards preserve 96 native numeric branches", () => {
  for (const item of rewards.cases) {
    const result = calculateInstanceRewards(item.input);
    const { gold, experience, honor, dropRate, levelFactor, rewardRate } = result;
    assert.deepEqual({ gold, experience, honor, dropRate, levelFactor, goldRate: rewardRate, expRate: rewardRate }, item.expected);
  }
});

const special = await read("./fixtures/monster/native-special-copy-preparation-fixtures.json");
test("all abyss, encounter and trial records preserve 139 native preparations", () => {
  for (const item of special.cases) {
    const input = item.input;
    let draws = 0;
    const prepared = prepareCopyBattle({ copy: catalog.copies.find((row) => row.id === input.copyId), player: { level: input.level, paragon: input.paragon }, clearCount: input.cleared, hard: input.hard, waves: input.waves, catalog, draw: () => { draws += 1; return input.roll; } });
    const enemies = prepared.battle.enemies.map((enemy) => Object.fromEntries(Object.keys(item.expected.enemies[0]).map((key) => [key, enemy[key]])));
    const { paragonOffset, ...expected } = item.expected;
    assert.deepEqual({ copyId: input.copyId, hard: prepared.hard, enemyCount: prepared.enemyCount, enemies, rewardRate: prepared.rewardRate }, expected, String(input.copyId));
    assert.equal(draws, item.drawCount, `RNG ${input.copyId}`);
    assert.equal(typeof paragonOffset, "boolean");
  }
});

const rare = await read("./fixtures/monster/native-rare-preparation-fixtures.json");
test("random map encounters preserve 30 native mixed-wave preparations", () => {
  for (const item of rare.cases) {
    let used = 0;
    const prepared = prepareCopyBattle({ ...item.input, copy: catalog.copies.find((row) => row.id === item.input.copyId), clearCount: 1, catalog, draw: () => item.rolls[used++] });
    const enemies = prepared.battle.enemies.map((enemy) => Object.fromEntries(Object.keys(item.expected.enemies[0]).map((key) => [key, enemy[key]])));
    assert.deepEqual({ encounterCopyId: prepared.encounterCopy?.id || null, enemies, rewardRate: prepared.rewardRate }, item.expected);
    assert.equal(used, item.rolls.length);
  }
});

const milestones = await read("./fixtures/monster/native-abyss-milestone-fixtures.json");
const items = await read("../public/monster/data/item.json");
test("all 114 abyss floors retain their original fixed and every-third-floor rewards", () => {
  for (const item of milestones.cases) assert.deepEqual(createAbyssMilestoneDrops({ copy: catalog.copies.find((row) => row.id === item.copyId), items }), item.expected);
});

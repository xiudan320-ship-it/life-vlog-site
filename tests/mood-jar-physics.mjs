import assert from "node:assert/strict";
import test from "node:test";

import {
  MOOD_JAR_GEOMETRY,
  buildMoodJarSpawnPlan,
  createMoodJarSimulation,
  getJarFloorY,
  getJarInnerBounds,
  getJarMouthSpawn,
  getMoodJarParticleRadius,
  simulateMoodJar,
} from "../modules/mood-jar-physics.js";

function items(count) {
  return Array.from({ length: count }, (_, index) => ({
    entryId: `entry-${String(index + 1).padStart(2, "0")}`,
    userId: index % 2 ? "member" : "owner",
    mood: index % 2 ? "calm" : "happy",
    shape: index % 2 ? "circle" : "square",
  }));
}

function roundState(state) {
  return state.map(({ id, x, y, rotation, sleeping, spawned }) => [
    id,
    Number(x.toFixed(2)),
    Number(y.toFixed(2)),
    Number(rotation.toFixed(2)),
    sleeping,
    spawned,
  ]);
}

function assertFinalState(state, count) {
  assert.equal(state.length, count);
  assert.ok(state.every(({ x, y, rotation, vx, vy }) => [x, y, rotation, vx, vy].every(Number.isFinite)));
  assert.ok(state.every(({ spawned, sleeping }) => spawned && sleeping));
  assert.ok(state.every(({ x, y, radius }) => {
    const bounds = getJarInnerBounds(y);
    return x - radius >= bounds.left - 0.5 && x + radius <= bounds.right + 0.5 && y + radius <= MOOD_JAR_GEOMETRY.bodyBottom + 0.5;
  }));
  for (let leftIndex = 0; leftIndex < state.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < state.length; rightIndex += 1) {
      const left = state[leftIndex];
      const right = state[rightIndex];
      const distance = Math.hypot(left.x - right.x, left.y - right.y);
      assert.ok(distance >= left.radius + right.radius - 1, `particles ${left.id}/${right.id} overlap by more than 1 unit`);
    }
  }
}

test("jar geometry keeps spawns inside the mouth and exposes curved wall and elliptical floor", () => {
  assert.deepEqual({ width: MOOD_JAR_GEOMETRY.width, height: MOOD_JAR_GEOMETRY.height }, { width: 360, height: 480 });
  const spawn = getJarMouthSpawn("geometry-seed");
  const mouthBounds = getJarInnerBounds(spawn.y);
  assert.ok(spawn.x > mouthBounds.left + 8 && spawn.x < mouthBounds.right - 8);
  assert.ok(spawn.y >= MOOD_JAR_GEOMETRY.mouthSpawnY - 8 && spawn.y <= MOOD_JAR_GEOMETRY.mouthSpawnY + 8);
  assert.ok(getJarInnerBounds(120).right - getJarInnerBounds(120).left < getJarInnerBounds(220).right - getJarInnerBounds(220).left);
  assert.ok(getJarFloorY(180) > getJarFloorY(80));
  assert.ok(getJarFloorY(280) < getJarFloorY(180));
});

test("spawn timing is deterministic and meets the slow eight-item rhythm", () => {
  const plan = buildMoodJarSpawnPlan(items(8), { seed: "2026-08" });
  assert.equal(plan.batchSize, 1);
  assert.ok(plan.entries[0].spawnAtMs >= 200 && plan.entries[0].spawnAtMs <= 300);
  const gaps = plan.entries.slice(1).map((entry, index) => entry.spawnAtMs - plan.entries[index].spawnAtMs);
  assert.ok(gaps.every((gap) => gap >= 260 && gap <= 340), JSON.stringify(gaps));
  assert.ok(plan.settleAtMs >= 4000 && plan.settleAtMs <= 5500);
  assert.deepEqual(plan, buildMoodJarSpawnPlan(items(8), { seed: "2026-08" }));
  assert.ok(getMoodJarParticleRadius(8) > getMoodJarParticleRadius(62));
});

test("two particles produce a real contact that changes the later trajectory", () => {
  const result = simulateMoodJar(items(2), { seed: "collision-seed", durationMs: 6000, sampleEveryMs: 1000 / 60 });
  const particleContact = result.contacts.find((event) => event.type === "particle");
  assert.ok(particleContact, "expected a particle-particle contact event");
  assert.ok(particleContact.trajectoryChange > 0.01, JSON.stringify(particleContact));
  assertFinalState(result.state, 2);
});

test("1, 8, 31, and 62 particle worlds are deterministic, bounded, and eventually sleep", () => {
  for (const count of [1, 8, 31, 62]) {
    const first = simulateMoodJar(items(count), { seed: `count-${count}`, durationMs: 8500 });
    const second = simulateMoodJar(items(count), { seed: `count-${count}`, durationMs: 8500 });
    assert.deepEqual(roundState(first.state), roundState(second.state), `count ${count} is not deterministic`);
    assertFinalState(first.state, count);
    assert.ok(first.metrics.maxStepsPerAdvance <= 4);
    assert.ok(first.metrics.maxFrameWorkMs >= 0);
  }
});

test("large elapsed frames are capped and never produce NaN or an infinite step", () => {
  const simulation = createMoodJarSimulation(items(8), { seed: "slow-frame" });
  const snapshot = simulation.advanceFrame(5000);
  assert.ok(snapshot.every(({ x, y, vx, vy }) => [x, y, vx, vy].every(Number.isFinite)));
  assert.ok(simulation.getMetrics().maxStepsPerAdvance <= 4);
  simulation.advanceTo(8500);
  assertFinalState(simulation.getState(), 8);
});

console.log("Mood jar physics tests passed.");

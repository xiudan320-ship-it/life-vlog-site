import { advanceSoloBattle } from "./battle-domain.js";
import { preparePetBattle } from "./pet-battle-domain.js";
import { getCopyAccess, maximumCopyDifficulty, prepareCopyBattle } from "./copy-domain.js";
import { payCopyEntry, settleCopyDefeat, settleCopyVictory } from "./adventure-domain.js";
import { recordTaskBattle } from "./task-domain.js";
import { refreshGamePlayer } from "./player-refresh-domain.js";

export const MAX_OFFLINE_MS = 20 * 60 * 60 * 1000;
const ACTION_MS = 550;
const RESULT_MS = 450;
const REPEAT_MS = 1800;
// The save API caps the entire request at 1 MiB. Leave room for its envelope.
const MAX_STATE_BYTES = 1024 * 1024 - 4096;
const encoder = new TextEncoder();
const byteSize = (value) => encoder.encode(JSON.stringify(value)).byteLength;

export function createOfflineRun({ state, catalog, copyId, hard, waves, startedAt, seed }) {
  if (state.offlineRun) throw new RangeError("请先领取当前离线挂机收益。");
  const copy = catalog.copies.find((entry) => entry.id === copyId);
  if (!copy || ![1, 2, 3, 5].includes(copy.type)) throw new RangeError("请选择可重复挑战的地图或副本。");
  const reason = getCopyAccess(copy, state, catalog.chapters);
  if (reason) throw new RangeError(reason);
  if (!state.progress.copies.some((entry) => entry.id === copyId && entry.value > 0)) throw new RangeError("请先通关此关卡，再开启离线挂机。");
  if (!Number.isSafeInteger(hard) || hard < 1 || hard > maximumCopyDifficulty(state.player)
    || !Number.isSafeInteger(waves) || waves < 1 || waves > Math.min(100, 10 + (state.player.extraWaves || 0))
    || !Number.isSafeInteger(startedAt) || startedAt < 1
    || !Number.isSafeInteger(seed) || seed < 1 || seed > 0x7fffffff) throw new RangeError("离线挂机参数无效。");
  if (copy.copyprice && (state.inventory.goods.find((item) => item.id === 5009)?.quantity || 0) < copy.copyprice) {
    throw new RangeError(`副本卷轴不足，需要 ${copy.copyprice} 张`);
  }
  return { ...state, offlineRun: { copyId, hard, waves, startedAt, seed } };
}

/** A saved seed makes a failed/retried calculation reproducible. */
function seededRandom(seed) {
  let value = seed | 0;
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    return (value >>> 0) & 0x7fffffff;
  };
}

/** Replay the existing fight and reward rules against server-measured time. */
export function simulateOffline({ state, catalog, serverNow, onProgress = () => {} }) {
  const run = state.offlineRun;
  if (!run || !Number.isSafeInteger(serverNow) || serverNow < run.startedAt) throw new RangeError("服务器时间早于挂机开始时间，请稍后重试。");
  const copy = catalog.copies.find((entry) => entry.id === run.copyId);
  if (!copy || ![1, 2, 3, 5].includes(copy.type)) throw new RangeError("挂机关卡不存在，请保留存档并重试。");
  const elapsedMs = Math.min(MAX_OFFLINE_MS, serverNow - run.startedAt);
  let remaining = elapsedMs;
  let current = refreshGamePlayer(state, catalog);
  let estimatedSize = byteSize(current);
  let victories = 0, defeats = 0, kills = 0, experience = 0, actions = 0, attempts = 0;
  let reason = elapsedMs === MAX_OFFLINE_MS ? "cap" : "claimed";
  const initialGold = state.gold;
  const drops = new Map();
  const draw = seededRandom(run.seed);
  const report = () => onProgress(elapsedMs ? Math.min(1, (elapsedMs - remaining) / elapsedMs) : 1);
  const remember = (reward) => {
    experience += reward.experience;
    for (const item of reward.items) {
      const key = `${item.type}:${item.id}`;
      const previous = drops.get(key);
      if (previous) previous.quantity += item.type === 1 ? item.quantity : 1;
      else drops.set(key, { id: item.id, type: item.type, quantity: item.type === 1 ? item.quantity : 1 });
    }
  };
  const accept = (candidate, reward) => {
    estimatedSize += reward.items.reduce((total, item) => total + (item.type === 1 ? 16 : byteSize(item) + 1), 0) + 8;
    if (estimatedSize > MAX_STATE_BYTES - 65536 || attempts % 250 === 0) {
      estimatedSize = byteSize(candidate);
      if (estimatedSize > MAX_STATE_BYTES) return false;
    }
    current = candidate;
    remember(reward);
    return true;
  };
  while (remaining >= ACTION_MS) {
    const beforeBattle = current;
    if (copy.copyprice && (current.inventory.goods.find((item) => item.id === 5009)?.quantity || 0) < copy.copyprice) {
      current = beforeBattle; reason = "tickets"; break;
    }
    const basePrepared = prepareCopyBattle({ copy, player: current.player,
      clearCount: current.progress.copies.find((entry) => entry.id === copy.id)?.value || 0,
      hard: run.hard, waves: run.waves, catalog, draw });
    const prepared = preparePetBattle({ prepared: basePrepared, state: current, catalog, draw });
    current = payCopyEntry(current, copy);
    let battle = prepared.battle;
    while (remaining >= ACTION_MS && ![1, 3].includes(battle.outcome)) {
      remaining -= ACTION_MS;
      battle = advanceSoloBattle(battle, { draw, skills: catalog.skills }).battle;
      actions += 1;
      if (actions % 250 === 0) report();
    }
    const finished = [1, 3].includes(battle.outcome) && remaining >= RESULT_MS;
    if (finished) remaining -= RESULT_MS;
    const partial = !finished || battle.outcome !== 3;
    const defeated = battle.enemies.filter((enemy) => enemy.dead).length;
    const outcome = partial ? { ...battle, outcome: 1 } : battle;
    const finishedState = finished ? { ...current, player: { ...current.player, hp: battle.allies[0].hp, dead: battle.allies[0].dead } } : current;
    const counted = recordTaskBattle({ state: finishedState, copy, prepared, battle: outcome });
    const settlement = partial
      ? settleCopyDefeat({ state: counted, copy, prepared, battle: outcome, catalog, draw })
      : settleCopyVictory({ state: counted, copy, prepared, catalog, draw });
    attempts += 1;
    if (!accept(refreshGamePlayer(settlement.state, catalog), settlement.reward)) { current = beforeBattle; reason = "storage"; break; }
    kills += defeated;
    if (battle.outcome === 1) defeats += 1;
    if (!finished) break;
    if (battle.outcome === 3) victories += 1;
    if (remaining < REPEAT_MS) break;
    remaining -= REPEAT_MS;
  }
  report();
  const { offlineRun: _completedRun, ...completed } = current;
  return {
    state: completed,
    summary: { copyId: run.copyId, elapsedMs, simulatedMs: elapsedMs - remaining, victories, defeats, kills,
      gold: completed.gold - initialGold, experience, items: [...drops.values()], reason },
  };
}

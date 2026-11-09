import { creditBattleLoot } from "./settlement-domain.js";
import { addBagItem } from "./inventory-domain.js";

export function selectLevelTasks({ level, rows, draw }) {
  const eligible = rows.filter((row) => row.id <= 499 && row.level >= Math.max(0, level - 13) && row.level <= Math.min(80, level + 2));
  const selected = [];
  if (eligible.length <= 10) selected.push(...eligible);
  else while (selected.length < 10) {
    const row = eligible[draw() % eligible.length];
    if (!selected.includes(row)) selected.push(row);
  }
  return selected.map((row) => ({ id: row.id, type: row.type, target: row.target, need: row.needcount, count: 0, claimed: 0 }));
}

export function createTaskBoard({ state, catalog, draw, dailyRewardDay = null }) {
  const entries = selectLevelTasks({ level: state.player.level, rows: catalog.tasks, draw });
  entries.push(...catalog.tasks.filter((row) => row.type >= 11).map((row) => ({ id: row.id, type: row.type, target: row.target, need: row.needcount, count: 0, claimed: 0 })));
  return { ...state, taskBoard: { dailyRewardDay, points: state.taskBoard?.points || 0, entries } };
}

export function recordTaskBattle({ state, copy, prepared, battle }) {
  if (!state.taskBoard) return state;
  const kills = battle.enemies.filter((enemy) => enemy.dead).length;
  const victory = battle.outcome === 3;
  const close = state.player.level - copy.level <= 5;
  const entries = state.taskBoard.entries.map((entry) => {
    if (entry.claimed) return entry;
    let amount = 0;
    if (entry.target === copy.id && entry.type === 1 && copy.type === 1) amount = kills;
    if (entry.target === copy.id && entry.type === 2 && copy.type === 2 && victory) amount = 1;
    if (entry.type === 11 && close) amount = kills;
    if (entry.type === 12 && copy.type === 2 && close && victory) amount = 1;
    if (entry.type === 13 && [1, 2].includes(copy.type) && prepared.encounterCopy && battle.enemies.at(-1).dead) amount = 1;
    return amount ? { ...entry, count: Math.min(entry.need, entry.count + amount) } : entry;
  });
  return { ...state, taskBoard: { ...state.taskBoard, entries } };
}

export function taskCount(entry, state) {
  return [3, 15].includes(entry.type) ? Math.min(entry.need, state.inventory.goods.find((item) => item.id === entry.target)?.quantity || 0) : entry.count;
}

export function claimTask({ state, id, catalog }) {
  const entry = state.taskBoard?.entries.find((entry) => entry.id === id);
  if (!entry || entry.claimed) throw new RangeError("任务不存在或已经领取");
  if (taskCount(entry, state) < entry.need) throw new RangeError("任务尚未完成");
  const row = catalog.tasks.find((row) => row.id === id);
  if (state.player.level < row.level) throw new RangeError(`需要等级 ${row.level}`);
  let inventory = state.inventory;
  if ([3, 15].includes(entry.type)) inventory = { ...inventory, goods: inventory.goods
    .map((item) => item.id === entry.target ? { ...item, quantity: item.quantity - entry.need } : item).filter((item) => item.quantity > 0) };
  const credited = creditBattleLoot({ ...state, inventory }, { gold: 0, experience: row.awardexp, items: [] }).state;
  return { ...credited, money: state.money + row.awardmoney, taskBoard: { ...state.taskBoard,
    points: state.taskBoard.points + row.awardspecial,
    entries: state.taskBoard.entries.map((value) => value === entry ? { ...entry, count: entry.need, claimed: 1 } : value) } };
}

export function gameDay(now) { return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10); }

export function claimDailyReward({ state, catalog, draw, day }) {
  if (state.taskBoard?.dailyRewardDay && day <= state.taskBoard.dailyRewardDay) throw new RangeError("今日奖励已领取");
  const refreshed = createTaskBoard({ state, catalog, draw, dailyRewardDay: day });
  return { ...refreshed, money: state.money + 10,
    inventory: addBagItem({ inventory: state.inventory, item: { id: 5009, type: 1, quantity: 5 } }) };
}

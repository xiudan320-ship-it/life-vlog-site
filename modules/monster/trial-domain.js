import { addBagItem } from "./inventory-domain.js";
import { createCatalogEquipment, rollEquipmentScore, rollGodEquipment } from "./item-domain.js";

const float = Math.fround;

export function beginTrial(state, hard) {
  if (![1, 2, 3].includes(hard)) throw new RangeError("试炼难度应为 1–3");
  if (state.trial && state.trial.status !== "claimed") throw new RangeError("请先完成本轮试炼");
  return { ...state, trial: { hard, level: 1, score: 0, status: "ready", bestScores: { ...state.trial?.bestScores }, rewards: [] } };
}

// WarFinishLayer::showTrialDialog: multiplier draw precedes the base-score draw.
export function advanceTrial({ trial, scoreBonus = 0, draw }) {
  const multiplier = 8 + draw() % 5;
  let gain = 70 + draw() % 11 + trial.level * multiplier;
  if (scoreBonus > 0) gain = Math.trunc(float(float(gain) * float(1.1)));
  gain = Math.min(500, gain);
  const score = trial.score + gain;
  return { ...trial, level: trial.level + 1, score,
    bestScores: { ...trial.bestScores, [trial.hard]: Math.max(trial.bestScores[trial.hard] || 0, score) } };
}

// GameData::getTrialItems. Probability uses the catalog row's hard, not the
// selected hard. Explicit catalog order is also used by the native fixtures.
export function selectTrialRewards({ hard, score, rows, draw }) {
  const rewards = [];
  for (const row of rows) {
    if (hard < row.hard || score < row.score) continue;
    const rate = float(float(1) + float(float(row.hard - 1) * float(0.2)));
    if (draw() % 100 + 1 > Math.trunc(float(float(row.itemweight) * rate))) continue;
    const ids = JSON.parse(row.items);
    const id = row.itemid || (ids.length ? ids[draw() % ids.length] : 0);
    if (!id || row.itemnum <= 0) continue;
    rewards.push({ type: row.itemtype, id, ...(row.itemtype <= 2 ? { quantity: row.itemtype === 1 ? row.itemnum : 1 } : {}) });
  }
  return rewards;
}

export function claimTrialRewards({ state, catalog, draw }) {
  const trial = state.trial;
  if (!trial || trial.status === "claimed") throw new RangeError("没有待结算的试炼");
  const selected = selectTrialRewards({ hard: trial.hard, score: trial.score, rows: catalog.trials, draw });
  let inventory = state.inventory;
  const rewards = [];
  for (const selectedItem of selected) {
    let item = selectedItem;
    if (item.type === 3) {
      const row = catalog.pets.find((row) => row.id === item.id);
      if (!row) throw new RangeError(`缺少原版宠物 ${item.id}`);
      // Initial core stats are derived from native factory defaults; growth and
      // independent pet actions are separate from ownership and main-pet tags.
      item = { id: row.id, type: 3, level: row.level, quality: row.quality, experience: 0 };
      inventory = { ...inventory, pets: [...inventory.pets, item] };
    } else {
      if (item.type === 2) {
        const row = catalog.items.find((row) => row.id === item.id);
        const score = rollEquipmentScore(draw);
        const god = rollGodEquipment({ mode: 7, mainValue: row.mainvalue, draw });
        item = createCatalogEquipment({ row, template: catalog.equipmentTemplates[row.id], ...score, god });
      }
      inventory = addBagItem({ inventory, item });
    }
    rewards.push(item);
  }
  return { ...state, inventory, trial: { ...trial, status: "claimed", rewards } };
}

import { calculateRegularCopyRewards, calculateInstanceRewards } from "./reward-domain.js";
import { selectCopyDropIds, prepareCopyDropGroups, createAbyssMilestoneDrops } from "./loot-domain.js";
import { createCopyDrops } from "./item-domain.js";
import { creditBattleLoot } from "./settlement-domain.js";
import { recordRegularCopyVictory, incrementCopyClear } from "./copy-progress-domain.js";
import { copyUsesParagon } from "./copy-domain.js";

export function payCopyEntry(state, copy) {
  if (!copy.copyprice) return state;
  const ticket = state.inventory.goods.find((item) => item.id === 5009);
  if (!ticket || ticket.quantity < copy.copyprice) throw new RangeError(`副本卷轴不足，需要 ${copy.copyprice} 张`);
  return { ...state, inventory: { ...state.inventory, goods: state.inventory.goods
    .map((item) => item === ticket ? { ...item, quantity: item.quantity - copy.copyprice } : item)
    .filter((item) => item.quantity > 0) } };
}

export function settleCopyVictory({ state, copy, prepared, catalog, draw }) {
  const clearCount = state.progress.copies.find((entry) => entry.id === copy.id)?.value || 0;
  const hard = prepared.rewardHard;
  const input = { copy: { ...copy, clearCount }, player: state.player, hard,
    globalRate: prepared.rewardRate, enemyCount: prepared.enemyCount, rareRoll: draw(),
    paragonOffset: copyUsesParagon(copy, hard) ? Math.fround(Math.fround(state.player.paragon / 150) + Math.fround(1.2)) : null,
    trialLevel: state.player.trialLevel || 1, trialHard: state.player.trialHard || 1 };
  const reward = copy.type === 1 ? calculateRegularCopyRewards(input) : calculateInstanceRewards(input);
  reward.items = [];
  function drops(dropCopy, groups, dropRate) {
    // Original drop selection may draw once more for the exceptional item 6865.
    const count = Object.entries(groups).reduce((sum, [key, ids]) => sum + (key === "paragondrop10" && hard <= 3 ? 0 : ids.length) + (key === "percent1" && [1, 2].includes(dropCopy.type) ? ids.filter((id) => id === 6865).length : 0), 0);
    const selected = selectCopyDropIds({ groups, copyType: dropCopy.type, hard,
      activityEnabled: false, dropRate, rolls: Array.from({ length: count }, draw) });
    reward.items.push(...createCopyDrops({ itemIds: selected.itemIds, catalog, copy: dropCopy, player: state.player, draw }));
  }
  const attempts = copy.type === 1 ? prepared.enemyCount : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) drops(copy, prepared.groups, reward.dropRate);
  reward.items.push(...createAbyssMilestoneDrops({ copy, items: catalog.items }));
  if (prepared.encounterCopy) {
    const rare = prepared.encounterCopy;
    drops(rare, prepareCopyDropGroups({ copy: rare, roll: 0 }), Math.fround(reward.levelFactor * 100));
    reward.gold = (reward.gold + rare.gold) | 0;
    reward.experience = (reward.experience + rare.exp) | 0;
  }
  state = creditBattleLoot(state, reward).state;
  if (copy.type === 1) {
    const chapter = catalog.chapters.find((row) => copy.id >= row.minid && copy.id <= row.maxid || row.hideboss === copy.id);
    const progress = recordRegularCopyVictory({ progress: state.progress, money: state.money, copy, chapter, enemyCount: prepared.enemyCount });
    state = { ...state, progress: progress.progress, money: progress.money };
  } else state = { ...state, progress: { ...state.progress, copies: incrementCopyClear({ copies: state.progress.copies, copyId: copy.id, amount: 1 }).copies } };
  return { state, reward };
}

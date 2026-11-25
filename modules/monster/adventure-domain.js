import { calculateRegularCopyRewards, calculateInstanceRewards, getBattleQualityRewardRate } from "./reward-domain.js";
import { selectCopyDropIds, prepareCopyDropGroups, createAbyssMilestoneDrops } from "./loot-domain.js";
import { createCopyDrops } from "./item-domain.js";
import { creditBattleLoot } from "./settlement-domain.js";
import { recordRegularCopyVictory, incrementCopyClear } from "./copy-progress-domain.js";
import { copyUsesParagon } from "./copy-domain.js";
import { getPetCare, recordPartyPetKills } from "./pet-care-domain.js";
import { recordBattleAchievements } from "./achievement-domain.js";
import { applyPetPassiveAttributes } from "./pet-battle-domain.js";

export function payCopyEntry(state, copy) {
  if (!copy.copyprice) return state;
  const ticket = state.inventory.goods.find((item) => item.id === 5009);
  if (!ticket || ticket.quantity < copy.copyprice) throw new RangeError(`副本卷轴不足，需要 ${copy.copyprice} 张`);
  return { ...state, inventory: { ...state.inventory, goods: state.inventory.goods
    .map((item) => item === ticket ? { ...item, quantity: item.quantity - copy.copyprice } : item)
    .filter((item) => item.quantity > 0) } };
}

function createBattleReward({ state, copy, prepared, catalog, draw, partial = false, fraction = 1 }) {
  const clearCount = state.progress.copies.find((entry) => entry.id === copy.id)?.value || 0;
  const hard = prepared.rewardHard;
  const rewardPlayer = applyPetPassiveAttributes(state.player, prepared.petPassives);
  const input = { copy: { ...copy, clearCount: partial ? Math.max(1, clearCount) : clearCount }, player: rewardPlayer, hard,
    globalRate: prepared.rewardRate, enemyCount: prepared.enemyCount, rareRoll: draw(),
    paragonOffset: copyUsesParagon(copy, hard) ? Math.fround(Math.fround(state.player.paragon / 150) + Math.fround(1.2)) : null,
    trialLevel: state.trial?.level || 1, trialHard: state.trial?.hard || 1 };
  const reward = copy.type === 1 ? calculateRegularCopyRewards(input) : calculateInstanceRewards(input);
  if (partial) {
    reward.honor = 0;
    if (copy.type !== 1) {
      reward.gold = Math.trunc(reward.gold * fraction);
      reward.experience = Math.trunc(reward.experience * fraction);
      reward.dropRate = Math.fround(reward.dropRate * fraction);
    }
  }
  reward.items = [];
  function drops(dropCopy, groups, dropRate) {
    // Original drop selection may draw once more for the exceptional item 6865.
    const count = Object.entries(groups).reduce((sum, [key, ids]) => sum + (key === "paragondrop10" && hard <= 3 ? 0 : ids.length) + (key === "percent1" && [1, 2].includes(dropCopy.type) ? ids.filter((id) => id === 6865).length : 0), 0);
    const selected = selectCopyDropIds({ groups, copyType: dropCopy.type, hard,
      activityEnabled: false, dropRate, rolls: Array.from({ length: count }, draw) });
    reward.items.push(...createCopyDrops({ itemIds: selected.itemIds, catalog, copy: dropCopy, player: rewardPlayer, draw }));
  }
  const attempts = copy.type === 1 ? prepared.enemyCount : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) drops(copy, prepared.groups, reward.dropRate);
  if (!partial) reward.items.push(...createAbyssMilestoneDrops({ copy, items: catalog.items }));
  if (prepared.encounterCopy) {
    const rare = prepared.encounterCopy;
    drops(rare, prepareCopyDropGroups({ copy: rare, roll: 0 }), Math.fround(reward.levelFactor * 100));
    reward.gold = (reward.gold + rare.gold) | 0;
    reward.experience = (reward.experience + rare.exp) | 0;
  }
  return reward;
}

export function settleCopyVictory(input) {
  const { copy, prepared, catalog } = input;
  const reward = createBattleReward(input);
  const cared = recordPartyPetKills(input.state, prepared.enemyCount);
  const previousPet = input.state.inventory.pets.find((pet) => pet.partyRole === 1);
  const currentPet = cared.inventory.pets.find((pet) => pet.partyRole === 1);
  if (previousPet && currentPet) {
    const previous = getPetCare(previousPet).loyalty, loyalty = getPetCare(currentPet).loyalty;
    if (loyalty < previous) reward.petCare = { previous, loyalty };
  }
  const sidePetCare = cared.inventory.pets.flatMap((pet, index) => {
    if (pet.partyRole !== 2) return [];
    const previous = getPetCare(input.state.inventory.pets[index]).loyalty, loyalty = getPetCare(pet).loyalty;
    return loyalty < previous ? [{ index, id: pet.id, previous, loyalty }] : [];
  });
  if (sidePetCare.length) reward.sidePetCare = sidePetCare;
  const credited = creditBattleLoot(cared, reward);
  let state = credited.state;
  if (credited.effects.petGrowth) reward.petGrowth = credited.effects.petGrowth;
  if (credited.effects.sidePetGrowth.length) reward.sidePetGrowth = credited.effects.sidePetGrowth;
  if (copy.type === 1) {
    const chapter = catalog.chapters.find((row) => copy.id >= row.minid && copy.id <= row.maxid || row.hideboss === copy.id);
    const progress = recordRegularCopyVictory({ progress: state.progress, money: state.money, copy, chapter, enemyCount: prepared.enemyCount });
    state = { ...state, progress: progress.progress, money: progress.money };
  } else state = { ...state, progress: { ...state.progress, copies: incrementCopyClear({ copies: state.progress.copies, copyId: copy.id, amount: 1 }).copies } };
  state = recordBattleAchievements({ state, catalog, copy, prepared, defeated: prepared.enemyCount, victory: true });
  return { state, reward };
}

// User-requested rule: a defeat retains completed kills, never clear rewards.
// Victory keeps its original calculations and random draw order unchanged.
export function settleCopyDefeat({ state, copy, prepared, battle, catalog, draw }) {
  const defeated = battle.enemies.filter((enemy) => enemy.dead);
  if (!defeated.length) return { state: recordBattleAchievements({ state, catalog, copy, prepared, defeated: 0, victory: false }), reward: { gold: 0, experience: 0, honor: 0, items: [], partial: true, defeatedCount: 0 } };
  const earned = { ...prepared, enemyCount: defeated.length,
    rewardRate: getBattleQualityRewardRate(defeated.map((enemy) => enemy.quality)),
    encounterCopy: prepared.encounterCopy && battle.enemies.at(-1).dead ? prepared.encounterCopy : null };
  const reward = createBattleReward({ state, copy, prepared: earned, catalog, draw, partial: true, fraction: defeated.length / prepared.enemyCount });
  reward.partial = true; reward.defeatedCount = defeated.length;
  const credited = creditBattleLoot(state, reward);
  if (credited.effects.petGrowth) reward.petGrowth = credited.effects.petGrowth;
  if (credited.effects.sidePetGrowth.length) reward.sidePetGrowth = credited.effects.sidePetGrowth;
  return { state: recordBattleAchievements({ state: credited.state, catalog, copy, prepared, defeated: defeated.length, victory: false }), reward };
}

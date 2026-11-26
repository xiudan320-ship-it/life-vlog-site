// Port balance: these recipe badges originally came from unported treasure or
// exchange systems (one original source remains unconfirmed). These additions
// and their probabilities are not claimed to be original APK drop rates.
const earlyBadges = [6807, 6808, 6812, 6813];
const laterBadges = [6821, 6823, 6824];
const endgameBadges = [6852, 6814, 6863];

const additions = {
  2005: earlyBadges,
  2010: [...earlyBadges, ...laterBadges],
  2015: [...earlyBadges, ...laterBadges, ...endgameBadges],
};

// Items found in the original premium/discount shop and exchange catalogs,
// plus VIP-gated wings. Only IDs without an ordinary or paragon drop are added.
// Placement and odds are port balancing, not an original APK claim.
const premiumItems = {
  2001: [5003, 5004, 5009, 5012, 5042, 5044, 5083, 5084, 5105],
  2005: [5002, 5040, 5051, 5052, 5056, 5058, 5066, 5070, 5072, 5085, 5086, 5101, 5103, 6902],
  2010: [5067, 5073, 5087, 5089, 5092, 5104, 5106, 5107, 5109, 5110, 5116, 6818, 6819, 6820, 6903, 6904],
  2015: [6821, 6822, 6823, 6824, 6863, 6905, 6906, 6907],
};

/** Assemble the shared runtime catalog without changing original drop data. */
export function addPortDrops(copies, dropGroups) {
  const alreadyDropped = new Set(Object.values(dropGroups).flatMap((group) => Object.values(group).flat()));
  return copies.map((copy) => {
    const original = dropGroups[copy.id];
    const extra = [...(additions[copy.id] || []), ...(premiumItems[copy.id] || []).filter((id) => !alreadyDropped.has(id))];
    return {
      ...copy,
      ...(copy.id === 1006 && { clearRewardWing: 6902 }),
      dropGroups: extra.length ? { ...original, percent10: [...original.percent10, ...extra] } : original,
    };
  });
}

// The original exchange-only pets are obtainable from a trial reward roll.
// The added reward pool and chance are specific to this port.
export function addPortTrialRewards(trials) {
  return [...trials, { id: 10001, hard: 3, score: 2000, itemtype: 3, itemid: 0,
    items: "[4017,4018,4020,4022,4023,4024,4025]", itemnum: 1, itemweight: 8, desc: "特殊宠物" }];
}

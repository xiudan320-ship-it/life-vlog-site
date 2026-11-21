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

/** Assemble the shared runtime catalog without changing original drop data. */
export function addPortDrops(copies, dropGroups) {
  return copies.map((copy) => {
    const original = dropGroups[copy.id];
    const extra = additions[copy.id];
    return {
      ...copy,
      dropGroups: extra ? { ...original, percent10: [...original.percent10, ...extra] } : original,
    };
  });
}

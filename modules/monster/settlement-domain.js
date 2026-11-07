import { addBagItem, changeGold } from "./inventory-domain.js";
import { creditPlayerExperience } from "./progression-domain.js";

/**
 * Numeric/item credit portion of WarFinishLayer, in native grant order.
 * Caller owns the remaining progress, achievement, pet and level-up effects.
 * Items must already be constructed by the original drop rules.
 */
export function creditBattleLoot(state, { gold, experience, items }) {
  const growth = creditPlayerExperience({
    level: state.player.level, paragon: state.player.paragon,
    experience: state.player.experience, amount: experience,
    petExperienceBonus: state.player.petExperienceBonus || 0,
  });
  const balance = changeGold({ gold: state.gold, delta: gold });
  const inventory = items.reduce((bag, item) => addBagItem({ inventory: bag, item }), state.inventory);
  return {
    state: {
      ...state, gold: balance.gold, inventory,
      player: { ...state.player, level: growth.level, paragon: growth.paragon, experience: growth.experience },
    },
    effects: {
      petGrants: growth.petGrants, unlockLevels: growth.unlockLevels,
      potionLevelUpdates: growth.potionLevelUpdates, achievementBalance: balance.achievementBalance,
    },
  };
}

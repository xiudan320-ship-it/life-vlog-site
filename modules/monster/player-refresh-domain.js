import { calculatePlayerEffects, collectEquipmentAttributes, calculatePlayerCoreAttributes, sumAttributes } from "./attribute-domain.js";
import { calculateSpecialAttributes } from "./special-upgrade-domain.js";
import { getCharacterModel } from "./character-model-domain.js";
import { titleAttributes } from "./achievement-domain.js";
import { collectPartyPetAttributes } from "./pet-domain.js";

/** Rebuild equipped, special and assigned-pet effects from their current sources. */
export function refreshGamePlayer(state, catalog) {
  const special = (item) => item.subtype === 9 ? { ...item, attributes: calculateSpecialAttributes({ item, player: state.player, catalog }) } : item;
  const next = { ...state, player: { ...state.player, equipmentSets: state.player.equipmentSets.map((set) => set.map(special)) },
    inventory: { ...state.inventory, equipment: state.inventory.equipment.map(special) } };
  const wing = next.inventory.wings.find((item) => item.id === next.player.wingId);
  const equipment = [...next.player.equipmentSets[next.player.equipmentSetIndex], ...(wing ? [wing] : [])];
  const attributes = sumAttributes([...collectEquipmentAttributes(equipment), ...collectPartyPetAttributes({ state: next, catalog }), ...titleAttributes(next, catalog), ...getCharacterModel(next.player.image).attributes]);
  return { ...next, player: { ...next.player, ...calculatePlayerCoreAttributes({ level: next.player.level, paragon: next.player.paragon, attributes }), ...calculatePlayerEffects(attributes) } };
}

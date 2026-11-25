import { collectEquipmentAttributes } from "./attribute-domain.js";
import { withEquipmentStrength } from "./equipment-domain.js";
import { calculateSpecialAttributes } from "./special-upgrade-domain.js";

/** Remove strengthening and enchantment while retaining the item's rolled base. */
export function initialEquipment(item, state, catalog) {
  if (!item) return null;
  const initial = { ...item, enchantment: undefined };
  if (item.subtype <= 8) return withEquipmentStrength(initial, 0, catalog.items.find((row) => row.id === item.id));
  if (item.subtype === 9) {
    initial.strength = 0;
    initial.attributes = calculateSpecialAttributes({ item: initial, player: state.player, catalog });
  }
  return initial;
}

/** Compare original attributes first, plus current and post-inheritance values. */
export function compareEquipment({ state, item, catalog }) {
  if (item.type !== 2 || !item.mainAttribute || !state) return null;
  const current = item.subtype === 10
    ? state.inventory.wings.find((entry) => entry.id === state.player.wingId) || null
    : state.player.equipmentSets[state.player.equipmentSetIndex].find((entry) => entry.subtype === item.subtype) || null;
  const selected = current && item.subtype <= 8 && current.strength > item.strength
    ? withEquipmentStrength(item, current.strength, catalog.items.find((row) => row.id === item.id)) : item;
  const baseSelected = collectEquipmentAttributes([initialEquipment(item, state, catalog)]);
  const baseCurrent = collectEquipmentAttributes(current ? [initialEquipment(current, state, catalog)] : []);
  const enhancedSelected = collectEquipmentAttributes([item]);
  const enhancedCurrent = collectEquipmentAttributes(current ? [current] : []);
  const afterEquip = collectEquipmentAttributes([selected]);
  const types = [...new Set([...baseSelected, ...baseCurrent, ...enhancedSelected, ...enhancedCurrent, ...afterEquip].map((attribute) => attribute.type))].sort((a, b) => a - b);
  const value = (attributes, type) => attributes.find((entry) => entry.type === type)?.value || 0;
  const rows = types.map((type) => {
    const selectedValue = value(baseSelected, type), currentValue = value(baseCurrent, type);
    return { type, selectedValue, currentValue, delta: selectedValue - currentValue,
      selectedEnhancedValue: value(enhancedSelected, type), currentEnhancedValue: value(enhancedCurrent, type), selectedAfterValue: value(afterEquip, type) };
  });
  return { selected, current, rows, inherited: selected !== item };
}

export function getBagItemCount(state, item, row) {
  if (!state) return null;
  if (row.type === 1) return state.inventory.goods.filter((entry) => entry.id === item.id).reduce((sum, entry) => sum + entry.quantity, 0);
  if (row.type === 2) return [...state.inventory.equipment, ...state.inventory.wings].filter((entry) => entry.id === item.id).length;
  if (row.type === 3) return state.inventory.pets.filter((entry) => entry.id === item.id).length;
  return 0;
}

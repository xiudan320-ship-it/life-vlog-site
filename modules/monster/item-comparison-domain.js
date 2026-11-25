import { collectEquipmentAttributes } from "./attribute-domain.js";
import { withEquipmentStrength } from "./equipment-domain.js";

/** Compare the actual replacement, including inherited enhancement. */
export function compareEquipment({ state, item, catalog }) {
  if (item.type !== 2 || !item.mainAttribute || !state) return null;
  const current = item.subtype === 10
    ? state.inventory.wings.find((entry) => entry.id === state.player.wingId) || null
    : state.player.equipmentSets[state.player.equipmentSetIndex].find((entry) => entry.subtype === item.subtype) || null;
  const selected = current && item.subtype <= 8 && current.strength > item.strength
    ? withEquipmentStrength(item, current.strength, catalog.items.find((row) => row.id === item.id)) : item;
  const left = collectEquipmentAttributes([selected]);
  const right = collectEquipmentAttributes(current ? [current] : []);
  const types = [...new Set([...left, ...right].map((attribute) => attribute.type))].sort((a, b) => a - b);
  const rows = types.map((type) => {
    const selectedValue = left.find((attribute) => attribute.type === type)?.value || 0;
    const currentValue = right.find((attribute) => attribute.type === type)?.value || 0;
    return { type, selectedValue, currentValue, delta: selectedValue - currentValue };
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

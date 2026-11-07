// GameLogic::changeGold (0x84f1c4) and addBagItem (0x850e18).

/** Preserve the native signed sum, achievement value and 2-billion cap rule. */
export function changeGold({ gold, delta }) {
  const sum = (gold + delta) | 0;
  return {
    gold: sum < 0 || sum > 2000000000 ? 2000000000 : sum,
    achievementBalance: delta > 0 ? sum : null,
  };
}

/** Goods stack by item ID; equipment instances remain separate bag entries. */
export function addBagItem({ inventory, item }) {
  if (item.type !== 1) return { ...inventory, equipment: [...inventory.equipment, { ...item }] };
  let matched = false;
  const goods = inventory.goods.map((entry) => {
    if (entry.id !== item.id) return entry;
    matched = true;
    return { ...entry, quantity: (entry.quantity + item.quantity) | 0 };
  });
  if (!matched) goods.push({ ...item });
  return { ...inventory, goods };
}

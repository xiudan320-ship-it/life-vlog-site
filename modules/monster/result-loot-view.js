import "./result-loot.css";
import { element, itemTile } from "./visual-ui.js";
import { showItem } from "./item-detail-view.js";

export function showResultLoot({ items, catalog, state }) {
  const dialog = document.getElementById("monsterItemDetails");
  const content = dialog.querySelector(".monster-item-information");
  content.replaceChildren(element("h2", `全部掉落 · ${items.length} 项`), element("p", "点击物品查看介绍和背包库存。", "monster-panel-hint"));
  const grid = element("div", undefined, "monster-result-list");
  for (const [index, item] of items.entries()) {
    const tile = itemTile(item, catalog, { quantity: true, onClick: () => showItem({ item, catalog, state,
      onBack: () => showResultLoot({ items, catalog, state }) }) });
    tile.dataset.resultListItem = String(index);
    const row = catalog.items.find((entry) => entry.id === item.id);
    tile.setAttribute("aria-label", `查看${row.name}的物品详情`); grid.append(tile);
  }
  content.append(grid);
  if (!dialog.open) dialog.showModal();
}

import { element, itemTile } from "./visual-ui.js";
import { getOwnedSpecial, getSpecialUpgradeCost } from "./special-upgrade-domain.js";

export function renderSpecialUpgrade({ content, state, catalog, target, actions, receipt }) {
  const item = getOwnedSpecial(state, target);
  const row = catalog.items.find((entry) => entry.id === item.id);
  content.className = "monster-upgrade-content";
  const summary = element("section", undefined, "monster-original-panel monster-upgrade-summary");
  summary.append(itemTile(item, catalog), element("h3", `${row.name} +${item.strength}`));
  if (receipt) { const status = element("p", receipt, "monster-upgrade-receipt"); status.setAttribute("role", "status"); summary.append(status); }
  content.append(summary);
  const card = element("section", undefined, "monster-original-panel monster-upgrade-action");
  card.append(element("h3", "徽章升级"));
  if (item.strength >= 5) card.append(element("p", "已达到升级上限 +5"));
  else {
    const cost = getSpecialUpgradeCost(item, catalog);
    card.append(element("p", `金币：消耗 ${cost.gold}，持有 ${state.gold}`));
    for (const good of cost.goods) {
      const material = catalog.items.find((entry) => entry.id === good.id);
      const owned = state.inventory.goods.find((entry) => entry.id === good.id)?.quantity || 0;
      card.append(element("p", `${material.name}：消耗 ${good.quantity}，持有 ${owned}`));
    }
    card.append(element("small", "升级必定成功，材料和金币会被消耗。"));
    const button = element("button", "升级徽章", "monster-image-button"); button.type = "button";
    button.dataset.specialUpgrade = "";
    button.disabled = state.gold < cost.gold || cost.goods.some((good) => (state.inventory.goods.find((entry) => entry.id === good.id)?.quantity || 0) < good.quantity);
    button.onclick = async () => { button.disabled = true; try { await actions.performSpecialUpgrade(target); } finally { if (button.isConnected) button.disabled = false; } };
    card.append(button);
  }
  content.append(card);
  const back = element("button", "返回铁匠铺", "monster-image-button"); back.type = "button"; back.onclick = () => actions.workshop(); content.append(back);
}

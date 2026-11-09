import { element, itemTile } from "./visual-ui.js";
import { getOwnedEquipment } from "./upgrade-domain.js";
import { getGodUpgradeCost } from "./god-upgrade-domain.js";

const names = { 16: "伤害加成", 17: "伤害减免", 23: "暴击", 24: "暴击伤害", 25: "命中", 26: "闪避", 27: "负面抵抗", 19: "金币获取", 9: "掉落", 10: "经验获取" };

export function renderGodUpgrade({ content, state, catalog, target, actions, receipt }) {
  const item = getOwnedEquipment(state, target);
  content.className = "monster-upgrade-content";
  const panel = element("section", undefined, "monster-original-panel monster-upgrade-summary");
  panel.append(itemTile(item, catalog), element("h3", `神器 ${item.godLevel} 星`),
    element("p", `已升星 ${item.godUpgradeCount ?? 0} / 2 次`));
  for (const attribute of item.attributes.slice(-item.godLevel)) panel.append(element("p", `${names[attribute.type] || `属性 ${attribute.type}`} +${attribute.value}`));
  panel.append(element("p", "升星最多两次。洗星只能更换最近升星获得的属性；再次升星后，之前的属性不能再洗。", "monster-panel-hint"));
  if (receipt) { const status = element("p", receipt, "monster-upgrade-receipt"); status.setAttribute("role", "status"); panel.append(status); }
  content.append(panel);
  const list = element("div", undefined, "monster-upgrade-actions"); content.append(list);
  for (const [operation, label] of [["upgrade", "神器升星"], ["reset", "洗最后一星"]]) {
    const card = element("section", undefined, "monster-original-panel monster-upgrade-action"); card.append(element("h3", label));
    let cost;
    try { cost = getGodUpgradeCost(item, operation); }
    catch (error) { card.append(element("p", error.message)); list.append(card); continue; }
    const prices = [`魔石 ${cost.money} / 持有 ${state.money}`, ...cost.goods.map((good) => `${catalog.items.find((row) => row.id === good.id).name} ${good.quantity} / 持有 ${state.inventory.goods.find((entry) => entry.id === good.id)?.quantity || 0}`)];
    card.append(element("p", prices.join(" · ")));
    const button = element("button", label, "monster-image-button"); button.type = "button"; button.dataset.godUpgrade = operation;
    button.disabled = state.money < cost.money || cost.goods.some((good) => (state.inventory.goods.find((entry) => entry.id === good.id)?.quantity || 0) < good.quantity);
    const perform = async () => {
      const controls = [...list.querySelectorAll("button")], disabled = controls.map((control) => control.disabled);
      controls.forEach((control) => { control.disabled = true; });
      try { await actions.performGodUpgrade(target, operation); }
      finally { controls.forEach((control, index) => { control.disabled = disabled[index]; }); }
    };
    button.onclick = () => {
      if (operation !== "upgrade" || !(item.godUpgradeCount > 0)) { void perform(); return; }
      button.hidden = true;
      const confirmation = element("div"); confirmation.setAttribute("role", "group");
      confirmation.append(element("p", "再次升星后，当前最后一条神器属性将无法再洗。确定继续吗？"));
      const confirm = element("button", "确认升星", "monster-image-button"); confirm.type = "button"; confirm.onclick = () => { void perform(); };
      const cancel = element("button", "取消", "monster-image-button"); cancel.type = "button";
      cancel.onclick = () => { confirmation.remove(); button.hidden = false; button.focus(); };
      confirmation.append(confirm, cancel); card.append(confirmation); confirm.focus();
    };
    card.append(button); list.append(card);
  }
  const back = element("button", "返回装备培养", "monster-image-button"); back.type = "button"; back.onclick = () => actions.upgrade(target); content.append(back);
}

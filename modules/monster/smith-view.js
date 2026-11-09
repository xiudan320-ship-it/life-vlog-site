import { element, itemTile } from "./visual-ui.js";
import { getOwnedEquipment, getUpgradeCost, strengthThreshold } from "./upgrade-domain.js";

const statNames = ["", "攻击", "防御", "生命", "命中", "闪避", "暴击", "暴击伤害", "负面抵抗"];

export function renderWorkshop({ content, state, catalog, actions }) {
  content.className = "monster-workshop-content";
  const tools = element("nav", undefined, "monster-image-tabs"); tools.setAttribute("aria-label", "铁匠铺功能");
  for (const [title, action] of [["打造与合成", () => actions.showCraft()], ["熔炼", () => actions.showSmelt()]]) {
    const button = element("button", title, "monster-image-button"); button.type = "button"; button.onclick = action; tools.append(button);
  }
  content.append(tools);
  content.append(element("p", "选择装备进行强化、重铸和附魔。每次操作后自动保存到当前账号。", "monster-panel-hint"));
  for (const [source, title, entries] of [["equipped", "已穿戴", state.player.equipmentSets[state.player.equipmentSetIndex]], ["bag", "背包装备", state.inventory.equipment]]) {
    content.append(element("h3", title));
    const grid = element("div", undefined, "monster-bag-grid monster-original-panel");
    entries.forEach((item, index) => { if (item.subtype <= 9) grid.append(itemTile(item, catalog, { onClick: () => actions.upgrade({ source, index, id: item.id }) })); });
    if (!grid.children.length) grid.append(element("p", "暂无可培养装备", "monster-panel-hint"));
    content.append(grid);
  }
}

export function renderUpgrade({ content, state, catalog, target, actions, receipt }) {
  const item = getOwnedEquipment(state, target);
  content.className = "monster-upgrade-content";
  const panel = element("section", undefined, "monster-original-panel monster-upgrade-summary");
  panel.append(itemTile(item, catalog), element("h3", `${catalog.items.find((row) => row.id === item.id).name} +${item.strength}`),
    element("p", `${statNames[item.mainAttribute.type]} ${item.mainAttribute.value}`), element("p", `评分 ${["", "普通", "标准", "优秀", "极品"][item.scoreTier]} · ${item.scoreValue}`));
  panel.append(element("p", item.enchantment ? `附魔 ${statNames[item.enchantment.type]} +${item.enchantment.value}（${item.enchantment.level}级）` : "尚未附魔"));
  if (receipt) { const status = element("p", receipt, "monster-upgrade-receipt"); status.setAttribute("role", "status"); panel.append(status); }
  content.append(panel);
  if (item.godLevel > 0) {
    const god = element("button", "神器升星 / 洗星", "monster-image-button"); god.type = "button"; god.dataset.openGodUpgrade = "";
    god.onclick = () => actions.godUpgrade(target); content.append(god);
  }
  let boost = false;
  const boostField = element("label", undefined, "monster-auto-label");
  const boostInput = element("input"); boostInput.type = "checkbox";
  boostField.append(boostInput, element("span", "额外消耗普通强化石，提高 +16 以上成功率")); boostField.hidden = item.strength < 15;
  const list = element("div", undefined, "monster-upgrade-actions");
  content.append(boostField, list);
  boostInput.onchange = () => { boost = boostInput.checked; render(); };
  function render() {
    list.replaceChildren();
    for (const [operation, label] of [["strength", "强化"], ["reforge", "重铸评分"], ["enchantGold", "金币附魔"], ["enchantMoney", "魔石附魔"]]) {
      const card = element("section", undefined, "monster-original-panel monster-upgrade-action");
      card.append(element("h3", label));
      let cost;
      try { cost = getUpgradeCost(item, operation, boost); }
      catch (error) { card.append(element("p", error.message)); list.append(card); continue; }
      const prices = [...(cost.gold ? [`金币 ${cost.gold} / 持有 ${state.gold}`] : []), ...(cost.money ? [`魔石 ${cost.money} / 持有 ${state.money}`] : []), ...cost.goods.map((good) => `${catalog.items.find((row) => row.id === good.id).name} ${good.quantity} / 持有 ${state.inventory.goods.find((entry) => entry.id === good.id)?.quantity || 0}`)];
      card.append(element("p", prices.join(" · ")));
      if (operation === "strength") card.append(element("small", `成功率 ${Math.min(100, strengthThreshold(item, boost) / 10).toFixed(2)}% · 失败消耗材料，强化等级保留`));
      else card.append(element("small", operation === "reforge" ? "重抽并覆盖当前评分，可能变低" : "覆盖当前附魔，可能变低"));
      const button = element("button", label, "monster-image-button"); button.type = "button"; button.dataset.upgrade = operation;
      button.disabled = state.gold < cost.gold || state.money < cost.money || cost.goods.some((good) => (state.inventory.goods.find((entry) => entry.id === good.id)?.quantity || 0) < good.quantity);
      button.onclick = async () => {
        const controls = [...list.querySelectorAll("button")].map((control) => [control, control.disabled]);
        for (const [control] of controls) control.disabled = true;
        try { await actions.performUpgrade(target, operation, boost); }
        finally { for (const [control, disabled] of controls) if (control.isConnected) control.disabled = disabled; }
      };
      card.append(button); list.append(card);
    }
  }
  render();
  const back = element("button", "返回铁匠铺", "monster-image-button"); back.type = "button"; back.onclick = () => actions.workshop(); content.append(back);
}

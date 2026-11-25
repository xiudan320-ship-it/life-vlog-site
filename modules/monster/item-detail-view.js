import "./item-detail.css";
import { element, itemTile } from "./visual-ui.js";
import { describeEquipmentAttribute, getEquipmentAttributeLabel } from "./attribute-labels.js";
import { compareEquipment, getBagItemCount } from "./item-comparison-domain.js";
import { describeEquipmentScore } from "./bag-sort-domain.js";

export function showItem({ item, catalog, state, onEquip, onUpgrade, onManage, onBack }) {
  const row = catalog.items.find((entry) => entry.id === item.id);
  const dialog = document.getElementById("monsterItemDetails");
  const content = dialog.querySelector(".monster-item-information");
  content.replaceChildren(itemTile(item, catalog), element("h2", row.name));
  if (onBack) {
    const back = element("button", "返回全部掉落", "monster-image-button"); back.type = "button";
    back.onclick = onBack; content.prepend(back);
  }
  const owned = getBagItemCount(state, item, row);
  if (owned !== null) content.append(element("p", `背包持有：${owned} 件`, "monster-item-owned"));
  if (onEquip) {
    const equip = element("button", "穿戴 / 更换", "monster-image-button"); equip.type = "button";
    equip.onclick = () => { dialog.close(); onEquip(); }; content.append(equip);
    if (item.subtype <= 8) content.append(element("p", "穿戴时自动继承同部位较高的强化等级。"));
  }
  if (item.level) content.append(element("p", `等级 ${item.level}${item.paragonGrowth ? ` · 巅峰 ${item.paragonGrowth}` : ""}`));
  if (Number.isInteger(item.scoreTier)) content.append(element("p", `装备评分 ${describeEquipmentScore(item)}${item.godLevel ? ` · 神器 ${item.godLevel} 星` : ""}`));
  if (row.describe && row.describe !== "null") content.append(element("p", row.describe));
  const comparison = compareEquipment({ state, item, catalog });
  if (comparison) {
    const panel = element("section", undefined, "monster-equipment-comparison");
    panel.setAttribute("aria-label", "装备属性对比");
    const left = element("div", undefined, "monster-comparison-card");
    const right = element("div", undefined, "monster-comparison-card");
    left.append(element("h3", "选中装备"), element("strong", row.name));
    const currentName = comparison.current ? catalog.items.find((entry) => entry.id === comparison.current.id).name : "该部位未穿戴";
    right.append(element("h3", "当前穿戴"), element("strong", currentName));
    for (const entry of comparison.rows) {
      const { name, unit, supported } = getEquipmentAttributeLabel(entry.type);
      const diff = entry.delta > 0 ? `+${entry.delta}` : entry.delta === 0 ? "±0" : String(entry.delta);
      const selectedLine = element("p", `${name} ${entry.selectedValue}${unit}`, "monster-comparison-stat");
      if (entry.selectedEnhancedValue !== entry.selectedValue || entry.selectedAfterValue !== entry.selectedEnhancedValue) {
        const enhanced = entry.selectedAfterValue !== entry.selectedEnhancedValue
          ? `当前 ${entry.selectedEnhancedValue}${unit}，换装后 ${entry.selectedAfterValue}${unit}` : `强化附魔后 ${entry.selectedEnhancedValue}${unit}`;
        selectedLine.append(element("small", `（${enhanced}）`));
      }
      const change = element("b", ` 初始差值 ${diff}${unit}`, entry.delta > 0 ? "is-positive" : entry.delta < 0 ? "is-negative" : "");
      change.setAttribute("aria-label", `${name}初始值变化 ${diff}${unit}${supported ? "" : "，暂未接通"}`);
      selectedLine.append(change); left.append(selectedLine);
      const currentLine = element("p", `${name} ${entry.currentValue}${unit}`, "monster-comparison-stat");
      if (entry.currentEnhancedValue !== entry.currentValue) currentLine.append(element("small", `（强化附魔后 ${entry.currentEnhancedValue}${unit}）`));
      right.append(currentLine);
    }
    panel.append(left, right);
    content.append(element("p", "以初始属性对比；括号显示强化、附魔后的数值。", "monster-panel-hint"), panel);
    if (comparison.inherited) content.append(element("p", `换装后继承强化至 +${comparison.selected.strength}。`, "monster-panel-hint"));
  }
  if (item.subtype === 9 && item.attributes?.length) {
    const effects = element("section", undefined, "monster-item-effects");
    effects.append(element("h3", "徽章效果（穿戴后生效）"));
    for (const attribute of item.attributes) effects.append(element("p", describeEquipmentAttribute(attribute)));
    if (row.specialgrow) effects.append(element("small", "效果随角色等级与巅峰成长。"));
    content.append(effects);
  }
  if (item.strength) content.append(element("p", `强化 +${item.strength}`));
  if (item.enchantment) content.append(element("p", `附魔 ${["", "攻击", "防御", "生命", "命中", "闪避", "暴击", "暴击伤害", "负面抵抗"][item.enchantment.type]} +${item.enchantment.value}`));
  if (onUpgrade) {
    const upgrade = element("button", item.subtype === 9 ? "升级徽章" : "强化 / 重铸 / 附魔", "monster-image-button"); upgrade.type = "button";
    upgrade.onclick = () => { dialog.close(); onUpgrade(); }; content.append(upgrade);
  }
  if (onManage) {
    const manage = element("button", item.type === 1 ? "出售" : "分解 / 锁定", "monster-image-button"); manage.type = "button";
    manage.dataset.manageBagItem = "";
    manage.onclick = () => { dialog.close(); onManage(); }; content.append(manage);
  }
  if (!dialog.open) dialog.showModal();
}

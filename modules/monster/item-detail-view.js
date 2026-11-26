import "./item-detail.css";
import { element, itemTile } from "./visual-ui.js";
import { describeEquipmentAttribute, getEquipmentAttributeLabel } from "./attribute-labels.js";
import { compareEquipment, getBagItemCount } from "./item-comparison-domain.js";
import { describeEquipmentScore } from "./bag-sort-domain.js";

function comparisonCard(label, item, catalog) {
  const cell = element("th", undefined, "monster-comparison-card");
  cell.scope = "col";
  cell.append(element("span", label, "monster-comparison-side"));
  if (!item) {
    cell.append(element("strong", "该部位未穿戴"));
    return cell;
  }
  const tile = itemTile(item, catalog);
  const name = catalog.items.find((entry) => entry.id === item.id).name;
  const identity = element("div", undefined, "monster-comparison-identity");
  identity.append(tile, element("strong", item.strength ? `${name} +${item.strength}` : name));
  const metadata = [
    item.level && `等级 ${item.level}`,
    item.paragonGrowth && `巅峰 ${item.paragonGrowth}`,
    Number.isInteger(item.scoreTier) && describeEquipmentScore(item),
    item.godLevel && `神器 ${item.godLevel} 星`,
  ].filter(Boolean);
  cell.append(identity);
  if (metadata.length) cell.append(element("small", metadata.join(" · ")));
  return cell;
}

function renderComparison({ comparison, item, catalog }) {
  const panel = element("table", undefined, "monster-equipment-comparison");
  panel.append(element("caption", "以初始属性对比。差值以当前穿戴为基准。"));
  const head = panel.createTHead().insertRow();
  const attribute = element("th", "初始属性");
  attribute.scope = "col";
  head.append(attribute, comparisonCard("当前穿戴", comparison.current, catalog), comparisonCard("选中装备", item, catalog));
  const body = panel.createTBody();
  for (const entry of comparison.rows) {
    const { name, unit, supported } = getEquipmentAttributeLabel(entry.type);
    const row = body.insertRow();
    row.className = "monster-comparison-stat";
    const label = element("th", name);
    label.scope = "row";
    if (!supported) label.append(element("small", "暂未接通"));
    row.append(label);
    const current = row.insertCell();
    current.append(element("span", comparison.current ? `${entry.currentValue}${unit}` : "—"));
    if (entry.currentEnhancedValue !== entry.currentValue) {
      current.append(element("small", `强化附魔后 ${entry.currentEnhancedValue}${unit}`));
    }
    const selected = row.insertCell();
    selected.append(element("span", `${entry.selectedValue}${unit}`));
    if (comparison.current && entry.delta !== 0) {
      const diff = `${entry.delta > 0 ? "+" : ""}${entry.delta}${unit}`;
      const change = element("b", diff, entry.delta > 0 ? "is-positive" : "is-negative");
      change.setAttribute("aria-label", `初始差值 ${diff}`);
      selected.append(change);
    }
    if (entry.selectedEnhancedValue !== entry.selectedValue) {
      selected.append(element("small", `强化附魔后 ${entry.selectedEnhancedValue}${unit}`));
    }
    if (entry.selectedAfterValue !== entry.selectedEnhancedValue) {
      selected.append(element("small", `换装后 ${entry.selectedAfterValue}${unit}`));
    }
  }
  return panel;
}

export function showItem({ item, catalog, state, onEquip, onUpgrade, onManage, onBack, backLabel = "返回全部掉落", previewNote }) {
  const row = catalog.items.find((entry) => entry.id === item.id);
  const dialog = document.getElementById("monsterItemDetails");
  const content = dialog.querySelector(".monster-item-information");
  const comparison = compareEquipment({ state, item, catalog });
  content.replaceChildren(element("h2", comparison ? "装备属性对比" : row.name));
  if (!comparison) content.prepend(itemTile(item, catalog));
  if (onBack) {
    const back = element("button", backLabel, "monster-image-button"); back.type = "button";
    back.onclick = onBack; content.prepend(back);
  }
  const owned = getBagItemCount(state, item, row);
  if (owned !== null) content.append(element("p", `背包持有：${owned} 件`, "monster-item-owned"));
  if (previewNote) content.append(element("p", previewNote, "monster-panel-hint"));
  if (comparison) {
    content.append(renderComparison({ comparison, item, catalog }));
    if (comparison.inherited) content.append(element("p", `换装后继承强化至 +${comparison.selected.strength}。`, "monster-panel-hint"));
  } else {
    if (item.level) content.append(element("p", `等级 ${item.level}${item.paragonGrowth ? ` · 巅峰 ${item.paragonGrowth}` : ""}`));
    if (Number.isInteger(item.scoreTier)) content.append(element("p", `装备评分 ${describeEquipmentScore(item)}${item.godLevel ? ` · 神器 ${item.godLevel} 星` : ""}`));
    if (item.strength) content.append(element("p", `强化 +${item.strength}`));
  }
  if (row.describe && row.describe !== "null") content.append(element("p", row.describe));
  if (item.subtype === 9 && item.attributes?.length) {
    const effects = element("section", undefined, "monster-item-effects");
    effects.append(element("h3", "徽章效果（穿戴后生效）"));
    for (const attribute of item.attributes) effects.append(element("p", describeEquipmentAttribute(attribute)));
    if (row.specialgrow) effects.append(element("small", "效果随角色等级与巅峰成长。"));
    content.append(effects);
  }
  if (item.enchantment) content.append(element("p", `附魔 ${describeEquipmentAttribute(item.enchantment)}`));
  if (onEquip) {
    const equip = element("button", "穿戴 / 更换", "monster-image-button"); equip.type = "button";
    equip.onclick = () => { dialog.close(); onEquip(); }; content.append(equip);
    if (item.subtype <= 8 && !comparison?.inherited) content.append(element("p", "穿戴时自动继承同部位较高的强化等级。"));
  }
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

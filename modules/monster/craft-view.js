import "./craft.css";
import { element, itemTile } from "./visual-ui.js";
import { getCraftRequirements, getCraftEquipmentComparison, getCraftHistoryCount, getCraftOwnedCount } from "./craft-domain.js";
import { collectEquipmentAttributes } from "./attribute-domain.js";

const statNames = ["", "攻击", "防御", "生命", "命中", "闪避", "暴击", "暴击伤害", "负面抵抗"];
const scoreNames = ["", "普通", "标准", "优秀", "极品"];
const effectNames = { 9: "物品掉落", 10: "经验获取", 11: "生命回复", 12: "攻击加成", 13: "防御加成", 14: "生命加成", 16: "伤害加成", 17: "伤害减免", 19: "金币获取", 20: "特殊效果", 21: "触发加成", 22: "遭遇加成", 23: "暴击加成", 24: "暴击伤害加成", 25: "命中加成", 26: "闪避加成", 27: "负面抵抗加成", 30: "额外波数", 33: "伤害加成", 35: "熔炼加成", 36: "试炼积分", 40: "暴击抵抗" };

/** Return a self-contained recipe browser. The controller owns crafting and saving. */
export function renderCraft({ state, catalog, actions, receipt, selection = { category: "equipment", itemId: null } }) {
  const root = element("div", undefined, "monster-craft");
  const recipes = catalog.make.filter((recipe) => catalog.items.some((item) => item.id === recipe.itemid));
  const tabs = element("div", undefined, "monster-image-tabs monster-craft-tabs");
  tabs.setAttribute("role", "group"); tabs.setAttribute("aria-label", "配方分类");
  const list = element("div", undefined, "monster-craft-list monster-original-panel");
  list.setAttribute("aria-label", "打造配方");
  const detail = element("section", undefined, "monster-craft-detail monster-original-panel");
  detail.setAttribute("aria-label", "配方需求");
  root.append(tabs);
  if (receipt) { const status = element("p", receipt, "monster-upgrade-receipt"); status.setAttribute("role", "status"); root.append(status); }
  root.append(list, detail);

  function categoryOf(row) { return row.type === 1 ? "goods" : row.subtype === 9 ? "badge" : "equipment"; }
  function describeAttribute(item) {
    const attr = item.mainAttribute;
    return attr ? `${statNames[attr.type] || `属性 ${attr.type}`} ${attr.value}` : "无主属性";
  }
  function renderComparison(product) {
    const comparison = getCraftEquipmentComparison({ state, itemId: product.id, catalog });
    if (!comparison) return;
    const section = element("section", undefined, "monster-craft-comparison");
    section.dataset.craftComparison = "";
    section.append(element("h4", "同部位装备对比"));
    const { equipped, min, max } = comparison;
    if (equipped) {
      const equippedRow = catalog.items.find((row) => row.id === equipped.id);
      const equippedName = equippedRow?.name || `装备 ${equipped.id}`;
      const score = equipped.scoreTier ? ` · 评分 ${scoreNames[equipped.scoreTier]} ${equipped.scoreValue}` : "";
      const enchant = equipped.enchantment ? ` · 附魔 ${statNames[equipped.enchantment.type] || `属性 ${equipped.enchantment.type}`} +${equipped.enchantment.value}` : "";
      section.append(element("p", `当前：${equippedName} +${equipped.strength} · 等级 ${equipped.level} · ${describeAttribute(equipped)}${score}${enchant}`));
    } else section.append(element("p", "当前：此部位未穿戴装备"));
    if (min && max) {
      const low = min.mainAttribute, high = max.mainAttribute;
      let range = describeAttribute(min);
      if (low && high && low.type === high.type && low.value !== high.value) range = `${statNames[low.type] || `属性 ${low.type}`} ${low.value}–${high.value}`;
      section.append(element("p", `打造后：${product.name} +0 · 等级 ${product.level} · ${range}（评分随机）`));
      const current = collectEquipmentAttributes(equipped ? [equipped] : []);
      const lowTags = collectEquipmentAttributes([min]), highTags = collectEquipmentAttributes([max]);
      const stats = element("div", undefined, "monster-craft-stat-grid");
      const types = [...new Set([...current, ...lowTags, ...highTags].map((attr) => attr.type))];
      stats.append(element("strong", "合计属性"), element("strong", "当前 → 打造范围"));
      for (const type of types) {
        const value = (tags) => tags.find((tag) => tag.type === type)?.value || 0;
        const lo = value(lowTags), hi = value(highTags);
        stats.append(element("span", statNames[type] || effectNames[type] || `属性 ${type}`), element("span", `${value(current)} → ${lo === hi ? lo : `${lo}–${hi}`}`));
      }
      section.append(stats);
    }
    detail.append(section);
  }
  function render() {
    tabs.replaceChildren(); list.replaceChildren(); detail.replaceChildren();
    for (const [value, label] of [["equipment", "装备"], ["badge", "徽章"], ["goods", "材料"]]) {
      const button = element("button", label, "monster-image-button"); button.type = "button";
      button.setAttribute("aria-pressed", String(selection.category === value));
      button.onclick = () => { selection.category = value; selection.itemId = null; render(); tabs.querySelector('[aria-pressed="true"]')?.focus(); };
      tabs.append(button);
    }
    const visible = recipes.filter((entry) => categoryOf(catalog.items.find((row) => row.id === entry.itemid)) === selection.category);
    if (!visible.some((entry) => entry.itemid === selection.itemId)) selection.itemId = visible[0]?.itemid ?? null;
    for (const recipe of visible) {
      const count = getCraftHistoryCount(state, recipe.itemid);
      const owned = getCraftOwnedCount(state, recipe.itemid);
      const tile = itemTile({ id: recipe.itemid }, catalog, { onClick: () => { selection.itemId = recipe.itemid; render(); list.querySelector('[aria-pressed="true"]')?.focus(); } });
      tile.dataset.recipeId = recipe.itemid;
      tile.setAttribute("aria-pressed", String(recipe.itemid === selection.itemId));
      const itemName = catalog.items.find((row) => row.id === recipe.itemid).name;
      tile.setAttribute("aria-label", `${itemName}，已打造 ${count} 次，已持有 ${owned} 个`);
      if (count) { const badge = element("b", `造${count}`, "monster-craft-made"); badge.setAttribute("aria-hidden", "true"); tile.append(badge); }
      list.append(tile);
    }
    if (!selection.itemId) { detail.append(element("p", "暂无配方", "monster-panel-hint")); return; }
    const requirements = getCraftRequirements({ state, itemId: selection.itemId, catalog });
    const { product, materials, currency, price, affordable } = requirements;
    const history = getCraftHistoryCount(state, selection.itemId);
    const owned = getCraftOwnedCount(state, selection.itemId);
    detail.append(element("h3", product.name), element("p", `物品等级 ${product.level} · 打造后放入背包`, "monster-panel-hint"));
    const counts = element("p", `已打造 ×${history} · 已持有 ×${owned}`, "monster-craft-counts"); counts.dataset.craftCounts = "";
    detail.append(counts);
    if (!history) detail.append(element("p", "打造次数从本次更新起记录", "monster-panel-hint"));
    renderComparison(product);
    const costs = element("ul", undefined, "monster-craft-costs");
    for (const material of materials) {
      const row = catalog.items.find((item) => item.id === material.id);
      const line = element("li"); line.dataset.materialId = material.id;
      const label = element("span", `${row.name}${material.type === 2 ? "（背包中强化 +5，含锁定）" : ""}：消耗 ${material.quantity}，持有 ${material.owned}`);
      line.append(label);
      if (material.owned < material.quantity) {
        line.dataset.insufficient = "true";
        const source = element("button", "获取途径", "monster-image-button monster-craft-source");
        source.type = "button"; source.dataset.materialSource = material.id;
        source.setAttribute("aria-label", `查看${row.name}的获取途径`);
        source.onclick = () => actions.materialSources(material.id);
        line.append(source);
      }
      costs.append(line);
    }
    const coin = element("li", `${currency === "gold" ? "金币" : "魔石"}：消耗 ${price}，持有 ${state[currency]}`);
    if (state[currency] < price) coin.dataset.insufficient = "true";
    costs.append(coin); detail.append(costs);
    const button = element("button", "打造", "monster-image-button"); button.type = "button"; button.dataset.craftItem = selection.itemId;
    button.disabled = !affordable;
    button.onclick = async () => { button.disabled = true; try { await actions.craft(selection.itemId); } finally { if (button.isConnected) button.disabled = !affordable; } };
    detail.append(button);
  }
  render();
  return root;
}

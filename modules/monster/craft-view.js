import "./craft.css";
import { element, itemTile } from "./visual-ui.js";
import { getCraftRequirements, getCraftEquipmentComparison, getCraftHistoryCount, getCraftOwnedCount } from "./craft-domain.js";
import { collectEquipmentAttributes } from "./attribute-domain.js";
import { initialEquipment } from "./item-comparison-domain.js";
import { describeEquipmentAttribute } from "./attribute-labels.js";

const statNames = ["", "攻击", "防御", "生命", "命中", "闪避", "暴击", "暴击伤害", "负面抵抗"];
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
  const detailBody = element("div", undefined, "monster-craft-detail-scroll");
  const workspace = element("div", undefined, "monster-craft-workspace");
  root.append(tabs);
  if (receipt) { const status = element("p", receipt, "monster-upgrade-receipt"); status.setAttribute("role", "status"); root.append(status); }
  workspace.append(list, detail); root.append(workspace);

  function categoryOf(row) { return row.type === 1 ? "goods" : row.subtype === 9 ? "badge" : "equipment"; }
  function renderComparison(product) {
    const comparison = getCraftEquipmentComparison({ state, itemId: product.id, catalog });
    if (!comparison) return;
    const section = element("section", undefined, "monster-craft-comparison");
    section.dataset.craftComparison = "";
    section.append(element("h4", "同部位装备对比"));
    const { equipped, baseMin, baseMax, min, max } = comparison;
    const baseCurrent = initialEquipment(equipped, state, catalog);
    const cards = element("div", undefined, "monster-craft-compare-cards");
    const currentCard = element("div", undefined, "monster-craft-compare-card");
    const nextCard = element("div", undefined, "monster-craft-compare-card");
    if (equipped) {
      const equippedRow = catalog.items.find((row) => row.id === equipped.id);
      const equippedName = equippedRow?.name || `装备 ${equipped.id}`;
      currentCard.append(element("strong", "当前穿戴"), element("p", `当前：${equippedName} +${equipped.strength}`));
    } else currentCard.append(element("strong", "当前穿戴"), element("p", "此部位未穿戴装备"));
    nextCard.append(element("strong", "打造预览"), element("p", product.name));
    cards.append(currentCard, nextCard); section.append(cards);
    const current = collectEquipmentAttributes(baseCurrent ? [baseCurrent] : []);
    const currentEnhanced = collectEquipmentAttributes(equipped ? [equipped] : []);
    const lowTags = collectEquipmentAttributes([baseMin]), highTags = collectEquipmentAttributes([baseMax]);
    const lowAfter = collectEquipmentAttributes([min]), highAfter = collectEquipmentAttributes([max]);
    const stats = element("div", undefined, "monster-craft-stat-grid");
    const types = [...new Set([...current, ...currentEnhanced, ...lowTags, ...highTags, ...lowAfter, ...highAfter].map((attr) => attr.type))];
    stats.append(element("strong", "初始属性"), element("strong", "当前 → 打造范围"));
    const value = (tags, type) => tags.find((tag) => tag.type === type)?.value || 0;
    const range = (low, high) => low === high ? String(low) : `${low}–${high}`;
    const signed = (number) => number > 0 ? `+${number}` : number === 0 ? "±0" : String(number);
    for (const type of types) {
      const old = value(current, type), enhanced = value(currentEnhanced, type);
      const lo = value(lowTags, type), hi = value(highTags, type), afterLo = value(lowAfter, type), afterHi = value(highAfter, type);
      const delta = lo - old === hi - old ? signed(lo - old) : `${signed(lo - old)}～${signed(hi - old)}`;
      const now = enhanced === old ? String(old) : `${old}（当前${enhanced}）`;
      const after = afterLo === lo && afterHi === hi ? "" : `（换装后${range(afterLo, afterHi)}）`;
      stats.append(element("span", statNames[type] || effectNames[type] || `属性 ${type}`), element("span", `${now} → ${range(lo, hi)}${after} · ${delta}`));
    }
    section.append(stats, element("p", "括号为强化、附魔后的数值；打造评分随机。"));
    detailBody.append(section);
  }
  function render() {
    tabs.replaceChildren(); list.replaceChildren(); detailBody.replaceChildren(); detail.replaceChildren(detailBody); detailBody.scrollTop = 0;
    for (const [value, label] of [["equipment", "装备"], ["badge", "徽章"], ["goods", "材料"]]) {
      const button = element("button", label, "monster-image-button"); button.type = "button";
      button.setAttribute("aria-pressed", String(selection.category === value));
      button.onclick = (event) => {
        selection.byCategory ||= {};
        selection.byCategory[selection.category] = selection.itemId;
        selection.category = value; selection.itemId = selection.byCategory[value] ?? null;
        render(); revealSelection();
        if (event.detail === 0) tabs.querySelector('[aria-pressed="true"]')?.focus();
      };
      tabs.append(button);
    }
    const visible = recipes.filter((entry) => categoryOf(catalog.items.find((row) => row.id === entry.itemid)) === selection.category);
    if (!visible.some((entry) => entry.itemid === selection.itemId)) {
      if (selection.category === "equipment" && visible.length) {
        const levels = visible.map((entry) => catalog.items.find((row) => row.id === entry.itemid).level);
        const eligible = levels.filter((level) => level <= state.player.level);
        const targetLevel = eligible.length ? Math.max(...eligible) : Math.min(...levels);
        selection.itemId = visible.find((entry) => catalog.items.find((row) => row.id === entry.itemid).level === targetLevel).itemid;
      } else selection.itemId = visible[0]?.itemid ?? null;
    }
    for (const recipe of visible) {
      const count = getCraftHistoryCount(state, recipe.itemid);
      const owned = getCraftOwnedCount(state, recipe.itemid);
      const tile = itemTile({ id: recipe.itemid }, catalog, { onClick: (event) => {
        selection.itemId = recipe.itemid; render();
        if (event.detail === 0) list.querySelector('[aria-pressed="true"]')?.focus();
      } });
      tile.dataset.recipeId = recipe.itemid;
      tile.setAttribute("aria-pressed", String(recipe.itemid === selection.itemId));
      const product = catalog.items.find((row) => row.id === recipe.itemid);
      tile.setAttribute("aria-label", `${product.name}，物品等级 ${product.level}，已打造 ${count} 次，已持有 ${owned} 个`);
      tile.append(element("span", `Lv.${product.level}`, "monster-craft-level"));
      if (count) { const badge = element("b", `造${count}`, "monster-craft-made"); badge.setAttribute("aria-hidden", "true"); tile.append(badge); }
      list.append(tile);
    }
    if (!selection.itemId) { detailBody.append(element("p", "暂无配方", "monster-panel-hint")); return; }
    const requirements = getCraftRequirements({ state, itemId: selection.itemId, catalog });
    const { product, materials, currency, price, affordable } = requirements;
    const history = getCraftHistoryCount(state, selection.itemId);
    const owned = getCraftOwnedCount(state, selection.itemId);
    detailBody.append(element("h3", product.name), element("p", `等级 ${product.level} · 成品入背包`, "monster-panel-hint"));
    const counts = element("p", `已打造 ×${history} · 已持有 ×${owned}`, "monster-craft-counts"); counts.dataset.craftCounts = "";
    detailBody.append(counts);
    if (product.type === 2) renderComparison(product);
    if (product.type === 2 && product.subtype === 9) {
      const preview = getCraftEquipmentComparison({ state, itemId: product.id, catalog }).min;
      const effects = element("section", undefined, "monster-craft-badge-effects");
      effects.append(element("h4", "徽章效果（穿戴后生效）"));
      for (const attribute of preview.attributes) effects.append(element("p", describeEquipmentAttribute(attribute)));
      if (product.specialgrow) effects.append(element("small", "效果随角色等级与巅峰成长。"));
      detailBody.append(effects);
    }
    const costs = element("ul", undefined, "monster-craft-costs");
    for (const material of materials) {
      const row = catalog.items.find((item) => item.id === material.id);
      const line = element("li"); line.dataset.materialId = material.id;
      const label = element("span", `${row.name}${material.type === 2 ? "（背包 +5，含锁定）" : ""}：${material.quantity} / ${material.owned}`);
      label.setAttribute("aria-label", `${row.name}${material.type === 2 ? "，背包中强化 +5，含锁定" : ""}，消耗 ${material.quantity}，持有 ${material.owned}`);
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
    const currencyName = currency === "gold" ? "金币" : "魔石";
    const coin = element("li", `${currencyName}：${price} / ${state[currency]}`);
    coin.setAttribute("aria-label", `${currencyName}，消耗 ${price}，持有 ${state[currency]}`);
    if (state[currency] < price) coin.dataset.insufficient = "true";
    costs.append(coin); detailBody.append(element("h4", "材料与费用（消耗 / 持有）", "monster-craft-costs-heading"), costs);
    const button = element("button", "打造", "monster-image-button"); button.type = "button"; button.dataset.craftItem = selection.itemId;
    button.disabled = !affordable;
    button.onclick = async () => { button.disabled = true; try { await actions.craft(selection.itemId); } finally { if (button.isConnected) button.disabled = !affordable; } };
    detail.append(button);
  }
  function revealSelection() { queueMicrotask(() => {
    const selected = list.querySelector('[aria-pressed="true"]');
    if (!list.isConnected || !selected) return;
    const listBox = list.getBoundingClientRect(), selectedBox = selected.getBoundingClientRect();
    if (selectedBox.bottom > listBox.bottom) list.scrollTop += selectedBox.bottom - listBox.bottom + 10;
    else if (selectedBox.top < listBox.top) list.scrollTop -= listBox.top - selectedBox.top + 10;
  }); }
  render();
  // A rebuild can restore the prior scroll position; only reveal a hidden selection.
  revealSelection();
  return root;
}

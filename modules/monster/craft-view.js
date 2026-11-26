import "./craft.css";
import { element, itemTile } from "./visual-ui.js";
import { getCraftRequirements, getCraftEquipmentComparison, getCraftHistoryCount, getCraftOwnedCount } from "./craft-domain.js";
import { collectEquipmentAttributes } from "./attribute-domain.js";
import { initialEquipment } from "./item-comparison-domain.js";
import { describeEquipmentAttribute, getEquipmentAttributeLabel } from "./attribute-labels.js";

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
  list.addEventListener("scroll", () => { scrollByCategory[selection.category] = list.scrollTop; });
  detail.append(detailBody);
  workspace.append(list, detail); root.append(workspace);

  const scrollByCategory = selection.scrollByCategory ||= {};
  function categoryOf(row) { return row.type === 1 ? "goods" : row.subtype === 9 ? "badge" : "equipment"; }
  function renderComparison(product) {
    const comparison = getCraftEquipmentComparison({ state, itemId: product.id, catalog });
    if (!comparison) return;
    const section = element("section", undefined, "monster-craft-comparison");
    section.dataset.craftComparison = "";
    section.append(element("h4", "同部位装备对比"));
    const { equipped, baseMin, baseMax, min, max } = comparison;
    const baseCurrent = initialEquipment(equipped, state, catalog);
    const stats = element("table", undefined, "monster-craft-stat-grid");
    stats.setAttribute("aria-label", "同部位装备对比");
    const head = stats.createTHead().insertRow();
    const equippedName = equipped ? catalog.items.find((row) => row.id === equipped.id).name : "未穿戴";
    for (const [label, name] of [["属性"], ["当前穿戴", equippedName + (equipped?.strength ? " +" + equipped.strength : "")], ["打造预览", product.name]]) {
      const heading = element("th", label); heading.scope = "col";
      if (name) heading.append(element("span", name));
      head.append(heading);
    }
    const body = stats.createTBody();
    const current = collectEquipmentAttributes(baseCurrent ? [baseCurrent] : []);
    const currentEnhanced = collectEquipmentAttributes(equipped ? [equipped] : []);
    const lowTags = collectEquipmentAttributes([baseMin]), highTags = collectEquipmentAttributes([baseMax]);
    const lowAfter = collectEquipmentAttributes([min]), highAfter = collectEquipmentAttributes([max]);
    const types = [...new Set([...current, ...currentEnhanced, ...lowTags, ...highTags, ...lowAfter, ...highAfter].map((attr) => attr.type))];
    const value = (tags, type) => tags.find((tag) => tag.type === type)?.value || 0;
    const range = (low, high) => low === high ? String(low) : `${low}–${high}`;
    const signed = (number) => number > 0 ? `+${number}` : number === 0 ? "±0" : String(number);
    for (const type of types) {
      const old = value(current, type), enhanced = value(currentEnhanced, type);
      const lo = value(lowTags, type), hi = value(highTags, type), afterLo = value(lowAfter, type), afterHi = value(highAfter, type);
      const delta = lo - old === hi - old ? signed(lo - old) : `${signed(lo - old)}～${signed(hi - old)}`;
      const { name, unit } = getEquipmentAttributeLabel(type);
      const row = body.insertRow();
      const label = element("th", name); label.scope = "row"; row.append(label);
      const worn = row.insertCell(), crafted = row.insertCell();
      worn.append(element("span", equipped ? old + unit : "—"));
      crafted.append(element("span", range(lo, hi) + unit));
      if (enhanced !== old) worn.append(element("small", "强化附魔后 " + enhanced + unit));
      if (afterLo !== lo || afterHi !== hi) crafted.append(element("small", "换装后 " + range(afterLo, afterHi) + unit));
      if (equipped && (lo !== old || hi !== old)) {
        const tone = lo >= old ? "is-positive" : hi <= old ? "is-negative" : "";
        crafted.append(element("small", "差值 " + delta + unit, tone));
      }
    }
    section.append(stats, element("p", "主值为初始属性。打造评分随机。"));
    detailBody.append(section);
  }
  function render() {
    tabs.replaceChildren(); list.replaceChildren();
    for (const [value, label] of [["equipment", "装备"], ["badge", "徽章"], ["goods", "材料"]]) {
      const button = element("button", label, "monster-image-button"); button.type = "button";
      button.setAttribute("aria-pressed", String(selection.category === value));
      button.onclick = (event) => {
        scrollByCategory[selection.category] = list.scrollTop;
        selection.byCategory ||= {};
        selection.byCategory[selection.category] = selection.itemId;
        selection.category = value; selection.itemId = selection.byCategory[value] ?? null;
        render();
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
      const tile = itemTile({ id: recipe.itemid }, catalog, { onClick: () => {
        if (selection.itemId === recipe.itemid) return;
        list.querySelector('[aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
        tile.setAttribute("aria-pressed", "true");
        selection.itemId = recipe.itemid;
        renderDetails();
      } });
      tile.dataset.recipeId = recipe.itemid;
      tile.setAttribute("aria-pressed", String(recipe.itemid === selection.itemId));
      const product = catalog.items.find((row) => row.id === recipe.itemid);
      tile.setAttribute("aria-label", `${product.name}，物品等级 ${product.level}，已打造 ${count} 次，已持有 ${owned} 个`);
      tile.append(element("span", `Lv.${product.level}`, "monster-craft-level"));
      if (count) { const badge = element("b", `造${count}`, "monster-craft-made"); badge.setAttribute("aria-hidden", "true"); tile.append(badge); }
      list.append(tile);
    }
    const previousTop = scrollByCategory[selection.category];
    restoreListPosition(previousTop);
    renderDetails();
  }
  function renderDetails() {
    detailBody.replaceChildren();
    detail.querySelector("[data-craft-item]")?.remove();
    detailBody.scrollTop = 0;
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
  function restoreListPosition(previousTop) { queueMicrotask(() => {
    const selected = list.querySelector('[aria-pressed="true"]');
    if (!list.isConnected || !selected) return;
    if (previousTop !== undefined) { list.scrollTop = previousTop; return; }
    const listBox = list.getBoundingClientRect(), selectedBox = selected.getBoundingClientRect();
    if (selectedBox.bottom > listBox.bottom) list.scrollTop += selectedBox.bottom - listBox.bottom + 10;
    else if (selectedBox.top < listBox.top) list.scrollTop -= listBox.top - selectedBox.top + 10;
  }); }
  render();
  return root;
}

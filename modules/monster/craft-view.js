import "./craft.css";
import { element, itemTile } from "./visual-ui.js";
import { getCraftRequirements } from "./craft-domain.js";

/** Return a self-contained recipe browser. The controller owns crafting and saving. */
export function renderCraft({ state, catalog, actions, receipt }) {
  const root = element("div", undefined, "monster-craft");
  const recipes = catalog.make.filter((recipe) => catalog.items.some((item) => item.id === recipe.itemid));
  let category = "equipment", selected = null;
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
  function render() {
    tabs.replaceChildren(); list.replaceChildren(); detail.replaceChildren();
    for (const [value, label] of [["equipment", "装备"], ["badge", "徽章"], ["goods", "材料"]]) {
      const button = element("button", label, "monster-image-button"); button.type = "button";
      button.setAttribute("aria-pressed", String(category === value));
      button.onclick = () => { category = value; selected = null; render(); tabs.querySelector('[aria-pressed="true"]')?.focus(); };
      tabs.append(button);
    }
    const visible = recipes.filter((entry) => categoryOf(catalog.items.find((row) => row.id === entry.itemid)) === category);
    if (!visible.some((entry) => entry.itemid === selected)) selected = visible[0]?.itemid ?? null;
    for (const recipe of visible) {
      const tile = itemTile({ id: recipe.itemid }, catalog, { onClick: () => { selected = recipe.itemid; render(); list.querySelector('[aria-pressed="true"]')?.focus(); } });
      tile.dataset.recipeId = recipe.itemid;
      tile.setAttribute("aria-pressed", String(recipe.itemid === selected));
      list.append(tile);
    }
    if (!selected) { detail.append(element("p", "暂无配方", "monster-panel-hint")); return; }
    const requirements = getCraftRequirements({ state, itemId: selected, catalog });
    const { product, materials, currency, price, affordable } = requirements;
    detail.append(element("h3", product.name), element("p", `物品等级 ${product.level} · 打造后放入背包`, "monster-panel-hint"));
    const costs = element("ul", undefined, "monster-craft-costs");
    for (const material of materials) {
      const row = catalog.items.find((item) => item.id === material.id);
      const line = element("li", `${row.name}${material.type === 2 ? "（背包中强化 +5）" : ""}：消耗 ${material.quantity}，持有 ${material.owned}`);
      if (material.owned < material.quantity) line.dataset.insufficient = "true";
      costs.append(line);
    }
    const coin = element("li", `${currency === "gold" ? "金币" : "魔石"}：消耗 ${price}，持有 ${state[currency]}`);
    if (state[currency] < price) coin.dataset.insufficient = "true";
    costs.append(coin); detail.append(costs);
    const button = element("button", "打造", "monster-image-button"); button.type = "button"; button.dataset.craftItem = selected;
    button.disabled = !affordable;
    button.onclick = async () => { button.disabled = true; try { await actions.craft(selected); } finally { if (button.isConnected) button.disabled = !affordable; } };
    detail.append(button);
  }
  render();
  return root;
}

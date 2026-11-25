import "./equipment-target.css";
import { element, itemTile } from "./visual-ui.js";
import { listTargetEquipment } from "./equipment-target-domain.js";
import { findMaterialSources } from "./material-source-domain.js";
import { renderSaveFeedback } from "./save-feedback-view.js";
import { getCraftRequirements } from "./craft-domain.js";
import { createCatalogEquipment } from "./item-domain.js";
import { calculateSpecialAttributes } from "./special-upgrade-domain.js";
import { describeEquipmentAttribute } from "./attribute-labels.js";
import { showItem } from "./item-detail-view.js";

export function renderEquipmentTargets({ content, state, catalog, actions, receipt, selection }) {
  content.className = "monster-equipment-targets";
  if (receipt) renderSaveFeedback({ content, receipt, actions });
  const all = listTargetEquipment(catalog);
  const targets = state.equipmentTargets || [];
  const preview = (row) => {
    const item = createCatalogEquipment({ row, template: catalog.equipmentTemplates[row.id] });
    return row.subtype === 9 ? { ...item, attributes: calculateSpecialAttributes({ item, player: state.player, catalog }) } : item;
  };
  const summary = element("section", undefined, "monster-original-panel monster-target-summary");
  summary.append(element("h3", `我的装备目标 · ${targets.length}`));
  if (!targets.length) summary.append(element("p", "选择徽章、稀有掉落装备或翅膀，查看获取地点。", "monster-panel-hint"));
  for (const id of targets) {
    const item = all.find((entry) => entry.id === id);
    if (!item) continue;
    const card = element("article", undefined, "monster-target-card"); card.dataset.trackedItem = String(id);
    const heading = element("div", undefined, "monster-target-heading");
    const remove = element("button", "移除目标", "monster-image-button"); remove.type = "button";
    remove.setAttribute("aria-label", `移除${item.name}目标`); remove.onclick = () => actions.toggleEquipmentTarget(id);
    heading.append(element("strong", item.name), remove); card.append(heading);
    if (item.subtype === 9) for (const attribute of preview(item).attributes) card.append(element("p", describeEquipmentAttribute(attribute)));
    if (id === 6901) card.append(element("p", "新角色初始翅膀。"));
    if (id === 6913) card.append(element("p", "铁匠铺熔炼神器装备成功时可获得，属性随机。"));
    const recipe = catalog.make.find((entry) => entry.itemid === id);
    if (recipe) {
      const requirements = getCraftRequirements({ state, itemId: id, catalog });
      const materials = requirements.materials.map((material) => {
        const row = catalog.items.find((entry) => entry.id === material.id);
        return `${row.name}${material.type === 2 ? " +5" : ""} ×${material.quantity}`;
      });
      card.append(element("p", `铁匠铺打造：${materials.join("、")}，${requirements.currency === "money" ? "魔石" : "金币"} ×${requirements.price}。`));
    }
    const sources = findMaterialSources({ state, catalog, itemId: id });
    if (!sources.length && !recipe && ![6901, 6913].includes(id)) card.append(element("p", "当前尚未找到可用的获取地点。"));
    const more = element("details", undefined, "monster-target-more");
    if (sources.length > 3) more.append(element("summary", `查看其余 ${sources.length - 3} 个地点`));
    for (const [index, source] of sources.entries()) {
      const line = element("div", undefined, "monster-target-source");
      line.append(element("span", `${source.name} · ${source.detail}${source.locked ? ` · ${source.locked}` : ""}`));
      const go = element("button", "前往", "monster-image-button"); go.type = "button"; go.disabled = Boolean(source.locked);
      go.setAttribute("aria-label", source.locked ? `${source.name}：${source.locked}` : `前往${source.name}`);
      go.onclick = () => actions.goToCopy(source.copyId, { hard: source.hard || 1, trialHard: source.trialHard || 1 });
      line.append(go); (index < 3 ? card : more).append(line);
    }
    if (sources.length > 3) card.append(more);
    summary.append(card);
  }
  content.append(summary, element("p", "徽章包含特殊徽章；稀有掉落装备仅列出高品质、无法打造且有掉落记录的装备。点击图标可查看属性。", "monster-panel-hint"));
  const label = element("label", "装备分类 ", "monster-target-filter");
  const filter = element("select"); filter.setAttribute("aria-label", "装备分类");
  for (const [value, text] of [["all", "全部"], ["badges", "徽章"], ["rare", "稀有掉落装备"], ["10", "翅膀"]]) {
    const option = element("option", text); option.value = value; filter.append(option);
  }
  filter.value = selection.filter; label.append(filter); content.append(label);
  const list = element("div", undefined, "monster-target-list"); list.setAttribute("aria-label", "全部目标装备"); content.append(list);
  function renderList() {
    list.replaceChildren();
    for (const item of all.filter((entry) => selection.filter === "all" || (selection.filter === "rare" ? entry.subtype >= 1 && entry.subtype <= 8 : selection.filter === "badges" ? entry.subtype === 9 || entry.subtype >= 11 && entry.subtype <= 14 : entry.subtype === Number(selection.filter)))) {
      const card = element("article", undefined, "monster-target-item monster-original-panel"); card.dataset.targetItem = String(item.id);
      const button = element("button", targets.includes(item.id) ? "移除目标" : "加入目标", "monster-image-button");
      button.type = "button"; button.dataset.toggleTarget = String(item.id);
      button.setAttribute("aria-label", `${targets.includes(item.id) ? "移除" : "追踪"}${item.name}`);
      button.onclick = () => actions.toggleEquipmentTarget(item.id);
      card.append(itemTile({ id: item.id }, catalog, { onClick: () => showItem({ item: preview(item), catalog, state }) }), element("span", `${item.name} · Lv.${item.level}`), button);
      list.append(card);
    }
  }
  filter.onchange = () => { selection.filter = filter.value; renderList(); };
  renderList();
}

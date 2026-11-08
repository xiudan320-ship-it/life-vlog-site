import { element, picture, itemTile, showItem } from "./visual-ui.js";

export function renderRole(content, state, catalog, actions) {
  content.className = "monster-character-content";
  const stats = element("section", undefined, "monster-role-stats monster-original-panel");
  stats.setAttribute("aria-label", "角色属性");
  for (const [key, name] of [["maxHp", "生命"], ["critHurt", "暴击伤害"], ["attack", "攻击"], ["resistance", "负面抵抗"], ["defense", "防御"], ["regeneration", "生命回复"], ["hit", "命中"], ["dropRate", "物品掉落"], ["dodge", "闪避"], ["goldRate", "金币掉落"], ["crit", "暴击"], ["experienceRate", "经验获得"]]) {
    const line = element("div"); line.append(element("span", name), element("b", `${state.player[key] || 0}${key.endsWith("Rate") ? "%" : ""}`)); stats.append(line);
  }
  const doll = element("section", undefined, "monster-paperdoll monster-original-panel");
  doll.setAttribute("aria-label", "已穿戴装备");
  doll.append(picture("ani/2001.png", "勇者", "monster-role-character"));
  const positions = { 2: [15, 17], 3: [15, 40], 8: [15, 63], 1: [15, 86], 7: [85, 17], 4: [85, 40], 6: [85, 63], 5: [85, 86], 9: [61, 11], 10: [39, 11] };
  const worn = [...state.player.equipmentSets[state.player.equipmentSetIndex], ...state.inventory.wings.filter((item) => item.id === state.player.wingId)];
  for (const [subtype, [left, top]] of Object.entries(positions)) {
    const item = worn.find((entry) => entry.subtype === Number(subtype));
    const slot = item ? itemTile(item, catalog, { onClick: () => showItem(item, catalog) }) : element("div", undefined, "monster-empty-slot");
    slot.style.left = `${left}%`; slot.style.top = `${top}%`; doll.append(slot);
  }
  const skills = element("button", undefined, "monster-role-skills"); skills.type = "button"; skills.setAttribute("aria-label", "选择装备技能");
  for (let index = 0; index < 3; index += 1) {
    const id = state.player.equippedSkillIds[index];
    const skill = catalog.skills.find((row) => row.id === id);
    const slot = element("span", undefined, "monster-equipped-skill");
    if (skill) slot.append(picture(`icon/skill/${skill.icon}`));
    skills.append(slot);
  }
  skills.onclick = () => actions.skills(); doll.append(skills);
  content.append(stats, doll, element("p", "点击装备查看详情 · 点击技能槽装配技能", "monster-panel-hint"));
}

export function renderBag(content, state, catalog, actions) {
  content.className = "monster-bag-content";
  const tabs = element("nav", undefined, "monster-image-tabs"); tabs.setAttribute("aria-label", "背包分类");
  const panel = element("section", undefined, "monster-bag-grid monster-original-panel");
  const empty = element("p", undefined, "monster-empty-bag");
  const groups = [
    { name: "道具", entries: state.inventory.goods, quantity: true },
    { name: "装备", entries: state.inventory.equipment },
    { name: "翅膀", entries: state.inventory.wings },
  ];
  function select(group) {
    for (const button of tabs.children) button.setAttribute("aria-pressed", String(button.textContent === group.name));
    panel.replaceChildren();
    group.entries.forEach((item, index) => panel.append(itemTile(item, catalog, { quantity: group.quantity,
      onClick: () => showItem(item, catalog, group.name === "装备" && item.subtype <= 9 ? () => actions.equip(index) : null) })));
    for (let index = group.entries.length; index < 30; index += 1) panel.append(element("div", undefined, "monster-empty-slot"));
    empty.textContent = group.entries.length ? `${group.name} ${group.entries.length} 件 · 点击图标查看` : "暂时没有材料或装备，冒险中获得的物品会保存在这里。";
  }
  for (const group of groups) {
    const tab = element("button", group.name, "monster-image-button"); tab.type = "button"; tab.onclick = () => select(group); tabs.append(tab);
  }
  content.append(tabs, panel, empty); select(groups[0]);
}

export function renderSkills(content, state, catalog, actions) {
  content.className = "monster-skills-content";
  content.append(element("p", "点击技能图标装配，最多同时装备 3 个技能。", "monster-panel-hint"));
  const grid = element("div", undefined, "monster-skill-grid");
  for (const skill of catalog.skills.filter((row) => row.id >= 2 && row.id <= 17)) {
    const card = element("label", undefined, "monster-skill-card monster-original-panel");
    const input = element("input"); input.type = "checkbox";
    input.checked = state.player.equippedSkillIds.includes(skill.id); input.disabled = state.player.level < skill.learnlevel;
    input.setAttribute("aria-label", skill.name);
    card.dataset.locked = String(input.disabled);
    const icon = element("span", undefined, "monster-skill-picture"); icon.append(picture(`icon/skill/${skill.icon}`));
    const selected = picture("img/equiped.png", "", "monster-skill-selected");
    card.append(input, icon, selected, element("strong", skill.name), element("small", `Lv.${skill.learnlevel}`), element("p", skill.describe));
    input.onchange = async () => {
      const checked = input.checked; input.disabled = true;
      const success = await actions.toggleSkill(skill.id); input.checked = success ? checked : !checked; input.disabled = false;
    };
    grid.append(card);
  }
  content.append(grid);
}

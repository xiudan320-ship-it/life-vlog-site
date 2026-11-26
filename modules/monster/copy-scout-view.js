import "./copy-scout.css";
import "./copy-drops.css";
import { element, picture } from "./visual-ui.js";
import { getCopyDropCatalog } from "./copy-drops-domain.js";
import { createCatalogEquipment } from "./item-domain.js";
import { calculateSpecialAttributes } from "./special-upgrade-domain.js";
import { showItem } from "./item-detail-view.js";

const attributes = [["attack", "攻击"], ["defense", "防御"], ["maxHp", "生命"], ["hit", "命中"],
  ["dodge", "闪避"], ["crit", "暴击"], ["critHurt", "暴击伤害"], ["resistance", "负面抵抗"], ["critResistance", "暴击抵抗"]];
const difficulty = ["", "普通", "困难", "噩梦", "巅峰 I", "巅峰 II", "巅峰 III"];
const number = (value) => Number(value).toLocaleString("zh-CN");

/** A compact, read-only encounter preview; the selected enemy and scroll position are local UI state. */
export function renderCopyScout({ content, state, catalog, scout, copy, actions, selected, selection = { enemy: 0, scrollTop: 0 } }) {
  const root = element("section", undefined, "monster-copy-scout");
  const dialog = content.closest("dialog");
  const scroll = element("div", undefined, "monster-scout-scroll");
  root.append(scroll);
  const restore = () => {
    content.replaceChildren();
    renderCopyScout({ content, state, catalog, scout, copy, actions, selected, selection });
  };
  scroll.append(element("h2", copy.name));
  if (scout.locked) scroll.append(element("p", `尚不可挑战：${scout.locked}`, "monster-scout-locked"));
  if (scout.unavailable) {
    scroll.append(element("p", scout.unavailable, "monster-scout-note"));
  } else {
    const power = element("div", undefined, "monster-scout-power");
    power.append(element("p", `当前战力 ${number(scout.playerPower)} · 推荐战力 ${number(scout.recommendedPower)}`),
      element("p", `挑战参考：${scout.riskLabel}`, `monster-scout-risk monster-scout-risk-${scout.risk}`));
    const explain = element("button", "战力说明", "monster-image-button monster-scout-explain");
    explain.type = "button";
    explain.onclick = () => {
      selection.scrollTop = scroll.scrollTop;
      const back = element("button", "返回怪物详情", "monster-image-button"); back.type = "button";
      back.onclick = () => { restore(); content.querySelector(".monster-scout-explain")?.focus({ preventScroll: true }); };
      content.replaceChildren(element("h2", "战力与随机说明"), ...scout.notes.map((note) => element("p", note)), back);
      dialog.scrollTop = 0;
    };
    power.append(explain); scroll.append(power);
    const mode = scout.trialLevel != null
      ? `试炼第 ${scout.trialLevel} 层 · 难度 ${scout.trialHard}`
      : `实际难度 ${difficulty[scout.hard] || scout.hard}${scout.waves != null ? ` · ${scout.waves} 波` : ""}`;
    scroll.append(element("p", `${mode} · 敌人 ${scout.enemyCount} 个`, "monster-scout-mode"));
    const groups = element("div", undefined, "monster-scout-groups");
    const choices = element("div", undefined, "monster-scout-enemy-choices");
    const detail = element("section", undefined, "monster-original-panel monster-scout-enemy");
    function renderEnemy() {
      detail.replaceChildren(); choices.replaceChildren();
      if (scout.enemyGroups.length > 1) {
        scout.enemyGroups.forEach((enemy, index) => {
          const button = element("button", enemy.name, "monster-image-button"); button.type = "button";
          button.setAttribute("aria-pressed", String(index === selection.enemy));
          button.setAttribute("aria-label", `查看${enemy.name}的属性`);
          button.onclick = (event) => { selection.enemy = index; renderEnemy(); if (event.detail === 0) choices.children[index].focus(); };
          choices.append(button);
        });
      }
      const enemy = scout.enemyGroups[selection.enemy];
      const heading = element("div", undefined, "monster-scout-enemy-heading");
      heading.append(picture(`enemy/${enemy.image}`, enemy.name), element("h3", `${enemy.name}${enemy.count == null ? " · 随机编队" : ` ×${enemy.count}`}`));
      const values = element("dl", undefined, "monster-scout-stats");
      for (const [key, label] of attributes) {
        const entry = element("div"), low = enemy.min[key], high = enemy.max[key];
        entry.append(element("dt", label), element("dd", low === high ? number(low) : `${number(low)}–${number(high)}`));
        values.append(entry);
      }
      detail.append(heading, values, element("p", `技能：${enemy.skills.length ? enemy.skills.map((skill) => skill.name).join("、") : "无"}`, "monster-scout-skills"));
    }
    groups.append(choices, detail); renderEnemy(); scroll.append(groups);
  }
  const drops = getCopyDropCatalog(copy, catalog);
  const dropSection = element("section", undefined, "monster-scout-drops");
  dropSection.setAttribute("aria-label", "关卡可掉落物品");
  dropSection.append(element("h3", `可掉落物品 · ${drops.length} 种`));
  dropSection.append(element("p", copy.type === 4 ? "随机遭遇该怪物后可获得以下物品。" : "共享关卡结算掉落；点击物品查看详情。", "monster-scout-note"));
  if (drops.length) {
    const list = element("div", undefined, "monster-scout-drop-list");
    for (const drop of drops) {
      const entry = element("button", undefined, "monster-scout-drop"); entry.type = "button";
      entry.dataset.dropItem = String(drop.id);
      entry.setAttribute("aria-label", `查看${drop.row.name}的掉落详情`);
      entry.append(picture(`icon/item/${drop.row.icon}`), element("span", drop.row.name), element("small", drop.conditions.join(" · ")));
      entry.onclick = () => {
        selection.scrollTop = scroll.scrollTop;
        const row = drop.row;
        let item = { id: row.id, type: row.type, level: row.level };
        let previewNote;
        if (row.type === 2 && row.subtype <= 10) {
          item = createCatalogEquipment({ row, template: catalog.equipmentTemplates[row.id] });
          if (row.subtype === 9) item.attributes = calculateSpecialAttributes({ item, player: state.player, catalog });
          previewNote = row.subtype === 9 ? "徽章显示未升级时的效果。" : "装备属性为示例；实际评分和随机词条以掉落为准。";
        } else if (row.type === 2) previewNote = "装备属性随机，以实际掉落为准。";
        showItem({ item, catalog, state, previewNote, backLabel: "返回掉落预览", onBack: () => {
          restore(); content.querySelector(`[data-drop-item="${drop.id}"]`)?.focus({ preventScroll: true });
        } });
        dialog.scrollTop = 0;
      };
      list.append(entry);
    }
    dropSection.append(list);
  } else dropSection.append(element("p", "本关没有普通结算物品掉落。", "monster-scout-note"));
  scroll.append(dropSection);
  const controls = element("div", undefined, "monster-scout-controls");
  const back = element("button", "返回", "monster-image-button"); back.type = "button"; back.onclick = () => actions.closeCopyScout();
  const start = element("button", "开始挑战", "monster-image-button"); start.type = "button";
  start.dataset.scoutStart = copy.id; start.disabled = Boolean(scout.locked || scout.unavailable);
  start.onclick = () => actions.challengeCopy(copy.id, selected);
  controls.append(back, start); root.append(controls); content.append(root);
  scroll.scrollTop = selection.scrollTop;
  return root;
}

import "./achievement.css";
import { element } from "./visual-ui.js";
import { describeEquipmentAttribute } from "./attribute-labels.js";
import { achievementAvailable, achievementProgress, titleAttributes, titleStatus } from "./achievement-domain.js";
import { renderSaveFeedback } from "./save-feedback-view.js";

export function renderAchievements({ content, state, catalog, actions, selection, receipt }) {
  content.className = "monster-achievements";
  if (receipt) renderSaveFeedback({ content, receipt, actions });
  const progress = achievementProgress(state);
  const header = element("section", undefined, "monster-original-panel monster-achievement-summary");
  header.append(element("h3", `成就积分 ${progress.points}`), element("p", `已完成 ${progress.completed.length} 项 · 完成后自动获得积分和魔石。`, "monster-panel-hint"),
    element("p", "累计行为从功能上线后开始统计；等级和当前装备按现有进度计算。", "monster-panel-hint"));
  content.append(header);
  const tabs = element("nav", undefined, "monster-image-tabs"); tabs.setAttribute("aria-label", "成就分类");
  const list = element("div", undefined, "monster-achievement-list");
  function render() {
    list.replaceChildren();
    for (const button of tabs.children) button.setAttribute("aria-pressed", String(button.dataset.section === selection.section));
    if (selection.section === "achievements") {
      for (const row of catalog.achievements.filter((entry) => entry.type === 1)) {
        const card = element("section", undefined, "monster-original-panel monster-achievement-card"); card.dataset.achievementId = String(row.id);
        const done = progress.completed.includes(row.id), available = achievementAvailable(row);
        card.append(element("strong", row.name), element("span", done ? "已完成" : available ? `${Math.min(progress.counters[row.subtype] || 0, row.needcount)} / ${row.needcount}` : "玩法尚未接通"),
          element("small", `成就积分 +${row.awardspecial} · 魔石 +${row.awardmoney}`));
        list.append(card);
      }
    } else {
      for (const row of catalog.achievements.filter((entry) => entry.type === 2)) {
        const status = titleStatus(row, state, catalog), wearing = progress.titleId === row.id;
        const card = element("section", undefined, "monster-original-panel monster-achievement-card"); card.dataset.titleId = String(row.id);
        const effects = titleAttributes({ achievementProgress: { titleId: row.id } }, catalog).map(describeEquipmentAttribute);
        const equip = element("button", wearing ? "卸下称号" : status.unlocked ? "佩戴称号" : "尚未解锁", "monster-image-button");
        equip.type = "button"; equip.disabled = !status.unlocked; equip.setAttribute("aria-label", `${wearing ? "卸下" : "佩戴"}${row.name}`);
        equip.onclick = () => actions.equipTitle(row.id);
        card.append(element("strong", `${row.name}${wearing ? " · 已佩戴" : ""}`), element("span", status.detail),
          element("small", effects.length ? effects.join(" · ") : "无属性加成"), equip);
        list.append(card);
      }
    }
  }
  for (const [section, text] of [["achievements", "成就"], ["titles", "称号"]]) {
    const button = element("button", text, "monster-image-button"); button.type = "button"; button.dataset.section = section;
    button.onclick = () => { selection.section = section; render(); }; tabs.append(button);
  }
  content.append(tabs, list); render();
}

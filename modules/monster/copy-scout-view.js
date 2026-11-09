import "./copy-scout.css";
import { element, picture } from "./visual-ui.js";

const attributes = [["attack", "攻击"], ["defense", "防御"], ["maxHp", "生命"], ["hit", "命中"],
  ["dodge", "闪避"], ["crit", "暴击"], ["critHurt", "暴击伤害"], ["resistance", "负面抵抗"], ["critResistance", "暴击抵抗"]];
const difficulty = ["", "普通", "困难", "噩梦", "巅峰 I", "巅峰 II", "巅峰 III"];
const number = (value) => Number(value).toLocaleString("zh-CN");

/** Render a read-only battle estimate inside the existing item dialog. */
export function renderCopyScout({ content, state, catalog, scout, copy, actions, selected }) {
  const root = element("section", undefined, "monster-copy-scout");
  root.append(element("h2", copy.name));
  if (scout.locked) root.append(element("p", `尚不可挑战：${scout.locked}`, "monster-scout-locked"));
  if (scout.unavailable) {
    root.append(element("p", scout.unavailable, "monster-scout-note"));
  } else {
    const power = element("div", undefined, "monster-scout-power");
    power.append(element("p", `当前战力 ${number(scout.playerPower)} · 推荐战力 ${number(scout.recommendedPower)}`),
      element("p", `挑战参考：${scout.riskLabel}`, `monster-scout-risk monster-scout-risk-${scout.risk}`));
    root.append(power);
    const mode = scout.trialLevel != null
      ? `试炼第 ${scout.trialLevel} 层 · 难度 ${scout.trialHard}`
      : `实际难度 ${difficulty[scout.hard] || scout.hard}${scout.waves != null ? ` · ${scout.waves} 波` : ""}`;
    root.append(element("p", `${mode} · 敌人 ${scout.enemyCount} 个`, "monster-scout-mode"));
    root.append(element("p", `角色：生命 ${number(state.player.maxHp)} · 攻击 ${number(state.player.attack)} · 防御 ${number(state.player.defense)}`, "monster-scout-note"));
    const groups = element("div", undefined, "monster-scout-groups");
    for (const enemy of scout.enemyGroups) {
      const card = element("section", undefined, "monster-original-panel monster-scout-enemy");
      const heading = element("div", undefined, "monster-scout-enemy-heading");
      heading.append(picture(`enemy/${enemy.image}`, enemy.name), element("h3", `${enemy.name}${enemy.count == null ? " · 随机编队" : ` ×${enemy.count}`}`));
      const values = element("dl", undefined, "monster-scout-stats");
      for (const [key, label] of attributes) {
        const entry = element("div");
        const low = enemy.min[key], high = enemy.max[key];
        const display = low === high ? number(low) : `${number(low)}–${number(high)}`;
        if (display.length > 14) values.classList.add("monster-scout-stats-wide");
        entry.append(element("dt", label), element("dd", display));
        values.append(entry);
      }
      const skills = element("p", `技能：${enemy.skills.length ? enemy.skills.map((skill) => skill.name).join("、") : "无"}`, "monster-scout-skills");
      card.append(heading, values, skills); groups.append(card);
    }
    root.append(groups);
    root.append(element("p", "常规敌人属性范围；随机遭遇、技能及随机效果会影响挑战结果。", "monster-scout-note"));
    const explanation = element("details", undefined, "monster-scout-explanation");
    explanation.append(element("summary", "战力计算与随机说明"));
    for (const note of scout.notes || []) explanation.append(element("p", note, "monster-scout-note"));
    root.append(explanation);
  }
  const controls = element("div", undefined, "monster-scout-controls");
  const back = element("button", "返回", "monster-image-button"); back.type = "button"; back.onclick = () => actions.closeCopyScout();
  const start = element("button", "开始挑战", "monster-image-button"); start.type = "button";
  start.dataset.scoutStart = copy.id; start.disabled = Boolean(scout.locked || scout.unavailable);
  start.onclick = () => actions.startScoutedCopy(copy.id, selected);
  controls.append(back, start); root.append(controls); content.append(root);
  return root;
}

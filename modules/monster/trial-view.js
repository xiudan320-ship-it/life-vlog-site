import { getCopyAccess } from "./copy-domain.js";
import { element, picture, itemTile, petTile } from "./visual-ui.js";

export function renderTrial({ content, state, catalog, onStart, onClaim, initialHard = 1 }) {
  content.classList.add("monster-trial-content");
  const trial = state.trial;
  const current = trial && trial.status !== "claimed";
  const panel = element("section", undefined, "monster-trial-panel monster-original-panel");
  panel.setAttribute("aria-label", "试炼进度");
  panel.append(picture("enemy/" + catalog.enemies.find((row) => row.id === 4801).img, "", "monster-trial-enemy"),
    element("h2", current ? `第 ${trial.level} 层${trial.status === "ended" ? " · 挑战结束" : ""}` : "勇者试炼"));
  const stats = element("div", undefined, "monster-trial-stats");
  const score = element("p", `本轮积分 ${trial?.score || 0}`); score.dataset.trialScore = "";
  stats.append(score, element("p", current ? `难度 ${trial.hard} · 已通过 ${trial.level - 1} 层` : "等级 80 开放 · 逐层挑战"));
  panel.append(stats);
  let hard = current ? trial.hard : initialHard;
  const difficulties = element("nav", undefined, "monster-trial-difficulties"); difficulties.setAttribute("aria-label", "试炼难度");
  for (let value = 1; value <= 3; value += 1) {
    const button = element("button", undefined, "monster-image-button"); button.type = "button"; button.dataset.trialHard = value;
    button.append(element("strong", `难度 ${value}`), element("small", `最高 ${trial?.bestScores[value] || 0} 分`));
    button.disabled = Boolean(current);
    button.setAttribute("aria-pressed", String(hard === value));
    button.onclick = () => { hard = value; for (const sibling of difficulties.children) sibling.setAttribute("aria-pressed", String(Number(sibling.dataset.trialHard) === value)); };
    difficulties.append(button);
  }
  panel.append(difficulties);
  const actions = element("div", undefined, "monster-trial-actions");
  const locked = getCopyAccess(catalog.copies.find((row) => row.id === 3101), state, catalog.chapters);
  if (!current || trial.status === "ready") {
    const start = element("button", locked || (current ? "挑战下一层" : "开始试炼"), "monster-image-button"); start.type = "button";
    start.dataset.copyId = 3101; start.disabled = Boolean(locked); start.onclick = () => onStart(hard);
    actions.append(start);
  }
  if (current) {
    const claim = element("button", "结束并结算奖励", "monster-image-button"); claim.type = "button"; claim.dataset.trialClaim = "";
    claim.onclick = async () => { claim.disabled = true; await onClaim(); if (claim.isConnected) claim.disabled = false; };
    actions.append(claim);
  }
  panel.append(actions);
  if (trial?.status === "claimed") {
    const receipt = element("section", undefined, "monster-trial-receipt"); receipt.setAttribute("aria-label", "试炼奖励");
    receipt.append(element("h3", "本轮奖励已入背包"));
    const grid = element("div", undefined, "monster-bag-grid");
    for (const item of trial.rewards) grid.append(item.type === 3 ? petTile(item, catalog) : itemTile(item, catalog, { quantity: item.type === 1 }));
    receipt.append(trial.rewards.length ? grid : element("p", "本轮未抽中额外物品")); panel.append(receipt);
  }
  panel.append(element("p", "每层结束自动保存。可暂时返回，重新进入试炼后续层。战败保留已得积分及击杀收益；结束时按积分抽取物品，每轮结算一次。", "monster-panel-hint"));
  panel.append(element("p", "宠物奖励可收藏在背包，宠物出战尚未接通。", "monster-panel-hint"));
  content.append(panel);
}

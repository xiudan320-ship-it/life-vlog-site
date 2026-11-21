import "./offline.css";
import { element, itemTile } from "./visual-ui.js";
import { renderSaveFeedback } from "./save-feedback-view.js";

const difficulty = ["", "普通", "困难", "噩梦", "巅峰 I", "巅峰 II", "巅峰 III"];
const number = (value) => Number(value).toLocaleString("zh-CN");
const reasons = {
  claimed: "已主动领取并结束挂机。",
  cap: "已达到 20 小时上限，挂机结束。",
  defeat: "战败后停止，已保留击杀收益。",
  tickets: "副本卷轴不足，挂机结束。",
  storage: "云存档空间不足，已保留之前的收益。",
};

function duration(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours}小时 ${minutes}分 ${seconds % 60}秒`;
}

function control(label, handler, className = "") {
  const button = element("button", label, `monster-image-button ${className}`.trim());
  button.type = "button";
  button.onclick = handler;
  return button;
}

/** Render the offline-run status without owning settlement or saving. */
export function renderOffline({ content, state, catalog, phase, elapsedMs = 0, progress = 0, summary = null, receipt = null, actions }) {
  content.replaceChildren();
  const root = element("div", undefined, "monster-offline");
  root.dataset.offlinePhase = phase;
  content.append(root);

  if (phase === "running") {
    const run = state.offlineRun;
    const copy = catalog.copies.find((entry) => entry.id === run.copyId);
    const panel = element("section", undefined, "monster-original-panel monster-offline-panel monster-offline-running");
    panel.append(element("p", "挂机中", "monster-offline-kicker"), element("h3", copy.name),
      element("p", `${difficulty[run.hard] || run.hard}${copy.type === 1 ? ` · ${run.waves} 波` : ""}`, "monster-offline-mode"));
    const time = element("div", undefined, "monster-offline-time");
    time.append(element("span", "已离线时长"), element("strong", duration(elapsedMs)), element("small", "累计上限 20 小时"));
    panel.append(time);
    panel.append(element("p", "关闭游戏后继续挂机；领取并结束后可进行其他玩法。战败保留已击杀收益。", "monster-panel-hint"));
    if (receipt) {
      const feedback = element("div", undefined, "monster-offline-feedback");
      renderSaveFeedback({ content: feedback, receipt, actions }); panel.append(feedback);
    }
    const error = element("p", undefined, "monster-offline-error"); error.setAttribute("role", "alert");
    const controls = element("div", undefined, "monster-offline-controls");
    let pending = false;
    const claim = control("领取并结束", async () => {
      if (pending) return;
      pending = true; claim.disabled = true; keep.disabled = true; error.textContent = "";
      try { await actions.claimOffline(); }
      catch (cause) { error.textContent = cause.message || "领取失败，请重试"; }
      finally { pending = false; if (claim.isConnected) { claim.disabled = false; keep.disabled = false; } }
    }, "monster-offline-claim");
    claim.dataset.offlineClaim = "";
    const keep = control("继续挂机", () => actions.dismissOffline());
    controls.append(claim, keep); panel.append(error, controls); root.append(panel);
  } else if (phase === "calculating") {
    const panel = element("section", undefined, "monster-original-panel monster-offline-panel monster-offline-calculating");
    const fraction = Math.max(0, Math.min(1, Number(progress) || 0));
    panel.append(element("h3", "正在结算挂机收益"));
    const status = element("p", `正在计算 ${Math.round(fraction * 100)}%`, "monster-offline-progress-label");
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    const bar = element("progress", undefined, "monster-offline-progress");
    bar.max = 1; bar.value = fraction; bar.setAttribute("aria-label", "挂机收益结算进度");
    panel.append(status, bar, element("p", "结算中，请稍候。", "monster-panel-hint")); root.append(panel);
  } else if (phase === "result" && summary) {
    const panel = element("section", undefined, "monster-original-panel monster-offline-panel monster-offline-result");
    panel.append(element("p", "挂机结束", "monster-offline-kicker"), element("h3", "本次挂机收益"));
    const stats = element("dl", undefined, "monster-offline-stats");
    for (const [label, value] of [["累计时间", duration(summary.elapsedMs)], ["通关次数", number(summary.victories)], ["击杀", number(summary.kills)], ["金币", `+${number(summary.gold)}`], ["经验", `+${number(summary.experience)}`]]) {
      const row = element("div"); row.append(element("dt", label), element("dd", value)); stats.append(row);
    }
    panel.append(stats);
    if (["defeat", "tickets", "storage"].includes(summary.reason) && summary.simulatedMs !== summary.elapsedMs) {
      panel.append(element("p", `实际结算 ${duration(summary.simulatedMs)}`, "monster-offline-reason"));
    }
    const reason = element("p", reasons[summary.reason], "monster-offline-reason"); reason.dataset.offlineReason = summary.reason; panel.append(reason);
    const rewards = element("section", undefined, "monster-offline-rewards");
    rewards.append(element("h4", "材料与装备"));
    if (summary.items.length) {
      const list = element("ul", undefined, "monster-offline-items");
      for (const item of summary.items) {
        const row = catalog.items.find((entry) => entry.id === item.id);
        const entry = element("li");
        entry.append(itemTile(item, catalog, { quantity: true }));
        entry.append(element("span", `${row.name} ×${number(item.quantity)}`));
        list.append(entry);
      }
      rewards.append(list);
    } else rewards.append(element("p", "本次没有获得材料或装备。", "monster-panel-hint"));
    panel.append(rewards);
    if (receipt) {
      const feedback = element("div", undefined, "monster-offline-feedback");
      renderSaveFeedback({ content: feedback, receipt, actions }); panel.append(feedback);
    }
    const home = control("返回主页", () => actions.dismissOffline(), "monster-offline-home");
    home.dataset.offlineDismiss = ""; panel.append(home); root.append(panel);
  }
  return root;
}

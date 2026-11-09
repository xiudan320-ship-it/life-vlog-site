import { element, picture } from "./visual-ui.js";
import { gameDay, taskCount } from "./task-domain.js";

export function renderTasks({ content, state, catalog, actions, now }) {
  content.className = "monster-tasks-content";
  const header = element("section", undefined, "monster-original-panel monster-task-summary");
  header.append(element("h3", `任务积分 ${state.taskBoard.points}`));
  const daily = element("button", "领取每日奖励并刷新任务", "monster-image-button"); daily.type = "button"; daily.dataset.dailyReward = "";
  daily.disabled = Boolean(state.taskBoard.dailyRewardDay && state.taskBoard.dailyRewardDay >= gameDay(now));
  if (daily.disabled) daily.textContent = "今日奖励已领取";
  daily.onclick = () => actions.claimDailyReward();
  header.append(daily, element("p", "魔石 ×10 · 副本卷轴 ×5。领取会刷新本页任务与进度；每日 00:00（UTC+8）后可再次领取。", "monster-panel-hint"));
  content.append(header);
  const pending = { 14: "寻宝玩法尚未接通", 16: "黑市玩法尚未接通", 17: "当前移植版不提供充值" };
  for (const [title, test] of [["等级任务", (entry) => entry.type <= 3], ["每日目标", (entry) => entry.type >= 11]]) {
    content.append(element("h3", title));
    for (const entry of state.taskBoard.entries.filter(test)) {
      const row = catalog.tasks.find((row) => row.id === entry.id);
      const card = element("section", undefined, "monster-task-card monster-original-panel"); card.dataset.taskId = entry.id;
      let icon;
      if ([3, 15].includes(entry.type)) icon = picture("icon/item/" + catalog.items.find((item) => item.id === entry.target).icon);
      else {
        const copy = catalog.copies.find((copy) => copy.id === entry.target);
        const enemy = catalog.enemies.find((enemy) => enemy.id === copy?.enemyid1);
        icon = picture(enemy ? "enemy/" + enemy.img : "ui/btn/main_btn_achieve.png");
      }
      card.append(icon);
      const body = element("div");
      const count = entry.claimed ? entry.need : taskCount(entry, state);
      body.append(element("strong", row.name), element("p", `${count} / ${entry.need}`),
        element("small", `魔石 +${row.awardmoney} · 经验 +${row.awardexp} · 积分 +${row.awardspecial}`));
      const locked = state.player.level < row.level ? `需要等级 ${row.level}` : pending[entry.type];
      if (locked) body.append(element("p", locked, "monster-panel-hint"));
      const button = element("button", entry.claimed ? "已领取" : [3, 15].includes(entry.type) ? "交纳并领取" : "领取奖励", "monster-image-button");
      button.type = "button"; button.disabled = Boolean(locked || entry.claimed || count < entry.need);
      button.onclick = () => actions.claimTask(entry.id);
      body.append(button); card.append(body); content.append(card);
    }
  }
}

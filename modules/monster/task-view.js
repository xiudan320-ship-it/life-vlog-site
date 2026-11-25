import "./task.css";
import { element, picture } from "./visual-ui.js";
import { gameDay, taskCount } from "./task-domain.js";

export function renderTasks({ content, state, catalog, actions, now }) {
  content.className = "monster-tasks-content";
  const header = element("section", undefined, "monster-original-panel monster-task-summary");
  const summary = element("div", undefined, "monster-task-summary-top");
  summary.append(element("h3", `任务积分 ${state.taskBoard.points}`));
  const daily = element("button", "领取每日奖励", "monster-image-button"); daily.type = "button"; daily.dataset.dailyReward = "";
  daily.disabled = Boolean(state.taskBoard.dailyRewardDay && state.taskBoard.dailyRewardDay >= gameDay(now));
  if (daily.disabled) daily.textContent = "今日奖励已领取";
  daily.onclick = () => actions.claimDailyReward();
  const shop = element("button", "积分商店", "monster-image-button"); shop.type = "button"; shop.dataset.pointShop = ""; shop.onclick = () => actions.pointShop();
  summary.append(shop, daily);
  const explanation = element("p", undefined, "monster-panel-hint");
  explanation.append(element("span", "魔石 ×10 · 卷轴 ×5；领取后刷新任务。"), element("span", "每日 00:00（UTC+8）可领取。"));
  header.append(summary, explanation);
  content.append(header);
  const pending = { 14: "寻宝玩法尚未接通" };
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
      const body = element("div", undefined, "monster-task-body");
      const count = entry.claimed ? entry.need : taskCount(entry, state);
      const heading = element("div", undefined, "monster-task-title");
      heading.append(element("strong", row.name), element("span", `${count} / ${entry.need}`, "monster-task-progress"));
      body.append(heading, element("small", `魔石 +${row.awardmoney} · 经验 +${row.awardexp} · 积分 +${row.awardspecial}`));
      const locked = state.player.level < row.level ? `需要等级 ${row.level}` : pending[entry.type];
      if (locked) body.append(element("p", locked, "monster-panel-hint"));
      const button = element("button", entry.claimed ? "已领取" : [3, 15].includes(entry.type) ? "交纳并领取" : "领取奖励", "monster-image-button");
      button.type = "button"; button.disabled = Boolean(locked || entry.claimed || count < entry.need);
      button.onclick = () => actions.claimTask(entry.id);
      const controls = element("div", undefined, "monster-task-actions");
      controls.append(button);
      const destination = !entry.claimed && count < entry.need && [1, 2].includes(entry.type)
        && catalog.copies.find((copy) => copy.id === entry.target && copy.type === entry.type);
      if (destination) {
        const location = element("button", entry.type === 1 ? "前往地图" : "前往副本", "monster-image-button");
        location.type = "button"; location.dataset.taskCopy = String(destination.id);
        location.setAttribute("aria-label", `前往${destination.name}${entry.type === 1 ? "地图" : "副本"}`);
        location.onclick = () => actions.goToTaskCopy(destination.id);
        controls.append(location);
      }
      if ([3, 15].includes(entry.type) && !entry.claimed && count < entry.need) {
        const source = element("button", "查看材料来源", "monster-image-button");
        source.type = "button"; source.dataset.materialSource = entry.target;
        source.onclick = () => actions.materialSources(entry.target);
        controls.append(source);
      }
      body.append(controls);
      card.append(body); content.append(card);
    }
  }
}

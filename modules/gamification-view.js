import {
  DAILY_LOGIN_EXP,
  EXPERIENCE_REWARDS,
  getVipExpMultiplier,
} from "./gamification-domain.js";
import { escapeHtml } from "./ui-formatters.js";

export function buildLevelLeaderboardMarkup({
  ranks = [],
  currentUserId = "",
  getAvatarUrl,
  getCachedAvatarUrl,
  getInitial,
}) {
  if (!ranks.length) return `<div class="level-rank-empty">登录后显示家庭修为排行。</div>`;
  return `<div class="level-rank-list">${ranks.map((profile, index) => {
    const current = profile.user_id === currentUserId;
    const avatarUrl = getAvatarUrl(profile) || getCachedAvatarUrl(profile.user_id);
    return `
      <article class="level-rank-row ${current ? "current" : ""}">
        <span class="level-rank-index">${index + 1}</span>
        ${avatarUrl
          ? `<span class="level-rank-avatar" data-avatar-fallback="${escapeHtml(getInitial(profile.username))}"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(profile.username)}的头像" decoding="async" /></span>`
          : `<span class="level-rank-avatar">${escapeHtml(getInitial(profile.username))}</span>`}
        <div><strong>${escapeHtml(profile.username || "家庭成员")}${current ? "（我）" : ""}</strong><small>${escapeHtml(profile.progress.title)} · ${Number(profile.experience_total || 0).toLocaleString()} EXP</small></div>
        <em>${profile.role === "owner" ? "创始人" : "成员"}</em>
      </article>`;
  }).join("")}</div>`;
}

export function buildCultivationArchiveMarkup(archive, monthLabel) {
  const previewBadges = [
    ...archive.badges.filter((badge) => badge.unlocked),
    ...archive.badges.filter((badge) => !badge.unlocked).sort((a, b) => b.percent - a.percent),
  ].slice(0, 4);
  return `
    <section class="cultivation-archive">
      <div class="cultivation-panel cultivation-badges">
        <div class="cultivation-panel-head"><span>称号与徽章</span><button type="button" data-open-achievements>查看全部 · ${archive.badges.filter((badge) => badge.unlocked).length}/${archive.badges.length}</button></div>
        <div class="cultivation-badge-grid">${previewBadges.map((badge) => `
          <article class="cultivation-badge ${badge.unlocked ? "unlocked" : "locked"}"><i>${badge.icon}</i><div><strong>${badge.title}</strong><small>${badge.unlocked ? "已解锁" : badge.detail}</small></div></article>
        `).join("")}</div>
      </div>
      <div class="cultivation-panel cultivation-monthly">
        <div class="cultivation-panel-head"><span>修行月报</span><strong>${monthLabel}</strong></div>
        <div class="cultivation-month-grid">
          <span><b>${archive.month.diaries}</b><small>日记</small></span><span><b>${archive.month.comments}</b><small>留言</small></span><span><b>${archive.month.wishes}</b><small>圆梦</small></span><span><b>${archive.month.recipes}</b><small>菜谱</small></span><span><b>${archive.month.secrets}</b><small>秘藏</small></span>
        </div>
      </div>
      <div class="cultivation-panel cultivation-roots">
        <div class="cultivation-panel-head"><span>灵根谱</span><strong>主灵根 · ${archive.primaryRoot}</strong></div>
        <div class="cultivation-root-list">${archive.roots.map((root) => `<div><span>${root.key}</span><i><b style="width:${root.percent}%"></b></i><em>${root.percent}%</em></div>`).join("")}</div>
      </div>
    </section>`;
}

export function buildLevelAtlasMarkup({
  experienceTotal,
  progress,
  realms,
  descriptions,
  milestones,
  dailyExp,
  formatMilestoneDate,
  formatUpgradeDays,
  upgradeEta,
}) {
  return `<section class="level-atlas-panel"><div class="level-atlas-intro"><strong>${experienceTotal.toLocaleString()} EXP</strong><span>${escapeHtml(upgradeEta)}</span></div>
    <div class="level-guide-timeline">${realms.map((realm, index) => {
      const nextThreshold = Number.isFinite(realm.next) ? realm.next : Infinity;
      const unlocked = experienceTotal >= realm.threshold;
      const active = progress.realm === realm.name;
      const remaining = Math.max(0, realm.threshold - experienceTotal);
      const reachedDate = formatMilestoneDate(milestones[realm.name]);
      const eta = unlocked ? (active ? "当前境界" : `达成于 ${reachedDate}`) : `${formatUpgradeDays(Math.ceil(remaining / Math.max(1, dailyExp)))}可抵达`;
      const range = Number.isFinite(nextThreshold) ? `${realm.threshold.toLocaleString()} - ${(nextThreshold - 1).toLocaleString()} EXP` : `${realm.threshold.toLocaleString()}+ EXP`;
      return `<article class="${active ? "active" : ""} ${unlocked ? "unlocked" : "locked"}"><i>${String(index + 1).padStart(2, "0")}</i><div><small>${range}</small><h2>${escapeHtml(realm.name)}</h2><p>${escapeHtml(descriptions[realm.name] || "")}</p><em>${eta}</em></div></article>`;
    }).join("")}</div></section>`;
}

export function buildExperienceRulesMarkup({ experience, nextStreak, streakBonus, todayExperience }) {
  const currentStreak = Math.max(0, Number(experience.loginStreak) || 0);
  const rules = [
    ["每日登录", `+${DAILY_LOGIN_EXP} EXP`, "每天首次进入并完成同步时获得一次。"],
    ["发布日记", `+${EXPERIENCE_REWARDS.diary} EXP`, "发布一篇日记，记录一次真实发生。"],
    ["留言 / 回复", `+${EXPERIENCE_REWARDS.comment} EXP`, "给家庭成员的日记留下评论或回复。"],
    ["发布菜谱", `+${EXPERIENCE_REWARDS.recipe} EXP`, "保存一份新的菜谱。"],
    ["发布心愿", `+${EXPERIENCE_REWARDS.wish} EXP`, "把想做、想去或想吃的事写进心愿单。"],
    ["完成心愿", `+${EXPERIENCE_REWARDS.wishDone} EXP`, "完成心愿后补上一句感想，获得额外修为。"],
    ["安排周末", `+${EXPERIENCE_REWARDS.weekend} EXP`, "新增一次周末计划。"],
    ["时间纪念册", `+${EXPERIENCE_REWARDS.anniversary} EXP`, "新增一个值得记住的日期。"],
    ["感谢留言", `+${EXPERIENCE_REWARDS.thanks} EXP`, "在感谢留言板留下新的记录。"],
    ["编辑已有日记", `+${EXPERIENCE_REWARDS.diaryEdit} EXP`, "补充或修改已经发布的日记内容。"],
  ];
  const vipRows = [0, 1, 2, 3, 4, 5].map((level) => `<span><b>LV.${level}</b><small>${getVipExpMultiplier(level)}x 经验倍率</small></span>`).join("");
  return `<section class="experience-rules-panel">
    <header class="experience-rules-head"><div><small>HOW EXP GROWS</small><h3>经验增加规则</h3><p>经验只记录你们认真生活的痕迹，不会扣除，也不会因为切换设备而分开计算。</p></div><strong>今日 +${todayExperience} EXP</strong></header>
    <div class="experience-streak-card"><div><span>连续登录</span><strong>${currentStreak} 天</strong></div><p>连续第 ${nextStreak} 天预计登录基础 +${DAILY_LOGIN_EXP} EXP${streakBonus ? `，本次连续奖励 +${streakBonus} EXP` : ""}。连续奖励每 2 天增加 5 EXP，最高 +40 EXP。</p></div>
    <div class="experience-rule-list">${rules.map(([label, amount, detail]) => `<article class="experience-rule-row"><div><strong>${label}</strong><small>${detail}</small></div><b>${amount}</b></article>`).join("")}</div>
    <section class="experience-vip-rules"><div><small>MEMBER BONUS</small><h4>会员经验倍率</h4></div><div class="experience-vip-grid">${vipRows}</div><p>倍率会作用于发布、互动和每日登录奖励；升级境界仍只看累计 EXP。</p></section>
  </section>`;
}

export function getAchievementConditionText(badge) {
  if (!badge) return "查看具体达成条件";
  if (badge.unlocked) return `达成条件：${badge.detail}。已经完成。`;
  const remaining = Math.max(0, Number(badge.target) - Number(badge.current));
  return `达成条件：${badge.detail}。当前 ${Math.min(badge.current, badge.target)} / ${badge.target}，还差 ${remaining}。`;
}

export function buildLevelAchievementMarkup(badges = []) {
  return `<section class="level-achievement-panel"><div class="level-section-heading"><div><small>Achievements</small><h3>成就徽章</h3></div><span>${badges.filter((badge) => badge.unlocked).length}/${badges.length}</span></div>
    <div class="level-achievement-grid">${badges.map((badge) => `<button type="button" data-level-achievement="${escapeHtml(badge.id)}" class="${badge.unlocked ? "unlocked" : "locked"}"><i>${escapeHtml(badge.icon)}</i><span><strong>${escapeHtml(badge.title)}</strong><small>${escapeHtml(getAchievementConditionText(badge))}</small><em>${badge.unlocked ? "已达成" : `${Math.min(badge.current, badge.target)} / ${badge.target}`}</em></span></button>`).join("")}</div></section>`;
}

export function buildAchievementDetailMarkup(badge) {
  return `<button type="button" data-close-achievement-detail aria-label="关闭">×</button>
    <div class="achievement-detail-icon ${badge.unlocked ? "unlocked" : ""}">${escapeHtml(badge.icon)}</div>
    <small>${escapeHtml(badge.category)} · ${badge.unlocked ? "已解锁" : "修行中"}</small>
    <h2>${escapeHtml(badge.title)}</h2>
    <p>${escapeHtml(badge.lore || "每一枚徽章，都是普通日子认真发生过的证据。")}</p>
    <section><span>详细达成条件</span><strong>${escapeHtml(badge.detail)}</strong><p>${escapeHtml(getAchievementConditionText(badge))}</p><em>${Math.min(badge.current, badge.target)} / ${badge.target}</em><i><b style="width:${badge.percent}%"></b></i></section>`;
}

export function buildLevelWorkspaceMarkup({ sections = [], activeSection = "ranking", content = "" }) {
  return `<div class="level-workspace">
    <nav class="level-section-nav" aria-label="成长等级页面">${sections.map((section) => `<button class="${activeSection === section.id ? "active" : ""}" type="button" data-level-section="${section.id}"><i>${section.icon}</i><span>${section.label}</span></button>`).join("")}</nav>
    <div class="level-section-content">${content}</div>
  </div>`;
}

export function buildAchievementFilterMarkup(categories = [], activeFilter = "全部") {
  return categories.map((category) => `<button class="${activeFilter === category ? "active" : ""}" type="button" data-achievement-filter="${category}">${category}</button>`).join("");
}

export function buildAchievementGridMarkup(badges = [], activeFilter = "全部") {
  const visible = activeFilter === "全部" ? badges : badges.filter((badge) => badge.category === activeFilter);
  return visible.map((badge) => `
    <button class="achievement-card ${badge.unlocked ? "unlocked" : "locked"}" type="button" data-achievement-id="${escapeHtml(badge.id)}">
      <i>${badge.icon}</i><div><small>${badge.category} · ${badge.unlocked ? "已达成" : "进行中"}</small><strong>${badge.title}</strong><p>${escapeHtml(getAchievementConditionText(badge))}</p></div>
      <em>${badge.unlocked ? "完成" : `${Math.min(badge.current, badge.target)} / ${badge.target}`}</em><span><b style="width:${badge.percent}%"></b></span>
    </button>`).join("");
}

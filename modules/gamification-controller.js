import {
  formatMoney,
  getVipLevel,
  getVipLevelByRecharge,
  renderVipCenterView,
} from "./vip-center.js";
import {
  CULTIVATION_DESCRIPTIONS,
  CULTIVATION_REALMS,
  EXPERIENCE_REWARDS,
  getDailyLoginReward as calculateDailyLoginReward,
  getExperienceLevel as calculateExperienceLevel,
  getLoginStreakBonusBase as calculateLoginStreakBonusBase,
  getUpgradeEta as calculateUpgradeEta,
  getVipAdjustedExperience as calculateVipAdjustedExperience,
  getVipExpMultiplier as calculateVipExpMultiplier,
} from "./gamification-domain.js?v=20260810-003";
import { buildCultivationArchive } from "./gamification-archive.js";
import {
  buildAchievementDetailMarkup,
  buildAchievementFilterMarkup,
  buildAchievementGridMarkup,
  buildCultivationArchiveMarkup,
  buildExperienceRulesMarkup,
  buildLevelAchievementMarkup,
  buildLevelAtlasMarkup,
  buildLevelLeaderboardMarkup,
  buildLevelWorkspaceMarkup,
  getAchievementConditionText as formatAchievementCondition,
} from "./gamification-view.js";
import { escapeHtml, getInitial } from "./ui-formatters.js";

export function createGamificationController({
  elements,
  state,
  householdRepository,
  keys,
  vipUsers,
  getSessionDisplayName,
  getSessionLoginName,
  getProfileAvatarUrl,
  loadCachedAvatarUrl,
  saveCachedAvatarUrl,
  getArchiveData,
  getLocalDateKey,
  getOffsetLocalDateKey,
  normalizeLoginDateKey,
  isYesterdayLoginDate,
  updateAuthUI,
  renderOverview,
}) {
  const els = elements;
  const VIP_RECHARGE_KEY = keys.vipRecharge;
  const EXPERIENCE_KEY = keys.experience;
  const TODAY_EXPERIENCE_KEY = keys.todayExperience;
  const VIP_USERS = vipUsers;
  let activeLevelSection = "ranking";
  let achievementFilter = "全部";

  function isVipUser(value) {
    return VIP_USERS.has(String(value || "").trim().toLowerCase());
  }
  
  function getCurrentImageLimit() {
    return state.activeVipLevel > 0 ? getVipLevel(state.activeVipLevel).limit : 1;
  }
  
  function getUploadQuality() {
    if (state.activeVipLevel >= 5) {
      return { maxSide: 2800, jpeg: 0.9, minJpeg: 0.69, targetBytes: 1_600_000 };
    }
    if (state.activeVipLevel >= 3) {
      return { maxSide: 2200, jpeg: 0.87, minJpeg: 0.66, targetBytes: 1_200_000 };
    }
    return { maxSide: 1800, jpeg: 0.84, minJpeg: 0.62, targetBytes: 850_000 };
  }
  
  function formatFileSize(bytes) {
    const size = Math.max(0, Number(bytes) || 0);
    if (size < 1024) return `${Math.round(size)} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
  
  function getRechargeStorageKey(displayName = getSessionDisplayName()) {
    return `${VIP_RECHARGE_KEY}:${String(displayName || "guest").toLowerCase()}`;
  }
  
  function loadRechargeTotal(displayName = getSessionDisplayName()) {
    if (state.cloudSyncAvailable && state.session) {
      return Math.max(0, Number(state.accountProfile.rechargeTotal) || 0);
    }
    const key = getRechargeStorageKey(displayName);
    const stored = Number(localStorage.getItem(key));
    if (Number.isFinite(stored) && stored >= 0) return stored;
    return isVipUser(displayName) ? 298 : 0;
  }
  
  function saveRechargeTotal(amount, displayName = getSessionDisplayName()) {
    const normalized = Math.max(0, Math.round(amount));
    localStorage.setItem(getRechargeStorageKey(displayName), String(normalized));
    if (state.session) state.accountProfile.rechargeTotal = normalized;
  }
  
  function renderVipCenter() {
    const displayName = state.session ? getSessionDisplayName() : "";
    const rechargeTotal = state.session ? loadRechargeTotal(displayName) : 0;
    renderVipCenterView({
      elements: {
        currentLevel: els.vipCurrentLevel,
        currentName: els.vipCurrentName,
        rechargeTotal: els.vipRechargeTotal,
        tierAmount: els.vipTierAmount,
        summary: els.vipSummary,
        next: els.vipNext,
        levels: els.vipLevels,
        recharge: els.vipRecharge,
        perks: els.vipPerks,
        status: els.vipStatus,
      },
      signedIn: Boolean(state.session),
      displayName,
      rechargeTotal,
      cloudSyncAvailable: state.cloudSyncAvailable,
      onTopUp: topUpToLevel,
      onRecharge: rechargeVip,
    });
  }
  
  function topUpToLevel(level) {
    if (!state.session) {
      els.vipStatus.textContent = "请先登录。";
      return;
    }
  
    const target = getVipLevel(level);
    const current = loadRechargeTotal();
    const diff = Math.max(0, target.price - current);
    rechargeVip(diff);
  }
  
  async function rechargeVip(amount) {
    if (!state.session) {
      els.vipStatus.textContent = "请先登录。";
      return;
    }
  
    const numericAmount = Math.max(0, Math.round(Number(amount) || 0));
    if (!numericAmount) {
      els.vipStatus.textContent = "这个档位已经解锁。";
      return;
    }
    if (!state.cloudSyncAvailable) {
      els.vipStatus.textContent =
        "Cloudflare D1 尚未升级，本次充值没有保存。请先部署最新版数据库结构。";
      return;
    }
  
    const nextTotal = loadRechargeTotal() + numericAmount;
    const nextLevel = getVipLevelByRecharge(nextTotal)?.level || 0;
  
    const { error } = await householdRepository.update(
      "user_profiles",
      {
        recharge_total: nextTotal,
        vip_level: nextLevel,
        updated_at: new Date().toISOString(),
      },
      { user_id: state.session.user.id }
    );
    if (error) {
      els.vipStatus.textContent = `会员同步失败：${error.message}`;
      return;
    }
  
    saveRechargeTotal(nextTotal);
    state.accountProfile.vipLevel = nextLevel;
    state.activeVipLevel = nextLevel;
    updateAuthUI();
    renderVipCenter();
    els.vipStatus.textContent = `模拟充值 ${formatMoney(numericAmount)} 成功，累计 ${formatMoney(nextTotal)}，已同步。`;
  }
  
  function getExperienceStorageKey(displayName = getSessionDisplayName()) {
    return `${EXPERIENCE_KEY}:${String(displayName || "guest").toLowerCase()}`;
  }
  
  function loadLocalExperienceAliases(displayName = getSessionDisplayName()) {
    const names = new Set(
      [
        displayName,
        getSessionDisplayName(),
        getSessionLoginName(),
        state.session?.user?.user_metadata?.username,
        state.session?.user?.user_metadata?.login_username,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const result = {
      total: 0,
      lastLoginDate: "",
      loginStreak: 0,
      gainedToday: false,
    };
  
    for (const name of names) {
      try {
        const parsed = JSON.parse(localStorage.getItem(getExperienceStorageKey(name)) || "{}");
        const lastLoginDate = normalizeLoginDateKey(parsed.lastLoginDate);
        result.total = Math.max(result.total, Number(parsed.total) || 0);
        result.loginStreak = Math.max(result.loginStreak, Number(parsed.loginStreak) || 0);
        if (lastLoginDate > result.lastLoginDate) result.lastLoginDate = lastLoginDate;
        result.gainedToday = result.gainedToday || Boolean(parsed.gainedToday);
      } catch {}
    }
  
    return result;
  }
  
  function loadExperience(displayName = getSessionDisplayName()) {
    if (state.cloudSyncAvailable && state.session) {
      return {
        total: Math.max(0, Number(state.accountProfile.experienceTotal) || 0),
        lastLoginDate: state.accountProfile.lastLoginDate || "",
        loginStreak: Math.max(0, Number(state.accountProfile.loginStreak) || 0),
        gainedToday: state.accountProfile.lastLoginDate === getLocalDateKey(),
      };
    }
    return loadLocalExperienceAliases(displayName);
  }
  
  function saveExperience(data, displayName = getSessionDisplayName()) {
    localStorage.setItem(getExperienceStorageKey(displayName), JSON.stringify(data));
    if (state.session) {
      state.accountProfile.experienceTotal = Number(data.total) || 0;
      state.accountProfile.lastLoginDate = data.lastLoginDate || "";
      state.accountProfile.loginStreak = Math.max(0, Number(data.loginStreak) || 0);
    }
  }
  
  function getTodayExperienceStorageKey(userId = state.session?.user?.id || getSessionLoginName()) {
    return `${TODAY_EXPERIENCE_KEY}:${userId || "guest"}`;
  }
  
  function loadTodayExperience(userId = state.session?.user?.id || getSessionLoginName()) {
    if (
      state.cloudSyncAvailable &&
      state.session &&
      state.accountProfile.todayExperienceDate === getLocalDateKey()
    ) {
      return Math.max(0, Number(state.accountProfile.todayExperienceAmount) || 0);
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(getTodayExperienceStorageKey(userId)) || "{}");
      return parsed.date === getLocalDateKey() ? Math.max(0, Number(parsed.amount) || 0) : 0;
    } catch {
      return 0;
    }
  }
  
  function addTodayExperience(amount, userId = state.session?.user?.id || getSessionLoginName()) {
    const numericAmount = Math.max(0, Number(amount) || 0);
    if (!numericAmount) return loadTodayExperience(userId);
    const nextAmount = loadTodayExperience(userId) + numericAmount;
    localStorage.setItem(
      getTodayExperienceStorageKey(userId),
      JSON.stringify({ date: getLocalDateKey(), amount: nextAmount })
    );
    if (state.session && userId === state.session.user.id) {
      state.accountProfile.todayExperienceDate = getLocalDateKey();
      state.accountProfile.todayExperienceAmount = nextAmount;
    }
    return nextAmount;
  }
  
  function getVipExpMultiplier(level = state.activeVipLevel) {
    return calculateVipExpMultiplier(level);
  }
  
  function getVipAdjustedExperience(base, level = state.activeVipLevel) {
    return calculateVipAdjustedExperience(base, level);
  }
  
  function getLoginStreakBonusBase(streak) {
    return calculateLoginStreakBonusBase(streak);
  }
  
  function getDailyLoginReward(streak = state.accountProfile.loginStreak || 1, level = state.activeVipLevel) {
    return calculateDailyLoginReward(streak, level);
  }
  
  function getNextLoginStreak(experience = loadExperience()) {
    const lastLoginDate = normalizeLoginDateKey(experience.lastLoginDate);
    const streak = Math.max(0, Number(experience.loginStreak) || 0);
    if (lastLoginDate === getLocalDateKey() || lastLoginDate === getOffsetLocalDateKey(-1)) {
      return streak + 1;
    }
    return 1;
  }
  
  function awardDailyExperience(displayName = getSessionDisplayName()) {
    const today = getLocalDateKey();
    const data = loadExperience(displayName);
    const lastLoginDate = normalizeLoginDateKey(data.lastLoginDate);
    if (lastLoginDate === today) return data;
    const streak = isYesterdayLoginDate(lastLoginDate) ? (Number(data.loginStreak) || 0) + 1 : 1;
    const amount = getDailyLoginReward(streak);
    addTodayExperience(amount);
  
    const next = {
      total: data.total + amount,
      lastLoginDate: today,
      loginStreak: streak,
      gainedToday: true,
    };
    saveExperience(next, displayName);
    return next;
  }
  
  function getExperienceLevel(totalExp) {
    return calculateExperienceLevel(totalExp);
  }
  
  function formatUpgradeDays(days) {
    if (!Number.isFinite(days)) return "已到最高境界";
    if (days <= 0) return "今天就能突破";
    if (days === 1) return "约 1 天";
    return `约 ${days} 天`;
  }
  
  function getUpgradeEta(progress) {
    const dailyExp = getDailyLoginReward(getNextLoginStreak());
    return calculateUpgradeEta(progress, dailyExp);
  }
  
  function getLevelRankProfiles() {
    if (!state.session) return [];
    const currentAvatarUrl =
      getProfileAvatarUrl(state.accountProfile) || loadCachedAvatarUrl(state.session.user.id);
    const ownProfile = {
      user_id: state.session.user.id,
      username: getSessionDisplayName(),
      avatar_url: currentAvatarUrl,
      role: state.familyInfo?.isOwner ? "owner" : state.familyMemberMap.get(state.session.user.id)?.role || "member",
      experience_total: loadExperience().total,
      login_streak: state.accountProfile.loginStreak || loadExperience().loginStreak || 0,
    };
    const profiles = new Map([[ownProfile.user_id, ownProfile]]);
    state.familyMembers.forEach((member) => {
      const cloudProfile = state.familyLevelProfiles.get(member.user_id) || {};
      const mergedProfile = {
        ...member,
        ...cloudProfile,
        avatar_url: cloudProfile.avatar_url || cloudProfile.avatarUrl || member.avatar_url || member.avatarUrl || "",
        avatar_path: cloudProfile.avatar_path || cloudProfile.avatarPath || member.avatar_path || member.avatarPath || "",
      };
      const cachedAvatarUrl = loadCachedAvatarUrl(member.user_id);
      const memberAvatarUrl = getProfileAvatarUrl(mergedProfile) || cachedAvatarUrl;
      profiles.set(member.user_id, {
        ...mergedProfile,
        username: cloudProfile.username || member.username || "家庭成员",
        avatar_url:
          memberAvatarUrl ||
          (member.user_id === state.session.user.id ? ownProfile.avatar_url : ""),
        experience_total: Number(cloudProfile.experience_total) || (member.user_id === state.session.user.id ? ownProfile.experience_total : 0),
        login_streak: Number(cloudProfile.login_streak) || 0,
      });
    });
    return [...profiles.values()]
      .map((profile) => ({
        ...profile,
        progress: getExperienceLevel(profile.experience_total),
      }))
      .sort((a, b) => {
        if (b.experience_total !== a.experience_total) return b.experience_total - a.experience_total;
        return String(a.username || "").localeCompare(String(b.username || ""), "zh-Hans-CN");
      });
  }
  
  async function loadFamilyLevelProfiles() {
    if (!state.cloudDb || !state.session) return;
    const ids = [...new Set([state.session.user.id, ...state.familyMembers.map((member) => member.user_id).filter(Boolean)])];
    const entries = await Promise.all(
      ids.map(async (userId) => {
        const { data, error } = await householdRepository.list("user_profiles", {
          filters: { user_id: userId },
          maybeSingle: true,
        });
        if (error || !data) return null;
        const avatarUrl = getProfileAvatarUrl(data);
        if (avatarUrl) saveCachedAvatarUrl(userId, avatarUrl);
        return [userId, { ...data, avatar_url: avatarUrl }];
      })
    );
    const profileMap = new Map(state.familyMembers.map((member) => [member.user_id, { ...member }]));
    entries.filter(Boolean).forEach(([userId, profile]) => {
      const existing = profileMap.get(userId) || {};
      profileMap.set(userId, {
        ...existing,
        ...profile,
        avatar_url: profile.avatar_url || profile.avatarUrl || existing.avatar_url || existing.avatarUrl || "",
        avatar_path: profile.avatar_path || profile.avatarPath || existing.avatar_path || existing.avatarPath || "",
      });
    });
    state.familyLevelProfiles = profileMap;
  }
  
  function renderLevelLeaderboard() {
    return buildLevelLeaderboardMarkup({
      ranks: getLevelRankProfiles(),
      currentUserId: state.session?.user?.id || "",
      getAvatarUrl: getProfileAvatarUrl,
      getCachedAvatarUrl: loadCachedAvatarUrl,
      getInitial,
    });
  }
  function getCultivationArchive() {
    const archiveData = getArchiveData();
    return buildCultivationArchive({
      ...archiveData,
      currentUserId: state.session?.user?.id || "",
      streak: Math.max(
        0,
        Number(state.accountProfile.loginStreak) || Number(loadExperience().loginStreak) || 0
      ),
    });
  }
  function renderCultivationArchive() {
    const archive = getCultivationArchive();
    const monthLabel = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(new Date());
    return buildCultivationArchiveMarkup(archive, monthLabel);
  }
  function openLevelGuidePage() {
    activeLevelSection = "atlas";
    renderLevelDialog();
  }
  
  function closeLevelGuidePage() {
    activeLevelSection = "ranking";
    renderLevelDialog();
  }
  
  function getRealmMilestoneStorageKey() {
    return `life-vlog-realm-milestones:${state.session?.user?.id || getSessionLoginName() || "guest"}`;
  }
  
  function loadRealmMilestones(experience) {
    let milestones = {};
    try {
      milestones = JSON.parse(localStorage.getItem(getRealmMilestoneStorageKey()) || "{}") || {};
    } catch {
      milestones = {};
    }
    const reachedAt = new Date().toISOString();
    let changed = false;
    CULTIVATION_REALMS.forEach((realm) => {
      if (experience.total >= realm.threshold && !milestones[realm.name]) {
        milestones[realm.name] = reachedAt;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(getRealmMilestoneStorageKey(), JSON.stringify(milestones));
    }
    return milestones;
  }
  
  function formatRealmMilestoneDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }
  
  function scrollLevelAtlasToCurrent() {
    if (activeLevelSection !== "atlas" || !els.levelList) return;
    requestAnimationFrame(() => {
      const scroller = els.levelList.querySelector(".level-section-content");
      const current = scroller?.querySelector(".level-guide-timeline article.active");
      if (!scroller || !current) return;
      const scrollerBox = scroller.getBoundingClientRect();
      const currentBox = current.getBoundingClientRect();
      scroller.scrollTop += currentBox.top - scrollerBox.top - 16;
    });
  }
  
  function renderLevelAtlasPanel(experience, progress) {
    return buildLevelAtlasMarkup({
      experienceTotal: experience.total,
      progress,
      realms: CULTIVATION_REALMS,
      descriptions: CULTIVATION_DESCRIPTIONS,
      milestones: loadRealmMilestones(experience),
      dailyExp: getDailyLoginReward(getNextLoginStreak(experience)),
      formatMilestoneDate: formatRealmMilestoneDate,
      formatUpgradeDays,
      upgradeEta: getUpgradeEta(progress),
    });
  }
  
  function renderExperienceRulesPanel(experience) {
    const nextStreak = getNextLoginStreak(experience);
    return buildExperienceRulesMarkup({
      experience,
      nextStreak,
      streakBonus: getLoginStreakBonusBase(nextStreak),
      todayExperience: loadTodayExperience(),
    });
  }
  
  function renderLevelAchievementPanel() {
    return buildLevelAchievementMarkup(getCultivationArchive().badges);
  }
  
  function getAchievementConditionText(badge) {
    return formatAchievementCondition(badge);
  }
  function openAchievementDetail(badge) {
    if (!badge) return;
    let dialog = document.querySelector("#achievementDetailDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "achievementDetailDialog";
      dialog.className = "achievement-detail-dialog";
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog || event.target.closest("[data-close-achievement-detail]")) dialog.close();
      });
      document.body.append(dialog);
    }
    dialog.innerHTML = buildAchievementDetailMarkup(badge);
    dialog.showModal();
  }
  
  function renderLevelDialog() {
    if (!els.levelDialog) return;
    const experience = loadExperience();
    const progress = getExperienceLevel(experience.total);
    const nextStreak = getNextLoginStreak(experience);
    const dailyExp = getDailyLoginReward(nextStreak);
    els.levelCurrentTitle.textContent = progress.title;
    els.levelCurrentTitle.title = "打开境界图鉴";
    els.levelUpgradeEta.textContent = getUpgradeEta(progress);
    els.levelSummary.textContent = `当前 ${progress.total.toLocaleString()} EXP。连续签到 ${Math.max(0, Number(experience.loginStreak) || 0)} 天，下次登录预计 +${dailyExp} EXP。`;
    const sections = [
      { id: "ranking", label: "家庭排行", icon: "榜" },
      { id: "atlas", label: "境界图鉴", icon: "境" },
      { id: "achievements", label: "成就徽章", icon: "章" },
      { id: "monthly", label: "修行月报", icon: "月" },
      { id: "rules", label: "经验规则", icon: "律" },
    ];
    let content = "";
    if (activeLevelSection === "atlas") {
      content = renderLevelAtlasPanel(experience, progress);
    } else if (activeLevelSection === "achievements") {
      content = renderLevelAchievementPanel();
    } else if (activeLevelSection === "monthly") {
      content = renderCultivationArchive();
    } else if (activeLevelSection === "rules") {
      content = renderExperienceRulesPanel(experience);
    } else {
      content = `<section class="level-rank-panel"><div class="level-rank-head"><div><span>Family Ranking</span><strong>家庭修为榜</strong></div><small>共同记录，各自成长</small></div>${renderLevelLeaderboard()}</section>`;
    }
    els.levelList.innerHTML = buildLevelWorkspaceMarkup({
      sections,
      activeSection: activeLevelSection,
      content,
    });
    els.levelList.querySelectorAll("[data-level-section]").forEach((button) => {
      button.addEventListener("click", () => {
        activeLevelSection = button.dataset.levelSection || "ranking";
        renderLevelDialog();
      });
    });
    els.levelList.querySelectorAll("[data-level-achievement]").forEach((button) => {
      const badges = getCultivationArchive().badges;
      button.addEventListener("click", () => openAchievementDetail(badges.find((badge) => badge.id === button.dataset.levelAchievement)));
    });
    els.levelList.querySelector("[data-open-achievements]")?.addEventListener("click", () => {
      activeLevelSection = "achievements";
      renderLevelDialog();
    });
    scrollLevelAtlasToCurrent();
  }
  
  function renderAchievementDialog() {
    if (!els.achievementGrid) return;
    const badges = getCultivationArchive().badges;
    const unlocked = badges.filter((badge) => badge.unlocked).length;
    const categories = ["全部", "记录", "陪伴", "探索", "料理", "收藏"];
    els.achievementSummary.textContent = `已解锁 ${unlocked} / ${badges.length} · 成就只记录生活，不影响境界强弱。`;
    els.achievementFilters.innerHTML = buildAchievementFilterMarkup(categories, achievementFilter);
    els.achievementGrid.innerHTML = buildAchievementGridMarkup(badges, achievementFilter);
    els.achievementFilters.querySelectorAll("[data-achievement-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        achievementFilter = button.dataset.achievementFilter || "全部";
        renderAchievementDialog();
      });
    });
    els.achievementGrid.querySelectorAll("[data-achievement-id]").forEach((button) => {
      button.addEventListener("click", () => openAchievementDetail(badges.find((badge) => badge.id === button.dataset.achievementId)));
    });
  }
  
  function openAchievementDialog() {
    if (!els.achievementDialog) return;
    achievementFilter = "全部";
    renderAchievementDialog();
    els.achievementDialog.showModal();
  }
  
  async function openLevelDialog() {
    if (!state.session) return;
    await loadFamilyLevelProfiles();
    activeLevelSection = "ranking";
    renderLevelDialog();
    els.levelDialog.showModal();
  }
  
  function getLevelNeed(level) {
    return 80 + level * 20;
  }
  
  function renderExperience(displayName = getSessionDisplayName()) {
    const data = loadExperience(displayName);
    const progress = getExperienceLevel(data.total);
    els.xpLevel.textContent = progress.title;
    els.xpText.textContent = `${progress.current} / ${progress.needed} EXP`;
    els.xpBar.style.width = `${progress.percent}%`;
    const nextStreak = getNextLoginStreak(data);
    const loginExp = getDailyLoginReward(data.lastLoginDate === getLocalDateKey() ? data.loginStreak || 1 : nextStreak);
    const multiplier = getVipExpMultiplier();
    els.xpHint.textContent =
      data.lastLoginDate === getLocalDateKey()
        ? `今日吐纳 +${loginExp} EXP 已领取 · 连续 ${Math.max(1, Number(data.loginStreak) || 1)} 天${multiplier > 1 ? ` · VIP ${multiplier}x` : ""}`
        : `下次吐纳 +${loginExp} EXP · 连续 ${nextStreak} 天`;
    renderTopLevelBadge(progress);
    if (els.levelDialog?.open) renderLevelDialog();
  }
  
  function renderTopLevelBadge(progress = getExperienceLevel(loadExperience().total)) {
    if (!els.vipBadge) return;
    const todayExp = loadTodayExperience();
    const ranks = getLevelRankProfiles();
    const myRank = ranks.findIndex((profile) => profile.user_id === state.session?.user?.id) + 1;
    els.vipBadge.innerHTML = `
      <span>${escapeHtml(progress.title)}</span>
      <small>${myRank ? `第 ${myRank} 名 · ` : ""}今日 +${todayExp} EXP</small>
    `;
    els.vipBadge.title = `当前等级：${progress.title}，今日获得 ${todayExp} EXP`;
  }
  
  async function awardExperience(action, options = {}) {
    if (!state.session) return 0;
    const base = EXPERIENCE_REWARDS[action] || 0;
    if (!base) return 0;
    const amount = getVipAdjustedExperience(base);
    const current = loadExperience();
    const next = {
      ...current,
      total: Math.max(0, Number(current.total) || 0) + amount,
    };
    const todayAmount = addTodayExperience(amount);
    saveExperience(next);
    renderExperience();
    renderOverview();
  
    if (state.cloudSyncAvailable && state.cloudDb) {
      const { error } = await householdRepository.update(
        "user_profiles",
        {
          experience_total: next.total,
          today_experience_date: getLocalDateKey(),
          today_experience_amount: todayAmount,
          updated_at: new Date().toISOString(),
        },
        { user_id: state.session.user.id }
      );
      if (error) {
        console.warn("Experience sync failed:", error);
      }
    }
  
    if (options.statusElement) {
      options.statusElement.textContent = `${options.statusElement.textContent} 修为 +${amount}`;
    }
    return amount;
  }
  
  

  return {
    addTodayExperience,
    awardDailyExperience,
    awardExperience,
    getCurrentImageLimit,
    getDailyLoginReward,
    getExperienceLevel,
    getLoginStreakBonusBase,
    getNextLoginStreak,
    getTodayExperienceStorageKey,
    getUploadQuality,
    getUpgradeEta,
    getVipAdjustedExperience,
    getVipExpMultiplier,
    isVipUser,
    loadExperience,
    loadLocalExperienceAliases,
    loadFamilyLevelProfiles,
    loadRechargeTotal,
    loadTodayExperience,
    openAchievementDialog,
    openLevelDialog,
    openLevelGuidePage,
    rechargeVip,
    renderAchievementDialog,
    renderExperience,
    renderLevelDialog,
    renderTopLevelBadge,
    renderVipCenter,
    saveExperience,
    saveRechargeTotal,
  };
}

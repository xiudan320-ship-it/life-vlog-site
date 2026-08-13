export const DAILY_LOGIN_EXP = 25;

export const EXPERIENCE_REWARDS = Object.freeze({
  diary: 20,
  comment: 5,
  recipe: 14,
  recipeEdit: 3,
  wish: 10,
  wishEdit: 3,
  wishDone: 8,
  weekend: 10,
  weekendEdit: 3,
  anniversary: 8,
  anniversaryEdit: 3,
  thanks: 5,
  thanksEdit: 3,
  diaryEdit: 4,
  wardrobe: 8,
  wardrobeEdit: 2,
  wardrobeWear: 3,
});

export const VIP_EXP_MULTIPLIERS = Object.freeze([1, 1.05, 1.1, 1.2, 1.35, 1.5]);

export const CULTIVATION_REALMS = Object.freeze([
  { name: "炼气期", threshold: 0, next: 600, layers: 13 },
  { name: "筑基期", threshold: 600, next: 1600 },
  { name: "结丹期", threshold: 1600, next: 3200 },
  { name: "元婴期", threshold: 3200, next: 5600 },
  { name: "化神期", threshold: 5600, next: 9000 },
  { name: "炼虚期", threshold: 9000, next: 14000 },
  { name: "合体期", threshold: 14000, next: 20000 },
  { name: "大乘期", threshold: 20000, next: 28000 },
  { name: "真仙境", threshold: 28000, next: 38000 },
  { name: "金仙境", threshold: 38000, next: 50000 },
  { name: "太乙境", threshold: 50000, next: 65000 },
  { name: "大罗境", threshold: 65000, next: 85000 },
  { name: "道祖境", threshold: 85000, next: Infinity },
]);

export const CULTIVATION_DESCRIPTIONS = Object.freeze({
  炼气期: "把第一批普通日子炼成灵气，十三层里每一步都看得见。",
  筑基期: "小窝有了地基，照片、留言和愿望开始彼此认识。",
  结丹期: "回忆结成一颗会发光的金丹，偶尔翻看也能回血。",
  元婴期: "旧日子长出第二条生命，能够在随机回忆里突然来访。",
  化神期: "记录不再是任务，而是你们共同生活的一种语言。",
  炼虚期: "能从一地鸡毛里炼出秩序，也能给快乐留出空位。",
  合体期: "照片、菜谱、心愿、秘藏与留言终于连成同一张地图。",
  大乘期: "四季都有坐标，任何一年都不再只剩模糊印象。",
  真仙境: "飞升不是离开人间，是更懂得珍惜一顿饭和一次散步。",
  金仙境: "收藏拥有重量，家里的小事也值得被认真策展。",
  太乙境: "开始形成只属于这个家的记录审美与秘密暗号。",
  大罗境: "文字、影像与陪伴三位一体，旧日子随时可以重新亮起。",
  道祖境: "大道圆满：你们没有保存所有时间，却保存了真正重要的。",
});

const CHINESE_NUMERALS = Object.freeze([
  "零",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "十一",
  "十二",
  "十三",
]);
const CULTIVATION_PHASES = Object.freeze(["初期", "中期", "后期", "圆满"]);

export function getVipExpMultiplier(level = 0) {
  return VIP_EXP_MULTIPLIERS[Math.max(0, Math.min(5, Number(level) || 0))] || 1;
}

export function getVipAdjustedExperience(base, level = 0) {
  return Math.max(1, Math.round((Number(base) || 0) * getVipExpMultiplier(level)));
}

export function getLoginStreakBonusBase(streak) {
  const days = Math.max(0, Number(streak) || 0);
  if (days < 2) return 0;
  return Math.min(40, Math.floor(days / 2) * 5);
}

export function getDailyLoginReward(streak = 1, level = 0) {
  return getVipAdjustedExperience(DAILY_LOGIN_EXP + getLoginStreakBonusBase(streak), level);
}

export function getExperienceLevel(totalExp) {
  const total = Math.max(0, Number(totalExp) || 0);
  const realmIndex = CULTIVATION_REALMS.findIndex((realm, index) => {
    const next = CULTIVATION_REALMS[index + 1];
    return total >= realm.threshold && (!next || total < next.threshold);
  });
  const realm = CULTIVATION_REALMS[Math.max(0, realmIndex)];
  const nextThreshold = Number.isFinite(realm.next) ? realm.next : Math.max(total, realm.threshold);
  const span = Math.max(1, nextThreshold - realm.threshold);
  const current = Math.min(span, Math.max(0, total - realm.threshold));
  const percent =
    realm.next === Infinity ? 100 : Math.min(100, Math.round((current / span) * 100));
  const layer = realm.layers
    ? Math.min(realm.layers, Math.floor((current / span) * realm.layers) + 1)
    : 0;
  const phase = realm.layers
    ? `${CHINESE_NUMERALS[layer]}层`
    : CULTIVATION_PHASES[
        Math.min(
          CULTIVATION_PHASES.length - 1,
          Math.floor((current / span) * CULTIVATION_PHASES.length)
        )
      ];
  return {
    level: realmIndex + 1,
    realm: realm.name,
    phase,
    title: `${realm.name}${phase ? ` · ${phase}` : ""}`,
    current,
    needed: span,
    percent,
    total,
    nextName: CULTIVATION_REALMS[realmIndex + 1]?.name || "大道圆满",
  };
}

export function formatUpgradeDays(days) {
  if (!Number.isFinite(days)) return "已到最高境界";
  if (days <= 0) return "今天就能突破";
  if (days === 1) return "约 1 天";
  return `约 ${days} 天`;
}

export function getUpgradeEta(progress, dailyExperience) {
  if (!progress || progress.nextName === "大道圆满") {
    return "已到最高境界";
  }
  const remaining = Math.max(0, progress.needed - progress.current);
  const days = Math.ceil(remaining / Math.max(1, Number(dailyExperience) || 1));
  return `${formatUpgradeDays(days)}到 ${progress.nextName}`;
}

import { getVipExpMultiplier } from "./gamification-domain.js";
import { escapeHtml } from "./ui-formatters.js";

export const VIP_LEVELS = [
  {
    level: 1,
    name: "小窝",
    label: "小窝会员",
    price: 9,
    limit: 3,
    perks: ["修炼经验 +5%", "专属 VIP 标识", "一篇笔记最多 3 张图"],
  },
  {
    level: 2,
    name: "同行",
    label: "同行会员",
    price: 29,
    limit: 6,
    perks: ["修炼经验 +10%", "合集九宫格封面", "一篇笔记最多 6 张图"],
  },
  {
    level: 3,
    name: "珍藏",
    label: "珍藏会员",
    price: 68,
    limit: 9,
    perks: ["修炼经验 +20%", "高质压缩上传", "9 图完整宫格"],
  },
  {
    level: 4,
    name: "星河",
    label: "星河会员",
    price: 128,
    limit: 12,
    perks: ["修炼经验 +35%", "私密内容共享", "一篇笔记最多 12 张图"],
  },
  {
    level: 5,
    name: "传说",
    label: "传说会员",
    price: 298,
    limit: 18,
    perks: ["修炼经验 +50%", "黑金导演模式", "一篇笔记最多 18 张图"],
  },
];

export function getVipLevel(level) {
  return VIP_LEVELS.find((item) => item.level === level) || VIP_LEVELS[0];
}

export function getVipLevelByRecharge(amount) {
  return [...VIP_LEVELS]
    .reverse()
    .find((level) => amount >= level.price) || null;
}

export function formatMoney(value) {
  return `¥${Math.max(0, Math.round(Number(value) || 0))}`;
}

export function renderVipCenterView({
  elements,
  signedIn = false,
  displayName = "",
  rechargeTotal = 0,
  cloudSyncAvailable = false,
  onTopUp,
  onRecharge,
}) {
  const currentLevel = getVipLevelByRecharge(rechargeTotal);
  const nextLevel = VIP_LEVELS.find((level) => rechargeTotal < level.price);
  elements.currentLevel.textContent = currentLevel ? `LV.${currentLevel.level}` : "FREE";
  elements.currentName.textContent = currentLevel?.name || "Visitor";
  elements.rechargeTotal.textContent = formatMoney(rechargeTotal);
  elements.tierAmount.textContent = currentLevel ? formatMoney(currentLevel.price) : "¥0";
  elements.summary.textContent = signedIn
    ? `${displayName} 累计充值 ${formatMoney(rechargeTotal)}，${currentLevel ? `当前为 ${currentLevel.label}，修炼经验 ${getVipExpMultiplier(currentLevel.level)}x` : "还未开通 VIP"}。`
    : "登录后可充值激活 5 个 VIP 档位。";
  elements.next.innerHTML = nextLevel
    ? `<strong>下一档 ${nextLevel.label}</strong><span>还差 ${formatMoney(nextLevel.price - rechargeTotal)}</span>`
    : `<strong>已解锁最高档</strong><span>传说档位已满级</span>`;

  elements.levels.innerHTML = VIP_LEVELS.map((level) => {
    const unlocked = rechargeTotal >= level.price;
    const active = currentLevel?.level === level.level;
    const diff = Math.max(0, level.price - rechargeTotal);
    return `
      <article class="vip-level ${active ? "active" : ""} ${unlocked ? "unlocked" : ""}">
        <span>LV.${level.level}</span>
        <strong>${escapeHtml(level.name)}</strong>
        <p>${escapeHtml(level.label)} · 累计 ${formatMoney(level.price)}</p>
        <small>最多 ${level.limit} 张/篇 · 经验 ${getVipExpMultiplier(level.level)}x</small>
        <button type="button" data-top-up-level="${level.level}" ${!signedIn || active || unlocked ? "disabled" : ""}>
          ${active ? "当前档位" : unlocked ? "已解锁" : `补 ${formatMoney(diff)}`}
        </button>
      </article>
    `;
  }).join("");

  elements.recharge.innerHTML = VIP_LEVELS
    .map((level) => ({ level, amount: Math.max(0, level.price - rechargeTotal) || level.price }))
    .map(
      ({ level, amount }) => `
        <button type="button" data-recharge-amount="${amount}">
          <span>${level.label}</span>
          <strong>${formatMoney(amount)}</strong>
        </button>
      `
    )
    .join("");

  elements.perks.innerHTML = (currentLevel || VIP_LEVELS[0]).perks
    .map((perk) => `<span>${escapeHtml(perk)}</span>`)
    .join("");
  elements.status.textContent = signedIn
    ? cloudSyncAvailable
      ? "这是模拟充值，不会真实扣款；会员档位已同步到你的云端账户。"
      : "这是模拟充值，不会真实扣款；数据库初始化前暂存于当前浏览器。"
    : "请先登录再使用充值档位。";

  elements.levels.querySelectorAll("button[data-top-up-level]").forEach((button) => {
    button.addEventListener("click", () => onTopUp(Number(button.dataset.topUpLevel)));
  });
  elements.recharge.querySelectorAll("button[data-recharge-amount]").forEach((button) => {
    button.addEventListener("click", () => onRecharge(Number(button.dataset.rechargeAmount)));
  });
  return currentLevel;
}

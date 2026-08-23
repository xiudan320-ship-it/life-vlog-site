import { escapeHtml, formatDate } from "./ui-formatters.js";

export function parseLocalDay(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOfDay(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function differenceInDays(later, earlier) {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 86_400_000));
}

export function getCalendarAge(startDate, today) {
  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();
  let days = today.getDate() - startDate.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  };
}

export function getAnniversaryMetrics(item, now = new Date()) {
  const start = parseLocalDay(item.date);
  if (!start) {
    return {
      pending: true,
      value: "设置日期",
      unit: "",
      detail: "点击编辑，填写这个重要日子的开始日期。",
    };
  }

  const today = startOfDay(now);
  if (item.type === "pet") {
    const age = getCalendarAge(start, today);
    return {
      value: age.years,
      unit: "岁",
      detail: `生日 ${formatDate(item.date)} · ${age.months} 个月 ${age.days} 天 · 已来到世界 ${differenceInDays(today, start)} 天`,
    };
  }

  const totalDays = differenceInDays(today, start);
  if (item.type === "together") {
    return {
      value: totalDays,
      unit: "天",
      detail: `从 ${formatDate(item.date)} 开始，一起走过的每一天。`,
    };
  }

  let next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
  const countdown = differenceInDays(next, today);
  return {
    value: countdown,
    unit: countdown === 0 ? "就是今天" : "天后",
    detail: `已经过去 ${totalDays} 天 · 下一次是 ${formatDate(next)}`,
  };
}

export function getAnniversaryTypeLabel(type) {
  if (type === "pet") return "宠物生日";
  if (type === "together") return "相伴天数";
  return "纪念日倒计时";
}

function renderAnniversaryCards(items, { getAuthorName, canManageItem }) {
  return items
    .map((item, index) => {
      const metrics = getAnniversaryMetrics(item);
      const canManage = canManageItem(item);
      return `
        <article class="anniversary-card ${metrics.pending ? "pending" : ""}">
          <div class="anniversary-card-head">
            <span class="anniversary-card-index">${getAnniversaryTypeLabel(item.type)} · ${String(index + 1).padStart(2, "0")} · ${escapeHtml(getAuthorName(item.userId))}</span>
            ${canManage ? `<div class="anniversary-card-actions">
              <button type="button" data-edit-anniversary="${escapeHtml(item.id)}">编辑</button>
              <button type="button" data-delete-anniversary="${escapeHtml(item.id)}">删除</button>
            </div>` : ""}
          </div>
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p class="anniversary-value">
              <strong>${escapeHtml(metrics.value)}</strong>
              ${metrics.unit ? `<span>${escapeHtml(metrics.unit)}</span>` : ""}
            </p>
          </div>
          <p class="anniversary-detail">${escapeHtml(item.note || metrics.detail)}</p>
          ${item.note ? `<p class="anniversary-detail">${escapeHtml(metrics.detail)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

export function renderAnniversariesView({
  listElement,
  peekElement,
  items = [],
  signedIn = false,
  getAuthorName,
  canManageItem,
  onEdit,
  onDelete,
}) {
  if (!listElement) return;
  if (!signedIn) {
    listElement.innerHTML = "";
    if (peekElement) peekElement.textContent = "设置重要日子";
    return;
  }

  listElement.innerHTML = renderAnniversaryCards(items, { getAuthorName, canManageItem });
  listElement.querySelectorAll("[data-edit-anniversary]").forEach((button) => {
    button.addEventListener("click", () => onEdit(button.dataset.editAnniversary));
  });
  listElement.querySelectorAll("[data-delete-anniversary]").forEach((button) => {
    button.addEventListener("click", () => onDelete(button.dataset.deleteAnniversary));
  });

  const relationship =
    items.find((item) => item.type === "together" && item.date) ||
    items.find((item) => item.date);
  if (!peekElement) return;
  if (!relationship) {
    peekElement.textContent = "设置重要日子";
    return;
  }
  const metrics = getAnniversaryMetrics(relationship);
  peekElement.textContent = `${relationship.title} ${metrics.value}${metrics.unit}`;
}

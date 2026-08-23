import { bindWeekendGalleryInteractions } from "./weekend-gallery.js";
import { escapeHtml, formatCommentTime } from "./ui-formatters.js";

export function sortWeekendPlans(plans = []) {
  return [...plans].sort(
    (a, b) => Number(a.done) - Number(b.done) || new Date(a.date) - new Date(b.date)
  );
}

function formatWeekendDate(value) {
  const date = new Date(value);
  return {
    month: new Intl.DateTimeFormat("zh-CN", { month: "short" }).format(date),
    day: new Intl.DateTimeFormat("zh-CN", { day: "2-digit" }).format(date),
    weekday: new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date),
  };
}

function renderScenes(plan, images, kind = "plan") {
  if (!images?.length) return "";
  const isCompletion = kind === "completion";
  return `<div class="weekend-scenes${isCompletion ? " weekend-recap-scenes" : ""}">${images
    .map(
      (image, imageIndex) => `<button type="button" data-weekend-gallery="${escapeHtml(plan.id)}"${isCompletion ? ` data-weekend-gallery-kind="completion"` : ""} data-weekend-image="${imageIndex}" aria-label="查看第 ${imageIndex + 1} 张${isCompletion ? "回顾照片" : "场景"}"><img src="${escapeHtml(image.thumbnail_url || image.image_url)}" alt="${escapeHtml(plan.title)}${isCompletion ? "回顾" : "场景"} ${imageIndex + 1}" loading="lazy" decoding="async" /></button>`
    )
    .join("")}</div>`;
}

function renderWeekendCards(plans, { getAuthorName, canManageItem }) {
  return plans
    .map((plan, index) => {
      const canManage = canManageItem(plan);
      const date = formatWeekendDate(plan.date);
      return `
        <article class="weekend-card ${plan.done ? "done" : ""}">
          ${plan.done ? `<span class="weekend-complete-mark">完成</span>` : ""}
          <div class="weekend-date">
            <span>${date.month}</span>
            <strong>${date.day}</strong>
            <small>${date.weekday}</small>
          </div>
          <div class="weekend-card-body">
            <p class="kicker">${escapeHtml(plan.type)} · PLAN ${String(index + 1).padStart(2, "0")} · ${escapeHtml(getAuthorName(plan.userId))}</p>
            <h3>${escapeHtml(plan.title)}</h3>
            ${plan.location ? `<p class="weekend-location">地点：${escapeHtml(plan.location)}</p>` : ""}
            ${plan.note ? `<p>${escapeHtml(plan.note)}</p>` : ""}
            ${renderScenes(plan, plan.images)}
            ${plan.done && (plan.completionNote || plan.completionImages?.length) ? `
              <section class="weekend-recap">
                <header><span>完成回顾</span>${plan.completedAt ? `<time>${escapeHtml(formatCommentTime(plan.completedAt))}</time>` : ""}</header>
                ${plan.completionNote ? `<p>${escapeHtml(plan.completionNote)}</p>` : ""}
                ${renderScenes(plan, plan.completionImages, "completion")}
              </section>
            ` : ""}
            ${canManage ? `<div class="weekend-card-actions">
              <button type="button" data-edit-weekend="${escapeHtml(plan.id)}">编辑</button>
              <button type="button" data-toggle-weekend="${escapeHtml(plan.id)}">
                ${plan.done ? "重新计划" : "完成"}
              </button>
              ${plan.done ? `<button type="button" data-recap-weekend="${escapeHtml(plan.id)}">${plan.completionNote || plan.completionImages?.length ? "编辑回顾" : "补充回顾"}</button>` : ""}
              <button type="button" data-delete-weekend="${escapeHtml(plan.id)}">删除</button>
            </div>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderWeekendPlansView({
  listElement,
  plans = [],
  signedIn = false,
  getAuthorName,
  canManageItem,
  onEdit,
  onToggle,
  onDelete,
  onRecap,
  onOpenGallery,
}) {
  if (!listElement) return;
  if (!signedIn) {
    listElement.innerHTML = `<div class="empty">登录后可以安排周末去哪、吃什么和做什么。</div>`;
    return;
  }
  if (!plans.length) {
    listElement.innerHTML = `<div class="empty">这个周末还没有安排。给自己留一个值得期待的计划。</div>`;
    return;
  }

  const sorted = sortWeekendPlans(plans);
  listElement.innerHTML = renderWeekendCards(sorted, { getAuthorName, canManageItem });
  listElement.querySelectorAll("[data-edit-weekend]").forEach((button) => {
    button.addEventListener("click", () => onEdit(button.dataset.editWeekend));
  });
  listElement.querySelectorAll("[data-toggle-weekend]").forEach((button) => {
    button.addEventListener("click", () => onToggle(button.dataset.toggleWeekend));
  });
  listElement.querySelectorAll("[data-delete-weekend]").forEach((button) => {
    button.addEventListener("click", () => onDelete(button.dataset.deleteWeekend));
  });
  listElement.querySelectorAll("[data-recap-weekend]").forEach((button) => {
    button.addEventListener("click", () => onRecap(plans.find((plan) => plan.id === button.dataset.recapWeekend)));
  });
  bindWeekendGalleryInteractions(listElement, {
    getPlan: (id) => plans.find((plan) => plan.id === id),
    openGallery: onOpenGallery,
  });
}

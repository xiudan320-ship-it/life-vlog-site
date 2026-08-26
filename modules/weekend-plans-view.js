import { bindWeekendGalleryInteractions } from "./weekend-gallery.js?v=20260824-030";
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
      const stateText = plan.done ? "已完成" : "待完成";
      return `
        <article class="weekend-card${plan.done ? " done" : ""}" data-weekend-id="${escapeHtml(plan.id)}" aria-label="${escapeHtml(plan.title || "未命名周末计划")}，${stateText}">
          <div class="weekend-card-main">
            <div class="weekend-date" aria-label="${escapeHtml(`${date.month}${date.day} ${date.weekday}`)}">
              <span>${date.month}</span>
              <strong>${date.day.replace("日", "")}</strong>
              <small>${date.weekday}</small>
            </div>
            <div class="weekend-card-body">
              <div class="weekend-card-kicker-row">
                <p class="kicker">${escapeHtml(plan.type || "周末计划")} · PLAN ${String(index + 1).padStart(2, "0")} · ${escapeHtml(getAuthorName(plan.userId))}</p>
                <span class="weekend-state-pill ${plan.done ? "done" : "open"}">${stateText}</span>
              </div>
              <h3>${escapeHtml(plan.title || "未命名周末计划")}</h3>
              <div class="weekend-card-details">
                ${plan.location ? `<p class="weekend-location">${escapeHtml(plan.location)}</p>` : ""}
                ${plan.note ? `<p class="weekend-note">${escapeHtml(plan.note)}</p>` : ""}
                ${renderScenes(plan, plan.images)}
                ${plan.done && (plan.completionNote || plan.completionImages?.length) ? `
                  <section class="weekend-recap">
                    <header><span>完成回顾</span>${plan.completedAt ? `<time>${escapeHtml(formatCommentTime(plan.completedAt))}</time>` : ""}</header>
                    ${plan.completionNote ? `<p>${escapeHtml(plan.completionNote)}</p>` : ""}
                    ${renderScenes(plan, plan.completionImages, "completion")}
                  </section>
                ` : ""}
              </div>
              ${canManage ? `<div class="weekend-card-actions">
                <button type="button" data-edit-weekend="${escapeHtml(plan.id)}">编辑</button>
                ${plan.done ? `<button type="button" data-recap-weekend="${escapeHtml(plan.id)}">${plan.completionNote || plan.completionImages?.length ? "编辑回顾" : "补充回顾"}</button>` : ""}
                <button type="button" data-delete-weekend="${escapeHtml(plan.id)}">删除</button>
              </div>` : ""}
            </div>
            ${canManage ? `<div class="weekend-card-tools">
              <button class="weekend-check-button${plan.done ? " is-complete" : ""}" type="button" data-toggle-weekend="${escapeHtml(plan.id)}" aria-label="${plan.done ? "取消完成" : "标记完成"}" aria-pressed="${String(Boolean(plan.done))}"><span aria-hidden="true">✓</span></button>
            </div>` : ""}
          </div>
          ${plan.done ? `<span class="weekend-complete-mark" aria-hidden="true">已完成</span>` : ""}
        </article>
      `;
    })
    .join("");
}

export function renderWeekendPlansView({
  listElement,
  summaryElement,
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
  const doneCount = plans.filter((plan) => plan.done).length;
  if (summaryElement) summaryElement.textContent = `${plans.length} 个计划 · ${doneCount} 个已完成`;
  if (!signedIn) {
    listElement.innerHTML = `<div class="weekend-empty"><span class="weekend-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M7 2v4M17 2v4M3 9h18M8 13h3M8 17h5" /></svg></span><strong>登录后可以安排周末去哪、吃什么和做什么。</strong></div>`;
    return;
  }
  if (!plans.length) {
    listElement.innerHTML = `<div class="weekend-empty"><span class="weekend-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M7 2v4M17 2v4M3 9h18M8 13h3M8 17h5" /></svg></span><strong>这个周末还没有安排。给自己留一个值得期待的计划。</strong></div>`;
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

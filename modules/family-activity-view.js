import { escapeHtml, formatCommentTime } from "./ui-formatters.js";

export function buildWeeklyReviewMarkup({
  summary = "",
  leadingMember = null,
  photoCount = 0,
  interactionCount = 0,
  completedWishCount = 0,
  weekendCount = 0,
  activity = [],
  getAuthorName,
}) {
  return `
    <section class="weekly-review-intro">
      <span>${activity.length ? "本周共同记录" : "等待第一条记录"}</span>
      <strong>${escapeHtml(summary)}</strong>
      ${leadingMember ? `<small>本周记录最活跃：${escapeHtml(getAuthorName(leadingMember[0]))} · ${leadingMember[1]} 次</small>` : ""}
    </section>
    <section class="weekly-review-stats">
      <article><strong>${photoCount}</strong><span>篇日记</span></article>
      <article><strong>${interactionCount}</strong><span>次交流</span></article>
      <article><strong>${completedWishCount}</strong><span>心愿达成</span></article>
      <article><strong>${weekendCount}</strong><span>周末足迹</span></article>
    </section>
    <section class="weekly-review-stream">
      <header><strong>这一周发生了什么</strong><span>${activity.length} 条共同动态</span></header>
      ${activity.slice(0, 30).map((item) => `
        <button type="button" ${item.photoId ? `data-weekly-photo="${escapeHtml(item.photoId)}"` : ""}>
          <i>${escapeHtml(item.type.slice(0, 1))}</i>
          <span><small>${escapeHtml(item.type)} · ${escapeHtml(getAuthorName(item.userId))}</small><strong>${escapeHtml(item.title || "未命名")}</strong></span>
          <time>${formatCommentTime(item.date)}</time>
        </button>`).join("") || '<p class="settings-empty">本周还没有动态，下周回顾会从第一条记录开始。</p>'}
    </section>`;
}

export function buildFamilyMemoryMarkup({
  monthPhotoCount = 0,
  monthWishCount = 0,
  monthMessageCount = 0,
  photos = [],
  getImage,
  getLabel,
}) {
  return `
    <section class="family-recap-stats">
      <article><strong>${monthPhotoCount}</strong><span>本月日记</span></article>
      <article><strong>${monthWishCount}</strong><span>完成心愿</span></article>
      <article><strong>${monthMessageCount}</strong><span>本月留言</span></article>
    </section>
    <div class="family-timeline-title"><strong>往年今日</strong><span>${photos.length ? `${photos.length} 篇回忆` : "今天还没有往年回忆"}</span></div>
    <section class="family-memory-grid">${photos.map((photo) => {
      const image = getImage(photo);
      return `<button type="button" data-timeline-photo="${escapeHtml(photo.id)}">${image ? `<img src="${escapeHtml(image.thumbnail_url || image.image_url)}" alt="" loading="lazy" decoding="async" />` : ""}<span>${escapeHtml(getLabel(photo))}</span><small>${new Date(photo.created_at).getFullYear()} 年</small></button>`;
    }).join("") || '<p class="settings-empty">日子继续积累，明年的今天这里就会有故事。</p>'}</section>`;
}

export function buildFamilyTimelineMarkup(entries = [], getAuthorName) {
  return `<section class="family-activity-list">${entries.map((item) => `
    <button type="button" ${item.photoId ? `data-timeline-photo="${escapeHtml(item.photoId)}"` : ""}>
      <i>${escapeHtml(item.type.slice(0, 1))}</i>
      <span><small>${escapeHtml(item.type)} · ${escapeHtml(getAuthorName(item.userId))}</small><strong>${escapeHtml(item.title || "未命名")}</strong><em>${escapeHtml(item.detail || "")}</em></span>
      <time>${formatCommentTime(item.date)}</time>
    </button>
  `).join("") || '<p class="settings-empty">还没有家庭动态。</p>'}</section>`;
}

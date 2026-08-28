import {
  getDiaryMediaPosterUrl,
  getDiaryMediaType,
  getDiaryMediaVideoUrl,
} from "./media-metadata.js";
import { escapeHtml, formatCommentTime, formatDateTime } from "./ui-formatters.js";
import { renderListIcon } from "./list-icons.js";

export function createMobileDiaryPage({ documentRef = document, handlers }) {
  const page = documentRef.createElement("section");
  page.className = "mobile-diary-page";
  page.hidden = true;
  page.addEventListener("click", (event) => {
    if (event.target.closest("[data-mobile-diary-close]")) return handlers.close();
    const imageButton = event.target.closest("[data-mobile-diary-image]");
    if (imageButton) return handlers.selectImage(Number(imageButton.dataset.mobileDiaryImage) || 0);
    if (event.target.closest("[data-mobile-diary-open-image]")) return handlers.openImage();
    const replyButton = event.target.closest("[data-mobile-diary-reply]");
    if (replyButton) return handlers.reply(replyButton.dataset.mobileDiaryReply);
    const deleteCommentButton = event.target.closest("[data-mobile-diary-delete-comment]");
    if (deleteCommentButton) return handlers.deleteComment(deleteCommentButton.dataset.mobileDiaryDeleteComment);
    if (event.target.closest("[data-mobile-diary-cancel-reply]")) return handlers.cancelReply();
    const favoriteButton = event.target.closest("[data-mobile-diary-favorite]");
    if (favoriteButton) return handlers.favorite(favoriteButton);
    if (event.target.closest("[data-mobile-diary-edit]")) return handlers.edit();
    if (event.target.closest("[data-mobile-diary-admin-category]")) return handlers.adminCategory();
    if (event.target.closest("[data-mobile-diary-admin-unpin]")) return handlers.adminUnpin();
    if (event.target.closest("[data-mobile-diary-delete]")) handlers.deleteDiary();
  });
  page.addEventListener("submit", (event) => {
    if (event.target.matches("[data-mobile-diary-comment-form]")) handlers.submitComment(event);
  });
  page.addEventListener("input", (event) => {
    const input = event.target.closest?.("[data-mobile-diary-comment-input]");
    if (!input) return;
    handlers.changeCommentDraft?.(input.value);
    resizeMobileDiaryCommentInput(input);
  });
  page.addEventListener("keydown", (event) => {
    const input = event.target.closest?.("[data-mobile-diary-comment-input]");
    if (!input || event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    handlers.submitComment(event);
  });
  page.addEventListener("pointerdown", handlers.beginBackSwipe, { passive: true });
  page.addEventListener("pointermove", handlers.moveBackSwipe, { passive: false });
  page.addEventListener("pointerup", handlers.endBackSwipe, { passive: true });
  page.addEventListener("pointerdown", handlers.beginImageSwipe, { passive: true });
  page.addEventListener("pointermove", handlers.moveImageSwipe, { passive: true });
  page.addEventListener("pointerup", handlers.endImageSwipe, { passive: true });
  page.addEventListener("pointercancel", () => {
    handlers.cancelBackSwipe();
    handlers.cancelImageSwipe();
  });
  documentRef.body.append(page);
  return page;
}

export function resizeMobileDiaryCommentInput(input) {
  if (!input) return;
  const maxHeight = 220;
  input.style.height = "auto";
  const nextHeight = Math.min(Math.max(input.scrollHeight || 0, 92), maxHeight);
  input.style.height = `${nextHeight}px`;
  input.style.overflowY = (input.scrollHeight || 0) > maxHeight ? "auto" : "hidden";
}

export function renderMobileDiaryCommentTree({
  comments = [],
  photoOwnerId = "",
  currentUserId = "",
  getAuthorName,
  renderAvatar,
}) {
  if (!comments.length) return `<p class="photo-comments-empty">还没有留言。</p>`;
  const byParent = new Map();
  comments.forEach((comment) => {
    const parentId = comment.parent_id || "root";
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(comment);
  });
  const renderBranch = (parentId = "root", depth = 0) =>
    (byParent.get(parentId) || []).map((comment) => {
      const replyTarget = comment.parent_id
        ? comments.find((item) => item.id === comment.parent_id)
        : null;
      return `
        <div class="photo-comment-thread" style="--comment-depth:${Math.min(depth, 3)}">
          <article class="photo-comment">
            ${renderAvatar(comment.user_id)}
            <div class="photo-comment-main">
              <header>
                <span class="photo-comment-author-line">
                  <strong>${escapeHtml(getAuthorName(comment.user_id))}</strong>
                  ${comment.user_id === photoOwnerId ? `<small class="photo-comment-author-badge">作者</small>` : ""}
                </span>
              </header>
              ${replyTarget ? `<small class="reply-target">回复 ${escapeHtml(getAuthorName(replyTarget.user_id))}</small>` : ""}
              <p>${escapeHtml(comment.body)}</p>
              <time>${formatCommentTime(comment.created_at)}</time>
              <div class="photo-comment-actions">
                <button type="button" data-mobile-diary-reply="${escapeHtml(comment.id)}">回复</button>
                ${comment.user_id === currentUserId ? `<button type="button" data-mobile-diary-delete-comment="${escapeHtml(comment.id)}">删除</button>` : ""}
              </div>
            </div>
          </article>
          ${renderBranch(comment.id, depth + 1)}
        </div>
      `;
    }).join("");
  return renderBranch();
}

export function buildMobileDiaryPageMarkup({
  photo,
  images = [],
  imageIndex = 0,
  comments = [],
  signedIn = false,
  currentUserId = "",
  canComment = false,
  admin = false,
  favorite = false,
  getDisplayTitle,
  getPlainNote,
  getAuthorName,
  renderAvatar,
}) {
  const image = images[imageIndex] || images[0] || {};
  const mediaType = getDiaryMediaType(image);
  const displayTitle = getDisplayTitle(photo);
  const canManage = Boolean(signedIn && photo.user_id === currentUserId);
  const canAdminCategorize = Boolean(signedIn && admin && photo.user_id && photo.user_id !== currentUserId);
  const canAdminUnpin = Boolean(signedIn && admin && photo.is_pinned);
  const commentTree = renderMobileDiaryCommentTree({
    comments,
    photoOwnerId: photo.user_id,
    currentUserId,
    getAuthorName,
    renderAvatar,
  });
  return `
    <button class="mobile-diary-close" type="button" data-mobile-diary-close aria-label="返回">返回</button>
    <div class="mobile-diary-media">
      ${mediaType === "video"
        ? `<video class="mobile-diary-video" src="${escapeHtml(getDiaryMediaVideoUrl(image))}" poster="${escapeHtml(getDiaryMediaPosterUrl(image))}" controls playsinline preload="metadata" aria-label="${escapeHtml(displayTitle || "VLOG 视频")}"></video>
          <div class="media-load-status mobile-diary-video-status" data-mobile-diary-video-status role="status" aria-live="polite" hidden>
            <span data-media-status-text></span>
            <button type="button" data-media-retry hidden>重试</button>
          </div>`
        : `<button class="mobile-diary-image-button" type="button" data-mobile-diary-open-image aria-label="放大查看日记图片">
            ${mediaType === "live"
              ? `<video class="mobile-diary-motion" src="${escapeHtml(getDiaryMediaVideoUrl(image))}" poster="${escapeHtml(getDiaryMediaPosterUrl(image))}" autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(displayTitle || "Live Photo")}"></video>`
              : `<img src="${escapeHtml(getDiaryMediaPosterUrl(image))}" alt="${escapeHtml(displayTitle || "日记图片")}" />`}
          </button>`}
      ${images.length === 1 && mediaType !== "image"
        ? `<span class="live-photo-badge mobile-diary-media-badge" aria-label="${mediaType === "live" ? "Live Photo" : "Video"}">${mediaType === "live" ? "LIVE" : "VIDEO"}</span>`
        : ""}
      ${images.length > 1 && mediaType !== "image" ? '<i class="multi-motion-dot" aria-label="动态媒体"></i>' : ""}
      ${images.length > 1 ? `<span class="mobile-diary-count">${imageIndex + 1} / ${images.length}</span>` : ""}
    </div>
    ${images.length > 1 ? `<div class="mobile-diary-thumbs">
      ${images.map((thumb, index) => `
        <button class="${index === imageIndex ? "active" : ""}" type="button" data-mobile-diary-image="${index}">
          <img src="${escapeHtml(thumb.image_url)}" alt="" />
        </button>
      `).join("")}
    </div>` : ""}
    <article class="mobile-diary-article">
      <p class="kicker mobile-diary-meta">
        <span>${escapeHtml(photo.category || "日常")} · ${formatDateTime(photo.created_at)}</span>
        <span class="diary-card-author">
          ${renderAvatar(photo.user_id, "diary-card-author-avatar")}
          <span>${escapeHtml(getAuthorName(photo.user_id))}</span>
        </span>
      </p>
      ${displayTitle ? `<h1>${escapeHtml(displayTitle)}</h1>` : ""}
      ${getPlainNote(photo) ? `<p class="mobile-diary-note">${escapeHtml(getPlainNote(photo))}</p>` : ""}
      ${signedIn ? `<div class="mobile-diary-actions" aria-label="日记操作">
        <button class="mobile-diary-action ${favorite ? "is-active" : ""}" type="button" data-mobile-diary-favorite aria-pressed="${favorite}">
          <span class="mobile-diary-action-mark" aria-hidden="true">${renderListIcon("heart")}</span>
          <span>${favorite ? "已收藏" : "收藏"}</span>
        </button>
        ${canManage ? `<button class="mobile-diary-action" type="button" data-mobile-diary-edit><span class="mobile-diary-action-mark" aria-hidden="true">${renderListIcon("edit")}</span><span>编辑</span></button>` : ""}
        ${canAdminCategorize ? `<button class="mobile-diary-action" type="button" data-mobile-diary-admin-category><span class="mobile-diary-action-mark" aria-hidden="true">${renderListIcon("settings")}</span><span>分类</span></button>` : ""}
        ${canAdminUnpin ? `<button class="mobile-diary-action" type="button" data-mobile-diary-admin-unpin><span class="mobile-diary-action-mark" aria-hidden="true">${renderListIcon("pin")}</span><span>取消置顶</span></button>` : ""}
        ${canManage ? `<button class="mobile-diary-action danger" type="button" data-mobile-diary-delete><span class="mobile-diary-action-mark" aria-hidden="true">${renderListIcon("trash")}</span><span>删除</span></button>` : ""}
      </div>` : ""}
    </article>
    <section class="mobile-diary-comments">
      <div class="photo-comments-head">
        <p class="kicker">Family Comments</p>
        <h3>共 ${comments.length} 条评论</h3>
      </div>
      <div class="photo-comments-list" data-mobile-diary-comments>${commentTree}</div>
      ${canComment ? `<form data-mobile-diary-comment-form>
        <div class="comment-replying" data-mobile-diary-replying hidden>
          <span data-mobile-diary-replying-text></span>
          <button type="button" data-mobile-diary-cancel-reply aria-label="取消回复">${renderListIcon("close", "ui-icon-inline")}</button>
        </div>
        <label class="sr-only" for="mobileDiaryCommentInput">留言或回复</label>
        <textarea id="mobileDiaryCommentInput" data-mobile-diary-comment-input rows="3" maxlength="300" required aria-describedby="mobileDiaryCommentStatus" placeholder="给这篇日记留句话"></textarea>
        <button type="submit" data-mobile-diary-comment-submit>发送</button>
        <p class="status-line" id="mobileDiaryCommentStatus" data-mobile-diary-comment-status role="status" aria-live="polite"></p>
      </form>` : ""}
    </section>
  `;
}

export function refreshMobileDiaryComments({
  page,
  comments = [],
  replyToId = null,
  photoOwnerId = "",
  currentUserId = "",
  getAuthorName,
  renderAvatar,
}) {
  if (!page || page.hidden) return;
  const list = page.querySelector("[data-mobile-diary-comments]");
  if (list) {
    list.innerHTML = renderMobileDiaryCommentTree({
      comments,
      photoOwnerId,
      currentUserId,
      getAuthorName,
      renderAvatar,
    });
  }
  const heading = page.querySelector(".photo-comments-head h3");
  if (heading) heading.textContent = `共 ${comments.length} 条评论`;
  const replyBar = page.querySelector("[data-mobile-diary-replying]");
  const replyText = page.querySelector("[data-mobile-diary-replying-text]");
  const input = page.querySelector("[data-mobile-diary-comment-input]");
  const replyComment = comments.find((item) => item.id === replyToId);
  if (replyBar) replyBar.hidden = !replyComment;
  if (replyText) replyText.textContent = replyComment ? `正在回复 ${getAuthorName(replyComment.user_id)}` : "";
  if (input) input.placeholder = replyComment ? `回复 ${getAuthorName(replyComment.user_id)}` : "给这篇日记留句话";
  resizeMobileDiaryCommentInput(input);
}

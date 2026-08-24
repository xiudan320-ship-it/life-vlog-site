import { buildNotificationText } from "./notification-domain.js";
import { renderNotificationsView } from "./notification-view.js";
import { escapeHtml, formatCommentTime } from "./ui-formatters.js";

export function createSocialController({
  elements,
  state,
  notificationRepository,
  diaryRepository,
  getProfileAvatarUrl,
  loadCachedAvatarUrl,
  isMissingCloudSchema,
  savePhotoFeedCache,
  renderGallery,
  switchPage,
  openPhoto,
  showMiniToast,
  renderMobileDiaryComments,
  getAuthorName,
  renderAvatarMarkup,
  loadPhotoCommentPreviews,
  awardExperience,
}) {
  const els = elements;

  async function syncAppIconBadge(count = 0) {
    const nextCount = Math.max(0, Number(count) || 0);
    if (nextCount === state.lastAppBadgeCount) return;
    if (!("setAppBadge" in navigator) && !("clearAppBadge" in navigator)) return;
    state.lastAppBadgeCount = nextCount;
  
    try {
      if (nextCount > 0 && navigator.setAppBadge) {
        await navigator.setAppBadge(nextCount);
      } else if (navigator.clearAppBadge) {
        await navigator.clearAppBadge();
      } else if (navigator.setAppBadge) {
        await navigator.setAppBadge(0);
      }
    } catch {}
  }
  
  function getNotificationText(item) {
    return buildNotificationText(item, getNotificationActorName(item));
  }
  
  function getNotificationActorName(item) {
    const fromFamily = item?.actor_id ? state.familyMemberMap.get(item.actor_id)?.username : "";
    return item?.actor_username || fromFamily || "有人";
  }
  
  function getNotificationActorAvatar(item) {
    const fromFamily = item?.actor_id
      ? getProfileAvatarUrl(state.familyMemberMap.get(item.actor_id) || {})
      : "";
    const fromProfiles = item?.actor_id
      ? getProfileAvatarUrl(state.familyLevelProfiles.get(item.actor_id) || {})
      : "";
    return getProfileAvatarUrl(item) || fromProfiles || fromFamily || loadCachedAvatarUrl(item?.actor_id) || "";
  }
  
  async function loadNotificationsInternal() {
    if (!state.cloudDb || !state.session) {
      state.notifications = [];
      renderNotifications();
      return;
    }
    const { data, error } = await notificationRepository.list(50);
    if (error) {
      state.notifications = [];
      els.notificationStatus.textContent = isMissingCloudSchema(error)
        ? "运行本次互动通知数据库补丁后即可使用。"
        : `通知读取失败：${error.message}`;
    } else {
      state.notifications = data || [];
      els.notificationStatus.textContent = "";
    }
    renderNotifications();
  }
  
  async function loadNotifications() {
    if (state.notificationsLoadPromise) return state.notificationsLoadPromise;
    state.notificationsLoadPromise = loadNotificationsInternal().finally(() => {
      state.notificationsLoadPromise = null;
    });
    return state.notificationsLoadPromise;
  }
  
  function renderNotifications() {
    const unread = renderNotificationsView({
      listElement: els.notificationList,
      badgeElement: els.notificationBadge,
      notifications: state.notifications,
      getText: getNotificationText,
      getActorName: getNotificationActorName,
      getActorAvatar: getNotificationActorAvatar,
      onOpen: openNotification,
    });
    void syncAppIconBadge(unread);
  }
  
  async function openNotification(button) {
    const id = button.dataset.notificationId;
    const photoId = button.dataset.notificationPhoto;
    const type = button.dataset.notificationType;
    const item = state.notifications.find((entry) => (entry.notification_id || entry.id) === id);
    if (item) item.is_read = true;
    renderNotifications();
    let photo = state.photos.find((entry) => entry.id === photoId);
    if (!photo && photoId && state.cloudDb && state.session) {
      const { data, error } = await diaryRepository.getById(photoId);
      if (!error && data) {
        photo = data;
        if (!state.photos.some((entry) => entry.id === data.id)) state.photos.unshift(data);
        savePhotoFeedCache(state.session.user.id);
        renderGallery();
      }
    }
    if (photo) {
      els.notificationDialog.close();
      switchPage("gallery");
      await new Promise((resolve) => requestAnimationFrame(resolve));
      openPhoto(photo);
    } else if (type === "thanks") {
      els.notificationDialog.close();
      switchPage("thanks");
    } else {
      showMiniToast("这条日记可能已删除或暂时无法读取。", { kind: "error", duration: 2600 });
    }
  }
  
  async function openNotificationsPanel() {
    await loadNotifications();
    const justSeenIds = state.notifications
      .filter((item) => !item.is_read)
      .map((item) => item.notification_id || item.id)
      .filter(Boolean);
    if (justSeenIds.length) {
      state.notifications.forEach((item) => {
        if (justSeenIds.includes(item.notification_id || item.id)) {
          item.is_read = true;
          item.just_seen = true;
        } else {
          item.just_seen = false;
        }
      });
      renderNotifications();
    }
    els.notificationDialog.showModal();
    if (justSeenIds.length) await markUnreadNotificationsRead();
  }
  
  async function markUnreadNotificationsRead() {
    if (!state.cloudDb || !state.session) return;
    const { error } = await notificationRepository.markAllUnread(state.session.user.id);
    if (error) {
      els.notificationStatus.textContent = `更新失败：${error.message}`;
      return;
    }
    state.notifications.forEach((item) => {
      item.is_read = true;
    });
    renderNotifications();
  }
  
  async function loadPhotoComments(photoId) {
    state.photoComments = [];
    els.photoCommentStatus.textContent = "";
    const canComment = Boolean(
      state.session &&
        state.activeDialogPhoto &&
        (state.activeDialogPhoto.user_id === state.session.user.id ||
          state.familyMemberMap.has(state.activeDialogPhoto.user_id))
    );
    els.photoCommentForm.hidden = !canComment;
    if (!state.cloudDb || !state.session || !photoId) {
      renderPhotoComments();
      return;
    }
    const { data, error } = await diaryRepository.listComments(photoId);
    if (error) {
      els.photoCommentStatus.textContent = isMissingCloudSchema(error)
        ? "运行最新版数据库脚本后即可留言。"
        : `留言读取失败：${error.message}`;
    } else {
      state.photoComments = data || [];
    }
    renderPhotoComments();
    renderMobileDiaryComments();
  }
  
  function renderPhotoComments() {
    if (!els.photoCommentsList) return;
    const heading = els.photoCommentsSection?.querySelector(".photo-comments-head h3");
    if (heading) heading.textContent = `共 ${state.photoComments.length} 条评论`;
    if (!state.photoComments.length) {
      els.photoCommentsList.innerHTML = `<p class="photo-comments-empty">还没有留言。</p>`;
      return;
    }
    const byParent = new Map();
    state.photoComments.forEach((comment) => {
      const parentId = comment.parent_id || "root";
      if (!byParent.has(parentId)) byParent.set(parentId, []);
      byParent.get(parentId).push(comment);
    });
  
    const renderBranch = (parentId = "root", depth = 0) =>
      (byParent.get(parentId) || [])
        .map((comment) => {
          const authorName = getAuthorName(comment.user_id);
          const replyTarget = comment.parent_id
            ? state.photoComments.find((item) => item.id === comment.parent_id)
            : null;
          const isAuthor = comment.user_id === state.activeDialogPhoto?.user_id;
          return `
            <div class="photo-comment-thread" style="--comment-depth:${Math.min(depth, 3)}">
              <article class="photo-comment">
                ${renderAvatarMarkup(comment.user_id)}
                <div class="photo-comment-main">
                  <header>
                    <span class="photo-comment-author-line">
                      <strong>${escapeHtml(authorName)}</strong>
                      ${isAuthor ? `<small class="photo-comment-author-badge">作者</small>` : ""}
                    </span>
                  </header>
                  ${replyTarget ? `<small class="reply-target">回复 ${escapeHtml(getAuthorName(replyTarget.user_id))}</small>` : ""}
                  <p>${escapeHtml(comment.body)}</p>
                  <time>${formatCommentTime(comment.created_at)}</time>
                  <div class="photo-comment-actions">
                    <button type="button" data-reply-comment="${escapeHtml(comment.id)}">回复</button>
                    ${comment.user_id === state.session?.user?.id ? `<button type="button" data-delete-comment="${escapeHtml(comment.id)}">删除</button>` : ""}
                  </div>
                </div>
              </article>
              ${renderBranch(comment.id, depth + 1)}
            </div>
          `;
        })
        .join("");
  
    els.photoCommentsList.innerHTML = renderBranch();
    els.photoCommentsList.querySelectorAll("[data-reply-comment]").forEach((button) => {
      button.addEventListener("click", () => startCommentReply(button.dataset.replyComment));
    });
    els.photoCommentsList.querySelectorAll("[data-delete-comment]").forEach((button) => {
      button.addEventListener("click", () => deletePhotoComment(button.dataset.deleteComment));
    });
  }
  
  function startCommentReply(commentId) {
    const comment = state.photoComments.find((item) => item.id === commentId);
    if (!comment) return;
    state.commentReplyToId = comment.id;
    els.commentReplyingText.textContent = `正在回复 ${getAuthorName(comment.user_id)}`;
    els.commentReplying.hidden = false;
    els.photoCommentInput.placeholder = `回复 ${getAuthorName(comment.user_id)}`;
    els.photoCommentInput.focus();
  }
  
  function cancelCommentReply() {
    state.commentReplyToId = null;
    els.commentReplying.hidden = true;
    els.commentReplyingText.textContent = "";
    els.photoCommentInput.placeholder = "给这篇日记留句话";
  }
  
  async function savePhotoComment(event) {
    event.preventDefault();
    if (!state.cloudDb || !state.session || !state.activeDialogPhoto) return;
    const body = els.photoCommentInput.value.trim();
    if (!body) return;
    els.photoCommentStatus.textContent = "正在发送...";
    const { error } = await diaryRepository.addComment({
      photo_id: state.activeDialogPhoto.id,
      user_id: state.session.user.id,
      body,
      parent_id: state.commentReplyToId,
    });
    if (error) {
      els.photoCommentStatus.textContent = isMissingCloudSchema(error)
        ? "请先部署最新版 Cloudflare D1 结构。"
        : `发送失败：${error.message}`;
      return;
    }
    els.photoCommentForm.reset();
    cancelCommentReply();
    await loadPhotoComments(state.activeDialogPhoto.id);
    await loadPhotoCommentPreviews();
    const gainedExp = await awardExperience("comment");
    els.photoCommentStatus.textContent = gainedExp ? `留言已发送。修为 +${gainedExp}` : "留言已发送。";
    if (state.activePage === "gallery") renderGallery();
  }
  
  async function deletePhotoComment(id) {
    const comment = state.photoComments.find((item) => item.id === id);
    if (!comment || comment.user_id !== state.session?.user?.id) return;
    const { error } = await diaryRepository.removeComment(id);
    if (error) {
      els.photoCommentStatus.textContent = `删除失败：${error.message}`;
      return;
    }
    await loadPhotoComments(state.activeDialogPhoto?.id);
    await loadPhotoCommentPreviews();
    if (state.activePage === "gallery") renderGallery();
  }
  
  
  return {
    syncAppIconBadge,
    getNotificationText,
    getNotificationActorName,
    getNotificationActorAvatar,
    loadNotifications,
    renderNotifications,
    openNotification,
    openNotificationsPanel,
    markUnreadNotificationsRead,
    loadPhotoComments,
    renderPhotoComments,
    startCommentReply,
    cancelCommentReply,
    savePhotoComment,
    deletePhotoComment,
  };
}

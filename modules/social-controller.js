import { buildNotificationText } from "./notification-domain.js";
import { renderNotificationsView } from "./notification-view.js";
import { escapeHtml, formatCommentTime } from "./ui-formatters.js";
import { flattenCommentThread } from "./comment-thread-domain.js";

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
  openThanksDialog,
  openWishlistDestination = () => {},
  openPhoto,
  showMiniToast,
  renderMobileDiaryComments,
  getAuthorName,
  renderAvatarMarkup,
  loadPhotoCommentPreviews,
  awardExperience,
}) {
  const els = elements;
  let notificationStatus = "idle";
  let notificationErrorMessage = "";
  let notificationUserId = null;

  function syncNotificationSession() {
    const nextUserId = state.session?.user?.id || "";
    if (nextUserId === notificationUserId) return;
    notificationUserId = nextUserId;
    notificationStatus = nextUserId ? "idle" : "ready";
    notificationErrorMessage = "";
  }

  function setNotificationStatus(nextStatus, errorMessage = "") {
    notificationStatus = nextStatus;
    notificationErrorMessage = errorMessage;
    if (els.notificationStatus) els.notificationStatus.textContent = "";
  }

  function getNotificationErrorMessage(error) {
    if (isMissingCloudSchema(error)) return "互动通知暂不可用，请稍后重试。";
    return error?.message
      ? `请检查网络后重试：${error.message}`
      : "请检查网络后重试。";
  }

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
    syncNotificationSession();
    if (!state.cloudDb || !state.session) {
      state.notifications = [];
      setNotificationStatus("ready");
      renderNotifications();
      return { data: [], error: null };
    }
    try {
      const { data, error } = await notificationRepository.list(50);
      if (error) {
        setNotificationStatus("error", getNotificationErrorMessage(error));
        renderNotifications();
        return { data: state.notifications, error };
      }
      state.notifications = Array.isArray(data) ? data : [];
      setNotificationStatus("ready");
      renderNotifications();
      return { data: state.notifications, error: null };
    } catch (error) {
      setNotificationStatus("error", getNotificationErrorMessage(error));
      renderNotifications();
      return { data: state.notifications, error };
    }
  }
  
  function loadNotifications() {
    syncNotificationSession();
    if (state.notificationsLoadPromise) return state.notificationsLoadPromise;
    setNotificationStatus("loading");
    renderNotifications();
    const request = Promise.resolve()
      .then(() => loadNotificationsInternal())
      .catch((error) => {
        setNotificationStatus("error", getNotificationErrorMessage(error));
        renderNotifications();
        return { data: state.notifications, error };
      });
    state.notificationsLoadPromise = request.finally(() => {
      state.notificationsLoadPromise = null;
    });
    return state.notificationsLoadPromise;
  }
  
  function renderNotifications() {
    syncNotificationSession();
    const unread = renderNotificationsView({
      listElement: els.notificationList,
      badgeElement: els.notificationBadge,
      notifications: state.notifications,
      status: state.session ? notificationStatus : "ready",
      errorMessage: notificationErrorMessage,
      getText: getNotificationText,
      getActorName: getNotificationActorName,
      getActorAvatar: getNotificationActorAvatar,
      onOpen: openNotification,
      onRetry: loadNotifications,
    });
    void syncAppIconBadge(unread);
  }
  
  async function openNotification(button) {
    try {
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
        closeNotificationsPanel();
        switchPage("gallery");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        openPhoto(photo);
      } else if (type === "thanks") {
        closeNotificationsPanel();
        openThanksDialog();
      } else if (type === "wish" || type === "shopping") {
        closeNotificationsPanel();
        await switchPage("wishlist");
        await openWishlistDestination(type === "shopping" ? "shopping" : "wishlist");
      } else if (type === "mood_reminder") {
        closeNotificationsPanel();
        await switchPage("mood");
      } else {
        showMiniToast("这条日记可能已删除或暂时无法读取。", { kind: "error", duration: 2600 });
      }
    } catch {
      showMiniToast("通知打开失败，请稍后重试。", { kind: "error", duration: 2600 });
    }
  }
  
  function closeNotificationsPanel() {
    if (els.notificationDialog?.open) els.notificationDialog.close();
  }

  async function openNotificationsPanel() {
    const dialog = els.notificationDialog;
    try {
      if (!dialog.open) dialog.showModal();
      const result = await loadNotifications();
      if (result?.error || !dialog.open) return;
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
        await markUnreadNotificationsRead();
      }
    } catch (error) {
      setNotificationStatus("error", getNotificationErrorMessage(error));
      renderNotifications();
    }
  }
  
  async function markUnreadNotificationsRead() {
    if (!state.cloudDb || !state.session) return;
    try {
      const { error } = await notificationRepository.markAllUnread(state.session.user.id);
      if (error) {
        els.notificationStatus.textContent = `更新失败：${error.message}`;
        return;
      }
      state.notifications.forEach((item) => {
        item.is_read = true;
      });
      renderNotifications();
    } catch (error) {
      els.notificationStatus.textContent = `更新失败：${error?.message || "请稍后重试"}`;
    }
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
    const comments = flattenCommentThread(state.photoComments, {
      getAuthorName,
    });
    const heading = els.photoCommentsSection?.querySelector(".photo-comments-head h3");
    if (heading) heading.textContent = `共 ${comments.length} 条评论`;
    if (!comments.length) {
      els.photoCommentsList.innerHTML = `<p class="photo-comments-empty">还没有留言。</p>`;
      return;
    }
    els.photoCommentsList.innerHTML = comments.map((comment) => {
      const isAuthor = comment.authorId === state.activeDialogPhoto?.user_id;
      return `
        <article class="photo-comment" data-comment-id="${escapeHtml(comment.id)}">
          ${renderAvatarMarkup(comment.authorId)}
          <div class="photo-comment-main">
            <header>
              <span class="photo-comment-author-line">
                <strong>${escapeHtml(getAuthorName(comment.authorId))}</strong>
                ${isAuthor ? `<small class="photo-comment-author-badge">作者</small>` : ""}
              </span>
            </header>
            ${comment.replyTargetId ? `<small class="reply-target">回复 ${escapeHtml(comment.replyTargetName)}</small>` : ""}
            <p>${escapeHtml(comment.body)}</p>
            <time>${formatCommentTime(comment.createdAt)}</time>
            <div class="photo-comment-actions">
              <button type="button" data-reply-comment="${escapeHtml(comment.id)}">回复</button>
              ${comment.authorId === state.session?.user?.id ? `<button type="button" data-delete-comment="${escapeHtml(comment.id)}">删除</button>` : ""}
            </div>
          </div>
        </article>
      `;
    }).join("");
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
    closeNotificationsPanel,
    markUnreadNotificationsRead,
    loadPhotoComments,
    renderPhotoComments,
    startCommentReply,
    cancelCommentReply,
    savePhotoComment,
    deletePhotoComment,
  };
}

import { buildNotificationText } from "./notification-domain.js";
import { renderNotificationsView } from "./notification-view.js";

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
  addPhotoCommentPreview,
  awardExperience,
}) {
  const els = elements;
  let notificationStatus = "idle";
  let notificationErrorMessage = "";
  let notificationUserId = null;
  let commentRead = 0;
  let desktopCommentSubmitting = false;

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
    const read = ++commentRead;
    const photo = state.activeDialogPhoto;
    const userId = state.session?.user?.id;
    state.photoComments = [];
    els.photoCommentsList?.replaceChildren();
    els.photoCommentStatus.textContent = "";
    const canComment = Boolean(
      state.session &&
        state.activeDialogPhoto &&
        (state.activeDialogPhoto.user_id === state.session.user.id ||
          state.familyMemberMap.has(state.activeDialogPhoto.user_id))
    );
    els.photoCommentForm.hidden = !canComment;
    if (!state.cloudDb || !state.session || !photoId) {
      if (els.photoCommentsList) els.photoCommentsList.textContent = "还没有留言。";
      return;
    }
    const { data, error } = await diaryRepository.listComments(photoId);
    if (read !== commentRead || state.activeDialogPhoto !== photo || state.session?.user?.id !== userId) return;
    if (error) {
      els.photoCommentStatus.textContent = isMissingCloudSchema(error)
        ? "运行最新版数据库脚本后即可留言。"
        : `留言读取失败：${error.message}`;
    } else {
      const current = new Map((data || []).map((comment) => [comment.id, comment]));
      for (const comment of state.photoComments) current.set(comment.id, comment);
      state.photoComments = [...current.values()];
    }
    renderPhotoComments();
    renderMobileDiaryComments();
  }

  async function publishPhotoComment({ photoId, body, parentId }) {
    const userId = state.session?.user?.id;
    if (!state.cloudDb || !userId) return { error: new Error("请先登录。") };
    const result = await diaryRepository.addComment({ photo_id: photoId, user_id: userId, body, parent_id: parentId });
    if (result.error || state.session?.user?.id !== userId) return result;
    const comment = result.data;
    addPhotoCommentPreview(comment);
    if (state.activeDialogPhoto?.id === photoId) {
      state.photoComments = [...state.photoComments.filter(({ id }) => id !== comment.id), comment];
      renderPhotoComments();
      renderMobileDiaryComments();
    }
    void Promise.resolve().then(() => awardExperience("comment")).catch(() => {});
    return result;
  }
  
  async function renderPhotoComments() {
    if (!els.dialog?.open || els.photoCommentsSection?.hidden) return;
    const photo = state.activeDialogPhoto;
    try {
      const { renderPhotoCommentThread } = await import("./photo-dialog-view.js");
      if (state.activeDialogPhoto !== photo || !els.dialog.open) return;
      renderPhotoCommentThread({ elements: els, state, getAuthorName, renderAvatarMarkup, startCommentReply, deletePhotoComment });
    } catch {
      if (state.activeDialogPhoto === photo) els.photoCommentStatus.textContent = "留言暂时无法显示，请重新打开日记。";
    }
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
    const photo = state.activeDialogPhoto;
    if (desktopCommentSubmitting || !state.cloudDb || !state.session || !photo) return;
    const body = els.photoCommentInput.value.trim();
    if (!body) return;
    els.photoCommentStatus.textContent = "正在发送...";
    desktopCommentSubmitting = true;
    try {
      const { error } = await publishPhotoComment({ photoId: photo.id, body, parentId: state.commentReplyToId });
      if (state.activeDialogPhoto !== photo) return;
      if (error) throw error;
      els.photoCommentForm.reset();
      cancelCommentReply();
      els.photoCommentStatus.textContent = "留言已发送。";
    } catch (error) {
      if (state.activeDialogPhoto !== photo) return;
      els.photoCommentStatus.textContent = isMissingCloudSchema(error)
        ? "请先部署最新版 Cloudflare D1 结构。"
        : `发送失败：${error.message}`;
    } finally {
      desktopCommentSubmitting = false;
    }
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
    publishPhotoComment,
    renderPhotoComments,
    startCommentReply,
    cancelCommentReply,
    savePhotoComment,
    deletePhotoComment,
  };
}

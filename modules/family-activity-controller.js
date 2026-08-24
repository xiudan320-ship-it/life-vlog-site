import {
  buildFamilyMemoryMarkup,
  buildFamilyTimelineMarkup,
  buildWeeklyReviewMarkup,
} from "./family-activity-view.js";
import { formatDate } from "./ui-formatters.js";

export function createFamilyActivityController({
  elements,
  state,
  diaryRepository,
  getPhotoLabel,
  getSortedPhotos,
  getAuthorName,
  getPhotoImages,
  openPhoto,
}) {
  const els = elements;

  function getFamilyTimelineEntries() {
    const entries = [];
    state.photos.forEach((photo) => entries.push({
      type: "日记",
      title: getPhotoLabel(photo),
      detail: photo.category || "日常",
      date: photo.created_at,
      userId: photo.user_id,
      photoId: photo.id,
    }));
    state.recipes.forEach((item) => entries.push({
      type: "菜谱", title: item.name, detail: item.category || "家常菜",
      date: item.createdAt, userId: item.userId,
    }));
    state.wishes.forEach((item) => entries.push({
      type: item.done ? "完成心愿" : "心愿", title: item.title,
      detail: item.done ? (item.completionNote || "愿望达成") : (item.priority || "普通"),
      date: item.completedAt || item.updatedAt || item.createdAt, userId: item.userId,
    }));
    state.weekendPlans.forEach((item) => entries.push({
      type: item.done ? "完成周末" : "周末", title: item.title,
      detail: item.location || item.type || "周末安排",
      date: item.updatedAt || item.createdAt, userId: item.userId,
    }));
    state.gratitudeNotes.forEach((item) => entries.push({
      type: "留言", title: item.body, detail: "感谢留言板",
      date: item.created_at, userId: item.user_id,
    }));
    return entries
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  
  function getCurrentWeekRange(reference = new Date()) {
    const start = new Date(reference);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  
  function isWithinRange(value, start, end) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
  }
  
  async function loadWeeklyReview() {
    if (!state.session || !state.cloudDb || !els.weeklyReviewContent) return;
    const { start, end } = getCurrentWeekRange();
    els.weeklyReviewRange.textContent = `${formatDate(start)} - ${formatDate(new Date(end.getTime() - 1))}`;
    els.weeklyReviewLoading.hidden = false;
    els.weeklyReviewContent.innerHTML = "";
    els.weeklyReviewStatus.textContent = "";
  
    try {
      const { data: comments, error } = await diaryRepository.listCommentPreviews(500);
      if (error) throw error;
  
      const weekPhotos = getSortedPhotos(state.photos).filter((photo) => isWithinRange(photo.created_at, start, end));
      const weekComments = (comments || []).filter((comment) => isWithinRange(comment.created_at, start, end));
      const completedWishes = state.wishes.filter((wish) => wish.done && isWithinRange(wish.completedAt || wish.updatedAt, start, end));
      const weekendMoments = state.weekendPlans.filter((plan) =>
        isWithinRange(plan.date || plan.updatedAt || plan.createdAt, start, end)
      );
      const thanks = state.gratitudeNotes.filter((note) => isWithinRange(note.created_at, start, end));
      const activity = [
        ...weekPhotos.map((photo) => ({ type: "日记", title: getPhotoLabel(photo), date: photo.created_at, userId: photo.user_id, photoId: photo.id })),
        ...weekComments.map((comment) => ({ type: comment.parent_id ? "回复" : "留言", title: comment.body, date: comment.created_at, userId: comment.user_id, photoId: comment.photo_id })),
        ...completedWishes.map((wish) => ({ type: "心愿达成", title: wish.title, date: wish.completedAt || wish.updatedAt, userId: wish.userId })),
        ...weekendMoments.map((plan) => ({ type: plan.done ? "周末完成" : "周末安排", title: plan.title, date: plan.date || plan.updatedAt, userId: plan.userId })),
        ...thanks.map((note) => ({ type: "感谢留言", title: note.body, date: note.created_at, userId: note.user_id })),
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      const memberCounts = new Map();
      activity.forEach((item) => memberCounts.set(item.userId, (memberCounts.get(item.userId) || 0) + 1));
      const leadingMember = [...memberCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      const summary = activity.length
        ? `这一周留下了 ${weekPhotos.length} 篇日记和 ${weekComments.length + thanks.length} 次交流${completedWishes.length ? `，还完成了 ${completedWishes.length} 个心愿` : ""}。`
        : "这一周还很安静。生活没有缺席，只是暂时没有被写下来。";
  
      els.weeklyReviewContent.innerHTML = buildWeeklyReviewMarkup({
        summary,
        leadingMember,
        photoCount: weekPhotos.length,
        interactionCount: weekComments.length + thanks.length,
        completedWishCount: completedWishes.length,
        weekendCount: weekendMoments.length,
        activity,
        getAuthorName,
      });
      els.weeklyReviewContent.querySelectorAll("[data-weekly-photo]").forEach((button) => {
        button.addEventListener("click", () => {
          const photo = state.photos.find((item) => item.id === button.dataset.weeklyPhoto);
          if (!photo) return;
          els.weeklyReviewDialog.close();
          openPhoto(photo);
        });
      });
    } catch (error) {
      els.weeklyReviewStatus.textContent = `本周回顾整理失败：${error.message}`;
    } finally {
      els.weeklyReviewLoading.hidden = true;
    }
  }
  
  function openWeeklyReview() {
    if (!state.session || !els.weeklyReviewDialog) return;
    els.weeklyReviewDialog.showModal();
    void loadWeeklyReview();
  }
  
  function renderFamilyTimeline(mode = "activity") {
    const dialog = document.querySelector("#familyTimelineDialog");
    const output = dialog?.querySelector("[data-family-timeline-content]");
    if (!output) return;
    dialog.dataset.mode = mode;
    dialog.querySelectorAll("[data-family-timeline-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.familyTimelineMode === mode);
    });
    const now = new Date();
    if (mode === "memory") {
      const sameDayPhotos = getSortedPhotos(state.photos).filter((photo) => {
        const date = new Date(photo.created_at || photo.taken_at);
        return date.getFullYear() < now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
      });
      const monthPhotos = state.photos.filter((photo) => {
        const date = new Date(photo.created_at);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      });
      const monthWishes = state.wishes.filter((wish) => wish.done && new Date(wish.completedAt || wish.updatedAt).getMonth() === now.getMonth());
      output.innerHTML = buildFamilyMemoryMarkup({
        monthPhotoCount: monthPhotos.length,
        monthWishCount: monthWishes.length,
        monthMessageCount: state.gratitudeNotes.filter((note) => new Date(note.created_at).getMonth() === now.getMonth()).length,
        photos: sameDayPhotos,
        getImage: (photo) => getPhotoImages(photo)[0],
        getLabel: getPhotoLabel,
      });
    } else {
      const entries = getFamilyTimelineEntries().slice(0, 60);
      output.innerHTML = buildFamilyTimelineMarkup(entries, getAuthorName);
    }
    output.querySelectorAll("[data-timeline-photo]").forEach((button) => {
      button.addEventListener("click", () => {
        const photo = state.photos.find((item) => item.id === button.dataset.timelinePhoto);
        if (!photo) return;
        dialog.close();
        openPhoto(photo, 0);
      });
    });
  }
  
  function ensureFamilyTimelineUi() {
    if (!els.toolDock || document.querySelector("#familyTimelineDialog")) return;
    const button = document.createElement("button");
    button.className = "tool-dock-button timeline-tool-button";
    button.type = "button";
    button.dataset.toolId = "timeline";
    button.innerHTML = '<span class="tool-dock-mark timeline-mark" aria-hidden="true">迹</span><span><strong>家庭足迹</strong><small>动态与往年今日</small></span>';
    els.toolDock.append(button);
    const dialog = document.createElement("dialog");
    dialog.className = "account-dialog family-timeline-dialog";
    dialog.id = "familyTimelineDialog";
    dialog.innerHTML = `
      <button class="dialog-close" type="button" data-close-family-timeline aria-label="关闭">×</button>
      <header><p class="kicker">Family Timeline</p><h2>家庭足迹</h2><p>把家里最近发生的事和值得重看的日子放在一起。</p></header>
      <nav><button class="active" type="button" data-family-timeline-mode="activity">最近动态</button><button type="button" data-family-timeline-mode="memory">时间回顾</button></nav>
      <div class="family-timeline-content" data-family-timeline-content></div>`;
    document.body.append(dialog);
    button.addEventListener("click", () => {
      renderFamilyTimeline("activity");
      dialog.showModal();
    });
    dialog.querySelector("[data-close-family-timeline]").addEventListener("click", () => dialog.close());
    dialog.querySelectorAll("[data-family-timeline-mode]").forEach((tab) => tab.addEventListener("click", () => renderFamilyTimeline(tab.dataset.familyTimelineMode)));
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  }
  
  
  return {
    getFamilyTimelineEntries,
    getCurrentWeekRange,
    isWithinRange,
    loadWeeklyReview,
    openWeeklyReview,
    renderFamilyTimeline,
    ensureFamilyTimelineUi,
  };
}

import { buildWeeklyReviewMarkup } from "./family-activity-view.js";
import { formatDate } from "./ui-formatters.js";

export function createFamilyActivityController({
  elements,
  state,
  diaryRepository,
  getPhotoLabel,
  getSortedPhotos,
  getAuthorName,
  openPhoto,
}) {
  const els = elements;

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
  
  return {
    loadWeeklyReview,
    openWeeklyReview,
  };
}

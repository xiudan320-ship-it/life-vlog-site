import { MOOD_META, buildCalendarWeeks, getMoodAsset } from "./mood-diary-domain.js";
import { createMoodMonthSummaryView } from "./mood-month-summary-view.js";

function text(documentTarget, tagName, value = "", className = "") {
  const element = documentTarget.createElement(tagName);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function asset(documentTarget, mood, shape) {
  const wrapper = documentTarget.createElement("span");
  wrapper.setAttribute("aria-hidden", "true");
  const image = documentTarget.createElement("img");
  image.src = getMoodAsset(mood, shape) || "";
  image.alt = "";
  image.loading = "lazy";
  const fallback = text(documentTarget, "span", "素材暂不可用", "mood-asset-error");
  fallback.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    fallback.hidden = false;
  }, { once: true });
  wrapper.append(image, fallback);
  return wrapper;
}

export function createMoodDiaryView({ elements = {}, getAuthorName, getAuthorAvatar, onAction = () => {} } = {}) {
  let bound = false;
  const monthSummaryView = createMoodMonthSummaryView({
    elements,
    getParticipantName: getAuthorName,
    getParticipantAvatar: getAuthorAvatar,
    getMoodAsset,
    windowTarget: elements.moodPage?.ownerDocument?.defaultView || globalThis.window,
  });
  const nameFor = (state, userId) => getAuthorName?.(userId) || state.participants.find((participant) => participant.userId === userId)?.name || "…";

  function avatar(documentTarget, state, userId) {
    const name = nameFor(state, userId);
    const wrapper = text(documentTarget, "span", "", "mood-author-avatar");
    const url = getAuthorAvatar?.(userId) || "";
    if (url) { const image = documentTarget.createElement("img"); image.src = url; image.alt = `${name}的头像`; wrapper.append(image); }
    else wrapper.textContent = [...name][0] || "?";
    return wrapper;
  }

  function renderLegend(state) {
    if (!elements.moodCalendarLegend) return;
    const documentTarget = elements.moodCalendarLegend.ownerDocument;
    elements.moodCalendarLegend.replaceChildren(...state.participants.map((participant) => {
      const item = documentTarget.createElement("span");
      const name = nameFor(state, participant.userId);
      item.title = name;
      item.setAttribute("aria-label", `${name}，${participant.shape === "square" ? "方形" : "圆形"}席位`);
      const dot = text(documentTarget, "i", "", `mood-seat-dot mood-seat-dot-${participant.shape}`);
      dot.setAttribute("aria-hidden", "true");
      item.append(dot, text(documentTarget, "span", name, "mood-seat-name"));
      return item;
    }));
  }

  function renderCalendar(state) {
    if (!elements.moodCalendarGrid || !state.currentMonthKey) return;
    const documentTarget = elements.moodCalendarGrid.ownerDocument;
    const cells = [];
    for (const week of buildCalendarWeeks(state.currentMonthKey)) {
      for (const cell of week) {
        if (!cell.isCurrentMonth) { const outside = text(documentTarget, "div", "", "mood-calendar-cell is-outside"); outside.setAttribute("aria-hidden", "true"); cells.push(outside); continue; }
        const button = documentTarget.createElement("button");
        button.type = "button";
        button.className = "mood-calendar-cell";
        button.dataset.moodDate = cell.dateKey;
        const isToday = cell.dateKey === state.todayKey;
        const isFuture = state.isFutureDate(cell.dateKey);
        if (isToday) button.classList.add("is-today");
        if (isFuture) {
          button.classList.add("is-future");
          button.disabled = true;
          button.setAttribute("aria-disabled", "true");
        }
        const day = text(documentTarget, "span", "", "mood-calendar-day");
        day.append(text(documentTarget, "span", String(cell.day)));
        if (isToday) day.append(text(documentTarget, "span", "今天", "mood-calendar-today-label"));
        button.append(day);
        const labels = [];
        const entryWrap = text(documentTarget, "span", "", "mood-calendar-entries");
        for (const entry of (state.entriesByDate.get(cell.dateKey) || []).slice(0, 2)) {
          const participant = state.participants.find(({ userId }) => userId === entry.user_id);
          const item = text(documentTarget, "span", "", `mood-calendar-entry is-${participant?.shape || "circle"}`);
          item.append(asset(documentTarget, entry.mood, participant?.shape || "circle"), text(documentTarget, "span", MOOD_META[entry.mood]?.label || entry.mood));
          entryWrap.append(item);
          labels.push(`${nameFor(state, entry.user_id)}：${MOOD_META[entry.mood].label}`);
        }
        if (entryWrap.childElementCount) button.append(entryWrap);
        button.setAttribute("aria-label", `${cell.dateKey}${isToday ? "，今天" : ""}${isFuture ? "，未来日期，不可记录" : ""}${labels.length ? `，${labels.join("，")}` : "，暂无记录"}`);
        cells.push(button);
      }
    }
    elements.moodCalendarGrid.replaceChildren(...cells);
  }

  function renderHistory(state) {
    if (!elements.moodHistoryList) return;
    const documentTarget = elements.moodHistoryList.ownerDocument;
    const items = state.listEntries.map((entry) => {
      const meta = MOOD_META[entry.mood];
      const participant = state.participants.find(({ userId }) => userId === entry.user_id);
      const item = documentTarget.createElement("article");
      item.className = "mood-history-item";
      item.style.setProperty("--mood-accent", meta.accent);
      const [year, month, day] = entry.diary_date.split("-");
      const date = text(documentTarget, "div", "", "mood-history-date");
      date.append(text(documentTarget, "strong", day), text(documentTarget, "span", `${year}.${month}`));
      const body = text(documentTarget, "div", "", "mood-history-body");
      const mood = text(documentTarget, "div", "", "mood-history-mood");
      mood.append(asset(documentTarget, entry.mood, participant?.shape || "circle"), text(documentTarget, "strong", meta.label));
      body.append(mood, text(documentTarget, "p", entry.content || "", "mood-history-content"));
      const metaRow = text(documentTarget, "div", "", "mood-history-meta");
      metaRow.append(avatar(documentTarget, state, entry.user_id), text(documentTarget, "span", nameFor(state, entry.user_id)));
      const detail = text(documentTarget, "button", "查看", "mood-secondary-button");
      detail.type = "button";
      detail.dataset.moodHistoryId = entry.id;
      metaRow.append(detail);
      body.append(metaRow);
      item.append(date, text(documentTarget, "span", "", "mood-history-accent"), body);
      return item;
    });
    elements.moodHistoryList.replaceChildren(...items);
    if (elements.moodHistoryEmpty) elements.moodHistoryEmpty.hidden = Boolean(state.loadingList || items.length);
    if (elements.moodHistoryLoadMore) { elements.moodHistoryLoadMore.hidden = !state.listHasMore; elements.moodHistoryLoadMore.disabled = state.loadingList; }
  }

  function render(state) {
    const signedIn = Boolean(state.currentUserId);
    const list = state.activeView === "list";
    if (elements.moodLoginState) elements.moodLoginState.hidden = signedIn;
    if (elements.moodFamilyState) elements.moodFamilyState.hidden = !signedIn || state.hasFamily;
    if (elements.moodCalendarView) elements.moodCalendarView.hidden = !signedIn || list;
    if (elements.moodMonthSummary) elements.moodMonthSummary.hidden = !signedIn || list;
    if (elements.moodListView) elements.moodListView.hidden = !signedIn || !list;
    if (elements.moodFab) elements.moodFab.hidden = !signedIn || list;
    if (elements.moodListOpen) elements.moodListOpen.hidden = !signedIn || list;
    if (elements.moodDiaryStatus) { elements.moodDiaryStatus.textContent = state.statusMessage; elements.moodDiaryStatus.dataset.kind = state.statusKind; }
    if (elements.moodMonthRetry) {
      elements.moodMonthRetry.hidden = !signedIn || list || state.statusKind !== "error";
      elements.moodMonthRetry.disabled = state.loadingMonth;
    }
    if (elements.moodMonthLabel && state.currentMonthKey) { const [year, month] = state.currentMonthKey.split("-"); elements.moodMonthLabel.textContent = `${year} 年 ${Number(month)} 月`; }
    if (elements.moodMonthSubLabel) elements.moodMonthSubLabel.textContent = state.currentMonthKey === state.todayMonthKey ? "本月" : "浏览月份";
    renderLegend(state);
    renderCalendar(state);
    monthSummaryView.render(state);
    renderHistory(state);
  }

  function bind() {
    if (bound || !elements.moodPage) return;
    bound = true;
    elements.moodPage.addEventListener("click", (event) => {
      const target = event.target.closest?.("[data-mood-date], [data-mood-open-family-settings], #moodListOpen, #moodCalendarOpen, #moodFab, #moodMonthPrevious, #moodMonthNext, #moodMonthRetry, #moodHistoryLoadMore, [data-mood-history-id]");
      if (!target) return;
      if (target.dataset.moodDate) return onAction({ type: "date", dateKey: target.dataset.moodDate, trigger: target });
      if (target.dataset.moodOpenFamilySettings !== undefined) return onAction({ type: "open-family-settings" });
      if (target.id === "moodListOpen") return onAction({ type: "open-list" });
      if (target.id === "moodCalendarOpen") return onAction({ type: "open-calendar" });
      if (target.id === "moodFab") return onAction({ type: "open-today", trigger: target });
      if (target.id === "moodMonthPrevious") return onAction({ type: "previous-month" });
      if (target.id === "moodMonthNext") return onAction({ type: "next-month" });
      if (target.id === "moodMonthRetry") return onAction({ type: "retry-month" });
      if (target.id === "moodHistoryLoadMore") return onAction({ type: "load-more" });
      if (target.dataset.moodHistoryId) return onAction({ type: "history-detail", id: target.dataset.moodHistoryId, trigger: target });
    });
    monthSummaryView.bind();
  }

  return Object.freeze({ bind, render });
}

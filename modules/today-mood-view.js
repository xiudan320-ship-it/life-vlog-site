import { buildCalendarWeeks } from "./mood-diary-domain.js";
import { MOOD_META, getMoodAsset } from "./mood-diary-shared.js";

function createText(documentTarget, tagName, text = "", className = "") {
  const element = documentTarget.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createMoodAsset(documentTarget, mood, shape) {
  const wrapper = documentTarget.createElement("span");
  wrapper.className = "today-mood-seat-asset";
  const image = documentTarget.createElement("img");
  image.src = getMoodAsset(mood, shape) || "";
  image.alt = "";
  image.loading = "eager";
  image.decoding = "async";
  const error = createText(documentTarget, "span", "素材暂不可用", "today-mood-asset-error");
  error.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    error.hidden = false;
  }, { once: true });
  wrapper.append(image, error);
  return wrapper;
}

function getParticipantName(participant, getAuthorName) {
  return getAuthorName?.(participant.userId) || participant.name || "…";
}

function formatTodayLabel(todayKey) {
  const match = String(todayKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return "今天";
  return `今天 · ${Number(match[2])} 月 ${Number(match[3])} 日`;
}

function formatMonthLabel(monthKey) {
  const match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/u);
  if (!match) return "本月";
  return `${match[1]} 年 ${Number(match[2])} 月`;
}

function createMonthCalendarAsset(documentTarget, mood, shape) {
  const wrapper = documentTarget.createElement("span");
  wrapper.className = `overview-mood-calendar-asset is-${shape}`;
  wrapper.setAttribute("aria-hidden", "true");
  const image = documentTarget.createElement("img");
  image.src = getMoodAsset(mood, shape) || "";
  image.alt = "";
  image.width = 24;
  image.height = 24;
  image.decoding = "async";
  wrapper.append(image);
  return wrapper;
}

function createMonthEntriesByDate(entries) {
  const entriesByDate = new Map();
  for (const entry of entries || []) {
    const dateKey = String(entry?.diary_date || "").trim();
    if (!dateKey) continue;
    const dateEntries = entriesByDate.get(dateKey) || [];
    dateEntries.push(entry);
    entriesByDate.set(dateKey, dateEntries);
  }
  return entriesByDate;
}

function createSeatPlaceholder(documentTarget, text = "未记录") {
  const placeholder = createText(documentTarget, "span", text, "today-mood-seat-placeholder");
  placeholder.setAttribute("aria-hidden", "true");
  return placeholder;
}

export function createTodayMoodView({ elements, getAuthorName } = {}) {
  const els = elements || {};

  function renderMonthPreview(state) {
    const panel = els.overviewMoodMonth;
    if (!panel) return;
    panel.hidden = !state.currentUserId;
    if (!state.currentUserId) return;
    if (els.overviewMoodMonthLabel) els.overviewMoodMonthLabel.textContent = formatMonthLabel(state.monthKey);
    if (els.overviewMoodMonthMeta) {
      els.overviewMoodMonthMeta.textContent = state.monthLoading
        ? "正在同步本月心情…"
        : state.monthError
          ? state.monthError
          : `${state.monthSummary?.total || 0} 条记录`;
    }
    const calendar = els.overviewMoodCalendarGrid;
    if (!calendar || !state.monthKey) return;
    const documentTarget = calendar.ownerDocument;
    const entriesByDate = createMonthEntriesByDate(state.monthEntries);
    const participantById = new Map((state.participants || []).map((participant) => [participant.userId, participant]));
    const cells = [];
    for (const week of buildCalendarWeeks(state.monthKey)) {
      for (const dayCell of week) {
        if (!dayCell.isCurrentMonth) {
          const outside = createText(documentTarget, "span", "", "overview-mood-calendar-cell is-outside");
          outside.setAttribute("aria-hidden", "true");
          cells.push(outside);
          continue;
        }
        const isToday = dayCell.dateKey === state.todayKey;
        const isFuture = Boolean(state.todayKey) && dayCell.dateKey > state.todayKey;
        const cell = createText(documentTarget, "span", "", "overview-mood-calendar-cell");
        cell.setAttribute("role", "img");
        if (isToday) cell.classList.add("is-today");
        if (isFuture) cell.classList.add("is-future");
        const day = createText(documentTarget, "span", String(dayCell.day), "overview-mood-calendar-day");
        const entries = (entriesByDate.get(dayCell.dateKey) || []).slice(0, 2);
        const entryWrap = createText(documentTarget, "span", "", "overview-mood-calendar-entries");
        const labels = [];
        for (const entry of entries) {
          const participant = participantById.get(entry.user_id);
          const shape = participant?.shape || "circle";
          const moodLabel = MOOD_META[entry.mood]?.label || entry.mood || "已记录";
          const entryItem = createText(documentTarget, "span", "", `overview-mood-calendar-entry is-${shape}`);
          entryItem.append(createMonthCalendarAsset(documentTarget, entry.mood, shape));
          entryWrap.append(entryItem);
          labels.push(`${participant?.name || "成员"}：${moodLabel}`);
        }
        if (!labels.length) entryWrap.append(createText(documentTarget, "span", "·", "overview-mood-calendar-empty"));
        cell.append(day, entryWrap);
        cell.setAttribute("aria-label", `${dayCell.dateKey}${isToday ? "，今天" : ""}${isFuture ? "，未来日期" : ""}${labels.length ? `，${labels.join("，")}` : "，暂无记录"}`);
        cells.push(cell);
      }
    }
    calendar.setAttribute("aria-busy", String(Boolean(state.monthLoading)));
    calendar.replaceChildren(...cells);
  }

  function renderSeat(state, participant) {
    const documentTarget = els.todayMoodGrid.ownerDocument;
    const name = getParticipantName(participant, getAuthorName);
    const entry = state.entriesByUserId?.get(participant.userId) || null;
    const isCurrentUser = participant.userId === state.currentUserId;
    const unavailable = Boolean(state.error);
    const recorded = Boolean(entry) && !unavailable;
    const actionable = !unavailable && (recorded || isCurrentUser);
    const element = documentTarget.createElement(actionable ? "button" : "article");
    element.className = `today-mood-seat is-${participant.shape}${actionable ? " today-mood-seat-button" : ""}`;
    if (actionable) {
      element.type = "button";
      element.dataset.todayMoodUser = participant.userId;
    } else {
      element.classList.add("is-unavailable");
    }

    const accessibleLabel = unavailable
      ? `${name}今天的心情暂时无法同步`
      : recorded
        ? `${name}今天的心情：${MOOD_META[entry.mood]?.label || "已记录"}，查看详情`
        : isCurrentUser
          ? `${name}今天还没有记录心情，添加今日心情`
          : `${name}今天还没有记录心情`;
    element.setAttribute("aria-label", accessibleLabel);
    const media = documentTarget.createElement("span");
    media.className = `today-mood-seat-media is-${participant.shape}`;
    media.setAttribute("aria-hidden", "true");
    media.append(recorded ? createMoodAsset(documentTarget, entry.mood, participant.shape) : createSeatPlaceholder(
      documentTarget,
      unavailable ? "暂不可用" : "未记录",
    ));

    const copy = documentTarget.createElement("span");
    copy.className = "today-mood-seat-copy";
    const nameElement = createText(documentTarget, "span", name, "today-mood-seat-name");
    nameElement.title = name;
    copy.append(nameElement);
    if (unavailable) {
      copy.append(createText(documentTarget, "strong", "暂时无法同步", "today-mood-seat-mood"));
      copy.append(createText(documentTarget, "span", "请重试", "today-mood-seat-note"));
    } else if (recorded) {
      copy.append(createText(documentTarget, "strong", MOOD_META[entry.mood]?.label || "已记录", "today-mood-seat-mood"));
      copy.append(createText(documentTarget, "span", "查看详情", "today-mood-seat-note"));
    } else if (isCurrentUser) {
      copy.append(createText(documentTarget, "strong", "还没记录", "today-mood-seat-mood"));
      copy.append(createText(documentTarget, "span", "添加心情", "today-mood-seat-note"));
    } else {
      copy.append(createText(documentTarget, "strong", "还没记录", "today-mood-seat-mood"));
      copy.append(createText(documentTarget, "span", "未记录", "today-mood-seat-note"));
    }
    element.append(media, copy);
    return element;
  }

  function render(state) {
    if (els.todayMoodDate) els.todayMoodDate.textContent = formatTodayLabel(state.todayKey);
    renderMonthPreview(state);
    if (els.todayMoodStatus) {
      els.todayMoodStatus.textContent = state.loading
        ? "正在加载今日心情"
        : state.syncing
          ? "正在更新今日心情"
          : state.stale
            ? "显示最近缓存，暂时无法更新"
            : state.error
              ? "今日心情暂时无法同步"
              : "";
      els.todayMoodStatus.dataset.kind = state.error ? "error" : state.loading ? "loading" : state.stale ? "stale" : "";
    }
    // Background refresh must not insert a row above already visible cached cards.
    if (els.todayMoodStatusRow) els.todayMoodStatusRow.hidden = !state.loading && !state.error && !state.stale;
    if (els.todayMoodRetry) {
      els.todayMoodRetry.hidden = !state.error;
      els.todayMoodRetry.disabled = Boolean(state.loading);
    }
    if (!els.todayMoodGrid) return;
    els.todayMoodGrid.setAttribute("aria-busy", String(Boolean(state.loading)));
    if (!state.currentUserId) {
      els.todayMoodGrid.replaceChildren();
      return;
    }
    if (state.loading && !state.hasLocalResult) {
      const documentTarget = els.todayMoodGrid.ownerDocument;
      els.todayMoodGrid.replaceChildren(
        ...[0, 1].map(() => {
          const skeleton = documentTarget.createElement("article");
          skeleton.className = "today-mood-skeleton";
          skeleton.setAttribute("aria-hidden", "true");
          return skeleton;
        }),
      );
      return;
    }
    els.todayMoodGrid.replaceChildren(...(state.participants || []).map((participant) => renderSeat(state, participant)));
  }

  return Object.freeze({ render });
}

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
  image.loading = "lazy";
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

function createSeatPlaceholder(documentTarget, text = "未记录") {
  const placeholder = createText(documentTarget, "span", text, "today-mood-seat-placeholder");
  placeholder.setAttribute("aria-hidden", "true");
  return placeholder;
}

export function createTodayMoodView({ elements, getAuthorName } = {}) {
  const els = elements || {};

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
    if (els.todayMoodStatus) {
      els.todayMoodStatus.textContent = state.loading
        ? "正在加载今日心情"
        : state.error
          ? "今日心情暂时无法同步"
          : "";
      els.todayMoodStatus.dataset.kind = state.error ? "error" : state.loading ? "loading" : "";
    }
    if (els.todayMoodStatusRow) els.todayMoodStatusRow.hidden = !state.loading && !state.error;
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
    if (state.loading) {
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

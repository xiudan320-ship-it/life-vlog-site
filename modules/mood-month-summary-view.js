const SVG_NS = "http://www.w3.org/2000/svg";
const TREND_LAYOUT = Object.freeze({
  width: 720,
  height: 260,
  left: 78,
  right: 18,
  top: 30,
  bottom: 44,
  highY: 54,
  steadyY: 120,
  lowY: 186,
});
const TREND_COLORS = Object.freeze(["var(--mood-trend-primary)", "var(--mood-trend-secondary)"]);

function text(documentTarget, tagName, value = "", className = "") {
  const element = documentTarget.createElement(tagName);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function svgElement(documentTarget, tagName, attributes = {}) {
  const element = documentTarget.createElementNS(SVG_NS, tagName);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

function participantId(participant) {
  return String(participant?.userId || participant?.user_id || "").trim();
}

function nameFor(state, item) {
  const userId = participantId(item);
  return state.getParticipantName?.(userId)
    || item?.name
    || item?.username
    || state.participants?.find((participant) => participantId(participant) === userId)?.name
    || userId
    || "成员";
}

function avatar(documentTarget, state, item) {
  const name = nameFor(state, item);
  const wrapper = text(documentTarget, "span", "", "mood-author-avatar");
  const url = state.getParticipantAvatar?.(participantId(item)) || "";
  if (url) {
    const image = documentTarget.createElement("img");
    image.src = url;
    image.alt = `${name}的头像`;
    wrapper.append(image);
  } else {
    wrapper.textContent = [...name][0] || "?";
  }
  return wrapper;
}

function moodAsset(documentTarget, mood, shape, getMoodAsset, className = "") {
  const wrapper = text(documentTarget, "span", "", `mood-summary-asset ${className}`.trim());
  wrapper.setAttribute("aria-hidden", "true");
  const image = documentTarget.createElement("img");
  image.src = getMoodAsset?.(mood, shape) || "";
  image.alt = "";
  image.decoding = "async";
  const fallback = text(documentTarget, "span", "素材暂不可用", "mood-asset-error");
  fallback.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    fallback.hidden = false;
  }, { once: true });
  wrapper.append(image, fallback);
  return wrapper;
}

function summarySignature(summary) {
  return (summary?.jarItems || []).map((item) => [item.entryId, item.dateKey, item.mood, item.shape, item.x, item.y, item.rotate].join(":"))
    .join("|");
}

function trendSignature(summary, state) {
  return (summary?.trendSeries || []).map((series) => `${series.userId}:${series.shape}:${nameFor(state, series)}:${series.points.map((point) => `${point.entryId}:${point.dateKey}:${point.mood}:${point.level}:${point.shape}`).join(",")}`).join("|");
}

function finalJarTransform(item) {
  return `translate(-50%, -50%) rotate(${item.rotate}deg) scale(${item.scale})`;
}

function mouthJarTransform(item) {
  return `translate(-50%, -175%) rotate(${item.rotate - 12}deg) scale(${Math.max(0.72, item.scale - 0.12)})`;
}

function isReducedMotion(windowTarget) {
  return Boolean(windowTarget?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function animateJarNode(node, item, { delay = 0, reduced = false, enabled = false } = {}) {
  node.getAnimations?.().forEach((animation) => animation.cancel());
  node.style.removeProperty("opacity");
  node.style.removeProperty("transform");
  if (!enabled || reduced || typeof node.animate !== "function") return;
  const animation = node.animate([
    { opacity: 0, transform: mouthJarTransform(item) },
    { opacity: 1, transform: finalJarTransform(item) },
  ], {
    duration: 480,
    delay,
    easing: "cubic-bezier(0.2, 0.78, 0.24, 1)",
    fill: "both",
  });
  animation.onfinish = () => {
    animation.cancel();
    node.style.removeProperty("opacity");
    node.style.removeProperty("transform");
  };
}

function animateJarRemoval(node, reduced) {
  node.getAnimations?.().forEach((animation) => animation.cancel());
  if (reduced || typeof node.animate !== "function") {
    node.remove();
    return;
  }
  const animation = node.animate([
    { opacity: 1, transform: node.style.transform || "translate(-50%, -50%)" },
    { opacity: 0, transform: "translate(-50%, -62%) scale(0.82)" },
  ], { duration: 180, easing: "ease-in" });
  animation.onfinish = () => node.remove();
}

function createJarNode(documentTarget, item, getMoodAsset) {
  const node = text(documentTarget, "span", "", `mood-jar-item is-${item.shape}`);
  node.dataset.moodJarItemId = item.entryId;
  node.append(moodAsset(documentTarget, item.mood, item.shape, getMoodAsset, "mood-jar-asset"));
  return node;
}

function updateJarNode(node, item, documentTarget, getMoodAsset) {
  node.className = `mood-jar-item is-${item.shape}`;
  node.dataset.moodJarItemId = item.entryId;
  node.style.setProperty("--jar-x", `${item.x}%`);
  node.style.setProperty("--jar-y", `${item.y}%`);
  node.style.setProperty("--jar-rotation", `${item.rotate}deg`);
  node.style.setProperty("--jar-scale", item.scale);
  node.title = `${item.dateKey}，${item.moodLabel}`;
  const image = node.querySelector("img");
  const imageSrc = getMoodAsset?.(item.mood, item.shape) || "";
  if (!image || image.getAttribute("src") !== imageSrc) {
    node.replaceChildren(moodAsset(documentTarget, item.mood, item.shape, getMoodAsset, "mood-jar-asset"));
  }
}

function dayCountFor(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 31;
}

function dateLabel(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function trendY(level) {
  if (level >= 2) return TREND_LAYOUT.highY;
  if (level <= 0) return TREND_LAYOUT.lowY;
  return TREND_LAYOUT.steadyY;
}

function trendX(day, dayCount) {
  const plotWidth = TREND_LAYOUT.width - TREND_LAYOUT.left - TREND_LAYOUT.right;
  return TREND_LAYOUT.left + ((Math.max(1, day) - 1) / Math.max(1, dayCount - 1)) * plotWidth;
}

function makeTrendPath(segment, dayCount) {
  return segment.map((point, index) => `${index ? "L" : "M"} ${trendX(point.day, dayCount).toFixed(2)} ${trendY(point.level)}`).join(" ");
}

function isCompactTrend(windowTarget) {
  return Number(windowTarget?.innerWidth || 0) <= 700;
}

function appendTrendAxis(documentTarget, svg, dayCount, compact, getMoodAsset) {
  const levels = [
    { key: "high", label: "高涨", mood: "happy", y: TREND_LAYOUT.highY },
    { key: "steady", label: "平稳", mood: "calm", y: TREND_LAYOUT.steadyY },
    { key: "low", label: "低落", mood: "sad", y: TREND_LAYOUT.lowY },
  ];
  const plotRight = TREND_LAYOUT.width - TREND_LAYOUT.right;
  for (const level of levels) {
    svg.append(svgElement(documentTarget, "line", {
      class: "mood-trend-gridline",
      x1: TREND_LAYOUT.left,
      x2: plotRight,
      y1: level.y,
      y2: level.y,
    }));
    const image = svgElement(documentTarget, "image", {
      class: "mood-trend-axis-asset",
      x: 8,
      y: level.y - 11,
      width: 22,
      height: 22,
      "aria-hidden": "true",
    });
    image.setAttribute("href", getMoodAsset?.(level.mood, "circle") || "");
    svg.append(image, svgElement(documentTarget, "text", {
      class: "mood-trend-axis-label",
      x: 36,
      y: level.y + 4,
    }));
    svg.lastChild.textContent = level.label;
  }
  const tickDays = compact
    ? [...new Set([1, 5, 10, 15, 20, 25, dayCount])]
    : [...new Set([1, 5, 10, 15, 20, 25, 30, dayCount])];
  for (const day of tickDays.filter((value) => value <= dayCount)) {
    const x = trendX(day, dayCount);
    svg.append(
      svgElement(documentTarget, "line", { class: "mood-trend-tick", x1: x, x2: x, y1: TREND_LAYOUT.lowY + 8, y2: TREND_LAYOUT.lowY + 14 }),
      (() => {
        const label = svgElement(documentTarget, "text", { class: "mood-trend-date-label", x, y: TREND_LAYOUT.lowY + 34, "text-anchor": "middle" });
        label.textContent = String(day);
        return label;
      })(),
    );
  }
  svg.append(svgElement(documentTarget, "text", { class: "mood-trend-axis-caption", x: plotRight, y: TREND_LAYOUT.lowY + 34, "text-anchor": "end" }));
  svg.lastChild.textContent = "日";
}

function buildTrendSummary(state, summary) {
  const parts = (summary?.trendSeries || []).map((series) => {
    const name = nameFor(state, series);
    if (!series.points.length) return `${name}本月暂无记录`;
    const levels = [...new Set(series.points.map((point) => point.levelLabel))].join("、");
    return `${name}记录 ${series.points.length} 天，包含${levels}状态`;
  });
  return parts.length ? `按日记录：${parts.join("；")}。` : "这个月还没有趋势数据，记录一条心情后就会显示。";
}

function trendPointLabel(state, series, point) {
  return `${dateLabel(point.dateKey)}，${nameFor(state, series)}：${point.moodLabel}，${point.levelLabel}`;
}

function renderTrendDetails(documentTarget, details, summary, state) {
  if (!details) return;
  const byDate = new Map();
  for (const series of summary?.trendSeries || []) {
    for (const point of series.points) {
      const entries = byDate.get(point.dateKey) || [];
      entries.push({ ...point, name: nameFor(state, series) });
      byDate.set(point.dateKey, entries);
    }
  }
  const list = documentTarget.createElement("ol");
  list.className = "mood-trend-data-list";
  for (const [dateKey, entries] of [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const item = documentTarget.createElement("li");
    item.append(text(documentTarget, "strong", dateLabel(dateKey), "mood-trend-data-date"));
    const values = text(documentTarget, "span", "", "mood-trend-data-values");
    for (const entry of entries.sort((left, right) => participantId(left).localeCompare(participantId(right)))) {
      values.append(text(documentTarget, "span", `${entry.name}：${entry.moodLabel}（${entry.levelLabel}）`));
    }
    item.append(values);
    list.append(item);
  }
  details.replaceChildren(list);
}

export function createMoodMonthSummaryView({
  elements = {},
  getParticipantName,
  getParticipantAvatar,
  getMoodAsset,
  windowTarget = globalThis.window,
} = {}) {
  let bound = false;
  let lastJarSignature = null;
  let lastTrendSignature = null;
  let lastAnimationKey = "";
  const pointLookup = new Map();

  function renderJar(state, summary) {
    if (!elements.moodJarItems) return;
    const documentTarget = elements.moodJarItems.ownerDocument;
    const items = summary?.jarItems || [];
    const signature = summarySignature(summary);
    if (signature === lastJarSignature) return;
    const existing = new Map([...elements.moodJarItems.children].map((node) => [node.dataset.moodJarItemId, node]));
    const reduce = isReducedMotion(windowTarget);
    const animationMode = state.monthRenderReason;
    const animationKey = `${summary?.monthKey || ""}:${animationMode}:${state.changedEntryId || ""}:${signature}`;
    const animateAll = ["initial", "month-change"].includes(animationMode) && Boolean(items.length) && animationKey !== lastAnimationKey;
    const animateChanged = animationMode === "mutation" && Boolean(state.changedEntryId) && animationKey !== lastAnimationKey;
    if (animateAll || animateChanged) lastAnimationKey = animationKey;
    for (const item of items) {
      const node = existing.get(item.entryId) || createJarNode(documentTarget, item, getMoodAsset);
      updateJarNode(node, item, documentTarget, getMoodAsset);
      elements.moodJarItems.append(node);
      const shouldAnimate = animateAll || (animateChanged && item.entryId === state.changedEntryId);
      animateJarNode(node, item, { delay: animateAll ? Math.min(620, item.slotIndex * 14) : 0, reduced: reduce, enabled: shouldAnimate });
      existing.delete(item.entryId);
    }
    for (const [entryId, node] of existing) {
      const shouldFade = animationMode === "mutation" && entryId === state.changedEntryId;
      if (shouldFade) animateJarRemoval(node, reduce);
      else node.remove();
    }
    elements.moodJarItems.classList.toggle("is-empty", !items.length);
    lastJarSignature = signature;
  }

  function renderDominant(state, summary) {
    if (!elements.moodDominantList) return;
    const documentTarget = elements.moodDominantList.ownerDocument;
    const items = summary?.dominantByUser || [];
    if (!items.length) {
      elements.moodDominantList.replaceChildren(text(documentTarget, "p", "还没有家庭成员记录心情。", "mood-empty-state"));
      return;
    }
    elements.moodDominantList.replaceChildren(...items.map((item) => {
      const name = nameFor(state, item);
      const card = text(documentTarget, "article", "", `mood-dominant-card is-${item.shape}`);
      card.append(avatar(documentTarget, state, item));
      const body = text(documentTarget, "div", "", "mood-dominant-body");
      const header = text(documentTarget, "div", "", "mood-dominant-header");
      header.append(text(documentTarget, "strong", name), text(documentTarget, "span", `${item.totalCount} 条记录`, "mood-dominant-total"));
      body.append(header);
      if (item.mood) {
        const value = text(documentTarget, "div", "", "mood-dominant-value");
        value.append(moodAsset(documentTarget, item.mood, item.shape, getMoodAsset), text(documentTarget, "strong", item.moodLabel), text(documentTarget, "span", `×${item.count}`, "mood-dominant-count"));
        body.append(value);
      } else {
        body.append(text(documentTarget, "p", "本月还没有记录", "mood-dominant-empty"));
      }
      card.append(body);
      return card;
    }));
  }

  function showPoint(target) {
    const pointId = target?.getAttribute?.("data-mood-trend-point");
    const item = pointLookup.get(pointId);
    if (!item || !elements.moodTrendTooltip) return;
    elements.moodTrendTooltip.textContent = `${dateLabel(item.point.dateKey)}，${item.name}：${item.point.moodLabel}（${item.point.levelLabel}）`;
    elements.moodTrendTooltip.hidden = false;
  }

  function renderTrend(state, summary) {
    if (!elements.moodTrendChart) return;
    const signature = trendSignature(summary, state);
    if (signature === lastTrendSignature) return;
    const documentTarget = elements.moodTrendChart.ownerDocument;
    const series = summary?.trendSeries || [];
    const hasData = series.some((item) => item.points.length);
    const dayCount = dayCountFor(summary?.monthKey);
    const compact = isCompactTrend(windowTarget);
    elements.moodTrendLegend?.replaceChildren(...series.map((item, index) => {
      const legend = text(documentTarget, "span", "", `mood-trend-legend-item series-${index}`);
      const swatch = text(documentTarget, "i", "", `mood-trend-swatch ${item.shape === "square" ? "is-square" : "is-circle"}`);
      const line = text(documentTarget, "i", "", `mood-trend-line-swatch ${index === 0 ? "is-solid" : "is-dashed"}`);
      legend.append(line, swatch, text(documentTarget, "span", nameFor(state, item)));
      return legend;
    }));
    if (elements.moodTrendEmpty) elements.moodTrendEmpty.hidden = hasData;
    elements.moodTrendChart.hidden = !hasData;
    elements.moodTrendPointControls?.replaceChildren();
    if (elements.moodTrendSummary) elements.moodTrendSummary.textContent = buildTrendSummary(state, summary);
    pointLookup.clear();
    if (!hasData) {
      elements.moodTrendTooltip && (elements.moodTrendTooltip.hidden = true);
      renderTrendDetails(documentTarget, elements.moodTrendDetailsContent, summary, state);
      lastTrendSignature = signature;
      return;
    }
    elements.moodTrendChart.replaceChildren();
    appendTrendAxis(documentTarget, elements.moodTrendChart, dayCount, compact, getMoodAsset);
    for (const [index, item] of series.entries()) {
      for (const segment of item.segments || []) {
        if (segment.length < 2) continue;
        const path = svgElement(documentTarget, "path", {
          class: `mood-trend-line series-${index} ${index === 0 ? "is-solid" : "is-dashed"}`,
          d: makeTrendPath(segment, dayCount),
        });
        path.style.setProperty("--trend-color", TREND_COLORS[index] || TREND_COLORS[0]);
        elements.moodTrendChart.append(path);
      }
      for (const point of item.points) {
        const pointId = `${item.userId}:${point.entryId}`;
        const group = svgElement(documentTarget, "g", {
          class: `mood-trend-point series-${index} is-${point.shape}`,
        });
        const x = trendX(point.day, dayCount);
        const y = trendY(point.level);
        const label = trendPointLabel(state, item, point);
        group.append(svgElement(documentTarget, "circle", {
          class: "mood-trend-hit",
          cx: x,
          cy: y,
          r: 22,
          "data-mood-trend-point": pointId,
          tabindex: 0,
          role: "button",
          focusable: "true",
          "aria-describedby": "moodTrendTooltip",
          "aria-label": label,
        }));
        if (point.shape === "square") group.append(svgElement(documentTarget, "rect", { class: "mood-trend-visible-point", x: x - 5, y: y - 5, width: 10, height: 10, rx: 2 }));
        else group.append(svgElement(documentTarget, "circle", { class: "mood-trend-visible-point", cx: x, cy: y, r: 5 }));
        elements.moodTrendChart.append(group);
        if (elements.moodTrendPointControls) {
          const documentButton = text(documentTarget, "button", label, "mood-trend-point-control");
          documentButton.type = "button";
          documentButton.dataset.moodTrendPoint = pointId;
          documentButton.setAttribute("aria-label", label);
          documentButton.setAttribute("aria-describedby", "moodTrendTooltip");
          elements.moodTrendPointControls.append(documentButton);
        }
        pointLookup.set(pointId, { point, name: nameFor(state, item) });
      }
    }
    renderTrendDetails(documentTarget, elements.moodTrendDetailsContent, summary, state);
    lastTrendSignature = signature;
  }

  function render(state) {
    const summary = state.monthSummary || { monthKey: state.currentMonthKey, total: 0, jarItems: [], dominantByUser: [], trendSeries: [], textSummary: "这个月还没有心情记录。" };
    if (elements.moodJarCount) elements.moodJarCount.textContent = `${summary.total || 0} 条记录`;
    if (elements.moodJarSummary) elements.moodJarSummary.textContent = summary.textSummary || "这个月还没有心情记录。";
    if (elements.moodJarSync) {
      elements.moodJarSync.hidden = !state.monthSyncing;
      elements.moodJarSync.textContent = state.monthSyncing ? "正在同步" : "";
    }
    elements.moodJarStage?.classList.toggle("is-loading", Boolean(state.monthSyncing && !summary.total));
    renderJar(state, summary);
    renderDominant({ ...state, getParticipantName, getParticipantAvatar }, summary);
    renderTrend({ ...state, getParticipantName, getParticipantAvatar }, summary);
  }

  function bind() {
    if (bound || !elements.moodTrendChart) return;
    bound = true;
    const bindPointInteractions = (target) => {
      target.addEventListener("pointerover", (event) => {
        const point = event.target.closest?.("[data-mood-trend-point]");
        if (point) showPoint(point);
      });
      target.addEventListener("focusin", (event) => {
        const point = event.target.closest?.("[data-mood-trend-point]");
        if (point) showPoint(point);
      });
      target.addEventListener("click", (event) => {
        const point = event.target.closest?.("[data-mood-trend-point]");
        if (point) showPoint(point);
      });
      target.addEventListener("keydown", (event) => {
        const point = event.target.closest?.("[data-mood-trend-point]");
        if (!point) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showPoint(point);
        } else if (event.key === "Escape" && elements.moodTrendTooltip) {
          elements.moodTrendTooltip.hidden = true;
        }
      });
    };
    bindPointInteractions(elements.moodTrendChart);
    if (elements.moodTrendPointControls) bindPointInteractions(elements.moodTrendPointControls);
  }

  return Object.freeze({ bind, render });
}

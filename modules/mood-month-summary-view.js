import { buildMoodJarAnimationPlan, getMoodTrendLayout, getMoodTrendX } from "./mood-month-summary-domain.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const TREND_COLORS = Object.freeze([
  "var(--mood-trend-primary)",
  "var(--mood-trend-secondary)",
]);
const JAR_MOUTH = Object.freeze({ x: 180 / 360, y: 52 / 440 });
const JAR_FINAL_MOTION = "translate3d(0px, 0px, 0px)";

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
  return (summary?.jarItems || []).map((item) => [item.entryId, item.dateKey, item.mood, item.shape, item.x, item.y, item.rotate, item.scale].join(":"))
    .join("|");
}

function trendSignature(summary, state) {
  return (summary?.trendSeries || []).map((series) => `${series.userId}:${series.shape}:${nameFor(state, series)}:${series.points.map((point) => `${point.entryId}:${point.dateKey}:${point.mood}:${point.level}:${point.shape}`).join(",")}`).join("|");
}

function isReducedMotion(windowTarget) {
  return Boolean(windowTarget?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function jarMotionNode(node) {
  return node?.querySelector?.(".mood-jar-motion");
}

function cancelAnimations(node) {
  node?.getAnimations?.().forEach((animation) => animation.cancel());
}

function setJarNodeFinal(node) {
  const motion = jarMotionNode(node);
  if (!motion) return;
  cancelAnimations(motion);
  motion.style.opacity = "1";
  motion.style.transform = JAR_FINAL_MOTION;
}

function jarMouthDelta(stageRect, item) {
  const mouthX = stageRect.width * JAR_MOUTH.x;
  const mouthY = stageRect.height * JAR_MOUTH.y;
  const slotX = stageRect.width * item.x / 100;
  const slotY = stageRect.height * item.y / 100;
  return { x: mouthX - slotX, y: mouthY - slotY };
}

function translate3d(x, y) {
  return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0px)`;
}

function jarMouthTransform(stageRect, item) {
  const { x, y } = jarMouthDelta(stageRect, item);
  return translate3d(x, y);
}

function jarBounceTransform(stageRect, item) {
  const { x, y } = jarMouthDelta(stageRect, item);
  return `${translate3d(x * 0.08, y * 0.08)} scale(1.04)`;
}

function setJarNodePrepared(node, item, stageRect, kind = "enter") {
  const motion = jarMotionNode(node);
  if (!motion) return;
  if (kind === "edit") {
    setJarNodeFinal(node);
    return;
  }
  cancelAnimations(motion);
  motion.style.opacity = "0";
  motion.style.transform = `${jarMouthTransform(stageRect, item)} rotate(${item.rotate - 12}deg) scale(${Math.max(0.72, item.scale - 0.12)})`;
}

function setJarNodeWaiting(node, item) {
  const motion = jarMotionNode(node);
  if (!motion) return;
  cancelAnimations(motion);
  motion.style.opacity = "0";
  motion.style.transform = `translate3d(0px, -48px, 0px) rotate(${item.rotate - 12}deg) scale(${Math.max(0.72, item.scale - 0.12)})`;
}

function animateJarNode(node, item, { stageRect, delay = 0, duration = 1050, reduced = false, enabled = false, kind = "auto-enter", onFinish } = {}) {
  const motion = jarMotionNode(node);
  if (!motion) return;
  cancelAnimations(motion);
  if (!enabled || reduced || typeof motion.animate !== "function") {
    setJarNodeFinal(node);
    onFinish?.();
    return;
  }
  const keyframes = kind === "edit"
    ? [
      { opacity: 1, transform: "translate3d(0px, 0px, 0px) scale(0.94)" },
      { opacity: 0.45, transform: "translate3d(0px, 0px, 0px) scale(1.04)" },
      { opacity: 1, transform: JAR_FINAL_MOTION },
    ]
    : [
      { opacity: 0, transform: `${jarMouthTransform(stageRect, item)} rotate(${item.rotate - 12}deg) scale(${Math.max(0.72, item.scale - 0.12)})` },
      { offset: 0.58, opacity: 0.84, transform: `${jarBounceTransform(stageRect, item)} rotate(${item.rotate - 3}deg)` },
      { offset: 0.78, opacity: 1, transform: `${jarBounceTransform(stageRect, item)} rotate(${item.rotate}deg) scale(1.02)` },
      { offset: 0.9, opacity: 1, transform: "translate3d(0px, 0px, 0px) scale(1.04)" },
      { opacity: 1, transform: JAR_FINAL_MOTION },
    ];
  const animation = motion.animate(keyframes, {
    duration: kind === "edit" ? 180 : duration,
    delay,
    easing: "cubic-bezier(0.2, 0.78, 0.24, 1)",
    fill: "both",
  });
  animation.onfinish = () => {
    animation.cancel();
    setJarNodeFinal(node);
    onFinish?.();
  };
}

function animateJarRemoval(node, reduced) {
  const motion = jarMotionNode(node);
  if (!motion) {
    node.remove();
    return;
  }
  cancelAnimations(motion);
  if (reduced || typeof motion.animate !== "function") {
    node.remove();
    return;
  }
  const animation = motion.animate([
    { opacity: 1, transform: JAR_FINAL_MOTION },
    { opacity: 0, transform: "translate3d(0px, -8px, 0px) scale(0.82)" },
  ], { duration: 180, easing: "ease-in" });
  animation.onfinish = () => node.remove();
}

function createJarNode(documentTarget, item, getMoodAsset) {
  const node = text(documentTarget, "span", "", `mood-jar-item is-${item.shape}`);
  node.dataset.moodJarItemId = item.entryId;
  const motion = text(documentTarget, "span", "", "mood-jar-motion");
  motion.append(moodAsset(documentTarget, item.mood, item.shape, getMoodAsset, "mood-jar-asset"));
  node.append(motion);
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
  const motion = jarMotionNode(node);
  const image = motion?.querySelector("img");
  const imageSrc = getMoodAsset?.(item.mood, item.shape) || "";
  if (!image || image.getAttribute("src") !== imageSrc) {
    motion?.replaceChildren(moodAsset(documentTarget, item.mood, item.shape, getMoodAsset, "mood-jar-asset"));
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

function trendY(level, layout) {
  if (level >= 2) return layout.highY;
  if (level <= 0) return layout.lowY;
  return layout.steadyY;
}

function makeTrendPath(segment, dayCount, layout) {
  return segment.points.map((point, index) => `${index ? "L" : "M"} ${getMoodTrendX(layout, point.day, dayCount).toFixed(2)} ${trendY(point.level, layout)}`).join(" ");
}

function isCompactTrend(windowTarget) {
  const width = Number(windowTarget?.innerWidth || 0);
  const height = Number(windowTarget?.innerHeight || 0);
  return width <= 700 || (height <= 700 && width > height);
}

function appendTrendAxis(documentTarget, svg, layout, dayCount, getMoodAsset) {
  const levels = [
    { key: "high", label: "高涨", mood: "happy", y: layout.highY },
    { key: "steady", label: "平稳", mood: "calm", y: layout.steadyY },
    { key: "low", label: "低落", mood: "sad", y: layout.lowY },
  ];
  const plotRight = layout.plotRight;
  for (const level of levels) {
    svg.append(svgElement(documentTarget, "line", {
      class: "mood-trend-gridline",
      x1: layout.plotLeft,
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
  const tickDays = layout.mode === "recorded-days"
    ? layout.recordedDays
    : [...new Set([1, 5, 10, 15, 20, 25, 30, dayCount])];
  for (const day of tickDays.filter((value) => value <= dayCount)) {
    const x = getMoodTrendX(layout, day, dayCount);
    svg.append(
      svgElement(documentTarget, "line", { class: "mood-trend-tick", x1: x, x2: x, y1: layout.lowY + 8, y2: layout.lowY + 14 }),
      (() => {
        const label = svgElement(documentTarget, "text", { class: "mood-trend-date-label", x, y: layout.lowY + 34, "text-anchor": "middle" });
        label.textContent = String(day);
        return label;
      })(),
    );
  }
  svg.append(svgElement(documentTarget, "text", { class: "mood-trend-axis-caption", x: plotRight, y: layout.lowY + 34, "text-anchor": "end" }));
  svg.lastChild.textContent = "日";
}

function buildTrendSummary(state, summary, layout) {
  const parts = (summary?.trendSeries || []).map((series) => {
    const name = nameFor(state, series);
    if (!series.points.length) return `${name}本月暂无记录`;
    const levels = [...new Set(series.points.map((point) => point.levelLabel))].join("、");
    return `${name}记录 ${series.points.length} 天，包含${levels}状态`;
  });
  if (!parts.length) return "这个月还没有趋势数据，记录一条心情后就会显示。";
  const prefix = layout?.mode === "recorded-days" ? "记录较少，按有记录日期等距展开；" : "按日记录：";
  return `${prefix}${parts.join("；")}。`;
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
  let jarObserver = null;
  let jarVisibilityKnown = false;
  let jarInViewport = false;
  let pendingJarAnimation = null;
  let jarAnimationRunId = 0;
  let jarAnimationFrameId = null;
  let currentSummary = null;
  const pointLookup = new Map();

  function isJarStageVisible() {
    const stage = elements.moodJarStage;
    const viewportHeight = Number(windowTarget?.innerHeight || stage?.ownerDocument?.documentElement?.clientHeight || 0);
    if (!stage || !viewportHeight) return false;
    const rect = stage.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
    return rect.height > 0 && visibleHeight / rect.height >= 0.35;
  }

  function canPlayJarAnimation() {
    return jarVisibilityKnown && jarInViewport;
  }

  function setJarReplayStatus(message) {
    if (elements.moodJarReplayStatus) elements.moodJarReplayStatus.textContent = message;
  }

  function setJarBusy(isBusy) {
    if (!elements.moodJarStage) return;
    elements.moodJarStage.setAttribute("aria-busy", String(Boolean(isBusy)));
  }

  function cancelJarAnimations() {
    jarAnimationRunId += 1;
    if (jarAnimationFrameId !== null) {
      windowTarget?.cancelAnimationFrame?.(jarAnimationFrameId);
      jarAnimationFrameId = null;
    }
    setJarBusy(false);
    elements.moodJarItems?.querySelectorAll(".mood-jar-motion").forEach((node) => cancelAnimations(node));
  }

  function finishJarAnimation(pending) {
    if (!pending || pending.runId !== jarAnimationRunId) return;
    pending.completed += 1;
    if (pending.completed < pending.entries.length) return;
    pending.entries.forEach(({ node }) => setJarNodeFinal(node));
    pendingJarAnimation = null;
    lastAnimationKey = pending.key;
    setJarBusy(false);
    if (pending.manual) setJarReplayStatus(`本月 ${pending.entries.length} 条心情已重新播放完成。`);
  }

  function playPendingJarAnimation() {
    if (!pendingJarAnimation) return;
    const pending = pendingJarAnimation;
    const reduce = isReducedMotion(windowTarget);
    if (reduce || (!pending.force && !jarObserver && !canPlayJarAnimation())) {
      pending.entries.forEach(({ node }) => setJarNodeFinal(node));
      pendingJarAnimation = null;
      lastAnimationKey = pending.key;
      setJarBusy(false);
      if (pending.manual) setJarReplayStatus(reduce ? "已显示本月心情；系统已启用减少动态效果。" : `本月 ${pending.entries.length} 条心情已显示。`);
      return;
    }
    if (!pending.force && jarObserver && !canPlayJarAnimation()) return;
    if (!pending.force && !canPlayJarAnimation()) return;
    if (pending.started) return;
    const stageRect = elements.moodJarStage?.getBoundingClientRect();
    if (!stageRect?.width || !stageRect.height) {
      pending.entries.forEach(({ node }) => setJarNodeFinal(node));
      pendingJarAnimation = null;
      lastAnimationKey = pending.key;
      setJarBusy(false);
      if (pending.manual) setJarReplayStatus(`本月 ${pending.entries.length} 条心情已显示。`);
      return;
    }
    pending.started = true;
    const start = () => {
      jarAnimationFrameId = null;
      if (pending.runId !== jarAnimationRunId || pendingJarAnimation !== pending) return;
      pending.entries.forEach(({ node, item, delay, duration, kind }) => animateJarNode(node, item, {
        stageRect,
        delay,
        duration,
        kind,
        reduced: false,
        enabled: true,
        onFinish: () => finishJarAnimation(pending),
      }));
      if (!pending.entries.length) finishJarAnimation(pending);
    };
    if (typeof windowTarget?.requestAnimationFrame === "function") jarAnimationFrameId = windowTarget.requestAnimationFrame(start);
    else start();
  }

  function ensureJarObserver() {
    const stage = elements.moodJarStage;
    if (!stage || jarObserver || jarVisibilityKnown) return;
    const Observer = windowTarget?.IntersectionObserver || globalThis?.IntersectionObserver;
    if (typeof Observer !== "function") {
      jarVisibilityKnown = true;
      jarInViewport = isJarStageVisible();
      return;
    }
    jarObserver = new Observer((entries) => {
      const entry = entries.find(({ target }) => target === stage);
      if (!entry) return;
      jarVisibilityKnown = true;
      jarInViewport = Boolean(entry.isIntersecting && entry.intersectionRatio >= 0.35);
      if (jarInViewport) playPendingJarAnimation();
    }, { threshold: [0, 0.35], rootMargin: "0px 0px -8% 0px" });
    jarObserver.observe(stage);
  }

  function renderJar(state, summary) {
    if (!elements.moodJarItems) return;
    ensureJarObserver();
    const documentTarget = elements.moodJarItems.ownerDocument;
    const items = summary?.jarItems || [];
    if (elements.moodJarStage) {
      elements.moodJarStage.dataset.jarDensity = items.length > 31 ? "dense" : items.length > 12 ? "medium" : "relaxed";
      elements.moodJarStage.setAttribute("aria-label", items.length ? `重新播放本月 ${items.length} 条心情落入瓶子的动画` : "重新播放本月心情落入瓶子的动画");
    }
    const signature = summarySignature(summary);
    const animationKey = `${summary?.monthKey || ""}:${signature}`;
    if (signature === lastJarSignature) {
      playPendingJarAnimation();
      return;
    }
    const existing = new Map([...elements.moodJarItems.children].map((node) => [node.dataset.moodJarItemId, node]));
    const reduce = isReducedMotion(windowTarget);
    const animationMode = state.monthRenderReason;
    const isNewAnimationKey = animationKey !== lastAnimationKey;
    const animateAll = Boolean(items.length) && isNewAnimationKey && (
      ["initial", "month-change"].includes(animationMode)
      || (!lastAnimationKey && !state.changedEntryId)
    );
    const animateChanged = animationMode === "mutation" && Boolean(state.changedEntryId) && isNewAnimationKey;
    const animationEntries = [];
    const animationPlan = buildMoodJarAnimationPlan(items.length);
    const stageRect = elements.moodJarStage?.getBoundingClientRect();
    cancelJarAnimations();
    pendingJarAnimation = null;
    for (const item of items) {
      const existingNode = existing.get(item.entryId);
      const node = existingNode || createJarNode(documentTarget, item, getMoodAsset);
      updateJarNode(node, item, documentTarget, getMoodAsset);
      elements.moodJarItems.append(node);
      const shouldAnimate = animateAll || (animateChanged && item.entryId === state.changedEntryId);
      if (shouldAnimate) {
        animationEntries.push({
          node,
          item,
          kind: animateAll ? "auto-enter" : existingNode ? "edit" : "mutation-enter",
          delay: animateAll ? animationPlan.entries[item.slotIndex]?.delay || 0 : 0,
          duration: animateAll ? animationPlan.entries[item.slotIndex]?.duration || 1050 : 180,
        });
        if (stageRect?.width && stageRect.height) setJarNodePrepared(node, item, stageRect, animateAll ? "enter" : existingNode ? "edit" : "enter");
        else setJarNodeWaiting(node, item);
      } else {
        setJarNodeFinal(node);
      }
      existing.delete(item.entryId);
    }
    for (const [entryId, node] of existing) {
      const shouldFade = animationMode === "mutation" && entryId === state.changedEntryId && !reduce && canPlayJarAnimation();
      if (shouldFade) animateJarRemoval(node, reduce);
      else {
        setJarNodeFinal(node);
        node.remove();
      }
    }
    elements.moodJarItems.classList.toggle("is-empty", !items.length);
    lastJarSignature = signature;
    if (animationEntries.length) {
      pendingJarAnimation = {
        key: animationKey,
        entries: animationEntries,
        completed: 0,
        started: false,
        runId: jarAnimationRunId,
        force: false,
        manual: false,
      };
      playPendingJarAnimation();
    } else if (items.length) {
      lastAnimationKey = animationKey;
    }
  }

  function replayJar() {
    const stage = elements.moodJarStage;
    const items = currentSummary?.jarItems || [];
    if (!stage) return;
    cancelJarAnimations();
    pendingJarAnimation = null;
    if (!items.length) {
      setJarReplayStatus("本月还没有可播放的心情记录。");
      return;
    }
    const plan = buildMoodJarAnimationPlan(items.length);
    const stageRect = stage.getBoundingClientRect();
    const entries = items.map((item, index) => {
      const node = elements.moodJarItems?.querySelector(`[data-mood-jar-item-id="${CSS.escape(item.entryId)}"]`);
      if (node && stageRect.width && stageRect.height) setJarNodePrepared(node, item, stageRect, "replay");
      return {
        node,
        item,
        delay: plan.entries[index]?.delay || 0,
        duration: plan.entries[index]?.duration || 1050,
        kind: "replay",
      };
    }).filter(({ node }) => node);
    const key = `${currentSummary.monthKey}:${summarySignature(currentSummary)}`;
    pendingJarAnimation = {
      key,
      entries,
      completed: 0,
      started: false,
      runId: jarAnimationRunId,
      force: true,
      manual: true,
    };
    setJarBusy(true);
    setJarReplayStatus(`正在重新播放本月 ${entries.length} 条心情…`);
    playPendingJarAnimation();
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
    const documentTarget = elements.moodTrendChart.ownerDocument;
    const series = summary?.trendSeries || [];
    const hasData = series.some((item) => item.points.length);
    const dayCount = dayCountFor(summary?.monthKey);
    const compact = isCompactTrend(windowTarget);
    const recordedDays = [...new Set(series.flatMap((item) => item.points.map((point) => point.day)))].sort((left, right) => left - right);
    const layout = getMoodTrendLayout({ compact, monthDays: dayCount, recordedDays });
    const signature = `${trendSignature(summary, state)}::${layout.width}:${layout.height}:${layout.mode}:${layout.recordedDays.join(",")}`;
    elements.moodTrendChart.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    elements.moodTrendChart.setAttribute("width", String(layout.width));
    elements.moodTrendChart.setAttribute("height", String(layout.height));
    elements.moodTrendChart.setAttribute("preserveAspectRatio", "none");
    elements.moodTrendChart.dataset.moodTrendMode = layout.mode;
    elements.moodTrendChart.dataset.moodTrendLayout = `${layout.width}x${layout.height}`;
    if (signature === lastTrendSignature) return;
    elements.moodTrendLegend?.replaceChildren(...series.map((item, index) => {
      const legend = text(documentTarget, "span", "", `mood-trend-legend-item series-${index}`);
      const swatch = text(documentTarget, "i", "", `mood-trend-swatch ${item.shape === "square" ? "is-square" : "is-circle"}`);
      const line = text(documentTarget, "i", "", `mood-trend-line-swatch ${index === 0 ? "is-solid" : "is-dashed"}`);
      legend.append(line, swatch, text(documentTarget, "span", nameFor(state, item)));
      return legend;
    }));
    if (elements.moodTrendEmpty) elements.moodTrendEmpty.hidden = hasData;
    elements.moodTrendChart.toggleAttribute("hidden", !hasData);
    elements.moodTrendPointControls?.replaceChildren();
    if (elements.moodTrendSummary) elements.moodTrendSummary.textContent = buildTrendSummary(state, summary, layout);
    pointLookup.clear();
    if (!hasData) {
      elements.moodTrendTooltip && (elements.moodTrendTooltip.hidden = true);
      renderTrendDetails(documentTarget, elements.moodTrendDetailsContent, summary, state);
      lastTrendSignature = signature;
      return;
    }
    elements.moodTrendChart.replaceChildren();
    appendTrendAxis(documentTarget, elements.moodTrendChart, layout, dayCount, getMoodAsset);
    for (const [index, item] of series.entries()) {
      for (const segment of item.segments || []) {
        if (segment.points.length < 2) continue;
        const isGap = segment.kind === "gap";
        const path = svgElement(documentTarget, "path", {
          class: `mood-trend-line series-${index} ${isGap ? "is-gap is-dashed" : index === 0 ? "is-solid" : "is-dashed"}`,
          d: makeTrendPath(segment, dayCount, layout),
        });
        path.style.setProperty("--trend-color", TREND_COLORS[index]);
        elements.moodTrendChart.append(path);
      }
      for (const point of item.points) {
        const pointId = `${item.userId}:${point.entryId}`;
        const group = svgElement(documentTarget, "g", {
          class: `mood-trend-point series-${index} is-${point.shape}`,
        });
        const x = getMoodTrendX(layout, point.day, dayCount);
        const y = trendY(point.level, layout);
        const label = trendPointLabel(state, item, point);
        group.append(svgElement(documentTarget, "circle", {
          class: "mood-trend-hit",
          cx: x,
          cy: y,
          r: 22,
          "data-mood-trend-point": pointId,
        }));
        group.style.setProperty("--trend-color", TREND_COLORS[index]);
        if (point.shape === "square") group.append(svgElement(documentTarget, "rect", {
          class: "mood-trend-visible-point",
          x: x - 7,
          y: y - 7,
          width: 14,
          height: 14,
          rx: 2,
        }));
        else group.append(svgElement(documentTarget, "circle", {
          class: "mood-trend-visible-point",
          cx: x,
          cy: y,
          r: 7,
        }));
        elements.moodTrendChart.append(group);
        if (elements.moodTrendPointControls) {
          const documentButton = text(documentTarget, "button", label, "mood-trend-point-control");
          documentButton.type = "button";
          documentButton.dataset.moodTrendPoint = pointId;
          documentButton.setAttribute("aria-label", label);
          documentButton.setAttribute("aria-describedby", "moodTrendTooltip");
          documentButton.style.setProperty("--mood-trend-point-x", `${x / layout.width * 100}%`);
          documentButton.style.setProperty("--mood-trend-point-y", `${y / layout.height * 100}%`);
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
    currentSummary = summary;
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
    ensureJarObserver();
    if (bound) return;
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
    if (elements.moodTrendChart) bindPointInteractions(elements.moodTrendChart);
    if (elements.moodTrendPointControls) bindPointInteractions(elements.moodTrendPointControls);
  }

  function destroy() {
    jarObserver?.disconnect?.();
    jarObserver = null;
    jarVisibilityKnown = false;
    jarInViewport = false;
    pendingJarAnimation = null;
    lastJarSignature = null;
    lastTrendSignature = null;
    lastAnimationKey = "";
    cancelJarAnimations();
    elements.moodJarItems?.querySelectorAll(".mood-jar-item").forEach((node) => setJarNodeFinal(node));
    currentSummary = null;
  }

  return Object.freeze({ bind, destroy, render, replayJar });
}

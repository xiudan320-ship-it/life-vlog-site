import "./copy-scout.css";
import { getCopyAccess, maximumCopyDifficulty } from "./copy-domain.js";
import { getCopyScout, referencePower } from "./copy-scout-domain.js";
import { element, picture } from "./visual-ui.js";
import { renderTrial } from "./trial-view.js";

function bindCopyPress(button, start, scout) {
  let timer, pointerId, startX, startY, lastScout = 0;
  const cancel = () => { clearTimeout(timer); timer = undefined; pointerId = undefined; };
  const showScout = () => { cancel(); lastScout = Date.now(); scout(); };
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    cancel(); lastScout = 0; pointerId = event.pointerId; startX = event.clientX; startY = event.clientY;
    timer = setTimeout(showScout, 500);
  });
  button.addEventListener("pointermove", (event) => {
    if (event.pointerId === pointerId && Math.hypot(event.clientX - startX, event.clientY - startY) > 10) cancel();
  });
  button.addEventListener("pointerup", cancel);
  button.addEventListener("pointercancel", cancel);
  button.addEventListener("pointerleave", cancel);
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (Date.now() - lastScout > 1000) showScout();
  });
  button.addEventListener("click", (event) => {
    if (event.detail && Date.now() - lastScout < 1000) { event.preventDefault(); return; }
    start();
  });
}

export function renderCopySelection({ content, state, catalog, settings, onStart, onScout, onClaim, onOffline }) {
  content.className = "monster-adventure-content";
  const previous = settings.progressAtStart;
  const previousChapter = previous && catalog.chapters.find((chapter) => chapter.id === previous.chapterId);
  const previousStage = previousChapter && Math.min(previousChapter.maxid, previousChapter.minid + previous.levelId - 1);
  const advanced = !settings.focusCopyId && settings.type === 1 && previous && previousStage === settings.lastCopyId
    && (state.progress.chapterId > previous.chapterId || state.progress.chapterId === previous.chapterId && state.progress.levelId > previous.levelId);
  settings.progressAtStart = undefined;
  if (advanced && state.progress.chapterId > previous.chapterId) {
    settings.chapterId = state.progress.chapterId; settings.scrollTop = undefined; settings.chapterScrollLeft = undefined;
  }
  const overview = element("div", undefined, "monster-adventure-overview");
  const hint = element("span", "点按挑战 · 长按查看详情");
  const offline = element("button", "选择离线挂机", "monster-idle-mode");
  offline.type = "button";
  let idleMode = false;
  function updateIdleMode() {
    offline.hidden = settings.type === 6;
    offline.setAttribute("aria-pressed", String(idleMode));
    offline.textContent = idleMode ? "取消选择" : "选择离线挂机";
    hint.textContent = idleMode ? ([2, 5].includes(settings.type) ? "点已通关 · 战败重试 · 每场耗卷轴" : "点已通关 · 战败自动重试") : "点按挑战 · 长按查看详情";
  }
  offline.onclick = () => { idleMode = !idleMode; settings.scrollTop = viewport.scrollTop; render(); };
  overview.append(element("strong", `当前战力 ${referencePower(state.player).toLocaleString("zh-CN")}`), hint, offline);
  const categories = element("nav", undefined, "monster-category-tabs");
  categories.setAttribute("aria-label", "冒险类型");
  const chapterRail = element("nav", undefined, "monster-chapter-rail");
  chapterRail.setAttribute("aria-label", "章节");
  const form = element("form", undefined, "monster-copy-settings");
  function select(label, values, selected) {
    const field = element("label", label);
    const input = element("select");
    input.setAttribute("aria-label", label);
    for (const { value, name, disabled = false } of values) {
      const option = element("option", name); option.value = value; option.disabled = disabled; input.append(option);
    }
    input.value = selected; field.append(input); form.append(field); return input;
  }
  const hard = select("地图难度", ["普通", "困难", "噩梦", "巅峰 I", "巅峰 II", "巅峰 III"].map((name, index) => ({ value: index + 1, name, disabled: index + 1 > maximumCopyDifficulty(state.player) })), settings.hard);
  const waves = select("地图波数", Array.from({ length: 10 + (state.player.extraWaves || 0) }, (_, index) => ({ value: index + 1, name: `${index + 1} 波` })), settings.waves);
  const autoLabel = element("label", undefined, "monster-auto-label");
  const auto = element("input"); auto.type = "checkbox"; auto.checked = settings.repeat;
  autoLabel.append(auto, element("span", "连续自动战斗")); form.append(autoLabel);
  const list = element("div", undefined, "monster-copy-list");
  const viewport = element("div", undefined, "monster-copy-viewport");
  viewport.setAttribute("aria-label", "关卡列表");
  viewport.tabIndex = 0;
  viewport.addEventListener("scroll", () => { settings.scrollTop = viewport.scrollTop; });
  chapterRail.addEventListener("scroll", () => { settings.chapterScrollLeft = chapterRail.scrollLeft; });
  const info = element("details", undefined, "monster-copy-info");
  info.append(element("summary", "冒险说明"), element("p", "地图首通固定普通单波。前台战斗战败保留已击杀收益并停止，不计通关或里程碑奖励；连续战斗需要保持游戏打开。离线挂机需选择已通关关卡，最长 20 小时，战败后自动重试；副本和深渊每次挑战消耗卷轴。试炼可逐层挑战并按累计积分结算奖励。"));
  for (const [type, name, icon] of [[1, "地图", "img_level.png"], [2, "副本", "main_btn_copy.png"], [5, "深渊", "main_btn_abyss.png"], [6, "试炼", "main_btn_achieve.png"], [3, "遭遇", "main_btn_god.png"]]) {
    const tab = element("button", undefined, "monster-category"); tab.type = "button"; tab.dataset.copyType = type; tab.setAttribute("aria-label", name);
    tab.append(picture("ui/btn/" + icon), element("span", name));
    tab.onclick = () => { settings.type = type; if (type === 6) idleMode = false; settings.scrollTop = undefined; render(); }; categories.append(tab);
  }
  settings.chapterId ||= state.progress.chapterId;
  for (const chapter of catalog.chapters) {
    const button = element("button", undefined, "monster-chapter"); button.type = "button"; button.dataset.chapterId = chapter.id;
    button.setAttribute("aria-label", `${chapter.name}，等级 ${chapter.minlevel} 至 ${chapter.maxlevel}${chapter.id > state.progress.chapterId ? "（未解锁）" : ""}`);
    const image = picture("icon/chapter/" + chapter.icon); image.loading = "lazy";
    button.append(image, element("strong", chapter.name), element("small", `Lv.${chapter.minlevel}–${chapter.maxlevel}`));
    if (chapter.id > state.progress.chapterId) button.append(picture("img/lock.png", "", "monster-chapter-lock"));
    button.onclick = () => { settings.chapterId = chapter.id; settings.scrollTop = undefined; render(); }; chapterRail.append(button);
  }
  viewport.append(list, info);
  content.append(overview, categories, chapterRail, form, viewport);
  form.onsubmit = (event) => event.preventDefault();
  form.onchange = () => { settings.hard = Number(hard.value); settings.waves = Number(waves.value); settings.repeat = auto.checked; settings.scrollTop = viewport.scrollTop; render(); };
  function render() {
    updateIdleMode();
    for (const tab of categories.children) tab.setAttribute("aria-pressed", String(Number(tab.dataset.copyType) === settings.type));
    for (const tab of chapterRail.children) tab.setAttribute("aria-current", String(Number(tab.dataset.chapterId) === settings.chapterId));
    chapterRail.hidden = settings.type !== 1;
    hard.parentElement.hidden = settings.type === 6;
    waves.parentElement.hidden = settings.type !== 1;
    autoLabel.hidden = settings.type === 6;
    list.replaceChildren();
    if (settings.type === 6) {
      list.style.height = ""; list.className = "monster-copy-list";
      renderTrial({ content: list, state, catalog, initialHard: settings.trialHard, onStart: (trialHard) => onScout(3101, { ...settings, repeat: false, trialHard, scrollTop: viewport.scrollTop, chapterScrollLeft: chapterRail.scrollLeft }), onClaim });
      viewport.scrollTop = settings.scrollTop || 0;
      return;
    }
    const chapter = catalog.chapters.find((row) => row.id === settings.chapterId);
    const rows = catalog.copies.filter((copy) => settings.type === 3 ? [3, 4].includes(copy.type)
      : copy.type === settings.type && (copy.type !== 1 || copy.id >= chapter.minid && copy.id <= chapter.maxid || copy.id === chapter.hideboss));
    const map = settings.type === 1;
    list.className = map ? "monster-copy-list monster-map" : "monster-copy-list monster-dungeon-grid";
    if (map) {
      const height = rows.length * 110 + 10;
      list.style.height = height + "px";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 100 ${height}`); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(svg.namespaceURI, "polyline");
      path.setAttribute("points", rows.map((_, i) => `${i % 2 ? 73 : 27},${i * 110 + 38}`).join(" "));
      svg.append(path); list.append(svg);
    } else list.style.height = "";
    rows.forEach((copy, index) => {
      const reason = getCopyAccess(copy, state, catalog.chapters);
      const scout = getCopyScout({ state, catalog, copy, settings });
      const row = element("div", undefined, "monster-copy-row");
      if (map) { row.style.left = index % 2 ? "73%" : "27%"; row.style.top = `${index * 110 + 8}px`; }
      const button = element("button", undefined, map ? "monster-map-node" : "monster-dungeon-card monster-original-panel");
      button.type = "button"; button.dataset.copyId = copy.id;
      if (reason) button.dataset.locked = "true";
      button.setAttribute("aria-label", `${copy.name}${reason ? `，${reason}` : idleMode ? "，选择离线挂机，长按查看详情" : "，点击挑战，长按查看详情"}`); button.title = reason || copy.name;
      const enemy = catalog.enemies.find((entry) => entry.id === copy.enemyid1);
      const image = picture("enemy/" + enemy.img, "", "monster-copy-enemy"); image.loading = "lazy"; button.append(image);
      if (reason) button.append(picture("img/lock.png", "", "monster-copy-lock"));
      button.append(element("strong", copy.name), element("small", reason || `${copy.level > 80 ? "巅峰 " + (copy.level - 80) : "Lv." + copy.level} · ${copy.copyprice ? "卷轴 ×" + copy.copyprice : "挑战"}`));
      button.append(element("small", scout.unavailable ? (copy.type === 4 ? "随机遭遇 · 暂无推荐" : "暂无推荐战力") : `推荐战力 ${scout.recommendedPower.toLocaleString("zh-CN")}`, "monster-copy-power"));
      const selected = () => ({ ...settings, lastCopyId: copy.id,
        progressAtStart: { chapterId: state.progress.chapterId, levelId: state.progress.levelId },
        scrollTop: viewport.scrollTop, chapterScrollLeft: chapterRail.scrollLeft });
      bindCopyPress(button, () => idleMode ? onOffline(copy.id, selected()) : onStart(copy.id, selected()), () => onScout(copy.id, selected()));
      const details = element("button", "ⓘ", "monster-copy-details");
      details.type = "button"; details.dataset.copyDetails = copy.id;
      details.setAttribute("aria-label", `查看${copy.name}的详情及战力对比`);
      details.onclick = () => onScout(copy.id, selected());
      row.append(button, details); list.append(row);
    });
    if (settings.scrollTop !== undefined) viewport.scrollTop = settings.scrollTop;
    else if (map && chapter.id === state.progress.chapterId) {
      const current = list.querySelector(`[data-copy-id="${Math.min(chapter.maxid, chapter.minid + state.progress.levelId - 1)}"]`);
      if (current) viewport.scrollTop = Math.max(0, current.closest(".monster-copy-row").offsetTop - viewport.clientHeight / 3);
    } else viewport.scrollTop = 0;
  }
  render();
  if (advanced && settings.chapterId === state.progress.chapterId) {
    const chapter = catalog.chapters.find((row) => row.id === settings.chapterId);
    const current = list.querySelector(`[data-copy-id="${Math.min(chapter.maxid, chapter.minid + state.progress.levelId - 1)}"]`);
    if (current) {
      const node = current.getBoundingClientRect(), box = viewport.getBoundingClientRect();
      if (node.bottom > box.bottom) viewport.scrollTop += node.bottom - box.bottom + 8;
      else if (node.top < box.top) viewport.scrollTop -= box.top - node.top + 8;
    }
  }
  if (settings.chapterScrollLeft !== undefined) chapterRail.scrollLeft = settings.chapterScrollLeft;
  else {
    const selectedChapter = chapterRail.querySelector(`[data-chapter-id="${settings.chapterId}"]`);
    if (selectedChapter) chapterRail.scrollLeft += selectedChapter.getBoundingClientRect().left - chapterRail.getBoundingClientRect().left - (chapterRail.clientWidth - selectedChapter.clientWidth) / 2;
  }
  if (settings.focusCopyId) {
    const button = list.querySelector(`[data-copy-id="${settings.focusCopyId}"]`)
      || (settings.type === 6 ? list.querySelector("[data-trial-claim]") : null);
    if (button) {
      button.classList.add("monster-copy-focused");
      button.scrollIntoView({ block: "center", inline: "nearest" });
      if (!button.disabled) button.focus({ preventScroll: true });
    }
    settings.focusCopyId = null;
  }
}

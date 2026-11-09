import { getCopyAccess, maximumCopyDifficulty } from "./copy-domain.js";
import { element, picture } from "./visual-ui.js";
import { renderTrial } from "./trial-view.js";

export function renderCopySelection({ content, state, catalog, settings, onStart, onClaim }) {
  content.className = "monster-adventure-content";
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
  const info = element("details", undefined, "monster-copy-info");
  info.append(element("summary", "冒险说明"), element("p", "地图首通固定普通单波。每场结算后保存，战败保留已击杀怪物的收益并停止，不计通关或里程碑奖励。连续战斗需要保持游戏打开，暂不支持离线挂机。试炼可逐层挑战并按累计积分结算奖励。"));
  for (const [type, name, icon] of [[1, "地图", "img_level.png"], [2, "副本", "main_btn_copy.png"], [5, "深渊", "main_btn_abyss.png"], [6, "试炼", "main_btn_achieve.png"], [3, "遭遇", "main_btn_god.png"]]) {
    const tab = element("button", undefined, "monster-category"); tab.type = "button"; tab.dataset.copyType = type; tab.setAttribute("aria-label", name);
    tab.append(picture("ui/btn/" + icon), element("span", name));
    tab.onclick = () => { settings.type = type; render(); }; categories.append(tab);
  }
  settings.chapterId ||= state.progress.chapterId;
  for (const chapter of catalog.chapters) {
    const button = element("button", undefined, "monster-chapter"); button.type = "button"; button.dataset.chapterId = chapter.id;
    button.setAttribute("aria-label", `${chapter.name}${chapter.id > state.progress.chapterId ? "（未解锁）" : ""}`);
    const image = picture("icon/chapter/" + chapter.icon); image.loading = "lazy";
    button.append(image, element("strong", chapter.name), element("small", `Lv.${chapter.minlevel}–${chapter.maxlevel}`));
    if (chapter.id > state.progress.chapterId) button.append(picture("img/lock.png", "", "monster-chapter-lock"));
      button.onclick = () => { settings.chapterId = chapter.id; settings.scrollTop = 0; render(); content.scrollTop = 0; }; chapterRail.append(button);
  }
  content.append(categories, chapterRail, form, list, info);
  form.onsubmit = (event) => event.preventDefault();
  form.onchange = () => { settings.hard = Number(hard.value); settings.waves = Number(waves.value); settings.repeat = auto.checked; };
  function render() {
    for (const tab of categories.children) tab.setAttribute("aria-pressed", String(Number(tab.dataset.copyType) === settings.type));
    for (const tab of chapterRail.children) tab.setAttribute("aria-current", String(Number(tab.dataset.chapterId) === settings.chapterId));
    chapterRail.hidden = settings.type !== 1;
    hard.parentElement.hidden = settings.type === 6;
    waves.parentElement.hidden = settings.type !== 1;
    autoLabel.hidden = settings.type === 6;
    list.replaceChildren();
    if (settings.type === 6) {
      list.style.height = ""; list.className = "monster-copy-list";
      renderTrial({ content: list, state, catalog, initialHard: settings.trialHard, onStart: (trialHard) => onStart(3101, { ...settings, repeat: false, trialHard }), onClaim });
      return;
    }
    const chapter = catalog.chapters.find((row) => row.id === settings.chapterId);
    const rows = catalog.copies.filter((copy) => settings.type === 3 ? [3, 4].includes(copy.type)
      : copy.type === settings.type && (copy.type !== 1 || copy.id >= chapter.minid && copy.id <= chapter.maxid || copy.id === chapter.hideboss));
    const map = settings.type === 1;
    list.className = map ? "monster-copy-list monster-map" : "monster-copy-list monster-dungeon-grid";
    if (map) {
      const height = rows.length * 142 + 30;
      list.style.height = height + "px";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 100 ${height}`); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(svg.namespaceURI, "polyline");
      path.setAttribute("points", rows.map((_, i) => `${i % 2 ? 73 : 27},${i * 142 + 64}`).join(" "));
      svg.append(path); list.append(svg);
    } else list.style.height = "";
    rows.forEach((copy, index) => {
      const reason = getCopyAccess(copy, state, catalog.chapters);
      const row = element("div", undefined, "monster-copy-row");
      if (map) { row.style.left = index % 2 ? "73%" : "27%"; row.style.top = `${index * 142 + 12}px`; }
      const button = element("button", undefined, map ? "monster-map-node" : "monster-dungeon-card monster-original-panel");
      button.type = "button"; button.disabled = Boolean(reason); button.dataset.copyId = copy.id;
      button.setAttribute("aria-label", `${copy.name}：${reason || "挑战"}`); button.title = reason || copy.name;
      const enemy = catalog.enemies.find((entry) => entry.id === copy.enemyid1);
      const image = picture("enemy/" + enemy.img, "", "monster-copy-enemy"); image.loading = "lazy"; button.append(image);
      if (reason) button.append(picture("img/lock.png", "", "monster-copy-lock"));
      button.append(element("strong", copy.name), element("small", reason || `${copy.level > 80 ? "巅峰 " + (copy.level - 80) : "Lv." + copy.level} · ${copy.copyprice ? "卷轴 ×" + copy.copyprice : "挑战"}`));
      button.onclick = () => onStart(copy.id, { ...settings, scrollTop: content.scrollTop, chapterScrollLeft: chapterRail.scrollLeft }); row.append(button); list.append(row);
    });
  }
  render();
  content.scrollTop = settings.scrollTop || 0;
  chapterRail.scrollLeft = settings.chapterScrollLeft || 0;
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

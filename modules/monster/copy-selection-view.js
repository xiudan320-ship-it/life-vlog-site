import { getCopyAccess, maximumCopyDifficulty } from "./copy-domain.js";

export function renderCopySelection({ content, state, catalog, settings, onStart }) {
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const form = element("form", undefined, "monster-copy-settings");
  function select(label, values, selected) {
    const field = element("label", label);
    const input = element("select");
    input.setAttribute("aria-label", label);
    for (const { value, name, disabled = false } of values) {
      const option = element("option", name); option.value = value; option.disabled = disabled;
      input.append(option);
    }
    input.value = selected;
    field.append(input); form.append(field);
    return input;
  }
  const category = select("冒险类型", [
    { value: 1, name: "地图关卡" }, { value: 2, name: "副本" },
    { value: 5, name: "深渊" }, { value: 6, name: "试炼（首层试玩）" }, { value: 3, name: "特殊遭遇" },
  ], settings.type);
  const chapter = select("章节", catalog.chapters.map((row) => ({ value: row.id, name: `${row.id}. ${row.name}${row.id > state.progress.chapterId ? "（未解锁）" : ""}` })), settings.chapterId || state.progress.chapterId);
  const hard = select("地图难度", ["普通", "困难", "噩梦", "巅峰 I", "巅峰 II", "巅峰 III"].map((name, index) => ({ value: index + 1, name, disabled: index + 1 > maximumCopyDifficulty(state.player) })), settings.hard);
  const waves = select("地图波数", Array.from({ length: 10 + (state.player.extraWaves || 0) }, (_, index) => ({ value: index + 1, name: `${index + 1} 波` })), settings.waves);
  const autoLabel = element("label", undefined, "monster-auto-label");
  const auto = element("input"); auto.type = "checkbox"; auto.checked = settings.repeat;
  autoLabel.append(auto, element("span", "连续自动战斗")); form.append(autoLabel);
  content.append(form, element("p", "首次通关地图固定为普通难度、单波。连续战斗每场结算后保存，战败或保存失败会停止。", "monster-copy-hint"));
  content.append(element("p", "连续战斗需要保持游戏打开，暂不支持离线挂机。试炼暂开放首层战斗，后续推进与积分领奖尚未开放。", "monster-copy-hint"));
  const list = element("div", undefined, "monster-copy-list"); content.append(list);
  form.onsubmit = (event) => event.preventDefault();
  function render() {
    settings.type = Number(category.value); settings.chapterId = Number(chapter.value);
    settings.hard = Number(hard.value); settings.waves = Number(waves.value); settings.repeat = auto.checked;
    chapter.parentElement.hidden = settings.type !== 1;
    hard.parentElement.hidden = waves.parentElement.hidden = settings.type !== 1;
    list.replaceChildren();
    const chapterRow = catalog.chapters.find((row) => row.id === settings.chapterId);
    const rows = catalog.copies.filter((copy) => settings.type === 3 ? [3, 4].includes(copy.type)
      : copy.type === settings.type && (copy.type !== 1 || copy.id >= chapterRow.minid && copy.id <= chapterRow.maxid || copy.id === chapterRow.hideboss));
    for (const copy of rows) {
      const reason = getCopyAccess(copy, state, catalog.chapters);
      const row = element("div", undefined, "monster-copy-row");
      const description = element("div"); description.append(element("strong", copy.name), element("small", `${copy.level > 80 ? `巅峰 ${copy.level - 80}` : `Lv.${copy.level}`} · ${copy.copyprice ? `副本卷轴 ×${copy.copyprice}` : "免费"} · 通关 ${state.progress.copies.find((entry) => entry.id === copy.id)?.value || 0} 次`));
      const button = element("button", reason || "挑战"); button.type = "button"; button.disabled = Boolean(reason);
      button.setAttribute("aria-label", `${copy.name}：${reason || "挑战"}`);
      button.dataset.copyId = copy.id;
      button.onclick = () => onStart(copy.id, { ...settings });
      row.append(description, button); list.append(row);
    }
  }
  form.onchange = render;
  render();
}

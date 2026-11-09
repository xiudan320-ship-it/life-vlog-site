import "./material-source.css";
import { element, itemTile, picture } from "./visual-ui.js";

/** Show the verified locations for an item; navigation remains with the controller. */
export function renderMaterialSources({ content, state, catalog, sources, actions, itemId }) {
  content.replaceChildren();
  const item = catalog.items.find((row) => row.id === itemId);
  const back = element("button", "返回", "monster-image-button monster-material-back");
  back.type = "button"; back.onclick = () => actions.closeMaterialSources();
  content.append(back);
  const heading = element("section", undefined, "monster-original-panel monster-material-heading");
  if (item) heading.append(itemTile({ id: itemId }, catalog));
  const description = element("div");
  description.append(element("h3", item ? `${item.name}的来源` : "物品来源"),
    element("p", "选择已解锁的地点，在冒险页面查看。", "monster-panel-hint"));
  if (item?.type === 2) description.append(element("p", "作为打造材料时，需要背包中未穿戴且强化 +5 的装备。", "monster-panel-hint"));
  heading.append(description); content.append(heading);
  if (!sources.length) {
    content.append(element("p", "当前没有可定位的冒险来源。", "monster-panel-hint"));
    return;
  }
  const list = element("div", undefined, "monster-material-list");
  list.setAttribute("aria-label", "获取地点");
  const types = { 1: "地图", 2: "副本", 3: "遭遇", 5: "深渊", 6: "试炼" };
  for (const source of sources) {
    const copy = catalog.copies.find((row) => row.id === source.copyId);
    const enemy = catalog.enemies.find((row) => row.id === copy?.enemyid1);
    const card = element("section", undefined, "monster-material-card monster-original-panel");
    card.append(picture(enemy ? `enemy/${enemy.img}` : "ui/btn/main_btn_achieve.png", "", "monster-material-enemy"));
    const text = element("div", undefined, "monster-material-description");
    text.append(element("strong", source.name),
      element("p", `${types[source.type] || "冒险"} · ${source.level > 80 ? `巅峰 ${source.level - 80}` : `Lv.${source.level}`} · ${source.detail}`));
    if (copy?.copyprice) text.append(element("small", `挑战需副本卷轴 ×${copy.copyprice}`));
    if (source.locked) text.append(element("p", source.locked, "monster-material-locked"));
    if (source.trialHard && state.trial && state.trial.status !== "claimed" && state.trial.hard !== source.trialHard) {
      text.append(element("p", `当前轮难度 ${state.trial.hard}，需先结束本轮再选择目标难度。`, "monster-material-locked"));
    }
    const button = element("button", source.locked ? "尚未解锁" : "前往地点", "monster-image-button");
    button.type = "button"; button.dataset.materialCopy = source.copyId; button.disabled = Boolean(source.locked);
    button.setAttribute("aria-label", source.locked ? `${source.name}：${source.locked}` : `前往${source.name}`);
    button.onclick = () => actions.goToCopy(source.copyId, { hard: source.hard || 1, trialHard: source.trialHard || 1 });
    card.append(text, button); list.append(card);
  }
  content.append(list);
}

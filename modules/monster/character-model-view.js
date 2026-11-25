import "./character-model.css";
import { element, picture } from "./visual-ui.js";
import { describeEquipmentAttribute } from "./attribute-labels.js";
import { characterModels } from "./character-model-domain.js";
import { renderSaveFeedback } from "./save-feedback-view.js";

export function renderCharacterModels({ content, state, actions, receipt }) {
  content.className = "monster-model-content";
  const summary = element("section", undefined, "monster-original-panel monster-model-summary");
  summary.append(element("h3", "选择人物形象"), element("p", "共用当前等级、装备和进度；形象加成为移植版设定。", "monster-panel-hint"));
  if (receipt) renderSaveFeedback({ content: summary, receipt, actions });
  const list = element("div", undefined, "monster-model-list"); list.setAttribute("aria-label", "人物形象");
  for (const model of characterModels) {
    const selected = state.player.image === model.image;
    const card = element("section", undefined, "monster-original-panel monster-model-card"); card.dataset.modelImage = model.image;
    card.append(picture(model.image, model.name), element("h4", `${model.name}${selected ? " · 使用中" : ""}`));
    if (!model.attributes.length) card.append(element("p", "基础形象，无额外加成。"));
    for (const attribute of model.attributes) card.append(element("p", describeEquipmentAttribute(attribute)));
    const button = element("button", selected ? "当前形象" : "使用此形象", "monster-image-button"); button.type = "button";
    button.disabled = selected; button.dataset.chooseModel = model.image; button.setAttribute("aria-label", selected ? `${model.name}，当前形象` : `使用${model.name}形象`);
    button.onclick = () => actions.changeModel(model.image); card.append(button); list.append(card);
  }
  content.append(summary, list);
}

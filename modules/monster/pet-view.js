import { element, picture } from "./visual-ui.js";
import { getPetSummary } from "./pet-domain.js";
import { renderSaveFeedback } from "./save-feedback-view.js";

const stats = [
  ["attack", "攻击"], ["defense", "防御"], ["maxHp", "生命"], ["hit", "命中"],
  ["dodge", "闪避"], ["crit", "暴击"], ["critHurt", "暴击伤害"], ["resistance", "负面抵抗"],
];

function statList(values) {
  const list = element("dl", undefined, "monster-pet-stats");
  for (const [name, value] of values) {
    const line = element("div");
    line.append(element("dt", name), element("dd", String(value)));
    list.append(line);
  }
  return list;
}

export function renderPets({ content, state, catalog, actions, receipt }) {
  content.className = "monster-pets-content";
  const header = element("section", undefined, "monster-original-panel monster-pets-header");
  header.append(element("h3", "宠物"),
    element("p", "设置主宠后，宠物属性会为角色提供加成。", "monster-panel-hint"),
    element("p", "当前提供主宠属性加成，宠物技能、独立行动与成长尚未开放。", "monster-panel-hint"));
  if (state.player.level < 35) header.append(element("p", "角色达到 35 级后可设置主宠。", "monster-panel-hint"));
  content.append(header);
  if (receipt) {
    const feedback = element("section", undefined, "monster-original-panel monster-pets-feedback");
    renderSaveFeedback({ content: feedback, receipt, actions });
    content.append(feedback);
  }

  const error = element("p", undefined, "monster-pets-error");
  error.setAttribute("role", "alert");
  content.append(error);
  if (!state.inventory.pets.length) {
    const empty = element("section", undefined, "monster-original-panel monster-pets-empty");
    empty.append(element("p", "暂时没有宠物，参与试炼有机会获得宠物。"));
    content.append(empty);
  }
  for (const [index, owned] of state.inventory.pets.entries()) {
    const target = { index, id: owned.id };
    const { pet, row, core, contribution, selected, loyalty, stars, growth } = getPetSummary({ state, catalog, target });
    const card = element("section", undefined, "monster-original-panel monster-pet-card");
    const overview = element("div", undefined, "monster-pet-overview");
    const portrait = element("div", undefined, "monster-item monster-pet monster-pet-portrait");
    portrait.dataset.quality = pet.quality;
    portrait.append(picture(`pet/${row.img}`, row.name));
    const description = element("div", undefined, "monster-pet-description");
    const title = element("h3", row.name);
    if (selected) title.append(element("span", "主宠", "monster-pet-selected"));
    description.append(title, element("p", `等级 ${pet.level} · 品质 ${pet.quality}`),
      element("p", `忠诚 ${loyalty} · 星级 ${stars} · 成长 ${growth}`, "monster-panel-hint"));
    overview.append(portrait, description);
    const details = element("details", undefined, "monster-pet-details");
    details.append(element("summary", "查看宠物属性与角色加成"), element("h4", "宠物属性"),
      statList(stats.map(([key, label]) => [label, core[key]])), element("h4", "作为主宠时给予角色"),
      statList(stats.map(([, label], statIndex) => [label, `+${contribution.find((entry) => entry.type === statIndex + 1)?.value ?? 0}`])));
    const button = element("button", selected ? "卸下主宠" : "设为主宠", "monster-image-button monster-pet-main-button");
    button.type = "button";
    button.dataset.mainPetIndex = String(index);
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = state.player.level < 35;
    button.onclick = async () => {
      const controls = [...content.querySelectorAll("button, input")];
      const disabled = controls.map((control) => control.disabled);
      controls.forEach((control) => { control.disabled = true; });
      error.textContent = "";
      try { await actions.setMainPet(target, !selected); }
      catch (cause) { if (content.contains(header)) error.textContent = cause.message || "操作失败，请重试"; }
      finally {
        if (content.contains(header)) controls.forEach((control, controlIndex) => { control.disabled = disabled[controlIndex]; });
      }
    };
    card.append(overview, details, button);
    content.append(card);
  }
  const back = element("button", "返回背包", "monster-image-button monster-pets-back");
  back.type = "button";
  back.onclick = () => actions.bag("pets");
  content.append(back);
}

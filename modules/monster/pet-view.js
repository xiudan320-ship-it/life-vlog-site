import { element, picture } from "./visual-ui.js";
import { getPetSummary, MAX_SIDE_PETS } from "./pet-domain.js";
import { MAIN_PET_KILL_THRESHOLD, SIDE_PET_KILL_THRESHOLD } from "./pet-care-domain.js";
import { getPetExperienceRequired } from "./progression-domain.js";
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
  const sideCount = state.inventory.pets.filter((pet) => pet.partyRole === 2).length;
  const header = element("section", undefined, "monster-original-panel monster-pets-header");
  header.append(element("h3", "宠物"),
    element("p", `主宠提供属性加成；副宠最多 ${MAX_SIDE_PETS} 只（已设置 ${sideCount}），提供约 30% 属性和经验。副宠暂不独立攻击。`, "monster-panel-hint"),
    element("p", "胜利累计击败 600 只敌人使主宠忠诚降低 1；副宠每 1800 只降低 1。忠诚 80 及以上享有满加成。", "monster-panel-hint"));
  if (state.player.level < 35) header.append(element("p", "角色达到 35 级后可设置主宠或喂养宠物。", "monster-panel-hint"));
  content.append(header);
  if (receipt) {
    const feedback = element("section", undefined, "monster-original-panel monster-pets-feedback");
    renderSaveFeedback({ content: feedback, receipt, actions });
    content.append(feedback);
  }

  const error = element("p", undefined, "monster-pets-error");
  error.setAttribute("role", "alert");
  content.append(error);
  const souls = state.inventory.goods.find((item) => item.id === 5105)?.quantity || 0;
  let pending = false;
  async function saveOperation(operation) {
    if (pending) return;
    pending = true;
    const controls = [...content.querySelectorAll("button, input")];
    const disabled = controls.map((control) => control.disabled);
    controls.forEach((control) => { control.disabled = true; });
    error.textContent = "";
    try { await operation(); }
    catch (cause) { if (content.contains(header)) error.textContent = cause.message || "操作失败，请重试"; }
    finally {
      pending = false;
      if (content.contains(header)) controls.forEach((control, index) => { control.disabled = disabled[index]; });
    }
  }
  if (!state.inventory.pets.length) {
    const empty = element("section", undefined, "monster-original-panel monster-pets-empty");
    empty.append(element("p", "暂时没有宠物，参与试炼有机会获得宠物。"));
    content.append(empty);
  }
  for (const [index, owned] of state.inventory.pets.entries()) {
    const target = { index, id: owned.id };
    const { pet, row, core, contribution, sideContribution, selected, side, loyalty, killCount, stars, growth } = getPetSummary({ state, catalog, target });
    const card = element("section", undefined, "monster-original-panel monster-pet-card");
    const overview = element("div", undefined, "monster-pet-overview");
    const portrait = element("div", undefined, "monster-item monster-pet monster-pet-portrait");
    portrait.dataset.quality = pet.quality;
    portrait.append(picture(`pet/${row.img}`, row.name));
    const description = element("div", undefined, "monster-pet-description");
    const title = element("h3", row.name);
    if (selected) title.append(element("span", "主宠", "monster-pet-selected"));
    if (side) title.append(element("span", "副宠", "monster-pet-selected"));
    description.append(title, element("p", `等级 ${pet.level} · 品质 ${pet.quality}`),
      element("p", `忠诚 ${loyalty} · 星级 ${stars} · 成长 ${growth}`, "monster-panel-hint"));
    overview.append(portrait, description);
    const experience = element("div", undefined, "monster-pet-experience");
    experience.dataset.petExperienceIndex = String(index);
    const capped = pet.level >= 60;
    const required = getPetExperienceRequired(pet.level);
    const amount = pet.experience.toLocaleString("zh-CN");
    const progressLabel = element("p", capped ? `已达满级 60 · 经验 ${amount}` : `经验 ${amount} / ${required.toLocaleString("zh-CN")}`);
    const progress = element("progress");
    progress.max = required;
    progress.value = Math.min(pet.experience, required);
    progress.setAttribute("aria-label", `${row.name}的经验进度`);
    progress.setAttribute("aria-valuetext", progressLabel.textContent);
    experience.append(progressLabel, progress);
    const care = element("div", undefined, "monster-pet-care");
    care.dataset.petCareIndex = String(index);
    if (selected || side) {
      const remaining = (selected ? MAIN_PET_KILL_THRESHOLD : SIDE_PET_KILL_THRESHOLD) - killCount;
      care.append(element("p", loyalty <= 30 ? "忠诚已到最低值 30" : remaining > 0
        ? `距离忠诚下降还需击败 ${remaining} 只敌人` : "下次胜利后忠诚将下降", "monster-pet-care-progress"));
    }
    const material = element("div", undefined, "monster-pet-care-material");
    material.append(picture(`icon/item/${catalog.items.find((item) => item.id === 5105).icon}`, "", "monster-pet-care-icon"),
      element("span", `宠物精魂 ×${souls} · 每个忠诚 +1`));
    care.append(material);
    const needed = 100 - loyalty;
    if (needed > 0) {
      const controls = element("div", undefined, "monster-pet-care-actions");
      const feed = element("button", "喂养 +1", "monster-image-button");
      feed.type = "button";
      feed.dataset.petFeedIndex = String(index);
      feed.disabled = state.player.level < 35 || souls < 1;
      feed.setAttribute("aria-label", `喂养${row.name}，消耗 1 个宠物精魂`);
      feed.onclick = () => saveOperation(() => actions.feedPet(target, 1));
      const fill = element("button", `一键补满 · 消耗 ${needed}`, "monster-image-button");
      fill.type = "button";
      fill.dataset.petFeedFullIndex = String(index);
      fill.disabled = state.player.level < 35 || souls < needed;
      fill.setAttribute("aria-label", `补满${row.name}的忠诚，消耗 ${needed} 个宠物精魂`);
      fill.onclick = () => saveOperation(() => actions.feedPet(target, needed));
      controls.append(feed, fill);
      if (souls < needed) {
        const source = element("button", "获取途径", "monster-image-button");
        source.type = "button";
        source.dataset.materialSource = "5105";
        source.setAttribute("aria-label", "查看宠物精魂的获取途径");
        source.onclick = () => actions.materialSources(5105);
        controls.append(source);
      }
      care.append(controls);
    } else care.append(element("p", "忠诚已满", "monster-pet-care-progress"));
    const details = element("details", undefined, "monster-pet-details");
    details.append(element("summary", "查看宠物属性与角色加成"), element("h4", "宠物属性"),
      statList(stats.map(([key, label]) => [label, core[key]])), element("h4", "作为主宠时给予角色"),
      statList(stats.map(([, label], statIndex) => [label, `+${contribution.find((entry) => entry.type === statIndex + 1)?.value ?? 0}`])),
      element("h4", "作为副宠时给予角色"),
      statList(stats.map(([, label], statIndex) => [label, `+${sideContribution.find((entry) => entry.type === statIndex + 1)?.value ?? 0}`])));
    const button = element("button", selected ? "卸下主宠" : side ? "转为主宠" : "设为主宠", "monster-image-button monster-pet-main-button");
    button.type = "button";
    button.dataset.mainPetIndex = String(index);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", `${selected ? "卸下主宠" : side ? "转为主宠" : "设为主宠"}：${row.name}`);
    button.disabled = state.player.level < 35;
    button.onclick = () => saveOperation(() => actions.setMainPet(target, !selected));
    const sideButton = element("button", side ? "卸下副宠" : sideCount >= MAX_SIDE_PETS ? "副宠已满" : selected ? "转为副宠" : "设为副宠", "monster-image-button monster-pet-side-button");
    sideButton.type = "button";
    sideButton.dataset.sidePetIndex = String(index);
    sideButton.setAttribute("aria-pressed", String(side));
    sideButton.setAttribute("aria-label", `${side ? "卸下副宠" : selected ? "转为副宠" : "设为副宠"}：${row.name}`);
    sideButton.disabled = state.player.level < 35 || !side && sideCount >= MAX_SIDE_PETS;
    sideButton.onclick = () => saveOperation(() => actions.setSidePet(target, !side));
    const partyActions = element("div", undefined, "monster-pet-party-actions");
    partyActions.append(button, sideButton);
    card.append(overview, partyActions, experience, care, details);
    content.append(card);
  }
  const back = element("button", "返回背包", "monster-image-button monster-pets-back");
  back.type = "button";
  back.onclick = () => actions.bag("pets");
  content.append(back);
}

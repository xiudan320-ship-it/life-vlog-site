import { element } from "./visual-ui.js";
import { getPetTraining, PET_STAR_THRESHOLDS, previewPetTraining } from "./pet-training-domain.js";
import { getPetCare } from "./pet-care-domain.js";

export function renderPetTraining({ state, catalog, target, actions, saveOperation }) {
  const pet = state.inventory.pets[target.index];
  const targetRow = catalog.pets.find((item) => item.id === pet.id);
  const { stars, starExperience, growth } = getPetTraining(pet);
  const details = element("details", undefined, "monster-pet-training");
  details.dataset.petTrainingIndex = String(target.index);
  details.append(element("summary", "培养宠物 · 升星与成长"));
  details.append(element("p", `培养目标：${targetRow.name} · 第 ${target.index + 1} 只`, "monster-panel-hint"));
  details.append(element("p", stars === 4 ? "星级已满 · 4 星" : `星级 ${stars} · 升星进度 ${starExperience}/${PET_STAR_THRESHOLDS[stars]}`, "monster-panel-hint"));
  details.append(element("p", `成长 ${growth}/100${pet.quality === 4 ? " · 满 100 后升为品质 5" : ""}`, "monster-panel-hint"));
  if (stars === 4 && (pet.quality !== 4 || growth >= 100)) return details;

  const modeId = `pet-training-mode-${target.index}`, donorId = `pet-training-donor-${target.index}`;
  const modeLabel = element("label", "培养方式"); modeLabel.htmlFor = modeId;
  const mode = element("select"); mode.id = modeId; mode.dataset.petTrainingMode = String(target.index);
  for (const [value, label, disabled] of [["fuse", "融合升星", stars >= 4], ["devour", "吞噬增加成长", pet.quality !== 4 || growth >= 100]]) {
    const option = element("option", label); option.value = value; option.disabled = disabled; mode.append(option);
  }
  if (mode.options[0].disabled) mode.value = "devour";
  const donorLabel = element("label", "选择要消耗的宠物"); donorLabel.htmlFor = donorId;
  const donor = element("select"); donor.id = donorId; donor.dataset.petTrainingDonor = String(target.index);
  const preview = element("p", "请选择一只未出战的宠物。", "monster-pet-training-preview");
  preview.setAttribute("role", "status");
  const confirmation = element("label", undefined, "monster-pet-training-confirmation");
  const checked = element("input"); checked.type = "checkbox"; checked.dataset.petTrainingConfirm = String(target.index);
  confirmation.append(checked, element("span", "我确认永久消耗所选宠物和魔石"));
  const submit = element("button", "确认培养", "monster-image-button"); submit.type = "button";
  submit.dataset.petTrainingSubmit = String(target.index); submit.disabled = true;
  let choice = null;
  let initialized = false;

  function updatePreview() {
    choice = null; checked.checked = false; submit.disabled = true;
    if (!donor.value) { preview.textContent = donor.options.length > 1 ? "请选择一只未出战的宠物。" : "没有符合条件的未出战宠物。"; return; }
    const index = Number(donor.value), selected = state.inventory.pets[index];
    const material = { index, id: selected.id };
    const result = previewPetTraining({ state, catalog, mode: mode.value, target, donor: material });
    const row = catalog.pets.find((item) => item.id === selected.id);
    const source = getPetTraining(selected);
    const after = result.result.training;
    const outcome = mode.value === "fuse" ? `星级 ${stars} → ${after.stars}，升星经验 +${result.result.amount}${after.stars === 4 ? "（满星后多余经验不保留）" : ""}`
      : `成长 ${growth} → ${after.growth}${result.result.quality === 5 ? "，提升至品质 5" : ""}${result.result.amount > 100 - growth ? "（超过上限的成长不保留）" : ""}`;
    preview.textContent = `${outcome}。将消耗第 ${index + 1} 只${row.name}（${selected.level} 级，${source.stars} 星，成长 ${source.growth}，忠诚 ${getPetCare(selected).loyalty}）和 ${result.cost} 魔石${state.money < result.cost ? "（魔石不足）" : ""}。`;
    choice = { material, affordable: state.money >= result.cost };
  }
  function updateCandidates() {
    initialized = true;
    donor.replaceChildren();
    const placeholder = element("option", "请选择宠物"); placeholder.value = ""; donor.append(placeholder);
    for (const [index, candidate] of state.inventory.pets.entries()) {
      try {
        previewPetTraining({ state, catalog, mode: mode.value, target, donor: { index, id: candidate.id } });
      } catch { continue; }
      const row = catalog.pets.find((item) => item.id === candidate.id);
      const training = getPetTraining(candidate);
      const option = element("option", `第 ${index + 1} 只 ${row.name} · ${candidate.level} 级 · 品质 ${candidate.quality} · ${training.stars} 星 · 成长 ${training.growth}`);
      option.value = String(index); donor.append(option);
    }
    donor.value = ""; updatePreview();
  }
  mode.onchange = updateCandidates;
  donor.onchange = updatePreview;
  checked.onchange = () => { submit.disabled = !checked.checked || !choice?.affordable; };
  submit.onclick = () => { if (choice && checked.checked) void saveOperation(() => actions.trainPet(target, choice.material, mode.value)); };
  details.append(element("p", "融合需同种宠物；吞噬仅对品质 4 宠物开放。已出战的主宠和副宠不能作为材料。", "monster-panel-hint"),
    modeLabel, mode, donorLabel, donor, preview, confirmation, submit);
  details.ontoggle = () => { if (details.open && !initialized) updateCandidates(); };
  return details;
}

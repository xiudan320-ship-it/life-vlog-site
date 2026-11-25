import "./bag-batch.css";
import { element, itemTile } from "./visual-ui.js";
import { getDecomposableEquipment, previewBatchDecomposition } from "./bag-batch-domain.js";

export function renderBagBatch({ content, state, catalog, actions, selectAll }) {
  content.className = "monster-bag-batch";
  const eligible = getDecomposableEquipment(state);
  const selected = new Set(selectAll ? eligible.map((entry) => entry.index) : []);
  const header = element("section", undefined, "monster-original-panel monster-batch-header");
  header.append(element("h3", selectAll ? "一键分解" : "快速分解"),
    element("p", "锁定装备不会被分解。请核对选择和返还后确认。"));
  const toggle = element("button", "全选未锁定装备", "monster-image-button"); toggle.type = "button";
  const clear = element("button", "清空选择", "monster-image-button"); clear.type = "button";
  const list = element("div", undefined, "monster-batch-list"); list.setAttribute("aria-label", "选择分解装备");
  const preview = element("p", undefined, "monster-batch-preview"); preview.setAttribute("aria-live", "polite");
  const confirm = element("label", undefined, "monster-batch-confirm");
  const check = element("input"); check.type = "checkbox"; check.dataset.batchConfirm = "";
  confirm.append(check, element("span", "确认分解所选装备"));
  const submit = element("button", "分解所选装备", "monster-image-button"); submit.type = "button"; submit.dataset.batchSubmit = "";
  const back = element("button", "返回背包", "monster-image-button"); back.type = "button"; back.onclick = () => actions.bag("equipment");
  const targets = () => eligible.filter((entry) => selected.has(entry.index));
  function update() {
    for (const input of list.querySelectorAll("input")) input.checked = selected.has(Number(input.value));
    const entries = targets();
    try {
      const reward = entries.length ? previewBatchDecomposition({ state, targets: entries, catalog }) : { gold: 0, items: [] };
      const resources = reward.items.map((item) => `${catalog.items.find((row) => row.id === item.id).name} ×${item.quantity}`).join("、");
      preview.textContent = `已选 ${entries.length} 件 · 预计金币 +${reward.gold}${resources ? ` · ${resources}` : ""}`;
      submit.disabled = !entries.length || !check.checked;
    } catch (error) { preview.textContent = error.message; submit.disabled = true; }
  }
  toggle.onclick = () => { eligible.forEach((entry) => selected.add(entry.index)); check.checked = false; update(); };
  clear.onclick = () => { selected.clear(); check.checked = false; update(); };
  check.onchange = update;
  for (const { index, id } of eligible) {
    const item = state.inventory.equipment[index];
    const label = element("label", undefined, "monster-batch-item monster-original-panel");
    const input = element("input"); input.type = "checkbox"; input.value = String(index); input.dataset.batchItem = String(index);
    const row = catalog.items.find((entry) => entry.id === id);
    input.setAttribute("aria-label", `选择${row.name}，强化 +${item.strength || 0}，品质 ${item.quality}`);
    input.onchange = () => { if (input.checked) selected.add(index); else selected.delete(index); check.checked = false; update(); };
    label.append(input, itemTile(item, catalog), element("span", `${row.name} · +${item.strength || 0}${item.godLevel ? ` · 神器 ${item.godLevel} 星` : ""}`));
    list.append(label);
  }
  if (!eligible.length) list.append(element("p", "没有可分解的未锁定装备。", "monster-panel-hint"));
  submit.onclick = async () => { submit.disabled = true; try { await actions.decomposeBatch(targets()); } finally { if (submit.isConnected) update(); } };
  header.append(toggle, clear, preview, confirm, submit, back);
  content.append(header, list); update();
}

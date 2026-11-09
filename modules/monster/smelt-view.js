import { element, itemTile } from "./visual-ui.js";
import { canSmeltEquipment, getSmeltPreview } from "./smelt-domain.js";

export function renderSmelt({ content, state, catalog, actions, receipt }) {
  content.className = "monster-smelt-content";
  const tabs = element("nav", undefined, "monster-image-tabs"); tabs.setAttribute("aria-label", "熔炼类型");
  let mode = "equipment";
  const selection = new Map();
  const list = element("section", undefined, "monster-smelt-list monster-original-panel");
  const summary = element("section", undefined, "monster-smelt-summary monster-original-panel");
  for (const [value, name] of [["equipment", "装备熔炼"], ["goods", "材料熔炼"]]) {
    const button = element("button", name, "monster-image-button"); button.type = "button"; button.dataset.smeltMode = value;
    button.onclick = () => { mode = value; selection.clear(); render(); }; tabs.append(button);
  }
  content.append(tabs);
  if (receipt) {
    const result = element("section", undefined, "monster-original-panel monster-smelt-summary");
    const message = element("p", receipt.success ? "熔炼完成，产物已入背包" : "熔炼失败，本次材料已消耗", "monster-upgrade-receipt"); message.setAttribute("role", "status"); result.append(message);
    for (const item of receipt.items) result.append(itemTile(item, catalog, { quantity: item.type === 1 }));
    content.append(result);
  }
  content.append(element("p", "熔炼会消耗选中的材料或神器和金币，失败也会消耗。穿戴中、已锁定或等级过低的神器不会列入。", "monster-panel-hint"), list, summary);
  function chosen() { return mode === "equipment" ? [...selection.keys()] : [...selection].filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id, quantity })); }
  function update() {
    summary.replaceChildren();
    const values = chosen();
    if (!values.length) { summary.append(element("p", "请选择要消耗的材料", "monster-panel-hint")); return; }
    let preview;
    try { preview = getSmeltPreview({ state, mode, selection: values, catalog }); }
    catch (error) { summary.append(element("p", error.message)); return; }
    summary.append(element("p", `消耗金币 ${preview.gold} · 持有 ${state.gold}`));
    if (mode === "equipment") summary.append(element("p", `成功率 ${preview.rate}% · 产物：铁匠徽章，最低品质 ${preview.minimumQuality}`));
    else summary.append(element("p", `产物：能量之源 ×${preview.guaranteed}，另有 ${preview.rate}% 概率增加 1 个`));
    const button = element("button", "确认消耗并熔炼", "monster-image-button"); button.type = "button"; button.dataset.smeltConfirm = "";
    button.disabled = state.gold < preview.gold;
    button.onclick = async () => { button.disabled = true; try { await actions.smelt(mode, values); } finally { if (button.isConnected) button.disabled = state.gold < preview.gold; } };
    summary.append(button);
  }
  function render() {
    for (const button of tabs.children) button.setAttribute("aria-pressed", String(button.dataset.smeltMode === mode));
    list.replaceChildren();
    if (mode === "equipment") {
      state.inventory.equipment.forEach((item, index) => {
        if (!canSmeltEquipment(item, state.player)) return;
        const label = element("label", undefined, "monster-smelt-row");
        const check = element("input"); check.type = "checkbox"; check.dataset.smeltEquipment = index;
        check.setAttribute("aria-label", `${catalog.items.find((row) => row.id === item.id).name}，神器 ${item.godLevel} 星，强化 +${item.strength}`);
        check.onchange = () => { if (check.checked) selection.set(index, true); else selection.delete(index); update(); };
        label.append(check, itemTile(item, catalog), element("span", `Lv.${item.level} · ${item.godLevel} 星 · +${item.strength}`)); list.append(label);
      });
    } else {
      state.inventory.goods.forEach((item) => {
        const row = catalog.items.find((row) => row.id === item.id);
        if (!row?.smelt || row.quality <= 4 || item.quantity < 10) return;
        const label = element("label", undefined, "monster-smelt-row");
        const input = element("input"); input.type = "number"; input.min = 0; input.max = Math.floor(item.quantity / 10) * 10; input.step = 10; input.value = 0;
        input.dataset.smeltGoods = item.id; input.setAttribute("aria-label", `${row.name}熔炼数量`);
        input.oninput = () => { selection.set(item.id, Number(input.value)); update(); };
        label.append(itemTile(item, catalog, { quantity: true }), element("span", `${row.name}（10 个一组）`), input); list.append(label);
      });
    }
    if (!list.children.length) list.append(element("p", mode === "equipment" ? "暂无可熔炼的相近等级神器" : "暂无至少 10 个的可熔炼材料", "monster-panel-hint"));
    update();
  }
  render();
}

import { element, itemTile, picture } from "./visual-ui.js";
import { renderSaveFeedback } from "./save-feedback-view.js";
import { getOwnedEquipment, getUpgradeCost, strengthThreshold } from "./upgrade-domain.js";

const statNames = ["", "攻击", "防御", "生命", "命中", "闪避", "暴击", "暴击伤害", "负面抵抗"];

export function renderWorkshop({ content, state, catalog, actions }) {
  content.className = "monster-workshop-content";
  const tools = element("nav", undefined, "monster-image-tabs"); tools.setAttribute("aria-label", "铁匠铺功能");
  for (const [title, action] of [["打造与合成", () => actions.showCraft()], ["熔炼", () => actions.showSmelt()]]) {
    const button = element("button", title, "monster-image-button"); button.type = "button"; button.onclick = action; tools.append(button);
  }
  content.append(tools);
  content.append(element("p", "选择装备进行强化、重铸和附魔。每次操作后自动保存到当前账号。", "monster-panel-hint"));
  for (const [source, title, entries] of [["equipped", "已穿戴", state.player.equipmentSets[state.player.equipmentSetIndex]], ["bag", "背包装备", state.inventory.equipment]]) {
    content.append(element("h3", title));
    const grid = element("div", undefined, "monster-bag-grid monster-original-panel");
    entries.forEach((item, index) => { if (item.subtype <= 9) grid.append(itemTile(item, catalog, { onClick: () => actions.upgrade({ source, index, id: item.id }) })); });
    if (!grid.children.length) grid.append(element("p", "暂无可培养装备", "monster-panel-hint"));
    content.append(grid);
  }
}

export function renderUpgrade({ content, state, catalog, target, actions, receipt, session = {} }) {
  content.className = "monster-upgrade-content";
  const root = element("div", undefined, "monster-upgrade-workspace");
  const summary = element("section", undefined, "monster-original-panel monster-upgrade-summary");
  const portrait = itemTile(getOwnedEquipment(state, target), catalog);
  const info = element("div", undefined, "monster-upgrade-info");
  const name = element("h3");
  const stats = element("p");
  const enchantment = element("p");
  info.append(name, stats, enchantment);
  summary.append(portrait, info);

  const feedback = element("div", undefined, "monster-upgrade-feedback");
  const error = element("p", undefined, "monster-upgrade-error");
  error.setAttribute("role", "alert");
  const list = element("div", undefined, "monster-upgrade-actions");
  const cards = new Map();
  for (const [operation, label] of [["strength", "强化"], ["reforge", "重铸评分"], ["enchantGold", "金币附魔"], ["enchantMoney", "魔石附魔"]]) {
    const card = element("section", undefined, "monster-original-panel monster-upgrade-action");
    const heading = element("h3", label);
    const prices = element("div", undefined, "monster-upgrade-prices");
    const hint = element("small");
    const button = element("button", label, "monster-image-button");
    button.type = "button"; button.dataset.upgrade = operation;
    button.onclick = () => run(() => actions.performUpgrade(target, operation, boostInput.checked));
    card.append(heading, prices, hint, button);
    list.append(card); cards.set(operation, { prices, hint, button, affordable: false });
  }

  const batch = element("div", undefined, "monster-upgrade-batch");
  const targetLabel = element("label", "强化至 ");
  const targetSelect = element("select"); targetSelect.dataset.strengthenTarget = "";
  for (let level = 1; level <= 18; level++) {
    const option = element("option", `+${level}`); option.value = String(level); targetSelect.append(option);
  }
  targetLabel.append(targetSelect);
  const until = element("button", "连续强化", "monster-image-button");
  until.type = "button"; until.dataset.strengthenUntil = "";
  until.onclick = () => run(() => actions.strengthenUntil(target, Number(targetSelect.value), boostInput.checked));
  const stop = element("button", "本次保存后停止", "monster-image-button");
  stop.type = "button"; stop.dataset.strengthenStop = "";
  stop.onclick = () => actions.stopStrengthening();
  batch.append(targetLabel, until, stop);
  const boostField = element("label", undefined, "monster-auto-label monster-upgrade-boost");
  const boostInput = element("input"); boostInput.type = "checkbox";
  boostField.append(boostInput, element("span", "高级强化加普通石提概率（+16起）"));
  boostInput.onchange = () => refresh();
  const progress = element("p", undefined, "monster-upgrade-progress"); progress.setAttribute("role", "status");
  const navigation = element("div", undefined, "monster-upgrade-navigation");
  const back = element("button", "返回铁匠铺", "monster-image-button"); back.type = "button"; back.onclick = () => actions.workshop();
  const god = element("button", "神器升星 / 洗星", "monster-image-button"); god.type = "button"; god.dataset.openGodUpgrade = "";
  god.onclick = () => actions.godUpgrade(target);
  navigation.append(back, god);
  root.append(summary, feedback, error, list, batch, boostField, progress, navigation);
  content.append(root);

  let currentState = state, currentReceipt = receipt, currentSession = session || {}, renderedReceipt;
  let pending = false;
  targetSelect.value = String(Math.min(18, getOwnedEquipment(state, target).strength + 1));

  function compact(value) {
    if (value >= 100000000) return `${(value / 100000000).toFixed(2).replace(/\.?0+$/, "")}亿`;
    if (value >= 10000) return `${(value / 10000).toFixed(2).replace(/\.?0+$/, "")}万`;
    return String(value);
  }
  function priceLine(label, needed, owned, row) {
    const line = element("div", undefined, "monster-upgrade-price");
    const full = `${label}：需要 ${needed}，持有 ${owned}`;
    line.title = full; line.setAttribute("aria-label", full);
    if (row) line.append(picture(`icon/item/${row.icon}`, row.name));
    else line.append(element("span", label, "monster-upgrade-currency"));
    line.append(element("span", `${compact(needed)} / ${compact(owned)}`));
    if (owned < needed) line.classList.add("is-insufficient");
    return line;
  }
  function refresh() {
    const item = getOwnedEquipment(currentState, target);
    const row = catalog.items.find((entry) => entry.id === item.id);
    name.textContent = `${row.name} +${item.strength}`;
    stats.textContent = `${statNames[item.mainAttribute.type]} ${item.mainAttribute.value} · 评分 ${["", "普通", "标准", "优秀", "极品"][item.scoreTier]} · ${item.scoreValue}`;
    enchantment.textContent = item.enchantment ? `附魔 ${statNames[item.enchantment.type]} +${item.enchantment.value}（${item.enchantment.level}级）` : "尚未附魔";
    god.hidden = !(item.godLevel > 0);
    for (const option of targetSelect.options) { option.disabled = Number(option.value) <= item.strength; option.hidden = option.disabled; }
    if (Number(targetSelect.value) <= item.strength && item.strength < 18) targetSelect.value = String(item.strength + 1);
    const busy = pending || Boolean(currentSession.running);
    for (const [operation, card] of cards) {
      card.prices.replaceChildren();
      let cost;
      try { cost = getUpgradeCost(item, operation, boostInput.checked); }
      catch (cause) {
        card.prices.append(element("span", cause.message)); card.hint.textContent = "";
        card.affordable = false; card.button.disabled = true; continue;
      }
      if (cost.gold) card.prices.append(priceLine("金币", cost.gold, currentState.gold));
      if (cost.money) card.prices.append(priceLine("魔石", cost.money, currentState.money));
      for (const good of cost.goods) {
        const goodRow = catalog.items.find((entry) => entry.id === good.id);
        const owned = currentState.inventory.goods.find((entry) => entry.id === good.id)?.quantity || 0;
        card.prices.append(priceLine(goodRow.name, good.quantity, owned, goodRow));
      }
      card.hint.textContent = operation === "strength" ? `成功率 ${Math.min(100, strengthThreshold(item, boostInput.checked) / 10).toFixed(2)}% · 失败保级` : operation === "reforge" ? "覆盖评分，可能变低" : "覆盖附魔，可能变低";
      card.affordable = currentState.gold >= cost.gold && currentState.money >= cost.money && cost.goods.every((good) => (currentState.inventory.goods.find((entry) => entry.id === good.id)?.quantity || 0) >= good.quantity);
      card.button.disabled = busy || !card.affordable;
    }
    targetSelect.disabled = busy || item.strength >= 18;
    until.disabled = busy || item.strength >= 18 || !cards.get("strength").affordable;
    boostInput.disabled = busy || item.strength >= 18;
    back.disabled = busy; god.disabled = busy;
    stop.hidden = !currentSession.running;
    stop.disabled = !currentSession.running;
    progress.textContent = currentSession.running ? `正在强化至 +${currentSession.targetLevel} · 已尝试 ${currentSession.attempts || 0} 次` : "";
    if (currentReceipt !== renderedReceipt) {
      feedback.replaceChildren();
      if (currentReceipt) renderSaveFeedback({ content: feedback, receipt: currentReceipt, actions });
      renderedReceipt = currentReceipt;
    }
    for (const button of feedback.querySelectorAll("button")) button.disabled = busy;
  }
  async function run(action) {
    if (pending || currentSession.running) return;
    pending = true; error.textContent = ""; refresh();
    try { await action(); }
    catch (cause) { if (root.isConnected) error.textContent = cause.message || "操作失败，请重试"; }
    finally { pending = false; if (root.isConnected) refresh(); }
  }
  function update(next) {
    currentState = next.state; currentReceipt = next.receipt; currentSession = next.session || {};
    refresh();
  }
  refresh();
  return { root, update };
}

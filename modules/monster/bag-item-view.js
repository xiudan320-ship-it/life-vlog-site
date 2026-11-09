import { element, itemTile, picture } from "./visual-ui.js";
import { getBagItem, getItemSalePreview } from "./bag-item-domain.js";

export function renderBagReceipt({ content, catalog, receipt, actions }) {
  const panel = element("section", undefined, "monster-original-panel monster-bag-item-panel");
  const status = element("p", receipt.message, "monster-upgrade-receipt"); status.setAttribute("role", "status"); panel.append(status);
  if (receipt.reward) {
    panel.append(element("p", `金币 +${receipt.reward.gold} · 魔石 +${receipt.reward.money}`));
    const rewards = element("div", undefined, "monster-bag-item-rewards");
    for (const item of receipt.reward.items) rewards.append(itemTile(item, catalog, { quantity: true }));
    panel.append(rewards);
  }
  if (!receipt.saved) {
    if (receipt.status === 401 || receipt.status === 409) {
      const conflict = receipt.status === 409;
      status.textContent += conflict ? " · 云档已有更新，请重载云存档" : " · 登录已过期，请返回登录";
      const recover = element("button", conflict ? "重载云存档" : "返回登录", "monster-image-button"); recover.type = "button";
      recover.onclick = () => { if (conflict) location.reload(); else location.href = "/"; };
      panel.append(recover); content.append(panel); return;
    }
    status.textContent += " · 云端尚未保存，请重试";
    const retry = element("button", "重试云端保存", "monster-image-button"); retry.type = "button"; retry.dataset.bagSaveRetry = "";
    retry.onclick = async () => {
      retry.disabled = true;
      try {
        if (await actions.save()) { status.textContent = `${receipt.message} · 已保存到云端`; retry.remove(); }
        else status.textContent = `${receipt.message} · 保存失败，请重试`;
      } finally { retry.disabled = false; }
    };
    panel.append(retry);
  }
  content.append(panel);
}

export function renderBagItem({ content, state, catalog, target, actions, receipt }) {
  content.className = "monster-bag-item-content";
  const kind = target?.kind === "equipment" ? "equipment" : "goods";
  const back = element("button", "返回背包", "monster-image-button monster-bag-item-back");
  back.type = "button";
  back.onclick = () => actions.bag(kind);

  let item, row;
  try {
    ({ item, row } = getBagItem({ state, target, catalog }));
    if (!item || !row) throw new Error("找不到此物品，请返回背包重新选择");
  } catch (error) {
    const panel = element("section", undefined, "monster-original-panel monster-bag-item-panel");
    const message = element("p", error.message || "找不到此物品，请返回背包重新选择", "monster-bag-item-error");
    message.setAttribute("role", "alert");
    panel.append(message); content.append(panel, back);
    return;
  }

  const equipment = kind === "equipment";
  const owned = equipment ? 1 : item.quantity;
  const panel = element("section", undefined, "monster-original-panel monster-bag-item-panel");
  panel.append(itemTile(item, catalog, { quantity: !equipment }), element("h3", row.name), element("p", `持有 ${owned} 件`));
  if (row.describe && row.describe !== "null") panel.append(element("p", row.describe, "monster-panel-hint"));
  if (receipt) renderBagReceipt({ content: panel, catalog, receipt, actions });

  const controls = element("section", undefined, "monster-original-panel monster-bag-item-actions");
  let lockButton, confirmation, quantityInput;
  if (equipment) {
    lockButton = element("button", undefined, "monster-image-button monster-bag-item-lock");
    lockButton.type = "button"; lockButton.dataset.toggleItemLock = "";
    lockButton.setAttribute("aria-pressed", String(Boolean(item.locked)));
    lockButton.append(picture(`bg/btn_lock${item.locked ? 2 : 1}.png`), element("span", item.locked ? "已锁定 · 点击解锁" : "未锁定 · 点击锁定"));
    controls.append(lockButton);
    controls.append(element("p", "锁定保护分解和神器熔炼；打造配方仍会使用符合条件的 +5 装备。", "monster-panel-hint"));
  } else if (owned > 9) {
    const label = element("label", undefined, "monster-bag-item-quantity");
    label.append(element("span", "出售数量"));
    quantityInput = element("input"); quantityInput.type = "number"; quantityInput.min = "1"; quantityInput.max = String(owned); quantityInput.step = "1"; quantityInput.value = "1";
    quantityInput.dataset.saleQuantity = "";
    label.append(quantityInput); controls.append(label);
  } else {
    controls.append(element("p", "出售数量：1", "monster-bag-item-fixed-quantity"));
  }

  const preview = element("div", undefined, "monster-bag-item-preview");
  preview.setAttribute("aria-live", "polite"); controls.append(preview);
  if (equipment) {
    const label = element("label", undefined, "monster-bag-item-confirm");
    confirmation = element("input"); confirmation.type = "checkbox"; confirmation.dataset.saleConfirm = "";
    label.append(confirmation, element("span", "我确认分解这件装备")); controls.append(label);
  }
  const operationError = element("p", undefined, "monster-bag-item-error");
  operationError.setAttribute("role", "alert"); controls.append(operationError);
  const sell = element("button", equipment ? "分解" : "出售", "monster-image-button monster-bag-item-sell");
  sell.type = "button"; sell.dataset.sellItem = ""; controls.append(sell);
  content.append(panel, controls, back);

  let valid = false;
  let pending = false;
  function quantity() {
    if (!quantityInput) return 1;
    const value = quantityInput.value;
    if (!/^\d+$/.test(value)) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 1 && number <= owned ? number : null;
  }
  function update() {
    preview.replaceChildren(); valid = false;
    const amount = quantity();
    if (amount === null) {
      preview.append(element("p", `请输入 1 到 ${owned} 之间的整数`, "monster-bag-item-error"));
    } else {
      try {
        const result = getItemSalePreview({ state, target, catalog, quantity: amount });
        preview.append(element("h3", equipment ? "分解可获得" : "出售可获得"));
        preview.append(element("p", `金币 ${result.gold} · 魔石 ${result.money}`));
        if (result.items.length) {
          const items = element("div", undefined, "monster-bag-item-rewards");
          for (const reward of result.items) items.append(itemTile(reward, catalog, { quantity: true }));
          preview.append(items);
        }
        valid = true;
      } catch (error) {
        preview.append(element("p", error.message || "无法处理此物品", "monster-bag-item-error"));
      }
    }
    sell.disabled = pending || !valid || (equipment && !confirmation.checked);
  }
  if (quantityInput) quantityInput.oninput = update;
  if (confirmation) confirmation.onchange = update;

  async function perform(action) {
    if (pending) return;
    pending = true;
    operationError.textContent = "";
    const inputs = [...content.querySelectorAll("button, input")];
    const previous = inputs.map((input) => input.disabled);
    for (const input of inputs) input.disabled = true;
    try { await action(); }
    catch (error) { if (content.contains(panel)) operationError.textContent = error.message || "操作失败，请重试"; }
    finally {
      pending = false;
      if (content.contains(panel)) {
        inputs.forEach((input, index) => { input.disabled = previous[index]; });
        update();
      }
    }
  }
  sell.onclick = () => {
    const amount = quantity();
    if (!valid || amount === null || (equipment && !confirmation.checked)) return;
    if (confirmation) confirmation.checked = false;
    void perform(() => actions.sellItem(target, amount));
  };
  if (lockButton) lockButton.onclick = () => {
    confirmation.checked = false;
    void perform(() => actions.toggleItemLock(target));
  };
  update();
}

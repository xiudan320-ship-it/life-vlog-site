import "./shop.css";
import { element, itemTile } from "./visual-ui.js";
import { getShopOffers } from "./shop-domain.js";
import { renderSaveFeedback } from "./save-feedback-view.js";

export function renderShop({ content, state, catalog, actions, selection, receipt }) {
  content.className = "monster-shop-content";
  const offers = getShopOffers({ state, catalog });
  if (!offers.some((offer) => offer.index === selection.index)) selection.index = null;
  const summary = element("section", undefined, "monster-original-panel monster-shop-summary");
  summary.append(element("h3", "魔石商店"), element("p", `魔石 ${state.money.toLocaleString("zh-CN")} · 金币 ${state.gold.toLocaleString("zh-CN")}`, "monster-shop-balance"));
  const selected = element("div", undefined, "monster-shop-selected");
  summary.append(selected);
  if (receipt) {
    const feedback = element("div", undefined, "monster-shop-feedback");
    renderSaveFeedback({ content: feedback, receipt, actions });
    summary.append(feedback);
  }
  content.append(summary);
  const list = element("div", undefined, "monster-shop-list");
  list.setAttribute("aria-label", "可购买商品");
  const buttons = new Map();
  function updateSelection() {
    const offer = offers.find((entry) => entry.index === selection.index);
    for (const [index, button] of buttons) button.setAttribute("aria-pressed", String(index === selection.index));
    selected.replaceChildren();
    if (!offer) { selected.append(element("p", "选择商品后确认兑换", "monster-panel-hint")); return; }
    const text = element("div", undefined, "monster-shop-selected-text");
    const amount = offer.goldOffer ? `金币 +${offer.quantity.toLocaleString("zh-CN")}` : `${offer.item.name} ×${offer.quantity}`;
    text.append(element("strong", amount), element("p", `消耗魔石 ${offer.price}${offer.goldOffer ? "" : ` · 已有 ${offer.owned}`}`));
    if (!offer.fits) text.append(element("p", offer.goldOffer ? "金币已达上限" : "材料数量已达上限", "monster-shop-warning"));
    else if (!offer.affordable) text.append(element("p", "魔石不足", "monster-shop-warning"));
    const buy = element("button", "确认兑换", "monster-image-button");
    buy.type = "button"; buy.dataset.shopPurchase = ""; buy.disabled = !offer.affordable;
    buy.setAttribute("aria-label", `确认用 ${offer.price} 魔石兑换${amount}`);
    buy.onclick = async () => {
      buy.disabled = true;
      for (const button of buttons.values()) button.disabled = true;
      try { await actions.buyShopOffer(offer.index); }
      finally {
        if (selected.isConnected) { buy.disabled = !offer.affordable; for (const button of buttons.values()) button.disabled = false; }
      }
    };
    selected.append(text, buy);
  }
  for (const offer of offers) {
    const button = element("button", undefined, "monster-shop-offer");
    button.type = "button"; button.dataset.shopOffer = String(offer.index);
    button.setAttribute("aria-pressed", "false");
    const text = element("span", undefined, "monster-shop-offer-text");
    const count = offer.goldOffer ? offer.item.name : `${offer.item.name} ×${offer.quantity}`;
    text.append(element("strong", count), element("small", `魔石 ${offer.price}`));
    button.append(itemTile({ id: offer.item.id }, catalog), text);
    button.onclick = () => { selection.index = offer.index; updateSelection(); };
    buttons.set(offer.index, button); list.append(button);
  }
  updateSelection();
  content.append(list, element("p", "抽奖、藏宝图、药剂等尚未移植的商品暂未开放。", "monster-panel-hint"));
}

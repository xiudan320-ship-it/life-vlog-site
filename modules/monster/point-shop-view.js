import "./point-shop.css";
import { element, itemTile, petTile, picture } from "./visual-ui.js";
import { getPointShopOffers } from "./point-shop-domain.js";
import { renderSaveFeedback } from "./save-feedback-view.js";

const categories = [["all", "全部"], ["1", "材料"], ["2", "徽章"], ["7", "宠物"], ["6", "称号"]];

export function renderPointShop({ content, state, catalog, actions, selection, receipt }) {
  content.className = "monster-point-shop-content";
  const offers = getPointShopOffers({ state, catalog });
  const header = element("section", undefined, "monster-original-panel monster-point-shop-header");
  header.append(element("h3", `任务积分 ${state.taskBoard?.points || 0}`), element("p", "完成任务领取积分；兑换不消耗成就积分。", "monster-panel-hint"));
  const tasks = element("button", "前往任务", "monster-image-button"); tasks.type = "button"; tasks.onclick = () => actions.tasks(); header.append(tasks);
  if (receipt) renderSaveFeedback({ content: header, receipt, actions });
  const tabs = element("nav", undefined, "monster-image-tabs monster-point-shop-tabs"); tabs.setAttribute("aria-label", "积分商品分类");
  const selected = element("section", undefined, "monster-original-panel monster-point-shop-selected"); selected.setAttribute("aria-label", "兑换详情");
  const list = element("div", undefined, "monster-point-shop-list"); list.setAttribute("aria-label", "积分商品");
  function render() {
    tabs.replaceChildren(); list.replaceChildren(); selected.replaceChildren();
    for (const [value, label] of categories) {
      const button = element("button", label, "monster-image-button"); button.type = "button"; button.setAttribute("aria-pressed", String(selection.category === value));
      button.onclick = () => { selection.category = value; selection.id = null; render(); }; tabs.append(button);
    }
    const visible = offers.filter((entry) => selection.category === "all" || entry.type === Number(selection.category));
    if (!visible.some((entry) => entry.id === selection.id)) selection.id = visible.find((entry) => !entry.reason)?.id ?? visible.find((entry) => !entry.reason.includes("尚未开放"))?.id ?? visible[0]?.id ?? null;
    const offer = visible.find((entry) => entry.id === selection.id);
    for (const entry of visible) {
      const button = element("button", undefined, "monster-point-offer"); button.type = "button"; button.dataset.pointOffer = String(entry.id);
      button.setAttribute("aria-pressed", String(entry.id === selection.id));
      button.setAttribute("aria-label", `${entry.product.name}，${entry.point} 任务积分`);
      const icon = entry.type === 7 ? petTile({ id: entry.product.id, quality: entry.product.quality }, catalog)
        : entry.type === 6 ? picture("ui/btn/main_btn_achieve.png") : itemTile({ id: entry.itemid }, catalog);
      const text = element("span"); text.append(element("strong", `${entry.product.name}${entry.type === 1 ? ` ×${entry.num}` : ""}`), element("small", `${entry.point} 积分`));
      button.append(icon, text); button.onclick = () => { selection.id = entry.id; render(); }; list.append(button);
    }
    if (!offer) { selected.append(element("p", "暂无可兑换商品", "monster-panel-hint")); return; }
    const title = offer.type === 1 ? `${offer.product.name} ×${offer.num}` : offer.product.name;
    selected.append(element("h4", title), element("p", `消耗任务积分 ${offer.point}${offer.type === 6 ? "" : ` · 已持有 ${offer.owned}`}`));
    if (offer.needlevel) selected.append(element("p", `角色等级 ${offer.needlevel} 起`));
    if (offer.achievepoint) selected.append(element("p", `需要成就积分 ${offer.achievepoint}（不消耗）`));
    if (offer.material) selected.append(element("p", `${offer.material.name} ${offer.needitemnum} / 已有 ${offer.materialOwned}`));
    if (offer.reason) selected.append(element("p", offer.reason, "monster-point-shop-warning"));
    const buy = element("button", "确认兑换", "monster-image-button"); buy.type = "button"; buy.dataset.pointPurchase = String(offer.id); buy.disabled = Boolean(offer.reason);
    buy.setAttribute("aria-label", `用 ${offer.point} 任务积分兑换${title}`);
    buy.onclick = async () => { buy.disabled = true; try { await actions.purchasePointOffer(offer.id); } finally { if (buy.isConnected) buy.disabled = Boolean(offer.reason); } };
    selected.append(buy);
  }
  content.append(header, tabs, selected, list, element("p", "原版随机神器和改名兑换尚未开放。", "monster-panel-hint"));
  render();
}

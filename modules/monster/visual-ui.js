export const monsterAssets = "/monster/assets/";

export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function picture(path, alt = "", className) {
  const image = element("img", undefined, className);
  image.src = monsterAssets + path;
  image.alt = alt;
  image.draggable = false;
  return image;
}

export function petTile(pet, catalog) {
  const row = catalog.pets.find((row) => row.id === pet.id);
  const tile = element("div", undefined, "monster-item monster-pet");
  tile.dataset.quality = pet.quality;
  tile.append(picture(`pet/${row.img}`, row.name), element("span", row.name, "monster-item-name"));
  return tile;
}

export function itemTile(item, catalog, { onClick, quantity = false } = {}) {
  const row = catalog.items.find((entry) => entry.id === item.id);
  const tile = element(onClick ? "button" : "div", undefined, "monster-item");
  if (onClick) { tile.type = "button"; tile.onclick = onClick; }
  tile.dataset.quality = item.quality || row.quality || 1;
  tile.title = row.name;
  tile.append(picture(`icon/item/${row.icon}`), element("span", row.name, "monster-item-name"));
  if (quantity) tile.append(element("b", item.quantity ?? 1, "monster-item-quantity"));
  return tile;
}

export function showItem(item, catalog, onEquip, onUpgrade) {
  const row = catalog.items.find((entry) => entry.id === item.id);
  const dialog = document.getElementById("monsterItemDetails");
  const content = dialog.querySelector(".monster-item-information");
  content.replaceChildren(itemTile(item, catalog), element("h2", row.name));
  if (item.level) content.append(element("p", `等级 ${item.level}${item.paragonGrowth ? ` · 巅峰 ${item.paragonGrowth}` : ""}`));
  if (item.scoreValue) content.append(element("p", `装备评分 ${item.scoreTier} / ${item.scoreValue}${item.godLevel ? ` · 神器 ${item.godLevel} 星` : ""}`));
  if (row.describe && row.describe !== "null") content.append(element("p", row.describe));
  if (item.strength) content.append(element("p", `强化 +${item.strength}`));
  if (item.enchantment) content.append(element("p", `附魔 ${["", "攻击", "防御", "生命", "命中", "闪避", "暴击", "暴击伤害", "负面抵抗"][item.enchantment.type]} +${item.enchantment.value}`));
  if (onUpgrade) {
    const upgrade = element("button", item.subtype === 9 ? "升级徽章" : "强化 / 重铸 / 附魔", "monster-image-button"); upgrade.type = "button";
    upgrade.onclick = () => { dialog.close(); onUpgrade(); }; content.append(upgrade);
  }
  if (onEquip) {
    const equip = element("button", "穿戴", "monster-image-button"); equip.type = "button";
    equip.onclick = () => { dialog.close(); onEquip(); }; content.append(equip);
  }
  if (!dialog.open) dialog.showModal();
}

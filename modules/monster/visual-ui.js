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

export function petTile(pet, catalog, onClick) {
  const row = catalog.pets.find((row) => row.id === pet.id);
  const tile = element(onClick ? "button" : "div", undefined, "monster-item monster-pet");
  if (onClick) { tile.type = "button"; tile.onclick = onClick; }
  tile.dataset.quality = pet.quality;
  tile.append(picture(`pet/${row.img}`, row.name), element("span", row.name, "monster-item-name"));
  if (pet.partyRole === 1) tile.append(element("b", "主宠", "monster-item-quantity"));
  if (pet.partyRole === 2) tile.append(element("b", "副宠", "monster-item-quantity"));
  return tile;
}

export function itemTile(item, catalog, { onClick, quantity = false } = {}) {
  const row = catalog.items.find((entry) => entry.id === item.id);
  const tile = element(onClick ? "button" : "div", undefined, "monster-item");
  if (onClick) { tile.type = "button"; tile.onclick = onClick; }
  tile.dataset.quality = item.quality || row.quality || 1;
  tile.title = row.name;
  tile.append(picture(`icon/item/${row.icon}`), element("span", row.name, "monster-item-name"));
  if (item.locked) tile.append(picture("bg/btn_lock2.png", "已锁定", "monster-item-lock"));
  if (quantity) tile.append(element("b", item.quantity ?? 1, "monster-item-quantity"));
  return tile;
}

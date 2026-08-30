function escapeSelectorValue(value) {
  return String(value ?? "").replace(/([\\"'\[\]\.\#:\(\)\s>+~])/g, "\\$1");
}

function findByData(root, attribute, value) {
  if (!root || !attribute || value == null) return null;
  return root.querySelector?.(`[${attribute}="${escapeSelectorValue(value)}"]`) || null;
}

function getItemIdentity(item) {
  for (const attribute of ["data-wish-id", "data-shopping-id", "data-weekend-id", "data-photo-id", "data-recipe-id"]) {
    if (item?.hasAttribute?.(attribute)) return { attribute, value: item.getAttribute(attribute) };
  }
  return null;
}

function getControlIdentity(element, item) {
  if (!element?.getAttribute) return null;
  for (const attribute of [...element.attributes].map((entry) => entry.name)) {
    if (!attribute.startsWith("data-") || item?.hasAttribute?.(attribute)) continue;
    const value = element.getAttribute(attribute);
    if (value) return { attribute, value };
  }
  if (element.id) return { attribute: "id", value: element.id };
  return null;
}

export function captureListFocus(root) {
  const active = root?.ownerDocument?.activeElement;
  if (!active || !root.contains?.(active)) return null;
  const item = active.closest?.("[data-wish-id], [data-shopping-id], [data-weekend-id], [data-photo-id], [data-recipe-id]");
  const itemIdentity = getItemIdentity(item);
  if (!itemIdentity) return null;
  return { item: itemIdentity, control: getControlIdentity(active, item) };
}

export function restoreListFocus(root, snapshot) {
  if (!root || !snapshot?.item) return false;
  const item = findByData(root, snapshot.item.attribute, snapshot.item.value);
  if (!item) return false;
  const target = snapshot.control
    ? snapshot.control.attribute === "id"
      ? root.ownerDocument?.getElementById(snapshot.control.value)
      : findByData(item, snapshot.control.attribute, snapshot.control.value)
    : item.querySelector("button, a, input, select, textarea");
  if (!target || target.disabled || target.hidden) return false;
  target.focus?.({ preventScroll: true });
  return true;
}

export function pulseListItem(root, attribute, value, windowTarget = globalThis.window) {
  const item = findByData(root, attribute, value);
  if (!item) return false;
  item.classList.remove("list-item-updated");
  void item.offsetWidth;
  item.classList.add("list-item-updated");
  const clear = () => item.classList.remove("list-item-updated");
  (windowTarget?.setTimeout || globalThis.setTimeout)(clear, 220);
  return true;
}

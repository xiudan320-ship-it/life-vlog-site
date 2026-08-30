export function mountRouteTemplate({ outlet, html, page, elements, refreshElements } = {}) {
  if (!outlet || !html) throw new Error("Route outlet is unavailable");
  if (page && [...outlet.children].some((element) => element.dataset.routeRoot === page)) {
    if (refreshElements && elements) Object.assign(elements, refreshElements());
    return;
  }
  const documentTarget = outlet.ownerDocument || document;
  const fragment = documentTarget.createRange().createContextualFragment(html);
  if (page) {
    const routeRoot = documentTarget.createElement("div");
    routeRoot.dataset.routeRoot = page;
    routeRoot.style.display = "contents";
    routeRoot.append(fragment);
    outlet.append(routeRoot);
  } else {
    outlet.append(fragment);
  }
  if (refreshElements && elements) Object.assign(elements, refreshElements());
}

function collectElements(root) {
  return Object.fromEntries(
    [...root.querySelectorAll("[id]")].map((element) => [element.id, element])
  );
}
function applySharedElementQueries(elements, documentTarget) {
  elements.dialog = elements.photoDialog || documentTarget.getElementById("photoDialog");

  elements.brand = documentTarget.querySelector(".brand");
  elements.mainNav = documentTarget.querySelector(".main-nav");
  elements.main = documentTarget.querySelector("main");
  elements.heroSignature = documentTarget.querySelector(".hero-copy > p:last-child");
  elements.settingsShell = documentTarget.querySelector("[data-settings-shell]");
  elements.settingsDirectory = documentTarget.querySelector("[data-settings-directory]");
  elements.settingsSearchInput = documentTarget.querySelector("#settingsSearchInput");
  elements.settingsNavButtons = documentTarget.querySelectorAll("[data-settings-nav] [data-settings-section]");
  elements.settingsGroups = documentTarget.querySelectorAll("[data-settings-content] .settings-group");
  elements.chips = documentTarget.querySelectorAll(".chip");
  elements.dialogMedia = documentTarget.querySelector("#photoDialog .dialog-media");
  return elements;
}

export function collectShellElements(documentTarget = document) {
  const elements = collectElements(documentTarget);
  return applySharedElementQueries(elements, documentTarget);
}

export function collectRouteElements(page, documentTarget = document) {
  if (!page) return {};
  const routeRoot = [...documentTarget.querySelectorAll("[data-route-root]")]
    .find((element) => element.dataset.routeRoot === page);
  if (!routeRoot) return {};
  const elements = collectElements(routeRoot);
  if (routeRoot.id) elements[routeRoot.id] = routeRoot;
  return applySharedElementQueries(elements, documentTarget);
}

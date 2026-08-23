const ELEMENT_ALIASES = {
  dialog: "photoDialog",
};

export function collectAppElements(documentTarget = document) {
  const elements = Object.fromEntries(
    [...documentTarget.querySelectorAll("[id]")].map((element) => [element.id, element])
  );

  for (const [alias, id] of Object.entries(ELEMENT_ALIASES)) {
    elements[alias] = elements[id] || null;
  }

  elements.brand = documentTarget.querySelector(".brand");
  elements.heroSignature = documentTarget.querySelector(".hero-copy > p:last-child");
  elements.settingsNavButtons = documentTarget.querySelectorAll("[data-settings-section]");
  elements.settingsGroups = documentTarget.querySelectorAll(".settings-group");
  elements.chips = documentTarget.querySelectorAll(".chip");
  elements.dialogMedia = documentTarget.querySelector("#photoDialog .dialog-media");

  return elements;
}

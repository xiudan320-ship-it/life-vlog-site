/** Pointer taps do not leave a focus ring; keyboard navigation keeps one. */
export function trackFocusModality(document) {
  const root = document.documentElement;
  root.dataset.monsterInput = "pointer";
  document.addEventListener("pointerdown", () => { root.dataset.monsterInput = "pointer"; }, true);
  document.addEventListener("keydown", (event) => {
    if (!event.altKey && !event.ctrlKey && !event.metaKey) root.dataset.monsterInput = "keyboard";
  }, true);
}

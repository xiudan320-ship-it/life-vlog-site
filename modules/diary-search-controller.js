const boundPanels = new WeakSet();

export function toggleDiarySearch(elements) {
  const panel = elements.diarySearchPanel;
  const toggle = elements.diarySearchToggle;
  const input = elements.diarySearchInput;
  function setExpanded(expanded) {
    panel.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    (expanded ? input : toggle).focus({ preventScroll: true });
  }
  if (!boundPanels.has(panel)) {
    panel.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
    });
    boundPanels.add(panel);
  }
  setExpanded(panel.hidden);
}

const ICON_PATHS = {
  bag: '<path d="M6.5 8.5h11l1 11h-13l1-11Z"/><path d="M9 9V6.75a3 3 0 0 1 6 0V9"/>',
  check: '<path d="m7 12.5 3.2 3.2L17.5 8.5"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/>',
  heart: '<path d="M20.8 5.9a5.5 5.5 0 0 0-7.8 0L12 7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z"/>',
  loader: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
};

export function renderListIcon(name, className = "") {
  const paths = ICON_PATHS[name];
  if (!paths) throw new Error(`Unknown list icon: ${name}`);
  const classes = ["list-icon", className].filter(Boolean).join(" ");
  return `<svg class="${classes}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

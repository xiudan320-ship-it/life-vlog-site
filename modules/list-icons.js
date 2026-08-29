const ICON_PATHS = {
  bag: '<path d="M6.5 8.5h11l1 11h-13l1-11Z"/><path d="M9 9V6.75a3 3 0 0 1 6 0V9"/>',
  alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  back: '<path d="m15 5-7 7 7 7"/><path d="M8 12h13"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M7 2v4M17 2v4M3 9h18M8 13h3M8 17h5"/>',
  check: '<path d="m7 12.5 3.2 3.2L17.5 8.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/>',
  edit: '<path d="m4 16.5-.8 3.3 3.3-.8L18 7.5 15.5 5 4 16.5Z"/><path d="m13.5 7 3.5 3.5"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/>',
  heart: '<path d="M20.8 5.9a5.5 5.5 0 0 0-7.8 0L12 7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.4" fill="currentColor" stroke="none"/><path d="m4 17 4.8-4.5 3.4 3 2.5-2.3L20 18"/>',
  loader: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/>',
  message: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  moon: '<path d="M20.5 15.1A8.5 8.5 0 0 1 8.9 3.5 8.5 8.5 0 1 0 20.5 15.1Z"/>',
  pin: '<path d="M8 4h8l-1 5 3 3H6l3-3-1-5Z"/><path d="M12 12v8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  book: '<path d="M5 4.5h5.5A2.5 2.5 0 0 1 13 7v13a2.5 2.5 0 0 0-2.5-2.5H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z"/><path d="M19 4.5h-5.5A2.5 2.5 0 0 0 11 7v13a2.5 2.5 0 0 1 2.5-2.5H19a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2Z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4.8L4 8"/><path d="M4 4v4h4M4 13a8 8 0 0 0 14 4.8L20 16"/><path d="M20 20v-4h-4"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4 4"/>',
  settings: '<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="4.2"/>',
  sparkle: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  rotate: '<path d="M20 11a8 8 0 0 0-13.5-5.8L4 7.5"/><path d="M4 3.5v4h4"/><path d="M4 13a8 8 0 0 0 13.5 5.8L20 16.5"/><path d="M20 20.5v-4h-4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 4h6l1 3H8l1-3Z"/>',
  expand: '<path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/><path d="M4 4l6 6M20 4l-6 6M20 20l-6-6M4 20l6-6"/>',
  fit: '<path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
};

export function renderListIcon(name, className = "") {
  const paths = ICON_PATHS[name];
  if (!paths) throw new Error(`Unknown list icon: ${name}`);
  const classes = ["list-icon", className].filter(Boolean).join(" ");
  return `<svg class="${classes}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

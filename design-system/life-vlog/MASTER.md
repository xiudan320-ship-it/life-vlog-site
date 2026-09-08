# Life Vlog Design System

开发入口：[DESIGN.md](../../DESIGN.md)。保留当前浅色/深色绿色系 UI 与现有资产，不实施蓝月 / P3R 改版。

## Product direction

Life Vlog is a private, mobile-first life archive for photos, video, diaries, wishes, shopping ideas, weekends, and personal collections. The interface is content-first: media and readable records take priority over decoration.

This system combines the verified UI/UX Pro Max matches for Minimalism & Swiss Style, OLED media interfaces, single-accent dark palettes, Inter/system typography, touch-friendly controls, and reduced motion. The automatic product-wide generator returned an unrelated warm paper-journal palette and scroll-storytelling pattern, so that result was rejected and not persisted.

## Visual language

- Preserve both existing light and dark appearances: quiet, modern, personal, and content-first.
- Use one lime accent for selection, prices, primary actions, completion, and focus.
- Let photos and videos provide most of the color.
- Prefer clear grids, restrained rounded corners, and subtle surface separation.
- Avoid glow, decorative gradients, heavy glass effects, emoji icons, and excessive borders.

## Core tokens

以下 --lv-* 为设计参考，不是当前全局 CSS 变量契约。实际使用 styles/redesign-foundation.css 中的语义变量及组件最终层叠值：浅色背景 #f2f4ef、表面 #ffffff、文字 #151816、强调色 #5b9834；深色背景 #0d100f、表面 #171b19、文字 #f0f4ef、强调色 #8bc95f。不要为匹配参考 token 改写现有 UI。

```css
--lv-bg: #0d0f0e;
--lv-surface: #151816;
--lv-surface-raised: #1c201d;
--lv-text: #f4f7ef;
--lv-text-muted: #a6afa8;
--lv-text-faint: #858e87;
--lv-accent: #8ed653;
--lv-on-accent: #10200d;
--lv-border: #2b322d;
--lv-danger: #ff827d;
--lv-focus: #b8ee8d;

--lv-space-1: 4px;
--lv-space-2: 8px;
--lv-space-3: 12px;
--lv-space-4: 16px;
--lv-space-5: 20px;
--lv-space-6: 24px;
--lv-space-8: 32px;
--lv-space-12: 48px;

--lv-radius-control: 12px;
--lv-radius-media: 14px;
--lv-radius-card: 18px;
--lv-radius-pill: 999px;
```

## Typography

- Font stack: Inter, "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif.
- Do not add a remote font dependency; use the existing system-first stack.
- Page title: 36–56px, 700 weight, tight but readable line height.
- Card title: 16–18px, 650–700 weight.
- Body and notes: 14–16px, at least 1.45 line height.
- Metadata and labels: at least 12px. Never use tiny text to force density.
- Uppercase English kickers may use 12px with increased letter spacing.

## Layout

- Mobile-first layout with QA at 375, 390, 430, 768, 1024, and 1440px.
- Compact web mode ends at 700px to match the current application shell.
- Main feature content should normally use 100% width on mobile and 960px maximum on desktop.
- Lists use one item per row. Density comes from information hierarchy, not tiny text.
- No horizontal overflow at any supported width.

## Components and interaction

- Touch controls are at least 44×44px, with at least 8px between adjacent actions.
- Use SVG or simple typographic symbols for icons; never use emoji as functional icons.
- The life-tool dock uses the supplied unified 120×120 teal/gold SVG icon set from `public/assets/tool-icons/`; icons are decorative inside labelled buttons and use fixed dimensions to avoid layout shift.
- On phone widths, the life-tool dock shows three complete equal-width cards in the default order 时间纪念册、本周回顾、留言; keep the remaining tools in the same horizontal touch rail so users can swipe to them. The first three cards must fit the viewport exactly, with no partial fourth card before the swipe. Keep at least 44px touch height, an 8px gap, `touch-action: pan-x`, and `overscroll-behavior-x: contain`; secondary subtitles may hide at this width so the labelled entry remains complete.
- Time album, weekly review, and thanks dialogs share the same 8px outer radius, 1px semantic border, surface background, close-button treatment, section padding, and card border/radius/surface tokens. Thanks is an application-shell dialog rather than a standalone route. Weekly summary panels and thanks content must not switch to a bright inverted surface that breaks the dialog hierarchy.
- Primary actions use lime fill. Secondary actions use quiet surfaces. Destructive actions use red only when needed.
- Every icon-only button has an accessible name and a visible keyboard focus ring.
- Segmented controls are compact and do not stretch across large desktop widths.
- Status filters are text tabs with a short lime indicator, not large enclosing cards.
- Cards use one quiet surface, no decorative outline, and a subtle raised state on hover/drag.
- Completed records remain fully readable: no opacity reduction and no strike-through.
- Media previews use `object-fit: cover` in cards and `object-fit: contain` in full previews. Diary/VLOG detail videos may start muted on entry, retain native controls, and never force sound on the user.
- Menus become bottom sheets on mobile and compact anchored dialogs on desktop.
- The desktop today overview uses a narrow bordered left panel with the two member mood seats stacked vertically and a wider bordered panel for the current-month mood-calendar thumbnail; on wide desktop, a three-column layout keeps both panels in the viewport's right rail, with today's mood panel above the current-month calendar while the heading and quick actions stay in the centered content column. The wide right-side stack uses an independent layer anchored after the heading, so its height never creates a central grid row or pushes follow-on content down; keep a central gutter so it cannot cover the content column. At ordinary desktop widths the panels retain their existing shared grid-row top and bottom edges, and the left cards fill the available panel height with a fixed gap. The desktop-only fill rules reset to natural two-column cards in short landscape. Use 64px-or-smaller eager mood media, show cached today data before background sync, and hide the calendar panel below the desktop breakpoint so mobile spacing remains unchanged.

### Primary navigation and diary filters

- Primary navigation is an adaptive horizontal flex row: visible entries use the available width, while overflow is contained by the navigation row itself and never by the page.
- Keep every navigation item and settings action at least 44×44px with an 8px minimum gap; preserve DOM/visual order and expose route state with `aria-current` or mode state with `aria-pressed`.
- The default top-level order is 日记、VLOG、心愿、周末、衣柜. Optional entries are 菜谱、留言、秘藏; at most five entries can be enabled, 日记 is always enabled, VLOG remains a mode, 留言 opens the shell dialog rather than a route, and 心情 remains a deep-link/calendar destination rather than a top-level item. On mobile, all five entries stay fully visible inside the navigation row.
- The appearance settings panel owns enable/disable and up/down ordering. Changes provide immediate status feedback and remain scoped to the existing user/device preference store.
- Diary search and tag filters stay in normal document flow. On mobile, tags remain on one row and scroll horizontally within their own container. Do not use `position: sticky`, fixed top offsets, or a page-level horizontal overflow workaround for these filters.

## Motion

- Mobile diary pull-to-refresh follows vertical drag with a rotating indicator and distinct release/loading/result text; cancelling hides it, refreshing is single-flight, and reduced motion disables rotation. Keep controls, media gestures and open dialogs excluded.

- Default feedback: 140–220ms.
- Use motion only for state, selection, swipe, and spatial continuity.
- Do not introduce GSAP for this application.
- Respect `prefers-reduced-motion` and render the final state immediately.

## Accessibility and delivery gate

- Normal text contrast must meet 4.5:1.
- Focus must remain visible and unobscured.
- State cannot be communicated by color alone; keep text, icon, or ARIA state.
- Mobile page-level browser zoom follows the product viewport contract; Dynamic Type / xlarge text settings and in-app media viewer zoom remain available.
- Mobile text inputs, selects, and textareas use a computed font size of at least 16px to avoid focus zoom.
- Notification loading, empty, error, and retry states remain visible in the dialog; closing during a request restores focus to the bell without reopening the dialog.
- Shell dialogs, including thanks, expose a named close control, dismiss on Escape/backdrop, and restore focus to the triggering entry after close.
- Transient feedback opened while a native dialog is active follows the current dialog into the top layer and is removed when that dialog closes; it must not remain behind or reappear after close.
- Push settings bind after the lazy settings DOM exists; disabling this device is busy/disabled during the operation, unsubscribes locally before remote cleanup, and clearly reports a remote cleanup failure without undoing the local result.
- Images have meaningful alt text or are explicitly decorative.
- Validate keyboard, pointer, and touch behavior.
- Choose checks by actual change risk using `docs/README.md` and `docs/CHANGE_WORKFLOW.md`; deployment follows `docs/release-checklist.md`. Use deterministic in-memory fixtures. Documentation-only changes require document/link and diff checks, not a full browser release run.


# Wishlist / Shopping Page Rules

This page follows `../MASTER.md`. These rules override the master only for the shared wishlist and personal buy-list hub.

## Structure

1. Shared page title, summary, and sync status.
2. Compact `心愿单 / 购物车` segmented control.
3. One lightweight add action.
4. `未完成 / 已完成` text filters.
5. Single-column card list.

The shared header must not be duplicated inside the shopping module. Switching modules changes the title, summary, status, and content in place without layout jumping.

## Sizing

- Desktop content max width: 960px.
- Module switch: about 220px wide and 44px high.
- Mobile card media: 84–88px square.
- Desktop card media: 96px square.
- Card action column: 44px wide.
- Card gap: 12px mobile, 14px desktop.
- Card padding: 12px mobile, 14px desktop.

## Information hierarchy

- Wishlist: type/priority → title → dates and note → completion receipt.
- Shopping: product name → price → purchase state → note/link → added date.
- Notes may use two lines. Titles use up to two lines on mobile rather than destructive truncation.
- Completion receipts remain visible but visually quieter than the title.

## Actions

- `•••` opens edit, completion toggle, and delete actions.
- The circular check control is the fastest completion action.
- Left swipe exposes completion and delete on touch devices.
- Long press sorting remains available only where the controller permits it.
- Clicking the card opens detail; clicking media opens centered media preview.
- Action, media, link, and menu clicks must not also open card detail.

## Completion state

- Never dim the whole card.
- Never strike through the title.
- Use the lime check, status text, and saved completion information.

## Empty and loading states

- Use a restrained inline SVG icon, one sentence, and one primary add action.
- Loading and error messages use `role="status"` where appropriate.
- Do not use shopping bag or cart emoji placeholders.


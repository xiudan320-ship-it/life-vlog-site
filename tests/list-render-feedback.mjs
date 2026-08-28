import assert from "node:assert/strict";
import test from "node:test";
import { captureListFocus, pulseListItem, restoreListFocus } from "../modules/list-render-feedback.js";

function attrs(entries) {
  return entries.map(([name, value]) => ({ name, value }));
}

test("list rendering restores focus to the same item control", () => {
  let focused = false;
  const item = {
    hasAttribute: (name) => name === "data-wish-id",
    getAttribute: (name) => name === "data-wish-id" ? "wish-1" : null,
    querySelector: (selector) => selector.includes("data-toggle-wish") ? target : null,
  };
  const target = { disabled: false, hidden: false, focus: () => { focused = true; } };
  const active = {
    attributes: attrs([["data-toggle-wish", "wish-1"]]),
    getAttribute: (name) => name === "data-toggle-wish" ? "wish-1" : null,
    closest: () => item,
  };
  const root = {
    ownerDocument: { activeElement: active },
    contains: (value) => value === active,
    querySelector: (selector) => selector.includes("data-wish-id") ? item : null,
  };
  const snapshot = captureListFocus(root);
  assert.deepEqual(snapshot, {
    item: { attribute: "data-wish-id", value: "wish-1" },
    control: { attribute: "data-toggle-wish", value: "wish-1" },
  });
  assert.equal(restoreListFocus(root, snapshot), true);
  assert.equal(focused, true);
});

test("updated list items receive a short, removable micro-feedback state", () => {
  const values = new Set();
  const item = {
    classList: { add: (value) => values.add(value), remove: (value) => values.delete(value) },
    getAttribute: () => "wish-1",
    offsetWidth: 1,
  };
  const root = { querySelector: () => item };
  const scheduled = [];
  assert.equal(pulseListItem(root, "data-wish-id", "wish-1", { setTimeout: (callback) => scheduled.push(callback) }), true);
  assert.equal(values.has("list-item-updated"), true);
  scheduled.shift()();
  assert.equal(values.has("list-item-updated"), false);
});

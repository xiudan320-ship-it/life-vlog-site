import assert from "node:assert/strict";
import test from "node:test";
import { updateSecretViewerToolbar } from "../modules/photo-dialog-view.js";

function button() {
  return {
    disabled: false,
    attributes: new Map(),
    classList: { toggle(name, enabled) { this[name] = enabled; } },
    setAttribute(name, value) { this.attributes.set(name, value); },
  };
}

test("secret viewer toolbar tolerates an unavailable optional info control", () => {
  const toolbar = { hidden: true };
  const counter = { textContent: "" };
  const zoomValue = { textContent: "" };
  const previousButton = button();
  const nextButton = button();
  const zoomOutButton = button();
  const zoomInButton = button();

  assert.doesNotThrow(() => updateSecretViewerToolbar({
    toolbar,
    counter,
    zoomValue,
    previousButton,
    nextButton,
    zoomOutButton,
    zoomInButton,
    infoButton: null,
    open: true,
    total: 2,
    index: 0,
    zoomScale: 1,
    infoOpen: false,
  }));
  assert.equal(toolbar.hidden, false);
  assert.equal(counter.textContent, "1 / 2");
  assert.equal(zoomValue.textContent, "100%");
  assert.equal(previousButton.disabled, true);
  assert.equal(nextButton.disabled, false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { getDiaryActionIds, getDiaryActionModel } from "../modules/diary-action-domain.js";

test("owner actions keep favorite and edit primary while moving destructive work to more", () => {
  const model = getDiaryActionModel({ signedIn: true, isOwner: true, isAdmin: true, isPinned: true, isFavorite: true });
  assert.deepEqual(getDiaryActionIds(model), ["favorite", "edit", "unpin", "delete"]);
  assert.equal(model.favorite.pressed, true);
  assert.equal(model.more.at(-1).danger, true);
});

test("admin viewing another member gets category as the only primary action", () => {
  const model = getDiaryActionModel({ signedIn: true, isAdmin: true, isPinned: true });
  assert.deepEqual(getDiaryActionIds(model), ["favorite", "category", "unpin"]);
  assert.equal(model.more.some((item) => item.id === "delete"), false);
});

test("ordinary signed-in member cannot see management actions", () => {
  const model = getDiaryActionModel({ signedIn: true });
  assert.deepEqual(getDiaryActionIds(model), ["favorite"]);
  assert.deepEqual(model.more, []);
});

test("guest has no diary actions", () => {
  assert.deepEqual(getDiaryActionIds(getDiaryActionModel()), []);
});

import assert from "node:assert/strict";
import test from "node:test";

import { flattenCommentThread } from "../modules/comment-thread-domain.js";

const authorNames = new Map([
  ["owner", "小秀"],
  ["member", "小咻"],
]);

function comment(id, parentId = null, userId = "member", createdAt = `2026-08-01T00:00:${String(id).padStart(2, "0")}Z`, body = `留言 ${id}`) {
  return {
    id,
    parent_id: parentId,
    user_id: userId,
    created_at: createdAt,
    body,
  };
}

function flatten(comments) {
  return flattenCommentThread(comments, {
    getAuthorName: (userId) => authorNames.get(userId) || userId || "成员",
  });
}

test("an eight-level reply chain becomes ordered sibling rows without losing semantics", () => {
  const comments = [
    comment("reply-8", "reply-7", "owner", "2026-08-01T00:00:08Z"),
    comment("root", null, "owner", "2026-08-01T00:00:00Z", "这是一条根留言"),
    comment("reply-3", "reply-2", "member", "2026-08-01T00:00:03Z"),
    comment("reply-1", "root", "member", "2026-08-01T00:00:01Z"),
    comment("reply-7", "reply-6", "member", "2026-08-01T00:00:07Z"),
    comment("reply-2", "reply-1", "owner", "2026-08-01T00:00:02Z"),
    comment("reply-6", "reply-5", "owner", "2026-08-01T00:00:06Z"),
    comment("reply-5", "reply-4", "member", "2026-08-01T00:00:05Z"),
    comment("reply-4", "reply-3", "owner", "2026-08-01T00:00:04Z"),
  ];

  const rows = flatten(comments);

  assert.deepEqual(rows.map(({ id }) => id), [
    "root", "reply-1", "reply-2", "reply-3", "reply-4", "reply-5", "reply-6", "reply-7", "reply-8",
  ]);
  assert.deepEqual(rows.map(({ logicalDepth }) => logicalDepth), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(rows.every((row) => row.rootId === "root"));
  assert.equal(rows.at(-1).parentId, "reply-7");
  assert.equal(rows.at(-1).replyTargetId, "reply-7");
  assert.equal(rows.at(-1).replyTargetName, "小咻");
  assert.equal(rows.at(-1).body, "留言 reply-8");
});

test("orphan, cyclic, and duplicate parent data terminates with one stable row per id", () => {
  const rows = flatten([
    comment("cycle-b", "cycle-a", "owner", "2026-08-02T00:00:02Z"),
    comment("orphan", "deleted-parent", "member", "2026-08-02T00:00:03Z", "300 字中文留言，包含 https://example.test/a/very-long-url-token 和连续EnglishTextWithoutSpaces"),
    comment("cycle-a", "cycle-b", "member", "2026-08-02T00:00:01Z"),
    comment("duplicate", null, "owner", "2026-08-02T00:00:04Z"),
    comment("duplicate", null, "member", "2026-08-02T00:00:05Z"),
  ]);

  assert.deepEqual(rows.map(({ id }) => id), ["orphan", "duplicate", "cycle-a", "cycle-b"]);
  assert.equal(new Set(rows.map(({ id }) => id)).size, rows.length);
  assert.ok(rows.every(({ logicalDepth, rootId }) => Number.isInteger(logicalDepth) && logicalDepth >= 0 && rootId));
  assert.equal(rows.find(({ id }) => id === "orphan").replyTargetId, "deleted-parent");
  assert.equal(rows.find(({ id }) => id === "orphan").replyTargetName, "原留言已不可用");
  assert.match(rows.find(({ id }) => id === "orphan").body, /连续EnglishTextWithoutSpaces/u);
});

console.log("Comment thread domain tests passed.");

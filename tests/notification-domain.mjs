import test from "node:test";
import assert from "node:assert/strict";

import { buildNotificationText } from "../modules/notification-domain.js";

test("family item and evening mood notifications have direct, readable copy", () => {
  assert.equal(buildNotificationText({ type: "wish" }, "小秀"), "小秀 新增了一条心愿");
  assert.equal(buildNotificationText({ type: "shopping" }, "小咻"), "小咻 添加了购物车商品");
  assert.equal(buildNotificationText({ type: "mood_reminder" }, "小秀"), "今天还没有记录心情");
});

console.log("Notification domain tests passed.");

import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare-worker/src/worker.js";

test("Tokyo 18:00 reminder skips recorded users and deduplicates retries; backup sends none", async () => {
  const notifications = [];
  const dates = [];
  const DB = { prepare(sql) {
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async all() {
        if (sql === "select id from users") return { results: [{ id: "empty" }, { id: "recorded" }] };
        throw new Error(`Unexpected SQL: ${sql}`);
      },
      async first() {
        if (sql.includes("from mood_diaries")) { dates.push(args[1]); return args[0] === "recorded" ? { id: "mood" } : null; }
        if (sql.includes("from notifications")) return notifications.find(row => row[1] === args[0] && row[4] >= args[2] && row[4] < args[3]);
        throw new Error(`Unexpected SQL: ${sql}`);
      },
      async run() {
        assert.ok(sql.includes("insert into notifications"));
        notifications.push(args); return { success: true };
      },
    };
  } };
  const run = async (cron, env = { DB }) => {
    const jobs = [];
    await worker.scheduled({ cron, scheduledTime: Date.parse("2026-09-08T09:00:00Z") }, env, { waitUntil: p => jobs.push(p) });
    if (cron === "20 18 * * *") {
      const results = await Promise.allSettled(jobs);
      for (const result of results) {
        assert.equal(result.status, "rejected");
        assert.match(result.reason.message, /backup fixture/);
      }
    }
    else await Promise.all(jobs);
    return jobs.length;
  };
  assert.equal(await run("0 9 * * *"), 1);
  await run("0 9 * * *");
  assert.equal(notifications.length, 1);
  assert.deepEqual([...new Set(dates)], ["2026-09-08"]);
  assert.equal(await run("0 11 * * *"), 0);
  const backupQueries = [];
  assert.equal(await run("20 18 * * *", { DB: { prepare(sql) {
    backupQueries.push(sql);
    throw new Error("backup fixture: stop before storage operations");
  } } }), 2);
  assert.equal(backupQueries.length, 2);
  assert.ok(backupQueries.every(sql => sql.startsWith("select * from ")));
  assert.equal(notifications.length, 1);
});

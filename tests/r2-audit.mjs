import assert from "node:assert/strict";
import test from "node:test";
import { auditR2Objects } from "../cloudflare-worker/src/r2-audit.js";

function createEnvironment(rowsByQuery, pages) {
  return {
    PUBLIC_R2_URL: "https://assets.example.test",
    DB: {
      prepare(query) {
        return {
          async all() {
            const key = Object.keys(rowsByQuery).find((candidate) => query.includes(candidate));
            return { results: key ? rowsByQuery[key] : [] };
          },
        };
      },
    },
    R2_BUCKET: {
      async list({ cursor } = {}) {
        return pages[cursor || "first"];
      },
    },
  };
}

test("R2 audit protects referenced, recoverable, system, and recent objects", async () => {
  const now = Date.parse("2026-08-25T12:00:00.000Z");
  const environment = createEnvironment(
    {
      "from photos": [
        {
          image_path: "r2:user/photos/photo.jpg",
          image_url: "https://assets.example.test/user/photos/photo.jpg",
          note: encodeURIComponent(JSON.stringify({ video_path: "r2:user/videos/clip.mov" })),
        },
      ],
      "from trash_items": [{ payload: JSON.stringify({ image_path: "r2:user/trash/recover.jpg" }) }],
    },
    {
      first: {
        truncated: true,
        cursor: "next",
        objects: [
          { key: "user/photos/photo.jpg", size: 100, uploaded: "2026-08-20T00:00:00.000Z" },
          { key: "user/videos/clip.mov", size: 1000, uploaded: "2026-08-20T00:00:00.000Z" },
          { key: "user/trash/recover.jpg", size: 200, uploaded: "2026-08-20T00:00:00.000Z" },
        ],
      },
      next: {
        truncated: false,
        objects: [
          { key: "system-backups/d1.backup", size: 300, uploaded: "2026-08-20T00:00:00.000Z" },
          { key: "user/uploads/recent.mov", size: 400, uploaded: "2026-08-25T11:30:00.000Z" },
          { key: "user/uploads/orphan.mov", size: 500, uploaded: "2026-08-20T00:00:00.000Z" },
        ],
      },
    }
  );

  const report = await auditR2Objects(environment, now);
  assert.equal(report.object_count, 6);
  assert.equal(report.used_bytes, 2500);
  assert.equal(report.referenced_bytes, 1300);
  assert.equal(report.protected_bytes, 300);
  assert.equal(report.orphaned_count, 1);
  assert.equal(report.orphaned_bytes, 500);
  assert.equal(report.orphaned[0].key, "user/uploads/orphan.mov");
  assert.equal(report.recent_unreferenced_count, 1);
  assert.equal(report.recent_unreferenced[0].key, "user/uploads/recent.mov");
});

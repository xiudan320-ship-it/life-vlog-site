PRAGMA foreign_keys = OFF;

CREATE TABLE trash_items_next (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('photo', 'secret', 'recipe', 'wish', 'weekend', 'anniversary', 'gratitude')),
  item_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL
);

INSERT INTO trash_items_next
  (id, user_id, item_type, item_id, label, payload, deleted_at, expires_at)
SELECT id, user_id, item_type, item_id, label, payload, deleted_at, expires_at
FROM trash_items;

DROP TABLE trash_items;
ALTER TABLE trash_items_next RENAME TO trash_items;

CREATE INDEX IF NOT EXISTS trash_items_user_deleted_idx
  ON trash_items (user_id, deleted_at DESC);

PRAGMA foreign_keys = ON;

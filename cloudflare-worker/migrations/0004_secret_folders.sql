CREATE TABLE IF NOT EXISTS secret_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS secret_folders_user_sort_idx
  ON secret_folders (user_id, sort_order ASC);

ALTER TABLE secret_items ADD COLUMN folder_id TEXT REFERENCES secret_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS secret_items_folder_sort_idx
  ON secret_items (folder_id, sort_order ASC);

ALTER TABLE secret_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE secret_items
SET sort_order = -CAST(strftime('%s', created_at) AS INTEGER) * 1000
WHERE sort_order = 0;

CREATE INDEX IF NOT EXISTS secret_items_user_sort_idx
  ON secret_items (user_id, sort_order ASC);

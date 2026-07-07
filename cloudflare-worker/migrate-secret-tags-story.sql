update secret_items
set images = (
  select json_group_array(json(json_set(value, '$.tag', '故事集')))
  from json_each(secret_items.images)
),
updated_at = datetime('now')
where images is not null
  and json_valid(images)
  and json_array_length(images) > 0;

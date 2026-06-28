-- Run once in Supabase Dashboard > SQL Editor.
-- Adds synced completion thoughts for wishlist items.

alter table public.wishes
  add column if not exists completion_note text not null default '';

notify pgrst, 'reload schema';

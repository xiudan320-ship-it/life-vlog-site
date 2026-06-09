-- Run once in Supabase Dashboard > SQL Editor.

alter table public.user_profiles
  add column if not exists home_name text not null default '咻蛋之家';

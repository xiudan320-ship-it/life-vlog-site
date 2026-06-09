-- Run this file once in Supabase Dashboard > SQL Editor.
-- It adds cloud sync for account progress, recipes, wishes, and anniversaries.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  recharge_total integer not null default 0 check (recharge_total >= 0),
  vip_level smallint not null default 0 check (vip_level between 0 and 5),
  experience_total integer not null default 0 check (experience_total >= 0),
  last_login_date date,
  local_data_migrated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists theme_preference text
  check (theme_preference in ('light', 'dark'));

alter table public.user_profiles
  add column if not exists home_name text not null default '咻蛋之家';

alter table public.photos
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_pinned boolean not null default false;

create table if not exists public.photo_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, photo_id)
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default '家常菜',
  cooking_time text not null default '',
  servings text not null default '',
  cover_image text not null default '',
  seasonings text[] not null default '{}',
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  wish_type text not null default '想做',
  planned_date date,
  priority text not null default '普通',
  note text not null default '',
  is_done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekend_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  plan_date date not null,
  location text not null default '',
  plan_type text not null default '出门玩',
  note text not null default '',
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_type text not null default 'annual'
    check (event_type in ('pet', 'together', 'annual')),
  event_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_created_idx
  on public.recipes (user_id, created_at desc);

create index if not exists wishes_user_done_created_idx
  on public.wishes (user_id, is_done, created_at desc);

create index if not exists weekend_plans_user_date_idx
  on public.weekend_plans (user_id, plan_date asc);

create index if not exists anniversaries_user_date_idx
  on public.anniversaries (user_id, event_date asc);

create index if not exists photos_featured_date_idx
  on public.photos (is_featured, taken_at desc);

create index if not exists photos_pinned_date_idx
  on public.photos (is_pinned, taken_at desc);

alter table public.user_profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.wishes enable row level security;
alter table public.weekend_plans enable row level security;
alter table public.anniversaries enable row level security;
alter table public.photo_favorites enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.user_profiles to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.wishes to authenticated;
grant select, insert, update, delete on public.weekend_plans to authenticated;
grant select, insert, update, delete on public.anniversaries to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert, delete on public.photo_favorites to authenticated;

drop policy if exists "Users can read their own profile" on public.user_profiles;
drop policy if exists "Users can create their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;
drop policy if exists "Users can read their own recipes" on public.recipes;
drop policy if exists "Users can create their own recipes" on public.recipes;
drop policy if exists "Users can update their own recipes" on public.recipes;
drop policy if exists "Users can delete their own recipes" on public.recipes;
drop policy if exists "Users can read their own wishes" on public.wishes;
drop policy if exists "Users can create their own wishes" on public.wishes;
drop policy if exists "Users can update their own wishes" on public.wishes;
drop policy if exists "Users can delete their own wishes" on public.wishes;
drop policy if exists "Users can read their own weekend plans" on public.weekend_plans;
drop policy if exists "Users can create their own weekend plans" on public.weekend_plans;
drop policy if exists "Users can update their own weekend plans" on public.weekend_plans;
drop policy if exists "Users can delete their own weekend plans" on public.weekend_plans;
drop policy if exists "Users can read their own anniversaries" on public.anniversaries;
drop policy if exists "Users can create their own anniversaries" on public.anniversaries;
drop policy if exists "Users can update their own anniversaries" on public.anniversaries;
drop policy if exists "Users can delete their own anniversaries" on public.anniversaries;
drop policy if exists "Users can delete their own photos" on public.photos;
drop policy if exists "Users can update their own photos" on public.photos;
drop policy if exists "Users can read their own photo favorites" on public.photo_favorites;
drop policy if exists "Users can create their own photo favorites" on public.photo_favorites;
drop policy if exists "Users can delete their own photo favorites" on public.photo_favorites;

create policy "Users can read their own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can create their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "Users can create their own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recipes"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

create policy "Users can read their own wishes"
  on public.wishes for select
  using (auth.uid() = user_id);

create policy "Users can create their own wishes"
  on public.wishes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own wishes"
  on public.wishes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own wishes"
  on public.wishes for delete
  using (auth.uid() = user_id);

create policy "Users can read their own weekend plans"
  on public.weekend_plans for select
  using (auth.uid() = user_id);

create policy "Users can create their own weekend plans"
  on public.weekend_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own weekend plans"
  on public.weekend_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own weekend plans"
  on public.weekend_plans for delete
  using (auth.uid() = user_id);

create policy "Users can read their own anniversaries"
  on public.anniversaries for select
  using (auth.uid() = user_id);

create policy "Users can create their own anniversaries"
  on public.anniversaries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own anniversaries"
  on public.anniversaries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own anniversaries"
  on public.anniversaries for delete
  using (auth.uid() = user_id);

create policy "Users can delete their own photos"
  on public.photos for delete
  using (auth.uid() = user_id);

create policy "Users can update their own photos"
  on public.photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their own photo favorites"
  on public.photo_favorites for select
  using (auth.uid() = user_id);

create policy "Users can create their own photo favorites"
  on public.photo_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own photo favorites"
  on public.photo_favorites for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own life photos" on storage.objects;
create policy "Users can delete their own life photos"
  on storage.objects for delete
  using (
    bucket_id = 'life-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create or replace function public.handle_new_life_vlog_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_username text;
  initial_recharge integer;
  initial_vip smallint;
begin
  new_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  );
  initial_recharge := case when lower(new_username) = 'xiao980320' then 298 else 0 end;
  initial_vip := case when lower(new_username) = 'xiao980320' then 5 else 0 end;

  insert into public.user_profiles (
    user_id,
    username,
    recharge_total,
    vip_level
  )
  values (
    new.id,
    new_username,
    initial_recharge,
    initial_vip
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_life_vlog on auth.users;
create trigger on_auth_user_created_life_vlog
  after insert on auth.users
  for each row execute procedure public.handle_new_life_vlog_user();

insert into public.user_profiles (
  user_id,
  username,
  recharge_total,
  vip_level
)
select
  users.id,
  coalesce(
    users.raw_user_meta_data ->> 'username',
    split_part(coalesce(users.email, ''), '@', 1),
    ''
  ),
  case
    when lower(coalesce(users.raw_user_meta_data ->> 'username', split_part(coalesce(users.email, ''), '@', 1))) = 'xiao980320'
      then 298
    else 0
  end,
  case
    when lower(coalesce(users.raw_user_meta_data ->> 'username', split_part(coalesce(users.email, ''), '@', 1))) = 'xiao980320'
      then 5
    else 0
  end
from auth.users as users
on conflict (user_id) do update
set
  username = excluded.username,
  recharge_total = greatest(public.user_profiles.recharge_total, excluded.recharge_total),
  vip_level = greatest(public.user_profiles.vip_level, excluded.vip_level),
  updated_at = now();

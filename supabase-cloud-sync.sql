-- Run this file once in Supabase Dashboard > SQL Editor.
-- It adds cloud sync for all signed-in account data and photo interactions.

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

alter table public.user_profiles
  add column if not exists food_options jsonb not null default '[]'::jsonb;

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

-- Username-only accounts cannot receive Supabase password-reset emails because
-- they use an internal placeholder email. A recovery key provides a separate
-- reset path without exposing the service-role key to the browser.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.password_recovery_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recovery_hash text not null,
  failed_attempts smallint not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.password_recovery_credentials enable row level security;
revoke all on public.password_recovery_credentials from anon, authenticated;

create or replace function public.set_password_recovery_key(p_recovery_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;
  if length(coalesce(p_recovery_key, '')) < 12 then
    raise exception '恢复密钥至少需要 12 位';
  end if;

  insert into public.password_recovery_credentials (
    user_id,
    recovery_hash,
    failed_attempts,
    locked_until,
    updated_at
  )
  values (
    current_user_id,
    extensions.crypt(p_recovery_key, extensions.gen_salt('bf', 10)),
    0,
    null,
    now()
  )
  on conflict (user_id) do update
  set
    recovery_hash = excluded.recovery_hash,
    failed_attempts = 0,
    locked_until = null,
    updated_at = now();
end;
$$;

create or replace function public.reset_password_with_recovery_key(
  p_username text,
  p_recovery_key text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  stored_hash text;
  attempt_count smallint;
  current_lock timestamptz;
  next_attempt_count smallint;
begin
  if length(coalesce(p_username, '')) < 1
    or length(coalesce(p_recovery_key, '')) < 12
    or length(coalesce(p_new_password, '')) < 6
    or length(p_new_password) > 128 then
    return false;
  end if;

  select credentials.user_id,
         credentials.recovery_hash,
         credentials.failed_attempts,
         credentials.locked_until
    into target_user_id, stored_hash, attempt_count, current_lock
  from public.password_recovery_credentials as credentials
  join public.user_profiles as profile
    on profile.user_id = credentials.user_id
  where lower(trim(profile.username)) = lower(trim(p_username))
  order by credentials.updated_at desc
  limit 1
  for update of credentials;

  if target_user_id is null then
    return false;
  end if;

  if current_lock is not null and current_lock > now() then
    raise exception '尝试次数过多，请 15 分钟后再试';
  end if;

  if stored_hash <> extensions.crypt(p_recovery_key, stored_hash) then
    next_attempt_count := coalesce(attempt_count, 0) + 1;
    update public.password_recovery_credentials
    set
      failed_attempts = case when next_attempt_count >= 5 then 0 else next_attempt_count end,
      locked_until = case
        when next_attempt_count >= 5 then now() + interval '15 minutes'
        else null
      end,
      updated_at = now()
    where user_id = target_user_id;
    return false;
  end if;

  update auth.users
  set
    encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
    updated_at = now()
  where id = target_user_id;

  update public.password_recovery_credentials
  set failed_attempts = 0, locked_until = null, updated_at = now()
  where user_id = target_user_id;

  return true;
end;
$$;

revoke all on function public.set_password_recovery_key(text) from public;
revoke all on function public.reset_password_with_recovery_key(text, text, text) from public;
grant execute on function public.set_password_recovery_key(text) to authenticated;
grant execute on function public.reset_password_with_recovery_key(text, text, text)
  to anon, authenticated;

-- Family sharing ------------------------------------------------------------
-- Each account can belong to one family. Family members can read each other's
-- life content, while updates and deletes remain restricted to the author.

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default '我们的家',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (user_id)
);

create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists family_invitations_pending_unique
  on public.family_invitations (family_id, invited_user_id)
  where status = 'pending';

create table if not exists public.gratitude_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 180),
  text_color text not null default '#2f6b3b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_members_family_idx
  on public.family_members (family_id, joined_at);

create index if not exists gratitude_notes_user_created_idx
  on public.gratitude_notes (user_id, created_at desc);

create index if not exists photo_comments_photo_created_idx
  on public.photo_comments (photo_id, created_at asc);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.gratitude_notes enable row level security;
alter table public.photo_comments enable row level security;

revoke all on public.families from anon, authenticated;
revoke all on public.family_members from anon, authenticated;
revoke all on public.family_invitations from anon, authenticated;
grant select, insert, update, delete on public.gratitude_notes to authenticated;
grant select, insert, update, delete on public.photo_comments to authenticated;

create or replace function public.are_family_members(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_first is not null
    and p_second is not null
    and exists (
      select 1
      from public.family_members as first_member
      join public.family_members as second_member
        on second_member.family_id = first_member.family_id
      where first_member.user_id = p_first
        and second_member.user_id = p_second
    );
$$;

revoke all on function public.are_family_members(uuid, uuid) from public;
grant execute on function public.are_family_members(uuid, uuid) to authenticated;

create or replace function public.create_family(p_name text default '我们的家')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_family_id uuid;
  created_family_id uuid;
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;

  select family_id into existing_family_id
  from public.family_members
  where user_id = current_user_id;

  if existing_family_id is not null then
    return existing_family_id;
  end if;

  insert into public.families (name, owner_id)
  values (left(coalesce(nullif(trim(p_name), ''), '我们的家'), 30), current_user_id)
  returning id into created_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (created_family_id, current_user_id, 'owner');

  return created_family_id;
end;
$$;

create or replace function public.add_family_member_by_username(p_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_family_id uuid;
  target_user_id uuid;
begin
  select member.family_id into current_family_id
  from public.family_members as member
  join public.families as family on family.id = member.family_id
  where member.user_id = current_user_id
    and family.owner_id = current_user_id;

  if current_family_id is null then
    raise exception '只有家庭创建者可以添加成员';
  end if;

  select profile.user_id into target_user_id
  from public.user_profiles as profile
  where lower(trim(profile.username)) = lower(trim(p_username))
  order by profile.created_at asc
  limit 1;

  if target_user_id is null then
    raise exception '没有找到这个用户名';
  end if;
  if target_user_id = current_user_id then
    raise exception '你已经在家庭组里';
  end if;
  if exists (
    select 1 from public.family_members where user_id = target_user_id
  ) then
    raise exception '这个用户已经加入了一个家庭组';
  end if;

  insert into public.family_invitations (
    family_id,
    invited_user_id,
    invited_by,
    status
  )
  values (
    current_family_id,
    target_user_id,
    current_user_id,
    'pending'
  )
  on conflict (family_id, invited_user_id) where status = 'pending'
  do update set invited_by = excluded.invited_by, created_at = now();

  return target_user_id;
end;
$$;

create or replace function public.remove_family_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_family_id uuid;
begin
  select family.id into current_family_id
  from public.families as family
  where family.owner_id = current_user_id;

  if current_family_id is null then
    raise exception '只有家庭创建者可以移除成员';
  end if;
  if p_user_id = current_user_id then
    raise exception '不能移除家庭创建者';
  end if;

  delete from public.family_members
  where family_id = current_family_id
    and user_id = p_user_id;
end;
$$;

create or replace function public.get_my_family_members()
returns table (
  family_id uuid,
  family_name text,
  user_id uuid,
  username text,
  role text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    family.id,
    family.name,
    member.user_id,
    coalesce(nullif(profile.username, ''), '家庭成员'),
    member.role,
    member.joined_at
  from public.family_members as me
  join public.families as family on family.id = me.family_id
  join public.family_members as member on member.family_id = family.id
  left join public.user_profiles as profile on profile.user_id = member.user_id
  where me.user_id = auth.uid()
  order by
    case when member.role = 'owner' then 0 else 1 end,
    member.joined_at asc;
$$;

create or replace function public.get_my_family_invitations()
returns table (
  invitation_id uuid,
  family_id uuid,
  family_name text,
  invited_user_id uuid,
  invited_username text,
  invited_by uuid,
  inviter_username text,
  is_incoming boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    invitation.id,
    family.id,
    family.name,
    invitation.invited_user_id,
    coalesce(nullif(invited_profile.username, ''), '家庭成员'),
    invitation.invited_by,
    coalesce(nullif(inviter_profile.username, ''), '家庭成员'),
    invitation.invited_user_id = auth.uid(),
    invitation.created_at
  from public.family_invitations as invitation
  join public.families as family on family.id = invitation.family_id
  left join public.user_profiles as invited_profile
    on invited_profile.user_id = invitation.invited_user_id
  left join public.user_profiles as inviter_profile
    on inviter_profile.user_id = invitation.invited_by
  where invitation.status = 'pending'
    and (
      invitation.invited_user_id = auth.uid()
      or invitation.invited_by = auth.uid()
    )
  order by invitation.created_at desc;
$$;

create or replace function public.respond_family_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_invitation public.family_invitations%rowtype;
begin
  select * into target_invitation
  from public.family_invitations
  where id = p_invitation_id
    and invited_user_id = current_user_id
    and status = 'pending'
  for update;

  if target_invitation.id is null then
    raise exception '邀请不存在或已经处理';
  end if;

  if p_accept then
    if exists (
      select 1 from public.family_members where user_id = current_user_id
    ) then
      raise exception '你已经加入了一个家庭组';
    end if;

    insert into public.family_members (family_id, user_id, role)
    values (target_invitation.family_id, current_user_id, 'member');

    update public.family_invitations
    set status = 'accepted', responded_at = now()
    where id = target_invitation.id;
  else
    update public.family_invitations
    set status = 'declined', responded_at = now()
    where id = target_invitation.id;
  end if;
end;
$$;

revoke all on function public.create_family(text) from public;
revoke all on function public.add_family_member_by_username(text) from public;
revoke all on function public.remove_family_member(uuid) from public;
revoke all on function public.get_my_family_members() from public;
revoke all on function public.get_my_family_invitations() from public;
revoke all on function public.respond_family_invitation(uuid, boolean) from public;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.add_family_member_by_username(text) to authenticated;
grant execute on function public.remove_family_member(uuid) to authenticated;
grant execute on function public.get_my_family_members() to authenticated;
grant execute on function public.get_my_family_invitations() to authenticated;
grant execute on function public.respond_family_invitation(uuid, boolean) to authenticated;

drop policy if exists "Family members can read photos" on public.photos;
create policy "Family members can read photos"
  on public.photos for select
  using (public.are_family_members(auth.uid(), user_id));

drop policy if exists "Users can read their own recipes" on public.recipes;
drop policy if exists "Family members can read recipes" on public.recipes;
create policy "Family members can read recipes"
  on public.recipes for select
  using (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Users can read their own wishes" on public.wishes;
drop policy if exists "Family members can read wishes" on public.wishes;
create policy "Family members can read wishes"
  on public.wishes for select
  using (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Users can read their own weekend plans" on public.weekend_plans;
drop policy if exists "Family members can read weekend plans" on public.weekend_plans;
create policy "Family members can read weekend plans"
  on public.weekend_plans for select
  using (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Users can read their own anniversaries" on public.anniversaries;
drop policy if exists "Family members can read anniversaries" on public.anniversaries;
create policy "Family members can read anniversaries"
  on public.anniversaries for select
  using (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Family members can read gratitude notes" on public.gratitude_notes;
drop policy if exists "Users can create gratitude notes" on public.gratitude_notes;
drop policy if exists "Users can update gratitude notes" on public.gratitude_notes;
drop policy if exists "Users can delete gratitude notes" on public.gratitude_notes;

create policy "Family members can read gratitude notes"
  on public.gratitude_notes for select
  using (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

create policy "Users can create gratitude notes"
  on public.gratitude_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update gratitude notes"
  on public.gratitude_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete gratitude notes"
  on public.gratitude_notes for delete
  using (auth.uid() = user_id);

drop policy if exists "Family members can read photo comments" on public.photo_comments;
drop policy if exists "Family members can create photo comments" on public.photo_comments;
drop policy if exists "Users can update photo comments" on public.photo_comments;
drop policy if exists "Users can delete photo comments" on public.photo_comments;

create policy "Family members can read photo comments"
  on public.photo_comments for select
  using (
    exists (
      select 1
      from public.photos as photo
      where photo.id = photo_comments.photo_id
        and (
          photo.is_public
          or photo.user_id = auth.uid()
          or public.are_family_members(auth.uid(), photo.user_id)
        )
    )
  );

create policy "Family members can create photo comments"
  on public.photo_comments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.photos as photo
      where photo.id = photo_comments.photo_id
        and (
          photo.user_id = auth.uid()
          or public.are_family_members(auth.uid(), photo.user_id)
        )
    )
  );

create policy "Users can update photo comments"
  on public.photo_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete photo comments"
  on public.photo_comments for delete
  using (auth.uid() = user_id);

-- 2026-06-19: avatars, threaded photo comments, and interaction notifications.
-- Run this patch once in Supabase Dashboard > SQL Editor.

alter table public.user_profiles
  add column if not exists avatar_url text not null default '',
  add column if not exists avatar_path text not null default '';

alter table public.photo_comments
  add column if not exists parent_id uuid references public.photo_comments(id) on delete cascade;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('favorite', 'comment', 'reply')),
  photo_id uuid references public.photos(id) on delete cascade,
  comment_id uuid references public.photo_comments(id) on delete cascade,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists photo_comments_parent_idx
  on public.photo_comments (parent_id, created_at asc);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update, delete on public.notifications to authenticated;

drop policy if exists "Users can read their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;

create policy "Users can read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

drop function if exists public.get_my_family_members();
create function public.get_my_family_members()
returns table (
  family_id uuid,
  family_name text,
  user_id uuid,
  username text,
  avatar_url text,
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
    coalesce(profile.avatar_url, ''),
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

revoke all on function public.get_my_family_members() from public;
grant execute on function public.get_my_family_members() to authenticated;

create or replace function public.create_photo_interaction_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_owner_id uuid;
  photo_title text;
  parent_owner_id uuid;
  parent_photo_id uuid;
begin
  if tg_table_name = 'photo_favorites' then
    select photo.user_id, photo.title into photo_owner_id, photo_title
    from public.photos as photo where photo.id = new.photo_id;

    if photo_owner_id is not null and photo_owner_id <> new.user_id then
      insert into public.notifications (user_id, actor_id, type, photo_id, body)
      values (photo_owner_id, new.user_id, 'favorite', new.photo_id, coalesce(photo_title, ''));
    end if;
    return new;
  end if;

  if tg_table_name = 'photo_comments' then
    select photo.user_id, photo.title into photo_owner_id, photo_title
    from public.photos as photo where photo.id = new.photo_id;

    if new.parent_id is not null then
      select comment.user_id, comment.photo_id into parent_owner_id, parent_photo_id
      from public.photo_comments as comment where comment.id = new.parent_id;

      if parent_photo_id is distinct from new.photo_id then
        raise exception '回复必须属于同一张照片';
      end if;

      if parent_owner_id is not null and parent_owner_id <> new.user_id then
        insert into public.notifications (
          user_id, actor_id, type, photo_id, comment_id, body
        ) values (
          parent_owner_id, new.user_id, 'reply', new.photo_id, new.id, new.body
        );
      end if;
    end if;

    if photo_owner_id is not null
      and photo_owner_id <> new.user_id
      and photo_owner_id is distinct from parent_owner_id then
      insert into public.notifications (
        user_id, actor_id, type, photo_id, comment_id, body
      ) values (
        photo_owner_id, new.user_id, 'comment', new.photo_id, new.id, new.body
      );
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_photo_favorite on public.photo_favorites;
create trigger notify_photo_favorite
  after insert on public.photo_favorites
  for each row execute function public.create_photo_interaction_notification();

drop trigger if exists notify_photo_comment on public.photo_comments;
create trigger notify_photo_comment
  after insert on public.photo_comments
  for each row execute function public.create_photo_interaction_notification();

drop function if exists public.get_my_notifications(integer);
create function public.get_my_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  type text,
  actor_id uuid,
  actor_username text,
  actor_avatar_url text,
  photo_id uuid,
  photo_title text,
  photo_image_url text,
  comment_id uuid,
  body text,
  is_read boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    notification.id,
    notification.type,
    notification.actor_id,
    coalesce(nullif(profile.username, ''), '家庭成员'),
    coalesce(profile.avatar_url, ''),
    notification.photo_id,
    coalesce(photo.title, '生活照片'),
    coalesce(photo.image_url, ''),
    notification.comment_id,
    notification.body,
    notification.is_read,
    notification.created_at
  from public.notifications as notification
  left join public.user_profiles as profile on profile.user_id = notification.actor_id
  left join public.photos as photo on photo.id = notification.photo_id
  where notification.user_id = auth.uid()
  order by notification.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_my_notifications(integer) from public;
grant execute on function public.get_my_notifications(integer) to authenticated;

notify pgrst, 'reload schema';

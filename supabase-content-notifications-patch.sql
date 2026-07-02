-- 2026-07-02: notify family members when a new diary or thanks note is published.
-- Run once in Supabase Dashboard > SQL Editor.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('favorite', 'comment', 'reply', 'diary', 'thanks'));

create or replace function public.create_photo_publish_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type, photo_id, body)
  select distinct
    member.user_id,
    new.user_id,
    'diary',
    new.id,
    coalesce(nullif(new.title, ''), '新日记')
  from public.family_members as author
  join public.family_members as member on member.family_id = author.family_id
  where author.user_id = new.user_id
    and member.user_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists notify_photo_publish on public.photos;
create trigger notify_photo_publish
  after insert on public.photos
  for each row execute function public.create_photo_publish_notification();

create or replace function public.create_gratitude_publish_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type, body)
  select distinct
    member.user_id,
    new.user_id,
    'thanks',
    new.body
  from public.family_members as author
  join public.family_members as member on member.family_id = author.family_id
  where author.user_id = new.user_id
    and member.user_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists notify_gratitude_publish on public.gratitude_notes;
create trigger notify_gratitude_publish
  after insert on public.gratitude_notes
  for each row execute function public.create_gratitude_publish_notification();

notify pgrst, 'reload schema';

-- Run once in Supabase Dashboard > SQL Editor.

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

create index if not exists anniversaries_user_date_idx
  on public.anniversaries (user_id, event_date asc);

alter table public.anniversaries enable row level security;

grant select, insert, update, delete on public.anniversaries to authenticated;

drop policy if exists "Users can read their own anniversaries" on public.anniversaries;
drop policy if exists "Users can create their own anniversaries" on public.anniversaries;
drop policy if exists "Users can update their own anniversaries" on public.anniversaries;
drop policy if exists "Users can delete their own anniversaries" on public.anniversaries;

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

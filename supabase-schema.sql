create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text default '',
  category text default '日常',
  taken_at date not null default current_date,
  image_path text not null,
  image_url text not null,
  width integer,
  height integer,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "Anyone can read public photos"
  on public.photos for select
  using (is_public = true);

create policy "Users can create their own photos"
  on public.photos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own photos"
  on public.photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own photos"
  on public.photos for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('life-photos', 'life-photos', true)
on conflict (id) do update set public = true;

create policy "Anyone can view life photos"
  on storage.objects for select
  using (bucket_id = 'life-photos');

create policy "Users can upload their own life photos"
  on storage.objects for insert
  with check (
    bucket_id = 'life-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own life photos"
  on storage.objects for update
  using (
    bucket_id = 'life-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own life photos"
  on storage.objects for delete
  using (
    bucket_id = 'life-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

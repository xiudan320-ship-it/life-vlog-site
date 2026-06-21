-- Run once in Supabase Dashboard > SQL Editor.
-- Fixes family-shared lifestyle records when the app uses upsert().
-- Without the family insert policy, editing a family member's anniversary can
-- fail with: new row violates row-level security policy.

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

grant execute on function public.are_family_members(uuid, uuid) to authenticated;

drop policy if exists "Users can create their own recipes" on public.recipes;
drop policy if exists "Family members can create recipes" on public.recipes;
create policy "Family members can create recipes"
  on public.recipes for insert
  with check (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Users can create their own wishes" on public.wishes;
drop policy if exists "Family members can create wishes" on public.wishes;
create policy "Family members can create wishes"
  on public.wishes for insert
  with check (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Users can create their own weekend plans" on public.weekend_plans;
drop policy if exists "Family members can create weekend plans" on public.weekend_plans;
create policy "Family members can create weekend plans"
  on public.weekend_plans for insert
  with check (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Users can create their own anniversaries" on public.anniversaries;
drop policy if exists "Family members can create anniversaries" on public.anniversaries;
create policy "Family members can create anniversaries"
  on public.anniversaries for insert
  with check (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Users can update their own anniversaries" on public.anniversaries;
drop policy if exists "Family members can update anniversaries" on public.anniversaries;
create policy "Family members can update anniversaries"
  on public.anniversaries for update
  using (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  )
  with check (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

drop policy if exists "Users can delete their own anniversaries" on public.anniversaries;
drop policy if exists "Family members can delete anniversaries" on public.anniversaries;
create policy "Family members can delete anniversaries"
  on public.anniversaries for delete
  using (
    auth.uid() = user_id
    or public.are_family_members(auth.uid(), user_id)
  );

notify pgrst, 'reload schema';

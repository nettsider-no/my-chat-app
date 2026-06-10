-- Fix: "infinite recursion detected in policy for relation group_members"
-- Run this in Supabase → SQL Editor if you already executed groups.sql

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

drop policy if exists "chat_groups_select_member" on public.chat_groups;
create policy "chat_groups_select_member" on public.chat_groups
  for select using (
    created_by = auth.uid()
    or public.is_group_member(id)
  );

drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member" on public.group_members
  for select using (public.is_group_member(group_id));

drop policy if exists "messages_select_group_member" on public.messages;
create policy "messages_select_group_member" on public.messages
  for select using (
    group_id is not null
    and public.is_group_member(group_id)
  );

drop policy if exists "messages_insert_group_member" on public.messages;
create policy "messages_insert_group_member" on public.messages
  for insert with check (
    group_id is not null
    and sender_id = auth.uid()
    and public.is_group_member(group_id)
  );

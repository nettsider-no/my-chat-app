-- Group invites, public/private visibility, join requests, delete group
-- Run in Supabase SQL Editor after groups.sql and groups_rls_fix.sql

-- 1. Public / private visibility
alter table public.chat_groups
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

-- 2. Invitations (creator/admin invites users — they must accept)
create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  invitee_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (group_id, invitee_id)
);

create index if not exists group_invites_invitee_idx on public.group_invites (invitee_id);
create index if not exists group_invites_group_idx on public.group_invites (group_id);

-- 3. Join requests for public groups
create table if not exists public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists group_join_requests_group_idx on public.group_join_requests (group_id);
create index if not exists group_join_requests_user_idx on public.group_join_requests (user_id);

-- 4. Helpers
create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and role = 'admin'
  )
  or exists (
    select 1
    from public.chat_groups
    where id = p_group_id and created_by = auth.uid()
  );
$$;

revoke all on function public.is_group_admin(uuid) from public;
grant execute on function public.is_group_admin(uuid) to authenticated;

-- 5. RLS
alter table public.group_invites enable row level security;
alter table public.group_join_requests enable row level security;

-- chat_groups: public groups visible for search; creator/admin can update; creator can delete
drop policy if exists "chat_groups_select_member" on public.chat_groups;
create policy "chat_groups_select_member" on public.chat_groups
  for select using (
    created_by = auth.uid()
    or public.is_group_member(id)
    or visibility = 'public'
  );

drop policy if exists "chat_groups_update_admin" on public.chat_groups;
create policy "chat_groups_update_admin" on public.chat_groups
  for update using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

drop policy if exists "chat_groups_delete_creator" on public.chat_groups;
create policy "chat_groups_delete_creator" on public.chat_groups
  for delete using (created_by = auth.uid());

-- group_members: tighten insert — creator self, invite accept, admin approves join request
drop policy if exists "group_members_insert_creator" on public.group_members;
drop policy if exists "group_members_insert_invite_accept" on public.group_members;
drop policy if exists "group_members_insert_join_accept" on public.group_members;

create policy "group_members_insert_creator" on public.group_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.chat_groups g
      where g.id = group_members.group_id and g.created_by = auth.uid()
    )
  );

create policy "group_members_insert_invite_accept" on public.group_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_invites i
      where i.group_id = group_members.group_id
        and i.invitee_id = auth.uid()
        and i.status = 'pending'
    )
  );

create policy "group_members_insert_join_accept" on public.group_members
  for insert with check (
    exists (
      select 1 from public.group_join_requests r
      where r.group_id = group_members.group_id
        and r.user_id = group_members.user_id
        and r.status = 'pending'
        and public.is_group_admin(r.group_id)
    )
  );

-- group_invites
drop policy if exists "group_invites_select_involved" on public.group_invites;
create policy "group_invites_select_involved" on public.group_invites
  for select using (
    invitee_id = auth.uid()
    or invited_by = auth.uid()
    or public.is_group_admin(group_id)
  );

drop policy if exists "group_invites_insert_admin" on public.group_invites;
create policy "group_invites_insert_admin" on public.group_invites
  for insert with check (
    invited_by = auth.uid()
    and public.is_group_admin(group_id)
    and invitee_id <> auth.uid()
    and not exists (
      select 1 from public.group_members m
      where m.group_id = group_invites.group_id and m.user_id = group_invites.invitee_id
    )
  );

drop policy if exists "group_invites_update_invitee" on public.group_invites;
create policy "group_invites_update_invitee" on public.group_invites
  for update using (invitee_id = auth.uid())
  with check (invitee_id = auth.uid());

-- group_join_requests
drop policy if exists "group_join_requests_select_involved" on public.group_join_requests;
create policy "group_join_requests_select_involved" on public.group_join_requests
  for select using (
    user_id = auth.uid()
    or public.is_group_admin(group_id)
  );

drop policy if exists "group_join_requests_insert_public" on public.group_join_requests;
create policy "group_join_requests_insert_public" on public.group_join_requests
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.chat_groups g
      where g.id = group_join_requests.group_id
        and g.visibility = 'public'
    )
    and not public.is_group_member(group_id)
    and not exists (
      select 1 from public.group_join_requests r
      where r.group_id = group_join_requests.group_id
        and r.user_id = auth.uid()
        and r.status = 'pending'
    )
  );

drop policy if exists "group_join_requests_update_admin" on public.group_join_requests;
create policy "group_join_requests_update_admin" on public.group_join_requests
  for update using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

drop policy if exists "group_join_requests_update_own_cancel" on public.group_join_requests;
create policy "group_join_requests_update_own_cancel" on public.group_join_requests
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Group chats schema for Messenger app
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- 1. Groups
create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 1),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. Members
create table if not exists public.group_members (
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_id_idx on public.group_members (user_id);

-- 3. Per-user read cursor for group unread
create table if not exists public.group_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

-- 4. Extend messages for group chats (DM rows keep receiver_id; group rows use group_id)
alter table public.messages
  add column if not exists group_id uuid references public.chat_groups (id) on delete cascade;

alter table public.messages
  alter column receiver_id drop not null;

create index if not exists messages_group_id_idx on public.messages (group_id);

-- RLS helper: avoids infinite recursion when policies on group_members query group_members
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

alter table public.chat_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_reads enable row level security;

-- chat_groups: members can read; authenticated users can create
drop policy if exists "chat_groups_select_member" on public.chat_groups;
create policy "chat_groups_select_member" on public.chat_groups
  for select using (
    created_by = auth.uid()
    or public.is_group_member(id)
  );

drop policy if exists "chat_groups_insert_authenticated" on public.chat_groups;
create policy "chat_groups_insert_authenticated" on public.chat_groups
  for insert with check (auth.uid() = created_by);

-- group_members
drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member" on public.group_members
  for select using (public.is_group_member(group_id));

drop policy if exists "group_members_insert_creator" on public.group_members;
create policy "group_members_insert_creator" on public.group_members
  for insert with check (
    exists (
      select 1 from public.chat_groups g
      where g.id = group_members.group_id and g.created_by = auth.uid()
    )
    or user_id = auth.uid()
  );

-- group_reads
drop policy if exists "group_reads_select_own" on public.group_reads;
create policy "group_reads_select_own" on public.group_reads
  for select using (user_id = auth.uid());

drop policy if exists "group_reads_upsert_own" on public.group_reads;
create policy "group_reads_upsert_own" on public.group_reads
  for insert with check (user_id = auth.uid());

drop policy if exists "group_reads_update_own" on public.group_reads;
create policy "group_reads_update_own" on public.group_reads
  for update using (user_id = auth.uid());

-- messages: extend policies for group messages (adjust if you already have DM policies)
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

-- DM policies (keep 1:1 chats working alongside group policies)
drop policy if exists "messages_select_dm" on public.messages;
create policy "messages_select_dm" on public.messages
  for select using (
    group_id is null
    and (auth.uid() = sender_id or auth.uid() = receiver_id)
  );

drop policy if exists "messages_insert_dm" on public.messages;
create policy "messages_insert_dm" on public.messages
  for insert with check (
    group_id is null
    and auth.uid() = sender_id
    and receiver_id is not null
  );

drop policy if exists "messages_update_dm" on public.messages;
create policy "messages_update_dm" on public.messages
  for update using (
    group_id is null
    and auth.uid() = sender_id
  );

drop policy if exists "messages_delete_dm" on public.messages;
create policy "messages_delete_dm" on public.messages
  for delete using (
    group_id is null
    and auth.uid() = sender_id
  );

drop policy if exists "messages_delete_group" on public.messages;
create policy "messages_delete_group" on public.messages
  for delete using (
    group_id is not null
    and auth.uid() = sender_id
    and public.is_group_member(group_id)
  );

-- Allow users to delete their own messages (DM + group)
-- Run in Supabase → SQL Editor

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

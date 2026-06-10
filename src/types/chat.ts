/** Domain shapes aligned with Supabase tables used in the app */

export interface Profile {
  id: string
  email: string
}

export interface OutgoingContact extends Profile {
  requestStatus: 'pending' | 'rejected'
}

export interface ChatMessage {
  id: number
  content: string | null
  file_url: string | null
  sender_id: string
  receiver_id: string | null
  group_id: string | null
  is_read: boolean
  created_at: string
}

export type GroupVisibility = 'private' | 'public'

export interface ChatGroup {
  id: string
  name: string
  created_by: string
  created_at: string
  visibility?: GroupVisibility
  member_count?: number
}

export interface GroupInvite {
  id: string
  group_id: string
  invitee_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  chat_groups?: ChatGroup | ChatGroup[] | null
}

export interface GroupJoinRequest {
  id: string
  group_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  profiles?: Profile | Profile[] | null
}

export interface GroupMemberRow {
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  profiles?: Profile | Profile[] | null
}

export interface GroupMemberQueryRow {
  chat_groups: ChatGroup | ChatGroup[] | null
}

export interface MessageReaction {
  id: number
  message_id: number
  user_id: string
  emoji: string
}

/** Supabase may return embedded `profiles` as one row or an array depending on relation shape */
export interface ContactAcceptedRow {
  profiles: Profile | Profile[] | null
}

export interface ContactPendingIncomingRow {
  owner_id: string
}

export interface ContactOutgoingRow {
  contact_id: string
  status: 'pending' | 'rejected'
}

export interface UnreadMessageRow {
  sender_id: string
  is_read: boolean
}

export interface ContactsPayloadNew {
  owner_id: string
  contact_id: string
  status: string
}

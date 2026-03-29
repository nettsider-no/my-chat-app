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
  receiver_id: string
  is_read: boolean
  created_at: string
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

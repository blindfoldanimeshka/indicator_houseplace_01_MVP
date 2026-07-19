// Временная типизация стартовой схемы. После создания проекта заменить файлом,
// сгенерированным командой Supabase CLI из production-схемы.
export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; city: string | null; created_at: string }
        Insert: { id: string; name: string; city?: string | null }
        Update: { name?: string; city?: string | null }
        Relationships: []
      }
      listings: {
         Row: {
          id: string
          author_id: string
          type: 'offer' | 'request'
          city: string
          rooms: string
          price: number
          area: number | null
          description: string
          status: 'active' | 'archived' | 'rejected'
          address: string
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          author_id: string
          type: 'offer' | 'request'
          city: string
          rooms: string
          price: number
          area?: number | null
          description?: string
          address?: string
          lat?: number | null
          lng?: number | null
          status?: 'active' | 'archived' | 'rejected'
        }
        Update: {
          type?: 'offer' | 'request'
          city?: string
          rooms?: string
          price?: number
          area?: number | null
          description?: string
          address?: string
          lat?: number | null
          lng?: number | null
          deleted_at?: string | null
          status?: 'active' | 'archived' | 'rejected'
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          id: string
          listing_id: string
          path: string
          sort_order: number
          size_bytes: number | null
          mime_type: string | null
          created_at: string
        }
        Insert: {
          listing_id: string
          path: string
          sort_order?: number
          size_bytes?: number | null
          mime_type?: string | null
        }
        Update: {
          listing_id?: string
          path?: string
          sort_order?: number
          size_bytes?: number | null
          mime_type?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: { id: string; listing_id: string; initiator_id: string; created_at: string }
        Insert: { listing_id: string; initiator_id: string }
        Update: Record<string, never>
        Relationships: []
      }
      chat_participants: {
        Row: { chat_id: string; user_id: string; created_at: string }
        Insert: { chat_id: string; user_id: string }
        Update: Record<string, never>
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          text: string
          created_at: string
        }
        Insert: { chat_id: string; sender_id: string; text: string }
        Update: Record<string, never>
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: 'listing' | 'chat' | 'message'
          target_id: string
          category: string
          comment: string
          status: 'new' | 'reviewed' | 'resolved'
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          reporter_id: string
          target_type: 'listing' | 'chat' | 'message'
          target_id: string
          category: string
          comment?: string
          status?: 'new' | 'reviewed' | 'resolved'
        }
        Update: {
          status?: 'new' | 'reviewed' | 'resolved'
          comment?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          created_by: string | null
          used_by: string | null
          used_at: string | null
          note: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: {
          code: string
          created_by?: string | null
          used_by?: string | null
          note?: string | null
          expires_at?: string | null
        }
        Update: {
          used_by?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      open_or_create_chat: {
        Args: { p_listing_id: string }
        Returns: string
      }
      is_invite_valid: {
        Args: { p_code: string }
        Returns: boolean
      }
      invite_status: {
        Args: { p_code: string }
        Returns: string
      }
      claim_invite: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}


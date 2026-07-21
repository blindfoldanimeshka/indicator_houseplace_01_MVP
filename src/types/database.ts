// Временная типизация стартовой схемы. После создания проекта заменить файлом,
// сгенерированным командой Supabase CLI из production-схемы.
export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; city: string | null; avatar_path: string | null; telegram_id: string | null; created_at: string; rating: number | null }
        Insert: { id: string; name: string; city?: string | null; avatar_path?: string | null; telegram_id?: string | null }
        Update: { name?: string; city?: string | null; avatar_path?: string | null; telegram_id?: string | null; rating?: number | null }
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
          is_mock: boolean
          org_id: string | null
          promoted_until: string | null
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
          is_mock?: boolean
          org_id?: string | null
          promoted_until?: string | null
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
          is_mock?: boolean
          org_id?: string | null
          promoted_until?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          owner_id: string
          logo_path: string | null
          custom_domain: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          logo_path?: string | null
          custom_domain?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          owner_id?: string
          logo_path?: string | null
          custom_domain?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          invited_by: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          org_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member'
          invited_by?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          id: string
          user_id: string
          event_type: 'view_listing' | 'open_chat' | 'send_message' | 'create_listing' | 'complete_deal' | 'boost_listing'
          payload: unknown | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: 'view_listing' | 'open_chat' | 'send_message' | 'create_listing' | 'complete_deal' | 'boost_listing'
          payload?: unknown | null
          created_at?: string
        }
        Update: {
          event_type?: 'view_listing' | 'open_chat' | 'send_message' | 'create_listing' | 'complete_deal' | 'boost_listing'
          payload?: unknown | null
        }
        Relationships: []
      }
      listing_stats: {
        Row: {
          listing_id: string
          views: number
          responses: number
          updated_at: string
        }
        Insert: {
          listing_id: string
          views?: number
          responses?: number
          updated_at?: string
        }
        Update: {
          views?: number
          responses?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: 'active' | 'cancelled' | 'past_due'
          provider: string | null
          provider_subscription_id: string | null
          current_period_end: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: 'active' | 'cancelled' | 'past_due'
          provider?: string | null
          provider_subscription_id?: string | null
          current_period_end?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          user_id?: string
          plan_id?: string
          status?: 'active' | 'cancelled' | 'past_due'
          provider?: string | null
          provider_subscription_id?: string | null
          current_period_end?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          name: string
          price_rub: number
          interval: 'monthly' | 'yearly'
          limits: unknown
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price_rub: number
          interval?: 'monthly' | 'yearly'
          limits?: unknown
          active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          price_rub?: number
          interval?: 'monthly' | 'yearly'
          limits?: unknown
          active?: boolean
        }
        Relationships: []
      }
      verifications: {
        Row: {
          id: string
          user_id: string
          kind: 'identity' | 'phone' | 'email'
          status: 'pending' | 'verified' | 'rejected'
          provider: string | null
          provider_ref: string | null
          meta: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: 'identity' | 'phone' | 'email'
          status?: 'pending' | 'verified' | 'rejected'
          provider?: string | null
          provider_ref?: string | null
          meta?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          kind?: 'identity' | 'phone' | 'email'
          status?: 'pending' | 'verified' | 'rejected'
          provider?: string | null
          provider_ref?: string | null
          meta?: unknown | null
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          user_id: string
          email_notif: boolean
          push_notif: boolean
          inapp_notif: boolean
          show_profile: boolean
          show_email: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          email_notif?: boolean
          push_notif?: boolean
          inapp_notif?: boolean
          show_profile?: boolean
          show_email?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          email_notif?: boolean
          push_notif?: boolean
          inapp_notif?: boolean
          show_profile?: boolean
          show_email?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: unknown | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          payload?: unknown | null
          read?: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          type?: string
          payload?: unknown | null
          read?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          chat_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string
          created_at?: string
        }
        Update: {
          rating?: number
          comment?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          created_at?: string
        }
        Update: {
          title?: string
          body?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          org_id: string
          key_hash: string
          scopes: string | null
          rate_limit: number | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          key_hash: string
          scopes?: string | null
          rate_limit?: number | null
          created_at?: string
        }
        Update: {
          scopes?: string | null
          rate_limit?: number | null
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
        Row: { id: string; listing_id: string; initiator_id: string; created_at: string; status: 'open' | 'closed' | 'archived'; closed_at: string | null }
        Insert: { listing_id: string; initiator_id: string; status?: 'open' | 'closed' | 'archived' }
        Update: { status?: 'open' | 'closed' | 'archived'; closed_at?: string | null }
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
          attachment_path: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: 'image' | 'document' | null
        }
        Insert: { chat_id: string; sender_id: string; text: string; attachment_path?: string | null; attachment_name?: string | null; attachment_size?: number | null; attachment_type?: 'image' | 'document' | null }
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
      user_settings: {
        Row: {
          user_id: string
          email_notif: boolean
          push_notif: boolean
          inapp_notif: boolean
          show_profile: boolean
          show_email: boolean
          theme: 'light' | 'dark' | 'system'
          language: 'ru' | 'en'
          updated_at: string
        }
        Insert: {
          user_id: string
          email_notif?: boolean
          push_notif?: boolean
          inapp_notif?: boolean
          show_profile?: boolean
          show_email?: boolean
          theme?: 'light' | 'dark' | 'system'
          language?: 'ru' | 'en'
        }
        Update: {
          email_notif?: boolean
          push_notif?: boolean
          inapp_notif?: boolean
          show_profile?: boolean
          show_email?: boolean
          theme?: 'light' | 'dark' | 'system'
          language?: 'ru' | 'en'
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
      listing_cover_path: {
        Args: { p_listing_id: string }
        Returns: string
      }
      create_organization: {
        Args: { p_name: string }
        Returns: string
      }
      add_org_member: {
        Args: { p_org: string; p_user_email: string; p_role: string }
        Returns: boolean
      }
      boost_listing: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      record_listing_view: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      record_listing_response: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      create_review: {
        Args: { p_chat_id: string; p_reviewee_id: string; p_rating: number; p_comment: string | null }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}


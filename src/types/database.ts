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
          status?: 'active' | 'archived' | 'rejected'
        }
        Update: {
          type?: 'offer' | 'request'
          city?: string
          rooms?: string
          price?: number
          area?: number | null
          description?: string
          deleted_at?: string | null
          status?: 'active' | 'archived' | 'rejected'
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}


export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'owner' | 'superadmin'
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'owner' | 'superadmin'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'owner' | 'superadmin'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          id: string
          parent_id: string | null
          slug: string
          name: string
          niche: 'comercio' | 'inmueble' | 'agenda' | 'plaza_comidas'
          catalog_mode: 'carrito' | 'vitrina'
          whatsapp: string
          logo_url: string | null
          banner_url: string | null
          description: string | null
          address: string | null
          maps_url: string | null
          city: string
          theme: {
            primary_color: string
            [key: string]: Json | undefined
          }
          schedule?: {
            days: number[]
            morning: [string, string]
            afternoon: [string, string]
            slot_minutes: number
            [key: string]: Json | undefined
          }
          plan_name: string
          max_items: number
          subscription_price: number
          billing_cycle: 'mensual' | 'anual' | 'indefinido'
          payment_status: 'al_dia' | 'pendiente' | 'vencido'
          next_due_date: string
          is_active: boolean
          owner_id: string
          rating_avg: number
          rating_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_id?: string | null
          slug: string
          name: string
          niche: 'comercio' | 'inmueble' | 'agenda' | 'plaza_comidas'
          catalog_mode: 'carrito' | 'vitrina'
          whatsapp: string
          logo_url?: string | null
          banner_url?: string | null
          description?: string | null
          address?: string | null
          maps_url?: string | null
          city?: string
          theme?: {
            primary_color: string
            [key: string]: Json | undefined
          }
          plan_name?: string
          max_items?: number
          subscription_price?: number
          billing_cycle?: 'mensual' | 'anual' | 'indefinido'
          payment_status?: 'al_dia' | 'pendiente' | 'vencido'
          next_due_date?: string
          is_active?: boolean
          owner_id: string
          rating_avg?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_id?: string | null
          slug?: string
          name?: string
          niche?: 'comercio' | 'inmueble' | 'agenda' | 'plaza_comidas'
          catalog_mode?: 'carrito' | 'vitrina'
          whatsapp?: string
          logo_url?: string | null
          banner_url?: string | null
          description?: string | null
          address?: string | null
          maps_url?: string | null
          city?: string
          theme?: {
            primary_color: string
            [key: string]: Json | undefined
          }
          plan_name?: string
          max_items?: number
          subscription_price?: number
          billing_cycle?: 'mensual' | 'anual' | 'indefinido'
          payment_status?: 'al_dia' | 'pendiente' | 'vencido'
          next_due_date?: string
          is_active?: boolean
          owner_id?: string
          rating_avg?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      items: {
        Row: {
          id: string
          business_id: string
          title: string
          description: string | null
          price: number
          images: string[]
          status: 'disponible' | 'agotado' | 'reservado' | 'vendido'
          sort_order: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          title: string
          description?: string | null
          price?: number
          images?: string[]
          status?: 'disponible' | 'agotado' | 'reservado' | 'vendido'
          sort_order?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          title?: string
          description?: string | null
          price?: number
          images?: string[]
          status?: 'disponible' | 'agotado' | 'reservado' | 'vendido'
          sort_order?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          business_id: string
          item_id: string | null
          client_name: string
          client_phone: string
          scheduled_at: string
          status: 'pendiente' | 'confirmada' | 'cancelada'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          item_id?: string | null
          client_name: string
          client_phone: string
          scheduled_at: string
          status?: 'pendiente' | 'confirmada' | 'cancelada'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          item_id?: string | null
          client_name?: string
          client_phone?: string
          scheduled_at?: string
          status?: 'pendiente' | 'confirmada' | 'cancelada'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          business_id: string
          rating: number
          comment: string | null
          author_name: string
          is_approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          rating: number
          comment?: string | null
          author_name?: string
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          rating?: number
          comment?: string | null
          author_name?: string
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          business_id: string
          amount: number
          method: 'qr' | 'transferencia' | 'efectivo' | 'otro'
          notes: string | null
          recorded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          amount: number
          method?: 'qr' | 'transferencia' | 'efectivo' | 'otro'
          notes?: string | null
          recorded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          amount?: number
          method?: 'qr' | 'transferencia' | 'efectivo' | 'otro'
          notes?: string | null
          recorded_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      rate_limits: {
        Row: {
          id: string
          key: string
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          created_at?: string
        }
        Relationships: []
      }
      click_events: {
        Row: {
          id: string
          business_id: string
          item_id: string | null
          type: 'whatsapp_order' | 'whatsapp_consult' | 'maps' | 'booking'
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          item_id?: string | null
          type: 'whatsapp_order' | 'whatsapp_consult' | 'maps' | 'booking'
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          item_id?: string | null
          type?: 'whatsapp_order' | 'whatsapp_consult' | 'maps' | 'booking'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      superadmin_subscriptions: {
        Row: {
          business_id: string
          name: string
          slug: string
          niche: 'comercio' | 'inmueble' | 'agenda' | 'plaza_comidas'
          plan_name: string
          items_en_uso: number
          max_items: number
          subscription_price: number
          billing_cycle: 'mensual' | 'anual' | 'indefinido'
          next_due_date: string
          payment_status: 'al_dia' | 'pendiente' | 'vencido'
          is_active: boolean
          whatsapp: string
          owner_id: string | null
          owner_name: string | null
          owner_email: string | null
          created_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      register_payment: {
        Args: {
          p_business_id: string
          p_amount: number
          p_method?: 'qr' | 'transferencia' | 'efectivo' | 'otro'
          p_notes?: string | null
        }
        Returns: Json
      }
      mark_overdue: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      is_business_accessible_for_owner: {
        Args: {
          p_business_id: string
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max: number
          p_window: string
        }
        Returns: boolean
      }
      get_busy_slots: {
        Args: {
          p_business_id: string
          p_from: string
          p_to: string
        }
        Returns: {
          busy_at: string
        }[]
      }
      track_click: {
        Args: {
          p_business_id: string
          p_item_id?: string | null
          p_type?: 'whatsapp_order' | 'whatsapp_consult' | 'maps' | 'booking'
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

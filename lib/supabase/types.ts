export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      community_route_likes: {
        Row: {
          created_at: string
          id: string
          route_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          route_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_route_likes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "community_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      community_routes: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          destination: string | null
          duration_days: number | null
          id: string
          is_public: boolean
          likes_count: number
          published_at: string | null
          route_geojson: Json | null
          tags: string[]
          tip: string | null
          title: string
          travel_style: string | null
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          destination?: string | null
          duration_days?: number | null
          id?: string
          is_public?: boolean
          likes_count?: number
          published_at?: string | null
          route_geojson?: Json | null
          tags?: string[]
          tip?: string | null
          title: string
          travel_style?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          destination?: string | null
          duration_days?: number | null
          id?: string
          is_public?: boolean
          likes_count?: number
          published_at?: string | null
          route_geojson?: Json | null
          tags?: string[]
          tip?: string | null
          title?: string
          travel_style?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_routes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_splits: {
        Row: {
          amount_owed_cents: number
          created_at: string
          expense_id: string
          id: string
          is_settled: boolean
          settled_at: string | null
          user_id: string
        }
        Insert: {
          amount_owed_cents: number
          created_at?: string
          expense_id: string
          id?: string
          is_settled?: boolean
          settled_at?: string | null
          user_id: string
        }
        Update: {
          amount_owed_cents?: number
          created_at?: string
          expense_id?: string
          id?: string
          is_settled?: boolean
          settled_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          category: string | null
          created_at: string
          currency: string
          expense_date: string
          id: string
          paid_by_user_id: string
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category?: string | null
          created_at?: string
          currency?: string
          expense_date?: string
          id?: string
          paid_by_user_id: string
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category?: string | null
          created_at?: string
          currency?: string
          expense_date?: string
          id?: string
          paid_by_user_id?: string
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      place_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          place_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          place_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          place_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          cached_at: string | null
          category: string | null
          created_at: string
          destination_normalized: string | null
          formatted_address: string | null
          google_place_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          name: string
          opening_hours: Json | null
          phone: string | null
          photos: Json
          price_level: number | null
          rating: number | null
          updated_at: string
          views_count: number
          website: string | null
        }
        Insert: {
          cached_at?: string | null
          category?: string | null
          created_at?: string
          destination_normalized?: string | null
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name: string
          opening_hours?: Json | null
          phone?: string | null
          photos?: Json
          price_level?: number | null
          rating?: number | null
          updated_at?: string
          views_count?: number
          website?: string | null
        }
        Update: {
          cached_at?: string | null
          category?: string | null
          created_at?: string
          destination_normalized?: string | null
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          photos?: Json
          price_level?: number | null
          rating?: number | null
          updated_at?: string
          views_count?: number
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          plan: string
          plan_expires_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          plan?: string
          plan_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          plan?: string
          plan_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trip_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_memories: {
        Row: {
          cover_photo_url: string | null
          cover_place_id: string | null
          created_at: string
          created_by: string
          destination_label: string | null
          end_date: string | null
          id: string
          mood: string
          places_visited: number
          share_token: string
          start_date: string | null
          total_spent_cents: number
          travelers_count: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          cover_photo_url?: string | null
          cover_place_id?: string | null
          created_at?: string
          created_by: string
          destination_label?: string | null
          end_date?: string | null
          id?: string
          mood: string
          places_visited?: number
          share_token?: string
          start_date?: string | null
          total_spent_cents?: number
          travelers_count?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          cover_photo_url?: string | null
          cover_place_id?: string | null
          created_at?: string
          created_by?: string
          destination_label?: string | null
          end_date?: string | null
          id?: string
          mood?: string
          places_visited?: number
          share_token?: string
          start_date?: string | null
          total_spent_cents?: number
          travelers_count?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_memories_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_memory_journal_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          memory_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          memory_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          memory_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_memory_journal_entries_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "trip_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_places: {
        Row: {
          created_at: string
          day_number: number
          id: string
          notes: string | null
          order_index: number
          place_id: string
          sort_order: number
          status: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          id?: string
          notes?: string | null
          order_index?: number
          place_id: string
          sort_order?: number
          status?: string
          trip_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          notes?: string | null
          order_index?: number
          place_id?: string
          sort_order?: number
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_places_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      visited_countries: {
        Row: {
          id: string
          user_id: string
          country_code: string
          country_name: string
          first_visit_date: string | null
          trip_id: string | null
          is_manual: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          country_code: string
          country_name: string
          first_visit_date?: string | null
          trip_id?: string | null
          is_manual?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          country_code?: string
          country_name?: string
          first_visit_date?: string | null
          trip_id?: string | null
          is_manual?: boolean
          created_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          created_at: string
          created_by: string
          default_currency: string
          description: string | null
          destination_label: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_currency?: string
          description?: string | null
          destination_label?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_currency?: string
          description?: string | null
          destination_label?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      ranked_routes: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          destination: string | null
          duration_days: number | null
          id: string
          is_public: boolean
          likes_count: number
          published_at: string | null
          route_geojson: Json | null
          score: number
          tags: string[]
          tip: string | null
          title: string
          travel_style: string | null
          trip_id: string | null
          updated_at: string
        }
        Relationships: [
          {
            foreignKeyName: "community_routes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      routeflow_increment_places_views: { Args: { p_ids: string[] }; Returns: undefined }
      routeflow_user_id_by_email: { Args: { p_email: string }; Returns: string | null }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

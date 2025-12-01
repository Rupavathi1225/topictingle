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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blogs: {
        Row: {
          author: string
          category_id: number | null
          content: string
          created_at: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          serial_number: number
          slug: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author: string
          category_id?: number | null
          content: string
          created_at?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          serial_number?: number
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          category_id?: number | null
          content?: string
          created_at?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          serial_number?: number
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blogs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code_range: string
          created_at: string | null
          id: number
          name: string
          slug: string
        }
        Insert: {
          code_range: string
          created_at?: string | null
          id?: number
          name: string
          slug: string
        }
        Update: {
          code_range?: string
          created_at?: string | null
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      clicks: {
        Row: {
          button_id: string
          button_label: string | null
          clicked_at: string
          country: string | null
          id: string
          page_url: string | null
          session_id: string
          source: string | null
        }
        Insert: {
          button_id: string
          button_label?: string | null
          clicked_at?: string
          country?: string | null
          id?: string
          page_url?: string | null
          session_id: string
          source?: string | null
        }
        Update: {
          button_id?: string
          button_label?: string | null
          clicked_at?: string
          country?: string | null
          id?: string
          page_url?: string | null
          session_id?: string
          source?: string | null
        }
        Relationships: []
      }
      dz_blogs: {
        Row: {
          author: string
          author_bio: string | null
          author_image: string | null
          category_id: number | null
          content: string
          created_at: string | null
          featured_image: string | null
          id: string
          slug: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author: string
          author_bio?: string | null
          author_image?: string | null
          category_id?: number | null
          content: string
          created_at?: string | null
          featured_image?: string | null
          id?: string
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          author_bio?: string | null
          author_image?: string | null
          category_id?: number | null
          content?: string
          created_at?: string | null
          featured_image?: string | null
          id?: string
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dz_blogs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dz_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dz_categories: {
        Row: {
          code_range: string | null
          created_at: string | null
          id: number
          name: string
          slug: string
        }
        Insert: {
          code_range?: string | null
          created_at?: string | null
          id?: number
          name: string
          slug: string
        }
        Update: {
          code_range?: string | null
          created_at?: string | null
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      dz_prelanding_pages: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          button_color: string | null
          button_text: string | null
          button_text_color: string | null
          created_at: string | null
          description: string | null
          description_color: string | null
          description_font_size: number | null
          email_box_border_color: string | null
          email_box_color: string | null
          headline: string
          headline_color: string | null
          headline_font_size: number | null
          id: string
          image_ratio: string | null
          logo_position: string | null
          logo_size: number | null
          logo_url: string | null
          main_image_url: string | null
          related_search_id: string | null
          text_alignment: string | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          button_color?: string | null
          button_text?: string | null
          button_text_color?: string | null
          created_at?: string | null
          description?: string | null
          description_color?: string | null
          description_font_size?: number | null
          email_box_border_color?: string | null
          email_box_color?: string | null
          headline: string
          headline_color?: string | null
          headline_font_size?: number | null
          id?: string
          image_ratio?: string | null
          logo_position?: string | null
          logo_size?: number | null
          logo_url?: string | null
          main_image_url?: string | null
          related_search_id?: string | null
          text_alignment?: string | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          button_color?: string | null
          button_text?: string | null
          button_text_color?: string | null
          created_at?: string | null
          description?: string | null
          description_color?: string | null
          description_font_size?: number | null
          email_box_border_color?: string | null
          email_box_color?: string | null
          headline?: string
          headline_color?: string | null
          headline_font_size?: number | null
          id?: string
          image_ratio?: string | null
          logo_position?: string | null
          logo_size?: number | null
          logo_url?: string | null
          main_image_url?: string | null
          related_search_id?: string | null
          text_alignment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dz_prelanding_pages_related_search_id_fkey"
            columns: ["related_search_id"]
            isOneToOne: false
            referencedRelation: "dz_related_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      dz_related_searches: {
        Row: {
          blog_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          search_text: string
          target_url: string
        }
        Insert: {
          blog_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          search_text: string
          target_url: string
        }
        Update: {
          blog_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          search_text?: string
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dz_related_searches_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "dz_blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_captures: {
        Row: {
          captured_at: string | null
          country: string | null
          email: string
          id: string
          page_key: string
          source: string | null
        }
        Insert: {
          captured_at?: string | null
          country?: string | null
          email: string
          id?: string
          page_key: string
          source?: string | null
        }
        Update: {
          captured_at?: string | null
          country?: string | null
          email?: string
          id?: string
          page_key?: string
          source?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          blog_id: string | null
          country: string | null
          id: string
          page_url: string
          session_id: string
          source: string | null
          viewed_at: string
        }
        Insert: {
          blog_id?: string | null
          country?: string | null
          id?: string
          page_url: string
          session_id: string
          source?: string | null
          viewed_at?: string
        }
        Update: {
          blog_id?: string | null
          country?: string | null
          id?: string
          page_url?: string
          session_id?: string
          source?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      pre_landing_pages: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          created_at: string | null
          cta_color: string | null
          cta_text: string | null
          description: string | null
          description_align: string | null
          description_color: string | null
          description_font_size: number | null
          headline: string
          headline_align: string | null
          headline_color: string | null
          headline_font_size: number | null
          id: string
          image_ratio: string | null
          is_active: boolean | null
          logo_position: string | null
          logo_url: string | null
          logo_width: number | null
          main_image_url: string | null
          page_key: string
          target_url: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string | null
          cta_color?: string | null
          cta_text?: string | null
          description?: string | null
          description_align?: string | null
          description_color?: string | null
          description_font_size?: number | null
          headline: string
          headline_align?: string | null
          headline_color?: string | null
          headline_font_size?: number | null
          id?: string
          image_ratio?: string | null
          is_active?: boolean | null
          logo_position?: string | null
          logo_url?: string | null
          logo_width?: number | null
          main_image_url?: string | null
          page_key: string
          target_url: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string | null
          cta_color?: string | null
          cta_text?: string | null
          description?: string | null
          description_align?: string | null
          description_color?: string | null
          description_font_size?: number | null
          headline?: string
          headline_align?: string | null
          headline_color?: string | null
          headline_font_size?: number | null
          id?: string
          image_ratio?: string | null
          is_active?: boolean | null
          logo_position?: string | null
          logo_url?: string | null
          logo_width?: number | null
          main_image_url?: string | null
          page_key?: string
          target_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      related_searches: {
        Row: {
          allowed_countries: string[] | null
          blog_id: string | null
          category_id: number | null
          created_at: string
          display_order: number
          id: string
          ip_address: string | null
          is_active: boolean
          position: number | null
          pre_landing_page_key: string | null
          search_text: string
          session_id: string | null
          title: string | null
          updated_at: string
          web_result_page: number | null
        }
        Insert: {
          allowed_countries?: string[] | null
          blog_id?: string | null
          category_id?: number | null
          created_at?: string
          display_order?: number
          id?: string
          ip_address?: string | null
          is_active?: boolean
          position?: number | null
          pre_landing_page_key?: string | null
          search_text: string
          session_id?: string | null
          title?: string | null
          updated_at?: string
          web_result_page?: number | null
        }
        Update: {
          allowed_countries?: string[] | null
          blog_id?: string | null
          category_id?: number | null
          created_at?: string
          display_order?: number
          id?: string
          ip_address?: string | null
          is_active?: boolean
          position?: number | null
          pre_landing_page_key?: string | null
          search_text?: string
          session_id?: string | null
          title?: string | null
          updated_at?: string
          web_result_page?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "related_searches_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_searches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          last_active: string
          session_id: string
          source: string | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          last_active?: string
          session_id: string
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          last_active?: string
          session_id?: string
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      web_results: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_sponsored: boolean | null
          logo_url: string | null
          page_number: number
          position: number
          pre_landing_page_key: string | null
          related_search_id: string | null
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_sponsored?: boolean | null
          logo_url?: string | null
          page_number?: number
          position?: number
          pre_landing_page_key?: string | null
          related_search_id?: string | null
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_sponsored?: boolean | null
          logo_url?: string | null
          page_number?: number
          position?: number
          pre_landing_page_key?: string | null
          related_search_id?: string | null
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_results_related_search_id_fkey"
            columns: ["related_search_id"]
            isOneToOne: false
            referencedRelation: "related_searches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

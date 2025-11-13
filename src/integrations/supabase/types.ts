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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      saas_api_configs: {
        Row: {
          api_key: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_tokens: number
          model: string
          nome: string
          priority: number
          provider: string
          status: string
          temperature: number
          updated_at: string
          usuario_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number
          model: string
          nome: string
          priority?: number
          provider: string
          status?: string
          temperature?: number
          updated_at?: string
          usuario_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          nome?: string
          priority?: number
          provider?: string
          status?: string
          temperature?: number
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      saas_conexoes: {
        Row: {
          avatar_url: string | null
          config: Json | null
          conversas_count: number | null
          conversation_history: Json | null
          created_at: string
          display_name: string | null
          evolution_instance_id: string | null
          evolution_instance_name: string | null
          id: string
          last_sync: string | null
          modelo_ia: string | null
          nome: string
          prompt: string | null
          qr_code: string | null
          status: string
          telefone: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          config?: Json | null
          conversas_count?: number | null
          conversation_history?: Json | null
          created_at?: string
          display_name?: string | null
          evolution_instance_id?: string | null
          evolution_instance_name?: string | null
          id?: string
          last_sync?: string | null
          modelo_ia?: string | null
          nome: string
          prompt?: string | null
          qr_code?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          config?: Json | null
          conversas_count?: number | null
          conversation_history?: Json | null
          created_at?: string
          display_name?: string | null
          evolution_instance_id?: string | null
          evolution_instance_name?: string | null
          id?: string
          last_sync?: string | null
          modelo_ia?: string | null
          nome?: string
          prompt?: string | null
          qr_code?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      saas_maturation_messages: {
        Row: {
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          is_active: boolean
          mensagens: Json
          nome: string
          tipo_arquivo: string
          total_mensagens: number
          updated_at: string
          usuario_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_active?: boolean
          mensagens?: Json
          nome: string
          tipo_arquivo: string
          total_mensagens?: number
          updated_at?: string
          usuario_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_active?: boolean
          mensagens?: Json
          nome?: string
          tipo_arquivo?: string
          total_mensagens?: number
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      saas_media_config: {
        Row: {
          created_at: string
          enable_preview: boolean
          id: string
          max_images_per_hour: number
          max_links_per_conversation: number
          randomize_selection: boolean
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          enable_preview?: boolean
          id?: string
          max_images_per_hour?: number
          max_links_per_conversation?: number
          randomize_selection?: boolean
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          enable_preview?: boolean
          id?: string
          max_images_per_hour?: number
          max_links_per_conversation?: number
          randomize_selection?: boolean
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      saas_media_items: {
        Row: {
          category: string
          created_at: string
          frequency: number
          id: string
          is_active: boolean
          last_used: string | null
          mode: string
          name: string
          type: string
          updated_at: string
          url: string
          usage_count: number
          usuario_id: string
        }
        Insert: {
          category: string
          created_at?: string
          frequency?: number
          id?: string
          is_active?: boolean
          last_used?: string | null
          mode?: string
          name: string
          type: string
          updated_at?: string
          url: string
          usage_count?: number
          usuario_id: string
        }
        Update: {
          category?: string
          created_at?: string
          frequency?: number
          id?: string
          is_active?: boolean
          last_used?: string | null
          mode?: string
          name?: string
          type?: string
          updated_at?: string
          url?: string
          usage_count?: number
          usuario_id?: string
        }
        Relationships: []
      }
      saas_media_usage_trackers: {
        Row: {
          created_at: string
          id: string
          images_used_this_hour: number
          last_image_time: string | null
          last_reset_hour: number
          links_used_in_conversation: number
          message_count: number
          pair_id: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          images_used_this_hour?: number
          last_image_time?: string | null
          last_reset_hour?: number
          links_used_in_conversation?: number
          message_count?: number
          pair_id: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          images_used_this_hour?: number
          last_image_time?: string | null
          last_reset_hour?: number
          links_used_in_conversation?: number
          message_count?: number
          pair_id?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      saas_pares_maturacao: {
        Row: {
          created_at: string
          current_message_index: number
          id: string
          instance_prompt: string | null
          is_active: boolean
          last_activity: string
          loop_messages: boolean
          maturation_mode: string
          message_file_id: string | null
          messages_count: number
          nome_chip1: string
          nome_chip2: string
          started_at: string | null
          status: string
          updated_at: string
          use_instance_prompt: boolean
          usuario_id: string
        }
        Insert: {
          created_at?: string
          current_message_index?: number
          id?: string
          instance_prompt?: string | null
          is_active?: boolean
          last_activity?: string
          loop_messages?: boolean
          maturation_mode?: string
          message_file_id?: string | null
          messages_count?: number
          nome_chip1: string
          nome_chip2: string
          started_at?: string | null
          status?: string
          updated_at?: string
          use_instance_prompt?: boolean
          usuario_id: string
        }
        Update: {
          created_at?: string
          current_message_index?: number
          id?: string
          instance_prompt?: string | null
          is_active?: boolean
          last_activity?: string
          loop_messages?: boolean
          maturation_mode?: string
          message_file_id?: string | null
          messages_count?: number
          nome_chip1?: string
          nome_chip2?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          use_instance_prompt?: boolean
          usuario_id?: string
        }
        Relationships: []
      }
      saas_prompts: {
        Row: {
          categoria: string
          conteudo: string
          created_at: string
          id: string
          is_active: boolean
          is_global: boolean
          nome: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          categoria?: string
          conteudo: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_global?: boolean
          nome: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_global?: boolean
          nome?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      saas_usuarios: {
        Row: {
          chips_limite: number
          created_at: string
          email: string
          id: string
          nome: string
          senha_hash: string
          status: string
          updated_at: string
        }
        Insert: {
          chips_limite?: number
          created_at?: string
          email: string
          id?: string
          nome: string
          senha_hash: string
          status?: string
          updated_at?: string
        }
        Update: {
          chips_limite?: number
          created_at?: string
          email?: string
          id?: string
          nome?: string
          senha_hash?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_id: { Args: never; Returns: string }
      get_user_for_login: {
        Args: { p_email: string }
        Returns: {
          chips_limite: number
          email: string
          id: string
          nome: string
          status: string
        }[]
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

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      acessos: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          instalacao_id: string | null
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          instalacao_id?: string | null
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          instalacao_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acessos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_instalacao_id_fkey"
            columns: ["instalacao_id"]
            isOneToOne: false
            referencedRelation: "instalacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accao: string
          created_at: string
          descricao: string
          detalhe: Json
          entidade: string
          entidade_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          accao: string
          created_at?: string
          descricao?: string
          detalhe?: Json
          entidade: string
          entidade_id?: string | null
          id?: string
          user_id?: string
        }
        Update: {
          accao?: string
          created_at?: string
          descricao?: string
          detalhe?: Json
          entidade?: string
          entidade_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          contacto: string | null
          cp: string | null
          created_at: string
          email: string | null
          id: string
          localidade: string | null
          morada: string | null
          nif: string | null
          nome: string
          tel: string | null
          tlm: string | null
          user_id: string
        }
        Insert: {
          contacto?: string | null
          cp?: string | null
          created_at?: string
          email?: string | null
          id?: string
          localidade?: string | null
          morada?: string | null
          nif?: string | null
          nome: string
          tel?: string | null
          tlm?: string | null
          user_id: string
        }
        Update: {
          contacto?: string | null
          cp?: string | null
          created_at?: string
          email?: string | null
          id?: string
          localidade?: string | null
          morada?: string | null
          nif?: string | null
          nome?: string
          tel?: string | null
          tlm?: string | null
          user_id?: string
        }
        Relationships: []
      }
      doc_counters: {
        Row: {
          ano: number
          seq: number
          user_id: string
        }
        Insert: {
          ano: number
          seq?: number
          user_id: string
        }
        Update: {
          ano?: number
          seq?: number
          user_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          dados: Json
          estado: string
          ficheiro_path: string | null
          hash: string | null
          html: string
          id: string
          instalacao_id: string | null
          numero: string | null
          resumo: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          dados?: Json
          estado?: string
          ficheiro_path?: string | null
          hash?: string | null
          html?: string
          id?: string
          instalacao_id?: string | null
          numero?: string | null
          resumo?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          dados?: Json
          estado?: string
          ficheiro_path?: string | null
          hash?: string | null
          html?: string
          id?: string
          instalacao_id?: string | null
          numero?: string | null
          resumo?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_instalacao_id_fkey"
            columns: ["instalacao_id"]
            isOneToOne: false
            referencedRelation: "instalacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa: {
        Row: {
          contacto: string | null
          data_emissao: string | null
          id: string
          localidade: string | null
          morada: string | null
          nipc: string | null
          nome: string
          registo: string | null
          tecnico: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contacto?: string | null
          data_emissao?: string | null
          id?: string
          localidade?: string | null
          morada?: string | null
          nipc?: string | null
          nome?: string
          registo?: string | null
          tecnico?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contacto?: string | null
          data_emissao?: string | null
          id?: string
          localidade?: string | null
          morada?: string | null
          nipc?: string | null
          nome?: string
          registo?: string | null
          tecnico?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          created_at: string
          equip: string
          id: string
          instalacao_id: string
          local: string | null
          marca: string | null
          ordem: number
          serie: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          equip?: string
          id?: string
          instalacao_id: string
          local?: string | null
          marca?: string | null
          ordem?: number
          serie?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          equip?: string
          id?: string
          instalacao_id?: string
          local?: string | null
          marca?: string | null
          ordem?: number
          serie?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_instalacao_id_fkey"
            columns: ["instalacao_id"]
            isOneToOne: false
            referencedRelation: "instalacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      instalacoes: {
        Row: {
          autoridade: string | null
          autoridade_subunidade: string | null
          cliente_id: string
          contacto_resp: string | null
          created_at: string
          data_instalacao: string | null
          entidade: string | null
          estado: string
          id: string
          instalado_por: string | null
          localidade: string | null
          monitorizado_por: string | null
          morada: string | null
          num_registo: string | null
          periodicidade_meses: number
          proxima_manutencao: string | null
          responsavel: string | null
          sistema_id: string | null
          tipo_sistema: string | null
          user_id: string
        }
        Insert: {
          autoridade?: string | null
          autoridade_subunidade?: string | null
          cliente_id: string
          contacto_resp?: string | null
          created_at?: string
          data_instalacao?: string | null
          entidade?: string | null
          estado?: string
          id?: string
          instalado_por?: string | null
          localidade?: string | null
          monitorizado_por?: string | null
          morada?: string | null
          num_registo?: string | null
          periodicidade_meses?: number
          proxima_manutencao?: string | null
          responsavel?: string | null
          sistema_id?: string | null
          tipo_sistema?: string | null
          user_id: string
        }
        Update: {
          autoridade?: string | null
          autoridade_subunidade?: string | null
          cliente_id?: string
          contacto_resp?: string | null
          created_at?: string
          data_instalacao?: string | null
          entidade?: string | null
          estado?: string
          id?: string
          instalado_por?: string | null
          localidade?: string | null
          monitorizado_por?: string | null
          morada?: string | null
          num_registo?: string | null
          periodicidade_meses?: number
          proxima_manutencao?: string | null
          responsavel?: string | null
          sistema_id?: string | null
          tipo_sistema?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instalacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencoes: {
        Row: {
          causa: string | null
          created_at: string
          data: string
          hora: string | null
          id: string
          instalacao_id: string
          modo: string | null
          num_relatorio: string | null
          tecnico: string | null
          tipo: string | null
          trabalhos: string | null
          user_id: string
        }
        Insert: {
          causa?: string | null
          created_at?: string
          data?: string
          hora?: string | null
          id?: string
          instalacao_id: string
          modo?: string | null
          num_relatorio?: string | null
          tecnico?: string | null
          tipo?: string | null
          trabalhos?: string | null
          user_id: string
        }
        Update: {
          causa?: string | null
          created_at?: string
          data?: string
          hora?: string | null
          id?: string
          instalacao_id?: string
          modo?: string | null
          num_relatorio?: string | null
          tecnico?: string | null
          tipo?: string | null
          trabalhos?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervencoes_instalacao_id_fkey"
            columns: ["instalacao_id"]
            isOneToOne: false
            referencedRelation: "instalacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "superadmin" | "tecnico"
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
    Enums: {
      app_role: ["superadmin", "tecnico"],
    },
  },
} as const

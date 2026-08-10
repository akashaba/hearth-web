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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          household_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          household_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          household_id: string
          id: string
          last_message_at: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          household_id: string
          id?: string
          last_message_at?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          household_id?: string
          id?: string
          last_message_at?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_tool_calls: {
        Row: {
          args: Json
          conversation_id: string
          created_at: string
          id: string
          ms: number
          result_summary: string | null
          tool_name: string
        }
        Insert: {
          args: Json
          conversation_id: string
          created_at?: string
          id?: string
          ms: number
          result_summary?: string | null
          tool_name: string
        }
        Update: {
          args?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          ms?: number
          result_summary?: string | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_tool_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          active: boolean
          alert_threshold_pct: number
          category_id: string
          created_at: string
          created_by_user_id: string | null
          household_id: string
          id: string
          monthly_amount: number
        }
        Insert: {
          active?: boolean
          alert_threshold_pct?: number
          category_id: string
          created_at?: string
          created_by_user_id?: string | null
          household_id: string
          id?: string
          monthly_amount: number
        }
        Update: {
          active?: boolean
          alert_threshold_pct?: number
          category_id?: string
          created_at?: string
          created_by_user_id?: string | null
          household_id?: string
          id?: string
          monthly_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          default_type: Database["public"]["Enums"]["transaction_type"]
          group_type: Database["public"]["Enums"]["category_group"]
          id: string
          name: string
          notes: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_type: Database["public"]["Enums"]["transaction_type"]
          group_type: Database["public"]["Enums"]["category_group"]
          id?: string
          name: string
          notes?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          default_type?: Database["public"]["Enums"]["transaction_type"]
          group_type?: Database["public"]["Enums"]["category_group"]
          id?: string
          name?: string
          notes?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      debts: {
        Row: {
          active: boolean
          apr: number
          category_id: string | null
          created_at: string
          created_by_user_id: string | null
          debt_type: string
          first_payment_date: string
          fixed_deduction_id: string | null
          household_id: string
          id: string
          monthly_payment: number
          name: string
          notes: string | null
          original_balance: number
        }
        Insert: {
          active?: boolean
          apr: number
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          debt_type: string
          first_payment_date: string
          fixed_deduction_id?: string | null
          household_id: string
          id?: string
          monthly_payment: number
          name: string
          notes?: string | null
          original_balance: number
        }
        Update: {
          active?: boolean
          apr?: number
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          debt_type?: string
          first_payment_date?: string
          fixed_deduction_id?: string | null
          household_id?: string
          id?: string
          monthly_payment?: number
          name?: string
          notes?: string | null
          original_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "debts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_fixed_deduction_id_fkey"
            columns: ["fixed_deduction_id"]
            isOneToOne: false
            referencedRelation: "fixed_deductions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      digest_sends: {
        Row: {
          content: string | null
          household_id: string
          sent_at: string
        }
        Insert: {
          content?: string | null
          household_id: string
          sent_at?: string
        }
        Update: {
          content?: string | null
          household_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_sends_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_deductions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by_user_id: string | null
          day_of_month: number
          enabled: boolean
          household_id: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          created_by_user_id?: string | null
          day_of_month: number
          enabled?: boolean
          household_id: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by_user_id?: string | null
          day_of_month?: number
          enabled?: boolean
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_deductions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_deductions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          code: string
          consumed_at: string | null
          consumed_by_user_id: string | null
          created_at: string
          created_by_user_id: string
          expires_at: string
          household_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          consumed_by_user_id?: string | null
          created_at?: string
          created_by_user_id: string
          expires_at?: string
          household_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          consumed_by_user_id?: string | null
          created_at?: string
          created_by_user_id?: string
          expires_at?: string
          household_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          timezone?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          household_id: string
          id: string
          kind: string
          meta: Json
          related_href: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          household_id: string
          id?: string
          kind: string
          meta?: Json
          related_href?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          household_id?: string
          id?: string
          kind?: string
          meta?: Json
          related_href?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      push_dedupe: {
        Row: {
          key: string
          sent_at: string
        }
        Insert: {
          key: string
          sent_at?: string
        }
        Update: {
          key?: string
          sent_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          error: string | null
          household_id: string
          id: string
          image_path: string
          merchant: string | null
          ocr_raw: Json | null
          receipt_date: string | null
          status: Database["public"]["Enums"]["receipt_status"]
          subtotal: number | null
          tax: number | null
          total: number | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          error?: string | null
          household_id: string
          id?: string
          image_path: string
          merchant?: string | null
          ocr_raw?: Json | null
          receipt_date?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          subtotal?: number | null
          tax?: number | null
          total?: number | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          error?: string | null
          household_id?: string
          id?: string
          image_path?: string
          merchant?: string | null
          ocr_raw?: Json | null
          receipt_date?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          subtotal?: number | null
          tax?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_suggestions: {
        Row: {
          avg_amount: number
          avg_day_of_month: number
          created_at: string
          first_seen: string
          household_id: string
          id: string
          last_seen: string
          merchant: string
          occurrence_count: number
          status: string
          suggested_category_id: string | null
        }
        Insert: {
          avg_amount: number
          avg_day_of_month: number
          created_at?: string
          first_seen: string
          household_id: string
          id?: string
          last_seen: string
          merchant: string
          occurrence_count: number
          status?: string
          suggested_category_id?: string | null
        }
        Update: {
          avg_amount?: number
          avg_day_of_month?: number
          created_at?: string
          first_seen?: string
          household_id?: string
          id?: string
          last_seen?: string
          merchant?: string
          occurrence_count?: number
          status?: string
          suggested_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_suggestions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_suggestions_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          household_id: string
          id: string
          name: string
          source_category_id: string | null
          starts_on: string
          target_amount: number
          target_date: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          household_id: string
          id?: string
          name: string
          source_category_id?: string | null
          starts_on?: string
          target_amount: number
          target_date?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          household_id?: string
          id?: string
          name?: string
          source_category_id?: string | null
          starts_on?: string
          target_amount?: number
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_goals_source_category_id_fkey"
            columns: ["source_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      setup: {
        Row: {
          first_payday: string | null
          household_id: string
          paycheck_amount: number
          paycheck_category_id: string | null
          starting_balance: number
          starting_balance_date: string
          updated_at: string
        }
        Insert: {
          first_payday?: string | null
          household_id: string
          paycheck_amount?: number
          paycheck_category_id?: string | null
          starting_balance?: number
          starting_balance_date?: string
          updated_at?: string
        }
        Update: {
          first_payday?: string | null
          household_id?: string
          paycheck_amount?: number
          paycheck_category_id?: string | null
          starting_balance?: number
          starting_balance_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_paycheck_category_id_fkey"
            columns: ["paycheck_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string
          created_at: string
          created_by_user_id: string | null
          date: string
          description: string
          household_id: string
          id: string
          notes: string | null
          receipt_id: string | null
          source_deduction_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          account_id: string
          amount: number
          category_id: string
          created_at?: string
          created_by_user_id?: string | null
          date: string
          description: string
          household_id: string
          id?: string
          notes?: string | null
          receipt_id?: string | null
          source_deduction_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string
          created_at?: string
          created_by_user_id?: string | null
          date?: string
          description?: string
          household_id?: string
          id?: string
          notes?: string | null
          receipt_id?: string | null
          source_deduction_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_receipt_fk"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_deduction_id_fkey"
            columns: ["source_deduction_id"]
            isOneToOne: false
            referencedRelation: "fixed_deductions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite_code: {
        Args: { code_input: string }
        Returns: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          timezone: string
        }[]
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      bootstrap_household: {
        Args: never
        Returns: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          timezone: string
        }[]
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_invite_code: { Args: { hid: string }; Returns: string }
      is_household_member: { Args: { hid: string }; Returns: boolean }
    }
    Enums: {
      category_group: "income" | "fixed" | "variable"
      receipt_status: "pending" | "parsed" | "submitted" | "failed"
      transaction_type: "debit" | "credit"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category_group: ["income", "fixed", "variable"],
      receipt_status: ["pending", "parsed", "submitted", "failed"],
      transaction_type: ["debit", "credit"],
    },
  },
} as const

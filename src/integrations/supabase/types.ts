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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          affected_table: string
          created_at: string
          details: Json
          id: string
          record_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          affected_table: string
          created_at?: string
          details?: Json
          id?: string
          record_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          affected_table?: string
          created_at?: string
          details?: Json
          id?: string
          record_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          county: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          inquiry_type: string | null
          kind: string
          message: string | null
          phone: string | null
          status: string
        }
        Insert: {
          county?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          inquiry_type?: string | null
          kind: string
          message?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          county?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          inquiry_type?: string | null
          kind?: string
          message?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      member_contributions: {
        Row: {
          account_reference: string | null
          amount_kes: number
          checkout_request_id: string | null
          created_at: string
          id: string
          member_user_id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          national_id: string
          paid_at: string | null
          phone: string
          result_desc: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_reference?: string | null
          amount_kes: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          member_user_id: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          national_id: string
          paid_at?: string | null
          phone: string
          result_desc?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_reference?: string | null
          amount_kes?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          member_user_id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          national_id?: string
          paid_at?: string | null
          phone?: string
          result_desc?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_contributions_member_user_id_fkey"
            columns: ["member_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_applications: {
        Row: {
          applicant_user_id: string
          application_number: string
          application_status: Database["public"]["Enums"]["member_status"]
          business_name: string | null
          county: string
          date_of_birth: string | null
          email: string
          farm_size: string | null
          full_name: string
          gender: string | null
          id: string
          member_type: Database["public"]["Enums"]["member_type"]
          national_id: string | null
          phone: string
          photo_path: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sub_county: string | null
          submission_date: string
          supporting_documents: string[]
          terms_accepted_at: string
        }
        Insert: {
          applicant_user_id: string
          application_number?: string
          application_status?: Database["public"]["Enums"]["member_status"]
          business_name?: string | null
          county: string
          date_of_birth?: string | null
          email: string
          farm_size?: string | null
          full_name: string
          gender?: string | null
          id?: string
          member_type: Database["public"]["Enums"]["member_type"]
          national_id?: string | null
          phone: string
          photo_path?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sub_county?: string | null
          submission_date?: string
          supporting_documents?: string[]
          terms_accepted_at?: string
        }
        Update: {
          applicant_user_id?: string
          application_number?: string
          application_status?: Database["public"]["Enums"]["member_status"]
          business_name?: string | null
          county?: string
          date_of_birth?: string | null
          email?: string
          farm_size?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          member_type?: Database["public"]["Enums"]["member_type"]
          national_id?: string | null
          phone?: string
          photo_path?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sub_county?: string | null
          submission_date?: string
          supporting_documents?: string[]
          terms_accepted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_applications_applicant_user_id_fkey"
            columns: ["applicant_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_county_codes: {
        Row: {
          code: string
          county: string
        }
        Insert: {
          code: string
          county: string
        }
        Update: {
          code?: string
          county?: string
        }
        Relationships: []
      }
      membership_number_counters: {
        Row: {
          county: string
          last_number: number
          registration_year: number
        }
        Insert: {
          county: string
          last_number?: number
          registration_year: number
        }
        Update: {
          county?: string
          last_number?: number
          registration_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "membership_number_counters_county_fkey"
            columns: ["county"]
            isOneToOne: false
            referencedRelation: "membership_county_codes"
            referencedColumns: ["county"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          subscription_status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          subscription_status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          subscription_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          county: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          farm_size: string | null
          full_name: string | null
          gender: string | null
          id: string
          member_no: string | null
          member_number: string | null
          member_type: Database["public"]["Enums"]["member_type"] | null
          national_id: string | null
          phone: string | null
          photo_path: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["member_status"]
          sub_county: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_name?: string | null
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          farm_size?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          member_no?: string | null
          member_number?: string | null
          member_type?: Database["public"]["Enums"]["member_type"] | null
          national_id?: string | null
          phone?: string | null
          photo_path?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          sub_county?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_name?: string | null
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          farm_size?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          member_no?: string | null
          member_number?: string | null
          member_type?: Database["public"]["Enums"]["member_type"] | null
          national_id?: string | null
          phone?: string | null
          photo_path?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          sub_county?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shop_materials: {
        Row: {
          created_at: string
          filename: string
          id: string
          product_id: string
          storage_path: string
          title: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          product_id: string
          storage_path: string
          title: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          product_id?: string
          storage_path?: string
          title?: string
        }
        Relationships: []
      }
      shop_orders: {
        Row: {
          amount_kes: number | null
          checkout_request_id: string | null
          created_at: string
          delivery_status: string
          delivery_updated_at: string | null
          id: string
          items: Json
          merchant_request_id: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          payment_environment: string
          phone: string | null
          request_key: string
          shipping_address: Json | null
          shipping_kes: number | null
          shipping_quote_reference: string | null
          status: string
          subtotal_kes: number
          tracking_reference: string | null
          user_id: string
        }
        Insert: {
          amount_kes?: number | null
          checkout_request_id?: string | null
          created_at?: string
          delivery_status?: string
          delivery_updated_at?: string | null
          id?: string
          items: Json
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          payment_environment?: string
          phone?: string | null
          request_key: string
          shipping_address?: Json | null
          shipping_kes?: number | null
          shipping_quote_reference?: string | null
          status?: string
          subtotal_kes: number
          tracking_reference?: string | null
          user_id: string
        }
        Update: {
          amount_kes?: number | null
          checkout_request_id?: string | null
          created_at?: string
          delivery_status?: string
          delivery_updated_at?: string | null
          id?: string
          items?: Json
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          payment_environment?: string
          phone?: string | null
          request_key?: string
          shipping_address?: Json | null
          shipping_kes?: number | null
          shipping_quote_reference?: string | null
          status?: string
          subtotal_kes?: number
          tracking_reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          county: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          county?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          county?: string | null
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
      assign_membership_role: {
        Args: {
          assigned_county?: string
          new_role: Database["public"]["Enums"]["app_role"]
          target_user: string
        }
        Returns: undefined
      }
      can_review_county: { Args: { target_county: string }; Returns: boolean }
      ccak_county_code: { Args: { county_name: string }; Returns: string }
      format_ccak_member_number: {
        Args: {
          county_code: string
          registration_number: number
          registration_year: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_confirmed_bootstrap_admin: {
        Args: { account_email: string; confirmed_at: string }
        Returns: boolean
      }
      is_national_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      membership_statistics: { Args: never; Returns: Json }
      publish_shop_material: {
        Args: {
          material_filename: string
          material_path: string
          material_product: string
          material_title: string
        }
        Returns: undefined
      }
      quote_shop_delivery: {
        Args: { fee_kes: number; order_id: string; quote_reference: string }
        Returns: undefined
      }
      review_membership_application: {
        Args: {
          application_id: string
          decision: Database["public"]["Enums"]["member_status"]
          notes?: string
        }
        Returns: {
          applicant_user_id: string
          application_number: string
          application_status: Database["public"]["Enums"]["member_status"]
          business_name: string | null
          county: string
          date_of_birth: string | null
          email: string
          farm_size: string | null
          full_name: string
          gender: string | null
          id: string
          member_type: Database["public"]["Enums"]["member_type"]
          national_id: string | null
          phone: string
          photo_path: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sub_county: string | null
          submission_date: string
          supporting_documents: string[]
          terms_accepted_at: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_membership_application: {
        Args: { payload: Json }
        Returns: {
          applicant_user_id: string
          application_number: string
          application_status: Database["public"]["Enums"]["member_status"]
          business_name: string | null
          county: string
          date_of_birth: string | null
          email: string
          farm_size: string | null
          full_name: string
          gender: string | null
          id: string
          member_type: Database["public"]["Enums"]["member_type"]
          national_id: string | null
          phone: string
          photo_path: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sub_county: string | null
          submission_date: string
          supporting_documents: string[]
          terms_accepted_at: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_membership_registration: {
        Args: { payload: Json }
        Returns: {
          applicant_user_id: string
          application_number: string
          application_status: Database["public"]["Enums"]["member_status"]
          business_name: string | null
          county: string
          date_of_birth: string | null
          email: string
          farm_size: string | null
          full_name: string
          gender: string | null
          id: string
          member_type: Database["public"]["Enums"]["member_type"]
          national_id: string | null
          phone: string
          photo_path: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sub_county: string | null
          submission_date: string
          supporting_documents: string[]
          terms_accepted_at: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_shop_delivery: {
        Args: { new_status: string; order_id: string; tracking: string }
        Returns: undefined
      }
      verify_membership: {
        Args: { number: string }
        Returns: {
          county: string
          full_name: string
          member_number: string
          member_type: Database["public"]["Enums"]["member_type"]
          status: Database["public"]["Enums"]["member_status"]
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "member"
        | "super_admin"
        | "national_admin"
        | "county_admin"
      member_status: "pending" | "approved" | "rejected"
      member_type:
        | "farmer"
        | "cooperative"
        | "barista"
        | "roaster"
        | "trader"
        | "enterprise"
        | "other"
        | "ccak_member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "member",
        "super_admin",
        "national_admin",
        "county_admin",
      ],
      member_status: ["pending", "approved", "rejected"],
      member_type: [
        "farmer",
        "cooperative",
        "barista",
        "roaster",
        "trader",
        "enterprise",
        "other",
        "ccak_member",
      ],
    },
  },
} as const

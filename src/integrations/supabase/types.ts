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
      coffee_services: {
        Row: {
          base_unit_price_kes: number | null
          category_id: string
          code: string
          created_at: string
          description: string | null
          effective_from: string | null
          equipment_component_kes: number | null
          id: string
          is_active: boolean
          is_package: boolean
          labour_component_kes: number | null
          last_verified_at: string | null
          material_component_kes: number | null
          minimum_charge_kes: number | null
          name: string
          package_includes: string[] | null
          source_link: string | null
          source_name: string | null
          terrain_multiplier_extreme: number | null
          terrain_multiplier_flat: number | null
          terrain_multiplier_gentle: number | null
          terrain_multiplier_moderate: number | null
          terrain_multiplier_steep: number | null
          transport_component_kes: number | null
          unit: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          base_unit_price_kes?: number | null
          category_id: string
          code: string
          created_at?: string
          description?: string | null
          effective_from?: string | null
          equipment_component_kes?: number | null
          id?: string
          is_active?: boolean
          is_package?: boolean
          labour_component_kes?: number | null
          last_verified_at?: string | null
          material_component_kes?: number | null
          minimum_charge_kes?: number | null
          name: string
          package_includes?: string[] | null
          source_link?: string | null
          source_name?: string | null
          terrain_multiplier_extreme?: number | null
          terrain_multiplier_flat?: number | null
          terrain_multiplier_gentle?: number | null
          terrain_multiplier_moderate?: number | null
          terrain_multiplier_steep?: number | null
          transport_component_kes?: number | null
          unit: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          base_unit_price_kes?: number | null
          category_id?: string
          code?: string
          created_at?: string
          description?: string | null
          effective_from?: string | null
          equipment_component_kes?: number | null
          id?: string
          is_active?: boolean
          is_package?: boolean
          labour_component_kes?: number | null
          last_verified_at?: string | null
          material_component_kes?: number | null
          minimum_charge_kes?: number | null
          name?: string
          package_includes?: string[] | null
          source_link?: string | null
          source_name?: string | null
          terrain_multiplier_extreme?: number | null
          terrain_multiplier_flat?: number | null
          terrain_multiplier_gentle?: number | null
          terrain_multiplier_moderate?: number | null
          terrain_multiplier_steep?: number | null
          transport_component_kes?: number | null
          unit?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_varieties: {
        Row: {
          characteristics: string | null
          code: string
          created_at: string
          disease_susceptibility: string | null
          id: string
          is_active: boolean
          management_notes: string | null
          name: string
          planting_density_per_acre: number | null
          row_spacing_m: number
          seedling_unit_price_kes: number | null
          tree_spacing_m: number
          updated_at: string
        }
        Insert: {
          characteristics?: string | null
          code: string
          created_at?: string
          disease_susceptibility?: string | null
          id?: string
          is_active?: boolean
          management_notes?: string | null
          name: string
          planting_density_per_acre?: number | null
          row_spacing_m: number
          seedling_unit_price_kes?: number | null
          tree_spacing_m: number
          updated_at?: string
        }
        Update: {
          characteristics?: string | null
          code?: string
          created_at?: string
          disease_susceptibility?: string | null
          id?: string
          is_active?: boolean
          management_notes?: string | null
          name?: string
          planting_density_per_acre?: number | null
          row_spacing_m?: number
          seedling_unit_price_kes?: number | null
          tree_spacing_m?: number
          updated_at?: string
        }
        Relationships: []
      }
      crypto_payments: {
        Row: {
          amount_crypto_approx: string | null
          amount_kes: number
          asset_id: string
          created_at: string
          id: string
          payer_contact: string | null
          payer_name: string | null
          purpose: string
          reference: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          txid: string
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          amount_crypto_approx?: string | null
          amount_kes: number
          asset_id: string
          created_at?: string
          id?: string
          payer_contact?: string | null
          payer_name?: string | null
          purpose: string
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          txid: string
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          amount_crypto_approx?: string | null
          amount_kes?: number
          asset_id?: string
          created_at?: string
          id?: string
          payer_contact?: string | null
          payer_name?: string | null
          purpose?: string
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          txid?: string
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount_kes: number
          checkout_request_id: string | null
          created_at: string
          donor_name: string | null
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          payment_environment: string
          phone: string
          status: string
        }
        Insert: {
          amount_kes: number
          checkout_request_id?: string | null
          created_at?: string
          donor_name?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          payment_environment: string
          phone: string
          status?: string
        }
        Update: {
          amount_kes?: number
          checkout_request_id?: string | null
          created_at?: string
          donor_name?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          payment_environment?: string
          phone?: string
          status?: string
        }
        Relationships: []
      }
      farm_assessments: {
        Row: {
          area_under_coffee_acres: number | null
          county: string | null
          created_at: string
          establishment_status: string | null
          existing_trees: number | null
          experience_years: number | null
          farm_location: string | null
          farm_shape: string | null
          farm_size_acres: number
          farmer_full_name: string
          id: string
          land_utilisation_factor: number | null
          notes: string | null
          phone: string | null
          selected_variety_ids: string[] | null
          subcounty: string | null
          terrain: string | null
          updated_at: string
          user_id: string | null
          water_availability: string[] | null
        }
        Insert: {
          area_under_coffee_acres?: number | null
          county?: string | null
          created_at?: string
          establishment_status?: string | null
          existing_trees?: number | null
          experience_years?: number | null
          farm_location?: string | null
          farm_shape?: string | null
          farm_size_acres: number
          farmer_full_name: string
          id?: string
          land_utilisation_factor?: number | null
          notes?: string | null
          phone?: string | null
          selected_variety_ids?: string[] | null
          subcounty?: string | null
          terrain?: string | null
          updated_at?: string
          user_id?: string | null
          water_availability?: string[] | null
        }
        Update: {
          area_under_coffee_acres?: number | null
          county?: string | null
          created_at?: string
          establishment_status?: string | null
          existing_trees?: number | null
          experience_years?: number | null
          farm_location?: string | null
          farm_shape?: string | null
          farm_size_acres?: number
          farmer_full_name?: string
          id?: string
          land_utilisation_factor?: number | null
          notes?: string | null
          phone?: string | null
          selected_variety_ids?: string[] | null
          subcounty?: string | null
          terrain?: string | null
          updated_at?: string
          user_id?: string | null
          water_availability?: string[] | null
        }
        Relationships: []
      }
      farm_calculations: {
        Row: {
          actual_planting_population: number | null
          assessment_id: string
          calculation_payload: Json | null
          created_at: string
          id: string
          plantable_area_acres: number | null
          replacement_seedlings: number | null
          seedlings_needed: number | null
          theoretical_trees: number | null
          variety_id: string | null
        }
        Insert: {
          actual_planting_population?: number | null
          assessment_id: string
          calculation_payload?: Json | null
          created_at?: string
          id?: string
          plantable_area_acres?: number | null
          replacement_seedlings?: number | null
          seedlings_needed?: number | null
          theoretical_trees?: number | null
          variety_id?: string | null
        }
        Update: {
          actual_planting_population?: number | null
          assessment_id?: string
          calculation_payload?: Json | null
          created_at?: string
          id?: string
          plantable_area_acres?: number | null
          replacement_seedlings?: number | null
          seedlings_needed?: number | null
          theoretical_trees?: number | null
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_calculations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "farm_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_calculations_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "coffee_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_shop_orders: {
        Row: {
          amount_kes: number | null
          checkout_request_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          delivery_status: string
          delivery_updated_at: string | null
          guest_session_hash: string
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
        }
        Insert: {
          amount_kes?: number | null
          checkout_request_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          delivery_status?: string
          delivery_updated_at?: string | null
          guest_session_hash: string
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
        }
        Update: {
          amount_kes?: number | null
          checkout_request_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          delivery_status?: string
          delivery_updated_at?: string | null
          guest_session_hash?: string
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
      labour_rates: {
        Row: {
          county: string | null
          id: string
          is_active: boolean
          last_verified_at: string | null
          productivity_note: string | null
          rate_kes: number | null
          task_code: string
          task_name: string
          unit: string
          verification_status: string
        }
        Insert: {
          county?: string | null
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          productivity_note?: string | null
          rate_kes?: number | null
          task_code: string
          task_name: string
          unit: string
          verification_status?: string
        }
        Update: {
          county?: string | null
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          productivity_note?: string | null
          rate_kes?: number | null
          task_code?: string
          task_name?: string
          unit?: string
          verification_status?: string
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
          payment_environment: string
          phone: string
          result_desc: string | null
          status: string
          updated_at: string
          verification_checked_at: string | null
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
          payment_environment?: string
          phone: string
          result_desc?: string | null
          status?: string
          updated_at?: string
          verification_checked_at?: string | null
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
          payment_environment?: string
          phone?: string
          result_desc?: string | null
          status?: string
          updated_at?: string
          verification_checked_at?: string | null
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
          position: string | null
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
          position?: string | null
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
          position?: string | null
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
      price_change_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          labour_rate_id: string | null
          new_value: number | null
          note: string | null
          old_value: number | null
          service_id: string | null
          variety_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          labour_rate_id?: string | null
          new_value?: number | null
          note?: string | null
          old_value?: number | null
          service_id?: string | null
          variety_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          labour_rate_id?: string | null
          new_value?: number | null
          note?: string | null
          old_value?: number | null
          service_id?: string | null
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_change_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "coffee_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_history_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "coffee_varieties"
            referencedColumns: ["id"]
          },
        ]
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
          position: string | null
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
          position?: string | null
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
          position?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          sub_county?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          description: string
          id: string
          is_price_confirmed: boolean
          item_type: string
          line_total_kes: number | null
          quantity: number
          quotation_id: string
          service_id: string | null
          sort_order: number | null
          unit: string
          unit_price_kes: number | null
          variety_id: string | null
        }
        Insert: {
          description: string
          id?: string
          is_price_confirmed?: boolean
          item_type: string
          line_total_kes?: number | null
          quantity?: number
          quotation_id: string
          service_id?: string | null
          sort_order?: number | null
          unit: string
          unit_price_kes?: number | null
          variety_id?: string | null
        }
        Update: {
          description?: string
          id?: string
          is_price_confirmed?: boolean
          item_type?: string
          line_total_kes?: number | null
          quantity?: number
          quotation_id?: string
          service_id?: string | null
          sort_order?: number | null
          unit?: string
          unit_price_kes?: number | null
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "coffee_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "coffee_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          assessment_id: string | null
          assumptions: string | null
          consultancy_total_kes: number | null
          cost_per_acre_kes: number | null
          county: string | null
          created_at: string
          equipment_total_kes: number | null
          estimated_trees: number | null
          exclusions: string | null
          farm_location: string | null
          farm_size_acres: number | null
          farmer_full_name: string
          grand_total_kes: number | null
          has_unconfirmed_prices: boolean
          id: string
          labour_total_kes: number | null
          materials_total_kes: number | null
          payment_terms: string | null
          phone: string | null
          quotation_number: string
          status: string
          subtotal_kes: number | null
          tax_kes: number | null
          transport_kes: number | null
          updated_at: string
          user_id: string | null
          valid_until: string | null
          variety_summary: string | null
        }
        Insert: {
          assessment_id?: string | null
          assumptions?: string | null
          consultancy_total_kes?: number | null
          cost_per_acre_kes?: number | null
          county?: string | null
          created_at?: string
          equipment_total_kes?: number | null
          estimated_trees?: number | null
          exclusions?: string | null
          farm_location?: string | null
          farm_size_acres?: number | null
          farmer_full_name: string
          grand_total_kes?: number | null
          has_unconfirmed_prices?: boolean
          id?: string
          labour_total_kes?: number | null
          materials_total_kes?: number | null
          payment_terms?: string | null
          phone?: string | null
          quotation_number: string
          status?: string
          subtotal_kes?: number | null
          tax_kes?: number | null
          transport_kes?: number | null
          updated_at?: string
          user_id?: string | null
          valid_until?: string | null
          variety_summary?: string | null
        }
        Update: {
          assessment_id?: string | null
          assumptions?: string | null
          consultancy_total_kes?: number | null
          cost_per_acre_kes?: number | null
          county?: string | null
          created_at?: string
          equipment_total_kes?: number | null
          estimated_trees?: number | null
          exclusions?: string | null
          farm_location?: string | null
          farm_size_acres?: number | null
          farmer_full_name?: string
          grand_total_kes?: number | null
          has_unconfirmed_prices?: boolean
          id?: string
          labour_total_kes?: number | null
          materials_total_kes?: number | null
          payment_terms?: string | null
          phone?: string | null
          quotation_number?: string
          status?: string
          subtotal_kes?: number | null
          tax_kes?: number | null
          transport_kes?: number | null
          updated_at?: string
          user_id?: string | null
          valid_until?: string | null
          variety_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "farm_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          assessment_id: string | null
          created_at: string
          id: string
          notes: string | null
          preferred_date: string | null
          quotation_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          quotation_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          quotation_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "farm_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
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
      supplier_seedling_prices: {
        Row: {
          id: string
          last_verified_at: string | null
          stock_available: boolean | null
          supplier_id: string
          unit_price_kes: number
          variety_id: string
          verification_status: string
        }
        Insert: {
          id?: string
          last_verified_at?: string | null
          stock_available?: boolean | null
          supplier_id: string
          unit_price_kes: number
          variety_id: string
          verification_status?: string
        }
        Update: {
          id?: string
          last_verified_at?: string | null
          stock_available?: boolean | null
          supplier_id?: string
          unit_price_kes?: number
          variety_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_seedling_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_seedling_prices_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "coffee_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          certification_status: string | null
          county: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          nursery_location: string | null
          phone: string | null
        }
        Insert: {
          certification_status?: string | null
          county?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          nursery_location?: string | null
          phone?: string | null
        }
        Update: {
          certification_status?: string | null
          county?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          nursery_location?: string | null
          phone?: string | null
        }
        Relationships: []
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
      is_ccak_staff: { Args: never; Returns: boolean }
      is_confirmed_bootstrap_admin: {
        Args: { account_email: string; confirmed_at: string }
        Returns: boolean
      }
      is_national_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_valid_ccak_position: { Args: { p: string }; Returns: boolean }
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
      quote_guest_shop_delivery: {
        Args: { fee_kes: number; order_id: string; quote_reference: string }
        Returns: undefined
      }
      quote_shop_delivery: {
        Args: { fee_kes: number; order_id: string; quote_reference: string }
        Returns: undefined
      }
      review_crypto_payment: {
        Args: { decision: string; note?: string; payment_id: string }
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
          position: string | null
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
      save_farm_quotation: { Args: { payload: Json }; Returns: Json }
      submit_crypto_payment: { Args: { payload: Json }; Returns: Json }
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
          position: string | null
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
          position: string | null
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
      update_coffee_service_price: {
        Args: {
          p_base_unit_price_kes: number
          p_equipment_component_kes?: number
          p_labour_component_kes?: number
          p_material_component_kes?: number
          p_minimum_charge_kes?: number
          p_note?: string
          p_service_id: string
          p_source_link?: string
          p_source_name?: string
          p_transport_component_kes?: number
          p_verification_status?: string
        }
        Returns: {
          base_unit_price_kes: number | null
          category_id: string
          code: string
          created_at: string
          description: string | null
          effective_from: string | null
          equipment_component_kes: number | null
          id: string
          is_active: boolean
          is_package: boolean
          labour_component_kes: number | null
          last_verified_at: string | null
          material_component_kes: number | null
          minimum_charge_kes: number | null
          name: string
          package_includes: string[] | null
          source_link: string | null
          source_name: string | null
          terrain_multiplier_extreme: number | null
          terrain_multiplier_flat: number | null
          terrain_multiplier_gentle: number | null
          terrain_multiplier_moderate: number | null
          terrain_multiplier_steep: number | null
          transport_component_kes: number | null
          unit: string
          updated_at: string
          verification_status: string
        }
        SetofOptions: {
          from: "*"
          to: "coffee_services"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_labour_rate: {
        Args: {
          p_note?: string
          p_productivity_note?: string
          p_rate_id: string
          p_rate_kes: number
          p_verification_status: string
        }
        Returns: {
          county: string | null
          id: string
          is_active: boolean
          last_verified_at: string | null
          productivity_note: string | null
          rate_kes: number | null
          task_code: string
          task_name: string
          unit: string
          verification_status: string
        }
        SetofOptions: {
          from: "*"
          to: "labour_rates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_shop_delivery: {
        Args: { new_status: string; order_id: string; tracking: string }
        Returns: undefined
      }
      update_variety_seedling_price: {
        Args: {
          p_note?: string
          p_seedling_unit_price_kes: number
          p_variety_id: string
        }
        Returns: {
          characteristics: string | null
          code: string
          created_at: string
          disease_susceptibility: string | null
          id: string
          is_active: boolean
          management_notes: string | null
          name: string
          planting_density_per_acre: number | null
          row_spacing_m: number
          seedling_unit_price_kes: number | null
          tree_spacing_m: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "coffee_varieties"
          isOneToOne: true
          isSetofReturn: false
        }
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

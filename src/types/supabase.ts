export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      audit_logs: {
        Row: {
          action: string
          business_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          business_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          is_main: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          city: string | null
          close_time: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          language: string | null
          logo_url: string | null
          name: string
          open_time: string | null
          phone: string | null
          plan: string | null
          tax_rate: number | null
          timezone: string | null
          trial_ends_at: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          close_time?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          logo_url?: string | null
          name: string
          open_time?: string | null
          phone?: string | null
          plan?: string | null
          tax_rate?: number | null
          timezone?: string | null
          trial_ends_at?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          close_time?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          logo_url?: string | null
          name?: string
          open_time?: string | null
          phone?: string | null
          plan?: string | null
          tax_rate?: number | null
          timezone?: string | null
          trial_ends_at?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          business_id: string
          color: string | null
          created_at: string | null
          deleted_at: string | null
          group_type: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_am: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          group_type?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_am?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          group_type?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_am?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      category_templates: {
        Row: {
          business_type: string | null
          id: string
          name_am: string | null
          name_en: string | null
          sort_order: number | null
        }
        Insert: {
          business_type?: string | null
          id?: string
          name_am?: string | null
          name_en?: string | null
          sort_order?: number | null
        }
        Update: {
          business_type?: string | null
          id?: string
          name_am?: string | null
          name_en?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          business_id: string
          category: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          expense_date: string | null
          id: string
          payment_method: string | null
          receipt_url: string | null
          recorded_by: string | null
          shift_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          business_id: string
          category: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          shift_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          business_id?: string
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          shift_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          branch_id: string
          business_id: string
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          business_id: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          business_id?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          branch_id: string
          business_id: string
          created_at: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          user_id: string | null
        }
        Insert: {
          branch_id: string
          business_id: string
          created_at?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string
          business_id?: string
          created_at?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          business_id: string
          created_at: string | null
          current_step: string | null
          id: string
          is_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          current_step?: string | null
          id?: string
          is_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          current_step?: string | null
          id?: string
          is_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string | null
          id: string
          method: string
          reference_no: string | null
          sale_id: string
          status: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string | null
          id?: string
          method: string
          reference_no?: string | null
          sale_id: string
          status?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string | null
          id?: string
          method?: string
          reference_no?: string | null
          sale_id?: string
          status?: string | null
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
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          branch_id: string | null
          business_id: string
          category_id: string | null
          cost_price: number
          created_at: string | null
          deleted_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_sold_by_weight: boolean | null
          low_stock_alert: number | null
          name: string
          name_am: string | null
          retail_price: number
          sku: string | null
          tax_inclusive: boolean | null
          track_inventory: boolean | null
          unit_type: string | null
          units_per_crate: number | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          branch_id?: string | null
          business_id: string
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_sold_by_weight?: boolean | null
          low_stock_alert?: number | null
          name: string
          name_am?: string | null
          retail_price?: number
          sku?: string | null
          tax_inclusive?: boolean | null
          track_inventory?: boolean | null
          unit_type?: string | null
          units_per_crate?: number | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          branch_id?: string | null
          business_id?: string
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_sold_by_weight?: boolean | null
          low_stock_alert?: number | null
          name?: string
          name_am?: string | null
          retail_price?: number
          sku?: string | null
          tax_inclusive?: boolean | null
          track_inventory?: boolean | null
          unit_type?: string | null
          units_per_crate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_roles: {
        Row: {
          assigned_at: string | null
          id: string
          profile_id: string
          role_name: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          profile_id: string
          role_name: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          profile_id?: string
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          business_id: string | null
          created_at: string | null
          deleted_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          language: string | null
          last_seen_at: string | null
          onboarding_completed: boolean | null
          onboarding_step: string | null
          phone: string | null
          pin_hash: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          business_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          language?: string | null
          last_seen_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          phone?: string | null
          pin_hash?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          business_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_seen_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          phone?: string | null
          pin_hash?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          id: string
          product_id: string
          purchase_id: string
          quantity: number
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          id?: string
          product_id: string
          purchase_id: string
          quantity: number
          total_cost?: number | null
          unit_cost: number
        }
        Update: {
          id?: string
          product_id?: string
          purchase_id?: string
          quantity?: number
          total_cost?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          branch_id: string
          business_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          paid_amount: number | null
          purchased_at: string | null
          reference_no: string | null
          status: string | null
          supplier_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          business_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          purchased_at?: string | null
          reference_no?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          purchased_at?: string | null
          reference_no?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          branch_id: string
          business_id: string
          capacity: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          business_id: string
          capacity?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          business_id?: string
          capacity?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number
          created_at: string | null
          discount: number | null
          gross_profit: number | null
          id: string
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          total_amount: number | null
          unit_price: number
        }
        Insert: {
          cost_price: number
          created_at?: string | null
          discount?: number | null
          gross_profit?: number | null
          id?: string
          product_id: string
          product_name: string
          quantity?: number
          sale_id: string
          total_amount?: number | null
          unit_price: number
        }
        Update: {
          cost_price?: number
          created_at?: string | null
          discount?: number | null
          gross_profit?: number | null
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
          total_amount?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string
          business_id: string
          cashier_id: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          deleted_at: string | null
          discount_amount: number | null
          id: string
          is_offline_sync: boolean | null
          notes: string | null
          offline_id: string | null
          receipt_number: string
          shift_id: string | null
          status: string | null
          subtotal: number
          table_id: string | null
          table_name: string | null
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          branch_id: string
          business_id: string
          cashier_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          id?: string
          is_offline_sync?: boolean | null
          notes?: string | null
          offline_id?: string | null
          receipt_number: string
          shift_id?: string | null
          status?: string | null
          subtotal?: number
          table_id?: string | null
          table_name?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          branch_id?: string
          business_id?: string
          cashier_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          id?: string
          is_offline_sync?: boolean | null
          notes?: string | null
          offline_id?: string | null
          receipt_number?: string
          shift_id?: string | null
          status?: string | null
          subtotal?: number
          table_id?: string | null
          table_name?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sales_shift"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          actual_cash: number | null
          actual_cash_reported: number | null
          branch_id: string
          business_id: string
          cash_discrepancy: number | null
          cashier_id: string
          closed_at: string | null
          closed_by: string | null
          closing_float: number | null
          created_at: string | null
          difference: number | null
          expected_cash: number | null
          id: string
          is_first_shift: boolean | null
          notes: string | null
          opened_at: string | null
          opened_by: string | null
          opening_cash: number | null
          opening_float: number | null
          shift_label: string | null
          status: string | null
          total_sales: number | null
          total_transactions: number | null
          updated_at: string | null
        }
        Insert: {
          actual_cash?: number | null
          actual_cash_reported?: number | null
          branch_id: string
          business_id: string
          cash_discrepancy?: number | null
          cashier_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_float?: number | null
          created_at?: string | null
          difference?: number | null
          expected_cash?: number | null
          id?: string
          is_first_shift?: boolean | null
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          opening_cash?: number | null
          opening_float?: number | null
          shift_label?: string | null
          status?: string | null
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_cash?: number | null
          actual_cash_reported?: number | null
          branch_id?: string
          business_id?: string
          cash_discrepancy?: number | null
          cashier_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_float?: number | null
          created_at?: string | null
          difference?: number | null
          expected_cash?: number | null
          id?: string
          is_first_shift?: boolean | null
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          opening_cash?: number | null
          opening_float?: number | null
          shift_label?: string | null
          status?: string | null
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          business_id: string
          claimed_by_profile_id: string | null
          code: string
          created_at: string
          id: string
          role_assigned: string
          staff_name: string
          status: string
          used_at: string | null
        }
        Insert: {
          business_id: string
          claimed_by_profile_id?: string | null
          code: string
          created_at?: string
          id?: string
          role_assigned: string
          staff_name: string
          status?: string
          used_at?: string | null
        }
        Update: {
          business_id?: string
          claimed_by_profile_id?: string | null
          code?: string
          created_at?: string
          id?: string
          role_assigned?: string
          staff_name?: string
          status?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_claimed_by_profile_id_fkey"
            columns: ["claimed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reconciliations: {
        Row: {
          added_qty: number
          branch_id: string
          business_id: string
          closing_qty: number
          counted_by: string | null
          created_at: string | null
          discrepancy_qty: number | null
          discrepancy_value: number | null
          id: string
          is_verified: boolean | null
          logged_sales_qty: number
          notes: string | null
          opening_qty: number
          product_id: string
          recon_date: string
          shift_id: string | null
          verified_by: string | null
        }
        Insert: {
          added_qty?: number
          branch_id: string
          business_id: string
          closing_qty?: number
          counted_by?: string | null
          created_at?: string | null
          discrepancy_qty?: number | null
          discrepancy_value?: number | null
          id?: string
          is_verified?: boolean | null
          logged_sales_qty?: number
          notes?: string | null
          opening_qty?: number
          product_id: string
          recon_date?: string
          shift_id?: string | null
          verified_by?: string | null
        }
        Update: {
          added_qty?: number
          branch_id?: string
          business_id?: string
          closing_qty?: number
          counted_by?: string | null
          created_at?: string | null
          discrepancy_qty?: number | null
          discrepancy_value?: number | null
          id?: string
          is_verified?: boolean | null
          logged_sales_qty?: number
          notes?: string | null
          opening_qty?: number
          product_id?: string
          recon_date?: string
          shift_id?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reconciliations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reconciliations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reconciliations_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reconciliations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reconciliations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reconciliations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_security_context: {
        Args: { allowed_roles: string[] }
        Returns: boolean
      }
      auth_business_id: { Args: never; Returns: string }
      auth_has_any_role: { Args: { allowed_roles: string[] }; Returns: boolean }
      auth_is_profile_active: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


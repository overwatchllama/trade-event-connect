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
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_edit_audit_log: {
        Row: {
          action: string
          created_at: string
          entries: Json
          id: string
          summary: Json | null
          undone_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entries: Json
          id?: string
          summary?: Json | null
          undone_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entries?: Json
          id?: string
          summary?: Json | null
          undone_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          acquired_date: string | null
          card_number: string | null
          collection_id: string
          condition: Database["public"]["Enums"]["card_condition"]
          created_at: string
          current_market_price: number | null
          estimated_value: number | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          purchase_price: number | null
          quantity: number
          rarity: string | null
          set_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_date?: string | null
          card_number?: string | null
          collection_id: string
          condition?: Database["public"]["Enums"]["card_condition"]
          created_at?: string
          current_market_price?: number | null
          estimated_value?: number | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          rarity?: string | null
          set_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_date?: string | null
          card_number?: string | null
          collection_id?: string
          condition?: Database["public"]["Enums"]["card_condition"]
          created_at?: string
          current_market_price?: number | null
          estimated_value?: number | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          rarity?: string | null
          set_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          category: Database["public"]["Enums"]["card_category"]
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["card_category"]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["card_category"]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_list_items: {
        Row: {
          bbox: Json | null
          bought_at: string | null
          card_name: string
          card_number: string | null
          collection_item_id: string | null
          completed_at: string | null
          condition: string
          created_at: string
          ebay_search_url: string | null
          external_id: string | null
          fees: number
          game: string
          id: string
          image_url: string | null
          label_print_count: number
          label_printed_at: string | null
          list_price: number | null
          listed_at: string | null
          listing_status: string
          lot_id: string | null
          notes: string | null
          passed_at: string | null
          price_override: number | null
          public_notes: string | null
          purchase_price: number | null
          quantity: number
          rarity: string | null
          scan_image_url: string | null
          set_name: string | null
          shipping_cost: number
          sold_at: string | null
          sold_buyer: string | null
          sold_channel: string | null
          sold_fees: number
          sold_price: number | null
          sold_shipping: number
          source: string | null
          status: string
          target_sell_price: number | null
          tcgplayer_market_price: number | null
          tcgplayer_url: string | null
          trade_dollar_override: number | null
          trade_pct_override: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bbox?: Json | null
          bought_at?: string | null
          card_name: string
          card_number?: string | null
          collection_item_id?: string | null
          completed_at?: string | null
          condition?: string
          created_at?: string
          ebay_search_url?: string | null
          external_id?: string | null
          fees?: number
          game?: string
          id?: string
          image_url?: string | null
          label_print_count?: number
          label_printed_at?: string | null
          list_price?: number | null
          listed_at?: string | null
          listing_status?: string
          lot_id?: string | null
          notes?: string | null
          passed_at?: string | null
          price_override?: number | null
          public_notes?: string | null
          purchase_price?: number | null
          quantity?: number
          rarity?: string | null
          scan_image_url?: string | null
          set_name?: string | null
          shipping_cost?: number
          sold_at?: string | null
          sold_buyer?: string | null
          sold_channel?: string | null
          sold_fees?: number
          sold_price?: number | null
          sold_shipping?: number
          source?: string | null
          status?: string
          target_sell_price?: number | null
          tcgplayer_market_price?: number | null
          tcgplayer_url?: string | null
          trade_dollar_override?: number | null
          trade_pct_override?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bbox?: Json | null
          bought_at?: string | null
          card_name?: string
          card_number?: string | null
          collection_item_id?: string | null
          completed_at?: string | null
          condition?: string
          created_at?: string
          ebay_search_url?: string | null
          external_id?: string | null
          fees?: number
          game?: string
          id?: string
          image_url?: string | null
          label_print_count?: number
          label_printed_at?: string | null
          list_price?: number | null
          listed_at?: string | null
          listing_status?: string
          lot_id?: string | null
          notes?: string | null
          passed_at?: string | null
          price_override?: number | null
          public_notes?: string | null
          purchase_price?: number | null
          quantity?: number
          rarity?: string | null
          scan_image_url?: string | null
          set_name?: string | null
          shipping_cost?: number
          sold_at?: string | null
          sold_buyer?: string | null
          sold_channel?: string | null
          sold_fees?: number
          sold_price?: number | null
          sold_shipping?: number
          source?: string | null
          status?: string
          target_sell_price?: number | null
          tcgplayer_market_price?: number | null
          tcgplayer_url?: string | null
          trade_dollar_override?: number | null
          trade_pct_override?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_list_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "purchase_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_proposal_lines: {
        Row: {
          amount: number | null
          card_name: string | null
          card_number: string | null
          condition: string | null
          created_at: string
          deal_list_item_id: string | null
          id: string
          image_url: string | null
          kind: string
          notes: string | null
          proposal_id: string
          quantity: number
          set_name: string | null
          side: string
          sort_order: number
          unit_value: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          card_name?: string | null
          card_number?: string | null
          condition?: string | null
          created_at?: string
          deal_list_item_id?: string | null
          id?: string
          image_url?: string | null
          kind: string
          notes?: string | null
          proposal_id: string
          quantity?: number
          set_name?: string | null
          side: string
          sort_order?: number
          unit_value?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          card_name?: string | null
          card_number?: string | null
          condition?: string | null
          created_at?: string
          deal_list_item_id?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          notes?: string | null
          proposal_id?: string
          quantity?: number
          set_name?: string | null
          side?: string
          sort_order?: number
          unit_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_proposal_lines_deal_list_item_id_fkey"
            columns: ["deal_list_item_id"]
            isOneToOne: false
            referencedRelation: "deal_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_proposal_lines_deal_list_item_id_fkey"
            columns: ["deal_list_item_id"]
            isOneToOne: false
            referencedRelation: "public_deal_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_proposal_lines_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "deal_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_proposals: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          declined_at: string | null
          id: string
          notes: string | null
          proposed_at: string | null
          public_token: string
          status: string
          title: string
          trade_lot_id: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          declined_at?: string | null
          id?: string
          notes?: string | null
          proposed_at?: string | null
          public_token?: string
          status?: string
          title?: string
          trade_lot_id?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          declined_at?: string | null
          id?: string
          notes?: string | null
          proposed_at?: string | null
          public_token?: string
          status?: string
          title?: string
          trade_lot_id?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_proposals_trade_lot_id_fkey"
            columns: ["trade_lot_id"]
            isOneToOne: false
            referencedRelation: "purchase_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          is_active?: boolean
          label: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      event_announcements: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string
          organizer_id: string
          sent_at: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message: string
          organizer_id: string
          sent_at?: string
          target_audience: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string
          organizer_id?: string
          sent_at?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_announcements_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_announcements_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          event_id: string
          id: string
          is_completed: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_days: {
        Row: {
          created_at: string
          day_date: string
          day_number: number
          end_time: string
          event_id: string
          id: string
          start_time: string
          ticket_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_date: string
          day_number: number
          end_time: string
          event_id: string
          id?: string
          start_time: string
          ticket_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_date?: string
          day_number?: number
          end_time?: string
          event_id?: string
          id?: string
          start_time?: string
          ticket_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_days_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_days_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_files: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_signed: boolean | null
          signed_at: string | null
          signed_by: string | null
          updated_at: string | null
          uploaded_by: string
          vendor_accessible: boolean
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_signed?: boolean | null
          signed_at?: string | null
          signed_by?: string | null
          updated_at?: string | null
          uploaded_by: string
          vendor_accessible?: boolean
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_signed?: boolean | null
          signed_at?: string | null
          signed_by?: string | null
          updated_at?: string | null
          uploaded_by?: string
          vendor_accessible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_social_media: {
        Row: {
          created_at: string
          event_id: string
          id: string
          platform: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          platform: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          platform?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_social_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_social_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sponsors: {
        Row: {
          amount: number | null
          benefits: string | null
          created_at: string
          event_id: string
          id: string
          sponsor_id: string
          sponsorship_level: string | null
        }
        Insert: {
          amount?: number | null
          benefits?: string | null
          created_at?: string
          event_id: string
          id?: string
          sponsor_id: string
          sponsorship_level?: string | null
        }
        Update: {
          amount?: number | null
          benefits?: string | null
          created_at?: string
          event_id?: string
          id?: string
          sponsor_id?: string
          sponsorship_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sponsors_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_assignments: {
        Row: {
          assigned_email: string | null
          assigned_name: string
          assigned_phone: string | null
          check_in_token: string
          checked_in: boolean
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          staff_role_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_email?: string | null
          assigned_name: string
          assigned_phone?: string | null
          check_in_token?: string
          checked_in?: boolean
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          staff_role_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_email?: string | null
          assigned_name?: string
          assigned_phone?: string | null
          check_in_token?: string
          checked_in?: boolean
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          staff_role_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "event_staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_roles: {
        Row: {
          created_at: string
          event_id: string
          id: string
          required_count: number
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          required_count?: number
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          required_count?: number
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string
          age_pricing_info: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          card_types: string[]
          city: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          date: string
          description: string | null
          entry_fee: number | null
          event_type: string
          floor_plan_url: string | null
          flyer_back_url: string | null
          flyer_url: string | null
          id: string
          image_url: string | null
          is_multi_day: boolean
          layout_json: Json | null
          listing_fee_cents: number | null
          listing_paid_at: string | null
          listing_payment_status: string
          listing_stripe_session_id: string | null
          listing_tier: string | null
          max_attendees: number | null
          no_online_table_sales: boolean | null
          no_online_ticket_sales: boolean | null
          no_sponsors: boolean | null
          organizer_id: string
          organizer_name: string
          preferred_contact_method: string | null
          sponsor_tier_slots: number | null
          sponsor_tiers: Json | null
          state: string
          tables_available: number | null
          title: string
          total_tables: number | null
          updated_at: string
          vendor_notes: string | null
          vendor_start_time: string | null
          vendor_table_price: number | null
          venue: string
          venue_id: string | null
          zip_code: string
        }
        Insert: {
          address: string
          age_pricing_info?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          card_types?: string[]
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          date: string
          description?: string | null
          entry_fee?: number | null
          event_type: string
          floor_plan_url?: string | null
          flyer_back_url?: string | null
          flyer_url?: string | null
          id?: string
          image_url?: string | null
          is_multi_day?: boolean
          layout_json?: Json | null
          listing_fee_cents?: number | null
          listing_paid_at?: string | null
          listing_payment_status?: string
          listing_stripe_session_id?: string | null
          listing_tier?: string | null
          max_attendees?: number | null
          no_online_table_sales?: boolean | null
          no_online_ticket_sales?: boolean | null
          no_sponsors?: boolean | null
          organizer_id: string
          organizer_name: string
          preferred_contact_method?: string | null
          sponsor_tier_slots?: number | null
          sponsor_tiers?: Json | null
          state: string
          tables_available?: number | null
          title: string
          total_tables?: number | null
          updated_at?: string
          vendor_notes?: string | null
          vendor_start_time?: string | null
          vendor_table_price?: number | null
          venue: string
          venue_id?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          age_pricing_info?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          card_types?: string[]
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          date?: string
          description?: string | null
          entry_fee?: number | null
          event_type?: string
          floor_plan_url?: string | null
          flyer_back_url?: string | null
          flyer_url?: string | null
          id?: string
          image_url?: string | null
          is_multi_day?: boolean
          layout_json?: Json | null
          listing_fee_cents?: number | null
          listing_paid_at?: string | null
          listing_payment_status?: string
          listing_stripe_session_id?: string | null
          listing_tier?: string | null
          max_attendees?: number | null
          no_online_table_sales?: boolean | null
          no_online_ticket_sales?: boolean | null
          no_sponsors?: boolean | null
          organizer_id?: string
          organizer_name?: string
          preferred_contact_method?: string | null
          sponsor_tier_slots?: number | null
          sponsor_tiers?: Json | null
          state?: string
          tables_available?: number | null
          title?: string
          total_tables?: number | null
          updated_at?: string
          vendor_notes?: string | null
          vendor_start_time?: string | null
          vendor_table_price?: number | null
          venue?: string
          venue_id?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "public_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      label_print_audit: {
        Row: {
          action: string
          copies_per_item: number
          created_at: string
          filter_context: Json | null
          id: string
          item_count: number
          item_ids: string[]
          label_count: number
          per_quantity: boolean
          preset: string | null
          reprint_count: number
          source: string | null
          user_id: string
        }
        Insert: {
          action?: string
          copies_per_item?: number
          created_at?: string
          filter_context?: Json | null
          id?: string
          item_count?: number
          item_ids?: string[]
          label_count?: number
          per_quantity?: boolean
          preset?: string | null
          reprint_count?: number
          source?: string | null
          user_id: string
        }
        Update: {
          action?: string
          copies_per_item?: number
          created_at?: string
          filter_context?: Json | null
          id?: string
          item_count?: number
          item_ids?: string[]
          label_count?: number
          per_quantity?: boolean
          preset?: string | null
          reprint_count?: number
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_cards: {
        Row: {
          created_at: string
          external_id: string
          game: string
          id: string
          image_url: string | null
          name: string
          number: string | null
          rarity: string | null
          set_id: string | null
          set_name: string | null
          tcgplayer_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id: string
          game: string
          id?: string
          image_url?: string | null
          name: string
          number?: string | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          tcgplayer_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string
          game?: string
          id?: string
          image_url?: string | null
          name?: string
          number?: string | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          tcgplayer_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      market_refresh_runs: {
        Row: {
          cards_upserted: number | null
          errors: number | null
          finished_at: string | null
          game: string | null
          id: string
          notes: string | null
          psa_lookups: number | null
          snapshots_upserted: number | null
          started_at: string
          status: string
        }
        Insert: {
          cards_upserted?: number | null
          errors?: number | null
          finished_at?: string | null
          game?: string | null
          id?: string
          notes?: string | null
          psa_lookups?: number | null
          snapshots_upserted?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          cards_upserted?: number | null
          errors?: number | null
          finished_at?: string | null
          game?: string | null
          id?: string
          notes?: string | null
          psa_lookups?: number | null
          snapshots_upserted?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      market_snapshots: {
        Row: {
          card_id: string
          gem_rate: number | null
          last_refreshed_at: string
          psa_total_pop: number | null
          psa10_pop: number | null
          psa10_price: number | null
          psa10_ratio: number | null
          raw_price: number | null
          sample_size: number | null
        }
        Insert: {
          card_id: string
          gem_rate?: number | null
          last_refreshed_at?: string
          psa_total_pop?: number | null
          psa10_pop?: number | null
          psa10_price?: number | null
          psa10_ratio?: number | null
          raw_price?: number | null
          sample_size?: number | null
        }
        Update: {
          card_id?: string
          gem_rate?: number | null
          last_refreshed_at?: string
          psa_total_pop?: number | null
          psa10_pop?: number | null
          psa10_price?: number | null
          psa10_ratio?: number | null
          raw_price?: number | null
          sample_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_snapshots_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "market_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          checked_in: boolean | null
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          event_day_id: string | null
          event_id: string
          id: string
          order_id: string
          qr_data: string
          quantity: number
          ticket_code: string
          ticket_type: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_day_id?: string | null
          event_id: string
          id?: string
          order_id: string
          qr_data: string
          quantity?: number
          ticket_code: string
          ticket_type?: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_day_id?: string | null
          event_id?: string
          id?: string
          order_id?: string
          qr_data?: string
          quantity?: number
          ticket_code?: string
          ticket_type?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_event_day_id_fkey"
            columns: ["event_day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          discount_amount: number | null
          event_id: string
          id: string
          payment_status: string
          promo_code: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          event_id: string
          id?: string
          payment_status?: string
          promo_code?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          event_id?: string
          id?: string
          payment_status?: string
          promo_code?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_saved_locations: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          name: string
          organizer_id: string
          state: string
          updated_at: string
          venue: string
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          name: string
          organizer_id: string
          state: string
          updated_at?: string
          venue: string
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          name?: string
          organizer_id?: string
          state?: string
          updated_at?: string
          venue?: string
          zip_code?: string
        }
        Relationships: []
      }
      organizer_staff_roles: {
        Row: {
          created_at: string
          id: string
          organizer_id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organizer_id: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organizer_id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizer_staff_roster: {
        Row: {
          allow_vend: boolean
          created_at: string
          default_role: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organizer_id: string
          phone: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          allow_vend?: boolean
          created_at?: string
          default_role?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organizer_id: string
          phone?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          allow_vend?: boolean
          created_at?: string
          default_role?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organizer_id?: string
          phone?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizer_staff_roster_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_vendor_notes: {
        Row: {
          blacklist_reason: string | null
          created_at: string
          custom_list: string | null
          id: string
          is_blacklisted: boolean | null
          is_favorite: boolean | null
          organizer_id: string
          private_notes: string | null
          private_rating: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          blacklist_reason?: string | null
          created_at?: string
          custom_list?: string | null
          id?: string
          is_blacklisted?: boolean | null
          is_favorite?: boolean | null
          organizer_id: string
          private_notes?: string | null
          private_rating?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          blacklist_reason?: string | null
          created_at?: string
          custom_list?: string | null
          id?: string
          is_blacklisted?: boolean | null
          is_favorite?: boolean | null
          organizer_id?: string
          private_notes?: string | null
          private_rating?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_vendor_notes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_city: string | null
          address_line1: string | null
          address_line2: string | null
          address_state: string | null
          address_zip_code: string | null
          all_printings_cap: number | null
          avatar_url: string | null
          birthday: string | null
          block_reason: string | null
          blocked_at: string | null
          blocked_by: string | null
          communications_enabled: boolean | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          location_city: string | null
          location_state: string | null
          location_zip_code: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_twitter: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_state?: string | null
          address_zip_code?: string | null
          all_printings_cap?: number | null
          avatar_url?: string | null
          birthday?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          communications_enabled?: boolean | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          location_city?: string | null
          location_state?: string | null
          location_zip_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_state?: string | null
          address_zip_code?: string | null
          all_printings_cap?: number | null
          avatar_url?: string | null
          birthday?: string | null
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          communications_enabled?: boolean | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          location_city?: string | null
          location_state?: string | null
          location_zip_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_lots: {
        Row: {
          allocation_method: string
          bought_at: string
          created_at: string
          event_id: string | null
          fees: number
          id: string
          lot_total: number
          notes: string | null
          personal_event_id: string | null
          shipping_cost: number
          source: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_method?: string
          bought_at?: string
          created_at?: string
          event_id?: string | null
          fees?: number
          id?: string
          lot_total?: number
          notes?: string | null
          personal_event_id?: string | null
          shipping_cost?: number
          source?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_method?: string
          bought_at?: string
          created_at?: string
          event_id?: string | null
          fees?: number
          id?: string
          lot_total?: number
          notes?: string | null
          personal_event_id?: string | null
          shipping_cost?: number
          source?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raffle_draws: {
        Row: {
          claim_deadline: string
          claimed_at: string | null
          created_at: string
          drawn_at: string
          id: string
          raffle_item_id: string
          status: string
          updated_at: string
          winner_user_id: string
        }
        Insert: {
          claim_deadline: string
          claimed_at?: string | null
          created_at?: string
          drawn_at?: string
          id?: string
          raffle_item_id: string
          status?: string
          updated_at?: string
          winner_user_id: string
        }
        Update: {
          claim_deadline?: string
          claimed_at?: string | null
          created_at?: string
          drawn_at?: string
          id?: string
          raffle_item_id?: string
          status?: string
          updated_at?: string
          winner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_draws_raffle_item_id_fkey"
            columns: ["raffle_item_id"]
            isOneToOne: false
            referencedRelation: "raffle_items"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_entries: {
        Row: {
          entered_at: string
          id: string
          raffle_item_id: string
          user_id: string
        }
        Insert: {
          entered_at?: string
          id?: string
          raffle_item_id: string
          user_id: string
        }
        Update: {
          entered_at?: string
          id?: string
          raffle_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_entries_raffle_item_id_fkey"
            columns: ["raffle_item_id"]
            isOneToOne: false
            referencedRelation: "raffle_items"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_items: {
        Row: {
          claim_time_seconds: number
          created_at: string
          description: string | null
          entry_method: string
          event_id: string
          id: string
          image_url: string | null
          name: string
          organizer_id: string
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          claim_time_seconds?: number
          created_at?: string
          description?: string | null
          entry_method?: string
          event_id: string
          id?: string
          image_url?: string | null
          name: string
          organizer_id: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          claim_time_seconds?: number
          created_at?: string
          description?: string | null
          entry_method?: string
          event_id?: string
          id?: string
          image_url?: string | null
          name?: string
          organizer_id?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffle_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      role_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sponsor_applications: {
        Row: {
          amount: number | null
          application_date: string
          application_status: string
          approved_date: string | null
          benefits: string | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          sponsor_id: string
          sponsorship_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          application_date?: string
          application_status?: string
          approved_date?: string | null
          benefits?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          sponsor_id: string
          sponsorship_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          application_date?: string
          application_status?: string
          approved_date?: string | null
          benefits?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          sponsor_id?: string
          sponsorship_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_applications_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          banner_url: string | null
          company_address: string | null
          company_description: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          rating: number | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_twitter: string | null
          specialties: string[] | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          verified: boolean | null
          website_url: string | null
        }
        Insert: {
          banner_url?: string | null
          company_address?: string | null
          company_description?: string | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          rating?: number | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          specialties?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          website_url?: string | null
        }
        Update: {
          banner_url?: string | null
          company_address?: string | null
          company_description?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          rating?: number | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          specialties?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          website_url?: string | null
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          counted_quantity: number
          created_at: string
          delta: number
          event_id: string | null
          id: string
          item_id: string
          notes: string | null
          notes_history: Json
          notes_updated_at: string | null
          notes_updated_by: string | null
          previous_quantity: number
          reason: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          counted_quantity: number
          created_at?: string
          delta: number
          event_id?: string | null
          id?: string
          item_id: string
          notes?: string | null
          notes_history?: Json
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          previous_quantity: number
          reason?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          counted_quantity?: number
          created_at?: string
          delta?: number
          event_id?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          notes_history?: Json
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          previous_quantity?: number
          reason?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          billing_period: string | null
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_period?: string | null
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_period?: string | null
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          card_name: string
          card_number: string | null
          collection_item_id: string | null
          condition: string | null
          created_at: string
          deal_list_item_id: string | null
          id: string
          image_url: string | null
          linked_kind: string | null
          market_snapshot: number | null
          quantity: number
          set_name: string | null
          side: string
          transaction_id: string
          unit_cost: number | null
          unit_price: number | null
        }
        Insert: {
          card_name: string
          card_number?: string | null
          collection_item_id?: string | null
          condition?: string | null
          created_at?: string
          deal_list_item_id?: string | null
          id?: string
          image_url?: string | null
          linked_kind?: string | null
          market_snapshot?: number | null
          quantity?: number
          set_name?: string | null
          side?: string
          transaction_id: string
          unit_cost?: number | null
          unit_price?: number | null
        }
        Update: {
          card_name?: string
          card_number?: string | null
          collection_item_id?: string | null
          condition?: string | null
          created_at?: string
          deal_list_item_id?: string | null
          id?: string
          image_url?: string | null
          linked_kind?: string | null
          market_snapshot?: number | null
          quantity?: number
          set_name?: string | null
          side?: string
          transaction_id?: string
          unit_cost?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_collection_item_id_fkey"
            columns: ["collection_item_id"]
            isOneToOne: false
            referencedRelation: "collection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_deal_list_item_id_fkey"
            columns: ["deal_list_item_id"]
            isOneToOne: false
            referencedRelation: "deal_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_deal_list_item_id_fkey"
            columns: ["deal_list_item_id"]
            isOneToOne: false
            referencedRelation: "public_deal_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          customer_label: string | null
          event_id: string | null
          fees: number
          id: string
          kind: string
          notes: string | null
          occurred_at: string
          payment_method: string | null
          personal_event_id: string | null
          subtotal: number
          tender_breakdown: Json | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_label?: string | null
          event_id?: string | null
          fees?: number
          id?: string
          kind: string
          notes?: string | null
          occurred_at?: string
          payment_method?: string | null
          personal_event_id?: string | null
          subtotal?: number
          tender_breakdown?: Json | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_label?: string | null
          event_id?: string | null
          fees?: number
          id?: string
          kind?: string
          notes?: string | null
          occurred_at?: string
          payment_method?: string | null
          personal_event_id?: string | null
          subtotal?: number
          tender_breakdown?: Json | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_personal_event_id_fkey"
            columns: ["personal_event_id"]
            isOneToOne: false
            referencedRelation: "vendor_personal_events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscribed_at: string
          subscription_type: string
          target_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscribed_at?: string
          subscription_type: string
          target_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscribed_at?: string
          subscription_type?: string
          target_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_applications: {
        Row: {
          application_date: string
          application_status: Database["public"]["Enums"]["vendor_application_status"]
          approved_date: string | null
          approved_tables: number | null
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string
          event_id: string
          file_url: string | null
          hide_from_calendar: boolean | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          requested_tables: number
          stripe_payment_intent_id: string | null
          table_number: string | null
          updated_at: string
          user_id: string
          vendor_id: string
          vendor_request: string | null
          vendor_request_at: string | null
          vendor_request_reason: string | null
        }
        Insert: {
          application_date?: string
          application_status?: Database["public"]["Enums"]["vendor_application_status"]
          approved_date?: string | null
          approved_tables?: number | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          file_url?: string | null
          hide_from_calendar?: boolean | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          requested_tables?: number
          stripe_payment_intent_id?: string | null
          table_number?: string | null
          updated_at?: string
          user_id: string
          vendor_id: string
          vendor_request?: string | null
          vendor_request_at?: string | null
          vendor_request_reason?: string | null
        }
        Update: {
          application_date?: string
          application_status?: Database["public"]["Enums"]["vendor_application_status"]
          approved_date?: string | null
          approved_tables?: number | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          file_url?: string | null
          hide_from_calendar?: boolean | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          requested_tables?: number
          stripe_payment_intent_id?: string | null
          table_number?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string
          vendor_request?: string | null
          vendor_request_at?: string | null
          vendor_request_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendor_applications_vendor_id"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_employee_events: {
        Row: {
          assigned_by: string
          created_at: string
          employee_id: string
          event_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          employee_id: string
          event_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          employee_id?: string
          event_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_employee_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "vendor_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_employee_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_employee_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_employee_hours: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          employee_id: string
          entry_type: string
          event_id: string | null
          id: string
          manual_hours: number | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id: string
          entry_type?: string
          event_id?: string | null
          id?: string
          manual_hours?: number | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          entry_type?: string
          event_id?: string | null
          id?: string
          manual_hours?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_employee_hours_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "vendor_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_employee_hours_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_employee_hours_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_employees: {
        Row: {
          created_at: string
          hired_at: string | null
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          role: Database["public"]["Enums"]["vendor_employee_role"]
          status: string
          updated_at: string
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          hired_at?: string | null
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          role?: Database["public"]["Enums"]["vendor_employee_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          hired_at?: string | null
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          role?: Database["public"]["Enums"]["vendor_employee_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_employees_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_event_inventory: {
        Row: {
          created_at: string
          event_id: string
          featured: boolean
          id: string
          item_id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          featured?: boolean
          id?: string
          item_id: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          featured?: boolean
          id?: string
          item_id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_event_ratings: {
        Row: {
          created_at: string
          event_id: string
          id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_event_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_event_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_event_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_organizer_notes: {
        Row: {
          blacklist_reason: string | null
          created_at: string
          id: string
          is_blacklisted: boolean | null
          is_favorite: boolean | null
          organizer_id: string
          private_notes: string | null
          private_rating: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          blacklist_reason?: string | null
          created_at?: string
          id?: string
          is_blacklisted?: boolean | null
          is_favorite?: boolean | null
          organizer_id: string
          private_notes?: string | null
          private_rating?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          blacklist_reason?: string | null
          created_at?: string
          id?: string
          is_blacklisted?: boolean | null
          is_favorite?: boolean | null
          organizer_id?: string
          private_notes?: string | null
          private_rating?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_organizer_notes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_personal_events: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          state: string | null
          tables_count: number | null
          title: string
          updated_at: string
          user_id: string
          venue: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          state?: string | null
          tables_count?: number | null
          title: string
          updated_at?: string
          user_id: string
          venue?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          state?: string | null
          tables_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          venue?: string | null
        }
        Relationships: []
      }
      vendor_staff_roles: {
        Row: {
          created_at: string
          id: string
          role_name: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_name: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_name?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_staff_roles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_staff_roster: {
        Row: {
          created_at: string
          default_role: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          default_role?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          default_role?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_staff_roster_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_table_listings: {
        Row: {
          buyer_user_id: string | null
          buyer_vendor_id: string | null
          created_at: string
          event_id: string
          id: string
          listing_type: string
          notes: string | null
          price_per_table: number | null
          seller_user_id: string
          seller_vendor_id: string
          status: string
          tables_offered: number
          target_group_id: string | null
          target_vendor_id: string | null
          updated_at: string
          vendor_application_id: string
        }
        Insert: {
          buyer_user_id?: string | null
          buyer_vendor_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          listing_type?: string
          notes?: string | null
          price_per_table?: number | null
          seller_user_id: string
          seller_vendor_id: string
          status?: string
          tables_offered?: number
          target_group_id?: string | null
          target_vendor_id?: string | null
          updated_at?: string
          vendor_application_id: string
        }
        Update: {
          buyer_user_id?: string | null
          buyer_vendor_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          listing_type?: string
          notes?: string | null
          price_per_table?: number | null
          seller_user_id?: string
          seller_vendor_id?: string
          status?: string
          tables_offered?: number
          target_group_id?: string | null
          target_vendor_id?: string | null
          updated_at?: string
          vendor_application_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_table_listings_buyer_vendor_id_fkey"
            columns: ["buyer_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_table_listings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_table_listings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_table_listings_seller_vendor_id_fkey"
            columns: ["seller_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_table_listings_target_group_id_fkey"
            columns: ["target_group_id"]
            isOneToOne: false
            referencedRelation: "vendor_trusted_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_table_listings_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_table_listings_vendor_application_id_fkey"
            columns: ["vendor_application_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_table_listings_vendor_application_id_fkey"
            columns: ["vendor_application_id"]
            isOneToOne: false
            referencedRelation: "vendor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_trusted_group_members: {
        Row: {
          added_by: string
          created_at: string
          group_id: string
          id: string
          vendor_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          group_id: string
          id?: string
          vendor_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          group_id?: string
          id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_trusted_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "vendor_trusted_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_trusted_group_members_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_trusted_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_user_id: string
          owner_vendor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_user_id: string
          owner_vendor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          owner_vendor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_trusted_groups_owner_vendor_id_fkey"
            columns: ["owner_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_vendor_notes: {
        Row: {
          blacklist_reason: string | null
          created_at: string
          id: string
          is_blacklisted: boolean | null
          is_favorite: boolean | null
          private_notes: string | null
          private_rating: number | null
          target_vendor_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          blacklist_reason?: string | null
          created_at?: string
          id?: string
          is_blacklisted?: boolean | null
          is_favorite?: boolean | null
          private_notes?: string | null
          private_rating?: number | null
          target_vendor_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          blacklist_reason?: string | null
          created_at?: string
          id?: string
          is_blacklisted?: boolean | null
          is_favorite?: boolean | null
          private_notes?: string | null
          private_rating?: number | null
          target_vendor_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_vendor_notes_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_vendor_notes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_venue_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
          vendor_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
          vendor_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_venue_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_venue_ratings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "public_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_venue_ratings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          business_address: string | null
          business_description: string | null
          business_email: string | null
          business_name: string
          business_phone: string | null
          created_at: string | null
          id: string
          rating: number | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_links: Json | null
          social_twitter: string | null
          specialties: string[] | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          vendor_types: string[] | null
          verified: boolean | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          business_address?: string | null
          business_description?: string | null
          business_email?: string | null
          business_name: string
          business_phone?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_links?: Json | null
          social_twitter?: string | null
          specialties?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          vendor_types?: string[] | null
          verified?: boolean | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          business_address?: string | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_links?: Json | null
          social_twitter?: string | null
          specialties?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          vendor_types?: string[] | null
          verified?: boolean | null
          website_url?: string | null
        }
        Relationships: []
      }
      venue_claims: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          claim_type: string
          claimed_at: string
          claimer_id: string
          id: string
          reason: string | null
          status: string
          venue_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          claim_type: string
          claimed_at?: string
          claimer_id: string
          id?: string
          reason?: string | null
          status?: string
          venue_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          claim_type?: string
          claimed_at?: string
          claimer_id?: string
          id?: string
          reason?: string | null
          status?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_claims_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_vendor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_claimer_id_fkey"
            columns: ["claimer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_claimer_id_fkey"
            columns: ["claimer_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "public_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_claims_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          amenities: string[] | null
          capacity: number | null
          city: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          owner_id: string | null
          state: string
          updated_at: string
          verified: boolean | null
          website_url: string | null
          zip_code: string
        }
        Insert: {
          address: string
          amenities?: string[] | null
          capacity?: number | null
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          owner_id?: string | null
          state: string
          updated_at?: string
          verified?: boolean | null
          website_url?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          amenities?: string[] | null
          capacity?: number | null
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          owner_id?: string | null
          state?: string
          updated_at?: string
          verified?: boolean | null
          website_url?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_deal_list_items: {
        Row: {
          card_name: string | null
          card_number: string | null
          condition: string | null
          external_id: string | null
          game: string | null
          id: string | null
          image_url: string | null
          list_price: number | null
          listed_at: string | null
          listing_status: string | null
          public_notes: string | null
          quantity: number | null
          rarity: string | null
          set_name: string | null
          tcgplayer_url: string | null
          user_id: string | null
        }
        Insert: {
          card_name?: string | null
          card_number?: string | null
          condition?: string | null
          external_id?: string | null
          game?: string | null
          id?: string | null
          image_url?: string | null
          list_price?: number | null
          listed_at?: string | null
          listing_status?: string | null
          public_notes?: string | null
          quantity?: number | null
          rarity?: string | null
          set_name?: string | null
          tcgplayer_url?: string | null
          user_id?: string | null
        }
        Update: {
          card_name?: string | null
          card_number?: string | null
          condition?: string | null
          external_id?: string | null
          game?: string | null
          id?: string | null
          image_url?: string | null
          list_price?: number | null
          listed_at?: string | null
          listing_status?: string | null
          public_notes?: string | null
          quantity?: number | null
          rarity?: string | null
          set_name?: string | null
          tcgplayer_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_events: {
        Row: {
          address: string | null
          age_pricing_info: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          card_types: string[] | null
          city: string | null
          created_at: string | null
          date: string | null
          description: string | null
          entry_fee: number | null
          event_type: string | null
          floor_plan_url: string | null
          flyer_back_url: string | null
          flyer_url: string | null
          id: string | null
          image_url: string | null
          is_multi_day: boolean | null
          layout_json: Json | null
          listing_fee_cents: number | null
          listing_paid_at: string | null
          listing_payment_status: string | null
          listing_tier: string | null
          max_attendees: number | null
          no_online_table_sales: boolean | null
          no_online_ticket_sales: boolean | null
          no_sponsors: boolean | null
          organizer_id: string | null
          organizer_name: string | null
          preferred_contact_method: string | null
          sponsor_tier_slots: number | null
          sponsor_tiers: Json | null
          state: string | null
          tables_available: number | null
          title: string | null
          total_tables: number | null
          updated_at: string | null
          vendor_notes: string | null
          vendor_start_time: string | null
          vendor_table_price: number | null
          venue: string | null
          venue_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age_pricing_info?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          card_types?: string[] | null
          city?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          entry_fee?: number | null
          event_type?: string | null
          floor_plan_url?: string | null
          flyer_back_url?: string | null
          flyer_url?: string | null
          id?: string | null
          image_url?: string | null
          is_multi_day?: boolean | null
          layout_json?: Json | null
          listing_fee_cents?: number | null
          listing_paid_at?: string | null
          listing_payment_status?: string | null
          listing_tier?: string | null
          max_attendees?: number | null
          no_online_table_sales?: boolean | null
          no_online_ticket_sales?: boolean | null
          no_sponsors?: boolean | null
          organizer_id?: string | null
          organizer_name?: string | null
          preferred_contact_method?: string | null
          sponsor_tier_slots?: number | null
          sponsor_tiers?: Json | null
          state?: string | null
          tables_available?: number | null
          title?: string | null
          total_tables?: number | null
          updated_at?: string | null
          vendor_notes?: string | null
          vendor_start_time?: string | null
          vendor_table_price?: number | null
          venue?: string | null
          venue_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age_pricing_info?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          card_types?: string[] | null
          city?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          entry_fee?: number | null
          event_type?: string | null
          floor_plan_url?: string | null
          flyer_back_url?: string | null
          flyer_url?: string | null
          id?: string | null
          image_url?: string | null
          is_multi_day?: boolean | null
          layout_json?: Json | null
          listing_fee_cents?: number | null
          listing_paid_at?: string | null
          listing_payment_status?: string | null
          listing_tier?: string | null
          max_attendees?: number | null
          no_online_table_sales?: boolean | null
          no_online_ticket_sales?: boolean | null
          no_sponsors?: boolean | null
          organizer_id?: string | null
          organizer_name?: string | null
          preferred_contact_method?: string | null
          sponsor_tier_slots?: number | null
          sponsor_tiers?: Json | null
          state?: string | null
          tables_available?: number | null
          title?: string | null
          total_tables?: number | null
          updated_at?: string | null
          vendor_notes?: string | null
          vendor_start_time?: string | null
          vendor_table_price?: number | null
          venue?: string | null
          venue_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "public_venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      public_vendor_applications: {
        Row: {
          application_date: string | null
          application_status:
            | Database["public"]["Enums"]["vendor_application_status"]
            | null
          approved_date: string | null
          approved_tables: number | null
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string | null
          event_id: string | null
          hide_from_calendar: boolean | null
          id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          requested_tables: number | null
          table_number: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          application_date?: string | null
          application_status?:
            | Database["public"]["Enums"]["vendor_application_status"]
            | null
          approved_date?: string | null
          approved_tables?: number | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          event_id?: string | null
          hide_from_calendar?: boolean | null
          id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          requested_tables?: number | null
          table_number?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          application_date?: string | null
          application_status?:
            | Database["public"]["Enums"]["vendor_application_status"]
            | null
          approved_date?: string | null
          approved_tables?: number | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          event_id?: string | null
          hide_from_calendar?: boolean | null
          id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          requested_tables?: number | null
          table_number?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendor_applications_vendor_id"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
        ]
      }
      public_vendor_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          location_city: string | null
          location_state: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          location_city?: string | null
          location_state?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          location_city?: string | null
          location_state?: string | null
        }
        Relationships: []
      }
      public_venues: {
        Row: {
          address: string | null
          amenities: string[] | null
          capacity: number | null
          city: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          name: string | null
          state: string | null
          verified: boolean | null
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          capacity?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          state?: string | null
          verified?: boolean | null
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          capacity?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          state?: string | null
          verified?: boolean | null
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_vendor_invite: {
        Args: { _invite_code: string }
        Returns: {
          created_at: string
          hired_at: string | null
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          role: Database["public"]["Enums"]["vendor_employee_role"]
          status: string
          updated_at: string
          user_id: string | null
          vendor_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vendor_employees"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_event_pnl: {
        Args: { p_event_id?: string; p_personal_event_id?: string }
        Returns: Json
      }
      get_event_sponsor_amounts: {
        Args: { p_event_id: string }
        Returns: {
          amount: number
          id: string
        }[]
      }
      get_public_deal_proposal: { Args: { p_token: string }; Returns: Json }
      get_public_vendor_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          location_city: string
          location_state: string
        }[]
      }
      get_user_role: {
        Args: { user_id?: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id?: string }; Returns: boolean }
      is_demo_email: { Args: { _email: string }; Returns: boolean }
      is_vendor_manager: {
        Args: { _user_id?: string; _vendor_id: string }
        Returns: boolean
      }
      is_vendor_owner: {
        Args: { _user_id?: string; _vendor_id: string }
        Returns: boolean
      }
      send_event_notifications: {
        Args: { p_event_id: string; p_notifications: Json }
        Returns: undefined
      }
      update_set_completion: {
        Args: { p_tcg_set_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      card_category:
        | "pokemon"
        | "mtg"
        | "yugioh"
        | "sports"
        | "other"
        | "lorcana"
        | "onepiece"
      card_condition:
        | "mint"
        | "near_mint"
        | "excellent"
        | "good"
        | "light_play"
        | "moderate_play"
        | "heavy_play"
        | "damaged"
      payment_status: "unpaid" | "paid" | "refunded"
      user_role:
        | "user"
        | "vendor"
        | "organizer"
        | "venue"
        | "admin"
        | "event_pro"
        | "vendor_pro"
        | "collector_pro"
        | "sponsor"
      vendor_application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "waitlist"
      vendor_employee_role:
        | "event_manager"
        | "warehouse_manager"
        | "retail_manager"
        | "orders_manager"
        | "warehouse_staff"
        | "retail_staff"
        | "event_staff"
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
      approval_status: ["pending", "approved", "rejected"],
      card_category: [
        "pokemon",
        "mtg",
        "yugioh",
        "sports",
        "other",
        "lorcana",
        "onepiece",
      ],
      card_condition: [
        "mint",
        "near_mint",
        "excellent",
        "good",
        "light_play",
        "moderate_play",
        "heavy_play",
        "damaged",
      ],
      payment_status: ["unpaid", "paid", "refunded"],
      user_role: [
        "user",
        "vendor",
        "organizer",
        "venue",
        "admin",
        "event_pro",
        "vendor_pro",
        "collector_pro",
        "sponsor",
      ],
      vendor_application_status: [
        "pending",
        "approved",
        "rejected",
        "waitlist",
      ],
      vendor_employee_role: [
        "event_manager",
        "warehouse_manager",
        "retail_manager",
        "orders_manager",
        "warehouse_staff",
        "retail_staff",
        "event_staff",
      ],
    },
  },
} as const

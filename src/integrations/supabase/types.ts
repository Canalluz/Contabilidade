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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      accounting_accounts: {
        Row: {
          active: boolean
          class: number
          code: string
          company_id: string
          created_at: string
          id: string
          is_movement: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          class?: number
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_movement?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          class?: number
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_movement?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_journals: {
        Row: {
          active: boolean
          code: string
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_periods: {
        Row: {
          closed: boolean
          closed_at: string
          closed_by: string
          company_id: string
          month: number
          year: number
        }
        Insert: {
          closed?: boolean
          closed_at?: string
          closed_by?: string
          company_id: string
          month: number
          year: number
        }
        Update: {
          closed?: boolean
          closed_at?: string
          closed_by?: string
          company_id?: string
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          data: Json | null
          entity: string
          entity_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          data?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          data?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          cae: string | null
          city: string | null
          country: string
          created_at: string
          created_by: string
          email: string | null
          iban: string | null
          id: string
          logo_url: string | null
          name: string
          nif: string
          phone: string | null
          postal_code: string | null
          trade_name: string | null
          updated_at: string
          vat_regime: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cae?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          email?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          name: string
          nif: string
          phone?: string | null
          postal_code?: string | null
          trade_name?: string | null
          updated_at?: string
          vat_regime?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cae?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          email?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          nif?: string
          phone?: string | null
          postal_code?: string | null
          trade_name?: string | null
          updated_at?: string
          vat_regime?: string
          website?: string | null
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          code: string | null
          company_id: string
          contact_name: string | null
          country: string
          created_at: string
          credit_limit: number
          email: string | null
          iban: string | null
          id: string
          name: string
          nif: string | null
          notes: string | null
          payment_terms_days: number
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          code?: string | null
          company_id: string
          contact_name?: string | null
          country?: string
          created_at?: string
          credit_limit?: number
          email?: string | null
          iban?: string | null
          id?: string
          name: string
          nif?: string | null
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          code?: string | null
          company_id?: string
          contact_name?: string | null
          country?: string
          created_at?: string
          credit_limit?: number
          email?: string | null
          iban?: string | null
          id?: string
          name?: string
          nif?: string | null
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_counters: {
        Row: {
          company_id: string
          doc_type: Database["public"]["Enums"]["sales_doc_type"]
          last_number: number
          year: number
        }
        Insert: {
          company_id: string
          doc_type: Database["public"]["Enums"]["sales_doc_type"]
          last_number?: number
          year: number
        }
        Update: {
          company_id?: string
          doc_type?: Database["public"]["Enums"]["sales_doc_type"]
          last_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "doc_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string
          entry_date: string
          id: string
          journal_id: string
          number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string
          description: string
          entry_date?: string
          id?: string
          journal_id: string
          number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          id?: string
          journal_id?: string
          number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          company_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
          position: number
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
          position?: number
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          payment_id: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          payment_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "purchase_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          barcode: string | null
          category: string | null
          code: string
          company_id: string
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["product_kind"]
          purchase_price: number
          reference: string | null
          sale_price: number
          stock_max: number
          stock_min: number
          unit: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          active?: boolean
          barcode?: string | null
          category?: string | null
          code: string
          company_id: string
          created_at?: string
          description: string
          id?: string
          kind?: Database["public"]["Enums"]["product_kind"]
          purchase_price?: number
          reference?: string | null
          sale_price?: number
          stock_max?: number
          stock_min?: number
          unit?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          active?: boolean
          barcode?: string | null
          category?: string | null
          code?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["product_kind"]
          purchase_price?: number
          reference?: string | null
          sale_price?: number
          stock_max?: number
          stock_min?: number
          unit?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      purchase_doc_counters: {
        Row: {
          company_id: string
          doc_type: Database["public"]["Enums"]["purchase_doc_type"]
          last_number: number
          year: number
        }
        Insert: {
          company_id: string
          doc_type: Database["public"]["Enums"]["purchase_doc_type"]
          last_number?: number
          year: number
        }
        Update: {
          company_id?: string
          doc_type?: Database["public"]["Enums"]["purchase_doc_type"]
          last_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_doc_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_document_lines: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          description: string
          discount_pct: number
          document_id: string
          id: string
          net_amount: number
          position: number
          product_id: string | null
          quantity: number
          total_amount: number
          unit: string
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          description: string
          discount_pct?: number
          document_id: string
          id?: string
          net_amount?: number
          position?: number
          product_id?: string | null
          quantity?: number
          total_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          description?: string
          discount_pct?: number
          document_id?: string
          id?: string
          net_amount?: number
          position?: number
          product_id?: string | null
          quantity?: number
          total_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_document_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "purchase_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_document_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          discount_total: number
          doc_type: Database["public"]["Enums"]["purchase_doc_type"]
          due_date: string | null
          gross_total: number
          id: string
          issue_date: string
          net_total: number
          notes: string | null
          number: string | null
          paid_total: number
          reference: string | null
          seq: number | null
          series_year: number
          source_document_id: string | null
          status: Database["public"]["Enums"]["sales_doc_status"]
          supplier_id: string | null
          supplier_name: string | null
          supplier_nif: string | null
          updated_at: string
          vat_total: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string
          discount_total?: number
          doc_type: Database["public"]["Enums"]["purchase_doc_type"]
          due_date?: string | null
          gross_total?: number
          id?: string
          issue_date?: string
          net_total?: number
          notes?: string | null
          number?: string | null
          paid_total?: number
          reference?: string | null
          seq?: number | null
          series_year?: number
          source_document_id?: string | null
          status?: Database["public"]["Enums"]["sales_doc_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_nif?: string | null
          updated_at?: string
          vat_total?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          discount_total?: number
          doc_type?: Database["public"]["Enums"]["purchase_doc_type"]
          due_date?: string | null
          gross_total?: number
          id?: string
          issue_date?: string
          net_total?: number
          notes?: string | null
          number?: string | null
          paid_total?: number
          reference?: string | null
          seq?: number | null
          series_year?: number
          source_document_id?: string | null
          status?: Database["public"]["Enums"]["sales_doc_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_nif?: string | null
          updated_at?: string
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_documents_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "purchase_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_allocations: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          invoice_id: string
          receipt_id: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          invoice_id: string
          receipt_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_document_lines: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          description: string
          discount_pct: number
          document_id: string
          id: string
          net_amount: number
          position: number
          product_id: string | null
          quantity: number
          total_amount: number
          unit: string
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          description: string
          discount_pct?: number
          document_id: string
          id?: string
          net_amount?: number
          position?: number
          product_id?: string | null
          quantity?: number
          total_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          description?: string
          discount_pct?: number
          document_id?: string
          id?: string
          net_amount?: number
          position?: number
          product_id?: string | null
          quantity?: number
          total_amount?: number
          unit?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_document_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_document_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          customer_id: string | null
          customer_name: string | null
          customer_nif: string | null
          discount_total: number
          doc_type: Database["public"]["Enums"]["sales_doc_type"]
          due_date: string | null
          gross_total: number
          id: string
          issue_date: string
          net_total: number
          notes: string | null
          number: string | null
          paid_total: number
          reference: string | null
          seq: number | null
          series_year: number
          source_document_id: string | null
          status: Database["public"]["Enums"]["sales_doc_status"]
          updated_at: string
          vat_total: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_nif?: string | null
          discount_total?: number
          doc_type: Database["public"]["Enums"]["sales_doc_type"]
          due_date?: string | null
          gross_total?: number
          id?: string
          issue_date?: string
          net_total?: number
          notes?: string | null
          number?: string | null
          paid_total?: number
          reference?: string | null
          seq?: number | null
          series_year?: number
          source_document_id?: string | null
          status?: Database["public"]["Enums"]["sales_doc_status"]
          updated_at?: string
          vat_total?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_nif?: string | null
          discount_total?: number
          doc_type?: Database["public"]["Enums"]["sales_doc_type"]
          due_date?: string | null
          gross_total?: number
          id?: string
          issue_date?: string
          net_total?: number
          notes?: string | null
          number?: string | null
          paid_total?: number
          reference?: string | null
          seq?: number | null
          series_year?: number
          source_document_id?: string | null
          status?: Database["public"]["Enums"]["sales_doc_status"]
          updated_at?: string
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_documents_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          code: string | null
          company_id: string
          contact_name: string | null
          country: string
          created_at: string
          email: string | null
          iban: string | null
          id: string
          name: string
          nif: string | null
          notes: string | null
          payment_terms_days: number
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          code?: string | null
          company_id: string
          contact_name?: string | null
          country?: string
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          name: string
          nif?: string | null
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          code?: string | null
          company_id?: string
          contact_name?: string | null
          country?: string
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          name?: string
          nif?: string | null
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_accounts: {
        Row: {
          active: boolean
          bank_name: string | null
          company_id: string
          created_at: string
          currency: string
          iban: string | null
          id: string
          kind: Database["public"]["Enums"]["treasury_account_kind"]
          name: string
          opening_balance: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bank_name?: string | null
          company_id: string
          created_at?: string
          currency?: string
          iban?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["treasury_account_kind"]
          name: string
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bank_name?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          iban?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["treasury_account_kind"]
          name?: string
          opening_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_movements: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string
          direction: Database["public"]["Enums"]["treasury_direction"]
          id: string
          method: string | null
          movement_date: string
          purchase_document_id: string | null
          reference: string | null
          sales_document_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount?: number
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string
          description: string
          direction?: Database["public"]["Enums"]["treasury_direction"]
          id?: string
          method?: string | null
          movement_date?: string
          purchase_document_id?: string | null
          reference?: string | null
          sales_document_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string
          direction?: Database["public"]["Enums"]["treasury_direction"]
          id?: string
          method?: string | null
          movement_date?: string
          purchase_document_id?: string | null
          reference?: string | null
          sales_document_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_purchase_document_id_fkey"
            columns: ["purchase_document_id"]
            isOneToOne: false
            referencedRelation: "purchase_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_sales_document_id_fkey"
            columns: ["sales_document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_role: {
        Args: {
          _company_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "faturacao"
        | "financeiro"
        | "contabilista"
        | "rh"
        | "armazem"
        | "consulta"
      product_kind: "produto" | "servico"
      purchase_doc_type: "encomenda_compra" | "fatura_compra" | "pagamento"
      sales_doc_status:
        | "rascunho"
        | "emitido"
        | "aceite"
        | "recusado"
        | "anulado"
        | "pago"
        | "parcial"
      sales_doc_type:
        | "orcamento"
        | "encomenda"
        | "fatura"
        | "nota_credito"
        | "recibo"
      treasury_account_kind: "banco" | "caixa"
      treasury_direction: "entrada" | "saida"
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
        "gestor",
        "faturacao",
        "financeiro",
        "contabilista",
        "rh",
        "armazem",
        "consulta",
      ],
      product_kind: ["produto", "servico"],
      purchase_doc_type: ["encomenda_compra", "fatura_compra", "pagamento"],
      sales_doc_status: [
        "rascunho",
        "emitido",
        "aceite",
        "recusado",
        "anulado",
        "pago",
        "parcial",
      ],
      sales_doc_type: [
        "orcamento",
        "encomenda",
        "fatura",
        "nota_credito",
        "recibo",
      ],
      treasury_account_kind: ["banco", "caixa"],
      treasury_direction: ["entrada", "saida"],
    },
  },
} as const

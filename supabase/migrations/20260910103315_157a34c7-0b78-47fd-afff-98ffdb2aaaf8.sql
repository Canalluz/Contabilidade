CREATE TYPE public.treasury_account_kind AS ENUM ('banco','caixa');
CREATE TYPE public.treasury_direction AS ENUM ('entrada','saida');

CREATE TABLE public.treasury_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind public.treasury_account_kind NOT NULL DEFAULT 'banco',
  name text NOT NULL,
  bank_name text,
  iban text,
  opening_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury_accounts TO authenticated;
GRANT ALL ON public.treasury_accounts TO service_role;
ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read treasury accounts" ON public.treasury_accounts FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert treasury accounts" ON public.treasury_accounts FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro']::app_role[]));
CREATE POLICY "staff update treasury accounts" ON public.treasury_accounts FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro']::app_role[]));
CREATE POLICY "staff delete treasury accounts" ON public.treasury_accounts FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro']::app_role[]));

CREATE TABLE public.treasury_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.treasury_accounts(id) ON DELETE CASCADE,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  direction public.treasury_direction NOT NULL DEFAULT 'entrada',
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL,
  category text,
  method text,
  reference text,
  sales_document_id uuid REFERENCES public.sales_documents(id) ON DELETE SET NULL,
  purchase_document_id uuid REFERENCES public.purchase_documents(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury_movements TO authenticated;
GRANT ALL ON public.treasury_movements TO service_role;
ALTER TABLE public.treasury_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read treasury movements" ON public.treasury_movements FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert treasury movements" ON public.treasury_movements FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro']::app_role[]));
CREATE POLICY "staff update treasury movements" ON public.treasury_movements FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro']::app_role[]));
CREATE POLICY "staff delete treasury movements" ON public.treasury_movements FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro']::app_role[]));

CREATE TRIGGER treasury_accounts_updated_at BEFORE UPDATE ON public.treasury_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER treasury_movements_updated_at BEFORE UPDATE ON public.treasury_movements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_treasury_accounts_company ON public.treasury_accounts (company_id, kind);
CREATE INDEX idx_treasury_movements_company_date ON public.treasury_movements (company_id, movement_date DESC);
CREATE INDEX idx_treasury_movements_account ON public.treasury_movements (account_id);
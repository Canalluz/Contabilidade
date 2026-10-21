CREATE TYPE public.purchase_doc_type AS ENUM ('encomenda_compra','fatura_compra','pagamento');

CREATE TABLE public.purchase_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type public.purchase_doc_type NOT NULL,
  number text,
  series_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  seq integer,
  supplier_id uuid REFERENCES public.suppliers(id),
  supplier_name text,
  supplier_nif text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status public.sales_doc_status NOT NULL DEFAULT 'rascunho',
  reference text,
  notes text,
  discount_total numeric NOT NULL DEFAULT 0,
  net_total numeric NOT NULL DEFAULT 0,
  vat_total numeric NOT NULL DEFAULT 0,
  gross_total numeric NOT NULL DEFAULT 0,
  paid_total numeric NOT NULL DEFAULT 0,
  source_document_id uuid REFERENCES public.purchase_documents(id),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_documents TO authenticated;
GRANT ALL ON public.purchase_documents TO service_role;
ALTER TABLE public.purchase_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read purchase docs" ON public.purchase_documents FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert purchase docs" ON public.purchase_documents FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));
CREATE POLICY "staff update purchase docs" ON public.purchase_documents FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));
CREATE POLICY "staff delete draft purchase docs" ON public.purchase_documents FOR DELETE TO authenticated USING (status = 'rascunho' AND public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));

CREATE TABLE public.purchase_document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.purchase_documents(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  product_id uuid REFERENCES public.products(id),
  code text,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 23,
  net_amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_document_lines TO authenticated;
GRANT ALL ON public.purchase_document_lines TO service_role;
ALTER TABLE public.purchase_document_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read purchase lines" ON public.purchase_document_lines FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert purchase lines" ON public.purchase_document_lines FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));
CREATE POLICY "staff update purchase lines" ON public.purchase_document_lines FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));
CREATE POLICY "staff delete purchase lines" ON public.purchase_document_lines FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));

CREATE TABLE public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.purchase_documents(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.purchase_documents(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_allocations TO authenticated;
GRANT ALL ON public.payment_allocations TO service_role;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read payment allocations" ON public.payment_allocations FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert payment allocations" ON public.payment_allocations FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));
CREATE POLICY "staff update payment allocations" ON public.payment_allocations FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));
CREATE POLICY "staff delete payment allocations" ON public.payment_allocations FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::app_role[]));

CREATE TABLE public.purchase_doc_counters (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type public.purchase_doc_type NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, doc_type, year)
);

GRANT SELECT ON public.purchase_doc_counters TO authenticated;
GRANT ALL ON public.purchase_doc_counters TO service_role;
ALTER TABLE public.purchase_doc_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read purchase counters" ON public.purchase_doc_counters FOR SELECT TO authenticated USING (public.is_company_member(company_id));

CREATE OR REPLACE FUNCTION public.assign_purchase_document_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next integer;
BEGIN
  IF NEW.status = 'rascunho' OR NEW.number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_prefix := CASE NEW.doc_type
    WHEN 'encomenda_compra' THEN 'EC'
    WHEN 'fatura_compra' THEN 'FC'
    WHEN 'pagamento' THEN 'PG'
  END;

  INSERT INTO public.purchase_doc_counters (company_id, doc_type, year, last_number)
  VALUES (NEW.company_id, NEW.doc_type, NEW.series_year, 1)
  ON CONFLICT (company_id, doc_type, year)
  DO UPDATE SET last_number = public.purchase_doc_counters.last_number + 1
  RETURNING last_number INTO v_next;

  NEW.seq := v_next;
  NEW.number := v_prefix || ' ' || NEW.series_year || '/' || lpad(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_purchase_document_number() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER assign_purchase_document_number
BEFORE INSERT OR UPDATE ON public.purchase_documents
FOR EACH ROW EXECUTE FUNCTION public.assign_purchase_document_number();

CREATE TRIGGER update_purchase_documents_updated_at
BEFORE UPDATE ON public.purchase_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_purchase_documents_company_type ON public.purchase_documents (company_id, doc_type, issue_date DESC);
CREATE INDEX idx_purchase_document_lines_doc ON public.purchase_document_lines (document_id);
CREATE INDEX idx_payment_allocations_invoice ON public.payment_allocations (invoice_id);
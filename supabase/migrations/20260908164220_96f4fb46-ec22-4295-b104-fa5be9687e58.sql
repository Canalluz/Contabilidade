CREATE TYPE public.sales_doc_type AS ENUM ('orcamento','encomenda','fatura','nota_credito','recibo');
CREATE TYPE public.sales_doc_status AS ENUM ('rascunho','emitido','aceite','recusado','anulado','pago','parcial');

CREATE TABLE public.doc_counters (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type public.sales_doc_type NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, doc_type, year)
);

CREATE TABLE public.sales_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type public.sales_doc_type NOT NULL,
  number text,
  series_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  seq integer,
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  customer_nif text,
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
  source_document_id uuid REFERENCES public.sales_documents(id),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sales_documents_number_uk ON public.sales_documents (company_id, doc_type, series_year, seq) WHERE seq IS NOT NULL;
CREATE INDEX sales_documents_company_idx ON public.sales_documents (company_id, doc_type, issue_date DESC);

CREATE TABLE public.sales_document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.sales_documents(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  product_id uuid REFERENCES public.products(id),
  code text,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'UN',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 23,
  net_amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_document_lines_doc_idx ON public.sales_document_lines (document_id, position);

CREATE TABLE public.receipt_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES public.sales_documents(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.sales_documents(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, invoice_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_document_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_allocations TO authenticated;
GRANT SELECT ON public.doc_counters TO authenticated;
GRANT ALL ON public.sales_documents TO service_role;
GRANT ALL ON public.sales_document_lines TO service_role;
GRANT ALL ON public.receipt_allocations TO service_role;
GRANT ALL ON public.doc_counters TO service_role;

ALTER TABLE public.sales_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read sales documents" ON public.sales_documents FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert sales documents" ON public.sales_documents FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));
CREATE POLICY "staff update sales documents" ON public.sales_documents FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));
CREATE POLICY "staff delete draft sales documents" ON public.sales_documents FOR DELETE TO authenticated USING (status = 'rascunho' AND public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));

CREATE POLICY "members read sales lines" ON public.sales_document_lines FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert sales lines" ON public.sales_document_lines FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));
CREATE POLICY "staff update sales lines" ON public.sales_document_lines FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));
CREATE POLICY "staff delete sales lines" ON public.sales_document_lines FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));

CREATE POLICY "members read allocations" ON public.receipt_allocations FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert allocations" ON public.receipt_allocations FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));
CREATE POLICY "staff update allocations" ON public.receipt_allocations FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));
CREATE POLICY "staff delete allocations" ON public.receipt_allocations FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro']::public.app_role[]));

CREATE POLICY "members read counters" ON public.doc_counters FOR SELECT TO authenticated USING (public.is_company_member(company_id));

CREATE TRIGGER sales_documents_updated_at BEFORE UPDATE ON public.sales_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.assign_sales_document_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prefix text;
  next_seq integer;
BEGIN
  IF NEW.status = 'rascunho' OR NEW.seq IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.seq IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.doc_counters (company_id, doc_type, year, last_number)
  VALUES (NEW.company_id, NEW.doc_type, NEW.series_year, 1)
  ON CONFLICT (company_id, doc_type, year)
  DO UPDATE SET last_number = public.doc_counters.last_number + 1
  RETURNING last_number INTO next_seq;

  prefix := CASE NEW.doc_type
    WHEN 'orcamento' THEN 'ORC'
    WHEN 'encomenda' THEN 'ENC'
    WHEN 'fatura' THEN 'FT'
    WHEN 'nota_credito' THEN 'NC'
    WHEN 'recibo' THEN 'RC'
  END;

  NEW.seq := next_seq;
  NEW.number := prefix || ' ' || NEW.series_year || '/' || LPAD(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_documents_number BEFORE INSERT OR UPDATE ON public.sales_documents FOR EACH ROW EXECUTE FUNCTION public.assign_sales_document_number();
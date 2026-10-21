CREATE TABLE public.accounting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  class integer NOT NULL DEFAULT 1,
  is_movement boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_accounts TO authenticated;
GRANT ALL ON public.accounting_accounts TO service_role;
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read accounts" ON public.accounting_accounts FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "acc insert accounts" ON public.accounting_accounts FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc update accounts" ON public.accounting_accounts FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc delete accounts" ON public.accounting_accounts FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));

CREATE TABLE public.accounting_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_journals TO authenticated;
GRANT ALL ON public.accounting_journals TO service_role;
ALTER TABLE public.accounting_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read journals" ON public.accounting_journals FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "acc insert journals" ON public.accounting_journals FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc update journals" ON public.accounting_journals FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc delete journals" ON public.accounting_journals FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));

CREATE TABLE public.accounting_periods (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  closed boolean NOT NULL DEFAULT true,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid NOT NULL DEFAULT auth.uid(),
  PRIMARY KEY (company_id, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_periods TO authenticated;
GRANT ALL ON public.accounting_periods TO service_role;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read periods" ON public.accounting_periods FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "acc insert periods" ON public.accounting_periods FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc update periods" ON public.accounting_periods FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc delete periods" ON public.accounting_periods FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  journal_id uuid NOT NULL REFERENCES public.accounting_journals(id),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  number text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','lancado')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read entries" ON public.journal_entries FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "acc insert entries" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc update entries" ON public.journal_entries FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc delete draft entries" ON public.journal_entries FOR DELETE TO authenticated USING (status = 'rascunho' AND public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));

CREATE TABLE public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounting_accounts(id),
  position integer NOT NULL DEFAULT 1,
  description text,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entry_lines TO authenticated;
GRANT ALL ON public.journal_entry_lines TO service_role;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read entry lines" ON public.journal_entry_lines FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "acc insert entry lines" ON public.journal_entry_lines FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc update entry lines" ON public.journal_entry_lines FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));
CREATE POLICY "acc delete entry lines" ON public.journal_entry_lines FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['admin','gestor','contabilista']::app_role[]));

CREATE OR REPLACE FUNCTION public.guard_closed_period()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d date; c uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN d := OLD.entry_date; c := OLD.company_id;
  ELSE d := NEW.entry_date; c := NEW.company_id; END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_periods p WHERE p.company_id = c AND p.closed
             AND p.year = EXTRACT(YEAR FROM d) AND p.month = EXTRACT(MONTH FROM d)) THEN
    RAISE EXCEPTION 'O período % está fechado.', to_char(d, 'MM/YYYY');
  END IF;
  IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM public.accounting_periods p WHERE p.company_id = OLD.company_id AND p.closed
             AND p.year = EXTRACT(YEAR FROM OLD.entry_date) AND p.month = EXTRACT(MONTH FROM OLD.entry_date)) THEN
    RAISE EXCEPTION 'O período % está fechado.', to_char(OLD.entry_date, 'MM/YYYY');
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER journal_entries_closed_guard BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.guard_closed_period();
CREATE TRIGGER journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER accounting_accounts_updated_at BEFORE UPDATE ON public.accounting_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_journal_entries_company_date ON public.journal_entries (company_id, entry_date DESC);
CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines (entry_id);
CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines (account_id);
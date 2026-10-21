-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','gestor','faturacao','financeiro','contabilista','rh','armazem','consulta');
CREATE TYPE public.product_kind AS ENUM ('produto','servico');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nif text NOT NULL,
  trade_name text,
  address text,
  postal_code text,
  city text,
  country text NOT NULL DEFAULT 'Portugal',
  cae text,
  email text,
  phone text,
  website text,
  iban text,
  vat_regime text NOT NULL DEFAULT 'normal',
  logo_url text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- COMPANY USERS
CREATE TABLE public.company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'consulta',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_users TO authenticated;
GRANT ALL ON public.company_users TO service_role;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- HELPERS (security definer, avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_users cu WHERE cu.company_id = _company_id AND cu.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_company_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = _company_id AND cu.user_id = auth.uid() AND cu.role = ANY(_roles)
  );
$$;

-- COMPANY POLICIES
CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(id) OR created_by = auth.uid());
CREATE POLICY "create company" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "admins update company" ON public.companies FOR UPDATE TO authenticated
  USING (public.has_company_role(id, ARRAY['admin','gestor']::public.app_role[]))
  WITH CHECK (public.has_company_role(id, ARRAY['admin','gestor']::public.app_role[]));

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- creator becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_users (company_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_company_created AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- COMPANY_USERS POLICIES
CREATE POLICY "read own memberships" ON public.company_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_member(company_id));
CREATE POLICY "admins manage memberships" ON public.company_users FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin']::public.app_role[]));
CREATE POLICY "admins update memberships" ON public.company_users FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['admin']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin']::public.app_role[]));
CREATE POLICY "admins delete memberships" ON public.company_users FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['admin']::public.app_role[]));

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  nif text,
  address text,
  postal_code text,
  city text,
  country text NOT NULL DEFAULT 'Portugal',
  email text,
  phone text,
  contact_name text,
  iban text,
  payment_terms_days integer NOT NULL DEFAULT 30,
  credit_limit numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read customers" ON public.customers FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro','contabilista']::public.app_role[]));
CREATE POLICY "staff update customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro','contabilista']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','financeiro','contabilista']::public.app_role[]));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SUPPLIERS
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  nif text,
  address text,
  postal_code text,
  city text,
  country text NOT NULL DEFAULT 'Portugal',
  email text,
  phone text,
  contact_name text,
  iban text,
  payment_terms_days integer NOT NULL DEFAULT 30,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert suppliers" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro','contabilista']::public.app_role[]));
CREATE POLICY "staff update suppliers" ON public.suppliers FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro','contabilista']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','financeiro','contabilista']::public.app_role[]));
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  reference text,
  description text NOT NULL,
  kind public.product_kind NOT NULL DEFAULT 'produto',
  unit text NOT NULL DEFAULT 'UN',
  sale_price numeric(14,4) NOT NULL DEFAULT 0,
  purchase_price numeric(14,4) NOT NULL DEFAULT 0,
  vat_rate numeric(6,2) NOT NULL DEFAULT 23,
  category text,
  barcode text,
  stock_min numeric(14,3) NOT NULL DEFAULT 0,
  stock_max numeric(14,3) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read products" ON public.products FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','armazem']::public.app_role[]));
CREATE POLICY "staff update products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','armazem']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin','gestor','faturacao','armazem']::public.app_role[]));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUDIT LOGS (append only)
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (company_id IS NULL AND user_id = auth.uid() OR public.is_company_member(company_id));
CREATE POLICY "members insert audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_customers_company ON public.customers(company_id);
CREATE INDEX idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_audit_company ON public.audit_logs(company_id, created_at DESC);
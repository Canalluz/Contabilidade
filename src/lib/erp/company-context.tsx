import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "gestor"
  | "faturacao"
  | "financeiro"
  | "contabilista"
  | "rh"
  | "armazem"
  | "consulta";

export type Company = {
  id: string;
  name: string;
  nif: string;
  trade_name: string | null;
  city: string | null;
  vat_regime: string;
};

type Membership = { company_id: string; role: AppRole; companies: Company | null };

type CompanyContextValue = {
  memberships: Membership[];
  companies: Company[];
  company: Company | null;
  companyId: string | null;
  roles: AppRole[];
  isLoading: boolean;
  selectCompany: (id: string) => void;
  refresh: () => void;
  can: (roles: AppRole[]) => boolean;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);
const STORAGE_KEY = "erp.company";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["memberships"],
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("company_users")
        .select("company_id, role, companies(id, name, nif, trade_name, city, vat_regime)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Membership[];
    },
  });

  const memberships = data ?? [];
  const companies = Array.from(
    new Map(
      memberships
        .filter((m): m is Membership & { companies: Company } => Boolean(m.companies))
        .map((m) => [m.companies.id, m.companies]),
    ).values(),
  );

  useEffect(() => {
    if (companies.length === 0) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const valid = stored && companies.some((c) => c.id === stored) ? stored : companies[0]!.id;
    setCompanyId((current) => (current && companies.some((c) => c.id === current) ? current : valid));
  }, [companies.length, companies.map((c) => c.id).join(",")]);

  const selectCompany = (id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setCompanyId(id);
    queryClient.invalidateQueries();
  };

  const company = companies.find((c) => c.id === companyId) ?? null;
  const roles = memberships.filter((m) => m.company_id === companyId).map((m) => m.role);

  const value: CompanyContextValue = {
    memberships,
    companies,
    company,
    companyId,
    roles,
    isLoading,
    selectCompany,
    refresh: () => void queryClient.invalidateQueries({ queryKey: ["memberships"] }),
    can: (allowed) => roles.some((r) => allowed.includes(r)),
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany deve ser usado dentro de CompanyProvider");
  return ctx;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  faturacao: "Faturação",
  financeiro: "Financeiro",
  contabilista: "Contabilista",
  rh: "Recursos Humanos",
  armazem: "Armazém",
  consulta: "Consulta",
};

export async function logAudit(input: {
  companyId: string | null;
  action: string;
  entity: string;
  entityId?: string;
  data?: Record<string, unknown>;
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase.from("audit_logs").insert({
    company_id: input.companyId,
    user_id: userData.user.id,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    data: (input.data ?? null) as never,
  });
}

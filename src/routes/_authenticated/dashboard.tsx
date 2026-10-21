import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Package, Truck, Users } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/erp/erp-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gestix ERP" },
      { name: "description", content: "Painel executivo com indicadores de faturação, compras, tesouraria e stock." },
      { property: "og:title", content: "Dashboard — Gestix ERP" },
      { property: "og:description", content: "Indicadores de gestão em tempo real do ERP." },
    ],
  }),
  component: Dashboard,
});

const PERIODS = ["Hoje", "Semana", "Mês", "Trimestre", "Ano"] as const;
const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

function Dashboard() {
  const { company, companyId, isLoading } = useCompany();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("Mês");

  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [customers, suppliers, products] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
      ]);
      return {
        customers: customers.count ?? 0,
        suppliers: suppliers.count ?? 0,
        products: products.count ?? 0,
      };
    },
  });

  if (!isLoading && !company) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <Building2 className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Ainda não tem empresas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie a primeira empresa para começar a utilizar o ERP. Todos os dados ficam isolados por empresa.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/nova-empresa">Criar empresa</Link>
        </Button>
      </div>
    );
  }

  const emptyMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m) => ({
    mes: m,
    faturacao: 0,
    compras: 0,
    saldo: 0,
  }));

  return (
    <div>
      <PageHeader
        title={`Bom dia${company ? `, ${company.name}` : ""}`}
        description="Indicadores consolidados da empresa selecionada."
        actions={
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Faturação do período" value={eur.format(0)} hint="Disponível na Fase 2 (faturação)" />
        <Kpi label="Compras do período" value={eur.format(0)} hint="Disponível na Fase 3 (compras)" />
        <Kpi label="Saldo bancário" value={eur.format(0)} hint="Disponível na Fase 3 (bancos)" />
        <Kpi label="IVA estimado" value={eur.format(0)} hint="Disponível na Fase 5 (fiscalidade)" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CountCard icon={Users} label="Clientes" value={counts?.customers ?? 0} to="/clientes" />
        <CountCard icon={Truck} label="Fornecedores" value={counts?.suppliers ?? 0} to="/fornecedores" />
        <CountCard icon={Package} label="Artigos" value={counts?.products ?? 0} to="/produtos" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle className="text-base">Faturação vs. compras (ano)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emptyMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="faturacao" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="compras" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle className="text-base">Evolução do saldo bancário</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emptyMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Area dataKey="saldo" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Os valores financeiros ficam a zero enquanto os módulos de faturação, compras e bancos não forem ativados nas
        fases seguintes. A estrutura de dados e permissões já está preparada para os receber.
      </p>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="shadow-panel">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="num mt-1 text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function CountCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  to: "/clientes" | "/fornecedores" | "/produtos";
}) {
  return (
    <Link to={to}>
      <Card className="shadow-panel transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="num text-xl font-semibold">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

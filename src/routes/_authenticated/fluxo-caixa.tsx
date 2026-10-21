import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp/erp-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/fluxo-caixa")({
  head: () => ({
    meta: [
      { title: "Fluxo de caixa — Gestix ERP" },
      { name: "description", content: "Entradas, saídas e previsão de tesouraria por mês." },
      { property: "og:title", content: "Fluxo de caixa — Gestix ERP" },
      { property: "og:description", content: "Evolução mensal da tesouraria e previsões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CashFlowPage,
});

const eur = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);

function CashFlowPage() {
  const { companyId } = useCompany();

  const data = useQuery({
    queryKey: ["cash-flow", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [accounts, movements, receivables, payables] = await Promise.all([
        supabase.from("treasury_accounts").select("opening_balance").eq("company_id", companyId!),
        supabase
          .from("treasury_movements")
          .select("movement_date, direction, amount")
          .eq("company_id", companyId!),
        supabase
          .from("sales_documents")
          .select("due_date, gross_total, paid_total")
          .eq("company_id", companyId!)
          .eq("doc_type", "fatura")
          .in("status", ["emitido", "parcial"]),
        supabase
          .from("purchase_documents")
          .select("due_date, gross_total, paid_total")
          .eq("company_id", companyId!)
          .eq("doc_type", "fatura_compra")
          .in("status", ["emitido", "parcial"]),
      ]);
      for (const r of [accounts, movements, receivables, payables]) if (r.error) throw r.error;
      return {
        opening: (accounts.data ?? []).reduce((a, r) => a + Number(r.opening_balance), 0),
        movements: movements.data ?? [],
        receivables: receivables.data ?? [],
        payables: payables.data ?? [],
      };
    },
  });

  const months = new Map<string, { entradas: number; saidas: number; receber: number; pagar: number }>();
  const bucket = (key: string) => {
    if (!months.has(key)) months.set(key, { entradas: 0, saidas: 0, receber: 0, pagar: 0 });
    return months.get(key)!;
  };
  let currentBalance = data.data?.opening ?? 0;
  for (const m of data.data?.movements ?? []) {
    const b = bucket(m.movement_date.slice(0, 7));
    if (m.direction === "entrada") {
      b.entradas += Number(m.amount);
      currentBalance += Number(m.amount);
    } else {
      b.saidas += Number(m.amount);
      currentBalance -= Number(m.amount);
    }
  }
  const thisMonth = new Date().toISOString().slice(0, 7);
  let totalReceber = 0;
  let totalPagar = 0;
  for (const r of data.data?.receivables ?? []) {
    const v = Number(r.gross_total) - Number(r.paid_total);
    totalReceber += v;
    const key = r.due_date && r.due_date.slice(0, 7) > thisMonth ? r.due_date.slice(0, 7) : thisMonth;
    bucket(key).receber += v;
  }
  for (const p of data.data?.payables ?? []) {
    const v = Number(p.gross_total) - Number(p.paid_total);
    totalPagar += v;
    const key = p.due_date && p.due_date.slice(0, 7) > thisMonth ? p.due_date.slice(0, 7) : thisMonth;
    bucket(key).pagar += v;
  }
  const rows = Array.from(months.entries()).sort(([a], [b]) => a.localeCompare(b));

  const cards: Array<[string, number]> = [
    ["Saldo atual (bancos e caixa)", currentBalance],
    ["A receber", totalReceber],
    ["A pagar", totalPagar],
    ["Saldo previsto", currentBalance + totalReceber - totalPagar],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de caixa"
        description="Movimentos reais por mês e previsão com base nas faturas em aberto."
      />
      {!companyId ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Selecione uma empresa.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent className="text-lg font-semibold">{eur(value)}</CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Saldo do mês</TableHead>
                    <TableHead className="text-right">Previsto receber</TableHead>
                    <TableHead className="text-right">Previsto pagar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        {data.isLoading ? "A carregar…" : "Ainda não há movimentos nem faturas em aberto."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(([month, v]) => (
                      <TableRow key={month}>
                        <TableCell className="font-medium">{month}</TableCell>
                        <TableCell className="text-right">{eur(v.entradas)}</TableCell>
                        <TableCell className="text-right">{eur(v.saidas)}</TableCell>
                        <TableCell className="text-right font-medium">{eur(v.entradas - v.saidas)}</TableCell>
                        <TableCell className="text-right">{eur(v.receber)}</TableCell>
                        <TableCell className="text-right">{eur(v.pagar)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

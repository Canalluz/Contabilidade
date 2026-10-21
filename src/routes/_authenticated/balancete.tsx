import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/erp/erp-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { eur } from "@/lib/erp/accounting";
import { useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/balancete")({
  head: () => ({
    meta: [
      { title: "Balancete — Gestix ERP" },
      { name: "description", content: "Balancete de débitos, créditos e saldos por conta." },
      { property: "og:title", content: "Balancete — Gestix ERP" },
      { property: "og:description", content: "Saldos contabilísticos por conta e período." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const { companyId } = useCompany();
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);

  const data = useQuery({
    queryKey: ["acc-trial", companyId, from, to],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, accounting_accounts(code, name), journal_entries!inner(entry_date, status)")
        .eq("company_id", companyId!)
        .eq("journal_entries.status", "lancado")
        .gte("journal_entries.entry_date", from)
        .lte("journal_entries.entry_date", to);
      if (error) throw error;
      const map = new Map<string, { code: string; name: string; debit: number; credit: number }>();
      for (const l of data ?? []) {
        const code = l.accounting_accounts?.code ?? "?";
        const row = map.get(code) ?? { code, name: l.accounting_accounts?.name ?? "", debit: 0, credit: 0 };
        row.debit += Number(l.debit);
        row.credit += Number(l.credit);
        map.set(code, row);
      }
      return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    },
  });

  const rows = data.data ?? [];
  const td = rows.reduce((a, r) => a + r.debit, 0);
  const tc = rows.reduce((a, r) => a + r.credit, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Balancete" description="Totais de lançamentos registados por conta no período escolhido." />
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Débito</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
                <TableHead className="text-right">Saldo devedor</TableHead>
                <TableHead className="text-right">Saldo credor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    {data.isLoading ? "A carregar…" : "Sem lançamentos registados neste período."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const s = r.debit - r.credit;
                  return (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono">{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right">{eur(r.debit)}</TableCell>
                      <TableCell className="text-right">{eur(r.credit)}</TableCell>
                      <TableCell className="text-right">{s > 0 ? eur(s) : ""}</TableCell>
                      <TableCell className="text-right">{s < 0 ? eur(-s) : ""}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Totais</TableCell>
                <TableCell className="text-right font-semibold">{eur(td)}</TableCell>
                <TableCell className="text-right font-semibold">{eur(tc)}</TableCell>
                <TableCell colSpan={2} className="text-right text-sm">
                  {Math.abs(td - tc) < 0.005 ? "Equilibrado" : `Diferença ${eur(td - tc)}`}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

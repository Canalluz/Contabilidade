import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNTING_ROLES, MONTHS, errorMessage } from "@/lib/erp/accounting";
import { logAudit, useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/fechos")({
  head: () => ({
    meta: [
      { title: "Fechos de período — Gestix ERP" },
      { name: "description", content: "Fecho e reabertura de meses contabilísticos." },
      { property: "og:title", content: "Fechos de período — Gestix ERP" },
      { property: "og:description", content: "Bloqueio de lançamentos em meses fechados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClosingPage,
});

function ClosingPage() {
  const { companyId, can } = useCompany();
  const qc = useQueryClient();
  const canWrite = can(ACCOUNTING_ROLES);
  const [year, setYear] = useState(new Date().getFullYear());

  const periods = useQuery({
    queryKey: ["acc-periods", companyId, year],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_periods")
        .select("month, closed, closed_at")
        .eq("company_id", companyId!)
        .eq("year", year);
      if (error) throw error;
      return data ?? [];
    },
  });

  const drafts = useQuery({
    queryKey: ["acc-drafts", companyId, year],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("entry_date")
        .eq("company_id", companyId!)
        .eq("status", "rascunho")
        .gte("entry_date", `${year}-01-01`)
        .lte("entry_date", `${year}-12-31`);
      if (error) throw error;
      const map = new Map<number, number>();
      for (const d of data ?? []) {
        const m = Number(d.entry_date.slice(5, 7));
        map.set(m, (map.get(m) ?? 0) + 1);
      }
      return map;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ month, close }: { month: number; close: boolean }) => {
      if (close) {
        if ((drafts.data?.get(month) ?? 0) > 0)
          throw new Error("Há lançamentos em rascunho neste mês. Lance-os ou elimine-os antes de fechar.");
        const { error } = await supabase
          .from("accounting_periods")
          .upsert({ company_id: companyId!, year, month, closed: true, closed_at: new Date().toISOString() });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("accounting_periods")
          .delete()
          .eq("company_id", companyId!)
          .eq("year", year)
          .eq("month", month);
        if (error) throw error;
      }
      await logAudit({ companyId, action: close ? "close" : "reopen", entity: "accounting_period", data: { year, month } });
    },
    onSuccess: () => {
      toast.success("Período atualizado.");
      void qc.invalidateQueries({ queryKey: ["acc-periods"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fechos"
        description="Ao fechar um mês, deixa de ser possível criar, alterar ou eliminar lançamentos nessa data."
        actions={
          <Input
            type="number"
            className="w-28"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
          />
        }
      />
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rascunhos</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MONTHS.map((name, i) => {
                const month = i + 1;
                const closed = (periods.data ?? []).some((p) => p.month === month && p.closed);
                return (
                  <TableRow key={month}>
                    <TableCell className="font-medium">
                      {name} {year}
                    </TableCell>
                    <TableCell>
                      <Badge variant={closed ? "default" : "secondary"}>{closed ? "Fechado" : "Aberto"}</Badge>
                    </TableCell>
                    <TableCell>{drafts.data?.get(month) ?? 0}</TableCell>
                    <TableCell className="text-right">
                      {canWrite ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ month, close: !closed })}
                        >
                          {closed ? <LockOpen className="mr-2 size-4" /> : <Lock className="mr-2 size-4" />}
                          {closed ? "Reabrir" : "Fechar"}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

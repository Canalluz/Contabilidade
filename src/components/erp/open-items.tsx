import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/erp/erp-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/erp/company-context";

const eur = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);

type OpenItem = {
  id: string;
  number: string | null;
  issue_date: string;
  due_date: string | null;
  partner: string | null;
  gross_total: number;
  paid_total: number;
};

const daysLate = (dueDate: string | null) => {
  if (!dueDate) return 0;
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.floor(diff / 86_400_000);
};

export function OpenItemsManager({ kind }: { kind: "receber" | "pagar" }) {
  const { companyId } = useCompany();
  const [search, setSearch] = useState("");

  const isReceivable = kind === "receber";
  const table = isReceivable ? "sales_documents" : "purchase_documents";
  const docType = isReceivable ? "fatura" : "fatura_compra";
  const partnerColumn = isReceivable ? "customer_name" : "supplier_name";

  const items = useQuery({
    queryKey: ["open-items", companyId, kind],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<OpenItem[]> => {
      const { data, error } = await supabase
        .from(table)
        .select(`id, number, issue_date, due_date, gross_total, paid_total, ${partnerColumn}`)
        .eq("company_id", companyId!)
        .eq("doc_type", docType)
        .in("status", ["emitido", "parcial"])
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const record = row as unknown as Record<string, unknown>;
        return {
          id: String(record["id"]),
          number: (record["number"] as string | null) ?? null,
          issue_date: String(record["issue_date"]),
          due_date: (record["due_date"] as string | null) ?? null,
          partner: (record[partnerColumn] as string | null) ?? null,
          gross_total: Number(record["gross_total"] ?? 0),
          paid_total: Number(record["paid_total"] ?? 0),
        };
      });
    },
  });

  const rows = (items.data ?? [])
    .map((item) => ({ ...item, outstanding: item.gross_total - item.paid_total }))
    .filter((item) => item.outstanding > 0.004)
    .filter((item) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        (item.number ?? "").toLowerCase().includes(term) || (item.partner ?? "").toLowerCase().includes(term)
      );
    });

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const late = daysLate(row.due_date);
        acc.total += row.outstanding;
        if (late <= 0) acc.corrente += row.outstanding;
        else if (late <= 30) acc.ate30 += row.outstanding;
        else if (late <= 90) acc.ate90 += row.outstanding;
        else acc.mais90 += row.outstanding;
        return acc;
      },
      { total: 0, corrente: 0, ate30: 0, ate90: 0, mais90: 0 },
    );
  }, [rows]);

  const title = isReceivable ? "Contas a receber" : "Contas a pagar";
  const description = isReceivable
    ? "Faturas a clientes ainda não liquidadas, com antiguidade dos saldos."
    : "Faturas de fornecedores ainda não pagas, com antiguidade dos saldos.";

  if (!companyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Selecione ou crie uma empresa para ver os saldos.
          </CardContent>
        </Card>
      </div>
    );
  }

  const cards: Array<[string, number]> = [
    ["Total em aberto", summary.total],
    ["Dentro do prazo", summary.corrente],
    ["Até 30 dias de atraso", summary.ate30],
    ["31 a 90 dias", summary.ate90],
    ["Mais de 90 dias", summary.mais90],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
        <CardContent className="space-y-4 p-4">
          <Input
            placeholder={isReceivable ? "Pesquisar por número ou cliente" : "Pesquisar por número ou fornecedor"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>{isReceivable ? "Cliente" : "Fornecedor"}</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Liquidado</TableHead>
                <TableHead className="text-right">Em dívida</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {items.isLoading ? "A carregar…" : "Não há valores em aberto."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const late = daysLate(row.due_date);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.number ?? "—"}</TableCell>
                      <TableCell>{row.partner ?? "—"}</TableCell>
                      <TableCell>{row.issue_date}</TableCell>
                      <TableCell>{row.due_date ?? "—"}</TableCell>
                      <TableCell className="text-right">{eur(row.gross_total)}</TableCell>
                      <TableCell className="text-right">{eur(row.paid_total)}</TableCell>
                      <TableCell className="text-right font-medium">{eur(row.outstanding)}</TableCell>
                      <TableCell>
                        <Badge variant={late > 0 ? "destructive" : "secondary"}>
                          {late > 0 ? `${late} dias de atraso` : "Dentro do prazo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

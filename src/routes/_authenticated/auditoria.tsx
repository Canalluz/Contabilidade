import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/erp/erp-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Gestix ERP" },
      { name: "description", content: "Registo cronológico de todas as operações efetuadas na empresa." },
      { property: "og:title", content: "Auditoria — Gestix ERP" },
      { property: "og:description", content: "Trilho de auditoria completo do ERP." },
    ],
  }),
  component: AuditPage,
});

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  user_id: string;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Alteração",
  delete: "Remoção",
  import: "Importação",
};

const ENTITY_LABELS: Record<string, string> = {
  companies: "Empresa",
  company_users: "Acessos",
  customers: "Clientes",
  suppliers: "Fornecedores",
  products: "Produtos",
};

function AuditPage() {
  const { companyId } = useCompany();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity, entity_id, user_id, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((r) =>
      [ACTION_LABELS[r.action] ?? r.action, ENTITY_LABELS[r.entity] ?? r.entity, r.entity_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data, search]);

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Todas as criações, alterações e remoções ficam registadas com data, hora e autor."
      />

      <Card className="shadow-panel">
        <CardContent className="p-0">
          <div className="border-b border-border p-3">
            <Input
              placeholder="Pesquisar por operação ou módulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Registo</TableHead>
                  <TableHead>Autor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      A carregar...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Sem operações registadas.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="num whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleString("pt-PT")}
                      </TableCell>
                      <TableCell>{ACTION_LABELS[row.action] ?? row.action}</TableCell>
                      <TableCell>{ENTITY_LABELS[row.entity] ?? row.entity}</TableCell>
                      <TableCell className="num text-xs text-muted-foreground">{row.entity_id ?? "—"}</TableCell>
                      <TableCell className="num text-xs text-muted-foreground">{row.user_id.slice(0, 8)}…</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

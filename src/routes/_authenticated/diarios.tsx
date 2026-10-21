import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNTING_ROLES, errorMessage } from "@/lib/erp/accounting";
import { useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/diarios")({
  head: () => ({
    meta: [
      { title: "Diários contabilísticos — Gestix ERP" },
      { name: "description", content: "Diários para organizar os lançamentos contabilísticos." },
      { property: "og:title", content: "Diários contabilísticos — Gestix ERP" },
      { property: "og:description", content: "Gestão de diários de contabilidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JournalsPage,
});

const DEFAULT_JOURNALS = [
  ["VND", "Vendas"],
  ["CMP", "Compras"],
  ["BNC", "Bancos"],
  ["CXA", "Caixa"],
  ["OPD", "Operações diversas"],
] as const;

function JournalsPage() {
  const { companyId, can } = useCompany();
  const qc = useQueryClient();
  const canWrite = can(ACCOUNTING_ROLES);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });

  const journals = useQuery({
    queryKey: ["acc-journals", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_journals")
        .select("id, code, name, active")
        .eq("company_id", companyId!)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = useQuery({
    queryKey: ["acc-journal-counts", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.from("journal_entries").select("journal_id").eq("company_id", companyId!);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const e of data ?? []) map.set(e.journal_id, (map.get(e.journal_id) ?? 0) + 1);
      return map;
    },
  });

  const insert = useMutation({
    mutationFn: async (rows: Array<{ code: string; name: string }>) => {
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("accounting_journals")
        .insert(rows.map((r) => ({ ...r, company_id: companyId! })));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diário guardado.");
      setOpen(false);
      setForm({ code: "", name: "" });
      void qc.invalidateQueries({ queryKey: ["acc-journals"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const existing = new Set((journals.data ?? []).map((j) => j.code));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diários"
        description="Cada lançamento pertence a um diário."
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  insert.mutate(
                    DEFAULT_JOURNALS.filter(([c]) => !existing.has(c)).map(([code, name]) => ({ code, name })),
                  )
                }
              >
                Criar diários habituais
              </Button>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 size-4" /> Novo diário
              </Button>
            </div>
          ) : null
        }
      />
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Lançamentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(journals.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    {journals.isLoading ? "A carregar…" : "Ainda não há diários."}
                  </TableCell>
                </TableRow>
              ) : (
                (journals.data ?? []).map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono">{j.code}</TableCell>
                    <TableCell>{j.name}</TableCell>
                    <TableCell className="text-right">{counts.data?.get(j.id) ?? 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo diário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={insert.isPending}
              onClick={() => {
                if (!form.code.trim() || !form.name.trim()) {
                  toast.error("Preencha código e nome.");
                  return;
                }
                insert.mutate([{ code: form.code.trim(), name: form.name.trim() }]);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

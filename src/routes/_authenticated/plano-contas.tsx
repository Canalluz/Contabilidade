import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNTING_ROLES, errorMessage } from "@/lib/erp/accounting";
import { logAudit, useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/plano-contas")({
  head: () => ({
    meta: [
      { title: "Plano de contas — Gestix ERP" },
      { name: "description", content: "Plano de contas da empresa organizado por classes." },
      { property: "og:title", content: "Plano de contas — Gestix ERP" },
      { property: "og:description", content: "Gestão das contas contabilísticas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChartOfAccountsPage,
});

const BASE_CLASSES = [
  ["1", "Meios financeiros líquidos"],
  ["2", "Contas a receber e a pagar"],
  ["3", "Inventários e ativos biológicos"],
  ["4", "Investimentos"],
  ["5", "Capital, reservas e resultados transitados"],
  ["6", "Gastos"],
  ["7", "Rendimentos"],
  ["8", "Resultados"],
] as const;

function ChartOfAccountsPage() {
  const { companyId, can } = useCompany();
  const qc = useQueryClient();
  const canWrite = can(ACCOUNTING_ROLES);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ code: "", name: "", is_movement: true });

  const accounts = useQuery({
    queryKey: ["acc-accounts", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_accounts")
        .select("id, code, name, class, is_movement, active")
        .eq("company_id", companyId!)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["acc-accounts"] });

  const save = useMutation({
    mutationFn: async () => {
      const code = form.code.trim();
      if (!/^\d+$/.test(code)) throw new Error("O código deve conter apenas algarismos.");
      if (!form.name.trim()) throw new Error("Indique o nome da conta.");
      const { error } = await supabase.from("accounting_accounts").insert({
        company_id: companyId!,
        code,
        name: form.name.trim(),
        class: Number(code[0]),
        is_movement: form.is_movement,
      });
      if (error) throw error;
      await logAudit({ companyId, action: "create", entity: "accounting_account", data: { code } });
    },
    onSuccess: () => {
      toast.success("Conta criada.");
      setOpen(false);
      setForm({ code: "", name: "", is_movement: true });
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const seed = useMutation({
    mutationFn: async () => {
      const existing = new Set((accounts.data ?? []).map((a) => a.code));
      const rows = BASE_CLASSES.filter(([code]) => !existing.has(code)).map(([code, name]) => ({
        company_id: companyId!,
        code,
        name,
        class: Number(code),
        is_movement: false,
      }));
      if (rows.length === 0) return;
      const { error } = await supabase.from("accounting_accounts").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Classes base criadas.");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounting_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta eliminada.");
      invalidate();
    },
    onError: () => toast.error("Não é possível eliminar uma conta com lançamentos."),
  });

  const term = search.trim().toLowerCase();
  const rows = (accounts.data ?? []).filter(
    (a) => !term || a.code.startsWith(term) || a.name.toLowerCase().includes(term),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plano de contas"
        description="Contas organizadas por classe. Só as contas de movimento aceitam lançamentos."
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
                Criar classes base
              </Button>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 size-4" /> Nova conta
              </Button>
            </div>
          ) : null
        }
      />
      <Card>
        <CardContent className="space-y-4 p-4">
          <Input placeholder="Pesquisar por código ou nome" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {accounts.isLoading ? "A carregar…" : "Ainda não há contas. Comece por criar as classes base."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono" style={{ paddingLeft: `${0.5 + (a.code.length - 1) * 0.75}rem` }}>
                      {a.code}
                    </TableCell>
                    <TableCell className={a.is_movement ? "" : "font-semibold"}>{a.name}</TableCell>
                    <TableCell>{a.class}</TableCell>
                    <TableCell>
                      <Badge variant={a.is_movement ? "default" : "secondary"}>
                        {a.is_movement ? "Movimento" : "Agregadora"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite ? (
                        <Button size="icon" variant="ghost" title="Eliminar" onClick={() => remove.mutate(a.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </TableCell>
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
            <DialogTitle>Nova conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Ex.: 12" />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_movement} onCheckedChange={(v) => setForm((f) => ({ ...f, is_movement: v }))} />
              <Label>Conta de movimento (aceita lançamentos)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

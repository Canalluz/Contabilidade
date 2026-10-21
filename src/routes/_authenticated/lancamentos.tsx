import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Eye, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNTING_ROLES, errorMessage, eur } from "@/lib/erp/accounting";
import { logAudit, useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/lancamentos")({
  head: () => ({
    meta: [
      { title: "Lançamentos contabilísticos — Gestix ERP" },
      { name: "description", content: "Lançamentos a débito e crédito com validação de equilíbrio." },
      { property: "og:title", content: "Lançamentos contabilísticos — Gestix ERP" },
      { property: "og:description", content: "Registo de lançamentos por diário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntriesPage,
});

type Line = { account_id: string; description: string; debit: number; credit: number };
const emptyLine = (): Line => ({ account_id: "", description: "", debit: 0, credit: 0 });

type Entry = {
  id: string;
  journal_id: string;
  entry_date: string;
  number: string | null;
  description: string;
  status: string;
};

function EntriesPage() {
  const { companyId, can } = useCompany();
  const qc = useQueryClient();
  const canWrite = can(ACCOUNTING_ROLES);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Entry | null>(null);
  const [header, setHeader] = useState({
    journal_id: "",
    entry_date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

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
  const movementAccounts = (accounts.data ?? []).filter((a) => a.is_movement && a.active);

  const entries = useQuery({
    queryKey: ["acc-entries", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, journal_id, entry_date, number, description, status, journal_entry_lines(debit)")
        .eq("company_id", companyId!)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e) => ({
        ...e,
        total: (e.journal_entry_lines ?? []).reduce((a, l) => a + Number(l.debit), 0),
      }));
    },
  });

  const viewLines = useQuery({
    queryKey: ["acc-entry-lines", view?.id],
    enabled: Boolean(view),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("id, description, debit, credit, accounting_accounts(code, name)")
        .eq("entry_id", view!.id)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const debit = lines.reduce((a, l) => a + (Number(l.debit) || 0), 0);
  const credit = lines.reduce((a, l) => a + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(debit - credit) < 0.005 && debit > 0;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["acc-entries"] });
    void qc.invalidateQueries({ queryKey: ["acc-trial"] });
    void qc.invalidateQueries({ queryKey: ["acc-journal-counts"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!header.journal_id) throw new Error("Escolha o diário.");
      if (!header.description.trim()) throw new Error("Indique a descrição.");
      const valid = lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
      if (valid.length < 2) throw new Error("São precisas pelo menos duas linhas com conta e valor.");
      if (valid.some((l) => Number(l.debit) > 0 && Number(l.credit) > 0))
        throw new Error("Cada linha deve ter só débito ou só crédito.");
      if (!balanced) throw new Error("O total a débito tem de ser igual ao total a crédito.");

      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          company_id: companyId!,
          journal_id: header.journal_id,
          entry_date: header.entry_date,
          description: header.description.trim(),
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: le } = await supabase.from("journal_entry_lines").insert(
        valid.map((l, i) => ({
          company_id: companyId!,
          entry_id: data.id,
          account_id: l.account_id,
          position: i + 1,
          description: l.description || null,
          debit: Number(Number(l.debit).toFixed(2)),
          credit: Number(Number(l.credit).toFixed(2)),
        })),
      );
      if (le) {
        await supabase.from("journal_entries").delete().eq("id", data.id);
        throw le;
      }
      await logAudit({ companyId, action: "create", entity: "journal_entry", entityId: data.id });
    },
    onSuccess: () => {
      toast.success("Lançamento guardado como rascunho.");
      setOpen(false);
      setHeader((h) => ({ ...h, description: "" }));
      setLines([emptyLine(), emptyLine()]);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const post = useMutation({
    mutationFn: async (entry: Entry) => {
      const journal = journals.data?.find((j) => j.id === entry.journal_id);
      const year = entry.entry_date.slice(0, 4);
      const { count, error: ce } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("journal_id", entry.journal_id)
        .eq("status", "lancado")
        .gte("entry_date", `${year}-01-01`)
        .lte("entry_date", `${year}-12-31`);
      if (ce) throw ce;
      const number = `${journal?.code ?? "LC"} ${year}/${String((count ?? 0) + 1).padStart(4, "0")}`;
      const { error } = await supabase
        .from("journal_entries")
        .update({ status: "lancado", number })
        .eq("id", entry.id);
      if (error) throw error;
      await logAudit({ companyId, action: "post", entity: "journal_entry", entityId: entry.id });
    },
    onSuccess: () => {
      toast.success("Lançamento registado.");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (entry: Entry) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rascunho eliminado.");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançamentos"
        description="Registe movimentos a débito e crédito. Só lançamentos equilibrados podem ser guardados."
        actions={
          canWrite ? (
            <Button
              onClick={() => setOpen(true)}
              disabled={(journals.data ?? []).length === 0 || movementAccounts.length === 0}
            >
              <Plus className="mr-2 size-4" /> Novo lançamento
            </Button>
          ) : null
        }
      />
      {(journals.data ?? []).length === 0 || movementAccounts.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Para lançar precisa de pelo menos um diário e de contas de movimento no plano de contas.
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Diário</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(entries.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    {entries.isLoading ? "A carregar…" : "Ainda não há lançamentos."}
                  </TableCell>
                </TableRow>
              ) : (
                (entries.data ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.number ?? "—"}</TableCell>
                    <TableCell>{e.entry_date}</TableCell>
                    <TableCell>{journals.data?.find((j) => j.id === e.journal_id)?.code ?? "—"}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right">{eur(e.total)}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "lancado" ? "default" : "secondary"}>
                        {e.status === "lancado" ? "Lançado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Ver" onClick={() => setView(e)}>
                          <Eye className="size-4" />
                        </Button>
                        {canWrite && e.status === "rascunho" ? (
                          <>
                            <Button size="icon" variant="ghost" title="Lançar" onClick={() => post.mutate(e)}>
                              <CheckCircle2 className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Eliminar" onClick={() => remove.mutate(e)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Diário</Label>
              <Select value={header.journal_id} onValueChange={(v) => setHeader((h) => ({ ...h, journal_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {(journals.data ?? []).map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.code} — {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={header.entry_date}
                onChange={(e) => setHeader((h) => ({ ...h, entry_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={header.description}
                onChange={(e) => setHeader((h) => ({ ...h, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-2 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <Select value={l.account_id} onValueChange={(v) => updateLine(i, { account_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {movementAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  className="sm:col-span-3"
                  placeholder="Descrição"
                  value={l.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                />
                <Input
                  className="sm:col-span-2"
                  type="number"
                  step="0.01"
                  placeholder="Débito"
                  value={l.debit || ""}
                  onChange={(e) => updateLine(i, { debit: Number(e.target.value) })}
                />
                <Input
                  className="sm:col-span-2"
                  type="number"
                  step="0.01"
                  placeholder="Crédito"
                  value={l.credit || ""}
                  onChange={(e) => updateLine(i, { credit: Number(e.target.value) })}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
              <Plus className="mr-2 size-4" /> Adicionar linha
            </Button>
          </div>

          <div className="flex flex-col items-end gap-1 text-sm">
            <span>Débito: {eur(debit)}</span>
            <span>Crédito: {eur(credit)}</span>
            <span className={balanced ? "font-semibold" : "font-semibold text-destructive"}>
              {balanced ? "Lançamento equilibrado" : `Diferença: ${eur(debit - credit)}`}
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !balanced}>
              Guardar rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(view)} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {view?.number ?? "Rascunho"} — {view?.description}
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Débito</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(viewLines.data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    {l.accounting_accounts?.code} — {l.accounting_accounts?.name}
                  </TableCell>
                  <TableCell>{l.description ?? ""}</TableCell>
                  <TableCell className="text-right">{Number(l.debit) ? eur(Number(l.debit)) : ""}</TableCell>
                  <TableCell className="text-right">{Number(l.credit) ? eur(Number(l.credit)) : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useCompany, type AppRole } from "@/lib/erp/company-context";

export type PartnerRow = {
  id: string;
  code: string | null;
  name: string;
  nif: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  contact_name: string | null;
  iban: string | null;
  payment_terms_days: number;
  credit_limit?: number;
  notes: string | null;
  active: boolean;
};

const empty = {
  code: "",
  name: "",
  nif: "",
  address: "",
  postal_code: "",
  city: "",
  email: "",
  phone: "",
  contact_name: "",
  iban: "",
  payment_terms_days: 30,
  credit_limit: 0,
  notes: "",
  active: true,
};

export function PartnerManager({
  table,
  title,
  description,
  withCredit,
  writeRoles,
}: {
  table: "customers" | "suppliers";
  title: string;
  description: string;
  withCredit: boolean;
  writeRoles: AppRole[];
}) {
  const { companyId, can } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...empty });
  const canWrite = can(writeRoles);

  const { data, isLoading } = useQuery({
    queryKey: [table, companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<PartnerRow[]> => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as PartnerRow[];
    },
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (onlyActive && !row.active) return false;
      if (!term) return true;
      return [row.name, row.nif, row.email, row.city, row.code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data, search, onlyActive]);

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa");
      const payload: Record<string, unknown> = {
        company_id: companyId,
        code: form.code || null,
        name: form.name,
        nif: form.nif || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        email: form.email || null,
        phone: form.phone || null,
        contact_name: form.contact_name || null,
        iban: form.iban || null,
        payment_terms_days: Number(form.payment_terms_days) || 0,
        notes: form.notes || null,
        active: form.active,
      };
      if (withCredit) payload["credit_limit"] = Number(form.credit_limit) || 0;

      if (editingId) {
        const { error } = await supabase.from(table).update(payload as never).eq("id", editingId);
        if (error) throw error;
        await logAudit({ companyId, action: "update", entity: table, entityId: editingId });
      } else {
        const { data, error } = await supabase.from(table).insert(payload as never).select("id").single();
        if (error) throw error;
        await logAudit({ companyId, action: "create", entity: table, entityId: (data as { id: string }).id });
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Registo atualizado" : "Registo criado");
      setOpen(false);
      setEditingId(null);
      setForm({ ...empty });
      void queryClient.invalidateQueries({ queryKey: [table, companyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openEdit = (row: PartnerRow) => {
    setEditingId(row.id);
    setForm({
      code: row.code ?? "",
      name: row.name,
      nif: row.nif ?? "",
      address: row.address ?? "",
      postal_code: row.postal_code ?? "",
      city: row.city ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      contact_name: row.contact_name ?? "",
      iban: row.iban ?? "",
      payment_terms_days: row.payment_terms_days,
      credit_limit: row.credit_limit ?? 0,
      notes: row.notes ?? "",
      active: row.active,
    });
    setOpen(true);
  };

  const exportCsv = () => {
    const header = ["Codigo", "Nome", "NIF", "Email", "Telefone", "Localidade", "Prazo", "Ativo"];
    const lines = rows.map((r) =>
      [r.code, r.name, r.nif, r.email, r.phone, r.city, r.payment_terms_days, r.active ? "Sim" : "Não"]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 size-4" /> Exportar CSV
            </Button>
            <Dialog
              open={open}
              onOpenChange={(value) => {
                setOpen(value);
                if (!value) {
                  setEditingId(null);
                  setForm({ ...empty });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" disabled={!canWrite}>
                  <Plus className="mr-2 size-4" /> Novo registo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar registo" : "Novo registo"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Código" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
                  <Field label="NIF" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
                  <div className="sm:col-span-2">
                    <Field label="Nome *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Morada" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                  </div>
                  <Field
                    label="Código postal"
                    value={form.postal_code}
                    onChange={(v) => setForm({ ...form, postal_code: v })}
                  />
                  <Field label="Localidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                  <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                  <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                  <Field
                    label="Pessoa de contacto"
                    value={form.contact_name}
                    onChange={(v) => setForm({ ...form, contact_name: v })}
                  />
                  <Field label="IBAN" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} />
                  <Field
                    label="Condições de pagamento (dias)"
                    type="number"
                    value={String(form.payment_terms_days)}
                    onChange={(v) => setForm({ ...form, payment_terms_days: Number(v) })}
                  />
                  {withCredit ? (
                    <Field
                      label="Limite de crédito (€)"
                      type="number"
                      value={String(form.credit_limit)}
                      onChange={(v) => setForm({ ...form, credit_limit: Number(v) })}
                    />
                  ) : null}
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Observações</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                    <span className="text-sm">Ativo</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => save.mutate()}
                    disabled={!form.name || save.isPending || !canWrite}
                  >
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Card className="shadow-panel">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Pesquisar por nome, NIF, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={onlyActive} onCheckedChange={setOnlyActive} /> Apenas ativos
            </label>
            <span className="text-sm text-muted-foreground">{rows.length} registos</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>NIF</TableHead>
                  <TableHead>Localidade</TableHead>
                  <TableHead>Contactos</TableHead>
                  <TableHead className="text-right">Prazo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      A carregar...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Sem registos.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="num text-muted-foreground">{row.code ?? "—"}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="num">{row.nif ?? "—"}</TableCell>
                      <TableCell>{row.city ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.email ?? "—"}
                        {row.phone ? ` · ${row.phone}` : ""}
                      </TableCell>
                      <TableCell className="num text-right">{row.payment_terms_days} d</TableCell>
                      <TableCell>
                        <Badge variant={row.active ? "default" : "secondary"}>
                          {row.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)} disabled={!canWrite}>
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
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

export function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

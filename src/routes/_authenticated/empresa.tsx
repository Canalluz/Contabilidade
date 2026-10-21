import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Field } from "@/components/erp/partner-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/empresa")({
  head: () => ({
    meta: [
      { title: "Dados da empresa — Gestix ERP" },
      { name: "description", content: "Consulte e atualize os dados fiscais e de contacto da empresa ativa." },
      { property: "og:title", content: "Dados da empresa — Gestix ERP" },
      { property: "og:description", content: "Configuração da empresa ativa no ERP." },
    ],
  }),
  component: CompanySettings,
});

const emptyForm = {
  name: "",
  nif: "",
  trade_name: "",
  address: "",
  postal_code: "",
  city: "",
  cae: "",
  email: "",
  phone: "",
  website: "",
  iban: "",
  vat_regime: "normal",
};

function CompanySettings() {
  const { companyId, can, refresh } = useCompany();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...emptyForm });
  const canEdit = can(["admin", "gestor"]);

  const { data } = useQuery({
    queryKey: ["company", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId!).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name ?? "",
      nif: data.nif ?? "",
      trade_name: data.trade_name ?? "",
      address: data.address ?? "",
      postal_code: data.postal_code ?? "",
      city: data.city ?? "",
      cae: data.cae ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      website: data.website ?? "",
      iban: data.iban ?? "",
      vat_regime: data.vat_regime ?? "normal",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("companies")
        .update({
          name: form.name,
          nif: form.nif,
          trade_name: form.trade_name || null,
          address: form.address || null,
          postal_code: form.postal_code || null,
          city: form.city || null,
          cae: form.cae || null,
          email: form.email || null,
          phone: form.phone || null,
          website: form.website || null,
          iban: form.iban || null,
          vat_regime: form.vat_regime,
        })
        .eq("id", companyId!);
      if (error) throw error;
      await logAudit({ companyId, action: "update", entity: "companies", ...(companyId ? { entityId: companyId } : {}) });
    },
    onSuccess: () => {
      toast.success("Dados da empresa atualizados");
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Dados da empresa"
        description="Informação usada em documentos, comunicações fiscais e contabilidade."
      />
      <Card className="shadow-panel">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Designação social" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="NIF" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
          <Field label="Nome comercial" value={form.trade_name} onChange={(v) => setForm({ ...form, trade_name: v })} />
          <Field label="CAE" value={form.cae} onChange={(v) => setForm({ ...form, cae: v })} />
          <div className="sm:col-span-2">
            <Field label="Morada" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          </div>
          <Field label="Código postal" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
          <Field label="Localidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="IBAN" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} />
          <div className="space-y-1.5">
            <Label>Regime de IVA</Label>
            <Select value={form.vat_regime} onValueChange={(v) => setForm({ ...form, vat_regime: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Regime normal</SelectItem>
                <SelectItem value="isento">Isento</SelectItem>
                <SelectItem value="caixa">Regime de caixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button onClick={() => save.mutate()} disabled={!canEdit || save.isPending}>
              Guardar alterações
            </Button>
          </div>
        </CardContent>
      </Card>
      {!canEdit ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Apenas administradores e gestores podem alterar os dados da empresa.
        </p>
      ) : null}
    </div>
  );
}

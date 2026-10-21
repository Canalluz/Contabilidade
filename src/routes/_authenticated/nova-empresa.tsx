import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Field } from "@/components/erp/partner-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/nova-empresa")({
  head: () => ({
    meta: [
      { title: "Nova empresa — Gestix ERP" },
      { name: "description", content: "Registe uma nova empresa no ERP com dados fiscais e de contacto." },
      { property: "og:title", content: "Nova empresa — Gestix ERP" },
      { property: "og:description", content: "Criação de empresa no ERP multiempresa." },
    ],
  }),
  component: NewCompany,
});

function NewCompany() {
  const navigate = useNavigate();
  const { refresh, selectCompany } = useCompany();
  const [form, setForm] = useState({
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
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .insert({
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
        .select("id")
        .single();
      if (error) throw error;
      await logAudit({ companyId: data.id, action: "create", entity: "companies", entityId: data.id });
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Empresa criada");
      refresh();
      selectCompany(id);
      void navigate({ to: "/dashboard" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nova empresa"
        description="Os dados fiscais são usados nos documentos e nos ficheiros a comunicar à Autoridade Tributária."
      />
      <Card className="shadow-panel">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Designação social *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="NIF *" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
          <Field label="Nome comercial" value={form.trade_name} onChange={(v) => setForm({ ...form, trade_name: v })} />
          <Field label="CAE" value={form.cae} onChange={(v) => setForm({ ...form, cae: v })} />
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
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => void navigate({ to: "/dashboard" })}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={!form.name || !form.nif || create.isPending}>
              Criar empresa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

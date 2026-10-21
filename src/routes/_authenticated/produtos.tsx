import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Field } from "@/components/erp/partner-manager";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useCompany } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e serviços — Gestix ERP" },
      { name: "description", content: "Catálogo de produtos e serviços com preços, IVA e parâmetros de stock." },
      { property: "og:title", content: "Produtos e serviços — Gestix ERP" },
      { property: "og:description", content: "Catálogo central de produtos e serviços do ERP." },
    ],
  }),
  component: ProductsPage,
});

type ProductRow = {
  id: string;
  code: string;
  reference: string | null;
  description: string;
  kind: "produto" | "servico";
  unit: string;
  sale_price: number;
  purchase_price: number;
  vat_rate: number;
  category: string | null;
  barcode: string | null;
  stock_min: number;
  stock_max: number;
  active: boolean;
};

const empty = {
  code: "",
  reference: "",
  description: "",
  kind: "produto" as "produto" | "servico",
  unit: "UN",
  sale_price: 0,
  purchase_price: 0,
  vat_rate: 23,
  category: "",
  barcode: "",
  stock_min: 0,
  stock_max: 0,
  active: true,
};

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

function ProductsPage() {
  const { companyId, can } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"todos" | "produto" | "servico">("todos");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...empty });
  const fileRef = useRef<HTMLInputElement>(null);
  const canWrite = can(["admin", "gestor", "faturacao", "armazem"]);

  const { data, isLoading } = useQuery({
    queryKey: ["products", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId!)
        .order("code");
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    },
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (kindFilter !== "todos" && row.kind !== kindFilter) return false;
      if (!term) return true;
      return [row.code, row.description, row.reference, row.barcode, row.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [data, search, kindFilter]);

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa");
      const payload = {
        company_id: companyId,
        code: form.code,
        reference: form.reference || null,
        description: form.description,
        kind: form.kind,
        unit: form.unit || "UN",
        sale_price: Number(form.sale_price) || 0,
        purchase_price: Number(form.purchase_price) || 0,
        vat_rate: Number(form.vat_rate) || 0,
        category: form.category || null,
        barcode: form.barcode || null,
        stock_min: Number(form.stock_min) || 0,
        stock_max: Number(form.stock_max) || 0,
        active: form.active,
      };
      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit({ companyId, action: "update", entity: "products", entityId: editingId });
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        await logAudit({ companyId, action: "create", entity: "products", entityId: data.id });
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Artigo atualizado" : "Artigo criado");
      setOpen(false);
      setEditingId(null);
      setForm({ ...empty });
      void queryClient.invalidateQueries({ queryKey: ["products", companyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importCsv = async (file: File) => {
    if (!companyId) return;
    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const sep = (headerLine ?? "").includes(";") ? ";" : ",";
    const header = (headerLine ?? "").split(sep).map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const payload = lines.map((line) => {
      const cols = line.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
      const pick = (name: string) => (idx(name) >= 0 ? cols[idx(name)] : "");
      return {
        company_id: companyId,
        code: pick("codigo") || pick("code") || crypto.randomUUID().slice(0, 8),
        reference: pick("referencia") || null,
        description: pick("descricao") || pick("description") || "Sem descrição",
        kind: (pick("tipo") === "servico" ? "servico" : "produto") as "produto" | "servico",
        unit: pick("unidade") || "UN",
        sale_price: Number(pick("preco_venda")?.replace(",", ".")) || 0,
        purchase_price: Number(pick("preco_compra")?.replace(",", ".")) || 0,
        vat_rate: Number(pick("iva")?.replace(",", ".")) || 23,
        category: pick("categoria") || null,
        barcode: pick("codigo_barras") || null,
      };
    });
    const { error } = await supabase.from("products").upsert(payload, { onConflict: "company_id,code" });
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({ companyId, action: "import", entity: "products", data: { count: payload.length } });
    toast.success(`${payload.length} artigos importados`);
    void queryClient.invalidateQueries({ queryKey: ["products", companyId] });
  };

  const exportCsv = () => {
    const header = ["codigo", "referencia", "descricao", "tipo", "unidade", "preco_venda", "preco_compra", "iva", "categoria", "codigo_barras"];
    const lines = rows.map((r) =>
      [r.code, r.reference, r.description, r.kind, r.unit, r.sale_price, r.purchase_price, r.vat_rate, r.category, r.barcode]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (row: ProductRow) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      reference: row.reference ?? "",
      description: row.description,
      kind: row.kind,
      unit: row.unit,
      sale_price: row.sale_price,
      purchase_price: row.purchase_price,
      vat_rate: row.vat_rate,
      category: row.category ?? "",
      barcode: row.barcode ?? "",
      stock_min: row.stock_min,
      stock_max: row.stock_max,
      active: row.active,
    });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Produtos e serviços"
        description="Catálogo central utilizado em vendas, compras, stock e faturação."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importCsv(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!canWrite}>
              <Upload className="mr-2 size-4" /> Importar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 size-4" /> Exportar CSV
            </Button>
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) {
                  setEditingId(null);
                  setForm({ ...empty });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" disabled={!canWrite}>
                  <Plus className="mr-2 size-4" /> Novo artigo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar artigo" : "Novo artigo"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Código *" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
                  <Field label="Referência" value={form.reference} onChange={(v) => setForm({ ...form, reference: v })} />
                  <div className="sm:col-span-2">
                    <Field
                      label="Descrição *"
                      value={form.description}
                      onChange={(v) => setForm({ ...form, description: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select
                      value={form.kind}
                      onValueChange={(v) => setForm({ ...form, kind: v as "produto" | "servico" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="produto">Produto</SelectItem>
                        <SelectItem value="servico">Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Unidade" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
                  <Field
                    label="Preço de venda (€)"
                    type="number"
                    value={String(form.sale_price)}
                    onChange={(v) => setForm({ ...form, sale_price: Number(v) })}
                  />
                  <Field
                    label="Preço de compra (€)"
                    type="number"
                    value={String(form.purchase_price)}
                    onChange={(v) => setForm({ ...form, purchase_price: Number(v) })}
                  />
                  <div className="space-y-1.5">
                    <Label>Taxa de IVA</Label>
                    <Select value={String(form.vat_rate)} onValueChange={(v) => setForm({ ...form, vat_rate: Number(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="23">23% — taxa normal</SelectItem>
                        <SelectItem value="13">13% — taxa intermédia</SelectItem>
                        <SelectItem value="6">6% — taxa reduzida</SelectItem>
                        <SelectItem value="0">0% — isento / não sujeito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Categoria" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
                  <Field label="Código de barras" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} />
                  <Field
                    label="Stock mínimo"
                    type="number"
                    value={String(form.stock_min)}
                    onChange={(v) => setForm({ ...form, stock_min: Number(v) })}
                  />
                  <Field
                    label="Stock máximo"
                    type="number"
                    value={String(form.stock_max)}
                    onChange={(v) => setForm({ ...form, stock_max: Number(v) })}
                  />
                  <div className="flex items-center gap-2">
                    <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                    <span className="text-sm">Ativo</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => save.mutate()}
                    disabled={!form.code || !form.description || save.isPending || !canWrite}
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
                placeholder="Pesquisar por código, descrição, código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="produto">Produtos</SelectItem>
                <SelectItem value="servico">Serviços</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{rows.length} artigos</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Compra</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
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
                      Sem artigos.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="num font-medium">{row.code}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{row.kind}</TableCell>
                      <TableCell className="num text-right">{eur.format(row.sale_price)}</TableCell>
                      <TableCell className="num text-right text-muted-foreground">
                        {eur.format(row.purchase_price)}
                      </TableCell>
                      <TableCell className="num text-right">{row.vat_rate}%</TableCell>
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

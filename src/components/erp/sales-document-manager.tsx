import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useCompany, type AppRole } from "@/lib/erp/company-context";

export type SalesDocType = "orcamento" | "encomenda" | "fatura" | "nota_credito" | "recibo";

type DocStatus = "rascunho" | "emitido" | "aceite" | "recusado" | "anulado" | "pago" | "parcial";

type LineForm = {
  id?: string;
  product_id: string | null;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  vat_rate: number;
};

type DocumentRow = {
  id: string;
  doc_type: SalesDocType;
  number: string | null;
  issue_date: string;
  due_date: string | null;
  status: DocStatus;
  customer_id: string | null;
  customer_name: string | null;
  customer_nif: string | null;
  reference: string | null;
  notes: string | null;
  net_total: number;
  vat_total: number;
  gross_total: number;
  paid_total: number;
};

const STATUS_LABELS: Record<DocStatus, string> = {
  rascunho: "Rascunho",
  emitido: "Emitido",
  aceite: "Aceite",
  recusado: "Recusado",
  anulado: "Anulado",
  pago: "Pago",
  parcial: "Parcial",
};

const WRITE_ROLES: AppRole[] = ["admin", "gestor", "faturacao", "financeiro"];

const eur = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);

const emptyLine = (): LineForm => ({
  product_id: null,
  code: "",
  description: "",
  unit: "UN",
  quantity: 1,
  unit_price: 0,
  discount_pct: 0,
  vat_rate: 23,
});

function computeLine(line: LineForm) {
  const gross = line.quantity * line.unit_price;
  const net = gross * (1 - (line.discount_pct || 0) / 100);
  const vat = net * ((line.vat_rate || 0) / 100);
  return { net, vat, total: net + vat };
}

export function SalesDocumentManager({
  docType,
  title,
  description,
}: {
  docType: SalesDocType;
  title: string;
  description: string;
}) {
  const { companyId, can } = useCompany();
  const queryClient = useQueryClient();
  const canWrite = can(WRITE_ROLES);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | DocStatus>("todos");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocumentRow | null>(null);
  const [previewLines, setPreviewLines] = useState<LineForm[]>([]);

  const [header, setHeader] = useState({
    customer_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    reference: "",
    notes: "",
  });
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [allocationInvoiceId, setAllocationInvoiceId] = useState("");

  const isReceipt = docType === "recibo";

  const documents = useQuery({
    queryKey: ["sales-documents", companyId, docType],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await supabase
        .from("sales_documents")
        .select(
          "id, doc_type, number, issue_date, due_date, status, customer_id, customer_name, customer_nif, reference, notes, net_total, vat_total, gross_total, paid_total",
        )
        .eq("company_id", companyId!)
        .eq("doc_type", docType)
        .order("issue_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });

  const customers = useQuery({
    queryKey: ["customers-min", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, nif, payment_terms_days")
        .eq("company_id", companyId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["products-min", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, code, description, unit, sale_price, vat_rate")
        .eq("company_id", companyId!)
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const openInvoices = useQuery({
    queryKey: ["open-invoices", companyId],
    enabled: Boolean(companyId) && isReceipt,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_documents")
        .select("id, number, customer_id, customer_name, gross_total, paid_total, status")
        .eq("company_id", companyId!)
        .eq("doc_type", "fatura")
        .in("status", ["emitido", "parcial"])
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        const { net, vat, total } = computeLine(line);
        return { net: acc.net + net, vat: acc.vat + vat, total: acc.total + total };
      },
      { net: 0, vat: 0, total: 0 },
    );
  }, [lines]);

  const filtered = (documents.data ?? []).filter((doc) => {
    const term = search.trim().toLowerCase();
    const matchesTerm =
      !term ||
      (doc.number ?? "").toLowerCase().includes(term) ||
      (doc.customer_name ?? "").toLowerCase().includes(term) ||
      (doc.reference ?? "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "todos" || doc.status === statusFilter;
    return matchesTerm && matchesStatus;
  });

  const resetForm = () => {
    setEditingId(null);
    setHeader({
      customer_id: "",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      reference: "",
      notes: "",
    });
    setLines([emptyLine()]);
    setAllocationInvoiceId("");
  };

  const startCreate = () => {
    resetForm();
    setOpen(true);
  };

  const startEdit = async (doc: DocumentRow) => {
    setEditingId(doc.id);
    setHeader({
      customer_id: doc.customer_id ?? "",
      issue_date: doc.issue_date,
      due_date: doc.due_date ?? "",
      reference: doc.reference ?? "",
      notes: doc.notes ?? "",
    });
    const { data } = await supabase
      .from("sales_document_lines")
      .select("id, product_id, code, description, unit, quantity, unit_price, discount_pct, vat_rate")
      .eq("document_id", doc.id)
      .order("position");
    setLines(
      (data ?? []).length > 0
        ? (data ?? []).map((l) => ({
            id: l.id,
            product_id: l.product_id,
            code: l.code ?? "",
            description: l.description,
            unit: l.unit,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
            discount_pct: Number(l.discount_pct),
            vat_rate: Number(l.vat_rate),
          }))
        : [emptyLine()],
    );
    setOpen(true);
  };

  const showPreview = async (doc: DocumentRow) => {
    const { data } = await supabase
      .from("sales_document_lines")
      .select("id, product_id, code, description, unit, quantity, unit_price, discount_pct, vat_rate")
      .eq("document_id", doc.id)
      .order("position");
    setPreviewLines(
      (data ?? []).map((l) => ({
        id: l.id,
        product_id: l.product_id,
        code: l.code ?? "",
        description: l.description,
        unit: l.unit,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount_pct: Number(l.discount_pct),
        vat_rate: Number(l.vat_rate),
      })),
    );
    setPreview(doc);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa.");
      const validLines = lines.filter((l) => l.description.trim() !== "");
      if (validLines.length === 0) throw new Error("Adicione pelo menos uma linha com descrição.");
      const customer = customers.data?.find((c) => c.id === header.customer_id);

      const totalsNow = validLines.reduce(
        (acc, line) => {
          const { net, vat, total } = computeLine(line);
          return { net: acc.net + net, vat: acc.vat + vat, total: acc.total + total };
        },
        { net: 0, vat: 0, total: 0 },
      );

      const payload = {
        company_id: companyId,
        doc_type: docType,
        customer_id: header.customer_id || null,
        customer_name: customer?.name ?? null,
        customer_nif: customer?.nif ?? null,
        issue_date: header.issue_date,
        due_date: header.due_date || null,
        reference: header.reference || null,
        notes: header.notes || null,
        net_total: Number(totalsNow.net.toFixed(2)),
        vat_total: Number(totalsNow.vat.toFixed(2)),
        gross_total: Number(totalsNow.total.toFixed(2)),
      };

      let documentId = editingId;
      if (editingId) {
        const { error } = await supabase.from("sales_documents").update(payload).eq("id", editingId);
        if (error) throw error;
        await supabase.from("sales_document_lines").delete().eq("document_id", editingId);
      } else {
        const { data, error } = await supabase
          .from("sales_documents")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        documentId = data.id;
      }

      const lineRows = validLines.map((line, index) => {
        const { net, vat, total } = computeLine(line);
        return {
          document_id: documentId!,
          company_id: companyId,
          position: index + 1,
          product_id: line.product_id,
          code: line.code || null,
          description: line.description,
          unit: line.unit || "UN",
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount_pct: line.discount_pct,
          vat_rate: line.vat_rate,
          net_amount: Number(net.toFixed(2)),
          vat_amount: Number(vat.toFixed(2)),
          total_amount: Number(total.toFixed(2)),
        };
      });
      const { error: linesError } = await supabase.from("sales_document_lines").insert(lineRows);
      if (linesError) throw linesError;

      if (isReceipt && allocationInvoiceId && documentId) {
        await supabase.from("receipt_allocations").upsert(
          {
            company_id: companyId,
            receipt_id: documentId,
            invoice_id: allocationInvoiceId,
            amount: Number(totalsNow.total.toFixed(2)),
          },
          { onConflict: "receipt_id,invoice_id" },
        );
      }

      await logAudit({
        companyId,
        action: editingId ? "update" : "create",
        entity: `sales_document:${docType}`,
        ...(documentId ? { entityId: documentId } : {}),
      });
      return documentId;
    },
    onSuccess: () => {
      toast.success("Documento guardado.");
      setOpen(false);
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["sales-documents"] });
      void queryClient.invalidateQueries({ queryKey: ["open-invoices"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar."),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ doc, status }: { doc: DocumentRow; status: DocStatus }) => {
      const { error } = await supabase.from("sales_documents").update({ status }).eq("id", doc.id);
      if (error) throw error;

      if (isReceipt && status === "emitido") {
        const { data: allocations } = await supabase
          .from("receipt_allocations")
          .select("invoice_id, amount")
          .eq("receipt_id", doc.id);
        for (const allocation of allocations ?? []) {
          const { data: invoice } = await supabase
            .from("sales_documents")
            .select("gross_total, paid_total")
            .eq("id", allocation.invoice_id)
            .single();
          if (!invoice) continue;
          const paid = Number(invoice.paid_total) + Number(allocation.amount);
          await supabase
            .from("sales_documents")
            .update({
              paid_total: paid,
              status: paid + 0.005 >= Number(invoice.gross_total) ? "pago" : "parcial",
            })
            .eq("id", allocation.invoice_id);
        }
      }

      await logAudit({
        companyId,
        action: status === "anulado" ? "cancel" : "issue",
        entity: `sales_document:${docType}`,
        entityId: doc.id,
      });
    },
    onSuccess: () => {
      toast.success("Estado atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["sales-documents"] });
      void queryClient.invalidateQueries({ queryKey: ["open-invoices"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o estado."),
  });

  const removeDraft = useMutation({
    mutationFn: async (doc: DocumentRow) => {
      const { error } = await supabase.from("sales_documents").delete().eq("id", doc.id);
      if (error) throw error;
      await logAudit({ companyId, action: "delete", entity: `sales_document:${docType}`, entityId: doc.id });
    },
    onSuccess: () => {
      toast.success("Rascunho eliminado.");
      void queryClient.invalidateQueries({ queryKey: ["sales-documents"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível eliminar."),
  });

  if (!companyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Selecione ou crie uma empresa para trabalhar com documentos.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          canWrite ? (
            <Button onClick={startCreate}>
              <Plus className="mr-2 size-4" /> Novo
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Pesquisar por número, cliente ou referência"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="sm:w-52">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estados</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {documents.isLoading ? "A carregar…" : "Ainda não há documentos."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.number ?? "—"}</TableCell>
                    <TableCell>{doc.issue_date}</TableCell>
                    <TableCell>{doc.customer_name ?? "—"}</TableCell>
                    <TableCell className="text-right">{eur(Number(doc.net_total))}</TableCell>
                    <TableCell className="text-right">{eur(Number(doc.vat_total))}</TableCell>
                    <TableCell className="text-right font-medium">{eur(Number(doc.gross_total))}</TableCell>
                    <TableCell>
                      <Badge variant={doc.status === "rascunho" ? "secondary" : "default"}>
                        {STATUS_LABELS[doc.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => void showPreview(doc)} title="Ver">
                          <Printer className="size-4" />
                        </Button>
                        {canWrite && doc.status === "rascunho" ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => void startEdit(doc)} title="Editar">
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Emitir"
                              onClick={() => changeStatus.mutate({ doc, status: "emitido" })}
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Eliminar rascunho"
                              onClick={() => removeDraft.mutate(doc)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        ) : null}
                        {canWrite && doc.status !== "rascunho" && doc.status !== "anulado" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Anular"
                            onClick={() => changeStatus.mutate({ doc, status: "anulado" })}
                          >
                            <Ban className="size-4" />
                          </Button>
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

      <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : (setOpen(false), resetForm()))}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar documento" : `Novo ${title.toLowerCase()}`}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label>Cliente</Label>
              <Select
                value={header.customer_id}
                onValueChange={(value) => {
                  const customer = customers.data?.find((c) => c.id === value);
                  const days = customer?.payment_terms_days ?? 30;
                  const due = new Date(header.issue_date);
                  due.setDate(due.getDate() + days);
                  setHeader((h) => ({ ...h, customer_id: value, due_date: due.toISOString().slice(0, 10) }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {(customers.data ?? []).map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={header.issue_date}
                onChange={(event) => setHeader((h) => ({ ...h, issue_date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={header.due_date}
                onChange={(event) => setHeader((h) => ({ ...h, due_date: event.target.value }))}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Referência</Label>
              <Input
                value={header.reference}
                onChange={(event) => setHeader((h) => ({ ...h, reference: event.target.value }))}
              />
            </div>
            {isReceipt ? (
              <div className="space-y-2 lg:col-span-2">
                <Label>Fatura a liquidar</Label>
                <Select value={allocationInvoiceId} onValueChange={setAllocationInvoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar fatura em aberto" />
                  </SelectTrigger>
                  <SelectContent>
                    {(openInvoices.data ?? []).map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.number} — {invoice.customer_name} —{" "}
                        {eur(Number(invoice.gross_total) - Number(invoice.paid_total))} em dívida
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Linhas</Label>
              <Button size="sm" variant="outline" onClick={() => setLines((l) => [...l, emptyLine()])}>
                <Plus className="mr-2 size-4" /> Adicionar linha
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => {
                const computed = computeLine(line);
                return (
                  <div key={index} className="grid gap-2 rounded-md border p-3 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <Label className="text-xs">Artigo</Label>
                      <Select
                        value={line.product_id ?? ""}
                        onValueChange={(value) => {
                          const product = products.data?.find((p) => p.id === value);
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    product_id: value,
                                    code: product?.code ?? "",
                                    description: product?.description ?? item.description,
                                    unit: product?.unit ?? item.unit,
                                    unit_price: Number(product?.sale_price ?? item.unit_price),
                                    vat_rate: Number(product?.vat_rate ?? item.vat_rate),
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          {(products.data ?? []).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.code} — {product.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="lg:col-span-3">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={line.description}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, description: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Qtd.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.quantity}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, quantity: Number(event.target.value) } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Preço</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, unit_price: Number(event.target.value) } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Desc. %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.discount_pct}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, discount_pct: Number(event.target.value) } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">IVA %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.vat_rate}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, vat_rate: Number(event.target.value) } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex items-end justify-between gap-2 lg:col-span-2">
                      <span className="text-sm font-medium">{eur(computed.total)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={header.notes}
              onChange={(event) => setHeader((h) => ({ ...h, notes: event.target.value }))}
            />
          </div>

          <div className="flex flex-col items-end gap-1 text-sm">
            <span>Base tributável: {eur(totals.net)}</span>
            <span>IVA: {eur(totals.vat)}</span>
            <span className="text-base font-semibold">Total: {eur(totals.total)}</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => (setOpen(false), resetForm())}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !canWrite}>
              Guardar rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(preview)} onOpenChange={(value) => !value && setPreview(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {title} {preview?.number ?? "(rascunho)"}
            </DialogTitle>
          </DialogHeader>
          {preview ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{preview.customer_name ?? "—"}</p>
                  <p>{preview.customer_nif ? `NIF ${preview.customer_nif}` : ""}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-muted-foreground">Data</p>
                  <p>{preview.issue_date}</p>
                  {preview.due_date ? <p>Vencimento: {preview.due_date}</p> : null}
                  <p>Estado: {STATUS_LABELS[preview.status]}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewLines.map((line, index) => (
                    <TableRow key={line.id ?? index}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{eur(line.unit_price)}</TableCell>
                      <TableCell className="text-right">{line.vat_rate}%</TableCell>
                      <TableCell className="text-right">{eur(computeLine(line).total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col items-end gap-1">
                <span>Base: {eur(Number(preview.net_total))}</span>
                <span>IVA: {eur(Number(preview.vat_total))}</span>
                <span className="font-semibold">Total: {eur(Number(preview.gross_total))}</span>
              </div>
              {preview.notes ? <p className="text-muted-foreground">{preview.notes}</p> : null}
              <p className="text-xs text-muted-foreground">
                Documento interno de gestão. O software não está certificado pela AT.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

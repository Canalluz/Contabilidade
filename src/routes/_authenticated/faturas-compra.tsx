import { createFileRoute } from "@tanstack/react-router";

import { PurchaseDocumentManager } from "@/components/erp/purchase-document-manager";

export const Route = createFileRoute("/_authenticated/faturas-compra")({
  head: () => ({
    meta: [
      { title: "Faturas de compra — Gestix ERP" },
      { name: "description", content: "Registo de faturas de fornecedores com IVA e vencimentos." },
      { property: "og:title", content: "Faturas de compra — Gestix ERP" },
      { property: "og:description", content: "Faturas de fornecedores e valores em dívida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PurchaseDocumentManager
      docType="fatura_compra"
      title="Faturas de compra"
      description="Registo interno das faturas recebidas de fornecedores."
    />
  ),
});

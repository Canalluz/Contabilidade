import { createFileRoute } from "@tanstack/react-router";

import { PurchaseDocumentManager } from "@/components/erp/purchase-document-manager";

export const Route = createFileRoute("/_authenticated/encomendas-compra")({
  head: () => ({
    meta: [
      { title: "Encomendas a fornecedor — Gestix ERP" },
      { name: "description", content: "Encomendas a fornecedores com artigos, quantidades e IVA." },
      { property: "og:title", content: "Encomendas a fornecedor — Gestix ERP" },
      { property: "og:description", content: "Gestão de encomendas de compra por empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PurchaseDocumentManager
      docType="encomenda_compra"
      title="Encomendas a fornecedor"
      description="Encomendas de compra com numeração automática por ano."
    />
  ),
});

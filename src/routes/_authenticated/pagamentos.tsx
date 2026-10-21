import { createFileRoute } from "@tanstack/react-router";

import { PurchaseDocumentManager } from "@/components/erp/purchase-document-manager";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos a fornecedores — Gestix ERP" },
      { name: "description", content: "Pagamentos a fornecedores associados a faturas de compra." },
      { property: "og:title", content: "Pagamentos a fornecedores — Gestix ERP" },
      { property: "og:description", content: "Liquidação de faturas de compra em aberto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PurchaseDocumentManager
      docType="pagamento"
      title="Pagamentos"
      description="Pagamentos a fornecedores. Ao emitir, a fatura de compra escolhida fica paga ou parcialmente paga."
    />
  ),
});

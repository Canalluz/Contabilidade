import { createFileRoute } from "@tanstack/react-router";

import { SalesDocumentManager } from "@/components/erp/sales-document-manager";

export const Route = createFileRoute("/_authenticated/notas-credito")({
  head: () => ({
    meta: [
      { title: "Notas de crédito — Gestix ERP" },
      { name: "description", content: "Notas de crédito a clientes para correções e devoluções." },
      { property: "og:title", content: "Notas de crédito — Gestix ERP" },
      { property: "og:description", content: "Correções e devoluções sobre faturas de clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SalesDocumentManager
      docType="nota_credito"
      title="Notas de crédito"
      description="Correções e devoluções sobre documentos de venda já emitidos."
    />
  ),
});

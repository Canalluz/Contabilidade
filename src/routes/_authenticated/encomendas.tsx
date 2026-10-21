import { createFileRoute } from "@tanstack/react-router";

import { SalesDocumentManager } from "@/components/erp/sales-document-manager";

export const Route = createFileRoute("/_authenticated/encomendas")({
  head: () => ({
    meta: [
      { title: "Encomendas de clientes — Gestix ERP" },
      { name: "description", content: "Registo e acompanhamento de encomendas de clientes." },
      { property: "og:title", content: "Encomendas de clientes — Gestix ERP" },
      { property: "og:description", content: "Encomendas com artigos, quantidades e totais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SalesDocumentManager
      docType="encomenda"
      title="Encomendas"
      description="Encomendas de clientes, prontas a converter em fatura quando forem satisfeitas."
    />
  ),
});

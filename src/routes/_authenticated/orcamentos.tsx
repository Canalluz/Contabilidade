import { createFileRoute } from "@tanstack/react-router";

import { SalesDocumentManager } from "@/components/erp/sales-document-manager";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Gestix ERP" },
      { name: "description", content: "Criação e acompanhamento de orçamentos a clientes." },
      { property: "og:title", content: "Orçamentos — Gestix ERP" },
      { property: "og:description", content: "Orçamentos com linhas, IVA e totais automáticos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SalesDocumentManager
      docType="orcamento"
      title="Orçamentos"
      description="Propostas a clientes com linhas de artigos, descontos, IVA e totais automáticos."
    />
  ),
});

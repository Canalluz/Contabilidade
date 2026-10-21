import { createFileRoute } from "@tanstack/react-router";

import { SalesDocumentManager } from "@/components/erp/sales-document-manager";

export const Route = createFileRoute("/_authenticated/recibos")({
  head: () => ({
    meta: [
      { title: "Recibos — Gestix ERP" },
      { name: "description", content: "Registo de recebimentos de clientes e liquidação de faturas." },
      { property: "og:title", content: "Recibos — Gestix ERP" },
      { property: "og:description", content: "Recebimentos ligados às faturas em aberto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SalesDocumentManager
      docType="recibo"
      title="Recibos"
      description="Recebimentos de clientes. Ao emitir o recibo, a fatura escolhida fica marcada como paga ou parcialmente paga."
    />
  ),
});

import { createFileRoute } from "@tanstack/react-router";

import { SalesDocumentManager } from "@/components/erp/sales-document-manager";

export const Route = createFileRoute("/_authenticated/faturas")({
  head: () => ({
    meta: [
      { title: "Faturas — Gestix ERP" },
      { name: "description", content: "Emissão interna de faturas a clientes com IVA e totais." },
      { property: "og:title", content: "Faturas — Gestix ERP" },
      { property: "og:description", content: "Faturação de clientes com numeração automática." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SalesDocumentManager
      docType="fatura"
      title="Faturas"
      description="Faturas a clientes com numeração automática por ano. Documento de gestão interna — o software não está certificado pela AT."
    />
  ),
});

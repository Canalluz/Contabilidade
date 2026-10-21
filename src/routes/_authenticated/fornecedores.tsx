import { createFileRoute } from "@tanstack/react-router";

import { PartnerManager } from "@/components/erp/partner-manager";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — Gestix ERP" },
      { name: "description", content: "Base de fornecedores partilhada por compras, pagamentos e contabilidade." },
      { property: "og:title", content: "Fornecedores — Gestix ERP" },
      { property: "og:description", content: "Gestão centralizada de fornecedores do ERP." },
    ],
  }),
  component: () => (
    <PartnerManager
      table="suppliers"
      title="Fornecedores"
      description="Base única de fornecedores, utilizada em compras, contas a pagar e contabilidade."
      withCredit={false}
      writeRoles={["admin", "gestor", "financeiro", "contabilista"]}
    />
  ),
});

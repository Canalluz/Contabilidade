import { createFileRoute } from "@tanstack/react-router";

import { PartnerManager } from "@/components/erp/partner-manager";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Gestix ERP" },
      { name: "description", content: "Ficha de clientes, condições de pagamento e limites de crédito." },
      { property: "og:title", content: "Clientes — Gestix ERP" },
      { property: "og:description", content: "Gestão centralizada de clientes do ERP." },
    ],
  }),
  component: () => (
    <PartnerManager
      table="customers"
      title="Clientes"
      description="Base única de clientes, utilizada em vendas, faturação, contas correntes e contabilidade."
      withCredit
      writeRoles={["admin", "gestor", "faturacao", "financeiro", "contabilista"]}
    />
  ),
});

import { createFileRoute } from "@tanstack/react-router";

import { OpenItemsManager } from "@/components/erp/open-items";

export const Route = createFileRoute("/_authenticated/contas-pagar")({
  head: () => ({
    meta: [
      { title: "Contas a pagar — Gestix ERP" },
      { name: "description", content: "Faturas de fornecedores em aberto e prazos de pagamento." },
      { property: "og:title", content: "Contas a pagar — Gestix ERP" },
      { property: "og:description", content: "Controlo de pagamentos por fornecedor e prazo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <OpenItemsManager kind="pagar" />,
});

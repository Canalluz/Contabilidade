import { createFileRoute } from "@tanstack/react-router";

import { OpenItemsManager } from "@/components/erp/open-items";

export const Route = createFileRoute("/_authenticated/contas-receber")({
  head: () => ({
    meta: [
      { title: "Contas a receber — Gestix ERP" },
      { name: "description", content: "Faturas de clientes em aberto e antiguidade de saldos." },
      { property: "og:title", content: "Contas a receber — Gestix ERP" },
      { property: "og:description", content: "Controlo de cobranças por cliente e prazo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <OpenItemsManager kind="receber" />,
});

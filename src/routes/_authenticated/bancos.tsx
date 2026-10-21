import { createFileRoute } from "@tanstack/react-router";

import { TreasuryManager } from "@/components/erp/treasury-manager";

export const Route = createFileRoute("/_authenticated/bancos")({
  head: () => ({
    meta: [
      { title: "Bancos — Gestix ERP" },
      { name: "description", content: "Contas bancárias, movimentos e saldos da empresa." },
      { property: "og:title", content: "Bancos — Gestix ERP" },
      { property: "og:description", content: "Gestão de contas bancárias e movimentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <TreasuryManager kind="banco" />,
});

import { createFileRoute } from "@tanstack/react-router";

import { TreasuryManager } from "@/components/erp/treasury-manager";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa — Gestix ERP" },
      { name: "description", content: "Entradas e saídas de dinheiro em caixa com saldos atualizados." },
      { property: "og:title", content: "Caixa — Gestix ERP" },
      { property: "og:description", content: "Movimentos de caixa da empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <TreasuryManager kind="caixa" />,
});

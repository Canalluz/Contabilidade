import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestix ERP — Gestão empresarial para Portugal" },
      {
        name: "description",
        content:
          "ERP multiempresa para empresas portuguesas: clientes, fornecedores, artigos, contabilidade, tesouraria e recursos humanos numa única base de dados.",
      },
      { property: "og:title", content: "Gestix ERP — Gestão empresarial para Portugal" },
      {
        property: "og:description",
        content: "Plataforma integrada de gestão para empresas em Portugal, com dados isolados por empresa e auditoria completa.",
      },
    ],
  }),
  component: Landing,
});

const MODULES = [
  ["Vendas e faturação", "Clientes, orçamentos, encomendas, faturas e recibos."],
  ["Compras", "Fornecedores, encomendas, faturas e pagamentos."],
  ["Financeiro", "Contas correntes, bancos, caixa e fluxo de tesouraria."],
  ["Contabilidade", "Plano de contas, diários, lançamentos e balancetes."],
  ["Stock", "Artigos, armazéns, movimentos e inventário."],
  ["Recursos humanos", "Funcionários, presenças, férias e processamento."],
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              PT
            </span>
            <span className="font-display text-lg font-semibold">Gestix ERP</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Toda a gestão da sua empresa numa plataforma só
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            Vendas, compras, tesouraria, contabilidade, stock e pessoas ligados entre si, com dados totalmente
            separados por empresa e registo de auditoria de todas as operações.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Começar agora</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-5 px-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(([title, text]) => (
              <div key={title} className="rounded-lg border border-border bg-card p-5">
                <h2 className="font-display text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-8 text-xs text-muted-foreground">
          Este software não é certificado pela Autoridade Tributária. A certificação depende de processo oficial junto
          da AT.
        </div>
      </footer>
    </div>
  );
}

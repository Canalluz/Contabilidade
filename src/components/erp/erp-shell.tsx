import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  BookOpen,
  Boxes,
  Building2,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  UsersRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useCompany } from "@/lib/erp/company-context";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to?: string; soon?: boolean };
type NavGroup = { label: string; icon: typeof LayoutDashboard; items: NavItem[] };

const NAV: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, items: [{ label: "Visão geral", to: "/dashboard" }] },
  {
    label: "Vendas",
    icon: Receipt,
    items: [
      { label: "Clientes", to: "/clientes" },
      { label: "Orçamentos", to: "/orcamentos" },
      { label: "Encomendas", to: "/encomendas" },
      { label: "Faturas", to: "/faturas" },
      { label: "Notas de crédito", to: "/notas-credito" },
      { label: "Recibos", to: "/recibos" },
    ],
  },
  {
    label: "Compras",
    icon: ShoppingCart,
    items: [
      { label: "Fornecedores", to: "/fornecedores" },
      { label: "Encomendas", to: "/encomendas-compra" },
      { label: "Faturas", to: "/faturas-compra" },
      { label: "Pagamentos", to: "/pagamentos" },
    ],
  },
  {
    label: "Financeiro",
    icon: Banknote,
    items: [
      { label: "Contas a receber", to: "/contas-receber" },
      { label: "Contas a pagar", to: "/contas-pagar" },
      { label: "Bancos", to: "/bancos" },
      { label: "Caixa", to: "/caixa" },
      { label: "Fluxo de caixa", to: "/fluxo-caixa" },
    ],
  },
  {
    label: "Contabilidade",
    icon: BookOpen,
    items: [
      { label: "Plano de contas", to: "/plano-contas" },
      { label: "Diários", to: "/diarios" },
      { label: "Lançamentos", to: "/lancamentos" },
      { label: "Balancete", to: "/balancete" },
      { label: "Fechos", to: "/fechos" },
    ],
  },
  {
    label: "Stock",
    icon: Boxes,
    items: [
      { label: "Produtos e serviços", to: "/produtos" },
      { label: "Armazéns", soon: true },
      { label: "Movimentos", soon: true },
      { label: "Inventário", soon: true },
    ],
  },
  {
    label: "Recursos Humanos",
    icon: UsersRound,
    items: [
      { label: "Funcionários", soon: true },
      { label: "Presenças", soon: true },
      { label: "Férias", soon: true },
      { label: "Salários", soon: true },
    ],
  },
  {
    label: "AT e Fiscalidade",
    icon: FileText,
    items: [
      { label: "Séries e ATCUD", soon: true },
      { label: "Comunicação AT", soon: true },
      { label: "SAF-T", soon: true },
      { label: "IVA", soon: true },
    ],
  },
  {
    label: "Administração",
    icon: Settings,
    items: [
      { label: "Empresa", to: "/empresa" },
      { label: "Utilizadores e permissões", to: "/utilizadores" },
      { label: "Auditoria", to: "/auditoria" },
    ],
  },
];

const GROUP_ICON_FALLBACK: Record<string, typeof Users> = {
  Clientes: Users,
  Fornecedores: Truck,
  "Produtos e serviços": Package,
  Auditoria: ScrollText,
  "Utilizadores e permissões": ShieldCheck,
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
          PT
        </span>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold text-sidebar-accent-foreground">Gestix ERP</p>
          <p className="text-[11px] text-sidebar-foreground/60">Gestão empresarial</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="flex items-center gap-2 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              <group.icon className="size-3.5" />
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = GROUP_ICON_FALLBACK[item.label];
                if (item.soon || !item.to) {
                  return (
                    <li
                      key={item.label}
                      className="flex cursor-not-allowed items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground/35"
                      title="Módulo em preparação"
                    >
                      <span>{item.label}</span>
                      <span className="rounded border border-sidebar-border px-1 text-[9px] uppercase">em breve</span>
                    </li>
                  );
                }
                const active = pathname === item.to;
                return (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {Icon ? <Icon className="size-3.5 opacity-70" /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/50">
        Fase 1 ativa · software não certificado pela AT
      </div>
    </div>
  );
}

export function ErpShell({ children }: { children: ReactNode }) {
  const { companies, company, roles, selectCompany } = useCompany();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">
          <SidebarContent />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-panel">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur sm:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>

          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Pesquisa global (clientes, produtos, documentos)"
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="max-w-[220px] gap-2">
                  <Building2 className="size-4 shrink-0" />
                  <span className="truncate">{company?.name ?? "Sem empresa"}</span>
                  <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Empresas</DropdownMenuLabel>
                {companies.map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => selectCompany(c.id)}>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{c.nif}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void navigate({ to: "/nova-empresa" })}>
                  Criar nova empresa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {roles.map((r) => ROLE_LABELS[r]).join(", ") || "—"}
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    EU
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void navigate({ to: "/empresa" })}>
                  <Settings className="mr-2 size-4" /> Configurações da empresa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 size-4" /> Terminar sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-7">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Gestix ERP Portugal" },
      {
        name: "description",
        content:
          "Inicie sessão no Gestix ERP: faturação, contabilidade, financeiro, stock e RH para empresas em Portugal.",
      },
      { property: "og:title", content: "Entrar — Gestix ERP Portugal" },
      {
        property: "og:description",
        content: "Acesso ao ERP multiempresa para gestão fiscal, contabilística e operacional em Portugal.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const translateError = (message: string) => {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials"))
      return "Email ou palavra-passe incorretos. Se ainda não tem conta, crie uma primeiro.";
    if (m.includes("weak") || m.includes("pwned"))
      return "Palavra-passe demasiado fraca ou já divulgada em fugas de dados. Use pelo menos 10 caracteres, com letras, números e símbolos.";
    if (m.includes("password should be at least"))
      return "A palavra-passe é demasiado curta. Use pelo menos 8 caracteres.";
    if (m.includes("email not confirmed"))
      return "Ainda falta confirmar o email. Verifique a sua caixa de correio.";
    if (m.includes("already registered") || m.includes("user already"))
      return "Já existe uma conta com este email. Inicie sessão.";
    if (m.includes("rate limit") || m.includes("too many"))
      return "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.";
    return message;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada com sucesso.");
          void navigate({ to: "/dashboard" });
        } else {
          toast.success(
            "Conta criada. Enviámos um email de confirmação — clique na ligação e depois inicie sessão.",
          );
          setMode("login");
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? translateError(error.message) : "Não foi possível autenticar",
      );
    } finally {
      setLoading(false);
    }
  };


  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível iniciar sessão com a Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            PT
          </span>
          <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">Gestix ERP</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-semibold text-sidebar-accent-foreground">
            ERP integrado para empresas portuguesas
          </h1>
          <p className="mt-4 text-sm text-sidebar-foreground/70">
            Faturação, contabilidade por partidas dobradas, tesouraria, stock, ativos e recursos humanos numa base de
            dados central e multiempresa, com auditoria completa de todas as operações.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-sidebar-foreground/80">
            <li>· Isolamento total de dados por empresa</li>
            <li>· Motores fiscal, contabilístico, financeiro e documental separados</li>
            <li>· Arquitetura preparada para SAF-T, ATCUD e comunicação à AT</li>
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          Este software não é certificado pela Autoridade Tributária. A certificação depende de processo oficial.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold">{mode === "login" ? "Iniciar sessão" : "Criar conta"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Acesso ao painel de gestão." : "Comece por registar a sua empresa."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={() => void google()}>
            Continuar com Google
          </Button>

          <button
            type="button"
            className="mt-6 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Não tem conta? Criar conta" : "Já tem conta? Iniciar sessão"}
          </button>
        </div>
      </div>
    </div>
  );
}

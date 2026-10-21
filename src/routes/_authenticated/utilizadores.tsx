import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, logAudit, useCompany, type AppRole } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated/utilizadores")({
  head: () => ({
    meta: [
      { title: "Utilizadores e permissões — Gestix ERP" },
      { name: "description", content: "Gestão de acessos por perfil: administração, faturação, contabilidade e mais." },
      { property: "og:title", content: "Utilizadores e permissões — Gestix ERP" },
      { property: "og:description", content: "Controlo de perfis e permissões por empresa." },
    ],
  }),
  component: UsersPage,
});

type MemberRow = { id: string; user_id: string; role: AppRole };

function UsersPage() {
  const { companyId, can } = useCompany();
  const queryClient = useQueryClient();
  const isAdmin = can(["admin"]);

  const { data, isLoading } = useQuery({
    queryKey: ["company-users", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from("company_users")
        .select("id, user_id, role")
        .eq("company_id", companyId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase.from("company_users").update({ role }).eq("id", id);
      if (error) throw error;
      await logAudit({ companyId, action: "update", entity: "company_users", entityId: id, data: { role } });
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      void queryClient.invalidateQueries({ queryKey: ["company-users", companyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_users").delete().eq("id", id);
      if (error) throw error;
      await logAudit({ companyId, action: "delete", entity: "company_users", entityId: id });
    },
    onSuccess: () => {
      toast.success("Acesso removido");
      void queryClient.invalidateQueries({ queryKey: ["company-users", companyId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="Utilizadores e permissões"
        description="Cada pessoa tem um perfil por empresa, que determina o que pode ver e alterar."
      />

      <Card className="shadow-panel">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizador</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : (data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    Sem acessos registados.
                  </TableCell>
                </TableRow>
              ) : (
                (data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="num text-xs">{row.user_id}</TableCell>
                    <TableCell>
                      <Select
                        value={row.role}
                        onValueChange={(v) => changeRole.mutate({ id: row.id, role: v as AppRole })}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!isAdmin}
                        onClick={() => removeMember.mutate(row.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Como convidar pessoas</p>
        <p className="mt-1">
          De momento, a pessoa deve criar conta na página de entrada. Depois de o fazer, um administrador atribui-lhe o
          perfil nesta página. O convite por email fica disponível numa fase seguinte.
        </p>
      </div>
    </div>
  );
}

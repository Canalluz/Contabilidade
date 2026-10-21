import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/erp/erp-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useCompany, type AppRole } from "@/lib/erp/company-context";

const WRITE_ROLES: AppRole[] = ["admin", "gestor", "financeiro"];

const eur = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);

type Account = {
  id: string;
  kind: "banco" | "caixa";
  name: string;
  bank_name: string | null;
  iban: string | null;
  opening_balance: number;
  active: boolean;
};

type Movement = {
  id: string;
  account_id: string;
  movement_date: string;
  direction: "entrada" | "saida";
  amount: number;
  description: string;
  category: string | null;
  method: string | null;
  reference: string | null;
};

export function TreasuryManager({ kind }: { kind: "banco" | "caixa" }) {
  const { companyId, can } = useCompany();
  const queryClient = useQueryClient();
  const canWrite = can(WRITE_ROLES);

  const [accountOpen, setAccountOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("todas");

  const [accountForm, setAccountForm] = useState({ name: "", bank_name: "", iban: "", opening_balance: 0 });
  const [movementForm, setMovementForm] = useState({
    account_id: "",
    movement_date: new Date().toISOString().slice(0, 10),
    direction: "entrada" as "entrada" | "saida",
    amount: 0,
    description: "",
    category: "",
    method: "",
    reference: "",
  });

  const accounts = useQuery({
    queryKey: ["treasury-accounts", companyId, kind],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from("treasury_accounts")
        .select("id, kind, name, bank_name, iban, opening_balance, active")
        .eq("company_id", companyId!)
        .eq("kind", kind)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const accountIds = (accounts.data ?? []).map((a) => a.id);

  const movements = useQuery({
    queryKey: ["treasury-movements", companyId, kind, accountIds.join(",")],
    enabled: Boolean(companyId) && accountIds.length > 0,
    queryFn: async (): Promise<Movement[]> => {
      const { data, error } = await supabase
        .from("treasury_movements")
        .select("id, account_id, movement_date, direction, amount, description, category, method, reference")
        .eq("company_id", companyId!)
        .in("account_id", accountIds)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Movement[];
    },
  });

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const account of accounts.data ?? []) map.set(account.id, Number(account.opening_balance));
    for (const movement of movements.data ?? []) {
      const current = map.get(movement.account_id) ?? 0;
      map.set(
        movement.account_id,
        movement.direction === "entrada" ? current + Number(movement.amount) : current - Number(movement.amount),
      );
    }
    return map;
  }, [accounts.data, movements.data]);

  const totalBalance = Array.from(balances.values()).reduce((acc, value) => acc + value, 0);

  const visibleMovements = (movements.data ?? []).filter(
    (movement) => selectedAccount === "todas" || movement.account_id === selectedAccount,
  );

  const saveAccount = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa.");
      if (!accountForm.name.trim()) throw new Error("Indique o nome da conta.");
      const { data, error } = await supabase
        .from("treasury_accounts")
        .insert({
          company_id: companyId,
          kind,
          name: accountForm.name.trim(),
          bank_name: accountForm.bank_name || null,
          iban: accountForm.iban || null,
          opening_balance: Number(accountForm.opening_balance) || 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAudit({ companyId, action: "create", entity: `treasury_account:${kind}`, entityId: data.id });
    },
    onSuccess: () => {
      toast.success(kind === "banco" ? "Conta bancária criada." : "Caixa criada.");
      setAccountOpen(false);
      setAccountForm({ name: "", bank_name: "", iban: "", opening_balance: 0 });
      void queryClient.invalidateQueries({ queryKey: ["treasury-accounts"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar."),
  });

  const saveMovement = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa.");
      if (!movementForm.account_id) throw new Error("Escolha a conta.");
      if (!movementForm.description.trim()) throw new Error("Indique a descrição.");
      if (!(Number(movementForm.amount) > 0)) throw new Error("O valor tem de ser maior que zero.");
      const { data, error } = await supabase
        .from("treasury_movements")
        .insert({
          company_id: companyId,
          account_id: movementForm.account_id,
          movement_date: movementForm.movement_date,
          direction: movementForm.direction,
          amount: Number(movementForm.amount),
          description: movementForm.description.trim(),
          category: movementForm.category || null,
          method: movementForm.method || null,
          reference: movementForm.reference || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAudit({ companyId, action: "create", entity: `treasury_movement:${kind}`, entityId: data.id });
    },
    onSuccess: () => {
      toast.success("Movimento registado.");
      setMovementOpen(false);
      setMovementForm((form) => ({ ...form, amount: 0, description: "", category: "", reference: "" }));
      void queryClient.invalidateQueries({ queryKey: ["treasury-movements"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar."),
  });

  const removeMovement = useMutation({
    mutationFn: async (movement: Movement) => {
      const { error } = await supabase.from("treasury_movements").delete().eq("id", movement.id);
      if (error) throw error;
      await logAudit({ companyId, action: "delete", entity: `treasury_movement:${kind}`, entityId: movement.id });
    },
    onSuccess: () => {
      toast.success("Movimento eliminado.");
      void queryClient.invalidateQueries({ queryKey: ["treasury-movements"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível eliminar."),
  });

  const title = kind === "banco" ? "Bancos" : "Caixa";
  const description =
    kind === "banco"
      ? "Contas bancárias da empresa, movimentos e saldos."
      : "Caixas de dinheiro físico, entradas, saídas e saldos.";

  if (!companyId) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Selecione ou crie uma empresa para gerir tesouraria.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAccountOpen(true)}>
                <Plus className="mr-2 size-4" /> {kind === "banco" ? "Nova conta" : "Nova caixa"}
              </Button>
              <Button
                onClick={() => {
                  setMovementForm((form) => ({
                    ...form,
                    account_id: form.account_id || (accounts.data?.[0]?.id ?? ""),
                  }));
                  setMovementOpen(true);
                }}
                disabled={(accounts.data ?? []).length === 0}
              >
                <Plus className="mr-2 size-4" /> Novo movimento
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Saldo total</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{eur(totalBalance)}</CardContent>
        </Card>
        {(accounts.data ?? []).map((account) => (
          <Card key={account.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {account.name}
                {account.bank_name ? ` · ${account.bank_name}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-lg font-semibold">{eur(balances.get(account.id) ?? 0)}</p>
              {account.iban ? <p className="text-xs text-muted-foreground">{account.iban}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="sm:w-72">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as contas</SelectItem>
              {(accounts.data ?? []).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    {accounts.isLoading || movements.isLoading
                      ? "A carregar…"
                      : (accounts.data ?? []).length === 0
                        ? kind === "banco"
                          ? "Comece por criar uma conta bancária."
                          : "Comece por criar uma caixa."
                        : "Ainda não há movimentos."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{movement.movement_date}</TableCell>
                    <TableCell className="font-medium">{movement.description}</TableCell>
                    <TableCell>
                      {(accounts.data ?? []).find((a) => a.id === movement.account_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell>{movement.category ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={movement.direction === "entrada" ? "default" : "secondary"}>
                        {movement.direction === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {movement.direction === "entrada" ? "" : "-"}
                      {eur(Number(movement.amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Eliminar"
                          onClick={() => removeMovement.mutate(movement)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{kind === "banco" ? "Nova conta bancária" : "Nova caixa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={accountForm.name}
                onChange={(event) => setAccountForm((f) => ({ ...f, name: event.target.value }))}
              />
            </div>
            {kind === "banco" ? (
              <>
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input
                    value={accountForm.bank_name}
                    onChange={(event) => setAccountForm((f) => ({ ...f, bank_name: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={accountForm.iban}
                    onChange={(event) => setAccountForm((f) => ({ ...f, iban: event.target.value }))}
                  />
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label>Saldo inicial</Label>
              <Input
                type="number"
                step="0.01"
                value={accountForm.opening_balance}
                onChange={(event) =>
                  setAccountForm((f) => ({ ...f, opening_balance: Number(event.target.value) }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveAccount.mutate()} disabled={saveAccount.isPending || !canWrite}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo movimento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Conta</Label>
              <Select
                value={movementForm.account_id}
                onValueChange={(value) => setMovementForm((f) => ({ ...f, account_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar conta" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts.data ?? []).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={movementForm.movement_date}
                onChange={(event) => setMovementForm((f) => ({ ...f, movement_date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={movementForm.direction}
                onValueChange={(value) =>
                  setMovementForm((f) => ({ ...f, direction: value as "entrada" | "saida" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={movementForm.amount}
                onChange={(event) => setMovementForm((f) => ({ ...f, amount: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                value={movementForm.category}
                onChange={(event) => setMovementForm((f) => ({ ...f, category: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição</Label>
              <Input
                value={movementForm.description}
                onChange={(event) => setMovementForm((f) => ({ ...f, description: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Meio</Label>
              <Input
                value={movementForm.method}
                onChange={(event) => setMovementForm((f) => ({ ...f, method: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Referência</Label>
              <Input
                value={movementForm.reference}
                onChange={(event) => setMovementForm((f) => ({ ...f, reference: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMovement.mutate()} disabled={saveMovement.isPending || !canWrite}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

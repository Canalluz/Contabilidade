import type { AppRole } from "@/lib/erp/company-context";

export const ACCOUNTING_ROLES: AppRole[] = ["admin", "gestor", "contabilista"];

export const eur = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);

export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : "Ocorreu um erro.";

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

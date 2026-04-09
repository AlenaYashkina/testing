import { format } from "date-fns";

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});

const compactMoneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return moneyFormatter.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactMoneyFormatter.format(value);
}

export function formatDateTime(value: string): string {
  return format(new Date(value), "dd.MM.yyyy HH:mm");
}

export function formatDateLabel(value: string): string {
  return format(new Date(value), "dd MMM");
}

export function slugToLabel(value: string | null | undefined): string {
  if (!value) {
    return "Без статуса";
  }

  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

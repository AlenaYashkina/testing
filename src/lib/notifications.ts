import { formatDateTime, formatCurrency } from "@/lib/utils";

export interface NotifiableOrder {
  retailcrm_id: number;
  external_id: string;
  order_number: string;
  total_amount: number;
  customer_name: string;
  city: string | null;
  created_at: string;
}

export function pickOrdersForNotification(
  orders: NotifiableOrder[],
  threshold: number,
  notifiedExternalIds: Set<string>,
): NotifiableOrder[] {
  return orders
    .filter((order) => order.total_amount >= threshold)
    .filter((order) => !notifiedExternalIds.has(order.external_id))
    .sort((left, right) => right.total_amount - left.total_amount);
}

export function buildTelegramMessage(
  order: NotifiableOrder,
  threshold: number,
): string {
  return [
    "High-value order detected",
    `Order: ${order.order_number}`,
    `Amount: ${formatCurrency(order.total_amount)}`,
    `Customer: ${order.customer_name}`,
    `City: ${order.city ?? "Not specified"}`,
    `Created at: ${formatDateTime(order.created_at)}`,
    `Threshold: ${formatCurrency(threshold)}`,
    `RetailCRM ID: ${order.retailcrm_id}`,
  ].join("\n");
}

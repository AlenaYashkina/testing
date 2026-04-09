import { format } from "date-fns";

import type {
  OrderRow,
  PreparedMockOrder,
  RetailCrmApiOrder,
  RetailCrmApiOrderItem,
  RetailCrmPayloadOptions,
} from "@/lib/types";
import { toNumber } from "@/lib/utils";

export function buildRetailCrmCreateOrderPayload(
  preparedOrder: PreparedMockOrder,
  options: RetailCrmPayloadOptions = {},
): Record<string, unknown> {
  const { source } = preparedOrder;
  const {
    includeOrderMethod = true,
    includeOrderType = true,
    includeStatus = true,
    includeCustomFields = true,
  } = options;

  const payload: Record<string, unknown> = {
    externalId: preparedOrder.externalId,
    number: preparedOrder.number,
    createdAt: format(new Date(preparedOrder.createdAt), "yyyy-MM-dd HH:mm:ss"),
    firstName: source.firstName,
    lastName: source.lastName,
    email: source.email,
    phone: source.phone,
    customerComment: buildCustomerComment(source.customFields),
    countryIso: "KZ",
    deliveryAddress: {
      city: source.delivery.address.city,
      text: source.delivery.address.text,
    },
    items: source.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      initialPrice: item.initialPrice,
    })),
  };

  if (includeOrderType) {
    payload.orderType = source.orderType;
  }

  if (includeOrderMethod) {
    payload.orderMethod = source.orderMethod;
  }

  if (includeStatus) {
    payload.status = source.status;
  }

  if (includeCustomFields && Object.keys(source.customFields).length > 0) {
    payload.customFields = source.customFields;
  }

  return payload;
}

export function mapRetailCrmOrderToRow(order: RetailCrmApiOrder): OrderRow {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemNames = items
    .map((item) => resolveItemName(item))
    .filter((itemName): itemName is string => Boolean(itemName));

  const itemsCount = items.reduce(
    (sum, item) => sum + Math.max(1, Math.trunc(toNumber(item.quantity, 1))),
    0,
  );

  const customerName = [order.firstName, order.lastName]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .join(" ")
    .trim();

  return {
    retailcrm_id: order.id,
    external_id: order.externalId ? String(order.externalId) : `retailcrm-${order.id}`,
    order_number: order.number ?? `RC-${order.id}`,
    site: normalizeString(order.site),
    status: normalizeString(order.status),
    order_method: normalizeString(order.orderMethod),
    created_at: order.createdAt ?? new Date().toISOString(),
    total_amount: toNumber(order.totalSumm ?? order.summ, 0),
    currency: normalizeString(order.currency) ?? "KZT",
    customer_name: customerName || "Unknown customer",
    customer_phone: normalizeString(order.phone),
    customer_email: normalizeString(order.email),
    city: resolveCity(order),
    items_count: itemsCount,
    item_names: itemNames,
    synced_at: new Date().toISOString(),
    raw_payload: order,
  };
}

function buildCustomerComment(customFields: Record<string, string>): string | undefined {
  const entries = Object.entries(customFields);
  if (entries.length === 0) {
    return undefined;
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join("; ");
}

function resolveItemName(item: RetailCrmApiOrderItem): string | null {
  return normalizeString(item.productName) ?? normalizeString(item.offer?.name);
}

function resolveCity(order: RetailCrmApiOrder): string | null {
  if (normalizeString(order.city)) {
    return normalizeString(order.city);
  }

  const deliveryAddress =
    typeof order.deliveryAddress === "object" && order.deliveryAddress !== null
      ? (order.deliveryAddress as Record<string, unknown>)
      : null;

  return normalizeString(deliveryAddress?.city) ?? normalizeString(deliveryAddress?.text);
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

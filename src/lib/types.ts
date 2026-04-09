import { z } from "zod";

export const sourceMockOrderItemSchema = z.object({
  productName: z.string().min(1),
  quantity: z.number().positive(),
  initialPrice: z.number().positive(),
});

export const sourceMockOrderSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  orderType: z.string().min(1),
  orderMethod: z.string().min(1),
  status: z.string().min(1),
  items: z.array(sourceMockOrderItemSchema).min(1),
  delivery: z.object({
    address: z.object({
      city: z.string().min(1),
      text: z.string().min(1),
    }),
  }),
  customFields: z.record(z.string(), z.string()).default({}),
});

export const sourceMockOrdersSchema = z.array(sourceMockOrderSchema).length(50);

export type SourceMockOrderItem = z.infer<typeof sourceMockOrderItemSchema>;
export type SourceMockOrder = z.infer<typeof sourceMockOrderSchema>;

export interface PreparedMockOrder {
  externalId: string;
  number: string;
  createdAt: string;
  totalAmount: number;
  source: SourceMockOrder;
}

export interface RetailCrmPayloadOptions {
  includeOrderType?: boolean;
  includeOrderMethod?: boolean;
  includeStatus?: boolean;
  includeCustomFields?: boolean;
}

export interface RetailCrmSite {
  code: string;
  name?: string;
}

export interface RetailCrmApiOrderItem {
  quantity?: number | string | null;
  initialPrice?: number | string | null;
  purchasePrice?: number | string | null;
  productName?: string | null;
  offer?: {
    name?: string | null;
  } | null;
}

export interface RetailCrmApiOrder {
  id: number;
  number?: string | null;
  externalId?: string | number | null;
  createdAt?: string | null;
  status?: string | null;
  orderMethod?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  site?: string | null;
  city?: string | null;
  countryIso?: string | null;
  currency?: string | null;
  totalSumm?: number | string | null;
  summ?: number | string | null;
  items?: RetailCrmApiOrderItem[] | null;
  deliveryAddress?: {
    city?: string | null;
    text?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface OrderRow {
  retailcrm_id: number;
  external_id: string;
  order_number: string;
  site: string | null;
  status: string | null;
  order_method: string | null;
  created_at: string;
  total_amount: number;
  currency: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  city: string | null;
  items_count: number;
  item_names: string[];
  synced_at: string;
  raw_payload: Record<string, unknown>;
}

export interface OrderSummary {
  retailcrm_id: number;
  external_id: string;
  order_number: string;
  status: string | null;
  order_method: string | null;
  created_at: string;
  total_amount: number;
  currency: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  city: string | null;
  items_count: number;
  item_names: string[];
  synced_at: string;
}

export interface DailyOrdersPoint {
  isoDate: string;
  label: string;
  ordersCount: number;
  revenue: number;
}

export interface StatusBreakdownItem {
  status: string;
  label: string;
  count: number;
}

export interface DashboardKpis {
  totalOrders: number;
  totalRevenue: number;
  averageCheck: number;
  highValueOrders: number;
  last7DaysOrders: number;
  last7DaysRevenue: number;
}

export interface CustomerDigest {
  key: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  city: string | null;
  orders_count: number;
  total_amount: number;
  last_order_at: string;
  last_order_number: string;
}

export interface SyncRunSummary {
  status: string;
  source: string;
  imported_count: number;
  upserted_count: number;
  notified_count: number;
  created_at: string;
  finished_at: string;
  error_message: string | null;
}

export interface DashboardSnapshot {
  setupRequired: boolean;
  setupMessage?: string;
  kpis: DashboardKpis;
  dailySeries: DailyOrdersPoint[];
  latestOrders: OrderSummary[];
  recentCustomers: CustomerDigest[];
  statusBreakdown: StatusBreakdownItem[];
  latestRun: SyncRunSummary | null;
}

export interface FullSyncResult {
  importedCount: number;
  upsertedCount: number;
  notifiedCount: number;
  threshold: number;
}

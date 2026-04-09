import { requireServerEnv } from "@/lib/env";
import type { RetailCrmApiOrder, RetailCrmSite } from "@/lib/types";

interface RetailCrmPagination {
  currentPage: number;
  totalPageCount: number;
  totalCount: number;
  limit: number;
}

interface RetailCrmOrdersResponse {
  success: boolean;
  orders: RetailCrmApiOrder[];
  pagination: RetailCrmPagination;
}

interface RetailCrmSitesResponse {
  success: boolean;
  sites: RetailCrmSite[];
}

interface RetailCrmCredentialsResponse {
  success: boolean;
  sitesAvailable?: string[];
}

interface RetailCrmCreateOrderResponse {
  success: boolean;
  id: number;
}

interface RetailCrmUploadOrdersResponse {
  success: boolean;
  uploadedOrders?: Array<{
    id: number;
    externalId?: string;
  }>;
  failedOrders?: Array<{
    externalId?: string;
  }>;
}

export class RetailCrmApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "RetailCrmApiError";
    this.status = status;
    this.payload = payload;
  }
}

export class RetailCrmClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly preferredSiteCode?: string;

  constructor() {
    const env = requireServerEnv(["RETAILCRM_BASE_URL", "RETAILCRM_API_KEY"]);
    this.baseUrl = env.RETAILCRM_BASE_URL.replace(/\/$/, "");
    this.apiKey = env.RETAILCRM_API_KEY;
    this.preferredSiteCode = env.RETAILCRM_SITE_CODE;
  }

  async listOrders(page = 1, limit = 100): Promise<RetailCrmOrdersResponse> {
    const response = await this.request<RetailCrmOrdersResponse>(
      "/api/v5/orders",
      {
        searchParams: {
          page,
          limit,
        },
      },
    );

    return response;
  }

  async listAllOrders(limit = 100): Promise<RetailCrmApiOrder[]> {
    let page = 1;
    let totalPages = 1;
    const orders: RetailCrmApiOrder[] = [];

    do {
      const response = await this.listOrders(page, limit);
      orders.push(...response.orders);
      totalPages = response.pagination.totalPageCount;
      page += 1;
    } while (page <= totalPages);

    return orders;
  }

  async getSites(): Promise<RetailCrmSite[]> {
    const response = await this.request<RetailCrmSitesResponse>("/api/v5/sites");
    return response.sites;
  }

  async getAvailableSiteCodes(): Promise<string[]> {
    const response = await this.request<RetailCrmCredentialsResponse>(
      "/api/credentials",
    );

    return response.sitesAvailable ?? [];
  }

  async resolveSiteCode(): Promise<string> {
    if (this.preferredSiteCode) {
      return this.preferredSiteCode;
    }

    const availableSites = await this.getAvailableSiteCodes();
    const firstSiteCode = availableSites[0];

    if (!firstSiteCode) {
      throw new Error(
        "RetailCRM did not return any site codes. Add RETAILCRM_SITE_CODE manually.",
      );
    }

    return firstSiteCode;
  }

  async getExistingExternalIds(): Promise<Set<string>> {
    const orders = await this.listAllOrders();
    return new Set(
      orders
        .map((order) => order.externalId)
        .filter((value): value is string | number => value !== null && value !== undefined)
        .map(String),
    );
  }

  async createOrder(
    siteCode: string,
    orderPayload: Record<string, unknown>,
  ): Promise<RetailCrmCreateOrderResponse> {
    const body = new URLSearchParams();
    body.set("site", siteCode);
    body.set("order", JSON.stringify(orderPayload));

    return this.request<RetailCrmCreateOrderResponse>("/api/v5/orders/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body,
    });
  }

  async editOrder(
    orderIdentifier: string,
    siteCode: string,
    orderPayload: Record<string, unknown>,
    by: "id" | "externalId" = "id",
  ): Promise<RetailCrmCreateOrderResponse> {
    const body = new URLSearchParams();
    body.set("site", siteCode);
    body.set("by", by);
    body.set("order", JSON.stringify(orderPayload));

    return this.request<RetailCrmCreateOrderResponse>(
      `/api/v5/orders/${encodeURIComponent(orderIdentifier)}/edit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
        body,
      },
    );
  }

  async uploadOrders(
    siteCode: string,
    orderPayloads: Record<string, unknown>[],
  ): Promise<RetailCrmUploadOrdersResponse> {
    const body = new URLSearchParams();
    body.set("site", siteCode);
    body.set("orders", JSON.stringify(orderPayloads));

    return this.request<RetailCrmUploadOrdersResponse>("/api/v5/orders/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body,
    });
  }

  private async request<T>(
    path: string,
    options?: {
      method?: "GET" | "POST";
      headers?: HeadersInit;
      body?: BodyInit;
      searchParams?: Record<string, string | number | undefined>;
    },
  ): Promise<T> {
    const url = new URL(path, `${this.baseUrl}/`);
    url.searchParams.set("apiKey", this.apiKey);

    for (const [key, value] of Object.entries(options?.searchParams ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method: options?.method ?? "GET",
      headers: options?.headers,
      body: options?.body,
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      throw new RetailCrmApiError(
        this.extractErrorMessage(payload, response.statusText),
        response.status,
        payload,
      );
    }

    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload &&
      (payload as { success?: boolean }).success === false
    ) {
      throw new RetailCrmApiError(
        this.extractErrorMessage(payload, "RetailCRM request failed"),
        response.status,
        payload,
      );
    }

    return payload as T;
  }

  private extractErrorMessage(payload: unknown, fallback: string): string {
    if (payload && typeof payload === "object") {
      const known = payload as {
        errorMsg?: string;
        errors?: string[] | Record<string, string | string[]>;
      };
      const details: string[] = [];

      if (Array.isArray(known.errors)) {
        details.push(
          ...known.errors.filter(
            (value): value is string => typeof value === "string" && value.trim() !== "",
          ),
        );
      } else if (known.errors) {
        details.push(
          ...Object.entries(known.errors).map(([key, value]) => {
            const normalizedValue = Array.isArray(value) ? value.join(", ") : value;
            return `${key}: ${normalizedValue}`;
          }),
        );
      }

      if (known.errorMsg && details.length > 0) {
        return `${known.errorMsg}: ${details.join("; ")}`;
      }

      if (known.errorMsg) {
        return known.errorMsg;
      }

      if (details.length > 0) {
        return details.join("; ");
      }
    }

    if (typeof payload === "string" && payload.trim() !== "") {
      return payload;
    }

    return fallback;
  }
}

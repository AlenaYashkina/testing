import "./bootstrap-env";

import { prepareMockOrders, readSourceMockOrders } from "@/lib/mock-orders";
import { RetailCrmApiError, RetailCrmClient } from "@/lib/retailcrm/client";
import { buildRetailCrmCreateOrderPayload } from "@/lib/retailcrm/mappers";
import type { PreparedMockOrder, RetailCrmPayloadOptions } from "@/lib/types";

const DEFAULT_PAYLOAD_OPTIONS: Required<RetailCrmPayloadOptions> = {
  includeOrderType: true,
  includeOrderMethod: true,
  includeStatus: true,
  includeCustomFields: true,
};

const COMPATIBILITY_RULES: Array<{
  label: string;
  option: keyof RetailCrmPayloadOptions;
  patterns: RegExp[];
}> = [
  {
    label: "order type",
    option: "includeOrderType",
    patterns: [/orderType/i],
  },
  {
    label: "order method",
    option: "includeOrderMethod",
    patterns: [/orderMethod/i],
  },
  {
    label: "status",
    option: "includeStatus",
    patterns: [/\bstatus\b/i],
  },
  {
    label: "custom fields",
    option: "includeCustomFields",
    patterns: [/customFields/i, /utm_source/i],
  },
];

async function main() {
  const sourceOrders = await readSourceMockOrders();
  const preparedOrders = prepareMockOrders(sourceOrders);
  const retailCrmClient = new RetailCrmClient();
  const siteCode = await retailCrmClient.resolveSiteCode();
  const existingExternalIds = await retailCrmClient.getExistingExternalIds();
  const payloadOptions: Required<RetailCrmPayloadOptions> = {
    ...DEFAULT_PAYLOAD_OPTIONS,
  };

  let createdCount = 0;
  let updatedCount = 0;

  for (const order of preparedOrders) {
    await upsertOrder(retailCrmClient, siteCode, order, existingExternalIds, payloadOptions);

    if (existingExternalIds.has(order.externalId)) {
      updatedCount += 1;
    } else {
      existingExternalIds.add(order.externalId);
      createdCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        siteCode,
        totalMockOrders: preparedOrders.length,
        createdCount,
        updatedCount,
        uploadedCount: preparedOrders.length,
        failedCount: 0,
        compatibilityMode: describePayloadOptions(payloadOptions),
      },
      null,
      2,
    ),
  );
}

async function upsertOrder(
  retailCrmClient: RetailCrmClient,
  siteCode: string,
  order: PreparedMockOrder,
  existingExternalIds: Set<string>,
  options: Required<RetailCrmPayloadOptions>,
): Promise<void> {
  while (true) {
    try {
      const payload = buildRetailCrmCreateOrderPayload(order, options);

      if (existingExternalIds.has(order.externalId)) {
        await retailCrmClient.editOrder(order.externalId, siteCode, payload, "externalId");
      } else {
        await retailCrmClient.createOrder(siteCode, payload);
      }

      return;
    } catch (error) {
      const compatibilityRule = pickCompatibilityRule(error, options);

      if (!compatibilityRule) {
        throw error;
      }

      options[compatibilityRule.option] = false;

      console.warn(
        `RetailCRM account rejected ${compatibilityRule.label}; retrying import without this field.`,
      );
    }
  }
}

function pickCompatibilityRule(
  error: unknown,
  options: Required<RetailCrmPayloadOptions>,
) {
  if (!(error instanceof RetailCrmApiError)) {
    return null;
  }

  return (
    COMPATIBILITY_RULES.find(
      (rule) =>
        options[rule.option] &&
        rule.patterns.some((pattern) => pattern.test(error.message)),
    ) ?? null
  );
}

function describePayloadOptions(options: Required<RetailCrmPayloadOptions>) {
  return {
    orderType: options.includeOrderType ? "source code from file" : "omitted for CRM compatibility",
    orderMethod: options.includeOrderMethod
      ? "source code from file"
      : "omitted for CRM compatibility",
    status: options.includeStatus ? "source code from file" : "omitted for CRM compatibility",
    customFields: options.includeCustomFields
      ? "source fields sent to RetailCRM"
      : "kept only inside customerComment",
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

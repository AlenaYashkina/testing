import "./bootstrap-env";

import { syncRetailCrmOrdersToSupabase } from "@/lib/sync";

async function main() {
  const result = await syncRetailCrmOrdersToSupabase();

  console.log(
    JSON.stringify(
      {
        importedCount: result.importedCount,
        upsertedCount: result.upsertedOrders.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

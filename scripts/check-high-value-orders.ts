import "./bootstrap-env";

import { notifyHighValueOrders } from "@/lib/sync";

async function main() {
  const notifiedCount = await notifyHighValueOrders();

  console.log(
    JSON.stringify(
      {
        notifiedCount,
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

import "./bootstrap-env";

import { runFullSync } from "@/lib/sync";

async function main() {
  const result = await runFullSync();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

const exportDir = path.join(process.cwd(), ".next", "export");
const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const maxAttempts = 3;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  await rm(exportDir, {
    recursive: true,
    force: true,
  }).catch(() => undefined);

  const result = await runBuildAttempt();

  if (result.code === 0) {
    process.exitCode = 0;
    break;
  }

  const isTransientExportLock =
    /EBUSY/i.test(result.output) && /[\\/]\\.next[\\/]export|[\\/]export'/.test(result.output);

  if (!isTransientExportLock || attempt === maxAttempts) {
    process.exitCode = result.code;
    break;
  }

  console.warn(
    `Transient lock on .next/export detected during build. Retrying (${attempt + 1}/${maxAttempts})...`,
  );

  await wait(600);
}

function runBuildAttempt() {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--max-old-space-size=4096", nextCli, "build"],
      {
        stdio: ["inherit", "pipe", "pipe"],
      },
    );

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        output,
      });
    });
  });
}

function wait(timeoutMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}

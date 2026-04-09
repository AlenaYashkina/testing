import { NextRequest, NextResponse } from "next/server";

import { readServerEnv } from "@/lib/env";
import { runFullSync } from "@/lib/sync";
import { toErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFullSync();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: toErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

function isAuthorized(request: NextRequest): boolean {
  const env = readServerEnv();

  if (!env.CRON_SECRET) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`;
}

import { NextResponse } from "next/server";

import { getExternalServiceStatuses } from "@/lib/service-status";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const statuses = await getExternalServiceStatuses(force);
    return NextResponse.json({ statuses });
  } catch {
    return NextResponse.json(
      {
        statuses: [
          {
            service: "riot",
            available: false,
            message: "No fue posible validar Riot API.",
            retryAfterSeconds: 60,
            checkedAt: Date.now()
          },
          {
            service: "gemini",
            available: false,
            message: "No fue posible validar Gemini API.",
            retryAfterSeconds: 60,
            checkedAt: Date.now()
          }
        ]
      },
      { status: 503 }
    );
  }
}

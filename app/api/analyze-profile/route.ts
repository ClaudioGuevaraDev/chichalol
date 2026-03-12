import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeProfile } from "@/lib/analysis";
import { enrichWithAI } from "@/lib/ai";
import { loadRiotProfileSnapshot } from "@/lib/riot";
import { getExternalServiceStatuses } from "@/lib/service-status";

const requestSchema = z.object({
  gameName: z.string().min(2).max(32),
  tagLine: z.string().min(2).max(8),
  region: z.enum(["LAS", "LAN"])
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const statuses = await getExternalServiceStatuses(true);
    const riotStatus = statuses.find((status) => status.service === "riot");

    if (riotStatus && !riotStatus.available) {
      const retryText =
        riotStatus.retryAfterSeconds && riotStatus.retryAfterSeconds > 0
          ? ` Vuelve a intentarlo en ${riotStatus.retryAfterSeconds}s.`
          : "";

      return NextResponse.json(
        {
          error: `Riot no está disponible actualmente. ${riotStatus.message}${retryText}`
        },
        { status: 503 }
      );
    }

    const { snapshot, source, warnings } = await loadRiotProfileSnapshot(payload);
    const baseResponse = analyzeProfile(snapshot, {
      riot: source,
      ai: "fallback",
      warnings
    });
    const response = await enrichWithAI(baseResponse);

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Los datos ingresados no son válidos."
        : error instanceof Error
          ? error.message
          : "Error desconocido";

    return NextResponse.json(
      {
        error: message
      },
      { status: 400 }
    );
  }
}

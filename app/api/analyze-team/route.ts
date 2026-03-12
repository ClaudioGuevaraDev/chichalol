import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeProfile } from "@/lib/analysis";
import { enrichTeamWithAI } from "@/lib/ai";
import { loadRiotProfileSnapshot } from "@/lib/riot";
import { getKnownExternalServiceStatuses } from "@/lib/service-status";
import { analyzeTeam } from "@/lib/team-analysis";
import { TeamMemberInput } from "@/lib/types";

const memberSchema = z.object({
  gameName: z.string().min(2).max(32),
  tagLine: z.string().min(2).max(8),
  region: z.enum(["LAS", "LAN"])
});

const requestSchema = z.object({
  primaryPlayer: memberSchema,
  teammates: z.array(memberSchema).max(4)
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const statuses = getKnownExternalServiceStatuses();
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

    const members = dedupeMembers([payload.primaryPlayer, ...payload.teammates]);
    const individualAnalyses = [];
    const warnings: string[] = [];
    let riotSource: "live" | "mock" = "live";

    for (const member of members) {
      const { snapshot, source, warnings: memberWarnings } =
        await loadRiotProfileSnapshot(member);

      if (source === "mock") {
        riotSource = "mock";
      }

      warnings.push(...memberWarnings.map((warning) => `${snapshot.riotId}: ${warning}`));
      individualAnalyses.push(
        analyzeProfile(snapshot, {
          riot: source,
          ai: "fallback",
          warnings: memberWarnings
        })
      );
    }

    const baseResponse = analyzeTeam(individualAnalyses, {
      riot: riotSource,
      ai: "fallback",
      warnings
    });
    const response = await enrichTeamWithAI(baseResponse);

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Los datos del equipo no son válidos."
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

function dedupeMembers(members: TeamMemberInput[]) {
  const seen = new Set<string>();

  return members.filter((member) => {
    const key = `${member.gameName.toLowerCase()}#${member.tagLine.toLowerCase()}#${member.region}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

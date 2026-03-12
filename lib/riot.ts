import { z } from "zod";

import { readEnv } from "@/lib/env";
import { createMockProfileSnapshot } from "@/lib/mock-data";
import {
  ChampionMasteryEntry,
  MatchPerformance,
  QueueType,
  RankedSnapshot,
  RiotProfileSnapshot,
  RoleName,
  SupportedRegion
} from "@/lib/types";

const regionRouting: Record<SupportedRegion, string> = {
  LAS: "americas",
  LAN: "americas"
};

const platformRouting: Record<SupportedRegion, string> = {
  LAS: "la2",
  LAN: "la1"
};
const matchPageSize = 100;
const matchDetailBatchSize = 10;

const accountSchema = z.object({
  puuid: z.string(),
  gameName: z.string(),
  tagLine: z.string()
});

const leagueEntrySchema = z.array(
  z.object({
    queueType: z.string(),
    tier: z.string(),
    rank: z.string(),
    leaguePoints: z.number(),
    wins: z.number(),
    losses: z.number()
  })
);

const masterySchema = z.array(
  z.object({
    championId: z.number(),
    championLevel: z.number(),
    championPoints: z.number()
  })
);

const matchSchema = z.object({
  metadata: z.object({
    matchId: z.string()
  }),
  info: z.object({
    gameDuration: z.number(),
    gameEndTimestamp: z.number().optional(),
    queueId: z.number(),
    participants: z.array(
      z.object({
        puuid: z.string(),
        championName: z.string(),
        teamPosition: z.string(),
        individualPosition: z.string().optional(),
        win: z.boolean(),
        kills: z.number(),
        deaths: z.number(),
        assists: z.number(),
        totalMinionsKilled: z.number(),
        neutralMinionsKilled: z.number(),
        goldEarned: z.number(),
        totalDamageDealtToChampions: z.number(),
        totalDamageTaken: z.number(),
        visionScore: z.number(),
        wardsPlaced: z.number(),
        wardsKilled: z.number(),
        challenges: z
          .object({
            killParticipation: z.number().optional()
          })
          .partial()
          .optional()
      })
    )
  })
});

function queueFromId(queueId: number): QueueType {
  if (queueId === 420) {
    return "RANKED_SOLO";
  }

  if (queueId === 440) {
    return "RANKED_FLEX";
  }

  if (queueId === 450) {
    return "ARAM";
  }

  if ([400, 430].includes(queueId)) {
    return "NORMAL";
  }

  return "UNKNOWN";
}

function normalizeRole(position: string | undefined): RoleName {
  switch (position) {
    case "TOP":
      return "TOP";
    case "JUNGLE":
      return "JUNGLE";
    case "MIDDLE":
    case "MID":
      return "MID";
    case "BOTTOM":
    case "ADC":
      return "ADC";
    default:
      return "SUPPORT";
  }
}

async function riotFetch<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const apiKey = readEnv("RIOT_API_KEY");

  if (!apiKey) {
    throw new Error("Missing RIOT_API_KEY");
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": apiKey
      },
      cache: "no-store"
    });

    if (response.ok) {
      const json = await response.json();
      return schema.parse(json);
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
      continue;
    }

    if (response.status >= 500 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
      continue;
    }

    throw new Error(`Riot API error ${response.status}`);
  }

  throw new Error("Riot API failed after retries");
}

async function loadChampionDictionary(): Promise<Record<number, string>> {
  const response = await fetch(
    "https://ddragon.leagueoflegends.com/cdn/14.24.1/data/en_US/champion.json",
    { cache: "force-cache" }
  );

  if (!response.ok) {
    throw new Error("Unable to load champion dictionary");
  }

  const json = (await response.json()) as {
    data: Record<string, { key: string; id: string }>;
  };

  return Object.values(json.data).reduce<Record<number, string>>((acc, champion) => {
    acc[Number(champion.key)] = champion.id;
    return acc;
  }, {});
}

async function fetchRankedSnapshot(region: SupportedRegion, puuid: string): Promise<{
  solo?: RankedSnapshot;
  flex?: RankedSnapshot;
}> {
  const platform = platformRouting[region];
  const entries = await riotFetch(
    `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
    leagueEntrySchema
  );

  const soloQueue = entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
  const flexQueue = entries.find((entry) => entry.queueType === "RANKED_FLEX_SR");

  return {
    solo: soloQueue
      ? {
          tier: soloQueue.tier,
          rank: soloQueue.rank,
          leaguePoints: soloQueue.leaguePoints,
          wins: soloQueue.wins,
          losses: soloQueue.losses
        }
      : undefined,
    flex: flexQueue
      ? {
          tier: flexQueue.tier,
          rank: flexQueue.rank,
          leaguePoints: flexQueue.leaguePoints,
          wins: flexQueue.wins,
          losses: flexQueue.losses
        }
      : undefined
  };
}

async function fetchMastery(
  region: SupportedRegion,
  puuid: string
): Promise<ChampionMasteryEntry[]> {
  const platform = platformRouting[region];
  const championDictionary = await loadChampionDictionary();
  const mastery = await riotFetch(
    `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`,
    masterySchema
  );

  return mastery.slice(0, 10).map((entry) => ({
    championName: championDictionary[entry.championId] ?? `Champion ${entry.championId}`,
    championLevel: entry.championLevel,
    championPoints: entry.championPoints
  }));
}

async function fetchMatches(
  region: SupportedRegion,
  puuid: string
): Promise<{
  matches: MatchPerformance[];
  seasonMatchCount: number;
  loadedMatchCount: number;
}> {
  const routing = regionRouting[region];
  const seasonYear = new Date().getUTCFullYear();
  const seasonStart = new Date(Date.UTC(seasonYear, 0, 1, 0, 0, 0));
  const startTime = Math.floor(seasonStart.getTime() / 1000);
  const endTime = Math.floor(Date.now() / 1000);
  const matchIds: string[] = [];

  for (let start = 0; ; start += matchPageSize) {
    const page = await riotFetch(
      `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${matchPageSize}&startTime=${startTime}&endTime=${endTime}`,
      z.array(z.string())
    );

    matchIds.push(...page);

    if (page.length < matchPageSize) {
      break;
    }
  }

  const hydratedMatches: Array<z.infer<typeof matchSchema> | null> = [];

  for (let index = 0; index < matchIds.length; index += matchDetailBatchSize) {
    const chunk = matchIds.slice(index, index + matchDetailBatchSize);
    const results = await Promise.all(
      chunk.map((matchId) =>
        riotFetch(
          `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
          matchSchema
        ).catch(() => null)
      )
    );

    hydratedMatches.push(...results);
  }

  const matches = hydratedMatches
    .filter((match): match is z.infer<typeof matchSchema> => Boolean(match))
    .map((match) => {
      const participant = match.info.participants.find(
        (entry) => entry.puuid === puuid
      );

      if (!participant) {
        return null;
      }

      const role = normalizeRole(
        participant.teamPosition || participant.individualPosition
      );

      return {
        matchId: match.metadata.matchId,
        gameEndedAt: match.info.gameEndTimestamp ?? Date.now(),
        queue: queueFromId(match.info.queueId),
        championName: participant.championName,
        role,
        win: participant.win,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
        goldEarned: participant.goldEarned,
        totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
        totalDamageTaken: participant.totalDamageTaken,
        visionScore: participant.visionScore,
        wardsPlaced: participant.wardsPlaced,
        wardsKilled: participant.wardsKilled,
        neutralMinionsKilled: participant.neutralMinionsKilled,
        gameDuration: match.info.gameDuration,
        earlyKillParticipation: participant.challenges?.killParticipation ?? 0.45
      } satisfies MatchPerformance;
    })
    .filter((entry): entry is MatchPerformance => Boolean(entry));

  return {
    matches,
    seasonMatchCount: matchIds.length,
    loadedMatchCount: matches.length
  };
}

export async function loadRiotProfileSnapshot(params: {
  gameName: string;
  tagLine: string;
  region: SupportedRegion;
}): Promise<{
  snapshot: RiotProfileSnapshot;
  source: "live" | "mock";
  warnings: string[];
}> {
  const { gameName, tagLine, region } = params;
  const riotId = `${gameName}#${tagLine}`;

  try {
    const account = await riotFetch(
      `https://${regionRouting[region]}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      accountSchema
    );

    const [{ matches, seasonMatchCount, loadedMatchCount }, ranked, mastery] = await Promise.all([
      fetchMatches(region, account.puuid),
      fetchRankedSnapshot(region, account.puuid),
      fetchMastery(region, account.puuid)
    ]);

    const warnings =
      seasonMatchCount > loadedMatchCount
        ? [
            `Se encontraron ${seasonMatchCount} partidas de temporada, pero solo se pudieron hidratar ${loadedMatchCount}.`
          ]
        : [];

    return {
      snapshot: {
        riotId,
        region,
        puuid: account.puuid,
        matches,
        ranked,
        mastery,
        seasonYear: new Date().getUTCFullYear(),
        seasonMatchCount,
        loadedMatchCount
      },
      source: "live",
      warnings
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Riot API failure";

    return {
      snapshot: createMockProfileSnapshot(riotId, region),
      source: "mock",
      warnings: [
        "No se pudo obtener Riot en vivo. Se usó un perfil demo para mantener la experiencia.",
        message
      ]
    };
  }
}

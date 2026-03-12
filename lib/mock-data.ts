import {
  ChampionMasteryEntry,
  MatchPerformance,
  RiotProfileSnapshot,
  SupportedRegion
} from "@/lib/types";

const champions = ["Jarvan IV", "Sejuani", "Vi", "Thresh", "Leona", "Orianna"];

function createMastery(): ChampionMasteryEntry[] {
  return champions.map((championName, index) => ({
    championName,
    championLevel: 7 - (index % 3),
    championPoints: 175000 - index * 18000
  }));
}

function createMatch(index: number): MatchPerformance {
  const roleCycle = ["JUNGLE", "JUNGLE", "SUPPORT", "MID", "JUNGLE"] as const;
  const championCycle = ["Jarvan IV", "Vi", "Thresh", "Orianna", "Sejuani"] as const;
  const role = roleCycle[index % roleCycle.length];
  const queue =
    index < 40
      ? "RANKED_SOLO"
      : index < 65
        ? "RANKED_FLEX"
        : index < 85
          ? "NORMAL"
          : "ARAM";

  return {
    matchId: `MOCK-${index + 1}`,
    gameEndedAt: Date.now() - index * 1000 * 60 * 60 * 8,
    queue,
    championName: championCycle[index % championCycle.length],
    role,
    win: index % 3 !== 0,
    kills: role === "SUPPORT" ? 2 + (index % 3) : 5 + (index % 5),
    deaths: 2 + (index % 4),
    assists: role === "SUPPORT" ? 13 + (index % 6) : 7 + (index % 4),
    cs: role === "SUPPORT" ? 28 + (index % 20) : role === "JUNGLE" ? 142 + (index % 35) : 188 + (index % 40),
    goldEarned: role === "SUPPORT" ? 9200 + index * 5 : 11800 + index * 7,
    totalDamageDealtToChampions: role === "SUPPORT" ? 9800 + index * 60 : 15600 + index * 75,
    totalDamageTaken: role === "MID" ? 14100 + index * 35 : 18200 + index * 55,
    visionScore: role === "SUPPORT" ? 58 + (index % 10) : 24 + (index % 11),
    wardsPlaced: role === "SUPPORT" ? 17 + (index % 7) : 7 + (index % 5),
    wardsKilled: role === "SUPPORT" ? 5 + (index % 3) : 2 + (index % 2),
    neutralMinionsKilled: role === "JUNGLE" ? 62 + (index % 18) : 6 + (index % 5),
    gameDuration: 1620 + (index % 8) * 95,
    earlyKillParticipation: role === "JUNGLE" ? 0.65 : role === "SUPPORT" ? 0.58 : 0.42
  };
}

export function createMockProfileSnapshot(
  riotId: string,
  region: SupportedRegion
): RiotProfileSnapshot {
  const matches = Array.from({ length: 100 }, (_, index) => createMatch(index));

  return {
    riotId,
    region,
    puuid: "mock-puuid",
    summonerLevel: 312,
    ranked: {
      solo: {
        tier: "PLATINUM",
        rank: "II",
        leaguePoints: 48,
        wins: 76,
        losses: 61
      },
      flex: {
        tier: "GOLD",
        rank: "I",
        leaguePoints: 23,
        wins: 18,
        losses: 14
      }
    },
    mastery: createMastery(),
    matches,
    seasonYear: new Date().getUTCFullYear(),
    seasonMatchCount: matches.length,
    loadedMatchCount: matches.length
  };
}

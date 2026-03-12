import { championPriors } from "@/lib/meta-priors";
import {
  AIProfileInsight,
  AnalysisResponse,
  ChampionFitScore,
  ChampionPerformance,
  ConsistencyInsight,
  MatchPerformance,
  PlayerFeatureVector,
  PlayerStyleTag,
  QueueBreakdown,
  QueueDetailedInsight,
  RecentMatchInsight,
  RiotProfileSnapshot,
  RoleName,
  RolePerformance,
  RoleScore,
  TrendInsight,
  WinLossComparison
} from "@/lib/types";

const roles: RoleName[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const queueLabels = {
  ALL: "Todo",
  RANKED_SOLO: "SoloQ",
  RANKED_FLEX: "Flex",
  NORMAL: "Normal",
  ARAM: "ARAM",
  UNKNOWN: "Otras"
} as const;

function average(items: number[]): number {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((sum, value) => sum + value, 0) / items.length;
}

function standardDeviation(items: number[]): number {
  if (items.length <= 1) {
    return 0;
  }

  const mean = average(items);
  const variance = average(items.map((item) => (item - mean) ** 2));
  return Math.sqrt(variance);
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function perMinute(value: number, seconds: number): number {
  return seconds > 0 ? value / (seconds / 60) : 0;
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function groupMatchesByRole(matches: MatchPerformance[]) {
  return roles.reduce<Record<RoleName, MatchPerformance[]>>((acc, role) => {
    acc[role] = matches.filter((match) => match.role === role);
    return acc;
  }, {} as Record<RoleName, MatchPerformance[]>);
}

function inferStyleTagsFromMatches(matches: MatchPerformance[]): PlayerStyleTag[] {
  const avgVision = average(matches.map((match) => perMinute(match.visionScore, match.gameDuration)));
  const avgCs = average(matches.map((match) => perMinute(match.cs, match.gameDuration)));
  const avgDamageTaken = average(matches.map((match) => match.totalDamageTaken));
  const avgKP = average(matches.map((match) => match.earlyKillParticipation));
  const assistRatio = average(
    matches.map((match) => match.assists / Math.max(1, match.kills + match.assists))
  );

  const tags = new Set<PlayerStyleTag>();

  if (avgKP >= 0.55) tags.add("mapa");
  if (avgVision >= 1.15) tags.add("utilidad");
  if (avgCs >= 6.4) tags.add("farm");
  if (avgDamageTaken >= 17500) tags.add("frontline");
  if (assistRatio >= 0.62) tags.add("control");
  if (average(matches.map((match) => match.kills)) >= 6) tags.add("agresivo");

  return Array.from(tags);
}

function inferStyleTags(snapshot: RiotProfileSnapshot): PlayerStyleTag[] {
  return inferStyleTagsFromMatches(snapshot.matches);
}

function buildRoleScoresFromMatches(matches: MatchPerformance[]) {
  const byRole = groupMatchesByRole(matches);

  return roles
    .map((role) => {
      const roleMatches = byRole[role];
      const playRate = roleMatches.length / Math.max(1, matches.length);
      const winRate = average(roleMatches.map((match) => (match.win ? 1 : 0)));
      const avgDamage = average(roleMatches.map((match) => match.totalDamageDealtToChampions));
      const avgVision = average(
        roleMatches.map((match) => perMinute(match.visionScore, match.gameDuration))
      );
      const avgCs = average(roleMatches.map((match) => perMinute(match.cs, match.gameDuration)));
      const affinity =
        playRate * 45 +
        winRate * 35 +
        (avgDamage / 25000) * 10 +
        (avgVision / 2) * 5 +
        (avgCs / 9) * 5;

      return {
        role,
        score: Math.round(Math.min(100, affinity))
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildTopChampions(matches: MatchPerformance[]) {
  const topChampionMap = new Map<string, MatchPerformance[]>();
  matches.forEach((match) => {
    const bucket = topChampionMap.get(match.championName) ?? [];
    bucket.push(match);
    topChampionMap.set(match.championName, bucket);
  });

  return Array.from(topChampionMap.entries())
    .map(([championName, championMatches]) => ({
      championName,
      games: championMatches.length,
      winRate: average(championMatches.map((match) => (match.win ? 1 : 0)))
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);
}

function buildRolePerformances(matches: MatchPerformance[]): RolePerformance[] {
  const byRole = groupMatchesByRole(matches);

  return roles
    .map((role) => {
      const roleMatches = byRole[role];

      return {
        role,
        games: roleMatches.length,
        winRate: average(roleMatches.map((match) => (match.win ? 1 : 0))),
        averageKda: average(
          roleMatches.map((match) => (match.kills + match.assists) / Math.max(1, match.deaths))
        ),
        averageCsPerMinute: average(roleMatches.map((match) => perMinute(match.cs, match.gameDuration))),
        averageVisionPerMinute: average(
          roleMatches.map((match) => perMinute(match.visionScore, match.gameDuration))
        ),
        averageDamagePerMinute: average(
          roleMatches.map((match) =>
            perMinute(match.totalDamageDealtToChampions, match.gameDuration)
          )
        ),
        averageGoldPerMinute: average(
          roleMatches.map((match) => perMinute(match.goldEarned, match.gameDuration))
        ),
        topChampions: buildTopChampions(roleMatches).slice(0, 3)
      };
    })
    .filter((role) => role.games > 0)
    .sort((a, b) => b.games - a.games);
}

function buildChampionPerformances(matches: MatchPerformance[]): ChampionPerformance[] {
  const championMap = new Map<string, MatchPerformance[]>();

  matches.forEach((match) => {
    const key = `${match.championName}:${match.role}`;
    const bucket = championMap.get(key) ?? [];
    bucket.push(match);
    championMap.set(key, bucket);
  });

  return Array.from(championMap.entries())
    .map(([key, championMatches]) => {
      const [championName, role] = key.split(":") as [string, RoleName];

      return {
        championName,
        role,
        games: championMatches.length,
        winRate: average(championMatches.map((match) => (match.win ? 1 : 0))),
        averageKda: average(
          championMatches.map((match) => (match.kills + match.assists) / Math.max(1, match.deaths))
        ),
        averageCsPerMinute: average(
          championMatches.map((match) => perMinute(match.cs, match.gameDuration))
        ),
        averageDamagePerMinute: average(
          championMatches.map((match) =>
            perMinute(match.totalDamageDealtToChampions, match.gameDuration)
          )
        ),
        averageVisionPerMinute: average(
          championMatches.map((match) => perMinute(match.visionScore, match.gameDuration))
        )
      };
    })
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate)
    .slice(0, 10);
}

function buildRecentMatches(matches: MatchPerformance[]): RecentMatchInsight[] {
  return [...matches]
    .sort((a, b) => b.gameEndedAt - a.gameEndedAt)
    .slice(0, 8)
    .map((match) => ({
      matchId: match.matchId,
      gameEndedAt: match.gameEndedAt,
      queue: match.queue,
      championName: match.championName,
      role: match.role,
      win: match.win,
      kda: (match.kills + match.assists) / Math.max(1, match.deaths),
      kills: match.kills,
      deaths: match.deaths,
      assists: match.assists,
      csPerMinute: perMinute(match.cs, match.gameDuration),
      damagePerMinute: perMinute(match.totalDamageDealtToChampions, match.gameDuration),
      visionPerMinute: perMinute(match.visionScore, match.gameDuration),
      durationMinutes: match.gameDuration / 60
    }));
}

function buildWinLossComparison(matches: MatchPerformance[]): WinLossComparison {
  const wins = matches.filter((match) => match.win);
  const losses = matches.filter((match) => !match.win);
  const summarize = (bucket: MatchPerformance[]) => ({
    games: bucket.length,
    winRate: average(bucket.map((match) => (match.win ? 1 : 0))),
    averageKda: average(bucket.map((match) => (match.kills + match.assists) / Math.max(1, match.deaths))),
    averageCsPerMinute: average(bucket.map((match) => perMinute(match.cs, match.gameDuration))),
    averageVisionPerMinute: average(
      bucket.map((match) => perMinute(match.visionScore, match.gameDuration))
    ),
    averageDamagePerMinute: average(
      bucket.map((match) => perMinute(match.totalDamageDealtToChampions, match.gameDuration))
    ),
    averageDeaths: average(bucket.map((match) => match.deaths))
  });

  const winSummary = summarize(wins);
  const lossSummary = summarize(losses);
  const takeaways: string[] = [];

  if (winSummary.averageDeaths + 1 < lossSummary.averageDeaths) {
    takeaways.push(
      `Cuando pierdes, tus muertes suben de ${winSummary.averageDeaths.toFixed(1)} a ${lossSummary.averageDeaths.toFixed(1)}.`
    );
  }

  if (winSummary.averageVisionPerMinute > lossSummary.averageVisionPerMinute + 0.15) {
    takeaways.push(
      `Tus victorias llegan con más visión: ${winSummary.averageVisionPerMinute.toFixed(2)} vs ${lossSummary.averageVisionPerMinute.toFixed(2)} por minuto.`
    );
  }

  if (winSummary.averageCsPerMinute > lossSummary.averageCsPerMinute + 0.4) {
    takeaways.push(
      `Tu farm sostiene resultados: ${winSummary.averageCsPerMinute.toFixed(1)} CS/min en wins contra ${lossSummary.averageCsPerMinute.toFixed(1)} en losses.`
    );
  }

  if (winSummary.averageKda > lossSummary.averageKda + 0.8) {
    takeaways.push(
      `Tu KDA se derrumba en derrotas: ${winSummary.averageKda.toFixed(2)} en wins vs ${lossSummary.averageKda.toFixed(2)} en losses.`
    );
  }

  if (takeaways.length === 0) {
    takeaways.push("Tus wins y losses están relativamente cerca; tu siguiente salto está en consistencia y ejecución.");
  }

  return {
    wins: winSummary,
    losses: lossSummary,
    takeaways
  };
}

function buildTrendInsight(matches: MatchPerformance[]): TrendInsight {
  const sorted = [...matches].sort((a, b) => b.gameEndedAt - a.gameEndedAt);
  const splitSize = Math.min(12, Math.max(4, Math.floor(sorted.length / 2)));
  const recent = sorted.slice(0, splitSize);
  const previous = sorted.slice(splitSize, splitSize * 2);

  const recentWinRate = average(recent.map((match) => (match.win ? 1 : 0)));
  const previousWinRate = average(previous.map((match) => (match.win ? 1 : 0)));
  const recentKda = average(recent.map((match) => (match.kills + match.assists) / Math.max(1, match.deaths)));
  const previousKda = average(previous.map((match) => (match.kills + match.assists) / Math.max(1, match.deaths)));
  const recentVision = average(recent.map((match) => perMinute(match.visionScore, match.gameDuration)));
  const previousVision = average(previous.map((match) => perMinute(match.visionScore, match.gameDuration)));
  const summary: string[] = [];

  if (recent.length === 0 || previous.length === 0) {
    summary.push("Todavía no hay suficiente muestra para leer una tendencia real.");
  } else {
    const winDelta = recentWinRate - previousWinRate;
    const kdaDelta = recentKda - previousKda;
    const visionDelta = recentVision - previousVision;

    if (winDelta >= 0.1) {
      summary.push(`Tu win rate reciente viene al alza: ${percentage(recentWinRate)} contra ${percentage(previousWinRate)}.`);
    } else if (winDelta <= -0.1) {
      summary.push(`Tu win rate reciente cayó: ${percentage(recentWinRate)} contra ${percentage(previousWinRate)}.`);
    }

    if (kdaDelta >= 0.6) {
      summary.push(`Tu ejecución reciente es más limpia: KDA ${recentKda.toFixed(2)} vs ${previousKda.toFixed(2)}.`);
    } else if (kdaDelta <= -0.6) {
      summary.push(`Tus últimas partidas muestran menos control: KDA ${recentKda.toFixed(2)} vs ${previousKda.toFixed(2)}.`);
    }

    if (visionDelta >= 0.15) {
      summary.push(`Tu visión reciente mejoró a ${recentVision.toFixed(2)} por minuto.`);
    } else if (visionDelta <= -0.15) {
      summary.push(`Tu visión reciente bajó a ${recentVision.toFixed(2)} por minuto.`);
    }
  }

  if (summary.length === 0) {
    summary.push("Tu tendencia reciente está estable; el perfil no muestra un giro fuerte en las últimas partidas.");
  }

  return {
    recentGames: recent.length,
    previousGames: previous.length,
    recentWinRate,
    previousWinRate,
    recentKda,
    previousKda,
    recentVisionPerMinute: recentVision,
    previousVisionPerMinute: previousVision,
    summary
  };
}

function buildConsistencyInsight(matches: MatchPerformance[]): ConsistencyInsight {
  const kdas = matches.map((match) => (match.kills + match.assists) / Math.max(1, match.deaths));
  const deaths = matches.map((match) => match.deaths);
  const visions = matches.map((match) => perMinute(match.visionScore, match.gameDuration));
  const kdaSpread = standardDeviation(kdas);
  const deathSpread = standardDeviation(deaths);
  const visionSpread = standardDeviation(visions);
  const kdaScore = clampScore(100 - kdaSpread * 18);
  const deathsScore = clampScore(100 - deathSpread * 20);
  const visionScore = clampScore(100 - visionSpread * 32);
  const overall = clampScore((kdaScore + deathsScore + visionScore) / 3);
  const summary: string[] = [];

  if (overall >= 72) {
    summary.push("Tu perfil muestra una base bastante consistente entre partidas.");
  } else if (overall <= 45) {
    summary.push("Tu rendimiento cambia demasiado entre partidas; aquí hay mucho valor por capturar.");
  }

  if (deathsScore < kdaScore && deathsScore < visionScore) {
    summary.push("La mayor fuente de volatilidad está en tus muertes.");
  }

  if (visionScore < 55) {
    summary.push("Tu visión es irregular entre partidas, lo que afecta tu lectura de mapa.");
  }

  if (summary.length === 0) {
    summary.push("La consistencia es aceptable, pero todavía no aparece como una ventaja diferencial.");
  }

  return {
    overall,
    kda: kdaScore,
    deaths: deathsScore,
    vision: visionScore,
    summary
  };
}

function buildQueueBreakdown(
  queue: QueueBreakdown["queue"],
  matches: MatchPerformance[]
): QueueBreakdown {
  const byRole = groupMatchesByRole(matches);
  const preferredRoles = buildRoleScoresFromMatches(matches);
  const topChampions = buildTopChampions(matches);
  const topChampionsByRole = roles.reduce((acc, role) => {
    acc[role] = buildTopChampions(byRole[role]);
    return acc;
  }, {} as QueueBreakdown["topChampionsByRole"]);

  return {
    queue,
    label: queueLabels[queue],
    games: matches.length,
    winRate: average(matches.map((match) => (match.win ? 1 : 0))),
    averageKda: average(
      matches.map((match) => (match.kills + match.assists) / Math.max(1, match.deaths))
    ),
    averageVisionPerMinute: average(
      matches.map((match) => perMinute(match.visionScore, match.gameDuration))
    ),
    topChampion: topChampions[0]?.championName,
    preferredRoles,
    winRateByRole: roles.reduce((acc, role) => {
      acc[role] = average(byRole[role].map((match) => (match.win ? 1 : 0)));
      return acc;
    }, {} as Record<RoleName, number>),
    playRateByRole: roles.reduce((acc, role) => {
      acc[role] = byRole[role].length / Math.max(1, matches.length);
      return acc;
    }, {} as Record<RoleName, number>),
    topChampions,
    topChampionsByRole,
    styleTags: inferStyleTagsFromMatches(matches)
  };
}

function buildQueueDetailedInsight(
  queue: QueueDetailedInsight["queue"],
  matches: MatchPerformance[]
): QueueDetailedInsight {
  return {
    queue,
    rolePerformances: buildRolePerformances(matches),
    championPerformances: buildChampionPerformances(matches),
    recentMatches: buildRecentMatches(matches),
    trend: buildTrendInsight(matches),
    consistency: buildConsistencyInsight(matches),
    winLossComparison: buildWinLossComparison(matches)
  };
}

function buildFeatureVector(snapshot: RiotProfileSnapshot): PlayerFeatureVector {
  const rankedMatches = snapshot.matches.filter((match) =>
    ["RANKED_SOLO", "RANKED_FLEX"].includes(match.queue)
  );
  const byRole = groupMatchesByRole(rankedMatches);
  const preferredRoles = buildRoleScoresFromMatches(rankedMatches);
  const topChampions = buildTopChampions(rankedMatches);
  const rolePerformances = buildRolePerformances(rankedMatches);
  const championPerformances = buildChampionPerformances(rankedMatches);
  const recentMatches = buildRecentMatches(rankedMatches);
  const trend = buildTrendInsight(rankedMatches);
  const consistency = buildConsistencyInsight(rankedMatches);
  const winLossComparison = buildWinLossComparison(rankedMatches);

  const winRate = average(rankedMatches.map((match) => (match.win ? 1 : 0)));
  const avgKda = average(
    rankedMatches.map((match) => (match.kills + match.assists) / Math.max(1, match.deaths))
  );
  const avgVision = average(
    rankedMatches.map((match) => perMinute(match.visionScore, match.gameDuration))
  );
  const queueBreakdowns = (["ALL", "RANKED_SOLO", "RANKED_FLEX"] as const)
    .map((queue) => {
      const matches =
        queue === "ALL"
          ? rankedMatches
          : rankedMatches.filter((match) => match.queue === queue);
      return buildQueueBreakdown(queue, matches);
    })
    .filter((summary) => summary.games > 0);
  const queueDetailedInsights = (["ALL", "RANKED_SOLO", "RANKED_FLEX"] as const)
    .map((queue) => {
      const matches =
        queue === "ALL"
          ? rankedMatches
          : rankedMatches.filter((match) => match.queue === queue);
      return buildQueueDetailedInsight(queue, matches);
    })
    .filter((entry) => {
      const games =
        entry.queue === "ALL"
          ? rankedMatches.length
          : rankedMatches.filter((match) => match.queue === entry.queue).length;
      return games > 0;
    });
  const queueSummaries = queueBreakdowns.map((breakdown) => ({
    queue: breakdown.queue,
    label: breakdown.label,
    games: breakdown.games,
    winRate: breakdown.winRate,
    averageKda: breakdown.averageKda,
    topChampion: breakdown.topChampion,
    rankLabel:
      breakdown.queue === "RANKED_SOLO"
        ? snapshot.ranked.solo
          ? `${snapshot.ranked.solo.tier} ${snapshot.ranked.solo.rank}`
          : undefined
        : breakdown.queue === "RANKED_FLEX"
          ? snapshot.ranked.flex
            ? `${snapshot.ranked.flex.tier} ${snapshot.ranked.flex.rank}`
            : undefined
          : undefined
  }));

  const coverage =
    snapshot.seasonMatchCount > 0
      ? snapshot.loadedMatchCount / snapshot.seasonMatchCount
      : 1;
  const sampleStrength = Math.min(1, rankedMatches.length / 30);
  const confidence = Math.round((0.6 * coverage + 0.4 * sampleStrength) * 100);

  return {
    matchCount: snapshot.matches.length,
    rankedMatchCount: rankedMatches.length,
    confidence,
    preferredRoles,
    winRateByRole: roles.reduce((acc, role) => {
      acc[role] = average(byRole[role].map((match) => (match.win ? 1 : 0)));
      return acc;
    }, {} as Record<RoleName, number>),
    playRateByRole: roles.reduce((acc, role) => {
      acc[role] = byRole[role].length / Math.max(1, rankedMatches.length);
      return acc;
    }, {} as Record<RoleName, number>),
    styleTags: inferStyleTags(snapshot),
    topChampions,
    rolePerformances,
    championPerformances,
    recentMatches,
    trend,
    consistency,
    winLossComparison,
    queueDetailedInsights,
    queueSummaries,
    queueBreakdowns,
    metrics: [
      { label: "Partidas analizadas", value: String(rankedMatches.length), highlight: true },
      { label: "Partidas temporada", value: String(snapshot.seasonMatchCount) },
      { label: "Ranked usadas", value: String(rankedMatches.length) },
      { label: "Win rate global", value: percentage(winRate), highlight: true },
      { label: "KDA promedio", value: avgKda.toFixed(2) },
      { label: "Visión por minuto", value: avgVision.toFixed(2) },
      { label: "Cobertura", value: `${Math.round(coverage * 100)}%` }
    ]
  };
}

function createRoleReasons(role: RoleName, features: PlayerFeatureVector): string[] {
  const reasons: string[] = [];
  const winRate = features.winRateByRole[role];
  const playRate = features.playRateByRole[role];
  const performance = features.rolePerformances.find((entry) => entry.role === role);

  reasons.push(`Tu volumen en ${role} representa ${percentage(playRate)} del historial ranked.`);
  reasons.push(`Tu win rate en ${role} se mantiene en ${percentage(winRate)}.`);

  if (performance) {
    reasons.push(
      `En ${role} promedias ${performance.averageKda.toFixed(2)} de KDA y ${performance.averageVisionPerMinute.toFixed(2)} de visión por minuto.`
    );
  }

  if (features.styleTags.includes("mapa") && role === "JUNGLE") {
    reasons.push("Tu impacto temprano y lectura de mapa favorecen partidas con presencia global.");
  }

  if (features.styleTags.includes("utilidad") && role === "SUPPORT") {
    reasons.push("Tus señales de visión y utilidad encajan con un rol de soporte proactivo.");
  }

  if (features.styleTags.includes("farm") && (role === "ADC" || role === "MID")) {
    reasons.push("Tus métricas de farmeo se alinean con roles que convierten recursos en daño.");
  }

  return reasons;
}

function scoreRoles(features: PlayerFeatureVector): RoleScore[] {
  return features.preferredRoles.map(({ role, score }) => ({
    role,
    score,
    reasons: createRoleReasons(role, features)
  }));
}

function scoreChampions(features: PlayerFeatureVector, role: RoleName): ChampionFitScore[] {
  return championPriors
    .filter((prior) => prior.roles.includes(role))
    .map((prior) => {
      const topChampion = features.topChampions.find(
        (entry) => entry.championName === prior.championName
      );
      const championPerformance = features.championPerformances.find(
        (entry) => entry.championName === prior.championName && entry.role === role
      );
      const masterySignal = topChampion ? 18 : 0;
      const championResultSignal = championPerformance
        ? championPerformance.winRate * 18 + Math.min(15, championPerformance.games * 2)
        : 0;
      const styleSignal = prior.styleTags.reduce((acc, tag) => {
        return acc + (features.styleTags.includes(tag as PlayerStyleTag) ? 12 : 0);
      }, 0);
      const roleSignal = (features.playRateByRole[role] ?? 0) * 35;
      const winRateSignal = (features.winRateByRole[role] ?? 0) * 20;
      const score = Math.min(
        100,
        Math.round(masterySignal + championResultSignal + styleSignal + roleSignal + winRateSignal)
      );

      const reasons = [
        `Encaja con tu tendencia a jugar ${role}.`,
        `Su arquetipo favorece tu estilo ${features.styleTags.join(", ") || "estable"}.`
      ];

      if (championPerformance) {
        reasons.push(
          `Ya muestras resultados con ${prior.championName} en ${role}: ${percentage(championPerformance.winRate)} en ${championPerformance.games} partidas.`
        );
      } else if (topChampion) {
        reasons.push(`Ya tienes historial con ${prior.championName}, lo que reduce fricción de adopción.`);
      }

      return {
        championName: prior.championName,
        role,
        score,
        reasons
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function confidenceLabel(score: number): "fuerte" | "media" | "explorable" {
  if (score >= 62) return "fuerte";
  if (score >= 46) return "media";
  return "explorable";
}

function roleVerdict(score: number): "natural" | "viable" | "secundario" | "forzado" | "debil" {
  if (score >= 62) return "natural";
  if (score >= 54) return "viable";
  if (score >= 42) return "secundario";
  if (score >= 28) return "forzado";
  return "debil";
}

function buildAiProfile(
  features: PlayerFeatureVector,
  roleScores: RoleScore[],
  primaryRecommendation: RoleScore,
  championRecommendations: ChampionFitScore[]
): AIProfileInsight {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const fixNext: string[] = [];
  const keepDoing: string[] = [];
  const bestRolePerformance = features.rolePerformances[0];
  const bestChampion = features.championPerformances[0];

  if (bestRolePerformance) {
    strengths.push(
      `Tu base más sólida hoy está en ${bestRolePerformance.role}, donde ya juntas ${percentage(bestRolePerformance.winRate)} de win rate en ${bestRolePerformance.games} partidas.`
    );
  }

  if (features.styleTags.includes("mapa")) {
    strengths.push("Lees bien el mapa y apareces en peleas con timing útil.");
    keepDoing.push("Sigue priorizando rotaciones e impacto temprano cuando el mapa lo permita.");
  }

  if (features.styleTags.includes("control")) {
    strengths.push("Tu juego tiene disciplina en peleas y buena toma de decisiones alrededor del equipo.");
  }

  if (features.styleTags.includes("farm")) {
    strengths.push("Aprovechas bien el farm y conviertes recursos en presión sostenida.");
    keepDoing.push("Mantén el foco en asegurar ingresos estables antes de forzar jugadas de bajo valor.");
  }

  if (features.trend.summary[0]) {
    keepDoing.push(features.trend.summary[0]);
  }

  if (bestChampion) {
    keepDoing.push(
      `Tu pick más estable hoy es ${bestChampion.championName} ${bestChampion.role}, así que conviene seguir usándolo como referencia para tu pool.`
    );
  }

  if (!features.styleTags.includes("utilidad")) {
    weaknesses.push("Tu perfil muestra poco peso en visión y utilidad comparado con otras señales.");
    fixNext.push("Sube el estándar de visión y control de mapa, sobre todo fuera de línea.");
  }

  if (!features.styleTags.includes("control")) {
    weaknesses.push("A veces tu impacto depende más de la ejecución mecánica que de la consistencia macro.");
    fixNext.push("Trabaja la consistencia entre partidas: menos flips, mejores resets y tempos.");
  }

  if (features.consistency.overall < 55) {
    weaknesses.push("Tu rendimiento cambia demasiado entre partidas; eso baja la claridad de tu perfil competitivo.");
    fixNext.push("Reduce picks y planes de partida distintos; necesitas una identidad más repetible.");
  }

  features.winLossComparison.takeaways.slice(0, 2).forEach((takeaway) => {
    fixNext.push(takeaway);
  });

  if (features.topChampions.length > 0) {
    keepDoing.push(
      `Tus mejores resultados nacen cuando juegas alrededor de picks conocidos como ${features.topChampions
        .slice(0, 2)
        .map((entry) => entry.championName)
        .join(" y ")}.`
    );
  }

  if (strengths.length === 0) {
    strengths.push("Tu principal fortaleza hoy es la consistencia de volumen y el conocimiento de tu pool.");
  }

  if (weaknesses.length === 0) {
    weaknesses.push("No aparece una debilidad extrema, pero sí margen para especializar mejor tu estilo.");
  }

  if (fixNext.length === 0) {
    fixNext.push("Refina tu champion pool alrededor de un plan claro y reduce picks sin identidad.");
  }

  const roleOpinions = roles.map((role) => {
    const roleScore = roleScores.find((entry) => entry.role === role) ?? {
      role,
      score: 0,
      reasons: []
    };
    const rolePerformance = features.rolePerformances.find((entry) => entry.role === role);
    const champions = scoreChampions(features, role).map((entry) => entry.championName);
    const verdict = roleVerdict(roleScore.score);
    const summary = rolePerformance
      ? `${role} se ve ${verdict} para ti por ${rolePerformance.games} partidas, ${percentage(rolePerformance.winRate)} de win rate y ${rolePerformance.averageKda.toFixed(2)} de KDA.`
      : `${role} no tiene suficiente muestra real; hoy sería un rol ${verdict} más por afinidad que por evidencia.`;

    return {
      role,
      verdict,
      champions,
      summary
    };
  });

  const spamNow = championRecommendations.map((entry) => entry.championName);
  const comfortKeep = features.topChampions
    .filter((entry) => spamNow.includes(entry.championName))
    .map((entry) => entry.championName)
    .slice(0, 3);
  const learnNext = roleOpinions
    .filter((entry) => entry.role !== primaryRecommendation.role && ["natural", "viable", "secundario"].includes(entry.verdict))
    .flatMap((entry) => entry.champions)
    .filter((champion, index, array) => !spamNow.includes(champion) && array.indexOf(champion) === index)
    .slice(0, 4);
  const avoidForNow = features.championPerformances
    .filter((entry) => entry.games >= 3 && entry.winRate < 0.4)
    .map((entry) => entry.championName)
    .filter((champion, index, array) => array.indexOf(champion) === index)
    .slice(0, 3);

  return {
    identity: {
      headline: `Tu rol ideal hoy es ${primaryRecommendation.role}.`,
      summary: `Eres un jugador de perfil ${features.styleTags.join(", ") || "estable"}, con mejor respuesta cuando repites una identidad clara y juegas dentro de un plan reconocible.`,
      tags: [
        ...features.styleTags,
        features.consistency.overall >= 65 ? "consistente" : "consistencia media",
        bestChampion ? `comfort ${bestChampion.championName}` : "pool adaptable"
      ].slice(0, 5)
    },
    overview: `La lectura global apunta a ${primaryRecommendation.role} como tu mejor encaje competitivo porque ahí se alinean volumen, resultados y estabilidad. Tu perfil mejora cuando no te alejas demasiado de tus picks más probados y cuando sostienes visión y tempo entre partidas.`,
    strengths: Array.from(new Set(strengths)).slice(0, 4),
    weaknesses: Array.from(new Set(weaknesses)).slice(0, 4),
    fixNext: Array.from(new Set(fixNext)).slice(0, 4),
    keepDoing: Array.from(new Set(keepDoing)).slice(0, 4),
    primaryRole: {
      role: primaryRecommendation.role,
      confidenceLabel: confidenceLabel(primaryRecommendation.score),
      why: `Tu mejor encaje competitivo hoy está en ${primaryRecommendation.role}, donde se combinan mejor tu volumen, tu win rate, tu consistencia y tus señales naturales de estilo.`,
      evidence: [
        ...primaryRecommendation.reasons.slice(0, 2),
        features.trend.summary[0] ?? "Tu tendencia reciente no contradice esta lectura."
      ],
      champions: championRecommendations.map((entry) => entry.championName),
      playstyleFit: `Tu estilo ${features.styleTags.join(", ") || "estable"} convierte mejor en ${primaryRecommendation.role} que en el resto de roles.`
    },
    roleOpinions,
    championPlan: {
      spamNow,
      learnNext,
      comfortKeep,
      avoidForNow
    },
    winsVsLosses: features.winLossComparison.takeaways.slice(0, 3),
    trendRead: {
      historicalIdentity: `Históricamente tu perfil cae más cerca de ${bestRolePerformance?.role ?? primaryRecommendation.role}, apoyado por ${features.topChampions.slice(0, 2).map((entry) => entry.championName).join(" y ") || "tu pool actual"}.`,
      currentDirection: features.trend.summary[0] ?? "Tu tendencia reciente está bastante estable.",
      risk: features.consistency.summary[0] ?? "El principal riesgo ahora es diluir tu identidad con picks o planes demasiado distintos."
    }
  };
}

export function analyzeProfile(
  snapshot: RiotProfileSnapshot,
  sourceStatus: AnalysisResponse["sourceStatus"]
): AnalysisResponse {
  const currentSeasonYear = new Date().getUTCFullYear();
  const features = buildFeatureVector(snapshot);
  const roleScores = scoreRoles(features);
  const primaryRole = roleScores[0];
  const championRecommendations = scoreChampions(features, primaryRole.role);
  const aiProfile = buildAiProfile(
    features,
    roleScores,
    primaryRole,
    championRecommendations
  );
  const evidence = [
    `Cobertura de temporada: ${snapshot.loadedMatchCount}/${snapshot.seasonMatchCount} partidas.`,
    `Rol más frecuente: ${features.preferredRoles[0]?.role ?? "N/A"}.`,
    `SoloQ/Flex detectadas: ${features.queueSummaries.map((entry) => `${entry.label} ${entry.games}`).join(" · ")}.`,
    `Top champion pool: ${features.topChampions.map((entry) => entry.championName).join(", ")}.`,
    `Tendencia reciente: ${features.trend.summary.join(" ")}`,
    `Consistencia general: ${features.consistency.overall}/100.`
  ];

  return {
    player: {
      riotId: snapshot.riotId,
      region: snapshot.region,
      ranked: snapshot.ranked
    },
    summary: [
      {
        title: "Diagnóstico",
        content: `Tu perfil ranked de la temporada ${currentSeasonYear} apunta a ${primaryRole.role} como mejor rol objetivo. El análisis mezcla volumen, rendimiento, tendencia y consistencia sobre ${features.rankedMatchCount} partidas ranked, distinguiendo SoloQ y Flex.`
      },
      {
        title: "Cómo juegas",
        content: `Tus señales más fuertes son ${features.styleTags.join(", ") || "consistencia y volumen"}. Tus victorias se parecen a ${features.winLossComparison.takeaways[0]?.toLowerCase() ?? "un patrón estable"}, lo que ayuda a perfilar mejor tus picks y hábitos.`
      }
    ],
    roleRecommendation: primaryRole,
    championRecommendations,
    aiProfile,
    evidence,
    sourceStatus,
    features
  };
}

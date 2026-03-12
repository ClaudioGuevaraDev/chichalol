import {
  AnalysisResponse,
  RoleName,
  TeamAnalysisResponse,
  TeamChampionPlan,
  TeamConflict,
  TeamMemberSummary,
  TeamPlayerOpinion,
  TeamRoleAssignment,
  TeamSynergyHighlight
} from "@/lib/types";

const roles: RoleName[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

function getRoleScore(player: AnalysisResponse, role: RoleName) {
  return (
    player.features.preferredRoles.find((entry) => entry.role === role)?.score ??
    0
  );
}

function getRoleConfidence(score: number): TeamRoleAssignment["confidence"] {
  if (score >= 60) return "alta";
  if (score >= 42) return "media";
  return "baja";
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function getRoleChampionSuggestions(player: AnalysisResponse, role: RoleName) {
  const currentRoleSuggestions = player.championRecommendations
    .filter((entry) => entry.role === role)
    .map((entry) => entry.championName);
  const rolePerformanceSuggestions =
    player.features.rolePerformances.find((entry) => entry.role === role)?.topChampions.map(
      (entry) => entry.championName
    ) ?? [];
  const fallbackSuggestions = player.features.topChampions.map((entry) => entry.championName);

  return unique([
    ...currentRoleSuggestions,
    ...rolePerformanceSuggestions,
    ...fallbackSuggestions
  ]).slice(0, 3);
}

function buildMemberSummary(player: AnalysisResponse): TeamMemberSummary {
  return {
    riotId: player.player.riotId,
    region: player.player.region,
    primaryRole: player.roleRecommendation.role,
    secondaryRole: player.features.preferredRoles[1]?.role,
    topChampions: player.features.topChampions.map((entry) => entry.championName).slice(0, 3),
    styleTags: player.features.styleTags,
    ranked: player.player.ranked
  };
}

function buildBestAssignment(players: AnalysisResponse[]) {
  const bestByRole = new Map<RoleName, AnalysisResponse>();
  let bestScore = Number.NEGATIVE_INFINITY;

  function backtrack(
    playerIndex: number,
    usedRoles: Set<RoleName>,
    current: Map<RoleName, AnalysisResponse>,
    score: number
  ) {
    if (playerIndex >= players.length) {
      if (score > bestScore) {
        bestScore = score;
        bestByRole.clear();
        current.forEach((value, key) => bestByRole.set(key, value));
      }
      return;
    }

    const player = players[playerIndex];

    roles.forEach((role) => {
      if (usedRoles.has(role)) {
        return;
      }

      usedRoles.add(role);
      current.set(role, player);
      backtrack(playerIndex + 1, usedRoles, current, score + getRoleScore(player, role));
      current.delete(role);
      usedRoles.delete(role);
    });
  }

  backtrack(0, new Set<RoleName>(), new Map<RoleName, AnalysisResponse>(), 0);
  return bestByRole;
}

function buildAssignments(players: AnalysisResponse[]): TeamRoleAssignment[] {
  const assigned = buildBestAssignment(players);

  return roles.map((role) => {
    const player = assigned.get(role);
    const backupPlayer = players
      .filter((entry) => entry.player.riotId !== player?.player.riotId)
      .sort((left, right) => getRoleScore(right, role) - getRoleScore(left, role))[0];
    const score = player ? getRoleScore(player, role) : 0;
    const champions = player ? getRoleChampionSuggestions(player, role) : [];
    const rolePerformance = player?.features.rolePerformances.find((entry) => entry.role === role);

    return {
      role,
      player: player?.player.riotId,
      confidence: getRoleConfidence(score),
      reason: player
        ? `${player.player.riotId} encaja mejor en ${role} por volumen, score ${score} y una base de ${rolePerformance?.games ?? 0} partidas útiles en ese rol.`
        : `No hay un dueño natural para ${role} con la muestra actual del grupo.`,
      backupPlayer: backupPlayer ? backupPlayer.player.riotId : undefined,
      champions
    };
  });
}

function buildPlayerOpinions(
  players: AnalysisResponse[],
  assignments: TeamRoleAssignment[]
): TeamPlayerOpinion[] {
  return players.map((player) => {
    const assignedRole = assignments.find((entry) => entry.player === player.player.riotId)?.role;
    const bestRole = assignedRole ?? player.roleRecommendation.role;
    const secondaryRole = player.features.preferredRoles.find(
      (entry) => entry.role !== bestRole
    )?.role;
    const styleSummary = player.features.styleTags.join(", ") || "perfil estable";

    return {
      player: player.player.riotId,
      bestRole,
      secondaryRole,
      contribution: `${player.player.riotId} aporta ${styleSummary} y encaja mejor cuando juega ${bestRole} con picks como ${getRoleChampionSuggestions(player, bestRole).join(", ") || "su pool actual"}.`,
      risk:
        secondaryRole && secondaryRole !== bestRole
          ? `Si sale de ${bestRole}, su siguiente rol razonable es ${secondaryRole}, pero perdería claridad y volumen.`
          : `Su mayor riesgo es salirse de su zona fuerte y repartir demasiado el champion pool.`,
      champions: getRoleChampionSuggestions(player, bestRole)
    };
  });
}

function buildSynergies(
  players: AnalysisResponse[],
  assignments: TeamRoleAssignment[]
): TeamSynergyHighlight[] {
  const byRiotId = new Map(players.map((player) => [player.player.riotId, player]));
  const jungle = assignments.find((entry) => entry.role === "JUNGLE" && entry.player);
  const mid = assignments.find((entry) => entry.role === "MID" && entry.player);
  const adc = assignments.find((entry) => entry.role === "ADC" && entry.player);
  const support = assignments.find((entry) => entry.role === "SUPPORT" && entry.player);
  const top = assignments.find((entry) => entry.role === "TOP" && entry.player);
  const highlights: TeamSynergyHighlight[] = [];

  if (jungle?.player && mid?.player) {
    const junglePlayer = byRiotId.get(jungle.player);
    const midPlayer = byRiotId.get(mid.player);

    if (junglePlayer && midPlayer) {
      highlights.push({
        title: "Jungla + Mid",
        description: `La dupla ${jungle.player} y ${mid.player} tiene la mejor base para jugar tempo y mover el mapa temprano.`,
        players: [jungle.player, mid.player],
        champions: unique([
          ...getRoleChampionSuggestions(junglePlayer, "JUNGLE"),
          ...getRoleChampionSuggestions(midPlayer, "MID")
        ]).slice(0, 4)
      });
    }
  }

  if (adc?.player && support?.player) {
    const adcPlayer = byRiotId.get(adc.player);
    const supportPlayer = byRiotId.get(support.player);

    if (adcPlayer && supportPlayer) {
      highlights.push({
        title: "Botlane",
        description: `${adc.player} y ${support.player} forman la pareja más natural para jugar front-to-back y peleas largas.`,
        players: [adc.player, support.player],
        champions: unique([
          ...getRoleChampionSuggestions(adcPlayer, "ADC"),
          ...getRoleChampionSuggestions(supportPlayer, "SUPPORT")
        ]).slice(0, 4)
      });
    }
  }

  if (top?.player && jungle?.player) {
    const topPlayer = byRiotId.get(top.player);
    const junglePlayer = byRiotId.get(jungle.player);

    if (topPlayer && junglePlayer) {
      highlights.push({
        title: "Topside",
        description: `${top.player} y ${jungle.player} pueden sostener engage o presión de objetivos si juegan alrededor del lado fuerte.`,
        players: [top.player, jungle.player],
        champions: unique([
          ...getRoleChampionSuggestions(topPlayer, "TOP"),
          ...getRoleChampionSuggestions(junglePlayer, "JUNGLE")
        ]).slice(0, 4)
      });
    }
  }

  return highlights.slice(0, 3);
}

function buildConflicts(players: AnalysisResponse[], assignments: TeamRoleAssignment[]): TeamConflict[] {
  const conflicts: TeamConflict[] = [];
  const preferredRoleCounts = players.reduce<Record<RoleName, number>>(
    (acc, player) => {
      acc[player.roleRecommendation.role] += 1;
      return acc;
    },
    {
      TOP: 0,
      JUNGLE: 0,
      MID: 0,
      ADC: 0,
      SUPPORT: 0
    }
  );

  roles.forEach((role) => {
    if (preferredRoleCounts[role] >= 2) {
      conflicts.push({
        severity: "media",
        title: `Solapamiento en ${role}`,
        description: `Hay ${preferredRoleCounts[role]} jugadores cuyo mejor rol individual parece ${role}, así que una parte del grupo tendrá que ceder.`,
      });
    }
  });

  const supportAssignment = assignments.find((entry) => entry.role === "SUPPORT");
  if (!supportAssignment?.player || supportAssignment.confidence === "baja") {
    conflicts.push({
      severity: "alta",
      title: "Support poco natural",
      description: "El equipo no tiene un support demasiado claro; esta será una de las posiciones más forzadas del grupo."
    });
  }

  const frontlineCount = players.filter((player) =>
    player.features.styleTags.includes("frontline")
  ).length;
  if (frontlineCount < 2) {
    conflicts.push({
      severity: "media",
      title: "Poca frontline",
      description: "El grupo proyecta poco frente a frente. Conviene compensarlo con picks de engage o tanques simples."
    });
  }

  const utilityCount = players.filter((player) =>
    player.features.styleTags.includes("utilidad")
  ).length;
  if (utilityCount === 0) {
    conflicts.push({
      severity: "baja",
      title: "Baja utilidad",
      description: "Falta alguien que naturalmente juegue por visión, peel o setup. Drafts demasiado egoístas pueden quebrarse."
    });
  }

  return conflicts.slice(0, 4);
}

function buildChampionPlans(
  players: AnalysisResponse[],
  assignments: TeamRoleAssignment[]
): TeamChampionPlan[] {
  return players.map((player) => {
    const assignedRole = assignments.find((entry) => entry.player === player.player.riotId)?.role;
    const role = assignedRole ?? player.roleRecommendation.role;
    const roleChampions = getRoleChampionSuggestions(player, role);
    const safe = unique([
      ...player.features.topChampions.map((entry) => entry.championName),
      ...roleChampions
    ]).slice(0, 3);
    const avoid = unique(
      player.aiProfile.championPlan.avoidForNow.concat(
        player.features.championPerformances
          .filter((entry) => entry.games >= 2 && entry.winRate < 0.4)
          .map((entry) => entry.championName)
      )
    ).slice(0, 3);

    return {
      player: player.player.riotId,
      role,
      spamNow: roleChampions,
      safe,
      avoid
    };
  });
}

function buildCompositionSuggestion(
  players: AnalysisResponse[],
  assignments: TeamRoleAssignment[]
): TeamAnalysisResponse["compositionSuggestion"] {
  const styleCounts = players.flatMap((player) => player.features.styleTags);
  const mapCount = styleCounts.filter((tag) => tag === "mapa").length;
  const frontlineCount = styleCounts.filter((tag) => tag === "frontline").length;
  const utilityCount = styleCounts.filter((tag) => tag === "utilidad").length;
  const aggressiveCount = styleCounts.filter((tag) => tag === "agresivo").length;

  let identity = "Teamfight";
  let summary =
    "La mejor versión del grupo aparece con una comp simple, con front-to-back y ejecución clara.";
  let playPattern =
    "Buscar prioridad de objetivos, pelear con timers limpios y no forzar demasiadas jugadas creativas a la vez.";

  if (mapCount >= 2 && aggressiveCount >= 2) {
    identity = "Dive / Tempo";
    summary =
      "El grupo encaja mejor en una comp de tempo, con jungla-mid activos y follow-up rápido.";
    playPattern =
      "Jugar por tempo temprano, presión lateral y peleas cortas donde el engage marque el ritmo.";
  } else if (frontlineCount >= 2 && utilityCount >= 1) {
    identity = "Front-to-back";
    summary =
      "La comp más sana para ustedes es una de teamfight estándar con frontline, backline estable y engage sencillo.";
    playPattern =
      "Pelear alrededor de visión y objetivos, dejar que la frontline absorba y que la backline cierre.";
  }

  return {
    identity,
    summary,
    playPattern,
    assignments,
    championsByPlayer: players.map((player) => {
      const assignedRole = assignments.find((entry) => entry.player === player.player.riotId)?.role;
      return {
        player: player.player.riotId,
        role: assignedRole,
        champions: getRoleChampionSuggestions(player, assignedRole ?? player.roleRecommendation.role)
      };
    })
  };
}

export function analyzeTeam(
  players: AnalysisResponse[],
  sourceStatus: TeamAnalysisResponse["sourceStatus"]
): TeamAnalysisResponse {
  const assignments = buildAssignments(players);
  const playerOpinions = buildPlayerOpinions(players, assignments);
  const strongSynergies = buildSynergies(players, assignments);
  const conflicts = buildConflicts(players, assignments);
  const championPlans = buildChampionPlans(players, assignments);
  const compatibilityScore = Math.round(
    assignments.reduce((sum, entry) => {
      const bonus = entry.confidence === "alta" ? 1 : entry.confidence === "media" ? 0.7 : 0.4;
      return sum + bonus;
    }, 0) *
      20 -
      conflicts.filter((entry) => entry.severity === "alta").length * 6 +
      strongSynergies.length * 4
  );
  const compositionSuggestion = buildCompositionSuggestion(players, assignments);
  const headline =
    compatibilityScore >= 82
      ? "El grupo ya tiene una base real para jugar premade con roles claros."
      : compatibilityScore >= 66
        ? "Hay sinergia suficiente para armar algo serio, pero todavía con un par de roles tensos."
        : "El grupo tiene potencial, pero hoy depende de aceptar algunos roles forzados.";

  return {
    members: players.map(buildMemberSummary),
    recommendedAssignments: assignments,
    teamSummary: {
      compatibilityScore: Math.max(0, Math.min(100, compatibilityScore)),
      headline,
      summary: `La mejor lectura del grupo prioriza ${compositionSuggestion.identity} y reparte roles buscando que cada jugador conserve la mayor cantidad posible de volumen y comfort.`,
      strengths: unique([
        ...strongSynergies.map((entry) => entry.description),
        "El equipo ya tiene material para jugar con una identidad común en vez de cinco perfiles aislados."
      ]).slice(0, 4),
      risks: unique([
        ...conflicts.map((entry) => entry.description),
        "Si varios salen de sus comfort picks al mismo tiempo, la comp pierde claridad muy rápido."
      ]).slice(0, 4)
    },
    compositionSuggestion,
    playerOpinions,
    strongSynergies,
    conflicts,
    championPlans,
    fallbackPlan: {
      summary:
        "Si la distribución principal no se puede jugar, el plan B es mover solo un rol y mantener intactas las piezas más estables del equipo.",
      assignments: assignments.map((entry) => ({
        ...entry,
        player: entry.backupPlayer ?? entry.player
      }))
    },
    teamIdentity: {
      headline: `${compositionSuggestion.identity} es la identidad más natural del grupo hoy.`,
      summary:
        "No parece un equipo para drafts excesivamente complejos. Rinden mejor cuando el plan está claro, las líneas tienen función y la ejecución no depende de cinco carries a la vez."
    },
    teamRules: [
      "Jueguen alrededor de la dupla con mejor tempo, normalmente jungla y mid.",
      "No intenten drafts donde nadie quiera ceder recursos o utilidad.",
      "Si falta frontline natural, compensen con engage simple y backline segura.",
      "Mantengan pools cortos por rol en vez de reinventar la comp cada partida."
    ],
    sourceStatus
  };
}

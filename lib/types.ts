export type SupportedRegion = "LAS" | "LAN";
export type ExternalServiceName = "riot" | "gemini";

export type QueueType =
  | "RANKED_SOLO"
  | "RANKED_FLEX"
  | "NORMAL"
  | "ARAM"
  | "UNKNOWN";

export type PlayerStyleTag =
  | "agresivo"
  | "control"
  | "farm"
  | "utilidad"
  | "mapa"
  | "frontline";

export type RoleName = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

export interface MatchPerformance {
  matchId: string;
  gameEndedAt: number;
  queue: QueueType;
  championName: string;
  role: RoleName;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  neutralMinionsKilled: number;
  gameDuration: number;
  earlyKillParticipation: number;
}

export interface RankedSnapshot {
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface ChampionMasteryEntry {
  championName: string;
  championLevel: number;
  championPoints: number;
}

export interface RiotProfileSnapshot {
  riotId: string;
  region: SupportedRegion;
  puuid: string;
  summonerLevel?: number;
  matches: MatchPerformance[];
  ranked: {
    solo?: RankedSnapshot;
    flex?: RankedSnapshot;
  };
  mastery: ChampionMasteryEntry[];
  seasonYear: number;
  seasonMatchCount: number;
  loadedMatchCount: number;
}

export interface MetricScore {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface QueueSummary {
  queue: QueueType | "ALL";
  label: string;
  games: number;
  winRate: number;
  averageKda: number;
  topChampion?: string;
  rankLabel?: string;
}

export interface QueueBreakdown {
  queue: QueueType | "ALL";
  label: string;
  games: number;
  winRate: number;
  averageKda: number;
  averageVisionPerMinute: number;
  topChampion?: string;
  preferredRoles: Array<{ role: RoleName; score: number }>;
  winRateByRole: Record<RoleName, number>;
  playRateByRole: Record<RoleName, number>;
  topChampions: Array<{ championName: string; games: number; winRate: number }>;
  topChampionsByRole: Record<
    RoleName,
    Array<{ championName: string; games: number; winRate: number }>
  >;
  styleTags: PlayerStyleTag[];
}

export interface RolePerformance {
  role: RoleName;
  games: number;
  winRate: number;
  averageKda: number;
  averageCsPerMinute: number;
  averageVisionPerMinute: number;
  averageDamagePerMinute: number;
  averageGoldPerMinute: number;
  topChampions: Array<{ championName: string; games: number; winRate: number }>;
}

export interface ChampionPerformance {
  championName: string;
  role: RoleName;
  games: number;
  winRate: number;
  averageKda: number;
  averageCsPerMinute: number;
  averageDamagePerMinute: number;
  averageVisionPerMinute: number;
}

export interface RecentMatchInsight {
  matchId: string;
  gameEndedAt: number;
  queue: QueueType;
  championName: string;
  role: RoleName;
  win: boolean;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  csPerMinute: number;
  damagePerMinute: number;
  visionPerMinute: number;
  durationMinutes: number;
}

export interface WinLossComparison {
  wins: {
    games: number;
    winRate: number;
    averageKda: number;
    averageCsPerMinute: number;
    averageVisionPerMinute: number;
    averageDamagePerMinute: number;
    averageDeaths: number;
  };
  losses: {
    games: number;
    winRate: number;
    averageKda: number;
    averageCsPerMinute: number;
    averageVisionPerMinute: number;
    averageDamagePerMinute: number;
    averageDeaths: number;
  };
  takeaways: string[];
}

export interface TrendInsight {
  recentGames: number;
  previousGames: number;
  recentWinRate: number;
  previousWinRate: number;
  recentKda: number;
  previousKda: number;
  recentVisionPerMinute: number;
  previousVisionPerMinute: number;
  summary: string[];
}

export interface ConsistencyInsight {
  overall: number;
  kda: number;
  deaths: number;
  vision: number;
  summary: string[];
}

export interface QueueDetailedInsight {
  queue: QueueType | "ALL";
  rolePerformances: RolePerformance[];
  championPerformances: ChampionPerformance[];
  recentMatches: RecentMatchInsight[];
  trend: TrendInsight;
  consistency: ConsistencyInsight;
  winLossComparison: WinLossComparison;
}

export interface PlayerFeatureVector {
  matchCount: number;
  rankedMatchCount: number;
  confidence: number;
  preferredRoles: Array<{ role: RoleName; score: number }>;
  winRateByRole: Record<RoleName, number>;
  playRateByRole: Record<RoleName, number>;
  styleTags: PlayerStyleTag[];
  topChampions: Array<{ championName: string; games: number; winRate: number }>;
  rolePerformances: RolePerformance[];
  championPerformances: ChampionPerformance[];
  recentMatches: RecentMatchInsight[];
  trend: TrendInsight;
  consistency: ConsistencyInsight;
  winLossComparison: WinLossComparison;
  queueDetailedInsights: QueueDetailedInsight[];
  queueSummaries: QueueSummary[];
  queueBreakdowns: QueueBreakdown[];
  metrics: MetricScore[];
}

export interface RoleScore {
  role: RoleName;
  score: number;
  reasons: string[];
}

export interface ChampionFitScore {
  championName: string;
  role: RoleName;
  score: number;
  reasons: string[];
}

export interface SummarySection {
  title: string;
  content: string;
}

export interface ExternalServiceStatus {
  service: ExternalServiceName;
  available: boolean;
  message: string;
  retryAfterSeconds: number | null;
  checkedAt: number;
}

export interface AIProfileInsight {
  identity: {
    headline: string;
    summary: string;
    tags: string[];
  };
  overview: string;
  strengths: string[];
  weaknesses: string[];
  fixNext: string[];
  keepDoing: string[];
  primaryRole: {
    role: RoleName;
    confidenceLabel: "fuerte" | "media" | "explorable";
    why: string;
    evidence: string[];
    champions: string[];
    playstyleFit: string;
  };
  roleOpinions: Array<{
    role: RoleName;
    verdict: "natural" | "viable" | "secundario" | "forzado" | "debil";
    champions: string[];
    summary: string;
  }>;
  championPlan: {
    spamNow: string[];
    learnNext: string[];
    comfortKeep: string[];
    avoidForNow: string[];
  };
  winsVsLosses: string[];
  trendRead: {
    historicalIdentity: string;
    currentDirection: string;
    risk: string;
  };
}

export interface AnalysisResponse {
  player: {
    riotId: string;
    region: SupportedRegion;
    ranked: {
      solo?: RankedSnapshot;
      flex?: RankedSnapshot;
    };
  };
  summary: SummarySection[];
  roleRecommendation: RoleScore;
  championRecommendations: ChampionFitScore[];
  aiProfile: AIProfileInsight;
  evidence: string[];
  sourceStatus: {
    riot: "live" | "mock";
    ai: "live" | "fallback";
    warnings: string[];
  };
  features: PlayerFeatureVector;
}

export interface TeamMemberInput {
  gameName: string;
  tagLine: string;
  region: SupportedRegion;
}

export interface TeamMemberSummary {
  riotId: string;
  region: SupportedRegion;
  primaryRole: RoleName;
  secondaryRole?: RoleName;
  topChampions: string[];
  styleTags: PlayerStyleTag[];
  ranked: {
    solo?: RankedSnapshot;
    flex?: RankedSnapshot;
  };
}

export interface TeamRoleAssignment {
  role: RoleName;
  player?: string;
  confidence: "alta" | "media" | "baja";
  reason: string;
  backupPlayer?: string;
  champions: string[];
}

export interface TeamPlayerOpinion {
  player: string;
  bestRole: RoleName;
  secondaryRole?: RoleName;
  contribution: string;
  risk: string;
  champions: string[];
}

export interface TeamSynergyHighlight {
  title: string;
  description: string;
  players: string[];
  champions: string[];
}

export interface TeamConflict {
  severity: "alta" | "media" | "baja";
  title: string;
  description: string;
}

export interface TeamChampionPlan {
  player: string;
  role?: RoleName;
  spamNow: string[];
  safe: string[];
  avoid: string[];
}

export interface TeamCompositionSuggestion {
  identity: string;
  summary: string;
  playPattern: string;
  assignments: TeamRoleAssignment[];
  championsByPlayer: Array<{
    player: string;
    role?: RoleName;
    champions: string[];
  }>;
}

export interface TeamAnalysisResponse {
  members: TeamMemberSummary[];
  recommendedAssignments: TeamRoleAssignment[];
  teamSummary: {
    compatibilityScore: number;
    headline: string;
    summary: string;
    strengths: string[];
    risks: string[];
  };
  compositionSuggestion: TeamCompositionSuggestion;
  playerOpinions: TeamPlayerOpinion[];
  strongSynergies: TeamSynergyHighlight[];
  conflicts: TeamConflict[];
  championPlans: TeamChampionPlan[];
  fallbackPlan: {
    summary: string;
    assignments: TeamRoleAssignment[];
  };
  teamIdentity: {
    headline: string;
    summary: string;
  };
  teamRules: string[];
  sourceStatus: {
    riot: "live" | "mock";
    ai: "live" | "fallback";
    warnings: string[];
  };
}

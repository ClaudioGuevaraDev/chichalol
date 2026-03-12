import Image from "next/image";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CircleDot,
  Flame,
  History,
  LineChart,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getChampionImagePath } from "@/lib/champion-assets";
import { AnalysisResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProfileResults({
  result,
  mode
}: {
  result: AnalysisResponse;
  mode: "stats" | "ai";
}) {
  return (
    <div className="grid gap-6">
      {mode === "stats" ? <StatsView result={result} /> : <AiView result={result} />}
    </div>
  );
}

function StatsView({ result }: { result: AnalysisResponse }) {
  const [selectedQueue, setSelectedQueue] = useState<"ALL" | "RANKED_SOLO" | "RANKED_FLEX">(
    "ALL"
  );
  const selectedBreakdown = useMemo(
    () =>
      result.features.queueBreakdowns.find((entry) => entry.queue === selectedQueue) ??
      result.features.queueBreakdowns[0],
    [result.features.queueBreakdowns, selectedQueue]
  );
  const selectedDetailedInsight = useMemo(
    () =>
      result.features.queueDetailedInsights.find((entry) => entry.queue === selectedQueue) ??
      result.features.queueDetailedInsights[0],
    [result.features.queueDetailedInsights, selectedQueue]
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            <CardTitle className="text-2xl text-white">Por cola</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Elige si quieres ver el análisis combinado o separado entre SoloQ y Flex.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {result.features.queueSummaries
            .filter((queue) => ["ALL", "RANKED_SOLO", "RANKED_FLEX"].includes(queue.queue))
            .map((queue) => (
            <div
              key={queue.queue}
              className={cn(
                "cursor-pointer rounded-3xl border p-5 transition",
                selectedQueue === queue.queue
                  ? "border-sky-400/40 bg-sky-500/10 shadow-glow"
                  : "border-white/8 bg-panel/70 hover:border-sky-500/20"
              )}
              onClick={() => setSelectedQueue(queue.queue as typeof selectedQueue)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {queue.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">{queue.games}</p>
              <p className="mt-1 text-base text-slate-300">partidas</p>
              <div className="mt-5 grid gap-2.5 text-sm text-slate-300">
                {queue.rankLabel ? <p className="font-medium text-sky-200">Division: {queue.rankLabel}</p> : null}
                <p>WR: {Math.round(queue.winRate * 100)}%</p>
                <p>KDA: {queue.averageKda.toFixed(2)}</p>
                <div className="flex items-center gap-2">
                  {queue.topChampion ? (
                    <ChampionAvatar championName={queue.topChampion} size={26} />
                  ) : null}
                  <p>Top pick: {queue.topChampion ?? "N/A"}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <p className="px-1 text-lg font-medium text-slate-300">
          Analisis estadistico de ranked para {selectedBreakdown.label.toLowerCase()}.
        </p>
        <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-card">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <MetricCard label="Partidas" value={String(selectedBreakdown.games)} />
          <MetricCard label="Win rate" value={`${Math.round(selectedBreakdown.winRate * 100)}%`} />
          <MetricCard label="KDA promedio" value={selectedBreakdown.averageKda.toFixed(2)} />
          <MetricCard
            label="Vision por minuto"
            value={selectedBreakdown.averageVisionPerMinute.toFixed(2)}
          />
          <MetricCard
            label="Top champion"
            value={selectedBreakdown.topChampion ?? "N/A"}
          />
          <MetricCard
            label="Cobertura"
            value={
              result.features.metrics.find((metric) => metric.label === "Cobertura")?.value ??
              "N/A"
            }
          />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Distribución por rol</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Volumen y score relativo por rol detectado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {selectedBreakdown.preferredRoles.map((role) => (
            <div
              key={role.role}
              className="rounded-3xl border border-white/8 bg-panel/70 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{role.role}</p>
                  <p className="text-sm text-slate-300">
                    Pick rate{" "}
                    {Math.round((selectedBreakdown.playRateByRole[role.role] ?? 0) * 100)}%
                    {" · "}
                    WR {Math.round((selectedBreakdown.winRateByRole[role.role] ?? 0) * 100)}%
                  </p>
                </div>
                <Badge>{role.score}</Badge>
              </div>
              <Progress className="mt-4" value={role.score} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Rendimiento por rol</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Qué roles realmente te sostienen cuando toca competir.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {selectedDetailedInsight.rolePerformances.map((role) => (
            <div
              key={role.role}
              className="rounded-3xl border border-white/8 bg-panel/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xl font-semibold text-white">{role.role}</p>
                <Badge variant="secondary">{role.games} partidas</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniMetric label="WR" value={`${Math.round(role.winRate * 100)}%`} />
                <MiniMetric label="KDA" value={role.averageKda.toFixed(2)} />
                <MiniMetric label="CS/min" value={role.averageCsPerMinute.toFixed(1)} />
                <MiniMetric label="Vision/min" value={role.averageVisionPerMinute.toFixed(2)} />
                <MiniMetric label="Daño/min" value={Math.round(role.averageDamagePerMinute).toString()} />
                <MiniMetric label="Oro/min" value={Math.round(role.averageGoldPerMinute).toString()} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {role.topChampions.map((champion) => (
                  <ChipChampion
                    key={`${role.role}-${champion.championName}`}
                    championName={champion.championName}
                    subtitle={`${champion.games} · ${Math.round(champion.winRate * 100)}%`}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Swords className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Top campeones</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Vista global de la cola elegida y desglose por rol cuando exista muestra suficiente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
              Global
            </p>
            {selectedBreakdown.topChampions.map((champion) => (
              <div
                key={champion.championName}
                className="rounded-3xl border border-white/8 bg-panel/70 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ChampionAvatar championName={champion.championName} size={52} />
                    <div>
                      <h3 className="text-xl font-semibold">{champion.championName}</h3>
                      <p className="text-sm text-slate-300">
                        {champion.games} partidas · WR {Math.round(champion.winRate * 100)}%
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{champion.games}</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {(["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const).map((role) => {
              const roleChampions = selectedBreakdown.topChampionsByRole[role];

              return (
                <div
                  key={role}
                  className="rounded-3xl border border-white/8 bg-panel/70 p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                    {role}
                  </p>
                  <div className="mt-4 grid gap-3">
                    {roleChampions.length > 0 ? (
                      roleChampions.slice(0, 3).map((champion) => (
                        <div
                          key={`${role}-${champion.championName}`}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/20 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <ChampionAvatar championName={champion.championName} size={42} />
                            <div>
                              <p className="font-medium text-white">{champion.championName}</p>
                              <p className="text-sm text-slate-300">
                                {champion.games} partidas · WR {Math.round(champion.winRate * 100)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-300">
                        Sin suficientes partidas para este rol en {selectedBreakdown.label.toLowerCase()}.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Rendimiento por campeón</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Picks que ya tienen volumen y resultados, no solo presencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {selectedDetailedInsight.championPerformances.slice(0, 8).map((champion) => (
            <div
              key={`${champion.championName}-${champion.role}`}
              className="rounded-3xl border border-white/8 bg-panel/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ChampionAvatar championName={champion.championName} size={52} />
                  <div>
                    <p className="text-xl font-semibold text-white">{champion.championName}</p>
                    <p className="text-sm text-slate-300">{champion.role}</p>
                  </div>
                </div>
                <Badge variant="secondary">{champion.games} partidas</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniMetric label="WR" value={`${Math.round(champion.winRate * 100)}%`} />
                <MiniMetric label="KDA" value={champion.averageKda.toFixed(2)} />
                <MiniMetric label="CS/min" value={champion.averageCsPerMinute.toFixed(1)} />
                <MiniMetric label="Daño/min" value={Math.round(champion.averageDamagePerMinute).toString()} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <LineChart className="h-5 w-5 text-sky-400" />
              <CardTitle className="text-2xl text-white">Tendencia y consistencia</CardTitle>
            </div>
            <CardDescription className="text-base leading-7 text-slate-300">
              Cómo vienes cerrando tus últimas partidas y cuán repetible es tu nivel.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="rounded-3xl border border-white/8 bg-panel/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                Tendencia
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniMetric
                  label={`Ultimas ${selectedDetailedInsight.trend.recentGames}`}
                  value={`${Math.round(selectedDetailedInsight.trend.recentWinRate * 100)}% WR`}
                />
                <MiniMetric
                  label={`Previas ${selectedDetailedInsight.trend.previousGames}`}
                  value={`${Math.round(selectedDetailedInsight.trend.previousWinRate * 100)}% WR`}
                />
                <MiniMetric label="KDA reciente" value={selectedDetailedInsight.trend.recentKda.toFixed(2)} />
                <MiniMetric label="KDA previo" value={selectedDetailedInsight.trend.previousKda.toFixed(2)} />
              </div>
              <div className="mt-4 grid gap-2">
                {selectedDetailedInsight.trend.summary.map((item) => (
                  <InsightRow key={item} text={item} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-panel/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                Consistencia
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniMetric label="General" value={`${selectedDetailedInsight.consistency.overall}/100`} />
                <MiniMetric label="KDA" value={`${selectedDetailedInsight.consistency.kda}/100`} />
                <MiniMetric label="Muertes" value={`${selectedDetailedInsight.consistency.deaths}/100`} />
                <MiniMetric label="Vision" value={`${selectedDetailedInsight.consistency.vision}/100`} />
              </div>
              <div className="mt-4 grid gap-2">
                {selectedDetailedInsight.consistency.summary.map((item) => (
                  <InsightRow key={item} text={item} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-sky-400" />
              <CardTitle className="text-2xl text-white">Wins vs losses</CardTitle>
            </div>
            <CardDescription className="text-base leading-7 text-slate-300">
              Qué cambia cuando ganas y qué se rompe cuando pierdes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="Wins KDA" value={selectedDetailedInsight.winLossComparison.wins.averageKda.toFixed(2)} />
              <MiniMetric label="Losses KDA" value={selectedDetailedInsight.winLossComparison.losses.averageKda.toFixed(2)} />
              <MiniMetric label="Wins vision" value={selectedDetailedInsight.winLossComparison.wins.averageVisionPerMinute.toFixed(2)} />
              <MiniMetric label="Losses vision" value={selectedDetailedInsight.winLossComparison.losses.averageVisionPerMinute.toFixed(2)} />
              <MiniMetric label="Wins muertes" value={selectedDetailedInsight.winLossComparison.wins.averageDeaths.toFixed(1)} />
              <MiniMetric label="Losses muertes" value={selectedDetailedInsight.winLossComparison.losses.averageDeaths.toFixed(1)} />
            </div>
            <div className="grid gap-2">
              {selectedDetailedInsight.winLossComparison.takeaways.map((item) => (
                <InsightRow key={item} text={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Historial reciente</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Últimas ranked usadas para enriquecer la lectura del perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {selectedDetailedInsight.recentMatches.map((match) => (
            <div
              key={match.matchId}
              className="grid gap-4 rounded-3xl border border-white/8 bg-panel/75 p-4 md:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]"
            >
              <div className="flex items-center gap-3">
                <ChampionAvatar championName={match.championName} size={48} />
                <div>
                  <p className="text-lg font-semibold text-white">{match.championName}</p>
                  <p className="text-sm text-slate-300">
                    {queueLabel(match.queue)} · {match.role} · {formatRelativeDate(match.gameEndedAt)}
                  </p>
                </div>
              </div>
              <MiniMetric label="Resultado" value={match.win ? "Win" : "Loss"} />
              <MiniMetric label="KDA" value={`${match.kills}/${match.deaths}/${match.assists}`} />
              <MiniMetric label="CS/min" value={match.csPerMinute.toFixed(1)} />
              <MiniMetric label="Vision/min" value={match.visionPerMinute.toFixed(2)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function AiView({ result }: { result: AnalysisResponse }) {
  return (
    <>
      <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/14 via-card to-card shadow-[0_24px_60px_rgba(2,8,23,0.35)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Rol recomendado</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            La respuesta principal del modo IA: dónde encajas mejor y con qué picks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-3xl border border-sky-500/25 bg-panel/80 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                  Tu rol ideal
                </p>
                <div className="flex items-center gap-3">
                  <h3 className="text-5xl font-semibold tracking-tight text-white">
                    {result.aiProfile.primaryRole.role}
                  </h3>
                  <Badge className="border-sky-300/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/10">
                    Confianza {result.aiProfile.primaryRole.confidenceLabel}
                  </Badge>
                </div>
                <p className="max-w-3xl text-lg leading-8 text-slate-100">
                  {result.aiProfile.primaryRole.why}
                </p>
                <p className="text-base leading-7 text-slate-300">
                  {result.aiProfile.primaryRole.playstyleFit}
                </p>
              </div>
              <div className="rounded-3xl border border-sky-400/20 bg-slate-950/25 p-4 lg:w-[320px]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                  Evidencia
                </p>
                <div className="mt-4 grid gap-3">
                  {result.aiProfile.primaryRole.evidence.map((item) => (
                    <InsightRow key={item} text={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <ChampionStrip
            title="Campeones recomendados"
            champions={result.aiProfile.primaryRole.champions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Swords className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Opinión por rol</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Cómo te vemos en cada rol, incluso cuando la muestra no es perfecta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {result.aiProfile.roleOpinions.map((roleOpinion) => (
            <div
              key={roleOpinion.role}
              className="rounded-3xl border border-white/8 bg-panel/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xl font-semibold text-white">{roleOpinion.role}</p>
                <Badge variant="secondary">{roleOpinion.verdict}</Badge>
              </div>
              <p className="mt-4 text-base leading-8 text-slate-100">
                {roleOpinion.summary}
              </p>
              <ChampionStrip
                title="Picks sugeridos"
                champions={roleOpinion.champions}
                compact
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/12 via-card to-card shadow-[0_24px_60px_rgba(2,8,23,0.35)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Identidad del jugador</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            La lectura más compacta de cómo juegas y qué perfil competitivo proyectas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-3xl border border-sky-500/20 bg-panel/80 p-6">
            <p className="text-3xl font-semibold leading-tight text-white">
              {result.aiProfile.identity.headline}
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-100">
              {result.aiProfile.identity.summary}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {result.aiProfile.identity.tags.map((tag) => (
                <Badge
                  key={tag}
                  className="border-white/10 bg-slate-950/25 text-slate-100 hover:bg-slate-950/25"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-panel/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
              Lectura general
            </p>
            <p className="mt-4 text-base leading-8 text-slate-100">
              {result.aiProfile.overview}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-2xl text-white">Campeones para ti</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Picks separados por intención, no solo por volumen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <ChampionStrip title="Spam ahora" champions={result.aiProfile.championPlan.spamNow} />
          <ChampionStrip title="Aprender después" champions={result.aiProfile.championPlan.learnNext} compact />
          <ChampionStrip title="Comfort que sí mantener" champions={result.aiProfile.championPlan.comfortKeep} compact />
          <ChampionStrip title="Evitar por ahora" champions={result.aiProfile.championPlan.avoidForNow} compact />
        </CardContent>
      </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
      <InsightListCard
        icon={Trophy}
        title="Puntos fuertes"
        description="Las señales más valiosas que hoy sostienen tu rendimiento."
        items={result.aiProfile.strengths}
      />
      <InsightListCard
        icon={AlertTriangle}
        title="Puntos débiles"
        description="Lo que más te está frenando o te vuelve inconsistente."
        items={result.aiProfile.weaknesses}
      />
      <InsightListCard
        icon={ShieldCheck}
        title="Debes seguir haciendo"
        description="Hábitos positivos que ya te dan valor y conviene conservar."
        items={result.aiProfile.keepDoing}
      />
      <InsightListCard
        icon={Target}
        title="Qué debes corregir"
        description="Las correcciones más rentables para tu siguiente salto."
        items={result.aiProfile.fixNext}
      />
      </div>

    </>
  );
}

function InsightListCard({
  icon: Icon,
  title,
  description,
  items
}: {
  icon: typeof Trophy;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-2.5">
            <Icon className="h-4 w-4 text-cyan-200" />
          </div>
          <CardTitle className="text-2xl text-white">{title}</CardTitle>
        </div>
        <CardDescription className="text-base leading-7 text-slate-300">{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-2xl border border-white/8 bg-panel/75 p-4"
          >
            <CircleDot className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
            <p className="text-base leading-8 text-slate-100">{item}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/25 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function InsightRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-950/25 p-3">
      <CircleDot className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
      <p className="text-sm leading-7 text-slate-100">{text}</p>
    </div>
  );
}

function ChipChampion({
  championName,
  subtitle
}: {
  championName: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/25 px-3 py-2">
      <ChampionAvatar championName={championName} size={34} />
      <div>
        <p className="text-sm font-semibold text-white">{championName}</p>
        <p className="text-xs text-slate-300">{subtitle}</p>
      </div>
    </div>
  );
}

export function ChampionStrip({
  title,
  champions,
  compact = false
}: {
  title: string;
  champions: string[];
  compact?: boolean;
}) {
  if (champions.length === 0) {
    return (
      <div className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">{title}</p>
        <div className="rounded-2xl border border-white/8 bg-panel/75 p-4">
          <p className="text-sm text-slate-300">No hay picks suficientemente claros por ahora.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">{title}</p>
      <div className="flex flex-wrap gap-3">
        {champions.map((champion) => (
          <div
            key={champion}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-panel/80 px-3 py-2.5"
          >
            <ChampionAvatar championName={champion} size={compact ? 32 : 40} />
            <span className="text-base font-semibold text-white">{champion}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-panel/75 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function queueLabel(queue: string) {
  if (queue === "RANKED_SOLO") return "SoloQ";
  if (queue === "RANKED_FLEX") return "Flex";
  return queue;
}

function formatRelativeDate(timestamp: number) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 24) {
    return `hace ${Math.max(1, hours)}h`;
  }

  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function ChampionAvatar({
  championName,
  size
}: {
  championName: string;
  size: number;
}) {
  const imagePath = getChampionImagePath(championName);

  if (!imagePath) {
    return (
      <div
        className="rounded-2xl border border-white/10 bg-slate-900/80"
        style={{ height: size, width: size }}
      />
    );
  }

  return (
    <Image
      src={imagePath}
      alt={championName}
      width={size}
      height={size}
      className="rounded-2xl border border-white/10 object-cover"
    />
  );
}

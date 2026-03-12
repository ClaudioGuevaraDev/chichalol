"use client";

import { LoaderCircle, Plus, Search, Shield, Sparkles, Swords, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChampionStrip } from "@/components/profile-results";
import { SupportedRegion, TeamAnalysisResponse, TeamMemberInput } from "@/lib/types";
import { cn } from "@/lib/utils";

const emptyMember = (region: SupportedRegion): TeamMemberInput => ({
  gameName: "",
  tagLine: "",
  region
});

export function TeamSynergy({
  primaryPlayer
}: {
  primaryPlayer: {
    riotId: string;
    region: SupportedRegion;
  };
}) {
  const [teammates, setTeammates] = useState<TeamMemberInput[]>([
    emptyMember(primaryPlayer.region)
  ]);
  const [result, setResult] = useState<TeamAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const parsedPrimary = useMemo(() => parseRiotId(primaryPlayer.riotId, primaryPlayer.region), [primaryPlayer]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        primaryPlayer: parsedPrimary,
        teammates: teammates.filter((member) => member.gameName.trim() && member.tagLine.trim())
      };

      const response = await fetch("/api/analyze-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as TeamAnalysisResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible analizar la sinergia.");
      }

      setResult(data);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/12 via-card to-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-200" />
            <CardTitle className="text-2xl text-white">Sinergia</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Suma hasta 4 nicknames y arma una lectura de premade: quién debería jugar cada rol, qué composición les conviene y dónde chocan sus perfiles.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-3xl border border-white/8 bg-panel/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
              Jugador base
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">{primaryPlayer.riotId}</p>
            <p className="mt-1 text-sm text-slate-300">
              Región {primaryPlayer.region}. Este perfil ya entra como ancla del equipo.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              {teammates.map((member, index) => (
                <div
                  key={`member-${index}`}
                  className="rounded-3xl border border-white/8 bg-panel/75 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                        Compañero {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Riot ID del jugador que quieres sumar a la premade.
                      </p>
                    </div>
                    {teammates.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="border border-white/8 bg-slate-950/25 text-slate-300 hover:bg-slate-950/40 hover:text-white"
                        onClick={() =>
                          setTeammates((current) => current.filter((_, currentIndex) => currentIndex !== index))
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_160px]">
                    <div className="grid gap-2">
                      <Label htmlFor={`gameName-${index}`}>Game Name</Label>
                      <Input
                        id={`gameName-${index}`}
                        value={member.gameName}
                        placeholder="Ej: DuoPartner"
                        onChange={(event) =>
                          setTeammates((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === index
                                ? { ...entry, gameName: event.target.value }
                                : entry
                            )
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`tagLine-${index}`}>Tag Line</Label>
                      <Input
                        id={`tagLine-${index}`}
                        value={member.tagLine}
                        placeholder="Ej: LAS"
                        onChange={(event) =>
                          setTeammates((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === index
                                ? { ...entry, tagLine: event.target.value }
                                : entry
                            )
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`region-${index}`}>Región</Label>
                      <Select
                        id={`region-${index}`}
                        value={member.region}
                        onChange={(event) =>
                          setTeammates((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === index
                                ? { ...entry, region: event.target.value as SupportedRegion }
                                : entry
                            )
                          )
                        }
                      >
                        <option value="LAS">LAS</option>
                        <option value="LAN">LAN</option>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="ghost"
                className="border border-white/8 bg-panel/75 text-slate-200 hover:bg-panel"
                disabled={teammates.length >= 4}
                onClick={() =>
                  setTeammates((current) => [...current, emptyMember(primaryPlayer.region)])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar compañero
              </Button>
              <Button type="submit" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Buscando sinergia
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Analizar equipo
                  </>
                )}
              </Button>
            </div>
          </form>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result ? <TeamSynergyResults result={result} /> : null}
    </div>
  );
}

function TeamSynergyResults({ result }: { result: TeamAnalysisResponse }) {
  return (
    <div className="grid gap-6">
      <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/14 via-card to-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-200" />
            <CardTitle className="text-2xl text-white">Asignación recomendada</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            La lectura principal: quién debería jugar cada rol en esta premade.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {result.recommendedAssignments.map((assignment) => (
            <div
              key={assignment.role}
              className="rounded-3xl border border-white/8 bg-panel/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-semibold text-white">{assignment.role}</p>
                <Badge
                  className={cn(
                    "border-white/10",
                    assignment.confidence === "alta"
                      ? "bg-emerald-500/12 text-emerald-100"
                      : assignment.confidence === "media"
                        ? "bg-sky-500/12 text-sky-100"
                        : "bg-amber-500/12 text-amber-100"
                  )}
                >
                  {assignment.confidence}
                </Badge>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {assignment.player ?? "Sin dueño claro"}
              </p>
              <p className="mt-3 text-base leading-7 text-slate-100">{assignment.reason}</p>
              {assignment.backupPlayer ? (
                <p className="mt-3 text-sm text-slate-300">
                  Plan B: {assignment.backupPlayer}
                </p>
              ) : null}
              <div className="mt-4">
                <ChampionStrip title="Picks sugeridos" champions={assignment.champions} compact />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-cyan-200" />
              <CardTitle className="text-2xl text-white">Resumen del equipo</CardTitle>
            </div>
            <CardDescription className="text-base leading-7 text-slate-300">
              Qué tan bien encajan y qué identidad proyectan juntos.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-3xl border border-sky-500/20 bg-panel/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                Compatibilidad
              </p>
              <div className="mt-3 flex items-center gap-3">
                <p className="text-5xl font-semibold text-white">
                  {result.teamSummary.compatibilityScore}
                </p>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-300">/ 100</p>
              </div>
              <p className="mt-4 text-2xl font-semibold leading-tight text-white">
                {result.teamSummary.headline}
              </p>
              <p className="mt-3 text-base leading-8 text-slate-100">
                {result.teamSummary.summary}
              </p>
            </div>
            <InsightCollection
              title="Fortalezas"
              icon={<Sparkles className="h-4 w-4 text-cyan-200" />}
              items={result.teamSummary.strengths}
            />
            <InsightCollection
              title="Riesgos"
              icon={<Shield className="h-4 w-4 text-cyan-200" />}
              items={result.teamSummary.risks}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Swords className="h-5 w-5 text-cyan-200" />
              <CardTitle className="text-2xl text-white">Composición sugerida</CardTitle>
            </div>
            <CardDescription className="text-base leading-7 text-slate-300">
              Qué estilo de draft y plan de partida parece más natural para este grupo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-3xl border border-white/8 bg-panel/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                Identidad
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {result.compositionSuggestion.identity}
              </p>
              <p className="mt-3 text-base leading-8 text-slate-100">
                {result.compositionSuggestion.summary}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {result.compositionSuggestion.playPattern}
              </p>
            </div>
            <div className="grid gap-3">
              {result.compositionSuggestion.championsByPlayer.map((entry) => (
                <div
                  key={`${entry.player}-${entry.role ?? "none"}`}
                  className="rounded-3xl border border-white/8 bg-panel/75 p-4"
                >
                  <p className="text-lg font-semibold text-white">
                    {entry.player} {entry.role ? `· ${entry.role}` : ""}
                  </p>
                  <div className="mt-3">
                    <ChampionStrip title="Pool sugerido" champions={entry.champions} compact />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-200" />
            <CardTitle className="text-2xl text-white">Opinión por jugador</CardTitle>
          </div>
          <CardDescription className="text-base leading-7 text-slate-300">
            Qué aporta cada integrante y qué pasa cuando sale de su mejor zona.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {result.playerOpinions.map((player) => (
            <div
              key={player.player}
              className="rounded-3xl border border-white/8 bg-panel/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-semibold text-white">{player.player}</p>
                <Badge variant="secondary">
                  {player.bestRole}
                  {player.secondaryRole ? ` / ${player.secondaryRole}` : ""}
                </Badge>
              </div>
              <p className="mt-4 text-base leading-8 text-slate-100">{player.contribution}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{player.risk}</p>
              <div className="mt-4">
                <ChampionStrip title="Campeones para este rol" champions={player.champions} compact />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <CardTitle className="text-2xl text-white">Sinergias fuertes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {result.strongSynergies.map((synergy) => (
              <div
                key={synergy.title}
                className="rounded-3xl border border-white/8 bg-panel/75 p-5"
              >
                <p className="text-xl font-semibold text-white">{synergy.title}</p>
                <p className="mt-3 text-base leading-8 text-slate-100">{synergy.description}</p>
                <p className="mt-3 text-sm text-slate-300">
                  {synergy.players.join(" + ")}
                </p>
                <div className="mt-4">
                  <ChampionStrip title="Picks que conectan" champions={synergy.champions} compact />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-cyan-200" />
              <CardTitle className="text-2xl text-white">Conflictos del grupo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {result.conflicts.map((conflict) => (
              <div
                key={conflict.title}
                className="rounded-3xl border border-white/8 bg-panel/75 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-semibold text-white">{conflict.title}</p>
                  <Badge variant="secondary">{conflict.severity}</Badge>
                </div>
                <p className="mt-3 text-base leading-8 text-slate-100">
                  {conflict.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Swords className="h-5 w-5 text-cyan-200" />
            <CardTitle className="text-2xl text-white">Campeones por jugador</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {result.championPlans.map((plan) => (
            <div
              key={plan.player}
              className="rounded-3xl border border-white/8 bg-panel/75 p-5"
            >
              <p className="text-2xl font-semibold text-white">
                {plan.player} {plan.role ? `· ${plan.role}` : ""}
              </p>
              <div className="mt-4 grid gap-4">
                <ChampionStrip title="Spam ahora" champions={plan.spamNow} compact />
                <ChampionStrip title="Seguros" champions={plan.safe} compact />
                <ChampionStrip title="Evitar por ahora" champions={plan.avoid} compact />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <CardTitle className="text-2xl text-white">Identidad del equipo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-3xl border border-sky-500/20 bg-panel/80 p-5">
              <p className="text-3xl font-semibold leading-tight text-white">
                {result.teamIdentity.headline}
              </p>
              <p className="mt-4 text-base leading-8 text-slate-100">
                {result.teamIdentity.summary}
              </p>
            </div>
            <InsightCollection
              title="Reglas simples para jugar juntos"
              icon={<Users className="h-4 w-4 text-cyan-200" />}
              items={result.teamRules}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-cyan-200" />
              <CardTitle className="text-2xl text-white">Plan B</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-3xl border border-white/8 bg-panel/75 p-5">
              <p className="text-base leading-8 text-slate-100">{result.fallbackPlan.summary}</p>
            </div>
            <div className="grid gap-3">
              {result.fallbackPlan.assignments.map((assignment) => (
                <div
                  key={`fallback-${assignment.role}`}
                  className="rounded-2xl border border-white/8 bg-panel/75 p-4"
                >
                  <p className="text-lg font-semibold text-white">
                    {assignment.role}: {assignment.player ?? "Sin dueño claro"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function parseRiotId(riotId: string, region: SupportedRegion): TeamMemberInput {
  const [gameName, rawTagLine] = riotId.split("#");

  return {
    gameName,
    tagLine: rawTagLine ?? region,
    region
  };
}

function InsightCollection({
  title,
  icon,
  items
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
          {title}
        </p>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/8 bg-panel/75 p-4 text-base leading-8 text-slate-100"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

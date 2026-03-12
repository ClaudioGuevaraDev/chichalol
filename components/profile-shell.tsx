"use client";

import { MessageSquareQuote, Radar, Sparkles } from "lucide-react";
import { useState } from "react";

import { ProfileForm } from "@/components/profile-form";
import { ProfileResults } from "@/components/profile-results";
import { TeamSynergy } from "@/components/team-synergy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AnalysisResponse } from "@/lib/types";

type ViewMode = "stats" | "ai";
type ProductMode = "profile" | "team";

export function ProfileShell() {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("stats");
  const [productMode, setProductMode] = useState<ProductMode>("profile");
  const currentSeasonYear = new Date().getFullYear();

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <Card className="overflow-hidden border-sky-400/25 bg-background/50 shadow-[0_0_0_1px_rgba(56,139,253,0.08),0_28px_80px_rgba(2,8,23,0.55)]">
        <CardHeader className="gap-5">
          <div className="flex items-start gap-4">
            <div className="rounded-3xl border border-sky-400/25 bg-sky-500/12 p-3.5 shadow-[0_0_30px_rgba(56,139,253,0.16)]">
              <Radar className="h-6 w-6 text-cyan-200" />
            </div>
            <div className="space-y-2">
              <CardTitle className="max-w-4xl text-4xl font-semibold leading-tight text-white">
                Perfil, estadísticas y lectura de IA en una sola búsqueda.
              </CardTitle>
              <CardDescription className="max-w-3xl text-lg leading-8 text-slate-300">
                Escribe tu Riot ID y cambia entre un modo estadístico, más cercano a un tracker competitivo, y un modo de análisis IA que interpreta tu rendimiento en toda la temporada {currentSeasonYear}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ProfileForm onLoaded={setResult} onError={setError} />
          {error ? (
            <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!result ? (
        <div className="grid gap-4">
          <Card className="border-white/10 bg-card/60">
            <CardContent className="grid gap-4 p-6">
              <div className="flex items-center gap-3 text-sky-200">
                <MessageSquareQuote className="h-5 w-5" />
                <p className="text-sm font-medium">
                  El resumen aparecerá aquí, en el mismo flujo, apenas termines la búsqueda.
                </p>
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-28 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4">
          <section className="space-y-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
              Perfil invocador
            </p>
            <h2 className="text-5xl font-semibold tracking-tight text-white">
              {result.player.riotId} · {result.player.region}
            </h2>
          </section>
          <div className="rounded-[1.75rem] border border-white/10 bg-card/75 p-5 shadow-[0_20px_55px_rgba(2,8,23,0.3)]">
            <div className="grid gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                  <p className="text-2xl font-semibold tracking-tight text-white">Modo</p>
                </div>
                <p className="mt-3 text-base leading-7 text-slate-300">
                  Elige entre vista estadística y análisis guiado por IA.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
              {[
                { id: "profile", label: "Perfil" },
                { id: "team", label: "Sinergia" }
              ].map((mode) => (
                <Button
                  key={mode.id}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-13 rounded-[1rem] border text-base font-semibold",
                    productMode === mode.id
                      ? "border-sky-300/45 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
                      : "border-white/8 bg-panel/70 text-slate-300 hover:bg-secondary/80 hover:text-white"
                  )}
                  onClick={() => setProductMode(mode.id as ProductMode)}
                >
                  {mode.label}
                </Button>
              ))}
              </div>
            </div>
          </div>
          {productMode === "profile" ? (
            <>
              <div className="rounded-[1.75rem] border border-white/10 bg-card/75 p-5 shadow-[0_20px_55px_rgba(2,8,23,0.3)]">
                <div className="grid gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-cyan-300" />
                      <p className="text-2xl font-semibold tracking-tight text-white">Vista</p>
                    </div>
                    <p className="mt-3 text-base leading-7 text-slate-300">
                      Elige entre la lectura estadística o la lectura guiada por IA del modo Perfil.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "stats", label: "Estadístico" },
                      { id: "ai", label: "Análisis IA" }
                    ].map((mode) => (
                      <Button
                        key={mode.id}
                        type="button"
                        variant="ghost"
                        className={cn(
                          "h-13 rounded-[1rem] border text-base font-semibold",
                          viewMode === mode.id
                            ? "border-sky-300/45 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
                            : "border-white/8 bg-panel/70 text-slate-300 hover:bg-secondary/80 hover:text-white"
                        )}
                        onClick={() => setViewMode(mode.id as ViewMode)}
                      >
                        {mode.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <ProfileResults result={result} mode={viewMode} />
            </>
          ) : (
            <TeamSynergy
              primaryPlayer={{
                riotId: result.player.riotId,
                region: result.player.region
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AnalysisResponse, SupportedRegion } from "@/lib/types";

const initialForm = {
  gameName: "",
  tagLine: "",
  region: "LAS" as SupportedRegion
};

export function ProfileForm({
  onLoaded,
  onError
}: {
  onLoaded: (result: AnalysisResponse) => void;
  onError: (message: string | null) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    onError(null);

    try {
      const response = await fetch("/api/analyze-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as AnalysisResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible analizar el perfil.");
      }

      onLoaded(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="rounded-[1.75rem] border border-white/10 bg-panel/65 p-3 shadow-glow">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_160px_auto] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="gameName">Game Name</Label>
            <Input
              id="gameName"
              placeholder="Ej: Chicha"
              value={form.gameName}
              onChange={(event) =>
                setForm((current) => ({ ...current, gameName: event.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tagLine">Tag Line</Label>
            <Input
              id="tagLine"
              placeholder="Ej: LAS"
              value={form.tagLine}
              onChange={(event) =>
                setForm((current) => ({ ...current, tagLine: event.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="region">Región</Label>
            <Select
              id="region"
              value={form.region}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  region: event.target.value as SupportedRegion
                }))
              }
            >
              <option value="LAS">LAS</option>
              <option value="LAN">LAN</option>
            </Select>
          </div>
          <Button className="w-full md:mt-7" size="lg" disabled={isLoading} type="submit">
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Analizando
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </>
            )}
          </Button>
        </div>
      </div>
      <p className="px-1 text-sm text-muted-foreground">
        Ingresa tu Riot ID y región. El análisis traerá la temporada actual y aparecerá debajo en el mismo flujo.
      </p>
    </form>
  );
}

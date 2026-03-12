import { readEnv } from "@/lib/env";
import { ExternalServiceName, ExternalServiceStatus } from "@/lib/types";

declare global {
  // eslint-disable-next-line no-var
  var __chichalolServiceStatusCache:
    | { value: ExternalServiceStatus[]; expiresAt: number }
    | undefined;
}

const CACHE_TTL_MS = 30_000;

function buildStatus(
  service: ExternalServiceName,
  available: boolean,
  message: string,
  retryAfterSeconds: number | null = null
): ExternalServiceStatus {
  return {
    service,
    available,
    message,
    retryAfterSeconds,
    checkedAt: Date.now()
  };
}

async function validateRiotService(): Promise<ExternalServiceStatus> {
  const apiKey = readEnv("RIOT_API_KEY");

  if (!apiKey) {
    return buildStatus("riot", false, "Riot API no está configurada.");
  }

  const response = await fetch(
    "https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/_codex/_health",
    {
      headers: {
        "X-Riot-Token": apiKey
      },
      cache: "no-store"
    }
  );

  if (response.ok || response.status === 404) {
    return buildStatus("riot", true, "Riot API disponible.");
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") ?? "60");
    return buildStatus(
      "riot",
      false,
      "Riot API no está disponible actualmente por límite de uso.",
      Math.max(1, retryAfter)
    );
  }

  if (response.status === 401 || response.status === 403) {
    return buildStatus("riot", false, "Riot API rechazó la credencial configurada.");
  }

  if (response.status >= 500) {
    return buildStatus("riot", false, "Riot API está respondiendo con error del servicio.", 60);
  }

  return buildStatus("riot", false, `Riot API devolvió ${response.status}.`);
}

async function validateGeminiService(): Promise<ExternalServiceStatus> {
  const apiKey = readEnv("GEMINI_API_KEY");
  const model = readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";

  if (!apiKey) {
    return buildStatus("gemini", false, "Gemini API no está configurada.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`,
    {
      cache: "no-store"
    }
  );

  if (response.ok) {
    return buildStatus("gemini", true, "Gemini API disponible.");
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") ?? "60");
    return buildStatus(
      "gemini",
      false,
      "Gemini API no está disponible actualmente por límite de uso.",
      Math.max(1, retryAfter)
    );
  }

  if (response.status === 401 || response.status === 403) {
    return buildStatus("gemini", false, "Gemini API rechazó la credencial configurada.");
  }

  if (response.status >= 500) {
    return buildStatus("gemini", false, "Gemini API está respondiendo con error del servicio.", 60);
  }

  return buildStatus("gemini", false, `Gemini API devolvió ${response.status}.`);
}

export async function getExternalServiceStatuses(force = false): Promise<ExternalServiceStatus[]> {
  const cached = globalThis.__chichalolServiceStatusCache;

  if (!force && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const statuses = await Promise.all([validateRiotService(), validateGeminiService()]);

  globalThis.__chichalolServiceStatusCache = {
    value: statuses,
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  return statuses;
}

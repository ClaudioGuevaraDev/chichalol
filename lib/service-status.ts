import { readEnv } from "@/lib/env";
import { ExternalServiceName, ExternalServiceStatus } from "@/lib/types";

declare global {
  // eslint-disable-next-line no-var
  var __chichalolServiceStatusCache:
    | { value: ExternalServiceStatus[]; expiresAt: number }
    | undefined;
  // eslint-disable-next-line no-var
  var __chichalolServiceCooldowns:
    | Partial<Record<ExternalServiceName, { retryUntil: number; message: string }>>
    | undefined;
}

const CACHE_TTL_MS = 30_000;

function getCooldownStore() {
  if (!globalThis.__chichalolServiceCooldowns) {
    globalThis.__chichalolServiceCooldowns = {};
  }

  return globalThis.__chichalolServiceCooldowns;
}

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

function readCooldownStatus(service: ExternalServiceName): ExternalServiceStatus | null {
  const cooldown = getCooldownStore()[service];

  if (!cooldown) {
    return null;
  }

  const retryAfterSeconds = Math.ceil((cooldown.retryUntil - Date.now()) / 1000);

  if (retryAfterSeconds <= 0) {
    delete getCooldownStore()[service];
    return null;
  }

  return buildStatus(service, false, cooldown.message, retryAfterSeconds);
}

export function markExternalServiceCooldown(
  service: ExternalServiceName,
  retryAfterSeconds: number,
  message: string
) {
  getCooldownStore()[service] = {
    retryUntil: Date.now() + Math.max(1, retryAfterSeconds) * 1000,
    message
  };

  const cached = globalThis.__chichalolServiceStatusCache;

  if (cached) {
    globalThis.__chichalolServiceStatusCache = {
      value: cached.value.map((status) =>
        status.service === service
          ? buildStatus(service, false, message, Math.max(1, retryAfterSeconds))
          : status
      ),
      expiresAt: Date.now() + CACHE_TTL_MS
    };
  }
}

export function getKnownExternalServiceStatuses(): ExternalServiceStatus[] {
  return (["riot", "gemini"] as const)
    .map((service) => readCooldownStatus(service))
    .filter((status): status is ExternalServiceStatus => Boolean(status));
}

async function validateRiotService(): Promise<ExternalServiceStatus> {
  const cooldownStatus = readCooldownStatus("riot");

  if (cooldownStatus) {
    return cooldownStatus;
  }

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
    markExternalServiceCooldown(
      "riot",
      Math.max(1, retryAfter),
      "Riot API no está disponible actualmente por límite de uso."
    );
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
  const cooldownStatus = readCooldownStatus("gemini");

  if (cooldownStatus) {
    return cooldownStatus;
  }

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
    markExternalServiceCooldown(
      "gemini",
      Math.max(1, retryAfter),
      "Gemini API no está disponible actualmente por límite de uso."
    );
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

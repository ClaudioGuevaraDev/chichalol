import { readEnv } from "@/lib/env";
import { AnalysisResponse, TeamAnalysisResponse } from "@/lib/types";

export interface AIRecommendationProvider {
  generateSummary(input: AnalysisResponse): Promise<AnalysisResponse>;
}

export interface TeamAIRecommendationProvider {
  generateTeamSummary(input: TeamAnalysisResponse): Promise<TeamAnalysisResponse>;
}

class GeminiRecommendationProvider implements AIRecommendationProvider {
  async generateSummary(input: AnalysisResponse): Promise<AnalysisResponse> {
    const apiKey = readEnv("GEMINI_API_KEY");
    const model = readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";

    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const prompt = `
Eres un analista de League of Legends orientado a scouting y coaching. Usa las nuevas señales del payload, especialmente:
- rolePerformances
- championPerformances
- recentMatches
- trend
- consistency
- winLossComparison

No repitas estadísticas crudas si no aportan una conclusión. Prioriza lectura de perfil, fortalezas, debilidades, mejoras, rol recomendado y picks concretos.

Devuelve JSON con shape:
{
  "summary": [{"title": string, "content": string}],
  "aiProfile": {
    "identity": {
      "headline": string,
      "summary": string,
      "tags": string[]
    },
    "overview": string,
    "strengths": string[],
    "weaknesses": string[],
    "fixNext": string[],
    "keepDoing": string[],
    "primaryRole": {
      "role": string,
      "confidenceLabel": "fuerte | media | explorable",
      "why": string,
      "evidence": string[],
      "champions": string[],
      "playstyleFit": string
    },
    "roleOpinions": [{
      "role": string,
      "verdict": "natural | viable | secundario | forzado | debil",
      "summary": string,
      "champions": string[]
    }],
    "championPlan": {
      "spamNow": string[],
      "learnNext": string[],
      "comfortKeep": string[],
      "avoidForNow": string[]
    },
    "winsVsLosses": string[],
    "trendRead": {
      "historicalIdentity": string,
      "currentDirection": string,
      "risk": string
    }
  },
  "roleRecommendation": {"role": string, "score": number, "reasons": string[]},
  "championRecommendations": [{"championName": string, "role": string, "score": number, "reasons": string[]}],
  "evidence": string[]
}

Input:
${JSON.stringify(input, null, 2)}
`;

    const parsed = await generateJson<Partial<AnalysisResponse>>(apiKey, model, prompt);

    return {
      ...input,
      summary: parsed.summary ?? input.summary,
      aiProfile: parsed.aiProfile ?? input.aiProfile,
      roleRecommendation: parsed.roleRecommendation ?? input.roleRecommendation,
      championRecommendations:
        parsed.championRecommendations ?? input.championRecommendations,
      evidence: parsed.evidence ?? input.evidence,
      sourceStatus: {
        ...input.sourceStatus,
        ai: "live"
      }
    };
  }
}

class GeminiTeamRecommendationProvider implements TeamAIRecommendationProvider {
  async generateTeamSummary(input: TeamAnalysisResponse): Promise<TeamAnalysisResponse> {
    const apiKey = readEnv("GEMINI_API_KEY");
    const model = readEnv("GEMINI_MODEL") ?? "gemini-2.5-flash";

    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const compactPayload = {
      members: input.members,
      recommendedAssignments: input.recommendedAssignments,
      teamSummary: input.teamSummary,
      compositionSuggestion: input.compositionSuggestion,
      playerOpinions: input.playerOpinions,
      strongSynergies: input.strongSynergies,
      conflicts: input.conflicts,
      championPlans: input.championPlans
    };

    const prompt = `
Eres un analista de premades de League of Legends. No repitas datos sin interpretarlos.

Tu tarea es mejorar un informe de sinergia de equipo ya estructurado. Debes:
- mantener la asignación recomendada de roles salvo que haya un error evidente
- explicar mejor la identidad del equipo
- afinar fortalezas y riesgos
- hacer más útiles las opiniones por jugador
- mantener el tono directo, corto y práctico

Devuelve JSON con shape:
{
  "teamSummary": {
    "headline": "string",
    "summary": "string",
    "strengths": ["string"],
    "risks": ["string"]
  },
  "teamIdentity": {
    "headline": "string",
    "summary": "string"
  },
  "playerOpinions": [{
    "player": "string",
    "bestRole": "string",
    "secondaryRole": "string",
    "contribution": "string",
    "risk": "string",
    "champions": ["string"]
  }],
  "teamRules": ["string"]
}

Input:
${JSON.stringify(compactPayload, null, 2)}
`;

    const parsed = await generateJson<Partial<TeamAnalysisResponse>>(apiKey, model, prompt);

    return {
      ...input,
      teamSummary: {
        ...input.teamSummary,
        ...parsed.teamSummary
      },
      teamIdentity: parsed.teamIdentity ?? input.teamIdentity,
      playerOpinions: parsed.playerOpinions ?? input.playerOpinions,
      teamRules: parsed.teamRules ?? input.teamRules,
      sourceStatus: {
        ...input.sourceStatus,
        ai: "live"
      }
    };
  }
}

async function generateJson<T>(apiKey: string, model: string, prompt: string): Promise<T> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return JSON.parse(text) as T;
}

export async function enrichWithAI(
  response: AnalysisResponse
): Promise<AnalysisResponse> {
  try {
    const provider = new GeminiRecommendationProvider();
    return await provider.generateSummary(response);
  } catch {
    return {
      ...response,
      sourceStatus: {
        ...response.sourceStatus,
        ai: "fallback"
      }
    };
  }
}

export async function enrichTeamWithAI(
  response: TeamAnalysisResponse
): Promise<TeamAnalysisResponse> {
  try {
    const provider = new GeminiTeamRecommendationProvider();
    return await provider.generateTeamSummary(response);
  } catch {
    return {
      ...response,
      sourceStatus: {
        ...response.sourceStatus,
        ai: "fallback"
      }
    };
  }
}

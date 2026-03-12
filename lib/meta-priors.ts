import { RoleName } from "@/lib/types";

export interface ChampionPrior {
  championName: string;
  roles: RoleName[];
  styleTags: string[];
  farmDemand: number;
  utility: number;
  aggression: number;
  frontline: number;
  execution: number;
}

export const championPriors: ChampionPrior[] = [
  {
    championName: "Ahri",
    roles: ["MID"],
    styleTags: ["control", "mapa"],
    farmDemand: 72,
    utility: 58,
    aggression: 66,
    frontline: 12,
    execution: 58
  },
  {
    championName: "Amumu",
    roles: ["JUNGLE", "SUPPORT"],
    styleTags: ["frontline", "utilidad", "mapa"],
    farmDemand: 42,
    utility: 77,
    aggression: 55,
    frontline: 88,
    execution: 34
  },
  {
    championName: "Caitlyn",
    roles: ["ADC"],
    styleTags: ["farm", "control"],
    farmDemand: 84,
    utility: 28,
    aggression: 62,
    frontline: 8,
    execution: 51
  },
  {
    championName: "Jarvan IV",
    roles: ["JUNGLE", "TOP"],
    styleTags: ["agresivo", "mapa", "frontline"],
    farmDemand: 48,
    utility: 53,
    aggression: 78,
    frontline: 76,
    execution: 44
  },
  {
    championName: "Jhin",
    roles: ["ADC"],
    styleTags: ["control", "utilidad"],
    farmDemand: 80,
    utility: 44,
    aggression: 63,
    frontline: 6,
    execution: 61
  },
  {
    championName: "Leona",
    roles: ["SUPPORT"],
    styleTags: ["frontline", "utilidad", "agresivo"],
    farmDemand: 12,
    utility: 86,
    aggression: 72,
    frontline: 91,
    execution: 36
  },
  {
    championName: "Lux",
    roles: ["MID", "SUPPORT"],
    styleTags: ["control", "utilidad"],
    farmDemand: 60,
    utility: 74,
    aggression: 50,
    frontline: 10,
    execution: 47
  },
  {
    championName: "Miss Fortune",
    roles: ["ADC", "SUPPORT"],
    styleTags: ["agresivo", "control"],
    farmDemand: 75,
    utility: 30,
    aggression: 71,
    frontline: 7,
    execution: 42
  },
  {
    championName: "Nautilus",
    roles: ["SUPPORT", "TOP"],
    styleTags: ["frontline", "utilidad"],
    farmDemand: 18,
    utility: 83,
    aggression: 63,
    frontline: 94,
    execution: 29
  },
  {
    championName: "Orianna",
    roles: ["MID"],
    styleTags: ["control", "utilidad"],
    farmDemand: 76,
    utility: 68,
    aggression: 49,
    frontline: 8,
    execution: 64
  },
  {
    championName: "Ornn",
    roles: ["TOP"],
    styleTags: ["frontline", "control", "utilidad"],
    farmDemand: 44,
    utility: 67,
    aggression: 38,
    frontline: 96,
    execution: 33
  },
  {
    championName: "Sejuani",
    roles: ["JUNGLE", "TOP"],
    styleTags: ["frontline", "mapa", "utilidad"],
    farmDemand: 41,
    utility: 79,
    aggression: 52,
    frontline: 92,
    execution: 35
  },
  {
    championName: "Thresh",
    roles: ["SUPPORT"],
    styleTags: ["utilidad", "control", "mapa"],
    farmDemand: 14,
    utility: 90,
    aggression: 55,
    frontline: 42,
    execution: 73
  },
  {
    championName: "Vi",
    roles: ["JUNGLE"],
    styleTags: ["agresivo", "mapa", "frontline"],
    farmDemand: 45,
    utility: 46,
    aggression: 81,
    frontline: 68,
    execution: 41
  },
  {
    championName: "Xayah",
    roles: ["ADC"],
    styleTags: ["farm", "control"],
    farmDemand: 83,
    utility: 34,
    aggression: 59,
    frontline: 9,
    execution: 67
  }
];

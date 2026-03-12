import manifest from "@/public/champions/manifest.json";

const championEntries = manifest.champions.map((champion) => ({
  ...champion,
  normalized: normalizeChampionName(champion.id),
  normalizedName: normalizeChampionName(champion.name)
}));

function normalizeChampionName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function getChampionImagePath(championName: string) {
  const normalized = normalizeChampionName(championName);
  const found = championEntries.find(
    (champion) =>
      champion.normalized === normalized || champion.normalizedName === normalized
  );

  return found?.image ?? null;
}

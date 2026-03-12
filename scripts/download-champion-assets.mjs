import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "public", "champions");
const squareDir = path.join(outputDir, "square");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

async function downloadFile(url, filePath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
}

async function main() {
  await ensureDir(squareDir);

  const versions = await fetchJson(
    "https://ddragon.leagueoflegends.com/api/versions.json"
  );
  const version = versions[0];

  if (!version) {
    throw new Error("Unable to determine latest Data Dragon version");
  }

  const championData = await fetchJson(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
  );

  const champions = Object.values(championData.data).map((champion) => ({
    id: champion.id,
    key: champion.key,
    name: champion.name,
    title: champion.title,
    image: `/champions/square/${champion.image.full}`
  }));

  for (const champion of champions) {
    const filePath = path.join(squareDir, `${champion.id}.png`);
    const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
    await downloadFile(imageUrl, filePath);
  }

  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    count: champions.length,
    champions
  };

  await fs.writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(`Downloaded ${champions.length} champion assets for patch ${version}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

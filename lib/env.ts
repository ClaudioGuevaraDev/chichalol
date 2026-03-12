import fs from "node:fs";
import path from "node:path";

declare global {
  // eslint-disable-next-line no-var
  var __chichalolEnvLoaded: boolean | undefined;
}

const envFiles = [".env.local", ".env"];

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return key ? { key, value } : null;
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");

  contents.split(/\r?\n/).forEach((line) => {
    const parsed = parseEnvLine(line);

    if (!parsed) {
      return;
    }

    if (!process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
    }
  });
}

function ensureEnvLoaded() {
  if (globalThis.__chichalolEnvLoaded) {
    return;
  }

  envFiles.forEach((fileName) => {
    loadEnvFile(path.join(process.cwd(), fileName));
  });

  globalThis.__chichalolEnvLoaded = true;
}

export function readEnv(name: string): string | undefined {
  ensureEnvLoaded();

  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

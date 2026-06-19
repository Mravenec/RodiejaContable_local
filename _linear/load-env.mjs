/**
 * Carga _linear/.env en process.env (solo claves aún no definidas).
 * El archivo .env está en .gitignore — uso local / MCP / scripts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(ROOT, ".env");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // LINEAR_* del archivo .env siempre gana (evita $env:LINEAR_API_KEY viejo en la sesión)
    if (key.startsWith("LINEAR_")) process.env[key] = value;
    else if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

export const envFileLoaded = loadDotEnv(ENV_FILE);
export const envFilePath = ENV_FILE;

#!/usr/bin/env node
/**
 * Ejecuta `next` en el único sprint_*.mjs activo (excluye linear-*.mjs).
 * Uso: cd _linear && node scripts/sprint-next.mjs
 */
import { readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const here = dirname(fileURLToPath(import.meta.url));
const scriptsDir = here;

const sprints = readdirSync(scriptsDir).filter(
  (f) => f.startsWith("sprint_") && f.endsWith(".mjs") && !f.includes("sprint-next")
);

if (sprints.length === 0) {
  console.error("\n❌ No hay sprint activo (scripts/sprint_<nombre>.mjs).\n");
  console.error("   Orden: Fase 0 limpieza → plan_sprint_<nombre>.html → aprobación → sprint_<nombre>.mjs create\n");
  process.exit(1);
}

if (sprints.length > 1) {
  console.error("\n❌ Hay más de un sprint_*.mjs activo. Fase 0: dejar solo uno.\n");
  sprints.forEach((f) => console.error(`   - ${f}`));
  process.exit(1);
}

const script = join(scriptsDir, sprints[0]);
const r = spawnSync(process.execPath, [script, "next"], {
  stdio: "inherit",
  cwd: join(here, ".."),
});
process.exit(r.status ?? 1);

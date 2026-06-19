#!/usr/bin/env node
/**
 * Valida que plan_sprint_<nombre>.html cumple contrato Linear (README Fase 2).
 * Uso: cd _linear && node scripts/validate-plan-html.mjs plans/plan_sprint_foo.html
 */
import { readFileSync, existsSync } from "fs";
import { resolve, basename } from "path";

const file = process.argv[2];
if (!file) {
  console.error("\n❌ Uso: node scripts/validate-plan-html.mjs plans/plan_sprint_<nombre>.html\n");
  process.exit(1);
}

const path = resolve(process.cwd(), file);
if (!existsSync(path)) {
  console.error(`\n❌ No existe: ${path}\n`);
  process.exit(1);
}

const name = basename(path);
if (!name.startsWith("plan_sprint_") || !name.endsWith(".html")) {
  console.error("\n❌ Solo valida archivos plan_sprint_<nombre>.html\n");
  process.exit(1);
}

const html = readFileSync(path, "utf8");

/** @type {{ id: string, label: string, test: (s: string) => boolean }[]} */
const CHECKS = [
  {
    id: "fases7",
    label: "Proceso 7 fases (tabla Fase 0–6)",
    test: (s) => /Linear\s*[—–-]\s*Proceso obligatorio|7 fases/i.test(s) && /Fase\s*0/i.test(s) && /Fase\s*6/i.test(s),
  },
  {
    id: "metadatos",
    label: "Metadatos Linear (EPIC_NAME / script .mjs)",
    test: (s) => /EPIC_NAME|Metadatos del sprint/i.test(s) && /sprint_.*\.mjs/i.test(s),
  },
  {
    id: "gates",
    label: "Tabla Gates (GATE_HTTP / GATE_BD explícitos)",
    test: (s) => /GATE_HTTP/i.test(s) && /GATE_BD|GATE_SQL/i.test(s),
  },
  {
    id: "tabla_issues",
    label: "Tabla de issues (rol, blocks, archivos)",
    test: (s) => /Tabla de issues/i.test(s) && /blocks/i.test(s) && /role:(backend|database|frontend|orchestrator)/i.test(s),
  },
  {
    id: "handoff",
    label: "Handoff checklist cruzado",
    test: (s) => /handoff/i.test(s) && /ítem\s*1|item\s*1/i.test(s),
  },
  {
    id: "ciclo",
    label: "Ciclo por issue (next → checklist → Testing → Done)",
    test: (s) => /Ciclo por issue/i.test(s) && /checklist/i.test(s) && /Testing/i.test(s) && /\bDone\b/i.test(s),
  },
  {
    id: "comandos",
    label: "Comandos script (.mjs create, cleanup)",
    test: (s) => /\.mjs create/i.test(s) && /cleanup/i.test(s) && /sprint-next/i.test(s),
  },
  {
    id: "testing_rol",
    label: "Testing local por rol",
    test: (s) => /Testing local por rol|Testing por rol/i.test(s),
  },
  {
    id: "descripciones",
    label: "Descripciones/checklists verbatim para Linear",
    test: (s) => /Descripciones issue|Checklist/i.test(s) && /- \[ \]/i.test(s),
  },
  {
    id: "fase6",
    label: "Fase 6 cierre (resumen_sprint + epic Completed)",
    test: (s) => /Fase\s*6/i.test(s) && /resumen_sprint/i.test(s) && /Completed/i.test(s),
  },
  {
    id: "pipeline",
    label: "Pipeline visual (DB → BE → .http → FE)",
    test: (s) => /Pipeline visual|Pipeline/i.test(s) && /\.http/i.test(s),
  },
  {
    id: "aprobacion",
    label: "Estado aprobación PENDIENTE/APROBADO",
    test: (s) => /Aprobación/i.test(s) && /PENDIENTE|APROBADO/i.test(s),
  },
];

const failed = CHECKS.filter((c) => !c.test(html));

console.log(`\n📋 Validación plan Linear: ${name}\n`);

if (failed.length === 0) {
  console.log(`✅ ${CHECKS.length}/${CHECKS.length} secciones obligatorias presentes.\n`);
  console.log("   Listo para Fase 4: sprint_<nombre>.mjs create (tras ✅ APROBADO humano).\n");
  process.exit(0);
}

console.log(`❌ Faltan ${failed.length}/${CHECKS.length} requisitos:\n`);
for (const f of failed) {
  console.log(`   • [${f.id}] ${f.label}`);
}
console.log("\n   Completar plan desde _plantilla_rodieja.html");
console.log("   Regla: .cursor/rules/linear-plan-html-obligatorio.mdc\n");
process.exit(1);

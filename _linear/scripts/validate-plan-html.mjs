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

/** Diagnóstico exhaustivo — debe alinearse 1:1 con checklists (linear-plan-diagnostico-exhaustivo.mdc) */
const DIAG_CHECKS = [
  {
    id: "d1_estado",
    label: "D1 Diagnóstico — estado actual del código",
    test: (s) => /Diagnóstico\s*[—–-]\s*Estado actual/i.test(s),
  },
  {
    id: "d2_flujos",
    label: "D2 Flujo deseado vs flujo actual",
    test: (s) => /Flujo deseado/i.test(s) && /Flujo actual|flujo real/i.test(s),
  },
  {
    id: "d3_hallazgos",
    label: "D3 Hallazgos causa raíz (archivos/endpoints)",
    test: (s) => /Hallazgos.*causa raíz|causa raíz/i.test(s) && /OportunidadesAudatex|AudatexController|AudatexService/i.test(s),
  },
  {
    id: "d4_hibrida",
    label: "D4 Arquitectura híbrida (tabla componente × fuente)",
    test: (s) => /Arquitectura híbrida/i.test(s) && /Portal|BD local|getOportunidadesFromDb/i.test(s),
  },
  {
    id: "d5_solucion",
    label: "D5 Solución paso a paso mapeada a ROD-N",
    test: (s) => /Solución objetivo|Solución paso a paso/i.test(s) && /ROD-0[1-9]/i.test(s),
  },
  {
    id: "d6_resumen",
    label: "D6 Resumen ejecutivo Problema → Causa → Fix",
    test: (s) => /Resumen ejecutivo/i.test(s) && /Causa/i.test(s) && /Fix/i.test(s),
  },
  {
    id: "d7_comportamiento",
    label: "D7 Comportamiento esperado al refrescar",
    test: (s) => /Comportamiento esperado/i.test(s) && /refrescar|incremental/i.test(s),
  },
  {
    id: "d8_regla_oro",
    label: "D8 Regla de oro (BD fuente de verdad, no reset)",
    test: (s) => /Regla de oro/i.test(s) && /fuente de verdad|Nunca borrar/i.test(s),
  },
];

/** Briefing autocontenido para IA — cualquier agente debe entender sin chat previo */
const AI_CHECKS = [
  {
    id: "ai_instrucciones",
    label: "INSTRUCCIONES PARA LA IA (id=para-la-ia)",
    test: (s) => /id=["']para-la-ia["']|INSTRUCCIONES PARA LA IA/i.test(s),
  },
  {
    id: "ai_mermaid",
    label: "Diagramas Mermaid sequenceDiagram (deseado + actual)",
    test: (s) => (s.match(/sequenceDiagram/g) || []).length >= 2 && /class=["']mermaid["']|class=mermaid/.test(s),
  },
  {
    id: "ai_codigo",
    label: "Hallazgos con rutas de archivo y fragmentos de código",
    test: (s) => /code-ref|code-ref-path/i.test(s) && /OportunidadesAudatex\.js/i.test(s) && /AudatexController\.java/i.test(s),
  },
  {
    id: "ai_checklist_seq",
    label: "Sección checklist secuencial (un ítem a la vez)",
    test: (s) => /Checklist secuencial/i.test(s) && /un ítem a la vez|un solo ítem|ítem a ítem/i.test(s),
  },
  {
    id: "ai_problema",
    label: "Narrativa problema (reinicia desde cero / contexto sprint)",
    test: (s) => /reinicia desde cero|Diagnóstico:/i.test(s) && /qué vamos a abordar|qué abordamos|cómo lo vamos a abordar/i.test(s),
  },
];

const ALL_CHECKS = [...CHECKS, ...DIAG_CHECKS, ...AI_CHECKS];
const failed = ALL_CHECKS.filter((c) => !c.test(html));

console.log(`\n📋 Validación plan Linear: ${name}\n`);

if (failed.length === 0) {
  console.log(`✅ ${CHECKS.length}/${CHECKS.length} Linear + ${DIAG_CHECKS.length}/${DIAG_CHECKS.length} diagnóstico + ${AI_CHECKS.length}/${AI_CHECKS.length} briefing IA.\n`);
  console.log("   Listo para Fase 4: sprint_<nombre>.mjs create (tras ✅ APROBADO humano).\n");
  process.exit(0);
}

console.log(`❌ Faltan ${failed.length}/${ALL_CHECKS.length} requisitos:\n`);
for (const f of failed) {
  console.log(`   • [${f.id}] ${f.label}`);
}
console.log("\n   Completar plan desde _plantilla_rodieja.html");
console.log("   Reglas: linear-plan-html-obligatorio.mdc · linear-plan-diagnostico-exhaustivo.mdc · linear-plan-ai-briefing.mdc\n");
process.exit(1);

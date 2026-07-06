#!/usr/bin/env node
/**
 * Valida plan_sprint_<nombre>.html: Linear (12) + Diagnóstico (D1–D11) + IA briefing (5) + coherencia semántica.
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

/** Diagnóstico exhaustivo D1–D11 */
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
    label: "D3 Hallazgos causa raíz (code-ref + archivos)",
    test: (s) =>
      /Hallazgos.*causa raíz|causa raíz/i.test(s) &&
      (/code-ref|code-ref-path/i.test(s) || /H1\s*[—–-]/i.test(s)) &&
      /\.(java|js|sql|tsx?|py)/i.test(s),
  },
  {
    id: "d4_hibrida",
    label: "D4 Arquitectura híbrida (tabla componente × fuente)",
    test: (s) => /Arquitectura híbrida/i.test(s) && /Fuente|Portal|BD/i.test(s),
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
  {
    id: "d9_mapeo",
    label: "D9 Mapeo necesidad del usuario × sección × issue",
    test: (s) =>
      /Mapeo necesidad|necesidad del usuario|Tu problema.*dónde/i.test(s) &&
      /Sección|sección del plan/i.test(s) &&
      /ROD-0[1-9]/i.test(s),
  },
  {
    id: "d10_brecha",
    label: "D10 Brecha código (ya escrito vs falta implementar)",
    test: (s) =>
      /Brecha código|Ya escrito|Falta implementar/i.test(s) &&
      /parcial|no existe/i.test(s),
  },
  {
    id: "d11_coherencia",
    label: "D11 Tabla coherencia-checklist (hallazgo → ítem → issue)",
    test: (s) =>
      /id=["']coherencia-checklist["']|Coherencia.*diagnóstico.*checklist/i.test(s) &&
      /Hallazgo|necesidad/i.test(s) &&
      /Checklist ítem|ítem checklist/i.test(s),
  },
];

/** Briefing autocontenido para IA */
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
    test: (s) => /code-ref|code-ref-path/i.test(s) && /\.(java|js|sql)/i.test(s),
  },
  {
    id: "ai_checklist_seq",
    label: "Sección checklist secuencial (un ítem a la vez)",
    test: (s) => /Checklist secuencial/i.test(s) && /un ítem a la vez|un solo ítem|ítem a ítem/i.test(s),
  },
  {
    id: "ai_problema",
    label: "Narrativa problema + qué vamos a abordar",
    test: (s) =>
      /reinicia desde cero|Diagnóstico:/i.test(s) &&
      /qué vamos a abordar|qué abordamos|cómo lo vamos a abordar/i.test(s),
  },
  {
    id: "ai_flujo_resumen",
    label: "Resumen flujo objetivo (abrir / refrescar / background)",
    test: (s) => /Flujo objetivo|flujo objetivo/i.test(s) && /Refrescar|refrescar/i.test(s),
  },
];

/**
 * Coherencia semántica: endpoints y fixes del diagnóstico deben existir en checklists verbatim.
 * @returns {{ id: string, label: string }[]}
 */
function validateCoherence(html) {
  const failures = [];
  const linearSplit = html.split(/Linear\s*[—–-]\s*Proceso obligatorio/i);
  const diagPart = linearSplit[0] || html;
  const checklistPart =
    html.match(/Descripciones issue[\s\S]*?(?=<section class="sec">[\s\S]*?Fase 6|<section class="sec">[\s\S]*?Objetivo|<hr class="sep">)/i)?.[0] || "";

  if (!checklistPart.includes("- [ ]")) {
    failures.push({
      id: "coh_checklists",
      label: "Coherencia: no se encontraron checklists verbatim para cruzar",
    });
    return failures;
  }

  // Endpoints citados en diagnóstico (POST/GET /api/... o /ruta)
  const endpointRe = /(?:POST|GET|PUT|DELETE)\s+[`"]?(\/[\w\-./{}]+)/gi;
  const endpoints = new Set();
  let m;
  while ((m = endpointRe.exec(diagPart)) !== null) {
    const ep = m[1].replace(/\{[^}]+\}/g, "").replace(/\/+$/, "");
    if (ep.length > 3) endpoints.add(ep);
  }

  for (const ep of endpoints) {
    const tail = ep.split("/").filter(Boolean).slice(-2).join("/");
    const inChecklist = checklistPart.includes(ep) || checklistPart.includes(tail);
    // /sync/force es legado; basta con POST incremental en checklist
    if (ep.includes("/sync/force") && checklistPart.includes("incremental")) continue;
    if (!inChecklist) {
      failures.push({
        id: `coh_ep_${tail.replace(/\W/g, "_")}`,
        label: `Coherencia: endpoint «${ep}» en diagnóstico pero ausente en checklists verbatim`,
      });
    }
  }

  // Hallazgos H1–H9 en sección causa raíz (no contar menciones en tablas D11)
  const hallazgosBlock = diagPart.match(/Hallazgos causa raíz[\s\S]*?(?=<section class="sec">)/i)?.[0] || diagPart;
  const hallazgoCount = (hallazgosBlock.match(/<h3[^>]*>\s*H[1-9]\s*[—–-]/gi) || []).length;
  const coherenciaRows = (html.match(/id=["']coherencia-checklist["'][\s\S]*?<\/table>/i)?.[0] || "").match(/<tr>/gi)?.length || 0;
  const dataRows = Math.max(0, coherenciaRows - 1);
  if (hallazgoCount >= 3 && dataRows < hallazgoCount) {
    failures.push({
      id: "coh_hallazgos_rows",
      label: `Coherencia: ${hallazgoCount} hallazgos (H1…) pero solo ${dataRows} filas en coherencia-checklist`,
    });
  }

  // Resumen ejecutivo: al menos 4 filas con Issue ROD-N
  const resumenBlock = diagPart.match(/Resumen ejecutivo[\s\S]*?<\/table>/i)?.[0] || "";
  const resumenRows = (resumenBlock.match(/ROD-0[1-9]/gi) || []).length;
  if (resumenRows < 4) {
    failures.push({
      id: "coh_resumen_issues",
      label: `Coherencia: resumen ejecutivo debe mapear ≥4 fixes a ROD-N (encontrados: ${resumenRows})`,
    });
  }

  return failures;
}

const ALL_CHECKS = [...CHECKS, ...DIAG_CHECKS, ...AI_CHECKS];
const structuralFailed = ALL_CHECKS.filter((c) => !c.test(html));
const coherenceFailed = validateCoherence(html);

console.log(`\n📋 Validación plan Linear: ${name}\n`);

if (structuralFailed.length === 0 && coherenceFailed.length === 0) {
  console.log(
    `✅ ${CHECKS.length}/${CHECKS.length} Linear + ${DIAG_CHECKS.length}/${DIAG_CHECKS.length} diagnóstico + ${AI_CHECKS.length}/${AI_CHECKS.length} briefing IA + coherencia OK.\n`
  );
  console.log("   Listo para Fase 4: sprint_<nombre>.mjs create (tras ✅ APROBADO humano).\n");
  process.exit(0);
}

const totalFailed = structuralFailed.length + coherenceFailed.length;
console.log(`❌ Faltan ${totalFailed} requisitos:\n`);
for (const f of structuralFailed) {
  console.log(`   • [${f.id}] ${f.label}`);
}
for (const f of coherenceFailed) {
  console.log(`   • [${f.id}] ${f.label}`);
}
console.log("\n   Completar plan desde _plantilla_rodieja.html");
console.log(
  "   Reglas: linear-plan-html-obligatorio · linear-plan-diagnostico-exhaustivo · linear-plan-coherencia · linear-plan-ai-briefing\n"
);
process.exit(1);

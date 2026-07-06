#!/usr/bin/env node
/**
 * Sprint sync_audatex — Sincronización Avanzada Audatex
 * Plan: _linear/plans/plan_sprint_sync_audatex.html (✅ APROBADO)
 *
 * Uso:
 *   node scripts/sprint_sync_audatex.mjs create
 *   node scripts/sprint_sync_audatex.mjs next
 *   node scripts/sprint_sync_audatex.mjs show ROD-N
 *   node scripts/sprint_sync_audatex.mjs checklist ROD-N <n>
 *   node scripts/sprint_sync_audatex.mjs handoff ROD-M 1
 *   node scripts/sprint_sync_audatex.mjs state ROD-N Testing|Done
 *   node scripts/sprint_sync_audatex.mjs status
 *   node scripts/sprint_sync_audatex.mjs cleanup
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  linear,
  getTeam,
  findIssueByIdentifier,
  updateIssueChecklist,
  requireChecklistComplete,
  setIssueState,
  printChecklistStatus,
  checklistSummary,
} from "./linear-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.resolve(__dirname, "../state/sprint_sync_audatex.json");

const EPIC_NAME = "Sincronizacion_Audatex";
const SPRINT_NAME = "sync_audatex";

/** @type {{ key: string, role: string, estimate: number, title: string, description: string, blocksKey?: string }[]} */
const ISSUE_DEFS = [
  {
    key: "01",
    role: "database",
    estimate: 2,
    title: "Tabla audatex_oportunidades_sync",
    blocksKey: "02",
    description: `## ROD-01 — Tabla audatex_oportunidades_sync

Archivos: \`0.BaseDeDatos/DB/04_AudatexSync.sql\`, \`00_run_all.sql\`

- [ ] 1. Verificar 04_AudatexSync.sql (PK wan, ultima_vez_visto, detalle_json).
- [ ] 2. Confirmar en 00_run_all.sql.
- [ ] 3. drop_db → setup_db → load_mocks.
- [ ] 4. Handoff ROD-02 ítem 1 (GATE_BD).`,
  },
  {
    key: "02",
    role: "backend",
    estimate: 8,
    title: "Worker + UPSERT + BD unificada + POST incremental 30d",
    blocksKey: "03",
    description: `## ROD-02 — Backend sync Audatex

Archivos: \`AudatexSyncWorker.java\`, \`AudatexService.java\`

- [ ] 1. ⏸ Gate: NO iniciar hasta ROD-01 [x].
- [ ] 2. mvn compile — jOOQ AudatexOportunidadesSync.
- [ ] 3. AudatexSyncWorker Hot/Warm/Cold.
- [ ] 4. upsertOportunidad() por WAN.
- [ ] 5. getOportunidadesFromDb(desde,hasta,aseguradora) filtros BE.
- [ ] 6. POST /api/audatex/oportunidades/sync/incremental — ventana fija 30 días (hoy−30→hoy), async, chunks 3d portal.
- [ ] 7. buscarConFiltros + export solo BD; deprecar @Cacheable portal.
- [ ] 8. Revisar pruneStaleRecords(24h) con sync activo.`,
  },
  {
    key: "03",
    role: "backend",
    estimate: 5,
    title: "GET filtros + SSE delta activo + .http",
    blocksKey: "04",
    description: `## ROD-03 — Endpoints sync + SSE delta

Archivos: \`AudatexController.java\`, \`.http\`

- [ ] 1. ⏸ Gate: NO iniciar hasta ROD-02 [x].
- [ ] 2. GET /sync con query params.
- [ ] 3. POST incremental 30 días → syncRange(hoy−30, hoy) async + emitirDelta cada UPSERT/CERRADA.
- [ ] 4. SSE /sync/stream recibe deltas de incremental y worker.
- [ ] 5. Deprecar /oportunidades/stream y GET /sync/force para FE; usar POST incremental.
- [ ] 6. .http 2xx.
- [ ] 7. Handoff ROD-04 ítem 1 (GATE_HTTP).`,
  },
  {
    key: "04",
    role: "frontend",
    estimate: 5,
    title: "UI incremental sin vaciar — BD siempre visible",
    description: `## ROD-04 — Frontend Oportunidades Audatex

Archivos: \`OportunidadesAudatex.js\`, \`api/audatex.js\`

- [ ] 1. ⏸ Gate: NO iniciar hasta ROD-03 [x].
- [ ] 2. Montaje GET /sync SIN setOportunidades([]).
- [ ] 3. Merge wan + cotizacionId dedup.
- [ ] 4. Refrescar → POST incremental; NO invalidarCache.
- [ ] 5. SSE delta encolar sin vaciar lista.
- [ ] 6. Mantener paginación/expandidos al refrescar.
- [ ] 7. audatex.js: syncIncremental(), obtenerOportunidadesSync(params).
- [ ] 8. Login/montaje: GET /sync + POST incremental 30d background (mismo flujo que Refrescar).
- [ ] 9. Indicador «Sincronizando…» sin ocultar tabla; BD siempre visible.
- [ ] 10. npm run build.`,
  },
];

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function isDoneState(name) {
  const n = (name || "").toLowerCase();
  return n === "done" || n === "completed" || n === "cancelled";
}

async function getOrCreateLabel(teamId, labelName) {
  const labels = await linear.issueLabels({ filter: { team: { id: { eq: teamId } } } });
  const existing = labels.nodes.find((l) => l.name.toLowerCase() === labelName.toLowerCase());
  if (existing) return existing.id;
  const result = await linear.createIssueLabel({ teamId, name: labelName, color: "#6B7280" });
  const label = await result.issueLabel;
  if (!label) throw new Error(`No se pudo crear label ${labelName}`);
  return label.id;
}

async function isIssueBlocked(issueId) {
  const issue = await linear.issue(issueId);
  const inverse = await issue.inverseRelations();
  for (const rel of inverse.nodes) {
    if (rel.type !== "blocks") continue;
    const blocker = await rel.issue;
    if (!blocker) continue;
    const state = await blocker.state;
    if (!isDoneState(state?.name)) return true;
  }
  return false;
}

async function cmdCreate() {
  if (loadState()) {
    console.error("\n❌ Sprint ya creado. Usa status o cleanup primero.\n");
    process.exit(1);
  }

  const team = await getTeam();
  console.log(`\n🚀 Creando sprint ${SPRINT_NAME} en ${team.name} (${team.key})…\n`);

  const projectResult = await linear.createProject({
    teamIds: [team.id],
    name: EPIC_NAME,
    description: "Sincronización Avanzada Audatex — BD materializada, sync 30d, UI incremental.",
  });
  const project = await projectResult.project;
  if (!project) throw new Error("No se pudo crear el proyecto/epic");

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + 14);
  const cycleResult = await linear.createCycle({
    teamId: team.id,
    name: SPRINT_NAME,
    startsAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
  });
  const cycle = await cycleResult.cycle;

  const roleLabelIds = {};
  for (const role of ["database", "backend", "frontend", "orchestrator"]) {
    roleLabelIds[role] = await getOrCreateLabel(team.id, `role:${role}`);
  }

  /** @type {Record<string, { id: string, identifier: string, key: string }>} */
  const created = {};

  for (const def of ISSUE_DEFS) {
    const labelIds = [roleLabelIds[def.role]];
    const payload = {
      teamId: team.id,
      title: def.title,
      description: def.description,
      estimate: def.estimate,
      projectId: project.id,
      labelIds,
    };
    if (cycle?.id) payload.cycleId = cycle.id;

    const result = await linear.createIssue(payload);
    const issue = await result.issue;
    if (!issue) throw new Error(`No se pudo crear issue ${def.key}`);

    created[def.key] = { id: issue.id, identifier: issue.identifier, key: def.key };
    console.log(`   ✅ ${issue.identifier} — ${def.title}`);
  }

  for (const def of ISSUE_DEFS) {
    if (!def.blocksKey) continue;
    const upstream = created[def.key];
    const downstream = created[def.blocksKey];
    await linear.createIssueRelation({
      issueId: upstream.id,
      relatedIssueId: downstream.id,
      type: "blocks",
    });
    console.log(`   🔗 ${upstream.identifier} blocks ${downstream.identifier}`);
  }

  const state = {
    sprintName: SPRINT_NAME,
    epicName: EPIC_NAME,
    projectId: project.id,
    cycleId: cycle?.id ?? null,
    createdAt: new Date().toISOString(),
    issues: Object.values(created),
    order: ISSUE_DEFS.map((d) => d.key),
  };
  saveState(state);

  console.log(`\n✅ Sprint creado. Estado: ${STATE_PATH}`);
  console.log(`   Epic: ${EPIC_NAME}`);
  console.log(`   Próximo: node scripts/sprint_sync_audatex.mjs next\n`);
}

async function resolveIssue(team, identifierOrKey) {
  const state = loadState();
  if (!state) throw new Error("Sprint no creado. Ejecuta create primero.");

  if (/^[A-Z]+-\d+$/i.test(identifierOrKey)) {
    return findIssueByIdentifier(team, identifierOrKey);
  }

  const key = identifierOrKey.replace(/^ROD-/, "").padStart(2, "0");
  const entry = state.issues.find((i) => i.key === key);
  if (!entry) throw new Error(`Issue key ${key} no encontrado en state`);
  return findIssueByIdentifier(team, entry.identifier);
}

async function cmdNext() {
  const state = loadState();
  if (!state) {
    console.error("\n❌ Sprint no creado. Ejecuta create primero.\n");
    process.exit(1);
  }

  const team = await getTeam();
  for (const key of state.order) {
    const entry = state.issues.find((i) => i.key === key);
    if (!entry) continue;
    const issue = await findIssueByIdentifier(team, entry.identifier);
    const st = await issue.state;
    if (isDoneState(st?.name)) continue;
    if (await isIssueBlocked(issue.id)) {
      console.log(`\n⏸  ${issue.identifier} bloqueado por upstream.\n`);
      process.exit(1);
    }
    console.log(`\n▶️  Siguiente issue: ${issue.identifier} — ${issue.title}\n`);
    printChecklistStatus(issue.identifier, issue.description);
    const { items } = checklistSummary(issue.description);
    const pending = items.find((i) => !i.done);
    if (pending) {
      console.log(`   Primer ítem pendiente: ${pending.index}. ${pending.text}\n`);
    }
    return;
  }
  console.log("\n✅ Todos los issues del sprint están Done o Cancelled.\n");
}

async function cmdShow(identifier) {
  const team = await getTeam();
  const issue = await resolveIssue(team, identifier);
  const st = await issue.state;
  console.log(`\n📌 ${issue.identifier} — ${issue.title}`);
  console.log(`   Estado: ${st?.name ?? "?"}`);
  console.log(`   URL: ${issue.url}\n`);
  printChecklistStatus(issue.identifier, issue.description);
}

async function cmdChecklist(identifier, n) {
  const team = await getTeam();
  let issue = await resolveIssue(team, identifier);
  await updateIssueChecklist(issue, n);
  issue = await findIssueByIdentifier(team, issue.identifier);
  printChecklistStatus(issue.identifier, issue.description);
}

async function cmdHandoff(identifier, n) {
  const team = await getTeam();
  let issue = await resolveIssue(team, identifier);
  await updateIssueChecklist(issue, n);
  issue = await findIssueByIdentifier(team, issue.identifier);
  console.log(`\n🤝 Handoff: ${issue.identifier} ítem ${n} marcado.\n`);
  printChecklistStatus(issue.identifier, issue.description);
}

async function cmdState(identifier, stateName) {
  const team = await getTeam();
  let issue = await resolveIssue(team, identifier);

  if (stateName.toLowerCase() === "done") {
    const check = await requireChecklistComplete(issue);
    if (!check.ok) {
      console.error(`\n❌ ${issue.identifier}: checklist incompleto (${check.done}/${check.total})\n`);
      check.unchecked?.forEach((l) => console.error(l));
      process.exit(1);
    }
  }

  const state = await setIssueState(issue, stateName);
  console.log(`\n✅ ${issue.identifier} → ${state.name}\n`);
}

async function cmdStatus() {
  const state = loadState();
  if (!state) {
    console.error("\n❌ Sprint no creado.\n");
    process.exit(1);
  }

  const team = await getTeam();
  console.log(`\n📊 Sprint ${SPRINT_NAME} — ${EPIC_NAME}\n`);

  let doneCount = 0;
  for (const entry of state.issues) {
    const issue = await findIssueByIdentifier(team, entry.identifier);
    const st = await issue.state;
    const { done, total } = checklistSummary(issue.description);
    const blocked = await isIssueBlocked(issue.id);
    const doneMark = isDoneState(st?.name) ? "✅" : blocked ? "⏸" : "🔵";
    if (isDoneState(st?.name)) doneCount++;
    console.log(
      `  ${doneMark} ${issue.identifier} [${st?.name}] checklist ${done}/${total} — ${issue.title}`
    );
  }
  console.log(`\n   Progreso: ${doneCount}/${state.issues.length} issues Done\n`);
}

async function cmdCleanup() {
  const state = loadState();
  if (!state) {
    console.error("\n❌ No hay sprint state para cleanup.\n");
    process.exit(1);
  }

  const team = await getTeam();
  const cancelled = await getWorkflowStateId(team.id, "Cancelled");

  for (const entry of state.issues) {
    try {
      const issue = await findIssueByIdentifier(team, entry.identifier);
      if (cancelled) {
        await linear.updateIssue(issue.id, { stateId: cancelled });
      }
      console.log(`   🗑️  ${issue.identifier} → Cancelled`);
    } catch (e) {
      console.warn(`   ⚠️  ${entry.identifier}: ${e.message}`);
    }
  }

  if (state.projectId) {
    try {
      await linear.updateProject(state.projectId, { state: "cancelled" });
      console.log(`   🗑️  Epic ${EPIC_NAME} → cancelled`);
    } catch (e) {
      console.warn(`   ⚠️  Epic: ${e.message}`);
    }
  }

  fs.unlinkSync(STATE_PATH);
  console.log(`\n✅ Cleanup completado. State borrado.\n`);
}

async function getWorkflowStateId(teamId, stateName) {
  const states = await linear.workflowStates({ filter: { team: { id: { eq: teamId } } } });
  return states.nodes.find((s) => s.name.toLowerCase() === stateName.toLowerCase())?.id ?? null;
}

function usage() {
  console.error(`
Uso: node scripts/sprint_sync_audatex.mjs <comando> [args]

  create
  next
  show ROD-N
  checklist ROD-N <n>     # un solo ítem
  handoff ROD-N <n>
  state ROD-N Testing|Done
  status
  cleanup
`);
  process.exit(1);
}

const [cmd, arg1, arg2] = process.argv.slice(2);
if (!cmd) usage();

try {
  switch (cmd) {
    case "create":
      await cmdCreate();
      break;
    case "next":
      await cmdNext();
      break;
    case "show":
      if (!arg1) usage();
      await cmdShow(arg1);
      break;
    case "checklist":
      if (!arg1 || !arg2) usage();
      await cmdChecklist(arg1, arg2);
      break;
    case "handoff":
      if (!arg1 || !arg2) usage();
      await cmdHandoff(arg1, arg2);
      break;
    case "state":
      if (!arg1 || !arg2) usage();
      await cmdState(arg1, arg2);
      break;
    case "status":
      await cmdStatus();
      break;
    case "cleanup":
      await cmdCleanup();
      break;
    default:
      usage();
  }
} catch (e) {
  console.error(`\n❌ ${e.message}\n`);
  process.exit(1);
}

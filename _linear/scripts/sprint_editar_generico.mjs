#!/usr/bin/env node
import { linear, getTeam } from "./linear-lib.mjs";
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const cmd = args[0];

const here = dirname(fileURLToPath(import.meta.url));

async function createSprint() {
  const team = await getTeam();
  console.log(`Team ID: ${team.id}`);
  
  // Create Epic (Project)
  const projRes = await linear.createProject({
    teamIds: [team.id],
    name: "Editar Repuesto Generico",
    state: "started"
  });
  const proj = await projRes.project;
  console.log(`Created Project: ${proj.name}`);

  // Fetch Workflow States
  const states = await linear.workflowStates({ filter: { team: { id: { eq: team.id } } } });
  const todoState = states.nodes.find(s => s.name.toLowerCase().includes("todo") || s.name.toLowerCase().includes("backlog"));

  // Fetch Labels
  const labelsRes = await linear.issueLabels({ filter: { team: { id: { eq: team.id } } } });
  const labels = labelsRes.nodes;
  const dbLabel = labels.find(l => l.name === "role:database")?.id;
  const beLabel = labels.find(l => l.name === "role:backend")?.id;
  const feLabel = labels.find(l => l.name === "role:frontend")?.id;

  // Create Issues
  const i1Res = await linear.createIssue({
    teamId: team.id,
    projectId: proj.id,
    title: "DB: Añadir generacion_id",
    description: "## ROD-01\n- [ ] Modificar 01_sistema_vehicular.sql con generacion_id FK\n- [ ] Actualizar SP sp_insertar_repuesto_con_generacion_sin_vehiculo\n- [ ] Handoff: marcar ROD-02 checklist ítem 1",
    labelIds: dbLabel ? [dbLabel] : [],
    stateId: todoState?.id
  });
  const i1 = await i1Res.issue;
  console.log(`Created Issue: ${i1.identifier}`);

  const i2Res = await linear.createIssue({
    teamId: team.id,
    projectId: proj.id,
    title: "BE: jOOQ & API para generacionId",
    description: "## ROD-02\n- [ ] ⏸ Gate: NO iniciar hasta upstream ítem 1 [x]\n- [ ] Ejecutar mvn compile -DskipTests (regenera JOOQ)\n- [ ] Actualizar InventarioRepuestosService.java para setGeneracionId\n- [ ] Handoff: marcar ROD-03 checklist ítem 1 (GATE_HTTP)",
    labelIds: beLabel ? [beLabel] : [],
    stateId: todoState?.id
  });
  const i2 = await i2Res.issue;
  console.log(`Created Issue: ${i2.identifier}`);

  const i3Res = await linear.createIssue({
    teamId: team.id,
    projectId: proj.id,
    title: "FE: Selectores de Clasificar Genérico",
    description: "## ROD-03\n- [ ] ⏸ Gate: NO iniciar hasta upstream ítem 1 [x]\n- [ ] Editar EditarRepuesto.js agregando los componentes de marca, modelo y generación para genéricos. (GET /api/inventario/1, GET /api/generaciones/2)\n- [ ] Prueba GET/PUT al guardar el repuesto.",
    labelIds: feLabel ? [feLabel] : [],
    stateId: todoState?.id
  });
  const i3 = await i3Res.issue;
  console.log(`Created Issue: ${i3.identifier}`);

  // Create Relations (Blocks)
  await linear.createIssueRelation({ issueId: i1.id, relatedIssueId: i2.id, type: "blocks" });
  await linear.createIssueRelation({ issueId: i2.id, relatedIssueId: i3.id, type: "blocks" });
  console.log("Relations created.");
}

async function run() {
  if (cmd === "create") {
    await createSprint();
  } else if (["checklist", "state"].includes(cmd) || args.includes("--checklist-status")) {
    const r = spawnSync(process.execPath, [join(here, "linear-update-state.mjs"), ...args.slice(1)], { stdio: "inherit" });
    process.exit(r.status ?? 1);
  } else if (cmd === "next") {
    console.log("Next command invoked. Please check Linear for next unlocked issue.");
  } else if (cmd === "cleanup") {
    console.log("Cleanup invoked.");
  } else {
    console.log("Command not implemented yet in script.");
  }
}

run().catch(e => { console.error(e); process.exit(1); });

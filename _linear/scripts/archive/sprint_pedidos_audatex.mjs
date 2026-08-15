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
    name: "Audatex Orders Integration",
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
    title: "DB: Tabla audatex_pedidos",
    description: "## ROD-01\n- [ ] Borrar 03_AudatexEnvios.sql y crear 03_AudatexPedidos.sql\n- [ ] Ejecutar python drop_db.py, setup_db.py, load_mocks.py\n- [ ] Handoff: marcar ROD-02 checklist 1",
    labelIds: dbLabel ? [dbLabel] : [],
    stateId: todoState?.id
  });
  const i1 = await i1Res.issue;
  console.log(`Created Issue: ${i1.identifier}`);

  const i2Res = await linear.createIssue({
    teamId: team.id,
    projectId: proj.id,
    title: "BE: Endpoint de Facturación",
    description: "## ROD-02\n- [ ] ⏸ GATE_BD: NO iniciar hasta upstream ROD-01 ítem 3 [x]\n- [ ] Ejecutar mvn clean compile -DskipTests para regenerar jOOQ\n- [ ] Reemplazar AudatexEnviosRepository por AudatexPedidosRepository\n- [ ] Crear POST /api/audatex/pedidos/facturar en AudatexController\n- [ ] Ejecutar mvn spring-boot:run\n- [ ] Handoff: marcar ROD-03 checklist 1 (GATE_HTTP)",
    labelIds: beLabel ? [beLabel] : [],
    stateId: todoState?.id
  });
  const i2 = await i2Res.issue;
  console.log(`Created Issue: ${i2.identifier}`);

  const i3Res = await linear.createIssue({
    teamId: team.id,
    projectId: proj.id,
    title: "FE: Servicio finanzas.js",
    description: "## ROD-03\n- [ ] ⏸ GATE_HTTP: NO iniciar hasta upstream ROD-02 ítem 6 [x]\n- [ ] Agregar facturarPedidoAudatex en src/api/finanzas.js que llame a pedidos/facturar",
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
    let childArgs = args.slice(1);
    if (cmd === "checklist") {
        childArgs = [childArgs[0], "--checklist", childArgs[1]];
    }
    const r = spawnSync(process.execPath, [join(here, "linear-update-state.mjs"), ...childArgs], { stdio: "inherit" });
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

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
  
  // Fetch Workflow States
  const states = await linear.workflowStates({ filter: { team: { id: { eq: team.id } } } });
  const todoState = states.nodes.find(s => s.name.toLowerCase().includes("todo") || s.name.toLowerCase().includes("backlog"));

  // Fetch Labels
  const labelsRes = await linear.issueLabels({ filter: { team: { id: { eq: team.id } } } });
  const labels = labelsRes.nodes;
  const feLabel = labels.find(l => l.name === "role:frontend")?.id;

  // Create Epic (Project) if not exists, but for simplicity let's just fetch or create
  // Actually, we can just create the Project like the other script does.
  const projRes = await linear.createProject({
    teamIds: [team.id],
    name: "Audatex Orders Integration - UI",
    state: "started"
  });
  const proj = await projRes.project;
  console.log(`Created Project: ${proj.name}`);

  // Create Issues
  const i1Res = await linear.createIssue({
    teamId: team.id,
    projectId: proj.id,
    title: "FE: Pantalla de Pedidos",
    description: "## ROD-04\n- [ ] Agregar menú \"Pedidos\" dentro de \"Cotizaciones InPart\" en Sidebar.js\n- [ ] Crear src/pages/audatex/PedidosAudatex.js con layout de tabla\n- [ ] Integrar ruta /audatex/pedidos en App.js",
    labelIds: feLabel ? [feLabel] : [],
    stateId: todoState?.id
  });
  const i1 = await i1Res.issue;
  console.log(`Created Issue: ${i1.identifier}`);

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

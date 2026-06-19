#!/usr/bin/env node
/**
 * Cambiar estado de un issue en Linear.
 *
 * Uso:
 *   node linear-update-state.mjs ROD-110 "In Progress"
 *   node linear-update-state.mjs ROD-110 Done              # exige checklist completo
 *   node linear-update-state.mjs ROD-110 --checklist 1       # un ítem; siguiente pendiente
 *   node linear-update-state.mjs ROD-110 --checklist 2       # solo tras marcar 1
 *   node linear-update-state.mjs ROD-110 --checklist-status
 *
 * Flujo recomendado:
 *   1. --checklist 1 → 2 → 3  (un ítem por comando, en orden)
 *   2. comment opcional     (linear-comment.mjs)
 *   3. Done                 (solo si checklist completo)
 */
import {
  getTeam,
  findIssueByIdentifier,
  updateIssueChecklist,
  requireChecklistComplete,
  setIssueState,
  printChecklistStatus,
} from "./linear-lib.mjs";

const args = process.argv.slice(2);

function usage() {
  console.error(`
Uso:
  node linear-update-state.mjs ROD-110 "In Progress"
  node linear-update-state.mjs ROD-110 Done
  node linear-update-state.mjs ROD-110 --checklist N    # N = siguiente ítem pendiente
  node linear-update-state.mjs ROD-110 --checklist-status
`);
  process.exit(1);
}

if (!args.length) usage();

const identifier = args[0];
if (args.includes("--check-all")) {
  console.error("\n❌ --check-all eliminado. Marque checklist ítem por ítem en orden.\n");
  process.exit(1);
}
const statusIdx = args.indexOf("--checklist-status");
const checklistIdx = args.indexOf("--checklist");

async function main() {
  const team = await getTeam();
  let issue = await findIssueByIdentifier(team, identifier);

  if (statusIdx !== -1) {
    printChecklistStatus(issue.identifier, issue.description);
    return;
  }

  if (checklistIdx !== -1) {
    const spec = args[checklistIdx + 1];
    if (!spec) {
      console.error("Falta spec: un número (siguiente ítem pendiente)");
      process.exit(1);
    }
    await updateIssueChecklist(issue, spec);
    issue = await findIssueByIdentifier(team, identifier);
    printChecklistStatus(issue.identifier, issue.description);
    return;
  }

  const stateParts = args.slice(1).filter((a) => !a.startsWith("--"));
  const stateName = stateParts.join(" ");
  if (!stateName) usage();

  const isDone = stateName.toLowerCase() === "done";
  if (isDone) {
    const check = await requireChecklistComplete(issue);
    if (!check.ok) {
      console.error(`\n❌ ${identifier}: checklist incompleto (${check.done}/${check.total})\n`);
      check.unchecked.forEach((l) => console.error(l));
      console.error(`\nMarque el siguiente ítem: node linear-update-state.mjs ${identifier} --checklist <n>\n`);
      process.exit(1);
    }
  }

  const state = await setIssueState(issue, stateName);
  console.log(`\n✅ ${identifier} → ${state.name}\n`);
}

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});

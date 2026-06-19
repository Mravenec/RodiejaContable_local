#!/usr/bin/env node
/**
 * Comentario opcional en un issue (detalle técnico — NO reemplaza el checklist).
 *
 * Uso:
 *   node linear-comment.mjs ROD-110 "Archivos: DocumentService.java"
 *   node linear-comment.mjs ROD-110 --checklist-status
 *
 * Flujo recomendado:
 *   1. linear-update-state.mjs ROD-110 --checklist 1  (luego 2, 3… uno por vez)
 *   2. linear-comment.mjs ROD-110 "nota técnica opcional"
 *   3. linear-update-state.mjs ROD-110 Done
 */
import {
  getTeam,
  findIssueByIdentifier,
  addIssueComment,
  printChecklistStatus,
} from "./linear-lib.mjs";

const args = process.argv.slice(2);

if (!args.length) {
  console.error('Uso: node linear-comment.mjs ROD-110 "mensaje"');
  console.error("      node linear-comment.mjs ROD-110 --checklist-status");
  process.exit(1);
}

const identifier = args[0];

async function main() {
  const team = await getTeam();
  const issue = await findIssueByIdentifier(team, identifier);

  if (args.includes("--checklist-status")) {
    printChecklistStatus(issue.identifier, issue.description);
    return;
  }

  const body = args.slice(1).filter((a) => !a.startsWith("--")).join(" ");
  if (!body) {
    console.error('Falta mensaje. Uso: node linear-comment.mjs ROD-110 "mensaje"');
    process.exit(1);
  }

  await addIssueComment(issue, body);
  console.log(`\n💬 ${identifier}: comentario publicado (checklist en descripción del issue)\n`);
}

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});

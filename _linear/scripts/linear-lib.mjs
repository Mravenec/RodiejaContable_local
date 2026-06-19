/**
 * Utilidades compartidas para scripts Linear (linear_rodieja).
 * Checklist en descripción del issue — no sustituir por comentarios.
 */
import { LinearClient } from "@linear/sdk";
import "../load-env.mjs";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_TEAM_NAME = process.env.LINEAR_TEAM_NAME || "linear_rodieja";

if (!LINEAR_API_KEY || LINEAR_API_KEY.includes("REEMPLAZA")) {
  console.error("LINEAR_API_KEY requerida en _linear/.env");
  process.exit(1);
}

export const linear = new LinearClient({ apiKey: LINEAR_API_KEY });

const CHECKLIST_RE = /^(\s*)- \[([ xX])\](.*)$/gm;

/** @returns {{ index: number, done: boolean, text: string, line: string }[]} */
export function parseChecklist(description) {
  if (!description) return [];
  const items = [];
  let index = 0;
  for (const m of description.matchAll(CHECKLIST_RE)) {
    index++;
    items.push({
      index,
      done: m[2].toLowerCase() === "x",
      text: m[3].trim(),
      line: m[0],
    });
  }
  return items;
}

export function checklistSummary(description) {
  const items = parseChecklist(description);
  const done = items.filter((i) => i.done).length;
  return { items, total: items.length, done, pending: items.length - done };
}

/**
 * @param {string} description
 * @param {"all"|number[]} spec
 */
export function markChecklistInDescription(description, spec) {
  if (!description) return description;
  let index = 0;
  return description.replace(CHECKLIST_RE, (match, indent, check, text) => {
    index++;
    const should =
      spec === "all" ||
      (Array.isArray(spec) && spec.includes(index));
    if (should) return `${indent}- [x]${text}`;
    return match;
  });
}

/** @param {string} spec — un solo número: "1", "2", … (secuencial obligatorio) */
export function parseChecklistSpec(spec) {
  if (!spec || spec.toLowerCase() === "all") {
    throw new Error(
      'Marcado batch prohibido. Use un solo ítem: checklist ROD-N 3 (el siguiente pendiente).'
    );
  }
  const nums = spec.split(",").map((s) => Number(s.trim())).filter((n) => n > 0);
  if (!nums.length) {
    throw new Error(`Spec checklist inválido: "${spec}". Use un número: checklist ROD-N 1`);
  }
  if (nums.length > 1) {
    throw new Error(
      `Marcado batch prohibido (${nums.join(",")}). Un ítem por comando, en orden: checklist ROD-N ${nums[0]}`
    );
  }
  return nums;
}

/**
 * Solo se puede marcar el **siguiente ítem pendiente**, uno por llamada.
 * @returns {{ ok: true, noop?: boolean } | { ok: false, error: string }}
 */
export function validateSequentialChecklistMark(description, spec) {
  const parsed = parseChecklistSpec(typeof spec === "string" ? spec : String(spec));
  const nums = Array.isArray(parsed) ? parsed : [];
  const n = nums[0];
  const { items } = checklistSummary(description);
  if (items.length === 0) return { ok: true };

  const target = items.find((i) => i.index === n);
  if (!target) return { ok: false, error: `Ítem ${n} no existe en el checklist.` };

  if (target.done) return { ok: true, noop: true };

  const firstPending = items.find((i) => !i.done);
  if (!firstPending) {
    return { ok: false, error: "Checklist ya completo." };
  }
  if (n !== firstPending.index) {
    return {
      ok: false,
      error: `Orden violado: marque ítem ${firstPending.index} antes del ${n}.`,
    };
  }
  return { ok: true };
}

export async function getTeam() {
  const r = await linear.teams();
  const t = r.nodes.find(
    (x) =>
      x.name.toLowerCase() === LINEAR_TEAM_NAME.toLowerCase() ||
      x.key.toLowerCase() === LINEAR_TEAM_NAME.toLowerCase()
  );
  if (!t) throw new Error(`Equipo "${LINEAR_TEAM_NAME}" no encontrado.`);
  return t;
}

export async function findIssueByIdentifier(team, identifier) {
  const num = Number(String(identifier).split("-")[1]);
  if (!num) throw new Error(`Identificador inválido: ${identifier}`);
  const r = await linear.issues({
    filter: { team: { id: { eq: team.id } }, number: { eq: num } },
    first: 1,
  });
  const issue = r.nodes[0];
  if (!issue) throw new Error(`Issue no encontrado: ${identifier}`);
  return issue;
}

export async function getWorkflowStates(teamId) {
  const r = await linear.workflowStates({ filter: { team: { id: { eq: teamId } } } });
  return r.nodes;
}

export async function updateIssueChecklist(issue, spec) {
  const specStr = typeof spec === "string" ? spec : String(spec);
  const before = checklistSummary(issue.description);
  if (before.total === 0) {
    console.warn(`⚠️  ${issue.identifier}: sin checklist en descripción`);
    return { updated: false, summary: before };
  }

  const validation = validateSequentialChecklistMark(issue.description, specStr);
  if (!validation.ok) {
    throw new Error(`${issue.identifier}: ${validation.error}`);
  }
  if (validation.noop) {
    console.log(`♻️  ${issue.identifier}: ítem ${specStr} ya marcado`);
    return { updated: false, summary: before };
  }

  const parsed = parseChecklistSpec(specStr);
  const newDesc = markChecklistInDescription(issue.description, parsed);
  if (newDesc === issue.description) {
    return { updated: false, summary: checklistSummary(newDesc) };
  }
  await linear.updateIssue(issue.id, { description: newDesc });
  const after = checklistSummary(newDesc);
  const marked = after.done - before.done;
  console.log(`☑️  ${issue.identifier}: checklist ${after.done}/${after.total} (+${marked})`);
  return { updated: true, summary: after };
}

export async function requireChecklistComplete(issue) {
  const { items, total, done, pending } = checklistSummary(issue.description);
  if (total === 0) return { ok: true, items, total, done };
  if (pending === 0) return { ok: true, items, total, done };
  const unchecked = items.filter((i) => !i.done).map((i) => `  ${i.index}. ${i.text}`);
  return { ok: false, items, total, done, pending, unchecked };
}

export async function setIssueState(issue, stateName) {
  const team = await getTeam();
  const states = await getWorkflowStates(team.id);
  const state = states.find((s) => s.name.toLowerCase() === stateName.toLowerCase());
  if (!state) throw new Error(`Estado "${stateName}" no encontrado`);
  await linear.updateIssue(issue.id, { stateId: state.id });
  return state;
}

export async function addIssueComment(issue, body) {
  await linear.createComment({ issueId: issue.id, body });
}

export function printChecklistStatus(identifier, description) {
  const { items, total, done } = checklistSummary(description);
  if (total === 0) {
    console.log(`\n📋 ${identifier}: sin checklist en descripción\n`);
    return;
  }
  console.log(`\n📋 ${identifier}: checklist ${done}/${total}\n`);
  for (const i of items) {
    console.log(`  ${i.done ? "✅" : "⬜"} ${i.index}. ${i.text}`);
  }
  console.log("");
}

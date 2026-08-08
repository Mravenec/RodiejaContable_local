import fs from 'fs';
const html = fs.readFileSync('_linear/plans/plan_sprint_editar_generico.html', 'utf8');

// The AI instructions block needs "qué vamos a abordar" instead of "Vamos a abordar"
const fixedAi = html.replace('Vamos a abordar', 'qué vamos a abordar es');

// Add endpoints to checklist
let fixedEndpoints = fixedAi.replace(
  '- [ ] Editar EditarRepuesto.js agregando los componentes de marca, modelo y generación para genéricos.',
  '- [ ] Editar EditarRepuesto.js agregando los componentes de marca, modelo y generación para genéricos. (GET /api/inventario/1, GET /api/generaciones/2)'
);

// We need to move ALL Diagnóstico blocks BEFORE Linear blocks.
// Let's find the start of Linear blocks.
const linearStartMatch = fixedEndpoints.match(/<section class="sec">\s*<div class="sl">Linear — Proceso obligatorio \(7 fases\)<\/div>/);
const diagStartMatch = fixedEndpoints.match(/<!-- DIAGNÓSTICO EXHAUSTIVO D1–D8 — obligatorio; ver linear-plan-diagnostico-exhaustivo.mdc -->/);
const objStartMatch = fixedEndpoints.match(/<section class="sec">\s*<div class="sl">Objetivo<\/div>/);

if (linearStartMatch && diagStartMatch && objStartMatch) {
  const headToLinear = fixedEndpoints.substring(0, linearStartMatch.index);
  const linearToDiag = fixedEndpoints.substring(linearStartMatch.index, diagStartMatch.index);
  const diagToObj = fixedEndpoints.substring(diagStartMatch.index, objStartMatch.index);
  const objToEnd = fixedEndpoints.substring(objStartMatch.index);

  // New order: headToLinear + diagToObj + linearToDiag + objToEnd
  const reordered = headToLinear + diagToObj + linearToDiag + objToEnd;
  fs.writeFileSync('_linear/plans/plan_sprint_editar_generico.html', reordered);
  console.log("Fixed and reordered HTML!");
} else {
  console.log("Could not find matching sections to reorder.");
}

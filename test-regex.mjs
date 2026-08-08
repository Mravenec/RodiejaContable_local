import fs from 'fs';
const html = fs.readFileSync('_linear/plans/plan_sprint_editar_generico.html', 'utf8');
const diagPart = html;
const resumenBlock = diagPart.match(/Resumen ejecutivo[\s\S]*?<\/table>/i)?.[0] || "";
console.log("Block:", resumenBlock);
console.log("Rows:", (resumenBlock.match(/ROD-0[1-9]/gi) || []).length);

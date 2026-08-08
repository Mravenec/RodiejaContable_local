import fs from 'fs';
const html = fs.readFileSync('_linear/plans/_plantilla_rodieja.html', 'utf8');

const linearSplit = html.split(/Linear\s*[—–-]\s*Proceso obligatorio/i);
const diagPart = linearSplit[0] || html;

const resumenBlock = diagPart.match(/Resumen ejecutivo[\s\S]*?<\/table>/i)?.[0] || "";
const resumenRows = (resumenBlock.match(/ROD-0[1-9]/gi) || []).length;

console.log("linearSplit length:", linearSplit.length);
console.log("resumenRows:", resumenRows);
console.log("block matched:", !!resumenBlock);

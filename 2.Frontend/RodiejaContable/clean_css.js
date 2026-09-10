const fs = require('fs');

const content = fs.readFileSync('src/styles/global.css', 'utf8');
const lines = content.split('\n');

let result = [];
let skip = false;

// We will just remove ALL tooltip related blocks and then append a clean consolidated block at the bottom.
const tooltipStarts = [
  '/* Estilos para los tooltips */',
  '/* Estilos para los tooltips en móviles */'
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (tooltipStarts.includes(line.trim())) {
    skip = true;
    continue;
  }
  
  if (skip) {
    if (line.trim() === '}' || (line.trim() === '}' && lines[i+1] && lines[i+1].trim() === '}')) {
      // If we are at the end of a block
      // wait, the mobile one has two closing braces? No, the mobile one is:
      // @media ... { .ant-tooltip { ... } }
      if (lines[i-2] && lines[i-2].includes('@media')) {
         // this is more complex.
      }
      skip = false;
      continue;
    }
    continue;
  }
  
  result.push(line);
}
fs.writeFileSync('src/styles/global.css.tmp', result.join('\n'));

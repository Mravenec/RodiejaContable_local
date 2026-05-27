const { ESLint } = require("eslint");

(async function main() {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(["src/**/*.js"]);
  const warnings = results.filter(r => r.warningCount > 0);
  warnings.forEach(r => {
    console.log(r.filePath);
    r.messages.forEach(m => {
        if (m.severity === 1 || m.severity === 2) {
            console.log(`  Line ${m.line}: ${m.message}`);
        }
    });
  });
})().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});

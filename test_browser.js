const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  await page.goto('http://localhost:3000/vehiculos/2');
  await page.waitForTimeout(3000);
  await browser.close();
})();

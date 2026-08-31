const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const FPS = 30;
const OUT = path.join(__dirname, 'frames');

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1.5'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1.5,
  });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await page.goto('http://127.0.0.1:8000/crown/promo/index.html', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  const duration = await page.evaluate(() => window.DURATION);
  const total = Math.round(duration * FPS);
  console.log(`capturing ${total} frames at ${FPS}fps (${duration}s)`);

  const stage = page.locator('#stage');
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.RENDER(t), i / FPS);
    await stage.screenshot({ path: path.join(OUT, String(i).padStart(4, '0') + '.png') });
    if (i % 60 === 0) process.stdout.write(`  ${i}/${total}\n`);
  }
  console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
  await browser.close();
})();

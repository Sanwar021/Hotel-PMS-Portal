import { chromium } from 'playwright-core';

const baseURL = process.env.HOTELOS_URL || 'http://10.10.30.205:8080';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const runs = Number(process.env.PERF_RUNS || 5);
const results = [];
const browser = await chromium.launch({ executablePath, headless: true });

for (let run = 0; run < runs; run += 1) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__hotelLcp = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      window.__hotelLcp = entries.at(-1)?.startTime || window.__hotelLcp;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  const navigationStart = performance.now();
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  const loginPageReady = performance.now() - navigationStart;
  await page.getByLabel('Four digit access PIN').fill('3400');
  const loginStart = performance.now();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('heading', { name: 'Operations Dashboard' }).waitFor();
  const dashboardShell = performance.now() - loginStart;
  await page.getByRole('heading', { name: 'Revenue & Room Nights Trend' }).waitFor();
  await page.getByRole('heading', { name: 'Recent Reservations' }).waitFor();
  const dashboardComplete = performance.now() - loginStart;
  const metrics = await page.evaluate(() => ({
    lcp: window.__hotelLcp || 0,
    transferred: performance.getEntriesByType('resource').reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
  }));
  results.push({ run: run + 1, loginPageReady: Math.round(loginPageReady), dashboardShell: Math.round(dashboardShell), dashboardComplete: Math.round(dashboardComplete), lcp: Math.round(metrics.lcp), transferred: metrics.transferred });
  await context.close();
}

await browser.close();
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.table(results);
console.log(JSON.stringify({
  runs,
  medianLoginPageReadyMs: median(results.map((result) => result.loginPageReady)),
  medianDashboardShellMs: median(results.map((result) => result.dashboardShell)),
  medianDashboardCompleteMs: median(results.map((result) => result.dashboardComplete)),
  medianLcpMs: median(results.map((result) => result.lcp)),
  medianTransferredBytes: median(results.map((result) => result.transferred)),
}, null, 2));

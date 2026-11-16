import { chromium } from 'playwright-core';

const baseURL = process.env.HOTELOS_URL || 'http://10.10.30.205:8080';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const accounts = ['admin', 'manager', 'reception', 'accountant', 'housekeeping'];
const browser = await chromium.launch({ executablePath, headless: true });
const request = await browser.newContext();

for (const username of accounts) {
  const response = await request.request.post(`${baseURL}/api/v1/auth/login`, {
    data: { username, password: '3400' },
  });
  if (!response.ok()) throw new Error(`${username} login failed: ${response.status()}`);
}

const page = await request.newPage();
page.setDefaultTimeout(10_000);
await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
await page.getByLabel('Four digit access PIN').fill('0000');
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('alert').waitFor();
await page.getByLabel('Four digit access PIN').fill('3400');
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('heading', { name: 'Operations Dashboard' }).waitFor();
await page.getByText('BD', { exact: true }).waitFor();
await page.getByText('USA · ET', { exact: true }).waitFor();
await page.getByText('Connected', { exact: true }).waitFor();
await request.setOffline(true);
await page.getByText('Disconnected', { exact: true }).waitFor();
await request.setOffline(false);
await page.getByText('Connected', { exact: true }).waitFor();
await page.getByLabel('Expand sidebar').click();
await page.getByLabel('Log out').click();
await page.waitForURL('**/login');
await page.getByLabel('Four digit access PIN').waitFor();

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle' });
const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
if (hasHorizontalOverflow) throw new Error('Login has horizontal overflow at 390px.');

await request.close();
await browser.close();
console.log(`Production smoke passed: ${accounts.length} roles, invalid PIN, login, dashboard, logout, routing, and 390px layout.`);

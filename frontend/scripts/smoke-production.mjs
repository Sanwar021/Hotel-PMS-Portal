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
await page.getByText('USA / ET', { exact: true }).waitFor();
await page.getByRole('button', { name: 'BD', exact: true }).click();
await page.getByText('Bangladesh', { exact: true }).waitFor();
await page.getByRole('button', { name: 'USA', exact: true }).click();
await page.getByText('USA / ET', { exact: true }).waitFor();

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
  await page.setViewportSize(viewport);
  await page.getByLabel('Open menu').click();
  await page.waitForTimeout(350);
  const sidebarBox = await page.locator('aside').boundingBox();
  if (!sidebarBox || sidebarBox.x < 0 || sidebarBox.y < 0 || sidebarBox.x + sidebarBox.width > viewport.width + 1 || sidebarBox.y + sidebarBox.height > viewport.height + 1) {
    throw new Error(`Sidebar is misaligned at ${viewport.width}x${viewport.height}.`);
  }
  await page.getByLabel('Close menu').click();
}

await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(350);
const desktopSidebarBox = await page.locator('aside').boundingBox();
if (!desktopSidebarBox || desktopSidebarBox.x < 0 || desktopSidebarBox.y < 0 || desktopSidebarBox.y + desktopSidebarBox.height > 901) {
  throw new Error('Sidebar is misaligned at 1280x900.');
}
const expandSidebar = page.getByLabel('Expand sidebar');
if (await expandSidebar.count()) await expandSidebar.click();
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

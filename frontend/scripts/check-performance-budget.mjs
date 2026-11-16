import { readdir, readFile, stat } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const fileSize = async (relativePath) => (await stat(new URL(relativePath, dist))).size;
const indexHtml = await readFile(new URL('index.html', dist), 'utf8');
const entryFile = indexHtml.match(/<script[^>]+src="\/(assets\/[^"]+\.js)"/)?.[1];
const entryCss = indexHtml.match(/<link[^>]+href="\/(assets\/[^"]+\.css)"/)?.[1];
if (!entryFile || !entryCss) throw new Error('Built entry assets were not found; run npm run build first.');
const assetFiles = await readdir(new URL('assets/', dist));
const imageSizes = await Promise.all(assetFiles.filter((name) => /hotel-login-bg-.*\.webp$/.test(name)).map(async (name) => ({ name, size: await fileSize(`assets/${name}`) })));
const fontFiles = await readdir(new URL('fonts/', dist));
const fontBytes = (await Promise.all(fontFiles.map((name) => fileSize(`fonts/${name}`)))).reduce((sum, size) => sum + size, 0);

const measurements = {
  initialJavaScript: await fileSize(entryFile),
  initialCss: await fileSize(entryCss),
  largestLoginImage: Math.max(...imageSizes.map((image) => image.size)),
  localFonts: fontBytes,
};
const budgets = { initialJavaScript: 380_000, initialCss: 100_000, largestLoginImage: 120_000, localFonts: 80_000 };
const failures = Object.entries(budgets).filter(([name, budget]) => measurements[name] > budget);

console.table(Object.fromEntries(Object.entries(measurements).map(([name, bytes]) => [name, { bytes, budget: budgets[name], passed: bytes <= budgets[name] }])));
console.log('Runtime targets: LCP <= 1500 ms; login-to-dashboard <= 500 ms on the local network.');
if (failures.length) {
  console.error(`Performance budget exceeded: ${failures.map(([name]) => name).join(', ')}`);
  process.exit(1);
}

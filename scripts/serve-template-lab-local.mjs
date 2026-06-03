import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_TEMPLATE_LAB_PORT = 5199;
const port = normalizePort(process.env.PORT || process.argv[2] || DEFAULT_TEMPLATE_LAB_PORT);

process.env.PORT = String(port);

console.log('Template Lab local server');
console.log(`- Template Lab: http://localhost:${port}/template-lab`);
console.log(`- Export API:   http://localhost:${port}/api/export`);
console.log(`- Import API:   http://localhost:${port}/api/import/document`);

printBuildDiagnostics();
await printExportDiagnostics();

await import('./serve-static.mjs');

function normalizePort(value) {
  const portNumber = Number(value);
  if (!Number.isInteger(portNumber) || portNumber <= 0 || portNumber > 65535) {
    console.warn(`Invalid port "${value}". Falling back to ${DEFAULT_TEMPLATE_LAB_PORT}.`);
    return DEFAULT_TEMPLATE_LAB_PORT;
  }
  return portNumber;
}

function printBuildDiagnostics() {
  const requiredDist = [
    ['@xcon-viewer/core', 'packages/core/dist/index.js'],
    ['@xcon-viewer/viewer', 'packages/viewer/dist/index.js'],
    ['@xcon-viewer/markdown-it', 'packages/markdown-it/dist/index.js'],
    ['@xcon-viewer/document-importer', 'packages/document-importer/dist/index.js'],
  ];

  const missing = requiredDist.filter(([, relativePath]) => !existsSync(resolve(rootDir, relativePath)));
  if (!missing.length) {
    console.log('- Viewer packages: built');
    return;
  }

  console.warn('- Viewer packages: missing build output');
  for (const [name, relativePath] of missing) {
    console.warn(`  - ${name}: ${relativePath}`);
  }
  console.warn('  Run `npm run build` before opening the playground if modules fail to load.');
}

async function printExportDiagnostics() {
  const kordocAvailable = await checkOptionalPackage('kordoc');
  const pdfjsAvailable = await checkOptionalPackage('pdfjs-dist');
  const puppeteerAvailable = await checkOptionalPackage('puppeteer-core');
  const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';

  if (kordocAvailable) {
    console.log('- Document import/export: kordoc available');
  } else {
    console.warn('- Document import/export: kordoc not installed; `/api/import/document` and HWP/HWPX export are limited');
  }

  if (pdfjsAvailable) {
    console.log('- PDF import: pdfjs-dist available');
  } else {
    console.warn('- PDF import: pdfjs-dist not installed; kordoc PDF import returns MISSING_DEPENDENCY');
  }

  if (puppeteerAvailable && chromiumPath) {
    console.log(`- PDF export: puppeteer-core available, Chromium=${chromiumPath}`);
  } else if (puppeteerAvailable) {
    console.warn('- PDF export: puppeteer-core available, but PUPPETEER_EXECUTABLE_PATH is not set');
  } else {
    console.warn('- PDF export: puppeteer-core not installed; Template Lab uses browser print fallback');
  }
}

async function checkOptionalPackage(packageName) {
  try {
    await import(packageName);
    return true;
  } catch (_error) {
    return false;
  }
}

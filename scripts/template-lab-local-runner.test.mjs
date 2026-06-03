import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template lab local runner', () => {
  test('provides a local startup wrapper with export diagnostics', () => {
    const scriptPath = join(rootDir, 'scripts', 'serve-template-lab-local.mjs');
    expect(existsSync(scriptPath)).toBe(true);

    const script = readFileSync(scriptPath, 'utf8');
    expect(script).toContain('Template Lab local server');
    expect(script).toContain('const DEFAULT_TEMPLATE_LAB_PORT = 5199');
    expect(script).toContain('http://localhost:${port}/template-lab');
    expect(script).toContain('/api/export');
    expect(script).toContain('/api/import/document');
    expect(script).toContain("await checkOptionalPackage('kordoc')");
    expect(script).toContain("await checkOptionalPackage('pdfjs-dist')");
    expect(script).toContain("await checkOptionalPackage('puppeteer-core')");
    expect(script).toContain('PUPPETEER_EXECUTABLE_PATH');
    expect(script).toContain("await import('./serve-static.mjs')");
  });

  test('exposes npm scripts for local template lab execution', () => {
    const manifest = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));

    expect(manifest.scripts.local).toBe('node scripts/serve-template-lab-local.mjs');
    expect(manifest.scripts['local:template-lab']).toBe('node scripts/serve-template-lab-local.mjs');
    expect(manifest.scripts['test:site']).toContain('scripts/template-lab-local-runner.test.mjs');
  });

  test('documents local startup and server-side export setup', () => {
    const docPath = join(rootDir, 'drafts', 'docs', 'template-lab-local-runbook.ko.md');
    expect(existsSync(docPath)).toBe(true);

    const doc = readFileSync(docPath, 'utf8');
    expect(doc).toContain('npm run local:template-lab');
    expect(doc).toContain('http://localhost:5199/template-lab');
    expect(doc).toContain('PORT=4173');
    expect(doc).toContain('npm install kordoc pdfjs-dist puppeteer-core');
    expect(doc).toContain('PUPPETEER_EXECUTABLE_PATH');
    expect(doc).toContain('/api/export');
  });
});

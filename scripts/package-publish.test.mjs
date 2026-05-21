import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packagesDir = join(rootDir, 'packages');
const packageNames = readdirSync(packagesDir).filter((name) =>
  existsSync(join(packagesDir, name, 'package.json')),
);

describe('npm package publishing metadata', () => {
  test('keeps the monorepo root private', () => {
    const rootPackage = readJson(join(rootDir, 'package.json'));

    expect(rootPackage.private).toBe(true);
    expect(rootPackage.workspaces).toContain('packages/*');
  });

  test.each(packageNames)('%s has npm publish metadata and package docs', (packageName) => {
    const packageDir = join(packagesDir, packageName);
    const manifest = readJson(join(packageDir, 'package.json'));

    expect(manifest.name).toMatch(/^@xcon-viewer\//);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.license).toBe('MIT');
    expect(manifest.publishConfig).toEqual({ access: 'public' });
    expect(manifest.scripts?.prepublishOnly).toBe('npm run test && npm run build');
    expect(manifest.repository?.url).toBe('git+https://github.com/xcon-viewer/xcon-viewer.git');
    expect(manifest.repository?.directory).toBe(`packages/${packageName}`);
    expect(existsSync(join(packageDir, 'README.md'))).toBe(true);
    expect(existsSync(join(packageDir, 'LICENSE'))).toBe(true);
  });

  test.each(packageNames)('%s publishes only runtime declarations, JavaScript, docs, and metadata', (packageName) => {
    const manifest = readJson(join(packagesDir, packageName, 'package.json'));
    const files = manifest.files ?? [];

    expect(files).toContain('dist/**/*.js');
    expect(files).toContain('dist/**/*.d.ts');
    expect(files).toContain('README.md');
    expect(files).toContain('LICENSE');
    expect(files).not.toContain('dist');
    expect(files.some((entry) => String(entry).includes('.tsbuildinfo'))).toBe(false);
    expect(files.some((entry) => String(entry).endsWith('.map'))).toBe(false);

    if (packageName === 'github-action') {
      expect(files).toContain('action.yml');
    }
  });
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

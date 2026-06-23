import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('site XCON embed contract', () => {
  test('shares one host wrapper implementation across document labs', () => {
    const css = readFileSync(join(rootDir, 'site', 'xcon-embed.css'), 'utf8');
    const js = readFileSync(join(rootDir, 'site', 'xcon-embed.js'), 'utf8');

    expect(css).toMatch(/\.xcon-viewer-host,\s*\.partial-xcon-host\s*\{/);
    expect(css).toContain('position: relative;');
    expect(css).toContain('isolation: isolate;');
    expect(css).toContain('.xcon-viewer-host > [data-xcon-type]');
    expect(js).toContain('window.XconEmbed');
    expect(js).toContain('xconHostFrameStyle');
    expect(js).toContain('getXconDocumentSize');

    for (const pageName of ['template-lab.html', 'meta-lab.html']) {
      const html = readFileSync(join(rootDir, 'site', pageName), 'utf8');
      expect(html, pageName).toContain('href="/xcon-embed.css"');
      expect(html, pageName).toContain('src="/xcon-embed.js"');
      expect(html, pageName).toContain('window.XconEmbed.xconHostFrameStyle');
      expect(html, pageName).not.toContain('function xconHostFrameStyle');
    }
  });
});

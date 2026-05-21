import { describe, expect, test } from 'vitest';

import xconVitePlugin, { isXconModule, transformXconModule } from './index.js';

describe('@xcon-viewer/vite-plugin', () => {
  test('detects XCON importable modules', () => {
    expect(isXconModule('/src/screen.xcon')).toBe(true);
    expect(isXconModule('/src/screen.xcon.json?raw')).toBe(true);
    expect(isXconModule('/src/screen.json')).toBe(false);
  });

  test('treats .xcon.sketch and .xcons files as XCON modules', () => {
    expect(isXconModule('/src/hello.xcon.sketch')).toBe(true);
    expect(isXconModule('/src/hello.xcons')).toBe(true);
  });

  test('transforms XCON modules into source, document, and html exports', () => {
    const code = transformXconModule('{"type":"form","components":{"title":{"type":"label","text":"Hello"}}}', '/src/screen.xcon.json');

    expect(code).toContain('export const source');
    expect(code).toContain('export const document');
    expect(code).toContain('data-xcon-type=\\\"label\\\"');
    expect(code).toContain('export default document');
  });

  test('transforms XCON/SKETCH modules', () => {
    const code = transformXconModule(
      'screen 360x220 bg #fff\ntitle: label "Hello Sketch" at 0 0 360 40',
      '/src/hello.xcon.sketch',
    );

    expect(code).toContain('Hello Sketch');
    expect(code).toContain('data-xcon-type=\\\"label\\\"');
  });

  test('returns a Vite plugin with a pre transform hook', () => {
    const plugin = xconVitePlugin();

    expect(plugin.name).toBe('xcon-viewer');
    expect(plugin.enforce).toBe('pre');
    expect(plugin.transform('{"type":"form"}', '/screen.xcon.json')).toContain('export const html');
    expect(plugin.transform('body{}', '/style.css')).toBeNull();
  });
});

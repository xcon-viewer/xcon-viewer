import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';

import { extractXconBlocks, runAction } from './index.js';

describe('@xcon-viewer/github-action', () => {
  test('extracts XCON fenced code blocks from markdown', () => {
    const blocks = extractXconBlocks([
      '# Demo',
      '```xcon-json',
      '{"type":"form"}',
      '```',
      '```js',
      'const a = 1;',
      '```',
    ].join('\n'));

    expect(blocks).toEqual([{ index: 0, language: 'xcon-json', source: '{"type":"form"}' }]);
  });

  test('extracts xcon-sketch and xcons fenced blocks', () => {
    const blocks = extractXconBlocks(`
      \`\`\`xcon-sketch
      screen 360x220
      title: label "Hello" at 0 0 360 40
      \`\`\`

      \`\`\`xcons
      screen 360x220
      title: label "Short" at 0 0 360 40
      \`\`\`
    `);

    expect(blocks.map((block) => block.language)).toEqual(['xcon-sketch', 'xcons']);
  });

  test('renders markdown XCON blocks to HTML artifacts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'xcon-action-'));
    await writeFile(
      join(dir, 'README.md'),
      ['# Demo', '```xcon-json', '{"type":"form","components":{"title":{"type":"label","text":"Hello"}}}', '```'].join('\n'),
      'utf8',
    );

    const results = await runAction({ cwd: dir, files: ['README.md'], outDir: 'artifacts' });

    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(true);
    expect(results[0].outputFile?.replaceAll('\\', '/')).toBe('artifacts/README-1.html');
    await expect(readFile(join(dir, results[0].outputFile!), 'utf8')).resolves.toContain('data-xcon-type="label"');
  });
});

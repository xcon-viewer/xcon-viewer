import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';

import { convertFile, formatFile, renderFile, validateFile } from './index.js';

async function tempFile(name: string, content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'xcon-cli-'));
  const file = join(dir, name);
  await writeFile(file, content, 'utf8');
  return file;
}

describe('xcon CLI commands', () => {
  test('validates documents and returns non-zero result for invalid public props', async () => {
    const validFile = await tempFile('valid.xcon.json', JSON.stringify({ type: 'form' }));
    const invalidFile = await tempFile(
      'invalid.xcon.json',
      JSON.stringify({ type: 'form', onClick: 'runRuntimeLogic' }),
    );

    await expect(validateFile(validFile)).resolves.toMatchObject({ exitCode: 0 });
    await expect(validateFile(invalidFile)).resolves.toMatchObject({ exitCode: 1 });
  });

  test('converts, formats, and renders a XCON document', async () => {
    const file = await tempFile(
      'screen.xcon.json',
      JSON.stringify({
        type: 'form',
        components: {
          title: { type: 'label', text: 'Hello' },
        },
      }),
    );

    const converted = await convertFile(file, { to: 'tagless' });
    expect(converted.exitCode).toBe(0);
    expect(converted.output).toMatch(/^♤♡◇♧/);

    const formatted = await formatFile(file);
    expect(formatted.output).toContain('\n  "type": "form"');

    const outFile = file.replace('.json', '.html');
    const rendered = await renderFile(file, { out: outFile });
    expect(rendered.exitCode).toBe(0);
    expect(await readFile(outFile, 'utf8')).toContain('data-xcon-type="label"');
  });

  test('detects and converts XCON/SKETCH files', async () => {
    const file = await tempFile(
      'hello.xcon.sketch',
      'screen 360x220 bg #fff\ntitle: label "Hello Sketch" at 0 0 360 40',
    );

    const result = await convertFile(file, { to: 'json' });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('"text": "Hello Sketch"');
  });
});

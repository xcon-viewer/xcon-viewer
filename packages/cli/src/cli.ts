// xcon CLI entry point
// Usage:
//   xcon validate <file>               Validate a XCON document
//   xcon convert <file> --to <syntax>  Convert to json | xml | tagless
//   xcon render <file> --out <file>    Render to static HTML
//   xcon format <file>                 Format / pretty-print a XCON document

import { convertFile } from './commands/convert.js';
import { formatFile } from './commands/format.js';
import { renderFile } from './commands/render.js';
import { validateFile } from './commands/validate.js';
import type { XconOutputSyntax } from './commands/common.js';

const args = process.argv.slice(2);

void main(args).then((exitCode) => {
  process.exitCode = exitCode;
});

export async function main(argv: string[]): Promise<number> {
  const [command, file] = argv;
  if (!command || command === '--help' || command === '-h') {
    console.log(helpText());
    return 0;
  }
  if (!file) {
    console.error(`Missing file for command "${command}".`);
    console.error(helpText());
    return 1;
  }

  const options = parseOptions(argv.slice(2));
  const result =
    command === 'validate'
      ? await validateFile(file)
      : command === 'convert'
        ? await convertFile(file, { to: requireSyntax(options.to), out: options.out })
        : command === 'format'
          ? await formatFile(file, { out: options.out })
          : command === 'render'
            ? await renderFile(file, { out: options.out })
            : null;

  if (!result) {
    console.error(`Unknown command "${command}".`);
    console.error(helpText());
    return 1;
  }

  if (result.error) console.error(result.error);
  else if (!options.out && result.output) console.log(result.output);
  else if (result.output && command === 'validate') console.log(result.output);
  return result.exitCode;
}

function parseOptions(argv: string[]): Record<string, string | undefined> {
  const options: Record<string, string | undefined> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    options[item.slice(2)] = argv[index + 1];
    index += 1;
  }
  return options;
}

function requireSyntax(value: string | undefined): XconOutputSyntax {
  if (value === 'json' || value === 'xml' || value === 'tagless') return value;
  throw new Error('convert requires --to json|xml|tagless.');
}

function helpText(): string {
  return [
    'Usage:',
    '  xcon validate <file>',
    '  xcon convert <file> --to <json|xml|tagless> [--out <file>]',
    '  xcon format <file> [--out <file>]',
    '  xcon render <file> --out <file.html>',
  ].join('\n');
}

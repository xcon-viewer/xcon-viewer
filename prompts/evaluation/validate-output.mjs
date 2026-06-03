#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith('--'));
const jsonMode = args.includes('--json');

if (!targetArg) {
  console.error('Usage: node prompts/evaluation/validate-output.mjs <generated-output.md> [--json]');
  process.exit(1);
}

const targetPath = path.resolve(process.cwd(), targetArg);
if (!fs.existsSync(targetPath)) {
  console.error(`Missing file: ${targetPath}`);
  process.exit(1);
}

const source = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

const result = {
  file: targetPath,
  fences: [],
  errors: [],
  warnings: [],
  summary: {}
};

function add(level, message, meta = {}) {
  result[level === 'error' ? 'errors' : 'warnings'].push({ message, ...meta });
}

async function loadCore() {
  const corePath = path.join(repoRoot, 'packages/core/dist/index.js');
  if (!fs.existsSync(corePath)) {
    add('warning', 'Core build output is missing. Run npm run build for parser/validator checks.', { path: corePath });
    return {};
  }
  try {
    return await import(pathToFileURL(corePath).href);
  } catch (error) {
    add('warning', `Failed to load core parser/validator: ${error.message}`, { path: corePath });
    return {};
  }
}

function extractFences(text) {
  const fences = [];
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match;
  while ((match = re.exec(text))) {
    const before = text.slice(0, match.index);
    const startLine = before.split('\n').length;
    fences.push({
      lang: String(match[1] || '').trim(),
      body: match[2].replace(/\n$/, ''),
      startLine
    });
  }
  return fences;
}

function firstMeaningfulLine(body) {
  return body.split('\n').find((line) => line.trim() && !line.trim().startsWith('#')) || '';
}

function looksLikeSketch(lang, body) {
  const l = lang.toLowerCase();
  return l === 'xcon-sketch' || l === 'sketch' || (l === 'xcon' && /^screen\b/i.test(firstMeaningfulLine(body).trim()));
}

function looksLikeJson(lang, body) {
  const l = lang.toLowerCase();
  const first = firstMeaningfulLine(body).trim();
  return ['xcon-json', 'xconj', 'json'].includes(l) && (first.startsWith('{') || first.startsWith('['));
}

function looksLikeFixture(lang) {
  return ['xcon-chain-fixture', 'fixture', 'json-fixture'].includes(lang.toLowerCase());
}

function looksLikeChain(lang) {
  return ['xcon-chain', 'chain'].includes(lang.toLowerCase());
}

function looksLikeWorkflow(lang) {
  return ['xcon-workflow', 'workflow'].includes(lang.toLowerCase());
}

const removedComponents = ['webView', 'frame', 'import', 'fileUpload', 'filePicker', 'imagePicker', 'signaturePad'];

function scanRemovedComponents(body, fence) {
  for (const name of removedComponents) {
    const typeJson = new RegExp(`"type"\\s*:\\s*"${name}"`, 'i');
    const typeSketch = new RegExp(`:\\s*${name}\\b`, 'i');
    if (typeJson.test(body) || typeSketch.test(body)) {
      add('error', `Removed or unsafe component type used: ${name}`, { fence: fence.lang, line: fence.startLine });
    }
  }
}

function checkListContracts(body, fence) {
  const lines = body.split('\n');
  lines.forEach((line, index) => {
    if (!/:\s*list\b/.test(line) && !/"type"\s*:\s*"list"/.test(line)) return;
    const windowText = lines.slice(index, Math.min(lines.length, index + 80)).join('\n');
    const listLine = fence.startLine + index;
    if (!/dataTemplate/.test(windowText)) {
      add('error', 'List is missing dataTemplate.', { line: listLine });
    }
    if (!/templates/.test(windowText)) {
      add('error', 'List is missing templates/cell layout.', { line: listLine });
    }
    if (!/backgroundColor|^\s*bg\s+/m.test(windowText)) {
      add('warning', 'List should set backgroundColor, usually @surface.', { line: listLine });
    }
    if (/separator/.test(windowText) && !/separator[\s\S]{0,160}(color|separatorColor)/.test(windowText)) {
      add('warning', 'List separator should set color/textarea separatorColor matching the list background.', { line: listLine });
    }
  });

  if (/"cell"\s*:\s*\{\s*"type"\s*:/.test(body) || /templates\s+\{"cell":\{"type"/.test(body)) {
    add('error', 'templates.cell must contain a named cell layout, not a direct component object.', {
      fence: fence.lang,
      line: fence.startLine
    });
  }
}

function collectDollarRefs(text) {
  const refs = new Set();
  const re = /\$([A-Za-z_][\w-]*)/g;
  let match;
  while ((match = re.exec(text))) refs.add(match[1]);
  return refs;
}

function checkChainFence(fence, declaredAliases) {
  const lang = fence.lang;
  const asMatch = /\bas(?:=|\s+)([A-Za-z_][\w-]*)/.exec(lang);
  if (asMatch) declaredAliases.add(asMatch[1]);

  const meaningful = fence.body.split('\n').map((line) => line.trim()).filter(Boolean);
  const hasSugar = meaningful.some((line) => line.startsWith('=') || line.startsWith('let ') || line.startsWith('return '));
  if (!hasSugar) {
    add('warning', 'xcon-chain fence should use SUGAR lines starting with =, let, or return.', { line: fence.startLine });
  }
}

function checkWorkflowFence(fence) {
  const body = fence.body;
  if (!/^\s*workflow\s+["']/m.test(body)) {
    add('error', 'xcon-workflow fence should start with workflow "Name".', { line: fence.startLine });
  }

  const allowed = new Set([
    'note',
    'callApi',
    'workqueue',
    'queue',
    'scheduler',
    'schedule',
    'condition',
    'chain',
    'setObjectValues',
    'setNewData',
    'saveData',
    'activity'
  ]);
  const actionLine = /^\s{2,}([A-Za-z_][\w-]*)\s*:\s*([A-Za-z_][\w-]*)\b/gm;
  let match;
  while ((match = actionLine.exec(body))) {
    const [, id, type] = match;
    if (['actions', 'after', 'data', 'payload', 'parameter'].includes(id)) continue;
    if (!allowed.has(type)) {
      add('warning', `Unknown or uncommon workflow action type "${type}".`, { line: fence.startLine + body.slice(0, match.index).split('\n').length - 1 });
    }
  }

  if (/:\s*workqueue\b/.test(body) && !/concurrency\s+\d+/.test(body)) {
    add('warning', 'workqueue should declare concurrency.', { line: fence.startLine });
  }
  if (/:\s*scheduler\b[\s\S]*mode\s+["']interval["']/.test(body) && !/iterations\s+\d+/.test(body)) {
    add('warning', 'interval scheduler should declare iterations for deterministic demos.', { line: fence.startLine });
  }
}

function checkFixtureFence(fence) {
  try {
    JSON.parse(fence.body);
  } catch (error) {
    add('error', `Fixture JSON parse failed: ${error.message}`, { line: fence.startLine });
  }
}

async function main() {
  const core = await loadCore();
  const fences = extractFences(source);
  result.fences = fences.map((fence) => ({ lang: fence.lang, startLine: fence.startLine, lines: fence.body.split('\n').length }));

  const declaredAliases = new Set();
  const allRefs = collectDollarRefs(source);

  for (const fence of fences) {
    scanRemovedComponents(fence.body, fence);

    if (looksLikeSketch(fence.lang, fence.body)) {
      const first = firstMeaningfulLine(fence.body).trim();
      if (!/^screen\b/i.test(first)) {
        add('error', 'xcon-sketch fence must start with screen.', { line: fence.startLine });
      }
      checkListContracts(fence.body, fence);
      if (core.parseBySyntax) {
        try {
          const parsed = core.parseBySyntax(fence.body, 'sketch');
          const xcon = parsed?.document || parsed?.value || parsed;
          if (core.validate) {
            const validation = core.validate(xcon);
            if (validation && validation.ok === false) {
              add('error', `XCON validation failed: ${(validation.errors || []).map((e) => e.message || String(e)).join('; ')}`, { line: fence.startLine });
            }
          }
        } catch (error) {
          add('error', `XCON/SKETCH parse failed: ${error.message}`, { line: fence.startLine });
        }
      }
    } else if (looksLikeJson(fence.lang, fence.body)) {
      try {
        const parsed = JSON.parse(fence.body);
        if (core.validate && parsed && typeof parsed === 'object' && parsed.type) {
          const validation = core.validate(parsed);
          if (validation && validation.ok === false) {
            add('error', `XCON JSON validation failed: ${(validation.errors || []).map((e) => e.message || String(e)).join('; ')}`, { line: fence.startLine });
          }
        }
      } catch (error) {
        add('error', `JSON parse failed: ${error.message}`, { line: fence.startLine });
      }
      checkListContracts(fence.body, fence);
    } else if (looksLikeFixture(fence.lang)) {
      checkFixtureFence(fence);
    } else if (looksLikeChain(fence.lang)) {
      checkChainFence(fence, declaredAliases);
    } else if (looksLikeWorkflow(fence.lang)) {
      checkWorkflowFence(fence);
    }
  }

  for (const ref of allRefs) {
    if (!declaredAliases.has(ref)) {
      add('warning', `Markdown references $${ref}, but no xcon-chain alias with that name was found.`, { alias: ref });
    }
  }

  result.summary = {
    fenceCount: fences.length,
    sketchCount: fences.filter((f) => looksLikeSketch(f.lang, f.body)).length,
    chainCount: fences.filter((f) => looksLikeChain(f.lang)).length,
    fixtureCount: fences.filter((f) => looksLikeFixture(f.lang)).length,
    workflowCount: fences.filter((f) => looksLikeWorkflow(f.lang)).length,
    errors: result.errors.length,
    warnings: result.warnings.length
  };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`XCON prompt output validation: ${result.errors.length ? 'FAILED' : 'OK'}`);
    console.log(`Fences: ${result.summary.fenceCount} total, ${result.summary.sketchCount} sketch, ${result.summary.chainCount} chain, ${result.summary.fixtureCount} fixture, ${result.summary.workflowCount} workflow`);
    for (const error of result.errors) {
      console.log(`ERROR${error.line ? ` line ${error.line}` : ''}: ${error.message}`);
    }
    for (const warning of result.warnings) {
      console.log(`WARNING${warning.line ? ` line ${warning.line}` : ''}: ${warning.message}`);
    }
  }

  process.exit(result.errors.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

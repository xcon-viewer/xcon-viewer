#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const promptsDir = path.join(repoRoot, 'prompts');

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function resolvePromptPath(input) {
  const direct = path.resolve(process.cwd(), input);
  if (fs.existsSync(direct)) return direct;
  const inPrompts = path.join(promptsDir, input);
  if (fs.existsSync(inPrompts)) return inPrompts;
  const inEvaluation = path.join(__dirname, input);
  if (fs.existsSync(inEvaluation)) return inEvaluation;
  return direct;
}

function usage() {
  console.error('Usage: node prompts/evaluation/build-test-prompt.mjs <prompt.md> <case.md>');
  console.error('Example: node prompts/evaluation/build-test-prompt.mjs 01-sketch-ui-generation.md cases/01-mobile-ui.brief.md');
}

const [, , promptArg, caseArg] = process.argv;
if (!promptArg || !caseArg) {
  usage();
  process.exit(1);
}

const sharedPath = path.join(promptsDir, '00-shared-xcon-contract.md');
const promptPath = resolvePromptPath(promptArg);
const casePath = resolvePromptPath(caseArg);

const shared = readRequired(sharedPath);
const prompt = readRequired(promptPath);
const testCase = readRequired(casePath);

const output = [
  '# Blind XCON Generation Test',
  '',
  'You are a model being evaluated only from the instructions below.',
  'Do not assume any hidden XCON knowledge. Follow the contract exactly.',
  '',
  '---',
  '',
  '## Shared Contract',
  '',
  shared.trim(),
  '',
  '---',
  '',
  '## Task Prompt',
  '',
  prompt.trim(),
  '',
  '---',
  '',
  '## Test Brief',
  '',
  testCase.trim(),
  '',
  '---',
  '',
  '## Required Output',
  '',
  'Return only the generated artifact requested by the task prompt and test brief.',
  'Do not explain the rules back to the user unless the task prompt asks for explanation.',
  ''
].join('\n');

process.stdout.write(output);

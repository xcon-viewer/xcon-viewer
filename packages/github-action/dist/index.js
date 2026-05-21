// src/index.ts
import { mkdir, readFile, readdir, stat, writeFile } from "fs/promises";
import { basename, join, relative } from "path";
import { deserialize, parseBySyntax } from "@xcon-viewer/core";
import { renderDocument } from "@xcon-viewer/viewer";
var fencePattern = /```(xcon(?:-(?:json|xml|tagless|sketch))?|xcons)\s*\n([\s\S]*?)```/g;
async function runAction(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outDir = options.outDir ?? "xcon-rendered";
  const files = await collectMarkdownFiles(options.files ?? ["README.md"], cwd);
  const results = [];
  await mkdir(join(cwd, outDir), { recursive: true });
  for (const file of files) {
    const source = await readFile(join(cwd, file), "utf8");
    const blocks = extractXconBlocks(source);
    for (const block of blocks) {
      const result = await renderBlock(file, block.index, block.language, block.source, cwd, outDir);
      results.push(result);
    }
  }
  const invalid = results.filter((result) => !result.ok);
  if (invalid.length > 0 && options.failOnInvalid !== false) {
    throw new Error(`XCON GitHub Action found ${invalid.length} invalid block(s).`);
  }
  return results;
}
function extractXconBlocks(markdown) {
  const blocks = [];
  let match;
  while (match = fencePattern.exec(markdown)) {
    blocks.push({ index: blocks.length, language: match[1], source: match[2].trim() });
  }
  return blocks;
}
async function renderBlock(file, index, language, source, cwd, outDir) {
  try {
    const syntax = languageToSyntax(language);
    const document = syntax ? parseBySyntax(source, syntax) : deserialize(source);
    const outputFile = join(outDir, `${safeName(file)}-${index + 1}.html`);
    await writeFile(join(cwd, outputFile), renderDocument(document), "utf8");
    return { file, index, language, ok: true, outputFile };
  } catch (error) {
    return { file, index, language, ok: false, error: error.message };
  }
}
async function collectMarkdownFiles(inputs, cwd) {
  const files = [];
  for (const input of inputs.flatMap(splitInputs).filter(Boolean)) {
    const fullPath = join(cwd, input);
    const item = await stat(fullPath).catch(() => null);
    if (!item) continue;
    if (item.isDirectory()) {
      await collectMarkdownFilesFromDirectory(fullPath, cwd, files);
    } else if (input.toLowerCase().endsWith(".md")) {
      files.push(input);
    }
  }
  return files;
}
async function collectMarkdownFilesFromDirectory(directory, cwd, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFilesFromDirectory(fullPath, cwd, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(relative(cwd, fullPath));
    }
  }
}
function splitInputs(value) {
  return value.split(/[,\n]/).map((item) => item.trim());
}
function languageToSyntax(language) {
  if (language === "xcon-json") return "json";
  if (language === "xcon-xml") return "xml";
  if (language === "xcon-tagless") return "tagless";
  if (language === "xcon-sketch" || language === "xcons") return "sketch";
  return null;
}
function safeName(file) {
  return basename(file).replaceAll(/[^a-z0-9._-]/gi, "-").replace(/\.md$/i, "");
}
async function main() {
  const results = await runAction({
    files: splitInputs(process.env.INPUT_FILES ?? "README.md"),
    outDir: process.env.INPUT_OUT_DIR ?? "xcon-rendered",
    failOnInvalid: (process.env.INPUT_FAIL_ON_INVALID ?? "true") !== "false"
  });
  const rendered = results.filter((result) => result.ok).length;
  const failed = results.length - rendered;
  console.log(`XCON rendered ${rendered} block(s), ${failed} failed.`);
  for (const result of results) {
    if (result.ok) console.log(`${result.file}#${result.index + 1} -> ${result.outputFile}`);
    else console.error(`${result.file}#${result.index + 1}: ${result.error}`);
  }
}
if (process.env.GITHUB_ACTIONS) {
  void main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
export {
  extractXconBlocks,
  runAction
};

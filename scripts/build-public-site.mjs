import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = join(rootDir, 'dist-site');

const fileCopies = [
  ['site/index.html', 'index.html'],
  ['site/template-lab.html', 'template-lab.html'],
  ['site/meta-lab.html', 'meta-lab.html'],
  ['site/chatgpt-simulation.html', 'chatgpt-simulation.html'],
  ['site/chatgpt-markdown-sketch-simulation.html', 'chatgpt-markdown-sketch-simulation.html'],
  ['site/html-css-simulation.html', 'html-css-simulation.html'],
  ['site/xcon-viewer-viral-demo-no-site-header.html', 'xcon-viewer-viral-demo-no-site-header.html'],
  ['site/chatgpt-viral-demo-v2.html', 'chatgpt-viral-demo-v2.html'],
  ['site/claude-markdown-sketch-demo.html', 'claude-markdown-sketch-demo.html'],
  ['site/advanced-visualization-test.html', 'advanced-visualization-test.html'],
  ['site/advanced-visualization-test.html', 'site/advanced-visualization-test.html'],
  ['site/advanced-visualization-test-runtime.js', 'site/advanced-visualization-test-runtime.js'],
  ['site/network-diagram-test.html', 'network-diagram-test.html'],
  ['site/network-diagram-test.html', 'site/network-diagram-test.html'],
  ['site/network-diagram-test-runtime.js', 'site/network-diagram-test-runtime.js'],
  ['site/docs.html', 'docs.html'],
  ['site/spec.html', 'spec.html'],
  ['site/examples.html', 'examples.html'],
  ['site/api.html', 'api.html'],
  ['site/security.html', 'security.html'],
  ['site/history.html', 'history.html'],
  ['site/faq.html', 'faq.html'],
  ['site/markdown-viewer.html', 'markdown-viewer.html'],
  ['site/styles.css', 'styles.css'],
  ['tools/xcon-workflow-runner/src/demo-runtime.mjs', 'xcon-demo-runtime.mjs'],
  ['site/xcon-demo-renderer.mjs', 'xcon-demo-renderer.mjs'],
  ['site/xcon-embed.css', 'xcon-embed.css'],
  ['site/xcon-embed.js', 'xcon-embed.js'],
  ['site/robots.txt', 'robots.txt'],
  ['site/sitemap.xml', 'sitemap.xml'],
  ['site/llms.txt', 'llms.txt'],
  ['site/llms-full.txt', 'llms-full.txt'],
  ['schema/xcon.schema.json', 'xcon.schema.json'],
  ['playground/index.html', 'play/index.html'],
  ['playground/markdown.html', 'play/markdown.html'],
  ['playground/sketch.html', 'play/sketch.html'],
  ['docs/README.md', 'docs/README.md'],
  ['docs/xcon-component-specs.en.md', 'docs/xcon-component-specs.en.md'],
  ['docs/integrations.md', 'docs/integrations.md'],
  ['docs/public-site.md', 'docs/public-site.md'],
  ['docs/deployment.md', 'docs/deployment.md'],
  ['docs/deployment-files.md', 'docs/deployment-files.md'],
  ['spec/README.md', 'spec/README.md'],
  ['spec/security-model.md', 'spec/security-model.md'],
  ['spec/xcon-json-syntax.md', 'spec/xcon-json-syntax.md'],
  ['spec/xcon-object-model.md', 'spec/xcon-object-model.md'],
  ['spec/xcon-sketch-syntax.md', 'spec/xcon-sketch-syntax.md'],
  ['spec/xcon-tagless-markers.md', 'spec/xcon-tagless-markers.md'],
  ['spec/xcon-tagless-syntax.md', 'spec/xcon-tagless-syntax.md'],
  ['spec/xcon-xml-syntax.md', 'spec/xcon-xml-syntax.md'],
  ['node_modules/markdown-it/dist/markdown-it.min.js', 'vendor/markdown-it/markdown-it.min.js'],
];

const dirCopies = [
  ['examples', 'examples'],
  ['images', 'images'],  
  ['packages/core/dist', 'packages/core/dist'],
  ['packages/viewer/dist', 'packages/viewer/dist'],
  ['packages/markdown-it/dist', 'packages/markdown-it/dist'],
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const [from, to] of fileCopies) {
  copyFile(from, to);
}

for (const [from, to] of dirCopies) {
  copyDir(from, to);
}

console.log(`Public site bundle written to ${outDir}`);

function copyFile(from, to) {
  const source = join(rootDir, from);
  const target = join(outDir, to);
  if (!existsSync(source)) {
    throw new Error(`Missing public site source file: ${from}`);
  }
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
}

function copyDir(from, to) {
  const source = join(rootDir, from);
  const target = join(outDir, to);
  if (!existsSync(source)) {
    throw new Error(`Missing public site source directory: ${from}. Run npm run build first.`);
  }
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

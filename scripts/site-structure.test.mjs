import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import {
  contentTypeForPath,
  publicRoutes,
  resolveMarkdownViewerPath,
  resolvePublicPath,
  shouldServeMarkdownViewer,
} from './site-routes.mjs';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const privateBrandPattern = new RegExp('xa' + 'mong', 'i');
const privateSourcePattern = new RegExp('Attribute' + 'List', 'i');
const privateRuntimePattern = new RegExp('private ' + 'runtime', 'i');
const privatePlatformPattern = new RegExp('no-code ' + 'platform', 'i');

const requiredRoutes = [
  '/',
  '/docs',
  '/spec',
  '/examples',
  '/play',
  '/api',
  '/security',
  '/history',
  '/faq',
  '/llms.txt',
  '/llms-full.txt',
  '/sitemap.xml',
  '/xcon.schema.json',
];

const publicTextFiles = [
  'README.md',
  'schema/xcon.schema.json',
  'site/api.html',
  'site/docs.html',
  'site/examples.html',
  'site/faq.html',
  'site/history.html',
  'site/index.html',
  'site/llms-full.txt',
  'site/llms.txt',
  'site/markdown-viewer.html',
  'site/security.html',
  'site/spec.html',
  'docs/README.md',
  'docs/deployment-files.md',
  'docs/deployment.md',
  'docs/integrations.md',
  'docs/public-site.md',
  'docs/xcon-component-specs.en.md',
  'examples/README.md',
  'examples/showcase/README.md',
  'spec/README.md',
  'spec/security-model.md',
  'spec/xcon-json-syntax.md',
  'spec/xcon-object-model.md',
  'spec/xcon-sketch-syntax.md',
  'spec/xcon-tagless-markers.md',
  'spec/xcon-tagless-syntax.md',
  'spec/xcon-xml-syntax.md',
];

describe('public site structure', () => {
  test('defines every recommended public route', () => {
    expect(publicRoutes.map((route) => route.path)).toEqual(requiredRoutes);
  });

  test('maps each route to an existing file', () => {
    for (const route of requiredRoutes) {
      const filePath = resolvePublicPath(route);
      expect(filePath, route).toBeTruthy();
      expect(existsSync(filePath), route).toBe(true);
    }
  });

  test('publishes LLM and search discovery files with canonical links', () => {
    const llms = readFileSync(join(rootDir, 'site', 'llms.txt'), 'utf8');
    const llmsFull = readFileSync(join(rootDir, 'site', 'llms-full.txt'), 'utf8');
    const sitemap = readFileSync(join(rootDir, 'site', 'sitemap.xml'), 'utf8');

    expect(llms).toContain('XCON Viewer is a public viewer for XCON UI documents.');
    expect(llms).toContain('https://xconviewer.dev/play');
    expect(llmsFull).toContain('Prefer XCON/JSON when generating examples.');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/docs</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/xcon.schema.json</loc>');
  });

  test('embeds a live XCON/SKETCH homepage demo using public viewer packages', () => {
    const homePage = readFileSync(join(rootDir, 'site', 'index.html'), 'utf8');
    const styles = readFileSync(join(rootDir, 'site', 'styles.css'), 'utf8');

    expect(homePage).toContain('id="live-sketch-demo"');
    expect(homePage).toContain('href="/play">Try Live Editor</a>');
    expect(homePage).toContain('href="/play/sketch">Open SKETCH Editor</a>');
    expect(homePage).toContain('href="/play/markdown">Open Markdown Playground</a>');
    expect(homePage).toContain('<code id="liveSketchCode"></code>');
    expect(homePage).toContain('id="liveSketchPreview"');
    expect(homePage).toContain('"@xcon-viewer/core": "/packages/core/dist/index.js"');
    expect(homePage).toContain('"@xcon-viewer/viewer": "/packages/viewer/dist/index.js"');
    expect(homePage).toContain("from '@xcon-viewer/core'");
    expect(homePage).toContain("from '@xcon-viewer/viewer'");
    expect(homePage).toContain('parseBySyntax');
    expect(homePage).toContain('render(documentModel, preview');
    expect(homePage).toContain('typeSketch();');
    expect(homePage).toContain('const typeDelayMs = 42;');
    expect(homePage).toContain('index += 1;');
    expect(homePage).not.toContain('index < 42 ? 28 : 16');
    expect(homePage).not.toContain('if (reduceMotion) {');
    expect(styles).toMatch(/\.live-sketch-preview\s*\{[^}]*position:\s*relative;/s);
    expect(styles).toContain('prefers-reduced-motion: reduce');
  });

  test('keeps the public schema available at the site root', () => {
    const schemaPath = resolvePublicPath('/xcon.schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

    expect(schema.$id).toBe('https://xconviewer.dev/xcon.schema.json');
    expect(schema.title).toBe('XCON Document');
  });

  test('serves the standalone markdown playground route', () => {
    const markdownPlaygroundPath = resolvePublicPath('/play/markdown');

    expect(markdownPlaygroundPath).toBe(join(rootDir, 'playground', 'markdown.html'));
    expect(existsSync(markdownPlaygroundPath)).toBe(true);
  });

  test('serves the standalone sketch playground route', () => {
    const sketchPlaygroundPath = resolvePublicPath('/play/sketch');
    const sketchPlayground = readFileSync(sketchPlaygroundPath, 'utf8');

    expect(sketchPlaygroundPath).toBe(join(rootDir, 'playground', 'sketch.html'));
    expect(existsSync(sketchPlaygroundPath)).toBe(true);
    expect(sketchPlayground).toContain('@xcon-viewer/core');
    expect(sketchPlayground).toContain('@xcon-viewer/viewer');
    expect(sketchPlayground).toContain('../examples/showcase/p_xconbnb_main.xcon.sketch');
    expect(sketchPlayground).not.toContain('/__drafts/');
    expect(sketchPlayground).not.toContain('xcon-public-runtime.bundle.js');
  });

  test('serves ESM modules with a JavaScript MIME type', () => {
    expect(contentTypeForPath(join(rootDir, 'vendor', 'markdown-it', 'markdown-it.min.js'))).toBe(
      'text/javascript; charset=utf-8',
    );
  });

  test('maps the self-hosted markdown-it browser bundle for the source playground server', () => {
    const bundlePath = resolvePublicPath('/vendor/markdown-it/markdown-it.min.js');

    expect(bundlePath).toBe(join(rootDir, 'node_modules', 'markdown-it', 'dist', 'markdown-it.min.js'));
    expect(existsSync(bundlePath)).toBe(true);
    expect(contentTypeForPath(bundlePath)).toBe('text/javascript; charset=utf-8');
  });

  test('serves markdown files through a read-only viewer for browser requests', () => {
    const viewerPath = resolveMarkdownViewerPath();
    const viewer = readFileSync(viewerPath, 'utf8');
    const playground = readFileSync(join(rootDir, 'playground', 'markdown.html'), 'utf8');

    expect(viewerPath).toBe(join(rootDir, 'site', 'markdown-viewer.html'));
    expect(existsSync(viewerPath)).toBe(true);
    expect(contentTypeForPath(viewerPath)).toBe('text/html; charset=utf-8');
    expect(shouldServeMarkdownViewer('/spec/xcon-tagless-syntax.md', new URLSearchParams(), 'text/html')).toBe(true);
    expect(shouldServeMarkdownViewer('/spec/xcon-tagless-syntax.md', new URLSearchParams('raw=1'), 'text/html')).toBe(
      false,
    );
    expect(viewer).toContain('id="markdownDocument"');
    expect(viewer).toContain("rawUrl.searchParams.set('raw', '1')");
    expect(viewer).toContain('markdown.render(source)');
    expect(viewer).toContain('markdown.use(xconMarkdownIt');
    expect(viewer).toContain('src="/vendor/markdown-it/markdown-it.min.js"');
    expect(viewer).not.toContain('/node_modules/markdown-it/');
    expect(viewer).toContain('.markdown-xcon-block');
    expect(viewer).toContain('overflow: visible;');
    expect(playground).toContain('src="../vendor/markdown-it/markdown-it.min.js"');
    expect(playground).not.toContain('../node_modules/markdown-it/');
    expect(playground).toContain('.markdown-xcon-block');
    expect(playground).toContain('overflow: visible;');
  });

  test('opens example directory links through their README markdown', () => {
    const examplesIndex = readFileSync(join(rootDir, 'examples', 'README.md'), 'utf8');
    const helloReadme = readFileSync(join(rootDir, 'examples', 'hello', 'README.md'), 'utf8');
    const sketchReadme = readFileSync(join(rootDir, 'examples', 'sketch', 'README.md'), 'utf8');
    const showcaseReadme = readFileSync(join(rootDir, 'examples', 'showcase', 'README.md'), 'utf8');
    const helloPath = join(rootDir, 'examples', 'hello', 'README.md');

    expect(resolvePublicPath('/examples/hello')).toBe(helloPath);
    expect(resolvePublicPath('/examples/hello/')).toBe(helloPath);
    expect(contentTypeForPath(join(rootDir, 'examples', 'hello', 'hello.xcon'))).toBe('text/plain; charset=utf-8');
    expect(shouldServeMarkdownViewer('/examples/hello', new URLSearchParams(), 'text/html')).toBe(true);
    expect(shouldServeMarkdownViewer('/examples/hello', new URLSearchParams('raw=1'), 'text/html')).toBe(false);
    expect(examplesIndex).toContain('[hello](./hello/README.md)');
    expect(examplesIndex).not.toContain('[hello](./hello/)');
    expect(helloReadme).toContain('[hello.xcon.json](/play?src=%2Fexamples%2Fhello%2Fhello.xcon.json)');
    expect(helloReadme).toContain('[hello.xcon.xml](/play?src=%2Fexamples%2Fhello%2Fhello.xcon.xml)');
    expect(helloReadme).toContain('[hello.xcon](/play?src=%2Fexamples%2Fhello%2Fhello.xcon)');
    expect(sketchReadme).toContain('[hello.xcon.sketch](/play?src=%2Fexamples%2Fsketch%2Fhello.xcon.sketch)');
    expect(examplesIndex).toContain('[showcase](./showcase/README.md)');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_button.xcon.json');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_xconbnb_main.xcon.sketch');
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_button.xcon.json'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', `p_${'custom'}01.xcon.json`))).toBe(false);
    expect(existsSync(join(rootDir, 'examples', 'showcase', `p_${'xa' + 'mong'}plugin.xcon.json`))).toBe(false);
  });

  test('playground can load example source URLs and infer syntax from extension', () => {
    const playground = readFileSync(join(rootDir, 'playground', 'index.html'), 'utf8');

    expect(playground).toContain('loadSourceFromUrl()');
    expect(playground).toContain("location.href = '/play/sketch'");
    expect(playground).toContain("location.href = '/play/markdown'");
    expect(playground).toContain('syntaxFromSourcePath');
    expect(playground).toContain("endsWith('.xcon.json')");
    expect(playground).toContain("endsWith('.xcon.xml')");
    expect(playground).toContain("endsWith('.xcon.sketch')");
    expect(playground).toContain("endsWith('.xcon')");
  });

  test('routes example gallery cards through the playground source loader', () => {
    const examplesPage = readFileSync(join(rootDir, 'site', 'examples.html'), 'utf8');

    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fhello%2Fhello.xcon.json"');
    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fbutton%2Fbutton.xcon.json"');
    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fform%2Fform.xcon.json"');
    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fsketch%2Fhello.xcon.sketch"');
    expect(examplesPage).not.toMatch(/href="\/examples\/[^"]+\.xcon(?:\.(?:json|xml|sketch))?"/);
  });

  test('keeps public site and package-facing docs free of excluded branding', () => {
    for (const relativePath of publicTextFiles) {
      const text = readFileSync(join(rootDir, relativePath), 'utf8');
      expect(text, relativePath).not.toMatch(privateBrandPattern);
      expect(text, relativePath).not.toMatch(privateSourcePattern);
      expect(text, relativePath).not.toMatch(privateRuntimePattern);
      expect(text, relativePath).not.toMatch(privatePlatformPattern);
    }
  });

  test('links public docs to English component reference files', () => {
    const docsPage = readFileSync(join(rootDir, 'site', 'docs.html'), 'utf8');
    const apiPage = readFileSync(join(rootDir, 'site', 'api.html'), 'utf8');
    const docsIndex = readFileSync(join(rootDir, 'docs', 'README.md'), 'utf8');
    const specIndex = readFileSync(join(rootDir, 'spec', 'README.md'), 'utf8');

    expect(docsPage).toContain('/docs/xcon-component-specs.en.md');
    expect(apiPage).toContain('/docs/xcon-component-specs.en.md');
    expect(docsIndex).toContain('./xcon-component-specs.en.md');
    expect(specIndex).toContain('../docs/xcon-component-specs.en.md');
    expect(docsPage + apiPage + docsIndex + specIndex).not.toContain('xcon-component-specs.md');
    expect(specIndex).not.toContain('xcon-sketch-syntax.ko.md');
  });

  test('documents deployment inventory, npm publishing, and nginx hosting', () => {
    const deploymentDoc = readFileSync(join(rootDir, 'docs', 'deployment.md'), 'utf8');
    const inventory = readFileSync(join(rootDir, 'docs', 'deployment-files.md'), 'utf8');
    const buildScript = readFileSync(join(rootDir, 'scripts', 'build-public-site.mjs'), 'utf8');
    const nginx = readFileSync(join(rootDir, 'deploy', 'nginx', 'xconviewer.dev.conf'), 'utf8');

    expect(deploymentDoc).toContain('npm publish --workspace @xcon-viewer/core --access public');
    expect(deploymentDoc).toContain('npm publish --workspace @xcon-viewer/github-action --access public');
    expect(deploymentDoc).toContain('nginx');
    expect(inventory).toContain('site/index.html');
    expect(inventory).toContain('playground/index.html');
    expect(inventory).toContain('playground/sketch.html');
    expect(inventory).toContain('vendor/markdown-it/markdown-it.min.js');
    expect(inventory).not.toContain('node_modules/markdown-it/dist/markdown-it.min.js');
    expect(inventory).not.toContain('drafts/');
    expect(inventory).not.toContain('.temp/');
    expect(buildScript).toContain("['node_modules/markdown-it/dist/markdown-it.min.js', 'vendor/markdown-it/markdown-it.min.js']");
    expect(nginx).toContain('server_name xconviewer.dev www.xconviewer.dev;');
    expect(nginx).toContain('try_files $uri $uri.html $uri/index.html =404;');
  });
});

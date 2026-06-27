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
  '/template-lab',
  '/meta-lab',
  '/chatgpt-simulation',
  '/chatgpt-markdown-sketch-simulation',
  '/html-css-simulation',
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
  'site/template-lab.html',
  'site/meta-lab.html',
  'site/xcon-embed.css',
  'site/xcon-embed.js',
  'tools/xcon-workflow-runner/src/demo-runtime.mjs',
  'site/chatgpt-simulation.html',
  'site/chatgpt-markdown-sketch-simulation.html',
  'site/html-css-simulation.html',
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
    expect(llms).toContain('https://xconviewer.dev/xcon-chain/');
    expect(llms).toContain('https://xconviewer.dev/xcon-workflow/');
    expect(llms).toContain('https://xconviewer.dev/template-lab');
    expect(llms).toContain('https://xconviewer.dev/meta-lab');
    expect(llmsFull).toContain('Prefer XCON/SKETCH when generating Markdown-facing examples and LLM drafts.');
    expect(llmsFull).toContain('Template Studio combines Markdown document shells');
    expect(llmsFull).toContain('Meta Lab experiments with path-addressed metadata contracts');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/docs</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/xcon-chain/</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/xcon-workflow/</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/template-lab</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/meta-lab</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/chatgpt-simulation</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/chatgpt-markdown-sketch-simulation</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/html-css-simulation</loc>');
    expect(sitemap).toContain('<loc>https://xconviewer.dev/xcon.schema.json</loc>');
  });

  test('documents advanced visualization Sprint 3 public syntax', () => {
    const componentSpecs = readFileSync(join(rootDir, 'docs', 'xcon-component-specs.en.md'), 'utf8');
    const llmsFull = readFileSync(join(rootDir, 'site', 'llms-full.txt'), 'utf8');

    for (const text of [componentSpecs, llmsFull]) {
      expect(text).toContain('dataViz');
      expect(text).toContain('vizType "treemap"');
      expect(text).toContain('vizType "sankey"');
      expect(text).toContain('vizType "sunburst"');
      expect(text).toContain('vizType "chord"');
      expect(text).toContain('vizType "forceGraph"');
      expect(text).toContain('vizType "plot"');
    }
  });

  test('embeds a live XCON/SKETCH homepage demo using public viewer packages', () => {
    const homePage = readFileSync(join(rootDir, 'site', 'index.html'), 'utf8');
    const styles = readFileSync(join(rootDir, 'site', 'styles.css'), 'utf8');

    expect(homePage).toContain('id="live-sketch-demo"');
    expect(homePage).toContain('href="/play">Try Live Editor</a>');
    expect(homePage).toContain('href="/play/sketch">Open SKETCH Editor</a>');
    expect(homePage).toContain('href="/play/markdown">Open Markdown Playground</a>');
    expect(homePage).toContain('href="/workflow-runner/demo-lab"');
    expect(homePage).toContain('<code id="liveSketchCode"></code>');
    expect(homePage).toContain('id="liveSketchCursor"');
    expect(homePage).toContain('<div id="liveSketchPreview" class="live-sketch-preview" aria-live="polite"></div>');
    expect(homePage).not.toContain('live-sketch-fallback');
    expect(homePage).toContain('"@xcon-viewer/core": "/packages/core/dist/index.js"');
    expect(homePage).toContain('"@xcon-viewer/viewer": "/packages/viewer/dist/index.js"');
    expect(homePage).toContain("from '@xcon-viewer/core'");
    expect(homePage).toContain("from '@xcon-viewer/viewer'");
    expect(homePage).toContain('parseBySyntax');
    expect(homePage).toContain("const fullSampleUrl = '/examples/showcase/p_xconbnb_main.xcon.sketch';");
    expect(homePage).toContain('const progressiveSketchBlocks = [');
    expect(homePage).toContain("label: 'hero banner'");
    expect(homePage).toContain("label: 'hero slides'");
    expect(homePage).toContain("label: 'Where to next'");
    expect(homePage).toContain("label: 'Where list'");
    expect(homePage).toContain("label: 'recent stays data'");
    expect(homePage).toContain("label: 'Where list data'");
    expect(homePage).toContain("label: 'bottom toolbar'");
    expect(homePage).toContain('instant: true');
    expect(homePage).toContain('renderProgressiveSketchDemo();');
    expect(homePage).toContain('renderCompleteBlocks(blockIndex + 1)');
    expect(homePage).toContain("parseBySyntax(source, 'sketch')");
    expect(homePage).toContain("status.textContent = 'typing SKETCH...';");
    expect(homePage).toContain('const typeDelayMs = 16;');
    expect(homePage).toContain('const blockPauseMs = 520;');
    expect(homePage).toContain('renderShowcase(documentModel)');
    expect(homePage).toContain('allowExternalResources: true');
    expect(homePage).toContain('render(documentModel, preview');
    expect(homePage).toContain('if (block.instant) {');
    expect(homePage).toContain('typedSource += block.source;');
    expect(homePage).toContain('typedSource += block.source.charAt(charIndex);');
    expect(homePage).toContain('charIndex += 1;');
    expect(homePage).toContain('const codeScroller = code.closest');
    expect(homePage).toContain('ensureLiveSketchCursorVisible();');
    expect(homePage).not.toContain('scrollIntoView');
    expect(homePage).toContain('const cursorTop = cursor.offsetTop;');
    expect(homePage).toContain('codeScroller.scrollTop = cursorBottom - codeScroller.clientHeight + 12;');
    expect(homePage).not.toContain('index < 42 ? 28 : 16');
    expect(homePage).not.toContain('if (reduceMotion) {');
    expect(styles).toMatch(/\.live-sketch-preview\s*\{[^}]*position:\s*relative;/s);
    expect(styles).toContain('.live-sketch-code::-webkit-scrollbar');
    expect(styles).toContain('scrollbar-color:');
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

  test('serves the shared public demo runtime module', () => {
    const runtimePath = resolvePublicPath('/xcon-demo-runtime.mjs');
    const runtime = readFileSync(runtimePath, 'utf8');

    expect(runtimePath).toBe(join(rootDir, 'tools', 'xcon-workflow-runner', 'src', 'demo-runtime.mjs'));
    expect(runtime).toContain('export function extractDemoDocument');
    expect(runtime).toContain('export function makeStreamFrames');
  });

  test('serves the shared public demo renderer module', () => {
    const rendererPath = resolvePublicPath('/xcon-demo-renderer.mjs');
    const renderer = readFileSync(rendererPath, 'utf8');

    expect(rendererPath).toBe(join(rootDir, 'site', 'xcon-demo-renderer.mjs'));
    expect(renderer).toContain('export function createInlineSketchRenderer');
    expect(renderer).toContain('renderMarkdownWithInlineSketch');
    expect(renderer).toContain('mountInlineSketchPreviews');
    expect(renderer).toContain('mountStreamingSketchPreview');
  });

  test('serves the advanced visualization test page with a bundled browser runtime', () => {
    const pagePath = join(rootDir, 'site', 'advanced-visualization-test.html');
    const runtimePath = join(rootDir, 'site', 'advanced-visualization-test-runtime.js');
    const buildScript = readFileSync(join(rootDir, 'scripts', 'build-public-site.mjs'), 'utf8');

    expect(resolvePublicPath('/advanced-visualization-test.html')).toBe(pagePath);
    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(runtimePath)).toBe(true);
    expect(contentTypeForPath(runtimePath)).toBe('text/javascript; charset=utf-8');

    const page = readFileSync(pagePath, 'utf8');
    const runtime = readFileSync(runtimePath, 'utf8');
    const samplesBlock = page.match(/const samples = \[([\s\S]*?)\];/)?.[1] ?? '';
    const sampleIds = Array.from(samplesBlock.matchAll(/id:\s*'([^']+)'/g), (match) => match[1]);

    expect(page).not.toContain('href="/styles.css"');
    expect(page).toContain("from '/site/advanced-visualization-test-runtime.js'");
    expect(page).not.toContain('advanced-visualization-test-runtime.mjs');
    expect(page).not.toContain('@xcon-viewer/viewer');
    expect(page).toContain('const samples = [');
    expect(sampleIds).toEqual([
      'network-runtime',
      'dataviz-treemap',
      'dataviz-sankey',
      'dataviz-sunburst',
      'dataviz-chord',
      'dataviz-forcegraph',
      'dataviz-plot',
      'map-layers',
    ]);
    expect(page).toContain('id="source"');
    expect(page).toContain('id="preview"');
    expect(page).toContain('id="sampleSelect"');
    expect(page).toMatch(/#status\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/s);
    expect(runtime).not.toMatch(/^import\s/m);
    expect(runtime).not.toContain("from './network/runtime'");
    expect(runtime).not.toContain("from './dataviz/runtime'");
    expect(runtime).not.toContain("from './map/runtime'");
    expect(buildScript).toContain("['site/advanced-visualization-test.html', 'advanced-visualization-test.html']");
    expect(buildScript).toContain("['site/advanced-visualization-test.html', 'site/advanced-visualization-test.html']");
    expect(buildScript).toContain("['site/advanced-visualization-test-runtime.js', 'site/advanced-visualization-test-runtime.js']");
    expect(buildScript).toContain("['site/network-diagram-test.html', 'network-diagram-test.html']");
    expect(buildScript).toContain("['site/network-diagram-test.html', 'site/network-diagram-test.html']");
  });

  test('serves the network diagram test page without external CSS or mjs runtime references', () => {
    const pagePath = join(rootDir, 'site', 'network-diagram-test.html');

    expect(resolvePublicPath('/network-diagram-test.html')).toBe(pagePath);
    expect(existsSync(pagePath)).toBe(true);

    const page = readFileSync(pagePath, 'utf8');

    expect(page).not.toContain('href="/styles.css"');
    expect(page).not.toContain('.mjs');
    expect(page).toContain('/site/advanced-visualization-test.html');
  });

  test('serves the template document studio with Monaco, examples, and separated output tabs', () => {
    const labPath = resolvePublicPath('/template-lab');
    const lab = readFileSync(labPath, 'utf8');
    const homePage = readFileSync(join(rootDir, 'site', 'index.html'), 'utf8');
    const docsPage = readFileSync(join(rootDir, 'site', 'docs.html'), 'utf8');

    expect(labPath).toBe(join(rootDir, 'site', 'template-lab.html'));
    expect(existsSync(labPath)).toBe(true);
    expect(homePage).toContain('href="/template-lab"');
    expect(docsPage).toContain('href="/template-lab"');
    expect(lab).toContain('Template Studio - XCON Viewer');
    expect(lab).toContain('Visible syntax: SKETCH + SUGAR');
    expect(lab).toContain('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js');
    expect(lab).toContain("const markdownItSources = [");
    expect(lab).toContain("'/vendor/markdown-it/markdown-it.min.js'");
    expect(lab).toContain("'vendor/markdown-it/markdown-it.min.js'");
    expect(lab).toContain("'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js'");
    expect(lab).toContain('"@xcon-chain/core": "/xcon-chain/packages/core/src/index.js"');
    expect(lab).toContain('"@xcon-workflow/core": "/xcon-workflow/packages/core/src/index.js"');
    expect(lab).toContain('class="source-tab-strip" role="tablist" aria-label="Template source inputs"');
    expect(lab).toMatch(/\.lab-column\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);[^}]*min-height:\s*0;/s);
    expect(lab).toMatch(/\.lab-editors\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
    expect(lab).toContain('id="markdownTemplateTab"');
    expect(lab).toContain('id="fixtureJsonTab"');
    expect(lab.indexOf('id="markdownTemplateTab"')).toBeLessThan(lab.indexOf('id="fixtureJsonTab"'));
    expect(lab).toContain('<button id="markdownTemplateTab" class="source-tab-button is-active" type="button" role="tab" aria-selected="true" data-source-tab="templateEditorPanel">Markdown template</button>');
    expect(lab).toContain('<button id="fixtureJsonTab" class="source-tab-button" type="button" role="tab" aria-selected="false" data-source-tab="dataEditorPanel">Fixture JSON</button>');
    expect(lab).toContain('data-source-tab="templateEditorPanel"');
    expect(lab).toContain('data-source-tab="dataEditorPanel"');
    expect(lab).toContain('id="templateEditorPanel" class="lab-editor-panel source-editor-panel is-active" role="tabpanel" aria-labelledby="markdownTemplateTab"');
    expect(lab).toContain('id="dataEditorPanel" class="lab-editor-panel source-editor-panel" role="tabpanel" aria-labelledby="fixtureJsonTab"');
    expect(lab).toContain('id="templateEditorHost"');
    expect(lab).toContain('id="dataEditorHost"');
    expect(lab).toContain('id="previewTab"');
    expect(lab).toContain('id="inspectTab"');
    expect(lab).toContain('id="sourceTab"');
    expect(lab).toContain('id="exportFormatSelect"');
    expect(lab).toContain('<option value="pdf">PDF</option>');
    expect(lab).toContain('<option value="hwpx">HWPX</option>');
    expect(lab).toContain('<option value="doc">DOC</option>');
    expect(lab).toContain('<option value="hwp">HWP</option>');
    expect(lab).toContain('id="exportButton"');
    expect(lab).toContain('id="importDocumentButton"');
    expect(lab).toContain('id="importDocumentInput"');
    expect(lab).toContain('accept=".hwp3,.hwp,.hwpx,.hwpml,.docx,.pdf,.xlsx,.xls,.md,.markdown,.txt"');
    expect(lab).toContain('async function importDocumentFile(event)');
    expect(lab).toContain("fetch('/api/import/document'");
    expect(lab).toContain('arrayBufferToBase64');
    expect(lab).toContain('documentWidth: getDocumentImportWidth()');
    expect(lab).toContain('function getDocumentImportWidth()');
    expect(lab).toContain("showSourceEditorTab('templateEditorPanel')");
    expect(lab).toContain('async function exportRenderedDocument()');
    expect(lab).toContain('function shouldUseServerExport(format)');
    expect(lab).toContain('async function exportViaServer(format)');
    expect(lab).toContain("fetch('/api/export'");
    expect(lab).toContain("format === 'pdf' || format === 'hwpx' || format === 'hwp'");
    expect(lab).toContain("resolveServerExportExtension(format, response)");
    expect(lab).toContain("function resolveServerExportExtension(format, response)");
    expect(lab).toContain('html: buildExportHtml(format)');
    expect(lab).toContain('lastRenderState?.viewerRenderer?.viewerCss ||');
    expect(lab).toContain('lastRenderState.resolvedSource || getTemplateText()');
    expect(lab).toContain('function printRenderedDocument()');
    expect(lab).toContain('application/msword;charset=utf-8');
    expect(lab).not.toContain('application/x-hwp;charset=utf-8');
    expect(lab).toContain('renderPreviewOnly');
    expect(lab).toContain('renderInspector');
    expect(lab).toContain('renderResolvedSource');
    expect(lab).toContain('setupSourceTabs();');
    expect(lab).toContain("document.querySelectorAll('.source-tab-button')");
    expect(lab).toContain("document.querySelectorAll('.source-editor-panel')");
    expect(lab).toContain("panel.classList.toggle('is-active', panel.id === button.dataset.sourceTab)");
    expect(lab).toContain('templateEditor?.layout();');
    expect(lab).toContain('dataEditor?.layout();');
    expect(lab).toContain('const TEMPLATE_PRESETS = {');
    expect(lab).toContain("executiveBrief");
    expect(lab).toContain("invoiceQuote");
    expect(lab).toContain("weeklyBulletin");
    expect(lab).toContain("cleaningChecklist");
    expect(lab).toContain("Shared space cleaning checklist");
    expect(lab).toContain("COMMONS HQ");
    expect(lab).toContain("cleaningGrid");
    expect(lab).toContain("inlineFixtureDemo");
    expect(lab).toContain("Inline fixture document");
    expect(lab).toContain("```xcon-chain-fixture");
    expect(lab).toContain("function resolveTemplateFixtureData");
    expect(lab).toContain("function mergeFixtureData");
    expect(lab).toContain("if (isFixtureFenceLanguage(lang))");
    expect(lab).toContain('```xcon-chain as revenueTotal');
    expect(lab).toContain("if (arg === 'as' && args[index + 1]) return args[index + 1].trim();");
    expect(lab).toContain('```xcon-sketch');
    expect(lab).toContain('```xcon-workflow');
    expect(lab).toContain('type: chart');
    expect(lab).toContain('type: spanGrid');
    expect(lab).toContain('examples/showcase');
    expect(lab).toContain('labSugarSilent');
    expect(lab).toContain('id="templateSplitter"');
    expect(lab).toContain('<body class="template-studio-page">');
    expect(lab).toContain('width: min(1840px, calc(100% - 16px));');
    expect(lab).toContain('grid-template-columns: minmax(380px, var(--template-source-width)) 10px minmax(620px, 1fr);');
    expect(lab).toContain('fitRenderedBlocks');
    expect(lab).toContain("localStorage.setItem('xconTemplateStudioSourceWidth'");
    expect(lab).toContain(String.raw`].join('\n');`);
    expect(lab).not.toContain(String.raw`].join('\\n');`);
    expect(lab).toContain('const fencePattern = /```([^\\n]*)\\n([\\s\\S]*?)```/g;');
    expect(lab).toContain(String.raw`.split(/\s+/)`);
    expect(lab).toContain('const MarkdownIt = resolveMarkdownItFactory();');
    expect(lab).toContain('loadMarkdownItBundle()');
    expect(lab).toContain('function resolveMarkdownItFactory()');
    expect(lab).toContain('function loadScript(source)');
    expect(lab).toContain('function loadScriptAsBrowserGlobal(source)');
    expect(lab).toContain('const module = { exports: {} };');
    expect(lab).toContain('markdownRenderer = MarkdownIt({');
    expect(lab).toContain('markdownRenderer.renderer.rules.table_open');
    expect(lab).toContain('function enhanceMarkdownHtml(html)');
    expect(lab).toContain('class="template-table-wrap"');
    expect(lab).toContain('class="task-list-item"');
    expect(lab).toContain('renderMarkdownText(markdownSource)');
    expect(lab).not.toContain('function inlineMarkdown');
    expect(lab).toContain(String.raw`const variableReferencePattern = /\$([A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)*)/g;`);
    expect(lab).toContain('function isInsideQuotedSketchString(source, offset)');
    expect(lab).toContain('function escapeSketchStringFragment(value)');
    expect(lab).toContain('isInsideQuotedSketchString(source, offset)');
    expect(lab).toContain('label "Confirmed by  $checkerName"');
    expect(lab).not.toContain(String.raw`.replace(/\$([A-Za-z_][\w.-]*)/g`);
    expect(lab).not.toContain('const fencePattern = /```([^\\\\n]*)\\\\n([\\\\s\\\\S]*?)```/g;');
    expect(lab).toContain('applyVariables(content, env.vars, true)');
    expect(lab).toContain('evaluateSugar(expression, env.data)');
    expect(lab).not.toContain('Experimental Lab');
    expect(lab).not.toContain('Template Lab is experimental');
    expect(lab).not.toContain('XCON/XML');
    expect(lab).not.toContain('XCON/TAGLESS');
  });

  test('serves the metadata-driven template experiment page', () => {
    const metaPath = resolvePublicPath('/meta-lab');
    const metaLab = readFileSync(metaPath, 'utf8');
    const homePage = readFileSync(join(rootDir, 'site', 'index.html'), 'utf8');
    const docsPage = readFileSync(join(rootDir, 'site', 'docs.html'), 'utf8');
    const buildScript = readFileSync(join(rootDir, 'scripts', 'build-public-site.mjs'), 'utf8');

    expect(metaPath).toBe(join(rootDir, 'site', 'meta-lab.html'));
    expect(existsSync(metaPath)).toBe(true);
    expect(homePage).toContain('href="/meta-lab"');
    expect(docsPage).toContain('href="/meta-lab"');
    expect(buildScript).toContain("['site/meta-lab.html', 'meta-lab.html']");
    expect(metaLab).toContain('Meta Lab - XCON Viewer');
    expect(metaLab).toContain('Metabase.Apps.LaunchOps.Briefs.MonthlyGrowth');
    expect(metaLab).toContain('Metabase.Apps.LaunchOps.Briefs.RegionalRollout');
    expect(metaLab).toContain('"@xcon-chain/core": "/xcon-chain/packages/core/src/index.js"');
    expect(metaLab).toContain('"@xcon-workflow/core": "/xcon-workflow/packages/core/src/index.js"');
    expect(metaLab).toContain('const DEFAULT_CATALOG = {');
    expect(metaLab).toContain('function renderTemplateDocument');
    expect(metaLab).toContain('collectSugarVariables(source, env);');
    expect(metaLab).toContain('function collectSugarVariables');
    expect(metaLab).toContain('function evaluateSugarAlias');
    expect(metaLab).toContain('function renderSketchFence');
    expect(metaLab).toContain('function renderWorkflowFence');
    expect(metaLab).toContain('function evaluateSugarFallback');
    expect(metaLab).toContain('function renderCodeRows');
    expect(metaLab).toContain('id="openMetaPopupButton"');
    expect(metaLab).toContain('id="metaPopup" class="meta-popup-backdrop"');
    expect(metaLab).toContain('Meta Management');
    expect(metaLab).toContain('Path Lab');
    expect(metaLab).toContain('function openMetaPopup');
    expect(metaLab).toContain('function renderMetaPopup');
    expect(metaLab).toContain('function renderMetaPopupTree');
    expect(metaLab).toContain('function runMetaPopupPathAction');
    expect(metaLab).toContain('function copyActiveMetaJson');
    expect(metaLab).toContain('.meta-popup-tree-row.selected');
    expect(metaLab).toContain('.meta-popup-table');
    expect(metaLab).toContain('href="/xcon-embed.css"');
    expect(metaLab).toContain('src="/xcon-embed.js"');
    expect(metaLab).toContain('window.XconEmbed.xconHostFrameStyle');
    expect(metaLab).toContain('chart at');
    expect(metaLab).toContain('spanGrid');
    expect(metaLab).toContain('networkDiagram');
    expect(metaLab).toContain('```xcon-chain as revenueTotal');
    expect(metaLab).toContain('```xcon-sketch');
    expect(metaLab).toContain('```xcon-workflow');
    expect(metaLab).toContain('workflow "$workflowTitle"');
    expect(metaLab).toContain('chartData $revenueChart');
    expect(metaLab).toContain('data $teamGrid');
  });

  test('serves the ChatGPT-style artifact simulation page', () => {
    const pagePath = resolvePublicPath('/chatgpt-simulation');
    const page = readFileSync(pagePath, 'utf8');
    const homePage = readFileSync(join(rootDir, 'site', 'index.html'), 'utf8');
    const buildScript = readFileSync(join(rootDir, 'scripts', 'build-public-site.mjs'), 'utf8');

    expect(pagePath).toBe(join(rootDir, 'site', 'chatgpt-simulation.html'));
    expect(existsSync(pagePath)).toBe(true);
    expect(homePage).toContain('href="/chatgpt-simulation"');
    expect(buildScript).toContain("['site/chatgpt-simulation.html', 'chatgpt-simulation.html']");
    expect(page).toContain('ChatGPT-style artifact simulation');
    expect(page).toContain('Markdown answer + XCON fence');
    expect(page).toContain('id="chatMessages"');
    expect(page).toContain('id="composerText"');
    expect(page).toContain('id="artifactPreview"');
    expect(page).toContain('```xcon-sketch');
    expect(page).toContain('function renderArtifactFromMarkdown');
    expect(page).toContain('async function runScenario');
    expect(page).toContain('async function streamAssistant');
    expect(page).toContain(String.raw`].join('\n')`);
    expect(page).not.toContain(String.raw`].join('\\n');`);
    expect(page).toContain('const fenceRegex = /```([^\\n]*)\\n([\\s\\S]*?)```/g;');
    expect(page).toContain('markdown.match(/```(?:xcon-sketch|xcon)\\s*\\n([\\s\\S]*?)```/i)');
    expect(page).toContain(String.raw`.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')`);
    expect(page).not.toContain(String.raw`.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')`);
    expect(page).toContain("from '@xcon-viewer/core'");
    expect(page).toContain("from '@xcon-viewer/viewer'");
    expect(page).toContain('allowExternalResources: true');
  });

  test('serves the HTML and CSS artifact simulation page', () => {
    const pagePath = resolvePublicPath('/html-css-simulation');
    const page = readFileSync(pagePath, 'utf8');
    const homePage = readFileSync(join(rootDir, 'site', 'index.html'), 'utf8');
    const buildScript = readFileSync(join(rootDir, 'scripts', 'build-public-site.mjs'), 'utf8');

    expect(pagePath).toBe(join(rootDir, 'site', 'html-css-simulation.html'));
    expect(existsSync(pagePath)).toBe(true);
    expect(homePage).toContain('href="/html-css-simulation"');
    expect(buildScript).toContain("['site/html-css-simulation.html', 'html-css-simulation.html']");
    expect(page).toContain('HTML/CSS artifact simulation');
    expect(page).toContain('ChatGPT-style prompt composer + rendered HTML/CSS');
    expect(page).toContain('id="chatMessages"');
    expect(page).toContain('id="chatComposer"');
    expect(page).toContain('id="composerInput"');
    expect(page).toContain('id="sendButton"');
    expect(page).toContain('id="sourceStream"');
    expect(page).toContain('id="sourceScroller"');
    expect(page).toContain('id="artifactFrame"');
    expect(page).toContain('sandbox=""');
    expect(page).toContain('const conversationTurns = [');
    expect(page).toContain("prompt: \"What's the weather like in Seoul today?\"");
    expect(page).toContain("prompt: 'Where should I take a walk before lunch?'");
    expect(page).toContain("prompt: 'Can you summarize my afternoon in one card?'");
    expect(page).toContain('async function streamComposerInput');
    expect(page).toContain('function appendUserMessage');
    expect(page).toContain('function appendAssistantMessage');
    expect(page).toContain('async function sendPromptFromComposer');
    expect(page).toContain('async function streamAssistantResponse');
    expect(page).toContain('function sanitizeHtmlCssSource');
    expect(page).toContain('function updateArtifactPreview');
    expect(page).toContain('artifactFrame.srcdoc = buildSandboxDocument(source);');
    expect(page).toContain('sourceStream.textContent = slice;');
    expect(page).toContain('for (const turn of conversationTurns)');
    expect(page).toContain('await streamComposerInput(token, turn.prompt);');
    expect(page).toContain('await streamAssistantResponse(token, turn.response);');
    expect(page).toContain('Seoul Weather Brief');
    expect(page).toContain('Seoul Walk Window');
    expect(page).toContain('Afternoon Plan Card');
    expect(page).not.toContain('```html');
    expect(page).not.toContain('```xcon-sketch');
    expect(page).not.toContain('Answer in Markdown first');
    expect(page).not.toMatch(/[가-힣]/);
    expect(page).toContain(String.raw`].join('\n')`);
    expect(page).not.toContain(String.raw`].join('\\n')`);
  });

  test('serves the ChatGPT Markdown plus SKETCH rendered-chat simulation page', () => {
    const pagePath = resolvePublicPath('/chatgpt-markdown-sketch-simulation');
    const page = readFileSync(pagePath, 'utf8');
    const homePage = readFileSync(join(rootDir, 'site', 'index.html'), 'utf8');
    const buildScript = readFileSync(join(rootDir, 'scripts', 'build-public-site.mjs'), 'utf8');

    expect(pagePath).toBe(join(rootDir, 'site', 'chatgpt-markdown-sketch-simulation.html'));
    expect(existsSync(pagePath)).toBe(true);
    expect(homePage).toContain('href="/chatgpt-markdown-sketch-simulation"');
    expect(buildScript).toContain("['site/chatgpt-markdown-sketch-simulation.html', 'chatgpt-markdown-sketch-simulation.html']");
    expect(page).toContain('ChatGPT Markdown + SKETCH simulation');
    expect(page).toContain('ChatGPT-style prompt composer + rendered chat');
    expect(page).toContain('id="chatMessages"');
    expect(page).toContain('id="chatComposer"');
    expect(page).toContain('id="composerInput"');
    expect(page).toContain('id="sendButton"');
    expect(page).toContain('id="renderedChat"');
    expect(page).toContain('id="sourceStream"');
    expect(page).toContain('id="sourceScroller"');
    expect(page).toContain('id="userPromptBubble"');
    expect(page).toContain('id="assistantAvatar"');
    expect(page).toContain('const userTypingDelayMs = 42;');
    expect(page).toContain('const thinkingDelayMs = 1250;');
    expect(page).toContain('const assistantTextDelayMs = 48;');
    expect(page).toContain('const sketchChunkDelayMs = 34;');
    expect(page).toContain('async function streamComposerInput');
    expect(page).toContain('function appendUserMessage');
    expect(page).toContain('function appendAssistantMessage');
    expect(page).toContain('async function sendPromptFromComposer');
    expect(page).toContain('async function streamAssistantResponse');
    expect(page).toContain('function renderMarkdownWithInlineSketch');
    expect(page).toContain('function mountInlineSketchPreviews');
    expect(page).toContain('function extractStreamingSketchSource');
    expect(page).toContain('function mountStreamingSketchPreview');
    expect(page).toContain('function renderBestEffortSketchPreview');
    expect(page).toContain('data-streaming-preview');
    expect(page).toContain('parseBySyntax(source, \'sketch\')');
    expect(page).toContain('render(documentModel, node');
    expect(page).toContain('viewerCss');
    expect(page).toContain('```xcon-sketch');
    expect(page).toContain('const conversationTurns = [');
    expect(page).toContain("prompt: \"What's the weather like in Seoul today?\"");
    expect(page).toContain("prompt: 'Where should I take a walk before lunch?'");
    expect(page).toContain("prompt: 'Can you summarize my afternoon in one card?'");
    expect(page).not.toMatch(/[가-힣]/);
    expect(page).toContain('for (const turn of conversationTurns)');
    expect(page).toContain('await streamComposerInput(token, turn.prompt);');
    expect(page).toContain('await streamAssistantResponse(token, turn.response);');
    expect(page).not.toContain('const userPrompt =');
    expect(page).not.toContain('const assistantMarkdown =');
    expect(page).not.toContain('show the weather, outfit, and schedule as a visual SKETCH card');
    expect(page).toContain('Seoul Weather Brief');
    expect(page).toContain('Seoul Walk Window');
    expect(page).toContain('Afternoon Plan Card');
    expect(page).toContain('composerInput.value = prompt.slice(0, index);');
    expect(page).toContain('appendUserMessage(composerInput.value);');
    expect(page).toContain('renderedChat = assistant.bubble;');
    expect(page).toContain('sourceStream.textContent = slice;');
    expect(page).toContain('renderedChat.innerHTML = renderMarkdownWithInlineSketch(slice, true);');
    expect(page).toContain('mountStreamingSketchPreview(renderedChat, slice);');
    expect(page).toContain('const tail = markdown.slice(cursor);');
    expect(page).toContain('const openFenceMatch = tail.match(/```(?:xcon-sketch|xcon)\\s*\\n[\\s\\S]*$/i);');
    expect(page).toContain('html += renderMarkdownBlock(tail.slice(0, openFenceMatch.index));');
    expect(page).toContain('html += renderMarkdownBlock(tail);');
    expect(page).not.toContain('html += renderMarkdownBlock(markdown.slice(cursor));');
    expect(page).toContain("sourceStatus.textContent = 'thinking';");
    expect(page).toContain(String.raw`].join('\n')`);
    expect(page).not.toContain(String.raw`].join('\\n')`);
  });

  test('keeps sketch screen examples separate from component snippets', () => {
    const sketchPlaygroundPath = resolvePublicPath('/play/sketch');
    const sketchPlayground = readFileSync(sketchPlaygroundPath, 'utf8');
    const getSnippet = (key) => {
      const match = sketchPlayground.match(new RegExp(`${key}:\\s*` + '`([\\s\\S]*?)`[,\\n]'));
      return match?.[1] ?? '';
    };

    expect(sketchPlayground).toContain('Screen examples');
    expect(sketchPlayground).toContain('Component snippets');
    expect(sketchPlayground).toContain('data-snippet="spanGridMergeScreen"');
    expect(sketchPlayground).toContain('data-snippet="spanGridMerge"');
    expect(sketchPlayground).toContain('data-snippet="spanGridScroll"');
    expect(sketchPlayground).toContain('data-snippet="spanGridSnapshot"');
    expect(sketchPlayground).toContain('../examples/showcase/e_spanGrid_scroll.xcon.sketch');
    expect(getSnippet('spanGridMerge')).not.toMatch(/^\s*screen\b/m);
    expect(getSnippet('spanGridMergeScreen')).toMatch(/^\s*screen\b/m);
    expect(getSnippet('spanGridScroll')).not.toMatch(/^\s*screen\b/m);
    expect(getSnippet('spanGridScroll')).toContain('fixedRows 1');
    expect(getSnippet('spanGridScroll')).toContain('fixedColumns 1');
    expect(getSnippet('spanGridSnapshot')).not.toMatch(/^\s*screen\b/m);
    expect(getSnippet('spanGridSnapshot')).toContain('snapshot {');
    expect(getSnippet('spanGridSnapshot')).toContain('"gridBorder"');
    expect(getSnippet('spanGridSnapshot')).toContain('"merges"');
    expect(getSnippet('spanGridSnapshot')).toContain('"backColor"');
    expect(sketchPlayground).toContain('function ensureTrailingNewline');
    expect(sketchPlayground).toContain('const text = ensureTrailingNewline(snippet)');
    expect(sketchPlayground).toContain("editor.executeEdits('snippet', [{ range: selection, text, forceMoveMarkers: true }])");
    expect(sketchPlayground).toContain("fallbackEditor.setRangeText(text, fallbackEditor.selectionStart, fallbackEditor.selectionEnd, 'end')");
  });

  test('sketch playground formats with trailing newline and supports editor wrapping', () => {
    const sketchPlaygroundPath = resolvePublicPath('/play/sketch');
    const sketchPlayground = readFileSync(sketchPlaygroundPath, 'utf8');

    expect(sketchPlayground).toContain('id="wrapBtn"');
    expect(sketchPlayground).toContain('aria-pressed="false"');
    expect(sketchPlayground).toContain("document.getElementById('wrapBtn').addEventListener('click', toggleWordWrap)");
    expect(sketchPlayground).toContain("setCode(ensureTrailingNewline(serializeBySyntax(tree, 'sketch', true)))");
    expect(sketchPlayground).toContain("editor.updateOptions({ wordWrap: wordWrapMode ? 'on' : 'off' })");
    expect(sketchPlayground).toContain("fallbackEditor.setAttribute('wrap', wordWrapMode ? 'soft' : 'off')");
  });

  test('uses the showcase XconBnB SKETCH as the default playground document', () => {
    const playground = readFileSync(join(rootDir, 'playground', 'index.html'), 'utf8');

    expect(playground).toContain("const defaultDocument = '../examples/showcase/p_xconbnb_main.xcon.sketch';");
    expect(playground).toContain('async function loadDefaultDocument()');
    expect(playground).toContain('if (await loadDefaultDocument()) return;');
    expect(playground).not.toContain('One screen. Four syntaxes.');
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
    expect(viewer).toContain('renderMarkdownWithMath(markdown, source)');
    expect(viewer).toContain('function prepareMarkdownMath(markdownSource)');
    expect(viewer).toContain('function renderTexLite(expression)');
    expect(viewer).toContain('markdown.use(xconMarkdownIt');
    expect(viewer).toContain('src="/vendor/markdown-it/markdown-it.min.js"');
    expect(viewer).not.toContain('/node_modules/markdown-it/');
    expect(viewer).toContain('.markdown-xcon-block');
    expect(viewer).toContain('.markdown-math-inline');
    expect(viewer).toContain('.markdown-math-block');
    expect(viewer).toContain('overflow: visible;');
    expect(playground).toContain('src="../vendor/markdown-it/markdown-it.min.js"');
    expect(playground).not.toContain('../node_modules/markdown-it/');
    expect(playground).toContain('.markdown-xcon-block');
    expect(playground).toContain('renderMarkdownWithMath(markdown, source.value)');
    expect(playground).toContain('Inline math: $E = mc^2$.');
    expect(playground).toContain('Block equations:');
    expect(playground).toContain('.markdown-math-inline');
    expect(playground).toContain('.markdown-math-block');
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
    expect(helloReadme).toContain('[hello.xcon.sketch](/play?src=%2Fexamples%2Fhello%2Fhello.xcon.sketch)');
    expect(helloReadme.indexOf('SKETCH:')).toBeLessThan(helloReadme.indexOf('JSON:'));
    expect(helloReadme.indexOf('JSON:')).toBeLessThan(helloReadme.indexOf('XML:'));
    expect(helloReadme.indexOf('XML:')).toBeLessThan(helloReadme.indexOf('TAGLESS:'));
    expect(helloReadme).toContain('[hello.xcon.json](/play?src=%2Fexamples%2Fhello%2Fhello.xcon.json)');
    expect(helloReadme).toContain('[hello.xcon.xml](/play?src=%2Fexamples%2Fhello%2Fhello.xcon.xml)');
    expect(helloReadme).toContain('[hello.xcon](/play?src=%2Fexamples%2Fhello%2Fhello.xcon)');
    expect(sketchReadme).toContain('[hello.xcon.sketch](/play?src=%2Fexamples%2Fsketch%2Fhello.xcon.sketch)');
    expect(sketchReadme).toContain('[hello.xcon.json](/play?src=%2Fexamples%2Fsketch%2Fhello.xcon.json)');
    expect(sketchReadme).toContain('[hello.xcon.xml](/play?src=%2Fexamples%2Fsketch%2Fhello.xcon.xml)');
    expect(sketchReadme).toContain('[hello.xcon](/play?src=%2Fexamples%2Fsketch%2Fhello.xcon)');
    expect(examplesIndex).toContain('[showcase](./showcase/README.md)');
    expect(showcaseReadme).toContain('| Fixture | SKETCH | JSON | XML | TAGLESS |');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_button.xcon.sketch');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_button.xcon.json');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_button.xcon.xml');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_button.xcon');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_xconbnb_main.xcon.sketch');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_network_diagram.xcon.sketch');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_network_diagram.xcon.json');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_network_diagram.xcon.xml');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_network_diagram.xcon');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_map.xcon.sketch');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_map.xcon.json');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_map.xcon.xml');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_map.xcon');
    expect(showcaseReadme).toContain('/play?src=%2Fexamples%2Fshowcase%2Fp_dataviz_advanced.xcon.sketch');
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_button.xcon.json'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_network_diagram.xcon.json'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_network_diagram.xcon.sketch'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_network_diagram.xcon.xml'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_network_diagram.xcon'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_map.xcon.json'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_map.xcon.sketch'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_map.xcon.xml'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_map.xcon'))).toBe(true);
    expect(existsSync(join(rootDir, 'examples', 'showcase', 'p_dataviz_advanced.xcon.sketch'))).toBe(true);
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

    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fhello%2Fhello.xcon.sketch"');
    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fbutton%2Fbutton.xcon.sketch"');
    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fform%2Fform.xcon.sketch"');
    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fsketch%2Fhello.xcon.sketch"');
    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fshowcase%2Fp_network_diagram.xcon.sketch"');
    expect(examplesPage).toContain('href="/play?src=%2Fexamples%2Fshowcase%2Fp_map.xcon.sketch"');
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
    expect(docsPage).toContain('/xcon-chain/');
    expect(docsPage).toContain('/xcon-workflow/');
    expect(apiPage).toContain('/docs/xcon-component-specs.en.md');
    expect(apiPage).toContain('/xcon-chain/');
    expect(apiPage).toContain('/xcon-workflow/');
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
    expect(deploymentDoc).toContain('location ^~ /xcon-chain/');
    expect(deploymentDoc).toContain('location ^~ /xcon-workflow/');
    expect(inventory).toContain('site/index.html');
    expect(inventory).toContain('/xcon-chain/');
    expect(inventory).toContain('/xcon-workflow/');
    expect(inventory).toContain('site/chatgpt-simulation.html');
    expect(inventory).toContain('site/chatgpt-markdown-sketch-simulation.html');
    expect(inventory).toContain('site/html-css-simulation.html');
    expect(inventory).toContain('playground/index.html');
    expect(inventory).toContain('playground/sketch.html');
    expect(inventory).toContain('vendor/markdown-it/markdown-it.min.js');
    expect(inventory).not.toContain('node_modules/markdown-it/dist/markdown-it.min.js');
    expect(inventory).not.toContain('drafts/');
    expect(inventory).not.toContain('.temp/');
    expect(buildScript).toContain("['node_modules/markdown-it/dist/markdown-it.min.js', 'vendor/markdown-it/markdown-it.min.js']");
    expect(nginx).toContain('server_name xconviewer.dev www.xconviewer.dev;');
    expect(nginx).toContain('location ^~ /xcon-chain/');
    expect(nginx).toContain('location ^~ /xcon-workflow/');
    expect(nginx).toContain('try_files $uri $uri.html $uri/index.html =404;');
  });
});

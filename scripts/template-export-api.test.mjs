import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';

import { createTemplateExportHandler, sanitizeExportFileName } from './template-export-api.mjs';
import { renderedHtmlToMarkdown } from './template-export-rendered-markdown.mjs';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template export API', () => {
  test('exports HWPX through an injected kordoc implementation', async () => {
    const calls = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return Buffer.from('fake-hwpx');
        },
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Weekly Bulletin: 2026/05/31',
      markdown: '# Weekly Bulletin',
      options: { hwpx: { language: 'ko-KR' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/hwp+zip');
    expect(response.headers['content-disposition']).toContain('Weekly-Bulletin-2026-05-31.hwpx');
    expect(response.body.toString()).toBe('fake-hwpx');
    expect(calls).toEqual([{ markdown: '# Weekly Bulletin', options: { language: 'ko-KR' } }]);
  });

  test('exports PDF through an injected kordoc implementation', async () => {
    const calls = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToPdf(markdown, options) {
          calls.push({ markdown, options });
          return new Uint8Array(Buffer.from('%PDF fake'));
        },
      },
    });
    const { response } = await callHandler(handler, {
      format: 'pdf',
      title: 'Executive Brief',
      markdown: '# Executive Brief',
      options: { pdf: { pageSize: 'A4' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('Executive-Brief.pdf');
    expect(response.body.toString()).toBe('%PDF fake');
    expect(calls).toEqual([{ markdown: '# Executive Brief', options: { pageSize: 'A4' } }]);
  });

  test('exports rendered HTML as PDF when template lab sends a rendered document', async () => {
    const calls = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToPdf() {
          throw new Error('markdown fallback must not be used for rendered PDF export');
        },
      },
      async renderHtmlToPdf(html, options) {
        calls.push({ html, options });
        return Buffer.from('%PDF rendered');
      },
    });
    const { response } = await callHandler(handler, {
      format: 'pdf',
      title: 'Executive Brief',
      markdown: '# Executive Brief\n\n```xcon-sketch\nscreen 320x180\n```',
      html: '<!doctype html><html><body><main><h1>Executive Brief</h1><div class="xcon-viewer-host">Rendered SKETCH card</div></main></body></html>',
      options: { pdf: { pageSize: 'A4' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('Executive-Brief.pdf');
    expect(response.body.toString()).toBe('%PDF rendered');
    expect(calls).toEqual([{
      html: '<!doctype html><html><body><main><h1>Executive Brief</h1><div class="xcon-viewer-host">Rendered SKETCH card</div></main></body></html>',
      options: { pageSize: 'A4' },
    }]);
  });

  test('exports HWP through a native kordoc implementation when available', async () => {
    const calls = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwp(markdown, options) {
          calls.push({ markdown, options });
          return Buffer.from('fake-hwp');
        },
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwp',
      title: 'Weekly Bulletin',
      markdown: '# Weekly Bulletin',
      options: { hwp: { language: 'ko-KR' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/x-hwp');
    expect(response.headers['content-disposition']).toContain('Weekly-Bulletin.hwp');
    expect(response.body.toString()).toBe('fake-hwp');
    expect(calls).toEqual([{ markdown: '# Weekly Bulletin', options: { language: 'ko-KR' } }]);
  });

  test('exports rendered HTML as visual HWPX fallback for HWP when native HWP is unavailable', async () => {
    const calls = [];
    const screenshots = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture();
        },
      },
      async renderHtmlToPngPages(html, options) {
        screenshots.push({ html, options });
        return [{ data: tinyPng(), width: 960, height: 540 }];
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwp',
      title: 'Executive Brief',
      markdown: '# Executive Brief\n\n```xcon-sketch\nscreen 320x180\n```',
      html: '<!doctype html><html><body><main><h1>Executive Brief</h1><div class="xcon-viewer-host">Rendered SKETCH card</div></main></body></html>',
      options: { hwp: { language: 'ko-KR', mode: 'visual' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/hwp+zip');
    expect(response.headers['content-disposition']).toContain('Executive-Brief.hwpx');
    expect(response.body.subarray(0, 2).toString()).toBe('PK');
    expect(calls).toEqual([{ markdown: '\u00a0', options: { language: 'ko-KR', mode: 'visual' } }]);
    expect(screenshots[0].html).toContain('Rendered SKETCH card');
    expect(screenshots[0].options).toEqual({ language: 'ko-KR', mode: 'visual' });
    const zip = await JSZip.loadAsync(response.body);
    expect(zip.file('BinData/image1.png')).toBeTruthy();
    const packageManifest = await zip.file('META-INF/manifest.xml').async('string');
    expect(packageManifest).toContain('manifest:full-path="Contents/content.hpf"');
    expect(packageManifest).toContain('manifest:full-path="Contents/header.xml"');
    expect(packageManifest).toContain('manifest:full-path="Contents/section0.xml"');
    expect(packageManifest).toContain('manifest:full-path="BinData/image1.png"');
    expect(packageManifest).toContain('manifest:media-type="image/png"');
    const contentHpf = await zip.file('Contents/content.hpf').async('string');
    expect(contentHpf).toContain('id="image1"');
    expect(contentHpf).toContain('href="BinData/image1.png"');
    expect(contentHpf).toContain('isEmbeded="1"');
    const sectionXml = await zip.file('Contents/section0.xml').async('string');
    expect(sectionXml).toContain('xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"');
    expect(sectionXml).toContain('<hc:img binaryItemIDRef="image1"');
    expect(sectionXml).toContain('bright="0" contrast="0" effect="REAL_PIC" alpha="0"');
    expect(sectionXml.indexOf('<hp:orgSz')).toBeLessThan(sectionXml.indexOf('<hc:img binaryItemIDRef="image1"'));
    expect(sectionXml.indexOf('<hc:img binaryItemIDRef="image1"')).toBeLessThan(sectionXml.indexOf('<hp:sz '));
    expect(sectionXml.indexOf('<hp:sz ')).toBeLessThan(sectionXml.indexOf('<hp:pos '));
    expect(sectionXml).toContain('<hp:t/>');
    expect(sectionXml).not.toContain('binaryItemIDRef="image1.png"');
    expect(sectionXml).not.toContain('binaryItemIDRef="export-page-1.png"');
    expect(await zip.file('Contents/section0.xml').async('string')).not.toContain('Rendered SKETCH card');
    expect(await zip.file('Preview/PrvText.txt').async('string')).toContain('Executive Brief');
  });

  test('exports rendered HWP as editable HWPX instead of native HTML HWP by default', async () => {
    const calls = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async htmlToHwp() {
          throw new Error('native HTML HWP must not be used by default');
        },
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture();
        },
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwp',
      title: 'Executive Brief',
      markdown: '# Executive Brief',
      html: '<article>Rendered document</article>',
      options: { hwp: { language: 'ko-KR' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/hwp+zip');
    expect(response.headers['content-disposition']).toContain('Executive-Brief.hwpx');
    expect(calls).toEqual([{ markdown: 'Rendered document', options: { language: 'ko-KR' } }]);
  });

  test('exports rendered HTML as visual HWPX instead of raw SKETCH markdown', async () => {
    const calls = [];
    const screenshots = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture();
        },
      },
      async renderHtmlToPngPages(html, options) {
        screenshots.push({ html, options });
        return [{ data: tinyPng(), width: 960, height: 540 }];
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Executive Brief',
      markdown: '# Executive Brief\n\n```xcon-sketch\nscreen 320x180\n```',
      html: '<article><h1>Executive Brief</h1><div class="xcon-viewer-host">Rendered SKETCH card</div></article>',
      options: { hwpx: { language: 'ko-KR', mode: 'visual' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/hwp+zip');
    expect(response.headers['content-disposition']).toContain('Executive-Brief.hwpx');
    expect(response.body.subarray(0, 2).toString()).toBe('PK');
    expect(calls).toEqual([{ markdown: '\u00a0', options: { language: 'ko-KR', mode: 'visual' } }]);
    expect(screenshots[0].html).toContain('Rendered SKETCH card');
    expect(screenshots[0].options).toEqual({ language: 'ko-KR', mode: 'visual' });
    const zip = await JSZip.loadAsync(response.body);
    expect(zip.file('BinData/image1.png')).toBeTruthy();
    const sectionXml = await zip.file('Contents/section0.xml').async('string');
    expect(sectionXml).toContain('<hc:img binaryItemIDRef="image1"');
    expect(sectionXml).toContain('<hp:t/>');
    expect(sectionXml).not.toContain('binaryItemIDRef="image1.png"');
    expect(sectionXml).not.toContain('binaryItemIDRef="export-page-1.png"');
    expect(sectionXml).not.toContain('xcon-sketch');
    expect(sectionXml).not.toContain('Rendered SKETCH card');
  });

  test('exports rendered HTML as editable HWPX markdown by default', async () => {
    const calls = [];
    const screenshots = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture();
        },
      },
      async renderHtmlToPngPages(html, options) {
        screenshots.push({ html, options });
        return [{ data: tinyPng(), width: 960, height: 540 }];
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Executive Brief',
      markdown: '# Executive Brief\n\n```xcon-sketch\nscreen 320x180\n```',
      html: `
        <!doctype html>
        <html>
          <body>
            <main class="export-document">
              <h1>Executive Brief</h1>
              <p><strong>1,284,000</strong> revenue, <strong>18%</strong> growth.</p>
              <section class="lab-xcon-block">
                <div class="xcon-viewer-host">
                  <h2>Team operating plan</h2>
                  <table>
                    <tr><th>Team</th><th>Owner</th><th>Status</th></tr>
                    <tr><td>Sales</td><td>Mina</td><td>Ready</td></tr>
                  </table>
                </div>
              </section>
            </main>
          </body>
        </html>
      `,
      options: { hwpx: { language: 'ko-KR' } },
    });

    expect(response.statusCode).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].markdown).toContain('# Executive Brief');
    expect(calls[0].markdown).toContain('**1,284,000** revenue');
    expect(calls[0].markdown).toContain('## Team operating plan');
    expect(calls[0].markdown).toContain('| Team | Owner | Status |');
    expect(calls[0].markdown).not.toContain('xcon-sketch');
    expect(screenshots).toEqual([]);
  });

  test('can append visual-only rendered blocks to editable HWPX exports', async () => {
    const calls = [];
    const visualBlocks = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture();
        },
      },
      async renderHtmlToPngVisualBlocks(html, options) {
        visualBlocks.push({ html, options });
        return [{ data: tinyPng(), width: 640, height: 320 }];
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Visual Brief',
      markdown: '# Visual Brief',
      html: `
        <main class="export-document">
          <h1>Visual Brief</h1>
          <p>Editable text stays editable.</p>
          <section class="lab-xcon-block"><div data-xcon-type="chart">chart</div></section>
        </main>
      `,
      options: { hwpx: { language: 'ko-KR', includeVisualBlocks: true } },
    });

    expect(response.statusCode).toBe(200);
    expect(calls[0].markdown).toContain('# Visual Brief');
    expect(calls[0].markdown).toContain('Editable text stays editable.');
    expect(visualBlocks).toHaveLength(1);
    const zip = await JSZip.loadAsync(response.body);
    expect(zip.file('BinData/image1.png')).toBeTruthy();
    const sectionXml = await zip.file('Contents/section0.xml').async('string');
    expect(sectionXml).toContain('<hc:img binaryItemIDRef="image1"');
    const contentHpf = await zip.file('Contents/content.hpf').async('string');
    expect(contentHpf).toContain('href="BinData/image1.png"');
    const packageManifest = await zip.file('META-INF/manifest.xml').async('string');
    expect(packageManifest).toContain('manifest:full-path="BinData/image1.png"');
  });

  test('auto visual mode keeps table-like XCON blocks editable for HWPX export', async () => {
    const calls = [];
    const visualBlocks = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture();
        },
      },
      async renderHtmlToPngVisualBlocks(html, options) {
        visualBlocks.push({ html, options });
        return [];
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Shared space cleaning checklist',
      html: `
        <main class="export-document">
          <h1>Shared space cleaning checklist</h1>
          <section class="lab-xcon-block">
            <div class="xcon-viewer-host">
              <h2>Cleaning Checklist</h2>
              <table>
                <tr><th>Area</th><th>Owner</th><th>Mon</th></tr>
                <tr><td>Lounge</td><td>Ava Parker</td><td>✓</td></tr>
              </table>
            </div>
          </section>
        </main>
      `,
      options: { hwpx: { language: 'ko-KR', includeVisualBlocks: 'auto' } },
    });

    expect(response.statusCode).toBe(200);
    expect(calls[0].markdown).toContain('# Shared space cleaning checklist');
    expect(calls[0].markdown).toContain('## Cleaning Checklist');
    expect(calls[0].markdown).toContain('| Area | Owner | Mon |');
    expect(calls[0].markdown).toContain('| Lounge | Ava Parker | ✓ |');
    expect(visualBlocks).toHaveLength(1);
    expect(visualBlocks[0].options.includeVisualBlocks).toBe('auto');
  });

  test('replaces raster-auto visual placeholders with HWPX images even when markdown normalizes underscores', async () => {
    const calls = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture(markdown.replace(/XCON_VISUAL_BLOCK/g, 'XCONVISUALBLOCK'));
        },
      },
      async renderHtmlToPngVisualBlocks() {
        return [{ data: tinyPng(), width: 640, height: 320 }];
      },
    });

    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Visual Placeholder Brief',
      html: `
        <main class="export-document">
          <h1>Visual Placeholder Brief</h1>
          <p>Editable text stays editable.</p>
          <section class="lab-xcon-block">
            <div class="xcon-viewer-host">
              <h2>Chart card</h2>
              <div data-xcon-type="chart">Chart loading...</div>
            </div>
          </section>
          <p>After visual block.</p>
        </main>
      `,
      options: { hwpx: { language: 'ko-KR', includeVisualBlocks: 'auto' } },
    });

    expect(response.statusCode).toBe(200);
    const zip = await JSZip.loadAsync(response.body);
    const sectionXml = await zip.file('Contents/section0.xml').async('string');
    expect(sectionXml).toContain('<hc:img binaryItemIDRef="image1"');
    expect(sectionXml).not.toContain('XCONVISUALBLOCK');
    expect(sectionXml).not.toContain('XCON_VISUAL_BLOCK');
    expect(calls[0].markdown).toContain('Editable text stays editable.');
    expect(calls[0].markdown).not.toContain('Chart card');
  });

  test('preserves editable paragraphs before and after raster-auto visual placeholders', async () => {
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx() {
          return createParagraphHwpxFixture([
            'Shared space cleaning checklist',
            'A poster-style operations document for Lounge / Shared table.',
            '@@XCONVISUALBLOCK0@@',
            'This template is designed to test bidirectional HWP import and export capabilities.',
          ]);
        },
      },
      async renderHtmlToPngVisualBlocks() {
        return [{ data: tinyPng(), width: 640, height: 320 }];
      },
    });

    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Shared space cleaning checklist',
      html: `
        <main class="export-document">
          <h1>Shared space cleaning checklist</h1>
          <p>A poster-style operations document for <strong>Lounge / Shared table</strong>.</p>
          <section class="lab-xcon-block">
            <div class="xcon-viewer-host">
              <div data-xcon-type="spanGrid" class="xa-spangrid">SpanGrid loading...</div>
            </div>
          </section>
          <p>This template is designed to test bidirectional HWP import and export capabilities.</p>
        </main>
      `,
      options: { hwpx: { includeVisualBlocks: 'auto', requireVisualBlocks: true } },
    });

    expect(response.statusCode).toBe(200);
    const zip = await JSZip.loadAsync(response.body);
    const sectionXml = await zip.file('Contents/section0.xml').async('string');
    const titleIndex = sectionXml.indexOf('Shared space cleaning checklist');
    const introIndex = sectionXml.indexOf('A poster-style operations document');
    const imageIndex = sectionXml.indexOf('binaryItemIDRef="image1"');
    const footerIndex = sectionXml.indexOf('This template is designed');
    expect(titleIndex).toBeGreaterThan(-1);
    expect(introIndex).toBeGreaterThan(titleIndex);
    expect(imageIndex).toBeGreaterThan(introIndex);
    expect(footerIndex).toBeGreaterThan(imageIndex);
    expect(sectionXml).not.toContain('XCONVISUALBLOCK');
  });

  test('reports an error when required visual blocks cannot be rendered', async () => {
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown) {
          return createBaseHwpxFixture(markdown);
        },
      },
      async renderHtmlToPngVisualBlocks() {
        return [];
      },
    });

    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Missing Visuals',
      html: `
        <main class="export-document">
          <h1>Missing Visuals</h1>
          <section class="lab-xcon-block">
            <div data-xcon-type="chart">Chart loading...</div>
          </section>
        </main>
      `,
      options: { hwpx: { includeVisualBlocks: 'auto', requireVisualBlocks: true } },
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body.toString()).error).toContain('did not produce any images');
  });

  test('keeps visual blocks out of editable markdown when they are exported as images', async () => {
    const calls = [];
    const visualBlocks = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture();
        },
      },
      async renderHtmlToPngVisualBlocks(html, options) {
        visualBlocks.push({ html, options });
        return [
          { data: tinyPng(), width: 640, height: 320 },
          { data: tinyPng(), width: 480, height: 180 },
        ];
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Executive Brief',
      html: `
        <main class="export-document">
          <h1>Executive Growth Brief</h1>
          <p><strong>1,284,000</strong> revenue, <strong>18% QoQ</strong> growth.</p>
          <section class="lab-xcon-block">
            <div class="xcon-viewer-host">
              <h2>Quarterly growth brief</h2>
              <p>Data-bound Markdown + SKETCH + SUGAR</p>
              <div data-xcon-type="chart">Chart loading...</div>
            </div>
          </section>
          <section class="xcon-workflow">
            <h2>Brief approval</h2>
            <div class="xw-node">Prepare data pack</div>
          </section>
        </main>
      `,
      options: { hwpx: { language: 'ko-KR', includeVisualBlocks: true } },
    });

    expect(response.statusCode).toBe(200);
    expect(calls[0].markdown).toContain('# Executive Growth Brief');
    expect(calls[0].markdown).toContain('**1,284,000** revenue');
    expect(calls[0].markdown).not.toContain('Quarterly growth brief');
    expect(calls[0].markdown).not.toContain('Chart loading');
    expect(calls[0].markdown).not.toContain('Brief approval');
    expect(calls[0].markdown).not.toContain('Prepare data pack');
    expect(visualBlocks).toHaveLength(1);
    const zip = await JSZip.loadAsync(response.body);
    expect(zip.file('BinData/image1.png')).toBeTruthy();
    expect(zip.file('BinData/image2.png')).toBeTruthy();
  });

  test('captures every rendered XCON block as a visual export candidate', () => {
    const script = readFileSync(join(rootDir, 'scripts', 'template-export-api.mjs'), 'utf8');

    expect(script).toContain("element.classList.contains('lab-xcon-block')");
    expect(script).toContain('[data-xcon-type="spanGrid"]');
    expect(script).toContain('[data-component="spanGrid"]');
    expect(script).toContain('.xa-spangrid');
    expect(script).toContain('}, visualBlockMode);');
  });

  test('exports rendered HWPX as editable markdown instead of native HTML HWPX by default', async () => {
    const calls = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async htmlToHwpx() {
          throw new Error('native HTML HWPX must not be used by default');
        },
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return createBaseHwpxFixture();
        },
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwpx',
      title: 'Executive Brief',
      markdown: '# Executive Brief',
      html: '<article>Rendered document</article>',
      options: { hwpx: { language: 'ko-KR' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/hwp+zip');
    expect(response.headers['content-disposition']).toContain('Executive-Brief.hwpx');
    expect(calls).toEqual([{ markdown: 'Rendered document', options: { language: 'ko-KR' } }]);
  });

  test('falls back from HWP to HWPX when kordoc has no native HWP writer', async () => {
    const calls = [];
    const handler = createTemplateExportHandler({
      kordoc: {
        async markdownToHwpx(markdown, options) {
          calls.push({ markdown, options });
          return Buffer.from('fake-hwpx-from-hwp');
        },
      },
    });
    const { response } = await callHandler(handler, {
      format: 'hwp',
      title: 'Weekly Bulletin',
      markdown: '# Weekly Bulletin',
      options: { hwp: { language: 'ko-KR' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/hwp+zip');
    expect(response.headers['content-disposition']).toContain('Weekly-Bulletin.hwpx');
    expect(response.body.toString()).toBe('fake-hwpx-from-hwp');
    expect(calls).toEqual([{ markdown: '# Weekly Bulletin', options: { language: 'ko-KR' } }]);
  });

  test('rejects unsupported formats and empty markdown', async () => {
    const handler = createTemplateExportHandler({ kordoc: {} });

    const unsupported = await callHandler(handler, { format: 'docx', markdown: '# Test' });
    expect(unsupported.response.statusCode).toBe(400);
    expect(JSON.parse(unsupported.response.body.toString()).error).toContain('Unsupported export format');

    const empty = await callHandler(handler, { format: 'pdf', markdown: '  ' });
    expect(empty.response.statusCode).toBe(400);
    expect(JSON.parse(empty.response.body.toString()).error).toContain('markdown or html is required');
  });

  test('normalizes unsafe export filenames', () => {
    expect(sanitizeExportFileName('A/B:C*D?E"F<G>H|I')).toBe('A-B-C-D-E-F-G-H-I');
    expect(sanitizeExportFileName('   ')).toBe('xcon-template-document');
  });

  test('converts rendered HTML into document markdown without source fences', () => {
    const markdown = renderedHtmlToMarkdown(`
      <!doctype html>
      <html>
        <body>
          <main class="export-document">
            <h1>Executive Growth Brief</h1>
            <p><strong>1,284,000</strong> revenue, <em>18%</em> growth.</p>
            <div class="lab-xcon-block">
              <div class="xcon-viewer-host">
                <h2>Quarterly growth brief</h2>
                <table>
                  <tr><th>Team</th><th>Status</th></tr>
                  <tr><td>Sales</td><td>Ready</td></tr>
                </table>
              </div>
            </div>
          </main>
        </body>
      </html>
    `);

    expect(markdown).toContain('# Executive Growth Brief');
    expect(markdown).toContain('**1,284,000** revenue');
    expect(markdown).toContain('## Quarterly growth brief');
    expect(markdown).toContain('| Team | Status |');
    expect(markdown).toContain('| Sales | Ready |');
    expect(markdown).not.toContain('xcon-sketch');
  });

  test('keeps table-only XCON blocks editable in raster-auto markdown export', () => {
    const markdown = renderedHtmlToMarkdown(`
      <main class="export-document">
        <h1>Shared space cleaning checklist</h1>
        <section class="lab-xcon-block">
          <div class="xcon-viewer-host">
            <h2>Cleaning Checklist</h2>
            <table>
              <tr><th>Area</th><th>Owner</th><th>Mon</th></tr>
              <tr><td>Lounge</td><td>Ava Parker</td><td>✓</td></tr>
            </table>
          </div>
        </section>
      </main>
    `, { excludeVisualBlocks: 'raster' });

    expect(markdown).toContain('# Shared space cleaning checklist');
    expect(markdown).toContain('## Cleaning Checklist');
    expect(markdown).toContain('| Area | Owner | Mon |');
    expect(markdown).toContain('| Lounge | Ava Parker | ✓ |');
  });

  test('removes raster-required XCON blocks in raster-auto markdown export', () => {
    const markdown = renderedHtmlToMarkdown(`
      <main class="export-document">
        <h1>Executive Brief</h1>
        <section class="lab-xcon-block">
          <div class="xcon-viewer-host">
            <h2>Chart card</h2>
            <div data-xcon-type="chart">Chart loading...</div>
          </div>
        </section>
        <p>Editable summary remains.</p>
      </main>
    `, { excludeVisualBlocks: 'raster' });

    expect(markdown).toContain('# Executive Brief');
    expect(markdown).toContain('Editable summary remains.');
    expect(markdown).not.toContain('Chart card');
    expect(markdown).not.toContain('Chart loading');
  });

  test('treats rendered SpanGrid blocks as visual in raster-auto markdown export', () => {
    const markdown = renderedHtmlToMarkdown(`
      <main class="export-document">
        <h1>Shared space cleaning checklist</h1>
        <p>Before grid.</p>
        <section class="lab-xcon-block">
          <div class="xcon-viewer-host">
            <div data-xcon-type="spanGrid" class="xa-spangrid">
              <table><tr><th>Area</th><th>Owner</th></tr><tr><td>Lounge</td><td>Ava</td></tr></table>
            </div>
          </div>
        </section>
        <p>After grid.</p>
      </main>
    `, {
      excludeVisualBlocks: 'raster-placeholder',
      visualPlaceholderPrefix: 'XCON_VISUAL_BLOCK',
    });

    expect(markdown).toContain('# Shared space cleaning checklist');
    expect(markdown).toContain('Before grid.');
    expect(markdown).toContain('@@XCONVISUALBLOCK0@@');
    expect(markdown).toContain('After grid.');
    expect(markdown).not.toContain('| Area | Owner |');
    expect(markdown).not.toContain('Lounge');
  });

  test('can leave ordered placeholders for raster-required XCON blocks', () => {
    const markdown = renderedHtmlToMarkdown(`
      <main class="export-document">
        <h1>Executive Brief</h1>
        <p>Before visual.</p>
        <section class="lab-xcon-block">
          <div class="xcon-viewer-host">
            <h2>Chart card</h2>
            <div data-xcon-type="chart">Chart loading...</div>
          </div>
        </section>
        <p>After visual.</p>
      </main>
    `, {
      excludeVisualBlocks: 'raster-placeholder',
      visualPlaceholderPrefix: 'XCON_VISUAL_BLOCK',
    });

    expect(markdown).toContain('# Executive Brief');
    expect(markdown).toContain('Before visual.');
    expect(markdown).toContain('@@XCONVISUALBLOCK0@@');
    expect(markdown).toContain('After visual.');
    expect(markdown.indexOf('Before visual.')).toBeLessThan(markdown.indexOf('@@XCONVISUALBLOCK0@@'));
    expect(markdown.indexOf('@@XCONVISUALBLOCK0@@')).toBeLessThan(markdown.indexOf('After visual.'));
    expect(markdown).not.toContain('Chart card');
  });
});

async function callHandler(handler, payload) {
  const request = Readable.from([JSON.stringify(payload)]);
  request.method = 'POST';
  request.url = '/api/export';
  request.headers = { 'content-type': 'application/json' };

  const chunks = [];
  const response = {
    statusCode: undefined,
    headers: {},
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = lowerHeaders(headers);
    },
    end(chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      this.body = Buffer.concat(chunks);
    },
  };

  await handler(request, response);
  response.body ??= Buffer.concat(chunks);
  return { request, response };
}

function lowerHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

async function createBaseHwpxFixture(text = 'Base') {
  const safeText = escapeFixtureXmlText(text);
  const zip = new JSZip();
  zip.file('mimetype', 'application/hwp+zip');
  zip.file('META-INF/container.xml', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
    '<rootfiles><rootfile full-path="Contents/content.hpf" media-type="application/hwp+zip"/></rootfiles>',
    '</container>',
  ].join(''));
  zip.file('Contents/content.hpf', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<opf:package xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head">',
    '<opf:manifest>',
    '<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>',
    '<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>',
    '</opf:manifest>',
    '<opf:spine><opf:itemref idref="header" linear="no"/><opf:itemref idref="section0" linear="yes"/></opf:spine>',
    '</opf:package>',
  ].join(''));
  zip.file('Contents/header.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" version="1.4" secCnt="1">',
    '<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>',
    '<hh:refList/>',
    '</hh:head>',
  ].join(''));
  zip.file('Contents/section0.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">',
    '<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0">',
    '<hp:secPr textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" outlineShapeIDRef="0" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0"><hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/><hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY"><hp:margin header="2835" footer="2835" gutter="0" left="5670" right="4252" top="8504" bottom="4252"/></hp:pagePr></hp:secPr>',
    `<hp:t>${safeText}</hp:t></hp:run></hp:p>`,
    '</hs:sec>',
  ].join(''));
  zip.file('Preview/PrvText.txt', String(text));
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createParagraphHwpxFixture(paragraphs = []) {
  const safeParagraphs = paragraphs.map((paragraph) => escapeFixtureXmlText(paragraph));
  const zip = new JSZip();
  zip.file('mimetype', 'application/hwp+zip');
  zip.file('META-INF/container.xml', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
    '<rootfiles><rootfile full-path="Contents/content.hpf" media-type="application/hwp+zip"/></rootfiles>',
    '</container>',
  ].join(''));
  zip.file('Contents/content.hpf', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<opf:package xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head">',
    '<opf:manifest>',
    '<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>',
    '<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>',
    '</opf:manifest>',
    '<opf:spine><opf:itemref idref="header" linear="no"/><opf:itemref idref="section0" linear="yes"/></opf:spine>',
    '</opf:package>',
  ].join(''));
  zip.file('Contents/header.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" version="1.4" secCnt="1">',
    '<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>',
    '<hh:refList/>',
    '</hh:head>',
  ].join(''));
  zip.file('Contents/section0.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">',
    '<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0">',
    '<hp:secPr textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" outlineShapeIDRef="0" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0"><hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/><hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY"><hp:margin header="2835" footer="2835" gutter="0" left="5670" right="4252" top="8504" bottom="4252"/></hp:pagePr></hp:secPr>',
    '</hp:run></hp:p>',
    ...safeParagraphs.map((paragraph) => `<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:t>${paragraph}</hp:t></hp:run></hp:p>`),
    '</hs:sec>',
  ].join(''));
  zip.file('Preview/PrvText.txt', paragraphs.join('\n'));
  return zip.generateAsync({ type: 'nodebuffer' });
}

function escapeFixtureXmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tinyPng() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
}

import { existsSync } from 'node:fs';
import JSZip from 'jszip';

import { renderedHtmlToMarkdown } from './template-export-rendered-markdown.mjs';

const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024;
const SUPPORTED_FORMATS = new Set(['hwpx', 'hwp', 'pdf']);
const VISUAL_BLOCK_PLACEHOLDER_PREFIX = 'XCONVISUALBLOCK';

export function createTemplateExportHandler(options = {}) {
  const {
    kordoc,
    importKordoc = () => import('kordoc'),
    importPuppeteer = () => import('puppeteer-core'),
    renderHtmlToPdf = (html, pdfOptions) => renderHtmlToPdfWithPuppeteer(html, pdfOptions, { importPuppeteer }),
    renderHtmlToPngPages = (html, pngOptions) => renderHtmlToPngPagesWithPuppeteer(html, pngOptions, { importPuppeteer }),
    renderHtmlToPngVisualBlocks = (html, pngOptions) => renderHtmlToPngVisualBlocksWithPuppeteer(html, pngOptions, { importPuppeteer }),
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  } = options;

  return async function handleTemplateExport(request, response) {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed. Use POST.' });
      return true;
    }

    let payload;
    try {
      payload = await readJsonBody(request, maxBodyBytes);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message || 'Invalid JSON request body.' });
      return true;
    }

    const format = normalizeFormat(payload.format);
    const markdown = typeof payload.markdown === 'string' ? payload.markdown : '';
    const html = typeof payload.html === 'string' ? payload.html : '';
    const title = sanitizeExportFileName(payload.title || 'xcon-template-document');
    const documentTitle = String(payload.title || 'xcon-template-document').trim() || 'xcon-template-document';

    if (!SUPPORTED_FORMATS.has(format)) {
      sendJson(response, 400, { error: `Unsupported export format "${format || '(empty)'}". Use "hwpx", "hwp", or "pdf".` });
      return true;
    }

    if (!markdown.trim() && !html.trim()) {
      sendJson(response, 400, { error: 'markdown or html is required.' });
      return true;
    }

    try {
      if (format === 'pdf' && html.trim()) {
        const kordocApi = await resolveOptionalKordoc({ kordoc, importKordoc });
        if (typeof kordocApi?.htmlToPdf === 'function') {
          const output = await kordocApi.htmlToPdf(html, payload.options?.pdf);
          sendBinary(response, 200, toBuffer(output), 'application/pdf', `${title}.pdf`);
          return true;
        }
        const output = await renderHtmlToPdf(html, payload.options?.pdf);
        sendBinary(response, 200, toBuffer(output), 'application/pdf', `${title}.pdf`);
        return true;
      }

      if (format === 'hwp' && html.trim()) {
        const kordocApi = await requireKordoc({ kordoc, importKordoc });
        if (shouldUseNativeHtmlExport(payload.options?.hwp) && typeof kordocApi?.htmlToHwp === 'function') {
          const output = await kordocApi.htmlToHwp(html, payload.options?.hwp);
          sendBinary(response, 200, toBuffer(output), 'application/x-hwp', `${title}.hwp`);
          return true;
        }

        if (typeof kordocApi.markdownToHwpx !== 'function') {
          throw new Error('Rendered HWP export requires kordoc.markdownToHwpx editable HWPX fallback.');
        }

        if (shouldUseVisualHwpxFallback(payload.options?.hwp || payload.options?.hwpx)) {
          const output = await createRenderedHtmlHwpx(html, {
            title: documentTitle,
            hwpxOptions: payload.options?.hwp || payload.options?.hwpx,
            kordocApi,
            renderHtmlToPngPages,
          });
          sendBinary(response, 200, output, 'application/hwp+zip', `${title}.hwpx`);
          return true;
        }
        const output = await createEditableHtmlHwpx(html, {
          title: documentTitle,
          hwpxOptions: payload.options?.hwp || payload.options?.hwpx,
          kordocApi,
          renderHtmlToPngVisualBlocks,
        });
        sendBinary(response, 200, output, 'application/hwp+zip', `${title}.hwpx`);
        return true;
      }

      if (format === 'hwpx' && html.trim()) {
        const kordocApi = await requireKordoc({ kordoc, importKordoc });
        if (shouldUseNativeHtmlExport(payload.options?.hwpx) && typeof kordocApi?.htmlToHwpx === 'function') {
          const output = await kordocApi.htmlToHwpx(html, payload.options?.hwpx);
          sendBinary(response, 200, toBuffer(output), 'application/hwp+zip', `${title}.hwpx`);
          return true;
        }
        if (typeof kordocApi.markdownToHwpx !== 'function') {
          throw new Error('Rendered HWPX export requires kordoc.markdownToHwpx visual package base.');
        }
        if (shouldUseVisualHwpxFallback(payload.options?.hwpx)) {
          const output = await createRenderedHtmlHwpx(html, {
            title: documentTitle,
            hwpxOptions: payload.options?.hwpx,
            kordocApi,
            renderHtmlToPngPages,
          });
          sendBinary(response, 200, output, 'application/hwp+zip', `${title}.hwpx`);
          return true;
        }
        const output = await createEditableHtmlHwpx(html, {
          title: documentTitle,
          hwpxOptions: payload.options?.hwpx,
          kordocApi,
          renderHtmlToPngVisualBlocks,
        });
        sendBinary(response, 200, output, 'application/hwp+zip', `${title}.hwpx`);
        return true;
      }

      const kordocApi = await requireKordoc({ kordoc, importKordoc });

      if (format === 'hwpx') {
        if (!markdown.trim()) {
          sendJson(response, 400, { error: 'markdown is required for HWPX export.' });
          return true;
        }
        if (typeof kordocApi.markdownToHwpx !== 'function') {
          throw new Error('kordoc.markdownToHwpx is not available.');
        }
        const output = await kordocApi.markdownToHwpx(markdown, payload.options?.hwpx);
        sendBinary(response, 200, toBuffer(output), 'application/hwp+zip', `${title}.hwpx`);
        return true;
      }

      if (format === 'hwp') {
        if (!markdown.trim()) {
          sendJson(response, 400, { error: 'markdown is required for HWP export when html is not provided.' });
          return true;
        }
        if (typeof kordocApi.markdownToHwp === 'function') {
          const output = await kordocApi.markdownToHwp(markdown, payload.options?.hwp);
          sendBinary(response, 200, toBuffer(output), 'application/x-hwp', `${title}.hwp`);
          return true;
        }

        if (typeof kordocApi.markdownToHwpx !== 'function') {
          throw new Error('kordoc.markdownToHwp is not available and kordoc.markdownToHwpx fallback is not available.');
        }
        const output = await kordocApi.markdownToHwpx(markdown, payload.options?.hwp || payload.options?.hwpx);
        sendBinary(response, 200, toBuffer(output), 'application/hwp+zip', `${title}.hwpx`);
        return true;
      }

      if (!markdown.trim()) {
        sendJson(response, 400, { error: 'markdown is required for PDF export.' });
        return true;
      }
      if (typeof kordocApi.markdownToPdf !== 'function') {
        throw new Error('kordoc.markdownToPdf is not available.');
      }
      const output = await kordocApi.markdownToPdf(markdown, payload.options?.pdf);
      sendBinary(response, 200, toBuffer(output), 'application/pdf', `${title}.pdf`);
      return true;
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        error: `Export failed: ${error.message || String(error)}`,
        ...(error.detail ? { detail: error.detail } : {}),
      });
      return true;
    }
  };
}

function shouldUseVisualHwpxFallback(options = {}) {
  const mode = String(options?.mode || options?.exportMode || options?.strategy || '').trim().toLowerCase();
  return mode === 'visual' || mode === 'image' || mode === 'raster';
}

function shouldUseNativeHtmlExport(options = {}) {
  const mode = String(options?.mode || options?.exportMode || options?.strategy || '').trim().toLowerCase();
  return mode === 'native' || mode === 'native-html' || mode === 'html';
}

async function renderHtmlToPdfWithPuppeteer(html, pdfOptions = {}, { importPuppeteer }) {
  const puppeteer = await importPuppeteer();
  const executablePath = resolveChromiumExecutablePath();
  if (!executablePath) {
    const error = new Error('Server PDF export requires Chromium. Set PUPPETEER_EXECUTABLE_PATH or install Chrome/Chromium.');
    error.statusCode = 503;
    throw error;
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });
    return await page.pdf({
      format: pdfOptions.pageSize || 'A4',
      landscape: pdfOptions.orientation === 'landscape',
      printBackground: true,
      margin: pdfOptions.margin || {
        top: '18mm',
        right: '18mm',
        bottom: '18mm',
        left: '18mm',
      },
    });
  } finally {
    await browser.close();
  }
}

async function createRenderedHtmlHwpx(html, { title, hwpxOptions = {}, kordocApi, renderHtmlToPngPages }) {
  if (typeof kordocApi.markdownToHwpx !== 'function') {
    throw new Error('Rendered visual HWPX export requires kordoc.markdownToHwpx for the base package.');
  }

  const pages = await renderHtmlToPngPages(html, hwpxOptions);
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('Rendered visual HWPX export did not produce any pages.');
  }

  const baseHwpx = await kordocApi.markdownToHwpx('\u00a0', hwpxOptions);
  return createVisualHwpxFromPngPages({
    baseHwpx: toBuffer(baseHwpx),
    pages,
    title,
  });
}

async function createEditableHtmlHwpx(html, { title, hwpxOptions = {}, kordocApi, renderHtmlToPngVisualBlocks }) {
  if (typeof kordocApi.markdownToHwpx !== 'function') {
    throw new Error('Editable HWPX export requires kordoc.markdownToHwpx.');
  }

  const visualBlockMode = normalizeVisualBlockMode(hwpxOptions);
  const markdown = renderedHtmlToMarkdown(html, {
    excludeVisualBlocks: visualBlockMode === 'all'
      ? true
      : visualBlockMode === 'auto'
        ? 'raster-placeholder'
        : false,
    visualPlaceholderPrefix: VISUAL_BLOCK_PLACEHOLDER_PREFIX,
  });
  const editableMarkdown = markdown.trim() || `# ${title || 'Rendered document'}`;
  const hasVisualPlaceholders = createVisualPlaceholderRegExp(VISUAL_BLOCK_PLACEHOLDER_PREFIX).test(editableMarkdown);
  const baseHwpx = toBuffer(await kordocApi.markdownToHwpx(editableMarkdown, hwpxOptions));
  if (visualBlockMode === 'none' || typeof renderHtmlToPngVisualBlocks !== 'function') {
    return baseHwpx;
  }

  try {
    const visualBlocks = await renderHtmlToPngVisualBlocks(html, hwpxOptions);
    if (!Array.isArray(visualBlocks) || visualBlocks.length === 0) {
      if (visualBlockMode === 'auto' && hasVisualPlaceholders) {
        if (hwpxOptions?.requireVisualBlocks) {
          throw new Error('Rendered visual block export did not produce any images.');
        }
        return createEditableHtmlHwpxWithoutVisualPlaceholders(html, { title, hwpxOptions, kordocApi });
      }
      return baseHwpx;
    }
    if (visualBlockMode === 'auto') {
      return insertVisualImagesIntoHwpxPlaceholders({
        baseHwpx,
        pages: visualBlocks,
        title,
        placeholderPrefix: VISUAL_BLOCK_PLACEHOLDER_PREFIX,
      });
    }
    return appendVisualImagesToHwpx({
      baseHwpx,
      pages: visualBlocks,
      title,
    });
  } catch (error) {
    if (hwpxOptions?.requireVisualBlocks) throw error;
    if (visualBlockMode === 'auto' && hasVisualPlaceholders) {
      return createEditableHtmlHwpxWithoutVisualPlaceholders(html, { title, hwpxOptions, kordocApi });
    }
    return baseHwpx;
  }
}

async function createEditableHtmlHwpxWithoutVisualPlaceholders(html, { title, hwpxOptions = {}, kordocApi }) {
  const markdown = renderedHtmlToMarkdown(html, {
    excludeVisualBlocks: 'raster',
    visualPlaceholderPrefix: VISUAL_BLOCK_PLACEHOLDER_PREFIX,
  });
  const editableMarkdown = markdown.trim() || `# ${title || 'Rendered document'}`;
  return toBuffer(await kordocApi.markdownToHwpx(editableMarkdown, hwpxOptions));
}

async function insertVisualImagesIntoHwpxPlaceholders({ baseHwpx, pages, title, placeholderPrefix }) {
  const zip = await JSZip.loadAsync(baseHwpx);
  const sectionXml = await zip.file('Contents/section0.xml')?.async('string');
  if (!sectionXml) throw new Error('The base HWPX package does not contain Contents/section0.xml.');

  const pageImages = pages.map((page, index) => normalizeRenderedPage(page, index));
  const paragraphPattern = /<hp:p\b[\s\S]*?<\/hp:p>/g;
  let replacementCount = 0;
  const sectionWithNamespace = ensureCoreNamespace(sectionXml);
  const nextSectionXml = sectionWithNamespace.replace(paragraphPattern, (paragraph) => {
    const placeholderMatches = [...paragraph.matchAll(createVisualPlaceholderRegExp(placeholderPrefix))];
    if (!placeholderMatches.length) return paragraph;

    return placeholderMatches.map((match) => {
      const index = Number(match[1]);
      const image = pageImages[index];
      if (!image) return '';
      replacementCount += 1;
      return createImageParagraphXml(image, index, '');
    }).join('\n');
  }).replace(createVisualPlaceholderRegExp(placeholderPrefix), '');

  if (replacementCount === 0) {
    return appendVisualImagesToHwpx({ baseHwpx, pages, title });
  }

  zip.file('Contents/section0.xml', nextSectionXml);
  zip.file('Contents/content.hpf', appendVisualContentHpf(await readZipText(zip, 'Contents/content.hpf'), pageImages));
  zip.file('META-INF/manifest.xml', appendVisualPackageManifest(await readZipText(zip, 'META-INF/manifest.xml'), pageImages));
  zip.file('Preview/PrvText.txt', `${title || 'Rendered document'}\n`);

  for (const image of pageImages) {
    zip.file(`BinData/${image.fileName}`, image.data);
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/hwp+zip',
  });
}

function escapeRegExpForXmlSearch(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createVisualPlaceholderPattern(placeholderPrefix) {
  const normalized = normalizeVisualPlaceholderPrefix(placeholderPrefix);
  const raw = String(placeholderPrefix || '');
  const candidates = [
    normalized,
    raw,
    raw.replace(/_/g, ''),
    'XCONVISUALBLOCK',
    'XCON_VISUAL_BLOCK',
  ].filter(Boolean);
  const unique = [...new Set(candidates)];
  return `@@(?:${unique.map(escapeRegExpForXmlSearch).join('|')})_?(\\d+)@@`;
}

function createVisualPlaceholderRegExp(placeholderPrefix) {
  return new RegExp(createVisualPlaceholderPattern(placeholderPrefix), 'g');
}

function normalizeVisualPlaceholderPrefix(value) {
  return String(value || 'XCONVISUALBLOCK').replace(/[^A-Za-z0-9]/g, '') || 'XCONVISUALBLOCK';
}

function normalizeVisualBlockMode(options = {}) {
  const raw = options?.includeVisualBlocks ?? options?.visualBlocks ?? options?.hybridVisuals;
  if (raw === true) return 'all';
  if (raw === false) return 'none';
  const mode = String(raw || '').trim().toLowerCase();
  if (mode === 'auto' || mode === 'raster' || mode === 'visual-auto') return 'auto';
  if (mode === 'all' || mode === 'true' || mode === 'visual') return 'all';
  return 'none';
}

async function renderHtmlToPngPagesWithPuppeteer(html, pngOptions = {}, { importPuppeteer }) {
  const puppeteer = await importPuppeteer();
  const executablePath = resolveChromiumExecutablePath();
  if (!executablePath) {
    const error = new Error('Server visual HWPX export requires Chromium. Set PUPPETEER_EXECUTABLE_PATH or install Chrome/Chromium.');
    error.statusCode = 503;
    throw error;
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: Number(pngOptions.viewportWidth) || 1200,
      height: Number(pngOptions.viewportHeight) || 900,
      deviceScaleFactor: Number(pngOptions.deviceScaleFactor) || 1,
    });
    await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });
    await waitForRenderedAssets(page);

    const rect = await page.evaluate(() => {
      const element = document.querySelector('main.export-document')
        || document.querySelector('.template-doc')
        || document.body;
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.left + window.scrollX,
        y: bounds.top + window.scrollY,
        width: bounds.width,
        height: bounds.height,
      };
    });

    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));
    const maxPageHeight = Math.max(240, Number(pngOptions.maxPageHeightPx) || 1400);
    const pages = [];

    for (let offset = 0; offset < height; offset += maxPageHeight) {
      const sliceHeight = Math.min(maxPageHeight, height - offset);
      const data = await page.screenshot({
        type: 'png',
        captureBeyondViewport: true,
        clip: {
          x: Math.max(0, Math.floor(rect.x)),
          y: Math.max(0, Math.floor(rect.y + offset)),
          width,
          height: sliceHeight,
        },
      });
      pages.push({ data: toBuffer(data), width, height: sliceHeight });
    }

    return pages;
  } finally {
    await browser.close();
  }
}

async function renderHtmlToPngVisualBlocksWithPuppeteer(html, pngOptions = {}, { importPuppeteer }) {
  const puppeteer = await importPuppeteer();
  const executablePath = resolveChromiumExecutablePath();
  if (!executablePath) {
    const error = new Error('Server visual block export requires Chromium. Set PUPPETEER_EXECUTABLE_PATH or install Chrome/Chromium.');
    error.statusCode = 503;
    throw error;
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: Number(pngOptions.viewportWidth) || 1200,
      height: Number(pngOptions.viewportHeight) || 900,
      deviceScaleFactor: Number(pngOptions.deviceScaleFactor) || 1,
    });
    await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });
    await waitForRenderedAssets(page);

    const visualBlockMode = normalizeVisualBlockMode(pngOptions);
    const handles = await page.$$(pngOptions.visualBlockSelector || '.lab-xcon-block, .xcon-workflow');
    const maxBlocks = Math.max(1, Number(pngOptions.maxVisualBlocks) || 12);
    const pages = [];

    for (const handle of handles) {
      if (pages.length >= maxBlocks) break;
      const info = await handle.evaluate((element, mode) => {
        const visualSelector = [
          'img',
          'svg',
          'canvas',
          '[data-xcon-type="chart"]',
          '[data-xcon-type="image"]',
          '[data-xcon-type="banner"]',
          '[data-xcon-type="map"]',
          '[data-xcon-type="networkDiagram"]',
          '[data-xcon-type="spanGrid"]',
          '[data-component="chart"]',
          '[data-component="image"]',
          '[data-component="banner"]',
          '[data-component="spanGrid"]',
          '.xcon-chart',
          '.xcon-map',
          '.xcon-network',
          '.xa-chart',
          '.xa-map',
          '.xa-network',
          '.xa-spangrid',
          '.xa-spangrid-empty',
        ].join(',');
        const dataType = String(element.getAttribute('data-xcon-type') || element.getAttribute('data-component') || '').toLowerCase();
        const text = String(element.textContent || '').toLowerCase();
        const rasterRequired = !!element.querySelector(visualSelector)
          || /chart|image|banner|map|network|spangrid|carousel|gallery|video/.test(dataType)
          || /chart loading|map loading|network loading|spangrid loading|no grid data/.test(text);
        const shouldCapture = element.classList.contains('lab-xcon-block')
          ? mode !== 'auto' || rasterRequired
          : element.classList.contains('xcon-workflow')
            ? mode !== 'auto' || rasterRequired
            : rasterRequired;
        const rect = element.getBoundingClientRect();
        return {
          shouldCapture,
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      }, visualBlockMode);
      if (!info.shouldCapture || info.width <= 0 || info.height <= 0) continue;

      const data = await page.screenshot({
        type: 'png',
        captureBeyondViewport: true,
        clip: {
          x: Math.max(0, Math.floor(info.x)),
          y: Math.max(0, Math.floor(info.y)),
          width: Math.max(1, Math.ceil(info.width)),
          height: Math.max(1, Math.ceil(info.height)),
        },
      });
      pages.push({ data: toBuffer(data), width: Math.ceil(info.width), height: Math.ceil(info.height) });
    }

    return pages;
  } finally {
    await browser.close();
  }
}

async function waitForRenderedAssets(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = Array.from(document.images || []);
    await Promise.all(images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      if (typeof image.decode === 'function') {
        try {
          await image.decode();
          return;
        } catch {
          // Fall through to event-based waiting below.
        }
      }
      await new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 1500);
      });
    }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function createVisualHwpxFromPngPages({ baseHwpx, pages, title }) {
  const zip = await JSZip.loadAsync(baseHwpx);
  const baseSectionXml = await zip.file('Contents/section0.xml')?.async('string');
  if (!baseSectionXml) throw new Error('The base HWPX package does not contain Contents/section0.xml.');

  const secPr = extractSecPr(baseSectionXml);
  const pageImages = pages.map((page, index) => normalizeRenderedPage(page, index));

  zip.file('Contents/section0.xml', createVisualSectionXml({ secPr, pageImages }));
  zip.file('Contents/content.hpf', createVisualContentHpf(pageImages));
  zip.file('META-INF/manifest.xml', createVisualPackageManifest(pageImages));
  zip.file('Preview/PrvText.txt', `${title || 'Rendered document'}\n`);

  for (const image of pageImages) {
    zip.file(`BinData/${image.fileName}`, image.data);
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/hwp+zip',
  });
}

async function appendVisualImagesToHwpx({ baseHwpx, pages, title }) {
  const zip = await JSZip.loadAsync(baseHwpx);
  const sectionXml = await zip.file('Contents/section0.xml')?.async('string');
  if (!sectionXml) throw new Error('The base HWPX package does not contain Contents/section0.xml.');

  const pageImages = pages.map((page, index) => normalizeRenderedPage(page, index));
  const imageParagraphs = pageImages.map((image, index) => createImageParagraphXml(image, index, '')).join('\n');
  const sectionWithNamespace = ensureCoreNamespace(sectionXml);
  zip.file('Contents/section0.xml', sectionWithNamespace.replace(/<\/hs:sec>\s*$/i, `${imageParagraphs}\n</hs:sec>`));
  zip.file('Contents/content.hpf', appendVisualContentHpf(await readZipText(zip, 'Contents/content.hpf'), pageImages));
  zip.file('META-INF/manifest.xml', appendVisualPackageManifest(await readZipText(zip, 'META-INF/manifest.xml'), pageImages));
  zip.file('Preview/PrvText.txt', `${title || 'Rendered document'}\n`);

  for (const image of pageImages) {
    zip.file(`BinData/${image.fileName}`, image.data);
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/hwp+zip',
  });
}

async function readZipText(zip, path) {
  return await zip.file(path)?.async('string') || '';
}

function ensureCoreNamespace(sectionXml) {
  return String(sectionXml || '').replace(/<hs:sec\b([^>]*)>/i, (match, attrs) => {
    if (/\bxmlns:hc=/.test(attrs)) return match;
    return `<hs:sec${attrs} xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">`;
  });
}

function appendVisualContentHpf(contentHpf, pageImages) {
  const imageItems = pageImages.map((image) => (
    `<opf:item id="${escapeXmlAttr(image.id)}" href="BinData/${escapeXmlAttr(image.fileName)}" media-type="image/png" isEmbeded="1"/>`
  )).join('\n');
  if (/<\/opf:manifest>/i.test(contentHpf)) {
    return contentHpf.replace(/<\/opf:manifest>/i, `${imageItems}\n</opf:manifest>`);
  }
  return createVisualContentHpf(pageImages);
}

function appendVisualPackageManifest(packageManifest, pageImages) {
  const imageEntries = pageImages.map((image) => (
    `<manifest:file-entry manifest:media-type="image/png" manifest:full-path="BinData/${escapeXmlAttr(image.fileName)}"/>`
  )).join('\n');
  if (/<\/manifest:manifest>/i.test(packageManifest)) {
    return packageManifest.replace(/<\/manifest:manifest>/i, `${imageEntries}\n</manifest:manifest>`);
  }
  return createVisualPackageManifest(pageImages);
}

function extractSecPr(sectionXml) {
  const match = String(sectionXml || '').match(/<hp:secPr\b[\s\S]*?<\/hp:secPr>/);
  if (match) return match[0];
  return [
    '<hp:secPr textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" outlineShapeIDRef="0" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">',
    '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>',
    '<hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>',
    '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>',
    '<hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY"><hp:margin header="2835" footer="2835" gutter="0" left="5670" right="4252" top="8504" bottom="4252"/></hp:pagePr>',
    '</hp:secPr>',
  ].join('');
}

function normalizeRenderedPage(page, index) {
  const width = Math.max(1, Math.round(Number(page?.width) || 960));
  const height = Math.max(1, Math.round(Number(page?.height) || 540));
  const printableWidth = 49606;
  const printableHeight = Math.max(1, Math.round(printableWidth * (height / width)));
  const id = `image${index + 1}`;
  return {
    id,
    fileName: `${id}.png`,
    data: toBuffer(page?.data),
    width: printableWidth,
    height: printableHeight,
    pixelWidth: width,
    pixelHeight: height,
  };
}

function createVisualSectionXml({ secPr, pageImages }) {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">',
    ...pageImages.map((image, index) => createImageParagraphXml(image, index, index === 0 ? secPr : '')),
    '</hs:sec>',
  ].join('\n');
}

function createImageParagraphXml(image, index, sectionProperties = '') {
  const id = index + 1;
  const width = image.width;
  const height = image.height;
  const pixelWidth = Math.max(1, Math.round(Number(image.pixelWidth) || width));
  const pixelHeight = Math.max(1, Math.round(Number(image.pixelHeight) || height));
  return [
    `<hp:p paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0">${sectionProperties}<hp:pic id="${id}" zOrder="${id}" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None">`,
    '<hp:offset x="0" y="0"/>',
    `<hp:orgSz width="${width}" height="${height}"/>`,
    `<hp:curSz width="${width}" height="${height}"/>`,
    '<hp:flip horizontal="0" vertical="0"/>',
    '<hp:rotationInfo angle="0" centerX="0" centerY="0"/>',
    '<hp:renderingInfo>',
    '<hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>',
    '<hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>',
    '<hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>',
    '</hp:renderingInfo>',
    '<hp:imgRect>',
    '<hc:pt0 x="0" y="0"/>',
    `<hc:pt1 x="${width}" y="0"/>`,
    `<hc:pt2 x="${width}" y="${height}"/>`,
    `<hc:pt3 x="0" y="${height}"/>`,
    '</hp:imgRect>',
    '<hp:imgClip left="0" right="0" top="0" bottom="0"/>',
    '<hp:inMargin left="0" right="0" top="0" bottom="0"/>',
    `<hp:imgDim dimwidth="${pixelWidth}" dimheight="${pixelHeight}"/>`,
    `<hc:img binaryItemIDRef="${escapeXmlAttr(image.id)}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>`,
    `<hp:sz width="${width}" widthRelTo="ABSOLUTE" height="${height}" heightRelTo="ABSOLUTE" protect="0"/>`,
    '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="CENTER" vertOffset="0" horzOffset="0"/>',
    '<hp:outMargin left="0" right="0" top="0" bottom="0"/>',
    '</hp:pic><hp:t/></hp:run></hp:p>',
  ].join('');
}

function createVisualPackageManifest(pageImages) {
  const imageEntries = pageImages.map((image) => (
    `<manifest:file-entry manifest:media-type="image/png" manifest:full-path="BinData/${escapeXmlAttr(image.fileName)}"/>`
  ));
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">',
    '<manifest:file-entry manifest:media-type="application/hwp+zip" manifest:full-path="/"/>',
    '<manifest:file-entry manifest:media-type="text/plain" manifest:full-path="mimetype"/>',
    '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="META-INF/container.xml"/>',
    '<manifest:file-entry manifest:media-type="application/hwpml-package+xml" manifest:full-path="Contents/content.hpf"/>',
    '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="Contents/header.xml"/>',
    '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="Contents/section0.xml"/>',
    '<manifest:file-entry manifest:media-type="text/plain" manifest:full-path="Preview/PrvText.txt"/>',
    ...imageEntries,
    '</manifest:manifest>',
  ].join('\n');
}

function createVisualContentHpf(pageImages) {
  const imageItems = pageImages.map((image) => (
    `<opf:item id="${escapeXmlAttr(image.id)}" href="BinData/${escapeXmlAttr(image.fileName)}" media-type="image/png" isEmbeded="1"/>`
  ));
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>',
    '<opf:package xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head">',
    '<opf:manifest>',
    '<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>',
    '<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>',
    ...imageItems,
    '</opf:manifest>',
    '<opf:spine>',
    '<opf:itemref idref="header" linear="no"/>',
    '<opf:itemref idref="section0" linear="yes"/>',
    '</opf:spine>',
    '</opf:package>',
  ].join('\n');
}

function escapeXmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveChromiumExecutablePath() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;

  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      ]
    : process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : [
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/snap/bin/chromium',
        ];

  return candidates.find((candidate) => existsSync(candidate)) || '';
}

async function requireKordoc({ kordoc, importKordoc }) {
  try {
    return kordoc || await importKordoc();
  } catch (error) {
    const wrapped = new Error('Server binary export requires the optional "kordoc" package.');
    wrapped.detail = error.message || String(error);
    wrapped.statusCode = 503;
    throw wrapped;
  }
}

async function resolveOptionalKordoc({ kordoc, importKordoc }) {
  if (kordoc) return kordoc;
  try {
    return await importKordoc();
  } catch {
    return null;
  }
}

export async function readJsonBody(request, maxBodyBytes = DEFAULT_MAX_BODY_BYTES) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBodyBytes) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  if (!body.trim()) {
    const error = new Error('JSON request body is required.');
    error.statusCode = 400;
    throw error;
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    const wrapped = new Error(`Invalid JSON request body: ${error.message}`);
    wrapped.statusCode = 400;
    throw wrapped;
  }
}

export function sanitizeExportFileName(value) {
  return String(value || 'xcon-template-document')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'xcon-template-document';
}

function normalizeFormat(format) {
  return String(format || '').trim().toLowerCase();
}

function toBuffer(output) {
  if (Buffer.isBuffer(output)) return output;
  if (output instanceof ArrayBuffer) return Buffer.from(output);
  if (ArrayBuffer.isView(output)) return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
  if (typeof output === 'string') return Buffer.from(output);
  throw new Error('The export renderer returned an unsupported binary value.');
}

function sendBinary(response, statusCode, body, contentType, fileName) {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'content-length': String(body.length),
    'content-disposition': contentDisposition(fileName),
    'cache-control': 'no-store',
  });
  response.end(body);
}

function sendJson(response, statusCode, payload) {
  const body = Buffer.from(`${JSON.stringify(payload)}\n`);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.length),
    'cache-control': 'no-store',
  });
  response.end(body);
}

function contentDisposition(fileName) {
  const asciiFileName = fileName.replace(/[^\x20-\x7e]+/g, '-').replace(/"/g, '\\"');
  return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

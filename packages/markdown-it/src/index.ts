import { deserialize, parseBySyntax, type XconSyntax } from '@xcon-viewer/core';
import { renderToHtml, type RenderOptions } from '@xcon-viewer/viewer';

export interface XconMarkdownItOptions {
  renderOptions?: RenderOptions;
  containerClass?: string;
  frameClass?: string;
}

interface MarkdownItLike {
  renderer: {
    rules: Record<string, ((tokens: TokenLike[], index: number, options: unknown, env: unknown, self: RendererLike) => string) | undefined>;
  };
}

interface RendererLike {
  renderToken(tokens: TokenLike[], index: number, options: unknown): string;
}

interface TokenLike {
  info: string;
  content: string;
}

const xconLanguages = new Set([
  'xcon-sketch',
  'xcons',
  'xcon',
  'xcon-json',
  'xconj',
  'xcon-xml',
  'xconx',
  'xcon-tagless',
  'xconl',
  'xcont',
]);

export default function xconMarkdownIt(md: MarkdownItLike, options: XconMarkdownItOptions = {}): void {
  const previousFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, renderOptions, env, self) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/, 1)[0].toLowerCase();
    if (!xconLanguages.has(language)) {
      return previousFence ? previousFence(tokens, index, renderOptions, env, self) : self.renderToken(tokens, index, renderOptions);
    }
    return renderXconFence(token.content, language, options);
  };
}

export function renderXconFence(source: string, language = 'xcon', options: XconMarkdownItOptions = {}): string {
  try {
    const normalizedLanguage = language.toLowerCase();
    const syntax = normalizedLanguage === 'xcon' ? detectXconSyntax(source) : languageToSyntax(normalizedLanguage);
    const document = syntax ? parseBySyntax(source, syntax) : deserialize(source);
    const html = renderToHtml(document, options.renderOptions);
    const className = options.containerClass ?? 'xcon-markdown-preview';
    const frameClassName = options.frameClass ?? 'xcon-markdown-frame';
    return `<div class="${escapeAttr(className)}" data-xcon-markdown style="${escapeAttr(xconContainerStyle())}"><div class="${escapeAttr(frameClassName)}" style="${escapeAttr(xconFrameStyle(document))}">${html}</div></div>`;
  } catch (error) {
    return `<pre class="xcon-markdown-error" data-xcon-error>${escapeHtml((error as Error).message)}</pre>`;
  }
}

function languageToSyntax(language: string): XconSyntax | null {
  if (language === 'xcon-sketch' || language === 'xcons') return 'sketch';
  if (language === 'xcon-json' || language === 'xconj') return 'json';
  if (language === 'xcon-xml' || language === 'xconx') return 'xml';
  if (language === 'xcon-tagless' || language === 'xconl' || language === 'xcont') return 'tagless';
  return null;
}

function detectXconSyntax(source: string): XconSyntax {
  const trimmed = source.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'xml';
  if (/^(screen|form|panel)\b/i.test(trimmed)) return 'sketch';
  return 'tagless';
}

function xconContainerStyle(): string {
  return [
    'position:relative',
    'display:inline-block',
    'max-width:100%',
    'overflow:visible',
    'vertical-align:top',
    'box-sizing:border-box',
  ].join(';');
}

function xconFrameStyle(document: unknown): string {
  const pos = readXconField(document, 'pos');
  const width = readXconDimension(pos, 2, 360);
  const height = readXconDimension(pos, 3, 160);
  return [
    'position:relative',
    'box-sizing:border-box',
    `width:${width}px`,
    'max-width:100%',
    `height:${height}px`,
    'overflow:visible',
    'isolation:isolate',
  ].join(';');
}

function readXconField(document: unknown, key: string): unknown {
  if (document && typeof document === 'object' && 'get' in document && typeof document.get === 'function') {
    return document.get(key);
  }
  if (document && typeof document === 'object' && key in document) {
    return (document as Record<string, unknown>)[key];
  }
  return undefined;
}

function readXconDimension(pos: unknown, index: number, fallback: number): number {
  const value = Array.isArray(pos) ? Number(pos[index]) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

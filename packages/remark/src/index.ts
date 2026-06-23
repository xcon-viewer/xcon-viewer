import { deserialize, fromSketchLenient, parseBySyntax, type SketchRecoveryError, type XconSyntax } from '@xcon-viewer/core';
import { renderToHtml, type RenderOptions } from '@xcon-viewer/viewer';

export interface RemarkXconOptions {
  renderOptions?: RenderOptions;
  containerClass?: string;
}

export interface MdastNode {
  type: string;
  lang?: string;
  value?: string;
  children?: MdastNode[];
  [key: string]: unknown;
}

const xconLanguages = new Set(['xcon-sketch', 'xcons', 'xcon', 'xcon-json', 'xcon-xml', 'xcon-tagless']);

export default function remarkXcon(options: RemarkXconOptions = {}): (tree: MdastNode) => MdastNode {
  return (tree) => transformNode(tree, options);
}

export function transformNode(node: MdastNode, options: RemarkXconOptions = {}): MdastNode {
  if (node.type === 'code' && node.lang && xconLanguages.has(node.lang)) {
    return {
      type: 'html',
      value: renderXconNode(String(node.value ?? ''), node.lang, options),
    };
  }
  if (Array.isArray(node.children)) {
    node.children = node.children.map((child) => transformNode(child, options));
  }
  return node;
}

export function renderXconNode(source: string, language = 'xcon', options: RemarkXconOptions = {}): string {
  try {
    const syntax = languageToSyntax(language);
    const parsed = parseNodeDocument(source, syntax);
    const document = parsed.document;
    const html = renderToHtml(document, options.renderOptions);
    const className = options.containerClass ?? 'xcon-remark-preview';
    return `<div class="${escapeAttr(className)}" data-xcon-remark>${html}${renderDiagnostics(parsed.errors, 'xcon-remark-diagnostics')}</div>`;
  } catch (error) {
    return `<pre class="xcon-remark-error" data-xcon-error>${escapeHtml((error as Error).message)}</pre>`;
  }
}

function parseNodeDocument(source: string, syntax: XconSyntax | null): { document: ReturnType<typeof deserialize>; errors: SketchRecoveryError[] } {
  if (syntax === 'sketch') return fromSketchLenient(source);
  return { document: syntax ? parseBySyntax(source, syntax) : deserialize(source), errors: [] };
}

function languageToSyntax(language: string): XconSyntax | null {
  if (language === 'xcon-sketch' || language === 'xcons') return 'sketch';
  if (language === 'xcon-json') return 'json';
  if (language === 'xcon-xml') return 'xml';
  if (language === 'xcon-tagless') return 'tagless';
  return null;
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

function renderDiagnostics(errors: SketchRecoveryError[], className: string): string {
  if (errors.length === 0) return '';
  const items = errors
    .map((error) => `<li>${escapeHtml(error.message)}</li>`)
    .join('');
  return `<details class="${escapeAttr(className)}" data-xcon-diagnostics><summary>${errors.length} SKETCH parse warning${errors.length === 1 ? '' : 's'}</summary><ul>${items}</ul></details>`;
}

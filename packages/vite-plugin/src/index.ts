import { deserialize, parseBySyntax, toJSONObject, type XconSyntax } from '@xcon-viewer/core';
import { renderToHtml, type RenderOptions } from '@xcon-viewer/viewer';

export interface XconVitePluginOptions {
  renderOptions?: RenderOptions;
}

export interface VitePluginLike {
  name: string;
  enforce: 'pre';
  transform(source: string, id: string): string | null;
}

const extensionPattern = /\.(?:xcons|xcon(?:\.(?:json|xml|sketch))?)$/i;

export default function xconVitePlugin(options: XconVitePluginOptions = {}): VitePluginLike {
  return {
    name: 'xcon-viewer',
    enforce: 'pre',
    transform(source, id) {
      if (!isXconModule(id)) return null;
      return transformXconModule(source, id, options);
    },
  };
}

export function isXconModule(id: string): boolean {
  const [path] = id.split('?', 1);
  return extensionPattern.test(path);
}

export function transformXconModule(source: string, id: string, options: XconVitePluginOptions = {}): string {
  const syntax = syntaxFromId(id);
  const document = syntax ? parseBySyntax(source, syntax) : deserialize(source);
  const object = toJSONObject(document);
  const html = renderToHtml(document, options.renderOptions);
  return [
    `export const source = ${JSON.stringify(source)};`,
    `export const document = ${JSON.stringify(object)};`,
    `export const html = ${JSON.stringify(html)};`,
    'export default document;',
  ].join('\n');
}

function syntaxFromId(id: string): XconSyntax | null {
  const [path] = id.split('?', 1);
  if (path.endsWith('.xcon.json')) return 'json';
  if (path.endsWith('.xcon.xml')) return 'xml';
  if (path.endsWith('.xcon.sketch') || path.endsWith('.xcons')) return 'sketch';
  return null;
}

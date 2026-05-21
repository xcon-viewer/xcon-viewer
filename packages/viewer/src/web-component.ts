// Web Component entry point
// Self-registering module. Import this file to register <xcon-viewer> as a
// custom element in the browser.
//
// Usage (HTML):
//   <script type="module" src="https://unpkg.com/@xcon-viewer/viewer@0.1.0/dist/web-component.js"></script>
//   <xcon-viewer src="./home.xcon.json"></xcon-viewer>
//
// Usage (JS/TS):
//   import '@xcon-viewer/viewer/web-component';

import { deserialize, fromJSONObject } from '@xcon-viewer/core';
import { hydrateXconViewer, renderToHtml, viewerCss, type RenderOptions } from './renderer/index.js';

export class XconViewerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['src', 'content', 'allow-external-resources', 'allow-html'];
  }

  private abortController: AbortController | null = null;
  private root: ShadowRoot;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    void this.update();
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) void this.update();
  }

  async update(): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();

    try {
      const source = await this.loadSource(this.abortController.signal);
      if (!source) {
        this.root.innerHTML = '';
        return;
      }
      const document = typeof source === 'string' ? deserialize(source) : fromJSONObject(source);
      const html = renderToHtml(document, this.renderOptions());
      const frameStyle = xconElementFrameStyle(document);
      this.root.innerHTML = `<style>:host{display:block;contain:content;position:relative}${viewerCss}</style><div class="xcon-viewer-host" data-xcon-viewer-host style="${frameStyle}">${html}</div>`;
      hydrateXconViewer(this.root);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      this.root.innerHTML = `<pre data-xcon-error>${escapeHtml((error as Error).message)}</pre>`;
    }
  }

  private async loadSource(signal: AbortSignal): Promise<string | object | null> {
    const src = this.getAttribute('src');
    if (src) {
      const response = await fetch(src, { signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Failed to load XCON source: ${response.status}`);
      return response.text();
    }

    const content = this.getAttribute('content');
    if (content) return content;

    const inline = this.textContent?.trim();
    return inline || null;
  }

  private renderOptions(): RenderOptions {
    return {
      allowExternalResources: this.hasAttribute('allow-external-resources'),
      allowHtml: this.hasAttribute('allow-html'),
    };
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('xcon-viewer')) {
  customElements.define('xcon-viewer', XconViewerElement);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function xconElementFrameStyle(document: unknown): string {
  const pos = readXconField(document, 'pos');
  const rect = rectParts(pos);
  const declarations = [
    'position:relative',
    'display:inline-block',
    'box-sizing:border-box',
    'max-width:100%',
    'overflow:visible',
    'vertical-align:top',
    'isolation:isolate',
  ];
  if (rect) {
    const width = Math.max(0, rect[0]) + rect[2];
    const height = Math.max(0, rect[1]) + rect[3];
    declarations.push(`width:${numberPx(width)}`, `height:${numberPx(height)}`);
  } else {
    declarations.push('width:100%', 'min-height:100%');
  }
  return declarations.join(';');
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

function rectParts(value: unknown): [number, number, number, number] | null {
  if (Array.isArray(value) && value.length === 4) {
    const parts = value.map(Number);
    return parts.every(Number.isFinite) ? (parts as [number, number, number, number]) : null;
  }
  if (typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => Number(part.trim()));
  return parts.length === 4 && parts.every(Number.isFinite) ? (parts as [number, number, number, number]) : null;
}

function numberPx(value: unknown): string {
  return `${Number(value) || 0}px`;
}

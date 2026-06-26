import { describe, expect, test } from 'vitest';
import { renderNetworkStatic } from './static';

describe('renderNetworkStatic', () => {
  test('renders obsidian fallback with serialized model data', () => {
    const html = renderNetworkStatic({
      key: 'root',
      component: {
        theme: 'obsidian',
        nodes: [
          { id: 'root', label: 'Root' },
          { id: 'child', label: 'Child <script>' },
        ],
        links: [{ source: 'root', target: 'child', type: 'ref' }],
      },
      attrs: { 'data-xcon-type': 'networkDiagram', style: 'position:absolute;width:420px;height:260px' },
    });

    expect(html).toContain('class="xa-network-diagram-container"');
    expect(html).toContain('data-xcon-network="true"');
    expect(html).toContain('data-xcon-network-model=');
    expect(html).toContain('data-xcon-network-theme="obsidian"');
    expect(html).toContain('class="xa-network-toolbar"');
    expect(html).toContain('data-xcon-network-toolbar="true"');
    expect(html).toContain('id="network-diagram-root"');
    expect(html).toContain('Root');
    expect(html).toContain('Child &lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('keeps arrows and labels configurable', () => {
    const html = renderNetworkStatic({
      key: 'root',
      component: {
        showLabels: false,
        showArrows: false,
        nodeRadius: 32,
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B', color: '#ff00aa' },
        ],
        edges: [{ from: 'a', to: 'b', type: 'folder' }],
      },
      attrs: {},
    });

    expect(html).toContain('r="32"');
    expect(html).toContain('fill="#ff00aa"');
    expect(html).not.toContain('class="network-label"');
    expect(html).not.toContain('marker-end=');
  });

  test('preserves visual token overrides without requiring custom theme', () => {
    const html = renderNetworkStatic({
      key: 'root',
      component: {
        backgroundColor: '#101820',
        linkColor: '#334455',
        refLinkColor: '#556677',
        primaryColor: '#778899',
        textColor: '#abcdef',
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        links: [{ source: 'a', target: 'b', type: 'ref' }],
      },
      attrs: {},
    });

    expect(html).toContain('--xcon-network-bg:#101820');
    expect(html).toContain('--xcon-network-link:#334455');
    expect(html).toContain('--xcon-network-ref-link:#556677');
    expect(html).toContain('stroke="#556677"');
    expect(html).toContain('fill="#778899"');
    expect(html).toContain('fill="#abcdef"');
  });

  test('preserves outer renderer attributes and nests network container data', () => {
    const html = renderNetworkStatic({
      key: 'root',
      component: {
        nodes: [{ id: 'root', label: 'Root' }],
      },
      attrs: {
        id: 'outer-network',
        'data-key': 'root~panel~network',
        'data-xcon-type': 'networkDiagram',
        'data-component-key': 'network',
        class: 'outer-shell',
        style: 'position:absolute;left:12px;top:24px;width:420px;height:260px',
      },
    });
    const outerTag = html.match(/^<div\b[^>]*>/)?.[0] ?? '';
    const networkTag = html.match(/<div\b(?=[^>]*id="network-container-root")(?=[^>]*data-xcon-network="true")[^>]*>/)?.[0] ?? '';

    expect(outerTag).toContain('id="outer-network"');
    expect(outerTag).toContain('data-key="root~panel~network"');
    expect(outerTag).toContain('style="position:absolute;left:12px;top:24px;width:420px;height:260px"');
    expect(outerTag).toContain('class="outer-shell"');
    expect(outerTag).toContain('data-xcon-type="networkDiagram"');
    expect(outerTag).toContain('data-component-key="network"');
    expect(outerTag).not.toContain('data-xcon-network=');
    expect(outerTag).not.toContain('data-xcon-network-model=');
    expect(networkTag).toContain('id="network-container-root"');
    expect(networkTag).toContain('class="xa-network-diagram-container"');
    expect(networkTag).toContain('data-key="root"');
    expect(networkTag).toContain('data-xcon-network-model=');
    expect(networkTag).toContain('data-xcon-network-options=');
  });

  test('serializes parseable model and options data attributes through html decoding', () => {
    const label = `Quote " single ' angle <tag> amp &`;
    const details = `Details " single ' angle <detail> amp &`;
    const html = renderNetworkStatic({
      key: 'root',
      component: {
        nodeRadius: 31,
        showSearch: false,
        nodes: [
          { id: 'root', label, metadata: { details } },
          { id: 'child', label: 'Child' },
        ],
        links: [{ source: 'root', target: 'child', type: 'ref' }],
      },
      attrs: {},
    });
    const network = networkElementAttributes(html);
    const model = JSON.parse(requiredAttribute(network, 'data-xcon-network-model')) as {
      nodes: Array<{ id: string; label: string; metadata: Record<string, unknown> }>;
    };
    const options = JSON.parse(requiredAttribute(network, 'data-xcon-network-options')) as {
      nodeRadius: number;
      showSearch: boolean;
    };

    expect(model.nodes[0]?.label).toBe(label);
    expect(model.nodes[0]?.metadata.details).toBe(details);
    expect(options.nodeRadius).toBe(31);
    expect(options.showSearch).toBe(false);
  });
});

function networkElementAttributes(html: string): Record<string, string> {
  const documentLike = globalThis as unknown as { document?: Document };
  if (documentLike.document) {
    const template = documentLike.document.createElement('template');
    template.innerHTML = html;
    const network = template.content.querySelector('[data-xcon-network]');
    if (!network) return {};
    return Object.fromEntries([...network.attributes].map((attribute) => [attribute.name, attribute.value]));
  }

  const networkTag = html.match(/<div\b(?=[^>]*data-xcon-network="true")[^>]*>/)?.[0] ?? '';
  return openingTagAttributes(networkTag);
}

function openingTagAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/\s([^\s=]+)="([^"]*)"/g)) {
    attrs[match[1]] = decodeHtmlAttribute(match[2]);
  }
  return attrs;
}

function requiredAttribute(attrs: Record<string, string>, name: string): string {
  const value = attrs[name];
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#96;', '`')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

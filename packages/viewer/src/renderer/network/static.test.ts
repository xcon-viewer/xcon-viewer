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
});

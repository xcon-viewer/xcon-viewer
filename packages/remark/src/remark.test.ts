import { describe, expect, test } from 'vitest';

import remarkXcon, { renderXconNode, transformNode, type MdastNode } from './index.js';

describe('@xcon-viewer/remark', () => {
  test('renders XCON code nodes to HTML', () => {
    const html = renderXconNode('{"type":"form","components":{"title":{"type":"label","text":"Hello"}}}', 'xcon-json');

    expect(html).toContain('data-xcon-remark');
    expect(html).toContain('data-xcon-type="label"');
  });

  test('renders XCON/SKETCH code nodes', () => {
    const html = renderXconNode(
      'screen 360x220 bg #fff\ntitle: label "Hello Sketch" at 0 0 360 40',
      'xcon-sketch',
    );

    expect(html).toContain('data-xcon-remark');
    expect(html).toContain('data-xcon-type="label"');
    expect(html).toContain('Hello Sketch');
  });

  test('renders recoverable SKETCH code nodes while reporting local parse errors', () => {
    const html = renderXconNode(
      [
        'screen 360x220 bg #fff',
        'title: label "Visible title" at 0 0 220 40',
        'badPanel: panel',
        '  color #2563eb',
        '  width 3',
        'cta: button "Visible button" at 0 60 160 44',
      ].join('\n'),
      'xcon-sketch',
    );

    expect(html).toContain('data-xcon-remark');
    expect(html).toContain('Visible title');
    expect(html).toContain('Visible button');
    expect(html).toContain('xcon-remark-diagnostics');
    expect(html).toContain('line 3');
    expect(html).not.toContain('badPanel: panel');
  });

  test('transforms xcons shorthand code nodes', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [{ type: 'code', lang: 'xcons', value: 'screen 360x220\ntitle: label "Hi" at 0 0 360 40' }],
    };

    const transformed = transformNode(tree);

    expect(transformed.children?.[0]).toMatchObject({ type: 'html' });
  });

  test('transforms mdast code nodes and leaves other code blocks unchanged', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        { type: 'code', lang: 'xcon-json', value: '{"type":"form"}' },
        { type: 'code', lang: 'js', value: 'const a = 1;' },
      ],
    };

    const transformed = transformNode(tree);

    expect(transformed.children?.[0]).toMatchObject({ type: 'html' });
    expect(transformed.children?.[1]).toMatchObject({ type: 'code', lang: 'js' });
    expect(remarkXcon()(tree)).toBe(tree);
  });
});

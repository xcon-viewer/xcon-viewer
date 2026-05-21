import { describe, expect, test } from 'vitest';

import { XconViewer, createXconViewer, toXconViewerAttributes } from './index.js';

describe('@xcon-viewer/react', () => {
  test('maps public props to the xcon-viewer custom element attributes', () => {
    const attrs = toXconViewerAttributes({
      document: { type: 'form', components: { title: { type: 'label', text: 'Hello' } } },
      allowExternalResources: true,
      className: 'preview',
    });

    expect(attrs.content).toContain('"type": "form"');
    expect(attrs['allow-external-resources']).toBe(true);
    expect(attrs.className).toBe('preview');
  });

  test('returns a React-compatible custom element object without importing React at build time', () => {
    const element = XconViewer({ src: './screen.xcon.json', key: 'screen' });

    expect(element.type).toBe('xcon-viewer');
    expect(element.key).toBe('screen');
    expect(element.props.src).toBe('./screen.xcon.json');
  });

  test('creates a React component factory from an injected createElement function', () => {
    const calls: unknown[] = [];
    const Component = createXconViewer((type, props) => {
      calls.push({ type, props });
      return { type, props };
    });

    expect(Component({ src: './screen.xcon.json' })).toEqual({
      type: 'xcon-viewer',
      props: { src: './screen.xcon.json' },
    });
    expect(calls).toHaveLength(1);
  });
});

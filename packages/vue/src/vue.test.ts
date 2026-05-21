import { describe, expect, test } from 'vitest';

import { createXconViewerComponent, toXconViewerAttrs } from './index.js';

describe('@xcon-viewer/vue', () => {
  test('maps Vue props to xcon-viewer attributes', () => {
    const attrs = toXconViewerAttrs({
      document: { type: 'form', components: { title: { type: 'label', text: 'Hello' } } },
      allowExternalResources: true,
    });

    expect(attrs.content).toContain('"type": "form"');
    expect(attrs['allow-external-resources']).toBe('');
  });

  test('creates a Vue component factory that renders the custom element through h()', () => {
    const calls: unknown[] = [];
    const component = createXconViewerComponent((type, props, children) => {
      calls.push({ type, props, children });
      return { type, props, children };
    });
    const setup = component.setup as (props: object, context: object) => () => unknown;
    const render = setup({ src: './screen.xcon.json' }, { attrs: { class: 'preview' } });

    expect(render()).toEqual({
      type: 'xcon-viewer',
      props: { src: './screen.xcon.json', class: 'preview' },
      children: undefined,
    });
    expect(calls).toHaveLength(1);
  });
});

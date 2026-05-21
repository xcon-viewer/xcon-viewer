import { describe, expect, test } from 'vitest';

import xconMarkdownIt, { renderXconFence } from './index.js';

describe('@xcon-viewer/markdown-it', () => {
  test('renders XCON fences as viewer HTML', () => {
    const html = renderXconFence('{"type":"form","components":{"title":{"type":"label","text":"Hello"}}}', 'xcon-json');

    expect(html).toContain('data-xcon-markdown');
    expect(html).toContain('data-xcon-type="label"');
  });

  test('renders XCON/SKETCH fences', () => {
    const html = renderXconFence(
      'screen 360x220 bg #fff\ntitle: label "Hello Sketch" at 0 0 360 40',
      'xcon-sketch',
    );

    expect(html).toContain('data-xcon-markdown');
    expect(html).toContain('data-xcon-type="label"');
    expect(html).toContain('Hello Sketch');
  });

  test('sizes sketch fences from the screen without forcing frame scrollbars', () => {
    const html = renderXconFence(
      [
        'screen 360x220 bg #f8fafc',
        '',
        'title: label "XCON/SKETCH" at 24 24 312 36',
        '  font 24 800',
        '  align center',
        '',
        'cta: button "Render Preview" at 72 142 216 44',
        '  bg #db2777',
        '  color white',
        '  radius 12',
      ].join('\n'),
      'xcon-sketch',
    );

    expect(html).toContain('width:360px');
    expect(html).toContain('height:220px');
    expect(html).toContain('overflow:visible');
    expect(html).toContain('data-xcon-markdown style="position:relative;display:inline-block;max-width:100%;overflow:visible;vertical-align:top;box-sizing:border-box"');
    expect(html).not.toContain('class="xcon-markdown-frame" style="position:relative;box-sizing:border-box;width:360px;max-width:100%;height:220px;overflow:auto');
  });

  test('renders xcons shorthand fences', () => {
    const html = renderXconFence(
      'screen 360x220 bg #fff\ntitle: label "Hello Sketch" at 0 0 360 40',
      'xcons',
    );

    expect(html).toContain('data-xcon-type="label"');
  });

  test('renders latest XCON fence aliases with a positioned markdown frame', () => {
    const sketchHtml = renderXconFence('screen 360x220 bg #fff\ntitle: label "Alias Sketch" at 0 0 360 40', 'xcon');
    const jsonHtml = renderXconFence('{"type":"form","pos":[0,0,240,100]}', 'xconj');
    const xmlHtml = renderXconFence('<form name="root" pos="0,0,240,100"></form>', 'xconx');

    expect(sketchHtml).toContain('xcon-markdown-frame');
    expect(sketchHtml).toContain('width:360px');
    expect(sketchHtml).toContain('height:220px');
    expect(sketchHtml).toContain('Alias Sketch');
    expect(jsonHtml).toContain('data-xcon-type="form"');
    expect(xmlHtml).toContain('data-xcon-type="form"');
  });

  test('installs a markdown-it fence renderer and delegates non-XCON fences', () => {
    const md = {
      renderer: {
        rules: {
          fence: () => '<pre>fallback</pre>',
        },
      },
    };
    xconMarkdownIt(md);

    expect(md.renderer.rules.fence([{ info: 'js', content: 'const a = 1;' }], 0, {}, {}, { renderToken: () => '' })).toBe('<pre>fallback</pre>');
    expect(md.renderer.rules.fence([{ info: 'xcon-json', content: '{"type":"form"}' }], 0, {}, {}, { renderToken: () => '' })).toContain('data-xcon-type="form"');
  });

  test('works with the real markdown-it parser for tables and XCON fences', async () => {
    const { default: MarkdownIt } = await import('markdown-it');
    const md = new MarkdownIt({ html: false }).use(xconMarkdownIt, {
      containerClass: 'markdown-xcon-block',
      frameClass: 'markdown-xcon-frame',
    });

    const html = md.render([
      '| Type | Definition |',
      '| --- | --- |',
      '| `XconName` | string key |',
      '',
      '```xcon',
      'screen 320x120 bg @surface',
      'title: label "Real markdown-it" at 16 16 288 32',
      '```',
    ].join('\n'));

    expect(html).toContain('<table>');
    expect(html).toContain('<code>XconName</code>');
    expect(html).toContain('data-xcon-markdown');
    expect(html).toContain('class="markdown-xcon-frame"');
    expect(html).toContain('Real markdown-it');
  });
});

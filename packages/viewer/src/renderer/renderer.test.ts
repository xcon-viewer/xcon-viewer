import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { hydrateXconViewer, render, renderDocument, renderToHtml, sanitizeInlineStyle, sanitizeUrl, viewerCss, viewerScript } from './index.js';

describe('viewer security renderer', () => {
  test('escapes text and never emits executable event attributes', () => {
    const html = renderToHtml({
      type: 'form',
      components: {
        title: {
          type: 'button',
          label: '<script>alert(1)</script>',
          onClick: 'runAppLogic',
          backgroundColor: '#2563EB',
        },
      },
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onClick');
    expect(html).not.toContain('onclick');
  });

  test('blocks unsafe urls and external resources by default', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('https://example.com/image.png')).toBeNull();
    expect(sanitizeUrl('assets/image.png')).toBe('assets/image.png');
    expect(sanitizeUrl('https://example.com/image.png', { allowExternalResources: true })).toBe(
      'https://example.com/image.png',
    );
  });

  test('keeps only allowlisted CSS properties and drops active CSS patterns', () => {
    const style = sanitizeInlineStyle(
      'color:#111;position:fixed;background-image:url(javascript:alert(1));gap:12px;behavior:url(x)',
    );

    expect(style).toBe('color:#111;gap:12px');
  });

  test('renders @theme-token color aliases as CSS variables', () => {
    const html = renderToHtml({
      type: 'panel',
      color: '@ink',
      backgroundColor: '@surface',
      border: { visible: true, color: '@border', width: 1, radius: 8 },
      components: {
        label: { type: 'label', text: 'Token color', color: '@ink-2' },
      },
    });

    expect(html).toContain('background-color:var(--surface)');
    expect(html).toContain('color:var(--ink)');
    expect(html).toContain('border-color:var(--border)');
    expect(html).toContain('color:var(--ink-2)');
    expect(html).not.toContain('color:@');
    expect(html).not.toContain('background-color:@');
    expect(html).not.toContain('border-color:@');
  });

  test('normalizes @theme-token aliases inside sanitized inline styles', () => {
    const style = sanitizeInlineStyle('color:@ink-2;border-color:@border;background-color:@surface;box-shadow:0 0 4px @border');

    expect(style).toBe('color:var(--ink-2);border-color:var(--border);background-color:var(--surface);box-shadow:0 0 4px var(--border)');
  });

  test('renders nested public components without raw HTML injection', () => {
    const html = renderToHtml({
      type: 'form',
      pos: [0, 0, 402, 800],
      backgroundColor: '#FFFFFF',
      components: {
        card: {
          type: 'card',
          title: 'Status',
          text: '<b>Safe text</b>',
          style: 'color:#111;position:fixed',
        },
        image: {
          type: 'image',
          src: 'javascript:alert(1)',
          alt: 'Bad image',
        },
        list: {
          type: 'list',
          items: [
            { type: 'label', text: 'One' },
            { type: 'label', text: 'Two' },
          ],
        },
      },
    });

    expect(html).toContain('data-xcon-type="form"');
    expect(html).toContain('&lt;b&gt;Safe text&lt;/b&gt;');
    expect(html).toContain('style="color:#111"');
    expect(html).not.toContain('javascript:');
  });

  test('render anchors absolute root screens inside a generated host container', () => {
    class TestElement {
      readonly children: TestElement[] = [];
      readonly ownerDocument = {
        createElement: () => new TestElement(),
        createDocumentFragment: () => new TestElement(),
      };
      className = '';
      parent: TestElement | null = null;
      style = '';
      private html = '';

      constructor(readonly attributes: Record<string, string> = {}) {}

      get firstChild(): TestElement | null {
        if (this.children.length > 0) return this.children[0] ?? null;
        if (!this.html) return null;
        const child = new TestElement();
        child.innerHTML = this.html;
        child.parent = this;
        this.children.push(child);
        this.html = '';
        return child;
      }

      get innerHTML(): string {
        return this.html || this.children.map((child) => child.innerHTML).join('');
      }

      set innerHTML(value: string) {
        this.children.length = 0;
        this.html = value;
      }

      replaceChildren(): void {
        this.children.length = 0;
        this.html = '';
      }

      appendChild(child: TestElement): TestElement {
        if (child.parent) {
          const index = child.parent.children.indexOf(child);
          if (index >= 0) child.parent.children.splice(index, 1);
        }
        child.parent = this;
        this.children.push(child);
        return child;
      }

      setAttribute(name: string, value: string): void {
        this.attributes[name] = value;
      }

      querySelectorAll(): TestElement[] {
        return [];
      }
    }

    const target = new TestElement();

    const globals = globalThis as unknown as { document?: { addEventListener: () => void; querySelectorAll: () => TestElement[] } };
    const previousDocument = globals.document;
    globals.document = {
      addEventListener: () => undefined,
      querySelectorAll: () => [],
    };
    try {
      render({ type: 'form', pos: [0, 0, 360, 220] }, target as unknown as HTMLElement);

      const host = target.children[0];
      expect(host.className).toBe('xcon-viewer-host');
      expect(host.attributes['data-xcon-viewer-host']).toBe('');
      expect(host.attributes.style).toContain('position:relative');
      expect(host.attributes.style).toContain('width:360px');
      expect(host.attributes.style).toContain('height:220px');
      expect(host.innerHTML).toContain('position:absolute;left:0px;top:0px;width:360px;height:220px');
    } finally {
      globals.document = previousDocument;
    }
  });

  test('web component anchors rendered screens inside its shadow root', () => {
    const source = readFileSync(new URL('../web-component.ts', import.meta.url), 'utf8');

    expect(source).toContain(':host{display:block;contain:content;position:relative}');
    expect(source).toContain('class="xcon-viewer-host"');
    expect(source).toContain('data-xcon-viewer-host');
    expect(source).toContain('resolveRenderInput(source)');
    expect(source).toContain('xconElementFrameStyle(resolved.root)');
  });

  test('uses componentsOrder and renders array-based layout items', () => {
    const html = renderToHtml({
      type: 'form',
      components: {
        componentsOrder: 'second,first,stack',
        first: { type: 'label', text: 'First' },
        second: { type: 'label', text: 'Second' },
        stack: {
          type: 'stack',
          items: [
            { type: 'badge', text: 'A' },
            { type: 'badge', text: 'B' },
          ],
        },
      },
    });

    expect(html.indexOf('Second')).toBeLessThan(html.indexOf('First'));
    expect(html).toContain('data-xcon-type="stack"');
    expect(html).toContain('A');
    expect(html).toContain('B');
  });

  test('renders sanitized rich text when renderHtml is a string truthy value', () => {
    const html = renderToHtml(
      {
        type: 'shape',
        text: '<span class="xa-showcase-stay-logo" onclick="bad()">air<span>bnb</span></span>',
        renderHtml: 'true',
      },
      { allowHtml: true },
    );

    expect(html).toContain('<span class="xa-showcase-stay-logo">air<span>bnb</span></span>');
    expect(html).not.toContain('onclick');
  });

  test('strips unquoted event handlers from rich text', () => {
    const html = renderToHtml(
      {
        type: 'shape',
        text: '<img src=x onerror=alert(1)><a href="javascript:alert(1)">Open</a>',
        renderHtml: true,
      },
      { allowHtml: true },
    );

    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
  });

  test('renders shape gradients, effects, clip paths, and background images', () => {
    const html = renderToHtml(
      {
        type: 'panel',
        al: { direction: 'row', gap: 8 },
        components: {
          tri: {
            type: 'shape',
            shape: 'triangle',
            pos: [0, 0, 64, 56],
            background: { gradient: 'linear-gradient(180deg, red 0%, blue 100%)' },
            effects: { boxShadow: '0 8px 18px rgba(0,0,0,0.12)' },
            al: { flex: '0 0 auto' },
          },
          avatar: {
            type: 'shape',
            shape: 'circle',
            image: { src: 'https://example.com/avatar.jpg', mode: 'background', size: 'cover', position: 'center' },
            pos: [0, 0, 80, 80],
            al: { flex: '0 0 auto' },
          },
        },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('clip-path:polygon(50% 0%, 0% 100%, 100% 100%)');
    expect(html).toContain('background:linear-gradient(180deg, red 0%, blue 100%)');
    expect(html).toContain('box-shadow:0 8px 18px rgba(0,0,0,0.12)');
    expect(html).toContain('clip-path:circle(50%)');
    expect(html).toContain('background-image:url(https://example.com/avatar.jpg)');
    expect(html).toContain('background-size:cover');
    expect(html).not.toContain('width:560px');
  });

  test('renders the public shape showcase fixture with XaShape visual styles', () => {
    const doc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/p_shape.xcon.json', import.meta.url), 'utf8'));
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html).toContain('clip-path:circle(50%)');
    expect(html).toContain('clip-path:polygon(50% 0%, 0% 100%, 100% 100%)');
    expect(html).toContain('linear-gradient(145deg');
    expect(html).toContain('box-shadow:0 10px 26px rgba(0,0,0,0.14)');
    expect(html).toContain('background-image:url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&amp;q=80)');
    expect(html).toContain('<span class="xa-showcase-stay-logo">air<span>bnb</span></span>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('width:560px');
  });

  test('renders document line primitives as safe SVG lines with optional arrows and labels', () => {
    const html = renderToHtml({
      type: 'form',
      pos: [0, 0, 480, 260],
      components: {
        componentsOrder: 'rule,flow',
        rule: {
          type: 'line',
          pos: [40, 80, 360, 0],
          color: '#cbd5e1',
          width: 2,
          style: 'dashed',
        },
        flow: {
          type: 'line',
          pos: [60, 140, 300, 50],
          from: [0, 0],
          to: [300, 50],
          color: '#2563eb',
          width: 3,
          end: 'arrow',
          label: 'Message',
        },
      },
    });

    expect(html).toContain('data-xcon-type="line"');
    expect(html).toContain('data-component="line"');
    expect(html).toContain('<svg');
    expect(html).toContain('<line');
    expect(html).toContain('stroke-dasharray="6 6"');
    expect(html).toContain('marker-end="url(#');
    expect(html).toContain('Message');
    expect(html).not.toContain('<script');
  });

  test('renders anchor-based connectors between component bounds as safe SVG lines', () => {
    const html = renderToHtml({
      type: 'form',
      pos: [0, 0, 480, 260],
      components: {
        componentsOrder: 'user,agent,message',
        user: { type: 'panel', pos: [40, 98, 120, 64] },
        agent: { type: 'panel', pos: [320, 98, 120, 64] },
        message: {
          type: 'connector',
          from: { target: 'user', anchor: 'right' },
          to: { target: 'agent', anchor: 'left' },
          color: '#2563eb',
          width: 3,
          end: 'arrow',
          label: 'Message',
        },
      },
    });

    expect(html).toContain('data-xcon-type="connector"');
    expect(html).toContain('class="xa-line');
    expect(html).toContain('left:160px;top:130px;width:160px;height:0px');
    expect(html).toContain('marker-end="url(#');
    expect(html).toContain('stroke="#2563eb"');
    expect(html).toContain('Message');
    expect(html).not.toContain('<script');
  });

  test('renders recoverable SKETCH string input while reporting skipped invalid components', () => {
    const html = renderToHtml(`
      screen 320x180
        good: label "Good" at 16 16 120 28
        broken: button "Broken" 16 56 120 32
        after: button "After" at 16 104 120 36
    `);

    expect(html).toContain('Good');
    expect(html).toContain('After');
    expect(html).not.toContain('xa-al-btn__label">Broken');
    expect(html).toContain('data-xcon-diagnostics');
    expect(html).toContain('SKETCH parse warning');
    expect(html).toContain('Expected component layout');
  });

  test('renders static chart preview from SKETCH chartData with weekly decimal series', () => {
    const html = renderToHtml(`
      screen "Weekly Weather" 720x420 bg "#f8fafc"
        chartPanel: panel at 24 24 672 300
          backgroundColor "#ffffff"
          border
            visible true
            width 1
            color "#dbe4ee"
            radius 14
          weeklyTrendChart: chart at 20 64 632 196
            chartType "line"
            chartData {"labels":["목","금","토","일","월","화","수"],"datasets":[{"label":"최고 기온","data":[25.2,27,30.1,30.6,33.1,31.6,33.7],"borderColor":"#38bdf8","backgroundColor":"rgba(56,189,248,0.18)"},{"label":"강수확률","data":[98,0,10,28,39,8,18],"borderColor":"#f59e0b","backgroundColor":"rgba(245,158,11,0.16)"}]}
    `);

    expect(html).toContain('class="xa-chart-container"');
    expect(html).toContain('data-xcon-chart-type="line"');
    expect(html).toContain('data-xcon-chart-data="{&quot;labels&quot;:[&quot;목&quot;');
    expect(html).toContain('class="xa-chart-preview"');
    expect(html).toContain('<polyline');
    expect(html.match(/<polyline/g)?.length).toBe(2);
    expect(html).toContain('stroke="#38bdf8"');
    expect(html).toContain('stroke="#f59e0b"');
    expect(html).not.toContain('SKETCH parse warning');
  });

  test('renders static chart preview from simple label value chartData arrays', () => {
    const html = renderToHtml(`
      screen "Market Report" 520x320 bg "#f8fafc"
        chartPanel: panel at 24 24 452 260
          backgroundColor "#ffffff"
          weeklyChart: chart at 22 56 408 180
            chartType "bar"
            chartData [{"label":"6/8 코스피","value":-8.23,"color":"#dc2626"},{"label":"6/9 코스피","value":8.2,"color":"#059669"},{"label":"주간 리스크","value":7.5,"color":"#f59e0b"}]
    `);

    expect(html).toContain('class="xa-chart-preview"');
    expect(html).toContain('6/8 코스피');
    expect(html).toContain('6/9 코스피');
    expect(html).toContain('fill="#dc2626"');
    expect(html).toContain('fill="#059669"');
    expect(html).not.toContain('SKETCH parse warning');
  });

  test('renders advanced XaShape style, image, transform, and accessibility properties', () => {
    const html = renderToHtml(
      {
        type: 'panel',
        al: { gap: 8 },
        components: {
          contentImage: {
            type: 'shape',
            imageMode: 'content',
            src: 'https://example.com/photo.jpg',
            alt: 'Photo alt',
            imageFit: 'contain',
            imageBlur: '2px',
            imageBrightness: '0.8',
          },
          overlay: {
            type: 'shape',
            imageMode: 'overlay',
            image: 'https://example.com/overlay.png',
            imageSize: 'contain',
            imagePosition: 'top left',
            imageRepeat: 'repeat-x',
            imageOpacity: '0.35',
            imageBlendMode: 'multiply',
          },
          styled: {
            type: 'shape',
            text: 'Styled',
            gradientType: 'radial',
            gradientDirection: 'circle at 20% 30%',
            gradientColors: ['#111111', '#eeeeee'],
            gradientStops: ['0%', '100%'],
            backgroundPattern: 'grid',
            patternColor: 'rgba(0,0,0,.2)',
            borderTopLeftRadius: 8,
            borderBottomRightRadius: 12,
            textShadow: '0 1px 2px rgba(0,0,0,.3)',
            textStroke: '1px #fff',
            letterSpacing: '0.5px',
            wordSpacing: '2px',
            textOverflow: 'ellipsis',
            maxLines: 2,
            dropShadow: '0 3px 5px rgba(0,0,0,.2)',
            blur: '1px',
            brightness: '0.9',
            rotate: '12deg',
            scale: '1.2',
            translateX: '3px',
            translateY: '4px',
            transformOrigin: 'top left',
            animationName: 'pulse',
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            transitionProperty: 'opacity',
            transitionDuration: '150ms',
            cursor: 'pointer',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 3,
            ariaLabel: 'decorative styled shape',
            role: 'img',
            title: 'Shape title',
            showBounds: true,
          },
        },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('data-shape="rectangle"');
    expect(html).toContain('<img src="https://example.com/photo.jpg"');
    expect(html).toContain('alt="Photo alt"');
    expect(html).toContain('object-fit:contain');
    expect(html).toContain('filter:blur(2px) brightness(0.8)');
    expect(html).toContain('background-image:url(https://example.com/overlay.png)');
    expect(html).toContain('opacity:0.35');
    expect(html).toContain('mix-blend-mode:multiply');
    expect(html).toContain('radial-gradient(circle at 20% 30%, #111111 0%, #eeeeee 100%)');
    expect(html).toContain('linear-gradient(rgba(0,0,0,.2) 1px, transparent 1px)');
    expect(html).toContain('border-top-left-radius:8px');
    expect(html).toContain('-webkit-text-stroke:1px #fff');
    expect(html).toContain('-webkit-line-clamp:2');
    expect(html).toContain('filter:blur(1px) brightness(0.9) drop-shadow(0 3px 5px rgba(0,0,0,.2))');
    expect(html).toContain('transform:translate(3px, 4px) rotate(12deg) scale(1.2)');
    expect(html).toContain('animation:pulse 2s ease 0s infinite normal none');
    expect(html).toContain('transition:opacity 150ms ease 0s');
    expect(html).toContain('cursor:pointer');
    expect(html).toContain('user-select:none');
    expect(html).toContain('pointer-events:none');
    expect(html).toContain('z-index:3');
    expect(html).toContain('aria-label="decorative styled shape"');
    expect(html).toContain('role="img"');
    expect(html).toContain('title="Shape title"');
    expect(html).toContain('outline:2px dashed #ff0000');
  });

  test('keeps XaShape default image, star, text, and html fallback behavior aligned with draft', () => {
    const imageHtml = renderToHtml(
      {
        type: 'shape',
        src: 'https://example.com/photo.jpg',
      },
      { allowExternalResources: true },
    );
    const starHtml = renderToHtml({
      type: 'shape',
      shape: 'star',
    });
    const textHtml = renderToHtml({
      type: 'shape',
      text: 'Default text',
    });
    const emptyHtmlFallback = renderToHtml({
      type: 'shape',
      html: '',
      text: 'Fallback text',
    });

    expect(imageHtml).toContain('background-image:url(https://example.com/photo.jpg)');
    expect(imageHtml).toContain('background-size:cover');
    expect(starHtml).toContain('64.695% 29.775%');
    expect(textHtml).toContain('font-family:Arial, sans-serif');
    expect(textHtml).toContain('font-size:14px');
    expect(textHtml).toContain('font-weight:normal');
    expect(textHtml).toContain('text-align:left');
    expect(emptyHtmlFallback).toContain('Fallback text');
  });

  test('renders XaShape image animation as safe hydratable data instead of inline scripts', () => {
    const html = renderToHtml(
      {
        type: 'shape',
        imageAnimation: true,
        images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
        animationDuration: '1.5s',
        animationMode: '2',
        animationDirection: 'alternate',
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('data-xcon-shape-image-animation="true"');
    expect(html).toContain('data-xcon-shape-images="');
    expect(html).toContain('https://example.com/a.jpg');
    expect(html).toContain('background-image:url(https://example.com/a.jpg)');
    expect(html).toContain('data-xcon-shape-duration="1500"');
    expect(html).toContain('data-xcon-shape-mode="2"');
    expect(html).toContain('data-xcon-shape-direction="alternate"');
    expect(html).not.toContain('<script>');
    expect(viewerScript).toContain('hydrateShapeImageAnimations');
    expect(viewerScript).toContain('data-xcon-shape-image-animation');
  });

  test('renders public shape image slideshow group as safe hydratable data', () => {
    const html = renderToHtml(
      {
        type: 'shape',
        image: {
          mode: 'background',
          slideshow: {
            enabled: true,
            images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
            duration: 1500,
            mode: 'once',
          },
        },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('background-image:url(https://example.com/a.jpg)');
    expect(html).toContain('data-xcon-shape-image-animation="true"');
    expect(html).toContain('data-xcon-shape-duration="1500"');
    expect(html).toContain('data-xcon-shape-mode="once"');
    expect(html).toContain('https://example.com/b.jpg');
    expect(html).not.toContain('<script');
  });

  test('emits auto-layout compatibility classes and component keys', () => {
    const html = renderToHtml({
      type: 'panel',
      className: 'base-panel',
      al: { stackClass: 'xa-al-showcase-phone-frame' },
      components: {
        phone: {
          type: 'panel',
          al: { stackClass: 'xa-al-showcase-phone-scroll' },
        },
      },
    });

    expect(html).toContain('class="base-panel xa-al-panel-root"');
    expect(html).toContain('class="xa-al-panel__stack xa-al-showcase-phone-frame"');
    expect(html).toContain('data-component="panel"');
    expect(html).toContain('data-key="root~phone"');
    expect(html).toContain('xa-al-showcase-phone-scroll');
  });

  test('renders list dataTemplate rows through cell templates', () => {
    const html = renderToHtml(
      {
        type: 'list',
        direction: 'horizontal',
        itemSize: { width: 80, height: 40 },
        dataTemplate: {
          type: 'template',
          template: {
            tabledata: [{ title: 'Stay A', image: 'https://example.com/a.jpg' }],
          },
        },
        templates: {
          cell: {
            thumb: { type: 'image', src: '{{item.image}}', pos: [0, 0, 40, 40] },
            title: { type: 'label', text: '{{item.title}}', pos: [44, 0, 36, 20] },
          },
        },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('class="xa-al-xlist-root"');
    expect(html).toContain('class="xlist-content"');
    expect(html).toContain('class="xlist-item"');
    expect(html).toContain('src="https://example.com/a.jpg"');
    expect(html).toContain('Stay A');
  });

  test('renders list rows through public cellTemplate alias', () => {
    const html = renderToHtml({
      type: 'list',
      direction: 'horizontal',
      itemSize: { width: 120, height: 52 },
      dataTemplate: { type: 'template', template: { tabledata: [{ title: 'Alias Cell' }] } },
      cellTemplate: {
        title: { type: 'label', text: '{{item.title}}', pos: [0, 0, 120, 24] },
        itemSize: { width: 120, height: 52 },
      },
    });

    expect(html).toContain('Alias Cell');
    expect(html).toContain('min-width:120px');
    expect(html).toContain('height:52px');
  });

  test('renders xList horizontal orientation and row size aliases like draft XaList', () => {
    const html = renderToHtml({
      type: 'list',
      orientation: 'horizontal',
      rowWidth: 120,
      rowHeight: 50,
      separatorWidth: 12,
      dataTemplate: { type: 'template', template: { tabledata: [{ tag: 'Best' }, { tag: 'New' }] } },
      templates: {
        cell: {
          title: { type: 'label', text: '{{item.tag}}', pos: [0, 0, 120, 24] },
        },
      },
    });

    expect(html).toContain('flex-direction:row');
    expect(html).toContain('width:max-content');
    expect(html).toContain('min-width:120px');
    expect(html).toContain('width:120px');
    expect(html).toContain('height:50px');
    expect(html).toContain('margin-right:12px');
  });

  test('renders list public itemSize, separator, and offset like draft XaList', () => {
    const html = renderToHtml({
      type: 'list',
      direction: 'horizontal',
      itemSize: { width: 120, height: 50 },
      offset: [12, 8],
      separator: { size: 6 },
      dataTemplate: {
        type: 'template',
        template: { tabledata: [{ title: 'A' }, { title: 'B' }] },
      },
      templates: {
        cell: {
          title: { type: 'label', text: '{{item.title}}', pos: [0, 0, 120, 24] },
        },
      },
    });

    expect(html).toContain('display:flex;flex-direction:row;align-items:stretch;height:100%;width:max-content;margin-left:12px;margin-top:8px');
    expect(html).toContain('min-width:120px');
    expect(html).toContain('width:120px');
    expect(html).toContain('height:50px');
    expect(html).toContain('cursor:pointer');
    expect(html).toContain('margin-right:6px');
  });

  test('renders xList separator lines and showcase max-height like draft XaListAL', () => {
    const html = renderToHtml({
      type: 'list',
      xListVariant: 'showcase',
      pos: [0, 0, 560, 32],
      al: { maxHeight: '220px' },
      separator: { size: 3, color: '#E5E7EB' },
      dataTemplate: {
        type: 'template',
        template: { tabledata: [{ title: 'A' }, { title: 'B' }] },
      },
      templates: {
        cell: {
          title: { type: 'label', text: '{{item.title}}', pos: [0, 0, 120, 24] },
        },
      },
    });

    const rootTag = html.match(/<div class="xa-al-xlist-root"[^>]*>/)?.[0] ?? '';
    expect(rootTag).toContain('height:auto');
    expect(rootTag).toContain('min-height:0');
    expect(rootTag).toContain('max-height:220px');
    expect(rootTag).not.toContain('min-height:32px');
    expect(html).toContain('class="xlist-separator xlist-separator--column"');
    expect(html).toContain('height:3px');
    expect(html).toContain('background:#E5E7EB');
  });

  test('renders xList header and content height when hidenavbar is false like draft XaList', () => {
    const html = renderToHtml({
      type: 'list',
      hidenavbar: 'false',
      title: 'Products',
      dataTemplate: {
        type: 'template',
        template: { tabledata: [{ title: 'A' }, { title: 'B' }] },
      },
      templates: {
        cell: {
          title: { type: 'label', text: '{{item.title}}', pos: [0, 0, 120, 24] },
        },
      },
    });

    expect(html).toContain('data-component="xList"');
    expect(html).toContain('class="xlist-header"');
    expect(html).toContain('<span>Products</span>');
    expect(html).toContain('2개');
    expect(html).toContain('height:calc(100% - 50px)');
    expect(html.indexOf('class="xlist-header"')).toBeLessThan(html.indexOf('class="xlist-content"'));
  });

  test('renders xList _layout rows and chat layoutType variants without executable handlers', () => {
    const html = renderToHtml({
      type: 'list',
      dataTemplate: {
        type: 'template',
        template: {
          tabledata: [
            { content: 'Maintenance notice', _layout: 'noticeLayout' },
            { name: 'Studio', text: 'Can we deliver today?', image: 'avatar-studio.png', timestamp: '09:12', _layout: 'youChatLayout' },
            { name: 'You', text: 'Yes, please.', image: 'avatar-you.png', timestamp: '09:13', _layout: 'meChatLayout' },
          ],
        },
      },
      noticeLayout: {
        itemSize: { height: 56 },
        label: { type: 'label', text: '{{item.content}}', pos: [12, 12, 240, 24] },
      },
      youChatLayout: { rowHeight: 96, layoutType: 'youChat', text: '{{item.text}}', name: '{{item.name}}', image: '{{item.image}}', timestamp: '{{item.timestamp}}' },
      meChatLayout: { rowHeight: 96, layoutType: 'meChat', text: '{{item.text}}', name: '{{item.name}}', image: '{{item.image}}', timestamp: '{{item.timestamp}}' },
      templates: { cell: { label: { type: 'label', text: '{{item.content}}' } } },
    });

    expect(html).toContain('Maintenance notice');
    expect(html).toContain('min-height:56px');
    expect(html).toContain('class="xlist-chat-row xlist-chat-row--you"');
    expect(html).toContain('class="xlist-chat-row xlist-chat-row--me"');
    expect(html).toContain('<img class="xlist-chat-avatar" src="avatar-studio.png" alt="Studio">');
    expect(html).toContain('<img class="xlist-chat-avatar" src="avatar-you.png" alt="You">');
    expect(html).toContain('Can we deliver today?');
    expect(html).toContain('Yes, please.');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onmouseover');
  });

  test('renders standalone chatBubble with the same chat row chrome as xList chat layouts', () => {
    const html = renderToHtml({
      type: 'chatBubble',
      layoutType: 'meChat',
      name: 'You',
      text: '문 앞에 놔 주세요.',
      image: 'avatar-you.png',
      timestamp: '09:14',
    });

    expect(html).toContain('data-component="chatBubble"');
    expect(html).toContain('class="xlist-chat-row xlist-chat-row--me"');
    expect(html).toContain('<img class="xlist-chat-avatar" src="avatar-you.png" alt="You">');
    expect(html).toContain('문 앞에 놔 주세요.');
    expect(html).toContain('09:14');
    expect(html).not.toContain('onclick');
  });

  test('renders panel with draft auto-layout body and stack wrappers', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { gap: '8px', padding: '12px', direction: 'column', stackClass: 'phone-scroll' },
      components: {
        title: { type: 'label', text: 'Title' },
      },
    });

    expect(html).toContain('class="xa-al-panel-root"');
    expect(html).toContain('class="xa-al-panel__body"');
    expect(html).toContain('class="xa-al-panel__stack phone-scroll"');
    expect(html).toContain('gap:8px');
    expect(html).toContain('padding:12px');
    expect(html.indexOf('xa-al-panel__body')).toBeLessThan(html.indexOf('xa-al-panel__stack phone-scroll'));
  });

  test('keeps panel autoHeight body and stack sizing aligned with draft AL panels', () => {
    const html = renderToHtml({
      type: 'panel',
      pos: [0, 0, 560, 32],
      al: { autoHeight: 'true', gap: '12px', padding: '20px' },
      components: {
        title: { type: 'label', text: 'Auto height panel' },
      },
    });
    const fixture = JSON.parse(readFileSync(new URL('../../../../examples/showcase/p_panel.xcon.json', import.meta.url), 'utf8'));
    const fixtureHtml = renderToHtml(fixture, { allowExternalResources: true, allowHtml: true });

    expect(html).toContain('class="xa-al-panel__body" style="display:flex;flex-direction:column;width:100%;min-width:0;box-sizing:border-box;flex:0 0 auto;min-height:auto;overflow:hidden"');
    expect(html).toContain('class="xa-al-panel__stack" style="display:flex;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;width:100%;min-width:0;box-sizing:border-box;flex:0 0 auto;min-height:min-content;gap:12px;padding:20px"');
    expect(fixtureHtml).toContain('05 · Panel');
    expect(fixtureHtml).toContain('xa-al-showcase-hero-wrap-grid');
    expect(fixtureHtml).toContain('flex:0 0 auto;min-height:min-content');
  });

  test('keeps row auto-layout panels on one line unless wrap is explicit', () => {
    const html = renderToHtml({
      type: 'form',
      pos: [0, 0, 402, 812],
      components: {
        cta: {
          type: 'panel',
          pos: [20, 390, 362, 60],
          al: {
            direction: 'row',
            gap: 10,
            alignItems: 'stretch',
            justifyContent: 'space-between',
          },
          components: {
            componentsOrder: 'a,b,c,d',
            a: { type: 'button', label: 'A', pos: [0, 0, 78, 44] },
            b: { type: 'button', label: 'B', pos: [0, 0, 78, 44] },
            c: { type: 'button', label: 'C', pos: [0, 0, 78, 44] },
            d: { type: 'button', label: 'D', pos: [0, 0, 78, 44] },
          },
        },
        wrapped: {
          type: 'panel',
          pos: [20, 470, 362, 60],
          al: { direction: 'row', wrap: 'wrap' },
          components: {
            one: { type: 'button', label: 'One', pos: [0, 0, 78, 44] },
          },
        },
      },
    });

    expect(html).toContain('flex-direction:row;flex-wrap:nowrap;align-items:stretch;justify-content:space-between');
    expect(html).toContain('flex-direction:row;flex-wrap:wrap;align-items:stretch;justify-content:flex-start');
    expect(html).toContain('data-key="root~cta~d"');
    expect(html).toContain('width:78px;min-height:44px');
  });

  test('renders panel scrollbars, fixed height, background image, individual borders, and opacity shadow', () => {
    const html = renderToHtml(
      {
        type: 'panel',
        border: true,
        borderWidth: -1,
        borderLeft: 2,
        borderTop: 3,
        borderRight: 4,
        borderBottom: 5,
        borderColor: '1,2,3,255',
        shadow: true,
        shadowOpacity: '0.2',
        shadowBlur: 10,
        shadowRadius: 24,
        bgColor: '255,255,255,255',
        bgImage: 'https://example.com/panel.jpg',
        scroll: 'vertical',
        scrollbarVisible: 'false',
        pos: [0, 0, 320, 180],
        al: { fixedHeight: 'true', padding: 0, gap: 0 },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('xa-panel-hidden-scrollbar');
    expect(html).toContain('height:180px');
    expect(html).toContain('overflow-y:auto');
    expect(html).toContain('background-color:rgb(255 255 255 / 1)');
    expect(html).toContain('background-image:url(https://example.com/panel.jpg)');
    expect(html).toContain('border-left:2px solid rgb(1 2 3 / 1)');
    expect(html).toContain('border-top:3px solid rgb(1 2 3 / 1)');
    expect(html).toContain('border-right:4px solid rgb(1 2 3 / 1)');
    expect(html).toContain('border-bottom:5px solid rgb(1 2 3 / 1)');
    expect(html).toContain('box-shadow:0 10px 24px rgb(0 0 0 / 0.2)');
  });

  test('renders public side border objects without requiring a full border object', () => {
    const html = renderToHtml({
      type: 'panel',
      pos: [0, 0, 320, 80],
      borderTop: { visible: true, color: '@border' },
    });

    expect(html).toContain('border-top:1px solid var(--border)');
  });

  test('renders panel layer stack wrappers with per-child layer styles', () => {
    const html = renderToHtml({
      type: 'panel',
      pos: [0, 0, 320, 180],
      al: { fixedHeight: 'true', stackMode: 'layers', minHeight: '180px', padding: 0, gap: 0 },
      components: {
        bg: { type: 'panel', backgroundColor: '#fff', al: { layerZ: 1, layerPointerEvents: 'through' } },
        fg: {
          type: 'panel',
          text: 'Front',
          al: { layerZ: 20, layerPointerEvents: 'capture', layerPadding: '12px', layerJustifyContent: 'center' },
        },
      },
    });

    expect(html).toContain('class="xa-al-panel__stack xa-al-panel__stack--layers"');
    expect(html).toContain('display:grid');
    expect(html).toContain('grid-template-columns:1fr');
    expect(html).toContain('grid-template-rows:1fr');
    expect(html).toContain('class="xa-al-panel__layer"');
    expect(html).toContain('class="xa-al-panel__layer xa-al-panel__layer--pe-capture"');
    expect(html).toContain('grid-area:1/1/-1/-1');
    expect(html).toContain('z-index:1');
    expect(html).toContain('z-index:20');
    expect(html).toContain('pointer-events:none');
    expect(html).toContain('pointer-events:auto');
    expect(html).toContain('padding:12px');
  });

  test('renders form with draft auto-layout body and stack wrappers', () => {
    const html = renderToHtml({
      type: 'form',
      al: { gap: 10, padding: '16px' },
      components: {
        name: { type: 'textField', placeholder: 'Name' },
      },
    });

    expect(html).toContain('class="xa-al-form-root"');
    expect(html).toContain('class="xa-al-form__body"');
    expect(html).toContain('class="xa-al-form__stack"');
    expect(html).toContain('gap:10px');
    expect(html).toContain('padding:16px');
  });

  test('keeps fixed screens non-scrollable unless scroll is explicitly requested', () => {
    const html = renderToHtml({
      type: 'form',
      pos: [0, 0, 360, 220],
      backgroundColor: '#f8fafc',
      components: {
        title: { type: 'label', text: 'No root scrollbar', pos: [24, 24, 312, 36] },
      },
    });

    const rootTag = html.match(/<div class="xa-al-form-root"[^>]*>/)?.[0] ?? '';

    expect(rootTag).toContain('width:360px');
    expect(rootTag).toContain('height:220px');
    expect(rootTag).toContain('overflow:hidden');
    expect(rootTag).not.toContain('overflow:auto');
  });

  test('keeps child panels with internal auto-layout at their declared absolute position under fixed screens', () => {
    const html = renderToHtml({
      type: 'form',
      pos: [0, 0, 402, 812],
      components: {
        componentsOrder: 'bottomTabs',
        bottomTabs: {
          type: 'panel',
          pos: [0, 748, 402, 64],
          al: { direction: 'row', justifyContent: 'space-between', padding: '8px 10px' },
          components: {
            componentsOrder: 'tabHome',
            tabHome: {
              type: 'button',
              label: '홈',
              pos: [0, 0, 72, 48],
              layout: 'column',
              icon: { name: 'home' },
            },
          },
        },
      },
    });

    const bottomTabsTag = html.match(/<div[^>]*data-key="root~bottomTabs"[^>]*>/)?.[0] ?? '';

    expect(bottomTabsTag).toContain('position:absolute');
    expect(bottomTabsTag).toContain('left:0px');
    expect(bottomTabsTag).toContain('top:748px');
    expect(bottomTabsTag).toContain('width:402px');
    expect(bottomTabsTag).toContain('height:64px');
    expect(html).toContain('class="xa-al-panel__stack" style="display:flex;flex-direction:row');
    expect(html).toContain('data-key="root~bottomTabs~tabHome"');
  });

  test('keeps panel children coordinate-positioned when the panel itself has no auto-layout', () => {
    const html = renderToHtml({
      type: 'form',
      pos: [0, 0, 402, 812],
      components: {
        componentsOrder: 'content',
        content: {
          type: 'panel',
          pos: [0, 96, 402, 644],
          al: { direction: 'column', gap: 16, padding: '16px 20px 24px' },
          components: {
            componentsOrder: 'hero',
            hero: {
              type: 'panel',
              pos: [0, 0, 362, 156],
              backgroundColor: '@accent',
              border: { visible: false, radius: 24 },
              components: {
                componentsOrder: 'heroTitle,heroBadge',
                heroTitle: {
                  type: 'label',
                  text: '퇴근 전에 필요한 장보기',
                  pos: [24, 24, 220, 56],
                },
                heroBadge: {
                  type: 'label',
                  text: '첫 주문 3,000원 할인',
                  pos: [232, 24, 106, 28],
                },
              },
            },
          },
        },
      },
    });

    const heroStackTag = html.match(/<div class="xa-al-panel__stack" style="[^"]*position:relative[^"]*display:block[^"]*"/)?.[0] ?? '';
    const heroBadgeTag = html.match(/<div[^>]*data-key="root~content~hero~heroBadge"[^>]*>/)?.[0] ?? '';

    expect(heroStackTag).toContain('position:relative');
    expect(heroStackTag).toContain('display:block');
    expect(heroBadgeTag).toContain('position:absolute');
    expect(heroBadgeTag).toContain('left:232px');
    expect(heroBadgeTag).toContain('top:24px');
  });

  test('renders form header, scroll body, background image, and xForm data-component like XaFormAL', () => {
    const html = renderToHtml(
      {
        type: 'form',
        title: 'Settings',
        hidenavbar: 'false',
        closable: 'true',
        scroll: 'vertical',
        bgColor: '253,252,250,255',
        bgImage: 'https://example.com/form.jpg',
        al: { gap: 8, padding: 12 },
        components: { title: { type: 'label', text: 'Form body' } },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('data-component="xForm"');
    expect(html).toContain('class="xa-al-form__header"');
    expect(html).toContain('Settings');
    expect(html).toContain('class="xa-al-form__body xa-form-hidden-scrollbar"');
    expect(html).toContain('overflow-y:auto');
    expect(html).toContain('background-color:rgb(253 252 250 / 1)');
    expect(html).toContain('background-image:url(https://example.com/form.jpg)');
    expect(html).toContain('box-shadow:var(--shadow-sm, 0 2px 8px rgba(0,0,0,.08))');
    expect(html).not.toContain('onclick');
  });

  test('renders extended select, slider, switch, progress, and spinner chrome like Xa ext components', () => {
    const selectDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_select.xcon.json', import.meta.url), 'utf8'));
    const sliderDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_slider.xcon.json', import.meta.url), 'utf8'));
    const switchDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_switch.xcon.json', import.meta.url), 'utf8'));
    const progressDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_progressBar.xcon.json', import.meta.url), 'utf8'));
    const spinnerDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_spinner.xcon.json', import.meta.url), 'utf8'));

    const selectHtml = renderToHtml(selectDoc);
    const sliderHtml = renderToHtml(sliderDoc);
    const switchHtml = renderToHtml(switchDoc);
    const progressHtml = renderToHtml(progressDoc);
    const spinnerHtml = renderToHtml(spinnerDoc);
    const defaultSliderHtml = renderToHtml({ type: 'slider' });
    const defaultSpinnerHtml = renderToHtml({ type: 'spinner' });

    expect(selectHtml).toContain('xa-ext-select-host--showcase');
    expect(selectHtml).toContain('class="f-select"');
    expect(selectHtml).toContain('class="custom-select"');
    expect(selectHtml).toContain('Native Select');
    expect(selectHtml).toContain('Choose framework…');
    expect(selectHtml).toContain('value="vue" selected');
    expect(selectHtml).toContain('data-val="designer"');
    expect(selectHtml).toContain('🎨 Designer');
    expect(selectHtml).toContain('data-xcon-custom-select="true"');
    expect(selectHtml).toContain('multiple');
    expect(selectHtml).toContain('size="4"');
    expect(selectHtml).toContain('value="alpha" selected');
    expect(selectHtml).toContain('value="beta" selected');
    expect(sliderHtml).toContain('xa-ext-slider-host--showcase');
    expect(sliderHtml).toContain('class="f-range"');
    expect(sliderHtml).toContain('class="slider-value"');
    expect(sliderHtml).toContain('data-xcon-range');
    expect(sliderHtml).toContain('data-xcon-range-value-target');
    expect(sliderHtml).toContain('--fill:62.0%');
    expect(sliderHtml).toContain('--fill:65.0%');
    expect(sliderHtml).toContain('--fill:80.0%');
    expect(defaultSliderHtml).toContain('value="50"');
    expect(defaultSliderHtml).toContain('--fill:50.0%');
    expect(switchHtml).toContain('xa-ext-switch-host--showcase');
    expect(switchHtml).toContain('class="switch__track"');
    expect(switchHtml).toContain('aria-checked="true"');
    expect(switchHtml).toContain('aria-checked="false"');
    expect(switchHtml).toContain('class="switch switch--sm"');
    expect(switchHtml).toContain('class="switch switch--md"');
    expect(switchHtml).toContain('class="switch switch--lg"');
    expect(switchHtml).toContain('switch-row--control-only');
    expect(switchHtml).toContain('data-xcon-switch');
    expect(progressHtml).toContain('xa-ext-progress-host--showcase');
    expect(progressHtml).toContain('class="progress-fill progress-fill--a"');
    expect(progressHtml).toContain('progress-fill--b');
    expect(progressHtml).toContain('progress-fill--c');
    expect(progressHtml).toContain('progress-fill--d');
    expect(progressHtml).toContain('background:#6f42c1');
    expect(spinnerHtml).toContain('class="sp-ring sp-ring--sm"');
    expect(spinnerHtml).toContain('class="sp-dots xa-ext-spin-scale--md"');
    expect(spinnerHtml).toContain('--xa-spin-rgb:0, 123, 255');
    expect(spinnerHtml).toContain('data-xa-spin-kind="ring"');
    expect(defaultSpinnerHtml).toContain('--xa-spin-rgb:0, 123, 255');
    expect(defaultSpinnerHtml).toContain('display:flex;align-items:center;justify-content:center');
    expect(selectHtml + sliderHtml + switchHtml + progressHtml + spinnerHtml).not.toContain('onclick');
    expect(selectHtml + sliderHtml + switchHtml + progressHtml + spinnerHtml).not.toContain('oninput');
    expect(viewerCss).toContain('.custom-select.open .custom-select__dropdown');
    expect(viewerCss).toContain('.xa-ext-progress-host .progress-label');
    expect(viewerCss).toContain('.progress-fill--b{background:linear-gradient(90deg,var(--blue');
    expect(viewerCss).toContain('.progress-fill--c{background:linear-gradient(90deg,var(--green');
    expect(viewerCss).toContain('.progress-fill--d{background:linear-gradient(90deg,var(--ink-3');
    expect(viewerCss).toContain('animation:xa-ext-spin-ring .85s linear infinite');
    expect(viewerCss).toContain('.sp-ring--sm{width:18px;height:18px;border-width:2px}');
    expect(viewerScript).toContain('data-xcon-custom-select');
    expect(viewerScript).toContain('data-xcon-range');
    expect(viewerScript).toContain('data-xcon-switch');
  });

  test('keeps select CSS and label wiring aligned with draft XaSelect', () => {
    const singleHtml = renderToHtml({
      type: 'select',
      nativeLabel: 'Framework',
      placeholder: 'Pick one…',
      options: ['React', 'Vue'],
      value: 'Vue',
    });
    const showcaseHtml = renderToHtml({
      type: 'select',
      variant: 'showcase',
      nativeLabel: 'Native Select',
      customLabel: 'Custom Select',
      options: ['React', 'Vue'],
      value: 'vue',
      customValue: 'designer',
    });

    expect(singleHtml).toContain('<label class="f-label" for="xcon_root">Framework</label>');
    expect(showcaseHtml).toContain('<label class="f-label" for="xcon_root_native">Native Select</label>');
    expect(showcaseHtml).toContain('id="xcon_root_customRoot"');
    expect(showcaseHtml).toContain('id="xcon_root_csTrigger"');
    expect(showcaseHtml).toContain('id="xcon_root_csValue"');
    expect(showcaseHtml).toContain('id="xcon_root_csDropdown"');
    expect(viewerCss).toContain('--shadow:0 4px 16px rgba(60,45,25,.1),0 2px 6px rgba(60,45,25,.06)');
    expect(viewerCss).toContain('select.f-select{width:100%;appearance:none;-webkit-appearance:none;background:var(--surface2);border:1px solid var(--border2)');
    expect(viewerCss).toContain('padding:10px 40px 10px 14px');
    expect(viewerCss).toContain('.f-select-arrow{position:absolute;right:14px');
    expect(viewerCss).toContain('.f-select-arrow svg{display:block;width:14px;height:14px');
    expect(viewerCss).toContain('.f-select option{background:var(--surface2)}');
    expect(viewerCss).toContain('.custom-select.open{z-index:var(--xa-z-dropdown,60000);isolation:isolate}');
    expect(viewerCss).toContain('.custom-select__trigger{display:flex;align-items:center;justify-content:space-between;background:var(--surface2);border:1px solid var(--border2)');
    expect(viewerCss).toContain('.custom-select__dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:calc(var(--xa-z-dropdown,60000) + 1);background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r-sm);overflow:hidden;box-shadow:var(--shadow)');
    expect(viewerCss).toContain('.custom-select.open .custom-select__dropdown{opacity:1;transform:translateY(0);pointer-events:all}');
    expect(viewerCss).toContain('.xa-al-panel-root:has(.custom-select.open){overflow:visible!important;z-index:var(--xa-z-panel-elevated,100)}');
  });

  test('keeps select default label and placeholder aligned with draft XaSelect', () => {
    const html = renderToHtml({
      type: 'select',
      options: ['React', 'Vue'],
    });

    expect(html).toContain('<label class="f-label" for="xcon_root">Native Select</label>');
    expect(html).toContain('<option value="" selected disabled>선택하세요</option>');
  });

  test('renders select chevrons and prefers public labels and variants over legacy aliases', () => {
    const showcaseHtml = renderToHtml({
      type: 'select',
      variant: 'showcase',
      options: ['React', 'Vue'],
      customValue: 'designer',
    });
    const publicPrecedenceHtml = renderToHtml({
      type: 'select',
      variant: 'native',
      extVariant: 'showcase',
      label: 'Public Label',
      nativeLabel: 'Legacy Label',
      options: ['React'],
    });

    expect(showcaseHtml).toContain('<span class="f-select-arrow" aria-hidden="true"><svg');
    expect(showcaseHtml).toContain('id="xcon_root_csTrigger" role="button" tabindex="0" data-xcon-custom-select-trigger><span');
    expect(showcaseHtml).toContain('</span><svg');
    expect(publicPrecedenceHtml).toContain('<label class="f-label" for="xcon_root">Public Label</label>');
    expect(publicPrecedenceHtml).not.toContain('Legacy Label');
    expect(publicPrecedenceHtml).not.toContain('custom-select');
  });

  test('keeps slider CSS and value wiring aligned with draft XaSlider', () => {
    const singleHtml = renderToHtml({
      type: 'slider',
      label: 'Brightness',
      min: 0,
      max: 100,
      value: 72,
      showValue: true,
    });
    const hiddenValueHtml = renderToHtml({
      type: 'slider',
      min: 0,
      max: 100,
      value: 40,
      showValue: false,
    });
    const showcaseHtml = renderToHtml({
      type: 'slider',
      extVariant: 'showcase',
      min: 0,
      max: 100,
      value: 62,
      showValue: true,
    });

    expect(singleHtml).toContain('<label class="f-label" for="xcon_root~rng">Brightness</label>');
    expect(singleHtml).toContain('<div class="slider-value" id="xcon_root~sv">72</div>');
    expect(singleHtml).toContain('id="xcon_root~rng"');
    expect(singleHtml).toContain('data-xcon-range-value-target="xcon_root~sv"');
    expect(hiddenValueHtml).toContain('id="xcon_root~rng"');
    expect(hiddenValueHtml).not.toContain('class="slider-value"');
    expect(hiddenValueHtml).not.toContain('data-xcon-range-value-target');
    expect(showcaseHtml).toContain('id="xcon_root~vol"');
    expect(showcaseHtml).toContain('id="xcon_root~op"');
    expect(viewerCss).toContain('.xa-ext-slider-host .f-label{display:block;font-size:12px;font-weight:500;color:var(--ink-2);margin-bottom:6px;letter-spacing:.3px}');
    expect(viewerCss).toContain('.xa-ext-slider-host .slider-value{text-align:center;font-family:"JetBrains Mono","Syne Mono",monospace;font-size:22px;font-weight:600;color:var(--ink);margin-bottom:8px}');
    expect(viewerCss).toContain('.xa-ext-slider-host .slider-wrap{width:100%;min-width:0;padding:8px 0}');
    expect(viewerCss).toContain('.xa-ext-slider-host .f-range{appearance:none;-webkit-appearance:none;width:100%;height:4px;background:var(--border2);border-radius:4px;outline:none;cursor:pointer;--fill:40%;background:linear-gradient(to right,var(--accent) var(--fill),var(--border2) var(--fill))}');
    expect(viewerCss).toContain('.xa-ext-slider-host .f-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--ink);border:2px solid var(--accent);cursor:grab;transition:transform .15s,box-shadow .15s;box-shadow:0 0 0 0 rgba(var(--accent-rgb),0)}');
    expect(viewerCss).toContain('.xa-ext-slider-host .f-range::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.2);box-shadow:0 0 0 6px rgba(var(--accent-rgb),.25)}');
    expect(viewerCss).toContain('.xa-ext-slider-host .slider-labels{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3);margin-top:6px}');
  });

  test('keeps switch structure and sizing aligned with draft XaSwitch', () => {
    const singleHtml = renderToHtml({
      type: 'switch',
      checked: true,
      size: 'medium',
      title: 'Dark Mode',
      subtitle: 'Use dark color scheme',
      labels: { on: '켜짐', off: '꺼짐' },
    });
    const controlOnlyHtml = renderToHtml({ type: 'switch', checked: false });
    const showcaseHtml = renderToHtml({
      type: 'switch',
      extVariant: 'showcase',
      checked: true,
      size: 'medium',
    });

    expect(singleHtml).toContain('class="switch-row"');
    expect(singleHtml).toContain('<p>Dark Mode</p><small>Use dark color scheme</small>');
    expect(singleHtml).toContain('<label class="switch switch--md"><input type="checkbox" id="xcon_root" role="switch" checked aria-checked="true" aria-label="켜짐" data-xcon-switch><span class="switch__track"></span></label>');
    expect(controlOnlyHtml).toContain('class="switch-row switch-row--control-only"');
    expect(showcaseHtml).toContain('id="xcon_root~sw1"');
    expect(showcaseHtml).toContain('id="xcon_root~sw2"');
    expect(showcaseHtml).toContain('id="xcon_root~sw3"');
    expect(showcaseHtml).toContain('id="xcon_root~sw4"');
    expect(viewerCss).toContain('.xa-ext-switch-host--showcase{display:flex;flex-direction:column;gap:0}');
    expect(viewerCss).toContain('.xa-ext-switch-host .switch-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid var(--border);width:100%;box-sizing:border-box}');
    expect(viewerCss).toContain('.xa-ext-switch-host .switch-row--control-only{justify-content:flex-end;border-bottom:none;padding:8px 0}');
    expect(viewerCss).toContain('.xa-ext-switch-host .switch-info{flex:1;min-width:0}.xa-ext-switch-host .switch-info p{margin:0;font-size:13px;font-weight:500;color:var(--ink)}');
    expect(viewerCss).toContain('.xa-ext-switch-host .switch{position:relative;flex-shrink:0}');
    expect(viewerCss).toContain('.xa-ext-switch-host .switch__track{position:absolute;inset:0;border-radius:999px;background:var(--surface2);border:1px solid var(--border2);cursor:pointer;transition:background .25s,border-color .25s;box-sizing:border-box}');
    expect(viewerCss).toContain('.xa-ext-switch-host .switch input:checked~.switch__track{background:var(--accent);border-color:var(--accent)}');
    expect(viewerCss).toContain('.xa-ext-switch-host .switch.switch--sm{width:36px;height:20px}');
    expect(viewerCss).toContain('.xa-ext-switch-host .switch.switch--lg{width:52px;height:28px}');
  });

  test('prefers public switch labels over legacy onText and offText aliases', () => {
    const checkedHtml = renderToHtml({
      type: 'switch',
      checked: true,
      labels: { on: 'Public On', off: 'Public Off' },
      onText: 'Legacy On',
      offText: 'Legacy Off',
    });
    const uncheckedHtml = renderToHtml({
      type: 'switch',
      checked: false,
      labels: { on: 'Public On', off: 'Public Off' },
      onText: 'Legacy On',
      offText: 'Legacy Off',
    });

    expect(checkedHtml).toContain('aria-label="Public On"');
    expect(uncheckedHtml).toContain('aria-label="Public Off"');
    expect(checkedHtml + uncheckedHtml).not.toContain('Legacy On');
    expect(checkedHtml + uncheckedHtml).not.toContain('Legacy Off');
  });

  test('keeps progressBar public label and variant precedence with track styling aligned to XaProgressBar', () => {
    const singleHtml = renderToHtml({
      type: 'progressBar',
      value: 40,
      max: 80,
      label: 'Build',
      progressLabel: 'Legacy Build',
      variant: 'default',
      progressFillVariant: 'c',
      color: '#123456',
      backgroundColor: '#eeeeee',
      animated: true,
    });
    const hiddenLabelHtml = renderToHtml({
      type: 'progressBar',
      value: 25,
      max: 100,
      showText: false,
    });
    const showcaseHtml = renderToHtml({
      type: 'progressBar',
      extVariant: 'showcase',
      showText: false,
      animated: true,
    });

    expect(singleHtml).toContain('<div class="progress-label"><span>Build</span><span>50%</span></div>');
    expect(singleHtml).toContain('<div class="progress-track xa-ext-progress-stripes" style="background:#eeeeee">');
    expect(singleHtml).toContain('<div class="progress-fill progress-fill--a" style="width:50%;background:#123456"></div>');
    expect(hiddenLabelHtml).not.toContain('class="progress-label"');
    expect(showcaseHtml.match(/class="progress-label"/g)?.length ?? 0).toBe(4);
    expect(showcaseHtml).toContain('<span>Design</span><span>87%</span>');
    expect(showcaseHtml).toContain('class="progress-track xa-ext-progress-stripes"');
    expect(viewerCss).toContain('.xa-ext-progress-host .progress-label{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;font-size:12px;font-weight:600;color:var(--ink-2,#6b5f4e)}');
    expect(viewerCss).toContain('.xa-ext-progress-host .progress-label span:last-child{font-variant-numeric:tabular-nums;color:var(--ink,#1c1710)}');
    expect(viewerCss).toContain('.xa-ext-progress-host .progress-track{position:relative;width:100%;height:8px;border-radius:999px;background:var(--surface2,#f2ede5);overflow:hidden;box-sizing:border-box}');
    expect(viewerCss).toContain('.xa-ext-progress-host .progress-fill--a{background:linear-gradient(90deg,var(--accent,#c4622d) 0%,var(--accent-gradient-end,#e88b5a) 100%)}');
    expect(viewerCss).toContain('.xa-ext-progress-host .progress-fill--d{background:linear-gradient(90deg,var(--ink-3,#a8998a) 0%,var(--border2,rgba(60,45,25,.18)) 100%)}');
  });

  test('prefers public prop names over migrated legacy aliases in single renderers', () => {
    const sliderHtml = renderToHtml({
      type: 'slider',
      label: '공개 라벨',
      sliderLabel: '레거시 라벨',
      showLabels: false,
      showSliderLabels: true,
    });
    const switchHtml = renderToHtml({
      type: 'switch',
      title: '공개 제목',
      switchTitle: '레거시 제목',
      subtitle: '공개 설명',
      switchSubtitle: '레거시 설명',
    });
    const alertHtml = renderToHtml({
      type: 'alert',
      severity: 'success',
      alertType: 'error',
      title: '완료',
      message: '저장되었습니다.',
    });
    const modalHtml = renderToHtml({
      type: 'modal',
      title: '확인',
      text: '공개 본문',
      content: '레거시 본문',
    });
    const avatarHtml = renderToHtml({
      type: 'avatar',
      initials: 'AB',
      color: '#111111',
      textColor: '#ffffff',
    });
    const buttonHtml = renderToHtml({
      type: 'button',
      label: '링크',
      appearance: 'link',
      buttonAppearance: 'filled',
      layout: 'column',
      alButtonLayout: 'row',
    });
    const bannerHtml = renderToHtml({
      type: 'banner',
      direction: 'vertical',
      orientation: 'horizontal',
      variant: 'landing',
      bannerChrome: 'default',
      slides: ['A', 'B'],
    });

    expect(sliderHtml).toContain('>공개 라벨</label>');
    expect(sliderHtml).not.toContain('class="slider-labels"');
    expect(switchHtml).toContain('<p>공개 제목</p>');
    expect(switchHtml).toContain('<small>공개 설명</small>');
    expect(alertHtml).toContain('class="alert alert--success"');
    expect(modalHtml).toContain('<div class="modal-body">공개 본문</div>');
    expect(avatarHtml).toContain('color:#111111');
    expect(buttonHtml).toContain('xa-al-btn--link');
    expect(buttonHtml).toContain('xa-al-btn--stack-col');
    expect(bannerHtml).toContain('data-orientation="vertical"');
    expect(bannerHtml).toContain('data-banner-chrome="landing"');
  });

  test('keeps spinner color scoped to XaSpinner CSS variables', () => {
    const singleHtml = renderToHtml({
      type: 'spinner',
      variant: 'dots',
      size: 'large',
      color: '0,123,255,255',
    });
    const showcaseHtml = renderToHtml({
      type: 'spinner',
      extVariant: 'showcase',
      color: '#db2777',
    });

    expect(singleHtml).toContain('--xa-spin-rgb:0, 123, 255');
    expect(singleHtml).not.toContain('color:rgb(0 123 255 / 1)');
    expect(singleHtml).toContain('data-xa-spin-kind="dots"');
    expect(singleHtml).toContain('class="sp-dots xa-ext-spin-scale--lg"');
    expect(showcaseHtml).toContain('style="--xa-spin-rgb:219, 39, 119"');
    expect(showcaseHtml).not.toContain('color:#db2777');
    expect(showcaseHtml.match(/class="spinner-item"/g)?.length ?? 0).toBe(6);
    expect(viewerCss).toContain('[data-component="spinner"] .spinners-row,.xa-ext-spinner-host .spinners-row{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:flex-start;gap:14px 18px;width:100%;min-height:min-content;box-sizing:border-box}');
    expect(viewerCss).toContain('[data-component="spinner"] .spinner-label,.xa-ext-spinner-host .spinner-label{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3,#a8998a)}');
    expect(viewerCss).toContain('[data-component="spinner"] .sp-ring,.xa-ext-spinner-host .sp-ring{display:inline-block;box-sizing:border-box;border-radius:50%;border-style:solid;border-color:rgb(var(--xa-spin-rgb,0,123,255) / .22);border-top-color:rgb(var(--xa-spin-rgb,0,123,255) / 1);animation:xa-ext-spin-ring .85s linear infinite}');
    expect(viewerCss).toContain('[data-component="spinner"] .sp-bars span:nth-child(4),.xa-ext-spinner-host .sp-bars span:nth-child(4){animation-delay:.3s}');
  });

  test('keeps badge palette, sizing, and single badge behavior aligned with draft XaBadge', () => {
    const showcaseHtml = renderToHtml({
      type: 'badge',
      extVariant: 'showcase',
    });
    const customColorHtml = renderToHtml({
      type: 'badge',
      text: 'Beta',
      variant: 'filled',
      color: '#7c6af7',
    });
    const customBackgroundHtml = renderToHtml({
      type: 'badge',
      text: 'Launch',
      variant: 'filled',
      backgroundColor: '#111827',
      size: 'large',
    });
    const outlineDefaultHtml = renderToHtml({
      type: 'badge',
      text: 'Default',
      variant: 'outline',
    });
    const defaultHtml = renderToHtml({ type: 'badge' });

    expect(showcaseHtml).toContain('class="bdg bdg-purple">Purple</span>');
    expect(showcaseHtml).toContain('class="bdg bdg-outline bdg--dot">Offline</span>');
    expect(showcaseHtml).toContain('<span class="notif-count">99+</span>');
    expect(customColorHtml).toContain('<span class="bdg bdg-outline" style="color:#7c6af7;border-color:#7c6af7">Beta</span>');
    expect(customBackgroundHtml).toContain('<span class="bdg" style="font-size:13px;padding:5px 12px;background:#111827;color:#fff;border:1px solid transparent">Launch</span>');
    expect(outlineDefaultHtml).toContain('<span class="bdg bdg-outline" style="color:#dc3545;border-color:#dc3545">Default</span>');
    expect(defaultHtml).toContain('<span class="bdg bdg-red"></span>');
    expect(viewerCss).toContain('.bdg{display:inline-flex;align-items:center;gap:5px;border-radius:20px;font-size:11px;font-weight:600;padding:3px 10px;letter-spacing:.3px}');
    expect(viewerCss).toContain('.bdg-purple{background:rgba(var(--accent-rgb),.18);color:var(--accent-2);border:1px solid rgba(var(--accent-rgb),.25)}');
    expect(viewerCss).toContain('.bdg-green{background:rgba(52,211,153,.15);color:var(--green);border:1px solid rgba(52,211,153,.25)}');
    expect(viewerCss).toContain('.bdg--dot::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}');
    expect(viewerCss).toContain('.notif-icon-btn{width:40px;height:40px;border-radius:10px;background:var(--surface2);border:1px solid var(--border2)');
    expect(viewerCss).toContain('.notif-count{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--red);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid var(--surface)}');
  });

  test('keeps avatar defaults and image sizing aligned with draft XaAvatar', () => {
    const defaultHtml = renderToHtml({ type: 'avatar' });
    const roundedHtml = renderToHtml({
      type: 'avatar',
      initials: 'XA',
      shape: 'rounded',
      backgroundColor: '#7c6af7',
      color: '#fff',
    });
    const imageHtml = renderToHtml({
      type: 'avatar',
      src: 'https://i.pravatar.cc/128?img=33',
      alt: 'User',
      size: 'large',
      shape: 'square',
    }, { allowExternalResources: true });

    expect(defaultHtml).toContain('<div class="av__initials av__initials--md" style="background:#6c757d;color:white;border-radius:50%">👤</div>');
    expect(roundedHtml).toContain('<div class="av__initials av__initials--md" style="background:#7c6af7;color:#fff;border-radius:8px">XA</div>');
    expect(imageHtml).toContain('<img class="av__img av__img--lg" src="https://i.pravatar.cc/128?img=33" alt="User" style="border-radius:0">');
    expect(viewerCss).toContain('.av__img{border-radius:50%;object-fit:cover;display:block;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);border:2px solid var(--surface)}');
    expect(viewerCss).not.toContain('.av__img{border-radius:50%;object-fit:cover;display:block;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);border:2px solid var(--surface);box-sizing:border-box}');
    expect(viewerCss).toContain('.av__initials{border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"Syne",sans-serif;font-weight:700;color:#fff;font-size:14px;box-sizing:border-box}');
  });

  test('keeps single rating markup and sizing aligned with draft XaRating', () => {
    const interactiveHtml = renderToHtml({
      type: 'rating',
      value: 3,
      max: 5,
      showValue: true,
      readonly: false,
      size: 'large',
    });
    const readonlyHtml = renderToHtml({
      type: 'rating',
      value: 2,
      max: 5,
      readonly: true,
      size: 'small',
      icons: {
        filled: '♥',
        empty: '♡',
      },
    });

    expect(interactiveHtml).toContain('<div class="rating-stars" data-value="3" data-xcon-rating-group="single" data-xcon-rating-value="3" style="display:flex;align-items:center;gap:2px;">');
    expect(interactiveHtml).toContain('<span class="rating-star" data-rating="1" data-v="1" data-xcon-rating-star role="button" tabindex="0" style="font-size:32px;cursor:pointer;color:#ffc107;transition:color .2s ease;">⭐</span>');
    expect(interactiveHtml).toContain('<span class="rating-score" data-xcon-rating-score>3/5</span>');
    expect(readonlyHtml).toContain('<div class="rating-stars" data-value="2" style="display:flex;align-items:center;gap:2px;">');
    expect(readonlyHtml).toContain('<span class="rating-star" data-rating="1" data-v="1" style="font-size:16px;cursor:default;color:#ffc107;transition:color .2s ease;">♥</span>');
    expect(readonlyHtml).toContain('<span class="rating-star" data-rating="3" data-v="3" style="font-size:16px;cursor:default;color:#e9ecef;transition:color .2s ease;">♡</span>');
    expect(readonlyHtml).not.toContain('data-xcon-rating-group="single"');
    expect(interactiveHtml + readonlyHtml).not.toContain('onclick');
    expect(interactiveHtml + readonlyHtml).not.toContain('onmouseover');
  });

  test('keeps single card markup aligned with draft XaCard', () => {
    const imageHtml = renderToHtml({
      type: 'card',
      title: '카드 제목',
      subtitle: '부제목',
      text: '설명 텍스트가 들어갑니다.',
      image: 'https://picsum.photos/seed/algal1/400/240',
      padding: '16px',
    }, { allowExternalResources: true });
    const textOnlyHtml = renderToHtml({
      type: 'card',
      title: 'Notice',
      shadow: false,
      border: true,
      content: 'border·shadow 옵션을 조정한 카드입니다.',
    });

    expect(imageHtml).toContain('class="xa-ext-card-host xa-ext-card-host--single"');
    expect(imageHtml).toContain('<div class="card" style="background-color:white;border-radius:8px;overflow:hidden;width:100%;height:100%;display:flex;flex-direction:column;box-shadow:0 2px 4px rgba(0,0,0,.1);border:1px solid #ddd">');
    expect(imageHtml).toContain('<div class="card-image" style="width:100%;height:200px;overflow:hidden;"><img src="https://picsum.photos/seed/algal1/400/240" alt="" style="width:100%;height:100%;object-fit:cover;"></div>');
    expect(imageHtml).toContain('<h3 class="card-title" style="margin:0 0 8px 0;font-size:18px;font-weight:bold;">카드 제목</h3>');
    expect(imageHtml).toContain('<p class="card-subtitle" style="margin:0 0 12px 0;font-size:14px;color:#666;">부제목</p>');
    expect(imageHtml).toContain('<div class="card-content" style="font-size:14px;line-height:1.5;">설명 텍스트가 들어갑니다.</div>');
    expect(imageHtml).not.toContain('ui-card__title');
    expect(textOnlyHtml).toContain('<div class="card" style="background-color:white;border-radius:8px;overflow:hidden;width:100%;height:100%;display:flex;flex-direction:column;border:1px solid #ddd">');
    expect(textOnlyHtml).not.toContain('box-shadow:0 2px 4px');
  });

  test('normalizes public numeric card padding to CSS pixels', () => {
    const html = renderToHtml({
      type: 'card',
      title: 'Pro Plan',
      text: '무제한 프로젝트',
      padding: 16,
    });

    expect(html).toContain('class="card-body"');
    expect(html).toContain('padding:16px;flex:1');
    expect(html).not.toContain('padding:16;');
  });

  test('keeps single tabs container, layout aliases, and content panes aligned with draft XaTabs', () => {
    const html = renderToHtml({
      type: 'tabs',
      variant: 'underline',
      tabsLayout: 'center',
      activeIndex: 1,
      items: [
        { title: 'Docs', content: '문서 탭' },
        { title: 'API', content: 'API 레퍼런스' },
      ],
    });

    expect(html).toContain('data-tabs-variant="underline" data-tabs-position="top"');
    expect(html).toContain('<div class="tabs-container tabs-position-top" style="display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;">');
    expect(html).toContain('<div class="tabs-header tabs-header-underline tabs-header-layout-center" style="display:flex;flex-direction:row;flex-shrink:0;border-bottom:1px solid #e5e7eb;width:100%;justify-content:center;">');
    expect(html).toContain('<div class="tab-header tab-header-underline tab-header-layout-center" data-tab="root~content~0" data-xcon-tabs-single-tab aria-selected="false" style="padding:8px 16px;cursor:pointer;display:inline-block;border:none;border-bottom:2px solid transparent;background-color:transparent;color:#6b7280;margin-bottom:-1px;border-radius:0;">Docs</div>');
    expect(html).toContain('<div class="tab-header tab-header-underline tab-header-layout-center active" data-tab="root~content~1" data-xcon-tabs-single-tab aria-selected="true" style="padding:8px 16px;cursor:pointer;display:inline-block;border:none;border-bottom:2px solid #007bff;background-color:transparent;color:#007bff;margin-bottom:-1px;border-radius:0;">API</div>');
    expect(html).toContain('<div class="tabs-content" style="flex:1;min-width:0;min-height:0;position:relative;overflow:hidden;">');
    expect(html).toContain('<div class="tab-content" id="root~content~1" style="display:block;padding:16px;border:1px solid #ddd;border-top:none;background-color:white">API 레퍼런스</div>');
    expect(html).not.toContain('onclick');
  });

  test('keeps single tabs public activeId and position properties aligned with the spec', () => {
    const html = renderToHtml({
      type: 'tabs',
      variant: 'pills',
      tabsLayout: 'full',
      activeId: 'logs',
      position: 'bottom',
      items: [
        { id: 'overview', label: '개요', content: 'Overview panel' },
        { id: 'logs', label: '로그', content: 'Logs panel' },
      ],
    });

    expect(html).toContain('data-tabs-variant="pills" data-tabs-position="bottom"');
    expect(html).toContain('<div class="tabs-container tabs-position-bottom" style="display:flex;flex-direction:column-reverse;width:100%;height:100%;overflow:hidden;">');
    expect(html).toContain('<div class="tab-header tab-header-pills tab-header-layout-full" data-tab="root~content~0" data-xcon-tabs-single-tab aria-selected="false"');
    expect(html).toContain('<div class="tab-header tab-header-pills tab-header-layout-full active" data-tab="root~content~1" data-xcon-tabs-single-tab aria-selected="true"');
    expect(html).toContain('<div class="tab-content" id="root~content~0" style="display:none;padding:16px;border:1px solid #ddd;border-bottom:none;background-color:white">Overview panel</div>');
    expect(html).toContain('<div class="tab-content" id="root~content~1" style="display:block;padding:16px;border:1px solid #ddd;border-bottom:none;background-color:white">Logs panel</div>');
  });

  test('updates single tabs inline visual state on click like draft XaTabs', () => {
    class TestClassList {
      private readonly names = new Set<string>();

      constructor(initial = '') {
        for (const name of initial.split(/\s+/).filter(Boolean)) this.names.add(name);
      }

      contains(name: string): boolean {
        return this.names.has(name);
      }

      toggle(name: string, force?: boolean): boolean {
        const next = force ?? !this.names.has(name);
        if (next) this.names.add(name);
        else this.names.delete(name);
        return next;
      }
    }

    class TestElement {
      readonly children: TestElement[] = [];
      readonly classList: TestClassList;
      readonly dataset: Record<string, string> = {};
      readonly style: Record<string, string> = {};
      readonly listeners: Record<string, Array<() => void>> = {};
      parentElement: TestElement | null = null;
      id = '';

      constructor(readonly attributes: Record<string, string> = {}) {
        this.classList = new TestClassList(attributes.class ?? '');
        this.id = attributes.id ?? '';
      }

      append(child: TestElement): TestElement {
        child.parentElement = this;
        this.children.push(child);
        return child;
      }

      getAttribute(name: string): string | null {
        return this.attributes[name] ?? null;
      }

      setAttribute(name: string, value: string): void {
        this.attributes[name] = value;
      }

      addEventListener(type: string, listener: () => void): void {
        this.listeners[type] ??= [];
        this.listeners[type].push(listener);
      }

      click(): void {
        for (const listener of this.listeners.click ?? []) listener();
      }

      closest(selector: string): TestElement | null {
        if (!selector.startsWith('.')) return null;
        const className = selector.slice(1);
        for (let node: TestElement | null = this; node; node = node.parentElement) {
          if (node.classList.contains(className)) return node;
        }
        return null;
      }

      querySelectorAll(selector: string): TestElement[] {
        const descendants: TestElement[] = [];
        const walk = (node: TestElement): void => {
          for (const child of node.children) {
            descendants.push(child);
            walk(child);
          }
        };
        walk(this);
        if (selector === '.tabs-header') return descendants.filter((node) => node.classList.contains('tabs-header'));
        if (selector === '[data-xcon-tabs-single-tab]') {
          return descendants.filter((node) => Object.prototype.hasOwnProperty.call(node.attributes, 'data-xcon-tabs-single-tab'));
        }
        if (selector === '.tabs-content .tab-content') {
          return descendants.filter((node) => node.classList.contains('tab-content') && Boolean(node.closest('.tabs-content')));
        }
        return [];
      }
    }

    const root = new TestElement();
    const container = root.append(new TestElement({ class: 'tabs-container tabs-position-top' }));
    const header = container.append(new TestElement({ class: 'tabs-header tabs-header-default tabs-header-layout-auto' }));
    const first = header.append(new TestElement({ class: 'tab-header active', 'data-xcon-tabs-single-tab': '', 'data-tab': 'root~content~0' }));
    const second = header.append(new TestElement({ class: 'tab-header', 'data-xcon-tabs-single-tab': '', 'data-tab': 'root~content~1' }));
    const content = container.append(new TestElement({ class: 'tabs-content' }));
    const firstPanel = content.append(new TestElement({ class: 'tab-content', id: 'root~content~0' }));
    const secondPanel = content.append(new TestElement({ class: 'tab-content', id: 'root~content~1' }));
    first.style.backgroundColor = '#007bff';
    first.style.color = 'white';
    first.style.border = '1px solid #ddd';
    first.style.borderRadius = '4px 4px 0 0';
    second.style.backgroundColor = '#f8f9fa';
    second.style.color = '#333';
    firstPanel.style.display = 'block';
    secondPanel.style.display = 'none';

    const previousDocument = globalThis.document;
    const previousNode = globalThis.Node;
    (globalThis as unknown as { document: unknown }).document = {
      addEventListener: () => {},
      querySelectorAll: () => [],
    };
    (globalThis as unknown as { Node: unknown }).Node = TestElement;
    try {
      hydrateXconViewer(root as unknown as ParentNode);
      second.click();
    } finally {
      (globalThis as unknown as { document: unknown }).document = previousDocument;
      (globalThis as unknown as { Node: unknown }).Node = previousNode;
    }

    expect(first.classList.contains('active')).toBe(false);
    expect(second.classList.contains('active')).toBe(true);
    expect(first.getAttribute('aria-selected')).toBe('false');
    expect(second.getAttribute('aria-selected')).toBe('true');
    expect(first.style.backgroundColor).toBe('#f8f9fa');
    expect(first.style.color).toBe('#333');
    expect(second.style.backgroundColor).toBe('#007bff');
    expect(second.style.color).toBe('white');
    expect(firstPanel.style.display).toBe('none');
    expect(secondPanel.style.display).toBe('block');
  });

  test('keeps single accordion container, headers, and content panes aligned with draft XaAccordion', () => {
    const html = renderToHtml({
      type: 'accordion',
      multiple: false,
      defaultOpen: [0],
      items: [
        { title: '첫 번째', content: '첫 패널 내용입니다.' },
        { title: '두 번째', content: '두 번째 패널입니다.' },
      ],
    });

    expect(html).toContain('class="xa-ext-accordion-host xa-ext-accordion-host--single"');
    expect(html).toContain('<div class="accordion-container" style="border-radius:4px;overflow:hidden;">');
    expect(html).toContain('<div class="accordion-item" style="border:1px solid #e9ecef;border-bottom:none;">');
    expect(html).toContain('class="accordion-header" data-xcon-accordion-toggle data-xcon-accordion-index="0" data-xcon-accordion-multiple="false" aria-expanded="true"');
    expect(html).toContain('style="padding:12px 16px;background-color:#f8f9fa;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9ecef;"');
    expect(html).toContain('<span style="font-weight:500;">첫 번째</span>');
    expect(html).toContain('<span class="accordion-arrow" style="transition:transform .3s ease;transform:rotate(90deg);">▶</span>');
    expect(html).toContain('<div class="accordion-content" id="root~content~0" style="display:block;padding:16px;background-color:white;">첫 패널 내용입니다.</div>');
    expect(html).toContain('<div class="accordion-item" style="border:1px solid #e9ecef;border-bottom:1px solid #e9ecef;">');
    expect(html).not.toContain('class="accordion-trigger');
    expect(html).not.toContain('onclick');
    expect(viewerScript).toContain('accordion-content');
    expect(viewerScript).toContain('accordion-arrow');
  });

  test('keeps single alert severity, dismiss button, and hidden-icon behavior aligned with draft XaAlert', () => {
    const warningHtml = renderToHtml({
      type: 'alert',
      severity: 'warning',
      title: '안내',
      message: '저장되지 않은 변경이 있습니다.',
      dismissible: true,
    });
    const hiddenIconHtml = renderToHtml({
      type: 'alert',
      severity: 'error',
      message: '요청을 처리할 수 없습니다.',
      showIcon: false,
    });

    expect(warningHtml).toContain('class="xa-ext-alert-host xa-ext-alert-host--single"');
    expect(warningHtml).toContain('<div class="alert alert--warning" style="position:relative;">');
    expect(warningHtml).toContain('<span class="alert__icon">⚠️</span>');
    expect(warningHtml).toContain('<div class="alert__title">안내</div>');
    expect(warningHtml).toContain('<button type="button" class="alert__close" aria-label="Close" data-xcon-alert-close>×</button>');
    expect(warningHtml).not.toContain('onclick');
    expect(hiddenIconHtml).toContain('<div class="alert alert--error" style="position:relative;">');
    expect(hiddenIconHtml).not.toContain('alert__icon');
  });

  test('keeps single searchBar input and button structure aligned with draft XaSearchBar', () => {
    const html = renderToHtml({
      type: 'searchBar',
      placeholder: '검색어를 입력하세요…',
      showSearchButton: true,
      showClearButton: true,
    });
    const buttonOnlyHtml = renderToHtml({
      type: 'searchBar',
      placeholder: 'Search…',
      showClearButton: false,
    });
    const namedIconHtml = renderToHtml({
      type: 'searchBar',
      placeholder: 'Search…',
      value: 'query',
      searchIcon: 'search',
      clearIcon: 'x',
      showSearchButton: true,
      showClearButton: true,
    });

    expect(html).toContain('class="xa-ext-search-bar-host xa-ext-search-bar-host--single"');
    expect(html).toContain('<div class="search-container" style="position:relative;width:100%;height:100%;" data-xcon-search-single>');
    expect(html).toContain('<input type="text" id="root_input" placeholder="검색어를 입력하세요…');
    expect(html).toContain('data-xcon-search-single-input');
    expect(html).toContain('style="width:100%;height:100%;border:1px solid #ccc;border-radius:4px;padding:8px 12px;padding-right:80px;box-sizing:border-box;font-size:14px;">');
    expect(html).toContain('<button type="button" class="search-button" data-xcon-search-single-submit style="position:absolute;right:40px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:#666;">🔍</button>');
    expect(html).toContain('<button type="button" class="clear-button" data-xcon-search-single-clear style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:#999;display:none;">×</button>');
    expect(html).not.toContain('search-results');
    expect(html).not.toContain('oninput');
    expect(html).not.toContain('onclick');
    expect(buttonOnlyHtml).toContain('padding-right:40px');
    expect(buttonOnlyHtml).toContain('right:8px;top:50%');
    expect(buttonOnlyHtml).not.toContain('clear-button');
    expect(namedIconHtml).toContain('<button type="button" class="search-button"');
    expect(namedIconHtml).toContain('<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24"');
    expect(namedIconHtml).not.toContain('>search</button>');
    expect(namedIconHtml).not.toContain('>x</button>');
    expect(viewerScript).toContain('data-xcon-search-single');
  });

  test('keeps single searchBar debounceDelay available to the safe runtime binding', () => {
    const html = renderToHtml({
      type: 'searchBar',
      placeholder: 'Search…',
      debounceDelay: 450,
      value: 'query',
    });

    expect(html).toContain('data-xcon-search-debounce-delay="450"');
    expect(viewerScript).toContain('data-xcon-search-debounce-delay');
    expect(viewerScript).toContain('xcon-search-input');
  });

  test('keeps data-driven grid, flexBox, stack, and spacer single structure aligned with draft layout ext components', () => {
    const gridHtml = renderToHtml({
      type: 'grid',
      columns: 2,
      gap: '12px',
      items: [{ content: 'A' }, { content: 'B' }],
    });
    const flexHtml = renderToHtml({
      type: 'flexBox',
      direction: 'row',
      justify: 'space-between',
      align: 'center',
      gap: '8px',
      items: [{ content: 'Left' }, { content: 'Right', flex: '1 1 auto', order: 2, alignSelf: 'center' }],
    });
    const stackHtml = renderToHtml({
      type: 'stack',
      direction: 'column',
      align: 'stretch',
      gap: '12px',
      items: [{ content: 'One' }, { content: 'Two' }],
    });
    const spacerHtml = renderToHtml({
      type: 'spacer',
      size: '24px',
      direction: 'horizontal',
    });

    expect(gridHtml).toContain('class="xa-ext-grid-host xa-ext-grid-host--single"');
    expect(gridHtml).toContain('<div class="grid-container" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">');
    expect(gridHtml).toContain('<div class="grid-item" style="padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;">A</div>');
    expect(flexHtml).toContain('class="xa-ext-flexbox-host xa-ext-flexbox-host--single"');
    expect(flexHtml).toContain('<div class="flex-container" style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;flex-wrap:nowrap;gap:8px;">');
    expect(flexHtml).toContain('<div class="flex-item" style="flex:1 1 auto;order:2;align-self:center;padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;">Right</div>');
    expect(stackHtml).toContain('class="xa-ext-stack-host xa-ext-stack-host--single"');
    expect(stackHtml).toContain('<div class="stack-container" style="display:flex;flex-direction:column;align-items:stretch;gap:12px;">');
    expect(stackHtml).toContain('<div class="stack-item" style="padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;">One</div>');
    expect(spacerHtml).toContain('class="xa-ext-spacer-host xa-ext-spacer-host--single"');
    expect(spacerHtml).toContain('<div class="spacer" style="width:24px;height:100%;"></div>');
    expect(viewerCss).toContain('.grid-cell{height:40px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;font-family:"Syne Mono",monospace;color:var(--ink-3);transition:background .2s}');
    expect(viewerCss).toContain('.flex-box{height:36px;padding:0 12px;border-radius:6px;display:flex;align-items:center;font-size:10px;font-family:"Syne Mono",monospace;white-space:nowrap}');
    expect(viewerCss).toContain('.stack-item{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--ink-2);font-family:"Syne Mono",monospace}');
    expect(viewerCss).not.toContain('.stack-demo>div{min-width:0}');
    expect(viewerCss).toContain('.spacer-visual{background:repeating-linear-gradient(45deg,rgba(var(--accent-rgb),.05),rgba(var(--accent-rgb),.05) 4px,transparent 4px,transparent 10px);border-left:1px dashed rgba(var(--accent-rgb),.3);border-right:1px dashed rgba(var(--accent-rgb),.3);display:flex;align-items:center;justify-content:center;font-family:"Syne Mono",monospace;font-size:10px;color:var(--accent);opacity:.8}');
  });

  test('keeps single grid responsive media rules aligned with draft XaGrid', () => {
    const responsiveHtml = renderToHtml({
      type: 'grid',
      columns: 3,
      items: [{ content: 'A' }, { content: 'B' }, { content: 'C' }],
    });
    const fixedHtml = renderToHtml({
      type: 'grid',
      columns: 3,
      responsive: false,
      items: [{ content: 'A' }],
    });

    expect(responsiveHtml).toContain('@media (max-width: 768px)');
    expect(responsiveHtml).toContain('.grid-container { grid-template-columns: repeat(2, 1fr) !important; }');
    expect(responsiveHtml).toContain('@media (max-width: 480px)');
    expect(responsiveHtml).toContain('.grid-container { grid-template-columns: 1fr !important; }');
    expect(fixedHtml).not.toContain('@media (max-width: 768px)');
  });

  test('keeps single color/date/time picker structure aligned with draft Xa picker components', () => {
    const colorHtml = renderToHtml({
      type: 'colorPicker',
      value: '#2563eb',
      showPreview: true,
      showHex: true,
    });
    const dateHtml = renderToHtml({
      type: 'datePicker',
      value: '2026-05-13',
      min: '2026-01-01',
      max: '2026-12-31',
      required: true,
      showIcon: true,
    });
    const timeHtml = renderToHtml({
      type: 'timePicker',
      value: '09:30',
      min: '08:00',
      max: '18:00',
      step: 900,
      required: true,
      showIcon: true,
    });
    expect(colorHtml).toContain('class="xa-ext-color-picker-host xa-ext-color-picker-host--single"');
    expect(colorHtml).toContain('<div class="color-preview" id="root~preview" style="background:#2563eb" data-xcon-color-preview></div>');
    expect(colorHtml).toContain('<input type="color" id="root" value="#2563eb" data-xcon-color-input style="width:48px;height:36px;padding:0;border:1px solid var(--border2);border-radius:8px;cursor:pointer;background:var(--surface2);">');
    expect(colorHtml).toContain('<input type="text" class="f-input" id="root~hex" value="#2563eb" data-xcon-color-hex>');
    expect(colorHtml).not.toContain('onchange');
    expect(dateHtml).toContain('class="xa-ext-date-picker-host xa-ext-date-picker-host--single"');
    expect(dateHtml).toContain('<div style="position:relative;">');
    expect(dateHtml).toContain('<input type="date" id="root" value="2026-05-13" min="2026-01-01" max="2026-12-31" required style="width:100%;height:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;padding-right:40px;">');
    expect(dateHtml).toContain('<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:#666;">📅</span>');
    expect(dateHtml).not.toContain('picker-input-wrap');
    expect(timeHtml).toContain('<input type="time" id="root" value="09:30" min="08:00" max="18:00" step="900" required style="width:100%;height:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;padding-right:40px;">');
    expect(timeHtml).toContain('<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:#666;">🕐</span>');
  });

  test('keeps picker showcase runtime ids aligned with draft Xa picker components', () => {
    const colorHtml = renderToHtml({ type: 'colorPicker', extVariant: 'showcase' });
    const dateHtml = renderToHtml({ type: 'datePicker', extVariant: 'showcase' });
    const timeHtml = renderToHtml({ type: 'timePicker', extVariant: 'showcase' });

    expect(colorHtml).toContain('id="colorPreview_root"');
    expect(colorHtml).toContain('id="colorHue_root"');
    expect(colorHtml).toContain('id="colorHexDot_root"');
    expect(colorHtml).toContain('id="colorHexInput_root"');
    expect(colorHtml).toContain('id="colorSwatches_root"');
    expect(colorHtml).toContain('<div class="color-swatch selected" style="background:#7C6AF7" data-hex="#7C6AF7"></div>');
    expect(dateHtml).toContain('id="datePicker_root"');
    expect(dateHtml).toContain('id="dpPrev_root"');
    expect(dateHtml).toContain('id="dpMonthLabel_root"');
    expect(dateHtml).toContain('id="dpNext_root"');
    expect(dateHtml).toContain('<tbody id="dpBody_root"></tbody>');
    expect(dateHtml).toContain('data-xcon-date-picker');
    expect(timeHtml).toContain('id="tpHour_root"');
    expect(timeHtml).toContain('id="tpMin_root"');
    expect(timeHtml).toContain('id="tpAmpm_root"');
    expect(timeHtml).toContain('id="tpHourList_root"');
    expect(timeHtml).toContain('id="tpMinList_root"');
    expect(timeHtml).toContain('id="tpAmpmList_root"');
    expect(timeHtml).toContain('data-xcon-time-picker');
    expect(colorHtml + dateHtml + timeHtml).not.toContain('onclick');
    expect(colorHtml + dateHtml + timeHtml).not.toContain('onchange');
    expect(viewerCss).toContain('.date-day{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:auto;font-size:12px;cursor:pointer;color:var(--ink-2);transition:background .15s,color .15s}');
    expect(viewerCss).toContain('.date-day.today{color:var(--accent-2);font-weight:700}');
    expect(viewerCss).toContain('.time-picker__col{flex:1}');
    expect(viewerCss).toContain('.time-picker__item{padding:8px;text-align:center;font-size:13px;cursor:pointer;color:var(--ink-3);scroll-snap-align:start;transition:background .15s,color .15s}');
    expect(viewerCss).toContain('.time-picker__item.selected{color:var(--accent-2);font-weight:600;background:rgba(var(--accent-rgb),.1)}');
    expect(viewerScript).toContain('data-xcon-date-picker');
    expect(viewerScript).toContain('data-xcon-time-picker');
    expect(viewerScript).toContain('new Date(cur.getFullYear(), cur.getMonth(), 1).getDay()');
    expect(viewerScript).toContain('for (let i = 1; i <= 12; i += 1)');
  });

  test('keeps gallery and treeView showcase output aligned with draft Xa ext components', () => {
    const galleryHtml = renderToHtml({ type: 'gallery', extVariant: 'showcase' }, { allowExternalResources: true });
    const treeHtml = renderToHtml({ type: 'treeView', extVariant: 'showcase' });

    expect(galleryHtml).toContain('id="galleryGrid_root"');
    expect(galleryHtml).toContain('id="lightbox_root"');
    expect(galleryHtml).toContain('id="lightboxImg_root"');
    expect(galleryHtml).toContain('id="lightboxClose_root"');
    expect(galleryHtml).not.toContain('onclick');
    expect(treeHtml).toContain('Button.tsx');
    expect(treeHtml).toContain('Input.tsx');
    expect(treeHtml).toContain('Modal.tsx');
    expect(treeHtml).toContain('index.tsx');
    expect(treeHtml).toContain('favicon.ico');
    expect(treeHtml).toContain('tsconfig.json');
    expect(treeHtml).not.toContain('renderer.test.ts');
    expect(treeHtml).not.toContain('spec.md');
    expect(viewerCss).toContain('.tree-row.selected{background:rgba(var(--accent-rgb),.1);color:var(--accent-2)}');
    expect(viewerCss).not.toContain('padding:8px;box-sizing:border-box}.tree-node');
    expect(viewerCss).toContain('.gallery-item{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;background:var(--surface2)}');
    expect(viewerCss).toContain('.gallery-caption{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;padding:16px 12px 8px;font-size:14px}');
    expect(viewerCss).toContain('.gallery-item__overlay{position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;transition:background .3s}');
  });

  test('keeps qrCode and barcode showcase runtime ids aligned with draft Xa ext components', () => {
    const qrHtml = renderToHtml({ type: 'qrCode', extVariant: 'showcase' });
    const barcodeHtml = renderToHtml({ type: 'barcode', extVariant: 'showcase' });

    expect(qrHtml).toContain('id="qrCanvas_root"');
    expect(qrHtml).toContain('id="qrInput_root"');
    expect(qrHtml).toContain('id="qrBtn_root"');
    expect(barcodeHtml).toContain('id="barcodeCanvas_root"');
    expect(barcodeHtml).toContain('id="barcodeText_root"');
    expect(barcodeHtml).toContain('id="barcodeInput_root"');
    expect(barcodeHtml).toContain('id="barcodeBtn_root"');
    expect(qrHtml + barcodeHtml).not.toContain('onclick');
    expect(viewerCss).toContain('.qr-input-row .f-input{flex:1}');
    expect(viewerCss).toContain('.qr-gen-btn:hover{background:var(--accent-2)}');
    expect(viewerCss).toContain('.barcode-canvas{border-radius:6px;background:#fff;padding:12px;border:1px solid var(--border)}');
    expect(viewerCss).toContain('.barcode-text{font-family:"Syne Mono",monospace;font-size:13px;color:var(--ink-2);letter-spacing:3px}');
    expect(viewerScript).toContain('const enc = {');
    expect(viewerScript).toContain('for (let i = 1; i <= 6; i++) bits += enc[+code[i]];');
  });

  test('keeps single gallery and treeView structure aligned with draft advanced components', () => {
    const galleryHtml = renderToHtml(
      {
        type: 'gallery',
        columns: 2,
        gap: 10,
        images: [
          { src: 'https://example.com/a.jpg', caption: '첫 이미지' },
          { src: 'https://example.com/b.jpg', alt: '둘째 이미지' },
        ],
      },
      { allowExternalResources: true },
    );
    const treeHtml = renderToHtml({
      type: 'treeView',
      data: [{ label: 'src', children: [{ label: 'index.ts' }] }],
      expandedNodes: ['0'],
    });
    expect(galleryHtml).toContain('class="xa-ext-gallery-host xa-ext-gallery-host--single"');
    expect(galleryHtml).toContain('<div class="gallery-grid" data-xcon-gallery-grid style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;width:100%;height:100%;">');
    expect(galleryHtml).toContain('data-xcon-gallery-single-item="0"');
    expect(galleryHtml).toContain('style="width:100%;height:200px;object-fit:cover;display:block;"');
    expect(galleryHtml).toContain('<div id="root_gallery_modal" class="gallery-modal" data-xcon-gallery-single-modal');
    expect(galleryHtml).toContain('data-xcon-gallery-single-prev');
    expect(galleryHtml).toContain('data-xcon-gallery-single-next');
    expect(galleryHtml).not.toContain('lightbox');
    expect(galleryHtml).not.toContain('onclick');
    expect(treeHtml).toContain('class="xa-ext-treeview-host xa-ext-treeview-host--single"');
    expect(treeHtml).toContain('<div class="tree-container" style="border:1px solid var(--border, #e9ecef);border-radius:4px;background-color:var(--surface, white);overflow-y:auto;max-height:280px;">');
    expect(treeHtml).toContain('<div class="tree" id="root~treeMount" data-xcon-tree-view>');
    expect(viewerScript).toContain('data-xcon-gallery-single-item');
  });

  test('expands treeView nodes by public node id as well as legacy path', () => {
    const html = renderToHtml({
      type: 'treeView',
      data: [
        {
          id: 'docs',
          label: 'docs',
          children: [{ id: 'spec', label: 'xcon-component-specs.md' }],
        },
      ],
      expandedNodes: ['docs'],
    });

    expect(html).toContain('data-xcon-tree-id="docs"');
    expect(html).toContain('class="tree-row has-children expanded"');
    expect(html).toContain('<div class="tree-children">');
  });

  test('keeps single qrCode and barcode render options visible to the safe canvas runtime', () => {
    const qrHtml = renderToHtml({
      type: 'qrCode',
      text: 'https://example.com/path',
      size: 180,
      errorCorrectionLevel: 'M',
      foregroundColor: '#111111',
      backgroundColor: '#eeeeee',
      showText: true,
    });
    const barcodeHtml = renderToHtml({
      type: 'barcode',
      text: '4901234567890',
      format: 'CODE128',
      width: 3,
      height: 100,
      displayValue: true,
      font: { size: 16 },
    });

    expect(qrHtml).toContain('class="xa-ext-qr-code-host xa-ext-qr-code-host--single"');
    expect(qrHtml).toContain('data-qr-opts="{&quot;text&quot;:&quot;https://example.com/path&quot;,&quot;size&quot;:180,&quot;ecc&quot;:&quot;M&quot;,&quot;fg&quot;:&quot;#111111&quot;,&quot;bg&quot;:&quot;#eeeeee&quot;}"');
    expect(qrHtml).toContain('<canvas class="qr-canvas" width="180" height="180" data-xcon-qr-canvas data-xcon-qr-text="https://example.com/path" data-xcon-qr-foreground="#111111" data-xcon-qr-background="#eeeeee"></canvas>');
    expect(qrHtml).toContain('<div class="qr-text" style="font-size:12px;color:#666;word-break:break-all;">https://example.com/path</div>');
    expect(barcodeHtml).toContain('class="xa-ext-barcode-host xa-ext-barcode-host--single"');
    expect(barcodeHtml).toContain('<canvas class="barcode-canvas" width="280" height="100" data-xcon-barcode-canvas data-xcon-barcode-value="4901234567890" data-xcon-barcode-format="CODE128" data-xcon-barcode-bar-width="3"></canvas>');
    expect(barcodeHtml).toContain('<p class="barcode-text" data-xcon-barcode-text style="font-size:16px;">4 9 0 1 2 3 4 5 6 7 8 9 0</p>');
    expect(qrHtml + barcodeHtml).not.toContain('<script');
    expect(viewerScript).toContain('data-xcon-qr-foreground');
    expect(viewerScript).toContain('data-xcon-barcode-bar-width');
  });

  test('keeps qrCode and barcode single defaults aligned with draft components', () => {
    const qrHtml = renderToHtml({ type: 'qrCode' });
    const barcodeHtml = renderToHtml({ type: 'barcode' });

    expect(qrHtml).toContain('data-qr-opts="{&quot;text&quot;:&quot;https://example.com&quot;,&quot;size&quot;:200');
    expect(qrHtml).toContain('<canvas class="qr-canvas" width="200" height="200"');
    expect(barcodeHtml).toContain('data-xcon-barcode-format="CODE128"');
    expect(barcodeHtml).toContain('<canvas class="barcode-canvas" width="280" height="100"');
  });

  test('keeps rating showcase runtime ids aligned with draft XaRating', () => {
    const html = renderToHtml({ type: 'rating', extVariant: 'showcase' });

    expect(html).toContain('id="starsInput_root"');
    expect(html).toContain('id="starsScore_root"');
    expect(html).toContain('id="heartsInput_root"');
    expect(html).toContain('id="heartsScore_root"');
    expect(html).not.toContain('starsInput_xcon_root');
    expect(html).not.toContain('heartsInput_xcon_root');
    expect(html).not.toContain('onclick');
  });

  test('renders extended passwordField and textarea chrome like Xa ext components', () => {
    const passwordDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_passwordField.xcon.json', import.meta.url), 'utf8'));
    const textareaDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_textarea.xcon.json', import.meta.url), 'utf8'));

    const passwordHtml = renderToHtml(passwordDoc, { allowExternalResources: true, allowHtml: true });
    const textareaHtml = renderToHtml(textareaDoc, { allowExternalResources: true, allowHtml: true });
    const defaultPasswordHtml = renderToHtml({ type: 'passwordField' });
    const defaultTextareaHtml = renderToHtml({ type: 'textarea' });

    expect(passwordHtml).toContain('xa-ext-password-host');
    expect(passwordHtml).toContain('class="f-label"');
    expect(passwordHtml).toContain('class="pw-wrap"');
    expect(passwordHtml).toContain('class="f-input"');
    expect(passwordHtml).toContain('class="pw-toggle"');
    expect(passwordHtml).toContain('data-xcon-tf-toggle="visibility"');
    expect(passwordHtml).toContain('class="pw-strength"');
    expect(passwordHtml.match(/pw-strength__bar/g)?.length ?? 0).toBe(4);
    expect(passwordHtml).toContain('class="f-hint"');
    expect(passwordHtml).toContain('minlength="8"');
    expect(passwordHtml).toContain('type="password"');
    expect(defaultPasswordHtml).toContain('placeholder="비밀번호를 입력하세요"');
    expect(defaultPasswordHtml).toContain('maxlength="100"');

    expect(textareaHtml).toContain('xa-ext-textarea-host');
    expect(textareaHtml).toContain('class="f-label"');
    expect(textareaHtml).toContain('class="f-textarea"');
    expect(textareaHtml).toContain('placeholder="Write something…');
    expect(textareaHtml).toContain('maxlength="200"');
    expect(textareaHtml).toContain('class="textarea-footer"');
    expect(textareaHtml).toContain('<span data-xcon-ta-count');
    expect(textareaHtml).not.toContain('xa-al-tf-multiline');
    expect(defaultTextareaHtml).toContain('placeholder="내용을 입력하세요"');
    expect(defaultTextareaHtml).toContain('style="width:100%;box-sizing:border-box;resize:vertical"');
    expect(passwordHtml + textareaHtml).not.toContain('onclick');
    expect(viewerCss).toMatch(/(?:^|\n)\.f-label\{display:block;font-size:12px;font-weight:500;color:var\(--ink-2\);margin-bottom:6px;letter-spacing:\.3px\}/);
    expect(viewerCss).toContain('.pw-strength__bar');
    expect(viewerCss).toContain('.f-textarea');
    expect(viewerScript).toContain('data-xcon-ta-count');
  });

  test('keeps passwordField and textarea zero attrs and inline sizing aligned with draft', () => {
    const passwordHtml = renderToHtml({ type: 'passwordField' });
    const textareaHtml = renderToHtml({
      type: 'textarea',
      rows: 0,
      cols: 0,
      maxLength: 0,
    });

    expect(passwordHtml).toContain('style="width:100%;box-sizing:border-box;"');
    expect(textareaHtml).toContain('style="width:100%;box-sizing:border-box;resize:vertical"');
    expect(textareaHtml).not.toContain('rows="0"');
    expect(textareaHtml).not.toContain('cols="0"');
    expect(textareaHtml).not.toContain('maxlength="0"');
  });

  test('renders extended badge, avatar, rating, and card chrome like Xa ext components', () => {
    const badgeDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_badge.xcon.json', import.meta.url), 'utf8'));
    const avatarDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_avatar.xcon.json', import.meta.url), 'utf8'));
    const ratingDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_rating.xcon.json', import.meta.url), 'utf8'));
    const cardDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_card.xcon.json', import.meta.url), 'utf8'));

    const badgeHtml = renderToHtml(badgeDoc, { allowExternalResources: true });
    const avatarHtml = renderToHtml(avatarDoc, { allowExternalResources: true });
    const ratingHtml = renderToHtml(ratingDoc, { allowExternalResources: true });
    const cardHtml = renderToHtml(cardDoc, { allowExternalResources: true });

    expect(badgeHtml).toContain('xa-ext-badge-host--showcase');
    expect(badgeHtml).toContain('class="bdg bdg-purple"');
    expect(badgeHtml).toContain('bdg--dot');
    expect(badgeHtml).toContain('class="notif-badge-wrap"');
    expect(badgeHtml).toContain('class="notif-icon-btn"');
    expect(badgeHtml).toContain('class="notif-count"');
    expect(badgeHtml).toContain('99+');
    expect(avatarHtml).toContain('xa-ext-avatar-host--showcase');
    expect(avatarHtml).toContain('class="avatars-row"');
    expect(avatarHtml).toContain('class="av__img av__img--xl"');
    expect(avatarHtml).toContain('class="av__status av__status--online"');
    expect(avatarHtml).toContain('class="av__initials av__initials--md"');
    expect(avatarHtml).toContain('class="av-group"');
    expect(avatarHtml).toContain('xa-ext-avatar-host xa-ext-avatar-host--single');
    expect(ratingHtml).toContain('xa-ext-rating-host--showcase');
    expect(ratingHtml).toContain('class="rating-wrap"');
    expect(ratingHtml).toContain('class="stars-input"');
    expect(ratingHtml).toContain('class="hearts-input"');
    expect(ratingHtml).toContain('class="rating-score"');
    expect(ratingHtml).toContain('data-xcon-rating-group="stars"');
    expect(ratingHtml).toContain('xa-ext-rating-host xa-ext-rating-host--single');
    expect(cardHtml).toContain('xa-ext-card-host--showcase');
    expect(cardHtml).toContain('class="ui-card"');
    expect(cardHtml).toContain('class="ui-card__img"');
    expect(cardHtml).toContain('class="ui-card__footer"');
    expect(cardHtml).toContain('class="btn-sm btn-primary"');
    expect(cardHtml).toContain('Generative Interfaces');
    expect(cardHtml).toContain('xa-ext-card-host xa-ext-card-host--single');
    expect(badgeHtml + avatarHtml + ratingHtml + cardHtml).not.toContain('onclick');
    expect(badgeHtml + avatarHtml + ratingHtml + cardHtml).not.toContain('onmouseover');
    expect(viewerCss).toContain('.avatars-row');
    expect(viewerCss).toContain('.av__status--online');
    expect(viewerCss).toContain('.ui-card__footer');
    expect(viewerCss).toContain('.stars-input label.active');
    expect(viewerCss).toContain('.hearts-input label.active');
    expect(viewerScript).toContain('data-xcon-rating-group');
  });

  test('renders extended tabs, accordion, alert, and search chrome like Xa ext components', () => {
    const tabsDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_tabs.xcon.json', import.meta.url), 'utf8'));
    const accordionDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_accordion.xcon.json', import.meta.url), 'utf8'));
    const alertDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_alert.xcon.json', import.meta.url), 'utf8'));
    const searchDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_searchBar.xcon.json', import.meta.url), 'utf8'));

    const tabsHtml = renderToHtml(tabsDoc);
    const accordionHtml = renderToHtml(accordionDoc);
    const alertHtml = renderToHtml(alertDoc);
    const searchHtml = renderToHtml(searchDoc);

    expect(tabsHtml).toContain('xa-ext-tabs-host--showcase');
    expect(tabsHtml).toContain('class="tabs-wrap"');
    expect(tabsHtml).toContain('class="tabs-nav"');
    expect(tabsHtml).toContain('class="tabs-nav tabs-nav--pill"');
    expect(tabsHtml).toContain('class="tab-btn active"');
    expect(tabsHtml).toContain('data-xcon-tabs-nav');
    expect(tabsHtml).toContain('Project overview with key metrics and milestones');
    expect(accordionHtml).toContain('xa-ext-accordion-host--showcase');
    expect(accordionHtml).toContain('class="accordion-item open"');
    expect(accordionHtml).toContain('class="accordion-trigger has-children expanded"');
    expect(accordionHtml).toContain('class="accordion-chevron"');
    expect(accordionHtml).toContain('class="accordion-body-inner"');
    expect(accordionHtml).toContain('data-xcon-accordion-toggle');
    expect(alertHtml).toContain('xa-ext-alert-host--showcase');
    expect(alertHtml).toContain('class="alert alert--warning"');
    expect(alertHtml).toContain('class="alert__close"');
    expect(alertHtml).toContain('data-xcon-alert-close');
    expect(searchHtml).toContain('xa-ext-search-bar-host--showcase');
    expect(searchHtml).toContain('class="search-outer"');
    expect(searchHtml).toContain('class="search-input-wrap"');
    expect(searchHtml).toContain('class="search-field"');
    expect(searchHtml).toContain('class="search-clear"');
    expect(searchHtml).toContain('class="search-results"');
    expect(searchHtml).toContain('class="search-result-item"');
    expect(tabsHtml + accordionHtml + alertHtml + searchHtml).not.toContain('onclick');
    expect(tabsHtml + accordionHtml + alertHtml + searchHtml).not.toContain('oninput');
    expect(viewerCss).toContain('.tabs-nav--pill .tab-btn.active');
    expect(viewerCss).toContain('.accordion-trigger.has-children.expanded .accordion-chevron');
    expect(viewerCss).toContain('.alert__close svg');
    expect(viewerCss).toContain('.search-results.show');
    expect(viewerScript).toContain('data-xcon-tabs-nav');
    expect(viewerScript).toContain('data-xcon-accordion-toggle');
    expect(viewerScript).toContain('data-xcon-alert-close');
    expect(viewerScript).toContain('data-xcon-search-field');
  });

  test('renders extended grid, flexBox, stack, and spacer showcase chrome like Xa ext components', () => {
    const gridDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_grid.xcon.json', import.meta.url), 'utf8'));
    const flexDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_flexBox.xcon.json', import.meta.url), 'utf8'));
    const stackDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_stack.xcon.json', import.meta.url), 'utf8'));
    const spacerDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_spacer.xcon.json', import.meta.url), 'utf8'));

    const gridHtml = renderToHtml(gridDoc);
    const flexHtml = renderToHtml(flexDoc);
    const stackHtml = renderToHtml(stackDoc);
    const spacerHtml = renderToHtml(spacerDoc);

    expect(gridHtml).toContain('xa-ext-grid-host--showcase');
    expect(gridHtml).toContain('class="grid-demo"');
    expect(gridHtml).toContain('id="gridCanvas_');
    expect(gridHtml).toContain('class="grid-pill active"');
    expect(gridHtml.match(/class="grid-cell"/g)?.length ?? 0).toBe(6);
    expect(flexHtml).toContain('xa-ext-flexbox-host--showcase');
    expect(flexHtml).toContain('class="flex-controls"');
    expect(flexHtml).toContain('id="flexJustify_');
    expect(flexHtml).toContain('id="flexAlign_');
    expect(flexHtml).toContain('id="flexCanvas_');
    expect(flexHtml).toContain('class="flex-canvas"');
    expect(flexHtml.match(/class="flex-box"/g)?.length ?? 0).toBe(5);
    expect(stackHtml).toContain('xa-ext-stack-host--showcase');
    expect(stackHtml).toContain('class="stack-demo"');
    expect(stackHtml).toContain('style="flex:1"');
    expect(stackHtml).toContain('Vertical Stack');
    expect(spacerHtml).toContain('xa-ext-spacer-host--showcase');
    expect(spacerHtml).toContain('class="spacer-visual"');
    expect(gridHtml + flexHtml + stackHtml + spacerHtml).not.toContain('onclick');
    expect(viewerCss).toContain('.grid-demo');
    expect(viewerCss).toContain('.flex-canvas');
    expect(viewerCss).toContain('.stack-demo');
    expect(viewerCss).toContain('.spacer-visual');
    expect(viewerScript).toContain('data-xcon-grid-showcase');
    expect(viewerScript).toContain('data-xcon-flex-showcase');
  });

  test('renders extended carousel chrome with safe controls like Xa ext carousel', () => {
    const doc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_carousel.xcon.json', import.meta.url), 'utf8'));
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html).toContain('xa-ext-carousel-host');
    expect(html).toContain('data-xcon-ext-carousel="true"');
    expect(html).toContain('class="carousel-container"');
    expect(html).toContain('class="carousel-content"');
    expect(html.match(/class="carousel-item"/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(html).toContain('class="carousel-prev"');
    expect(html).toContain('class="carousel-next"');
    expect(html).toContain('class="carousel-dot active"');
    expect(html).not.toContain('xa-al-banner');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onkeydown');
    expect(viewerCss).toContain('.carousel-container');
    expect(viewerScript).toContain('data-xcon-ext-carousel');
  });

  test('honors public carousel autoplay object', () => {
    const html = renderToHtml(
      {
        type: 'carousel',
        items: [
          { src: 'https://example.com/a.jpg', title: 'A' },
          { src: 'https://example.com/b.jpg', title: 'B' },
        ],
        autoplay: { enabled: true, interval: 4200 },
        showDots: true,
        showArrows: true,
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('data-carousel-autoplay="true"');
    expect(html).toContain('data-carousel-interval="4200"');
  });

  test('accepts draft XaCarousel media source aliases', () => {
    const html = renderToHtml(
      {
        type: 'carousel',
        items: [
          { path: 'assets/path-slide.jpg', title: 'Path slide' },
          { uri: 'assets/uri-slide.jpg', title: 'URI slide' },
        ],
        showDots: true,
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('src="assets/path-slide.jpg"');
    expect(html).toContain('src="assets/uri-slide.jpg"');
    expect(html.match(/class="carousel-img"/g)?.length ?? 0).toBe(2);
  });

  test('keeps empty extended carousel message aligned with draft XaCarousel', () => {
    const html = renderToHtml({ type: 'carousel' });

    expect(html).toContain('class="carousel-item carousel-empty"');
    expect(html).toContain('style="display:block;text-align:center;padding:24px;color:#888;"');
    expect(html).toContain('슬라이드가 없습니다. <code style="font-size:12px;">items</code> 배열을 설정하세요.');
  });

  test('renders extended picker, gallery, tree, code, and barcode chrome like Xa ext components', () => {
    const colorDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_colorPicker.xcon.json', import.meta.url), 'utf8'));
    const dateDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_datePicker.xcon.json', import.meta.url), 'utf8'));
    const timeDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_timePicker.xcon.json', import.meta.url), 'utf8'));
    const galleryDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_gallery.xcon.json', import.meta.url), 'utf8'));
    const treeDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_treeView.xcon.json', import.meta.url), 'utf8'));
    const qrDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_qrCode.xcon.json', import.meta.url), 'utf8'));
    const barcodeDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_barcode.xcon.json', import.meta.url), 'utf8'));

    const colorHtml = renderToHtml(colorDoc, { allowExternalResources: true });
    const dateHtml = renderToHtml(dateDoc, { allowExternalResources: true });
    const timeHtml = renderToHtml(timeDoc, { allowExternalResources: true });
    const galleryHtml = renderToHtml(galleryDoc, { allowExternalResources: true });
    const treeHtml = renderToHtml(treeDoc, { allowExternalResources: true });
    const qrHtml = renderToHtml(qrDoc);
    const barcodeHtml = renderToHtml(barcodeDoc);

    expect(colorHtml).toContain('xa-ext-color-picker-host--showcase');
    expect(colorHtml).toContain('class="color-picker-wrap"');
    expect(colorHtml).toContain('class="color-preview"');
    expect(colorHtml).toContain('class="color-swatch selected"');
    expect(colorHtml).toContain('data-hex="#7C6AF7"');
    expect(colorHtml).toContain('type="color"');
    expect(colorHtml).toContain('value="#2563eb"');
    expect(dateHtml).toContain('xa-ext-date-picker-host--showcase');
    expect(dateHtml).toContain('class="date-picker"');
    expect(dateHtml).toContain('class="date-picker__header"');
    expect(dateHtml).toContain('class="date-picker__grid"');
    expect(dateHtml).toContain('id="dpBody_root_ex1_c"');
    expect(dateHtml).toContain('type="date"');
    expect(dateHtml).toContain('min="2026-01-01"');
    expect(dateHtml).toContain('max="2026-12-31"');
    expect(timeHtml).toContain('xa-ext-time-picker-host--showcase');
    expect(timeHtml).toContain('class="time-picker"');
    expect(timeHtml).toContain('class="time-picker__display"');
    expect(timeHtml).toContain('class="time-picker__item selected"');
    expect(timeHtml).toContain('type="time"');
    expect(timeHtml).toContain('step="900"');
    expect(timeHtml).toContain('required');
    expect(galleryHtml).toContain('xa-ext-gallery-host--showcase');
    expect(galleryHtml).toContain('class="gallery-grid"');
    expect(galleryHtml).toContain('class="gallery-item__overlay"');
    expect(galleryHtml).toContain('class="lightbox"');
    expect(galleryHtml).toContain('data-xcon-gallery');
    expect(treeHtml).toContain('xa-ext-treeview-host--showcase');
    expect(treeHtml).toContain('class="tree"');
    expect(treeHtml).toContain('class="tree-node"');
    expect(treeHtml).toContain('class="tree-row has-children expanded"');
    expect(treeHtml).toContain('class="tree-children"');
    expect(qrHtml).toContain('xa-ext-qr-code-host--showcase');
    expect(qrHtml).toContain('class="qr-wrap"');
    expect(qrHtml).toContain('class="qr-canvas"');
    expect(qrHtml).toContain('class="qr-input-row"');
    expect(qrHtml).toContain('class="qr-gen-btn"');
    expect(qrHtml).toContain('https://example.com/path');
    expect(barcodeHtml).toContain('xa-ext-barcode-host--showcase');
    expect(barcodeHtml).toContain('class="barcode-wrap"');
    expect(barcodeHtml).toContain('class="barcode-canvas"');
    expect(barcodeHtml).toContain('class="barcode-text"');
    expect(barcodeHtml).toContain('4901234567890');
    expect(colorHtml + dateHtml + timeHtml + galleryHtml + treeHtml + qrHtml + barcodeHtml).not.toContain('onclick');
    expect(colorHtml + dateHtml + timeHtml + galleryHtml + treeHtml + qrHtml + barcodeHtml).not.toContain('<script');
    expect(colorHtml + dateHtml + timeHtml).not.toContain('onchange');
    expect(viewerCss).toContain('.color-picker-wrap');
    expect(viewerCss).toContain('.date-picker__grid');
    expect(viewerCss).toContain('.time-picker__display');
    expect(viewerCss).toContain('.gallery-grid');
    expect(viewerCss).toContain('.tree-row.has-children.expanded .tree-chevron');
    expect(viewerCss).toContain('.qr-wrap');
    expect(viewerCss).toContain('.barcode-wrap');
    expect(viewerScript).toContain('data-xcon-color-picker');
    expect(viewerScript).toContain('data-xcon-gallery');
    expect(viewerScript).toContain('data-xcon-tree-view');
    expect(viewerScript).toContain('data-xcon-qr-code');
    expect(viewerScript).toContain('data-xcon-barcode');
  });

  test('renders extended icon, divider, tooltip, and modal chrome like Xa ext components', () => {
    const iconDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_icon.xcon.json', import.meta.url), 'utf8'));
    const dividerDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_divider.xcon.json', import.meta.url), 'utf8'));
    const tooltipDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_tooltip.xcon.json', import.meta.url), 'utf8'));
    const modalDoc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/e_modal.xcon.json', import.meta.url), 'utf8'));

    const iconHtml = renderToHtml(iconDoc);
    const dividerHtml = renderToHtml(dividerDoc);
    const tooltipHtml = renderToHtml(tooltipDoc);
    const modalHtml = renderToHtml(modalDoc);

    expect(iconHtml).toContain('xa-ext-icon-host xa-ext-icon-host--showcase');
    expect(iconHtml).toContain('class="icon-grid"');
    expect(iconHtml.match(/class="icon-item"/g)?.length ?? 0).toBeGreaterThanOrEqual(12);
    expect(iconHtml).toContain('class="icon-sizes"');
    expect(iconHtml).toContain('xa-ext-icon-host xa-ext-icon-host--single');
    expect(iconHtml).toContain('class="icon-container"');
    expect(iconHtml).toContain('transform:rotate(90deg)');
    expect(dividerHtml).toContain('xa-ext-divider-host--showcase');
    expect(dividerHtml).toContain('class="divider"');
    expect(dividerHtml).toContain('class="divider--thick"');
    expect(dividerHtml).toContain('class="divider--dashed"');
    expect(dividerHtml).toContain('class="divider--gradient"');
    expect(dividerHtml).toContain('class="divider--label"');
    expect(dividerHtml).toContain('xa-ext-divider-host xa-ext-divider-host--single');
    expect(dividerHtml).toContain('border-top:1px dotted');
    expect(tooltipHtml).toContain('xa-ext-tooltip-host--showcase');
    expect(tooltipHtml).toContain('class="tooltip-demo"');
    expect(tooltipHtml).toContain('tooltip-wrap tip-top');
    expect(tooltipHtml).toContain('tooltip-wrap tip-bottom');
    expect(tooltipHtml).toContain('tooltip-wrap tip-right');
    expect(tooltipHtml).toContain('xa-ext-tooltip-host xa-ext-tooltip-host--single');
    expect(tooltipHtml).toContain('class="tooltip-trigger"');
    expect(tooltipHtml).toContain('class="tooltip tooltip-light tooltip-bottom"');
    expect(tooltipHtml).toContain('data-xcon-tooltip-trigger="click"');
    expect(modalHtml).toContain('xa-ext-modal-host xa-ext-modal-host--showcase');
    expect(modalHtml).toContain('class="modal-trigger-btn"');
    expect(modalHtml).toContain('class="modal-backdrop"');
    expect(modalHtml).toContain('class="modal-box"');
    expect(modalHtml).toContain('class="modal-close"');
    expect(modalHtml).toContain('xa-ext-modal-host xa-ext-modal-host--single');
    expect(modalHtml).toContain('class="modal-overlay"');
    expect(modalHtml).toContain('class="modal-content modal-zoom"');
    expect(modalHtml).toContain('data-xcon-modal-close-on-backdrop="true"');
    expect(iconHtml + dividerHtml + tooltipHtml + modalHtml).not.toContain('onclick');
    expect(iconHtml + dividerHtml + tooltipHtml + modalHtml).not.toContain('onmouseenter');
    expect(viewerCss).toContain('.icon-grid');
    expect(viewerCss).toContain('.icon-item{width:44px;height:44px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,border-color .15s;position:relative}');
    expect(viewerCss).not.toContain('.icon-item{width:44px;height:44px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,border-color .15s;position:relative;box-sizing:border-box}');
    expect(viewerCss).toContain('.divider--gradient');
    expect(viewerCss).toContain('.tooltip-target{padding:8px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;font-size:12px;cursor:default;color:var(--ink-2);transition:background .15s}');
    expect(viewerCss).toContain('.tooltip-bubble{position:absolute;z-index:13100;background:var(--ink);color:var(--bg);font-size:11px;font-weight:500;padding:6px 10px;border-radius:5px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s}');
    expect(viewerCss).toContain('.tooltip-wrap.tip-bottom .tooltip-bubble');
    expect(viewerCss).toContain('.modal-backdrop.open');
    expect(viewerCss).toContain('.modal-box{background:var(--surface);border:1px solid var(--border2);border-radius:14px;width:480px;max-width:calc(100vw - 32px);box-shadow:0 24px 80px rgba(0,0,0,.6);transform:scale(.95) translateY(10px);transition:transform .25s}');
    expect(viewerCss).toContain('.modal-header h3{font-family:"Syne",sans-serif;font-weight:700;font-size:17px;margin:0;color:var(--ink)}');
    expect(viewerCss).toContain('.modal-close{width:30px;height:30px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;color:var(--ink-2);display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}');
    expect(viewerScript).toContain('data-xcon-tooltip');
    expect(viewerScript).toContain('data-xcon-modal');
  });

  test('keeps single icon, tooltip, and modal public defaults aligned', () => {
    const iconHtml = renderToHtml({ type: 'icon' });
    const tooltipHtml = renderToHtml({ type: 'tooltip' });
    const modalHtml = renderToHtml({ type: 'modal' });

    expect(iconHtml).toContain('class="xa-ext-icon-host xa-ext-icon-host--single"');
    expect(iconHtml).toContain('display:flex');
    expect(iconHtml).toContain('align-items:center');
    expect(iconHtml).toContain('justify-content:center');
    expect(iconHtml).toContain('color:rgb(0 0 0 / 1)');
    expect(iconHtml).toContain('font-size:24px');
    expect(iconHtml).toContain('❓');

    expect(tooltipHtml).toContain('tooltip');
    expect(tooltipHtml).not.toContain('Tooltip</div>');

    expect(modalHtml).toContain('title');
    expect(modalHtml).toContain('message');
    expect(modalHtml).not.toContain('Modal Title');
    expect(modalHtml).not.toContain('Modal content');
  });

  test('honors public tooltip delay and modal backdropClose props', () => {
    const tooltipHtml = renderToHtml({
      type: 'tooltip',
      text: '자세한 설명',
      label: '도움말',
      position: 'top',
      trigger: 'hover',
      delay: 120,
      arrow: true,
      theme: 'dark',
    });
    const modalHtml = renderToHtml({
      type: 'modal',
      title: '삭제 확인',
      text: '이 항목을 삭제하시겠습니까?',
      backdropClose: false,
      showCloseButton: true,
      size: 'medium',
      animation: 'fade',
    });

    expect(tooltipHtml).toContain('data-xcon-tooltip-delay="120"');
    expect(viewerScript).toContain("getAttribute('data-xcon-tooltip-delay')");
    expect(modalHtml).toContain('data-xcon-modal-close-on-backdrop="false"');
  });

  test('keeps modal showcase runtime ids aligned with draft XaModal', () => {
    const html = renderToHtml({ type: 'modal', extVariant: 'showcase' });

    expect(html).toContain('id="openModal_root"');
    expect(html).toContain('id="modalBackdrop_root"');
    expect(html).toContain('id="closeModal_root"');
    expect(html).toContain('id="cancelModal_root"');
    expect(html).toContain('data-xcon-modal-open="modalBackdrop_root"');
    expect(html).toContain('data-xcon-modal-close="modalBackdrop_root"');
    expect(html).not.toContain('onclick');
  });

  test('keeps tabs, accordion, and searchBar showcase runtime ids aligned with draft Xa ext components', () => {
    const tabsHtml = renderToHtml({ type: 'tabs', extVariant: 'showcase' });
    const accordionHtml = renderToHtml({ type: 'accordion', extVariant: 'showcase' });
    const searchHtml = renderToHtml({ type: 'searchBar', extVariant: 'showcase' });

    expect(tabsHtml).toContain('id="tabsNav_root"');
    expect(tabsHtml).toContain('data-tab="t1_root"');
    expect(tabsHtml).toContain('id="t1_root"');
    expect(tabsHtml).toContain('id="pillTabsNav_root"');
    expect(tabsHtml).toContain('data-tab="p1_root"');
    expect(tabsHtml).toContain('id="p1_root"');
    expect(accordionHtml).toContain('id="acc1_root"');
    expect(accordionHtml).toContain('id="acc2_root"');
    expect(accordionHtml).toContain('id="acc3_root"');
    expect(searchHtml).toContain('id="searchOuter_root"');
    expect(searchHtml).toContain('id="searchField_root"');
    expect(searchHtml).toContain('id="searchClear_root"');
    expect(searchHtml).toContain('id="searchResults_root"');
    expect(searchHtml).toContain('data-xcon-search-field="searchResults_root"');
    expect(searchHtml).toContain('data-xcon-search-clear="searchField_root"');
    expect(tabsHtml + accordionHtml + searchHtml).not.toContain('onclick');
  });

  test('keeps single icon svg size and stroke aligned with draft XaIcon', () => {
    const html = renderToHtml({
      type: 'icon',
      name: 'home',
      library: 'lucide',
      size: 32,
      weight: 3,
      color: '#123456',
      rotation: 45,
      borderRadius: 10,
    });

    expect(html).toContain('class="xa-ext-icon-host xa-ext-icon-host--single"');
    expect(html).toContain('border-radius:10px');
    expect(html).toContain('class="icon-container"');
    expect(html).toContain('color:#123456');
    expect(html).toContain('width:32px');
    expect(html).toContain('height:32px');
    expect(html).toContain('transform:rotate(45deg)');
    expect(html).toContain('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">');
    expect(html).not.toContain('width="18" height="18"');
  });

  test('renders labels, buttons, and text fields with draft AL chrome classes', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { gap: 8 },
      components: {
        title: {
          type: 'label',
          text: '최근 본 상품',
          labelPadding: '0 0 12px 0',
          font: { size: 16, weight: 700 },
        },
        action: {
          type: 'button',
          label: '맞춤 추천 받기',
          backgroundColor: 'var(--accent)',
          color: '#fff',
          border: { visible: false, radius: 8 },
          al: { flex: '1 1 0' },
        },
        search: {
          type: 'textField',
          placeholder: '어디로 여행가세요?',
          prefixIcon: 'search',
          pos: [0, 0, 320, 44],
        },
      },
    });

    expect(html).toContain('class="xa-al-label"');
    expect(html).toContain('<span class="xa-al-label__text"');
    expect(html).toContain('class="xa-al-btn"');
    expect(html).toContain('<span class="xa-al-btn__label">맞춤 추천 받기</span>');
    expect(html).toContain('class="xa-al-tf-root"');
    expect(html).toContain('class="xa-al-tf-addon-wrap has-prefix"');
    expect(html).toContain('class="xa-al-tf-prefix xa-al-tf-prefix-icon"');
    expect(html).toContain('class="xa-al-tf"');
  });

  test('renders label adornments used by the showcase examples', () => {
    const html = renderToHtml({
      type: 'panel',
      components: {
        status: {
          type: 'label',
          text: 'New',
          prefixDot: 'true',
          color: 'var(--blue)',
          backgroundColor: 'var(--blue-lt)',
          labelPadding: '3px 10px',
          border: { visible: true, width: 1, color: 'rgba(43,95,160,0.2)', radius: 4 },
        },
        required: {
          type: 'label',
          text: 'Email Address',
          suffix: { text: '*', color: 'var(--red)' },
        },
        editorial: {
          type: 'label',
          text: "Editor's Pick",
          editorialBar: true,
          editorialBarColor: 'var(--accent)',
          font: { size: 13, italic: 'true' },
        },
        progress: {
          type: 'label',
          text: 'Profile Completion',
          hintText: '72%',
        },
      },
    });

    expect(html).toContain('class="xa-al-label__dot"');
    expect(html).toContain('class="xa-al-label__value">New</span>');
    expect(html).toContain('border-style:solid');
    expect(html).toContain('class="xa-al-label__suffix"');
    expect(html).toContain('style="color:var(--red)"');
    expect(html).toContain('xa-al-label--editorial');
    expect(html).toContain('class="xa-al-label__editorial-bar"');
    expect(html).toContain('font-style:italic');
    expect(html).toContain('class="xa-al-label__hint"');
    expect(html).toContain('>72%</span>');
  });

  test('keeps default label alignment and htmlClass aliases aligned with draft XaLabelAL', () => {
    const html = renderToHtml({
      type: 'label',
      text: 'Default aligned label',
      htmlClass: 'draft-label-class',
    });

    expect(html).toContain('class="draft-label-class xa-al-label"');
    expect(html).toContain('justify-content:flex-start');
    expect(html).not.toContain('justify-content:center');
  });

  test('honors explicit label vertical alignment from SKETCH valign aliases', () => {
    const html = renderToHtml({
      type: 'label',
      text: 'Bottom aligned label',
      pos: [0, 0, 240, 80],
      textAlign: 'center',
      textVerticalAlign: 'bottom',
    });

    expect(html).toContain('class="xa-al-label"');
    expect(html).toContain('justify-content:flex-end');
    expect(html).toContain('align-items:flex-end');
    expect(html).toContain('justify-content:center');
  });

  test('collapses generated blank label headers without dropping visual spacer labels', () => {
    const html = renderToHtml({
      type: 'panel',
      components: {
        hdr: {
          type: 'label',
          text: ' ',
          pos: [0, 0, 560, 28],
          font: { size: 11, weight: 700 },
        },
        mock: {
          type: 'label',
          text: '\u00a0',
          pos: [0, 0, 280, 36],
          backgroundColor: 'var(--bg2)',
          labelPadding: '8px 10px',
          border: { visible: true, width: 1, color: 'var(--border2)', radius: 6 },
        },
        fill: {
          type: 'label',
          text: '\u00a0',
          backgroundColor: 'var(--accent)',
          round: 4,
          lineHeight: 1,
        },
      },
    });

    expect(html).not.toContain('data-key="root~hdr"');
    expect(html).toContain('data-key="root~mock"');
    expect(html).toContain('data-key="root~fill"');
    expect(html).toContain('border-radius:4px');
    expect(html).toContain('line-height:1');
  });

  test('renders text field adornments, states, and OTP chrome used by showcase examples', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { gap: 8 },
      components: {
        email: {
          type: 'textField',
          value: 'jane@example.com',
          inputType: 'email',
          fieldState: 'success',
          prefix: { icon: 'email' },
          suffix: { icon: 'check' },
          pos: [0, 0, 520, 44],
          border: { visible: true, radius: 8 },
        },
        password: {
          type: 'textField',
          value: 'weak',
          secureTextEntry: 'true',
          fieldState: 'error',
          prefix: { icon: 'lock' },
          suffix: { icon: 'visibility' },
          pos: [0, 0, 520, 44],
          border: { visible: true, radius: 8 },
        },
        website: {
          type: 'textField',
          placeholder: 'yoursite.com',
          leadingBlock: 'https://',
          pos: [0, 0, 520, 44],
        },
        promo: {
          type: 'textField',
          placeholder: 'Enter code',
          trailingButton: 'Apply',
          pos: [0, 0, 520, 44],
        },
        price: {
          type: 'textField',
          value: '29000',
          prefix: { text: '₩' },
          suffix: { text: 'KRW' },
          pos: [0, 0, 520, 44],
        },
        floating: {
          type: 'textField',
          floatLabel: 'Company Name',
          pos: [0, 0, 520, 44],
        },
        otp: {
          type: 'textField',
          maxLength: 1,
          textAlign: 'center',
          otpIndex: 0,
          otpGroup: 'demo-otp',
          pos: [0, 0, 44, 48],
        },
        disabled: {
          type: 'textField',
          value: 'Read-only value',
          enabled: 'false',
          pos: [0, 0, 520, 44],
        },
        clearable: {
          type: 'textField',
          value: 'Clear me',
          suffix: 'clear',
          required: true,
          minLength: 2,
          pattern: '[A-Za-z ]+',
          inputMode: 'text',
          name: 'profileName',
          bind: 'profile.name',
          pos: [0, 0, 520, 44],
        },
        styled: {
          type: 'textField',
          value: 'Styled',
          bgColor: '#fafafa',
          border: { visible: true, width: 2, color: '#123456', radius: 10 },
          pos: [0, 0, 240, 44],
        },
        legacyFont: {
          type: 'textField',
          value: 'Legacy style',
          font: 'Georgia',
          fontSize: 16,
          fontWeight: '600',
          italic: true,
          pos: [0, 0, 520, 44],
        },
      },
    });

    expect(html).toContain('xa-al-tf--success');
    expect(html).toContain('xa-al-tf--error');
    expect(html).toContain('class="xa-al-tf-addon-wrap has-prefix has-suffix"');
    expect(html).toContain('class="xa-al-tf-addon-wrap has-prefix-text has-suffix"');
    expect(html).toContain('class="xa-al-tf-prefix xa-al-tf-prefix-icon"');
    expect(html).toContain('class="xa-al-tf-suffix xa-al-tf-suffix--success"');
    expect(html).toContain('class="xa-al-tf-suffix xa-al-tf-suffix-btn"');
    expect(html).toContain('data-xcon-tf-clear');
    expect(html).toContain('aria-label="Clear text"');
    expect(html).toContain('required');
    expect(html).toContain('minlength="2"');
    expect(html).toContain('pattern="[A-Za-z ]+"');
    expect(html).toContain('inputmode="text"');
    expect(html).toContain('name="profileName"');
    expect(html).toContain('data-xcon-bind="profile.name"');
    expect(html).not.toContain('>clear</span>');
    expect(html).toContain('class="xa-al-tf-pre"');
    expect(html).toContain('>https://</span>');
    expect(html).toContain('class="xa-al-tf-post"');
    expect(html).toContain('>Apply</button>');
    expect(html).toContain('class="xa-al-tf-float-label"');
    expect(html).toContain('data-xa-otp-index="0"');
    expect(html).toContain('data-xa-otp-group="demo-otp"');
    expect(html).toContain('disabled');
    expect(html).toContain('type="password"');
    expect(html).toContain('height:44px');
    expect(html).toContain('--xa-tf-radius:10px');
    expect(html).toContain('--xa-tf-border-width:2px');
    expect(html).toContain('--xa-tf-border-color:#123456');
    expect(html).toContain('--xa-tf-bg:#fafafa');
    expect(html).toContain('font-family:Georgia');
    expect(html).toContain('font-size:16px');
    expect(html).toContain('font-weight:600');
    expect(html).toContain('font-style:italic');
    expect(html).not.toContain('>email</span>');
    expect(html).not.toContain('width:520px');
    expect(viewerCss).toContain('.xa-al-tf-suffix--clear');
    expect(viewerScript).toContain('data-xcon-tf-clear');
  });

  test('renders textView message fields as multiline textarea chrome', () => {
    const html = renderToHtml({
      type: 'textView',
      text: '',
      placeholder: 'Write a short message…',
      maxLength: '140',
      lineNumbers: '4',
      editable: 'false',
      pos: [0, 0, 520, 96],
      font: { size: 14 },
    });

    expect(html).toContain('class="xa-al-tv-root"');
    expect(html).toContain('<textarea');
    expect(html).toContain('class="xa-al-tf xa-al-tf-multiline"');
    expect(html).toContain('placeholder="Write a short message…"');
    expect(html).toContain('maxlength="140"');
    expect(html).toContain('rows="4"');
    expect(html).toContain('readonly');
    expect(html).toContain('height:96px');
  });

  test('renders textView static HTML variants like draft AL TextView', () => {
    const html = renderToHtml(
      {
        type: 'panel',
        al: { gap: 8 },
        components: {
          article: {
            type: 'textView',
            renderHtml: 'true',
            editable: 'false',
            textViewVariant: 'article',
            text: '<div class="tv-article"><p class="tv-lead">Lead copy</p><p>Body <strong>text</strong></p></div>',
            pos: [0, 0, 560, 180],
            al: { width: '100%' },
          },
          truncate: {
            type: 'textView',
            renderHtml: 'true',
            editable: 'false',
            textViewVariant: 'truncate',
            text: 'Long <span class="tv-highlight">summary</span> text',
            pos: [0, 0, 560, 120],
            al: { width: '100%' },
          },
        },
      },
      { allowHtml: true },
    );

    expect(html).toContain('class="xa-al-tv-root xa-al-tv-static"');
    expect(html).toContain('<div class="tv-article">');
    expect(html).toContain('<p class="tv-lead">Lead copy</p>');
    expect(html).toContain('class="tv-truncate collapsed"');
    expect(html).toContain('class="tv-read-more"');
    expect(html).toContain('data-xa-trunc-toggle=');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('width:560px');
    expect(viewerCss).toContain('.xa-al-tv-static .tv-article');
    expect(viewerCss).toContain('border-radius:var(--r);line-height:1.7');
    expect(viewerCss).toContain('.xa-al-tv-static .tv-truncate.collapsed');
    expect(viewerScript).toContain('data-xa-trunc-toggle');
  });

  test('keeps generic textView HTML bounds and textarea style details aligned with draft AL TextView', () => {
    const htmlReadonly = renderToHtml(
      {
        type: 'textView',
        renderHtml: true,
        editable: false,
        text: '<p>Bounded HTML block</p>',
        pos: [0, 0, 320, 120],
      },
      { allowHtml: true },
    );
    const textarea = renderToHtml({
      type: 'textView',
      text: 'Line 1\nLine 2',
      scroll: 'none',
      textVerticalAlign: 'bottom',
      pos: [0, 0, 320, 96],
    });

    expect(htmlReadonly).toContain('class="xa-al-tv-root xa-al-tv-root--html"');
    expect(htmlReadonly).toContain('height:120px');
    expect(htmlReadonly).not.toContain('height:auto;min-height:0');
    expect(textarea).toContain('overflow:hidden');
    expect(textarea).toContain('vertical-align:bottom');
    expect(textarea).toContain('white-space:pre-wrap');
    expect(textarea).toContain('word-wrap:break-word');
  });

  test('renders the public textField showcase fixture with AL text field chrome', () => {
    const doc = JSON.parse(
      readFileSync(new URL('../../../../examples/showcase/p_textField.xcon.json', import.meta.url), 'utf8'),
    );
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html.match(/xa-al-tf-prefix/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(html.match(/xa-al-tf-suffix/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(html.match(/class="xa-al-tf-ico/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(html).toContain('type="email"');
    expect(html).toContain('value="jane@example.com"');
    expect(html).toContain('type="password"');
    expect(html).toContain('value="weak"');
    expect(html).toContain('type="search"');
    expect(html).toContain('placeholder="Search anything…');
    expect(html).toContain('xa-al-tf--success');
    expect(html).toContain('xa-al-tf--error');
    expect(html).toContain('class="xa-al-tf-pre"');
    expect(html).toContain('>https://</span>');
    expect(html).toContain('class="xa-al-tf-post"');
    expect(html).toContain('>Apply</button>');
    expect(html).toContain('class="xa-al-tf-prefix"');
    expect(html).toContain('>₩</span>');
    expect(html).toContain('class="xa-al-tf-suffix xa-al-tf-suffix-text"');
    expect(html).toContain('>KRW</span>');
    expect(html).toContain('xa-al-tf-float-label');
    expect(html).toContain('height:44px');
    expect(html).toContain('height:96px');
    expect(html).toContain('--xa-tf-radius:8px');
    expect(html.match(/data-xa-otp-index/g)?.length ?? 0).toBe(6);
    expect(html).toContain('<textarea');
    expect(html).not.toContain('width:520px');
  });

  test('keeps textField alias chrome and focus states aligned with draft AL theme', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { gap: 8 },
      components: {
        directIcons: {
          type: 'textField',
          value: 'jane@example.com',
          inputType: 'email',
          fieldState: 'success',
          prefixIcon: 'email',
          suffixIcon: 'check',
          pos: [0, 0, 520, 44],
          border: { visible: true, radius: 8 },
        },
        directText: {
          type: 'textField',
          value: '29000',
          prefixText: '₩',
          suffixText: 'KRW',
          pos: [0, 0, 520, 44],
          border: { visible: true, radius: 8 },
        },
        disabled: {
          type: 'textField',
          value: 'Read-only value',
          enabled: false,
          pos: [0, 0, 520, 44],
          border: { visible: true, radius: 8 },
        },
      },
    });

    expect(html).toContain('class="xa-al-tf-addon-wrap has-prefix has-suffix"');
    expect(html).toContain('class="xa-al-tf-addon-wrap has-prefix-text has-suffix"');
    expect(html).toContain('class="xa-al-tf-suffix xa-al-tf-suffix--success"');
    expect(html).toContain('class="xa-al-tf-prefix"');
    expect(html).toContain('>₩</span>');
    expect(html).toContain('class="xa-al-tf-suffix xa-al-tf-suffix-text"');
    expect(html).toContain('>KRW</span>');
    expect(html).toContain('xa-al-tf-root--disabled');
    expect(viewerCss).toContain('input.xa-al-tf--success:focus');
    expect(viewerCss).toContain('input.xa-al-tf--error:focus');
    expect(viewerCss).toMatch(/input\.xa-al-tf,textarea\.xa-al-tf\{[^}]*font-family:var\(--font-body\)[^}]*font-size:14px/);
    expect(viewerCss).not.toMatch(/input\.xa-al-tf,textarea\.xa-al-tf\{[^}]*font:inherit/);
    expect(viewerCss).toContain('.xa-al-tf-suffix-text{font-size:11px;font-weight:500}');
  });

  test('keeps textField and textView core chrome in the rendered markup for robust playground previews', () => {
    const textFieldHtml = renderToHtml({
      type: 'textField',
      placeholder: 'Jane Doe',
      pos: [0, 0, 520, 44],
      border: { visible: true, radius: 8 },
      prefix: { icon: 'email' },
      suffix: { icon: 'check' },
    });
    const disabledHtml = renderToHtml({
      type: 'textField',
      value: 'Read-only value',
      enabled: false,
      pos: [0, 0, 520, 44],
    });
    const textViewHtml = renderToHtml({
      type: 'textView',
      text: '',
      placeholder: 'Write a short message...',
      pos: [0, 0, 520, 96],
      lineNumbers: 4,
    });
    const leadingHtml = renderToHtml({
      type: 'textField',
      placeholder: 'yoursite.com',
      leadingBlock: 'https://',
      pos: [0, 0, 520, 44],
    });
    const trailingHtml = renderToHtml({
      type: 'textField',
      placeholder: 'Enter code',
      trailingButton: 'Apply',
      pos: [0, 0, 520, 44],
    });

    expect(textFieldHtml).toContain('border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2))');
    expect(textFieldHtml).toContain('border-radius:var(--xa-tf-radius,var(--r-sm))');
    expect(textFieldHtml).toContain('background:var(--xa-tf-bg,var(--surface))');
    expect(textFieldHtml).toContain('color:var(--ink)');
    expect(textFieldHtml).toContain('font-family:var(--font-body)');
    expect(textFieldHtml).toContain('padding:10px 38px 10px 38px');
    expect(textFieldHtml).toContain('box-shadow:var(--shadow-sm)');
    expect(textFieldHtml).toContain('class="xa-al-tf-addon-wrap has-prefix has-suffix" style="position:relative;width:100%;height:100%;display:flex;align-items:center"');
    expect(textFieldHtml).toContain('class="xa-al-tf-prefix xa-al-tf-prefix-icon" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);z-index:1;color:var(--ink-3);pointer-events:none;font-size:14px;display:inline-flex;align-items:center;justify-content:center"');
    expect(textFieldHtml).toContain('class="xa-al-tf-suffix xa-al-tf-suffix--success" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);z-index:1;color:var(--green);pointer-events:none;display:inline-flex;align-items:center;justify-content:center"');
    expect(disabledHtml).toContain('background:var(--bg2)');
    expect(textViewHtml).toContain('<textarea');
    expect(textViewHtml).toContain('border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2))');
    expect(textViewHtml).toContain('min-height:80px');
    expect(textViewHtml).toContain('padding:10px 14px');
    expect(leadingHtml).toContain('class="xa-al-tf-block-wrap" style="display:flex;width:100%;height:100%;align-items:stretch"');
    expect(leadingHtml).toContain('class="xa-al-tf-pre" style="display:flex;align-items:center;padding:0 12px;background:var(--bg2);border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2));border-right:none;border-radius:var(--xa-tf-radius,var(--r-sm)) 0 0 var(--xa-tf-radius,var(--r-sm));font-size:13px;color:var(--ink-2);white-space:nowrap;font-family:&quot;JetBrains Mono&quot;,monospace"');
    expect(trailingHtml).toContain('class="xa-al-tf-post" style="display:flex;align-items:center;padding:0 12px;background:var(--accent);border:var(--xa-tf-border-width,1.5px) solid var(--accent);border-left:none;border-radius:0 var(--xa-tf-radius,var(--r-sm)) var(--xa-tf-radius,var(--r-sm)) 0;font-size:12px;font-weight:600;color:#fff;cursor:pointer;white-space:nowrap;font-family:var(--font-body)"');
    expect(viewerCss).toContain('.xa-al-tf-root--disabled{pointer-events:none}');
    expect(viewerCss).not.toContain('.xa-al-tf-root--disabled{opacity:.55;pointer-events:none}');
  });

  test('stretches draft AL text fields in flow layout while keeping OTP cells compact', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { gap: 8 },
      components: {
        normal: {
          type: 'textField',
          placeholder: 'Jane Doe',
          pos: [0, 0, 520, 44],
          border: { visible: true, radius: 8 },
        },
        message: {
          type: 'textView',
          placeholder: 'Write a short message...',
          pos: [0, 0, 520, 96],
          lineNumbers: 4,
        },
        row: {
          type: 'panel',
          al: { direction: 'row', gap: 8 },
          components: {
            otp: {
              type: 'textField',
              maxLength: 1,
              otpIndex: 0,
              otpGroup: 'demo-otp',
              pos: [0, 0, 44, 48],
            },
          },
        },
      },
    });

    const normal = html.slice(html.indexOf('data-key="root~normal"'), html.indexOf('data-key="root~message"'));
    const message = html.slice(html.indexOf('data-key="root~message"'), html.indexOf('data-key="root~row"'));
    const otp = html.slice(html.indexOf('data-key="root~row~otp"'));

    expect(normal).toContain('align-self:stretch');
    expect(normal).toContain('width:100%');
    expect(normal).toContain('max-width:100%');
    expect(normal).toContain('min-width:0');
    expect(normal).not.toContain('width:auto');
    expect(message).toContain('align-self:stretch');
    expect(message).toContain('width:100%');
    expect(message).not.toContain('width:auto');
    expect(otp).toContain('width:44px');
    expect(otp).not.toContain('align-self:stretch;width:100%');
  });

  test('uses draft textField display value precedence and float label ids', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { gap: 8 },
      components: {
        textFallback: {
          type: 'textField',
          value: '',
          text: 'Visible text',
          binding: 'data.name',
          pos: [0, 0, 520, 44],
        },
        bindingFallback: {
          type: 'textField',
          value: '',
          text: '',
          binding: 'data.email',
          pos: [0, 0, 520, 44],
        },
        floating: {
          type: 'textField',
          floatLabel: 'Company Name',
          pos: [0, 0, 520, 44],
        },
      },
    });

    expect(html).toContain('value="Visible text"');
    expect(html).toContain('value="data.email"');
    expect(html).toContain('id="xcon_root_floating"');
    expect(html).toContain('for="xcon_root_floating"');
  });

  test('prefers public textField names over migrated legacy aliases', () => {
    const html = renderToHtml({
      type: 'textField',
      value: 'public value',
      text: 'legacy text',
      bind: 'data.public',
      binding: 'data.legacy',
      inputType: 'email',
      secureTextEntry: true,
      trailingButton: 'Apply',
      postButton: 'Legacy',
    });
    const bindFallbackHtml = renderToHtml({
      type: 'textField',
      value: '',
      text: '',
      bind: 'data.public',
      binding: 'data.legacy',
    });

    expect(html).toContain('value="public value"');
    expect(html).toContain('type="email"');
    expect(html).toContain('class="xa-al-tf-post"');
    expect(html).toContain('>Apply</button>');
    expect(html).not.toContain('legacy text');
    expect(html).not.toContain('Legacy</button>');
    expect(bindFallbackHtml).toContain('value="data.public"');
  });

  test('renders the public textView showcase fixture as static HTML variants', () => {
    const doc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/p_textView.xcon.json', import.meta.url), 'utf8'));
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html.match(/xa-al-tv-static/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(html).toContain('<div class="tv-article">');
    expect(html).toContain('<div class="tv-code">');
    expect(html).toContain('class="tv-truncate collapsed"');
    expect(html).toContain('<ul class="tv-list">');
    expect(html).toContain('Kim Dong-min');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('width:560px');
  });

  test('escapes textView static HTML when allowHtml is disabled', () => {
    const html = renderToHtml({
      type: 'textView',
      renderHtml: 'true',
      editable: 'false',
      textViewVariant: 'article',
      text: '<img src=x onerror=alert(1)>',
    });

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
  });

  test('renders videoView showcase player chrome like draft AL VideoView', () => {
    const html = renderToHtml(
      {
        type: 'videoView',
        videoViewMode: 'showcase',
        pos: [0, 0, 560, 520],
        al: { width: '100%', alignSelf: 'stretch' },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('class="xa-al-vv-root"');
    expect(html).toContain('class="vv-showcase"');
    expect(html).toContain('class="video-player"');
    expect(html).toContain('class="video-player__poster"');
    expect(html).toContain('class="video-controls"');
    expect(html).toContain('class="video-thumb-strip"');
    expect(html.match(/class="vt-item/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(html).not.toContain('width:560px');
    expect(viewerCss).toContain('.xa-al-vv-root .video-player');
    expect(viewerCss).toContain('border-radius:var(--r);overflow:hidden;aspect-ratio:16/9;width:100%;box-shadow:var(--shadow-lg)');
    expect(viewerCss).toContain('.xa-al-vv-root .video-thumb-strip');
  });

  test('renders the public video showcase fixture with custom player chrome', () => {
    const doc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/p_video.xcon.json', import.meta.url), 'utf8'));
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html).toContain('xa-al-vv-root');
    expect(html).toContain('video-player__poster');
    expect(html).toContain('Mountain Timelapse · 4K');
    expect(html).toContain('video-controls');
    expect(html).toContain('video-thumb-strip');
    expect(html).not.toContain('width:560px');
  });

  test('keeps standard videoView wrapped like draft XaVideoView', () => {
    const html = renderToHtml(
      {
        type: 'videoView',
        url: 'https://example.com/demo.mp4',
        autoplay: 'true',
        controls: 'true',
        loop: 'true',
        muted: 'true',
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('<div data-xcon-type="videoView" data-component="videoView" data-key="root">');
    expect(html).toContain('data-component="videoView"');
    expect(html).toContain('<video style="width:100%;height:100%;border-radius:4px" src="https://example.com/demo.mp4" controls autoplay loop muted>');
    expect(html).toContain('브라우저가 비디오를 지원하지 않습니다.');
    expect(html.indexOf('<div data-xcon-type="videoView"')).toBeLessThan(html.indexOf('<video style='));
  });

  test('host-only and local-file components render as inert unknown blocks', () => {
    const removedTypes = ['webView', 'frame', 'import', 'fileUpload', 'filePicker', 'imagePicker', 'signaturePad'];
    const html = removedTypes
      .map((type) =>
        renderToHtml({
          type,
          url: 'https://example.com/app',
          src: 'screens/detail.xcon.json',
          htmlBody: '<main><h1>Inline page</h1></main>',
          acceptedTypes: 'image/*,.pdf',
        }),
      )
      .join('\n');

    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('srcdoc=');
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('data-xcon-frame-load');
    expect(html).not.toContain('data-xcon-import-load');
    expect(html).not.toContain('data-xcon-file-upload');
  });

  test('renders object button icons as inline SVGs', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { direction: 'row' },
      components: {
        history: {
          type: 'button',
          title: '히스토리',
          label: '',
          icon: { name: 'schedule' },
          pos: [0, 0, 40, 40],
          border: { visible: true, radius: 20 },
        },
        menu: {
          type: 'button',
          title: '메뉴',
          label: '',
          icon: { name: 'menu' },
          pos: [0, 0, 40, 40],
          border: { visible: true, radius: 20 },
        },
      },
    });

    expect(html).toContain('class="xa-al-btn xa-al-btn--icon-only"');
    expect(html).toContain('<svg class="xa-al-btn__icon"');
    expect(html).toContain('aria-label="히스토리"');
    expect(html).toContain('aria-label="메뉴"');
    expect(html).not.toContain('<span class="xa-al-btn__icon"');
  });

  test('renders title-only icon buttons without visible title text', () => {
    const html = renderToHtml({
      type: 'button',
      title: '히스토리',
      icon: { name: 'schedule' },
      pos: [0, 0, 40, 40],
      border: { visible: true, radius: 20 },
    });

    expect(html).toContain('class="xa-al-btn xa-al-btn--icon-only"');
    expect(html).toContain('<svg class="xa-al-btn__icon"');
    expect(html).toContain('aria-label="히스토리"');
    expect(html).toContain('class="xa-al-btn__label xa-al-btn__label--empty"');
    expect(html).not.toContain('>히스토리</span>');
  });

  test('renders showcase button icon names as SVGs without text fallback collisions', () => {
    const html = renderToHtml(
      {
        type: 'panel',
        al: { direction: 'row', gap: 8 },
        components: {
          export: { type: 'button', label: 'Export', icon: { name: 'file_download' } },
          deploy: { type: 'button', label: 'Deploy', icon: { name: 'cloud_download' } },
          share: { type: 'button', label: '', icon: { name: 'share' }, pos: [0, 0, 44, 44] },
          edit: { type: 'button', label: '', icon: { name: 'edit' }, pos: [0, 0, 44, 44] },
          remove: { type: 'button', label: '', icon: { name: 'delete' }, pos: [0, 0, 44, 44] },
        },
      },
      { allowExternalResources: true },
    );

    expect(html.match(/<svg class="xa-al-btn__icon"/g)?.length).toBe(5);
    expect(html).not.toContain('>file_download<');
    expect(html).not.toContain('>cloud_download<');
    expect(html).not.toContain('>share<');
    expect(html).not.toContain('>edit<');
    expect(html).not.toContain('>delete<');
  });

  test('renders button loading, disabled, segmented, split, and link states as classes', () => {
    const defaultButtonHtml = renderToHtml({ type: 'button', label: 'Default' });
    const borderedGhostHtml = renderToHtml({ type: 'button', label: 'Ghost', border: { visible: true, color: 'var(--border)', radius: 8 } });
    const html = renderToHtml({
      type: 'panel',
      components: {
        loading: { type: 'button', label: 'Loading...', loading: true },
        disabled: { type: 'button', label: 'Disabled', enabled: false },
        first: { type: 'button', label: 'Day', segment: 'first' },
        middle: { type: 'button', label: 'Week', segment: 'middle' },
        last: { type: 'button', label: 'Year', segment: 'last' },
        splitMain: { type: 'button', label: 'Deploy', split: 'main' },
        splitCaret: { type: 'button', label: '▾', split: 'caret' },
        link: { type: 'button', label: 'Sign in', buttonAppearance: 'link' },
      },
    });

    expect(defaultButtonHtml).toContain('background:#ffffff');
    expect(defaultButtonHtml).toContain('box-shadow:none');
    expect(borderedGhostHtml).toContain('box-shadow:var(--shadow-sm');
    expect(html).toContain('xa-al-btn--loading');
    expect(html).toContain('class="xa-al-btn__spinner"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('xa-al-btn--disabled');
    expect(html).toContain('disabled');
    expect(html).toContain('xa-al-btn--seg-first');
    expect(html).toContain('xa-al-btn--seg-mid');
    expect(html).toContain('xa-al-btn--seg-last');
    expect(html).toContain('xa-al-btn--split-main');
    expect(html).toContain('xa-al-btn--split-caret');
    expect(html).toContain('xa-al-btn--link');
    expect(viewerCss).toContain('.xa-al-btn--block');
    expect(viewerCss).toContain('border-left:1px solid rgba(255,255,255,.38)');
    expect(viewerCss).toContain('.xa-al-btn--link:hover');
  });

  test('renders the public button showcase fixture with full AL button chrome', () => {
    const doc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/p_button.xcon.json', import.meta.url), 'utf8'));
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html).toContain('padding:8px 16px');
    expect(html).toContain('box-shadow:0 2px 10px rgba(var(--accent-rgb), 0.34)');
    expect(html).toContain('box-shadow:var(--shadow-sm');
    expect(html.match(/<svg class="xa-al-btn__icon"/g)?.length ?? 0).toBeGreaterThanOrEqual(10);
    expect(html.match(/xa-al-btn--icon-only/g)?.length ?? 0).toBe(4);
    expect(html.match(/xa-al-btn--seg-/g)?.length ?? 0).toBe(4);
    expect(html.match(/xa-al-btn--split-/g)?.length ?? 0).toBe(2);
    expect(html).toContain('xa-al-btn--loading');
    expect(html).toContain('xa-al-btn--disabled');
    expect(html).toContain('xa-al-btn--link');
    expect(html).toContain('class="xa-al-btn__spinner"');
    expect(html).toContain('width:100%');
    expect(html).not.toContain('>file_download</span>');
    expect(html).not.toContain('>cloud_download</span>');
    expect(html).not.toContain('>share</span>');
    expect(html).not.toContain('onclick');
  });

  test('renders tab buttons with column icon layout', () => {
    const html = renderToHtml({
      type: 'button',
      label: '홈',
      layout: 'column',
      icon: { name: 'home' },
      font: { size: 10, weight: 700 },
      border: { visible: false },
      backgroundColor: 'transparent',
      color: 'var(--accent)',
    });

    expect(html).toContain('xa-al-btn--stack-col');
    expect(html).toContain('<svg class="xa-al-btn__icon"');
    expect(html).toContain('<span class="xa-al-btn__label">홈</span>');
  });

  test('keeps column button gap, alignment, and al width block behavior aligned with draft XaButtonAL', () => {
    const html = renderToHtml({
      type: 'button',
      label: '프로필',
      icon: { name: 'user' },
      alButtonLayout: 'column',
      alButtonLayoutGap: '2px',
      textAlign: 'left',
      al: { width: '100%' },
    });

    expect(html).toContain('xa-al-btn--stack-col');
    expect(html).toContain('xa-al-btn--block');
    expect(html).toContain('gap:2px');
    expect(html).toContain('align-items:flex-start');
    expect(html).toContain('width:100%');
  });

  test('renders checkbox and radio controls with draft AL chrome classes', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { gap: 8 },
      components: {
        agree: { type: 'checkbox', label: '동의', checked: true },
        plan: { type: 'radioButton', label: 'Basic', group: 'plan', value: 'basic' },
      },
    });

    expect(html).toContain('class="xa-al-cb-item"');
    expect(html).toContain('class="xa-al-cb-input"');
    expect(html).toContain('class="xa-al-cb-box"');
    expect(html).toContain('class="xa-al-rb-item"');
    expect(html).toContain('class="xa-al-rb-input"');
    expect(html).toContain('class="xa-al-rb-circle"');
  });

  test('renders radio list, segment, plan, and rating variants with AL chrome', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { gap: 8 },
      components: {
        notifications: {
          type: 'radioButton',
          checked: 'true',
          group: 'showcase_notif_al',
          value: 'all',
          label: 'All notifications · Receive every update and alert',
          pos: [0, 0, 520, 56],
        },
        segment: {
          type: 'radioButton',
          checked: 'true',
          group: 'showcase_view_al',
          value: 'grid',
          label: 'Grid',
          variant: 'segment',
          pos: [0, 0, 72, 40],
          al: { flex: '1 1 0', minWidth: '0' },
        },
        plan: {
          type: 'radioButton',
          checked: 'true',
          group: 'showcase_plan_al',
          value: 'pro',
          label: 'Pro',
          variant: 'plan',
          planName: 'Pro',
          planPriceMain: '₩29K',
          planPricePer: '/mo',
          planFeatures: '10 projects|50GB storage|Priority support',
          pos: [0, 0, 180, 220],
          al: { flex: '1 1 0', minWidth: '0' },
        },
        rating: {
          type: 'radioButton',
          variant: 'rating',
          ratingValue: '4',
          pos: [0, 0, 520, 52],
          al: { width: '100%' },
        },
      },
    });

    expect(html).toContain('<p>All notifications</p>');
    expect(html).toContain('<small>Receive every update and alert</small>');
    expect(html).toContain('class="xa-al-rb-btn-item"');
    expect(html).toContain('class="xa-al-rb-seg-inp"');
    expect(html).toContain('class="xa-al-rb-btn-label"');
    expect(html).toContain('class="xa-al-rb-plan"');
    expect(html).toContain('class="xa-al-rb-plan__badge">Popular</div>');
    expect(html).toContain('class="xa-al-rb-plan__name">Pro</div>');
    expect(html).toContain('class="xa-al-rb-plan__price">₩29K<span class="xa-al-rb-plan__per">/mo</span></div>');
    expect(html).toContain('class="xa-al-rb-plan__feat">10 projects</div>');
    expect(html).toContain('class="xa-al-rb-rating-wrap"');
    expect(html).toContain('data-xa-rating-value="4"');
    expect(html.match(/xa-al-rb-star on/g)?.length ?? 0).toBe(4);
    expect(html).not.toContain('width:72px');
    expect(html).not.toContain('width:180px');
  });

  test('keeps radio variants as draft AL flex items and derives fallback values from labels', () => {
    const html = renderToHtml({
      type: 'panel',
      components: {
        basic: {
          type: 'radioButton',
          label: 'Basic',
          group: 'plan',
          pos: [0, 0, 160, 40],
        },
        segment: {
          type: 'radioButton',
          label: 'Grid',
          group: 'view',
          variant: 'segment',
          pos: [0, 0, 72, 40],
        },
      },
    });
    const listTag = html.match(/<label class="xa-al-rb-item"[^>]*>/)?.[0] ?? '';
    const segmentTag = html.match(/<div class="xa-al-rb-btn-item"[^>]*>/)?.[0] ?? '';

    expect(html).toContain('value="basic"');
    expect(html).toContain('value="grid"');
    expect(listTag).toContain('position:relative');
    expect(listTag).not.toContain('position:absolute');
    expect(listTag).not.toContain('left:0px');
    expect(segmentTag).toContain('position:relative');
    expect(segmentTag).not.toContain('position:absolute');
    expect(segmentTag).not.toContain('width:72px');
  });

  test('renders the public radio showcase fixture with AL radio variants', () => {
    const doc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/p_radio.xcon.json', import.meta.url), 'utf8'));
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html.match(/xa-al-rb-btn-item/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(html.match(/xa-al-rb-plan"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(html).toContain('xa-al-rb-rating-wrap');
    expect(html).toContain('xa-al-rb-plan__badge');
    expect(html).toContain('<p>All notifications</p>');
    expect(html).toContain('<small>Receive every update and alert</small>');
    expect(html).not.toContain('width:72px');
    expect(html).not.toContain('width:180px');
    expect(viewerCss).toContain('.xa-al-rb-btn-item');
    expect(viewerCss).toContain('.xa-al-rb-plan');
    expect(viewerCss).toContain('.xa-al-rb-rating-row');
  });

  test('renders checkbox list, terms, card, pill, and indeterminate variants', () => {
    const html = renderToHtml(
      {
        type: 'panel',
        components: {
          all: {
            type: 'checkbox',
            label: 'Select All · Toggle all permissions',
            value: 'indeterminate',
          },
          green: {
            type: 'checkbox',
            label: 'Write access · Create and modify records',
            value: 'checked',
            appearance: 'green',
          },
          terms: {
            type: 'checkbox',
            labelHtml: 'I agree to the <a href="#">Terms of Service</a>.',
            variant: 'terms',
          },
          card: {
            type: 'checkbox',
            label: '📊 Analytics · Track user behavior',
            value: 'checked',
            variant: 'card',
            al: { flex: '1 1 0', minWidth: '0' },
          },
          pill: {
            type: 'checkbox',
            label: 'Design',
            value: 'checked',
            variant: 'pill',
          },
        },
      },
      { allowHtml: true },
    );

    expect(html).toContain('xa-al-cb-box--indeterminate');
    expect(html).toContain('data-xa-indeterminate="1"');
    expect(html).toContain('xa-al-cb-box--green');
    expect(html).toContain('<p>Select All</p>');
    expect(html).toContain('<small>Toggle all permissions</small>');
    expect(html).toContain('class="xa-al-cb-item xa-al-cb-item--terms"');
    expect(html).toContain('<a href="#">Terms of Service</a>');
    expect(html).toContain('class="xa-al-cb-card"');
    expect(html).toContain('class="xa-al-cb-card-icon">📊</div>');
    expect(html).toContain('class="xa-al-cb-card-title">Analytics</div>');
    expect(html).toContain('class="xa-al-cb-card-sub">Track user behavior</div>');
    expect(html).toContain('class="xa-al-cb-pill"');
    expect(html).toContain('class="xa-al-cb-pill-lbl">Design</span>');
  });

  test('keeps checkbox card, pill, and terms variants from clipping draft AL content', () => {
    const html = renderToHtml({
      type: 'panel',
      components: {
        card: {
          type: 'checkbox',
          label: '📊 Analytics · Track user behavior',
          variant: 'card',
          pos: [0, 0, 180, 28],
        },
        pill: {
          type: 'checkbox',
          label: 'Design',
          variant: 'pill',
          pos: [0, 0, 120, 28],
        },
        terms: {
          type: 'checkbox',
          labelHtml: 'I agree to the <a href="#">Terms</a>.',
          variant: 'terms',
          pos: [0, 0, 220, 28],
        },
      },
    }, { allowHtml: true });
    const cardTag = html.match(/<label class="xa-al-cb-card"[^>]*>/)?.[0] ?? '';
    const pillTag = html.match(/<label class="xa-al-cb-pill"[^>]*>/)?.[0] ?? '';
    const termsTag = html.match(/<label class="xa-al-cb-item xa-al-cb-item--terms"[^>]*>/)?.[0] ?? '';

    expect(cardTag).toContain('height:auto');
    expect(cardTag).toContain('min-height:min-content');
    expect(cardTag).toContain('overflow:visible');
    expect(cardTag).not.toContain('height:28px');
    expect(pillTag).toContain('height:auto');
    expect(pillTag).toContain('width:auto');
    expect(pillTag).toContain('flex:0 0 auto');
    expect(pillTag).toContain('align-self:flex-start');
    expect(pillTag).not.toContain('width:120px');
    expect(pillTag).not.toContain('height:28px');
    expect(termsTag).toContain('height:auto');
    expect(termsTag).toContain('align-items:flex-start');
    expect(termsTag).not.toContain('height:28px');
  });

  test('renders the public checkbox showcase fixture with AL checkbox variants', () => {
    const doc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/p_checkbox.xcon.json', import.meta.url), 'utf8'));
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html).toContain('xa-al-cb-box--indeterminate');
    expect(html.match(/xa-al-cb-card/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(html.match(/xa-al-cb-pill/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(html).toContain('xa-al-cb-item--terms');
    expect(html).toContain('<a href="#">Terms of Service</a>');
    expect(html).toContain('xa-al-cb-box--green');
    expect(html).toContain('xa-al-cb-box--blue');
  });

  test('strips default 560px draft widths from flow children without explicit AL width', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { direction: 'row', gap: 8 },
      components: {
        title: {
          type: 'label',
          text: '최근 본 상품',
          pos: [0, 0, 560, 28],
          al: { flex: '1 1 auto' },
        },
        link: {
          type: 'label',
          text: '전체보기 >',
          pos: [0, 0, 560, 28],
          al: { flex: '0 0 auto' },
        },
      },
    });

    expect(html).toContain('data-key="root~title"');
    expect(html).toContain('data-key="root~link"');
    expect(html).not.toContain('width:560px');
    expect(html).toContain('width:auto');
    expect(html).toContain('max-width:100%');
  });

  test('does not duplicate pos width when a flow child has explicit AL width', () => {
    const html = renderToHtml({
      type: 'panel',
      al: { direction: 'column' },
      components: {
        hero: {
          type: 'banner',
          pos: [0, 0, 560, 228],
          al: { width: '100%' },
        },
      },
    });

    expect(html).toContain('data-key="root~hero"');
    expect(html).toContain('width:100%');
    expect(html).not.toContain('width:560px');
  });

  test('renders images with wrapper, fitted img, and overlay chrome', () => {
    const html = renderToHtml(
      {
        type: 'image',
        src: 'https://example.com/hero.jpg',
        objectFit: 'fill',
        overlayTag: 'LIVE',
        overlayTitle: 'anywhere',
        overlaySub: '수백만 숙소가\n당신을 기다립니다.',
        border: { radius: 18 },
        pos: [0, 0, 320, 180],
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('class="xa-al-img-overlay-wrap"');
    expect(html).toContain('<img');
    expect(html).toContain('object-fit:cover');
    expect(html).toContain('position:relative;overflow:hidden;box-sizing:border-box;background:var(--surface2)');
    expect(html).toContain('border-radius:0;object-position:center center;transition:transform .45s ease');
    expect(html).toContain('class="xa-al-img-overlay-tag" style="position:absolute;left:14px;top:14px;z-index:3;background:var(--accent);color:#fff;font-size:10px;font-weight:800;line-height:1;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:4px">LIVE</span>');
    expect(html).toContain('class="xa-al-img-overlay" style="position:absolute;inset:0;background:linear-gradient(to top, rgba(28,23,16,.88) 0%, rgba(28,23,16,0) 58%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px 20px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.28);z-index:2;pointer-events:none"');
    expect(html).toContain('class="xa-al-img-overlay-title" style="font-family:&quot;Playfair Display&quot;,Georgia,serif;font-size:18px;font-weight:700;line-height:1.2;color:#fff">anywhere</div>');
    expect(html).toContain('class="xa-al-img-overlay-tag"');
    expect(html).toContain('>LIVE</span>');
    expect(html).toContain('class="xa-al-img-overlay-title"');
    expect(html).toContain('>anywhere</div>');
    expect(html).toContain('수백만 숙소가<br>당신을 기다립니다.');
  });

  test('renders public image fallback as safe runtime data', () => {
    const html = renderToHtml(
      {
        type: 'image',
        src: 'https://example.com/missing.jpg',
        fallback: 'https://example.com/fallback.jpg',
        alt: '대체 이미지',
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('data-xcon-image-fallback="https://example.com/fallback.jpg"');
    expect(html).not.toContain('onerror');
    expect(viewerScript).toContain('[data-xcon-image-fallback]');
  });

  test('renders public image slideshow as safe runtime data', () => {
    const html = renderToHtml(
      {
        type: 'image',
        src: 'https://example.com/one.jpg',
        alt: '슬라이드',
        slideshow: {
          enabled: true,
          images: ['https://example.com/one.jpg', 'https://example.com/two.jpg'],
          duration: 1200,
          mode: 'once',
        },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('data-xcon-image-slideshow="true"');
    expect(html).toContain('data-xcon-image-slideshow-duration="1200"');
    expect(html).toContain('data-xcon-image-slideshow-mode="once"');
    expect(html).toContain('https://example.com/two.jpg');
    expect(html).not.toContain('<script');
    expect(viewerScript).toContain('[data-xcon-image-slideshow="true"]');
  });

  test('keeps image fitting on the img element and supports showcase shimmer placeholders', () => {
    const html = renderToHtml(
      {
        type: 'panel',
        al: { gap: 10 },
        components: {
          cover: {
            type: 'image',
            src: 'https://example.com/cover.jpg',
            objectFit: 'fill',
            border: { visible: false, radius: '12px' },
            pos: [0, 0, 560, 160],
          },
          skeleton: {
            type: 'label',
            text: '\u00a0',
            shimmer: 'true',
            shimmerDirection: 'rtl',
            color: 'transparent',
            labelPadding: '0',
            style: 'border-radius: var(--r-sm); min-height: 100px; display: block;',
            al: { width: '100%' },
          },
        },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('class="xa-al-img-overlay-wrap"');
    expect(html).toContain('<img');
    expect(html).toContain('object-fit:cover');
    expect(html).not.toContain('data-key="root~cover" style="object-fit:fill');
    expect(html).toContain('xa-al-sk-shimmer');
    expect(html).toContain('xa-al-sk-shimmer--rtl');
  });

  test('renders the public image showcase fixture with image overlay and shimmer chrome', () => {
    const doc = JSON.parse(readFileSync(new URL('../../../../examples/showcase/p_image.xcon.json', import.meta.url), 'utf8'));
    const html = renderToHtml(doc, { allowExternalResources: true, allowHtml: true });

    expect(html.match(/data-xcon-type="image"/g)?.length ?? 0).toBeGreaterThanOrEqual(12);
    expect(html).toContain('class="xa-al-img-overlay-tag"');
    expect(html).toContain('>Photography</span>');
    expect(html).toContain('class="xa-al-img-overlay-title"');
    expect(html).toContain('>Into the Wild Night</div>');
    expect(html.match(/xa-al-sk-shimmer/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(html).toContain('border-radius:50%');
    expect(html).toContain('object-fit:contain');
    expect(html).not.toContain('data-xcon-type="image" data-component="image" data-key="root~a04~rad~r1" style="object-fit:fill');
  });

  test('keeps banner slide images inside the banner height with overlays intact', () => {
    const html = renderToHtml(
      {
        type: 'banner',
        bannerHeight: '228px',
        pos: [0, 0, 560, 228],
        slides: [
          {
            type: 'image',
            src: 'https://example.com/hero.jpg',
            objectFit: 'fill',
            overlayTag: 'LIVE',
            overlayTitle: 'anywhere',
            overlaySub: '수백만 숙소가\n당신을 기다립니다.',
            pos: [0, 0, 560, 400],
            al: { width: '100%' },
          },
        ],
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('height:228px');
    expect(html).toContain('class="banner-slide"');
    expect(html).toContain('class="xa-al-img-overlay-wrap"');
    expect(html).toContain('height:100%;min-height:0');
    expect(html).not.toContain('min-height:400px');
    expect(html).toContain('class="xa-al-img-overlay-title"');
    expect(html).toContain('>anywhere</div>');
  });

  test('renders banner slide images eagerly so autoplay does not reveal blank lazy slides', () => {
    const html = renderToHtml(
      {
        type: 'banner',
        autoplay: { enabled: true, loop: true },
        slides: [
          { type: 'image', src: 'https://example.com/1.jpg' },
          { type: 'image', src: 'https://example.com/2.jpg' },
          { type: 'image', src: 'https://example.com/3.jpg' },
        ],
      },
      { allowExternalResources: true },
    );

    expect(html.match(/loading="eager"/g)?.length).toBe(3);
    expect(html.match(/draggable="false"/g)?.length).toBe(3);
    expect(html).not.toContain('loading="lazy"');
  });

  test('renders list rows inside xlist item container like draft XaList', () => {
    const html = renderToHtml(
      {
        type: 'list',
        direction: 'horizontal',
        separator: { size: 12 },
        itemSize: { width: 168, height: 228 },
        dataTemplate: {
          type: 'template',
          template: {
            tabledata: [
              { title: '감성 스튜디오', image: 'https://example.com/stay.jpg' },
              { title: '산장 뷰 하우스', image: 'https://example.com/stay-2.jpg' },
            ],
          },
        },
        templates: {
          cell: {
            cover: { type: 'image', src: '{{item.image}}', pos: [0, 0, 168, 168] },
            title: { type: 'label', text: '{{item.title}}', pos: [10, 178, 148, 20] },
          },
        },
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('class="xlist-content"');
    expect(html).toContain('class="xlist-items-container"');
    expect(html).toContain('class="xlist-item"');
    expect(html).toContain('min-width:168px');
    expect(html).toContain('margin-right:12px');
  });

  test('renders banner slides with draft AL banner container structure', () => {
    const html = renderToHtml(
      {
        type: 'banner',
        variant: 'hero',
        slides: [
          { type: 'image', src: 'https://example.com/1.jpg' },
          { type: 'image', src: 'https://example.com/2.jpg' },
        ],
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('xa-al-banner--hero');
    expect(html).toContain('data-banner-chrome="landing"');
    expect(html).toContain('class="banner-container"');
    expect(html).toContain('class="banner-slide"');
    expect(html).toContain('data-key="root~slides0"');
  });

  test('renders banner as an interactive carousel with indicators and autoplay data', () => {
    const html = renderToHtml(
      {
        type: 'banner',
        direction: 'horizontal',
        indicator: { show: true, color: '255,255,255,255' },
        autoplay: { enabled: true, interval: 4000, loop: true, rolling: true },
        slides: [
          { type: 'image', src: 'https://example.com/1.jpg' },
          { type: 'image', src: 'https://example.com/2.jpg' },
          { type: 'image', src: 'https://example.com/3.jpg' },
        ],
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('data-orientation="horizontal"');
    expect(html).toContain('data-auto-scroll="true"');
    expect(html).toContain('data-duration="4000"');
    expect(html).toContain('data-loop="true"');
    expect(html).toContain('data-rolling="true"');
    expect(html.match(/class="banner-slide"/g)?.length).toBe(4);
    expect(html.match(/class="banner-indicator"/g)?.length).toBe(3);
    expect(html).toContain('data-xcon-banner-dot="0"');
  });

  test('ships carousel runtime with pointer drag tracking', () => {
    expect(viewerScript).toContain("addEventListener('pointermove'");
    expect(viewerScript).toContain("addEventListener('pointercancel'");
    expect(viewerScript).toContain('banner.clientHeight');
    expect(viewerScript).toContain('slide.style.minHeight');
    expect(viewerScript).toContain('translate3d(');
  });

  test('renderDocument includes the public static viewer stylesheet', () => {
    const html = renderDocument({ type: 'label', text: 'Styled' });

    expect(html).toContain('<style id="xcon-viewer-style">');
    expect(html).toContain('.xa-al-panel-root');
    expect(html).toContain('button.xa-al-btn');
    expect(html).toContain('.xa-al-tf');
    expect(html).toContain('.xa-al-img-overlay-wrap');
    expect(html).toContain('.xa-al-img-overlay{position:absolute;inset:0');
    expect(html).toContain('linear-gradient(to top');
    expect(html).toContain('.xa-al-form__stack');
    expect(html).toContain('.xa-al-cb-item');
    expect(html).toContain('.xa-al-banner');
    expect(html).toContain('.xa-al-banner img{user-select:none;-webkit-user-drag:none}');
    expect(html).toContain('html[data-theme="dark"],[data-xcon-theme="dark"]');
    expect(html).toContain('.xa-al-btn__spinner');
    expect(html).toContain('.xa-al-btn--seg-first');
    expect(html).toContain('.xa-al-btn--split-main');
    expect(html).toContain('.xa-al-btn--stack-col .xa-al-btn__icon{width:22px;height:22px}');
    expect(html).toContain('<script id="xcon-viewer-runtime">');
    expect(html).toContain('xconViewerHydrate');
  });

  test('renderDocument frames fixed screens like browser render', () => {
    const html = renderDocument({ type: 'form', pos: [0, 0, 360, 220], backgroundColor: '#f8fafc' });

    expect(html).toContain('class="xcon-viewer-host"');
    expect(html).toContain('data-xcon-viewer-host');
    expect(html).toContain('width:360px');
    expect(html).toContain('height:220px');
    expect(html).toContain('overflow:visible');
    expect(html).toContain('position:absolute;left:0px;top:0px;width:360px;height:220px');
  });

  test('renders advanced third-party component shells like draft advanced components without executable handlers', () => {
    const chart = renderToHtml({
      type: 'chart',
      pos: [0, 0, 320, 180],
      chartType: 'bar',
      chartData: { labels: ['Jan', 'Feb'], datasets: [{ label: 'Revenue', data: [12, 24] }] },
    });
    expect(chart).toContain('class="xa-chart-container"');
    expect(chart).toContain('data-component="chart"');
    expect(chart).toContain('<canvas id="chart-root" style="width:100%;height:100%;"');
    expect(chart).toContain('id="chart-loading-root"');
    expect(chart).toContain('차트 로딩 중...');

    const codeEditor = renderToHtml({
      type: 'codeEditor',
      pos: [0, 0, 360, 220],
      value: 'const msg = "<safe>";',
    });
    expect(codeEditor).toContain('class="xa-code-editor-container"');
    expect(codeEditor).toContain('id="editor-root"');
    expect(codeEditor).toContain('placeholder="코드를 입력하세요..."');
    expect(codeEditor).toContain('const msg = &quot;&lt;safe&gt;&quot;;');
    expect(codeEditor).toContain('에디터 로딩 중...');

    const richEditor = renderToHtml({ type: 'richEditor', pos: [0, 0, 360, 220] });
    expect(richEditor).toContain('class="xa-rich-editor-container"');
    expect(richEditor).toContain('id="rich-editor-root"');
    expect(richEditor).toContain('리치 에디터 로딩 중...');

    const dataViz = renderToHtml({
      type: 'dataViz',
      pos: [0, 0, 360, 220],
      data: [{ label: 'A', value: 3 }],
    });
    expect(dataViz).toContain('class="xa-dataviz-container"');
    expect(dataViz).toContain('id="dataviz-root"');
    expect(dataViz).toContain('데이터 시각화 로딩 중...');

    const spanGrid = renderToHtml({
      type: 'spanGrid',
      pos: [0, 0, 360, 180],
      data: [
        ['Name', 'Status', 'Owner'],
        ['XCON', 'Ready', 'Viewer'],
        ['SKETCH', 'Public', 'Playground'],
        ['SpanGrid', 'Readonly', 'Docs'],
      ],
      merges: [
        { start: { row: 0, col: 0 }, end: { row: 0, col: 2 } },
        { start: { row: 2, col: 1 }, end: { row: 3, col: 2 } },
      ],
    });
    expect(spanGrid).toContain('class="xa-spangrid-container"');
    expect(spanGrid).toContain('data-component="spanGrid"');
    expect(spanGrid).toContain('data-xcon-spangrid');
    expect(spanGrid).toContain('data-xcon-spangrid-options="{&quot;readonly&quot;:true');
    expect(spanGrid).toContain('&quot;XCON&quot;');
    expect(spanGrid).toContain('&quot;merges&quot;');
    expect(spanGrid).toContain('colspan="3"');
    expect(spanGrid).toContain('rowspan="2"');
    expect(spanGrid).toContain('SpanGrid loading...');
    expect(spanGrid).toContain('width:360px');
    expect(spanGrid).toContain('height:180px');
    expect(spanGrid).not.toContain('width:100%;height:100%;overflow:hidden');
    expect(viewerCss).toContain('.xa-spangrid-surface{width:100%;height:100%;overflow:auto');
    expect(viewerCss).toContain('.xa-spangrid-table{width:100%;border-collapse:collapse');
    expect(viewerCss).not.toContain('.xa-spangrid-table{width:100%;height:100%');

    const scrollableSpanGrid = renderToHtml({
      type: 'spanGrid',
      pos: [0, 0, 260, 120],
      fixed: { rows: 1, columns: 1 },
      columns: [
        { id: 'metric', title: 'Metric', width: 120 },
        { id: 'jan', title: 'Jan', width: 96 },
        { id: 'feb', title: 'Feb', width: 96 },
        { id: 'mar', title: 'Mar', width: 96 },
      ],
      rows: [
        { height: 32 },
        { height: 40 },
        { height: 40 },
        { height: 40 },
      ],
      data: [
        ['Metric', 'Jan', 'Feb', 'Mar'],
        ['Sales', '10', '12', '14'],
        ['Cost', '4', '5', '6'],
        ['Margin', '6', '7', '8'],
      ],
    });
    expect(scrollableSpanGrid).toContain('data-xcon-spangrid-scroll');
    expect(scrollableSpanGrid).toContain('style="min-width:408px');
    expect(scrollableSpanGrid).toContain('height:152px');
    expect(scrollableSpanGrid).toContain('xa-spangrid-cell--fixed-row');
    expect(scrollableSpanGrid).toContain('xa-spangrid-cell--fixed-col');
    expect(scrollableSpanGrid).toContain('xa-spangrid-cell--fixed-corner');
    expect(scrollableSpanGrid).toContain('position:sticky;top:0px;left:0px');
    expect(scrollableSpanGrid).toContain('position:sticky;top:0px;');
    expect(scrollableSpanGrid).toContain('position:sticky;left:0px;');

    const snapshotSpanGrid = renderToHtml({
      type: 'spanGrid',
      pos: [0, 0, 362, 160],
      snapshot: {
        width: 362,
        height: 160,
        gridBorder: {
          borderDirection: 'All',
          lineStyle: 'Solid',
          lineWidth: 1,
          topColor: '#d0d7e0',
          leftColor: '#d0d7e0',
          rightColor: '#d0d7e0',
          bottomColor: '#d0d7e0',
        },
        fixed: { row: 0, col: 0 },
        cols: [{ width: 120 }, { width: 96 }, { width: 120 }],
        rows: [
          {
            height: 38,
            cells: [
              { text: 'Project Status', backColor: '#1a2744', foreColor: '#ffffff', font: 'bold 10pt sans-serif', textAlign: 'MiddleCenter' },
              { text: '', backColor: '#1a2744', foreColor: '#ffffff' },
              { text: '', backColor: '#1a2744', foreColor: '#ffffff' },
            ],
          },
          {
            height: 30,
            cells: [
              { text: 'Name', backColor: '#f1f5f9', foreColor: '#111827', font: 'bold 9pt sans-serif', textAlign: 'MiddleCenter' },
              { text: 'Status', backColor: '#f1f5f9', foreColor: '#111827', font: 'bold 9pt sans-serif', textAlign: 'MiddleCenter' },
              { text: 'Owner', backColor: '#f1f5f9', foreColor: '#111827', font: 'bold 9pt sans-serif', textAlign: 'MiddleCenter' },
            ],
          },
          {
            height: 32,
            cells: [
              { text: 'XCON', backColor: '#ffffff', foreColor: '#1f2937', textAlign: 'MiddleLeft' },
              { text: 'Ready', backColor: '#dcfce7', foreColor: '#166534', font: 'bold 9pt sans-serif', textAlign: 'MiddleCenter' },
              { text: 'Viewer', backColor: '#ffffff', foreColor: '#1f2937', textAlign: 'MiddleCenter' },
            ],
          },
        ],
        merges: [
          { start: { row: 0, col: 0 }, end: { row: 0, col: 2 } },
        ],
      },
    });
    expect(snapshotSpanGrid).toContain('Project Status');
    expect(snapshotSpanGrid).toContain('colspan="3"');
    expect(snapshotSpanGrid).toContain('background-color:#1a2744');
    expect(snapshotSpanGrid).toContain('color:#ffffff');
    expect(snapshotSpanGrid).toContain('font:bold 10pt sans-serif');
    expect(snapshotSpanGrid).toContain('text-align:center');
    expect(snapshotSpanGrid).toContain('vertical-align:middle');
    expect(snapshotSpanGrid).toContain('style="width:120px"');
    expect(snapshotSpanGrid).toContain('height:100px');
    expect(snapshotSpanGrid).toContain('position:sticky;top:0px;left:0px');

    const lightSnapshotSpanGrid = renderToHtml(`
      screen "Grid Contrast" 460x180 bg "#0f172a"
        grid: spanGrid at 20 20 400 120
          backgroundColor "#ffffff"
          readonly true
          snapshot {"width":400,"height":120,"cols":[{"width":120},{"width":120}],"rows":[{"height":34,"cells":[{"text":"Name","backColor":"#f1f5f9","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"Status","backColor":"#f1f5f9","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":42,"cells":[{"text":"Mina","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"Ready","foreColor":"#111827","textAlign":"MiddleCenter"}]}],"fixed":{"row":0,"col":0}}
    `);
    expect(lightSnapshotSpanGrid).toContain('Mina');
    expect(lightSnapshotSpanGrid).toContain('background-color:#ffffff;color:#111827');

    const flipbook = renderToHtml({
      type: 'flipbook',
      pages: 2,
      pageFolder: 'content/magazine',
    });
    expect(flipbook).toContain('class="xa-flipbook-container"');
    expect(flipbook).toContain('class="catalog-app"');
    expect(flipbook).toContain('id="flipbook-root"');
    expect(flipbook).toContain('data-page="1"');
    expect(flipbook).toContain('src="content/magazine/1.jpg"');
    expect(flipbook).toContain('data-xcon-flipbook-next');

    const network = renderToHtml({
      type: 'networkDiagram',
      pos: [0, 0, 420, 260],
      nodes: [{ id: 'root', label: 'Root' }],
    });
    expect(network).toContain('class="xa-network-diagram-container"');
    expect(network).toContain('data-xcon-network="true"');
    expect(network).toContain('data-xcon-network-theme="obsidian"');
    expect(network).toContain('data-xcon-network-model=');
    expect(network).toContain('id="network-diagram-root"');
    expect(network).toContain('class="network-svg"');
    expect(network).toContain('class="network-tooltip"');

    const map = renderToHtml({ type: 'map', pos: [0, 0, 360, 220] });
    expect(map).toContain('class="xa-map-container"');
    expect(map).toContain('id="map-root"');
    expect(map).toContain('지도 로딩 중...');

    const calendar = renderToHtml({ type: 'calendar', pos: [0, 0, 360, 260] });
    expect(calendar).toContain('class="xa-calendar-container"');
    expect(calendar).toContain('id="calendar-root"');
    expect(calendar).toContain('캘린더 로딩 중...');

    const combined = [chart, codeEditor, richEditor, dataViz, spanGrid, flipbook, network, map, calendar].join('\n');
    expect(combined).not.toMatch(/\son(?:click|error|load)=/i);
    expect(combined).not.toContain('<script');
  });

  test('preserves xcon absolute positions on advanced component roots', () => {
    const chart = renderToHtml({
      type: 'chart',
      pos: [24, 250, 424, 132],
      chartType: 'line',
      chartData: { labels: ['10', '11'], datasets: [{ data: [22, 24] }] },
    });
    const chartRoot = chart.match(/<div[^>]+data-xcon-type="chart"[^>]*>/)?.[0] ?? '';

    expect(chartRoot).toContain('position:absolute');
    expect(chartRoot).toContain('left:24px');
    expect(chartRoot).toContain('top:250px');
    expect(chartRoot).toContain('width:424px');
    expect(chartRoot).toContain('height:132px');
    expect(chartRoot).not.toMatch(/position:absolute[^"]*position:relative/);

    const spanGrid = renderToHtml({
      type: 'spanGrid',
      pos: [468, 250, 228, 132],
      data: [
        ['Item', 'Value'],
        ['Humidity', '64%'],
      ],
    });
    const spanGridRoot = spanGrid.match(/<div[^>]+data-xcon-type="spanGrid"[^>]*>/)?.[0] ?? '';

    expect(spanGridRoot).toContain('position:absolute');
    expect(spanGridRoot).toContain('left:468px');
    expect(spanGridRoot).toContain('top:250px');
    expect(spanGridRoot).toContain('width:228px');
    expect(spanGridRoot).toContain('height:132px');
    expect(spanGridRoot).not.toMatch(/position:absolute[^"]*position:relative/);
  });

  test('keeps advanced network visual options aligned with draft XaNetworkDiagram', () => {
    const html = renderToHtml({
      type: 'networkDiagram',
      nodes: [
        { id: 'root', label: 'Root' },
        { id: 'child', label: 'Child', color: '#ff00aa' },
      ],
      links: [{ source: 'root', target: 'child', type: 'folder' }],
      backgroundColor: '#101820',
      linkColor: '#334455',
      refLinkColor: '#556677',
      primaryColor: '#778899',
      textColor: '#abcdef',
      nodeRadius: 32,
      showLabels: false,
      showArrows: false,
    });

    expect(html).toContain('--xcon-network-bg:#101820');
    expect(html).toContain('stroke="#556677"');
    expect(html).toContain('r="32"');
    expect(html).toContain('fill="#ff00aa"');
    expect(html).not.toContain('class="network-label"');
    expect(html).not.toContain('marker-end=');
  });

  test('preserves advanced network outer wrapper attributes and inner runtime container', () => {
    const html = renderToHtml({
      type: 'form',
      components: {
        topology: {
          type: 'networkDiagram',
          pos: [8, 16, 420, 260],
          nodes: [{ id: 'root', label: 'Root' }],
        },
      },
    });
    const networkRoot = html.match(/<div\b(?=[^>]*data-xcon-type="networkDiagram")[^>]*>/)?.[0] ?? '';
    const networkContainer = html.match(/<div\b(?=[^>]*data-xcon-network="true")[^>]*>/)?.[0] ?? '';

    expect(networkRoot).toContain('data-xcon-type="networkDiagram"');
    expect(networkRoot).toContain('data-key="root~topology"');
    expect(networkRoot).toContain('position:absolute');
    expect(networkRoot).not.toContain('data-xcon-network="true"');
    expect(networkContainer).toContain('id="network-container-topology"');
    expect(networkContainer).toContain('data-xcon-network="true"');
  });

  test('keeps advanced calendar events visible like draft XaCalendar data', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day1 = String(now.getDate()).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const day2 = String(Math.min(now.getDate() + 1, lastDay)).padStart(2, '0');

    const html = renderToHtml({
      type: 'calendar',
      locale: 'ko',
      events: [
        { title: 'Design Review', start: `${year}-${month}-${day1}` },
        { title: 'Release', date: `${year}-${month}-${day2}` },
      ],
    });

    expect(html).toContain('class="fc-event"');
    expect(html).toContain('Design Review');
    expect(html).toContain('Release');
  });

  test('keeps advanced map marker data visible like draft XaMap data', () => {
    const html = renderToHtml({
      type: 'map',
      latitude: 37.5665,
      longitude: 126.978,
      zoom: 12,
      tileLayer: 'CartoDB',
      snapshotUrl: 'maps/seoul-cityhall-z15.png',
      snapshotAlt: 'Seoul City Hall map',
      attribution: 'OpenStreetMap contributors',
      markers: [
        { lat: 37.57, lng: 126.99, popup: 'Seoul Office' },
        { lat: 37.55, lng: 126.97, title: 'HQ' },
      ],
    });

    expect(html).toContain('data-latitude="37.5665"');
    expect(html).toContain('data-longitude="126.978"');
    expect(html).toContain('data-zoom="12"');
    expect(html).toContain('data-tile-layer="CartoDB"');
    expect(html).toContain('class="xa-map-snapshot"');
    expect(html).toContain('src="maps/seoul-cityhall-z15.png"');
    expect(html).toContain('alt="Seoul City Hall map"');
    expect(html).toContain('OpenStreetMap contributors');
    expect(html).toContain('title="Seoul Office"');
    expect(html).toContain('Se');
    expect(html).toContain('HQ');
  });

  test('renders a generated static map fallback when no snapshot image is provided', () => {
    const html = renderToHtml({
      type: 'map',
      latitude: 37.5665,
      longitude: 126.978,
      zoom: 12,
      tileLayer: 'CartoDB',
      markers: [{ lat: 37.5665, lng: 126.978, title: 'City Hall' }],
    });

    expect(html).toContain('xa-map-layer xa-map-water');
    expect(html).toContain('xa-map-road xa-map-road--main');
    expect(html).toContain('title="City Hall"');
  });

  test('hydrates Leaflet OpenStreetMap maps only when external resources are allowed', () => {
    const map = {
      type: 'map',
      provider: 'leaflet',
      latitude: 36.2,
      longitude: 127.8,
      zoom: 6,
      tileLayer: 'OpenStreetMap',
      attribution: '(C) OpenStreetMap contributors',
      markers: [
        { lat: 37.5665, lng: 126.978, label: 'Seoul 22.9C' },
        { lat: 35.1796, lng: 129.0756, label: 'Busan drizzle' },
      ],
      heatmap: [
        [37.5665, 126.978, 0.8],
        [35.1796, 129.0756, 0.5],
      ],
      polylines: [{ points: [[37.5665, 126.978], [35.1796, 129.0756]], color: '#2563eb' }],
      polygons: [{ points: [[37.5, 126.9], [37.6, 126.9], [37.6, 127.0]], color: '#14b8a6' }],
      clustering: true,
    };

    const safeHtml = renderToHtml(map);
    expect(safeHtml).not.toContain('data-xcon-leaflet-map');
    expect(safeHtml).toContain('static map preview');

    const liveHtml = renderToHtml(map, { allowExternalResources: true });
    expect(liveHtml).toContain('data-xcon-leaflet-map');
    expect(liveHtml).toContain('data-xcon-map-provider="leaflet"');
    expect(liveHtml).toContain('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(liveHtml).toContain('Seoul 22.9C');
    expect(liveHtml).toContain('Busan drizzle');
    expect(liveHtml).toContain('data-xcon-map-heatmap=');
    expect(liveHtml).toContain('data-xcon-map-polylines=');
    expect(liveHtml).toContain('data-xcon-map-polygons=');
    expect(liveHtml).toContain('data-xcon-map-clustering="true"');
    expect(viewerScript).toContain('hydrateLeafletMaps');
    expect(viewerScript).toContain('applyLeafletMapLayers');
    expect(viewerScript).toContain('_leaflet_map');
    expect(viewerScript).toContain('ensureLeafletStyles(host.getRootNode');
    expect(viewerScript).toContain('divIcon');
    expect(viewerScript).toContain('leaflet@1.9.4/dist/leaflet.js');
  });

  test('renders D3-style static dataViz previews without requiring runtime D3', () => {
    const hierarchy = {
      name: 'Ops',
      children: [
        { name: 'Queue', value: 38 },
        { name: 'Scheduler', value: 24 },
        { name: 'Runner', value: 18 },
      ],
    };
    const graph = {
      nodes: [
        { id: 'fixture', label: 'Fixture' },
        { id: 'chain', label: 'Chain' },
        { id: 'sketch', label: 'SKETCH' },
      ],
      links: [
        { source: 'fixture', target: 'chain' },
        { source: 'chain', target: 'sketch' },
      ],
    };

    const treemap = renderToHtml({ type: 'dataViz', vizType: 'treemap', data: hierarchy });
    const sunburst = renderToHtml({ type: 'dataViz', vizType: 'sunburst', data: hierarchy });
    const forceGraph = renderToHtml({ type: 'dataViz', vizType: 'forceGraph', data: graph });

    expect(treemap).toContain('xa-dataviz-preview--treemap');
    expect(treemap).toContain('<svg');
    expect(treemap).toContain('Queue');
    expect(sunburst).toContain('xa-dataviz-preview--sunburst');
    expect(sunburst).toContain('<path');
    expect(forceGraph).toContain('xa-dataviz-preview--force-graph');
    expect(forceGraph).toContain('Fixture');
    expect(forceGraph).toContain('<line');
  });

  test('keeps advanced chart and editor options visible like draft advanced components', () => {
    const chart = renderToHtml({
      type: 'chart',
      chartType: 'line',
      chartData: { labels: ['A'], datasets: [{ data: [1] }] },
      chartOptions: { scales: { y: { beginAtZero: true } } },
      responsive: false,
      animation: false,
    });
    const codeEditor = renderToHtml({
      type: 'codeEditor',
      mode: 'css',
      theme: 'monokai',
      lineNumbers: false,
      readOnly: true,
    });
    const richEditor = renderToHtml({
      type: 'richEditor',
      theme: 'bubble',
      placeholder: 'Write here',
      readOnly: true,
      modules: { toolbar: false },
    });
    const dataViz = renderToHtml({
      type: 'dataViz',
      vizType: 'pie',
      data: [{ label: 'A', value: 2 }],
      config: { innerRadius: 12 },
      interactive: false,
    });

    expect(chart).toContain('data-xcon-chart-options="{&quot;scales&quot;:{&quot;y&quot;:{&quot;beginAtZero&quot;:true}}}"');
    expect(chart).toContain('data-xcon-chart-responsive="false"');
    expect(chart).toContain('data-xcon-chart-animation="false"');
    expect(codeEditor).toContain('data-xcon-code-line-numbers="false"');
    expect(codeEditor).toContain('z-index:1000');
    expect(richEditor).toContain('data-xcon-rich-theme="bubble"');
    expect(richEditor).toContain('data-xcon-rich-placeholder="Write here"');
    expect(richEditor).toContain('data-xcon-rich-readonly="true"');
    expect(richEditor).toContain('Write here');
    expect(dataViz).toContain('data-xcon-dataviz-type="pie"');
    expect(dataViz).toContain('data-xcon-dataviz-config="{&quot;innerRadius&quot;:12}"');
    expect(dataViz).toContain('data-xcon-dataviz-interactive="false"');
  });

  test('renders distinct static chart previews for public chart gallery types', () => {
    const chartData = {
      labels: ['North', 'South', 'East', 'West', 'Central'],
      datasets: [{ label: 'Score', data: [42, 31, 26, 18, 35] }],
    };
    const pointData = {
      datasets: [
        {
          label: 'Signal',
          data: [
            { x: 1, y: 42, r: 9 },
            { x: 2, y: 31, r: 7 },
            { x: 3, y: 26, r: 6 },
            { x: 4, y: 18, r: 5 },
          ],
        },
      ],
    };

    const radar = renderToHtml({ type: 'chart', chartType: 'radar', chartData });
    const polarArea = renderToHtml({ type: 'chart', chartType: 'polarArea', chartData });
    const pie = renderToHtml({ type: 'chart', chartType: 'pie', chartData });
    const doughnut = renderToHtml({ type: 'chart', chartType: 'doughnut', chartData });
    const scatter = renderToHtml({ type: 'chart', chartType: 'scatter', chartData: pointData });
    const bubble = renderToHtml({ type: 'chart', chartType: 'bubble', chartData: pointData });

    expect(pie).toContain('xa-chart-preview--pie');
    expect(pie).toContain('<path');
    expect(pie).toContain('var(--xcon-chart-accent, var(--accent, #2563eb))');
    expect(pie).not.toContain('stroke-dasharray');
    expect(doughnut).toContain('xa-chart-preview--doughnut');
    expect(doughnut).toContain('stroke-dasharray');
    expect(doughnut).not.toBe(pie);
    expect(radar).toContain('xa-chart-preview--radar');
    expect(radar).toContain('<polygon');
    expect(radar).not.toContain('<rect');
    expect(polarArea).toContain('xa-chart-preview--polar-area');
    expect(polarArea).toContain('<path');
    expect(polarArea).not.toContain('<rect');
    expect(scatter).toContain('xa-chart-preview--scatter');
    expect(scatter).toContain('<circle');
    expect(scatter).not.toContain('<rect');
    expect(bubble).toContain('xa-chart-preview--bubble');
    expect(bubble).toContain('<circle');
    expect(bubble).not.toContain('<rect');
  });

  test('keeps advanced flipbook page sizing aligned with draft XaFlipbook options', () => {
    const html = renderToHtml(
      {
        type: 'flipbook',
        pages: 2,
        pageWidth: 320,
        pageHeight: 480,
        pageFolder: 'content/book',
        showControls: false,
        showMiniatures: false,
      },
      { allowExternalResources: true },
    );

    expect(html).toContain('data-xcon-flipbook-page-width="320"');
    expect(html).toContain('data-xcon-flipbook-page-height="480"');
    expect(html).toContain('style="width:320px;height:480px;"');
    expect(html).toContain('src="content/book/1.jpg"');
    expect(html).not.toContain('data-xcon-flipbook-next');
    expect(html).not.toContain('class="flipbook-miniatures"');
  });

  test('keeps advanced flipbook chrome and safe controls aligned with draft XaFlipbook', () => {
    const html = renderToHtml({
      type: 'flipbook',
      pages: 3,
      pageFolder: 'content/magazine',
    });

    expect(html).toContain('class="ui-arrow-control ui-arrow-next-page"');
    expect(html).toContain('class="ui-arrow-control ui-arrow-previous-page"');
    expect(html).toContain('data-xcon-flipbook-miniatures');
    expect(viewerCss).toContain('.xa-flipbook-container .ui-flipbook .page img{max-width:100%;max-height:100%;object-fit:contain}');
    expect(viewerCss).toContain('.flipbook-controls{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);padding:10px;border-radius:5px;display:flex;gap:10px;z-index:1000}');
    expect(viewerCss).toContain('.flipbook-control-btn{background:#333;color:white;border:none;padding:8px 12px;border-radius:3px;cursor:pointer;font-size:14px}');
    expect(viewerCss).toContain('.flipbook-miniatures{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);padding:10px;border-radius:5px;display:none;max-width:80%;overflow-x:auto}');
    expect(viewerCss).toContain('.ui-arrow-control{position:absolute;top:50%;transform:translateY(-50%);width:50px;height:50px;background:rgba(0,0,0,.6);color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:1001;border-radius:25px;font-size:24px;font-weight:bold;transition:all .3s ease;border:2px solid rgba(255,255,255,.3)}');
    expect(viewerScript).toContain('data-xcon-flipbook-miniatures');
    expect(viewerScript).toContain("miniatureList.style.display === 'none' ? 'block' : 'none'");
  });

  test('ships safe runtime hooks for advanced flipbook without file upload controls', () => {
    expect(viewerScript).toContain('function hydrateFlipbooks');
    expect(viewerScript).toContain('data-xcon-flipbook-next');
    expect(viewerScript).not.toContain('function hydrateFileUploads');
    expect(viewerScript).not.toContain('data-xcon-file-upload');
    expect(viewerScript).not.toContain('isAcceptedRuntimeFile');
    expect(viewerScript).not.toContain('window.flipbookInstances');
    expect(viewerScript).not.toContain('window.fileUploadInstances');
  });

  test('keeps advanced map, calendar, and network CSS aligned with draft advanced components', () => {
    expect(viewerCss).toContain('.network-svg:active{cursor:grabbing}');
    expect(viewerCss).toContain('.network-link.ref-link{stroke:var(--xcon-network-ref-link,#a0aec0);stroke-opacity:.5;stroke-width:2px;stroke-dasharray:8,4;animation:dash 2s linear infinite}');
    expect(viewerCss).toContain('.network-tooltip::before{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:8px solid transparent;border-top-color:rgba(102,126,234,.95)}');
    expect(viewerCss).toContain('@keyframes dash{to{stroke-dashoffset:-12}}');
    expect(viewerCss).toContain('.xa-map-snapshot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover');
    expect(viewerCss).toContain('.xa-map .leaflet-popup-content-wrapper{border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15)}');
    expect(viewerCss).toContain('.xa-calendar .fc-event{border-radius:4px;border:none;padding:2px 4px}');
    expect(viewerCss).toContain('.xa-calendar .fc-button-primary:hover{background:#5a67d8;border-color:#5a67d8}');
  });

  test('keeps playground chrome styles scoped outside rendered preview content', () => {
    const playground = readFileSync(new URL('../../../../playground/index.html', import.meta.url), 'utf8');
    const css = playground.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';

    expect(css).not.toMatch(/^\s*(main|header|h1|button)(?:\s|[:.{#\[,>])/m);
    expect(css).toContain('--border:');
    expect(css).toContain('--ink:');
    expect(css).toContain('--accent:');
    expect(css).not.toMatch(/#preview\s+(?:input|textarea|select|button)\b/);
    expect(css).not.toMatch(/#preview\s*>\s*\[data-xcon-type="form"\]/);
    expect(css).toMatch(/#preview\s*\{[\s\S]*?overflow:\s*visible;/);
  });

  test('uses rich preview options in the playground authoring surface', () => {
    const playground = readFileSync(new URL('../../../../playground/index.html', import.meta.url), 'utf8');

    expect(playground).toContain('const previewRenderOptions = { allowExternalResources: true, allowHtml: true };');
    expect(playground).toContain('render(doc, preview, previewRenderOptions);');
    expect(playground).toContain('renderDocument(lastDocument, previewRenderOptions);');
  });

  test('playground exposes theme and accent controls for rendered preview', () => {
    const playground = readFileSync(new URL('../../../../playground/index.html', import.meta.url), 'utf8');

    expect(playground).toContain('class="theme-panel"');
    expect(playground).toContain('data-theme-option="light"');
    expect(playground).toContain('data-theme-option="dark"');
    expect(playground).toContain('id="accentColorPicker"');
    expect(playground).toContain('id="accentHexInput"');
    expect(playground).toContain('class="theme-preset-dot"');
    expect(playground).toContain("localStorage.setItem('xcon-playground-theme'");
    expect(playground).toContain("localStorage.setItem('xcon-playground-accent'");
    expect(playground).toContain("preview.style.setProperty('--accent'");
    expect(playground).toContain('applyTheme(readSavedTheme())');
    expect(playground).toContain('applyAccent(');
  });

  test('playground panes can be resized with a splitter', () => {
    const playground = readFileSync(new URL('../../../../playground/index.html', import.meta.url), 'utf8');

    expect(playground).toContain('grid-template-columns: minmax(280px, var(--editor-pane-size, 50%)) 8px minmax(320px, 1fr);');
    expect(playground).toContain('class="pane-splitter"');
    expect(playground).toContain('id="paneSplitter"');
    expect(playground).toContain('aria-label="Resize source and preview panes"');
    expect(playground).toContain("document.getElementById('paneSplitter')");
    expect(playground).toContain("addEventListener('pointerdown', startPaneResize)");
    expect(playground).toContain("document.documentElement.style.setProperty('--editor-pane-size'");
  });

  test('markdown playground is a separate page that renders XCON fences', () => {
    const playground = readFileSync(new URL('../../../../playground/index.html', import.meta.url), 'utf8');
    const markdownPlayground = readFileSync(new URL('../../../../playground/markdown.html', import.meta.url), 'utf8');

    expect(playground).not.toContain('id="markdownSource"');
    expect(markdownPlayground).toContain('<title>XCON Markdown Playground</title>');
    expect(markdownPlayground).toContain('id="markdownSource"');
    expect(markdownPlayground).toContain('id="markdownPreview"');
    expect(markdownPlayground).toContain('"@xcon-viewer/markdown-it": "../packages/markdown-it/dist/index.js"');
    expect(markdownPlayground).toContain('src="../vendor/markdown-it/markdown-it.min.js"');
    expect(markdownPlayground).not.toContain('../node_modules/markdown-it/');
    expect(markdownPlayground).not.toContain("import MarkdownIt from 'markdown-it';");
    expect(markdownPlayground).toContain("import xconMarkdownIt from '@xcon-viewer/markdown-it';");
    expect(markdownPlayground).toContain('const MarkdownIt = globalThis.markdownit;');
    expect(markdownPlayground).toContain('const markdown = MarkdownIt({');
    expect(markdownPlayground).toContain('markdown.use(xconMarkdownIt');
    expect(markdownPlayground).toContain("containerClass: 'markdown-xcon-block'");
    expect(markdownPlayground).toContain("frameClass: 'markdown-xcon-frame'");
    expect(markdownPlayground).not.toContain('function renderMarkdownText');
    expect(markdownPlayground).toContain('hydrateXconViewer(preview);');
  });

  test('markdown playground panes can be resized with a splitter', () => {
    const markdownPlayground = readFileSync(new URL('../../../../playground/markdown.html', import.meta.url), 'utf8');

    expect(markdownPlayground).toContain('grid-template-columns: minmax(280px, var(--editor-pane-size, 50%)) 8px minmax(320px, 1fr);');
    expect(markdownPlayground).toContain('class="pane-splitter"');
    expect(markdownPlayground).toContain('id="paneSplitter"');
    expect(markdownPlayground).toContain('aria-label="Resize source and preview panes"');
    expect(markdownPlayground).toContain("document.getElementById('paneSplitter')");
    expect(markdownPlayground).toContain("addEventListener('pointerdown', startPaneResize)");
    expect(markdownPlayground).toContain("document.documentElement.style.setProperty('--editor-pane-size'");
  });

  test('viewer stylesheet includes public theme tokens', () => {
    expect(viewerCss).toContain('html[data-theme="dark"],[data-xcon-theme="dark"]');
    expect(viewerCss).toContain('--accent-hover');
    expect(viewerCss).toContain('--green:#2D7D4F');
    expect(viewerCss).toContain('--red:#C03A2B');
    expect(viewerCss).toContain('--blue:#2B5FA0');
  });

  test('public JSON schema component enum stays aligned with renderer component switch', () => {
    const schema = JSON.parse(readFileSync(new URL('../../../../schema/xcon.schema.json', import.meta.url), 'utf8'));
    const rendererSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
    const switchBlock = rendererSource.match(/switch \(type\) \{([\s\S]*?)default:/)?.[1] ?? '';
    const rendererTypes = [...switchBlock.matchAll(/case '([^']+)'/g)].map((match) => match[1]).sort();
    const schemaTypes = [...schema.definitions.componentType.enum].sort();

    expect(schemaTypes).toEqual(rendererTypes);
  });

  test('public JSON schema describes advanced viewer component properties', () => {
    const schema = JSON.parse(readFileSync(new URL('../../../../schema/xcon.schema.json', import.meta.url), 'utf8'));
    const props = schema.definitions.component.properties;

    [
      'chartType',
      'chartData',
      'chartOptions',
      'mode',
      'lineNumbers',
      'vizType',
      'pageWidth',
      'pageHeight',
      'nodeRadius',
      'markers',
      'heatmap',
      'polylines',
      'polygons',
      'clustering',
      'events',
    ].forEach((key) => expect(props).toHaveProperty(key));
  });
});

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { hydrateDataVizComponents } from './runtime';

describe('dataViz runtime hydration', () => {
  beforeEach(() => {
    installDom();
    document.body.replaceChildren();
  });

  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  test('dataViz treemap hydration replaces fallback and sets bound true', () => {
    const host = hostForDataViz('treemap', {
      name: 'Ops',
      children: [
        { name: 'Queue', value: 38 },
        { name: 'Runner', value: 18 },
      ],
    });

    hydrateDataVizComponents(document);

    expect(host.dataset.xconDatavizBound).toBe('true');
    expect(host.querySelector('[data-fallback]')).toBeNull();
    expect(host.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(host.textContent).toContain('Queue');
  });

  test('dataViz malformed data does not throw and keeps fallback without bound true', () => {
    const host = hostForDataViz('treemap', { not: 'hierarchy' });

    expect(() => hydrateDataVizComponents(document)).not.toThrow();

    expect(host.dataset.xconDatavizBound).not.toBe('true');
    expect(host.querySelector('[data-fallback]')).not.toBeNull();
  });

  test('dataViz forceGraph sankey chord and plot render non-empty runtime output', () => {
    const force = hostForDataViz('forceGraph', {
      nodes: [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ],
      links: [{ source: 'a', target: 'b', value: 1 }],
    });
    const sankey = hostForDataViz('sankey', {
      nodes: [
        { id: 'source', name: 'Source' },
        { id: 'target', name: 'Target' },
      ],
      links: [{ source: 'source', target: 'target', value: 8 }],
    });
    const chord = hostForDataViz('chord', [
      [0, 2],
      [3, 0],
    ]);
    const plot = hostForDataViz('plot', {
      data: [
        { category: 'A', value: 5 },
        { category: 'B', value: 9 },
      ],
      marks: [{ type: 'barY', x: 'category', y: 'value' }],
    });

    hydrateDataVizComponents(document);

    for (const host of [force, sankey, chord, plot]) {
      expect(host.dataset.xconDatavizBound).toBe('true');
      expect(host.childNodes.length).toBeGreaterThan(0);
      expect(host.querySelector('[data-fallback]')).toBeNull();
    }
    expect(force.querySelectorAll('line').length).toBeGreaterThan(0);
    expect(sankey.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(chord.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(plot.querySelectorAll('svg').length + plot.querySelectorAll('figure').length).toBeGreaterThan(0);
  });

  test('dataViz duplicate hydration is skipped', () => {
    const host = hostForDataViz('treemap', {
      name: 'Ops',
      children: [{ name: 'Queue', value: 38 }],
    });

    hydrateDataVizComponents(document);
    const firstChild = host.firstChild;
    hydrateDataVizComponents(document);

    expect(host.dataset.xconDatavizBound).toBe('true');
    expect(host.childNodes.length).toBe(1);
    expect(host.firstChild).toBe(firstChild);
  });
});

function hostForDataViz(type: string, data: unknown): HTMLElement {
  const host = document.createElement('div');
  host.dataset.xconDatavizType = type;
  host.dataset.xconDatavizData = JSON.stringify(data);
  host.dataset.xconDatavizConfig = JSON.stringify({ width: 420, height: 240 });
  const fallback = document.createElement('div');
  fallback.dataset.fallback = 'true';
  fallback.textContent = 'Fallback';
  host.append(fallback);
  document.body.append(host);
  return host as unknown as HTMLElement;
}

type Listener = (event: TestEvent) => void;

class TestEvent {
  bubbles: boolean;
  defaultPrevented = false;
  type: string;
  target: unknown;
  currentTarget: unknown;

  constructor(type: string, init: { bubbles?: boolean } = {}) {
    this.type = type;
    this.bubbles = init.bubbles ?? false;
  }

  preventDefault(): void {
    this.defaultPrevented = true;
  }
}

class TestNode {
  childNodes: TestNode[] = [];
  parentNode: TestElement | null = null;
  ownerDocument: TestDocument;
  private textValue = '';

  constructor(ownerDocument: TestDocument) {
    this.ownerDocument = ownerDocument;
  }

  append(...children: Array<TestNode | string>): void {
    for (const child of children) {
      const node = typeof child === 'string' ? new TestText(this.ownerDocument, child) : child;
      node.parentNode = this as unknown as TestElement;
      this.childNodes.push(node);
    }
  }

  appendChild<T extends TestNode>(child: T): T {
    this.append(child);
    return child;
  }

  get firstChild(): TestNode | null {
    return this.childNodes[0] ?? null;
  }

  remove(): void {
    const siblings = this.parentNode?.childNodes;
    if (!siblings) return;
    const index = siblings.indexOf(this);
    if (index >= 0) siblings.splice(index, 1);
    this.parentNode = null;
  }

  replaceChildren(...children: Array<TestNode | string>): void {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes = [];
    this.append(...children);
  }

  get textContent(): string {
    return this.textValue + this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value: string) {
    this.textValue = String(value);
    this.childNodes = [];
  }
}

class TestText extends TestNode {
  constructor(ownerDocument: TestDocument, text: string) {
    super(ownerDocument);
    this.textContent = text;
  }
}

class TestElement extends TestNode {
  attributes = new Map<string, string>();
  listeners = new Map<string, Listener[]>();
  namespaceURI: string | null;
  style: Record<string, string> = {};
  tagName: string;

  constructor(ownerDocument: TestDocument, tagName: string, namespaceURI: string | null = null) {
    super(ownerDocument);
    this.tagName = tagName.toUpperCase();
    this.namespaceURI = namespaceURI;
  }

  get children(): TestElement[] {
    return this.childNodes.filter((node): node is TestElement => node instanceof TestElement);
  }

  get className(): string {
    return this.getAttribute('class') ?? '';
  }

  set className(value: string) {
    this.setAttribute('class', value);
  }

  get dataset(): Record<string, string | undefined> {
    return new Proxy({}, {
      get: (_target, property) => this.getAttribute(`data-${camelToKebab(String(property))}`) ?? undefined,
      set: (_target, property, value) => {
        this.setAttribute(`data-${camelToKebab(String(property))}`, String(value));
        return true;
      },
      deleteProperty: (_target, property) => {
        this.removeAttribute(`data-${camelToKebab(String(property))}`);
        return true;
      },
    });
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((item) => item !== listener));
  }

  dispatchEvent(event: TestEvent): boolean {
    event.target ??= this;
    event.currentTarget = this;
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
    if (event.bubbles) this.parentNode?.dispatchEvent(event);
    return true;
  }

  querySelector<T extends Element = Element>(selector: string): T | null {
    return this.querySelectorAll<T>(selector)[0] ?? null;
  }

  querySelectorAll<T extends Element = Element>(selector: string): T[] {
    const matches: TestElement[] = [];
    for (const child of this.children) {
      if (matchesSelector(child, selector)) matches.push(child);
      matches.push(...child.querySelectorAll<TestElement>(selector));
    }
    return matches as unknown as T[];
  }
}

class TestDocument extends TestElement {
  body: TestElement;
  documentElement: TestElement;

  constructor() {
    super(undefined as unknown as TestDocument, '#document');
    this.ownerDocument = this;
    this.documentElement = new TestElement(this, 'html');
    this.body = new TestElement(this, 'body');
    this.documentElement.append(this.body);
    this.append(this.documentElement);
  }

  createElement(tagName: string): TestElement {
    return new TestElement(this, tagName);
  }

  createElementNS(namespaceURI: string, tagName: string): TestElement {
    return new TestElement(this, tagName, namespaceURI);
  }

  createTextNode(text: string): TestText {
    return new TestText(this, text);
  }
}

function installDom(): void {
  const testDocument = new TestDocument();
  Object.assign(globalThis, {
    document: testDocument,
    Element: TestElement,
    HTMLElement: TestElement,
    SVGElement: TestElement,
    SVGSVGElement: TestElement,
    Event: TestEvent,
  });
}

function matchesSelector(element: TestElement, selector: string): boolean {
  if (/^[a-z]+$/i.test(selector)) return element.tagName.toLowerCase() === selector.toLowerCase();
  const attrMatch = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
  if (!attrMatch) return false;
  const [, name, value] = attrMatch;
  const actual = element.getAttribute(name);
  if (value === undefined) return actual !== null;
  return actual === value;
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

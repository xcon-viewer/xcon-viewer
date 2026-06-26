import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('d3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('d3')>();
  return {
    ...actual,
    forceSimulation: vi.fn(actual.forceSimulation),
  };
});

import * as d3 from 'd3';
import { hydrateNetworkDiagrams } from './runtime';
import type { NetworkGraphModel, NetworkLink, NetworkNode } from './types';

describe('network runtime hydration', () => {
  beforeEach(() => {
    installDom();
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('hydrates a valid host with controls, rendered nodes, and local-only node selection', () => {
    const host = hostForGraph(baseGraph());
    const listener = vi.fn();
    document.addEventListener('xcon-network-select', listener);

    hydrateNetworkDiagrams(document);

    expect(host.dataset.xconNetworkBound).toBe('true');
    expect(host.querySelector('[data-xcon-network-search]')).toBeInstanceOf(HTMLInputElement);
    expect(host.querySelector('[data-xcon-network-fit]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-xcon-network-reset]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-xcon-network-legend]')).not.toBeNull();
    expect(host.querySelector('[data-fallback-circle]')).toBeNull();

    const alpha = host.querySelector<SVGGElement>('[data-network-node-id="a"]');
    expect(alpha).not.toBeNull();

    alpha?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(host.dataset.xconNetworkSelected).toBe('a');
    expect(listener).not.toHaveBeenCalled();

    document.removeEventListener('xcon-network-select', listener);
  });

  test('legacy callback strings are not executed during local selection', () => {
    const alert = vi.fn();
    vi.stubGlobal('alert', alert);
    vi.stubGlobal('window', { alert });
    const host = hostForGraph(baseGraph());
    host.setAttribute('data-on-node-click', 'alert(1)');

    hydrateNetworkDiagrams(document);

    const alpha = host.querySelector<SVGGElement>('[data-network-node-id="a"]');
    expect(alpha).not.toBeNull();

    alpha?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(window.alert).not.toHaveBeenCalled();
    expect(host.dataset.xconNetworkSelected).toBe('a');
  });

  test('invalid model JSON leaves fallback SVG intact and unbound', () => {
    const host = hostForGraph(baseGraph());
    host.dataset.xconNetworkModel = '{invalid';

    expect(() => hydrateNetworkDiagrams(document)).not.toThrow();

    expect(host.dataset.xconNetworkBound).toBe('false');
    expect(host.querySelector('[data-fallback-circle]')).not.toBeNull();
  });

  test('missing SVG leaves host unbound and does not throw', () => {
    const host = hostForGraph(baseGraph());
    host.querySelector('svg')?.remove();

    expect(() => hydrateNetworkDiagrams(document)).not.toThrow();

    expect(host.dataset.xconNetworkBound).toBe('false');
    expect(host.querySelector('[data-xcon-network-search]')).toBeNull();
  });

  test('creates a compact toolbar when controls are enabled and no toolbar exists', () => {
    const host = hostForGraph(baseGraph());
    host.querySelector('[data-xcon-network-toolbar]')?.remove();

    hydrateNetworkDiagrams(document);

    expect(host.querySelector('[data-xcon-network-toolbar]')).not.toBeNull();
    expect(host.querySelector('[data-xcon-network-search]')).toBeInstanceOf(HTMLInputElement);
    expect(host.querySelector('[data-xcon-network-fit]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-xcon-network-reset]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-xcon-network-legend]')).not.toBeNull();
  });

  test('hydrating twice does not duplicate controls or rerender already-bound hosts', () => {
    const host = hostForGraph(baseGraph());

    hydrateNetworkDiagrams(document);
    const firstNode = host.querySelector('[data-network-node-id="a"]');
    hydrateNetworkDiagrams(document);

    expect(host.querySelectorAll('[data-xcon-network-search]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-xcon-network-fit]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-network-node-id="a"]')).toHaveLength(1);
    expect(host.querySelector('[data-network-node-id="a"]')).toBe(firstNode);
  });

  test('search input filters rendered nodes through network state helpers', () => {
    const host = hostForGraph(baseGraph());
    hydrateNetworkDiagrams(document);

    const search = host.querySelector<HTMLInputElement>('[data-xcon-network-search]');
    expect(search).not.toBeNull();

    search!.value = 'beta';
    search!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(renderedNodeIds(host)).toEqual(['b']);
    expect(host.querySelectorAll('[data-network-link-id]')).toHaveLength(0);
  });

  test('search keeps the same input element across multiple input events', () => {
    const host = hostForGraph(baseGraph());
    hydrateNetworkDiagrams(document);

    const search = host.querySelector<HTMLInputElement>('[data-xcon-network-search]');
    expect(search).not.toBeNull();

    search!.value = 'b';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(host.querySelector('[data-xcon-network-search]') === search).toBe(true);
    expect(renderedNodeIds(host)).toEqual(['b']);

    search!.value = 'beta';
    search!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(host.querySelector('[data-xcon-network-search]') === search).toBe(true);
    expect(renderedNodeIds(host)).toEqual(['b']);
  });

  test('parseable malformed graph JSON leaves fallback SVG intact and unbound', () => {
    const host = hostForGraph(baseGraph());
    host.dataset.xconNetworkModel = JSON.stringify({
      nodes: [{ id: 'a', metadata: {}, isRoot: true }],
      links: [],
      groups: [],
      subfolders: { bad: null },
    });

    expect(() => hydrateNetworkDiagrams(document)).not.toThrow();

    expect(host.dataset.xconNetworkBound).toBe('false');
    expect(host.querySelector('[data-fallback-circle]')).not.toBeNull();
  });

  test('fit control resets viewBox to current measured size', () => {
    const host = hostForGraph(baseGraph());
    Object.defineProperty(host, 'clientWidth', { value: 320, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 180, configurable: true });
    hydrateNetworkDiagrams(document);

    const svg = host.querySelector('svg');
    const fit = host.querySelector<HTMLButtonElement>('[data-xcon-network-fit]');
    expect(svg).not.toBeNull();
    expect(fit).not.toBeNull();

    svg!.setAttribute('viewBox', '0 0 12 34');
    fit!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(svg!.getAttribute('viewBox')).toBe('0 0 320 180');
  });

  test('filter controls filter groups, link types, and minimum degree locally', () => {
    const host = hostForGraph(baseGraph(), { showFilters: true });
    hydrateNetworkDiagrams(document);

    const secondary = host.querySelector<HTMLButtonElement>('[data-xcon-network-filter-group="secondary"]');
    const folderType = host.querySelector<HTMLButtonElement>('[data-xcon-network-filter-link-type="folder"]');
    const minDegree = host.querySelector<HTMLInputElement>('[data-xcon-network-min-degree]');
    expect(secondary).toBeInstanceOf(HTMLButtonElement);
    expect(folderType).toBeInstanceOf(HTMLButtonElement);
    expect(minDegree).toBeInstanceOf(HTMLInputElement);

    secondary!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(renderedNodeIds(host)).toEqual(['a', 'folder']);

    folderType!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(renderedLinkIds(host)).toEqual([]);

    minDegree!.value = '2';
    minDegree!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(renderedNodeIds(host)).toEqual(['a']);
  });

  test('hover tooltip updates and resets when hover is enabled', () => {
    const host = hostForGraph(baseGraph(), { enableHover: true });
    hydrateNetworkDiagrams(document);

    const alpha = host.querySelector<SVGGElement>('[data-network-node-id="a"]');
    const tooltip = host.querySelector<HTMLElement>('[data-xcon-network-tooltip]');
    expect(alpha).not.toBeNull();
    expect(tooltip).not.toBeNull();

    alpha!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 30, clientY: 40 }));
    expect(tooltip!.textContent).toContain('Alpha');
    expect(tooltip!.getAttribute('class')).toContain('show');

    alpha!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(tooltip!.textContent).toBe('');
    expect(tooltip!.getAttribute('class')).not.toContain('show');
  });

  test('dragging a node updates its transform and connected link endpoint when enabled', () => {
    const host = hostForGraph(baseGraph(), { enableDrag: true });
    hydrateNetworkDiagrams(document);

    const alpha = host.querySelector<SVGGElement>('[data-network-node-id="a"]');
    const link = host.querySelector<SVGLineElement>('[data-network-link-id="a-b"]');
    expect(alpha).not.toBeNull();
    expect(link).not.toBeNull();
    const beforeTransform = alpha!.getAttribute('transform');
    const beforeX = link!.getAttribute('x1');

    alpha!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 35, clientY: 45 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 35, clientY: 45 }));

    expect(alpha!.getAttribute('transform')).not.toBe(beforeTransform);
    expect(link!.getAttribute('x1')).not.toBe(beforeX);
  });

  test('reset after dragging restores cached layout positions', () => {
    const host = hostForGraph(baseGraph(), { enableDrag: true });
    hydrateNetworkDiagrams(document);

    const alpha = host.querySelector<SVGGElement>('[data-network-node-id="a"]');
    const reset = host.querySelector<HTMLButtonElement>('[data-xcon-network-reset]');
    expect(alpha).not.toBeNull();
    expect(reset).not.toBeNull();
    const initialTransform = alpha!.getAttribute('transform');

    alpha!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 35, clientY: 45 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 35, clientY: 45 }));
    expect(alpha!.getAttribute('transform')).not.toBe(initialTransform);

    reset!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(host.querySelector<SVGGElement>('[data-network-node-id="a"]')?.getAttribute('transform')).toBe(initialTransform);
  });

  test('wheel zoom updates the viewport transform when zoom is enabled', () => {
    const host = hostForGraph(baseGraph(), { enableZoom: true });
    hydrateNetworkDiagrams(document);

    const viewport = host.querySelector<SVGGElement>('[data-xcon-network-viewport]');
    const svg = host.querySelector<SVGSVGElement>('svg');
    expect(viewport).not.toBeNull();
    expect(svg).not.toBeNull();
    expect(viewport!.getAttribute('transform')).toBe('translate(0 0) scale(1)');

    svg!.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100, clientX: 200, clientY: 150 }));

    expect(viewport!.getAttribute('transform')).not.toBe('translate(0 0) scale(1)');
  });

  test('applies hydrated visual semantics after node selection', () => {
    const host = hostForGraph(baseGraph());
    hydrateNetworkDiagrams(document);

    host.querySelector<SVGGElement>('[data-network-node-id="b"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const rootGroup = host.querySelector<SVGGElement>('[data-network-node-id="a"]');
    const selectedGroup = host.querySelector<SVGGElement>('[data-network-node-id="b"]');
    const mutedGroup = host.querySelector<SVGGElement>('[data-network-node-id="folder"]');
    const rootCircle = rootGroup?.querySelector<SVGCircleElement>('[data-network-node-circle]');
    const selectedCircle = selectedGroup?.querySelector<SVGCircleElement>('[data-network-node-circle]');
    const highlightedLink = host.querySelector<SVGLineElement>('[data-network-link-id="a-b"]');
    const folderLink = host.querySelector<SVGLineElement>('[data-network-link-id="a-folder"]');

    expect(rootGroup?.getAttribute('class')).toContain('highlighted');
    expect(selectedGroup?.getAttribute('class')).toContain('selected');
    expect(selectedGroup?.getAttribute('class')).toContain('highlighted');
    expect(mutedGroup?.getAttribute('class')).toContain('muted');
    expect(rootCircle?.getAttribute('fill')).toBe('var(--xcon-network-primary)');
    expect(selectedCircle?.getAttribute('fill')).toBe('var(--xcon-network-node)');
    expect(highlightedLink?.getAttribute('class')).toContain('highlighted');
    expect(folderLink?.getAttribute('class')).toContain('muted');
    expect(folderLink?.getAttribute('class')).toContain('folder-link');
  });

  test('selection-only render reuses cached layout without rerunning simulation', () => {
    const forceSimulation = vi.mocked(d3.forceSimulation);
    forceSimulation.mockClear();
    const host = hostForGraph(baseGraph());
    hydrateNetworkDiagrams(document);
    const beforeTransforms = renderedNodeTransforms(host);
    expect(forceSimulation).toHaveBeenCalledTimes(1);

    host.querySelector<SVGGElement>('[data-network-node-id="b"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(forceSimulation).toHaveBeenCalledTimes(1);
    expect(renderedNodeTransforms(host)).toEqual(beforeTransforms);
  });
});

function hostForGraph(graph: NetworkGraphModel, options: Record<string, unknown> = {}): HTMLElement {
  const host = document.createElement('div');
  host.className = 'xa-network-diagram-container';
  host.dataset.xconNetwork = 'true';
  host.dataset.xconNetworkBound = 'false';
  host.dataset.xconNetworkModel = JSON.stringify(graph);
  host.dataset.xconNetworkOptions = JSON.stringify({
    nodeRadius: 18,
    linkDistance: 80,
    charge: -200,
    showControls: true,
    showSearch: true,
    showLegend: true,
    showLabels: true,
    showArrows: true,
    ...options,
  });
  const toolbar = document.createElement('div');
  toolbar.dataset.xconNetworkToolbar = 'true';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 800 600');
  const fallback = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  fallback.dataset.fallbackCircle = 'true';
  fallback.setAttribute('cx', '20');
  fallback.setAttribute('cy', '20');
  fallback.setAttribute('r', '10');
  svg.append(fallback);
  const tooltip = document.createElement('div');
  tooltip.className = 'network-tooltip';
  tooltip.dataset.xconNetworkTooltip = 'true';
  host.append(toolbar, svg, tooltip);
  document.body.append(host);
  return host;
}

function renderedNodeIds(host: ParentNode): string[] {
  return Array.from(host.querySelectorAll<SVGGElement>('[data-network-node-id]')).map((node) => node.dataset.networkNodeId ?? '');
}

function renderedLinkIds(host: ParentNode): string[] {
  return Array.from(host.querySelectorAll<SVGLineElement>('[data-network-link-id]')).map((link) => link.dataset.networkLinkId ?? '');
}

function renderedNodeTransforms(host: ParentNode): string[] {
  return Array.from(host.querySelectorAll<SVGGElement>('[data-network-node-id]')).map((node) => node.getAttribute('transform') ?? '');
}

function baseGraph(): NetworkGraphModel {
  return {
    nodes: [
      node('a', 'Alpha', 'core', true),
      node('b', 'Beta', 'secondary'),
      node('folder', 'Projects'),
    ],
    links: [
      link('a-b', 'a', 'b'),
      link('a-folder', 'a', 'folder', 'folder'),
    ],
    groups: [
      { id: 'core', label: 'Core', color: '#2563eb', metadata: {} },
      { id: 'secondary', label: 'Secondary', color: '#16a34a', metadata: {} },
    ],
    rootNodeId: 'a',
    subfolders: {
      folder: {
        parentId: 'folder',
        nodes: [node('child', 'Child', 'secondary', false, 'folder')],
        links: [link('folder-child', 'folder', 'child', 'folder')],
      },
    },
  };
}

function node(id: string, label: string, group?: string, isRoot = false, parentId?: string): NetworkNode {
  return {
    id,
    label,
    group,
    metadata: {},
    parentId,
    isRoot,
  };
}

function link(id: string, source: string, target: string, type?: string): NetworkLink {
  return {
    id,
    source,
    target,
    type,
    metadata: {},
  };
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

class TestMouseEvent extends TestEvent {
  clientX: number;
  clientY: number;

  constructor(type: string, init: { bubbles?: boolean; clientX?: number; clientY?: number } = {}) {
    super(type, init);
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
  }
}

class TestWheelEvent extends TestMouseEvent {
  deltaY: number;

  constructor(type: string, init: { bubbles?: boolean; clientX?: number; clientY?: number; deltaY?: number } = {}) {
    super(type, init);
    this.deltaY = init.deltaY ?? 0;
  }
}

class TestNode {
  childNodes: TestNode[] = [];
  parentNode: TestElement | null = null;
  ownerDocument: TestDocument;

  constructor(ownerDocument: TestDocument) {
    this.ownerDocument = ownerDocument;
  }

  append(...children: TestNode[]): void {
    for (const child of children) {
      child.parentNode = this as unknown as TestElement;
      this.childNodes.push(child);
    }
  }

  appendChild<T extends TestNode>(child: T): T {
    this.append(child);
    return child;
  }

  insertBefore<T extends TestNode>(child: T, reference: TestNode | null): T {
    child.parentNode = this as unknown as TestElement;
    if (!reference) {
      this.childNodes.push(child);
      return child;
    }
    const index = this.childNodes.indexOf(reference);
    if (index < 0) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
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

  replaceChildren(...children: TestNode[]): void {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes = [];
    this.append(...children);
  }
}

class TestElement extends TestNode {
  attributes = new Map<string, string>();
  className = '';
  listeners = new Map<string, Listener[]>();
  namespaceURI: string | null;
  tagName: string;
  textContent = '';

  constructor(ownerDocument: TestDocument, tagName: string, namespaceURI: string | null = null) {
    super(ownerDocument);
    this.tagName = tagName.toUpperCase();
    this.namespaceURI = namespaceURI;
  }

  get children(): TestElement[] {
    return this.childNodes.filter((node): node is TestElement => node instanceof TestElement);
  }

  get dataset(): Record<string, string | undefined> {
    return new Proxy({}, {
      get: (_target, property) => this.getAttribute(`data-${camelToKebab(String(property))}`) ?? undefined,
      set: (_target, property, value) => {
        this.setAttribute(`data-${camelToKebab(String(property))}`, String(value));
        return true;
      },
    });
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
  }

  getAttribute(name: string): string | null {
    if (name === 'class' && this.className) return this.className;
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

class TestInputElement extends TestElement {
  value = '';
}

class TestButtonElement extends TestElement {}

class TestDocument extends TestElement {
  body: TestElement;

  constructor() {
    super(undefined as unknown as TestDocument, '#document');
    this.ownerDocument = this;
    this.body = new TestElement(this, 'body');
    this.append(this.body);
  }

  createElement(tagName: string): TestElement {
    const normalized = tagName.toLowerCase();
    if (normalized === 'input') return new TestInputElement(this, tagName);
    if (normalized === 'button') return new TestButtonElement(this, tagName);
    return new TestElement(this, tagName);
  }

  createElementNS(namespaceURI: string, tagName: string): TestElement {
    return new TestElement(this, tagName, namespaceURI);
  }
}

function installDom(): void {
  const testDocument = new TestDocument();
  Object.assign(globalThis, {
    document: testDocument,
    Element: TestElement,
    HTMLElement: TestElement,
    HTMLInputElement: TestInputElement,
    HTMLButtonElement: TestButtonElement,
    SVGElement: TestElement,
    Event: TestEvent,
    MouseEvent: TestMouseEvent,
    WheelEvent: TestWheelEvent,
  });
}

function matchesSelector(element: TestElement, selector: string): boolean {
  if (selector === 'svg') return element.tagName === 'SVG';
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

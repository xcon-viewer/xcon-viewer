import * as d3 from 'd3';
import { createNetworkState, selectNode, toggleFolder, visibleNetworkModel } from './state';
import type { NetworkGraphModel, NetworkGroup, NetworkLink, NetworkNode, NetworkViewState, NetworkVisibleModel } from './types';

interface NetworkRuntimeOptions {
  nodeRadius: number;
  linkDistance: number;
  charge: number;
  showControls: boolean;
  showSearch: boolean;
  showLegend: boolean;
  showLabels: boolean;
  showArrows: boolean;
}

type PositionedNode = NetworkNode & d3.SimulationNodeDatum & { x: number; y: number };

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export function hydrateNetworkDiagrams(root: ParentNode = document): void {
  const hosts = Array.from(root.querySelectorAll<HTMLElement>('[data-xcon-network="true"]'));
  for (const host of hosts) {
    if (host.dataset.xconNetworkBound === 'true') continue;
    hydrateHost(host);
  }
}

function hydrateHost(host: HTMLElement): void {
  const svg = host.querySelector<SVGSVGElement>('svg');
  if (!svg) return;

  const graph = parseGraph(host.dataset.xconNetworkModel);
  const options = parseOptions(host.dataset.xconNetworkOptions);
  if (!graph || !options) return;

  host.dataset.xconNetworkBound = 'true';
  let state = createNetworkState(graph);

  const render = (): void => {
    const visible = visibleNetworkModel(graph, state);
    renderSvg(svg, visible, graph, options, host, state, updateState);
  };

  const updateState = (nextState: NetworkViewState): void => {
    state = nextState;
    render();
  };

  if (options.showControls) buildControls(host, svg, graph, options, () => state, updateState);
  render();
}

function buildControls(
  host: HTMLElement,
  svg: SVGSVGElement,
  graph: NetworkGraphModel,
  options: NetworkRuntimeOptions,
  getState: () => NetworkViewState,
  updateState: (state: NetworkViewState) => void,
): void {
  const toolbar = ensureToolbar(host);
  toolbar.replaceChildren();
  let search: HTMLInputElement | undefined;

  if (options.showSearch) {
    const searchInput = document.createElement('input');
    search = searchInput;
    searchInput.type = 'search';
    searchInput.value = getState().search;
    searchInput.placeholder = 'Search';
    searchInput.dataset.xconNetworkSearch = 'true';
    searchInput.addEventListener('input', () => {
      updateState({ ...getState(), search: searchInput.value });
    });
    toolbar.append(searchInput);
  }

  const fit = document.createElement('button');
  fit.type = 'button';
  fit.textContent = 'Fit';
  fit.dataset.xconNetworkFit = 'true';
  fit.addEventListener('click', () => {
    const { width, height } = svgSize(svg, host);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  });
  toolbar.append(fit);

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset';
  reset.dataset.xconNetworkReset = 'true';
  reset.addEventListener('click', () => {
    delete host.dataset.xconNetworkSelected;
    if (search) search.value = '';
    updateState(createNetworkState(graph));
  });
  toolbar.append(reset);

  if (options.showLegend && graph.groups.length > 0) {
    toolbar.append(renderLegend(graph.groups));
  }
}

function ensureToolbar(host: HTMLElement): HTMLElement {
  const existing = host.querySelector<HTMLElement>('[data-xcon-network-toolbar]');
  if (existing) return existing;
  const toolbar = document.createElement('div');
  toolbar.className = 'xa-network-toolbar';
  toolbar.dataset.xconNetworkToolbar = 'true';
  host.insertBefore(toolbar, host.firstChild);
  return toolbar;
}

function renderLegend(groups: NetworkGroup[]): HTMLElement {
  const legend = document.createElement('div');
  legend.dataset.xconNetworkLegend = 'true';
  for (const group of groups) {
    const item = document.createElement('span');
    item.dataset.xconNetworkLegendItem = group.id;
    item.textContent = group.label;
    if (group.color) item.setAttribute('style', `--xcon-network-group-color:${safeCssValue(group.color) ?? 'currentColor'}`);
    legend.append(item);
  }
  return legend;
}

function renderSvg(
  svg: SVGSVGElement,
  visible: NetworkVisibleModel,
  graph: NetworkGraphModel,
  options: NetworkRuntimeOptions,
  host: HTMLElement,
  state: NetworkViewState,
  updateState: (state: NetworkViewState) => void,
): void {
  const { width, height } = svgSize(svg, host);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.replaceChildren();

  const layout = layoutGraph(visible.nodes, visible.links, options, width, height);
  const arrowId = `xcon-network-arrow-${safeId(host.dataset.key ?? host.id ?? 'root')}`;
  if (options.showArrows) svg.append(renderArrowDefs(arrowId));
  const linkLayer = svgElement('g', { class: 'network-links' });
  const nodeLayer = svgElement('g', { class: 'network-nodes' });
  svg.append(linkLayer, nodeLayer);

  for (const link of visible.links) {
    const source = layout.get(link.source);
    const target = layout.get(link.target);
    if (!source || !target) continue;
    const line = svgElement('line', {
      class: classNames('network-link', visible.highlightedLinkIds.has(link.id) && 'highlighted', visible.mutedLinkIds.has(link.id) && 'muted'),
      'data-network-link-id': link.id,
      x1: String(source.x),
      y1: String(source.y),
      x2: String(target.x),
      y2: String(target.y),
      'marker-end': options.showArrows ? `url(#${arrowId})` : undefined,
    });
    linkLayer.append(line);
  }

  for (const node of visible.nodes) {
    const point = layout.get(node.id);
    if (!point) continue;
    const group = svgElement('g', {
      class: classNames(
        'network-node-group',
        node.isRoot && 'root-node',
        host.dataset.xconNetworkSelected === node.id && 'selected',
        visible.highlightedNodeIds.has(node.id) && 'highlighted',
        visible.mutedNodeIds.has(node.id) && 'muted',
      ),
      'data-network-node-id': node.id,
      transform: `translate(${trim(point.x)} ${trim(point.y)})`,
    });
    group.addEventListener('click', () => {
      host.dataset.xconNetworkSelected = node.id;
      const selected = selectNode(state, node.id);
      const nextState = graph.subfolders[node.id] ? toggleFolder(selected, node.id) : selected;
      updateState(nextState);
    });

    group.append(svgElement('circle', { class: 'network-node', r: String(options.nodeRadius), fill: safeSvgPaint(node.color) ?? 'currentColor' }));
    if (options.showLabels) {
      const label = svgElement('text', { class: 'network-label', y: String(options.nodeRadius + 16), 'text-anchor': 'middle' });
      label.textContent = node.label;
      group.append(label);
    }
    nodeLayer.append(group);
  }
}

function layoutGraph(
  nodes: NetworkNode[],
  links: NetworkLink[],
  options: NetworkRuntimeOptions,
  width: number,
  height: number,
): Map<string, PositionedNode> {
  const positioned = nodes.map((node, index): PositionedNode => {
    const fallback = fallbackPoint(index, nodes.length, width, height);
    return {
      ...node,
      x: finiteCoordinate(node.x) ?? fallback.x,
      y: finiteCoordinate(node.y) ?? fallback.y,
      fx: node.fixed ? finiteCoordinate(node.x) ?? fallback.x : undefined,
      fy: node.fixed ? finiteCoordinate(node.y) ?? fallback.y : undefined,
    };
  });
  const linkData = links.map((link) => ({ ...link }));

  d3.forceSimulation<PositionedNode>(positioned)
    .force('link', d3.forceLink<PositionedNode, typeof linkData[number]>(linkData).id((node) => node.id).distance(options.linkDistance))
    .force('charge', d3.forceManyBody<PositionedNode>().strength(options.charge))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .stop()
    .tick(80);

  return new Map(positioned.map((node) => [node.id, node]));
}

function parseGraph(value: string | undefined): NetworkGraphModel | null {
  const parsed = parseJson(value);
  if (!isPlainRecord(parsed)) return null;
  const graph = parsed as Partial<NetworkGraphModel>;
  if (!isNodeArray(graph.nodes)) return null;
  if (!isLinkArray(graph.links)) return null;
  if (!isGroupArray(graph.groups)) return null;
  if (graph.rootNodeId !== undefined && typeof graph.rootNodeId !== 'string') return null;
  if (!isSubfolderRecord(graph.subfolders)) return null;
  return graph as NetworkGraphModel;
}

function isNodeArray(value: unknown): value is NetworkNode[] {
  return Array.isArray(value) && value.every(isNetworkNode);
}

function isNetworkNode(value: unknown): value is NetworkNode {
  if (!isPlainRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    typeof value.label === 'string' &&
    isPlainRecord(value.metadata) &&
    typeof value.isRoot === 'boolean' &&
    isOptionalString(value.type) &&
    isOptionalString(value.group) &&
    isOptionalString(value.color) &&
    isOptionalString(value.icon) &&
    isOptionalString(value.parentId) &&
    isOptionalFiniteNumber(value.x) &&
    isOptionalFiniteNumber(value.y) &&
    (value.fixed === undefined || typeof value.fixed === 'boolean')
  );
}

function isLinkArray(value: unknown): value is NetworkLink[] {
  return Array.isArray(value) && value.every(isNetworkLink);
}

function isNetworkLink(value: unknown): value is NetworkLink {
  if (!isPlainRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.source) &&
    isNonEmptyString(value.target) &&
    isPlainRecord(value.metadata) &&
    isOptionalString(value.type) &&
    isOptionalString(value.label) &&
    isOptionalFiniteNumber(value.weight)
  );
}

function isGroupArray(value: unknown): value is NetworkGroup[] {
  return Array.isArray(value) && value.every(isNetworkGroup);
}

function isNetworkGroup(value: unknown): value is NetworkGroup {
  if (!isPlainRecord(value)) return false;
  return isNonEmptyString(value.id) && typeof value.label === 'string' && isPlainRecord(value.metadata) && isOptionalString(value.color);
}

function isSubfolderRecord(value: unknown): value is NetworkGraphModel['subfolders'] {
  if (!isPlainRecord(value)) return false;
  return Object.values(value).every((subfolder) => {
    if (!isPlainRecord(subfolder)) return false;
    return typeof subfolder.parentId === 'string' && isNodeArray(subfolder.nodes) && isLinkArray(subfolder.links);
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function parseOptions(value: string | undefined): NetworkRuntimeOptions | null {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  return {
    nodeRadius: numberOption(record.nodeRadius, 25, 1),
    linkDistance: numberOption(record.linkDistance, 80),
    charge: numberOption(record.charge, -1500),
    showControls: booleanOption(record.showControls, true),
    showSearch: booleanOption(record.showSearch, true),
    showLegend: booleanOption(record.showLegend, true),
    showLabels: booleanOption(record.showLabels, true),
    showArrows: booleanOption(record.showArrows, true),
  };
}

function parseJson(value: string | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function svgSize(svg: SVGSVGElement, host: HTMLElement): { width: number; height: number } {
  const width = positiveFiniteNumber(host.clientWidth) ?? positiveFiniteNumber(svg.clientWidth) ?? DEFAULT_WIDTH;
  const height = positiveFiniteNumber(host.clientHeight) ?? positiveFiniteNumber(svg.clientHeight) ?? DEFAULT_HEIGHT;
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

function fallbackPoint(index: number, count: number, width: number, height: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / Math.max(1, count);
  return {
    x: width / 2 + Math.cos(angle) * Math.min(width * 0.28, 220),
    y: height / 2 + Math.sin(angle) * Math.min(height * 0.25, 170),
  };
}

function svgElement(name: string, attrs: Record<string, string | undefined>): SVGElement {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) element.setAttribute(key, value);
  }
  return element;
}

function renderArrowDefs(arrowId: string): SVGElement {
  const defs = svgElement('defs', {});
  const marker = svgElement('marker', {
    id: arrowId,
    viewBox: '0 -5 10 10',
    refX: '10',
    refY: '0',
    markerWidth: '5',
    markerHeight: '5',
    orient: 'auto',
  });
  marker.append(svgElement('path', { d: 'M0,-5L10,0L0,5', class: 'network-arrow', fill: 'currentColor' }));
  defs.append(marker);
  return defs;
}

function numberOption(value: unknown, fallback: number, min?: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : fallback;
  const finite = Number.isFinite(parsed) ? parsed : fallback;
  return min === undefined ? finite : Math.max(min, finite);
}

function booleanOption(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
  return fallback;
}

function finiteCoordinate(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function positiveFiniteNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function classNames(...tokens: Array<string | false | undefined>): string {
  return tokens.filter(Boolean).join(' ');
}

function trim(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-') || 'root';
}

const SAFE_SVG_PAINT = /^(?:#(?:[\da-f]{3}|[\da-f]{6})|[a-zA-Z]+|var\(\s*--[a-zA-Z0-9_-]+\s*\)|rgba?\([^)]+\)|hsla?\([^)]+\))$/i;
const UNSAFE_CSS_VALUE = /javascript:|vbscript:|expression\s*\(|url\s*\(/i;

function safeSvgPaint(value: string | undefined): string | undefined {
  const color = value?.trim();
  if (!color || UNSAFE_CSS_VALUE.test(color)) return undefined;
  return SAFE_SVG_PAINT.test(color) ? color : undefined;
}

function safeCssValue(value: string): string | undefined {
  const text = value.trim();
  return text && !UNSAFE_CSS_VALUE.test(text) ? text : undefined;
}

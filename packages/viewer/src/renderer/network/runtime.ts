import * as d3 from 'd3';
import { createNetworkState, selectNode, toggleFolder, visibleNetworkModel } from './state';
import type { NetworkGraphModel, NetworkGroup, NetworkLink, NetworkNode, NetworkViewState, NetworkVisibleModel } from './types';

interface NetworkRuntimeOptions {
  nodeRadius: number;
  linkDistance: number;
  charge: number;
  friction: number;
  showControls: boolean;
  showSearch: boolean;
  showFilters: boolean;
  showLegend: boolean;
  showLabels: boolean;
  showArrows: boolean;
  enableDrag: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  enableHover: boolean;
}

type PositionedNode = NetworkNode & d3.SimulationNodeDatum & { x: number; y: number };
type ViewportTransform = { x: number; y: number; k: number };
type GraphBounds = { minX: number; minY: number; width: number; height: number };
type FitPadding = { top: number; right: number; bottom: number; left: number };

interface NetworkRuntimeContext {
  layoutCache: Map<string, Map<string, PositionedNode>>;
  layout: Map<string, PositionedNode>;
  transform: ViewportTransform;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const MIN_VIEWPORT_SCALE = 0.05;
const MAX_VIEWPORT_SCALE = 4;

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
  const context: NetworkRuntimeContext = {
    layoutCache: new Map(),
    layout: new Map(),
    transform: defaultTransform(),
  };

  const render = (): void => {
    const visible = visibleNetworkModel(graph, state);
    renderSvg(svg, visible, graph, options, host, state, context, updateState);
  };

  const updateState = (nextState: NetworkViewState): void => {
    state = nextState;
    render();
  };

  bindViewportInteractions(svg, options, context);
  if (options.showControls) {
    buildControls(host, svg, graph, options, context, () => state, updateState);
  }
  render();
}

function buildControls(
  host: HTMLElement,
  svg: SVGSVGElement,
  graph: NetworkGraphModel,
  options: NetworkRuntimeOptions,
  context: NetworkRuntimeContext,
  getState: () => NetworkViewState,
  updateState: (state: NetworkViewState) => void,
): void {
  const toolbar = ensureToolbar(host);
  toolbar.replaceChildren();
  let search: HTMLInputElement | undefined;
  let syncFilterControls = (): void => undefined;

  if (options.showSearch) {
    const searchInput = document.createElement('input');
    search = searchInput;
    searchInput.type = 'search';
    searchInput.value = getState().search;
    searchInput.placeholder = 'Search';
    searchInput.ariaLabel = 'Search network';
    searchInput.dataset.xconNetworkSearch = 'true';
    searchInput.addEventListener('input', () => {
      updateState({ ...getState(), search: searchInput.value });
      syncFilterControls();
    });
    toolbar.append(searchInput);
  }

  const fit = document.createElement('button');
  fit.type = 'button';
  fit.textContent = 'Fit';
  fit.title = 'Fit graph to view';
  fit.dataset.xconNetworkFit = 'true';
  fit.addEventListener('click', () => {
    fitGraphToView(svg, host, options, context);
  });
  toolbar.append(fit);

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset';
  reset.title = 'Reset graph view and filters';
  reset.dataset.xconNetworkReset = 'true';
  reset.addEventListener('click', () => {
    delete host.dataset.xconNetworkSelected;
    if (search) search.value = '';
    context.transform = defaultTransform();
    context.layoutCache.clear();
    updateState(createNetworkState(graph));
    syncFilterControls();
    applyViewportTransform(svg, context.transform);
  });
  toolbar.append(reset);

  if (options.showLegend && graph.groups.length > 0) {
    toolbar.append(renderLegend(graph.groups));
  }

  if (options.showFilters) {
    syncFilterControls = buildFilterControls(host, toolbar, graph, getState, updateState);
  } else {
    host.querySelector<HTMLElement>('[data-xcon-network-filters]')?.remove();
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

function setToggleButtonState(button: HTMLButtonElement, enabled: boolean): void {
  button.setAttribute('aria-pressed', String(enabled));
  setClassTokens(button, ['xa-network-filter-toggle', enabled ? 'enabled' : 'disabled']);
}

function linkTypes(graph: NetworkGraphModel): string[] {
  return Array.from(new Set(allGraphLinks(graph).map(linkType))).sort();
}

function allGraphLinks(graph: NetworkGraphModel): NetworkLink[] {
  return [
    ...graph.links,
    ...Object.values(graph.subfolders).flatMap((subfolder) => subfolder.links),
  ];
}

function linkType(link: NetworkLink): string {
  return link.type ?? 'normal';
}

function buildFilterControls(
  host: HTMLElement,
  toolbar: HTMLElement,
  graph: NetworkGraphModel,
  getState: () => NetworkViewState,
  updateState: (state: NetworkViewState) => void,
): () => void {
  const existing = host.querySelector<HTMLElement>('[data-xcon-network-filters]');
  existing?.remove();
  const filters = document.createElement('div');
  filters.className = 'xa-network-filters';
  filters.dataset.xconNetworkFilters = 'true';

  const commit = (state: NetworkViewState): void => {
    updateState(state);
    sync();
  };

  for (const group of graph.groups) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = group.label;
    button.dataset.xconNetworkFilterGroup = group.id;
    button.addEventListener('click', () => {
      const enabledGroups = new Set(getState().enabledGroups);
      if (enabledGroups.has(group.id)) enabledGroups.delete(group.id);
      else enabledGroups.add(group.id);
      commit({ ...getState(), enabledGroups });
    });
    filters.append(button);
  }

  for (const type of linkTypes(graph)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = type;
    button.dataset.xconNetworkFilterLinkType = type;
    button.addEventListener('click', () => {
      const enabledLinkTypes = new Set(getState().enabledLinkTypes);
      if (enabledLinkTypes.has(type)) enabledLinkTypes.delete(type);
      else enabledLinkTypes.add(type);
      commit({ ...getState(), enabledLinkTypes });
    });
    filters.append(button);
  }

  const minDegree = document.createElement('input');
  minDegree.type = 'number';
  minDegree.min = '0';
  minDegree.step = '1';
  minDegree.placeholder = 'Degree';
  minDegree.title = 'Minimum node degree';
  minDegree.ariaLabel = 'Minimum node degree';
  minDegree.dataset.xconNetworkMinDegree = 'true';
  minDegree.addEventListener('input', () => {
    const value = Math.max(0, Math.floor(Number(minDegree.value) || 0));
    commit({ ...getState(), minDegree: value });
  });
  filters.append(minDegree);

  toolbar.parentNode?.insertBefore(filters, toolbar.nextSibling);
  sync();
  return sync;

  function sync(): void {
    const state = getState();
    for (const button of Array.from(filters.querySelectorAll<HTMLButtonElement>('[data-xcon-network-filter-group]'))) {
      const group = button.dataset.xconNetworkFilterGroup ?? '';
      setToggleButtonState(button, state.enabledGroups.has(group));
    }
    for (const button of Array.from(filters.querySelectorAll<HTMLButtonElement>('[data-xcon-network-filter-link-type]'))) {
      const type = button.dataset.xconNetworkFilterLinkType ?? '';
      setToggleButtonState(button, state.enabledLinkTypes.has(type));
    }
    minDegree.value = String(state.minDegree);
  }
}

function renderSvg(
  svg: SVGSVGElement,
  visible: NetworkVisibleModel,
  graph: NetworkGraphModel,
  options: NetworkRuntimeOptions,
  host: HTMLElement,
  state: NetworkViewState,
  context: NetworkRuntimeContext,
  updateState: (state: NetworkViewState) => void,
): void {
  const { width, height } = svgSize(svg, host);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.replaceChildren();

  const layout = cachedLayout(visible.nodes, visible.links, options, width, height, context);
  const arrowId = `xcon-network-arrow-${safeId(host.dataset.key ?? host.id ?? 'root')}`;
  if (options.showArrows) svg.append(renderArrowDefs(arrowId));
  const viewport = svgElement('g', {
    class: 'network-viewport',
    'data-xcon-network-viewport': 'true',
    transform: transformAttribute(context.transform),
  });
  const linkLayer = svgElement('g', { class: 'network-links' });
  const nodeLayer = svgElement('g', { class: 'network-nodes' });
  viewport.append(linkLayer, nodeLayer);
  svg.append(viewport);

  for (const link of visible.links) {
    const source = layout.get(link.source);
    const target = layout.get(link.target);
    if (!source || !target) continue;
    const line = svgElement('line', {
      class: classNames(
        'network-link',
        ...linkClassTokens(link),
        visible.highlightedLinkIds.has(link.id) && 'highlighted',
        visible.mutedLinkIds.has(link.id) && 'muted',
      ),
      'data-network-link-id': link.id,
      'data-network-link-source': link.source,
      'data-network-link-target': link.target,
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
    if (options.enableHover) bindHover(group, host, node);
    if (options.enableDrag) bindDrag(group, svg, node.id, layout, context);

    group.append(svgElement('circle', {
      class: classNames('network-node', node.isRoot && 'root-node'),
      'data-network-node-circle': 'true',
      r: String(options.nodeRadius),
      fill: nodeFill(node),
    }));
    if (options.showLabels) {
      const label = svgElement('text', { class: 'network-label', y: String(options.nodeRadius + 16), 'text-anchor': 'middle' });
      label.textContent = node.label;
      group.append(label);
    }
    nodeLayer.append(group);
  }
}

function bindViewportInteractions(svg: SVGSVGElement, options: NetworkRuntimeOptions, context: NetworkRuntimeContext): void {
  if (options.enableZoom) {
    svg.addEventListener('wheel', (event) => {
      event.preventDefault();
      const wheel = event as WheelEvent;
      const factor = wheel.deltaY < 0 ? 1.12 : 0.88;
      const previous = context.transform;
      const nextScale = clamp(previous.k * factor, MIN_VIEWPORT_SCALE, MAX_VIEWPORT_SCALE);
      if (nextScale === previous.k) return;
      const anchor = svgLocalPoint(svg, wheel);
      context.transform = {
        x: anchor.x - (anchor.x - previous.x) * (nextScale / previous.k),
        y: anchor.y - (anchor.y - previous.y) * (nextScale / previous.k),
        k: nextScale,
      };
      applyViewportTransform(svg, context.transform);
    });
  }

  if (options.enablePan) {
    svg.addEventListener('mousedown', (event) => {
      if (event.target !== svg) return;
      const start = event as MouseEvent;
      const startTransform = { ...context.transform };
      const owner = svg.ownerDocument ?? document;
      const move = (moveEvent: MouseEvent): void => {
        context.transform = {
          ...startTransform,
          x: startTransform.x + moveEvent.clientX - start.clientX,
          y: startTransform.y + moveEvent.clientY - start.clientY,
        };
        applyViewportTransform(svg, context.transform);
      };
      const end = (): void => {
        owner.removeEventListener('mousemove', move);
        owner.removeEventListener('mouseup', end);
      };
      owner.addEventListener('mousemove', move);
      owner.addEventListener('mouseup', end);
    });
  }
}

function bindHover(group: SVGElement, host: HTMLElement, node: NetworkNode): void {
  group.addEventListener('mouseenter', (event) => {
    const tooltip = ensureTooltip(host);
    tooltip.textContent = node.label;
    const mouse = event as MouseEvent;
    const anchor = tooltipAnchor(group, host, mouse);
    const style = `left:${trim(anchor.x)}px;top:${trim(anchor.y)}px`;
    tooltip.setAttribute('style', style);
    addClassToken(tooltip, 'show');
  });
  group.addEventListener('mouseleave', () => {
    const tooltip = ensureTooltip(host);
    tooltip.textContent = '';
    removeClassToken(tooltip, 'show');
  });
}

function svgLocalPoint(svg: SVGSVGElement, mouse: MouseEvent): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: finiteCoordinate(mouse.clientX - rect.left) ?? 0,
    y: finiteCoordinate(mouse.clientY - rect.top) ?? 0,
  };
}

function tooltipAnchor(group: SVGElement, host: HTMLElement, mouse: MouseEvent): { x: number; y: number } {
  const hostRect = host.getBoundingClientRect();
  const circle = group.querySelector<SVGElement>('[data-network-node-circle]');
  if (circle) {
    const rect = circle.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return {
        x: (finiteCoordinate(rect.left + rect.width / 2 - hostRect.left) ?? 0),
        y: (finiteCoordinate(rect.top - hostRect.top) ?? 0),
      };
    }
  }

  const groupRect = group.getBoundingClientRect();
  if (groupRect.width > 0 || groupRect.height > 0) {
    return {
      x: (finiteCoordinate(groupRect.left + groupRect.width / 2 - hostRect.left) ?? 0),
      y: (finiteCoordinate(groupRect.top - hostRect.top) ?? 0),
    };
  }

  return {
    x: (finiteCoordinate(mouse.clientX - hostRect.left + 12) ?? 0),
    y: (finiteCoordinate(mouse.clientY - hostRect.top + 12) ?? 0),
  };
}

function bindDrag(
  group: SVGElement,
  svg: SVGSVGElement,
  nodeId: string,
  layout: Map<string, PositionedNode>,
  context: NetworkRuntimeContext,
): void {
  group.addEventListener('mousedown', (event) => {
    const point = layout.get(nodeId);
    if (!point) return;
    event.preventDefault();
    const start = event as MouseEvent;
    const startPoint = { x: point.x, y: point.y };
    const owner = svg.ownerDocument ?? document;
    const move = (moveEvent: MouseEvent): void => {
      const scale = context.transform.k || 1;
      point.x = startPoint.x + (moveEvent.clientX - start.clientX) / scale;
      point.y = startPoint.y + (moveEvent.clientY - start.clientY) / scale;
      updateRenderedNodePosition(svg, nodeId, point.x, point.y);
    };
    const end = (): void => {
      owner.removeEventListener('mousemove', move);
      owner.removeEventListener('mouseup', end);
    };
    owner.addEventListener('mousemove', move);
    owner.addEventListener('mouseup', end);
  });
}

function updateRenderedNodePosition(svg: SVGSVGElement, nodeId: string, x: number, y: number): void {
  const group = svg.querySelector<SVGElement>(`[data-network-node-id="${cssAttrValue(nodeId)}"]`);
  group?.setAttribute('transform', `translate(${trim(x)} ${trim(y)})`);
  for (const link of Array.from(svg.querySelectorAll<SVGElement>('[data-network-link-id]'))) {
    if (link.getAttribute('data-network-link-source') === nodeId) {
      link.setAttribute('x1', String(x));
      link.setAttribute('y1', String(y));
    }
    if (link.getAttribute('data-network-link-target') === nodeId) {
      link.setAttribute('x2', String(x));
      link.setAttribute('y2', String(y));
    }
  }
}

function nodeFill(node: NetworkNode): string {
  return safeSvgPaint(node.color) ?? (node.isRoot ? 'var(--xcon-network-primary)' : 'var(--xcon-network-node)');
}

function linkClassTokens(link: NetworkLink): string[] {
  const type = link.type?.trim();
  if (!type) return [];
  const typed = `${safeClassToken(type)}-link`;
  const tokens = [typed];
  if (isReferenceLink(type)) tokens.push('ref-link');
  return Array.from(new Set(tokens));
}

function isReferenceLink(type: string | undefined): boolean {
  const normalized = type?.toLowerCase();
  return normalized === 'folder' || normalized === 'ref';
}

function ensureTooltip(host: HTMLElement): HTMLElement {
  const existing = host.querySelector<HTMLElement>('[data-xcon-network-tooltip]');
  if (existing) return existing;
  const tooltip = document.createElement('div');
  tooltip.className = 'network-tooltip';
  tooltip.dataset.xconNetworkTooltip = 'true';
  host.append(tooltip);
  return tooltip;
}

function applyViewportTransform(svg: SVGSVGElement, transform: ViewportTransform): void {
  svg.querySelector<SVGElement>('[data-xcon-network-viewport]')?.setAttribute('transform', transformAttribute(transform));
}

function fitGraphToView(svg: SVGSVGElement, host: HTMLElement, options: NetworkRuntimeOptions, context: NetworkRuntimeContext): void {
  const { width, height } = svgSize(svg, host);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const bounds = renderedGraphBounds(svg, context, options);
  context.transform = bounds ? fitTransform(bounds, width, height, options) : defaultTransform();
  applyViewportTransform(svg, context.transform);
}

function renderedGraphBounds(svg: SVGSVGElement, context: NetworkRuntimeContext, options: NetworkRuntimeOptions): GraphBounds | null {
  const nodeIds = Array.from(svg.querySelectorAll<SVGElement>('[data-network-node-id]'))
    .map((node) => node.getAttribute('data-network-node-id'))
    .filter((id): id is string => Boolean(id));
  if (nodeIds.length === 0) return null;

  const radius = Math.max(1, options.nodeRadius);
  const labelBottom = options.showLabels ? radius + 28 : radius;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const id of nodeIds) {
    const point = context.layout.get(id);
    if (!point) continue;
    minX = Math.min(minX, point.x - radius);
    minY = Math.min(minY, point.y - radius);
    maxX = Math.max(maxX, point.x + radius);
    maxY = Math.max(maxY, point.y + labelBottom);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function fitTransform(bounds: GraphBounds, width: number, height: number, options: NetworkRuntimeOptions): ViewportTransform {
  const padding = fitPadding(width, height, options);
  const usableWidth = Math.max(1, width - padding.left - padding.right);
  const usableHeight = Math.max(1, height - padding.top - padding.bottom);
  const scale = clamp(Math.min(usableWidth / bounds.width, usableHeight / bounds.height, 1), MIN_VIEWPORT_SCALE, 1);
  return {
    x: padding.left + (usableWidth - bounds.width * scale) / 2 - bounds.minX * scale,
    y: padding.top + (usableHeight - bounds.height * scale) / 2 - bounds.minY * scale,
    k: scale,
  };
}

function fitPadding(width: number, height: number, options: NetworkRuntimeOptions): FitPadding {
  const base = clamp(Math.min(width, height) * 0.12, 32, 72);
  const controlsTop = options.showControls ? Math.min(height * 0.36, base + 70) : base;
  return {
    top: controlsTop,
    right: base,
    bottom: base,
    left: base,
  };
}

function defaultTransform(): ViewportTransform {
  return { x: 0, y: 0, k: 1 };
}

function transformAttribute(transform: ViewportTransform): string {
  return `translate(${trim(transform.x)} ${trim(transform.y)}) scale(${trim(transform.k)})`;
}

function cachedLayout(
  nodes: NetworkNode[],
  links: NetworkLink[],
  options: NetworkRuntimeOptions,
  width: number,
  height: number,
  context: NetworkRuntimeContext,
): Map<string, PositionedNode> {
  const key = layoutCacheKey(nodes, links, options, width, height);
  const cached = context.layoutCache.get(key);
  if (cached) {
    context.layout = cached;
    return cached;
  }
  const layout = layoutGraph(nodes, links, options, width, height);
  context.layoutCache.set(key, layout);
  context.layout = layout;
  return layout;
}

function layoutCacheKey(
  nodes: NetworkNode[],
  links: NetworkLink[],
  options: NetworkRuntimeOptions,
  width: number,
  height: number,
): string {
  return JSON.stringify({
    width,
    height,
    linkDistance: options.linkDistance,
    charge: options.charge,
    friction: options.friction,
    nodes: nodes.map((node) => [node.id, node.x ?? null, node.y ?? null, node.fixed === true]),
    links: links.map((link) => [link.id, link.source, link.target, link.type ?? null, link.weight ?? null]),
  });
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
    .velocityDecay(1 - clamp(options.friction, 0, 1))
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
    friction: numberOption(record.friction, 0.75, 0),
    showControls: booleanOption(record.showControls, true),
    showSearch: booleanOption(record.showSearch, true),
    showFilters: booleanOption(record.showFilters, true),
    showLegend: booleanOption(record.showLegend, true),
    showLabels: booleanOption(record.showLabels, true),
    showArrows: booleanOption(record.showArrows, true),
    enableDrag: booleanOption(record.enableDrag, true),
    enableZoom: booleanOption(record.enableZoom, true),
    enablePan: booleanOption(record.enablePan, true),
    enableHover: booleanOption(record.enableHover, true),
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

function setClassTokens(element: Element, tokens: string[]): void {
  element.setAttribute('class', tokens.filter(Boolean).join(' '));
}

function addClassToken(element: Element, token: string): void {
  const tokens = new Set((element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
  tokens.add(token);
  element.setAttribute('class', Array.from(tokens).join(' '));
}

function removeClassToken(element: Element, token: string): void {
  const tokens = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).filter((item) => item !== token);
  element.setAttribute('class', tokens.join(' '));
}

function trim(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-') || 'root';
}

function safeClassToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'typed';
}

function cssAttrValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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

import { chord as chordLayout, ribbon } from 'd3-chord';
import { forceCenter, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';
import { hierarchy, partition, treemap, type HierarchyRectangularNode } from 'd3-hierarchy';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import * as Plot from '@observablehq/plot';
import type { Markish } from '@observablehq/plot';
import { normalizePlotSpec, toDataVizPlainValue } from './data';
import type { PlotMarkSpec, PlotSpec } from './types';

type PlainRecord = Record<string, unknown>;
type GraphNode = { id: string; label: string; color?: string };
type GraphLink = { source: string; target: string; value: number; color?: string };
type GraphModel = { nodes: GraphNode[]; links: GraphLink[] };
type PositionedForceNode = GraphNode & SimulationNodeDatum & { x: number; y: number };
type PositionedForceLink = SimulationLinkDatum<PositionedForceNode> & { value: number; color?: string };

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const MAX_HIERARCHY_NODES = 160;
const MAX_HIERARCHY_DEPTH = 32;
const palette = ['#2563eb', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#14b8a6'];

export function hydrateDataVizComponents(root: ParentNode = document): void {
  const hosts = dataVizHosts(root);
  for (const host of hosts) {
    if (host.dataset.xconDatavizBound === 'true') continue;
    try {
      const rendered = renderHost(host);
      if (!rendered) continue;
      host.replaceChildren(rendered);
      host.dataset.xconDatavizBound = 'true';
    } catch {
      // Preserve the static fallback and keep hydration failures local to this host.
    }
  }
}

function dataVizHosts(root: ParentNode): HTMLElement[] {
  const hosts: HTMLElement[] = [];
  if (isElementWithAttribute(root, 'data-xcon-dataviz-type')) hosts.push(root as HTMLElement);
  for (const host of Array.from(root.querySelectorAll<HTMLElement>('[data-xcon-dataviz-type]'))) {
    if (!hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

function isElementWithAttribute(value: ParentNode, name: string): boolean {
  return typeof (value as Element).getAttribute === 'function' && (value as Element).getAttribute(name) !== null;
}

function renderHost(host: HTMLElement): Node | null {
  const type = chartTypeKey(host.dataset.xconDatavizType);
  const data = parseJson(host.dataset.xconDatavizData);
  const config = parseConfig(host.dataset.xconDatavizConfig);
  const size = runtimeSize(host, config);

  if (type === 'treemap') return renderTreemap(host.ownerDocument, data, size);
  if (type === 'sunburst') return renderSunburst(host.ownerDocument, data, size);
  if (type === 'sankey') return renderSankey(host.ownerDocument, data, size);
  if (type === 'chord') return renderChord(host.ownerDocument, data, size);
  if (type === 'forcegraph' || type === 'force') return renderForceGraph(host.ownerDocument, data, size);
  if (type === 'plot') return renderPlot(host.ownerDocument, data, config, size);
  return null;
}

function renderTreemap(doc: Document, data: unknown, size: { width: number; height: number }): SVGSVGElement {
  const root = hierarchySource(data);
  const layout = treemap<PlainRecord>().size([size.width, size.height]).padding(3).round(true)(
    hierarchy(root).sum(nodeValue).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );
  const leaves = layout.leaves().filter((leaf) => (leaf.value ?? 0) > 0);
  if (leaves.length === 0) throw new Error('No treemap leaves');

  const svg = svgRoot(doc, size, 'xa-dataviz-runtime xa-dataviz-runtime--treemap');
  leaves.slice(0, 80).forEach((leaf, index) => {
    const group = svgElement(doc, 'g', { transform: `translate(${trim(leaf.x0)} ${trim(leaf.y0)})` });
    const width = Math.max(0, leaf.x1 - leaf.x0);
    const height = Math.max(0, leaf.y1 - leaf.y0);
    group.append(svgElement(doc, 'rect', {
      width: trim(width),
      height: trim(height),
      rx: '4',
      fill: dataColor(leaf.data, index),
    }));
    if (width > 48 && height > 26) {
      const label = svgElement(doc, 'text', { x: '7', y: '18', fill: '#ffffff', 'font-size': '12', 'font-weight': '700' });
      label.textContent = dataLabel(leaf.data, index).slice(0, 28);
      group.append(label);
    }
    svg.append(group);
  });
  return svg;
}

function renderSunburst(doc: Document, data: unknown, size: { width: number; height: number }): SVGSVGElement {
  const root = hierarchySource(data);
  const radius = Math.max(48, Math.min(size.width, size.height) / 2 - 12);
  const layout = partition<PlainRecord>().size([Math.PI * 2, radius])(
    hierarchy(root).sum(nodeValue).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );
  const segments = layout.descendants().filter((node) => node.depth > 0 && (node.value ?? 0) > 0);
  if (segments.length === 0) throw new Error('No sunburst segments');

  const cx = size.width / 2;
  const cy = size.height / 2;
  const svg = svgRoot(doc, size, 'xa-dataviz-runtime xa-dataviz-runtime--sunburst');
  segments.slice(0, 96).forEach((node, index) => {
    const path = svgElement(doc, 'path', {
      d: partitionArcPath(cx, cy, node),
      fill: dataColor(node.data, index),
      stroke: '#ffffff',
      'stroke-width': '1',
      opacity: '0.92',
    });
    const title = svgElement(doc, 'title', {});
    title.textContent = dataLabel(node.data, index);
    path.append(title);
    svg.append(path);
  });
  return svg;
}

function renderSankey(doc: Document, data: unknown, size: { width: number; height: number }): SVGSVGElement {
  const graph = graphModel(data);
  if (graph.nodes.length === 0 || graph.links.length === 0) throw new Error('No sankey graph');
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const links = graph.links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target) && link.value > 0);
  if (links.length === 0) throw new Error('No sankey links');

  const sankeyGraph = {
    nodes: graph.nodes.map((node) => ({ ...node })),
    links: links.map((link) => ({ ...link })),
  };
  const laidOut = sankey<typeof sankeyGraph.nodes[number], typeof sankeyGraph.links[number]>()
    .nodeId((node) => node.id)
    .nodeWidth(14)
    .nodePadding(12)
    .extent([[12, 12], [size.width - 12, size.height - 12]])(sankeyGraph);

  const svg = svgRoot(doc, size, 'xa-dataviz-runtime xa-dataviz-runtime--sankey');
  const linkPath = sankeyLinkHorizontal();
  laidOut.links.forEach((link, index) => {
    svg.append(svgElement(doc, 'path', {
      d: linkPath(link) ?? '',
      fill: 'none',
      stroke: link.color ?? palette[index % palette.length],
      'stroke-width': trim(Math.max(1, link.width ?? 1)),
      opacity: '0.45',
    }));
  });
  laidOut.nodes.forEach((node, index) => {
    svg.append(svgElement(doc, 'rect', {
      x: trim(node.x0 ?? 0),
      y: trim(node.y0 ?? 0),
      width: trim(Math.max(1, (node.x1 ?? 0) - (node.x0 ?? 0))),
      height: trim(Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0))),
      rx: '3',
      fill: safeSvgPaint(node.color) ?? palette[index % palette.length],
    }));
    const text = svgElement(doc, 'text', {
      x: trim((node.x1 ?? 0) + 6),
      y: trim(((node.y0 ?? 0) + (node.y1 ?? 0)) / 2 + 4),
      'font-size': '11',
      fill: '#334155',
    });
    text.textContent = node.label.slice(0, 26);
    svg.append(text);
  });
  return svg;
}

function renderChord(doc: Document, data: unknown, size: { width: number; height: number }): SVGSVGElement {
  const { matrix, labels } = chordMatrix(data);
  if (matrix.length < 2 || matrix.every((row) => row.every((value) => value <= 0))) throw new Error('No chord matrix');

  const cx = size.width / 2;
  const cy = size.height / 2;
  const outerRadius = Math.max(36, Math.min(size.width, size.height) / 2 - 20);
  const innerRadius = Math.max(24, outerRadius - 18);
  const chords = chordLayout().padAngle(0.05).sortSubgroups((a, b) => b - a)(matrix);
  const ribbonPath = ribbon().radius(innerRadius);
  const svg = svgRoot(doc, size, 'xa-dataviz-runtime xa-dataviz-runtime--chord');
  const group = svgElement(doc, 'g', { transform: `translate(${trim(cx)} ${trim(cy)})` });

  chords.groups.forEach((arcGroup, index) => {
    group.append(svgElement(doc, 'path', {
      d: annularArcPath(arcGroup.startAngle, arcGroup.endAngle, innerRadius, outerRadius),
      fill: palette[index % palette.length],
      stroke: '#ffffff',
    }));
    const point = polarPoint((arcGroup.startAngle + arcGroup.endAngle) / 2, outerRadius + 12);
    const text = svgElement(doc, 'text', { x: trim(point.x), y: trim(point.y), 'font-size': '10', 'text-anchor': 'middle', fill: '#334155' });
    text.textContent = labels[index]?.slice(0, 12) ?? String(index + 1);
    group.append(text);
  });
  chords.forEach((item, index) => {
    group.append(svgElement(doc, 'path', {
      d: (ribbonPath as (datum: unknown) => string | null)(item) ?? '',
      fill: palette[index % palette.length],
      opacity: '0.45',
    }));
  });
  svg.append(group);
  return svg;
}

function renderForceGraph(doc: Document, data: unknown, size: { width: number; height: number }): SVGSVGElement {
  const graph = graphModel(data);
  if (graph.nodes.length === 0) throw new Error('No force nodes');
  const nodes: PositionedForceNode[] = graph.nodes.map((node, index) => {
    const fallback = radialPoint(index, graph.nodes.length, size.width, size.height);
    return { ...node, x: fallback.x, y: fallback.y };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const links: PositionedForceLink[] = graph.links.flatMap((link) => {
    const source = nodeById.get(link.source);
    const target = nodeById.get(link.target);
    return source && target ? [{ ...link, source, target }] : [];
  });

  forceSimulation(nodes)
    .force('link', forceLink<PositionedForceNode, PositionedForceLink>(links).id((node) => node.id).distance(80))
    .force('charge', forceManyBody<PositionedForceNode>().strength(-220))
    .force('center', forceCenter(size.width / 2, size.height / 2))
    .stop()
    .tick(80);

  const svg = svgRoot(doc, size, 'xa-dataviz-runtime xa-dataviz-runtime--force-graph');
  links.forEach((link) => {
    const source = link.source as PositionedForceNode;
    const target = link.target as PositionedForceNode;
    svg.append(svgElement(doc, 'line', {
      x1: trim(source.x),
      y1: trim(source.y),
      x2: trim(target.x),
      y2: trim(target.y),
      stroke: safeSvgPaint(link.color) ?? '#94a3b8',
      'stroke-width': trim(1 + Math.min(5, Math.max(0, link.value))),
      opacity: '0.7',
    }));
  });
  nodes.forEach((node, index) => {
    svg.append(svgElement(doc, 'circle', {
      cx: trim(node.x),
      cy: trim(node.y),
      r: '13',
      fill: safeSvgPaint(node.color) ?? palette[index % palette.length],
      stroke: '#ffffff',
      'stroke-width': '2',
    }));
    const label = svgElement(doc, 'text', { x: trim(node.x), y: trim(node.y + 28), 'font-size': '10', 'text-anchor': 'middle', fill: '#334155' });
    label.textContent = node.label.slice(0, 18);
    svg.append(label);
  });
  return svg;
}

function renderPlot(doc: Document, data: unknown, config: PlainRecord, size: { width: number; height: number }): Node {
  const spec = plotSpec(data, config);
  if (spec.data.length === 0 || spec.marks.length === 0) throw new Error('No plot data');

  try {
    const marks = spec.marks.map((mark) => plotMark(mark, spec.data)).filter((mark): mark is Markish => Boolean(mark));
    if (marks.length === 0) throw new Error('No plot marks');
    const plot = Plot.plot({
      width: size.width,
      height: size.height,
      ...spec.options,
      marks,
    });
    if (plot) return plot;
  } catch {
    // Some test and embed environments expose only a minimal DOM. Fall back to a small SVG
    // after exercising Observable Plot with sanitized declarative input.
  }

  return renderPlotFallback(doc, spec, size);
}

function renderPlotFallback(doc: Document, spec: PlotSpec, size: { width: number; height: number }): SVGSVGElement {
  const mark = spec.marks[0];
  if (!mark) throw new Error('No plot mark');
  const valueField = mark.type === 'barX' || mark.type === 'ruleX' ? mark.x : mark.y;
  const labelField = mark.type === 'barX' || mark.type === 'ruleX' ? mark.y : mark.x;
  if (!valueField) throw new Error('No plot value field');
  const rows = spec.data.map((row, index) => ({
    label: String((labelField ? row[labelField] : undefined) ?? row.label ?? row.name ?? index + 1),
    value: finiteNumber(row[valueField], Number.NaN),
  })).filter((row) => Number.isFinite(row.value)).slice(0, 24);
  if (rows.length === 0) throw new Error('No plot rows');

  const svg = svgRoot(doc, size, 'xa-dataviz-runtime xa-dataviz-runtime--plot');
  const max = Math.max(1, ...rows.map((row) => Math.max(0, row.value)));
  const step = (size.width - 48) / Math.max(1, rows.length);
  rows.forEach((row, index) => {
    const height = Math.max(1, (Math.max(0, row.value) / max) * (size.height - 56));
    const x = 24 + index * step + step * 0.16;
    const y = size.height - 28 - height;
    svg.append(svgElement(doc, 'rect', {
      x: trim(x),
      y: trim(y),
      width: trim(Math.max(3, step * 0.68)),
      height: trim(height),
      fill: palette[index % palette.length],
    }));
    const label = svgElement(doc, 'text', { x: trim(x + step * 0.34), y: trim(size.height - 10), 'font-size': '10', 'text-anchor': 'middle', fill: '#475569' });
    label.textContent = row.label.slice(0, 10);
    svg.append(label);
  });
  return svg;
}

function plotMark(mark: PlotMarkSpec, data: Array<Record<string, unknown>>): Markish {
  const options: PlainRecord = {};
  if (mark.x) options.x = mark.x;
  if (mark.y) options.y = mark.y;
  if (mark.fill) options.fill = mark.fill;
  if (mark.stroke) options.stroke = mark.stroke;
  const factories = Plot as unknown as Record<string, (data: Array<Record<string, unknown>>, options: PlainRecord) => unknown>;
  return factories[mark.type]?.(data, options) as Markish;
}

function plotSpec(data: unknown, config: PlainRecord): PlotSpec {
  const normalized = normalizePlotSpec(data);
  if (normalized.marks.length > 0 || normalized.data.length === 0) return normalized;
  const fields = plotFields(normalized.data);
  if (!fields.y) return normalized;
  const type = chartTypeKey(String(config.type ?? config.fallbackType ?? 'barY')) === 'line' ? 'line' : 'barY';
  return {
    ...normalized,
    marks: [{ type, x: fields.x, y: fields.y }],
  };
}

function hierarchySource(data: unknown): PlainRecord {
  const budget = { count: 0 };
  const root = Array.isArray(data)
    ? boundedHierarchyNode({ name: 'root', children: data }, 0, budget)
    : boundedHierarchyNode(data, 0, budget);
  const children = hierarchyChildren(root);
  if (children.length === 0 && nodeValue(root) <= 0) throw new Error('Invalid hierarchy');
  return root;
}

function boundedHierarchyNode(value: unknown, depth: number, budget: { count: number }): PlainRecord {
  if (depth > MAX_HIERARCHY_DEPTH) throw new Error('Hierarchy depth limit exceeded');
  if (budget.count >= MAX_HIERARCHY_NODES) throw new Error('Hierarchy node limit exceeded');
  budget.count += 1;

  const record = objectRecord(value);
  if (!record) {
    const numeric = finiteNumber(value, Number.NaN);
    if (!Number.isFinite(numeric)) throw new Error('Invalid hierarchy node');
    return { name: String(value), value: numeric };
  }

  const output = shallowHierarchyRecord(record);
  const children = hierarchyChildren(record);
  if (children.length > 0) {
    const boundedChildren: PlainRecord[] = [];
    for (const child of children) {
      if (budget.count >= MAX_HIERARCHY_NODES) break;
      boundedChildren.push(boundedHierarchyNode(child, depth + 1, budget));
    }
    if (boundedChildren.length > 0) output.children = boundedChildren;
  }
  return output;
}

function hierarchyChildren(record: PlainRecord): unknown[] {
  if (Array.isArray(record.children)) return record.children;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.nodes)) return record.nodes;
  return [];
}

function shallowHierarchyRecord(record: PlainRecord): PlainRecord {
  const output: PlainRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'children' || key === 'items' || key === 'nodes') continue;
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) output[key] = value;
  }
  return output;
}

function nodeValue(record: PlainRecord): number {
  const children = hierarchyChildren(record);
  if (children.length > 0) return 0;
  return Math.max(0, finiteNumber(record.value ?? record.count ?? record.size ?? record.amount ?? record.weight, 0));
}

function graphModel(data: unknown): GraphModel {
  const plain = toDataVizPlainValue(data);
  const record = objectRecord(plain);
  const matrix = Array.isArray(record?.matrix) ? record.matrix : Array.isArray(plain) && Array.isArray(plain[0]) ? plain : undefined;
  if (matrix) {
    const { matrix: rows, labels } = matrixModel(matrix);
    const nodes = rows.map((_, index) => ({ id: String(index), label: labels[index] ?? String(index + 1) }));
    const links: GraphLink[] = [];
    rows.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (value > 0 && rowIndex !== columnIndex) links.push({ source: String(rowIndex), target: String(columnIndex), value });
      });
    });
    return { nodes, links };
  }

  const rawNodes = Array.isArray(record?.nodes) ? record.nodes : Array.isArray(record?.vertices) ? record.vertices : [];
  const rawLinks = Array.isArray(record?.links) ? record.links : Array.isArray(record?.edges) ? record.edges : Array.isArray(record?.data) ? record.data : [];
  const nodes = new Map<string, GraphNode>();
  rawNodes.forEach((node, index) => {
    const normalized = graphNode(node, index);
    nodes.set(normalized.id, normalized);
  });
  const links = rawLinks.flatMap((link, index) => {
    const normalized = graphLink(link, rawNodes, index);
    if (!normalized) return [];
    if (!nodes.has(normalized.source)) nodes.set(normalized.source, { id: normalized.source, label: normalized.source });
    if (!nodes.has(normalized.target)) nodes.set(normalized.target, { id: normalized.target, label: normalized.target });
    return [normalized];
  });
  return { nodes: Array.from(nodes.values()).slice(0, 64), links: links.slice(0, 128) };
}

function graphNode(value: unknown, index: number): GraphNode {
  const record = objectRecord(toDataVizPlainValue(value)) ?? {};
  const id = String(record.id ?? record.key ?? record.name ?? record.label ?? index);
  return {
    id,
    label: String(record.label ?? record.name ?? record.title ?? record.id ?? index + 1),
    color: safeSvgPaint(record.color) ?? safeSvgPaint(record.backgroundColor) ?? safeSvgPaint(record.fill),
  };
}

function graphLink(value: unknown, rawNodes: unknown[], index: number): GraphLink | undefined {
  const record = objectRecord(toDataVizPlainValue(value));
  if (!record) return undefined;
  const source = graphEndpoint(record.source ?? record.from ?? record.sourceId, rawNodes);
  const target = graphEndpoint(record.target ?? record.to ?? record.targetId, rawNodes);
  if (!source || !target) return undefined;
  return {
    source,
    target,
    value: Math.max(0, finiteNumber(record.value ?? record.weight ?? record.count ?? record.amount, 1)),
    color: safeSvgPaint(record.color) ?? safeSvgPaint(record.stroke) ?? safeSvgPaint(record.fill) ?? palette[index % palette.length],
  };
}

function graphEndpoint(value: unknown, rawNodes: unknown[]): string | undefined {
  if (typeof value === 'number' && rawNodes[value]) return graphNode(rawNodes[value], value).id;
  const record = objectRecord(toDataVizPlainValue(value));
  if (record) return String(record.id ?? record.key ?? record.name ?? record.label ?? '');
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function chordMatrix(data: unknown): { matrix: number[][]; labels: string[] } {
  const plain = toDataVizPlainValue(data);
  const record = objectRecord(plain);
  const matrix = Array.isArray(record?.matrix) ? record.matrix : Array.isArray(plain) && Array.isArray(plain[0]) ? plain : undefined;
  if (matrix) return matrixModel(matrix);

  const graph = graphModel(data);
  const indexById = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const rows = graph.nodes.map(() => graph.nodes.map(() => 0));
  graph.links.forEach((link) => {
    const source = indexById.get(link.source);
    const target = indexById.get(link.target);
    if (source === undefined || target === undefined || source === target) return;
    rows[source][target] += Math.max(0, link.value);
  });
  return { matrix: rows, labels: graph.nodes.map((node) => node.label) };
}

function matrixModel(matrix: unknown[]): { matrix: number[][]; labels: string[] } {
  const rows = matrix.filter(Array.isArray).slice(0, 24) as unknown[][];
  const size = rows.length;
  return {
    matrix: rows.map((row) => row.slice(0, size).map((value) => Math.max(0, finiteNumber(value, 0)))),
    labels: rows.map((_, index) => String(index + 1)),
  };
}

function svgRoot(doc: Document, size: { width: number; height: number }, className: string): SVGSVGElement {
  return svgElement(doc, 'svg', {
    class: className,
    viewBox: `0 0 ${size.width} ${size.height}`,
    width: '100%',
    height: '100%',
    role: 'img',
  }) as SVGSVGElement;
}

function svgElement(doc: Document, name: string, attrs: Record<string, string | undefined>): SVGElement {
  const element = doc.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) element.setAttribute(key, value);
  }
  return element;
}

function runtimeSize(host: HTMLElement, config: PlainRecord): { width: number; height: number } {
  const width = positiveNumber(config.width) ?? positiveNumber(host.clientWidth) ?? DEFAULT_WIDTH;
  const height = positiveNumber(config.height) ?? positiveNumber(host.clientHeight) ?? DEFAULT_HEIGHT;
  return { width, height };
}

function parseJson(value: string | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Invalid dataViz JSON');
  }
}

function parseConfig(value: string | undefined): PlainRecord {
  const parsed = value ? parseJson(value) : {};
  return objectRecord(parsed) ?? {};
}

function objectRecord(value: unknown): PlainRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as PlainRecord;
}

function plotFields(rows: Array<Record<string, unknown>>): { x?: string; y?: string } {
  const first = rows[0];
  if (!first) return {};
  const entries = Object.entries(first);
  const y = entries.find(([, value]) => Number.isFinite(Number(value)))?.[0];
  const x = entries.find(([key, value]) => key !== y && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))?.[0];
  return { x, y };
}

function dataLabel(data: PlainRecord, index: number): string {
  return String(data.label ?? data.name ?? data.title ?? data.id ?? index + 1);
}

function dataColor(data: PlainRecord, index: number): string {
  return safeSvgPaint(data.color) ?? safeSvgPaint(data.backgroundColor) ?? safeSvgPaint(data.fill) ?? palette[index % palette.length];
}

function radialPoint(index: number, count: number, width: number, height: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / Math.max(1, count);
  return {
    x: width / 2 + Math.cos(angle) * Math.min(width * 0.3, 180),
    y: height / 2 + Math.sin(angle) * Math.min(height * 0.25, 130),
  };
}

function partitionArcPath(cx: number, cy: number, node: HierarchyRectangularNode<PlainRecord>): string {
  return annularArcPath(node.x0, node.x1, node.y0, node.y1, cx, cy);
}

function annularArcPath(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number, cx = 0, cy = 0): string {
  const startOuter = polarPoint(startAngle, outerRadius, cx, cy);
  const endOuter = polarPoint(endAngle, outerRadius, cx, cy);
  const startInner = polarPoint(endAngle, innerRadius, cx, cy);
  const endInner = polarPoint(startAngle, innerRadius, cx, cy);
  const largeArc = endAngle - startAngle > Math.PI ? '1' : '0';
  return [
    `M ${trim(startOuter.x)} ${trim(startOuter.y)}`,
    `A ${trim(outerRadius)} ${trim(outerRadius)} 0 ${largeArc} 1 ${trim(endOuter.x)} ${trim(endOuter.y)}`,
    `L ${trim(startInner.x)} ${trim(startInner.y)}`,
    `A ${trim(innerRadius)} ${trim(innerRadius)} 0 ${largeArc} 0 ${trim(endInner.x)} ${trim(endInner.y)}`,
    'Z',
  ].join(' ');
}

function polarPoint(angle: number, radius: number, cx = 0, cy = 0): { x: number; y: number } {
  const adjusted = angle - Math.PI / 2;
  return {
    x: cx + Math.cos(adjusted) * radius,
    y: cy + Math.sin(adjusted) * radius,
  };
}

function positiveNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function chartTypeKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function trim(value: number): string {
  return Number(value.toFixed(3)).toString();
}

const SAFE_SVG_PAINT = /^(?:#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})|[a-zA-Z]+|var\(\s*--[a-zA-Z0-9_-]+\s*\)|rgba?\([^)]+\)|hsla?\([^)]+\))$/i;
const UNSAFE_CSS_VALUE = /javascript:|vbscript:|expression\s*\(|url\s*\(/i;

function safeSvgPaint(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const color = value.trim();
  if (!color || UNSAFE_CSS_VALUE.test(color)) return undefined;
  return SAFE_SVG_PAINT.test(color) ? color : undefined;
}

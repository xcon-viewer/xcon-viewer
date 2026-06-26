import { normalizeNetworkGraph, toNetworkPlainValue } from './data';
import { networkThemeStyle, resolveNetworkTheme } from './theme';
import type { NetworkGraphModel, NetworkNode, NetworkTheme } from './types';

type PlainRecord = Record<string, unknown>;

export interface RenderNetworkStaticInput {
  key: string;
  component: unknown;
  attrs: Record<string, string | undefined>;
}

export function renderNetworkStatic(input: RenderNetworkStaticInput): string {
  const plainComponent = toNetworkPlainValue(input.component);
  const component = asRecord(plainComponent) ?? {};
  const graph = normalizeNetworkGraph(plainComponent);
  const theme = resolveNetworkTheme(component);
  const key = sanitizeKey(input.key);
  const options = networkOptions(component);
  const hostAttrs = {
    ...input.attrs,
    id: `network-container-${key}`,
    class: className(input.attrs.class, 'xa-network-diagram-container'),
    style: appendedStyle(input.attrs.style, `position:relative;width:100%;height:100%;background:var(--xcon-network-bg);${networkThemeStyle(theme)}`),
    'data-key': key,
    'data-xcon-network': 'true',
    'data-xcon-network-bound': 'false',
    'data-xcon-network-theme': theme.name,
    'data-xcon-network-model': jsonAttribute(graph),
    'data-xcon-network-options': jsonAttribute(options),
  };

  return tag(
    'div',
    hostAttrs,
    tag('div', { 'data-xcon-network-toolbar': 'true' }, '') +
      tag(
        'svg',
        { id: `network-diagram-${key}`, class: 'network-svg', style: 'width:100%;height:100%;', viewBox: '0 0 800 600', role: 'img' },
        renderStaticSvg(graph, key, options, theme),
      ) +
      tag('div', { class: 'network-tooltip', 'data-xcon-network-tooltip': 'true' }, ''),
  );
}

function renderStaticSvg(graph: NetworkGraphModel, key: string, options: NetworkStaticOptions, theme: NetworkTheme): string {
  const positions = fallbackPositions(graph.nodes);
  const defs = options.showArrows
    ? tag(
        'defs',
        {},
        tag('marker', { id: `arrow-${key}`, viewBox: '0 -5 10 10', refX: '10', refY: '0', markerWidth: '5', markerHeight: '5', orient: 'auto' }, tag('path', { d: 'M0,-5L10,0L0,5', class: 'network-arrow', fill: theme.linkColor }, '')) +
          tag('marker', { id: `ref-arrow-${key}`, viewBox: '0 -5 10 10', refX: '10', refY: '0', markerWidth: '5', markerHeight: '5', orient: 'auto' }, tag('path', { d: 'M0,-5L10,0L0,5', class: 'network-arrow ref-arrow', fill: theme.refLinkColor }, '')),
      )
    : '';
  const links = graph.links
    .map((link) => {
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (!source || !target) return '';
      const isRef = isReferenceLink(link.type);
      return tag(
        'line',
        {
          class: `network-link${isRef ? ' ref-link' : ''}`,
          x1: String(source.x),
          y1: String(source.y),
          x2: String(target.x),
          y2: String(target.y),
          stroke: isRef ? theme.refLinkColor : theme.linkColor,
          'marker-end': options.showArrows ? `url(#${isRef ? 'ref-arrow' : 'arrow'}-${key})` : undefined,
        },
        '',
      );
    })
    .join('');
  const nodes = graph.nodes
    .map((node, index) => {
      const point = positions.get(node.id) ?? { x: 400, y: 300 };
      const isRoot = node.isRoot || index === 0;
      const nodeFill = safeSvgPaint(node.color) ?? (isRoot ? theme.primaryColor : theme.nodeColor);

      return tag(
        'g',
        { class: `network-node-group${isRoot ? ' root-node' : ''}`, 'data-node-id': node.id },
        tag('circle', { class: `network-node${isRoot ? ' root-node' : ''}`, cx: String(point.x), cy: String(point.y), r: String(options.nodeRadius), fill: nodeFill }, '') +
          (options.showLabels ? tag('text', { class: `network-label${isRoot ? ' root-label' : ''}`, x: String(point.x), y: String(point.y + options.nodeRadius + 19), 'text-anchor': 'middle', fill: theme.textColor }, escapeHtml(node.label)) : ''),
      );
    })
    .join('');

  return defs + links + nodes;
}

function fallbackPositions(nodes: NetworkNode[]): Map<string, { x: number; y: number }> {
  const items = nodes.length ? nodes : [{ id: 'root', label: 'Root', metadata: {}, isRoot: true }];
  return new Map(
    items.map((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, items.length);
      return [node.id, { x: node.x ?? 400 + Math.cos(angle) * 190, y: node.y ?? 300 + Math.sin(angle) * 150 }];
    }),
  );
}

interface NetworkStaticOptions {
  nodeRadius: number;
  linkDistance: number;
  charge: number;
  friction: number;
  gravity: number;
  showLabels: boolean;
  showArrows: boolean;
  showControls: boolean;
  showSearch: boolean;
  showFilters: boolean;
  showLegend: boolean;
  enableDrag: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  enableHover: boolean;
}

function networkOptions(component: PlainRecord): NetworkStaticOptions {
  return {
    nodeRadius: numberOption(component.nodeRadius, 25, 1),
    linkDistance: numberOption(component.linkDistance, 80),
    charge: numberOption(component.charge, -1500),
    friction: numberOption(component.friction, 0.75),
    gravity: numberOption(component.gravity, 0.08),
    showLabels: booleanOption(component.showLabels, true),
    showArrows: booleanOption(component.showArrows, true),
    showControls: booleanOption(component.showControls, true),
    showSearch: booleanOption(component.showSearch, true),
    showFilters: booleanOption(component.showFilters, true),
    showLegend: booleanOption(component.showLegend, true),
    enableDrag: booleanOption(component.enableDrag, true),
    enableZoom: booleanOption(component.enableZoom, true),
    enablePan: booleanOption(component.enablePan, true),
    enableHover: booleanOption(component.enableHover, true),
  };
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

function isReferenceLink(type: string | undefined): boolean {
  const normalized = type?.toLowerCase();
  return normalized === 'folder' || normalized === 'ref';
}

function appendedStyle(existing: string | undefined, internal: string): string {
  const existingStyle = existing ?? '';
  const protectedProps = new Set<string>();
  if (/\bposition\s*:/i.test(existingStyle)) protectedProps.add('position');
  if (/\bwidth\s*:/i.test(existingStyle)) protectedProps.add('width');
  if (/\bheight\s*:/i.test(existingStyle)) protectedProps.add('height');
  const filteredInternal = internal
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const prop = part.split(':', 1)[0]?.trim().toLowerCase();
      return !protectedProps.has(prop);
    })
    .join(';');
  return joinStyles(existingStyle, filteredInternal) ?? '';
}

function joinStyles(...styles: Array<string | undefined>): string | undefined {
  const joined = styles.filter(Boolean).join(';').replaceAll(/;+/g, ';').replace(/^;|;$/g, '');
  return joined || undefined;
}

function jsonAttribute(value: unknown): string {
  return JSON.stringify(value);
}

function className(...classes: Array<string | undefined>): string {
  return classes.flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? []).filter(Boolean).join(' ');
}

function sanitizeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-') || 'root';
}

function asRecord(value: unknown): PlainRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlainRecord) : undefined;
}

const SAFE_SVG_PAINT = /^(?:#(?:[\da-f]{3}|[\da-f]{6})|[a-zA-Z]+|var\(\s*--[a-zA-Z0-9_-]+\s*\)|rgba?\([^)]+\)|hsla?\([^)]+\))$/i;
const UNSAFE_SVG_PAINT = /javascript:|vbscript:|expression\s*\(|url\s*\(/i;

function safeSvgPaint(value: string | undefined): string | undefined {
  const color = value?.trim();
  if (!color || UNSAFE_SVG_PAINT.test(color)) return undefined;
  return SAFE_SVG_PAINT.test(color) ? color : undefined;
}

function tag(name: string, attrs: Record<string, string | undefined>, body: string): string {
  return `<${name}${renderAttrs(attrs)}>${body}</${name}>`;
}

function renderAttrs(attrs: Record<string, string | undefined>): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => (value === '' && name !== 'value' ? ` ${name}` : ` ${name}="${escapeAttr(String(value))}"`))
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

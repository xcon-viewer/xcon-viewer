import { isXconObject, type XconObject } from '@xcon-viewer/core';

const openStreetMapTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const openStreetMapAttribution = '(C) OpenStreetMap contributors';
const activeCssPattern = /expression\s*\(|javascript:|vbscript:|url\s*\(|behavior\s*:/i;
const themeTokenAliasPattern = /(^|[\s,(])@([A-Za-z_][\w-]*)(?=$|[\s,),])/g;

export interface RenderContextLike {
  options: { allowExternalResources: boolean };
}

export function renderMapStatic(component: XconObject, context: RenderContextLike): string {
  const lat = Number(component.get('latitude') ?? 37.5665) || 37.5665;
  const lng = Number(component.get('longitude') ?? 126.978) || 126.978;
  const zoom = Number(component.get('zoom') ?? 10) || 10;
  const tileLayer = String(component.get('tileLayer') ?? 'OpenStreetMap');
  const provider = String(component.get('provider') ?? component.get('mapProvider') ?? '').trim().toLowerCase();
  const liveLeaflet = provider === 'leaflet' && context.options.allowExternalResources;
  const markers = parseArrayValue(component.get('markers')).slice(0, 20);
  const heatmap = parseArrayValue(component.get('heatmap')).slice(0, 200);
  const polylines = parseArrayValue(component.get('polylines')).slice(0, 50);
  const polygons = parseArrayValue(component.get('polygons')).slice(0, 50);
  const markerIcons = toPlainValue(component.get('markerIcons') ?? {});
  const heatmapOptions = toPlainValue(component.get('heatmapOptions'));
  const clusterOptions = toPlainValue(component.get('clusterOptions'));
  const rawSnapshot = component.get('snapshotUrl') ?? component.get('staticImage') ?? component.get('mapImage') ?? component.get('image') ?? component.get('src');
  const snapshotUrl = sanitizeUrl(stripCssUrl(String(rawSnapshot ?? '')), context.options);
  const snapshotAlt = String(component.get('snapshotAlt') ?? component.get('alt') ?? `Map centered at ${lat}, ${lng}`);
  const snapshotFit = mapSnapshotFit(component.get('snapshotFit') ?? component.get('objectFit'));
  const snapshotPosition = safeCssValue(component.get('objectPosition') ?? component.get('snapshotPosition')) ?? 'center';
  const attributionText = component.get('attribution') ?? (liveLeaflet ? openStreetMapAttribution : undefined);
  const layerHtml = snapshotUrl
    ? voidTag('img', {
        class: 'xa-map-snapshot',
        src: snapshotUrl,
        alt: snapshotAlt,
        loading: 'lazy',
        decoding: 'async',
        style: `object-fit:${snapshotFit};object-position:${snapshotPosition};`,
      }) + (attributionText ? tag('span', { class: 'xa-map-attribution' }, escapeHtml(String(attributionText))) : '')
    : [
        tag('span', { class: 'xa-map-layer xa-map-water xa-map-water--river', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-park xa-map-park--north', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-park xa-map-park--south', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-road xa-map-road--main', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-road xa-map-road--cross', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-road xa-map-road--vertical', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-road xa-map-road--ring', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-label xa-map-label--north' }, 'Park'),
        tag('span', { class: 'xa-map-layer xa-map-label xa-map-label--center' }, escapeHtml(tileLayer)),
        tag('span', { class: 'xa-map-layer xa-map-label xa-map-label--south' }, 'District'),
        tag('span', { class: 'xa-map-attribution' }, 'static map preview'),
      ].join('');
  const markerHtml = markers.length
    ? markers.map((marker, index) => {
        const plain = toPlainValue(marker);
        const obj = plain && typeof plain === 'object' && !Array.isArray(plain) ? plain as Record<string, unknown> : {};
        const label = String(obj.title ?? obj.label ?? obj.popup ?? index + 1);
        const markerLat = Number(obj.lat ?? obj.latitude);
        const markerLng = Number(obj.lng ?? obj.longitude);
        const left = Number.isFinite(markerLng) ? Math.max(8, Math.min(92, 50 + (markerLng - lng) * 900)) : 20 + (index % 5) * 15;
        const top = Number.isFinite(markerLat) ? Math.max(8, Math.min(92, 50 - (markerLat - lat) * 900)) : 25 + Math.floor(index / 5) * 14;
        return tag('span', { class: 'xa-map-marker', title: label, style: `left:${left}%;top:${top}%;` }, escapeHtml(label.slice(0, 2)));
      }).join('')
    : tag('span', { class: 'xa-map-marker', style: 'left:50%;top:50%;' }, '●');
  return tag(
    'div',
    {
      class: `xa-map-static${snapshotUrl ? ' xa-map-static--snapshot' : ''}${liveLeaflet ? ' xa-map-static--leaflet' : ''}`,
      'data-latitude': String(lat),
      'data-longitude': String(lng),
      'data-zoom': String(zoom),
      'data-tile-layer': tileLayer,
      'data-xcon-leaflet-map': liveLeaflet ? '' : undefined,
      'data-xcon-map-provider': liveLeaflet ? 'leaflet' : undefined,
      'data-xcon-map-tile-url': liveLeaflet ? leafletTileUrl(component, context) : undefined,
      'data-xcon-map-attribution': liveLeaflet ? String(attributionText ?? openStreetMapAttribution) : undefined,
      'data-xcon-map-markers': liveLeaflet ? jsonAttr(markers.map(mapMarkerData)) : undefined,
      'data-xcon-map-heatmap': liveLeaflet && heatmap.length ? jsonAttr(heatmap) : undefined,
      'data-xcon-map-heatmap-options': liveLeaflet && heatmapOptions !== undefined && heatmapOptions !== null ? jsonAttr(heatmapOptions) : undefined,
      'data-xcon-map-polylines': liveLeaflet && polylines.length ? jsonAttr(polylines) : undefined,
      'data-xcon-map-polygons': liveLeaflet && polygons.length ? jsonAttr(polygons) : undefined,
      'data-xcon-map-clustering': liveLeaflet ? String(booleanOption(component.get('clustering'), false)) : undefined,
      'data-xcon-map-cluster-options': liveLeaflet && clusterOptions !== undefined && clusterOptions !== null ? jsonAttr(clusterOptions) : undefined,
      'data-xcon-map-marker-icons': liveLeaflet && hasJsonData(markerIcons) ? jsonAttr(markerIcons) : undefined,
      'data-xcon-map-show-controls': liveLeaflet ? String(booleanOption(component.get('showControls'), true)) : undefined,
      'data-xcon-map-enable-zoom': liveLeaflet ? String(booleanOption(component.get('enableZoom'), true)) : undefined,
      'data-xcon-map-enable-pan': liveLeaflet ? String(booleanOption(component.get('enablePan'), true)) : undefined,
    },
    layerHtml + markerHtml,
  );
}

function mapSnapshotFit(value: unknown): string {
  const fit = String(value ?? 'cover').trim().toLowerCase();
  return ['cover', 'contain', 'fill', 'none', 'scale-down'].includes(fit) ? fit : 'cover';
}

function leafletTileUrl(component: XconObject, context: RenderContextLike): string {
  const explicit = sanitizeUrl(String(component.get('tileUrl') ?? component.get('tileTemplate') ?? ''), context.options);
  if (explicit) return explicit;
  const layer = String(component.get('tileLayer') ?? '').trim().toLowerCase();
  if (layer.includes('carto')) return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  return openStreetMapTileUrl;
}

function mapMarkerData(marker: unknown, index: number): Record<string, unknown> {
  const plain = toPlainValue(marker);
  const obj = plain && typeof plain === 'object' && !Array.isArray(plain) ? plain as Record<string, unknown> : {};
  const lat = Number(obj.lat ?? obj.latitude);
  const lng = Number(obj.lng ?? obj.longitude);
  return {
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    label: String(obj.label ?? obj.title ?? obj.popup ?? index + 1),
  };
}

function parseArrayValue(value: unknown): unknown[] {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) return plain;
  if (typeof plain === 'string') {
    try {
      const parsed = JSON.parse(plain) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toPlainValue(value: unknown): unknown {
  if (isXconObject(value)) {
    const result: Record<string, unknown> = {};
    value.forEach((child, key) => {
      result[key] = toPlainValue(child);
    });
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => toPlainValue(item));
  return value;
}

function jsonAttr(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return 'null';
  }
}

function hasJsonData(value: unknown): boolean {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) return plain.length > 0;
  if (plain && typeof plain === 'object') return Object.keys(plain as Record<string, unknown>).length > 0;
  return plain !== undefined && plain !== null && plain !== '';
}

function sanitizeUrl(value: unknown, options: { allowExternalResources?: boolean } = {}): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  const lowered = trimmed.toLowerCase();
  if (
    lowered.startsWith('javascript:') ||
    lowered.startsWith('vbscript:') ||
    lowered.startsWith('data:text/html') ||
    /[<>"']/.test(trimmed)
  ) {
    return null;
  }
  if (/^(https?:)?\/\//i.test(trimmed) && !options.allowExternalResources) return null;
  if (lowered.startsWith('data:') && !lowered.startsWith('data:image/')) return null;
  return trimmed;
}

function safeCssValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim();
  if (!text || activeCssPattern.test(text)) return undefined;
  return expandThemeTokenAliases(text);
}

function stripCssUrl(value: string): string {
  const match = value.trim().match(/^url\((.*)\)$/i);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : value;
}

function booleanOption(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  return !(value === false || value === 'false' || value === 0 || value === '0' || value === 'none' || value === 'hidden');
}

function expandThemeTokenAliases(value: string): string {
  return value.replace(themeTokenAliasPattern, (_match, prefix: string, token: string) => `${prefix}var(--${token})`);
}

function tag(name: string, attrs: Record<string, string | undefined>, body: string): string {
  return `<${name}${renderAttrs(attrs)}>${body}</${name}>`;
}

function voidTag(name: string, attrs: Record<string, string | undefined>): string {
  return `<${name}${renderAttrs(attrs)}>`;
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

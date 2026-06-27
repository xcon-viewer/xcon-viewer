const leafletCssUrl = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const leafletJsUrl = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
const leafletHeatJsUrl = 'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js';
const leafletMarkerClusterJsUrl = 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
const leafletMarkerClusterCssUrl = 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
const leafletMarkerClusterDefaultCssUrl = 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
const openStreetMapTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const openStreetMapAttribution = '(C) OpenStreetMap contributors';

let leafletRuntimePromise: Promise<unknown> | undefined;
let leafletHeatPromise: Promise<unknown> | undefined;
let leafletMarkerClusterPromise: Promise<unknown> | undefined;

type LeafletLayer = { addTo: (target: unknown) => unknown };
type LeafletMarker = LeafletLayer & { bindPopup?: (label: string) => unknown };
type LeafletClusterGroup = LeafletLayer & { addLayer?: (layer: unknown) => unknown };
const activeCssPattern = /expression\s*\(|javascript:|vbscript:|url\s*\(|behavior\s*:/i;

interface LeafletLike {
  map?: (element: HTMLElement, options: Record<string, unknown>) => {
    setView: (center: [number, number], zoom: number) => unknown;
    invalidateSize: () => void;
  };
  tileLayer?: (url: string, options: Record<string, unknown>) => LeafletLayer;
  polyline?: (points: Array<[number, number]>, options: Record<string, unknown>) => LeafletLayer;
  polygon?: (points: Array<[number, number]>, options: Record<string, unknown>) => LeafletLayer;
  heatLayer?: (points: Array<[number, number, number]>, options: Record<string, unknown>) => LeafletLayer;
  markerClusterGroup?: (options?: Record<string, unknown>) => LeafletClusterGroup;
  marker?: (center: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  divIcon?: (options: Record<string, unknown>) => unknown;
}

function windowWithLeaflet(): Window & { L?: unknown } {
  return window as Window & { L?: unknown };
}

function loadLeafletRuntime(): Promise<unknown> {
  if (windowWithLeaflet().L && typeof (windowWithLeaflet().L as LeafletLike).map === 'function') return Promise.resolve(windowWithLeaflet().L);
  if (leafletRuntimePromise) return leafletRuntimePromise;
  leafletRuntimePromise = new Promise((resolve, reject) => {
    void ensureLeafletStyles(document);
    const existing = document.querySelector<HTMLScriptElement>('script[data-xcon-leaflet-js]');
    if (existing) {
      existing.addEventListener('load', () => resolve(windowWithLeaflet().L));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = leafletJsUrl;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-xcon-leaflet-js', 'true');
    script.addEventListener('load', () => resolve(windowWithLeaflet().L));
    script.addEventListener('error', reject);
    document.head.appendChild(script);
  });
  return leafletRuntimePromise;
}

function stylesheetTarget(rootNode: Document | ShadowRoot): DocumentFragment | HTMLElement {
  return typeof ShadowRoot !== 'undefined' && rootNode instanceof ShadowRoot ? rootNode : document.head;
}

function ensureStylesheet(rootNode: Document | ShadowRoot, url: string, attrName: string): Promise<void> {
  const target = stylesheetTarget(rootNode);
  if (target.querySelector(`link[${attrName}]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute(attrName, 'true');
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () => resolve());
    target.appendChild(link);
  });
}

function ensureLeafletStyles(rootNode: Document | ShadowRoot): Promise<void> {
  return ensureStylesheet(rootNode, leafletCssUrl, 'data-xcon-leaflet-css');
}

function ensureMarkerClusterStyles(rootNode: Document | ShadowRoot): Promise<void> {
  return Promise.all([
    ensureStylesheet(rootNode, leafletMarkerClusterCssUrl, 'data-xcon-leaflet-markercluster-css'),
    ensureStylesheet(rootNode, leafletMarkerClusterDefaultCssUrl, 'data-xcon-leaflet-markercluster-default-css'),
  ]).then(() => undefined);
}

function loadOptionalScript(url: string, attrName: string): Promise<unknown> {
  const existing = document.querySelector<HTMLScriptElement>(`script[${attrName}]`);
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener('load', () => resolve(windowWithLeaflet().L));
      existing.addEventListener('error', () => resolve(undefined));
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.defer = true;
    script.setAttribute(attrName, 'true');
    script.addEventListener('load', () => resolve(windowWithLeaflet().L));
    script.addEventListener('error', () => resolve(undefined));
    document.head.appendChild(script);
  });
}

function loadLeafletHeatPlugin(): Promise<unknown> {
  const L = windowWithLeaflet().L as LeafletLike | undefined;
  if (L && typeof L.heatLayer === 'function') return Promise.resolve(L);
  leafletHeatPromise ??= loadOptionalScript(leafletHeatJsUrl, 'data-xcon-leaflet-heat-js');
  return leafletHeatPromise;
}

function loadLeafletMarkerClusterPlugin(rootNode: Document | ShadowRoot): Promise<unknown> {
  const L = windowWithLeaflet().L as LeafletLike | undefined;
  if (L && typeof L.markerClusterGroup === 'function') return Promise.resolve(L);
  leafletMarkerClusterPromise ??= Promise.all([
    ensureMarkerClusterStyles(rootNode),
    loadOptionalScript(leafletMarkerClusterJsUrl, 'data-xcon-leaflet-markercluster-js'),
  ]).then(([, leaflet]) => leaflet);
  return leafletMarkerClusterPromise;
}

function parseLeafletMarkers(host: HTMLElement): Array<Record<string, unknown>> {
  return parseLeafletArrayAttr(host, 'data-xcon-map-markers')
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
}

function parseLeafletArrayAttr(host: HTMLElement, name: string): unknown[] {
  try {
    const raw = host.getAttribute(name);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseLeafletJsonAttr<T>(host: HTMLElement, name: string, fallback: T): T {
  try {
    const raw = host.getAttribute(name);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return parsed === undefined || parsed === null ? fallback : parsed as T;
  } catch {
    return fallback;
  }
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = finiteNumber(value, fallback);
  return Math.max(min, Math.min(max, number));
}

function safeLayerColor(value: unknown, fallback: string): string {
  if (value === undefined || value === null || value === '') return fallback;
  const text = String(value).trim();
  return text && !activeCssPattern.test(text) ? text : fallback;
}

function leafletPoint(value: unknown): [number, number] | undefined {
  if (Array.isArray(value)) {
    const lat = Number(value[0]);
    const lng = Number(value[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : undefined;
  }
  const record = objectRecord(value);
  if (!record) return undefined;
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : undefined;
}

function leafletLayerPoints(value: unknown): Array<[number, number]> {
  const record = objectRecord(value);
  const source = record ? record.points ?? record.path ?? record.coordinates ?? record.latlngs ?? record.latLngs : value;
  if (!Array.isArray(source)) return [];
  return source.map(leafletPoint).filter((point): point is [number, number] => Boolean(point));
}

function leafletLayerStyle(layer: unknown, fallbackColor: string): Record<string, unknown> {
  const record = objectRecord(layer) ?? {};
  const color = safeLayerColor(record.color ?? record.stroke ?? record.strokeColor, fallbackColor);
  return {
    color,
    weight: clampedNumber(record.weight ?? record.strokeWidth, 3, 0, 64),
    opacity: clampedNumber(record.opacity, 0.85, 0, 1),
    fillColor: safeLayerColor(record.fillColor ?? record.fill, color),
    fillOpacity: clampedNumber(record.fillOpacity, 0.18, 0, 1),
  };
}

function leafletHeatPoint(value: unknown): [number, number, number] | undefined {
  if (Array.isArray(value)) {
    const lat = Number(value[0]);
    const lng = Number(value[1]);
    const intensity = finiteNumber(value[2], 1);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng, intensity] : undefined;
  }
  const record = objectRecord(value);
  if (!record) return undefined;
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.longitude);
  const intensity = finiteNumber(record.value ?? record.intensity ?? record.weight, 1);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng, intensity] : undefined;
}

function leafletMarkerStatus(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function leafletPopupContent(label: string): string {
  return escapeHtml(label);
}

function leafletMarkerIcon(leaflet: unknown, marker: Record<string, unknown>, label: string): unknown {
  const L = leaflet as LeafletLike;
  if (!L || typeof L.divIcon !== 'function') return undefined;
  const status = leafletMarkerStatus(marker.status);
  return L.divIcon({
    className: `xcon-leaflet-marker${status ? ` xcon-leaflet-marker--${status}` : ''}`,
    html: escapeHtml(label.slice(0, 2) || '•'),
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24],
  });
}

function applyLeafletMarkers(leaflet: unknown, map: unknown, host: HTMLElement, markers: Array<Record<string, unknown>>): void {
  const L = leaflet as LeafletLike;
  if (typeof L.marker !== 'function') return;
  const pins: LeafletMarker[] = [];
  markers.forEach((marker, index) => {
    const markerLat = Number(marker.lat ?? marker.latitude);
    const markerLng = Number(marker.lng ?? marker.longitude);
    if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) return;
    const label = String(marker.label ?? marker.title ?? marker.popup ?? index + 1);
    const icon = leafletMarkerIcon(leaflet, marker, label);
    const pin = L.marker?.([markerLat, markerLng], icon ? { icon } : undefined);
    if (!pin) return;
    if (label && typeof pin.bindPopup === 'function') pin.bindPopup(leafletPopupContent(label));
    pins.push(pin);
  });
  if (!pins.length) return;
  const clustering = host.getAttribute('data-xcon-map-clustering') === 'true';
  if (clustering && typeof L.markerClusterGroup === 'function') {
    const cluster = L.markerClusterGroup(parseLeafletJsonAttr<Record<string, unknown>>(host, 'data-xcon-map-cluster-options', {}));
    pins.forEach((pin) => cluster.addLayer?.(pin));
    cluster.addTo(map);
    return;
  }
  pins.forEach((pin) => pin.addTo(map));
}

export function applyLeafletMapLayers(leaflet: unknown, map: unknown, host: HTMLElement, markers: Array<Record<string, unknown>> = []): void {
  const L = leaflet as LeafletLike;
  parseLeafletArrayAttr(host, 'data-xcon-map-polylines').forEach((layer) => {
    const points = leafletLayerPoints(layer);
    if (points.length < 2 || typeof L.polyline !== 'function') return;
    L.polyline(points, leafletLayerStyle(layer, '#2563eb')).addTo(map);
  });
  parseLeafletArrayAttr(host, 'data-xcon-map-polygons').forEach((layer) => {
    const points = leafletLayerPoints(layer);
    if (points.length < 3 || typeof L.polygon !== 'function') return;
    L.polygon(points, leafletLayerStyle(layer, '#14b8a6')).addTo(map);
  });
  const heatmap = parseLeafletArrayAttr(host, 'data-xcon-map-heatmap').map(leafletHeatPoint).filter((point): point is [number, number, number] => Boolean(point));
  if (heatmap.length && typeof L.heatLayer === 'function') {
    L.heatLayer(heatmap, parseLeafletJsonAttr<Record<string, unknown>>(host, 'data-xcon-map-heatmap-options', { radius: 24, blur: 18 })).addTo(map);
  }
  applyLeafletMarkers(leaflet, map, host, markers.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)));
}

export function hydrateLeafletMaps(root: ParentNode = document): void {
  const rootElement = root as ParentNode & { matches?: (selector: string) => boolean };
  const hosts = Array.from(root.querySelectorAll<HTMLElement>('[data-xcon-leaflet-map]'));
  if (typeof rootElement.matches === 'function' && rootElement.matches('[data-xcon-leaflet-map]')) {
    hosts.unshift(root as HTMLElement);
  }
  hosts.forEach((host) => {
    if (host.dataset.xconLeafletBound === 'true' || host.dataset.xconLeafletBound === 'pending') return;
    host.dataset.xconLeafletBound = 'pending';
    const rootNode = host.getRootNode() as Document | ShadowRoot;
    const markers = parseLeafletMarkers(host);
    const hasHeatmap = parseLeafletArrayAttr(host, 'data-xcon-map-heatmap').length > 0;
    const needsCluster = host.getAttribute('data-xcon-map-clustering') === 'true' && markers.length > 0;
    void Promise.all([loadLeafletRuntime(), ensureLeafletStyles(rootNode)])
      .then(([leaflet]) => {
        const pluginLoads: Array<Promise<unknown>> = [];
        if (hasHeatmap) pluginLoads.push(loadLeafletHeatPlugin());
        if (needsCluster) pluginLoads.push(loadLeafletMarkerClusterPlugin(rootNode));
        return Promise.all(pluginLoads).then(() => leaflet);
      })
      .then((leaflet) => {
        const L = leaflet as LeafletLike;
        if (!L || typeof L.map !== 'function' || typeof L.tileLayer !== 'function') throw new Error('Leaflet unavailable');
        const lat = Number(host.getAttribute('data-latitude') || 37.5665);
        const lng = Number(host.getAttribute('data-longitude') || 126.978);
        const zoom = Number(host.getAttribute('data-zoom') || 10);
        const showControls = host.getAttribute('data-xcon-map-show-controls') !== 'false';
        const enableZoom = host.getAttribute('data-xcon-map-enable-zoom') !== 'false';
        const enablePan = host.getAttribute('data-xcon-map-enable-pan') !== 'false';
        const tileUrl = host.getAttribute('data-xcon-map-tile-url') || openStreetMapTileUrl;
        const attribution = host.getAttribute('data-xcon-map-attribution') || openStreetMapAttribution;
        host.innerHTML = '';
        host.classList.add('xa-map-static--live');
        const map = L.map(host, {
          zoomControl: showControls,
          dragging: enablePan,
          scrollWheelZoom: enableZoom,
          doubleClickZoom: enableZoom,
          boxZoom: enableZoom,
          keyboard: enableZoom,
          attributionControl: true,
        });
        map.setView([lat, lng], zoom);
        L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
        const hostWithMap = host as HTMLElement & { _xconLeafletMap?: unknown; _leaflet_map?: unknown };
        hostWithMap._xconLeafletMap = map;
        hostWithMap._leaflet_map = map;
        applyLeafletMapLayers(leaflet, map, host, markers);
        window.setTimeout(() => map.invalidateSize(), 50);
        host.dataset.xconLeafletBound = 'true';
      })
      .catch(() => {
        host.dataset.xconLeafletBound = 'failed';
      });
  });
}

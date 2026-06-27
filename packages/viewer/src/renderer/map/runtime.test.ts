import { describe, expect, test, vi } from 'vitest';

import { applyLeafletMapLayers, hydrateLeafletMaps } from './runtime.js';

function mapHost(attrs: Record<string, unknown>): HTMLElement {
  const attrValues = new Map<string, string>();
  for (const [name, value] of Object.entries(attrs)) {
    attrValues.set(name, typeof value === 'string' ? value : JSON.stringify(value));
  }
  return {
    getAttribute: (name: string) => attrValues.get(name) ?? null,
  } as HTMLElement;
}

describe('Leaflet map runtime helpers', () => {
  test('applies polyline, polygon, heat, and marker cluster layers when plugins are available', () => {
    const map = {};
    const clusterGroup = { addLayer: vi.fn(), addTo: vi.fn() };
    const markerOne = { addTo: vi.fn(), bindPopup: vi.fn() };
    const markerTwo = { addTo: vi.fn(), bindPopup: vi.fn() };
    const leaflet = {
      polyline: vi.fn(() => ({ addTo: vi.fn() })),
      polygon: vi.fn(() => ({ addTo: vi.fn() })),
      heatLayer: vi.fn(() => ({ addTo: vi.fn() })),
      markerClusterGroup: vi.fn(() => clusterGroup),
      marker: vi.fn().mockReturnValueOnce(markerOne).mockReturnValueOnce(markerTwo),
      divIcon: vi.fn(() => ({})),
    };
    const host = mapHost({
      'data-xcon-map-polylines': [{ points: [[37.5, 126.9], [37.6, 127]], color: '#2563eb' }],
      'data-xcon-map-polygons': [{ points: [[37.5, 126.9], [37.6, 126.9], [37.6, 127]], color: '#14b8a6' }],
      'data-xcon-map-heatmap': [{ lat: 37.5, lng: 126.9, value: 0.8 }],
      'data-xcon-map-heatmap-options': { radius: 30, blur: 20 },
      'data-xcon-map-clustering': 'true',
      'data-xcon-map-cluster-options': { disableClusteringAtZoom: 13 },
    });

    applyLeafletMapLayers(leaflet, map, host, [
      { lat: 37.5665, lng: 126.978, label: 'Seoul' },
      { latitude: 35.1796, longitude: 129.0756, title: 'Busan' },
    ]);

    expect(leaflet.polyline).toHaveBeenCalledWith([[37.5, 126.9], [37.6, 127]], expect.objectContaining({ color: '#2563eb' }));
    expect(leaflet.polygon).toHaveBeenCalledWith([[37.5, 126.9], [37.6, 126.9], [37.6, 127]], expect.objectContaining({ color: '#14b8a6' }));
    expect(leaflet.heatLayer).toHaveBeenCalledWith([[37.5, 126.9, 0.8]], expect.objectContaining({ radius: 30, blur: 20 }));
    expect(leaflet.markerClusterGroup).toHaveBeenCalledWith(expect.objectContaining({ disableClusteringAtZoom: 13 }));
    expect(clusterGroup.addLayer).toHaveBeenCalledWith(markerOne);
    expect(clusterGroup.addLayer).toHaveBeenCalledWith(markerTwo);
    expect(clusterGroup.addTo).toHaveBeenCalledWith(map);
    expect(markerOne.addTo).not.toHaveBeenCalled();
    expect(markerTwo.addTo).not.toHaveBeenCalled();
  });

  test('renders markers normally when clustering is enabled but markercluster is unavailable', () => {
    const map = {};
    const marker = { addTo: vi.fn(() => ({ bindPopup: vi.fn() })), bindPopup: vi.fn() };
    const leaflet = {
      marker: vi.fn(() => marker),
      divIcon: vi.fn(() => ({})),
    };
    const host = mapHost({ 'data-xcon-map-clustering': 'true' });

    applyLeafletMapLayers(leaflet, map, host, [{ lat: 37.5665, lng: 126.978, label: 'Seoul' }]);

    expect(leaflet.marker).toHaveBeenCalledWith([37.5665, 126.978], expect.objectContaining({ icon: expect.any(Object) }));
    expect(marker.addTo).toHaveBeenCalledWith(map);
  });

  test('binds marker popup text as escaped content instead of raw HTML', () => {
    const map = {};
    const marker = { addTo: vi.fn(), bindPopup: vi.fn() };
    const leaflet = {
      marker: vi.fn(() => marker),
      divIcon: vi.fn(() => ({})),
    };
    const host = mapHost({});

    applyLeafletMapLayers(leaflet, map, host, [
      { lat: 37.5665, lng: 126.978, popup: '<img src=x onerror=alert(1)><script>alert(2)</script>' },
    ]);

    expect(marker.bindPopup).toHaveBeenCalledWith('&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(marker.addTo).toHaveBeenCalledWith(map);
  });

  test('ignores absent heatmap plugin without throwing', () => {
    const host = mapHost({ 'data-xcon-map-heatmap': [[37.5, 126.9, 0.4]] });

    expect(() => applyLeafletMapLayers({}, {}, host)).not.toThrow();
  });

  test('ignores malformed layer, heatmap, and marker data safely', () => {
    const leaflet = {
      polyline: vi.fn(),
      polygon: vi.fn(),
      heatLayer: vi.fn(),
      marker: vi.fn(),
      markerClusterGroup: vi.fn(),
    };
    const host = mapHost({
      'data-xcon-map-polylines': [{ points: [[37.5, 126.9], ['bad', 127]] }, 'bad'],
      'data-xcon-map-polygons': [{ points: [[37.5, 126.9], [37.6, 126.9]] }],
      'data-xcon-map-heatmap': [{ lat: 'bad', lng: 126.9 }, null],
      'data-xcon-map-clustering': 'true',
    });

    expect(() => applyLeafletMapLayers(leaflet, {}, host, [{ lat: 'bad', lng: 126.978 }, null as unknown as Record<string, unknown>])).not.toThrow();
    expect(leaflet.polyline).not.toHaveBeenCalled();
    expect(leaflet.polygon).not.toHaveBeenCalled();
    expect(leaflet.heatLayer).not.toHaveBeenCalled();
    expect(leaflet.marker).not.toHaveBeenCalled();
    expect(leaflet.markerClusterGroup).not.toHaveBeenCalled();
  });

  test('ignores non-array JSON layer attributes safely', () => {
    const leaflet = {
      polyline: vi.fn(),
      polygon: vi.fn(),
      heatLayer: vi.fn(),
    };
    const host = mapHost({
      'data-xcon-map-polylines': '{}',
      'data-xcon-map-polygons': '{}',
      'data-xcon-map-heatmap': '{}',
    });

    expect(() => applyLeafletMapLayers(leaflet, {}, host)).not.toThrow();
    expect(leaflet.polyline).not.toHaveBeenCalled();
    expect(leaflet.polygon).not.toHaveBeenCalled();
    expect(leaflet.heatLayer).not.toHaveBeenCalled();
  });

  test('replaces unsafe layer style values and finite-defaults invalid numeric style values', () => {
    const polylineLayer = { addTo: vi.fn() };
    const polygonLayer = { addTo: vi.fn() };
    const leaflet = {
      polyline: vi.fn(() => polylineLayer),
      polygon: vi.fn(() => polygonLayer),
    };
    const host = mapHost({
      'data-xcon-map-polylines': [
        {
          points: [[37.5, 126.9], [37.6, 127]],
          color: 'url(javascript:alert(1))',
          fillColor: 'expression(alert(1))',
          weight: 'NaN',
          opacity: 'Infinity',
          fillOpacity: 'nope',
        },
      ],
      'data-xcon-map-polygons': [
        {
          points: [[37.5, 126.9], [37.6, 126.9], [37.6, 127]],
          stroke: 'vbscript:alert(1)',
          fill: 'javascript:alert(1)',
          strokeWidth: 'Infinity',
        },
      ],
    });

    applyLeafletMapLayers(leaflet, {}, host);

    expect(leaflet.polyline).toHaveBeenCalledWith(
      [[37.5, 126.9], [37.6, 127]],
      expect.objectContaining({ color: '#2563eb', weight: 3, opacity: 0.85, fillColor: '#2563eb', fillOpacity: 0.18 }),
    );
    expect(leaflet.polygon).toHaveBeenCalledWith(
      [[37.5, 126.9], [37.6, 126.9], [37.6, 127]],
      expect.objectContaining({ color: '#14b8a6', weight: 3, fillColor: '#14b8a6' }),
    );
  });

  test('hydrates the root element when it is the Leaflet map host', async () => {
    const map = { setView: vi.fn(), invalidateSize: vi.fn() };
    const leaflet = {
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    };
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    vi.stubGlobal('window', { L: leaflet, setTimeout: vi.fn((callback: () => void) => { callback(); return 1; }) });
    vi.stubGlobal('document', {
      head: { querySelector: vi.fn(() => ({})), appendChild: vi.fn() },
    });
    const host = {
      dataset: {},
      innerHTML: 'fallback',
      classList: { add: vi.fn() },
      getAttribute: vi.fn((name: string) => {
        const attrs: Record<string, string> = {
          'data-latitude': '37.5665',
          'data-longitude': '126.978',
          'data-zoom': '11',
          'data-xcon-map-markers': '{}',
        };
        return attrs[name] ?? null;
      }),
      getRootNode: vi.fn(() => globalThis.document),
      matches: vi.fn((selector: string) => selector === '[data-xcon-leaflet-map]'),
      querySelectorAll: vi.fn(() => []),
    } as unknown as HTMLElement;

    hydrateLeafletMaps(host);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

    expect(leaflet.map).toHaveBeenCalledWith(host, expect.objectContaining({ attributionControl: true }));
    expect(map.setView).toHaveBeenCalledWith([37.5665, 126.978], 11);

    vi.stubGlobal('window', previousWindow);
    vi.stubGlobal('document', previousDocument);
  });
});

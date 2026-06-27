import { describe, expect, test, vi } from 'vitest';

import { applyLeafletMapLayers } from './runtime.js';

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
});

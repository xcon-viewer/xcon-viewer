import type { XconObject } from '@xcon-viewer/core';

export type MapPoint = [number, number];
export type MapHeatPoint = [number, number, number];

export interface NormalizedMapMarker {
  lat?: number;
  lng?: number;
  label: string;
  status?: string;
}

export interface NormalizedMapLayer {
  points: MapPoint[];
  color?: string;
  stroke?: string;
  strokeColor?: string;
  weight?: number;
  strokeWidth?: number;
  opacity?: number;
  fillColor?: string;
  fill?: string;
  fillOpacity?: number;
}

export type MapPluginOptions = Record<string, unknown>;

export type XconMapComponent = Pick<XconObject, 'get'>;

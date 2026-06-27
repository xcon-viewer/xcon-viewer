export const dataVizAliasTypes = ['treemap', 'sankey', 'sunburst', 'chord', 'forceGraph', 'plot'] as const;

export type DataVizAliasType = (typeof dataVizAliasTypes)[number];

export type DataVizType =
  | DataVizAliasType
  | 'bar'
  | 'line'
  | 'pie'
  | 'doughnut'
  | 'radar'
  | 'polarArea'
  | 'scatter'
  | 'bubble'
  | string;

export interface DataVizModel {
  type: 'dataViz';
  vizType: DataVizType;
  aliasType?: DataVizAliasType;
  data: unknown;
  config: Record<string, unknown>;
  interactive: boolean;
  allowPartial: boolean;
}

export interface PlotMarkSpec {
  type: 'barY' | 'barX' | 'line' | 'areaY' | 'dot' | 'ruleY' | 'ruleX';
  x?: string;
  y?: string;
  fill?: string;
  stroke?: string;
}

export interface PlotSpec {
  data: Array<Record<string, unknown>>;
  marks: PlotMarkSpec[];
  options: Record<string, unknown>;
}

import { normalizePlotSpec, toDataVizPlainValue } from './data';
import type { DataVizModel, PlotMarkSpec, PlotSpec } from './types';

type ChartRow = { label: string; value: number; color?: string };
type ChartSeries = { label: string; rows: ChartRow[]; color: string };
type ChartPointRow = { label: string; x: number; y: number; r: number };
type GraphNode = { id: string; label: string; color?: string };
type GraphLink = { source: string; target: string; value: number; color?: string };
type GraphModel = { nodes: GraphNode[]; links: GraphLink[] };

const dataVizPreviewClass = 'xa-dataviz-preview';

const chartPreviewPalette = [
  'var(--xcon-chart-accent, var(--accent, #2563eb))',
  'var(--xcon-chart-blue, var(--blue, #0ea5e9))',
  'var(--xcon-chart-green, var(--green, #22c55e))',
  'var(--xcon-chart-yellow, var(--yellow, #f59e0b))',
  'var(--xcon-chart-red, var(--red, #ef4444))',
  '#8B5CF6',
  '#0EA5E9',
  '#F97316',
];

export function renderDataVizStaticFallback(model: DataVizModel): string {
  const type = chartTypeKey(model.vizType);

  if (type === 'treemap') return renderTreemapPreview(dataVizRows(model.data), dataVizPreviewClass);
  if (type === 'sankey') return renderSankeyPreview(model.data, dataVizPreviewClass);
  if (type === 'sunburst') return renderSunburstPreview(dataVizRows(model.data), dataVizPreviewClass);
  if (type === 'chord') return renderChordPreview(model.data, dataVizPreviewClass);
  if (type === 'forcegraph' || type === 'force') return renderForceGraphPreview(model.data, dataVizPreviewClass);
  if (type === 'plot') return renderPlotPreview(model, dataVizPreviewClass);

  if (type === 'scatter' || type === 'bubble') {
    const points = chartPointRows(model.data);
    if (points.length > 0) return renderPointPreview(points, dataVizPreviewClass, type === 'bubble');
  }

  const rows = chartRows(model.data);
  if (rows.length === 0) return emptyFallback();
  if (type === 'pie') return renderPiePreview(rows, dataVizPreviewClass);
  if (type === 'doughnut') return renderDoughnutPreview(rows, dataVizPreviewClass);
  if (type === 'line') {
    const series = chartSeriesRows(model.data);
    return series.length > 0 ? renderLineSeriesPreview(series, dataVizPreviewClass) : renderLinePreview(rows, dataVizPreviewClass);
  }
  if (type === 'radar') return renderRadarPreview(rows, dataVizPreviewClass);
  if (type === 'polararea') return renderPolarAreaPreview(rows, dataVizPreviewClass);

  const preferred = objectRecord(model.config)?.type ?? objectRecord(model.config)?.fallbackType;
  if (preferred && chartTypeKey(String(preferred)) === 'line') return renderLinePreview(rows, dataVizPreviewClass);
  return renderBarPreview(rows, dataVizPreviewClass);
}

function chartRows(data: unknown): ChartRow[] {
  const plain = toDataVizPlainValue(data);
  if (Array.isArray(plain)) {
    return plain.map((item, index) => chartRowFromSimpleValue(item, index)).filter((row): row is ChartRow => Boolean(row));
  }
  if (!plain || typeof plain !== 'object') return [];
  const obj = plain as Record<string, unknown>;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  const first = datasets[0] && typeof datasets[0] === 'object' ? datasets[0] as Record<string, unknown> : undefined;
  const values = Array.isArray(first?.data) ? first.data.map(Number) : [];
  return values.map((value, index) => ({
    label: labels[index] ?? String(index + 1),
    value: Number.isFinite(value) ? value : 0,
    color: chartPreviewColor(first?.backgroundColor ?? first?.borderColor, index),
  }));
}

function chartRowFromSimpleValue(item: unknown, index: number): ChartRow | undefined {
  const plain = toDataVizPlainValue(item);
  if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
    const record = plain as Record<string, unknown>;
    return {
      label: String(record.label ?? record.name ?? record.title ?? index + 1),
      value: finiteNumber(record.value ?? record.y ?? record.count ?? record.amount ?? record.data, 0),
      color: cssColor(record.color ?? record.backgroundColor ?? record.borderColor),
    };
  }
  if (plain === undefined || plain === null || plain === '') return undefined;
  return {
    label: String(index + 1),
    value: finiteNumber(plain, 0),
  };
}

function chartPreviewColor(value: unknown, index: number): string {
  if (Array.isArray(value)) return cssColor(value[index] ?? value[0]) ?? chartPreviewPalette[index % chartPreviewPalette.length];
  return cssColor(value) ?? chartPreviewPalette[index % chartPreviewPalette.length];
}

function chartSeriesRows(data: unknown): ChartSeries[] {
  const plain = toDataVizPlainValue(data);
  if (!plain || typeof plain !== 'object' || Array.isArray(plain)) return [];
  const obj = plain as Record<string, unknown>;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  return datasets.map((dataset, datasetIndex) => {
    const record = toDataVizPlainValue(dataset);
    if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
    const source = record as Record<string, unknown>;
    const values = Array.isArray(source.data) ? source.data.map(Number) : [];
    const rows = values.map((value, index) => ({
      label: labels[index] ?? String(index + 1),
      value: Number.isFinite(value) ? value : 0,
    }));
    if (rows.length === 0) return null;
    return {
      label: String(source.label ?? `Series ${datasetIndex + 1}`),
      rows,
      color: chartPreviewColor(source.borderColor ?? source.backgroundColor, datasetIndex),
    };
  }).filter((series): series is ChartSeries => Boolean(series));
}

function chartPointRows(data: unknown): ChartPointRow[] {
  const plain = toDataVizPlainValue(data);
  if (!plain || typeof plain !== 'object' || Array.isArray(plain)) return [];
  const obj = plain as Record<string, unknown>;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  const first = datasets[0] && typeof datasets[0] === 'object' ? datasets[0] as Record<string, unknown> : undefined;
  const values = Array.isArray(first?.data) ? first.data : [];
  return values.map((value, index) => {
    const point = toDataVizPlainValue(value);
    if (point && typeof point === 'object' && !Array.isArray(point)) {
      const record = point as Record<string, unknown>;
      return {
        label: labels[index] ?? String(record.label ?? record.name ?? index + 1),
        x: finiteNumber(record.x, index + 1),
        y: finiteNumber(record.y ?? record.value, 0),
        r: Math.max(3, Math.min(22, finiteNumber(record.r ?? record.radius ?? record.size, 7))),
      };
    }
    const numeric = finiteNumber(value, 0);
    return {
      label: labels[index] ?? String(index + 1),
      x: index + 1,
      y: numeric,
      r: Math.max(4, Math.min(18, Math.sqrt(Math.abs(numeric) || 1) + 3)),
    };
  }).filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y) && Number.isFinite(row.r));
}

function dataVizRows(data: unknown): ChartRow[] {
  const rows: ChartRow[] = [];
  const visit = (value: unknown, index: number): void => {
    const plain = toDataVizPlainValue(value);
    if (Array.isArray(plain)) {
      plain.forEach((item, childIndex) => visit(item, childIndex));
      return;
    }
    const record = objectRecord(plain);
    if (!record) {
      const numeric = finiteNumber(plain, Number.NaN);
      if (Number.isFinite(numeric)) rows.push({ label: String(index + 1), value: numeric });
      return;
    }
    const children = Array.isArray(record.children)
      ? record.children
      : Array.isArray(record.items)
        ? record.items
        : Array.isArray(record.nodes)
          ? record.nodes
          : undefined;
    if (children && children.length > 0) {
      children.forEach((item, childIndex) => visit(item, childIndex));
      return;
    }
    const valueNumber = finiteNumber(record.value ?? record.count ?? record.size ?? record.amount ?? record.weight, 1);
    rows.push({
      label: String(record.label ?? record.name ?? record.title ?? record.id ?? index + 1),
      value: Math.max(0, valueNumber),
      color: cssColor(record.color ?? record.backgroundColor ?? record.fill),
    });
  };
  visit(data, 0);
  return rows.filter((row) => row.label && Number.isFinite(row.value)).slice(0, 24);
}

function renderTreemapPreview(rows: ChartRow[], className: string): string {
  const visibleRows = rows.filter((row) => row.value > 0).slice(0, 10);
  if (visibleRows.length === 0) return emptyFallback();
  const total = Math.max(1, visibleRows.reduce((sum, row) => sum + row.value, 0));
  let x = 14;
  let y = 16;
  let rowHeight = 70;
  const rects = visibleRows.map((row, index) => {
    const width = Math.max(48, Math.round((row.value / total) * 470));
    if (x + width > 506) {
      x = 14;
      y += 82;
      rowHeight = 60;
    }
    const safeWidth = Math.min(width, 506 - x);
    const rect = tag('rect', {
      x: String(x),
      y: String(y),
      width: String(safeWidth),
      height: String(rowHeight),
      rx: '8',
      fill: row.color ?? chartPreviewPalette[index % chartPreviewPalette.length],
      opacity: '0.9',
    }, '') +
      tag('text', { x: String(x + 12), y: String(y + 26), 'font-size': '12', 'font-weight': '700', fill: '#ffffff' }, escapeHtml(row.label)) +
      tag('text', { x: String(x + 12), y: String(y + 46), 'font-size': '11', fill: '#ffffff', opacity: '0.85' }, escapeHtml(trimNumber(row.value)));
    x += safeWidth + 8;
    return rect;
  }).join('');
  return tag('svg', { class: `${className} ${className}--treemap`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, rects);
}

function renderSankeyPreview(data: unknown, className: string): string {
  const graph = graphModel(data);
  const links = graph.links.filter((link) => graph.nodes.some((node) => node.id === link.source) && graph.nodes.some((node) => node.id === link.target)).slice(0, 12);
  if (links.length === 0) return emptyFallback();

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const sourceIds = uniqueValues(links.map((link) => link.source)).slice(0, 6);
  const targetIds = uniqueValues(links.map((link) => link.target)).slice(0, 6);
  const nodeValue = new Map<string, number>();
  links.forEach((link) => {
    nodeValue.set(link.source, (nodeValue.get(link.source) ?? 0) + link.value);
    nodeValue.set(link.target, (nodeValue.get(link.target) ?? 0) + link.value);
  });

  const sourcePositions = sankeyColumnPositions(sourceIds, 56, 28, 134);
  const targetPositions = sankeyColumnPositions(targetIds, 394, 28, 134);
  const maxValue = Math.max(1, ...links.map((link) => link.value));
  const linkHtml = links.map((link, index) => {
    const source = sourcePositions.get(link.source);
    const target = targetPositions.get(link.target);
    if (!source || !target) return '';
    const strokeWidth = 3 + (Math.max(0, link.value) / maxValue) * 14;
    return tag('path', {
      d: `M ${source.x + 50} ${trimNumber(source.y)} C 206 ${trimNumber(source.y)} 312 ${trimNumber(target.y)} ${target.x} ${trimNumber(target.y)}`,
      fill: 'none',
      stroke: link.color ?? chartPreviewPalette[index % chartPreviewPalette.length],
      'stroke-width': trimNumber(strokeWidth),
      'stroke-linecap': 'round',
      opacity: '0.42',
    }, '');
  }).join('');
  const nodes = renderSankeyNodes(sourceIds, sourcePositions, nodeById, nodeValue, true) +
    renderSankeyNodes(targetIds, targetPositions, nodeById, nodeValue, false);

  return tag('svg', { class: `${className} ${className}--sankey`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, linkHtml + nodes);
}

function renderSankeyNodes(
  ids: string[],
  positions: Map<string, { x: number; y: number }>,
  nodeById: Map<string, GraphNode>,
  nodeValue: Map<string, number>,
  labelRight: boolean,
): string {
  return ids.map((id, index) => {
    const point = positions.get(id);
    if (!point) return '';
    const node = nodeById.get(id) ?? { id, label: id };
    const labelX = labelRight ? point.x + 62 : point.x - 12;
    const anchor = labelRight ? 'start' : 'end';
    return tag('rect', {
      x: String(point.x),
      y: trimNumber(point.y - 15),
      width: '18',
      height: '30',
      rx: '5',
      fill: node.color ?? chartPreviewPalette[index % chartPreviewPalette.length],
    }, '') +
      tag('text', { x: String(labelX), y: trimNumber(point.y - 2), 'font-size': '11', 'font-weight': '700', 'text-anchor': anchor, fill: '#334155' }, escapeHtml(node.label.slice(0, 18))) +
      tag('text', { x: String(labelX), y: trimNumber(point.y + 13), 'font-size': '9', 'text-anchor': anchor, fill: '#64748b' }, escapeHtml(trimNumber(nodeValue.get(id) ?? 0)));
  }).join('');
}

function sankeyColumnPositions(ids: string[], x: number, top: number, height: number): Map<string, { x: number; y: number }> {
  const step = ids.length > 1 ? height / (ids.length - 1) : 0;
  return new Map(ids.map((id, index) => [id, { x, y: top + index * step }]));
}

function renderSunburstPreview(rows: ChartRow[], className: string): string {
  const visibleRows = rows.filter((row) => row.value > 0).slice(0, 10);
  if (visibleRows.length === 0) return emptyFallback();
  const total = Math.max(1, visibleRows.reduce((sum, row) => sum + row.value, 0));
  let current = -90;
  const slices = visibleRows.map((row, index) => {
    const span = (row.value / total) * 360;
    const path = polarAreaPath(260, 95, 72, current, current + span);
    const labelAngle = current + span / 2;
    const labelPoint = polarPoint(260, 95, 94, labelAngle);
    current += span;
    return tag('path', {
      d: path,
      fill: row.color ?? chartPreviewPalette[index % chartPreviewPalette.length],
      stroke: '#ffffff',
      'stroke-width': '2',
    }, '') +
      tag('text', { x: trimNumber(labelPoint.x), y: trimNumber(labelPoint.y), 'font-size': '10', 'text-anchor': 'middle', fill: '#334155' }, escapeHtml(row.label.slice(0, 10)));
  }).join('');
  const center = tag('circle', { cx: '260', cy: '95', r: '34', fill: '#ffffff', stroke: '#e2e8f0' }, '') +
    tag('text', { x: '260', y: '99', 'font-size': '12', 'font-weight': '700', 'text-anchor': 'middle', fill: '#0f172a' }, 'Total');
  return tag('svg', { class: `${className} ${className}--sunburst`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, slices + center);
}

function renderChordPreview(data: unknown, className: string): string {
  const graph = graphModel(data);
  const links = graph.links.filter((link) => link.source !== link.target).slice(0, 18);
  const usedIds = uniqueValues(links.flatMap((link) => [link.source, link.target]));
  const nodes = graph.nodes.filter((node) => usedIds.includes(node.id)).slice(0, 10);
  if (nodes.length === 0 || links.length === 0) return emptyFallback();

  const positions = new Map<string, { x: number; y: number; angle: number }>();
  nodes.forEach((node, index) => {
    const angle = -90 + (360 * index) / Math.max(1, nodes.length);
    const point = polarPoint(260, 95, 70, angle);
    positions.set(node.id, { x: point.x, y: point.y, angle });
  });

  const maxValue = Math.max(1, ...links.map((link) => link.value));
  const chords = links.map((link, index) => {
    const source = positions.get(link.source);
    const target = positions.get(link.target);
    if (!source || !target) return '';
    const width = 1.5 + (Math.max(0, link.value) / maxValue) * 5;
    return tag('path', {
      d: `M ${trimNumber(source.x)} ${trimNumber(source.y)} Q 260 95 ${trimNumber(target.x)} ${trimNumber(target.y)}`,
      fill: 'none',
      stroke: link.color ?? chartPreviewPalette[index % chartPreviewPalette.length],
      'stroke-width': trimNumber(width),
      opacity: '0.55',
      'stroke-linecap': 'round',
    }, '');
  }).join('');

  const nodeHtml = nodes.map((node, index) => {
    const point = positions.get(node.id) ?? { x: 260, y: 95, angle: 0 };
    const labelPoint = polarPoint(260, 95, 91, point.angle);
    return tag('circle', { cx: trimNumber(point.x), cy: trimNumber(point.y), r: '8', fill: node.color ?? chartPreviewPalette[index % chartPreviewPalette.length], stroke: '#ffffff', 'stroke-width': '2' }, '') +
      tag('text', { x: trimNumber(labelPoint.x), y: trimNumber(labelPoint.y + 3), 'font-size': '10', 'text-anchor': 'middle', fill: '#334155' }, escapeHtml(node.label.slice(0, 12)));
  }).join('');

  return tag('svg', { class: `${className} ${className}--chord`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, tag('circle', { cx: '260', cy: '95', r: '70', fill: '#f8fafc', stroke: '#e2e8f0' }, '') + chords + nodeHtml);
}

function renderForceGraphPreview(data: unknown, className: string): string {
  const plain = toDataVizPlainValue(data);
  const record = objectRecord(plain);
  const rawNodes = Array.isArray(record?.nodes) ? record.nodes : dataVizRows(data).map((row) => ({ id: row.label, label: row.label, value: row.value, color: row.color }));
  const nodes = rawNodes.slice(0, 12).map((node, index) => {
    const nodeRecord = objectRecord(toDataVizPlainValue(node)) ?? {};
    return {
      id: String(nodeRecord.id ?? nodeRecord.key ?? nodeRecord.name ?? nodeRecord.label ?? index + 1),
      label: String(nodeRecord.label ?? nodeRecord.name ?? nodeRecord.id ?? index + 1),
      color: cssColor(nodeRecord.color ?? nodeRecord.backgroundColor) ?? chartPreviewPalette[index % chartPreviewPalette.length],
    };
  });
  if (nodes.length === 0) return emptyFallback();
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length);
    positions.set(node.id, { x: 260 + Math.cos(angle) * 170, y: 95 + Math.sin(angle) * 60 });
  });
  const rawLinks = Array.isArray(record?.links) ? record.links : Array.isArray(record?.edges) ? record.edges : [];
  const links = rawLinks.map((link) => {
    const linkRecord = objectRecord(toDataVizPlainValue(link)) ?? {};
    const source = String(linkRecord.source ?? linkRecord.from ?? '');
    const target = String(linkRecord.target ?? linkRecord.to ?? '');
    const a = positions.get(source);
    const b = positions.get(target);
    if (!a || !b) return '';
    return tag('line', { x1: trimNumber(a.x), y1: trimNumber(a.y), x2: trimNumber(b.x), y2: trimNumber(b.y), stroke: '#94a3b8', 'stroke-width': '2', opacity: '0.7' }, '');
  }).join('');
  const nodeHtml = nodes.map((node) => {
    const point = positions.get(node.id) ?? { x: 260, y: 95 };
    return tag('circle', { cx: trimNumber(point.x), cy: trimNumber(point.y), r: '14', fill: node.color, stroke: '#ffffff', 'stroke-width': '2' }, '') +
      tag('text', { x: trimNumber(point.x), y: trimNumber(point.y + 30), 'font-size': '10', 'text-anchor': 'middle', fill: '#334155' }, escapeHtml(node.label.slice(0, 14)));
  }).join('');
  return tag('svg', { class: `${className} ${className}--force-graph`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, links + nodeHtml);
}

function renderPlotPreview(model: DataVizModel, className: string): string {
  const spec = plotSpecFromModel(model);
  const mark = firstPlotMark(spec);
  const rows = plotRows(spec, mark);
  if (!mark || rows.length === 0) return emptyFallback();

  const plotClass = `${className} ${className}--plot`;
  if (mark.type === 'line' || mark.type === 'areaY') return renderLinePreview(rows, plotClass);
  if (mark.type === 'dot') {
    return renderPointPreview(rows.map((row, index) => ({ label: row.label, x: index + 1, y: row.value, r: 5 })), plotClass, false);
  }
  if (mark.type === 'ruleY' || mark.type === 'ruleX') return renderRulePlotPreview(rows, plotClass, mark.type);
  return renderBarPreview(rows, plotClass);
}

function plotSpecFromModel(model: DataVizModel): PlotSpec {
  const direct = normalizePlotSpec(model.data);
  if (direct.data.length > 0) return withInferredPlotMark(direct, model.config);

  const config = objectRecord(model.config) ?? {};
  const spec = normalizePlotSpec({
    data: model.data,
    marks: config.marks,
    options: config.options ?? config,
  });
  return withInferredPlotMark(spec, model.config);
}

function withInferredPlotMark(spec: PlotSpec, config: Record<string, unknown>): PlotSpec {
  if (spec.marks.length > 0 || spec.data.length === 0) return spec;
  const fields = plotFields(spec.data);
  if (!fields.y) return spec;
  const fallbackType = chartTypeKey(String(objectRecord(config)?.type ?? objectRecord(config)?.fallbackType ?? 'barY'));
  const type: PlotMarkSpec['type'] = fallbackType === 'line' ? 'line' : fallbackType === 'dot' || fallbackType === 'scatter' ? 'dot' : 'barY';
  return {
    ...spec,
    marks: [{ type, x: fields.x, y: fields.y }],
  };
}

function firstPlotMark(spec: PlotSpec): PlotMarkSpec | undefined {
  return spec.marks.find((mark) => {
    if (mark.type === 'barX') return Boolean(mark.x);
    if (mark.type === 'ruleX' || mark.type === 'ruleY') return Boolean(mark.x ?? mark.y);
    return Boolean(mark.y);
  });
}

function plotRows(spec: PlotSpec, mark: PlotMarkSpec | undefined): ChartRow[] {
  if (!mark) return [];
  const fields = plotFields(spec.data);
  const valueField = mark.type === 'barX' || mark.type === 'ruleX' ? mark.x ?? fields.y : mark.y ?? fields.y;
  const labelField = mark.type === 'barX' || mark.type === 'ruleX' ? mark.y ?? fields.x : mark.x ?? fields.x;
  if (!valueField) return [];
  return spec.data.map((row, index) => {
    const label = labelField ? row[labelField] : undefined;
    const rawColor = mark.fill ? row[mark.fill] : mark.stroke ? row[mark.stroke] : undefined;
    return {
      label: String(label ?? row.label ?? row.name ?? index + 1),
      value: finiteNumber(row[valueField], Number.NaN),
      color: cssColor(rawColor),
    };
  }).filter((row) => Number.isFinite(row.value)).slice(0, 24);
}

function plotFields(rows: Array<Record<string, unknown>>): { x?: string; y?: string } {
  const first = rows[0];
  if (!first) return {};
  const entries = Object.entries(first);
  const y = entries.find(([, value]) => Number.isFinite(Number(value)))?.[0];
  const x = entries.find(([key, value]) => key !== y && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))?.[0];
  return { x, y };
}

function renderBarPreview(rows: ChartRow[], className: string): string {
  const visibleRows = rows.slice(0, 12);
  const max = Math.max(1, ...visibleRows.map((row) => row.value));
  const min = Math.min(0, ...visibleRows.map((row) => row.value));
  const range = Math.max(1, max - min);
  const baseline = 150 - ((0 - min) / range) * 120;
  const bars = visibleRows.map((row, index) => {
    const valueY = 150 - ((row.value - min) / range) * 120;
    const height = Math.max(4, Math.round(Math.abs(baseline - valueY)));
    const x = 24 + index * 38;
    const y = Math.min(baseline, valueY);
    return tag('rect', { x: String(x), y: trimNumber(y), width: '24', height: String(height), rx: '4', fill: row.color ?? chartPreviewPalette[index % chartPreviewPalette.length] }, '') +
      tag('text', { x: String(x + 12), y: '168', 'text-anchor': 'middle', 'font-size': '10', fill: '#666' }, escapeHtml(row.label));
  }).join('');
  return tag('svg', { class: className, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, tag('line', { x1: '16', y1: trimNumber(baseline), x2: '500', y2: trimNumber(baseline), stroke: '#ddd' }, '') + bars);
}

function renderLinePreview(rows: ChartRow[], className: string, color = chartPreviewPalette[0]): string {
  return renderLineSeriesPreview([{ label: 'Series 1', rows, color }], className);
}

function renderLineSeriesPreview(series: ChartSeries[], className: string): string {
  const visibleSeries = series.filter((item) => item.rows.length > 0).slice(0, 6);
  const allRows = visibleSeries.flatMap((item) => item.rows);
  if (allRows.length === 0) return emptyFallback();
  const max = Math.max(1, ...allRows.map((row) => row.value));
  const min = Math.min(0, ...allRows.map((row) => row.value));
  const range = Math.max(1, max - min);
  const lines = visibleSeries.map((item) => {
    const rows = item.rows.slice(0, 12);
    const step = rows.length > 1 ? 460 / (rows.length - 1) : 0;
    const points = rows.map((row, index) => `${30 + index * step},${150 - ((row.value - min) / range) * 120}`).join(' ');
    const circles = points.split(' ').filter(Boolean).map((point) => {
      const [cx, cy] = point.split(',');
      return tag('circle', { cx, cy, r: '4', fill: item.color }, '');
    }).join('');
    return tag('polyline', { points, fill: 'none', stroke: item.color, 'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, '') + circles;
  }).join('');
  const labels = (visibleSeries[0]?.rows ?? []).slice(0, 12).map((row, index) => {
    const step = (visibleSeries[0]?.rows.length ?? 0) > 1 ? 460 / ((visibleSeries[0]?.rows.length ?? 1) - 1) : 0;
    return tag('text', { x: trimNumber(30 + index * step), y: '172', 'text-anchor': 'middle', 'font-size': '10', fill: '#666' }, escapeHtml(row.label));
  }).join('');
  return tag('svg', { class: className, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, tag('line', { x1: '16', y1: '150', x2: '500', y2: '150', stroke: '#ddd' }, '') + lines + labels);
}

function renderPiePreview(rows: Array<{ label: string; value: number }>, className: string): string {
  const total = Math.max(1, rows.reduce((sum, row) => sum + Math.max(0, row.value), 0));
  const values = rows.slice(0, 8);
  const colors = chartPreviewPalette;
  let angle = -Math.PI / 2;
  const slices = values.map((row, index) => {
    const length = Math.max(0, row.value) / total * Math.PI * 2;
    const start = angle;
    const end = angle + length;
    angle = end;
    return tag('path', {
      d: polarAreaPath(95, 95, 66, start, end),
      fill: colors[index % colors.length],
      stroke: '#fff',
      'stroke-width': '2',
    }, '');
  }).join('');
  return tag('svg', { class: `${className} ${className}--pie`, viewBox: '0 0 190 190', 'aria-hidden': 'true' }, tag('circle', { cx: '95', cy: '95', r: '68', fill: '#f8fafc' }, '') + slices);
}

function renderDoughnutPreview(rows: Array<{ label: string; value: number }>, className: string): string {
  const total = Math.max(1, rows.reduce((sum, row) => sum + Math.max(0, row.value), 0));
  let offset = 25;
  const slices = rows.slice(0, 8).map((row, index) => {
    const length = Math.max(0, row.value) / total * 100;
    const color = chartPreviewPalette[index % chartPreviewPalette.length];
    const slice = tag('circle', { cx: '95', cy: '95', r: '58', fill: 'none', stroke: color, 'stroke-width': '46', 'stroke-dasharray': `${length} ${100 - length}`, 'stroke-dashoffset': String(offset) }, '');
    offset -= length;
    return slice;
  }).join('');
  return tag('svg', { class: `${className} ${className}--doughnut`, viewBox: '0 0 190 190', 'aria-hidden': 'true' }, tag('circle', { cx: '95', cy: '95', r: '58', fill: 'none', stroke: '#eee', 'stroke-width': '46' }, '') + slices + tag('circle', { cx: '95', cy: '95', r: '28', fill: '#fff' }, ''));
}

function renderRadarPreview(rows: Array<{ label: string; value: number }>, className: string): string {
  const values = rows.slice(0, 8);
  const max = Math.max(1, ...values.map((row) => Math.abs(row.value)));
  const center = 95;
  const radius = 66;
  const grid = [0.33, 0.66, 1].map((scale) =>
    tag('polygon', { points: radarPoints(values.length, radius * scale, center), fill: 'none', stroke: '#e5e7eb', 'stroke-width': '1' }, ''),
  ).join('');
  const axes = values.map((_, index) => {
    const point = radarPoint(index, values.length, radius, center);
    return tag('line', { x1: String(center), y1: String(center), x2: trimNumber(point.x), y2: trimNumber(point.y), stroke: '#e5e7eb', 'stroke-width': '1' }, '');
  }).join('');
  const dataPoints = values.map((row, index) => {
    const point = radarPoint(index, values.length, radius * Math.max(0, row.value) / max, center);
    return `${trimNumber(point.x)},${trimNumber(point.y)}`;
  }).join(' ');
  const markers = dataPoints.split(' ').filter(Boolean).map((point) => {
    const [cx, cy] = point.split(',');
    return tag('circle', { cx, cy, r: '3.5', fill: chartPreviewPalette[0] }, '');
  }).join('');
  const labels = values.map((row, index) => {
    const point = radarPoint(index, values.length, radius + 13, center);
    return tag('text', { x: trimNumber(point.x), y: trimNumber(point.y + 3), 'text-anchor': 'middle', 'font-size': '9', fill: '#64748b' }, escapeHtml(row.label));
  }).join('');
  return tag(
    'svg',
    { class: `${className} ${className}--radar`, viewBox: '0 0 190 190', 'aria-hidden': 'true' },
    grid + axes + tag('polygon', { points: dataPoints, fill: 'rgba(37,99,235,0.18)', stroke: chartPreviewPalette[0], 'stroke-width': '3', 'stroke-linejoin': 'round' }, '') + markers + labels,
  );
}

function radarPoints(count: number, radius: number, center: number): string {
  return Array.from({ length: Math.max(3, count) }, (_, index) => {
    const point = radarPoint(index, Math.max(3, count), radius, center);
    return `${trimNumber(point.x)},${trimNumber(point.y)}`;
  }).join(' ');
}

function radarPoint(index: number, count: number, radius: number, center: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(3, count);
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function renderPolarAreaPreview(rows: Array<{ label: string; value: number }>, className: string): string {
  const values = rows.slice(0, 8);
  const max = Math.max(1, ...values.map((row) => Math.max(0, row.value)));
  const center = 95;
  const startOffset = -Math.PI / 2;
  const step = (Math.PI * 2) / Math.max(1, values.length);
  const colors = chartPreviewPalette;
  const slices = values.map((row, index) => {
    const radius = 26 + (Math.max(0, row.value) / max) * 56;
    const start = startOffset + index * step + 0.02;
    const end = startOffset + (index + 1) * step - 0.02;
    return tag('path', { d: polarAreaPath(center, center, radius, start, end), fill: colors[index % colors.length], opacity: '0.9', stroke: '#fff', 'stroke-width': '2' }, '');
  }).join('');
  return tag('svg', { class: `${className} ${className}--polar-area`, viewBox: '0 0 190 190', 'aria-hidden': 'true' }, tag('circle', { cx: String(center), cy: String(center), r: '82', fill: '#f8fafc' }, '') + slices + tag('circle', { cx: String(center), cy: String(center), r: '4', fill: '#fff' }, ''));
}

function renderPointPreview(points: ChartPointRow[], className: string, bubble: boolean): string {
  const visible = points.slice(0, 24);
  if (visible.length === 0) return emptyFallback();
  const xs = visible.map((point) => point.x);
  const ys = visible.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(1, ...ys);
  const dx = Math.max(1, maxX - minX);
  const dy = Math.max(1, maxY - minY);
  const colors = chartPreviewPalette;
  const circles = visible.map((point, index) => {
    const cx = 36 + ((point.x - minX) / dx) * 440;
    const cy = 150 - ((point.y - minY) / dy) * 120;
    const radius = bubble ? point.r : 4.5;
    return tag('circle', {
      cx: trimNumber(cx),
      cy: trimNumber(cy),
      r: trimNumber(radius),
      fill: colors[index % colors.length],
      opacity: bubble ? '0.72' : '0.9',
      stroke: '#fff',
      'stroke-width': bubble ? '2' : '1',
    }, '') + tag('title', {}, escapeHtml(`${point.label}: ${point.x}, ${point.y}`));
  }).join('');
  return tag(
    'svg',
    { class: `${className} ${className}--${bubble ? 'bubble' : 'scatter'}`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    tag('line', { x1: '24', y1: '150', x2: '500', y2: '150', stroke: '#ddd' }, '') +
      tag('line', { x1: '32', y1: '22', x2: '32', y2: '154', stroke: '#ddd' }, '') +
      circles,
  );
}

function renderRulePlotPreview(rows: ChartRow[], className: string, ruleType: 'ruleX' | 'ruleY'): string {
  const values = rows.slice(0, 8);
  const max = Math.max(1, ...values.map((row) => Math.abs(row.value)));
  const rules = values.map((row, index) => {
    const offset = ruleType === 'ruleY' ? 150 - (Math.max(0, row.value) / max) * 120 : 40 + index * 58;
    if (ruleType === 'ruleY') {
      return tag('line', { x1: '32', y1: trimNumber(offset), x2: '488', y2: trimNumber(offset), stroke: row.color ?? chartPreviewPalette[index % chartPreviewPalette.length], 'stroke-width': '2', opacity: '0.75' }, '') +
        tag('text', { x: '36', y: trimNumber(offset - 5), 'font-size': '10', fill: '#64748b' }, escapeHtml(row.label));
    }
    return tag('line', { x1: trimNumber(offset), y1: '26', x2: trimNumber(offset), y2: '154', stroke: row.color ?? chartPreviewPalette[index % chartPreviewPalette.length], 'stroke-width': '2', opacity: '0.75' }, '') +
      tag('text', { x: trimNumber(offset), y: '172', 'text-anchor': 'middle', 'font-size': '10', fill: '#64748b' }, escapeHtml(row.label));
  }).join('');
  return tag('svg', { class: className, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, rules);
}

function graphModel(data: unknown): GraphModel {
  const plain = toDataVizPlainValue(data);
  const record = objectRecord(plain);
  const rawNodes = Array.isArray(record?.nodes)
    ? record.nodes
    : Array.isArray(record?.vertices)
      ? record.vertices
      : [];
  const matrix = Array.isArray(record?.matrix) ? record.matrix : Array.isArray(plain) && Array.isArray(plain[0]) ? plain : undefined;
  if (matrix) return graphModelFromMatrix(matrix);

  const rawLinks = Array.isArray(record?.links)
    ? record.links
    : Array.isArray(record?.edges)
      ? record.edges
      : Array.isArray(record?.data)
        ? record.data
        : [];
  const nodes = new Map<string, GraphNode>();
  rawNodes.forEach((node, index) => {
    const normalized = normalizeGraphNode(node, index);
    nodes.set(normalized.id, normalized);
  });

  const links = rawLinks.flatMap((link, index) => {
    const normalized = normalizeGraphLink(link, index, rawNodes);
    if (!normalized) return [];
    if (!nodes.has(normalized.source)) nodes.set(normalized.source, { id: normalized.source, label: normalized.source });
    if (!nodes.has(normalized.target)) nodes.set(normalized.target, { id: normalized.target, label: normalized.target });
    return [normalized];
  });

  return { nodes: Array.from(nodes.values()).slice(0, 24), links };
}

function graphModelFromMatrix(matrix: unknown[]): GraphModel {
  const rows = matrix.filter(Array.isArray).slice(0, 10) as unknown[][];
  const nodes = rows.map((_, index) => ({ id: String(index), label: String(index + 1) }));
  const links: GraphLink[] = [];
  rows.forEach((row, rowIndex) => {
    row.slice(0, 10).forEach((value, columnIndex) => {
      const amount = finiteNumber(value, 0);
      if (amount > 0 && rowIndex !== columnIndex) {
        links.push({ source: String(rowIndex), target: String(columnIndex), value: amount });
      }
    });
  });
  return { nodes, links };
}

function normalizeGraphNode(value: unknown, index: number): GraphNode {
  const record = objectRecord(toDataVizPlainValue(value)) ?? {};
  const id = String(record.id ?? record.key ?? record.name ?? record.label ?? index);
  return {
    id,
    label: String(record.label ?? record.name ?? record.title ?? record.id ?? index + 1),
    color: cssColor(record.color ?? record.backgroundColor ?? record.fill),
  };
}

function normalizeGraphLink(value: unknown, index: number, rawNodes: unknown[]): GraphLink | undefined {
  const record = objectRecord(toDataVizPlainValue(value));
  if (!record) return undefined;
  const source = graphEndpointId(record.source ?? record.from ?? record.sourceId, rawNodes);
  const target = graphEndpointId(record.target ?? record.to ?? record.targetId, rawNodes);
  if (!source || !target) return undefined;
  return {
    source,
    target,
    value: Math.max(0, finiteNumber(record.value ?? record.weight ?? record.count ?? record.amount, 1)),
    color: cssColor(record.color ?? record.stroke ?? record.fill) ?? chartPreviewPalette[index % chartPreviewPalette.length],
  };
}

function graphEndpointId(value: unknown, rawNodes: unknown[]): string | undefined {
  if (typeof value === 'number' && rawNodes[value]) return normalizeGraphNode(rawNodes[value], value).id;
  const record = objectRecord(toDataVizPlainValue(value));
  if (record) return String(record.id ?? record.key ?? record.name ?? record.label ?? '');
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function chartTypeKey(chartType: string): string {
  return String(chartType ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function polarAreaPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArc = Math.abs(angleRadians(endAngle) - angleRadians(startAngle)) > Math.PI ? '1' : '0';
  return `M ${trimNumber(cx)} ${trimNumber(cy)} L ${trimNumber(start.x)} ${trimNumber(start.y)} A ${trimNumber(radius)} ${trimNumber(radius)} 0 ${largeArc} 1 ${trimNumber(end.x)} ${trimNumber(end.y)} Z`;
}

function polarPoint(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  const radians = angleRadians(angle);
  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  };
}

function angleRadians(angle: number): number {
  return Math.abs(angle) > Math.PI * 2 ? angle * Math.PI / 180 : angle;
}

function trimNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function cssColor(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  const rgba = trimmed.split(',').map((part) => Number(part.trim()));
  if (rgba.length === 3 && rgba.every((part) => Number.isFinite(part))) return `rgb(${rgba[0]} ${rgba[1]} ${rgba[2]})`;
  if (rgba.length === 4 && rgba.every((part) => Number.isFinite(part))) {
    const alpha = rgba[3] > 1 ? Math.max(0, Math.min(1, rgba[3] / 255)) : Math.max(0, Math.min(1, rgba[3]));
    return `rgb(${rgba[0]} ${rgba[1]} ${rgba[2]} / ${alpha})`;
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^(?:rgb|rgba|hsl|hsla)\([0-9a-zA-Z%.,\s/-]+\)$/.test(trimmed)) return trimmed;
  if (/^var\([a-zA-Z0-9_#(),.%\s-]+\)$/.test(trimmed)) return trimmed;
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed;
  return undefined;
}

function emptyFallback(): string {
  return tag('div', { class: 'xa-dataviz-empty' }, 'No data');
}

function tag(name: string, attrs: Record<string, string | undefined>, body: string): string {
  return `<${name}${renderAttrs(attrs)}>${body}</${name}>`;
}

function renderAttrs(attrs: Record<string, string | undefined>): string {
  return Object.entries(attrs)
    .filter(([name, value]) => value !== undefined && value !== null && !/^on/i.test(name))
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

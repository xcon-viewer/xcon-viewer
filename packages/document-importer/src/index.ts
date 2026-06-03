export type ImportedFileType = 'hwpx' | 'hwp' | 'hwp3' | 'hwpml' | 'pdf' | 'xlsx' | 'xls' | 'docx' | 'unknown' | string;

export interface KordocParseSuccess {
  success: true;
  fileType: ImportedFileType;
  markdown?: string;
  blocks?: KordocBlock[];
  metadata?: Record<string, unknown>;
  outline?: Array<Record<string, unknown>>;
  warnings?: Array<Record<string, unknown>>;
  images?: Array<Record<string, unknown>>;
}

export interface KordocParseFailure {
  success: false;
  fileType?: ImportedFileType;
  error?: string;
  message?: string;
  code?: string;
}

export type KordocParseResult = KordocParseSuccess | KordocParseFailure;

export type KordocBlockType = 'paragraph' | 'table' | 'heading' | 'list' | 'image' | 'separator' | string;

export interface KordocBlock {
  type: KordocBlockType;
  text?: string;
  table?: KordocTable;
  level?: number;
  listType?: 'ordered' | 'unordered';
  children?: KordocBlock[];
  href?: string;
  footnoteText?: string;
}

export interface KordocTable {
  rows: number;
  cols: number;
  cells: KordocCell[][];
  hasHeader?: boolean;
}

export interface KordocCell {
  text: string;
  colSpan?: number;
  rowSpan?: number;
}

export interface SugarBinding {
  as: string;
  expression: string;
}

export interface ImporterFeatures {
  sketch?: boolean;
  chain?: boolean;
  workflow?: boolean;
}

export type TableMode = 'auto' | 'markdown' | 'spanGrid';

export interface ConvertOptions {
  title?: string;
  mode?: 'conservative' | 'enhanced';
  features?: ImporterFeatures;
  tableMode?: TableMode;
  documentWidth?: number;
  bindings?: SugarBinding[];
  includeFrontmatter?: boolean;
}

export interface ParseDocumentOptions extends ConvertOptions {
  kordoc?: {
    parse(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
    parseHwp3?(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
    parseHwp?(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
    parseHwpx?(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
    parseHwpml?(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
    parsePdf?(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
    parseXls?(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
    parseXlsx?(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
    parseDocx?(input: Uint8Array | ArrayBuffer | Buffer | string, options?: unknown): Promise<KordocParseResult> | KordocParseResult;
  };
  fileType?: ImportedFileType;
  parseOptions?: unknown;
}

export type DiagnosticLevel = 'info' | 'warning' | 'error';

export interface ImportDiagnostic {
  level: DiagnosticLevel;
  code: string;
  message: string;
  blockIndex?: number;
}

export interface XconMarkdownImportResult {
  markdown: string;
  diagnostics: ImportDiagnostic[];
  metadata?: Record<string, unknown>;
  assets: Array<Record<string, unknown>>;
  source?: KordocParseSuccess;
}

const DEFAULT_FEATURES: Required<ImporterFeatures> = {
  sketch: true,
  chain: true,
  workflow: true,
};
const IMPORTED_SPANGRID_TABLE_WIDTH = 760;
const IMPORTED_SPANGRID_MIN_HEIGHT = 120;
const IMPORTED_SPANGRID_MIN_COLUMN_WIDTH = 96;
const IMPORTED_SPANGRID_HEADER_HEIGHT = 40;
const IMPORTED_SPANGRID_ROW_HEIGHT = 48;
const IMPORTED_SPANGRID_CELL_X_PADDING = 28;
const IMPORTED_SPANGRID_TEXT_UNIT_WIDTH = 8;

export function convertParseResultToXconMarkdown(
  parseResult: KordocParseResult,
  options: ConvertOptions = {},
): XconMarkdownImportResult {
  if (!parseResult.success) {
    const message = parseResult.error || parseResult.message || 'Document parse failed.';
    return {
      markdown: '',
      diagnostics: [{ level: 'error', code: parseResult.code || 'PARSE_FAILED', message }],
      assets: [],
    };
  }

  const features = { ...DEFAULT_FEATURES, ...(options.features || {}) };
  const diagnostics: ImportDiagnostic[] = [];
  const lines: string[] = [];

  if (options.includeFrontmatter) {
    lines.push('---');
    lines.push(`sourceFormat: ${parseResult.fileType || 'unknown'}`);
    const title = options.title || getMetadataTitle(parseResult.metadata);
    if (title) lines.push(`title: ${JSON.stringify(title)}`);
    lines.push('---', '');
  }

  if (features.chain && options.bindings?.length) {
    for (const binding of options.bindings) {
      const alias = sanitizeAlias(binding.as);
      if (!alias) {
        diagnostics.push({
          level: 'warning',
          code: 'INVALID_BINDING_ALIAS',
          message: `Skipped invalid SUGAR binding alias "${binding.as}".`,
        });
        continue;
      }
      const expression = normalizeSugarExpression(binding.expression);
      lines.push('```xcon-chain as ' + alias);
      lines.push(expression);
      lines.push('```', '');
    }
  }

  const blocks = parseResult.blocks || [];
  let spanGridIndex = 0;
  blocks.forEach((block, index) => {
    const nextSpanGridIndex = block.type === 'table' && block.table && shouldRenderTableAsSpanGrid(block.table, options, features)
      ? spanGridIndex + 1
      : spanGridIndex;
    const markdown = blockToMarkdown(block, index, nextSpanGridIndex, options, features, diagnostics);
    spanGridIndex = nextSpanGridIndex;
    if (!markdown) return;
    if (lines.length && lines[lines.length - 1] !== '') lines.push('');
    lines.push(markdown, '');
  });

  const markdown = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + (lines.length ? '\n' : '');
  return {
    markdown,
    diagnostics,
    metadata: parseResult.metadata,
    assets: parseResult.images || [],
    source: parseResult,
  };
}

export async function parseDocumentToXconMarkdown(
  input: Uint8Array | ArrayBuffer | Buffer | string,
  options: ParseDocumentOptions = {},
): Promise<XconMarkdownImportResult> {
  const kordoc = options.kordoc || await importKordoc();
  const parser = resolveKordocParser(kordoc, options.fileType);
  const parseResult = await parser(input, options.parseOptions);
  return convertParseResultToXconMarkdown(parseResult, options);
}

async function importKordoc(): Promise<NonNullable<ParseDocumentOptions['kordoc']>> {
  try {
    return await import('kordoc') as NonNullable<ParseDocumentOptions['kordoc']>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`kordoc is required for document import. Install kordoc or inject a parser. ${message}`);
  }
}

function resolveKordocParser(
  kordoc: NonNullable<ParseDocumentOptions['kordoc']>,
  fileType?: ImportedFileType,
): NonNullable<ParseDocumentOptions['kordoc']>['parse'] {
  const normalized = String(fileType || '').toLowerCase();
  const parserMap: Record<string, keyof NonNullable<ParseDocumentOptions['kordoc']>> = {
    hwp3: 'parseHwp3',
    hwp: 'parseHwp',
    hwpx: 'parseHwpx',
    hwpml: 'parseHwpml',
    pdf: 'parsePdf',
    xls: 'parseXls',
    xlsx: 'parseXlsx',
    docx: 'parseDocx',
  };
  const parserName = parserMap[normalized];
  const parser = parserName ? kordoc[parserName] : null;
  return typeof parser === 'function' ? parser.bind(kordoc) : kordoc.parse.bind(kordoc);
}

function blockToMarkdown(
  block: KordocBlock,
  blockIndex: number,
  spanGridIndex: number,
  options: ConvertOptions,
  features: Required<ImporterFeatures>,
  diagnostics: ImportDiagnostic[],
): string {
  if (block.type === 'heading') {
    const level = clampInteger(block.level || 2, 1, 6);
    const text = normalizeText(block.text || '');
    return text ? `${'#'.repeat(level)} ${text}` : '';
  }

  if (block.type === 'paragraph') {
    let text = normalizeText(block.text || '');
    if (!text) return '';
    if (block.href) text = `[${escapeMarkdown(text)}](${block.href})`;
    if (block.footnoteText) text += ` (note: ${normalizeText(block.footnoteText)})`;
    return text;
  }

  if (block.type === 'separator') return '---';

  if (block.type === 'image') {
    const src = normalizeText(block.text || '');
    return src ? `![image](${src})` : '';
  }

  if (block.type === 'list') {
    const text = normalizeText(block.text || '');
    if (!text) return '';
    const marker = block.listType === 'ordered' ? '1.' : '-';
    const children = block.children?.map((child) => {
      const childText = normalizeText(child.text || '');
      if (!childText) return '';
      const childMarker = child.listType === 'ordered' ? '1.' : '-';
      return `  ${childMarker} ${childText}`;
    }).filter(Boolean) || [];
    return [`${marker} ${text}`, ...children].join('\n');
  }

  if (block.type === 'table' && block.table) {
    if (shouldRenderTableAsSpanGrid(block.table, options, features)) {
      diagnostics.push({
        level: 'info',
        code: 'TABLE_TO_SPANGRID',
        message: 'Converted a merged or complex table to XCON/SKETCH SpanGrid.',
        blockIndex,
      });
      return tableToSpanGridSketch(block.table, spanGridIndex, options);
    }

    return tableToMarkdown(block.table);
  }

  diagnostics.push({
    level: 'warning',
    code: 'UNSUPPORTED_BLOCK',
    message: `Skipped unsupported kordoc block type "${block.type}".`,
    blockIndex,
  });
  return '';
}

function shouldRenderTableAsSpanGrid(
  table: KordocTable,
  options: ConvertOptions,
  features: Required<ImporterFeatures>,
): boolean {
  const tableMode = options.tableMode || 'auto';
  const forceSpanGrid = tableMode === 'spanGrid';
  return features.sketch && (forceSpanGrid || (tableMode === 'auto' && hasMergedCells(table)));
}

function tableToMarkdown(table: KordocTable): string {
  const rows = tableToData(table);
  if (!rows.length) return '';
  const header = rows[0];
  const body = rows.slice(1);
  const lines = [
    `| ${header.map(escapeTableCell).join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.map(escapeTableCell).join(' | ')} |`),
  ];
  return lines.join('\n');
}

function tableToSpanGridSketch(table: KordocTable, index: number, options: ConvertOptions = {}): string {
  const data = tableToData(table);
  const title = options.title || 'Imported table';
  const columnCount = Math.max(table.cols || 0, data[0]?.length || 1);
  const rowCount = Math.max(table.rows || data.length, data.length || 1);
  const tableWidth = importedSpanGridTableWidth(options.documentWidth);
  const gridWidth = Math.max(
    tableWidth,
    columnCount * IMPORTED_SPANGRID_MIN_COLUMN_WIDTH + 2,
  );
  const columns = importedSpanGridColumns(data, columnCount, gridWidth);
  const rows = Array.from({ length: rowCount }, (_unused, rowIndex) => ({
    height: rowIndex === 0 ? IMPORTED_SPANGRID_HEADER_HEIGHT : IMPORTED_SPANGRID_ROW_HEIGHT,
  }));
  const merges = tableToMerges(table);
  const gridHeight = Math.max(IMPORTED_SPANGRID_MIN_HEIGHT, rows.reduce((sum, row) => sum + row.height, 0) + 2);
  const lines = [
    '```xcon-sketch',
    `screen ${JSON.stringify(title)} ${gridWidth}x${gridHeight} bg transparent`,
    '  border',
    '    visible false',
    '  shadow',
    '    visible false',
    `  sheet${index}: spanGrid at 0 0 ${gridWidth} ${gridHeight}`,
    '    backgroundColor @surface',
    '    border',
    '      visible true',
    '      width 1',
    '      color @border',
    '      radius 12',
    '    readonly true',
    `    data ${JSON.stringify(data)}`,
    `    columns ${JSON.stringify(columns)}`,
    `    rows ${JSON.stringify(rows)}`,
  ];
  if (merges.length) lines.push(`    merges ${JSON.stringify(merges)}`);
  lines.push('```');
  return lines.join('\n');
}

function importedSpanGridColumns(data: string[][], columnCount: number, gridWidth: number): Array<{ id: string; title: string; width: number }> {
  const availableWidth = Math.max(columnCount * IMPORTED_SPANGRID_MIN_COLUMN_WIDTH, gridWidth - 2);
  const estimatedWidths = Array.from({ length: columnCount }, (_unused, columnIndex) => (
    importedSpanGridColumnEstimate(data, columnIndex)
  ));
  const minimumTotal = columnCount * IMPORTED_SPANGRID_MIN_COLUMN_WIDTH;
  const remainingWidth = Math.max(0, availableWidth - minimumTotal);
  const extraWeights = estimatedWidths.map((width) => Math.max(0, width - IMPORTED_SPANGRID_MIN_COLUMN_WIDTH));
  const totalExtraWeight = extraWeights.reduce((sum, weight) => sum + weight, 0);
  const rawWidths = estimatedWidths.map((_width, columnIndex) => {
    const weight = totalExtraWeight > 0 ? extraWeights[columnIndex] : 1;
    const divisor = totalExtraWeight > 0 ? totalExtraWeight : columnCount;
    return IMPORTED_SPANGRID_MIN_COLUMN_WIDTH + (remainingWidth * weight / divisor);
  });
  const widths = rawWidths.map(Math.floor);
  let leftover = availableWidth - widths.reduce((sum, width) => sum + width, 0);
  const fractionalOrder = rawWidths
    .map((width, index) => ({ index, fraction: width - Math.floor(width) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  let cursor = 0;
  while (leftover > 0 && fractionalOrder.length) {
    widths[fractionalOrder[cursor % fractionalOrder.length].index] += 1;
    leftover -= 1;
    cursor += 1;
  }

  return Array.from({ length: columnCount }, (_unused, columnIndex) => ({
    id: `c${columnIndex + 1}`,
    title: data[0]?.[columnIndex] || `Column ${columnIndex + 1}`,
    width: widths[columnIndex],
  }));
}

function importedSpanGridTableWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return IMPORTED_SPANGRID_TABLE_WIDTH;
  return Math.max(320, Math.min(1600, Math.round(value)));
}

function importedSpanGridColumnEstimate(data: string[][], columnIndex: number): number {
  const maxUnits = data.reduce((max, row) => Math.max(max, importedTextUnits(row[columnIndex] || '')), 0);
  const contentWidth = Math.ceil(maxUnits * IMPORTED_SPANGRID_TEXT_UNIT_WIDTH) + IMPORTED_SPANGRID_CELL_X_PADDING;
  return Math.max(IMPORTED_SPANGRID_MIN_COLUMN_WIDTH, contentWidth);
}

function importedTextUnits(value: string): number {
  const lines = normalizeText(value).split('\n');
  return lines.reduce((max, line) => Math.max(max, Array.from(line).reduce((sum, char) => {
    const codePoint = char.codePointAt(0) || 0;
    return sum + (codePoint > 0x7f ? 1.7 : 1);
  }, 0)), 0);
}

function tableToData(table: KordocTable): string[][] {
  const rowCount = Math.max(table.rows || 0, table.cells.length);
  const colCount = Math.max(table.cols || 0, ...table.cells.map((row) => row.length), 0);
  const data: string[][] = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ''));
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = table.cells[rowIndex] || [];
    for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
      data[rowIndex][colIndex] = normalizeText(row[colIndex]?.text || '');
    }
  }
  return data;
}

function tableToMerges(table: KordocTable): Array<{ start: { row: number; col: number }; end: { row: number; col: number } }> {
  const merges: Array<{ start: { row: number; col: number }; end: { row: number; col: number } }> = [];
  for (let rowIndex = 0; rowIndex < table.cells.length; rowIndex += 1) {
    const row = table.cells[rowIndex] || [];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = row[colIndex];
      if (!cell) continue;
      const colSpan = cell.colSpan || 1;
      const rowSpan = cell.rowSpan || 1;
      if (colSpan <= 1 && rowSpan <= 1) continue;
      merges.push({
        start: { row: rowIndex, col: colIndex },
        end: { row: rowIndex + rowSpan - 1, col: colIndex + colSpan - 1 },
      });
    }
  }
  return merges;
}

function hasMergedCells(table: KordocTable): boolean {
  return table.cells.some((row) => row.some((cell) => (cell.colSpan || 1) > 1 || (cell.rowSpan || 1) > 1));
}

function normalizeText(value: string): string {
  return String(value || '').replace(/\r\n?/g, '\n').trim();
}

function normalizeSugarExpression(value: string): string {
  const trimmed = String(value || '').trim();
  return trimmed.startsWith('=') || trimmed.startsWith('let ') || trimmed.startsWith('return ')
    ? trimmed
    : `= ${trimmed}`;
}

function sanitizeAlias(value: string): string {
  const alias = String(value || '').trim();
  return /^[A-Za-z_][\w.-]*$/.test(alias) ? alias : '';
}

function getMetadataTitle(metadata?: Record<string, unknown>): string {
  return typeof metadata?.title === 'string' ? metadata.title.trim() : '';
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\[\]])/g, '\\$1');
}

function escapeTableCell(value: string): string {
  return normalizeText(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

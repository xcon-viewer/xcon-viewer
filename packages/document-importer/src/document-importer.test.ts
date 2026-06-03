import { describe, expect, test } from 'vitest';

import {
  convertParseResultToXconMarkdown,
  parseDocumentToXconMarkdown,
} from './index';

describe('document importer', () => {
  test('converts merged kordoc tables into SKETCH SpanGrid fences', () => {
    const result = convertParseResultToXconMarkdown({
      success: true,
      fileType: 'hwpx',
      markdown: '',
      blocks: [
        {
          type: 'heading',
          level: 1,
          text: 'Quarterly Plan',
        },
        {
          type: 'table',
          table: {
            rows: 3,
            cols: 3,
            hasHeader: true,
            cells: [
              [
                { text: 'Area', colSpan: 1, rowSpan: 1 },
                { text: 'Metric', colSpan: 1, rowSpan: 1 },
                { text: 'Owner', colSpan: 1, rowSpan: 1 },
              ],
              [
                { text: 'Product', colSpan: 1, rowSpan: 2 },
                { text: 'Launch', colSpan: 1, rowSpan: 1 },
                { text: 'Mina', colSpan: 1, rowSpan: 1 },
              ],
              [
                { text: '', colSpan: 1, rowSpan: 1 },
                { text: 'Retention', colSpan: 1, rowSpan: 1 },
                { text: 'Mina', colSpan: 1, rowSpan: 1 },
              ],
            ],
          },
        },
      ],
    });

    expect(result.markdown).toContain('# Quarterly Plan');
    expect(result.markdown).toContain('```xcon-sketch');
    expect(result.markdown).toContain('screen "Imported table" 760x138 bg transparent');
    expect(result.markdown).toContain('  border\n    visible false');
    expect(result.markdown).toContain('  shadow\n    visible false');
    expect(result.markdown).toContain('  sheet1: spanGrid at 0 0 760 138');
    expect(result.markdown).toContain('sheet1: spanGrid');
    expect(result.markdown).toContain('readonly true');
    expect(result.markdown).toContain('data [["Area","Metric","Owner"],["Product","Launch","Mina"],["","Retention","Mina"]]');
    expect(result.markdown).toContain('rows [{"height":40},{"height":48},{"height":48}]');
    expect(result.markdown).toContain('merges [{"start":{"row":1,"col":0},"end":{"row":2,"col":0}}]');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'TABLE_TO_SPANGRID',
      level: 'info',
    }));
  });

  test('uses document-width SpanGrid imports and grows only when minimum columns require it', () => {
    const cells = Array.from({ length: 20 }, (_row, rowIndex) => Array.from({ length: 10 }, (_col, colIndex) => ({
      text: rowIndex === 0 ? `H${colIndex + 1}` : `R${rowIndex}C${colIndex + 1}`,
      colSpan: 1,
      rowSpan: 1,
    })));
    const result = convertParseResultToXconMarkdown({
      success: true,
      fileType: 'xlsx',
      markdown: '',
      blocks: [
        {
          type: 'table',
          table: {
            rows: 20,
            cols: 10,
            hasHeader: true,
            cells,
          },
        },
      ],
    }, { tableMode: 'spanGrid' });

    expect(result.markdown).toContain('screen "Imported table" 962x954 bg transparent');
    expect(result.markdown).toContain('  sheet1: spanGrid at 0 0 962 954');
    expect(result.markdown).toContain('"width":96');
    expect(result.markdown).toContain('"height":48');
  });

  test('auto-fits long imported SpanGrid columns inside document table width', () => {
    const result = convertParseResultToXconMarkdown({
      success: true,
      fileType: 'docx',
      markdown: '',
      blocks: [
        {
          type: 'table',
          table: {
            rows: 2,
            cols: 2,
            hasHeader: true,
            cells: [
              [
                { text: 'Short', colSpan: 1, rowSpan: 1 },
                { text: 'Very long imported document column heading', colSpan: 1, rowSpan: 1 },
              ],
              [
                { text: 'A', colSpan: 1, rowSpan: 1 },
                { text: 'This cell should drive a wider generated SpanGrid column', colSpan: 1, rowSpan: 1 },
              ],
            ],
          },
        },
      ],
    }, { tableMode: 'spanGrid' });

    expect(result.markdown).toContain('screen "Imported table" 760x120 bg transparent');
    expect(result.markdown).toContain('"id":"c1","title":"Short","width":96');
    expect(result.markdown).toContain('"id":"c2","title":"Very long imported document column heading","width":662');
  });

  test('uses provided document width for imported SpanGrid layout', () => {
    const result = convertParseResultToXconMarkdown({
      success: true,
      fileType: 'hwpx',
      markdown: '',
      blocks: [
        {
          type: 'table',
          table: {
            rows: 2,
            cols: 3,
            hasHeader: true,
            cells: [
              [
                { text: 'Area', colSpan: 1, rowSpan: 1 },
                { text: 'Owner', colSpan: 1, rowSpan: 1 },
                { text: 'Status', colSpan: 1, rowSpan: 1 },
              ],
              [
                { text: 'Shared space', colSpan: 1, rowSpan: 1 },
                { text: 'Ava Parker', colSpan: 1, rowSpan: 1 },
                { text: 'Ready', colSpan: 1, rowSpan: 1 },
              ],
            ],
          },
        },
      ],
    }, { tableMode: 'spanGrid', documentWidth: 640 });

    expect(result.markdown).toContain('screen "Imported table" 640x120 bg transparent');
    expect(result.markdown).toContain('  sheet1: spanGrid at 0 0 640 120');
    expect(result.markdown).toContain('"id":"c1","title":"Area","width":341');
    expect(result.markdown).toContain('"id":"c2","title":"Owner","width":201');
    expect(result.markdown).toContain('"id":"c3","title":"Status","width":96');
  });

  test('keeps simple tables as Markdown tables by default', () => {
    const result = convertParseResultToXconMarkdown({
      success: true,
      fileType: 'docx',
      markdown: '',
      blocks: [
        {
          type: 'table',
          table: {
            rows: 2,
            cols: 2,
            hasHeader: true,
            cells: [
              [
                { text: 'Name', colSpan: 1, rowSpan: 1 },
                { text: 'Status', colSpan: 1, rowSpan: 1 },
              ],
              [
                { text: 'XCON', colSpan: 1, rowSpan: 1 },
                { text: 'Ready', colSpan: 1, rowSpan: 1 },
              ],
            ],
          },
        },
      ],
    });

    expect(result.markdown).toContain('| Name | Status |');
    expect(result.markdown).toContain('| --- | --- |');
    expect(result.markdown).toContain('| XCON | Ready |');
    expect(result.markdown).not.toContain('```xcon-sketch');
  });

  test('prepends explicit SUGAR bindings for Template Lab variables', () => {
    const result = convertParseResultToXconMarkdown({
      success: true,
      fileType: 'pdf',
      markdown: '',
      blocks: [
        { type: 'paragraph', text: 'Prepared for $clientName.' },
      ],
    }, {
      bindings: [
        { as: 'clientName', expression: '= record.client.name | default "Client"' },
      ],
    });

    expect(result.markdown).toContain('```xcon-chain as clientName');
    expect(result.markdown).toContain('= record.client.name | default "Client"');
    expect(result.markdown).toContain('Prepared for $clientName.');
  });

  test('uses injected kordoc parser for document input', async () => {
    const calls: unknown[] = [];
    const result = await parseDocumentToXconMarkdown(new Uint8Array([1, 2, 3]), {
      kordoc: {
        async parse(input, options) {
          calls.push({ input, options });
          return {
            success: true,
            fileType: 'hwp',
            markdown: '',
            blocks: [{ type: 'paragraph', text: 'Imported document' }],
          };
        },
      },
      parseOptions: { pages: '1' },
    });

    expect(calls).toHaveLength(1);
    expect(result.markdown).toContain('Imported document');
    expect(result.source?.fileType).toBe('hwp');
  });

  test.each([
    ['hwp3', 'parseHwp3'],
    ['hwp', 'parseHwp'],
    ['hwpx', 'parseHwpx'],
    ['hwpml', 'parseHwpml'],
    ['pdf', 'parsePdf'],
    ['xls', 'parseXls'],
    ['xlsx', 'parseXlsx'],
    ['docx', 'parseDocx'],
  ] as const)('uses the explicit kordoc %s parser when fileType is known', async (fileType, parserName) => {
    const calls: string[] = [];
    const kordoc = {
      parse() {
        calls.push('parse');
        return {
          success: true,
          fileType: 'unknown',
          markdown: '',
          blocks: [{ type: 'paragraph', text: 'generic parser' }],
        };
      },
      [parserName]() {
        calls.push(parserName);
        return {
          success: true,
          fileType,
          markdown: '',
          blocks: [{ type: 'paragraph', text: `${fileType} parser` }],
        };
      },
    };

    const result = await parseDocumentToXconMarkdown(new Uint8Array([1, 2, 3]), {
      kordoc,
      fileType,
    });

    expect(calls).toEqual([parserName]);
    expect(result.source?.fileType).toBe(fileType);
    expect(result.markdown).toContain(`${fileType} parser`);
  });
});

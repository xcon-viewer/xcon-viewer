import { Readable } from 'node:stream';
import { describe, expect, test } from 'vitest';

import { createTemplateImportHandler } from './template-import-api.mjs';

describe('template import API', () => {
  test('converts an injected parse result into XCON Markdown', async () => {
    const handler = createTemplateImportHandler({
      documentImporter: {
        convertParseResultToXconMarkdown(parseResult, options) {
          return {
            markdown: `# ${parseResult.blocks[0].text}\n\nconverted: ${options.tableMode}`,
            diagnostics: [],
            assets: [],
          };
        },
      },
    });

    const { response } = await callHandler(handler, {
      parseResult: {
        success: true,
        fileType: 'hwpx',
        blocks: [{ type: 'heading', text: 'Imported Brief', level: 1 }],
      },
      options: { tableMode: 'spanGrid' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json.markdown).toContain('# Imported Brief');
    expect(response.json.markdown).toContain('converted: spanGrid');
  });

  test('decodes base64 document input and calls parseDocumentToXconMarkdown', async () => {
    const calls = [];
    const handler = createTemplateImportHandler({
      documentImporter: {
        async parseDocumentToXconMarkdown(input, options) {
          calls.push({ input, options });
          return {
            markdown: '# Parsed document',
            diagnostics: [{ level: 'info', code: 'OK', message: 'parsed' }],
            assets: [],
          };
        },
      },
    });

    const { response } = await callHandler(handler, {
      fileName: 'sample.hwpx',
      contentBase64: Buffer.from([1, 2, 3]).toString('base64'),
      options: {
        parseOptions: { pages: '1' },
        includeFrontmatter: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json.markdown).toBe('# Parsed document');
    expect(response.json.diagnostics[0].code).toBe('OK');
    expect(Buffer.from(calls[0].input).toString('hex')).toBe('010203');
    expect(calls[0].options.parseOptions).toEqual({ pages: '1' });
    expect(calls[0].options.title).toBe('sample.hwpx');
    expect(calls[0].options.fileType).toBe('hwpx');
  });

  test.each([
    ['legacy.hwp3', 'hwp3'],
    ['report.hwp', 'hwp'],
    ['report.hwpx', 'hwpx'],
    ['report.hwpml', 'hwpml'],
    ['brief.pdf', 'pdf'],
    ['budget.xls', 'xls'],
    ['budget.xlsx', 'xlsx'],
    ['letter.docx', 'docx'],
  ])('infers %s as %s for document import', async (fileName, expectedType) => {
    const calls = [];
    const handler = createTemplateImportHandler({
      documentImporter: {
        async parseDocumentToXconMarkdown(_input, options) {
          calls.push(options);
          return { markdown: '# Parsed', diagnostics: [], assets: [] };
        },
      },
    });

    const { response } = await callHandler(handler, {
      fileName,
      contentBase64: Buffer.from([1]).toString('base64'),
    });

    expect(response.statusCode).toBe(200);
    expect(calls[0].title).toBe(fileName);
    expect(calls[0].fileType).toBe(expectedType);
  });

  test('rejects requests without parseResult or document bytes', async () => {
    const handler = createTemplateImportHandler({
      documentImporter: {
        convertParseResultToXconMarkdown() {
          throw new Error('must not be called');
        },
      },
    });
    const { response } = await callHandler(handler, {});

    expect(response.statusCode).toBe(400);
    expect(response.json.error).toContain('parseResult or contentBase64');
  });
});

async function callHandler(handler, body) {
  const request = Readable.from([Buffer.from(JSON.stringify(body))]);
  request.method = 'POST';
  request.headers = { 'content-type': 'application/json' };
  const response = createResponse();
  await handler(request, response);
  return { response };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: Buffer.alloc(0),
    json: undefined,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers || {};
    },
    end(chunk = '') {
      this.body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      const contentType = this.headers['content-type'] || this.headers['Content-Type'] || '';
      if (contentType.includes('application/json')) {
        this.json = JSON.parse(this.body.toString('utf8'));
      }
    },
  };
}

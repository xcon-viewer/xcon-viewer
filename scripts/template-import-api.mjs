const DEFAULT_MAX_BODY_BYTES = 20 * 1024 * 1024;

export function createTemplateImportHandler(options = {}) {
  const {
    documentImporter,
    importDocumentImporter = () => import('../packages/document-importer/dist/index.js'),
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  } = options;

  return async function handleTemplateImport(request, response) {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed. Use POST.' });
      return true;
    }

    let payload;
    try {
      payload = await readJsonBody(request, maxBodyBytes);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message || 'Invalid JSON request body.' });
      return true;
    }

    try {
      const importer = documentImporter || await importDocumentImporter();
      const importOptions = normalizeImportOptions(payload);
      let result;

      if (payload.parseResult && typeof payload.parseResult === 'object') {
        if (typeof importer.convertParseResultToXconMarkdown !== 'function') {
          throw new Error('Document importer does not provide convertParseResultToXconMarkdown().');
        }
        result = importer.convertParseResultToXconMarkdown(payload.parseResult, importOptions);
      } else if (typeof payload.contentBase64 === 'string' && payload.contentBase64.trim()) {
        if (typeof importer.parseDocumentToXconMarkdown !== 'function') {
          throw new Error('Document importer does not provide parseDocumentToXconMarkdown().');
        }
        const bytes = Buffer.from(payload.contentBase64, 'base64');
        result = await importer.parseDocumentToXconMarkdown(bytes, importOptions);
      } else {
        sendJson(response, 400, { error: 'parseResult or contentBase64 is required.' });
        return true;
      }

      sendJson(response, 200, {
        markdown: result.markdown || '',
        diagnostics: result.diagnostics || [],
        metadata: result.metadata || null,
        assets: result.assets || [],
      });
      return true;
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        error: `Import failed: ${error.message || String(error)}`,
      });
      return true;
    }
  };
}

function normalizeImportOptions(payload) {
  const options = payload.options && typeof payload.options === 'object' ? { ...payload.options } : {};
  if (!options.title && payload.fileName) options.title = String(payload.fileName);
  const fileType = normalizeImportFileType(options.fileType || payload.fileType || inferFileTypeFromName(payload.fileName));
  if (fileType) options.fileType = fileType;
  if (options.parseOptions) {
    return options;
  }
  if (payload.parseOptions && typeof payload.parseOptions === 'object') {
    options.parseOptions = payload.parseOptions;
  }
  return options;
}

function inferFileTypeFromName(fileName) {
  const name = String(fileName || '').trim().toLowerCase();
  const match = name.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function normalizeImportFileType(fileType) {
  const normalized = String(fileType || '').trim().toLowerCase().replace(/^\./, '');
  const supported = new Set(['hwp3', 'hwp', 'hwpx', 'hwpml', 'pdf', 'xls', 'xlsx', 'docx']);
  return supported.has(normalized) ? normalized : '';
}

async function readJsonBody(request, maxBodyBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maxBodyBytes) {
      const error = new Error(`Request body is too large. Limit is ${maxBodyBytes} bytes.`);
      error.statusCode = 413;
      throw error;
    }
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_error) {
    const error = new Error('Invalid JSON request body.');
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

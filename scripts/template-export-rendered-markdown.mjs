export function renderedHtmlToMarkdown(html, options = {}) {
  const main = extractExportDocument(html);
  const excludeMode = options?.excludeVisualBlocks;
  const content = excludeMode === 'raster' || excludeMode === 'raster-placeholder'
    ? removeRasterVisualBlocks(main, {
        placeholder: excludeMode === 'raster-placeholder',
        placeholderPrefix: options?.visualPlaceholderPrefix,
      })
    : excludeMode
      ? removeElementsByClass(main, ['lab-xcon-block', 'xcon-workflow'])
      : main;
  const withoutNoise = content
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<span\b[^>]*class=["'][^"']*\blabSugarSilent\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '');

  const tableBlocks = [];
  let source = withoutNoise.replace(/<table\b[\s\S]*?<\/table>/gi, (tableHtml) => {
    const token = `\n\n@@XCON_TABLE_${tableBlocks.length}@@\n\n`;
    tableBlocks.push(tableHtmlToMarkdown(tableHtml));
    return token;
  });

  source = source
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_match, body) => `\n\n# ${htmlToText(body)}\n\n`)
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_match, body) => `\n\n## ${htmlToText(body)}\n\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_match, body) => `\n\n### ${htmlToText(body)}\n\n`)
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_match, body) => `\n\n#### ${htmlToText(body)}\n\n`)
    .replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, (_match, body) => `\n\n##### ${htmlToText(body)}\n\n`)
    .replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, (_match, body) => `\n\n###### ${htmlToText(body)}\n\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, body) => `\n- ${htmlToText(body)}`)
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_match, body) => `\n\n${htmlToInlineMarkdown(body)}\n\n`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:section|article|main|div|header|footer|aside|nav)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  for (let i = 0; i < tableBlocks.length; i += 1) {
    source = source.replace(`@@XCON_TABLE_${i}@@`, tableBlocks[i]);
  }

  return normalizeMarkdown(decodeHtmlEntities(source));
}

function removeRasterVisualBlocks(html, options = {}) {
  const source = String(html || '');
  let output = '';
  let cursor = 0;
  let visualIndex = 0;
  const placeholderPrefix = normalizeVisualPlaceholderPrefix(options.placeholderPrefix || 'XCONVISUALBLOCK');
  const tagPattern = /<([a-z][\w:-]*)\b[^>]*>/gi;
  let match;

  while ((match = tagPattern.exec(source)) !== null) {
    const [tagSource, tagName] = match;
    if (!tagHasAnyClass(tagSource, new Set(['lab-xcon-block', 'xcon-workflow']))) continue;

    const start = match.index;
    const end = findElementEnd(source, tagName, tagPattern.lastIndex);
    const elementHtml = source.slice(start, end);
    if (containsRasterRequiredVisual(elementHtml)) {
      output += source.slice(cursor, start);
      if (options.placeholder) {
        output += `\n\n@@${placeholderPrefix}${visualIndex}@@\n\n`;
      }
      visualIndex += 1;
      cursor = end;
    }
    tagPattern.lastIndex = end;
  }

  output += source.slice(cursor);
  return output;
}

function normalizeVisualPlaceholderPrefix(value) {
  return String(value || 'XCONVISUALBLOCK').replace(/[^A-Za-z0-9]/g, '') || 'XCONVISUALBLOCK';
}

function containsRasterRequiredVisual(html) {
  const source = String(html || '');
  return /<(?:img|svg|canvas|video)\b/i.test(source)
    || /\bdata-(?:xcon-type|component)\s*=\s*(["'])(?:(?:(?!\1).)*)(?:chart|image|banner|map|network|spanGrid|spangrid|carousel|gallery|video)(?:(?:(?!\1).)*)\1/i.test(source)
    || /\bclass\s*=\s*(["'])(?:(?:(?!\1).)*)(?:xcon-chart|xcon-map|xcon-network|xa-chart|xa-map|xa-network|xa-image|xa-banner|xa-spangrid)(?:(?:(?!\1).)*)\1/i.test(source)
    || /(?:chart|map|network|spangrid) loading/i.test(source);
}

function removeElementsByClass(html, classNames) {
  const source = String(html || '');
  const targets = new Set(classNames);
  let output = '';
  let cursor = 0;
  const tagPattern = /<([a-z][\w:-]*)\b[^>]*>/gi;
  let match;

  while ((match = tagPattern.exec(source)) !== null) {
    const [tagSource, tagName] = match;
    if (!tagHasAnyClass(tagSource, targets)) continue;

    const start = match.index;
    const end = findElementEnd(source, tagName, tagPattern.lastIndex);
    output += source.slice(cursor, start);
    cursor = end;
    tagPattern.lastIndex = end;
  }

  output += source.slice(cursor);
  return output;
}

function tagHasAnyClass(tagSource, targets) {
  const classMatch = String(tagSource || '').match(/\bclass\s*=\s*(["'])(.*?)\1/i);
  if (!classMatch) return false;
  const classes = classMatch[2].split(/\s+/).filter(Boolean);
  return classes.some((className) => targets.has(className));
}

function findElementEnd(source, tagName, fromIndex) {
  const tagPattern = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = fromIndex;
  let depth = 1;
  let match;
  while ((match = tagPattern.exec(source)) !== null) {
    const token = match[0];
    if (/^<\//.test(token)) {
      depth -= 1;
      if (depth === 0) return tagPattern.lastIndex;
    } else if (!/\/>$/.test(token)) {
      depth += 1;
    }
  }
  return source.length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractExportDocument(html) {
  const match = String(html || '').match(/<main\b[^>]*class=["'][^"']*\bexport-document\b[^"']*["'][^>]*>([\s\S]*?)<\/main>/i);
  if (match) return match[1];

  const bodyMatch = String(html || '').match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : String(html || '');
}

function tableHtmlToMarkdown(tableHtml) {
  const rows = [...String(tableHtml || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(([, rowHtml]) => [...rowHtml.matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)]
      .map(([, cellHtml]) => htmlToText(cellHtml).replace(/\|/g, '\\|')))
    .filter((cells) => cells.length);

  if (!rows.length) return '';

  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => {
    const cells = row.slice();
    while (cells.length < columnCount) cells.push('');
    return cells;
  });

  const header = normalized[0];
  const body = normalized.slice(1);
  return [
    markdownTableRow(header),
    markdownTableRow(header.map(() => '---')),
    ...body.map(markdownTableRow),
  ].join('\n');
}

function markdownTableRow(cells) {
  return `| ${cells.join(' | ')} |`;
}

function htmlToInlineMarkdown(html) {
  return htmlToText(String(html || '')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag, body) => `**${htmlToText(body)}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag, body) => `_${htmlToText(body)}_`));
}

function htmlToText(html) {
  return decodeHtmlEntities(String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim());
}

function normalizeMarkdown(markdown) {
  return String(markdown || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, number) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

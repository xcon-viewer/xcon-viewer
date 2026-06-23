import { collectDemoFences, getStreamState } from '/xcon-demo-runtime.mjs';

const SKETCH_LANGS = new Set(['xcon-sketch', 'xcon', 'sketch']);

export function createInlineSketchRenderer({ parseBySyntax, render } = {}) {
  if (typeof parseBySyntax !== 'function') {
    throw new TypeError('parseBySyntax dependency is required.');
  }
  if (typeof render !== 'function') {
    throw new TypeError('render dependency is required.');
  }

  let lastStreamingSketchSource = '';

  function renderMarkdownWithInlineSketch(markdown, showCaret = false) {
    const source = String(markdown || '');
    const fences = collectDemoFences(source);
    let html = '';
    let cursor = 0;
    let previewIndex = 0;

    for (const fence of fences) {
      html += renderMarkdownBlock(source.slice(cursor, fence.start));
      if (SKETCH_LANGS.has(fence.lang)) {
        html += `<div class="inline-xcon-preview" data-preview-index="${previewIndex}"></div>`;
        previewIndex += 1;
      } else {
        html += `<pre><code>${escapeHtml(fence.content)}</code></pre>`;
      }
      cursor = fence.end;
    }

    const tail = source.slice(cursor);
    const streamState = getStreamState(source);
    if (streamState.sketchStarted && !streamState.sketchComplete) {
      const openSketchIndex = findOpenSketchFenceIndex(tail);
      html += renderMarkdownBlock(openSketchIndex >= 0 ? tail.slice(0, openSketchIndex) : tail);
      html += '<div class="inline-xcon-preview" data-streaming-preview="true"><div class="inline-xcon-waiting">SKETCH block is streaming...</div></div>';
    } else {
      html += renderMarkdownBlock(tail);
    }

    if (showCaret) html += '<span class="typing-caret" aria-hidden="true"></span>';
    return html;
  }

  function mountInlineSketchPreviews(root, markdown) {
    const sources = extractCompletedSketchSources(markdown);
    root.querySelectorAll('[data-preview-index]').forEach((node) => {
      const source = sources[Number(node.dataset.previewIndex)];
      if (!source) return;
      try {
        const documentModel = parseBySyntax(source, 'sketch');
        node.innerHTML = '';
        render(documentModel, node, { allowExternalResources: true, allowHtml: false });
      } catch (error) {
        node.innerHTML = `<div class="inline-xcon-error">SKETCH render error: ${escapeHtml(error?.message || error)}</div>`;
      }
    });
  }

  function mountStreamingSketchPreview(root, markdown) {
    const node = root.querySelector('[data-streaming-preview="true"]');
    if (!node) return;
    const streamState = getStreamState(markdown);
    const source = streamState.sketchStarted && !streamState.sketchComplete ? streamState.partialSketch : '';
    if (!source.trim()) return;
    renderBestEffortSketchPreview(node, source);
  }

  function renderStreamingMarkdownFrame(root, markdown, showCaret = false) {
    if (!root) return;
    const source = String(markdown || '');
    const streamState = getStreamState(source);

    if (!streamState.sketchStarted || streamState.sketchComplete) {
      delete root.dataset.xconStreamingSketch;
      root.innerHTML = renderMarkdownWithInlineSketch(source, showCaret);
      mountInlineSketchPreviews(root, source);
      return;
    }

    const hasStablePreview = root.dataset.xconStreamingSketch === 'true'
      && root.querySelector('[data-streaming-preview="true"]');
    if (!hasStablePreview) {
      root.innerHTML = renderMarkdownWithInlineSketch(source, showCaret);
      root.dataset.xconStreamingSketch = 'true';
    }

    mountStreamingSketchPreview(root, source);
  }

  function renderBestEffortSketchPreview(node, source) {
    const sketch = findRenderableSketchSource(source);
    if (!sketch) {
      if (lastStreamingSketchSource) return;
      node.innerHTML = '<div class="inline-xcon-waiting">Waiting for a valid screen line...</div>';
      return;
    }
    if (node.dataset.renderedSketchSource === sketch) return;
    try {
      const documentModel = parseBySyntax(sketch, 'sketch');
      node.innerHTML = '<div class="streaming-preview-label">Live partial preview</div><div data-streaming-preview-body></div>';
      render(documentModel, node.querySelector('[data-streaming-preview-body]'), {
        allowExternalResources: true,
        allowHtml: false
      });
      lastStreamingSketchSource = sketch;
      node.dataset.renderedSketchSource = sketch;
    } catch (error) {
      node.innerHTML = `<div class="inline-xcon-error">Partial render error: ${escapeHtml(error?.message || error)}</div>`;
    }
  }

  function resetStreamingSketchPreview() {
    lastStreamingSketchSource = '';
  }

  function findRenderableSketchSource(source) {
    let lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
    const startIndex = lines.findIndex((line) => /^\s*screen\b/i.test(line));
    if (startIndex < 0) return '';
    lines = lines.slice(startIndex);
    while (lines.length && !lines.at(-1).trim()) lines.pop();

    for (let end = lines.length; end >= 1; end -= 1) {
      const candidate = lines.slice(0, end).join('\n').trimEnd();
      if (!candidate) continue;
      try {
        parseBySyntax(candidate, 'sketch');
        return candidate;
      } catch {
        // Keep trimming the partially streamed block until the parser can render it.
      }
    }
    return '';
  }

  return {
    escapeHtml,
    mountInlineSketchPreviews,
    mountStreamingSketchPreview,
    renderInlineMarkdown,
    renderMarkdownBlock,
    renderStreamingMarkdownFrame,
    renderMarkdownWithInlineSketch,
    resetStreamingSketchPreview
  };
}

export function extractCompletedSketchSources(markdown) {
  return collectDemoFences(markdown)
    .filter((fence) => SKETCH_LANGS.has(fence.lang))
    .map((fence) => fence.content.trim());
}

export function findBestEffortSketchSource(source) {
  let lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
  const startIndex = lines.findIndex((line) => /^\s*screen\b/i.test(line));
  if (startIndex < 0) return '';
  lines = lines.slice(startIndex);
  while (lines.length && !lines.at(-1).trim()) lines.pop();

  for (let end = lines.length; end >= 1; end -= 1) {
    const candidate = lines.slice(0, end).join('\n').trimEnd();
    if (!candidate) continue;
    return candidate;
  }
  return '';
}

export function renderMarkdownBlock(markdown) {
  return String(markdown || '')
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block) => {
      const text = block.trim();
      if (!text) return '';
      if (text.startsWith('## ')) return `<h2>${renderInlineMarkdown(text.slice(3))}</h2>`;
      if (text.startsWith('### ')) return `<h3>${renderInlineMarkdown(text.slice(4))}</h3>`;
      if (text.startsWith('- ')) {
        const items = text.split('\n').map((line) => line.replace(/^[-*]\s+/, '').trim());
        return `<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`;
      }
      return `<p>${renderInlineMarkdown(text).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

export function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findOpenSketchFenceIndex(text) {
  const match = String(text || '').match(/```(?:xcon-sketch|xcon|sketch)\s*\n/i);
  return match && typeof match.index === 'number' ? match.index : -1;
}

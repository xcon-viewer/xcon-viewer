import { existsSync, statSync } from 'node:fs';
import { extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const markdownViewerFile = 'site/markdown-viewer.html';

export const publicRoutes = [
  { path: '/', file: 'site/index.html' },
  { path: '/docs', file: 'site/docs.html' },
  { path: '/spec', file: 'site/spec.html' },
  { path: '/examples', file: 'site/examples.html' },
  { path: '/play', file: 'playground/index.html' },
  { path: '/template-lab', file: 'site/template-lab.html' },
  { path: '/meta-lab', file: 'site/meta-lab.html' },
  { path: '/chatgpt-simulation', file: 'site/chatgpt-simulation.html' },
  { path: '/chatgpt-markdown-sketch-simulation', file: 'site/chatgpt-markdown-sketch-simulation.html' },
  { path: '/html-css-simulation', file: 'site/html-css-simulation.html' },
  { path: '/api', file: 'site/api.html' },
  { path: '/security', file: 'site/security.html' },
  { path: '/history', file: 'site/history.html' },
  { path: '/faq', file: 'site/faq.html' },
  { path: '/llms.txt', file: 'site/llms.txt' },
  { path: '/llms-full.txt', file: 'site/llms-full.txt' },
  { path: '/sitemap.xml', file: 'site/sitemap.xml' },
  { path: '/xcon.schema.json', file: 'schema/xcon.schema.json' },
];

const extraRoutes = [
  { path: '/play/markdown', file: 'playground/markdown.html' },
  { path: '/play/sketch', file: 'playground/sketch.html' },
  { path: '/robots.txt', file: 'site/robots.txt' },
  { path: '/styles.css', file: 'site/styles.css' },
  { path: '/xcon-demo-runtime.mjs', file: 'tools/xcon-workflow-runner/src/demo-runtime.mjs' },
  { path: '/xcon-demo-renderer.mjs', file: 'site/xcon-demo-renderer.mjs' },
  { path: '/xcon-embed.css', file: 'site/xcon-embed.css' },
  { path: '/xcon-embed.js', file: 'site/xcon-embed.js' },
  { path: '/vendor/markdown-it/markdown-it.min.js', file: 'node_modules/markdown-it/dist/markdown-it.min.js' },
  { path: '/xcon-viewer-viral-demo-no-site-header.html', file: 'site/xcon-viewer-viral-demo-no-site-header.html' },
  { path: '/chatgpt-viral-demo-v2.html', file: 'site/chatgpt-viral-demo-v2.html' },
  { path: '/claude-markdown-sketch-demo.html', file: 'site/claude-markdown-sketch-demo.html' },
];

const routeByPath = new Map([...publicRoutes, ...extraRoutes].map((route) => [route.path, route]));

export const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.sketch': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.xcon': 'text/plain; charset=utf-8',
  '.xconj': 'application/json; charset=utf-8',
  '.xcons': 'text/plain; charset=utf-8',
  '.xcont': 'text/plain; charset=utf-8',
  '.xconx': 'application/xml; charset=utf-8',
};

export function resolvePublicPath(pathname) {
  const publicPath = normalizePublicPath(pathname);
  const route = routeByPath.get(publicPath);
  if (route) return resolve(rootDir, route.file);

  const fallback = resolve(rootDir, normalize(publicPath).replace(/^[/\\]+/, ''));
  const filePath = resolveDirectoryIndex(fallback);
  if (!isInsideRoot(filePath) || !existsSync(filePath) || !statSync(filePath).isFile()) return null;
  return filePath;
}

export function contentTypeForPath(filePath) {
  return mimeTypes[extname(filePath)] || 'application/octet-stream';
}

export function resolveMarkdownViewerPath() {
  return resolve(rootDir, markdownViewerFile);
}

export function shouldServeMarkdownViewer(pathname, searchParams = new URLSearchParams(), acceptHeader = '') {
  if (searchParams.get('raw') === '1') return false;
  const filePath = resolvePublicPath(pathname);
  if (!filePath || extname(filePath) !== '.md') return false;

  const accept = String(acceptHeader || '');
  return accept.includes('text/html') || accept.includes('application/xhtml+xml');
}

function normalizePublicPath(pathname) {
  const rawPath = pathname || '/';
  const withLeadingSlash = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : '/';
}

function resolveDirectoryIndex(filePath) {
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    const indexPath = resolve(filePath, 'index.html');
    if (existsSync(indexPath) && statSync(indexPath).isFile()) return indexPath;
    const readmePath = resolve(filePath, 'README.md');
    if (existsSync(readmePath) && statSync(readmePath).isFile()) return readmePath;
  }
  return filePath;
}

function isInsideRoot(filePath) {
  return filePath === rootDir || filePath.startsWith(`${rootDir}${sep}`);
}

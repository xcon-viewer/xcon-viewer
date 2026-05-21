import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import {
  contentTypeForPath,
  resolveMarkdownViewerPath,
  resolvePublicPath,
  shouldServeMarkdownViewer,
} from './site-routes.mjs';

const port = Number(process.env.PORT || process.argv[2] || 4173);

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const filePath = resolvePublicPath(pathname);

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const responsePath = shouldServeMarkdownViewer(pathname, url.searchParams, request.headers.accept || '')
    ? resolveMarkdownViewerPath()
    : filePath;

  if (!existsSync(responsePath) || !statSync(responsePath).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': contentTypeForPath(responsePath),
    'cache-control': 'no-store',
  });
  createReadStream(responsePath).pipe(response);
}).listen(port, () => {
  console.log(`XCON public site: http://localhost:${port}/`);
  console.log(`XCON Playground: http://localhost:${port}/play`);
});

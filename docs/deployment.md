# XCON Viewer Deployment Guide

This guide covers the public `xconviewer.dev` release flow for the static site and npm packages. The public release is viewer-only: it ships documentation, examples, the playground, the Markdown viewer, the public schema, and viewer packages.

## Release Checklist

Run these commands from the repository root:

```bash
npm ci
npm run build
npm run typecheck
npm run test:public
npm run site:build
```

The deployable static site is written to `dist-site/`.

## Static Site Bundle

`npm run site:build` copies only the public site files listed in [deployment-files.md](./deployment-files.md). The bundle excludes working folders and private design material. Use `dist-site/` as the nginx document root.

Suggested server path:

```bash
/var/www/xconviewer.dev/releases/2026-05-19/
/var/www/xconviewer.dev/current -> /var/www/xconviewer.dev/releases/2026-05-19/
```

Deploy:

```bash
sudo mkdir -p /var/www/xconviewer.dev/releases
sudo rsync -a --delete dist-site/ /var/www/xconviewer.dev/releases/2026-05-19/
sudo ln -sfn /var/www/xconviewer.dev/releases/2026-05-19 /var/www/xconviewer.dev/current
sudo nginx -t
sudo systemctl reload nginx
```

Rollback:

```bash
sudo ln -sfn /var/www/xconviewer.dev/releases/<previous-release> /var/www/xconviewer.dev/current
sudo nginx -t
sudo systemctl reload nginx
```

## Ubuntu and nginx Setup

Install nginx:

```bash
sudo apt update
sudo apt install -y nginx
```

Copy the provided config:

```bash
sudo cp deploy/nginx/xconviewer.dev.conf /etc/nginx/sites-available/xconviewer.dev
sudo ln -sfn /etc/nginx/sites-available/xconviewer.dev /etc/nginx/sites-enabled/xconviewer.dev
sudo nginx -t
sudo systemctl reload nginx
```

TLS with Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d xconviewer.dev -d www.xconviewer.dev
```

The nginx config uses extensionless routes, for example `/docs` -> `docs.html`, and routes browser Markdown requests through `markdown-viewer.html`. Raw Markdown remains available through `?raw=1`.

## Companion Tool Subpaths

Sibling projects can be deployed below the same domain without changing the XCON Viewer bundle:

- `https://xconviewer.dev/xcon-chain/`
- `https://xconviewer.dev/xcon-workflow/`

Copy each sibling project's static bundle into a subdirectory under the nginx document root:

```bash
sudo rsync -a --delete <path-to-xcon-chain>/dist-site/ /var/www/html/xcon-chain/
sudo rsync -a --delete <path-to-xcon-workflow>/dist-site/ /var/www/html/xcon-workflow/
```

The nginx config must route these directories before the global Markdown rewrite rule. This is important because the companion playgrounds may fetch their own `.md` fixture files as raw text:

```nginx
location = /xcon-chain {
  return 301 /xcon-chain/;
}

location ^~ /xcon-chain/ {
  root /var/www/html;
  index index.html;
  add_header Cache-Control "public, max-age=300" always;
  try_files $uri $uri/ $uri/index.html =404;
}

location = /xcon-workflow {
  return 301 /xcon-workflow/;
}

location ^~ /xcon-workflow/ {
  root /var/www/html;
  index index.html;
  add_header Cache-Control "public, max-age=300" always;
  try_files $uri $uri/ $uri/index.html =404;
}
```

Place these blocks before `location ~ \.md$`.

## npm Package Publishing

> For a detailed, step-by-step GitHub + npm release process (including preflight checks, publish order, tag + release flow, and post-release verification), see:
> [`docs/release-and-publishing.md`](./release-and-publishing.md).

Packages must be published in dependency order:

1. `@xcon-viewer/core`
2. `@xcon-viewer/viewer`
3. `@xcon-viewer/cli`
4. `@xcon-viewer/document-importer`
5. `@xcon-viewer/react`
6. `@xcon-viewer/vue`
7. `@xcon-viewer/markdown-it`
8. `@xcon-viewer/remark`
9. `@xcon-viewer/vite-plugin`
10. `@xcon-viewer/github-action`

Before publishing, update every package version and internal dependency version consistently.

### Advanced visualization dependency audit

`@xcon-viewer/viewer` now owns the browser runtime dependencies for the public advanced visualization surface:

- `d3` for `networkDiagram`
- `d3-hierarchy` for `treemap` and `sunburst`
- `d3-sankey` for `sankey`
- `d3-force` for `forceGraph`
- `d3-chord` for `chord`
- `@observablehq/plot` for `plot`

Confirm they are installed and publishable from the viewer workspace:

```bash
npm ls d3 d3-hierarchy d3-sankey d3-force d3-chord @observablehq/plot --workspace @xcon-viewer/viewer
```

Leaflet map hydration is intentionally not bundled as an npm dependency. It is loaded from viewer-controlled CDN URLs only when `provider "leaflet"` is used and external resources are allowed. Optional `leaflet.heat` and `leaflet.markercluster` plugins load only for heatmap and clustering layers; static map fallback remains available if those resources fail.

After dependency or viewer runtime changes, regenerate the browser test bundles before site packaging:

```bash
npx esbuild site/advanced-visualization-test-entry.mjs --bundle --format=esm --platform=browser --outfile=site/advanced-visualization-test-runtime.js
npx esbuild site/network-diagram-test-entry.mjs --bundle --format=esm --platform=browser --outfile=site/network-diagram-test-runtime.js
```

### Preflight for npm access

- Confirm npm user + registry:

```bash
npm whoami
npm config get registry
```

- Ensure tokens / 2FA are ready before release:

```bash
npm token list
```

Dry-run package contents:

```bash
npm pack --workspace @xcon-viewer/core --dry-run
npm pack --workspace @xcon-viewer/viewer --dry-run
npm pack --workspace @xcon-viewer/cli --dry-run
npm pack --workspace @xcon-viewer/document-importer --dry-run
npm pack --workspace @xcon-viewer/react --dry-run
npm pack --workspace @xcon-viewer/vue --dry-run
npm pack --workspace @xcon-viewer/markdown-it --dry-run
npm pack --workspace @xcon-viewer/remark --dry-run
npm pack --workspace @xcon-viewer/vite-plugin --dry-run
npm pack --workspace @xcon-viewer/github-action --dry-run
```

Publish:

```bash
npm login
npm publish --workspace @xcon-viewer/core --access public
npm publish --workspace @xcon-viewer/viewer --access public
npm publish --workspace @xcon-viewer/cli --access public
npm publish --workspace @xcon-viewer/document-importer --access public
npm publish --workspace @xcon-viewer/react --access public
npm publish --workspace @xcon-viewer/vue --access public
npm publish --workspace @xcon-viewer/markdown-it --access public
npm publish --workspace @xcon-viewer/remark --access public
npm publish --workspace @xcon-viewer/vite-plugin --access public
npm publish --workspace @xcon-viewer/github-action --access public
```

Post-publish smoke test:

```bash
mkdir /tmp/xcon-viewer-smoke
cd /tmp/xcon-viewer-smoke
npm init -y
npm install @xcon-viewer/core @xcon-viewer/viewer @xcon-viewer/cli
npx xcon validate <path-to-repo>/examples/hello/hello.xcon.json
```

GitHub does not publish npm artifacts automatically on git tags. Use it only as an additional release record.

### Recommended End-to-End Release Runbook

1) Release prep

```bash
git checkout main
git pull origin main
npm ci
npm run typecheck
```

2) Confirm version and dependency consistency

```bash
npm run test:public
npm run site:build
node -e "console.log(require('./package.json').version)"
```

3) Verify all workspace versions are aligned (expected: `0.2.1`)

```bash
node -e "const fs=require('fs');const path=require('path');const root=JSON.parse(fs.readFileSync('package.json','utf8')).version;const dirs=fs.readdirSync('packages',{withFileTypes:true}).filter(d=>d.isDirectory());const versions=dirs.map(d=>({name:d.name,version:JSON.parse(fs.readFileSync(path.join('packages',d.name,'package.json'),'utf8')).version}));console.log('root',root);console.log('packages',versions);if(!versions.every(v=>v.version===root)){process.exitCode=1;}"
```

For strict review, confirm each `packages/*/package.json` and internal dependency uses `0.2.1`.

4) npm publish flow

```bash
npm login
npm publish --workspace @xcon-viewer/core --access public
npm publish --workspace @xcon-viewer/viewer --access public
npm publish --workspace @xcon-viewer/cli --access public
npm publish --workspace @xcon-viewer/document-importer --access public
npm publish --workspace @xcon-viewer/react --access public
npm publish --workspace @xcon-viewer/vue --access public
npm publish --workspace @xcon-viewer/markdown-it --access public
npm publish --workspace @xcon-viewer/remark --access public
npm publish --workspace @xcon-viewer/vite-plugin --access public
npm publish --workspace @xcon-viewer/github-action --access public
```

5) Tag and publish release

```bash
git add package.json package-lock.json packages/*/package.json README.md docs/deployment.md docs/integrations.md site/api.html CHANGELOG.md
git commit -m "chore: bump to 0.2.1 and refresh release docs"
git tag v0.2.1
git push origin main --follow-tags
```

If this release jumps patch versions (for example `0.1.2 -> 0.2.0`), keep the jump explicit in `CHANGELOG.md` and do not create intermediate release tags.

6) Post-release validation (npm + deployment)

```bash
npm view @xcon-viewer/core@0.2.1 version
npm view @xcon-viewer/viewer@0.2.1 version
npm view @xcon-viewer/github-action@0.2.1 version
curl -I https://xconviewer.dev/
curl -I https://xconviewer.dev/play
curl -I https://xconviewer.dev/play/markdown
curl -I https://xconviewer.dev/xcon.schema.json
```

## GitHub Release Flow

After npm publish succeeds, create a GitHub release/tag for humans:

```bash
git tag v0.2.1
git push origin v0.2.1

gh release create v0.2.1 \
  --repo xcon-viewer/xcon-viewer \
  --title "xcon-viewer v0.2.1" \
  --notes "Release note summary is in CHANGELOG.md (0.2.1)."
```

For Marketplace users, keep the action example in `packages/github-action/README.md` aligned to the release tag (`v0.2.1`).

## GitHub Action Release Notes

`@xcon-viewer/github-action` includes `action.yml` in its npm package. For GitHub Marketplace-style usage, also tag the repository release, for example:

```bash
git tag v0.2.1
git push origin v0.2.1
```

If the action is referenced by path inside this repository, keep the README examples aligned with the tag or branch name.

## Production Checks

After deployment:

```bash
curl -I https://xconviewer.dev/
curl -I https://xconviewer.dev/docs
curl -I https://xconviewer.dev/play
curl -I https://xconviewer.dev/play/markdown
curl -I https://xconviewer.dev/xcon-chain/
curl -I https://xconviewer.dev/xcon-chain/playground/
curl -I https://xconviewer.dev/xcon-workflow/
curl -I https://xconviewer.dev/xcon-workflow/playground/
curl -I https://xconviewer.dev/xcon.schema.json
curl -I https://xconviewer.dev/spec/xcon-json-syntax.md
curl -I 'https://xconviewer.dev/spec/xcon-json-syntax.md?raw=1'
```

Expected:

- HTML routes return `200` and `text/html`.
- `/xcon.schema.json` returns `application/json`.
- Markdown routes without `raw=1` return the Markdown viewer.
- Markdown routes with `raw=1` return Markdown source.
- `/xcon-chain/` and `/xcon-workflow/` return each companion static site.
- `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, and `/robots.txt` are reachable.



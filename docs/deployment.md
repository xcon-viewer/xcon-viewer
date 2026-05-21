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

## npm Package Publishing

Packages must be published in dependency order:

1. `@xcon-viewer/core`
2. `@xcon-viewer/viewer`
3. `@xcon-viewer/cli`
4. `@xcon-viewer/react`
5. `@xcon-viewer/vue`
6. `@xcon-viewer/markdown-it`
7. `@xcon-viewer/remark`
8. `@xcon-viewer/vite-plugin`
9. `@xcon-viewer/github-action`

Before publishing, update every package version and internal dependency version consistently.

Dry-run package contents:

```bash
npm pack --workspace @xcon-viewer/core --dry-run
npm pack --workspace @xcon-viewer/viewer --dry-run
npm pack --workspace @xcon-viewer/cli --dry-run
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

## GitHub Action Release Notes

`@xcon-viewer/github-action` includes `action.yml` in its npm package. For GitHub Marketplace-style usage, also tag the repository release, for example:

```bash
git tag v0.1.0
git push origin v0.1.0
```

If the action is referenced by path inside this repository, keep the README examples aligned with the tag or branch name.

## Production Checks

After deployment:

```bash
curl -I https://xconviewer.dev/
curl -I https://xconviewer.dev/docs
curl -I https://xconviewer.dev/play
curl -I https://xconviewer.dev/play/markdown
curl -I https://xconviewer.dev/xcon.schema.json
curl -I https://xconviewer.dev/spec/xcon-json-syntax.md
curl -I 'https://xconviewer.dev/spec/xcon-json-syntax.md?raw=1'
```

Expected:

- HTML routes return `200` and `text/html`.
- `/xcon.schema.json` returns `application/json`.
- Markdown routes without `raw=1` return the Markdown viewer.
- Markdown routes with `raw=1` return Markdown source.
- `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, and `/robots.txt` are reachable.

# Release & Publishing Guide (GitHub + npm)

Last updated: 2026-06-03

This guide is the canonical process for publishing the XCON Viewer monorepo.

## 0) Pre-release version plan

1. Determine target version (example: `0.2.0`).
2. Confirm all workspace packages use the same version number.
3. Confirm `package-lock.json` root and workspace metadata are consistent with that version.
4. Decide what changed vs previous release and prepare `CHANGELOG.md` entry.
5. If target version skips one or more patch levels (e.g. `0.1.2 -> 0.2.0`), this is allowed. Add an explicit changelog note describing what was merged into the target version.

## 1) Version sync verification

Run:

```bash
npm --version
node --version
npm ls -ws --depth=0
node -e "const fs = require('fs'); const root = JSON.parse(fs.readFileSync('package.json','utf8')).version; const pkgs = require('./package-lock.json').packages || {}; const list = Object.entries(pkgs).filter(([k,v])=>k.startsWith('node_modules/@xcon-viewer/') || k===''); console.log('root', root);"
```

Validation checklist:

- Root package version is `0.2.0`.
- All workspace package versions under `packages/*/package.json` are `0.2.0`.
- Internal package dependencies (for inter-package imports) reference `0.2.0`.
- If any patch versions were skipped before this release, ensure the changelog entry describes the skip and that the first published version is the same across all packages.

## 2) Build + test + site build

From repo root:

```bash
npm ci
npm run typecheck
npm run test:public
npm run build
npm run site:build
```

Advanced visualization dependency check:

```bash
npm ls d3 d3-hierarchy d3-sankey d3-force d3-chord @observablehq/plot --workspace @xcon-viewer/viewer
```

`@xcon-viewer/viewer` must publish these runtime dependencies because the public advanced visualization components hydrate in the browser:

- `d3` for `networkDiagram`
- `d3-hierarchy` for `treemap` and `sunburst`
- `d3-sankey` for `sankey`
- `d3-force` for `forceGraph`
- `d3-chord` for `chord`
- `@observablehq/plot` for `plot`

The type-only development dependencies are `@types/d3` and `@types/d3-sankey`.

The map renderer is different: Leaflet is not bundled as an npm runtime dependency. `provider "leaflet"` loads Leaflet from viewer-controlled CDN URLs only when external resources are allowed. The optional `leaflet.heat` and `leaflet.markercluster` browser plugins are loaded only for heatmap and clustering layers, and failure falls back to the static map preview.

When viewer runtime source or visualization dependencies change, regenerate the checked-in browser test bundles after `npm ci` / `npm install`:

```bash
npx esbuild site/advanced-visualization-test-entry.mjs --bundle --format=esm --platform=browser --outfile=site/advanced-visualization-test-runtime.js
npx esbuild site/network-diagram-test-entry.mjs --bundle --format=esm --platform=browser --outfile=site/network-diagram-test-runtime.js
```

Then rerun the focused site checks:

```bash
npx vitest run scripts/site-structure.test.mjs -t "advanced visualization Sprint 3|advanced visualization test page|standalone network diagram|ESM modules"
```

If `test:public` or `build` fails:

- fix issues first;
- do not proceed to publish until all checks are green.

## 3) GitHub release preparation

Make sure git and branch state is clean and up to date:

```bash
git status --short
git pull --rebase origin main
git log -1 --oneline
```

Stage only release artifacts:

```bash
git add \
  package.json \
  package-lock.json \
  packages/*/package.json \
  CHANGELOG.md \
  README.md \
  docs/deployment.md \
  docs/integrations.md \
  site/api.html \
  packages/github-action/README.md \
  docs/release-and-publishing.md
```

Commit and tag:

```bash
git commit -m "chore: release v0.2.0"
git tag v0.2.0
```

## 4) npm publish order

Publish packages in dependency order:

1. `@xcon-viewer/core`
2. `@xcon-viewer/viewer`
3. `@xcon-viewer/cli`
4. `@xcon-viewer/document-importer` (if it depends on viewer/core changes)
5. `@xcon-viewer/react`
6. `@xcon-viewer/vue`
7. `@xcon-viewer/markdown-it`
8. `@xcon-viewer/remark`
9. `@xcon-viewer/vite-plugin`
10. `@xcon-viewer/github-action`

Publish commands:

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

Dry-run check before publish:

```bash
npm pack --workspace @xcon-viewer/core --dry-run
npm pack --workspace @xcon-viewer/viewer --dry-run
```

Post-publish verification:

```bash
npm view @xcon-viewer/core@0.2.0 version
npm view @xcon-viewer/viewer@0.2.0 version
npm view @xcon-viewer/github-action@0.2.0 version
```

## 5) GitHub release publishing

After successful npm publish:

```bash
git push origin main --follow-tags
gh release create v0.2.0 --title "xcon-viewer v0.2.0" --notes "Release note summary is in CHANGELOG.md (0.2.0)."
```

If `gh` is not configured, use GitHub UI to create a Release attached to tag `v0.2.0`.

## 6) Public static site deployment

1. Build site artifact:

```bash
npm run site:build
```

2. Copy generated `dist-site/` contents into document root and reload nginx.

3. Validate:

```bash
curl -I https://xconviewer.dev/
curl -I https://xconviewer.dev/play
curl -I https://xconviewer.dev/api
curl -I https://xconviewer.dev/play/markdown
curl -I https://xconviewer.dev/xcon.schema.json
```

## 7) Rollback guide (npm)

If package-level emergency rollback is required:

- Unpublish only within npm allowed window:

```bash
npm unpublish @xcon-viewer/<package>@<version>
```

Prefer normal release pinning by restoring previous tags in consumers when possible.

## 8) Troubleshooting

- If `package-lock.json` root version differs from workspace root `package.json`, patch lockfile manually and re-run `npm ci`/`npm install --package-lock-only`.
- If npm access fails with 403, verify npm owner/admin privileges and scope ownership for `@xcon-viewer`.
- If publishing fails due to OTP, complete interactive 2FA session and retry with correct one-time token.

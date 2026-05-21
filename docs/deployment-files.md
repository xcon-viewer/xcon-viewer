# XCON Viewer Deployment File Inventory

This inventory lists the files that belong in the public `xconviewer.dev` static site bundle. Working folders, design drafts, local experiments, and internal development documents are intentionally excluded.

Generate the bundle with:

```bash
npm ci
npm run build
npm run site:build
```

The resulting `dist-site/` directory is the deployable artifact.

## Root Site Files

| Source | Bundle path | Purpose |
|---|---|---|
| `site/index.html` | `index.html` | Home page |
| `site/docs.html` | `docs.html` | Documentation index |
| `site/spec.html` | `spec.html` | Spec index |
| `site/examples.html` | `examples.html` | Examples index |
| `site/api.html` | `api.html` | API/package index |
| `site/security.html` | `security.html` | Security boundary |
| `site/history.html` | `history.html` | Reserved history page |
| `site/faq.html` | `faq.html` | FAQ |
| `site/markdown-viewer.html` | `markdown-viewer.html` | Read-only Markdown viewer |
| `site/styles.css` | `styles.css` | Site stylesheet |
| `site/robots.txt` | `robots.txt` | Crawler policy |
| `site/sitemap.xml` | `sitemap.xml` | Search discovery |
| `site/llms.txt` | `llms.txt` | Short LLM guide |
| `site/llms-full.txt` | `llms-full.txt` | Full LLM guide |
| `schema/xcon.schema.json` | `xcon.schema.json` | Public JSON Schema |

## Playground Files

| Source | Bundle path | Purpose |
|---|---|---|
| `playground/index.html` | `play/index.html` | JSON/XML/TAGLESS/SKETCH playground |
| `playground/markdown.html` | `play/markdown.html` | Markdown + XCON playground |
| `playground/sketch.html` | `play/sketch.html` | Dedicated XCON/SKETCH live editor with showcase presets |

The playground uses built ESM files from:

- `packages/core/dist`
- `packages/viewer/dist`
- `packages/markdown-it/dist`
- `vendor/markdown-it/markdown-it.min.js` copied from the pinned `markdown-it` package

## Public Markdown Documentation

| Source | Purpose |
|---|---|
| `docs/README.md` | Documentation map |
| `docs/xcon-component-specs.en.md` | English component reference |
| `docs/integrations.md` | Framework, Markdown, Vite, and GitHub integration guide |
| `docs/public-site.md` | Public route structure |
| `docs/deployment.md` | Deployment and publishing guide |
| `docs/deployment-files.md` | This inventory |
| `spec/README.md` | Format spec map |
| `spec/xcon-object-model.md` | Object Model |
| `spec/xcon-json-syntax.md` | XCON/JSON |
| `spec/xcon-xml-syntax.md` | XCON/XML |
| `spec/xcon-tagless-syntax.md` | XCON/TAGLESS |
| `spec/xcon-tagless-markers.md` | Marker rules |
| `spec/xcon-sketch-syntax.md` | XCON/SKETCH |
| `spec/security-model.md` | Security boundary |

## Examples

The public bundle includes `examples/` so documentation links can open example README and XCON files directly.

Expected example file families:

- `*.xcon.json`
- `*.xcon.xml`
- `*.xcon`
- optional `*.xcon.sketch`
- `README.md`

`examples/showcase/` contains public compatibility fixtures copied from the viewer showcase. User-defined component extension fixtures are intentionally excluded from the public bundle.

## Explicit Exclusions

Do not deploy:

- working draft directories
- temporary local work directories
- development-planning notes
- non-English or internal component-spec drafts
- internal sketch/action notes
- non-English sketch syntax drafts
- package `src/`, tests, TypeScript configs, local build configs, and repository maintenance scripts
- `node_modules/`

# XCON Viewer Public Site

The public site is designed around stable path-based URLs. Each route has a working baseline page or machine-readable file so the site can grow section by section without breaking public links.

## Canonical Routes

| Route | Source | Purpose |
|---|---|---|
| `/` | `site/index.html` | Product entry point |
| `/docs` | `site/docs.html` | Documentation index |
| `/spec` | `site/spec.html` | Format specification index |
| `/examples` | `site/examples.html` | Example gallery index |
| `/play` | `playground/index.html` | Live editor |
| `/play/markdown` | `playground/markdown.html` | Markdown and XCON fence playground |
| `/play/sketch` | `playground/sketch.html` | Dedicated XCON/SKETCH live editor |
| `/xcon-chain/` | sibling `xcon-chain/dist-site/` | Companion expression playground |
| `/xcon-workflow/` | sibling `xcon-workflow/dist-site/` | Companion workflow playground |
| `/api` | `site/api.html` | Package and API index |
| `/security` | `site/security.html` | Viewer-only security boundary |
| `/history` | `site/history.html` | Reserved history page |
| `/faq` | `site/faq.html` | FAQ and positioning answers |
| `/llms.txt` | `site/llms.txt` | Short LLM guidance |
| `/llms-full.txt` | `site/llms-full.txt` | Full LLM guide |
| `/sitemap.xml` | `site/sitemap.xml` | Search discovery |
| `/xcon.schema.json` | `schema/xcon.schema.json` | Canonical JSON Schema |

Additional discovery route:

| Route | Source | Purpose |
|---|---|---|
| `/robots.txt` | `site/robots.txt` | Crawler policy and sitemap pointer |
| `/markdown-viewer.html` | `site/markdown-viewer.html` | Read-only Markdown viewer used for `.md` browser requests |

## Serving

Run:

```bash
npm run build
npm run playground
```

Open `http://localhost:4173/` for the public site, `http://localhost:4173/play` for the general editor, or `http://localhost:4173/play/sketch` for the dedicated SKETCH editor.

The static server uses `scripts/site-routes.mjs` as the single route table. Tests use the same table to prevent the public URL structure from drifting.

## Growth Rules

- Keep path-based URLs stable before considering subdomains.
- Keep `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, `/robots.txt`, and `/xcon.schema.json` available at the site root.
- Keep `/play` as the primary conversion and preview entry point.
- Keep companion tool routes under `/xcon-chain/` and `/xcon-workflow/`; route them before the global Markdown viewer rewrite.
- Keep generated examples in SKETCH, JSON, XML, and TAGLESS. Lead with SKETCH for compact authoring and Markdown, then JSON for canonical structure. Treat XML and TAGLESS as compatibility outputs.
- Keep public docs explicit that XCON Viewer is viewer-only and does not execute behavior.
- Prefer XCON/SKETCH in Markdown-facing examples and XCON/JSON in API/schema examples. Only foreground XML or TAGLESS when documenting compatibility, conversion, or round-trip behavior.

## Next Expansion Targets

- Render Markdown docs into HTML pages instead of linking to raw Markdown.
- Add a richer examples gallery with rendered previews and copy/open-in-play actions.
- Add API pages per package when the public API stabilizes.
- Add changelog/history entries as versions are published.

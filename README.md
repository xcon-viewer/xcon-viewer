# XCON Viewer

> The UI format built for the LLM era.

XCON lets you generate, embed, and share UI as structured documents —
no scripts, no execution, safe by design.

LLMs generate SKETCH. APIs consume JSON. Tools edit XML.
One screen, four syntaxes, one object model.

---

## Why XCON?

HTML + CSS + JS is powerful — but it's not safe to share from untrusted sources,
and it's hard for LLMs to generate consistently.

XCON was designed differently:

- **LLMs generate it well** — SKETCH syntax is close to the YAML/Markdown patterns LLMs already know
- **Safe to share** — the viewer boundary blocks all script execution by design
- **Four syntaxes, one model** — switch freely between JSON, XML, TAGLESS, and SKETCH
- **Embeds in Markdown** — drop a fenced `xcon` block anywhere

---

## One Screen. Four Syntaxes.

| Syntax | Best for |
|---|---|
| XCON/JSON | Canonical structure, APIs, schema validation, LLM generation |
| XCON/XML | UI authoring, comments, designer metadata, tooling integration |
| XCON/TAGLESS | Transport-friendly serialization and delimiter-conflict reduction |
| XCON/SKETCH | Compact Markdown authoring and LLM-generated drafts |

All four syntaxes parse into the same XCON Object Model —
so examples, conversion, validation, and rendering share one public contract.

---

## Security Model

XCON Viewer enforces a strict viewer-only boundary:

- No JavaScript execution
- No event handlers, backend calls, or business logic
- No raw HTML injection by default
- CSS filtered through an allowlist
- `javascript:` URLs blocked
- External resources blocked by default

Share UI from anyone — open it anywhere, safely.

See [spec/security-model.md](./spec/security-model.md) for details.

---

## Install

```bash
# Core parser and object model
npm install @xcon-viewer/core

# Viewer renderer
npm install @xcon-viewer/viewer

# Framework wrappers
npm install @xcon-viewer/react
npm install @xcon-viewer/vue

# Markdown integrations
npm install @xcon-viewer/markdown-it
npm install @xcon-viewer/remark

# Vite plugin
npm install @xcon-viewer/vite-plugin

# CLI
npm install -g @xcon-viewer/cli
```

---

## Quick Start

Write a screen in SKETCH:

> [View this README with live XCON previews →](https://xconviewer.dev/README.md)

```xcon
screen 360x220 bg #f8fafc
  bg @surface
  title: label "Hello XCON" at 24 24 312 36
    font 24 800
    align center
  cta: button "Get Started" at 72 142 216 44
    bg @accent
    color white
    radius 12
```

Render it in JavaScript:

```js
import { render, renderToHtml } from '@xcon-viewer/viewer';

const xconDocument = {
  type: 'form',
  pos: [0, 0, 402, 300],
  components: {
    title: {
      type: 'label',
      text: 'Hello XCON'
    }
  }
};

render(xconDocument, document.getElementById('root'));
```

Embed it in HTML:

```html
<script type="module" src="https://unpkg.com/@xcon-viewer/viewer@0.1.0/dist/web-component.js"></script>

<xcon-viewer src="./home.xcon.json"></xcon-viewer>
```

> `render()` and `<xcon-viewer>` automatically anchor positioned screens inside a viewer host.
> If you inject `renderToHtml()` output manually, wrap it in a `position: relative` frame
> sized from the document `pos`, or use `renderDocument()` for a complete standalone page.

---

## Embed in Markdown

Drop any XCON syntax into a fenced code block:

````markdown
```xcon
screen 360x220 bg #f8fafc
  title: label "Sketch in Markdown" at 20 22 320 32
    font 22 800
  cta: button "Render Preview" at 20 124 180 42
    bg #db2777
    color white
    radius 8
```
````

The `@xcon-viewer/markdown-it` and `@xcon-viewer/remark` packages render XCON fences
inline with the rest of your Markdown content.

---

## CLI

```bash
xcon validate examples/hello/hello.xcon.json
xcon convert examples/hello/hello.xcon.json --to xml
xcon convert examples/hello/hello.xcon.xml --to tagless
xcon convert examples/sketch/hello.xcon.sketch --to json
xcon render examples/hello/hello.xcon.json --out hello.html
xcon format examples/hello/hello.xcon.json
```

---

## Playground

```bash
npm run build
npm run playground
```

| URL | Description |
|---|---|
| `http://localhost:4173/play` | Live editor — edit, validate, render, convert, share, export |
| `http://localhost:4173/play/markdown` | Markdown + XCON fence playground |

---

## Packages

| Package | Description |
|---|---|
| `@xcon-viewer/core` | Object Model, JSON/XML/TAGLESS/SKETCH parser, serializer, converter, validator |
| `@xcon-viewer/viewer` | Secure viewer-only renderer and Web Component |
| `@xcon-viewer/cli` | `validate`, `convert`, `format`, and `render` commands |
| `@xcon-viewer/react` | React wrapper for the `<xcon-viewer>` Web Component |
| `@xcon-viewer/vue` | Vue wrapper for the `<xcon-viewer>` Web Component |
| `@xcon-viewer/markdown-it` | Renders `xcon` code fences in markdown-it documents |
| `@xcon-viewer/remark` | Converts `xcon` mdast code nodes to rendered HTML |
| `@xcon-viewer/vite-plugin` | Imports `.xcon`, `.xcon.xml`, `.xcon.json`, `.xcon.sketch`, `.xcons` as modules |
| `@xcon-viewer/github-action` | Validates and renders XCON Markdown code blocks in CI |

---

## Integrations

**React:**

```jsx
import { createElement } from 'react';
import { createXconViewer, defineXconViewer } from '@xcon-viewer/react';

await defineXconViewer();

const XconViewer = createXconViewer(createElement);

export function Preview() {
  return <XconViewer document={{ type: 'form' }} />;
}
```

**markdown-it:**

```js
import xconMarkdownIt from '@xcon-viewer/markdown-it';

md.use(xconMarkdownIt);
```

**Vite:**

```js
import xcon from '@xcon-viewer/vite-plugin';

export default {
  plugins: [xcon()]
};
```

**GitHub Actions:**

```yaml
- uses: xcon-viewer/xcon-viewer/packages/github-action@v0.1.0
  with:
    files: README.md,docs
    out-dir: xcon-rendered
```

---

## XCON/JSON Example

```json
{
  "type": "form",
  "pos": [0, 0, 402, 800],
  "backgroundColor": "#F8FAFC",
  "components": {
    "title": {
      "type": "label",
      "pos": [24, 32, 354, 34],
      "text": "Account",
      "font": { "size": 24, "weight": 800 },
      "color": "#111827"
    },
    "email": {
      "type": "textField",
      "pos": [24, 92, 354, 44],
      "placeholder": "Email",
      "inputType": "email",
      "bind": "user.email"
    }
  }
}
```

---

## Public Site

| URL | Purpose |
|---|---|
| `/` | Product entry point |
| `/docs` | Documentation index |
| `/spec` | Format specification index |
| `/examples` | Example gallery |
| `/play` | Live editor |
| `/play/markdown` | Markdown + XCON fence playground |
| `/api` | Package and API index |
| `/security` | Viewer-only security boundary |
| `/llms.txt` | Short LLM guide |
| `/llms-full.txt` | Full LLM guide |
| `/sitemap.xml` | Search discovery |
| `/xcon.schema.json` | JSON Schema |

---

## Documentation

- [Component specs and examples](./docs/xcon-component-specs.en.md)
- [Framework, Markdown, Vite, and GitHub integrations](./docs/integrations.md)
- [Object Model](./spec/xcon-object-model.md)
- [XCON/JSON syntax](./spec/xcon-json-syntax.md)
- [XCON/XML syntax](./spec/xcon-xml-syntax.md)
- [XCON/TAGLESS syntax](./spec/xcon-tagless-syntax.md)
- [XCON/SKETCH syntax](./spec/xcon-sketch-syntax.md)
- [Examples](./examples/)
- [Deployment guide](./docs/deployment.md)

---

## Deployment

```bash
npm ci
npm run build
npm run site:build
```

The generated `dist-site/` directory is the recommended nginx document root.
See [docs/deployment.md](./docs/deployment.md) for Ubuntu, nginx, TLS, and npm publishing steps.

---

## Contributing

This is an early release — bug reports, examples, and PRs are welcome.
Feedback shapes the spec.

---

## License

MIT

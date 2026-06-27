# XCON Integrations

XCON integrations are thin viewer-only adapters around `@xcon-viewer/core` and `@xcon-viewer/viewer`. They render or transform XCON documents, but they do not execute app logic.

## React

```bash
npm install @xcon-viewer/react @xcon-viewer/viewer
```

```tsx
import { createElement } from 'react';
import { createXconViewer, defineXconViewer } from '@xcon-viewer/react';

await defineXconViewer();

const XconViewer = createXconViewer(createElement);

export function Preview() {
  return <XconViewer document={{ type: 'form' }} />;
}
```

## Vue

```bash
npm install @xcon-viewer/vue @xcon-viewer/viewer
```

```ts
import { createXconViewerComponent, defineXconViewer } from '@xcon-viewer/vue';
import { h } from 'vue';

await defineXconViewer();

export const XconViewer = createXconViewerComponent(h);
```

## markdown-it

```bash
npm install markdown-it @xcon-viewer/markdown-it
```

```js
import MarkdownIt from 'markdown-it';
import xconMarkdownIt from '@xcon-viewer/markdown-it';

const md = new MarkdownIt({ html: false });
md.use(xconMarkdownIt, {
  containerClass: 'markdown-xcon-block',
  frameClass: 'markdown-xcon-frame',
});

const html = md.render(markdownSource);
```

Supported fences: `xcon-sketch`, `xcons`, `xcon`, `xcon-json`, `xconj`, `xcon-xml`, `xconx`, `xcon-tagless`, `xconl`, and `xcont`.

```text
screen 360x220 bg #f8fafc

title: label "XCON/SKETCH" at 24 24 312 36
  font 24 800
  align center

cta: button "Render Preview" at 72 142 216 44
  bg #db2777
  color white
  radius 12
```

```xcon-sketch
screen 360x220 bg #f8fafc

title: label "XCON/SKETCH" at 24 24 312 36
  font 24 800
  align center

cta: button "Render Preview" at 72 142 216 44
  bg #db2777
  color white
  radius 12
```

## remark

```bash
npm install @xcon-viewer/remark
```

```js
import remarkXcon from '@xcon-viewer/remark';

processor.use(remarkXcon);
```

The plugin converts supported XCON code nodes to HTML nodes containing rendered viewer markup.

## Vite

```bash
npm install @xcon-viewer/vite-plugin
```

```js
import xcon from '@xcon-viewer/vite-plugin';

export default {
  plugins: [xcon()]
};
```

```ts
import document, { source, html } from './screen.xcon.json';
```

The plugin supports `.xcon.sketch`, `.xcons`, `.xcon.json`, `.xcon.xml`, `.xcon`, and TAGLESS marker aliases.

## GitHub Action

```yaml
steps:
  - uses: actions/checkout@v6
  - uses: xcon-viewer/xcon-viewer/packages/github-action@v0.2.0
    with:
      files: README.md,docs
      out-dir: xcon-rendered
      fail-on-invalid: "true"
```

The action scans Markdown files for XCON fences and writes rendered HTML artifacts.


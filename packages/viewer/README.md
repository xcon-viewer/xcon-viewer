# @xcon-viewer/viewer

XCON viewer-only renderer.  
Renders XCON documents safely — scripts are blocked by design.  
Embed UI in Markdown, share from anyone, open anywhere.

```ts
import { render, renderDocument, renderToHtml } from '@xcon-viewer/viewer';

render(
  {
    type: 'form',
    pos: [0, 0, 320, 140],
    components: {
      title: { type: 'label', text: 'XCON Viewer', pos: [16, 16, 288, 32] },
    },
  },
  document.getElementById('preview')!,
);

const html = renderToHtml({ type: 'form', pos: [0, 0, 320, 140] });
const page = renderDocument({ type: 'form', pos: [0, 0, 320, 140] });
```

`render()` creates a positioned viewer host so absolute root screens stay anchored inside the target element. `renderToHtml()` returns only the raw render fragment; when inserting it yourself, wrap it in a `position: relative` frame sized from the document `pos`, or use `renderDocument()` for a complete page.

For the standalone custom element:

```ts
import '@xcon-viewer/viewer/web-component';
```

```html
<xcon-viewer src="./hello.xcon.json"></xcon-viewer>
```

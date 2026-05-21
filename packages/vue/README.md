# @xcon-viewer/vue

Vue wrapper for public XCON Viewer documents.

```ts
import { createXconViewerComponent, defineXconViewer } from '@xcon-viewer/vue';
import { h } from 'vue';

await defineXconViewer();

export const XconViewer = createXconViewerComponent(h);
```

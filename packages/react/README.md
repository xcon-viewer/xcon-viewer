# @xcon-viewer/react

React wrapper for public XCON Viewer documents.

```tsx
import { createElement } from 'react';
import { createXconViewer, defineXconViewer } from '@xcon-viewer/react';

await defineXconViewer();

const XconViewer = createXconViewer(createElement);

export function Preview() {
  return <XconViewer document={{ type: 'form' }} />;
}
```

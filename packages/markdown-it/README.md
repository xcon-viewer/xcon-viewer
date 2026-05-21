# @xcon-viewer/markdown-it

Renders XCON code fences in markdown-it documents.

````js
import MarkdownIt from 'markdown-it';
import xconMarkdownIt from '@xcon-viewer/markdown-it';

const md = new MarkdownIt({ html: false });
md.use(xconMarkdownIt, {
  containerClass: 'markdown-xcon-block',
  frameClass: 'markdown-xcon-frame',
});

const html = md.render(`
# Example

\`\`\`xcon
screen 320x140 bg @surface
  title: label "XCON/SKETCH" at 16 16 288 32
\`\`\`
`);
````

Supported fences: `xcon`, `xcon-json`, `xconj`, `xcon-xml`, `xconx`, `xcon-tagless`, `xconl`, `xcont`, `xcon-sketch`, and `xcons`.

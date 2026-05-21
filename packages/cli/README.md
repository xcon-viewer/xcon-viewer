# @xcon-viewer/cli

Command line tools for validating, converting, formatting, and rendering public XCON documents.

```sh
npx @xcon-viewer/cli validate ./examples/hello/hello.xcon.json
npx @xcon-viewer/cli convert ./examples/hello/hello.xcon.json --to xml --out hello.xcon.xml
npx @xcon-viewer/cli format ./examples/hello/hello.xcon.sketch --out hello.xcon.sketch
npx @xcon-viewer/cli render ./examples/hello/hello.xcon.json --out hello.html
```

The package also exposes command helpers for advanced integrations:

```js
import { validateFile, convertFile, renderFile, formatFile } from '@xcon-viewer/cli';
```

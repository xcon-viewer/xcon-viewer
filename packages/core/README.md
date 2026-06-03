# @xcon-viewer/core

XCON core parser, validator, and object model.  
Parse SKETCH, JSON, XML, or TAGLESS syntax into a unified XCON Object Model.  
Built for the LLM era — safe, structured, and format-agnostic.

```ts
import { convert, detectXconSyntax, validate } from '@xcon-viewer/core';

const source = `screen 320x140 bg @surface
  title: label "XCON/SKETCH" at 16 16 288 32`;

const syntax = detectXconSyntax(source);
const json = convert(source, syntax, 'json');
const result = validate(JSON.parse(json));
```

Subpath exports are available when you only need one layer:

```ts
import { fromJSON } from '@xcon-viewer/core/parser';
import { XconObject } from '@xcon-viewer/core/model';
import { validate } from '@xcon-viewer/core/validator';
import { convert } from '@xcon-viewer/core/converter';
```

# XCON Format Specification

The public XCON spec defines a viewer-only UI document format with one canonical Object Model and four syntaxes. SKETCH and JSON are the primary public forms: use SKETCH for Markdown and LLM authoring, and JSON for canonical API/schema interchange. XML and TAGLESS remain compatibility and round-trip formats.

## Contents

- [XCON Object Model](./xcon-object-model.md)
- [XCON/SKETCH Syntax](./xcon-sketch-syntax.md)
- [XCON/JSON Syntax](./xcon-json-syntax.md)
- [XCON/XML Syntax](./xcon-xml-syntax.md)
- [XCON/TAGLESS Syntax](./xcon-tagless-syntax.md)
- [Custom Marker Rules](./xcon-tagless-markers.md)
- [Security Model](./security-model.md)

For component-level properties and examples, see [docs/xcon-component-specs.en.md](../docs/xcon-component-specs.en.md).

For the static live editor, run `npm run build` and `npm run playground`, then open `http://localhost:4173/play`.

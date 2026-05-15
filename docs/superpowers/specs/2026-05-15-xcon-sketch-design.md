# XCON/SKETCH Design

Date: 2026-05-15

Status: Draft for user review

## Purpose

XCON currently supports XCON/JSON, XCON/XML, and XCON/TAGLESS. Those syntaxes are precise and convertible, but they are still verbose when a person or LLM wants to sketch a screen quickly inside Markdown.

XCON/SKETCH is a compact authoring syntax for XCON. It is not a separate runtime and does not change rendering semantics. It parses into the same XCON Object Model, then renders or converts through the existing JSON/XML/TAGLESS pipeline.

Core positioning:

```txt
Write like a sketch. Render like XCON.
```

Korean positioning:

```txt
스케치처럼 쓰고, XCON처럼 렌더링합니다.
```

## Goals

- Make simple UI screens faster to write than XCON/JSON.
- Keep the syntax stable enough for LLMs to generate without frequent mapping mistakes.
- Let humans read and edit fenced Markdown examples naturally, similar to Mermaid.
- Preserve exact XCON behavior by compiling to XCON/JSON-compatible objects.
- Support conversion from SKETCH to JSON/XML/TAGLESS.
- Keep public XCON viewer-only: no app logic, event execution, arbitrary JavaScript, or runtime state.

## Non-Goals

- XCON/SKETCH is not a new canonical storage format for production documents.
- It does not replace JSON/XML/TAGLESS.
- It does not add loops, conditions, variables, scripts, or data binding in v0.
- It does not execute actions or business logic.
- It does not import arbitrary external code.

## Architecture

```txt
XCON/SKETCH source
  -> parseSketch(source)
  -> XCON Object Model
  -> serializeBySyntax(json | xml | tagless)
  -> renderToHtml / viewer
```

The implementation should add a fourth parser entry point, but the normalized output must be a normal XCON object. Existing renderer behavior should not need SKETCH-specific branches beyond parser selection.

Recommended public API:

```ts
type XconSyntax = 'json' | 'xml' | 'tagless' | 'sketch';

parseBySyntax(source, 'sketch');
serializeBySyntax(document, 'json');
convert(source, 'sketch', 'json');
```

Markdown integrations should recognize:

```txt
xcon-sketch
xcons
```

The short alias `xcons` is optional. The explicit `xcon-sketch` fence is required.

## Syntax Overview

The base form is:

```xcon-sketch
name: type "primary text" at x y width height
  property value
  child: type "text" at x y width height
```

Example:

```xcon-sketch
screen 402x800 bg #ffffff

title: label "Welcome to XCON" at 24 32 354 36
  font 24 800
  align center

cta: button "Get Started" at 24 92 354 48
  bg #db2777
  color white
  radius 12

card: panel at 24 164 354 180
  bg #f8fafc
  radius 16
  shadow 0 8 16 .12

  body: label "Short UI documents for humans and LLMs." at 20 24 314 48
    font 14 500
    color #475569
```

Normalized shape:

```json
{
  "type": "form",
  "pos": [0, 0, 402, 800],
  "backgroundColor": "#ffffff",
  "components": {
    "componentsOrder": "title,cta,card",
    "title": {
      "type": "label",
      "name": "title",
      "text": "Welcome to XCON",
      "pos": [24, 32, 354, 36],
      "font": {
        "size": 24,
        "weight": 800
      },
      "textAlign": "center"
    }
  }
}
```

## Document Declaration

The first significant line should usually be a screen declaration:

```xcon-sketch
screen 402x800 bg #ffffff
```

Equivalent normalized output:

```json
{
  "type": "form",
  "pos": [0, 0, 402, 800],
  "backgroundColor": "#ffffff"
}
```

Supported screen forms:

```xcon-sketch
screen 402x800
screen 402x800 bg #fff
screen at 0 0 402 800 bg #fff
```

If omitted, v0 should default to:

```json
{
  "type": "form",
  "pos": [0, 0, 360, 220],
  "backgroundColor": "transparent"
}
```

## Component Declarations

The parser should support:

```xcon-sketch
title: label "Hello" at 24 32 312 36
```

This maps to:

```json
{
  "type": "label",
  "name": "title",
  "text": "Hello",
  "pos": [24, 32, 312, 36]
}
```

Primary text mapping:

| Type | Primary quoted text maps to |
| --- | --- |
| `label` | `text` |
| `textView` | `text` |
| `button` | `label` |
| `textField` | `placeholder` |
| `searchBar` | `placeholder` |
| other types | `title` unless a type-specific rule exists |

If the component has no primary text:

```xcon-sketch
card: panel at 24 120 312 180
```

## Nesting

Indentation creates parent-child relationships. Children are emitted into the parent component's `components` dictionary. Sibling order is recorded with `componentsOrder`.

```xcon-sketch
card: panel at 24 120 312 180
  title: label "Card title" at 16 16 280 28
  body: label "Card body" at 16 56 280 48
```

Normalized structure:

```json
{
  "type": "panel",
  "name": "card",
  "pos": [24, 120, 312, 180],
  "components": {
    "componentsOrder": "title,body",
    "title": {
      "type": "label",
      "name": "title",
      "text": "Card title",
      "pos": [16, 16, 280, 28]
    },
    "body": {
      "type": "label",
      "name": "body",
      "text": "Card body",
      "pos": [16, 56, 280, 48]
    }
  }
}
```

Indentation should use spaces. Tabs should be rejected with a clear error in v0.

## Property Lines

Property lines use either compact commands or pass-through properties.

Compact commands:

```xcon-sketch
bg #fff
color #111
font 16 700
align center
radius 12
border 1 #ddd 12
shadow 0 8 16 .12
gap 12
padding 16 24
scroll vertical
```

Pass-through properties:

```xcon-sketch
autoPlay true
interval 3000
direction horizontal
objectFit cover
```

Pass-through names should be preserved exactly unless they are known deprecated aliases. Known aliases should normalize to public property names where the current public API already defines that mapping.

## Compact Command Mapping

| SKETCH | Normalized XCON |
| --- | --- |
| `bg <color>` | `backgroundColor` |
| `color <color>` | `color` |
| `font <size> <weight?>` | `font.size`, `font.weight` |
| `font <family> <size> <weight?>` | `font.family`, `font.size`, `font.weight` |
| `align <value>` | `textAlign` |
| `valign <value>` | `textVerticalAlign` |
| `radius <n>` | `border.radius` |
| `border <width> <color?> <radius?>` | `border.width`, `border.color`, `border.radius` |
| `shadow <x> <y> <blur> <opacity>` | `shadow.x`, `shadow.y`, `shadow.blur`, `shadow.opacity` |
| `gap <spacing>` | `al.gap` |
| `padding <spacing...>` | `al.padding` |
| `margin <spacing...>` | `al.margin` or `margin`, depending on existing schema policy |
| `layout <direction>` | `al.direction` |
| `scroll <mode>` | `scroll` |
| `style <css>` | `style` |

Spacing values follow existing public XCON spacing rules: number, `[v,h]`, `[t,r,b,l]`, or CSS string.

## Arrays and Object Blocks

An unvalued property followed by indented `-` lines creates an array:

```xcon-sketch
hero: banner at 24 120 354 220
  images
    - https://images.unsplash.com/photo-a?w=800&q=80
    - https://images.unsplash.com/photo-b?w=800&q=80
```

Normalized:

```json
{
  "images": [
    "https://images.unsplash.com/photo-a?w=800&q=80",
    "https://images.unsplash.com/photo-b?w=800&q=80"
  ]
}
```

An unvalued property followed by indented key-value lines creates an object:

```xcon-sketch
hero: banner at 24 120 354 220
  overlay
    title "anywhere"
    subtitle "수백만 숙소가 당신을 기다립니다."
    badge "LIVE"
```

Normalized:

```json
{
  "overlay": {
    "title": "anywhere",
    "subtitle": "수백만 숙소가 당신을 기다립니다.",
    "badge": "LIVE"
  }
}
```

For v0, array items should be scalar strings or inline object literals. Nested object arrays can be added later if needed.

## Values

Value parsing should be explicit and predictable:

| Source | Type |
| --- | --- |
| `"quoted text"` | string |
| `'quoted text'` | string |
| `true`, `false` | boolean |
| `null` | null |
| `123`, `12.5`, `.5` | number |
| `#fff`, `#ffffff`, `rgba(...)`, `white` | string color |
| `24 32 312 36` after `at` | rect tuple |
| `[1, 2, 3]` | JSON array, optional v0 support |
| `{ "x": 1 }` | JSON object, optional v0 support |

Unquoted strings are allowed for short scalar values:

```xcon-sketch
objectFit cover
scroll vertical
```

Long prose should be quoted.

## Comments

Support line comments:

```xcon-sketch
// main hero
hero: banner at 24 120 354 220
```

Hash comments should not be supported in v0 because `#fff` colors are common.

## Error Handling

The parser should report:

- line number
- column number when practical
- short reason
- suggested fix for common mistakes

Examples:

```txt
XCON/SKETCH parse error at line 4:
Expected "at x y width height" after component declaration.
```

```txt
XCON/SKETCH parse error at line 9:
Tabs are not supported for indentation. Use spaces.
```

```txt
XCON/SKETCH parse error at line 12:
Array item must be indented under a property line.
```

## Formatting

`xcon format --to sketch` is optional for v0. The required path is:

```txt
sketch -> json/xml/tagless
```

Generating SKETCH from existing JSON is useful later, but it is harder to make stable and human-friendly. It should be treated as v1 unless needed for documentation.

## Markdown Integration

Markdown renderers should support:

````md
```xcon-sketch
screen 360x220 bg #f8fafc

title: label "Tagless XCON" at 24 24 312 36
  font 24 800
  align center

cta: button "Render Preview" at 72 142 216 44
  bg #db2777
  color white
  radius 12
```
````

The rendering path should be identical to other XCON fences after parsing:

```txt
fence -> parseBySyntax(source, 'sketch') -> renderToHtml(document)
```

## Security

XCON/SKETCH must preserve the public viewer security model:

- no JavaScript execution
- no event handler syntax in v0
- no expression interpolation
- no network fetching during parsing
- same URL sanitization as JSON/XML/TAGLESS
- same `allowExternalResources` behavior as existing viewer options

## Testing Strategy

Parser tests:

- parses `screen 402x800 bg #fff`
- parses component declaration with text and `at`
- maps label text to `text`
- maps button text to `label`
- preserves sibling order in `componentsOrder`
- creates nested `components` from indentation
- maps compact commands to public property names
- parses arrays from `-` items
- parses object blocks
- rejects tabs
- reports line numbers on invalid syntax

Conversion tests:

- sketch -> json
- sketch -> xml
- sketch -> tagless
- deserialize auto-detection if adopted

Markdown integration tests:

- `xcon-sketch` fence renders through the public viewer
- `xcon-sketch` external image behavior follows existing CSP/resource rules
- invalid sketch fence renders a useful error block

Compatibility tests:

- existing JSON/XML/TAGLESS tests remain unchanged
- existing `parseBySyntax` behavior remains backward-compatible

## Implementation Boundaries

Likely files:

- `packages/core/src/parser/sketch/index.ts`
- `packages/core/src/converter/index.ts`
- `packages/core/src/core.test.ts`
- `packages/cli/src/commands/common.ts`
- `packages/remark/src/index.ts`
- `packages/markdown-it/src/index.ts`
- `packages/vite-plugin/src/index.ts`
- `packages/github-action/src/index.ts`
- app MarkdownPane integration if xamong desk should support it
- docs and examples

The first implementation should be parser-first and renderer-neutral. The renderer should receive an ordinary XCON object and should not need to know the source was SKETCH.

## Design Decisions for v0

The v0 implementation should use these defaults:

- Official fence: `xcon-sketch`.
- Alias: accept `xcons`, but do not emphasize it in public docs.
- `format --to sketch`: defer to v1.
- Inline JSON values: support simple JSON arrays and objects only when the value starts with `[` or `{`; otherwise use normal scalar parsing.
- `margin`: map to `al.margin` inside auto-layout-oriented containers and preserve as `margin` elsewhere.
- Missing screen dimensions: use `[0, 0, 360, 220]`.

Future versions can revisit full SKETCH serialization, richer object-array syntax, and whether `xcons` should become a documented shorthand.

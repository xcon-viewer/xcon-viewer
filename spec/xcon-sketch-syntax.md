# XCON/SKETCH Syntax

XCON/SKETCH is the preferred compact authoring syntax for Markdown, examples, and LLM-generated drafts. It is not a separate runtime model. SKETCH parses into the same XCON Object Model used by XCON/JSON, XCON/XML, and XCON/TAGLESS, and the converter can serialize existing XCON documents back to SKETCH.

## Goals

- Keep common UI sketches short enough to write by hand.
- Preserve named component structure for SKETCH/JSON/XML/TAGLESS round trips.
- Prefer readable primitives, blocks, and shorthands over verbose JSON.
- Allow full XCON properties when a component needs details that SKETCH does not shorthand.

## File Shape

A SKETCH document starts with one root `screen` declaration.

```text
screen 402x300
```

The root screen maps to a `form` component:

```json
{
  "type": "form",
  "pos": [0, 0, 402, 300]
}
```

The screen may include an optional quoted name.


```text
screen "Checkout" 390x244
```

This maps to root `name: "Checkout"`.

## Components

Named components use:

```text
name: type "primary text" at x y width height
```

Example:

```text
title: label "Hello Sketch" at 24 32 354 34
cta: button "Render Preview" at 72 142 216 44
```

The dictionary key is the component name, and the component also receives the same `name` property.

Primary text is mapped by component type:

| Component type | Primary text property |
|---|---|
| `button` | `label` |
| `textField`, `searchBar` | `placeholder` |
| `label`, `textView`, `shape` | `text` |
| Other types | `text` |

Anonymous component declarations are also supported. The parser assigns stable names like `label1`, `button1`.

```text
label "Title" at 24,80 color #114827
button "Save" at 24,120 size 120x44 enabled true
```

## Layout

Component geometry is written after `at`.

```text
panel: panel at 0 0 402 200
```

Positions may use spaces or comma-separated numbers.

```text
label "Title" at 24,32,354,34
```

The `size` inline shorthand accepts `widthxheight`.

```text
button "Save" at 24,120 size 120x44
```

`size 120x44` maps to `size: [120, 44]`; `at 24 120 120 44` maps to `pos: [24, 120, 120, 44]`.

Document line primitives support the normal `at` layout and a point-based `from ... to ...` layout. Use `line at x y width height` for dividers and `line from x y to x y` for absolute-coordinate arrows. The point-based form is normalized to `pos`, `from`, and `to` in the object model.

Anchor connectors use component references instead of absolute coordinates. Use `connector from source.anchor to target.anchor` or the compatibility alias `arrow from source anchor to target anchor`. `arrow` is normalized to `type: "connector"` with `end: "arrow"`. Supported anchors are `left`, `right`, `top`, `bottom`, and `center`.

```text
rule: line at 48 140 720 0
  color #cbd5e1
  width 2
  style "dashed"

flow: line from 240 220 to 330 220
  color #2563eb
  width 3
  end "arrow"
  label "Message"

message: connector from user.right to agent.left
  color #2563eb
  width 3
  end "arrow"

legacyMessage: arrow from user right to agent left
  color #2563eb
  width 3
```

## Inline Properties

Inline properties appear after the layout.

```text
button "Save" at 24 120 120 44 enabled true color #ffffff
```

Primitive inference:

| Text | Parsed value |
|---|---|
| `true`, `false` | Boolean |
| `null` | Null |
| `12`, `.5`, `-4` | Number |
| `120x44` | Size array |
| `1,2,3,4` | Number array |
| `{...}`, `[...]` | JSON value |
| `"quoted text"` | String |
| unquoted other text | String |

Quoted strings preserve their string type even when they look like booleans, numbers, JSON, or URLs.

Color values may use theme token aliases such as `@border`, `@surface`, or `@ink-2`; the public viewer renders them as `var(--border)`, `var(--surface)`, or `var(--ink-2)`.

JSON values are read as one balanced value, so nested arrays/objects and quoted text with spaces are valid on one property line.

```text
hero: banner at 24 120 354 228
  slides [{"type":"image","src":"https://example.com/a.jpg","overlaySub":"Line one\nLine two"}]
```

Large JSON values may also be written as pretty multiline JSON. A property line that starts with `property [` or `property {` is consumed until the matching closing bracket or brace.

```text
hero: banner at 24 120 354 228
  slides [
    {
      "type": "image",
      "src": "stay-hero.jpg",
      "overlayTitle": "Hidden stays"
    },
    {
      "type": "image",
      "src": "stay-cabin.jpg",
      "overlayTitle": "Mountain week"
    }
  ]

recentList: list at 24 380 354 172
  dataTemplate {
    "type": "template",
    "template": {
      "tabledata": [
        { "title": "Stay A", "image": "stay-a.jpg" },
        { "title": "Stay B", "image": "stay-b.jpg" }
      ]
    }
  }
```

## Property Lines

Indented property lines attach to the nearest screen or component.

```text
card: panel at 24 164 354 180
  bg #ffffff
  radius 16
  shadow 0 8 16 .12
  gap 12
  padding 16 24
  layout column

  body: label "Short UI documents." at 20 24 314 48
    font 14 500
    color #475569
    align center
```

Common shorthands:

| SKETCH | XCON property |
|---|---|
| `bg #fff` | `backgroundColor` |
| `color #111` | `color` |
| `font 14 500` | `font: { size: 14, weight: 500 }` |
| `font "Inter" 14 600` | `font: { family: "Inter", size: 14, weight: 600 }` |
| `align center` | `textAlign` |
| `valign middle` | `textVerticalAlign` |
| `radius 16` | `border: { radius: 16 }` |
| `border 1 #ddd 12` | `border: { width: 1, color: "#ddd", radius: 12 }` |
| `shadow 0 8 16 .12` | `shadow: { x: 0, y: 8, blur: 16, opacity: 0.12 }` |
| `gap 12` | `al: { gap: 12 }` |
| `padding 16 24` | `al: { padding: [16, 24] }` |
| `layout column` on containers | `al: { direction: "column" }` |
| `layout column` on `button` | `layout: "column"` |
| `scroll vertical` | `scroll: "vertical"` |

Any property without a shorthand is written as its public XCON property name.

```text
hero: banner at 24 120 354 220
  bannerHeight "228px"
  objectFit fill
```

## Object Blocks

A single property name followed by indented key/value lines creates an object.

```text
hero: banner at 24 120 354 220
  indicator
    show true
    color "255,255,255,255"
  autoplay
    enabled true
    interval 4000
    loop true
    rolling true
```

This maps to:

```json
{
  "indicator": { "show": true, "color": "255,255,255,255" },
  "autoplay": { "enabled": true, "interval": 4000, "loop": true, "rolling": true }
}
```

Nested object blocks are intentionally shallow in the compact syntax. For deeply nested or mixed data, use a JSON value on the property line.

```text
dataTemplate {"type":"template","template":{"tabledata":[{"title":"Stay A"}]}}
```

## Array Blocks

A single property name followed by `-` items creates an array.

```text
hero: banner at 24 120 354 220
  images
    - https://images.unsplash.com/photo-a?w=800&q=80
    - https://images.unsplash.com/photo-b?w=800&q=80
```

Array items use the same primitive inference as inline values.

For arrays of components or complex objects, use JSON or the richer JSON/XML syntax when readability would suffer.

## Component Nesting

Indented component declarations become children of the nearest component.

```text
phone: panel at 0 0 402 800
  header: panel at 0 0 402 64
    logo: label "airbnb" at 16 16 120 28
  hero: banner at 16 96 370 228
```

This maps to nested `components` dictionaries with `componentsOrder` preserving declaration order.

## Comments

`//` starts a comment when it appears at the beginning of a line or after whitespace. URL text is preserved.

```text
// screen comment
title: label "https://example.com//not-comment" at 0 0 360 40 // trailing comment
```

Tabs are not valid indentation. Use spaces.

## Serialization

The converter can serialize any XCON document to SKETCH.

```bash
xcon convert examples/hello/hello.xcon.json --to sketch
```

Serializer rules:

- Root `pos` width and height become `screen WIDTHxHEIGHT`.
- Component dictionary keys become `name: type` declarations.
- Component `pos` arrays become `at x y width height`.
- Primary text properties are emitted in the declaration when possible.
- Simple object properties are emitted as object blocks.
- Simple arrays are emitted as array blocks.
- Complex arrays and objects fall back to compact JSON values.
- Strings are quoted to preserve exact type and content.

Example serialized output:

```text
screen 402x800
  title "AirBnB - Main"
  border
    visible true
    width 1
    style "solid"
    color "var(--border)"
    radius 28
  main: panel at 0 0 560 32
    scroll "vertical"
    logo: shape "<span class=\"xa-showcase-stay-logo\">air<span>bnb</span></span>" at 0 0 200 40
      renderHtml true
```

## Conversion Cycle

SKETCH participates in the same normalized conversion pipeline:

```text
XCON/SKETCH -> XCON/JSON -> XCON/XML -> XCON/TAGLESS -> XCON Object Model
```

When exact machine-level preservation is more important than readability, use XCON/JSON. XML and TAGLESS are compatibility targets for tools and transport. SKETCH is optimized for readable authoring and review.

# XCON Component Specs and Examples

This document is the public, viewer-only component reference for XCON documents. It covers renderable UI structure and safe presentation properties. Public XCON documents do not execute JavaScript, event handlers, backend calls, database instructions, or business logic.

## Document Shape

Every document is a component object. The root component is normally a `form`.

```json
{
  "type": "form",
  "pos": [0, 0, 402, 800],
  "backgroundColor": "#ffffff",
  "components": {
    "componentsOrder": "title,cta",
    "title": {
      "type": "label",
      "name": "title",
      "pos": [24, 32, 354, 32],
      "text": "XCON"
    },
    "cta": {
      "type": "button",
      "name": "cta",
      "pos": [24, 84, 354, 44],
      "label": "Start"
    }
  }
}
```

Rules:

- `type` is required on every renderable component.
- `components` is an ordered dictionary. Use `componentsOrder` when visual order must be stable.
- Child components should include `name` when a JSON -> XML -> TAGLESS round trip must preserve stable keys.
- Unknown properties are preserved as data, but public examples should prefer the documented names below.
- Use `@token` for theme tokens, for example `@surface`, `@ink`, `@border`, and `@accent`.

## Common Property Types

| Type | JSON shape | Examples |
|---|---|---|
| `Rect` | `[x, y, width, height]` | `[16, 24, 300, 44]` |
| `Size` | `[width, height]` | `[402, 1200]` |
| `Spacing` | number, array, or CSS string | `16`, `[12, 16]`, `"12px 16px"` |
| `Color` | CSS color or theme token | `"#111827"`, `"rgba(0,0,0,.5)"`, `"@border"` |
| `Font` | object | `{ "size": 16, "weight": 700 }` |
| `Border` | object | `{ "visible": true, "width": 1, "color": "@border", "radius": 8 }` |
| `Shadow` | object | `{ "visible": true, "blur": 16, "opacity": 0.18 }` |
| `Component` | object with `type` | `{ "type": "label", "text": "..." }` |

## Common Properties

| Property | Type | Purpose |
|---|---|---|
| `type` | component type | Renderable component kind. |
| `id` | string | DOM or external reference id. |
| `name` | string | Stable semantic name for round trips. |
| `pos` | `Rect` | Absolute bounds and size hint. |
| `al` | object | Auto-layout hints such as `direction`, `gap`, `padding`, `alignItems`, `justifyContent`, `flex`, and `alignSelf`. |
| `visible` | boolean | Visibility flag. |
| `enabled` | boolean | Enabled/disabled state. |
| `readonly` | boolean | Read-only input state. |
| `required` | boolean | Required input hint. |
| `text` | string | Display text or initial text value. |
| `label` | string | User-visible label, especially for buttons and controls. |
| `placeholder` | string | Input placeholder. |
| `value` | any | Current value for inputs and display widgets. |
| `title` | string | Title for cards, modals, slides, and related components. |
| `subtitle` | string | Secondary title. |
| `description` | string | Supporting description. |
| `message` | string | Alert or notice body. |
| `backgroundColor` | `Color` | Background color. |
| `color` | `Color` | Foreground or text color. |
| `font` | `Font` | Font family, size, weight, style, and line height. |
| `border` | `Border` | Border visibility, width, color, style, and radius. |
| `shadow` | `Shadow` | Shadow visibility, color, blur, spread, and opacity. |
| `padding` | `Spacing` | Inner spacing. |
| `margin` | `Spacing` | Outer spacing. |
| `width` / `height` | number or string | Size override. |
| `minWidth` / `maxWidth` | number or string | Width constraints. |
| `minHeight` / `maxHeight` | number or string | Height constraints. |
| `scroll` | string | `none`, `vertical`, `horizontal`, `both`, or `auto`. |
| `overflow` | string | CSS overflow mode. |
| `components` | object | Named child component dictionary. |
| `items` | array | Repeated items or child item data. |
| `slides` | array | Banner/carousel slides. |
| `content` | string or component | Single nested content value. |
| `template` / `templates` | object | Repeated rendering templates. |
| `data` / `dataTemplate` | object | Data used by lists, charts, and templates. |
| `src` | string | Image or video resource URL. |
| `href` / `url` | string | Link URL. |
| `alt` | string | Image alternative text. |
| `objectFit` | string | Image fit mode such as `cover`, `contain`, or `fill`. |
| `icon` | string or object | Icon name or icon configuration. |

## Component Types

### Structure and Layout

| Type | Purpose |
|---|---|
| `form` | Root screen container. |
| `panel` | General container. |
| `grid` | Grid layout visual. |
| `flexBox` | Flex layout visual. |
| `stack` | Stack layout visual. |
| `spacer` | Empty spacing element. |
| `divider` | Horizontal, vertical, or decorative divider. |
| `card` | Card surface with optional media and text. |

### Text and Basic Controls

| Type | Purpose |
|---|---|
| `label` | Static text. |
| `text` | Text display alias/component. |
| `textView` | Richer text block. |
| `button` | Clickable visual button. Public rendering does not execute behavior. |
| `shape` | Rectangle, circle, or simple shape. |
| `icon` | Icon display. |
| `badge` | Small status label. |
| `avatar` | Image or initials avatar. |

### Inputs

| Type | Purpose |
|---|---|
| `textField` | Single-line input. |
| `passwordField` | Password-style input. |
| `textarea` | Multi-line input. |
| `checkbox` | Checkbox control. |
| `radioButton` | Radio control. |
| `select` | Select/dropdown control. |
| `slider` | Range slider. |
| `switch` | On/off switch. |
| `colorPicker` | Color picker. |
| `datePicker` | Date picker. |
| `timePicker` | Time picker. |
| `rating` | Star, heart, or numeric rating. |

### Media and Data

| Type | Purpose |
|---|---|
| `image` | Image with optional overlay text. |
| `videoView` | Video element. |
| `banner` | Slide banner/carousel. |
| `carousel` | Carousel component. |
| `gallery` | Image gallery. |
| `list` | Repeated item list. |
| `treeView` | Tree-style data view. |
| `chart` | Static chart container. |
| `dataViz` | Data visualization container. |
| `networkDiagram` | Network graph visualization. |
| `map` | Map container. |
| `calendar` | Calendar container. |
| `qrCode` | QR code display. |
| `barcode` | Barcode display. |
| `flipbook` | Flipbook-style document preview. |

### Feedback and Navigation

| Type | Purpose |
|---|---|
| `alert` | Alert message. |
| `notice` | Notice/banner message. |
| `tooltip` | Tooltip content. |
| `modal` | Modal dialog layout. |
| `tabs` | Tab navigation and panels. |
| `accordion` | Expandable sections. |
| `progressBar` | Progress display. |
| `spinner` | Loading spinner. |
| `searchBar` | Search field pattern. |
| `chatBubble` | Chat/message bubble. |

## Example: XCON/SKETCH

```text
screen "Profile Card" 360x220 bg @surface
  card: panel at 20 20 320 180
    backgroundColor @surface
    border
      visible true
      color @border
      radius 14
    shadow
      visible true
      blur 18
      opacity 0.14
    title: label "Ada Lovelace" at 24 24 272 30
      color @ink
      font
        size 22
        weight 800
    role: label "Mathematician" at 24 58 272 24
      color @ink-2
      font
        size 14
    cta: button "View profile" at 24 120 160 42
      backgroundColor @accent
      color #ffffff
      border
        visible false
        radius 8
```

```xcon-sketch
screen "Profile Card" 360x220 bg @surface
  card: panel at 20 20 320 180
    backgroundColor @surface
    border
      visible true
      color @border
      radius 14
    shadow
      visible true
      blur 18
      opacity 0.14
    title: label "Ada Lovelace" at 24 24 272 30
      color @ink
      font
        size 22
        weight 800
    role: label "Mathematician" at 24 58 272 24
      color @ink-2
      font
        size 14
    cta: button "View profile" at 24 120 160 42
      backgroundColor @accent
      color #ffffff
      border
        visible false
        radius 8
```

## Example: Image Overlay

```json
{
  "type": "image",
  "pos": [0, 0, 360, 220],
  "src": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80",
  "objectFit": "cover",
  "overlayTag": "LIVE",
  "overlayTitle": "Anywhere",
  "overlaySub": "Find a stay for the next trip.",
  "overlayCta": "Explore",
  "border": {
    "visible": false,
    "radius": 16
  }
}
```

```xcon-json
{
  "type": "image",
  "pos": [0, 0, 360, 220],
  "src": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80",
  "objectFit": "cover",
  "overlayTag": "LIVE",
  "overlayTitle": "Anywhere",
  "overlaySub": "Find a stay for the next trip.",
  "overlayCta": "Explore",
  "border": {
    "visible": false,
    "radius": 16
  }
}
```

## Example: List

```json
{
  "type": "list",
  "pos": [0, 0, 360, 160],
  "direction": "horizontal",
  "itemSize": { "width": 132, "height": 150 },
  "separator": { "size": 12, "color": "transparent" },
  "dataTemplate": {
    "type": "template",
    "template": {
      "tabledata": [
        { "title": "Studio", "price": "$120", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" },
        { "title": "Cabin", "price": "$210", "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" }
      ]
    }
  },
  "templates": {
    "cell": {
      "cover": {
        "type": "image",
        "pos": [0, 0, 132, 96],
        "src": "{{item.image}}",
        "objectFit": "cover"
      },
      "title": {
        "type": "label",
        "pos": [0, 104, 132, 20],
        "text": "{{item.title}}",
        "font": { "size": 13, "weight": 700 }
      },
      "price": {
        "type": "label",
        "pos": [0, 126, 132, 20],
        "text": "{{item.price}}",
        "color": "@ink-2",
        "font": { "size": 12 }
      }
    }
  }
}
```

```xcon-json
{
  "type": "list",
  "pos": [0, 0, 360, 160],
  "direction": "horizontal",
  "itemSize": { "width": 132, "height": 150 },
  "separator": { "size": 12, "color": "transparent" },
  "dataTemplate": {
    "type": "template",
    "template": {
      "tabledata": [
        { "title": "Studio", "price": "$120", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" },
        { "title": "Cabin", "price": "$210", "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" }
      ]
    }
  },
  "templates": {
    "cell": {
      "cover": {
        "type": "image",
        "pos": [0, 0, 132, 96],
        "src": "{{item.image}}",
        "objectFit": "cover"
      },
      "title": {
        "type": "label",
        "pos": [0, 104, 132, 20],
        "text": "{{item.title}}",
        "font": { "size": 13, "weight": 700 }
      },
      "price": {
        "type": "label",
        "pos": [0, 126, 132, 20],
        "text": "{{item.price}}",
        "color": "@ink-2",
        "font": { "size": 12 }
      }
    }
  }
}
```

## Viewer-Only Boundary

Do not include executable behavior in public examples:

- No JavaScript strings.
- No event handler properties such as `onClick` or lifecycle handlers.
- No backend, database, auth, storage, or server configuration sections.
- No action references or behavior chains.
- No unsafe URLs such as `javascript:`.

Use XCON for structure, presentation, and renderable data. Use application code outside XCON when behavior is required.

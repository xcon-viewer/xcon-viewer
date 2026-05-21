# Security Model

XCON Viewer is viewer-only. It renders XCON UI documents but does not execute application logic.

## Hard Boundaries

- No arbitrary JavaScript execution.
- No public app runtime, action engine, database access, storage access, authentication, or server mutation.
- No `onClick`, `onLoad`, `actions`, `triggers`, `actionRef`, `onClick_ref`, `dataSourceRef`, `backend`, `database`, or similar executable/runtime-reference props in public documents.
- No raw HTML injection by default.
- External resources are blocked by default and require an explicit render option.

## Renderer Policy

The public renderer applies these rules:

| Area | Policy |
|---|---|
| Text | Escaped before rendering |
| Raw HTML | Disabled by default; trusted opt-in must sanitize |
| URLs | `javascript:`, `vbscript:`, `data:text/html`, and delimiter-containing URLs are blocked |
| External URLs | Blocked unless `allowExternalResources` is set |
| CSS | Inline style is filtered through an allowlist |
| CSS active patterns | `url(...)`, `expression(...)`, `behavior:`, and script schemes are removed |
| DOM rendering | Uses static markup/fragment insertion, not event binding |
| Limits | Renderer enforces depth and node-count limits |

## Allowed Inline CSS

The renderer allows only layout and presentation properties such as:

```txt
color
background-color
border
border-radius
box-shadow
display
flex-direction
gap
grid-template-columns
font-family
font-size
font-weight
margin
padding
width
height
text-align
overflow
opacity
```

Properties outside the allowlist are dropped. Values containing active CSS patterns are dropped even if the property is otherwise allowed.

## Validation

The core validator reports executable or viewer-only props as errors, including event handlers, action dictionaries, action references, backend/database sections, and legacy `_ref` event references. Security-sensitive renderer options remain opt-in at render time.

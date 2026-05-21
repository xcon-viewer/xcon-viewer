# XCON/JSON Syntax

XCON/JSON is the canonical authoring and interchange syntax for public XCON. Use it for API integration, schema validation, tests, examples, and LLM generation.

## Rules

- The root value must be an object.
- The root object must contain `type`.
- Public component types use lowercase/camelCase names such as `form`, `list`, `textField`, and `progressBar`.
- Use JSON-native values: booleans are `true`/`false`, numbers are numbers, absent values are omitted, and explicit empty values use `null`.
- Use array geometry: `pos: [x, y, width, height]`, `contentSize: [width, height]`.
- Use CSS-compatible color strings: `#RRGGBB`, `#RRGGBBAA`, `rgba(...)`, `transparent`, named colors, `var(--token)`, or the XCON theme token alias `@token` such as `@border`.
- Do not include executable app logic or runtime references such as `onClick`, `actions`, `triggers`, `actionRef`, `onClick_ref`, `dataSourceRef`, `backend`, or `database`.

## Example

```json
{
  "type": "form",
  "pos": [0, 0, 402, 200],
  "backgroundColor": "#F8FAFC",
  "components": {
    "title": {
      "type": "label",
      "pos": [24, 32, 354, 34],
      "text": "Account",
      "font": {
        "size": 24,
        "weight": 800
      },
      "color": "#111827"
    },
    "email": {
      "type": "textField",
      "pos": [24, 92, 354, 44],
      "placeholder": "email@example.com",
      "inputType": "email"
    }
  }
}
```

```xcon-json
{
  "type": "form",
  "pos": [0, 0, 402, 200],
  "backgroundColor": "#F8FAFC",
  "components": {
    "title": {
      "type": "label",
      "pos": [24, 32, 354, 34],
      "text": "Account",
      "font": {
        "size": 24,
        "weight": 800
      },
      "color": "#111827"
    },
    "email": {
      "type": "textField",
      "pos": [24, 92, 354, 44],
      "placeholder": "email@example.com",
      "inputType": "email"
    }
  }
}
```

## Legacy Aliases

The draft renderer can still read or migrate legacy names, but new public examples should not use them.

| Legacy | Public |
|---|---|
| `xForm`, `xList` | `form`, `list` |
| `bgColor`, `fgColor` | `backgroundColor`, `color` |
| `fontSize`, `fontWeight` | `font.size`, `font.weight` |
| `round`, `borderColor` | `border.radius`, `border.color` |
| `binding` | `bind` |
| `mode`, `secureTextEntry` | `inputType` |
| `text` on button | `label` |
| `image`, `url`, `xcon` | `src` |
| `orientation` | `direction` |
| `rowHeight`, `rowWidth` | `itemSize.height`, `itemSize.width` |

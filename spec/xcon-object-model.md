# XCON Object Model

The XCON Object Model is the canonical in-memory representation shared by XCON/SKETCH, XCON/JSON, XCON/XML, and XCON/TAGLESS.

```
XCON/SKETCH   \
XCON/JSON      \
XCON/XML        -> XCON Object Model -> Validator -> Viewer/Converter/CLI
XCON/TAGLESS   /
```

The public model is viewer-only. It stores UI documents and renderable component props, but it does not store executable application behavior.

## Core Types

| Type | Definition |
|---|---|
| `XconName` | string key |
| `XconPrimitive` | `string | number | boolean | null` |
| `XconArray` | ordered `XconValue[]` |
| `XconObject` | ordered name-value collection with keyed lookup |
| `XconValue` | primitive, array, or object |
| `XconDocument` | root `XconObject` with a `type` |
| `XconComponent` | renderable `XconObject` |

`undefined` is normalized to `null` because public XCON/JSON must remain JSON-safe.

## Ordered Object Semantics

`XconObject` preserves insertion order while also supporting fast keyed lookup.

Required operations:

- `add`, `set`, `get`, `insert`, `remove`, `removeAt`, `clear`
- `contains`, `indexOf`, `getKey`, `getValue`, `getString`
- `forEach`, `map`, `filter`, `reduce`, `some`, `every`
- `clone`, `deepClone`, `copy`
- `[Symbol.iterator]`

Duplicate keys are not retained in the public object model. The current public parser keeps the first duplicate key in TAGLESS input and updates existing keys in programmatic object operations.

## Component Shape

```json
{
  "type": "form",
  "pos": [0, 0, 402, 200],
  "backgroundColor": "#FFFFFF",
  "components": {
    "title": {
      "type": "label",
      "text": "Hello"
    }
  }
}
```

```xcon-json
{
  "type": "form",
  "pos": [0, 0, 402, 200],
  "backgroundColor": "#FFFFFF",
  "components": {
    "title": {
      "type": "label",
      "text": "Hello"
    }
  }
}
```

Common component props:

| Prop | Type | Notes |
|---|---|---|
| `type` | string | Required public component type |
| `pos` | `[x,y,width,height]` | Absolute layout |
| `al` | object | Auto-layout options |
| `components` | object | Named child components |
| `items`, `slides` | array | Ordered child/data lists |
| `backgroundColor`, `color` | CSS color | Public color format. Theme token aliases such as `@border` render as `var(--border)`. |
| `font`, `border`, `shadow` | object | Grouped style props |

## Path Reading

The public core exposes read-only path utilities.

```txt
components.list.items._items(0).name
```

Write-path helpers are intentionally excluded from the public viewer contract.

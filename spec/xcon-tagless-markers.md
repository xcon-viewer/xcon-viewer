# XCON/TAGLESS Custom Marker Rules

TAGLESS marker sets let a document choose structural delimiters that are unlikely to collide with its payload.

## Marker Requirements

- Opening marker set must contain exactly four visible characters.
- Closing marker set must contain exactly four visible characters.
- Characters in each set must be unique.
- Whitespace and control characters are not allowed.
- If a marker appears in raw data, the serializer must escape it or choose another marker set.

## Positions

| Index | Open Marker | Close Marker | Meaning |
|---|---|---|---|
| `0` | object open | object close | dictionary/object |
| `1` | array open | array close | array |
| `2` | value open | value close | primitive value |
| `3` | key open | key close | object key |

## Default Set

```txt
open:  ♤♡◇♧
close: ♠♥◆♣
```

## Custom Set Example

```txt
open:  ABCD
close: abcd
```

```txt
ABCDADtypedCformcaabcd
```

Custom markers should be documented with the document when interoperability matters.

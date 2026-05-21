# XCON/TAGLESS Syntax

XCON/TAGLESS is a transport-friendly symbolic serialization syntax. It is useful when JSON/XML delimiter conflicts are common or when a compact marker-based stream is preferred.

TAGLESS is not a separate data model. It parses into the same XCON Object Model.

## Marker Layout

The first four characters define opening markers. The last four characters define closing markers.

```txt
♤♡◇♧
│││└ key open
││└ value open
│└ array open
└ object open

♠♥◆♣
│││└ key close
││└ value close
│└ array close
└ object close
```

Default markers:

```txt
open:  ♤♡◇♧
close: ♠♥◆♣
```

## Example

```txt
♤♡◇♧♤♧type♣◇form◆♧title♣◇Hello◆♧visible♣◇true◆♠♠♥◆♣
```

```xcon-tagless
♤♡◇♧♤♧type♣◇form◆♧title♣◇Hello◆♧visible♣◇true◆♠♠♥◆♣
```

```txt
《【〈「《「type」〈form〉「title」〈Hello〉「visible」〈true〉》》】〉」
```

```xcon-tagless
《【〈「《「type」〈form〉「title」〈Hello〉「visible」〈true〉》》】〉」
```

Primitive string payloads are written without JSON quotes. Marker characters and `%` inside raw data are percent-escaped so they cannot accidentally terminate a value.

Pretty TAGLESS may include whitespace between structural markers:

```txt
♤♡◇♧
♤
  ♧type♣◇form◆
  ♧title♣◇Hello◆
  ♧pos♣
  ♡
    ◇0◆
    ◇0◆
    ◇320◆
    ◇180◆
  ♥
♠
♠♥◆♣
```

```xcon-tagless
♤♡◇♧
♤
  ♧type♣◇form◆
  ♧title♣◇Hello◆
  ♧pos♣
  ♡
    ◇0◆
    ◇0◆
    ◇320◆
    ◇180◆
  ♥
♠
♠♥◆♣
```

## Primitive Type Resolution

TAGLESS does not add quote characters to distinguish strings from numbers. The parser resolves primitive values from the public XCON property spec:

- String properties such as `type`, `text`, `label`, `title`, `src`, `backgroundColor`, and `value` on text/select controls stay strings even when the payload looks numeric.
- Number and boolean properties such as `width`, `height`, `font.size`, `checked`, `visible`, and `displayValue` are converted to native values.
- Number-array properties such as `pos`, `contentSize`, `padding`, and `margin` convert their array items to numbers.
- Component-specific properties override generic names. For example, `progressBar.value` is a number, while `select.value` is a string.
- Unknown properties default to strings. `♧unknownCount♣◇12◆` parses as `"12"`, not `12`.

Legacy TAGLESS payloads that used quoted JSON strings, such as `%22form%22`, are still accepted for compatibility.

## Parsing Rules

- `object` is a sequence of key/value pairs.
- `array` is a sequence of values.
- `value` is an unquoted primitive payload after percent decoding and property-spec type resolution.
- Whitespace between structural markers is ignored.
- Duplicate keys keep the first value.
- Invalid or incomplete marker pairs are parse errors.

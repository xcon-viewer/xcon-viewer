# XCON/XML Syntax

XCON/XML is the authoring syntax for UI documents, designer metadata, comments, and tool-specific hints. It parses into the same XCON Object Model as JSON and TAGLESS.

## Semantic XML

Semantic XML uses component tags and attributes.

```xml
<Form pos="0,0,402,240" designer:note="Login screen">
  <Label name="title" text="Sign in" pos="24,32,354,34" font="size:24; weight:800" />
  <TextField name="email" placeholder="email@example.com" pos="24,88,354,44" inputType="email" />
  <Button name="submit" label="Sign in" pos="24,148,180,44" backgroundColor="#2563EB" color="#FFFFFF" />
</Form>
```

```xcon-xml
<Form pos="0,0,402,240" designer:note="Login screen">
  <Label name="title" text="Sign in" pos="24,32,354,34" font="size:24; weight:800" />
  <TextField name="email" placeholder="email@example.com" pos="24,88,354,44" inputType="email" />
  <Button name="submit" label="Sign in" pos="24,148,180,44" backgroundColor="#2563EB" color="#FFFFFF" />
</Form>
```

Child component tags use `name` as the dictionary key under `components`. This preserves JSON → XML → TAGLESS conversion cycles. If a component also has a public prop named `name`, semantic XML writes that prop as `xcon-prop-name` so the structural key and the component prop do not collide.

Array component props use wrapper tags:

```xml
<Stack direction="column">
  <Items>
    <Label text="First" />
    <Button label="Next" />
  </Items>
</Stack>
```

`Items` maps to the `items` array and `Slides` maps to the `slides` array.

Component tag names map to public types:

| XML Tag | Public Type |
|---|---|
| `Form` | `form` |
| `List` | `list` |
| `Label`, `Text` | `label` |
| `TextField` | `textField` |
| `Button` | `button` |
| `Panel` | `panel` |
| `Stack`, `Grid`, `FlexBox` | layout components |

Namespaced attributes such as `designer:*`, `xcon:*`, and `debug:*` are preserved as metadata by the parser. Public rendering ignores them unless a tool explicitly uses them.

Semantic XML attributes use the same public property type table as TAGLESS. Known number, boolean, array, and object properties are converted to native XCON values; unknown attributes are preserved as strings by default.

Common geometry arrays use comma-separated numbers without JSON brackets:

```xml
<Form pos="0,0,402,520">
  <Label name="title" pos="24,32,354,34" text="Hello" />
</Form>
```

This maps to `pos: [0, 0, 402, 520]` and `pos: [24, 32, 354, 34]`.

Simple object attributes use key/value lists instead of escaped JSON:

```xml
<Form
  border="visible:true; width:1; style:solid; color:@border; radius:28"
  shadow="visible:false" />
```

This maps to native objects such as `border: { visible: true, width: 1, style: "solid", color: "@border", radius: 28 }`. The public viewer renders theme token aliases such as `@border` as CSS variables such as `var(--border)`. Complex nested objects and arrays still use JSON attribute values when a compact key/value list would be ambiguous.

## Machine XML

Machine XML is a lossless structural form.

```xml
<xcon>
  <x>
    <n>type</n><o>form</o>
    <n>pos</n>
    <c>
      <o>0</o>
      <o>0</o>
      <o>402</o>
      <o>240</o>
    </c>
    <n>metadata</n>
    <x>
      <n>designer:note</n><o>Login screen</o>
    </x>
    <n>components</n>
    <x>
      <n>title</n>
      <x>
        <n>type</n><o>label</o>
        <n>text</n><o>Sign in</o>
        <n>pos</n>
        <c>
          <o>24</o>
          <o>32</o>
          <o>354</o>
          <o>34</o>
        </c>
        <n>font</n>
        <x>
          <n>size</n><o>24</o>
          <n>weight</n><o>800</o>
        </x>
      </x>
      <n>email</n>
      <x>
          <n>type</n><o>textField</o>
          <n>placeholder</n><o>email@example.com</o>
          <n>pos</n>
          <c>
            <o>24</o>
            <o>88</o>
            <o>354</o>
            <o>44</o>
          </c>
          <n>inputType</n><o>email</o>
      </x>
      <n>submit</n>
      <x>
          <n>type</n><o>button</o>
          <n>label</n><o>Sign in</o>
          <n>pos</n>
          <c>
            <o>24</o>
            <o>148</o>
            <o>180</o>
            <o>44</o>
          </c>
          <n>backgroundColor</n><o>#2563EB</o>
          <n>color</n><o>#FFFFFF</o>
      </x>
    </x>
  </x>
</xcon>
```

```xcon-xml
<xcon>
  <x>
    <n>type</n><o>form</o>
    <n>pos</n>
    <c>
      <o>0</o>
      <o>0</o>
      <o>402</o>
      <o>240</o>
    </c>
    <n>metadata</n>
    <x>
      <n>designer:note</n><o>Login screen</o>
    </x>
    <n>components</n>
    <x>
      <n>title</n>
      <x>
        <n>type</n><o>label</o>
        <n>text</n><o>Sign in</o>
        <n>pos</n>
        <c>
          <o>24</o>
          <o>32</o>
          <o>354</o>
          <o>34</o>
        </c>
        <n>font</n>
        <x>
          <n>size</n><o>24</o>
          <n>weight</n><o>800</o>
        </x>
      </x>
      <n>email</n>
      <x>
          <n>type</n><o>textField</o>
          <n>placeholder</n><o>email@example.com</o>
          <n>pos</n>
          <c>
            <o>24</o>
            <o>88</o>
            <o>354</o>
            <o>44</o>
          </c>
          <n>inputType</n><o>email</o>
      </x>
      <n>submit</n>
      <x>
          <n>type</n><o>button</o>
          <n>label</n><o>Sign in</o>
          <n>pos</n>
          <c>
            <o>24</o>
            <o>148</o>
            <o>180</o>
            <o>44</o>
          </c>
          <n>backgroundColor</n><o>#2563EB</o>
          <n>color</n><o>#FFFFFF</o>
      </x>
    </x>
  </x>
</xcon>
```

Machine tags:

| Tag | Meaning |
|---|---|
| `xcon` | root wrapper |
| `x` | dictionary/object |
| `n` | key/name |
| `c` | array |
| `o` | string value |
| `int`, `double`, `number`, `bool`, `datetime`, `null` | typed values |

CDATA is supported for text that contains XML delimiters.

## Format Detection

The parser distinguishes both XML forms automatically:

- `machine`: root `<xcon>` with machine value tags such as `<x>`, `<c>`, `<o>`.
- `semantic`: public component tags such as `<Form>`, `<Label>`, `<Stack>`.

# XCON/SKETCH 문법

[English](./xcon-sketch-syntax.md)

XCON/SKETCH는 Markdown, 예제, LLM 생성 초안에서 쓰기 좋은 간결한 작성 문법입니다. 별도의 런타임 모델은 아닙니다. SKETCH는 XCON/JSON, XCON/XML, XCON/TAGLESS와 같은 XCON Object Model로 파싱되며, 변환기는 기존 XCON 문서를 다시 SKETCH로 직렬화할 수 있습니다.

## 목표

- 일반적인 UI 스케치를 사람이 직접 작성할 수 있을 만큼 짧게 유지합니다.
- JSON/XML/TAGLESS 왕복 변환을 위해 이름이 있는 컴포넌트 구조를 보존합니다.
- 장황한 JSON보다 읽기 쉬운 primitive, block, shorthand를 우선합니다.
- SKETCH가 축약하지 않는 세부 표현은 전체 XCON public property로 작성할 수 있게 합니다.

## 파일 형태

SKETCH 문서는 하나의 루트 `screen` 선언으로 시작합니다.

```xcon-sketch
screen 402x800
```

루트 screen은 `form` 컴포넌트로 매핑됩니다.

```json
{
  "type": "form",
  "pos": [0, 0, 402, 800]
}
```

screen에는 선택적으로 따옴표로 감싼 이름을 붙일 수 있습니다.

```xcon-sketch
screen "Checkout" 390x844
```

이 값은 루트 `name: "Checkout"`으로 매핑됩니다.

## 컴포넌트

이름이 있는 컴포넌트는 다음 형식을 사용합니다.

```text
name: type "primary text" at x y width height
```

예:

```xcon-sketch
title: label "Hello Sketch" at 24 32 354 34
cta: button "Render Preview" at 72 142 216 44
```

컴포넌트 이름은 dictionary key가 되며, 컴포넌트의 `name` property에도 같은 값이 들어갑니다.

Primary text는 컴포넌트 타입에 따라 다음 property로 매핑됩니다.

| 컴포넌트 타입 | Primary text property |
|---|---|
| `button` | `label` |
| `textField`, `searchBar` | `placeholder` |
| `label`, `textView`, `shape` | `text` |
| 그 외 타입 | `text` |

이름이 없는 컴포넌트 선언도 지원합니다. 파서는 `label1`, `button1` 같은 안정적인 이름을 자동으로 부여합니다.

```xcon-sketch
label "Title" at 24,80 color #111827
button "Save" at 24,120 size 120x44 enabled true
```

## 레이아웃

컴포넌트의 geometry는 `at` 뒤에 작성합니다.

```xcon-sketch
panel: panel at 0 0 402 800
```

위치는 공백 또는 쉼표로 구분할 수 있습니다.

```xcon-sketch
label "Title" at 24,32,354,34
```

`size` inline shorthand는 `widthxheight` 형식을 받습니다.

```xcon-sketch
button "Save" at 24,120 size 120x44
```

`size 120x44`는 `size: [120, 44]`로 매핑되고, `at 24 120 120 44`는 `pos: [24, 120, 120, 44]`로 매핑됩니다.

## Inline Properties

Inline property는 layout 뒤에 이어서 작성합니다.

```xcon-sketch
button "Save" at 24 120 120 44 enabled true color #ffffff
```

Primitive 타입 추론:

| 텍스트 | 파싱 결과 |
|---|---|
| `true`, `false` | Boolean |
| `null` | Null |
| `12`, `.5`, `-4` | Number |
| `120x44` | Size array |
| `1,2,3,4` | Number array |
| `{...}`, `[...]` | JSON value |
| `"quoted text"` | String |
| 그 외 unquoted text | String |

따옴표로 감싼 문자열은 boolean, number, JSON, URL처럼 보이더라도 string 타입을 유지합니다.

색상 값에는 `@border`, `@surface`, `@ink-2` 같은 theme token alias를 사용할 수 있습니다. 공개 viewer는 이를 `var(--border)`, `var(--surface)`, `var(--ink-2)`로 렌더링합니다.

JSON 값은 균형 잡힌 하나의 값으로 읽습니다. 따라서 중첩 배열/객체와 공백이 들어간 따옴표 문자열도 한 줄 property로 쓸 수 있습니다.

```xcon-sketch
hero: banner at 24 120 354 228
  slides [{"type":"image","src":"https://example.com/a.jpg","overlaySub":"첫 줄\n둘째 줄"}]
```

큰 JSON 값은 보기 좋게 여러 줄로 작성할 수도 있습니다. `property [` 또는 `property {`로 시작하는 property line은 대응되는 닫는 대괄호/중괄호까지 하나의 JSON 값으로 읽습니다.

```xcon-sketch
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

들여쓴 property line은 가장 가까운 screen 또는 component에 붙습니다.

```xcon-sketch
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

주요 shorthand:

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
| container의 `layout column` | `al: { direction: "column" }` |
| `button`의 `layout column` | `layout: "column"` |
| `scroll vertical` | `scroll: "vertical"` |

shorthand가 없는 property는 public XCON property 이름 그대로 작성합니다.

```xcon-sketch
hero: banner at 24 120 354 220
  bannerHeight "228px"
  objectFit fill
```

## Object Blocks

property 이름만 있는 줄 뒤에 key/value 줄을 들여쓰면 object가 됩니다.

```xcon-sketch
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

위 문법은 다음 JSON 구조로 매핑됩니다.

```json
{
  "indicator": { "show": true, "color": "255,255,255,255" },
  "autoplay": { "enabled": true, "interval": 4000, "loop": true, "rolling": true }
}
```

Compact syntax의 object block은 의도적으로 얕게 유지합니다. 깊은 중첩이나 혼합 데이터가 필요하면 property line에 JSON 값을 직접 사용합니다.

```xcon-sketch
dataTemplate {"type":"template","template":{"tabledata":[{"title":"Stay A"}]}}
```

## Array Blocks

property 이름만 있는 줄 뒤에 `-` item을 들여쓰면 array가 됩니다.

```xcon-sketch
hero: banner at 24 120 354 220
  images
    - https://images.unsplash.com/photo-a?w=800&q=80
    - https://images.unsplash.com/photo-b?w=800&q=80
```

Array item은 inline value와 같은 primitive 타입 추론을 사용합니다.

컴포넌트 배열이나 복잡한 object 배열은 가독성이 떨어질 수 있으므로 JSON 또는 더 풍부한 JSON/XML 문법을 사용하는 편이 좋습니다.

## Component Nesting

들여쓴 component declaration은 가장 가까운 component의 child가 됩니다.

```xcon-sketch
phone: panel at 0 0 402 800
  header: panel at 0 0 402 64
    logo: label "airbnb" at 16 16 120 28
  hero: banner at 16 96 370 228
```

이 구조는 중첩된 `components` dictionary로 매핑되며, 선언 순서는 `componentsOrder`로 보존됩니다.

## Comments

`//`는 줄의 시작 또는 공백 뒤에 나타날 때 comment를 시작합니다. URL 텍스트는 보존됩니다.

```xcon-sketch
// screen comment
title: label "https://example.com//not-comment" at 0 0 360 40 // trailing comment
```

들여쓰기에 tab은 사용할 수 없습니다. space를 사용해야 합니다.

## Serialization

변환기는 모든 XCON 문서를 SKETCH로 직렬화할 수 있습니다.

```bash
xcon convert examples/hello/hello.xcon.json --to sketch
```

Serializer 규칙:

- 루트 `pos`의 width와 height는 `screen WIDTHxHEIGHT`가 됩니다.
- Component dictionary key는 `name: type` 선언이 됩니다.
- Component `pos` array는 `at x y width height`가 됩니다.
- 가능한 경우 primary text property는 선언 줄에 함께 출력됩니다.
- 단순 object property는 object block으로 출력됩니다.
- 단순 array는 array block으로 출력됩니다.
- 복잡한 array와 object는 compact JSON value로 fallback합니다.
- 문자열은 정확한 타입과 내용을 보존하기 위해 따옴표로 감싸서 출력합니다.

직렬화 예:

```xcon-sketch
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

SKETCH는 같은 normalized conversion pipeline에 참여합니다.

```text
XCON/JSON -> XCON/XML -> XCON/TAGLESS -> XCON/SKETCH -> XCON Object Model
```

정확한 machine-level 보존이 가독성보다 중요하면 XCON/JSON 또는 machine XCON/XML을 사용하세요. SKETCH는 읽기 쉬운 작성과 리뷰에 최적화된 문법입니다.

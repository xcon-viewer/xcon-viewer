# networkDiagram 기능 목록

이 문서는 현재 `@xcon-viewer/viewer`의 `networkDiagram` 구현 기준 기능 목록입니다.

## 개요

- XCON 컴포넌트 타입은 `networkDiagram`이다.
- 정적 렌더링 시 안전한 SVG fallback을 먼저 생성한다.
- 브라우저 런타임 hydration 시 D3 기반 force graph로 업그레이드된다.
- D3는 viewer 내부 런타임에서 사용한다. 사용자 XCON 문서가 D3를 직접 호출하지 않는다.
- 목표 UX는 Obsidian 스타일의 탐색형 네트워크 그래프다.

## 데이터 입력

`networkDiagram`은 공개 XCON 데이터와 기존 full 버전 호환 데이터를 모두 받는다.

지원 입력:

- `nodes`
- `links`
- `edges` alias
- `data.list`
- `data.names`
- `data.infos`
- `data.subfolders`

노드 필드:

- `id`
- `label`
- `name`
- `title`
- `type`
- `group`
- `color`
- `icon`
- `metadata`
- `x`
- `y`
- `fixed`
- `parentId`
- `isRoot`

링크 필드:

- `id`
- `source`
- `target`
- `from`
- `to`
- `type`
- `label`
- `weight`
- `metadata`

기타 데이터 처리:

- `rootNodeId`를 지원한다.
- `edges`는 `links`의 호환 alias로 처리한다.
- `from` / `to`는 `source` / `target`으로 정규화한다.
- 노드가 없으면 기본 `Root` 노드 fallback을 생성한다.
- 중복 링크 ID는 deterministic suffix를 붙여 보존한다.
- full 버전의 `ROOT:` label prefix는 제거해서 표시한다.

## 탐색 및 분석 기능

- 노드 선택
- 선택 노드 강조
- 선택 노드의 직접 이웃 강조
- 선택 노드와 무관한 노드/링크 muted 처리
- 검색
  - 노드 `id` / `label` 기준
  - 대소문자 무시
  - 검색 결과에 연결되지 않는 링크 제거
- 그룹 필터
  - `node.group` 기준 자동 그룹 생성
- 링크 타입 필터
  - `normal`, `folder`, `ref` 등 실제 링크 타입 기준
- 최소 연결 수 필터
  - `minDegree`
- 폴더 확장
  - `subfolders`가 있는 노드 클릭 시 내부 노드/링크를 로컬 확장
  - 확장 시 중복 노드/링크는 첫 등장 순서 기준으로 dedupe

## 인터랙션

- `Fit` 버튼
  - 현재 렌더링된 그래프 bounds 기준으로 화면에 맞춘다.
- `Reset` 버튼
  - 검색, 필터, 선택, 줌, 팬, 레이아웃 캐시를 초기화한다.
- 마우스 휠 zoom
- 배경 drag pan
- 노드 drag
- 노드 hover tooltip
- 같은 host를 두 번 hydrate해도 중복 바인딩하지 않는다.

## 시각 스타일

지원 테마:

- `obsidian`
- `light`
- `auto`
- `custom`

기본 테마는 `obsidian`이다.

커스텀 색상/스타일 토큰:

- `backgroundColor`
- `nodeColor`
- `linkColor`
- `refLinkColor`
- `primaryColor`
- `accentColor`
- `textColor`
- `selectedColor`
- `neighborColor`
- `panelBackground`
- `clusterColors`
- `mutedOpacity`

표현 기능:

- 루트 노드 강조
- 선택/이웃/뮤트 상태별 스타일
- `folder` / `ref` 링크 dashed reference 스타일
- 화살표 표시
- 라벨 표시
- tooltip 표시
- toolbar, filter chip, legend 스타일

## 레이아웃 및 표시 옵션

지원 옵션:

- `nodeRadius`
- `linkDistance`
- `charge`
- `friction`
- `showLabels`
- `showArrows`
- `showControls`
- `showSearch`
- `showFilters`
- `showLegend`
- `enableDrag`
- `enableZoom`
- `enablePan`
- `enableHover`

주의:

- `gravity`는 core parser 속성에는 등록되어 있지만, 현재 D3 runtime에서는 별도 gravity force로 직접 사용하지 않는다.
- 현재 런타임은 `forceCenter`, `forceLink`, `forceManyBody`, `velocityDecay` 기반으로 레이아웃을 계산한다.

## 반응형 동작

`networkDiagram` 자체는 host의 현재 `clientWidth` / `clientHeight`를 기준으로 SVG viewBox와 D3 layout을 계산한다.

Obsidian Vault test page에서는 GRAPH 패널 리사이즈 시 `ResizeObserver`로 host 크기를 측정하고, XCON/SKETCH의 `networkDiagram` 크기를 다시 생성해서 렌더링한다. 이 방식으로 splitter로 패널 크기를 바꿀 때 그래프 자체 크기도 함께 변경된다.

## 보안 경계

Public viewer의 `networkDiagram`은 순수 뷰어 기능만 제공한다.

- 사용자 JavaScript를 실행하지 않는다.
- 이벤트 핸들러 문자열을 실행하지 않는다.
- backend, database, action, storage 같은 viewer-only 또는 실행형 속성을 차단한다.
- `onNodeClick`, `onNodeHover`, `onNodeDrag`, `onLinkClick` 같은 실행형 콜백 속성은 validator에서 오류 처리한다.
- selection은 외부 이벤트/액션 호출 없이 local state로만 처리한다.
- unsafe CSS color 값, `javascript:`, `url(...)` 계열 값은 필터링한다.
- 잘못된 graph JSON이면 fallback SVG를 유지하고 hydration하지 않는다.

## 의존성

Published `@xcon-viewer/viewer` 패키지는 interactive `networkDiagram`에 필요한 `d3`를 dependency로 포함한다.

- `d3`: interactive `networkDiagram` runtime
- `@types/d3`: 개발/타입 전용

사용자가 published viewer package를 설치해서 사용할 때는 `networkDiagram` 때문에 `d3`를 별도로 설치할 필요가 없다. 단, repository TypeScript source를 직접 빌드하는 경우에는 package dependency 설치가 필요하다.

## 구현 위치

- `packages/viewer/src/renderer/network/types.ts`
- `packages/viewer/src/renderer/network/data.ts`
- `packages/viewer/src/renderer/network/state.ts`
- `packages/viewer/src/renderer/network/theme.ts`
- `packages/viewer/src/renderer/network/static.ts`
- `packages/viewer/src/renderer/network/runtime.ts`
- `packages/viewer/src/renderer/index.ts`
- `packages/core/src/parser/property-types.ts`
- `packages/core/src/validator/index.ts`

## 테스트 및 데모

단독 networkDiagram 테스트:

- `site/network-diagram-test.html`

Sprint 3 고급 시각화 테스트:

- `site/advanced-visualization-test.html`

Obsidian Vault Viewer 테스트:

- `site/obsidian-vault-viewer-test.html`
- `site/obsidian-vault-viewer-test-runtime.js`

관련 테스트:

- `packages/viewer/src/renderer/network/data.test.ts`
- `packages/viewer/src/renderer/network/state.test.ts`
- `packages/viewer/src/renderer/network/theme.test.ts`
- `packages/viewer/src/renderer/network/static.test.ts`
- `packages/viewer/src/renderer/network/runtime.test.ts`
- `packages/viewer/src/renderer/renderer.test.ts`
- `packages/core/src/core.test.ts`
- `scripts/site-structure.test.mjs`

## 간단한 XCON/SKETCH 예시

```xcon-sketch
screen "Network Runtime" 980x620 bg #11131a
  network: networkDiagram at 24 96 932 492
    theme "obsidian"
    nodeRadius 24
    linkDistance 96
    charge -900
    friction 0.72
    showControls true
    showSearch true
    showFilters true
    showLegend true
    showLabels true
    showArrows true
    nodes [{"id":"viewer","label":"Viewer runtime","group":"runtime","color":"#8b5cf6"},{"id":"parser","label":"Core parser","group":"parser","color":"#38bdf8"},{"id":"docs","label":"Docs","group":"content","color":"#f59e0b"}]
    links [{"source":"viewer","target":"parser"},{"source":"viewer","target":"docs","type":"ref"}]
```

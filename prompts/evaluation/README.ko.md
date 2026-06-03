# XCON Prompt Evaluation Harness

이 폴더는 `prompts/`에 있는 LLM 생성용 프롬프트가 실제로 제대로 동작하는지 검증하기 위한 블라인드 평가 절차입니다.

현재 대화에 참여한 모델은 XCON Viewer를 이미 많이 알고 있으므로, 같은 세션에서 직접 생성하면 프롬프트 품질과 모델의 사전 맥락이 섞일 수 있습니다. 그래서 이 평가는 다음 방식으로 진행합니다.

1. 공유 계약 프롬프트와 목적별 프롬프트, 테스트 브리프를 하나의 입력 프롬프트로 합칩니다.
2. 새 LLM 세션이나 다른 모델에 이 입력만 제공합니다.
3. 생성 결과를 `outputs/`에 저장합니다.
4. `validate-output.mjs`로 XCON/SKETCH, XCON Chain, XCON Workflow, fixture 구성을 자동 검사합니다.
5. 필요하면 Playground, Template Lab, Workflow Runner에서 실제 렌더링까지 확인합니다.

## 빠른 사용법

프롬프트 조립:

```bash
node prompts/evaluation/build-test-prompt.mjs 01-sketch-ui-generation.md cases/01-mobile-ui.brief.md > prompts/evaluation/outputs/mobile-ui.generated.md
```

다른 LLM에 위 출력 내용을 입력한 뒤, 실제 응답을 같은 파일에 저장하고 검사합니다.

```bash
node prompts/evaluation/validate-output.mjs prompts/evaluation/outputs/mobile-ui.generated.md
```

JSON 형태의 검사 결과가 필요하면:

```bash
node prompts/evaluation/validate-output.mjs prompts/evaluation/outputs/mobile-ui.generated.md --json
```

## 평가 기준

검증기는 다음 항목을 중점적으로 확인합니다.

- `xcon-sketch` 펜스가 반드시 `screen`으로 시작하는지
- SKETCH가 실제 XCON 객체로 파싱되는지
- XCON public validator를 통과하는지
- 제거/금지된 컴포넌트가 포함되지 않았는지
- `list`에 `dataTemplate`과 `templates.cell`이 올바르게 있는지
- `templates.cell`이 직접 컴포넌트가 아니라 이름 있는 cell layout을 사용하는지
- `xcon-chain as alias` 별칭이 선언되고 `$alias` 참조가 일관되는지
- fixture JSON이 파싱 가능한지
- workflow에 `workflow`, `workqueue`, `scheduler`, `note`, `callApi` 등이 올바른 형태로 쓰였는지

## 해석 방법

- `ERROR`: 생성 결과를 반드시 고쳐야 합니다. 파싱 실패, 금지 컴포넌트, 잘못된 list cell layout 등이 여기에 해당합니다.
- `WARNING`: 렌더링은 될 수 있지만 품질이나 계약 위반 가능성이 있습니다. 예를 들어 list separator에 배경색이 없거나, workflow queue에 concurrency가 빠진 경우입니다.
- `OK`: 자동 검사 기준은 통과했습니다. 그래도 시각적 품질은 Playground나 Template Lab에서 확인해야 합니다.

## 블라인드 평가 권장 절차

1. 새 LLM 세션을 엽니다.
2. `build-test-prompt.mjs` 출력만 붙여 넣습니다.
3. 추가 설명 없이 결과를 받습니다.
4. 결과를 `outputs/`에 저장합니다.
5. `validate-output.mjs`를 실행합니다.
6. 오류가 나오면 어느 프롬프트 문구가 부족했는지 역추적합니다.

이 방식은 완전한 의미의 샌드박스 기억 삭제는 아니지만, 프롬프트 자체만으로 생성이 가능한지 반복적으로 측정하는 데 충분합니다.


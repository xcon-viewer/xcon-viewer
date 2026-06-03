# Contributing to XCON Viewer

Thanks for considering a contribution.

XCON Viewer is a Markdown-friendly, safe-by-design UI document viewer. The project is still early, so the most useful contributions are precise bug reports, reproducible XCON examples, documentation fixes, security reviews, parser/renderer edge cases, and small pull requests with tests.

## Project principles

Please keep these principles intact:

1. **Viewer-only boundary**  
   XCON Viewer must not execute untrusted scripts or business logic.

2. **Safe rendering by default**  
   Changes must not introduce raw HTML injection, event handlers, unsafe URL handling, or external resource loading by default.

3. **One object model**  
   JSON, XML, TAGLESS, and SKETCH should map into the same XCON object model.

4. **Reproducible examples**  
   Bugs should include the smallest possible XCON document or Markdown fence that reproduces the issue.

5. **Deterministic behavior**  
   Parser, converter, validator, and renderer behavior should be stable and testable.

## Repository setup

Requirements:

- Node.js `>=20`
- npm

Install dependencies:

```bash
npm ci
```

Useful commands:

```bash
npm run build
npm run test
npm run lint
npm run typecheck
npm run site:build
npm run playground
```

Before opening a pull request, run at least:

```bash
npm run build
npm run test
```

If your change touches TypeScript types, public package APIs, parser behavior, renderer behavior, or docs generation, also run:

```bash
npm run lint
npm run typecheck
npm run site:build
```

## Good first contributions

Good starting points:

- Fix typos or unclear documentation.
- Add minimal examples under `examples/`.
- Add parser or conversion test cases.
- Improve error messages.
- Add missing validation for unsafe or ambiguous XCON input.
- Reproduce a rendering issue with a small input document.

Avoid starting with large rewrites, new syntax, or broad architecture changes unless there is an issue or discussion first.

## Opening issues

Use the issue templates when possible.

A useful issue includes:

- What you expected.
- What happened instead.
- The smallest XCON/Markdown example that reproduces it.
- The package or area affected.
- Environment details, such as browser, Node.js version, npm version, and OS.
- Screenshots or rendered output when relevant.

Do not open public issues for suspected vulnerabilities. Use [SECURITY.md](./SECURITY.md).

## Pull request process

1. Fork the repository.
2. Create a focused branch.

```bash
git checkout -b fix/parser-empty-style-block
```

3. Make the smallest useful change.
4. Add or update tests.
5. Update documentation when behavior changes.
6. Run the relevant commands.
7. Open a pull request using the PR template.

## Pull request quality bar

A pull request is easier to review when it:

- Has one clear purpose.
- Links to a related issue or discussion.
- Explains the user-visible behavior change.
- Includes before/after examples when relevant.
- Includes tests for parser, converter, validator, renderer, CLI, or integration changes.
- Does not mix formatting-only changes with logic changes.
- Does not weaken the security model.

## Security boundary checklist

If your change touches rendering, parsing, Markdown integration, URL handling, CSS handling, or external resources, explicitly confirm:

- No script execution is introduced.
- No event handler execution is introduced.
- No raw HTML injection is introduced.
- `javascript:` URLs remain blocked.
- External resources remain blocked by default unless explicitly allowed by a reviewed policy.
- CSS remains filtered through the intended allowlist.
- Error output does not leak secrets or local filesystem details.

## Commit style

Use short, descriptive commit messages.

Recommended examples:

```text
fix: reject javascript urls in sketch links
docs: clarify markdown fence usage
test: add xml roundtrip fixture
feat: add cli validation summary
chore: update issue templates
```

## Documentation changes

Documentation changes are welcome. When changing docs, check whether related files under `docs/`, `spec/`, `site/`, `examples/`, or README need to be updated together.

For syntax or security model changes, update the relevant spec or security document in the same pull request.

## Adding or changing XCON syntax

Do not add syntax only because it is convenient for one example.

Syntax changes should include:

- A clear use case.
- Parser behavior.
- Validation behavior.
- Conversion behavior across supported syntaxes when applicable.
- Renderer behavior, if any.
- Documentation and examples.
- Tests.

## License

By contributing to this repository, you agree that your contribution will be licensed under the repository's MIT license.

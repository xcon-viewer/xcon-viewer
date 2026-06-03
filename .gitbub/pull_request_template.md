## Summary

<!-- What does this PR change? Keep it short and concrete. -->

## Related issue or discussion

<!-- Example: Closes #123 / Related to #123 / Discussion: #123 -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] Test
- [ ] Refactor
- [ ] Build / CI
- [ ] Security hardening
- [ ] Other

## Area

- [ ] Core parser / object model
- [ ] Viewer renderer / Web Component
- [ ] CLI
- [ ] React wrapper
- [ ] Vue wrapper
- [ ] Markdown integration
- [ ] Vite plugin
- [ ] GitHub Action
- [ ] Public site / docs
- [ ] Examples
- [ ] Repository maintenance

## Behavior change

### Before

<!-- What happened before? -->

### After

<!-- What happens now? -->

## XCON examples

<!-- Add minimal input/output examples when relevant. -->

```xcon
<!-- paste minimal XCON / SKETCH / JSON / XML / TAGLESS example here -->
```

## Security boundary checklist

Required for changes touching rendering, parsing, Markdown integration, URL handling, CSS handling, or external resources.

- [ ] No script execution is introduced.
- [ ] No event handler execution is introduced.
- [ ] No raw HTML injection is introduced.
- [ ] `javascript:` URLs remain blocked.
- [ ] External resources remain blocked by default unless explicitly reviewed.
- [ ] CSS filtering / allowlist behavior remains safe.
- [ ] Error output does not leak secrets or local filesystem details.
- [ ] Not applicable.

## Tests run

- [ ] `npm ci`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run site:build`
- [ ] Other:

## Documentation

- [ ] README updated
- [ ] `docs/` updated
- [ ] `spec/` updated
- [ ] Examples updated
- [ ] Changelog updated
- [ ] Not applicable

## Screenshots or recordings

<!-- Add before/after screenshots for visual changes. -->

## Breaking changes

- [ ] No breaking changes
- [ ] Breaking changes are documented below

Details:

## Maintainer notes

<!-- Anything reviewers should pay attention to? -->

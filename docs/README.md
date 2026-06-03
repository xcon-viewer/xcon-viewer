# XCON Viewer Docs

Public XCON is a viewer-only UI document format. It describes one screen as structured objects and is optimized around XCON/SKETCH for authoring and XCON/JSON for canonical interchange. XML and TAGLESS are supported compatibility formats.

XCON/SKETCH is a compact authoring syntax for Markdown and LLM-generated examples. It parses into the same XCON Object Model and can be converted to JSON first, then XML or TAGLESS when compatibility output is needed.

## Documents

- [XCON component specs and examples](./xcon-component-specs.en.md)
- [Framework, Markdown, Vite, and GitHub integrations](./integrations.md)
- [Public site structure](./public-site.md)
- [Deployment guide](./deployment.md)
- [Deployment file inventory](./deployment-files.md)
- [Release and publish runbook](./release-and-publishing.md)
- [Format specification](../spec/README.md)
- [XCON/SKETCH syntax](../spec/xcon-sketch-syntax.md)
- [XCON/JSON syntax](../spec/xcon-json-syntax.md)
- [Examples](../examples/README.md)
- [JSON Schema](../schema/xcon.schema.json)
- [Playground](../playground/index.html) or `/play` through the static server

## Implementation References

- Core object model, parser, converter, validator: `packages/core`
- Viewer renderer and Web Component: `packages/viewer`
- CLI commands: `packages/cli`
- React wrapper: `packages/react`
- Vue wrapper: `packages/vue`
- Markdown plugins: `packages/markdown-it`, `packages/remark`
- Vite plugin: `packages/vite-plugin`
- GitHub Action: `packages/github-action`
- Public site pages and discovery files: `site`
- Public route map: `scripts/site-routes.mjs`
- Public static bundle builder: `scripts/build-public-site.mjs`
- Example generator: `scripts/generate-examples.mjs`
- Static playground server: `scripts/serve-static.mjs`

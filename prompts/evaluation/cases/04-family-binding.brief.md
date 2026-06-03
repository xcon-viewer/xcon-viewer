# Case 04: XCON Family Data Binding

Create a document that demonstrates the XCON family binding model.

## Required Architecture

- `xcon-chain-fixture` is the source of truth.
- Workflow updates fixture data only.
- Chain aliases derive values from the fixture.
- SKETCH reads `$aliases` and fixture paths.
- Workflow does not directly patch SKETCH component properties.

## Scenario

Use a live operations pipeline with six channels, queue progress, scheduler
ticks, and delivery targets.

## Must Test

- Changing fixture values should be enough to change the rendered dashboard.
- The SKETCH source should remain stable.
- Include a short explanation of the separation between fixture, chain,
  workflow, and sketch.


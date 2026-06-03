# XCON Viewer LLM Prompt Set

This folder contains reusable prompts for generating UI documents, data-bound
Markdown templates, XCON/SKETCH screens, XCON Chain expressions, and XCON
Workflow documents.

The prompts are written for LLMs that should produce artifacts for the XCON
Viewer family. Use them as building blocks: start with the shared contract, then
append the task-specific prompt that matches the artifact you want.

## Files

| File | Purpose |
| --- | --- |
| [00-shared-xcon-contract.md](00-shared-xcon-contract.md) | Non-negotiable syntax, rendering, and safety rules. Attach this to every generation request. |
| [01-sketch-ui-generation.md](01-sketch-ui-generation.md) | Generate a complete XCON/SKETCH UI screen. |
| [02-markdown-xcon-document.md](02-markdown-xcon-document.md) | Generate Markdown documents with embedded XCON/SKETCH visual blocks. |
| [03-xcon-chain-generation.md](03-xcon-chain-generation.md) | Generate XCON Chain SUGAR expressions and fixtures. |
| [04-xcon-workflow-generation.md](04-xcon-workflow-generation.md) | Generate XCON Workflow documents with queues, schedulers, and action flow. |
| [05-family-data-binding-template.md](05-family-data-binding-template.md) | Generate a full XCON family template: fixture + chain + sketch + workflow. |
| [06-monitoring-dashboard-workflow.md](06-monitoring-dashboard-workflow.md) | Generate realtime workflow monitoring dashboards. |
| [07-template-lab-business-document.md](07-template-lab-business-document.md) | Generate Template Lab business documents such as invoices, reports, bulletins, and checklists. |
| [08-review-and-repair.md](08-review-and-repair.md) | Review, validate, and repair generated XCON artifacts. |
| [09-chat-artifact-simulation.md](09-chat-artifact-simulation.md) | Simulate an LLM chat response that streams Markdown plus XCON/SKETCH artifacts. |

## Recommended Assembly

For most generation tasks, use:

1. `00-shared-xcon-contract.md`
2. One task prompt from `01` through `09`
3. Your product/domain brief
4. Any concrete data fixture or visual reference

Example:

```text
[shared contract]
[01 sketch UI generation prompt]

Task brief:
Create a mobile dashboard for a local grocery delivery app...
```

## Output Preference

For public XCON Viewer content, prefer this order:

1. XCON/SKETCH
2. XCON/JSON
3. XCON/XML
4. XCON/TAGLESS

When the generated artifact is a Markdown document, prefer visible syntax:

1. Markdown
2. XCON Chain SUGAR
3. XCON/SKETCH
4. XCON Workflow


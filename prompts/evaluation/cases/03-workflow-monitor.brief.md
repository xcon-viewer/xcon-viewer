# Case 03: Workflow Monitoring Dashboard

Create a workflow monitoring Markdown document for a realtime subtitle pipeline.

## Workflow

The process:

1. Load six channels.
2. Extract subtitles with a work queue.
3. Translate subtitles with a second work queue.
4. Run a bounded scheduler to sync status.
5. Persist delivery targets with a final work queue.

## Dashboard

The SKETCH dashboard must show:

- status title
- queue progress bar
- counters for requests, running, completed, failed
- scheduler tick strip
- delivery targets
- event stream

## Must Test

- Workflow includes `workqueue`.
- Workflow includes bounded `scheduler`.
- Dashboard components have stable names that a runner could update.
- Markdown text appears in addition to the SKETCH block.


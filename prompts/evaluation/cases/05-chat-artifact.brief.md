# Case 05: Chat Artifact Simulation

Answer this user request as if Markdown and XCON/SKETCH are native chat
rendering formats:

> What should I know about today's Seoul weather? Show the weather, outfit, and
> daily schedule as a visual card.

## Requirements

- The answer should feel like a natural assistant response.
- Do not explicitly say "I am using XCON" unless needed.
- Include concise Markdown bullets.
- Include one complete `xcon-sketch` weather card.
- The card should show temperature, condition, outfit suggestion, and schedule.

## Must Test

- The chat answer should not expose debug logs.
- The SKETCH fence starts with `screen`.
- The rendered visual should be useful as an inline chat artifact.


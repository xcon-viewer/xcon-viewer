# Security Policy

XCON Viewer is designed to render UI documents safely. Security reports are taken seriously, especially reports that affect the viewer-only boundary.

## Supported versions

This project is in an early public release stage.

| Version / branch | Supported |
| --- | --- |
| `main` | Yes |
| Latest published `0.x` release | Yes |
| Older unreleased snapshots | No |

If you are unsure whether a version is supported, report the issue anyway and include the commit SHA, package version, or deployment URL.

## What to report privately

Please report the following privately:

- Script execution from untrusted XCON, SKETCH, XML, TAGLESS, JSON, or Markdown input.
- Raw HTML injection.
- Event handler execution.
- `javascript:` URL bypasses.
- CSS allowlist bypasses that enable script execution, data exfiltration, or UI redress attacks.
- External resource loading bypasses.
- Markdown integration behavior that escapes the intended XCON viewer boundary.
- Parser, converter, or renderer behavior that can be used for denial of service with small malicious inputs.
- Leaks of secrets, local file paths, build credentials, or private deployment details.

## What does not need private reporting

The following can usually be opened as regular public issues:

- Typos.
- Broken links.
- Non-security rendering differences.
- Documentation gaps.
- Feature requests.
- Parser errors that do not create a security boundary bypass.

If you are not sure, report privately.

## How to report a vulnerability

Preferred:

1. Use GitHub's private vulnerability reporting / security advisory flow for this repository.
2. Include a minimal reproducible input.
3. Include affected package, version, browser/runtime, and environment.
4. Explain impact and expected behavior.
5. Do not publish the vulnerability publicly until maintainers have reviewed it.

Fallback contact:

```text
xconviewer@gmail.com
```

Before merging this file, confirm that this mailbox exists and is monitored. If not, replace it with the correct security contact.

## Report template

Please include:

```text
Summary:
Affected package or area:
Affected version / commit:
Environment:
Minimal XCON or Markdown input:
Steps to reproduce:
Expected result:
Actual result:
Impact:
Suggested fix, if known:
Public disclosure status:
```

## Response expectations

Maintainers will try to:

- Acknowledge valid reports.
- Reproduce the issue.
- Determine severity and affected versions.
- Prepare a fix or mitigation.
- Credit reporters when appropriate and requested.

This is an early-stage open-source project, so response times may vary. Please avoid public disclosure before maintainers have had a reasonable opportunity to investigate.

## Coordinated disclosure

If a vulnerability is confirmed, maintainers may:

- Create a private security advisory.
- Prepare a patch.
- Publish a release or mitigation.
- Update the security model documentation.
- Credit the reporter, unless they prefer to remain anonymous.

## Security model reference

XCON Viewer should preserve the following boundary:

- No JavaScript execution.
- No event handlers, backend calls, or business logic.
- No raw HTML injection by default.
- CSS filtered through an allowlist.
- `javascript:` URLs blocked.
- External resources blocked by default.

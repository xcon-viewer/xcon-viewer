# Changelog

## 0.1.6

### Changed
- Consolidated release jump from 0.1.2 directly to 0.1.6 (no public `0.1.3~0.1.5` artifacts were published in this sequence).
- Synchronized package metadata to release `0.1.6` across root + all `@xcon-viewer/*` packages (`core`, `viewer`, `cli`, `document-importer`, `github-action`, `markdown-it`, `react`, `remark`, `vite-plugin`, `vue`).
- Repaired `package-lock.json` metadata consistency for the root package entry (workspace version now reflects `0.1.6`).
- Updated public docs/snippets that still referenced prior tags (`v0.1.5`) including README, API page, and integration docs.
- Added a dedicated release procedure document for GitHub + npm publishing.

### Fixed
- Removed release-time ambiguity from package references (previously mixed tag references could point to older package versions).

## 0.1.3

### Changed
- Aligned all published package versions (`packages/*` and root) to `0.1.3`.
- Bumped inter-package dependencies to `0.1.3` for workspace consistency.
- Updated `package-lock.json` workspace metadata accordingly.
- Refreshed CDN/snippet and GitHub Action docs/examples to reference `v0.1.3`.
- Updated public deployment documentation with versioned release flow (Git tag + npm publish order).

## 0.1.2

### Fixed
- Improved public viewer layout parity for XCON/SKETCH rendering across playground, markdown preview, and standalone preview tools.
- Fixed markdown XCON fence sizing so small `screen` documents render without unnecessary scrollbars.
- Improved public list rendering for `dataTemplate` rows with `templates.cell` layouts.

## 0.1.1

### Fixed
- Fixed XCON/SKETCH parsing for multiline JSON property values such as `slides [` and `dataTemplate {`.
- Updated the public runtime bundle used by draft/public SKETCH preview tools.

## 0.1.0

### Added
- Initial public packages for XCON Viewer.

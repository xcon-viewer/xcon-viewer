# XCON Viewer 0.1.7 Release Runbook

This runbook prepares and publishes the public XCON Viewer packages and static site.
Run every command from the repository root unless a step says otherwise.

```powershell
Set-Location 'D:\CodeTruck\CodeBox\Xamong\06 XCON\xcon-viewer'
```

## 1. Confirm Current State

```powershell
git fetch origin --tags
git status --short --branch
git diff --stat
npm view @xcon-viewer/core version
npm view @xcon-viewer/viewer version
```

Expected before publishing this release:

- npm latest is `0.1.6`.
- local package versions are `0.1.7`.
- `CHANGELOG.md` has a `0.1.7` section.
- working tree may include release changes, but `.tmp/` and `tools/` work should not be staged for the public package release unless intentionally reviewed.

## 2. Install and Verify

```powershell
npm ci
npm run typecheck
npm run test:public
npm run build
npm run site:build
```

Do not publish if any command fails.

## 3. Verify Version Consistency

```powershell
node -e "const fs=require('fs');const path=require('path');const root=JSON.parse(fs.readFileSync('package.json','utf8')).version;const dirs=fs.readdirSync('packages',{withFileTypes:true}).filter(d=>d.isDirectory());const bad=[];for(const d of dirs){const file=path.join('packages',d.name,'package.json');const p=JSON.parse(fs.readFileSync(file,'utf8'));if(p.version!==root) bad.push(`${p.name}: version ${p.version} != ${root}`);for(const section of ['dependencies','devDependencies','peerDependencies','optionalDependencies']){for(const [name,range] of Object.entries(p[section]||{})){if(name.startsWith('@xcon-viewer/')&&range!==root) bad.push(`${p.name}: ${section}.${name}=${range}`)}}}console.log('root',root);if(bad.length){console.error(bad.join('\n'));process.exit(1)}console.log('all workspace versions aligned');"
rg -n "0\.1\.6" package.json package-lock.json packages -g package.json
```

The `rg` command should only show unrelated third-party versions if any; it must not show `@xcon-viewer` package versions.

## 4. Review Release Diff

```powershell
git diff -- CHANGELOG.md README.md docs/deployment.md docs/release-and-publishing.md docs/release-0.1.7-runbook.md
git diff -- package.json package-lock.json packages/core/package.json packages/viewer/package.json
git diff --name-status
```

Public release candidates include:

- package metadata: `package.json`, `package-lock.json`, `packages/*/package.json`
- public packages: `packages/core`, `packages/viewer`, `packages/markdown-it`, `packages/remark`, `packages/react`, `packages/vue`, `packages/vite-plugin`, `packages/cli`, `packages/document-importer`, `packages/github-action`
- public docs/specs/schema/site/example files changed for this release
- generated GitHub Action bundle: `packages/github-action/dist/index.js`

Review separately before staging:

- `dashboards/`
- `site/assets/kouri-mascot.png`
- any tracked changes under `tools/`

## 5. Dry-Run Package Contents

```powershell
$packages = @(
  '@xcon-viewer/core',
  '@xcon-viewer/viewer',
  '@xcon-viewer/cli',
  '@xcon-viewer/document-importer',
  '@xcon-viewer/react',
  '@xcon-viewer/vue',
  '@xcon-viewer/markdown-it',
  '@xcon-viewer/remark',
  '@xcon-viewer/vite-plugin',
  '@xcon-viewer/github-action'
)
foreach ($pkg in $packages) {
  npm pack --workspace $pkg --dry-run
  if ($LASTEXITCODE -ne 0) { throw "npm pack dry-run failed for $pkg" }
}
```

## 6. Stage, Commit, and Tag

Stage reviewed public release files explicitly. Avoid `git add .` for this release because the tree may contain local work folders.

```powershell
git add .gitignore CHANGELOG.md README.md package.json package-lock.json
git add docs/xcon-component-specs.en.md docs/ecosystem.md docs/deployment.md docs/integrations.md docs/release-and-publishing.md docs/release-0.1.7-runbook.md
git add spec/xcon-object-model.md spec/xcon-sketch-syntax.md spec/xcon-sketch-syntax.ko.md schema/xcon.schema.json
git add examples/showcase/README.md examples/showcase/p_map.xcon examples/showcase/p_map.xcon.json examples/showcase/p_map.xcon.sketch examples/showcase/p_map.xcon.xml
git add examples/showcase/p_line.xcon examples/showcase/p_line.xcon.json examples/showcase/p_line.xcon.sketch examples/showcase/p_line.xcon.xml
git add packages/core packages/viewer packages/markdown-it packages/remark packages/react packages/vue packages/vite-plugin packages/cli packages/document-importer packages/github-action
git add playground/sketch.html
git add scripts/build-public-site.mjs scripts/site-routes.mjs scripts/site-structure.test.mjs scripts/site-xcon-embed.test.mjs
git add site/index.html site/examples.html site/api.html site/meta-lab.html site/template-lab.html site/llms.txt site/llms-full.txt site/xcon-embed.css site/xcon-embed.js site/xcon-demo-renderer.mjs
```

Optional, only if reviewed and intended for the public release:

```powershell
git add dashboards
git add site/assets/kouri-mascot.png
```

Then commit and tag:

```powershell
git status --short
git diff --cached --stat
git commit -m "chore: release v0.1.7"
git tag v0.1.7
```

## 7. Push to GitHub

```powershell
git push origin main
git push origin v0.1.7
```

Create a GitHub release:

```powershell
gh release create v0.1.7 `
  --repo xcon-viewer/xcon-viewer `
  --title "xcon-viewer v0.1.7" `
  --notes "See CHANGELOG.md for the 0.1.7 release notes."
```

If GitHub CLI is not installed or authenticated, create the release in the GitHub web UI from tag `v0.1.7`.

## 8. Publish to npm

```powershell
npm login
npm whoami
npm config get registry
```

Publish in dependency order:

```powershell
npm publish --workspace @xcon-viewer/core --access public
npm publish --workspace @xcon-viewer/viewer --access public
npm publish --workspace @xcon-viewer/cli --access public
npm publish --workspace @xcon-viewer/document-importer --access public
npm publish --workspace @xcon-viewer/react --access public
npm publish --workspace @xcon-viewer/vue --access public
npm publish --workspace @xcon-viewer/markdown-it --access public
npm publish --workspace @xcon-viewer/remark --access public
npm publish --workspace @xcon-viewer/vite-plugin --access public
npm publish --workspace @xcon-viewer/github-action --access public
```

## 9. Post-Publish Verification

```powershell
npm view @xcon-viewer/core@0.1.7 version
npm view @xcon-viewer/viewer@0.1.7 version
npm view @xcon-viewer/cli@0.1.7 version
npm view @xcon-viewer/document-importer@0.1.7 version
npm view @xcon-viewer/react@0.1.7 version
npm view @xcon-viewer/vue@0.1.7 version
npm view @xcon-viewer/markdown-it@0.1.7 version
npm view @xcon-viewer/remark@0.1.7 version
npm view @xcon-viewer/vite-plugin@0.1.7 version
npm view @xcon-viewer/github-action@0.1.7 version
```

Smoke install in a temporary folder:

```powershell
$smoke = Join-Path $env:TEMP 'xcon-viewer-0.1.7-smoke'
Remove-Item -Recurse -Force $smoke -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $smoke | Out-Null
Push-Location $smoke
npm init -y
npm install @xcon-viewer/core@0.1.7 @xcon-viewer/viewer@0.1.7 @xcon-viewer/cli@0.1.7
npx xcon validate 'D:\CodeTruck\CodeBox\Xamong\06 XCON\xcon-viewer\examples\hello\hello.xcon.json'
Pop-Location
```

## 10. Static Site Deployment

Build and copy `dist-site/` to the production document root:

```powershell
npm run site:build
```

On the Linux server:

```bash
sudo mkdir -p /var/www/xconviewer.dev/releases/0.1.7
sudo rsync -a --delete dist-site/ /var/www/xconviewer.dev/releases/0.1.7/
sudo ln -sfn /var/www/xconviewer.dev/releases/0.1.7 /var/www/xconviewer.dev/current
sudo nginx -t
sudo systemctl reload nginx
curl -I https://xconviewer.dev/
curl -I https://xconviewer.dev/play
curl -I https://xconviewer.dev/xcon.schema.json
```

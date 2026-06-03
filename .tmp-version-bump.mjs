import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const newVersion = process.argv[2] || '0.1.4';
const pkgDirs = [
  'core',
  'viewer',
  'cli',
  'react',
  'vue',
  'markdown-it',
  'remark',
  'document-importer',
  'vite-plugin',
  'github-action',
];

const scopedNames = new Set(pkgDirs.map((d) => `@xcon-viewer/${d === 'document-importer' ? 'document-importer' : d}`));
const scopedNamesList = Array.from(scopedNames);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function updateWorkspacePackage(filePath) {
  const pkg = readJson(filePath);
  pkg.version = newVersion;

  const bumpIfScoped = (deps) => {
    if (!deps) return;
    for (const name of scopedNamesList) {
      if (deps[name] && /^\d+\.\d+\.\d+$/.test(deps[name])) {
        deps[name] = newVersion;
      }
    }
  };

  bumpIfScoped(pkg.dependencies);
  bumpIfScoped(pkg.devDependencies);
  bumpIfScoped(pkg.peerDependencies);
  bumpIfScoped(pkg.optionalDependencies);

  writeJson(filePath, pkg);
}

// root
const rootPkgPath = path.join(root, 'package.json');
const rootPkg = readJson(rootPkgPath);
rootPkg.version = newVersion;
writeJson(rootPkgPath, rootPkg);

for (const dir of pkgDirs) {
  const pkgPath = path.join(root, 'packages', dir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    continue;
  }
  updateWorkspacePackage(pkgPath);
}

// lockfile update
const lockPath = path.join(root, 'package-lock.json');
const lock = readJson(lockPath);
lock.version = newVersion;
if (lock.packages && lock.packages['']) {
  lock.packages[''].version = newVersion;
}

for (const [pkgPath, node] of Object.entries(lock.packages || {})) {
  if (!node) continue;

  if (node.name && node.name.startsWith('@xcon-viewer/')) {
    node.version = newVersion;
  }

  if (node.dependencies) {
    for (const [depName, depVersion] of Object.entries(node.dependencies)) {
      if (scopedNames.has(depName) && /^\d+\.\d+\.\d+$/.test(depVersion)) {
        node.dependencies[depName] = newVersion;
      }
    }
  }
}

writeJson(lockPath, lock);

// docs/refs
const docTargets = [
  'README.md',
  'site/api.html',
  'docs/integrations.md',
  'docs/deployment.md',
  'docs/deployment-files.md',
  'docs/README.md',
  'docs/public-site.md',
  'packages/github-action/README.md',
  'site/faq.html',
  'site/index.html',
  'site/docs.html',
  'packages/cli/package.json',
];

for (const rel of docTargets) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;

  const original = fs.readFileSync(p, 'utf8');
  const updated = original
    .replace(/v0\.1\.3/g, `v${newVersion}`)
    .replace(/@0\.1\.3/g, `@${newVersion}`)
    .replace(/\b0\.1\.3\b/g, newVersion);
  if (updated !== original) {
    fs.writeFileSync(p, updated, 'utf8');
  }
}

console.log(`Bumped version to ${newVersion}`);

// `npm run release` — keep the release tag and package.json version in lock step.
//
// Production deploys only when a `v*` tag is pushed and the workflow refuses
// mismatched tags, so this script does the version bookkeeping: run the Verify
// Gate locally, bump to the release version, commit, tag, bump back to the
// next `-dev` version, commit — then print the push commands. It never pushes:
// pushing the tag is the human's explicit production trigger.
//
// Fails loudly, in order (cheap state checks run before the slow Verify Gate,
// so a state that can never release fails fast with a precise message):
//   1. version is neither `X.Y.Z-dev` nor a plain `X.Y.Z` awaiting its first
//      tag (the current `1.0.0` is exactly this first-release case)
//   2. working tree dirty
//   3. tag `vX.Y.Z` already exists
//   4. `npm run verify` fails — abort before any commit or tag
//
// ponytail: version math is a two-line regex + minor bump; if the scheme grows
// beyond `X.Y.Z` / `X.Y.0-dev`, swap in a real semver helper.

import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');

function fail(message) {
  console.error(`release: ${message}`);
  process.exit(1);
}

function gitOutput(...args) {
  return execFileSync('git', args, {cwd: repoRoot, encoding: 'utf8'}).trim();
}

function git(args) {
  return execFileSync('git', args, {cwd: repoRoot, stdio: 'inherit'});
}

async function readPackageJson() {
  return JSON.parse(await readFile(packageJsonPath, 'utf8'));
}

// `npm version --no-git-tag-version` is the platform-blessed bump: it keeps
// BOTH version sources of truth in step (package.json and the package-lock.json
// root + `packages[""]` entries) and never touches git.
function setVersion(version) {
  execFileSync('npm', ['version', version, '--no-git-tag-version'], {cwd: repoRoot, stdio: 'inherit'});
}

// Plan the release from the current version, or fail loudly. A `-dev` suffix
// is stripped to get the release version; a plain `X.Y.Z` (no existing tag)
// IS the release version — the first-release bootstrap (current `1.0.0`).
function planRelease(current) {
  const match = /^(\d+)\.(\d+)\.(\d+)(-dev)?$/.exec(current);
  if (match === null) {
    fail(
      `current version "${current}" is not a release start — ` +
      'expected X.Y.Z-dev (or a plain X.Y.Z awaiting its first tag, e.g. 1.0.0).',
    );
  }
  // match[4] is the `-dev` suffix; a plain `X.Y.Z` (no suffix) is released
  // as-is, a `-dev` version is released by stripping the suffix.
  const plain = match[4] === undefined;
  const release = plain ? current : `${match[1]}.${match[2]}.${match[3]}`;
  // ponytail: dev bumps always jump to the next minor (`X.Y.0-dev`) per the
  // versioning scheme; a patch-level dev bump would need more rules.
  const nextDev = `${match[1]}.${Number(match[2]) + 1}.0-dev`;
  return {release, nextDev, tag: `v${release}`};
}

function assertCleanTree() {
  const dirty = gitOutput('status', '--porcelain');
  if (dirty !== '') {
    fail(`working tree is dirty:\n${dirty}\ncommit or stash your changes first.`);
  }
}

function assertTagFree(tag) {
  if (gitOutput('tag', '--list', tag) !== '') {
    fail(`tag ${tag} already exists — delete it or bump the version first.`);
  }
}

async function main() {
  const pkg = await readPackageJson();
  const {release, nextDev, tag} = planRelease(pkg.version);

  assertCleanTree();
  assertTagFree(tag);

  console.log(`release: running Verify Gate (npm run verify) for release ${release}…`);
  try {
    execFileSync('npm', ['run', 'verify'], {cwd: repoRoot, stdio: 'inherit'});
  } catch {
    fail('Verify Gate failed — release aborted; nothing was committed or tagged.');
  }

  // From a `-dev` version the release value is a real bump that gets its own
  // commit (the tag lands there). A plain `X.Y.Z` (first release, e.g. the
  // current `1.0.0`) already carries the release version, so there is nothing
  // to commit — the tag goes on the existing HEAD, whose package.json version
  // still matches it for the deploy-time guard.
  if (pkg.version !== release) {
    setVersion(release);
    git(['add', 'package.json', 'package-lock.json']);
    git(['commit', '--message', `chore(release): v${release}`]);
  }

  git(['tag', '--annotate', tag, '--message', `Release ${release}`]);

  setVersion(nextDev);
  git(['add', 'package.json', 'package-lock.json']);
  git(['commit', '--message', `chore: bump version to ${nextDev}`]);

  console.log(`release: ${release} tagged as ${tag}, next dev version ${nextDev}.`);
  console.log('release: push the branch and the tag to trigger the production deploy:');
  console.log('  git push');
  console.log('  git push --tags');
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
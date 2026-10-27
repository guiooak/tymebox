/**
 * The version a production deploy gets, from the commits since the last
 * release: `node scripts/release-version.ts [--pr <number>] [--notes <file>]`.
 *
 * Since the last `v*` tag, a breaking change (`feat!:`, or a
 * `BREAKING CHANGE:` footer) bumps the major, any `feat` the minor and
 * anything else the patch. With no tag yet, the version is package.json's.
 * Writes `version=…` to $GITHUB_OUTPUT (or prints it), and the release notes
 * to the `--notes` file. See .ai/plans/2026-10-26-02-versioned-releases.md.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export type Commit = { sha: string; subject: string; body: string };
export type Bump = 'major' | 'minor' | 'patch';

const HEADER = /^(\w+)(\([^)]*\))?(!)?:\s/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;
const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** The type of a Conventional Commit subject (`feat`, `fix`, …), or null. */
function typeOf(subject: string): string | null {
  return HEADER.exec(subject)?.[1].toLowerCase() ?? null;
}

function isBreaking(commit: Commit): boolean {
  return HEADER.exec(commit.subject)?.[3] === '!' || BREAKING_FOOTER.test(commit.body);
}

/** The largest bump any of the commits asks for. */
export function bumpFor(commits: Commit[]): Bump {
  if (commits.some(isBreaking)) {
    return 'major';
  }
  return commits.some((commit) => typeOf(commit.subject) === 'feat') ? 'minor' : 'patch';
}

/**
 * The next version after the `last` tag (`v1.2.3`), or `base` when there is
 * no release yet.
 */
export function nextVersion(
  last: string | null,
  base: string,
  commits: Commit[],
): string {
  const match = SEMVER.exec(last ?? '');
  if (!match) {
    if (!SEMVER.test(base)) {
      throw new Error(`Not a version: ${base}`);
    }
    return base.replace(/^v/, '');
  }
  const [major, minor, patch] = match.slice(1).map(Number);
  switch (bumpFor(commits)) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

const SECTIONS: Array<[title: string, matches: (commit: Commit) => boolean]> = [
  ['Breaking changes', isBreaking],
  ['Features', (commit) => typeOf(commit.subject) === 'feat'],
  ['Fixes', (commit) => typeOf(commit.subject) === 'fix'],
  ['Other changes', () => true],
];

/** Markdown for the GitHub Release: the commits, newest first, by kind. */
export function releaseNotes(last: string | null, commits: Commit[]): string {
  if (!last) {
    return 'The first versioned release of Tymebox.\n';
  }
  if (commits.length === 0) {
    return `No changes since ${last}.\n`;
  }
  const left = new Set(commits);
  const parts: string[] = [];
  for (const [title, matches] of SECTIONS) {
    const picked = [...left].filter(matches);
    if (picked.length === 0) {
      continue;
    }
    picked.forEach((commit) => left.delete(commit));
    const lines = picked.map(
      (commit) => `- ${commit.subject} (${commit.sha.slice(0, 7)})`,
    );
    parts.push(`## ${title}\n\n${lines.join('\n')}\n`);
  }
  return parts.join('\n');
}

/* ---------- CLI ---------- */

function git(...args: string[]): string {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function lastTag(): string | null {
  try {
    // Fails, quietly, until the first release is tagged.
    return git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*').trim();
  } catch {
    return null;
  }
}

function commitsSince(tag: string | null): Commit[] {
  const range = tag ? [`${tag}..HEAD`] : ['HEAD'];
  return git('log', '--format=%H%x1f%s%x1f%b%x1e', ...range)
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha, subject, body = ''] = entry.split('\x1f');
      return { sha, subject, body };
    });
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function main(args: string[]): void {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  const last = lastTag();
  const commits = commitsSince(last);
  const release = nextVersion(last, pkg.version, commits);
  const pr = option(args, '--pr');
  const version = pr ? `${release}-pr.${pr}` : release;

  const notes = option(args, '--notes');
  if (notes) {
    writeFileSync(notes, releaseNotes(last, commits));
  }
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    appendFileSync(output, `version=${version}\n`);
  }
  console.log(version);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}

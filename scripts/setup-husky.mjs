#!/usr/bin/env node
/**
 * setup-husky.mjs
 *
 * Configures git to use `.husky/_` as the local hooks directory.
 * This is needed because the project root contains `.git` but husky 9
 * refuses to initialize from a subdirectory (it requires `.git` in CWD).
 *
 * Runs as the `prepare` lifecycle script in `frontend/package.json`.
 * Idempotent — safe to run on every `npm install`.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(__filename), '..');

try {
  // Locate the git toplevel from the project root.
  const gitTopLevel = execSync('git rev-parse --show-toplevel', {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();

  if (!existsSync(resolve(gitTopLevel, '.git'))) {
    // Not inside a git repo (e.g. CI container with shallow clone).
    // Skip silently — CI does not run pre-commit hooks.
    process.exit(0);
  }

  const hooksPath = 'frontend/.husky/_';
  execSync(`git config --local core.hooksPath "${hooksPath}"`, {
    cwd: gitTopLevel,
    stdio: 'inherit',
  });

  console.log(`[husky] core.hooksPath set to ${hooksPath}`);
} catch (err) {
  // `git` not available or not a repo — exit cleanly, never break `npm install`.
  process.exit(0);
}

import { BLOCKED_CAPABILITIES, parseArgs, required, writeJson } from './report-lib.mjs';

// Infrastructure failure evidence is deliberately NOT an acceptance manifest.
// It cannot satisfy any expected lane, case, execution or screenshot requirement.
const options = parseArgs(process.argv.slice(2));
const stage = required(options, 'stage');
const outcome = required(options, 'outcome');
if (!/^[a-z0-9-]+$/.test(stage) || !['failure', 'cancelled', 'skipped'].includes(outcome)) throw new Error('Only a real non-success infrastructure outcome may be reported');
writeJson(required(options, 'output'), {
  schemaVersion: 1,
  sourceSha: process.env.GITHUB_SHA || '',
  runId: process.env.GITHUB_RUN_ID || '',
  timestamp: new Date().toISOString(),
  stage,
  outcome,
  executed: false,
  wholeApplicationAcceptance: false,
  scopedGate: 'failed',
  reason: 'Actual acceptance infrastructure did not become ready. Missing test evidence remains a gate failure; consult the job logs for the actual failure.',
  blockedCapabilities: BLOCKED_CAPABILITIES,
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { BLOCKED_CAPABILITIES, evidenceFiles, inventoryDigest, readJson, validateSchema, verifyExecution, writeJson } from './report-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = readJson(path.join(here, 'acceptance-manifest.schema.json'));

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'grido-report-selftest-'));
  const artifact = path.join(root, 'artifact');
  mkdirSync(artifact);
  for (const name of ['results.json', 'results.xml', 'execution.json', 'inventory-full.json', 'inventory-shard.json', 'html/index.html', 'blob/report.zip', 'output/trace.zip', 'output/screenshot.png', 'output/video.webm']) {
    mkdirSync(path.dirname(path.join(artifact, name)), { recursive: true });
    writeFileSync(path.join(artifact, name), 'synthetic-reporter-selftest-only');
  }
  const expected = [{ id: 'fixture-case-id', project: 'chromium', file: 'example.spec.ts', title: '[J01] synthetic reporter test', expectedStatus: 'passed', repeatEachIndex: 0, annotations: [], tags: [] }];
  const execution = { status: 'passed', globalErrorCount: 0, tests: [{ ...expected[0], outcome: 'expected', attempts: [{ status: 'passed', retry: 0, duration: 1, errorCount: 0, attachments: ['trace', 'screenshot', 'video'].map((name) => ({ name, contentType: 'application/octet-stream', path: `output/${name}.${name === 'trace' ? 'zip' : name === 'screenshot' ? 'png' : 'webm'}` })) }] }] };
  const manifest = {
    schemaVersion: 1, source: { sha: 'a'.repeat(40), ref: 'refs/heads/test/reporter', runId: '1', attempt: '1' }, lane: 'legacy-linux', project: 'chromium', shard: { index: 1, total: 1 }, fixtureKind: 'mocked-wails', timestamp: new Date().toISOString(),
    environment: { os: 'Linux', arch: 'X64', image: 'synthetic', imageVersion: '0', node: process.version, go: '1.26.11', playwright: 'synthetic' }, fixtures: [{ path: 'synthetic-fixture', sha256: 'b'.repeat(64) }], binary: null,
    inventory: { full: expected, selected: expected, fullHash: inventoryDigest(expected), selectedHash: inventoryDigest(expected), requiredCases: ['[J01]'] }, counts: { expectedProject: 1, expectedShard: 1, executed: 1, passed: 1, skipped: 0, retried: 0 }, evidencePolicy: { required: ['trace', 'screenshot', 'video'], video: 'required' }, execution, evidence: evidenceFiles(artifact), blockedCapabilities: BLOCKED_CAPABILITIES, wholeApplicationAcceptance: false, scopedGate: 'passed', failures: [],
  };
  return { root, artifact, expected, execution, manifest };
}

function merge(item, expected = 'legacy-linux/chromium:1') {
  writeJson(path.join(item.artifact, 'acceptance-manifest.json'), item.manifest);
  return spawnSync(process.execPath, [path.join(here, 'report-merge.mjs'), '--input', item.root, '--output', path.join(item.root, 'merged'), '--sha', 'a'.repeat(40), '--expected', expected, '--job', 'synthetic=success'], { encoding: 'utf8', env: { ...process.env, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_STEP_SUMMARY: '' } });
}

test('schema and exact-once evidence verifier accept a complete synthetic ledger', () => {
  const item = fixture();
  try { assert.deepEqual(validateSchema(item.manifest, schema), []); assert.deepEqual(verifyExecution(item.expected, item.execution, item.artifact, ['[J01]']), []); assert.equal(merge(item).status, 0); }
  finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('missing, unexpected, skipped, retried and absent evidence all fail', () => {
  const item = fixture();
  try {
    const retry = structuredClone(item.execution); retry.tests[0].attempts[0].retry = 1;
    assert.ok(verifyExecution(item.expected, retry, item.artifact).some((error) => error.includes('retried')));
    const skipped = structuredClone(item.execution); skipped.tests[0].attempts[0].status = 'skipped';
    assert.ok(verifyExecution(item.expected, skipped, item.artifact).length);
    assert.ok(verifyExecution(item.expected, { ...item.execution, tests: [] }, item.artifact).some((error) => error.includes('Missing execution')));
    assert.ok(verifyExecution([], item.execution, item.artifact).some((error) => error.includes('Unexpected')));
    rmSync(path.join(item.artifact, 'output/trace.zip'));
    assert.ok(verifyExecution(item.expected, item.execution, item.artifact).some((error) => error.includes('Invalid trace')));
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('native video is explicitly blocked but trace/screenshot remain mandatory', () => {
  const item = fixture();
  try {
    item.execution.tests[0].attempts[0].attachments = item.execution.tests[0].attempts[0].attachments.filter((attachment) => attachment.name !== 'video');
    assert.ok(verifyExecution(item.expected, item.execution, item.artifact).length);
    assert.deepEqual(verifyExecution(item.expected, item.execution, item.artifact, [], ['trace', 'screenshot']), []);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('merged gate detects missing shard, tampered evidence and forged whole acceptance', () => {
  const item = fixture();
  try {
    assert.notEqual(merge(item, 'legacy-linux/chromium:2').status, 0);
    rmSync(path.join(item.root, 'merged'), { recursive: true, force: true });
    writeFileSync(path.join(item.artifact, 'output/screenshot.png'), 'tampered');
    assert.notEqual(merge(item).status, 0);
    item.manifest.wholeApplicationAcceptance = true;
    assert.ok(validateSchema(item.manifest, schema).length);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('run wrapper refuses local E2E before any browser/process launch', () => {
  const result = spawnSync(process.execPath, [path.join(here, 'report-run.mjs')], { encoding: 'utf8', env: { ...process.env, CI: '', GITHUB_ACTIONS: '' } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /restricted to GitHub Actions/);
});

test('infrastructure blocker is truthful non-execution evidence, not an acceptance manifest', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'grido-infrastructure-selftest-'));
  try {
    const output = path.join(root, 'infrastructure-failure.json');
    const result = spawnSync(process.execPath, [path.join(here, 'report-infrastructure.mjs'), '--stage', 'local-supabase-provision', '--outcome', 'failure', '--output', output], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    const report = readJson(output);
    assert.equal(report.executed, false);
    assert.equal(report.wholeApplicationAcceptance, false);
    assert.equal(report.scopedGate, 'failed');
    assert.ok(validateSchema(report, schema).length);
    assert.ok(report.blockedCapabilities.length);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

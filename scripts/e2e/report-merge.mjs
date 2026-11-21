import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKED_CAPABILITIES, inventoryDigest, listFiles, parseArgs, readJson, required, sha256, validateSchema, verifyExecution, writeJson } from './report-lib.mjs';

const schema = readJson(path.join(path.dirname(fileURLToPath(import.meta.url)), 'acceptance-manifest.schema.json'));
const options = parseArgs(process.argv.slice(2), ['expected', 'job']);
const input = path.resolve(required(options, 'input'));
const output = path.resolve(required(options, 'output'));
const sourceSha = required(options, 'sha');
const expected = options.expected || [];
if (!expected.length) throw new Error('At least one independently expected lane/project/shard group is required');
mkdirSync(output, { recursive: true });
const failures = [];
const manifests = listFiles(input).filter((file) => path.basename(file) === 'acceptance-manifest.json');
const groups = new Map();
const summaries = [];
const blockedCapabilities = new Map(BLOCKED_CAPABILITIES.map((item) => [item.id, item]));
let blobIndex = 0;
for (const file of manifests) {
  const manifest = readJson(file);
  const artifactRoot = path.dirname(file);
  const label = `${manifest.lane}/${manifest.project}`;
  const invalid = validateSchema(manifest, schema);
  failures.push(...invalid.map((error) => `${label}: ${error}`));
  if (invalid.length) continue;
  for (const item of manifest.blockedCapabilities) blockedCapabilities.set(item.id, item);
  if (manifest.source.sha !== sourceSha || manifest.source.runId !== (process.env.GITHUB_RUN_ID || manifest.source.runId) || manifest.source.attempt !== (process.env.GITHUB_RUN_ATTEMPT || manifest.source.attempt)) failures.push(`${label}: mismatched SHA/run/attempt`);
  if (manifest.scopedGate !== 'passed' || manifest.failures.length) failures.push(`${label}: lane gate failed`);
  if (manifest.inventory.fullHash !== inventoryDigest(manifest.inventory.full) || manifest.inventory.selectedHash !== inventoryDigest(manifest.inventory.selected)) failures.push(`${label}: inventory hash mismatch`);
  if (manifest.counts.expectedProject !== manifest.inventory.full.length || manifest.counts.expectedShard !== manifest.inventory.selected.length || manifest.counts.executed !== manifest.execution.tests.length || manifest.counts.passed !== manifest.execution.tests.length || manifest.counts.skipped !== 0 || manifest.counts.retried !== 0) failures.push(`${label}: inconsistent/nonpassing counts`);
  const native = manifest.fixtureKind === 'native-third-party-contract';
  const expectedPolicy = native ? { required: ['trace', 'screenshot'], video: 'blocked-cdp-production-context' } : { required: ['trace', 'screenshot', 'video'], video: 'required' };
  if (JSON.stringify(manifest.evidencePolicy) !== JSON.stringify(expectedPolicy)) failures.push(`${label}: evidence policy mismatch`);
  if ((manifest.lane === 'actual-linux' || manifest.lane === 'native-windows') && (!manifest.binary || manifest.binary.publishable !== false)) failures.push(`${label}: missing sandbox-only binary provenance`);
  for (const blocked of BLOCKED_CAPABILITIES) if (!manifest.blockedCapabilities.some((item) => item.id === blocked.id && item.status === 'blocked')) failures.push(`${label}: missing blocked capability ${blocked.id}`);
  failures.push(...verifyExecution(manifest.inventory.selected, manifest.execution, artifactRoot, [], expectedPolicy.required).map((error) => `${label}: ${error}`));
  const fullIds = new Set(manifest.inventory.full.map((test) => test.id));
  if (fullIds.size !== manifest.inventory.full.length || manifest.inventory.full.some((test) => test.project !== manifest.project)) failures.push(`${label}: full inventory duplicates/project mismatch`);
  if (manifest.inventory.selected.some((test) => !fullIds.has(test.id) || test.project !== manifest.project)) failures.push(`${label}: selected inventory not in project`);
  const evidencePaths = new Set();
  for (const item of manifest.evidence) {
    if (evidencePaths.has(item.path)) failures.push(`${label}: duplicate evidence path`);
    evidencePaths.add(item.path);
    const target = path.resolve(artifactRoot, item.path);
    if (!target.startsWith(artifactRoot + path.sep) || !existsSync(target)) { failures.push(`${label}: missing/outside evidence`); continue; }
    const bytes = readFileSync(target);
    if (bytes.length !== item.bytes || sha256(bytes) !== item.sha256) failures.push(`${label}: evidence hash mismatch ${item.path}`);
    if (item.path.startsWith('blob/') && item.path.endsWith('.zip')) {
      const blobRoot = path.join(output, 'blob');
      mkdirSync(blobRoot, { recursive: true });
      copyFileSync(target, path.join(blobRoot, `report-${++blobIndex}.zip`));
    }
  }
  for (const requiredFile of ['results.json', 'results.xml', 'execution.json', 'inventory-full.json', 'inventory-shard.json', 'html/index.html']) if (!evidencePaths.has(requiredFile)) failures.push(`${label}: unhashed required report ${requiredFile}`);
  if (!manifest.evidence.some((item) => item.path.startsWith('blob/') && item.path.endsWith('.zip') && item.bytes > 0)) failures.push(`${label}: missing blob evidence`);
  (groups.get(label) || (groups.set(label, []), groups.get(label))).push(manifest);
  summaries.push({ lane: manifest.lane, project: manifest.project, shard: manifest.shard, fixtureKind: manifest.fixtureKind, counts: manifest.counts, scopedGate: manifest.scopedGate });
}
const expectedLabels = new Set();
for (const item of expected) {
  const match = /^([a-z0-9-]+)\/([a-z0-9-]+):(\d+)$/.exec(item);
  if (!match) throw new Error(`Invalid expected group ${item}`);
  const label = `${match[1]}/${match[2]}`;
  if (expectedLabels.has(label)) throw new Error(`Duplicate expected group ${label}`);
  expectedLabels.add(label);
  const total = +match[3];
  const group = groups.get(label) || [];
  if (group.length !== total) failures.push(`${label}: expected ${total} shard manifests, received ${group.length}`);
  const shardIds = new Set();
  const union = new Set();
  const reference = group[0];
  for (const manifest of group) {
    if (manifest.shard.total !== total || manifest.shard.index > total || shardIds.has(manifest.shard.index)) failures.push(`${label}: shard total/index mismatch`);
    shardIds.add(manifest.shard.index);
    if (manifest.inventory.fullHash !== reference.inventory.fullHash || JSON.stringify(manifest.fixtures) !== JSON.stringify(reference.fixtures)) failures.push(`${label}: cross-shard inventory/fixture drift`);
    for (const test of manifest.inventory.selected) {
      if (union.has(test.id)) failures.push(`${label}: case executed in multiple shards ${test.id}`);
      union.add(test.id);
    }
  }
  for (let index = 1; index <= total; index++) if (!shardIds.has(index)) failures.push(`${label}: missing shard ${index}`);
  for (const test of reference?.inventory.full || []) if (!union.has(test.id)) failures.push(`${label}: unexplained missing case ${test.id}`);
  for (const caseId of reference?.inventory.requiredCases || []) if (!reference.inventory.full.some((test) => test.title.includes(caseId) || test.tags?.includes(caseId))) failures.push(`${label}: required acceptance case absent ${caseId}`);
}
for (const label of groups.keys()) if (!expectedLabels.has(label)) failures.push(`${label}: unexpected lane/project`);
for (const job of options.job || []) {
  const index = job.indexOf('=');
  if (index < 1 || job.slice(index + 1) !== 'success') failures.push(`Required job not successful: ${job}`);
}
const summary = { schemaVersion: 1, sourceSha, timestamp: new Date().toISOString(), expectedGroups: expected, jobs: options.job || [], manifests: summaries, scopedGate: failures.length ? 'failed' : 'passed', wholeApplicationAcceptance: false, blockedCapabilities: [...blockedCapabilities.values()], failures };
writeJson(path.join(output, 'acceptance-summary.json'), summary);
writeJson(path.join(output, 'blocked-capabilities.json'), { wholeApplicationAcceptance: false, capabilities: [...blockedCapabilities.values()] });
const rows = ['## Scoped acceptance gate', '', `- Source SHA: \`${sourceSha}\``, `- Scoped gate: **${summary.scopedGate}**`, `- Evidence manifests: ${summaries.length}`, '- Whole application acceptance: **NOT established**', '- Live hardware / OAuth-email / Modal / native actual cloud auth: **blocked**, not silently skipped.', '', '| Lane | Project | Shard | Executed / expected | Fixture |', '| --- | --- | --- | --- | --- |', ...summaries.map((item) => `| ${item.lane} | ${item.project} | ${item.shard.index}/${item.shard.total} | ${item.counts.executed}/${item.counts.expectedShard} | ${item.fixtureKind} |`), '', ...failures.map((error) => `- Failure: ${error.replace(/[\r\n]/g, ' ')}`)];
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, rows.join('\n') + '\n');
console.log(rows.join('\n'));
if (failures.length) process.exitCode = 1;

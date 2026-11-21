import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKED_CAPABILITIES, FIXTURE_KINDS, SCHEMA_VERSION, evidenceFiles, inventoryDigest, listFiles, parseArgs, readJson, required, sha256, verifyExecution, writeJson } from './report-lib.mjs';

const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsRoot, '../..');

function runNode(cli, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd, env, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code: code ?? 1, signal }));
  });
}

async function main() {
  if (process.env.CI !== 'true' || process.env.GITHUB_ACTIONS !== 'true') throw new Error('E2E execution is restricted to GitHub Actions; no local E2E is permitted');
  const options = parseArgs(process.argv.slice(2), ['fixture-input', 'required-case']);
  const allowed = ['root', 'config', 'lane', 'project', 'shard', 'fixture-kind', 'fixture-input', 'required-case', 'output'];
  for (const key of Object.keys(options)) if (!allowed.includes(key)) throw new Error(`Unknown argument --${key}`);
  const root = path.resolve(repoRoot, required(options, 'root'));
  const config = path.resolve(root, required(options, 'config'));
  const lane = required(options, 'lane');
  const project = required(options, 'project');
  if (!/^[a-z0-9-]+$/.test(lane) || !/^[a-z0-9-]+$/.test(project)) throw new Error('Invalid lane or project');
  const fixtureKind = required(options, 'fixture-kind');
  if (!FIXTURE_KINDS.includes(fixtureKind)) throw new Error('Unsupported fixture kind');
  const match = /^(\d+)\/(\d+)$/.exec(required(options, 'shard'));
  if (!match || +match[1] < 1 || +match[1] > +match[2] || +match[2] > 16) throw new Error('Invalid shard');
  const shard = { index: +match[1], total: +match[2] };
  const output = path.resolve(required(options, 'output'));
  if (existsSync(output) && listFiles(output).length) throw new Error('Report output must be a new empty directory');
  mkdirSync(output, { recursive: true });
  const cli = path.resolve(root, 'node_modules/@playwright/test/cli.js');
  const reporter = path.resolve(scriptsRoot, 'report-playwright.cjs');
  const sourceSha = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/i.test(sourceSha || '')) throw new Error('Missing exact GitHub source SHA');
  // Reject accidental production injection even when the runner environment changes.
  for (const name of ['SUPABASE_URL', 'GRIDO_E2E_SUPABASE_URL', 'VITE_SUPABASE_URL']) {
    if (!process.env[name]) continue;
    const url = new URL(process.env[name]);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error(`${name} must target isolated loopback sandbox`);
  }
  const fixtureInputs = (options['fixture-input'] || []).map((input) => {
    const file = path.resolve(repoRoot, input);
    if (!file.startsWith(repoRoot + path.sep) || /(?:^|[/\\])\.env(?:\.|$)/.test(input)) throw new Error('Fixture source must be a repository file, never an environment/credential file');
    return { path: path.relative(repoRoot, file).replace(/\\/g, '/'), sha256: sha256(readFileSync(file)) };
  });
  if (!fixtureInputs.length) throw new Error('At least one fixture source hash is required');
  const requiredCases = options['required-case'] || [];
  const policy = fixtureKind === 'native-third-party-contract'
    ? { required: ['trace', 'screenshot'], video: 'blocked-cdp-production-context' }
    : { required: ['trace', 'screenshot', 'video'], video: 'required' };
  const baseEnv = {
    ...process.env,
    GRIDO_REPORT_DIR: output,
    GRIDO_ACCEPTANCE_STRICT: '1',
    PLAYWRIGHT_OUTPUT_DIR: path.join(output, 'output'),
    GRIDO_REPORT_EXECUTION_FILE: path.join(output, 'execution.json'),
    PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(output, 'results.json'),
    PLAYWRIGHT_JUNIT_OUTPUT_FILE: path.join(output, 'results.xml'),
    PLAYWRIGHT_BLOB_OUTPUT_DIR: path.join(output, 'blob'),
    PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(output, 'html'),
    PLAYWRIGHT_HTML_OPEN: 'never',
  };
  const fullInventoryPath = path.join(output, 'inventory-full.json');
  const selectedInventoryPath = path.join(output, 'inventory-shard.json');
  const common = ['test', `--config=${config}`, `--project=${project}`, '--retries=0', '--repeat-each=1', '--workers=1'];
  let executionExit = 1;
  const failures = [];
  let full = [];
  let selected = [];
  let execution = { status: 'not-run', globalErrorCount: 1, tests: [] };
  try {
    const listAll = await runNode(cli, [...common, '--list', `--reporter=${reporter}`], root, { ...baseEnv, GRIDO_REPORT_MODE: 'list', GRIDO_REPORT_INVENTORY_FILE: fullInventoryPath });
    if (listAll.code !== 0) throw new Error('Full project inventory failed');
    full = readJson(fullInventoryPath).tests;
    if (!full.length || full.some((test) => test.project !== project)) throw new Error('Full project inventory is empty or mismatched');
    const listShard = await runNode(cli, [...common, '--list', `--shard=${shard.index}/${shard.total}`, `--reporter=${reporter}`], root, { ...baseEnv, GRIDO_REPORT_MODE: 'list', GRIDO_REPORT_INVENTORY_FILE: selectedInventoryPath });
    if (listShard.code !== 0) throw new Error('Shard inventory failed');
    selected = readJson(selectedInventoryPath).tests;
    const result = await runNode(cli, [...common, `--shard=${shard.index}/${shard.total}`, `--output=${path.join(output, 'output')}`, '--trace=on', `--reporter=list,json,junit,blob,html,${reporter}`], root, { ...baseEnv, GRIDO_REPORT_MODE: 'run', GRIDO_REPORT_INVENTORY_FILE: '' });
    executionExit = result.code;
    execution = readJson(baseEnv.GRIDO_REPORT_EXECUTION_FILE);
  } catch (error) {
    failures.push(error.message);
  }
  failures.push(...verifyExecution(selected, execution, output, shard.total === 1 ? requiredCases : [], policy.required));
  if (executionExit !== 0) failures.push('Playwright process failed');
  for (const file of ['results.json', 'results.xml', 'html/index.html']) {
    if (!existsSync(path.join(output, file)) || readFileSync(path.join(output, file)).length === 0) failures.push(`Missing required report: ${file}`);
  }
  if (!listFiles(path.join(output, 'blob')).some((file) => file.endsWith('.zip'))) failures.push('Missing Playwright blob report');
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    source: { sha: sourceSha, ref: process.env.GITHUB_REF || '', runId: process.env.GITHUB_RUN_ID || '', attempt: process.env.GITHUB_RUN_ATTEMPT || '' },
    lane, project, shard, fixtureKind,
    timestamp: new Date().toISOString(),
    environment: { os: process.env.RUNNER_OS || '', arch: process.env.RUNNER_ARCH || '', image: process.env.ImageOS || '', imageVersion: process.env.ImageVersion || '', node: process.version, go: process.env.GO_VERSION || '', playwright: readJson(path.join(root, 'node_modules/@playwright/test/package.json')).version },
    fixtures: fixtureInputs,
    binary: (lane === 'actual-linux' || lane === 'native-windows') && process.env.GRIDO_E2E_BINARY && existsSync(process.env.GRIDO_E2E_BINARY) ? { sha256: sha256(readFileSync(process.env.GRIDO_E2E_BINARY)), publishable: false } : null,
    inventory: { full, selected, fullHash: inventoryDigest(full), selectedHash: inventoryDigest(selected), requiredCases },
    counts: { expectedProject: full.length, expectedShard: selected.length, executed: execution.tests.length, passed: execution.tests.filter((test) => test.attempts?.length === 1 && test.attempts[0].status === 'passed' && test.attempts[0].retry === 0).length, skipped: execution.tests.filter((test) => test.attempts?.some((attempt) => attempt.status === 'skipped')).length, retried: execution.tests.filter((test) => test.attempts?.length > 1 || test.attempts?.some((attempt) => attempt.retry > 0)).length },
    evidencePolicy: policy,
    execution,
    evidence: evidenceFiles(output),
    blockedCapabilities: [...BLOCKED_CAPABILITIES, ...(policy.video.startsWith('blocked') ? [{ id: 'native-video', status: 'blocked', reason: 'Playwright CDP attaches to the existing production WebView2 context; native video recording is unsupported. Actual trace and screenshots remain required.' }] : [])],
    wholeApplicationAcceptance: false,
    scopedGate: failures.length ? 'failed' : 'passed',
    failures,
  };
  writeJson(path.join(output, 'acceptance-manifest.json'), manifest);
  console.log(`Scoped lane ${lane}/${project} ${shard.index}/${shard.total}: ${manifest.scopedGate}; ${manifest.counts.executed}/${manifest.counts.expectedShard} executed; whole application acceptance NOT established`);
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

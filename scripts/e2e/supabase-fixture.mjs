#!/usr/bin/env node
// CI-only, real local Supabase. No linked/cloud commands, no repository .env,
// no route mocks, no production config/migration writes. Node built-ins only.
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_VERSION = '2.81.3';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SCRIPT_DIR, '../..');
const HISTORIC_ID = 'b2943199-cb11-4adc-9275-5a746aab879c';
const args = process.argv.slice(2);
const action = args.shift();
const flags = {};
while (args.length) {
  const flag = args.shift();
  if (!['--root', '--env-file'].includes(flag) || !args[0] || flags[flag]) {
    throw new Error('Use start|stop --root ABSOLUTE_RUNNER_TEMP_PATH --env-file ABSOLUTE_RUNNER_TEMP_PATH');
  }
  flags[flag] = args.shift();
}
let root;
let envFile;
let report;
let stage = 'preflight';
let canStop = false;
const cliEnv = { ...process.env, CI: 'true', NO_COLOR: '1' };
// Never let a linked-project/profile/database environment target real cloud.
for (const key of Object.keys(cliEnv)) {
  if (/^(SUPABASE_|PG|VITE_SUPABASE)/.test(key)) delete cliEnv[key];
}

async function restrictedWrite(file, text) {
  await fs.writeFile(file, text, { mode: 0o600, flag: 'w' });
  await fs.chmod(file, 0o600);
}
function isUnder(parent, candidate) {
  const rel = path.relative(parent, candidate);
  return rel && !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel);
}
async function preflight() {
  if (process.platform !== 'linux' || process.env.CI !== 'true' || !process.env.RUNNER_TEMP) {
    throw new Error('This fixture may only run on a Linux CI runner with RUNNER_TEMP');
  }
  if (!['start', 'stop'].includes(action) || !flags['--root'] || !flags['--env-file']) {
    throw new Error('Expected start|stop --root PATH --env-file PATH');
  }
  const temp = await fs.realpath(process.env.RUNNER_TEMP);
  root = path.resolve(flags['--root']);
  envFile = path.resolve(flags['--env-file']);
  for (const target of [root, envFile]) {
    if (!path.isAbsolute(flags[target === root ? '--root' : '--env-file']) || !isUnder(temp, target)) {
      throw new Error('All fixture paths must be strict descendants of RUNNER_TEMP');
    }
    const realParent = await fs.realpath(path.dirname(target));
    if (realParent !== temp && !isUnder(temp, realParent)) throw new Error('Fixture parent escapes RUNNER_TEMP');
    try {
      if ((await fs.lstat(target)).isSymbolicLink()) throw new Error('Fixture path may not be a symlink');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, {
    cwd: REPO, env: cliEnv, encoding: 'utf8', timeout: 600_000,
    maxBuffer: 24 * 1024 * 1024, ...options,
  });
  // Do not echo stdout/stderr: CLI start/status and API errors can contain keys.
  if (result.error || result.status !== 0) {
    if (stage === 'migration-replay' && report) {
      // A filename alone is safe diagnostic evidence; never retain CLI output
      // containing connection strings, signing secrets or SQL row values.
      const applying = [...`${result.stdout || ''}\n${result.stderr || ''}`.matchAll(/Applying migration (\d+_[a-zA-Z0-9_.-]+\.sql)/g)];
      if (applying.length) report.blockedMigration = applying.at(-1)[1];
    }
    throw new Error(`${command} failed at ${stage} (exit ${result.status ?? 'unavailable'})`);
  }
  return result.stdout;
}
async function checkpoint(name, outcome = 'passed', extra = {}) {
  stage = name;
  report.stages.push({ name, outcome, at: new Date().toISOString(), ...extra });
  await restrictedWrite(path.join(root, 'provision-report.json'), JSON.stringify(report, null, 2));
}
async function freePorts() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const base = 55000 + randomBytes(2).readUInt16BE() % 700;
    const servers = [];
    try {
      for (let n = 0; n < 7; n += 1) {
        const server = net.createServer();
        await new Promise((resolve, reject) => {
          server.once('error', reject);
          server.listen(base + n, '0.0.0.0', resolve);
        });
        servers.push(server);
      }
      return { API_PORT: base, DB_PORT: base + 1, SHADOW_PORT: base + 2, STUDIO_PORT: base + 3, MAIL_PORT: base + 4, SMTP_PORT: base + 5 };
    } catch { /* Choose another unused block; no ignore-health-check fallback. */ }
    finally {
      await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    }
  }
  throw new Error('No free local fixture port block');
}
function jwtRole(key) {
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; }
  catch { return undefined; }
}
function assertLoopback(value, expectedPort, protocol) {
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || Number(url.port) !== expectedPort || url.protocol !== protocol) {
    throw new Error('CLI returned an unexpected non-fixture endpoint');
  }
  return url;
}
function sqlLiteral(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function databaseSQL(dbURL, sql) {
  const u = new URL(dbURL);
  return run('psql', ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--tuples-only', '--no-align'], {
    input: sql, env: { ...cliEnv, PGHOST: u.hostname, PGPORT: u.port, PGUSER: decodeURIComponent(u.username),
      PGPASSWORD: decodeURIComponent(u.password), PGDATABASE: 'postgres', PGCONNECT_TIMEOUT: '15', PGSSLMODE: 'disable' },
  }).trim();
}
async function request(api, key, token, endpoint, method = 'GET', body) {
  const response = await fetch(`${api}${endpoint}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { status: response.status, ok: response.ok, data };
}
function requireResult(condition, message) { if (!condition) throw new Error(message); }
async function stop() {
  const marker = JSON.parse(await fs.readFile(path.join(root, 'fixture-marker.json'), 'utf8'));
  requireResult(/^grido-e2e-[a-f0-9]{16}$/.test(marker.projectId), 'Invalid fixture ownership marker');
  stage = 'stop';
  run('supabase', ['stop', '--workdir', root, '--project-id', marker.projectId, '--no-backup']);
  // Preserve sanitized reports only. Never upload the root, env or CLI temp data.
  await fs.rm(path.join(root, 'private'), { recursive: true, force: true });
  await fs.rm(path.join(root, 'supabase', '.temp'), { recursive: true, force: true });
  await fs.rm(envFile, { force: true });
  process.stdout.write('Disposable Supabase fixture stopped; private state removed.\n');
}
async function start() {
  try { await fs.mkdir(root, { mode: 0o700 }); }
  catch { throw new Error('Fixture root must be a new empty directory'); }
  report = { fixtureKind: 'actual-local-supabase', cliVersion: CLI_VERSION, outcome: 'provisioning',
    historicalPrerequisite: { id: HISTORIC_ID, synthetic: true, hasLogin: false, removedAfterReplay: false },
    docs: ['https://supabase.com/docs/guides/local-development/cli/config', 'https://github.com/supabase/cli/releases/tag/v2.81.3'],
    stages: [], blocked: [
      { id: 'cloud-ai', reason: 'No real cloud AI allowed; local SQL quota checks are not inference acceptance.' },
      { id: 'google-oauth', reason: 'Real Google identity requires external OAuth provider; disabled in disposable local fixture.' },
      { id: 'physical-camera-printer', reason: 'Browser synthetic photo/local server is not physical device acceptance.' },
    ] };
  await checkpoint('preflight');
  const actualVersion = run('supabase', ['--version']).trim();
  requireResult(actualVersion === CLI_VERSION, `Supabase CLI must be pinned to ${CLI_VERSION}`);
  const help = ['# Supabase CLI version', actualVersion];
  for (const command of [['start'], ['status'], ['migration', 'up'], ['stop']]) {
    help.push(`# supabase ${command.join(' ')} --help`, run('supabase', [...command, '--help']));
  }
  requireResult(help.join('\n').includes('--local') && help.join('\n').includes('--no-backup') && help.join('\n').includes('--workdir'), 'Pinned CLI help contract changed');
  await restrictedWrite(path.join(root, 'cli-help.txt'), help.join('\n'));
  await checkpoint('cli-contract');
  run('docker', ['info', '--format', '{{.ServerVersion}}']);
  run('psql', ['--version']);
  const ports = await freePorts();
  const runId = randomBytes(8).toString('hex');
  const projectId = `grido-e2e-${runId}`;
  const privateDir = path.join(root, 'private');
  await fs.mkdir(privateDir, { mode: 0o700 });
  const migrationDir = path.join(root, 'supabase', 'migrations');
  await fs.mkdir(migrationDir, { recursive: true, mode: 0o700 });
  const substitutions = { PROJECT_ID: projectId, ...ports };
  const template = await fs.readFile(path.join(SCRIPT_DIR, 'supabase-fixture', 'config.toml'), 'utf8');
  const config = template.replace(/@@([A-Z_]+)@@/g, (_, name) => {
    if (!(name in substitutions)) throw new Error('Unknown fixture config placeholder');
    return substitutions[name];
  });
  await restrictedWrite(path.join(root, 'supabase', 'config.toml'), config);
  await restrictedWrite(path.join(root, 'fixture-marker.json'), JSON.stringify({ projectId, runId }));
  canStop = true;
  stage = 'start-empty-stack';
  run('supabase', ['start', '--workdir', root]);
  await checkpoint('start-empty-stack');
  const status = JSON.parse(run('supabase', ['status', '--workdir', root, '--output', 'json']));
  assertLoopback(status.API_URL, ports.API_PORT, 'http:');
  assertLoopback(status.DB_URL, ports.DB_PORT, 'postgresql:');
  requireResult(jwtRole(status.ANON_KEY) === 'anon' && jwtRole(status.SERVICE_ROLE_KEY) === 'service_role', 'Expected local legacy anon/service-role keys');
  const api = `http://127.0.0.1:${ports.API_PORT}`;
  // All privileged connection data stays in private state; never shared env.
  await restrictedWrite(path.join(privateDir, 'status.json'), JSON.stringify(status));
  stage = 'historical-principal';
  databaseSQL(status.DB_URL, await fs.readFile(path.join(SCRIPT_DIR, 'supabase-fixture', 'historical-principal.sql'), 'utf8'));
  await checkpoint('historical-principal');
  const files = (await fs.readdir(path.join(REPO, 'supabase', 'migrations'))).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  requireResult(files.length > 0, 'No existing application migrations');
  report.migrations = [];
  for (const name of files) {
    const bytes = await fs.readFile(path.join(REPO, 'supabase', 'migrations', name));
    await fs.writeFile(path.join(migrationDir, name), bytes, { mode: 0o600, flag: 'wx' });
    report.migrations.push({ name, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  stage = 'migration-replay';
  run('supabase', ['migration', 'up', '--local', '--workdir', root]);
  const applied = JSON.parse(databaseSQL(status.DB_URL, "SELECT coalesce(json_agg(version ORDER BY version), '[]'::json)::text FROM supabase_migrations.schema_migrations;"));
  requireResult(JSON.stringify(applied) === JSON.stringify(files.map(name => name.split('_')[0])), 'Migration history does not exactly match unchanged repository files');
  databaseSQL(status.DB_URL, `DELETE FROM auth.users WHERE id = '${HISTORIC_ID}'; NOTIFY pgrst, 'reload schema';`);
  report.historicalPrerequisite.removedAfterReplay = true;
  await checkpoint('migration-replay', 'passed', { applied: applied.length, byteIdentical: true });
  const credentials = {};
  stage = 'synthetic-auth-users';
  for (const role of ['ADMIN', 'USER', 'TARGET', 'PHONE']) {
    const email = `${role.toLowerCase()}-${runId}@fixture.invalid`;
    const password = `Aa1!${randomBytes(24).toString('base64url')}`;
    const created = await request(api, status.SERVICE_ROLE_KEY, status.SERVICE_ROLE_KEY, '/auth/v1/admin/users', 'POST', {
      email, password, email_confirm: true, user_metadata: { name: `Synthetic ${role.toLowerCase()} ${runId}` }, app_metadata: {},
    });
    requireResult(created.ok && created.data?.id, `Synthetic ${role.toLowerCase()} creation failed (HTTP ${created.status})`);
    credentials[`E2E_${role}_EMAIL`] = email;
    credentials[`E2E_${role}_PASSWORD`] = password;
    credentials[`E2E_${role}_ID`] = created.data.id;
  }
  const licenseKey = `E2E-${runId.toUpperCase()}-${randomBytes(8).toString('hex').toUpperCase()}`;
  stage = 'fixture-entitlements';
  const ids = ['ADMIN', 'USER', 'TARGET', 'PHONE'].map(role => sqlLiteral(credentials[`E2E_${role}_ID`]));
  databaseSQL(status.DB_URL, `BEGIN;
    INSERT INTO public.admin_users(user_id) VALUES (${ids[0]});
    UPDATE public.profiles SET plan = 'pro', status = 'active', expires_at = now() + interval '90 days', license_key = NULL WHERE id IN (${ids.join(',')});
    UPDATE public.profiles SET plan = 'enterprise' WHERE id = ${ids[0]};
    INSERT INTO public.license_keys(key, plan, duration_months, status) VALUES (${sqlLiteral(licenseKey)}, 'pro', 1, 'unused');
    DELETE FROM public.user_sessions WHERE user_id IN (${ids.join(',')});
    COMMIT; NOTIFY pgrst, 'reload schema';`);
  requireResult(databaseSQL(status.DB_URL, `SELECT count(*) FROM public.profiles WHERE id IN (${ids.join(',')}) AND status='active' AND expires_at > now();`) === '4', 'Fixture entitlement rows missing');
  await checkpoint('synthetic-auth-and-entitlements');
  stage = 'auth-rls-probes';
  const sessions = {};
  for (const role of ['ADMIN', 'USER']) {
    const auth = await request(api, status.ANON_KEY, status.ANON_KEY, '/auth/v1/token?grant_type=password', 'POST', {
      email: credentials[`E2E_${role}_EMAIL`], password: credentials[`E2E_${role}_PASSWORD`],
    });
    requireResult(auth.ok && auth.data?.access_token, `Synthetic ${role.toLowerCase()} real login failed`);
    sessions[role] = auth.data.access_token;
    const isAdmin = await request(api, status.ANON_KEY, sessions[role], '/rest/v1/rpc/is_admin', 'POST', {});
    requireResult(isAdmin.ok && isAdmin.data === (role === 'ADMIN'), 'Admin membership authorization regression');
  }
  const own = await request(api, status.ANON_KEY, sessions.USER, `/rest/v1/profiles?select=id&id=eq.${credentials.E2E_USER_ID}`);
  requireResult(own.ok && own.data?.length === 1, 'User cannot read own profile');
  const other = await request(api, status.ANON_KEY, sessions.USER, `/rest/v1/profiles?select=id&id=eq.${credentials.E2E_ADMIN_ID}`);
  requireResult(other.ok && other.data?.length === 0, 'User RLS leaks another profile');
  const forbiddenPatch = await request(api, status.ANON_KEY, sessions.USER, `/rest/v1/profiles?id=eq.${credentials.E2E_USER_ID}`, 'PATCH', { plan: 'enterprise' });
  requireResult(forbiddenPatch.status === 403 && forbiddenPatch.data?.code === '42501', 'Self-entitlement escalation not explicitly denied');
  for (const token of [status.ANON_KEY, sessions.USER]) {
    const denied = await request(api, status.ANON_KEY, token, '/rest/v1/rpc/admin_create_license_key', 'POST', { p_plan: 'pro', p_duration_months: 1, p_custom_key: `DENIED-${randomUUID()}` });
    requireResult(!denied.ok && ['42501', 'P0001'].includes(denied.data?.code), 'Non-admin privileged RPC unexpectedly allowed');
  }
  for (const token of Object.values(sessions)) {
    const logout = await request(api, status.ANON_KEY, token, '/auth/v1/logout', 'POST');
    requireResult(logout.ok, 'Provisioning probe session logout failed');
  }
  await checkpoint('auth-rls-probes');
  const publicEnv = { SUPABASE_URL: api, SUPABASE_ANON_KEY: status.ANON_KEY,
    VITE_SUPABASE_URL: api, VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
    ...credentials, E2E_LICENSE_KEY: licenseKey, E2E_RUN_ID: runId, E2E_FIXTURE_ROOT: root,
    E2E_FIXTURE_KIND: 'actual-local-supabase', E2E_MAILPIT_URL: `http://127.0.0.1:${ports.MAIL_PORT}` };
  const shellQuote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
  await restrictedWrite(envFile, Object.entries(publicEnv).map(([key, value]) => `export ${key}=${shellQuote(value)}`).join('\n') + '\n');
  report.outcome = 'provisioned';
  report.runId = runId;
  report.endpoints = { api, mailpit: publicEnv.E2E_MAILPIT_URL };
  await checkpoint('public-env-written');
  process.stdout.write('Disposable Supabase fixture provisioned; source restricted env file (never print or upload it).\n');
}
try {
  await preflight();
  if (action === 'stop') await stop(); else await start();
} catch (error) {
  if (report) {
    report.outcome = 'blocked';
    // Error messages only originate from this script; never API/CLI response bodies.
    report.stages.push({ name: stage, outcome: 'blocked', reason: error.message });
    await restrictedWrite(path.join(root, 'provision-report.json'), JSON.stringify(report, null, 2)).catch(() => {});
  }
  if (canStop) {
    try { run('supabase', ['stop', '--workdir', root, '--no-backup']); }
    catch { /* Preserve original sanitized blocker; CI always calls stop again. */ }
    await fs.rm(path.join(root, 'private'), { recursive: true, force: true }).catch(() => {});
    await fs.rm(path.join(root, 'supabase', '.temp'), { recursive: true, force: true }).catch(() => {});
    await fs.rm(envFile, { force: true }).catch(() => {});
  }
  process.stderr.write(`Disposable Supabase provisioning blocked at ${stage}; inspect sanitized provision-report.json.\n`);
  process.exitCode = 1;
}

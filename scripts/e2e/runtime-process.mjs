import { spawn } from 'node:child_process';
import { promises as fs, createWriteStream } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';

const dialogKinds = new Set(['open-file', 'open-files', 'open-directory', 'save-file']);

async function atomicJSON(filename, value) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  const file = await fs.open(temporary, 'wx', 0o600);
  try {
    await file.writeFile(`${JSON.stringify(value, null, 2)}\n`);
    await file.sync();
    await file.close();
    await fs.rename(temporary, filename);
  } finally {
    await file.close().catch(() => {});
    await fs.rm(temporary, { force: true });
  }
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function selectedPort(port) {
  if (port !== undefined && (!Number.isInteger(port) || port < 1024 || port > 65535)) {
    throw new Error('port must be an integer in 1024..65535');
  }
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(port ?? 0, '127.0.0.1', resolve);
  });
  const selected = listener.address().port;
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return selected;
}

// No build, frontend mock bridge or profile injection occurs here. This module
// launches prebuilt same-main e2e-tagged Wails artifacts only.
export class RuntimeProcess {
  constructor({ binary = process.env.GRIDO_E2E_BINARY, mode, appDir, port, env = {}, startupTimeoutMs = 60_000 } = {}) {
    if (!binary || !path.isAbsolute(binary)) throw new Error('binary/GRIDO_E2E_BINARY must be absolute');
    if (!appDir || !path.isAbsolute(appDir) || path.parse(appDir).root === path.resolve(appDir)) {
      throw new Error('appDir must be an absolute per-run directory, not a filesystem root');
    }
    if (!['server', 'native'].includes(mode)) throw new Error('mode must be server or native');
    if (mode === 'native' && process.platform !== 'win32') throw new Error('native mode requires Windows WebView2');
    this.binary = binary;
    this.mode = mode;
    this.appDir = path.resolve(appDir);
    this.port = port;
    this.env = { ...env };
    this.startupTimeoutMs = startupTimeoutMs;
    this.paths = {
      database: path.join(this.appDir, 'grido.db'),
      media: path.join(this.appDir, 'Media'),
      exports: path.join(this.appDir, 'Exports'),
      autosave: path.join(this.appDir, 'autosave.json'),
      webviewCache: path.join(this.appDir, 'webview_cache'),
      fixtures: path.join(this.appDir, 'fixtures'),
      dialogs: path.join(this.appDir, 'e2e-dialogs'),
      stdout: path.join(this.appDir, 'runtime-stdout.log'),
      stderr: path.join(this.appDir, 'runtime-stderr.log'),
      metadata: path.join(this.appDir, 'runtime-process.json'),
    };
    this.sequence = 0;
    this.generation = 0;
    this.child = null;
    this.baseURL = undefined;
    this.cdpURL = undefined;
  }

  get pid() { return this.child?.pid; }

  async start() {
    if (this.child && this.child.exitCode === null && this.child.signalCode === null) throw new Error('runtime is already running');
    await fs.mkdir(this.appDir, { recursive: true });
    if (path.resolve(await fs.realpath(this.appDir)) !== this.appDir) throw new Error('appDir must have no symlink ancestors');
    for (const directory of [this.paths.fixtures, this.paths.exports, this.paths.dialogs, path.join(this.paths.dialogs, 'pending'), path.join(this.paths.dialogs, 'consumed')]) {
      await fs.mkdir(directory, { recursive: true });
      if (path.resolve(await fs.realpath(directory)) !== directory) throw new Error('runtime directory traverses a symlink');
    }
    await fs.access(this.binary);
    this.port = await selectedPort(this.port);
    const endpoint = `http://127.0.0.1:${this.port}`;
    this.baseURL = this.mode === 'server' ? endpoint : undefined;
    this.cdpURL = this.mode === 'native' ? endpoint : undefined;
    const env = { ...process.env, ...this.env };
    // Alias sandbox outputs while retaining production Go HTTP/auth flows.
    env.SUPABASE_URL = env.GRIDO_E2E_SUPABASE_URL ?? env.SUPABASE_URL ?? '';
    env.SUPABASE_ANON_KEY = env.GRIDO_E2E_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? '';
    for (const key of ['FRONTEND_DEVSERVER_URL', 'WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', 'WEBVIEW2_USER_DATA_FOLDER']) delete env[key];
    Object.assign(env, {
      GRIDO_APP_DIR: this.appDir,
      GRIDO_E2E_DIALOG_ROOT: this.appDir,
      GRIDO_E2E_MODE: this.mode,
      GRIDO_E2E_SERVER_PORT: this.mode === 'server' ? String(this.port) : '',
      GRIDO_E2E_CDP_PORT: this.mode === 'native' ? String(this.port) : '',
      WAILS_SERVER_HOST: '127.0.0.1',
      WAILS_SERVER_PORT: String(this.port),
    });
    this.generation += 1;
    this.stdout = createWriteStream(this.paths.stdout, { flags: 'a' });
    this.stderr = createWriteStream(this.paths.stderr, { flags: 'a' });
    this.child = spawn(this.binary, [], { cwd: path.dirname(this.binary), env, windowsHide: false, stdio: ['ignore', 'pipe', 'pipe'] });
    this.child.stdout.pipe(this.stdout);
    this.child.stderr.pipe(this.stderr);
    this.exit = new Promise((resolve) => {
      this.child.once('error', (error) => resolve({ code: null, signal: null, error: error.message }));
      this.child.once('close', (code, signal) => resolve({ code, signal }));
    });
    try {
      await this.waitUntilReady();
      await atomicJSON(this.paths.metadata, {
        mode: this.mode, binary: this.binary, pid: this.pid, appDir: this.appDir,
        port: this.port, baseURL: this.baseURL, cdpURL: this.cdpURL, generation: this.generation,
        ready: true, paths: this.paths,
        runtime: this.mode === 'server' ? 'same-main-go-wails-server' : 'windows-native-webview2-cdp',
        dialogs: 'dialog-adapter-only; excludes-os-ui',
        auth: env.GRIDO_E2E_AUTH_CLASSIFICATION ?? 'external-sandbox; real-go-auth-client',
        video: this.mode === 'native' ? 'cdp-default-context-no-playwright-video; capability-blocked' : 'frontend-fixture-owned',
      });
      return this;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  async waitUntilReady() {
    const deadline = Date.now() + this.startupTimeoutMs;
    let lastError = 'not listening';
    while (Date.now() < deadline) {
      const exited = await Promise.race([this.exit, Promise.resolve(null)]);
      if (exited || this.child.exitCode !== null || this.child.signalCode !== null) {
        throw new Error(`runtime exited before readiness; see ${this.paths.stdout} and ${this.paths.stderr}`);
      }
      try {
        if (this.mode === 'server') {
          const health = await fetch(`${this.baseURL}/health`, { signal: AbortSignal.timeout(1500), redirect: 'error' });
          if (!health.ok || (await health.json()).status !== 'ok') throw new Error('Wails /health is not ready');
          const runtime = await fetch(`${this.baseURL}/wails/runtime.js`, { signal: AbortSignal.timeout(1500), redirect: 'error' });
          if (!runtime.ok || !runtime.headers.get('content-type')?.includes('javascript')) throw new Error('Wails runtime script unavailable');
          const binding = await fetch(`${this.baseURL}/wails/runtime`, { signal: AbortSignal.timeout(1500), redirect: 'error' });
          // It is a method dispatch route, not a GET health endpoint. An invalid
          // dispatch must reach Wails (4xx), never a SPA HTML fallback.
          const contentType = binding.headers.get('content-type') ?? '';
          if (binding.status < 400 || binding.status >= 500 || contentType.includes('text/html')) throw new Error('Wails binding dispatcher unavailable');
          const assets = await fetch(this.baseURL, { signal: AbortSignal.timeout(1500), redirect: 'error' });
          if (!assets.ok || !assets.headers.get('content-type')?.includes('text/html')) throw new Error('embedded frontend unavailable');
        } else {
          const response = await fetch(`${this.cdpURL}/json/list`, { signal: AbortSignal.timeout(1500), redirect: 'error' });
          const targets = await response.json();
          if (!response.ok || !Array.isArray(targets) || !targets.some((target) => target.type === 'page' && target.webSocketDebuggerUrl && target.url && target.url !== 'about:blank')) throw new Error('native WebView2 page target unavailable');
        }
        return;
      } catch (error) { lastError = error.message; }
      await delay(100);
    }
    throw new Error(`runtime readiness timed out: ${lastError}; see ${this.paths.stdout} and ${this.paths.stderr}`);
  }

  async enqueueDialog({ kind, path: singlePath, paths, cancel = false, title } = {}) {
    if (!dialogKinds.has(kind)) throw new Error('unknown dialog kind');
    if (singlePath !== undefined && paths !== undefined) throw new Error('choose path or paths, not both');
    const selected = paths ?? (singlePath === undefined ? [] : [singlePath]);
    if (!Array.isArray(selected) || (cancel && selected.length) || (!cancel && (!selected.length || selected.length > 256 || (kind !== 'open-files' && selected.length !== 1)))) throw new Error('invalid dialog selection');
    const relativePaths = [];
    for (const selection of selected) {
      if (typeof selection !== 'string' || !selection) throw new Error('dialog path is empty');
      const target = path.isAbsolute(selection) ? path.resolve(selection) : path.resolve(this.appDir, selection);
      if (!inside(this.appDir, target)) throw new Error('dialog path escapes appDir');
      const existing = kind === 'save-file' ? path.dirname(target) : target;
      if (path.resolve(await fs.realpath(existing)) !== existing) throw new Error('dialog path traverses symlink');
      if (kind === 'save-file') {
        const info = await fs.lstat(target).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
        if (info && (!info.isFile() || info.isSymbolicLink())) throw new Error('save choice must be a regular file or missing leaf');
      }
      relativePaths.push(path.relative(this.appDir, target).split(path.sep).join('/'));
    }
    const pending = path.join(this.paths.dialogs, 'pending');
    await fs.mkdir(pending, { recursive: true });
    const names = [...await fs.readdir(pending), ...await fs.readdir(path.join(this.paths.dialogs, 'consumed'))];
    this.sequence = Math.max(this.sequence, ...names.map((name) => Number.parseInt(name, 10) || 0)) + 1;
    const filename = path.join(pending, `${String(this.sequence).padStart(12, '0')}.json`);
    await atomicJSON(filename, { kind, paths: relativePaths, cancel, ...(title ? { title } : {}) });
    return filename;
  }

  async waitForExit(timeoutMs = 15_000) {
    if (!this.exit) throw new Error('runtime has not been started');
    let timer;
    try {
      return await Promise.race([this.exit, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('runtime exit timeout')), timeoutMs); })]);
    } finally { clearTimeout(timer); }
  }

  async stop({ graceful } = {}) {
    if (!this.child) return { forced: false, code: null, signal: null };
    let forced = false;
    let callbackError;
    if (this.child.exitCode === null && this.child.signalCode === null) {
      if (graceful) {
        try { await graceful(); } catch (error) { callbackError = error; }
      } else if (process.platform !== 'win32') {
        this.child.kill('SIGTERM');
      }
      try { await this.waitForExit(graceful ? 15_000 : 2000); }
      catch {
        forced = true;
        if (process.platform === 'win32') {
          // PID-scoped tree termination only; never kill unrelated Grido runs.
          const killer = spawn('taskkill', ['/PID', String(this.child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
          await once(killer, 'close');
        } else this.child.kill('SIGKILL');
      }
    }
    const result = await this.waitForExit();
    await Promise.all([this.stdout, this.stderr].filter(Boolean).map((stream) => stream.closed ? Promise.resolve() : new Promise((resolve) => stream.end(resolve))));
    await atomicJSON(path.join(this.appDir, 'runtime-exit.json'), { ...result, forced, generation: this.generation, ...(callbackError ? { gracefulError: callbackError.message } : {}) });
    if (callbackError) throw callbackError;
    return { ...result, forced };
  }

  async restart(options = {}) {
    await this.stop(options);
    this.child = null;
    return this.start();
  }
}

export async function launchRuntime(options) { return new RuntimeProcess(options).start(); }

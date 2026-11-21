import http from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { once } from 'node:events';

const MAX_BODY = 64 * 1024;
const classification = 'mocked-third-party-supabase-contract; real-go-auth-client';

function equal(a, b) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readJSON(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('request too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// Explicit external HTTP MOCK for runners without a local Supabase instance.
// It cannot prove Supabase Auth, RLS, trigger/migration or hosted behaviour.
// Go still sends credentials over HTTP, persists encrypted tokens/profiles in
// its real SQLite repository and performs real session RPC/client logic.
export async function startRuntimeAuthContract({ email = 'native-acceptance@example.test', password, anonKey = randomBytes(32).toString('hex'), port = 0 } = {}) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('fixture password must be supplied (8+ characters)');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid fixture port');
  const user = { id: randomUUID(), email: email.toLowerCase(), user_metadata: { name: 'Native acceptance fixture' } };
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const profile = { plan: 'pro', expires_at: expiresAt, license_key: '', status: 'active' };
  const tokens = new Set();
  const refreshTokens = new Map();
  const calls = [];
  let activeSession;
  let stopped = false;
  const issueToken = () => {
    const access = randomBytes(48).toString('base64url');
    const refresh = randomBytes(48).toString('base64url');
    tokens.add(access);
    refreshTokens.set(refresh, access);
    return { access_token: access, refresh_token: refresh, token_type: 'bearer', expires_in: 3600, user };
  };
  const server = http.createServer(async (request, response) => {
    const respond = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Grido-Test-Classification': classification });
      response.end(JSON.stringify(body));
    };
    try {
      const route = new URL(request.url, 'http://127.0.0.1');
      // No request bodies, passwords, API keys or bearer tokens are logged.
      calls.push({ method: request.method, path: route.pathname });
      if (calls.length > 2048) calls.shift();
      if (!equal(request.headers.apikey, anonKey)) return respond(401, { msg: 'Invalid API key' });
      if (route.pathname === '/auth/v1/token' && request.method === 'POST') {
        const body = await readJSON(request);
        if (route.searchParams.get('grant_type') === 'password') {
          if (!equal(String(body.email).toLowerCase(), user.email) || !equal(body.password, password)) return respond(400, { msg: 'Invalid login credentials' });
          return respond(200, issueToken());
        }
        if (route.searchParams.get('grant_type') === 'refresh_token') {
          const oldAccess = refreshTokens.get(body.refresh_token);
          if (!oldAccess) return respond(400, { msg: 'Invalid refresh token' });
          refreshTokens.delete(body.refresh_token);
          tokens.delete(oldAccess);
          return respond(200, issueToken());
        }
        return respond(400, { msg: 'Unsupported fixture grant' });
      }
      const access = String(request.headers.authorization ?? '').replace(/^Bearer /, '');
      if (!tokens.has(access)) return respond(401, { msg: 'Unauthorized' });
      if (route.pathname === '/rest/v1/profiles' && request.method === 'GET') {
        if (route.searchParams.get('id') !== `eq.${user.id}`) return respond(200, []);
        return respond(200, [profile]);
      }
      if (route.pathname === '/auth/v1/user' && request.method === 'GET') return respond(200, user);
      if (route.pathname === '/auth/v1/logout' && request.method === 'POST') {
        tokens.delete(access);
        for (const [refresh, token] of refreshTokens) if (token === access) refreshTokens.delete(refresh);
        return respond(200, {});
      }
      if (route.pathname.startsWith('/rest/v1/rpc/') && request.method === 'POST') {
        const body = await readJSON(request);
        const rpc = route.pathname.slice('/rest/v1/rpc/'.length);
        if (rpc === 'ensure_profile_exists') return respond(200, profile);
        if (rpc === 'claim_session') {
          if (typeof body.p_session_id !== 'string' || !/^[0-9a-f]{32}$/.test(body.p_session_id)) return respond(400, { msg: 'Invalid session id' });
          activeSession = body.p_session_id;
          return respond(200, { success: true, active: true, superseded: false });
        }
        if (rpc === 'check_session') {
          const active = typeof activeSession === 'string' && equal(body.p_session_id, activeSession);
          return respond(200, { success: true, active, superseded: !active });
        }
      }
      return respond(404, { msg: 'Unsupported mocked third-party route' });
    } catch (error) { respond(error.status ?? 400, { msg: 'Invalid fixture request' }); }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.maxHeadersCount = 32;
  server.keepAliveTimeout = 1000;
  server.on('clientError', (_, socket) => socket.destroy());
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url, anonKey, email: user.email, password, classification,
    env: { GRIDO_E2E_SUPABASE_URL: url, GRIDO_E2E_SUPABASE_ANON_KEY: anonKey, GRIDO_E2E_AUTH_CLASSIFICATION: classification },
    metadata: () => ({ classification, excludes: ['real-supabase-auth', 'rls', 'database-migrations', 'hosted-supabase'], calls: [...calls] }),
    async stop() {
      if (stopped) return;
      stopped = true;
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

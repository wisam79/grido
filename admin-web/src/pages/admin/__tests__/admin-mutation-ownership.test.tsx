// @vitest-environment jsdom
import { act } from 'react';
import type { FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { useAdminSession } from '../useAdminSession';
import type { AdminSession } from '../useAdminSession';
import { useAdminKeys } from '../useAdminKeys';
import type { AdminKeys } from '../useAdminKeys';
import { useAdminUsers } from '../useAdminUsers';
import type { AdminUsers } from '../useAdminUsers';
import type { UserProfile } from '../types';

const feedback = vi.hoisted(() => ({ notify: vi.fn(), confirmDialog: vi.fn() }));
const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('../../../components/common/FeedbackProvider', () => ({ useFeedback: () => feedback }));
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

interface Result {
  data: unknown;
  error: { message: string } | null;
  count?: number;
}
const ok = (data: unknown = null): Result => ({ data, error: null });
const failure: Result = { data: null, error: { message: 'deferred failure' } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const user: UserProfile = {
  id: 'user-1', name: 'Test Studio', email: 'studio@example.test', plan: 'pro',
  status: 'active', expires_at: '2027-11-13T00:00:00Z', license_key: 'TEST-KEY',
  created_at: '2026-11-13T00:00:00Z', updated_at: '2026-11-13T00:00:00Z',
};
const otherUser = { ...user, id: 'user-2', name: 'New owner edit' };
const form = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent;

function createMockSupabase() {
  let authListener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  const unsubscribe = vi.fn();
  const session = { user: { id: 'admin-1' } };
  const read = vi.fn((_table: string) => Promise.resolve({ ...ok([]), count: 0 }));
  const update = vi.fn((_table: string, _patch: unknown, _field: string, _id: unknown) =>
    Promise.resolve(ok()));
  const rpc = vi.fn((_name: string, _params?: unknown): Promise<Result> =>
    Promise.resolve(ok(_name === 'is_admin' ? true : { key: 'CURRENT-KEY' })));
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: session.user, session }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn((listener: typeof authListener) => {
      authListener = listener;
      return { data: { subscription: { unsubscribe } } };
    }),
  };
  const from = vi.fn((table: string) => {
    const query = {
      select: vi.fn(() => query), order: vi.fn(() => query),
      eq: vi.fn(() => query), range: vi.fn(() => query), limit: vi.fn(() => query),
      update: vi.fn((patch: unknown) => ({
        eq: vi.fn((field: string, id: unknown) => update(table, patch, field, id)),
      })),
      then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
        read(table).then(resolve, reject),
    };
    return query;
  });
  const client = { auth, rpc, from } as unknown as SupabaseClient;
  return { client, auth, rpc, from, read, update, unsubscribe,
    emitAuth: (event: AuthChangeEvent, value: Session | null = null) => authListener?.(event, value) };
}

const cleanups: Array<() => void> = [];
async function mountHooks() {
  let latest!: { session: AdminSession; keys: AdminKeys; users: AdminUsers };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let mounted = true;
  let dataMounted = true;
  function DataHooks({ session }: { session: ReturnType<typeof useAdminSession> }) {
    const keys = useAdminKeys(session.supabase, session.sessionOwnerRef);
    const users = useAdminUsers(session.supabase, session.sessionOwnerRef);
    latest = { session, keys, users };
    return null;
  }
  function Harness() {
    const session = useAdminSession();
    if (latest) latest = { ...latest, session };
    return dataMounted ? <DataHooks session={session} /> : null;
  }
  const hideData = () => {
    dataMounted = false;
    act(() => root.render(<Harness />));
  };
  const unmount = () => {
    if (mounted) {
      act(() => root.unmount());
      mounted = false;
      container.remove();
    }
  };
  cleanups.push(unmount);
  await act(async () => { root.render(<Harness />); });
  expect(latest.session.isAuthenticated).toBe(true);
  return { get current() { return latest; }, unmount, hideData };
}
async function settle<T>(pending: ReturnType<typeof deferred<T>>, value: T, operation: Promise<unknown>) {
  await act(async () => { pending.resolve(value); await operation; });
}
async function login(hooks: Awaited<ReturnType<typeof mountHooks>>) {
  act(() => {
    hooks.current.session.setEmail('admin@example.test');
    hooks.current.session.setPassword('test-password');
  });
  await act(async () => { await hooks.current.session.handleLogin(form()); });
  expect(hooks.current.session.isAuthenticated).toBe(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  localStorage.setItem('grido_sb_url', 'https://example.supabase.co');
  localStorage.setItem('grido_sb_key', 'test-publishable-key');
  feedback.confirmDialog.mockResolvedValue(true);
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.unstubAllGlobals();
});

const mutationKinds = ['single', 'batch', 'extend', 'revoke', 'ban', 'save'] as const;
type MutationKind = typeof mutationKinds[number];
async function prepareMutation(kind: MutationKind, hooks: Awaited<ReturnType<typeof mountHooks>>) {
  if (kind === 'save') act(() => hooks.current.users.handleOpenEditUser(user));
  return () => {
    switch (kind) {
      case 'single': return hooks.current.keys.handleGenerateKey(form());
      case 'batch': return hooks.current.keys.handleGenerateBatchKeys(form());
      case 'extend': return hooks.current.users.handleExtendLicense(user.id, 3);
      case 'revoke': return hooks.current.users.handleRevokeLicense(user.id);
      case 'ban': return hooks.current.users.handleToggleBanUser(user);
      case 'save': return hooks.current.users.handleSaveUserProfile(form());
    }
  };
}

describe('actual admin hook mutation ownership', () => {
  it.each(mutationKinds)('%s: synchronous session clear suppresses success before reset effects', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    if (kind === 'ban' || kind === 'save') mock.update.mockReturnValueOnce(pending.promise);
    else mock.rpc.mockReturnValueOnce(pending.promise);
    const start = await prepareMutation(kind, hooks);
    let operation!: Promise<void>;
    await act(async () => { operation = start(); });
    const fromBefore = mock.from.mock.calls.length;
    const rpcBefore = mock.rpc.mock.calls.length;
    const oldEpoch = hooks.current.session.sessionOwnerRef.current.epoch;
    // Intentionally no users/keys reset: session ref must revoke before React commits.
    await act(async () => {
      hooks.current.session.clearSession();
      expect(hooks.current.session.sessionOwnerRef.current.epoch).toBeGreaterThan(oldEpoch);
      pending.resolve(ok({ key: 'OLD-KEY' }));
      await operation;
    });
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(mock.from).toHaveBeenCalledTimes(fromBefore);
    expect(mock.rpc).toHaveBeenCalledTimes(rpcBefore);
    expect(hooks.current.keys.generatedKey).toBe('');
    expect(hooks.current.keys.generatedBatchKeys).toEqual([]);
    if (kind === 'save') expect(hooks.current.users.editModalUser?.id).toBe(user.id);
  });

  it.each(mutationKinds)('%s: reset invalidates rejected mutation without feedback/reload', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    if (kind === 'ban' || kind === 'save') mock.update.mockReturnValueOnce(pending.promise);
    else mock.rpc.mockReturnValueOnce(pending.promise);
    const start = await prepareMutation(kind, hooks);
    let operation!: Promise<void>;
    await act(async () => { operation = start(); });
    const fromBefore = mock.from.mock.calls.length;
    await act(async () => {
      hooks.current.keys.resetKeysData();
      hooks.current.users.resetUsersData();
      pending.reject(new Error('old mutation rejection'));
      await operation;
    });
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(mock.from).toHaveBeenCalledTimes(fromBefore);
    expect(hooks.current.users.editModalUser).toBeNull();
    expect(hooks.current.users.savingUser).toBe(false);
    expect(hooks.current.keys.generatingBatch).toBe(false);
  });

  it.each(mutationKinds)('%s: unmount suppresses errors and future work', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    if (kind === 'ban' || kind === 'save') mock.update.mockReturnValueOnce(pending.promise);
    else mock.rpc.mockReturnValueOnce(pending.promise);
    const start = await prepareMutation(kind, hooks);
    let operation!: Promise<void>;
    await act(async () => { operation = start(); });
    const callsBefore = [mock.rpc.mock.calls.length, mock.from.mock.calls.length];
    hooks.unmount();
    await settle(pending, failure, operation);
    expect(feedback.notify).not.toHaveBeenCalled();
    expect([mock.rpc.mock.calls.length, mock.from.mock.calls.length]).toEqual(callsBefore);
    expect(mock.unsubscribe).toHaveBeenCalledOnce();
  });

  it.each(mutationKinds)('%s: hook-only unmount cancels work while session owner stays valid', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    if (kind === 'ban' || kind === 'save') mock.update.mockReturnValueOnce(pending.promise);
    else mock.rpc.mockReturnValueOnce(pending.promise);
    const start = await prepareMutation(kind, hooks);
    let operation!: Promise<void>;
    await act(async () => { operation = start(); });
    const epoch = hooks.current.session.sessionOwnerRef.current.epoch;
    const rpcBefore = mock.rpc.mock.calls.length;
    const fromBefore = mock.from.mock.calls.length;
    hooks.hideData();
    expect(hooks.current.session.sessionOwnerRef.current.epoch).toBe(epoch);
    expect(hooks.current.session.sessionOwnerRef.current.authenticated).toBe(true);
    await settle(pending, ok({ key: 'OLD-KEY' }), operation);
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(mock.rpc).toHaveBeenCalledTimes(rpcBefore);
    expect(mock.from).toHaveBeenCalledTimes(fromBefore);
  });

  it.each(mutationKinds)('%s: same-session fetch does not invalidate pending mutation', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    if (kind === 'ban' || kind === 'save') mock.update.mockReturnValueOnce(pending.promise);
    else mock.rpc.mockReturnValueOnce(pending.promise);
    const start = await prepareMutation(kind, hooks);
    let operation!: Promise<void>;
    await act(async () => { operation = start(); });
    await act(async () => {
      await hooks.current.keys.loadKeysData();
      await hooks.current.users.loadUsersData();
    });
    const fromBefore = mock.from.mock.calls.length;
    await settle(pending, ok({ key: 'VALID-KEY' }), operation);
    expect(feedback.notify).toHaveBeenCalledWith(expect.any(String), 'success');
    expect(mock.from.mock.calls.length).toBeGreaterThan(fromBefore);
    if (kind === 'single') expect(hooks.current.keys.generatedKey).toBe('VALID-KEY');
    if (kind === 'batch') {
      expect(hooks.current.keys.generatedBatchKeys).toHaveLength(5);
      expect(hooks.current.keys.generatingBatch).toBe(false);
    }
    if (kind === 'save') {
      expect(hooks.current.users.editModalUser).toBeNull();
      expect(hooks.current.users.savingUser).toBe(false);
    }
  });

  it.each(['revoke', 'ban', 'logout'] as const)('%s captures owner before deferred confirmation', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const confirmation = deferred<boolean>();
    feedback.confirmDialog.mockReturnValueOnce(confirmation.promise);
    let operation!: Promise<unknown>;
    await act(async () => {
      operation = kind === 'logout' ? hooks.current.session.handleLogout()
        : kind === 'revoke' ? hooks.current.users.handleRevokeLicense(user.id)
          : hooks.current.users.handleToggleBanUser(user);
    });
    act(() => hooks.current.session.clearSession());
    await login(hooks);
    const rpcBefore = mock.rpc.mock.calls.length;
    await settle(confirmation, true, operation);
    expect(mock.rpc).toHaveBeenCalledTimes(rpcBefore);
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.auth.signOut).not.toHaveBeenCalled();
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(hooks.current.session.isAuthenticated).toBe(true);
  });

  it.each([
    { kind: 'batch', newSession: true }, { kind: 'save', newSession: true },
    { kind: 'batch', newSession: false }, { kind: 'save', newSession: false },
  ] as const)('$kind: old finally cannot clear new busy state (newSession=$newSession)', async ({ kind, newSession }) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const oldPending = deferred<Result>();
    const newPending = deferred<Result>();
    if (kind === 'batch') mock.rpc.mockReturnValueOnce(oldPending.promise);
    else mock.update.mockReturnValueOnce(oldPending.promise);
    const start = await prepareMutation(kind, hooks);
    let oldOperation!: Promise<void>;
    await act(async () => { oldOperation = start(); });
    act(() => {
      if (newSession) hooks.current.session.clearSession();
      hooks.current.keys.resetKeysData();
      hooks.current.users.resetUsersData();
    });
    if (newSession) await login(hooks);
    if (kind === 'batch') {
      act(() => hooks.current.keys.setGenCount('1'));
      mock.rpc.mockReturnValueOnce(newPending.promise);
    } else {
      act(() => hooks.current.users.handleOpenEditUser(otherUser));
      mock.update.mockReturnValueOnce(newPending.promise);
    }
    let newOperation!: Promise<void>;
    await act(async () => {
      newOperation = kind === 'batch' ? hooks.current.keys.handleGenerateBatchKeys(form())
        : hooks.current.users.handleSaveUserProfile(form());
    });
    const rpcBefore = mock.rpc.mock.calls.length;
    await settle(oldPending, failure, oldOperation);
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(mock.rpc).toHaveBeenCalledTimes(rpcBefore);
    if (kind === 'batch') {
      expect(hooks.current.keys.generatingBatch).toBe(true);
      expect(hooks.current.keys.generatedBatchKeys).toEqual([]);
    } else {
      expect(hooks.current.users.savingUser).toBe(true);
      expect(hooks.current.users.editModalUser?.id).toBe(otherUser.id);
    }
    await settle(newPending, ok({ key: 'NEW-KEY' }), newOperation);
    expect(feedback.notify).toHaveBeenCalledTimes(1);
    if (kind === 'batch') {
      expect(hooks.current.keys.generatingBatch).toBe(false);
      expect(hooks.current.keys.generatedBatchKeys).toEqual(['NEW-KEY']);
    } else expect(hooks.current.users.savingUser).toBe(false);
  });

  it('new verified session on the same client invalidates old mutation without clear/reset', async () => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    mock.rpc.mockReturnValueOnce(pending.promise);
    let operation!: Promise<void>;
    await act(async () => { operation = hooks.current.keys.handleGenerateKey(form()); });
    const epoch = hooks.current.session.sessionOwnerRef.current.epoch;
    await login(hooks);
    expect(hooks.current.session.sessionOwnerRef.current.epoch).toBeGreaterThan(epoch);
    await settle(pending, ok({ key: 'OLD-KEY' }), operation);
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(mock.from).not.toHaveBeenCalled();
    expect(hooks.current.keys.generatedKey).toBe('');
  });

  it('auth sign-out revokes ownership synchronously', async () => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    mock.rpc.mockReturnValueOnce(pending.promise);
    let operation!: Promise<void>;
    await act(async () => { operation = hooks.current.users.handleExtendLicense(user.id, 1); });
    await act(async () => {
      mock.emitAuth('SIGNED_OUT');
      expect(hooks.current.session.sessionOwnerRef.current.authenticated).toBe(false);
      pending.resolve(ok());
      await operation;
    });
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('clipboard completion after session clear does not notify', async () => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    await act(async () => { await hooks.current.keys.handleGenerateKey(form()); });
    feedback.notify.mockClear();
    const pending = deferred<void>();
    Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: vi.fn(() => pending.promise) } });
    let operation!: Promise<void>;
    await act(async () => { operation = hooks.current.keys.handleCopyKey(); });
    act(() => hooks.current.session.clearSession());
    await settle(pending, undefined, operation);
    expect(feedback.notify).not.toHaveBeenCalled();
    Reflect.deleteProperty(navigator, 'clipboard');
  });
});

describe('actual admin hook fetch/session lifecycle', () => {
  it.each(['keys', 'users'] as const)('%s fetch owner revoked before reset cannot publish data/error', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    mock.read.mockReturnValue(pending.promise as ReturnType<typeof mock.read>);
    let operation!: Promise<void>;
    await act(async () => { operation = kind === 'keys'
      ? hooks.current.keys.loadKeysData() : hooks.current.users.loadUsersData(); });
    act(() => hooks.current.session.clearSession());
    await settle(pending, failure, operation);
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(hooks.current.keys.keys).toEqual([]);
    expect(hooks.current.users.users).toEqual([]);
  });

  it.each(['keys', 'users'] as const)('%s latest fetch wins and old finally does not clear loading', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const oldPending = deferred<Result>();
    const newPending = deferred<Result>();
    mock.read.mockReturnValue(oldPending.promise as ReturnType<typeof mock.read>);
    const load = () => kind === 'keys' ? hooks.current.keys.loadKeysData() : hooks.current.users.loadUsersData();
    let oldOperation!: Promise<void>;
    await act(async () => { oldOperation = load(); });
    mock.read.mockReturnValue(newPending.promise as ReturnType<typeof mock.read>);
    let newOperation!: Promise<void>;
    await act(async () => { newOperation = load(); });
    await settle(oldPending, failure, oldOperation);
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(hooks.current[kind].loading).toBe(true);
    await settle(newPending, { ...ok([]), count: 2 }, newOperation);
    expect(hooks.current[kind].loading).toBe(false);
    expect(kind === 'keys' ? hooks.current.keys.keysTotal : hooks.current.users.usersTotal).toBe(2);
  });

  it.each(['keys', 'users'] as const)('%s fetch reset invalidates response without replacing new loading', async (kind) => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const oldPending = deferred<Result>();
    const newPending = deferred<Result>();
    const load = () => kind === 'keys' ? hooks.current.keys.loadKeysData() : hooks.current.users.loadUsersData();
    mock.read.mockReturnValue(oldPending.promise as ReturnType<typeof mock.read>);
    let oldOperation!: Promise<void>;
    await act(async () => { oldOperation = load(); });
    act(() => {
      if (kind === 'keys') hooks.current.keys.resetKeysData();
      else hooks.current.users.resetUsersData();
    });
    mock.read.mockReturnValue(newPending.promise as ReturnType<typeof mock.read>);
    let newOperation!: Promise<void>;
    await act(async () => { newOperation = load(); });
    await settle(oldPending, failure, oldOperation);
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(hooks.current[kind].loading).toBe(true);
    await settle(newPending, { ...ok([]), count: 3 }, newOperation);
    expect(hooks.current[kind].loading).toBe(false);
    expect(kind === 'keys' ? hooks.current.keys.keysTotal : hooks.current.users.usersTotal).toBe(3);
  });

  it('token refresh verification does not revoke a same-session mutation', async () => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    mock.rpc.mockReturnValueOnce(pending.promise);
    let operation!: Promise<void>;
    await act(async () => { operation = hooks.current.keys.handleGenerateKey(form()); });
    const epoch = hooks.current.session.sessionOwnerRef.current.epoch;
    await act(async () => {
      mock.emitAuth('TOKEN_REFRESHED', { user: { id: 'admin-1' } } as Session);
    });
    expect(hooks.current.session.sessionOwnerRef.current.epoch).toBe(epoch);
    await settle(pending, ok({ key: 'REFRESHED-KEY' }), operation);
    expect(hooks.current.keys.generatedKey).toBe('REFRESHED-KEY');
    expect(feedback.notify).toHaveBeenCalledWith(expect.any(String), 'success');
  });

  it('old token permission failure cannot clear a newer verified session', async () => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<Result>();
    mock.rpc.mockReturnValueOnce(pending.promise);
    await act(async () => {
      mock.emitAuth('USER_UPDATED', { user: { id: 'admin-1' } } as Session);
    });
    await login(hooks);
    await act(async () => { pending.resolve(failure); await pending.promise; });
    expect(hooks.current.session.isAuthenticated).toBe(true);
    expect(mock.auth.signOut).not.toHaveBeenCalled();
    expect(feedback.notify).not.toHaveBeenCalled();
  });

  it('old login finally does not clear a newer login busy state', async () => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    type LoginResult = { data: { user: { id: string } | null }; error: { message: string } | null };
    const oldPending = deferred<LoginResult>();
    const newPending = deferred<LoginResult>();
    mock.auth.signInWithPassword.mockReturnValueOnce(oldPending.promise).mockReturnValueOnce(newPending.promise);
    act(() => { hooks.current.session.setEmail('admin@example.test'); hooks.current.session.setPassword('test'); });
    let oldOperation!: Promise<void>;
    let newOperation!: Promise<void>;
    await act(async () => { oldOperation = hooks.current.session.handleLogin(form()); });
    await act(async () => { newOperation = hooks.current.session.handleLogin(form()); });
    await settle(oldPending, { data: { user: null }, error: { message: 'old' } }, oldOperation);
    expect(hooks.current.session.loginLoading).toBe(true);
    expect(feedback.notify).not.toHaveBeenCalled();
    await settle(newPending, { data: { user: { id: 'admin-2' } }, error: null }, newOperation);
    expect(hooks.current.session.loginLoading).toBe(false);
    expect(hooks.current.session.isAuthenticated).toBe(true);
  });

  it('logout clears owner before server await and old server error cannot notify a new session', async () => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<{ error: { message: string } | null }>();
    mock.auth.signOut.mockReturnValueOnce(pending.promise);
    let operation!: Promise<boolean>;
    await act(async () => { operation = hooks.current.session.handleLogout(); });
    expect(hooks.current.session.sessionOwnerRef.current.authenticated).toBe(false);
    await login(hooks);
    await settle(pending, { error: { message: 'old logout error' } }, operation);
    expect(feedback.notify).not.toHaveBeenCalled();
    expect(hooks.current.session.isAuthenticated).toBe(true);
  });

  it('unmount invalidates session owner and pending login finally', async () => {
    const mock = createMockSupabase();
    sdk.createClient.mockReturnValue(mock.client);
    const hooks = await mountHooks();
    const pending = deferred<{ data: { user: null }; error: { message: string } }>();
    mock.auth.signInWithPassword.mockReturnValueOnce(pending.promise);
    act(() => { hooks.current.session.setEmail('admin@example.test'); hooks.current.session.setPassword('test'); });
    let operation!: Promise<void>;
    await act(async () => { operation = hooks.current.session.handleLogin(form()); });
    const ownerRef = hooks.current.session.sessionOwnerRef;
    const epoch = ownerRef.current.epoch;
    hooks.unmount();
    expect(ownerRef.current.epoch).toBeGreaterThan(epoch);
    expect(ownerRef.current.authenticated).toBe(false);
    await settle(pending, { data: { user: null }, error: { message: 'old login error' } }, operation);
    expect(feedback.notify).not.toHaveBeenCalled();
  });
});

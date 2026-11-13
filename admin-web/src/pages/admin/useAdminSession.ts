import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AdminSessionOwner } from './useAdminOperationOwnership';
import type { FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useFeedback } from '../../components/common/FeedbackProvider';

/**
 * useAdminSession — منطق الجلسة والمصادقة لإدارة الاستوديو.
 * يفرض أولوية متغيرات البيئة (VITE_*) فوق localStorage، ويمنع ازدواج عميل GoTrue،
 * ويشترك في onAuthStateChange لإبطال الجلسة فور انتهائها أو تسجيل الخروج.
 */

const AUTH_STORAGE_KEY = 'grido_admin_auth';
const ENV_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const ENV_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export function useAdminSession() {
  const { notify, confirmDialog } = useFeedback();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [sbUrl, setSbUrl] = useState(ENV_SUPABASE_URL);
  const [sbKey, setSbKey] = useState(ENV_SUPABASE_ANON_KEY);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const sessionOwnerRef = useRef<AdminSessionOwner>({
    epoch: 0,
    client: null,
    authenticated: false,
  });
  const mountedRef = useRef(false);
  const loginReqIdRef = useRef(0);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionOwnerRef.current = {
        epoch: sessionOwnerRef.current.epoch + 1,
        client: null,
        authenticated: false,
      };
      loginReqIdRef.current += 1;
    };
  }, []);

  const verifySession = useCallback((client: SupabaseClient) => {
    const epoch = sessionOwnerRef.current.epoch + 1;
    sessionOwnerRef.current = { epoch, client, authenticated: true };
    setSessionEpoch(epoch);
    setIsAuthenticated(true);
    return epoch;
  }, []);

  // مرجع وحيد للعميل لتفادي تحذير وتداخل تعدد عملاء GoTrue على نفس storageKey
  const clientRef = useRef<{ url: string; key: string; client: SupabaseClient } | null>(null);

  const getOrCreateClient = useCallback((url: string, key: string): SupabaseClient => {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();
    if (
      clientRef.current &&
      clientRef.current.url === cleanUrl &&
      clientRef.current.key === cleanKey
    ) {
      return clientRef.current.client;
    }
    const client = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_STORAGE_KEY },
    });
    clientRef.current = { url: cleanUrl, key: cleanKey, client };
    setSupabase(client);
    return client;
  }, []);

  const clearSession = useCallback(() => {
    const epoch = sessionOwnerRef.current.epoch + 1;
    sessionOwnerRef.current = { epoch, client: null, authenticated: false };
    loginReqIdRef.current += 1;
    setSessionEpoch(epoch);
    setLoginLoading(false);
    setCheckingSession(false);
    localStorage.removeItem('grido_sb_token');
    localStorage.removeItem('grido_sb_url');
    localStorage.removeItem('grido_sb_key');
    setPassword('');
    setIsAuthenticated(false);
  }, []);

  // استعادة الجلسة عند التهيئة: أولوية متغيرات البناء أولاً ثم احتياطي التطوير المحلي فقط
  useEffect(() => {
    if (ENV_SUPABASE_URL) localStorage.removeItem('grido_sb_url');
    if (ENV_SUPABASE_ANON_KEY) localStorage.removeItem('grido_sb_key');
    localStorage.removeItem('grido_sb_token');

    const resolvedUrl = ENV_SUPABASE_URL || (localStorage.getItem('grido_sb_url') || '').trim();
    const resolvedKey =
      ENV_SUPABASE_ANON_KEY || (localStorage.getItem('grido_sb_key') || '').trim();

    if (!resolvedUrl || !resolvedKey) {
      setCheckingSession(false);
      return;
    }

    const client = getOrCreateClient(resolvedUrl, resolvedKey);
    setSbUrl(resolvedUrl);
    setSbKey(resolvedKey);

    let cancelled = false;
    let restoreEpoch = sessionOwnerRef.current.epoch;
    const restoreLoginReqId = loginReqIdRef.current;
    const ownsRestore = () =>
      !cancelled && mountedRef.current &&
      sessionOwnerRef.current.epoch === restoreEpoch &&
      loginReqIdRef.current === restoreLoginReqId;
    void client.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!ownsRestore()) return;
        if (error) {
          console.error('Session restore error:', error);
          notify('تعذر التحقق من الجلسة الحالية، يرجى إعادة تسجيل الدخول.', 'error');
          clearSession();
          return;
        }
        if (!data.session) return;

        // الجلسة محمّلة على العميل نفسه ⇒ RPC يُرسل بتوكن الأدمن لا بمفتاح anon
        const { data: isAdmin, error: adminErr } = await client.rpc('is_admin');
        if (!ownsRestore()) return;
        if (!adminErr && isAdmin) {
          restoreEpoch = verifySession(client);
        } else {
          clearSession();
          await client.auth.signOut().catch(() => undefined);
        }
      })
      .catch((err) => {
        if (!ownsRestore()) return;
        console.error('Unexpected session restore failure:', err);
        notify('حدث خطأ أثناء التحقق من جلسة الإدارة.', 'error');
        clearSession();
      })
      .finally(() => {
        if (ownsRestore()) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession, getOrCreateClient, notify, verifySession]);

  // مراقبة تغيّر حالة المصادقة (انتهاء الصلاحية / سحب التوكن / الخروج من تبويب آخر)
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT' || !session) {
        clearSession();
        return;
      }
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const epoch = sessionOwnerRef.current.epoch;
        const ownsAuthCheck = () => active && mountedRef.current &&
          sessionOwnerRef.current.epoch === epoch;
        void supabase.rpc('is_admin').then(
          ({ data: isAdmin, error: adminErr }) => {
            if (!ownsAuthCheck()) return;
            if (adminErr || !isAdmin) {
              clearSession();
              void supabase.auth.signOut().catch(() => undefined);
            }
          },
          () => {
            if (ownsAuthCheck()) clearSession();
          },
        );
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, clearSession]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!mountedRef.current) return;
    const targetUrl = (ENV_SUPABASE_URL || sbUrl).trim();
    const targetKey = (ENV_SUPABASE_ANON_KEY || sbKey).trim();
    if (!targetUrl || !targetKey || !email || !password) {
      notify('يرجى ملء كافة الخانات المطلوبة.', 'warning');
      return;
    }

    const loginReqId = ++loginReqIdRef.current;
    let loginEpoch = sessionOwnerRef.current.epoch;
    const ownsLogin = () => mountedRef.current && loginReqId === loginReqIdRef.current &&
      loginEpoch === sessionOwnerRef.current.epoch;
    setLoginLoading(true);
    try {
      const client = getOrCreateClient(targetUrl, targetKey);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (!ownsLogin()) return;

      if (error || !data.user) {
        notify('فشل تسجيل الدخول: ' + (error?.message || 'المستخدم غير موجود'), 'error');
        return;
      }

      // Verify user has admin privileges via is_admin RPC
      const { data: isAdmin, error: adminErr } = await client.rpc('is_admin');
      if (!ownsLogin()) return;

      if (adminErr || !isAdmin) {
        notify('الدخول مرفوض: هذا الحساب لا يملك صلاحيات مسؤول النظام.', 'error');
        if (!ownsLogin()) return;
        clearSession();
        await client.auth.signOut().catch(() => undefined);
        return;
      }

      if (!ENV_SUPABASE_URL) localStorage.setItem('grido_sb_url', targetUrl);
      if (!ENV_SUPABASE_ANON_KEY) localStorage.setItem('grido_sb_key', targetKey);
      setPassword('');
      loginEpoch = verifySession(client);
      setCheckingSession(false);
    } catch (err) {
      if (!ownsLogin()) return;
      console.error('Login error:', err);
      notify('حدث خطأ أثناء الاتصال بالخادم.', 'error');
    } finally {
      if (ownsLogin()) setLoginLoading(false);
    }
  };

  const handleLogout = async (): Promise<boolean> => {
    const owner = sessionOwnerRef.current;
    const ownsSession = () => mountedRef.current &&
      sessionOwnerRef.current.epoch === owner.epoch && owner.authenticated &&
      sessionOwnerRef.current.client === supabase;
    if (!ownsSession()) return false;
    let logoutEpoch = owner.epoch;
    let locallyCleared = false;
    const ownsLogout = () => mountedRef.current && sessionOwnerRef.current.epoch === logoutEpoch;
    try {
      const confirmed = await confirmDialog('هل ترغب في تسجيل الخروج؟', {
        confirmLabel: 'خروج', danger: true,
      });
      if (!ownsSession() || !confirmed) return false;
      // Revoke ownership before waiting on the server or the dashboard reset effect.
      clearSession();
      locallyCleared = true;
      logoutEpoch = sessionOwnerRef.current.epoch;
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (!ownsLogout()) return false;
        if (error) {
          notify('تعذر إنهاء الجلسة على الخادم: ' + error.message, 'warning');
        }
      }
    } catch (err) {
      if (!locallyCleared || !ownsLogout()) return false;
      console.error('Logout error:', err);
      notify('تعذر إنهاء الجلسة على الخادم، تم مسح الجلسة محلياً.', 'warning');
    }
    return ownsLogout();
  };

  return {
    supabase,
    sbUrl,
    setSbUrl,
    sbKey,
    setSbKey,
    email,
    setEmail,
    password,
    setPassword,
    isAuthenticated,
    sessionOwnerRef,
    sessionEpoch,
    checkingSession,
    loginLoading,
    handleLogin,
    handleLogout,
    clearSession,
  };
}

export type AdminSession = ReturnType<typeof useAdminSession>;

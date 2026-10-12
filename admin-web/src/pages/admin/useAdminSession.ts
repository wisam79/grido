import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useFeedback } from '../../components/common/FeedbackProvider';

/**
 * useAdminSession — منطق الجلسة والمصادقة مستخرج verbatim من AdminDashboard.tsx.
 * يشمل: إعداد عميل supabase، حالات savedUrl/savedKey، handleLogin، handleLogout،
 * clearSession، وتأثيرات ثبات الجلسة (استعادة الجلسة عبر supabase-js).
 */

export function useAdminSession() {
  const { notify, confirmDialog } = useFeedback();

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [sbUrl, setSbUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [sbKey, setSbKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  // استعادة الجلسة: supabase-js هو من يحفظ الجلسة ويجدّدها (بديل التوكن اليدوي المعطوب)
  useEffect(() => {
    const savedUrl = localStorage.getItem('grido_sb_url') || import.meta.env.VITE_SUPABASE_URL;
    const savedKey = localStorage.getItem('grido_sb_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;

    // ترحيل تنظيفي: التوكن اليدوي القديم لم يكن يُحمَّل على العميل فتفشل كل استعادة جلسة
    localStorage.removeItem('grido_sb_token');

    if (!savedUrl || !savedKey) {
      setCheckingSession(false);
      return;
    }

    const client = createClient(savedUrl, savedKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'grido_admin_auth' },
    });
    setSupabase(client);
    setSbUrl(savedUrl);
    setSbKey(savedKey);

    let cancelled = false;
    void client.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled || !data.session) return;
        // الجلسة محمّلة على العميل نفسه ⇒ RPC يُرسل بتوكن الأدمن لا بمفتاح anon
        const { data: isAdmin, error: adminErr } = await client.rpc('is_admin');
        if (cancelled) return;
        if (!adminErr && isAdmin) {
          setIsAuthenticated(true);
        } else {
          await client.auth.signOut();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const clearSession = () => {
    localStorage.removeItem('grido_sb_token');
    setIsAuthenticated(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!sbUrl || !sbKey || !email || !password) {
      notify('يرجى ملء كافة الخانات المطلوبة.', 'warning');
      return;
    }

    setLoginLoading(true);
    try {
      const client = createClient(sbUrl, sbKey, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'grido_admin_auth' },
      });
      const { data, error } = await client.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        notify('فشل تسجيل الدخول: ' + (error?.message || 'المستخدم غير موجود'), 'error');
        setLoginLoading(false);
        return;
      }

      // Verify user has admin privileges via is_admin RPC
      const { data: isAdmin, error: adminErr } = await client.rpc('is_admin');

      if (adminErr || !isAdmin) {
        notify('الدخول مرفوض: هذا الحساب لا يملك صلاحيات مسؤول النظام.', 'error');
        await client.auth.signOut();
        setLoginLoading(false);
        return;
      }

      setSupabase(client);
      localStorage.setItem('grido_sb_url', sbUrl);
      localStorage.setItem('grido_sb_key', sbKey);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Login error:', err);
      notify('حدث خطأ أثناء الاتصال بالخادم.', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if ((await confirmDialog('هل ترغب في تسجيل الخروج؟', { confirmLabel: 'خروج', danger: true })) && supabase) {
      await supabase.auth.signOut();
      clearSession();
    }
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
    checkingSession,
    loginLoading,
    handleLogin,
    handleLogout,
    clearSession,
  };
}

export type AdminSession = ReturnType<typeof useAdminSession>;

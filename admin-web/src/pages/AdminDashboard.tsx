import React, { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ShieldCheck,
  Users,
  Key,
  BarChart3,
  LogOut,
  RefreshCw,
  Search,
  Plus,
  Copy,
  UserCheck,
  Sparkles,
  ChevronLeft,
  Loader2,
  Download,
  X,
  LayoutGrid,
  Wand2,
  DollarSign,
  Activity,
  Sliders,
  Settings,
  Zap,
  Coins,
  FileText
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: string;
  expires_at: string;
  license_key: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LicenseKey {
  key: string;
  plan: string;
  duration_months: number;
  status: string;
  user_id: string;
  created_at: string;
  activated_at: string;
}

interface AiUsageRecord {
  id: string;
  user_id: string;
  used_at: string;
  image_bytes: number;
  execution_seconds: number;
  cost_usd: number;
  user_email?: string;
}

export default function AdminDashboard() {
  // Supabase states
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [sbUrl, setSbUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [sbKey, setSbKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Dashboard states
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'usage' | 'stats' | 'settings'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [aiUsageLogs, setAiUsageLogs] = useState<AiUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pro' | 'enterprise' | 'trial' | 'free' | 'expired' | 'banned'>('all');
  const [keySearchQuery, setKeySearchQuery] = useState('');
  const [keyStatusFilter, setKeyStatusFilter] = useState<'all' | 'unused' | 'used' | 'revoked'>('all');

  // User Edit Modal State
  const [editModalUser, setEditModalUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPlan, setEditPlan] = useState('pro');
  const [editStatus, setEditStatus] = useState('active');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Key generator states (Single & Batch)
  const [genMode, setGenMode] = useState<'single' | 'batch'>('single');
  const [genPlan, setGenPlan] = useState<'pro' | 'enterprise'>('pro');
  const [genDuration, setGenDuration] = useState('12');
  const [genCount, setGenCount] = useState('5');
  const [genPrefix, setGenPrefix] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [generatedBatchKeys, setGeneratedBatchKeys] = useState<string[]>([]);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // System Settings States
  const [freeAiLimit, setFreeAiLimit] = useState(5);
  const [proAiLimit, setProAiLimit] = useState(50);
  const [enterpriseAiLimit, setEnterpriseAiLimit] = useState(500);
  const [systemNotice, setSystemNotice] = useState('أهلاً بك في استوديو Grido — يتم استعادة الجلسة والخدمات السحابية تلقائياً.');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Mouse Tracking for Spotlight Glow (design.md Section 4.2)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  // Initialize and check localStorage sessions
  useEffect(() => {
    const savedUrl = localStorage.getItem('grido_sb_url') || import.meta.env.VITE_SUPABASE_URL;
    const savedKey = localStorage.getItem('grido_sb_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const savedToken = localStorage.getItem('grido_sb_token');

    if (savedUrl && savedKey) {
      const client = createClient(savedUrl, savedKey, {
        auth: { persistSession: false }
      });
      setSupabase(client);
      setSbUrl(savedUrl);
      setSbKey(savedKey);

      if (savedToken) {
        client.auth.getUser(savedToken).then(({ data, error }) => {
          if (!error && data.user) {
            client
              .rpc('is_admin')
              .then(({ data: isAdmin, error: adminErr }) => {
                if (!adminErr && isAdmin) {
                  setIsAuthenticated(true);
                } else {
                  clearSession();
                }
                setCheckingSession(false);
              });
          } else {
            clearSession();
            setCheckingSession(false);
          }
        });
      } else {
        setCheckingSession(false);
      }
    } else {
      setCheckingSession(false);
    }
  }, []);

  // Saved Config Preferences
  useEffect(() => {
    const savedNotice = localStorage.getItem('grido_sys_notice');
    if (savedNotice) setSystemNotice(savedNotice);
    const savedMaint = localStorage.getItem('grido_sys_maint');
    if (savedMaint) setMaintenanceMode(savedMaint === 'true');
    const savedFreeLimit = localStorage.getItem('grido_free_ai_limit');
    if (savedFreeLimit) setFreeAiLimit(parseInt(savedFreeLimit, 10));
    const savedProLimit = localStorage.getItem('grido_pro_ai_limit');
    if (savedProLimit) setProAiLimit(parseInt(savedProLimit, 10));
  }, []);

  const clearSession = () => {
    localStorage.removeItem('grido_sb_token');
    setIsAuthenticated(false);
  };

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    try {
      // 1. Fetch User Profiles
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profErr && profilesData) {
        setUsers(profilesData as UserProfile[]);
      }

      // 2. Fetch License Keys
      const { data: keysData, error: keysErr } = await supabase
        .from('license_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (!keysErr && keysData) {
        setKeys(keysData as LicenseKey[]);
      }

      // 3. Fetch AI Usage Logs
      const { data: aiLogsData, error: aiErr } = await supabase
        .from('ai_usage')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(100);

      if (!aiErr && aiLogsData) {
        setAiUsageLogs(aiLogsData as AiUsageRecord[]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isAuthenticated && supabase) {
      loadDashboardData();
    }
  }, [isAuthenticated, supabase, loadDashboardData]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl || !sbKey || !email || !password) {
      alert('يرجى ملء كافة الخانات المطلوبة.');
      return;
    }

    setLoginLoading(true);
    try {
      const client = createClient(sbUrl, sbKey, {
        auth: { persistSession: false }
      });
      const { data, error } = await client.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        alert('فشل تسجيل الدخول: ' + (error?.message || 'المستخدم غير موجود'));
        setLoginLoading(false);
        return;
      }

      // Verify user has admin privileges via is_admin RPC
      const { data: isAdmin, error: adminErr } = await client.rpc('is_admin');

      if (adminErr || !isAdmin) {
        alert('الدخول مرفوض: هذا الحساب لا يملك صلاحيات مسؤول النظام.');
        await client.auth.signOut();
        setLoginLoading(false);
        return;
      }

      setSupabase(client);
      localStorage.setItem('grido_sb_url', sbUrl);
      localStorage.setItem('grido_sb_key', sbKey);
      localStorage.setItem('grido_sb_token', data.session?.access_token || '');
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Login error:', err);
      alert('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('هل ترغب في تسجيل الخروج؟') && supabase) {
      await supabase.auth.signOut();
      clearSession();
    }
  };

  // Operations
  const handleExtendLicense = async (userUUID: string, months: number) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .rpc('admin_extend_license', {
          p_user_id: userUUID,
          p_additional_months: months,
        });

      if (error) throw error;
      alert(`تم تمديد صلاحية الحساب بمقدار ${months} شهر بنجاح.`);
      loadDashboardData();
    } catch (err: any) {
      alert('فشلت عملية التمديد: ' + err.message);
    }
  };

  const handleRevokeLicense = async (userUUID: string) => {
    if (!supabase) return;
    if (confirm(`هل أنت متأكد من سحب ترخيص هذا الحساب؟ سيعود فوراً للباقة المجانية.`)) {
      try {
        const { error } = await supabase
          .rpc('admin_revoke_license', {
            p_user_id: userUUID,
          });

        if (error) throw error;
        alert(`تم إلغاء الترخيص بنجاح.`);
        loadDashboardData();
      } catch (err: any) {
        alert('فشل سحب الترخيص: ' + err.message);
      }
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: UserProfile) => {
    setEditModalUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPlan(user.plan || 'free');
    setEditStatus(user.status || 'active');
    setEditExpiresAt(user.expires_at ? new Date(user.expires_at).toISOString().split('T')[0] : '');
  };

  // Save User Edit Modal
  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !editModalUser) return;
    setSavingUser(true);

    try {
      const patchObj: any = {
        name: editName,
        plan: editPlan,
        status: editStatus,
        updated_at: new Date().toISOString(),
      };
      if (editExpiresAt) {
        patchObj.expires_at = new Date(editExpiresAt).toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(patchObj)
        .eq('id', editModalUser.id);

      if (error) throw error;
      alert('تم تحديث بيانات الاشتراك والحساب بنجاح!');
      setEditModalUser(null);
      loadDashboardData();
    } catch (err: any) {
      alert('فشل تحديث بيانات المستخدم: ' + err.message);
    } finally {
      setSavingUser(false);
    }
  };

  // Ban / Unban User Toggle
  const handleToggleBanUser = async (user: UserProfile) => {
    if (!supabase) return;
    const isBanned = user.status === 'banned';
    const actionText = isBanned ? 'إلغاء حظر' : 'حظر';
    if (!confirm(`هل أنت متأكد من ${actionText} الحساب ${user.email}؟`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: isBanned ? 'active' : 'banned', updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      alert(`تم ${actionText} المستخدم بنجاح.`);
      loadDashboardData();
    } catch (err: any) {
      alert(`فشل إجراء الحظر: ` + err.message);
    }
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      alert('لا توجد بيانات لتصديرها!');
      return;
    }

    let csvContent = '\uFEFF'; 
    csvContent += 'الاسم,البريد الإلكتروني,الباقة,الحالة,تاريخ انتهاء الصلاحية,مفتاح التفعيل,تاريخ التسجيل\n';

    filteredUsers.forEach(u => {
      const name = (u.name || 'غير معروف').replace(/,/g, ' ');
      const email = (u.email || '').replace(/,/g, ' ');
      const plan = u.plan.toUpperCase();
      const status = u.status || 'active';
      const expires = u.expires_at ? new Date(u.expires_at).toLocaleDateString('ar-SA') : '—';
      const license = u.license_key || '—';
      const created = u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SA') : '—';

      csvContent += `${name},${email},${plan},${status},${expires},${license},${created}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `grido_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Single License Key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const duration = parseInt(genDuration, 10);
    const customKey = genPrefix ? `${genPrefix.trim().toUpperCase()}-${genPlan.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}` : undefined;

    try {
      const { data, error } = await supabase
        .rpc('admin_create_license_key', {
          p_plan: genPlan,
          p_duration_months: duration,
          p_custom_key: customKey
        });

      if (error) throw error;
      const keyVal = typeof data === 'object' && data !== null && 'key' in data ? (data as any).key : (data as string);
      setGeneratedKey(keyVal);
      alert('تم توليد مفتاح ترخيص وإدراجه سحابياً بنجاح!');
      loadDashboardData();
    } catch (err: any) {
      alert('فشل توليد المفتاح سحابياً: ' + err.message);
    }
  };

  // Generate Batch License Keys
  const handleGenerateBatchKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setGeneratingBatch(true);
    setGeneratedBatchKeys([]);

    const duration = parseInt(genDuration, 10);
    const count = Math.min(50, Math.max(1, parseInt(genCount, 10)));
    const batchList: string[] = [];

    try {
      for (let i = 0; i < count; i++) {
        const customPrefix = genPrefix ? `${genPrefix.trim().toUpperCase()}-${genPlan.toUpperCase()}-${i + 1}` : undefined;
        const { data, error } = await supabase
          .rpc('admin_create_license_key', {
            p_plan: genPlan,
            p_duration_months: duration,
            p_custom_key: customPrefix
          });

        if (!error && data) {
          const k = typeof data === 'object' && 'key' in data ? (data as any).key : (data as string);
          batchList.push(k);
        }
      }

      setGeneratedBatchKeys(batchList);
      alert(`تم توليد دفعة مكونة من ${batchList.length} مفاتيح سحابية بنجاح!`);
      loadDashboardData();
    } catch (err: any) {
      alert('فشل توليد الدفعة: ' + err.message);
    } finally {
      setGeneratingBatch(false);
    }
  };

  // Export Batch Keys
  const handleExportBatch = (format: 'txt' | 'csv') => {
    if (generatedBatchKeys.length === 0) return;
    let content = '';
    if (format === 'csv') {
      content = '\uFEFFمفتاح الترخيص,الباقة,تاريخ التوليد\n';
      generatedBatchKeys.forEach(k => {
        content += `${k},${genPlan.toUpperCase()},${new Date().toLocaleDateString('ar-SA')}\n`;
      });
    } else {
      content = generatedBatchKeys.join('\n');
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grido_batch_keys_${genPlan}_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      alert('تم نسخ مفتاح الترخيص للحافظة!');
    }
  };

  // Save System Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      localStorage.setItem('grido_sys_notice', systemNotice);
      localStorage.setItem('grido_sys_maint', maintenanceMode.toString());
      localStorage.setItem('grido_free_ai_limit', freeAiLimit.toString());
      localStorage.setItem('grido_pro_ai_limit', proAiLimit.toString());
      alert('تم حفظ إعدادات النظام الحية بنجاح!');
    } catch {
      alert('حدث خطأ أثناء حفظ الإعدادات.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtering & Sorting Users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.license_key || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'banned') return user.status === 'banned';
    if (statusFilter === 'pro') return user.plan === 'pro';
    if (statusFilter === 'enterprise') return user.plan === 'enterprise';
    if (statusFilter === 'trial') return user.plan === 'trial';
    if (statusFilter === 'free') return user.plan !== 'pro' && user.plan !== 'enterprise' && user.plan !== 'trial';
    if (statusFilter === 'expired') {
      const isExpiredDate = user.expires_at && new Date(user.expires_at) <= new Date();
      return user.status === 'expired' || isExpiredDate;
    }
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filtering Keys
  const filteredKeys = keys.filter(key => {
    const matchesSearch = 
      (key.key || '').toLowerCase().includes(keySearchQuery.toLowerCase()) ||
      (key.user_id || '').toLowerCase().includes(keySearchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (keyStatusFilter === 'all') return true;
    return key.status === keyStatusFilter;
  });

  // Dashboard Overview Metrics
  const totalUsers = users.length;
  const activePro = users.filter(u => u.plan === 'pro' && u.status !== 'banned' && (!u.expires_at || new Date(u.expires_at) > new Date())).length;
  const activeEnt = users.filter(u => u.plan === 'enterprise' && u.status !== 'banned').length;
  const totalAiRuns = aiUsageLogs.length;
  const totalAiCost = aiUsageLogs.reduce((acc, curr) => acc + (curr.cost_usd || 0.012), 0);
  const estimatedMRR = (activePro * 15) + (activeEnt * 49);

  // Segmented stats
  const proCount = users.filter(u => u.plan === 'pro').length;
  const entCount = users.filter(u => u.plan === 'enterprise').length;
  const freeCount = users.filter(u => u.plan !== 'pro' && u.plan !== 'enterprise' && u.plan !== 'trial').length;

  const totalSegment = totalUsers || 1;
  const proPct = Math.round((proCount / totalSegment) * 100);
  const entPct = Math.round((entCount / totalSegment) * 100);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  // 🔒 Login View (Cinematic Dark Vercel Aesthetic — design.md)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
        {/* Ambient Aurora Glow */}
        <div className="aurora-bg" />

        <div className="w-full max-w-md app-mockup p-8 space-y-6 relative z-10 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-white/5 text-white rounded-xl border border-[#383842]">
              <LayoutGrid className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black font-display text-white tracking-tight">GRIDO STUDIO</h1>
            <p className="text-xs font-mono uppercase tracking-widest text-[#999999]">لوحة إدارة التراخيص والخوادم السحابية</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-right">
            {!import.meta.env.VITE_SUPABASE_URL && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-300 block">Supabase URL</label>
                <input
                  type="url"
                  required
                  value={sbUrl}
                  onChange={e => setSbUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#383842] rounded-xl bg-[#121214] text-white focus:outline-none focus:border-white font-mono"
                />
              </div>
            )}

            {!import.meta.env.VITE_SUPABASE_ANON_KEY && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-300 block">Anon Key</label>
                <input
                  type="password"
                  required
                  value={sbKey}
                  onChange={e => setSbKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3.5 py-2.5 text-xs border border-[#383842] rounded-xl bg-[#121214] text-white focus:outline-none focus:border-white font-mono"
                />
              </div>
            )}

            <div className="border-t border-[#383842] my-4 pt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">البريد الإلكتروني للادمن</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#383842] rounded-xl bg-[#121214] text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#383842] rounded-xl bg-[#121214] text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-white text-black hover:bg-slate-200 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 magnetic-pill"
            >
              {loginLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>AUTHENTICATE ADMIN</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 📊 Dashboard View (Monochrome High-Contrast SpaceX / Vercel Theme)
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#000000] text-white font-sans selection:bg-white selection:text-black" dir="rtl">
      {/* Sidebar (Vercel Style) */}
      <aside className="w-full md:w-64 bg-[#121214] text-slate-200 flex flex-col shrink-0 border-l border-[#383842]">
        <div className="p-5 border-b border-[#383842] flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white text-black rounded-xl">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold font-display text-sm text-white tracking-tight">GRIDO STUDIO</span>
              <span className="text-[9px] font-mono text-[#999999] uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                SYSTEM ACTIVE
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-white/10 rounded-lg text-[#999999] hover:text-rose-400 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 text-right text-xs font-semibold">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
              activeTab === 'users' ? 'bg-white text-black font-bold shadow-lg' : 'text-[#999999] hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              إدارة المشتركين
            </span>
            <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
              activeTab === 'keys' ? 'bg-white text-black font-bold shadow-lg' : 'text-[#999999] hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Key className="w-4 h-4" />
              التراخيص والتوليد المجمع
            </span>
            <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('usage')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
              activeTab === 'usage' ? 'bg-white text-black font-bold shadow-lg' : 'text-[#999999] hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Wand2 className="w-4 h-4" />
              سجل استهلاك الـ AI 📊
            </span>
            <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
              activeTab === 'stats' ? 'bg-white text-black font-bold shadow-lg' : 'text-[#999999] hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4" />
              إحصائيات الإيرادات والأداء
            </span>
            <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
              activeTab === 'settings' ? 'bg-white text-black font-bold shadow-lg' : 'text-[#999999] hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4" />
              تخصيص وإعدادات النظام
            </span>
            <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
          </button>
        </nav>

        <div className="p-4 border-t border-[#383842] text-[10px] text-[#999999] text-center font-mono uppercase tracking-wider select-none">
          SUPABASE LIVE CONNECTED
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-screen relative">
        {/* Ambient Aurora BG */}
        <div className="aurora-bg" />

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#121214] border border-[#383842] p-5 rounded-2xl relative z-10 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-black font-display text-white flex items-center gap-2.5 tracking-tight">
              {activeTab === 'users' && <Users className="w-5 h-5 text-white" />}
              {activeTab === 'keys' && <Key className="w-5 h-5 text-white" />}
              {activeTab === 'usage' && <Wand2 className="w-5 h-5 text-white" />}
              {activeTab === 'stats' && <BarChart3 className="w-5 h-5 text-white" />}
              {activeTab === 'settings' && <Sliders className="w-5 h-5 text-white" />}
              {activeTab === 'users' && 'إدارة الحسابات والمشتركين'}
              {activeTab === 'keys' && 'إدارة مفاتيح الترخيص والتوليد المجمع'}
              {activeTab === 'usage' && 'سجل استخدام وخصم حصص الذكاء الاصطناعي'}
              {activeTab === 'stats' && 'إحصائيات الخادم وتوقعات الإيرادات (MRR)'}
              {activeTab === 'settings' && 'تخصيص وإعدادات حدود الخادم الحية'}
            </h2>
            <p className="text-xs text-[#999999] mt-1 font-sans">منظومة تحكم سينمائية لإدارة الاشتراكات والتأثيرات السحابية فورياً</p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono font-bold border border-[#383842] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>SYNC DATA</span>
            </button>
          </div>
        </div>

        {/* Overview Spotlight Stats Cards (design.md Section 4.2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
          <div
            onMouseMove={handleMouseMove}
            className="spotlight-card p-5 space-y-2 border border-[#383842]"
          >
            <div className="flex items-center justify-between text-[#999999] text-xs font-mono uppercase tracking-wider">
              <span>إجمالي الحسابات</span>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">{totalUsers}</div>
            <div className="text-[10px] text-[#999999] font-mono">مستخدم مسجل بالمحتوى</div>
          </div>

          <div
            onMouseMove={handleMouseMove}
            className="spotlight-card p-5 space-y-2 border border-[#383842]"
          >
            <div className="flex items-center justify-between text-[#999999] text-xs font-mono uppercase tracking-wider">
              <span>مشتركي Pro / Enterprise</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">{activePro + activeEnt}</div>
            <div className="text-[10px] text-[#999999] font-mono">{activePro} Pro + {activeEnt} Enterprise</div>
          </div>

          <div
            onMouseMove={handleMouseMove}
            className="spotlight-card p-5 space-y-2 border border-[#383842]"
          >
            <div className="flex items-center justify-between text-[#999999] text-xs font-mono uppercase tracking-wider">
              <span>مفاتيح غير مفعلة</span>
              <Key className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black font-mono text-amber-400 tracking-tight">{keys.filter(k => k.status === 'unused').length}</div>
            <div className="text-[10px] text-[#999999] font-mono">جاهزة للتوزيع والتسليم</div>
          </div>

          <div
            onMouseMove={handleMouseMove}
            className="spotlight-card p-5 space-y-2 border border-[#383842]"
          >
            <div className="flex items-center justify-between text-[#999999] text-xs font-mono uppercase tracking-wider">
              <span>إجمالي عمليات الذكاء</span>
              <Wand2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black font-mono text-purple-400 tracking-tight">{totalAiRuns}</div>
            <div className="text-[10px] text-[#999999] font-mono">تكلفة تقديرية: ${totalAiCost.toFixed(2)}</div>
          </div>

          <div
            onMouseMove={handleMouseMove}
            className="spotlight-card p-5 space-y-2 border border-[#383842]"
          >
            <div className="flex items-center justify-between text-[#999999] text-xs font-mono uppercase tracking-wider">
              <span>تقدير الدخل (MRR)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black font-mono text-emerald-300 tracking-tight">${estimatedMRR} <span className="text-xs font-normal text-[#999999]">/MO</span></div>
            <div className="text-[10px] text-[#999999] font-mono">تقديري للاشتراكات الفاعلة</div>
          </div>
        </div>

        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4 relative z-10 tab-content-reveal">
            {/* Filters Bar */}
            <div className="bg-[#121214] border border-[#383842] p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-[#999999]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، البريد الإلكتروني، أو المفتاح..."
                  className="w-full pr-10 pl-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white focus:outline-none focus:border-white font-sans"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <div className="flex items-center gap-1 bg-[#000000] border border-[#383842] p-1 rounded-xl text-xs font-mono">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'all' ? 'bg-white text-black font-bold' : 'text-[#999999] hover:text-white'}`}
                  >
                    ALL
                  </button>
                  <button
                    onClick={() => setStatusFilter('pro')}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'pro' ? 'bg-blue-600 text-white font-bold' : 'text-[#999999] hover:text-white'}`}
                  >
                    PRO
                  </button>
                  <button
                    onClick={() => setStatusFilter('enterprise')}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'enterprise' ? 'bg-purple-600 text-white font-bold' : 'text-[#999999] hover:text-white'}`}
                  >
                    ENT
                  </button>
                  <button
                    onClick={() => setStatusFilter('free')}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'free' ? 'bg-slate-800 text-white font-bold' : 'text-[#999999] hover:text-white'}`}
                  >
                    FREE
                  </button>
                  <button
                    onClick={() => setStatusFilter('banned')}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer uppercase ${statusFilter === 'banned' ? 'bg-rose-600 text-white font-bold' : 'text-[#999999] hover:text-white'}`}
                  >
                    BANNED
                  </button>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-[#383842] rounded-xl text-xs flex items-center gap-2 cursor-pointer font-mono font-bold uppercase tracking-wider"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  EXPORT CSV
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#121214] border border-[#383842] rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-[#000000] text-[#999999] font-mono text-[11px] uppercase tracking-wider border-b border-[#383842]">
                    <tr>
                      <th className="p-4">المستخدم</th>
                      <th className="p-4">الباقة</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4">تاريخ الانتهاء</th>
                      <th className="p-4">مفتاح الترخيص</th>
                      <th className="p-4 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#383842]/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-[#999999] font-mono">
                          لا توجد نتائج تطابق خيارات البحث الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => {
                        const isExpired = user.expires_at && new Date(user.expires_at) <= new Date();
                        const isBanned = user.status === 'banned';

                        return (
                          <tr key={user.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white text-sm">{user.name || 'بدون اسم'}</div>
                              <div className="text-[11px] text-[#999999] font-mono">{user.email}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase ${
                                user.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                user.plan === 'pro' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                'bg-white/5 text-[#999999] border border-[#383842]'
                              }`}>
                                {user.plan}
                              </span>
                            </td>
                            <td className="p-4 font-mono">
                              {isBanned ? (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  BANNED 🛑
                                </span>
                              ) : isExpired ? (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  EXPIRED ⏳
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  ACTIVE ✨
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-mono text-[11px] text-slate-300">
                              {user.expires_at ? new Date(user.expires_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                            </td>
                            <td className="p-4 font-mono text-[11px] text-[#999999]">
                              {user.license_key || '—'}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditUser(user)}
                                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-[#383842] rounded-lg text-[11px] cursor-pointer flex items-center gap-1 font-mono"
                                >
                                  <Sliders className="w-3 h-3" />
                                  EDIT
                                </button>
                                <button
                                  onClick={() => handleExtendLicense(user.id, 1)}
                                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-slate-200 border border-[#383842] rounded-lg text-[11px] font-mono cursor-pointer"
                                  title="+1 شهر"
                                >
                                  +1M
                                </button>
                                {user.plan !== 'free' && (
                                  <button
                                    onClick={() => handleRevokeLicense(user.id)}
                                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-mono cursor-pointer"
                                    title="سحب الترخيص وإعادته للـ Free"
                                  >
                                    REVOKE
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleBanUser(user)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer border ${
                                    isBanned ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  }`}
                                >
                                  {isBanned ? 'UNBAN' : 'BAN'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KEYS & BATCH GENERATOR */}
        {activeTab === 'keys' && (
          <div className="space-y-6 relative z-10 tab-content-reveal">
            {/* Key Generator Tool */}
            <div
              onMouseMove={handleMouseMove}
              className="spotlight-card p-6 border border-[#383842] space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#383842] pb-4">
                <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
                  <Key className="w-4 h-4 text-white" />
                  أداة توليد مفاتيح الترخيص السحابية (LICENSE GENERATOR)
                </h3>
                <div className="flex items-center gap-1 bg-[#000000] border border-[#383842] p-1 rounded-xl font-mono text-xs">
                  <button
                    onClick={() => setGenMode('single')}
                    className={`px-3.5 py-1.5 rounded-lg cursor-pointer ${genMode === 'single' ? 'bg-white text-black font-bold' : 'text-[#999999]'}`}
                  >
                    SINGLE KEY
                  </button>
                  <button
                    onClick={() => setGenMode('batch')}
                    className={`px-3.5 py-1.5 rounded-lg cursor-pointer ${genMode === 'batch' ? 'bg-white text-black font-bold' : 'text-[#999999]'}`}
                  >
                    BATCH KEYS 📦
                  </button>
                </div>
              </div>

              {genMode === 'single' ? (
                <form onSubmit={handleGenerateKey} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-[#999999] block mb-1.5">الباقة</label>
                    <select
                      value={genPlan}
                      onChange={e => setGenPlan(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                    >
                      <option value="pro">Pro (احترافي)</option>
                      <option value="enterprise">Enterprise (مؤسسات)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-[#999999] block mb-1.5">مدة الصلاحية</label>
                    <select
                      value={genDuration}
                      onChange={e => setGenDuration(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                    >
                      <option value="1">1 شهر</option>
                      <option value="3">3 أشهر</option>
                      <option value="6">6 أشهر</option>
                      <option value="12">12 شهر (سنة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-[#999999] block mb-1.5">بادئة مخصصة</label>
                    <input
                      type="text"
                      value={genPrefix}
                      onChange={e => setGenPrefix(e.target.value)}
                      placeholder="مثال: STUDIO-VIP"
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-3 bg-white text-black hover:bg-slate-200 font-mono font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 magnetic-pill shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    GENERATE KEY
                  </button>
                </form>
              ) : (
                <form onSubmit={handleGenerateBatchKeys} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-[#999999] block mb-1.5">الباقة</label>
                    <select
                      value={genPlan}
                      onChange={e => setGenPlan(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                    >
                      <option value="pro">Pro (احترافي)</option>
                      <option value="enterprise">Enterprise (مؤسسات)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-[#999999] block mb-1.5">المدة</label>
                    <select
                      value={genDuration}
                      onChange={e => setGenDuration(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                    >
                      <option value="1">1 شهر</option>
                      <option value="3">3 أشهر</option>
                      <option value="6">6 أشهر</option>
                      <option value="12">12 شهر (سنة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-[#999999] block mb-1.5">عدد المفاتيح</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={genCount}
                      onChange={e => setGenCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-[#999999] block mb-1.5">بادئة الموزع</label>
                    <input
                      type="text"
                      value={genPrefix}
                      onChange={e => setGenPrefix(e.target.value)}
                      placeholder="BULK-RESELLER"
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={generatingBatch}
                    className="py-3 bg-white text-black hover:bg-slate-200 font-mono font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 magnetic-pill shadow-lg"
                  >
                    {generatingBatch ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Sparkles className="w-4 h-4" />}
                    GENERATE BATCH
                  </button>
                </form>
              )}

              {/* Single Generated Key Preview */}
              {generatedKey && genMode === 'single' && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">KEY GENERATED:</span>
                    <code className="text-white text-sm bg-[#000000] px-3 py-1.5 rounded-lg border border-[#383842]">{generatedKey}</code>
                  </div>
                  <button
                    onClick={handleCopyKey}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer uppercase"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    COPY KEY
                  </button>
                </div>
              )}

              {/* Batch Generated Keys Preview */}
              {generatedBatchKeys.length > 0 && genMode === 'batch' && (
                <div className="p-5 bg-[#000000] border border-[#383842] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      BATCH KEYS GENERATED ({generatedBatchKeys.length})
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <button
                        onClick={() => handleExportBatch('txt')}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-white" />
                        TXT
                      </button>
                      <button
                        onClick={() => handleExportBatch('csv')}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 bg-[#121214] p-4 rounded-xl border border-[#383842]">
                    {generatedBatchKeys.map((k, i) => (
                      <div key={i} className="flex justify-between border-b border-[#383842]/40 pb-1.5">
                        <span>{i + 1}. {k}</span>
                        <span className="text-emerald-400 font-bold">READY</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Keys Table */}
            <div className="bg-[#121214] border border-[#383842] rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h4 className="font-bold text-white text-xs font-mono uppercase tracking-wider">سجل مفاتيح الترخيص المخزنة في السحابة</h4>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 bg-[#000000] border border-[#383842] p-1 rounded-xl text-xs font-mono">
                    <button
                      onClick={() => setKeyStatusFilter('all')}
                      className={`px-3 py-1 rounded-lg cursor-pointer ${keyStatusFilter === 'all' ? 'bg-white text-black font-bold' : 'text-[#999999]'}`}
                    >
                      ALL
                    </button>
                    <button
                      onClick={() => setKeyStatusFilter('unused')}
                      className={`px-3 py-1 rounded-lg cursor-pointer ${keyStatusFilter === 'unused' ? 'bg-emerald-500 text-black font-bold' : 'text-[#999999]'}`}
                    >
                      UNUSED
                    </button>
                    <button
                      onClick={() => setKeyStatusFilter('used')}
                      className={`px-3 py-1 rounded-lg cursor-pointer ${keyStatusFilter === 'used' ? 'bg-slate-700 text-white' : 'text-[#999999]'}`}
                    >
                      USED
                    </button>
                  </div>

                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-[#999999]" />
                    <input
                      type="text"
                      value={keySearchQuery}
                      onChange={e => setKeySearchQuery(e.target.value)}
                      placeholder="ابحث بالمفتاح..."
                      className="w-full pr-8 pl-3 py-1.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-[#000000] text-[#999999] font-mono text-[11px] uppercase tracking-wider border-b border-[#383842]">
                    <tr>
                      <th className="p-3.5">مفتاح الترخيص</th>
                      <th className="p-3.5">الباقة</th>
                      <th className="p-3.5">مدة الصلاحية</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">تاريخ التوليد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#383842]/60 font-mono">
                    {filteredKeys.map(k => (
                      <tr key={k.key} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-bold text-white">{k.key}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                            {k.plan}
                          </span>
                        </td>
                        <td className="p-3.5">{k.duration_months} M</td>
                        <td className="p-3.5">
                          {k.status === 'unused' ? (
                            <span className="text-emerald-400 font-bold">UNUSED 🟢</span>
                          ) : (
                            <span className="text-[#999999]">ACTIVATED ⚪</span>
                          )}
                        </td>
                        <td className="p-3.5 text-[#999999]">
                          {k.created_at ? new Date(k.created_at).toLocaleDateString('ar-SA') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI USAGE LOGS */}
        {activeTab === 'usage' && (
          <div className="bg-[#121214] border border-[#383842] rounded-2xl overflow-hidden p-5 space-y-4 relative z-10 tab-content-reveal">
            <div className="flex items-center justify-between border-b border-[#383842] pb-4">
              <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-400" />
                سجل عمليات الترميم ومعالجة الذكاء الاصطناعي (AI USAGE LOGS)
              </h3>
              <span className="text-xs text-[#999999] font-mono">TOTAL RUNS: {aiUsageLogs.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-[#000000] text-[#999999] font-mono text-[11px] uppercase tracking-wider border-b border-[#383842]">
                  <tr>
                    <th className="p-3.5">معرف المستخدم</th>
                    <th className="p-3.5">تاريخ التنفيذ</th>
                    <th className="p-3.5">حجم الصورة</th>
                    <th className="p-3.5">مدة المعالجة</th>
                    <th className="p-3.5">التكلفة التقديرية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383842]/60 font-mono text-[11px]">
                  {aiUsageLogs.map(log => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 text-slate-300">{log.user_id}</td>
                      <td className="p-3.5 text-[#999999]">{new Date(log.used_at).toLocaleString('ar-SA')}</td>
                      <td className="p-3.5">{((log.image_bytes || 0) / 1024 / 1024).toFixed(2)} MB</td>
                      <td className="p-3.5">{(log.execution_seconds || 1.2).toFixed(1)}s</td>
                      <td className="p-3.5 text-emerald-400">${(log.cost_usd || 0.012).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM STATS & METRICS */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 tab-content-reveal">
            <div
              onMouseMove={handleMouseMove}
              className="spotlight-card p-6 border border-[#383842] space-y-5"
            >
              <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
                <Activity className="w-4 h-4 text-emerald-400" />
                توزيع الاشتراكات والفاعلية (SUBSCRIPTION BREAKDOWN)
              </h3>
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
                    <span>PRO PLAN</span>
                    <span className="font-bold text-blue-400">{proCount} ({proPct}%)</span>
                  </div>
                  <div className="w-full bg-[#000000] h-2.5 rounded-full overflow-hidden border border-[#383842]">
                    <div className="bg-blue-500 h-full" style={{ width: `${proPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
                    <span>ENTERPRISE PLAN</span>
                    <span className="font-bold text-purple-400">{entCount} ({entPct}%)</span>
                  </div>
                  <div className="w-full bg-[#000000] h-2.5 rounded-full overflow-hidden border border-[#383842]">
                    <div className="bg-purple-500 h-full" style={{ width: `${entPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1.5">
                    <span>FREE TIER</span>
                    <span className="font-bold text-[#999999]">{freeCount} ({100 - proPct - entPct}%)</span>
                  </div>
                  <div className="w-full bg-[#000000] h-2.5 rounded-full overflow-hidden border border-[#383842]">
                    <div className="bg-slate-700 h-full" style={{ width: `${100 - proPct - entPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div
              onMouseMove={handleMouseMove}
              className="spotlight-card p-6 border border-[#383842] space-y-5"
            >
              <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
                <Coins className="w-4 h-4 text-amber-400" />
                المؤشرات المالية واسترداد التكلفة (REVENUE METRICS)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 bg-[#000000] rounded-xl border border-[#383842]">
                  <div className="text-[#999999] uppercase tracking-wider">MRR ESTIMATED</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">${estimatedMRR}</div>
                </div>
                <div className="p-4 bg-[#000000] rounded-xl border border-[#383842]">
                  <div className="text-[#999999] uppercase tracking-wider">ARR PROJECTED</div>
                  <div className="text-2xl font-black text-emerald-300 mt-1">${estimatedMRR * 12}</div>
                </div>
                <div className="p-4 bg-[#000000] rounded-xl border border-[#383842]">
                  <div className="text-[#999999] uppercase tracking-wider">PRO CONVERSION RATE</div>
                  <div className="text-2xl font-black text-blue-400 mt-1">{proPct + entPct}%</div>
                </div>
                <div className="p-4 bg-[#000000] rounded-xl border border-[#383842]">
                  <div className="text-[#999999] uppercase tracking-wider">GPU HOSTING COST</div>
                  <div className="text-2xl font-black text-purple-400 mt-1">${totalAiCost.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM CONFIG & SETTINGS */}
        {activeTab === 'settings' && (
          <div
            onMouseMove={handleMouseMove}
            className="spotlight-card p-6 border border-[#383842] space-y-6 relative z-10 tab-content-reveal"
          >
            <div className="border-b border-[#383842] pb-4">
              <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
                <Sliders className="w-4 h-4 text-white" />
                تخصيص وإعدادات السيرفر والحدود الحية (LIVE SYSTEM CONFIG)
              </h3>
              <p className="text-xs text-[#999999] mt-1 font-sans">تخصيص حدود استخدام الذكاء الاصطناعي والإعلانات الفورية</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
              {/* AI Quotas */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  حدود الذكاء الاصطناعي اليومية لكل باقة (صور/يومياً)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-[#999999] block mb-1.5">FREE TIER</label>
                    <input
                      type="number"
                      value={freeAiLimit}
                      onChange={e => setFreeAiLimit(parseInt(e.target.value, 10))}
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-[#999999] block mb-1.5">PRO TIER</label>
                    <input
                      type="number"
                      value={proAiLimit}
                      onChange={e => setProAiLimit(parseInt(e.target.value, 10))}
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-[#999999] block mb-1.5">ENTERPRISE TIER</label>
                    <input
                      type="number"
                      value={enterpriseAiLimit}
                      onChange={e => setEnterpriseAiLimit(parseInt(e.target.value, 10))}
                      className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Notice Announcement */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-300 block">رسالة التنبيه العامة للتطبيق (Notice Banner)</label>
                <textarea
                  rows={3}
                  value={systemNotice}
                  onChange={e => setSystemNotice(e.target.value)}
                  className="w-full px-4 py-3 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white leading-relaxed font-sans"
                />
              </div>

              {/* Maintenance Toggle */}
              <div className="flex items-center justify-between p-5 bg-[#000000] border border-[#383842] rounded-xl">
                <div>
                  <div className="text-xs font-bold text-white">وضع الصيانة والتحديثات السحابية</div>
                  <div className="text-[11px] text-[#999999] mt-0.5">إظهار إشعار صيانة للمستخدمين عند التشغيل</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`px-4 py-2 rounded-full text-xs font-mono font-bold cursor-pointer transition-colors ${
                    maintenanceMode ? 'bg-rose-600 text-white' : 'bg-white/10 text-[#999999]'
                  }`}
                >
                  {maintenanceMode ? 'ACTIVE (MAINTENANCE)' : 'DISABLED (NORMAL)'}
                </button>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-3 bg-white text-black hover:bg-slate-200 font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer flex items-center gap-2 magnetic-pill"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Settings className="w-4 h-4" />}
                <span>SAVE CONFIGURATION</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* EDIT USER MODAL (Cinematic Glassmorphism) */}
      {editModalUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-lg bg-[#121214] border border-[#383842] rounded-2xl shadow-2xl p-6 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-[#383842] pb-4">
              <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
                <Sliders className="w-4 h-4 text-white" />
                تعديل وتخصيص حساب: {editModalUser.email}
              </h3>
              <button
                onClick={() => setEditModalUser(null)}
                className="p-1 text-[#999999] hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserProfile} className="space-y-4 font-sans">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  disabled
                  value={editEmail}
                  className="w-full px-3.5 py-2.5 bg-[#000000]/60 border border-[#383842] rounded-xl text-xs text-[#999999] cursor-not-allowed font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">الباقة المستهدفة</label>
                  <select
                    value={editPlan}
                    onChange={e => setEditPlan(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                  >
                    <option value="free">FREE (مجاني)</option>
                    <option value="pro">PRO (احترافي)</option>
                    <option value="enterprise">ENTERPRISE (مؤسسات)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">حالة الحساب</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                  >
                    <option value="active">ACTIVE (نشط)</option>
                    <option value="expired">EXPIRED (منتهي)</option>
                    <option value="banned">BANNED (محظور)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">تاريخ انتهاء الصلاحية المخصص</label>
                <input
                  type="date"
                  value={editExpiresAt}
                  onChange={e => setEditExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#383842] rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#383842]">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="px-4 py-2.5 bg-white/10 text-slate-300 rounded-xl text-xs font-mono hover:bg-white/20 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2.5 bg-white text-black hover:bg-slate-200 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 magnetic-pill"
                >
                  {savingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>SAVE CHANGES</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
              .from('profiles')
              .select('plan')
              .eq('id', data.user.id)
              .single()
              .then(({ data: profileData }) => {
                if (profileData && profileData.plan === 'enterprise') {
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
        .from('ai_usage_logs')
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

      // Verify user has enterprise admin privileges
      const { data: profileData, error: profErr } = await client
        .from('profiles')
        .select('plan')
        .eq('id', data.user.id)
        .single();

      if (profErr || !profileData || profileData.plan !== 'enterprise') {
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
    } catch (err: any) {
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // 🔒 Login View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Grido Studio | لوحة التحكم</h1>
            <p className="text-xs text-slate-400">سجل الدخول بحساب المطور لإدارة التراخيص سحابياً</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-right">
            {!import.meta.env.VITE_SUPABASE_URL && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">رابط مشروع Supabase (URL)</label>
                <input
                  type="url"
                  required
                  value={sbUrl}
                  onChange={e => setSbUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full px-3.5 py-2 text-xs border border-slate-800 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            )}

            {!import.meta.env.VITE_SUPABASE_ANON_KEY && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">مفتاح الوصول العام (Anon Key)</label>
                <input
                  type="password"
                  required
                  value={sbKey}
                  onChange={e => setSbKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-800 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            )}

            <div className="border-t border-slate-800/80 my-4 pt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني للمطور</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2 text-xs border border-slate-800 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-xs border border-slate-800 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 rounded-lg font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تسجيل الدخول والربط</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 📊 Dashboard View
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950" dir="rtl">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-l border-slate-700/50">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-lg shadow-md shadow-blue-500/10">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-white">Grido Studio</span>
              <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                لوحة التحكم المتقدمة
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 text-right text-xs font-semibold">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'users' ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              إدارة المشتركين
            </span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'keys' ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              التراخيص والتوليد المجمع
            </span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('usage')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'usage' ? 'bg-gradient-to-l from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/15' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-violet-400" />
              سجل استهلاك الذكاء الاصطناعي 📊
            </span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'stats' ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              إحصائيات الإيرادات والأداء
            </span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'settings' ? 'bg-gradient-to-l from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/15' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              تخصيص وإعدادات النظام
            </span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono select-none">
          مشروع Supabase نشط سحابياً
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-screen">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {activeTab === 'users' && <Users className="w-5 h-5 text-blue-400" />}
              {activeTab === 'keys' && <Key className="w-5 h-5 text-indigo-400" />}
              {activeTab === 'usage' && <Wand2 className="w-5 h-5 text-violet-400" />}
              {activeTab === 'stats' && <BarChart3 className="w-5 h-5 text-emerald-400" />}
              {activeTab === 'settings' && <Sliders className="w-5 h-5 text-teal-400" />}
              {activeTab === 'users' && 'إدارة الحسابات والمشتركين'}
              {activeTab === 'keys' && 'إدارة مفاتيح الترخيص والتوليد المجمع'}
              {activeTab === 'usage' && 'سجل استخدام وخصم حصص الذكاء الاصطناعي'}
              {activeTab === 'stats' && 'إحصائيات الخادم وتوقعات الإيرادات (MRR)'}
              {activeTab === 'settings' && 'تخصيص وإعدادات حدود الخادم الحية'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">لوحة مركزية سحابية لإدارة المنظومة والاشتراكات فورياً</p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>إجمالي الحسابات</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">{totalUsers}</div>
            <div className="text-[10px] text-slate-500 font-medium">مستخدم مسجل بالمحتوى</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>مشتركي Pro / Enterprise</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">{activePro + activeEnt}</div>
            <div className="text-[10px] text-slate-500 font-medium">{activePro} Pro + {activeEnt} Enterprise</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>مفاتيح غير مفعلة</span>
              <Key className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400">{keys.filter(k => k.status === 'unused').length}</div>
            <div className="text-[10px] text-slate-500 font-medium">جاهزة للتوزيع والتسليم</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>إجمالي عمليات الذكاء</span>
              <Wand2 className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-2xl font-extrabold text-violet-400">{totalAiRuns}</div>
            <div className="text-[10px] text-slate-500 font-medium">تكلفة تقديرية: ${totalAiCost.toFixed(2)}</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>تقدير الدخل (MRR)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-300">${estimatedMRR} <span className="text-xs font-normal text-slate-400">/شهر</span></div>
            <div className="text-[10px] text-slate-500 font-medium">تقديري للاشتراكات الفاعلة</div>
          </div>
        </div>

        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، البريد الإلكتروني، أو المفتاح..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs cursor-pointer ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setStatusFilter('pro')}
                    className={`px-2.5 py-1 rounded-md text-xs cursor-pointer ${statusFilter === 'pro' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Pro
                  </button>
                  <button
                    onClick={() => setStatusFilter('enterprise')}
                    className={`px-2.5 py-1 rounded-md text-xs cursor-pointer ${statusFilter === 'enterprise' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Enterprise
                  </button>
                  <button
                    onClick={() => setStatusFilter('free')}
                    className={`px-2.5 py-1 rounded-md text-xs cursor-pointer ${statusFilter === 'free' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    مجاني
                  </button>
                  <button
                    onClick={() => setStatusFilter('banned')}
                    className={`px-2.5 py-1 rounded-md text-xs cursor-pointer ${statusFilter === 'banned' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    محظور
                  </button>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  تصدير CSV
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">المستخدم</th>
                      <th className="p-3.5">الباقة</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">تاريخ الانتهاء</th>
                      <th className="p-3.5">مفتاح الترخيص</th>
                      <th className="p-3.5 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          لا توجد نتائج تطابق خيارات البحث الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => {
                        const isExpired = user.expires_at && new Date(user.expires_at) <= new Date();
                        const isBanned = user.status === 'banned';

                        return (
                          <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-white">{user.name || 'بدون اسم'}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                user.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                user.plan === 'pro' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {user.plan.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3.5">
                              {isBanned ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  محظور 🛑
                                </span>
                              ) : isExpired ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  منتهي الصلاحية ⏳
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  نشط ✨
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-[11px]">
                              {user.expires_at ? new Date(user.expires_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-slate-400">
                              {user.license_key || '—'}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditUser(user)}
                                  className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-[11px] cursor-pointer flex items-center gap-1"
                                >
                                  <Sliders className="w-3 h-3" />
                                  تعديل وتخصيص
                                </button>
                                <button
                                  onClick={() => handleExtendLicense(user.id, 1)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] cursor-pointer"
                                  title="+1 شهر"
                                >
                                  + شهر
                                </button>
                                {user.plan !== 'free' && (
                                  <button
                                    onClick={() => handleRevokeLicense(user.id)}
                                    className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-[11px] cursor-pointer"
                                    title="سحب الترخيص وإعادية للـ Free"
                                  >
                                    سحب الترخيص
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleBanUser(user)}
                                  className={`px-2 py-1 rounded text-[11px] cursor-pointer border ${
                                    isBanned ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-600/20 text-rose-300 border-rose-500/30'
                                  }`}
                                >
                                  {isBanned ? 'إلغاء الحظر' : 'حظر'}
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
          <div className="space-y-6">
            {/* Key Generator Tool */}
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  أداة توليد مفاتيح الترخيص (فردي ومجمع)
                </h3>
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setGenMode('single')}
                    className={`px-3 py-1 text-xs rounded-md cursor-pointer ${genMode === 'single' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
                  >
                    مفتاح فردي
                  </button>
                  <button
                    onClick={() => setGenMode('batch')}
                    className={`px-3 py-1 text-xs rounded-md cursor-pointer ${genMode === 'batch' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
                  >
                    توليد دفعة مجمعة 📦
                  </button>
                </div>
              </div>

              {genMode === 'single' ? (
                <form onSubmit={handleGenerateKey} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">نوع الباقة المستهدفة</label>
                    <select
                      value={genPlan}
                      onChange={e => setGenPlan(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="pro">Pro (احترافي)</option>
                      <option value="enterprise">Enterprise (مؤسسات)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">مدة الصلاحية (أشهر)</label>
                    <select
                      value={genDuration}
                      onChange={e => setGenDuration(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="1">1 شهر</option>
                      <option value="3">3 أشهر</option>
                      <option value="6">6 أشهر</option>
                      <option value="12">12 شهر (سنة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">بادئة مخصصة (اختياري)</label>
                    <input
                      type="text"
                      value={genPrefix}
                      onChange={e => setGenPrefix(e.target.value)}
                      placeholder="مثال: STUDIO-VIP"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    توليد وتخزين المفتاح سحابياً
                  </button>
                </form>
              ) : (
                <form onSubmit={handleGenerateBatchKeys} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">الباقة</label>
                    <select
                      value={genPlan}
                      onChange={e => setGenPlan(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="pro">Pro (احترافي)</option>
                      <option value="enterprise">Enterprise (مؤسسات)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">المدة (أشهر)</label>
                    <select
                      value={genDuration}
                      onChange={e => setGenDuration(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="1">1 شهر</option>
                      <option value="3">3 أشهر</option>
                      <option value="6">6 أشهر</option>
                      <option value="12">12 شهر (سنة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">عدد المفاتيح (1 - 50)</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={genCount}
                      onChange={e => setGenCount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">بادئة الموزع / الاستوديو</label>
                    <input
                      type="text"
                      value={genPrefix}
                      onChange={e => setGenPrefix(e.target.value)}
                      placeholder="مثال: BULK-RESELLER"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={generatingBatch}
                    className="py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {generatingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    توليد الدفعة سحابياً
                  </button>
                </form>
              )}

              {/* Single Generated Key Preview */}
              {generatedKey && genMode === 'single' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">المفتاح المولد:</span>
                    <code className="font-mono text-white text-sm bg-slate-950 px-2 py-1 rounded border border-slate-800">{generatedKey}</code>
                  </div>
                  <button
                    onClick={handleCopyKey}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    نسخ المفتاح
                  </button>
                </div>
              )}

              {/* Batch Generated Keys Preview */}
              {generatedBatchKeys.length > 0 && genMode === 'batch' && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      الدفعة المولدة ({generatedBatchKeys.length} مفتاح):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportBatch('txt')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        تحميل TXT
                      </button>
                      <button
                        onClick={() => handleExportBatch('csv')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        تحميل CSV
                      </button>
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 bg-slate-900 p-3 rounded border border-slate-800/80">
                    {generatedBatchKeys.map((k, i) => (
                      <div key={i} className="flex justify-between border-b border-slate-800/40 pb-1">
                        <span>{i + 1}. {k}</span>
                        <span className="text-emerald-400 font-bold">جاهز</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Keys Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-3 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h4 className="font-bold text-white text-xs">سجل مفاتيح الترخيص المخزنة في السحابة</h4>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
                    <button
                      onClick={() => setKeyStatusFilter('all')}
                      className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${keyStatusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                      الكل
                    </button>
                    <button
                      onClick={() => setKeyStatusFilter('unused')}
                      className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${keyStatusFilter === 'unused' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                    >
                      غير مستخدم
                    </button>
                    <button
                      onClick={() => setKeyStatusFilter('used')}
                      className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${keyStatusFilter === 'used' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                    >
                      تم التفعيل
                    </button>
                  </div>

                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={keySearchQuery}
                      onChange={e => setKeySearchQuery(e.target.value)}
                      placeholder="ابحث..."
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">مفتاح الترخيص</th>
                      <th className="p-3">الباقة</th>
                      <th className="p-3">مدة الصلاحية</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">تاريخ التوليد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredKeys.map(k => (
                      <tr key={k.key} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{k.key}</td>
                        <td className="p-3 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300">
                            {k.plan.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-sans">{k.duration_months} شهر</td>
                        <td className="p-3 font-sans">
                          {k.status === 'unused' ? (
                            <span className="text-emerald-400 font-bold">غير مستخدم 🟢</span>
                          ) : (
                            <span className="text-slate-500">تم التفعيل ⚪</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">
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
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-violet-400" />
                سجل عمليات الترميم ومعالجة الذكاء الاصطناعي (أحدث 100 عملية)
              </h3>
              <span className="text-xs text-slate-400 font-mono">Total Runs: {aiUsageLogs.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">معرف المستخدم</th>
                    <th className="p-3">تاريخ التنفيذ</th>
                    <th className="p-3">حجم الصورة</th>
                    <th className="p-3">مدة المعالجة</th>
                    <th className="p-3">التكلفة التقديرية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {aiUsageLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-300">{log.user_id}</td>
                      <td className="p-3 text-slate-400">{new Date(log.used_at).toLocaleString('ar-SA')}</td>
                      <td className="p-3">{((log.image_bytes || 0) / 1024 / 1024).toFixed(2)} MB</td>
                      <td className="p-3">{(log.execution_seconds || 1.2).toFixed(1)}s</td>
                      <td className="p-3 text-emerald-400">${(log.cost_usd || 0.012).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM STATS & METRICS */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                توزيع الاشتراكات والفاعلية
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>باقة Pro (احترافي)</span>
                    <span className="font-bold">{proCount} مستخدم ({proPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${proPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>باقة Enterprise (مؤسسات)</span>
                    <span className="font-bold">{entCount} مستخدم ({entPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${entPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>الباقة المجانية (Free)</span>
                    <span className="font-bold">{freeCount} مستخدم ({100 - proPct - entPct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-700 h-full" style={{ width: `${100 - proPct - entPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                المؤشرات المالية واسترداد التكلفة
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400">الإيراد الشهري (MRR)</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">${estimatedMRR}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400">الإيراد السنوي (ARR)</div>
                  <div className="text-xl font-bold text-emerald-300 mt-1">${estimatedMRR * 12}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400">معدل التحويل للـ Pro</div>
                  <div className="text-xl font-bold text-blue-400 mt-1">{proPct + entPct}%</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400">مجموع استهلاك الـ GPU</div>
                  <div className="text-xl font-bold text-violet-400 mt-1">${totalAiCost.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM CONFIG & SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                تخصيص وإعدادات السيرفر والحدود الحية
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">تخصيص حدود استخدام الذكاء الاصطناعي والإعلانات الفورية</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
              {/* AI Quotas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  حدود الذكاء الاصطناعي اليومية لكل باقة (صور/يومياً)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">الباقة المجانية</label>
                    <input
                      type="number"
                      value={freeAiLimit}
                      onChange={e => setFreeAiLimit(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">باقة Pro الاحترافية</label>
                    <input
                      type="number"
                      value={proAiLimit}
                      onChange={e => setProAiLimit(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">باقة Enterprise</label>
                    <input
                      type="number"
                      value={enterpriseAiLimit}
                      onChange={e => setEnterpriseAiLimit(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Notice Announcement */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">رسالة التنبيه العامة للتطبيق (Notice Banner)</label>
                <textarea
                  rows={3}
                  value={systemNotice}
                  onChange={e => setSystemNotice(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white leading-relaxed"
                />
              </div>

              {/* Maintenance Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg">
                <div>
                  <div className="text-xs font-bold text-white">وضع الصيانة والتحديثات السحابية</div>
                  <div className="text-[11px] text-slate-400">إظهار إشعار صيانة للمستخدمين عند التشغيل</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                    maintenanceMode ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {maintenanceMode ? 'مُفعّل (صيانة)' : 'معطل (طبيعي)'}
                </button>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer flex items-center gap-2"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                حفظ تفضيلات النظام السحابية
              </button>
            </form>
          </div>
        )}
      </main>

      {/* EDIT USER MODAL */}
      {editModalUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                تعديل وتخصيص حساب: {editModalUser.email}
              </h3>
              <button
                onClick={() => setEditModalUser(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserProfile} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  disabled
                  value={editEmail}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-xs text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">الباقة المستهدفة</label>
                  <select
                    value={editPlan}
                    onChange={e => setEditPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="active">نشط (Active)</option>
                    <option value="expired">منتهي (Expired)</option>
                    <option value="banned">محظور (Banned)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">تاريخ انتهاء الصلاحية المخصص</label>
                <input
                  type="date"
                  value={editExpiresAt}
                  onChange={e => setEditExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  حفظ التعديلات سحابياً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

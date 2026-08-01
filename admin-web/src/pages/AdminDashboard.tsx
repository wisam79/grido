import React, { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Key,
  BarChart3,
  LogOut,
  RefreshCw,
  Search,
  Plus,
  Copy,
  Mail,
  Clock,
  UserCheck,
  Sparkles,
  ChevronLeft,
  Loader2,
  Info,
  CalendarPlus,
  CalendarDays,
  UserMinus,
  Download,
  Eye,
  Calendar,
  X,
  LayoutGrid,
  Wand2,
  DollarSign,
  Activity,
  Cpu
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
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'usage' | 'stats'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [aiUsageLogs, setAiUsageLogs] = useState<AiUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pro' | 'trial' | 'free' | 'expired'>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'expiry'>('newest');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [keySearchQuery, setKeySearchQuery] = useState('');
  const [keyStatusFilter, setKeyStatusFilter] = useState<'all' | 'unused' | 'used' | 'revoked'>('all');

  // Key generator states
  const [genPlan, setGenPlan] = useState<'pro' | 'enterprise'>('pro');
  const [genDuration, setGenDuration] = useState('12');
  const [generatedKey, setGeneratedKey] = useState('');

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
        // Verify token
        client.auth.getUser(savedToken).then(({ data: { user }, error }) => {
          if (!error && user) {
            // Verify user is an enterprise admin
            client.from('profiles').select('plan').eq('id', user.id).single().then(({ data: profileData, error: profErr }) => {
              if (!profErr && profileData && profileData.plan === 'enterprise') {
                setIsAuthenticated(true);
              } else {
                alert('تم رفض استعادة الجلسة: الحساب لا يملك صلاحيات المشرف.');
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

  const loadDashboardData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profiles, error: errProf } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (errProf) throw errProf;
      setUsers(profiles || []);

      // 2. Fetch keys
      const { data: licenseKeys, error: errKeys } = await supabase
        .from('license_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (errKeys) throw errKeys;
      setKeys(licenseKeys || []);

      // 3. Fetch real AI usage logs
      const { data: usageData, error: errUsage } = await supabase
        .from('ai_usage')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(200);

      if (!errUsage && usageData) {
        const profileMap = new Map((profiles || []).map((p: UserProfile) => [p.id, p.email]));
        const mapped: AiUsageRecord[] = usageData.map((item: any) => ({
          ...item,
          user_email: profileMap.get(item.user_id) || item.user_id || 'مستخدم غير معروف'
        }));
        setAiUsageLogs(mapped);
      }

    } catch (err: any) {
      alert('فشل تحديث البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Fetch data on authentication
  useEffect(() => {
    if (isAuthenticated && supabase) {
      loadDashboardData();
    }
  }, [isAuthenticated, supabase, loadDashboardData]);

  const clearSession = () => {
    localStorage.removeItem('grido_sb_url');
    localStorage.removeItem('grido_sb_key');
    localStorage.removeItem('grido_sb_token');
    setSupabase(null);
    setIsAuthenticated(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl || !sbKey || !email || !password) return;

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

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      alert('لا توجد بيانات لتصديرها!');
      return;
    }

    let csvContent = '\uFEFF'; 
    csvContent += 'الاسم,البريد الإلكتروني,الباقة,تاريخ انتهاء الصلاحية,مفتاح التفعيل,تاريخ التسجيل\n';

    filteredUsers.forEach(u => {
      const name = (u.name || 'غير معروف').replace(/,/g, ' ');
      const email = (u.email || '').replace(/,/g, ' ');
      const plan = u.plan.toUpperCase();
      const expires = u.expires_at ? new Date(u.expires_at).toLocaleDateString('ar-SA') : '—';
      const license = u.license_key || '—';
      const created = u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SA') : '—';

      csvContent += `${name},${email},${plan},${expires},${license},${created}\n`;
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

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const duration = parseInt(genDuration, 10);

    try {
      const { data, error } = await supabase
        .rpc('admin_create_license_key', {
          p_plan: genPlan,
          p_duration_months: duration,
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

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      alert('تم نسخ مفتاح الترخيص للحافظة!');
    }
  };

  // Filtering & Sorting
  const filteredUsers = users
    .filter(u => {
      const matchesSearch = 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.license_key && u.license_key.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'pro') {
        matchesStatus = u.plan === 'pro' || u.plan === 'enterprise';
      } else if (statusFilter === 'trial') {
        matchesStatus = u.plan === 'trial';
      } else if (statusFilter === 'free') {
        matchesStatus = u.plan === 'free';
      } else if (statusFilter === 'expired') {
        matchesStatus = u.status === 'expired' || (u.plan === 'trial' && new Date(u.expires_at) <= new Date());
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOption === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOption === 'expiry') {
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      }
      return 0;
    });

  // Filtering & Sorting Keys
  const filteredKeys = keys.filter(k => {
    const matchesSearch = k.key.toLowerCase().includes(keySearchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (keyStatusFilter === 'unused') {
      matchesStatus = k.status === 'unused';
    } else if (keyStatusFilter === 'used') {
      matchesStatus = k.status === 'used';
    } else if (keyStatusFilter === 'revoked') {
      matchesStatus = k.status !== 'unused' && k.status !== 'used';
    }

    return matchesSearch && matchesStatus;
  });

  // Computed stats
  const totalUsers = users.length;
  const activePro = users.filter(u => u.plan === 'pro' || u.plan === 'enterprise').length;
  const activeTrial = users.filter(u => u.plan === 'trial' && new Date(u.expires_at) > new Date()).length;
  const expiredUsers = users.filter(u => u.status === 'expired' || (u.plan === 'trial' && new Date(u.expires_at) <= new Date())).length;

  // Segmented stats
  const proCount = users.filter(u => u.plan === 'pro').length;
  const entCount = users.filter(u => u.plan === 'enterprise').length;
  const trialCount = users.filter(u => u.plan === 'trial').length;
  const freeCount = users.filter(u => u.plan !== 'pro' && u.plan !== 'enterprise' && u.plan !== 'trial').length;

  const totalSegment = totalUsers || 1;
  const proPct = Math.round((proCount / totalSegment) * 100);
  const entPct = Math.round((entCount / totalSegment) * 100);
  const trialPct = Math.round((trialCount / totalSegment) * 100);
  const freePct = Math.round((freeCount / totalSegment) * 100);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-800/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
                لوحة التحكم
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
              التراخيص السحابية
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
              سجل استهلاك الـ AI 📊
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
              إحصائيات الخادم
            </span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono select-none">
          مشروع Supabase نشط سحابياً
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-100">
                {activeTab === 'users' && 'إدارة المشتركين والحسابات'}
                {activeTab === 'keys' && 'إدارة وتوليد مفاتيح الترخيص'}
                {activeTab === 'usage' && 'سجل وتدقيق استهلاك الذكاء الاصطناعي على السيرفر (AI Audit & Cost Log)'}
                {activeTab === 'stats' && 'إحصائيات وقراءات خادم الترخيص'}
              </h2>
              <div className="relative group">
                <Info className="w-4 h-4 text-slate-400 hover:text-slate-400 cursor-pointer" />
                <div className="absolute right-0 top-6 hidden group-hover:block w-72 bg-slate-800 text-white text-[10px] p-2.5 rounded-lg shadow-lg z-50 leading-relaxed text-right font-normal">
                  تقوم هذه اللوحة بالتواصل المباشر والمؤمن مع قاعدة بيانات Supabase سحابياً. يتم التحقق من صحة الجلسة باستخدام بروتوكولات الأمان. التعديل هنا ينعكس فوراً وتلقائياً على أجهزة العملاء المشغلين لتطبيق سطح المكتب دون الحاجة لتحديث البرنامج.
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'users' && 'قائمة بكافة حسابات العملاء المسجلين وصلاحيات تراخيصهم'}
              {activeTab === 'keys' && 'توليد مفاتيح سحابية جديدة للمشتركين واستعراض سجل الأكواد المنشأة'}
              {activeTab === 'stats' && 'قراءات تحليلية لأعداد المستخدمين، الاشتراكات النشطة والتجريبية'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'users' && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-slate-300"
                title="تصدير القائمة الحالية لملف CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV</span>
              </button>
            )}
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>
        </header>

        {/* 🏢 Tabs Content */}

        {/* 1. Tab Users */}
        {activeTab === 'users' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، البريد الإلكتروني أو الترخيص..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 border border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900"
                />
              </div>

              {/* تصفية الاشتراكات */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="py-2 px-3 border border-slate-800 rounded-lg text-xs bg-slate-900 focus:outline-none cursor-pointer text-slate-300 font-semibold"
              >
                <option value="all">كل الاشتراكات</option>
                <option value="pro">باقات PRO / المدفوعة</option>
                <option value="trial">الفترة التجريبية</option>
                <option value="free">الحسابات المجانية</option>
                <option value="expired">منتهية الصلاحية</option>
              </select>

              {/* فرز الترتيب */}
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as any)}
                className="py-2 px-3 border border-slate-800 rounded-lg text-xs bg-slate-900 focus:outline-none cursor-pointer text-slate-300 font-semibold"
              >
                <option value="newest">الأحدث تسجيلاً</option>
                <option value="oldest">الأقدم تسجيلاً</option>
                <option value="expiry">الأقرب انتهاءً</option>
              </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto text-right text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-800/50 text-[10px] text-slate-500 font-bold">
                      <th className="p-3">المشترك</th>
                      <th className="p-3">نوع الباقة</th>
                      <th className="p-3">تاريخ انتهاء الصلاحية</th>
                      <th className="p-3">مفتاح التفعيل</th>
                      <th className="p-3 text-center">العمليات السريعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          لا يوجد أي مشتركين مسجلين حالياً أو مطابقين لبحثك
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-100">{u.name || 'مستخدم غير معروف'}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {u.email}
                            </div>
                          </td>
                          <td className="p-3">
                            {u.plan === 'pro' && (
                              <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full font-bold text-[9px]">PRO احترافي</span>
                            )}
                            {u.plan === 'enterprise' && (
                              <span className="bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 px-2 py-0.5 rounded-full font-bold text-[9px]">Enterprise مؤسسات</span>
                            )}
                            {u.plan === 'trial' && (
                              <span className="bg-amber-950/60 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded-full font-bold text-[9px]">تجريبي (Trial)</span>
                            )}
                            {u.plan !== 'pro' && u.plan !== 'enterprise' && u.plan !== 'trial' && (
<span className="bg-slate-700 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold text-[9px]">مجاني (Free)</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">
                            {u.expires_at ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(u.expires_at).toLocaleDateString('ar-SA')}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3">
                            {u.license_key ? (
                              <code className="bg-slate-800 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] select-all">
                                {u.license_key}
                              </code>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="p-1.5 bg-slate-800/50 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                                title="عرض التفاصيل الكاملة"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExtendLicense(u.id, 1)}
                                className="p-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-400 rounded-lg transition-colors cursor-pointer"
                                title="تمديد +1 شهر"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExtendLicense(u.id, 12)}
                                className="p-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-400 rounded-lg transition-colors cursor-pointer"
                                title="تمديد +1 سنة"
                              >
                                <CalendarDays className="w-3.5 h-3.5" />
                              </button>
                              {(u.plan === 'pro' || u.plan === 'enterprise') && (
                                <button
                                  onClick={() => handleRevokeLicense(u.id)}
                                  className="p-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors cursor-pointer"
                                  title="إلغاء الترخيص وإرجاعه للمجاني"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 2. Tab Keys & Generator */}
        {activeTab === 'keys' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key generator form */}
              <form onSubmit={handleGenerateKey} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-right">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  توليد مفتاح ترخيص Pro جديد
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">نوع الباقة</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGenPlan('pro')}
                      className={`py-2 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
                        genPlan === 'pro' ? 'border-indigo-600 bg-indigo-55 text-indigo-600' : 'border-slate-800 hover:bg-slate-800/50 text-slate-400'
                      }`}
                    >
                      PRO احترافي
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenPlan('enterprise')}
                      className={`py-2 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
                        genPlan === 'enterprise' ? 'border-indigo-600 bg-indigo-55 text-indigo-600' : 'border-slate-800 hover:bg-slate-800/50 text-slate-400'
                      }`}
                    >
                      Enterprise للمؤسسات
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">مدة الصلاحية</label>
                  <select
                    value={genDuration}
                    onChange={e => setGenDuration(e.target.value)}
                    className="w-full py-2 border border-slate-800 rounded-lg text-xs bg-slate-900 px-2 focus:outline-none"
                  >
                    <option value="1">1 شهر (30 يوم)</option>
                    <option value="3">3 أشهر (90 يوم)</option>
                    <option value="6">6 أشهر (180 يوم)</option>
                    <option value="12">1 سنة كاملة (365 يوم)</option>
                    <option value="120">مدى الحياة (LifeTime)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold text-xs border-0 shadow-lg shadow-blue-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>توليد وتخزين المفتاح سحابياً</span>
                </button>
              </form>

              {/* Display generated key */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-center items-center text-center space-y-4">
                <div className="p-3 bg-indigo-950/60 text-indigo-400 rounded-full border border-indigo-800/50">
                  <Key className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">مفتاح الترخيص المولد سحابياً</h4>
                  <p className="text-[10px] text-slate-500 mt-1">انسخ الكود وأرسله للعميل لتفعيل اشتراكه على أي جهاز</p>
                </div>

                {generatedKey ? (
                  <div className="w-full space-y-2.5">
                    <div className="w-full bg-slate-800/50 border border-slate-800 p-3 rounded-lg flex items-center justify-between font-mono font-bold text-sm tracking-wide text-indigo-600 select-all">
                      <span>{generatedKey}</span>
                      <button
                        onClick={handleCopyKey}
                        className="p-1 hover:bg-slate-700 rounded-md text-slate-500 transition-colors cursor-pointer"
                        title="نسخ"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-14 bg-slate-800/30 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-400">
                    سيظهر المفتاح هنا بعد التوليد
                  </div>
                )}
              </div>
            </div>

            {/* List of keys */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <h3 className="text-xs font-bold text-slate-100">سجل مفاتيح التراخيص المولدة</h3>
                
                <div className="flex items-center gap-2">
                  <div className="relative max-w-xs">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن مفتاح..."
                      value={keySearchQuery}
                      onChange={e => setKeySearchQuery(e.target.value)}
                      className="pr-7 pl-3 py-1 border border-slate-800 rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-900 w-40"
                    />
                  </div>

                  <select
                    value={keyStatusFilter}
                    onChange={e => setKeyStatusFilter(e.target.value as any)}
                    className="py-1 px-2 border border-slate-800 rounded-lg text-[10px] bg-slate-900 focus:outline-none cursor-pointer text-slate-400 font-semibold"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="unused">غير مستخدم</option>
                    <option value="used">تم تفعيله</option>
                    <option value="revoked">ملغي</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto text-right text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 border-b border-slate-800/50 text-[10px] text-slate-500 font-bold">
                        <th className="p-3">مفتاح الترخيص</th>
                        <th className="p-3">نوع الباقة</th>
                        <th className="p-3">مدة الصلاحية</th>
                        <th className="p-3">حالة الاستخدام</th>
                        <th className="p-3">تاريخ التوليد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeys.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            لا يوجد أي مفاتيح تراخيص مطابقة للبحث أو الفلترة
                          </td>
                        </tr>
                      ) : (
                        filteredKeys.map(k => (
                          <tr key={k.key} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="p-3">
                              <code className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold select-all">{k.key}</code>
                            </td>
                            <td className="p-3">
                              <span className={`font-bold ${k.plan === 'pro' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                {k.plan.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-400">
                              {k.duration_months === 120 ? 'مدى الحياة' : `${k.duration_months} شهر`}
                            </td>
                            <td className="p-3">
                              {k.status === 'unused' && (
                                <span className="bg-blue-950/60 text-blue-400 px-1.5 py-0.5 rounded-sm font-semibold text-[9px]">غير مستخدم</span>
                              )}
                              {k.status === 'used' && (
                                <span className="bg-emerald-950/60 text-emerald-400 px-1.5 py-0.5 rounded-sm font-semibold text-[9px]">تم تفعيله</span>
                              )}
                              {k.status !== 'unused' && k.status !== 'used' && (
                                <span className="bg-red-950/60 text-red-400 px-1.5 py-0.5 rounded-sm font-semibold text-[9px]">ملغي</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[10px]">
                              {new Date(k.created_at).toLocaleDateString('ar-SA')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 📊 AI Usage Audit Log Tab */}
        {activeTab === 'usage' && (
          <section className="space-y-6">
            {/* Metric Cards (computed from real logs) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/10 border border-violet-500/20 rounded-xl p-4 text-right space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-violet-600 font-bold text-xs">
                  <DollarSign className="w-4 h-4" />
                  <span>إجمالي تكلفة الاستهلاك ($)</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-slate-100">
                  ${aiUsageLogs.reduce((sum, r) => sum + (r.cost_usd || 0), 0).toFixed(6)}
                </div>
                <div className="text-[10px] text-slate-400">من آخر 200 طلب</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-right space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
                  <Activity className="w-4 h-4" />
                  <span>عدد الطلبات المعالجة</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-slate-100">{aiUsageLogs.length} طلب</div>
                <div className="text-[10px] text-slate-400">آخر 200 عملية معالجة</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-right space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                  <Cpu className="w-4 h-4" />
                  <span>متوسط زمن الطلب</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-slate-100">
                  {aiUsageLogs.length > 0
                    ? (aiUsageLogs.reduce((s, r) => s + (r.execution_seconds || 0), 0) / aiUsageLogs.length).toFixed(2)
                    : '0.00'} ثانية
                </div>
                <div className="text-[10px] text-slate-400">متوسط زمن المعالجة</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-right space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                  <UserCheck className="w-4 h-4" />
                  <span>الحسابات المستهلكة</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-slate-100">
                  {new Set(aiUsageLogs.map((r) => r.user_id)).size} حساب
                </div>
                <div className="text-[10px] text-slate-400">مستخدمي الذكاء الاصطناعي</div>
              </div>
            </div>

            {/* Audit Log Table (real data) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-800/30">
                <div>
                  <h3 className="font-extrabold text-xs text-slate-100">سجل تدقيق الطلبات الفعلي (AI Audit Log)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">يتتبع كل طلب معالجة يُنفذ من أي حساب وتكلفته بالسنتات</p>
                </div>
                <button
                  onClick={loadDashboardData}
                  disabled={loading}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold disabled:opacity-50"
                >
                  {loading ? '...جاري' : 'تحديث'}
                </button>
              </div>

              {aiUsageLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">لا توجد سجلات استهلاك بعد.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800/50 border-b border-slate-800/50 text-[10px] font-extrabold text-slate-500 uppercase">
                        <th className="p-3.5">بريد الحساب</th>
                        <th className="p-3.5 text-center">حجم الصورة (بايت)</th>
                        <th className="p-3.5 text-center">الزمن (ثانية)</th>
                        <th className="p-3.5 text-left">التكلفة ($)</th>
                        <th className="p-3.5 text-center">التاريخ والتوقيت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-medium">
                      {aiUsageLogs.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-bold font-mono text-slate-100">{r.user_email}</td>
                          <td className="p-3.5 text-center font-mono text-slate-300">
                            {(r.image_bytes || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-slate-300">
                            {(r.execution_seconds || 0).toFixed(2)}ث
                          </td>
                          <td className="p-3.5 text-left font-mono font-extrabold text-violet-600">
                            ${(r.cost_usd || 0).toFixed(6)}
                          </td>
                          <td className="p-3.5 text-center font-mono text-slate-400 text-[10px]">
                            {r.used_at}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3. Tab Stats */}
        {activeTab === 'stats' && (
          <section className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-right space-y-1.5 shadow-xs">
                <Users className="w-5 h-5 text-indigo-600" />
                <div className="text-[10px] text-slate-500 font-semibold">إجمالي المسجلين</div>
                <div className="text-xl font-bold font-mono text-slate-100">{totalUsers}</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-right space-y-1.5 shadow-xs">
                <UserCheck className="w-5 h-5 text-emerald-500" />
                <div className="text-[10px] text-slate-500 font-semibold">تراخيص Pro مفعّلة</div>
                <div className="text-xl font-bold font-mono text-slate-100">{activePro}</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-right space-y-1.5 shadow-xs">
                <Clock className="w-5 h-5 text-amber-500" />
                <div className="text-[10px] text-slate-500 font-semibold">أعضاء النسخ التجريبية</div>
                <div className="text-xl font-bold font-mono text-slate-100">{activeTrial}</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-right space-y-1.5 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <div className="text-[10px] text-slate-500 font-semibold">اشتراكات منتهية الصلاحية</div>
                <div className="text-xl font-bold font-mono text-slate-100">{expiredUsers}</div>
              </div>
            </div>

            {/* 📊 Visual Breakdown Cards */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-right space-y-5 shadow-xs">
              <div>
                <h3 className="text-xs font-extrabold text-slate-100">توزيع خطط المشتركين ونسب الاشتراك</h3>
                <p className="text-[10px] text-slate-400 mt-1">توزيع نسبي لحسابات العملاء النشطة والتجريبية والمجانية</p>
              </div>

              {/* Progress Segmented Bar */}
              <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex flex-row-reverse">
                <div style={{ width: `${proPct}%` }} className="bg-emerald-500 transition-all" title={`PRO: ${proPct}%`} />
                <div style={{ width: `${entPct}%` }} className="bg-indigo-500 transition-all" title={`Enterprise: ${entPct}%`} />
                <div style={{ width: `${trialPct}%` }} className="bg-amber-500 transition-all" title={`Trial: ${trialPct}%`} />
                <div style={{ width: `${freePct}%` }} className="bg-slate-300 transition-all" title={`Free: ${freePct}%`} />
              </div>

              {/* Labels & Statistics Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 justify-start text-[10px] text-slate-500 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>خطة PRO احترافية</span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-mono pr-4">
                    {proCount} <span className="text-[10px] text-slate-400 font-normal">({proPct}%)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 justify-start text-[10px] text-slate-500 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                    <span>خطة المؤسسات</span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-mono pr-4">
                    {entCount} <span className="text-[10px] text-slate-400 font-normal">({entPct}%)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 justify-start text-[10px] text-slate-500 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span>فترة تجريبية</span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-mono pr-4">
                    {trialCount} <span className="text-[10px] text-slate-400 font-normal">({trialPct}%)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 justify-start text-[10px] text-slate-500 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                    <span>خطة مجانية</span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 font-mono pr-4">
                    {freeCount} <span className="text-[10px] text-slate-400 font-normal">({freePct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* 👤 Subscriber Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" dir="rtl">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-right flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-950/60 text-indigo-400 rounded-lg">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-100">تفاصيل حساب المشترك</h3>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{selectedUser.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Profile Card */}
                <div className="bg-slate-800/50 border border-slate-800/50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[10px]">الاسم الكامل</span>
                    <span className="font-bold text-slate-100 text-sm">{selectedUser.name || 'غير معروف'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[10px]">البريد الإلكتروني</span>
                    <span className="font-mono text-slate-300 select-all">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[10px]">الباقة الحالية</span>
                    <span>
                      {selectedUser.plan === 'pro' && (
                        <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full font-bold text-[9px]">PRO احترافي</span>
                      )}
                      {selectedUser.plan === 'enterprise' && (
                        <span className="bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 px-2 py-0.5 rounded-full font-bold text-[9px]">Enterprise مؤسسات</span>
                      )}
                      {selectedUser.plan === 'trial' && (
                        <span className="bg-amber-950/60 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded-full font-bold text-[9px]">تجريبي (Trial)</span>
                      )}
                      {selectedUser.plan !== 'pro' && selectedUser.plan !== 'enterprise' && selectedUser.plan !== 'trial' && (
                        <span className="bg-slate-800 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full font-bold text-[9px]">مجاني (Free)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* License Card */}
                <div className="border border-slate-800 p-4 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-100 border-b border-slate-800/50 pb-1.5 text-[11px] flex items-center gap-1.5 text-slate-400">
                    <Key className="w-3.5 h-3.5" />
                    بيانات الترخيص والتفعيل
                  </h4>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[10px]">كود الترخيص النشط</span>
                    {selectedUser.license_key ? (
                      <code className="bg-slate-800 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold select-all text-[10px]">
                        {selectedUser.license_key}
                      </code>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[10px]">تاريخ انتهاء الترخيص</span>
                    <span className="font-mono text-slate-300">
                      {selectedUser.expires_at ? new Date(selectedUser.expires_at).toLocaleString('ar-SA') : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[10px]">حالة الترخيص السحابية</span>
                    <span>
                      {selectedUser.status === 'active' ? (
                        <span className="text-emerald-400 font-bold">● نشط ومفعّل</span>
                      ) : selectedUser.status === 'expired' ? (
                        <span className="text-red-400 font-bold">● منتهي الصلاحية</span>
                      ) : (
                        <span className="text-slate-400">● لا يوجد ترخيص</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Metadata Card */}
                <div className="border border-slate-800/50 p-4 rounded-xl space-y-3 bg-slate-800/30">
                  <h4 className="font-bold text-slate-100 border-b border-slate-800/50 pb-1.5 text-[11px] flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    تواريخ النظام
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div>
                      <span className="block text-slate-400 font-bold">تاريخ التسجيل</span>
                      <span className="font-mono text-slate-300 block mt-1">
                        {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('ar-SA') : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold">آخر تحديث للبيانات</span>
                      <span className="font-mono text-slate-300 block mt-1">
                        {selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleString('ar-SA') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-800/50 bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      handleExtendLicense(selectedUser.id, 1);
                      setSelectedUser(null);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold border-0 shadow-sm shadow-blue-500/10 cursor-pointer transition-colors"
                  >
                    تمديد +1 شهر
                  </button>
                  <button
                    onClick={() => {
                      handleExtendLicense(selectedUser.id, 12);
                      setSelectedUser(null);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold border-0 shadow-sm shadow-blue-500/10 cursor-pointer transition-colors"
                  >
                    تمديد +1 سنة
                  </button>
                  {(selectedUser.plan === 'pro' || selectedUser.plan === 'enterprise') && (
                    <button
                      onClick={() => {
                        handleRevokeLicense(selectedUser.id);
                        setSelectedUser(null);
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      إلغاء الترخيص
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800/50 rounded-lg text-[10px] font-bold cursor-pointer transition-colors text-slate-400"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

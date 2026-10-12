import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useFeedback } from '../../components/common/FeedbackProvider';
import { buildUsersCsv, downloadTextFile } from '../../lib/admin-utils';
import type { AiUsageRecord, UserProfile, UserStatusFilter } from './types';

/**
 * useAdminUsers — حالات المستخدمين + جزء المستخدمين من loadDashboardData
 * + handleExtendLicense / handleRevokeLicense / handleOpenEditUser /
 *   handleSaveUserProfile / handleToggleBanUser / handleExportCSV
 * + filteredUsers واشتقاقات الإحصائيات.
 * منطق verbatim من AdminDashboard.tsx — الاستعلامات والفلاتر والأرقام مطابقة للأصل.
 * ملاحظة: كان الملف الأصلي يجلب المستخدمين والمفاتيح وسجل AI في Promise.all واحد؛
 * هنا نجلب جزء المستخدمين + سجل AI (4 استعلامات مطابقة)، وخطاف المفاتيح يجلب
 * جزء المفاتيح (3 استعلامات مطابقة). البيانات المعروضة والأعداد مطابقة.
 */

export function useAdminUsers(supabase: SupabaseClient | null) {
  const { notify, confirmDialog } = useFeedback();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [aiUsageLogs, setAiUsageLogs] = useState<AiUsageRecord[]>([]);
  const [aiRunsTotal, setAiRunsTotal] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');

  // User Edit Modal State
  const [editModalUser, setEditModalUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPlan, setEditPlan] = useState('pro');
  const [editStatus, setEditStatus] = useState('active');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Load Dashboard Data (users part — نفس استعلامات الملف الأصلي)
  const loadUsersData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    try {
      // PostgREST يقصّ أي استجابة عند max_rows (1000 صف) ⇒ نجلب الصفوف للعرض + عدّاً كاملاً للمؤشرات
      const [profilesRes, aiLogsRes, profilesCountRes, aiCountRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_usage').select('*').order('used_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('ai_usage').select('*', { count: 'exact', head: true }),
      ]);

      if (!profilesRes.error && profilesRes.data) setUsers(profilesRes.data as UserProfile[]);
      if (!aiLogsRes.error && aiLogsRes.data) setAiUsageLogs(aiLogsRes.data as AiUsageRecord[]);
      if (!profilesCountRes.error && typeof profilesCountRes.count === 'number')
        setUsersTotal(profilesCountRes.count);
      if (!aiCountRes.error && typeof aiCountRes.count === 'number') setAiRunsTotal(aiCountRes.count);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Operations
  const handleExtendLicense = async (userUUID: string, months: number) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc('admin_extend_license', {
        p_user_id: userUUID,
        p_additional_months: months,
      });

      if (error) throw error;
      notify(`تم تمديد صلاحية الحساب بمقدار ${months} شهر بنجاح.`, 'success');
      loadUsersData();
    } catch (err) {
      notify('فشلت عملية التمديد: ' + (err as Error).message, 'error');
    }
  };

  const handleRevokeLicense = async (userUUID: string) => {
    if (!supabase) return;
    if (
      await confirmDialog(
        'هل أنت متأكد من سحب ترخيص هذا الحساب؟ سيعود فوراً للباقة المجانية.',
        { confirmLabel: 'سحب الترخيص', danger: true },
      )
    ) {
      try {
        const { error } = await supabase.rpc('admin_revoke_license', {
          p_user_id: userUUID,
        });

        if (error) throw error;
        notify('تم إلغاء الترخيص بنجاح.', 'success');
        loadUsersData();
      } catch (err) {
        notify('فشل سحب الترخيص: ' + (err as Error).message, 'error');
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
  const handleSaveUserProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !editModalUser) return;
    setSavingUser(true);

    try {
      const patchObj: Record<string, string> = {
        name: editName,
        plan: editPlan,
        status: editStatus,
        updated_at: new Date().toISOString(),
      };
      if (editExpiresAt) {
        patchObj.expires_at = new Date(editExpiresAt).toISOString();
      }

      const { error } = await supabase.from('profiles').update(patchObj).eq('id', editModalUser.id);

      if (error) throw error;
      notify('تم تحديث بيانات الاشتراك والحساب بنجاح!', 'success');
      setEditModalUser(null);
      loadUsersData();
    } catch (err) {
      notify('فشل تحديث بيانات المستخدم: ' + (err as Error).message, 'error');
    } finally {
      setSavingUser(false);
    }
  };

  // Ban / Unban User Toggle
  const handleToggleBanUser = async (user: UserProfile) => {
    if (!supabase) return;
    const isBanned = user.status === 'banned';
    const actionText = isBanned ? 'إلغاء حظر' : 'حظر';
    if (
      !(await confirmDialog(`هل أنت متأكد من ${actionText} الحساب ${user.email}؟`, {
        confirmLabel: actionText,
        danger: !isBanned,
      }))
    )
      return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: isBanned ? 'active' : 'banned', updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      notify(`تم ${actionText} المستخدم بنجاح.`, 'success');
      loadUsersData();
    } catch (err) {
      notify('فشل إجراء الحظر: ' + (err as Error).message, 'error');
    }
  };

  // Filtering & Sorting Users (verbatim)
  const filteredUsers = users
    .filter((user) => {
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
      if (statusFilter === 'free')
        return user.plan !== 'pro' && user.plan !== 'enterprise' && user.plan !== 'trial';
      if (statusFilter === 'expired') {
        const isExpiredDate = user.expires_at && new Date(user.expires_at) <= new Date();
        return user.status === 'expired' || isExpiredDate;
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      notify('لا توجد بيانات لتصديرها!', 'warning');
      return;
    }

    // بناء CSV (تحصين Formula Injection) وتنزيله — المنطق مُختبر في admin-utils
    downloadTextFile(
      `grido_users_${new Date().toISOString().split('T')[0]}.csv`,
      buildUsersCsv(filteredUsers),
      'text/csv;charset=utf-8;',
    );
  };

  // Dashboard Overview Metrics — جزء المستخدمين (الأعداد الكلية من العدّ الخادمي)
  const totalUsers = usersTotal || users.length;
  const sampleTruncated = users.length < totalUsers;
  const activePro = users.filter(
    (u) =>
      u.plan === 'pro' &&
      u.status !== 'banned' &&
      (!u.expires_at || new Date(u.expires_at) > new Date()),
  ).length;
  const activeEnt = users.filter((u) => u.plan === 'enterprise' && u.status !== 'banned').length;
  const totalAiRuns = aiRunsTotal || aiUsageLogs.length;
  const windowAiCost = aiUsageLogs.reduce((acc, curr) => acc + (curr.cost_usd || 0.012), 0);
  const estimatedMRR = activePro * 15 + activeEnt * 49;

  // Segmented stats
  const proCount = users.filter((u) => u.plan === 'pro').length;
  const entCount = users.filter((u) => u.plan === 'enterprise').length;
  const freeCount = users.filter(
    (u) => u.plan !== 'pro' && u.plan !== 'enterprise' && u.plan !== 'trial',
  ).length;

  const totalSegment = totalUsers || 1;
  const proPct = Math.round((proCount / totalSegment) * 100);
  const entPct = Math.round((entCount / totalSegment) * 100);

  return {
    users,
    usersTotal,
    aiUsageLogs,
    aiRunsTotal,
    loading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    editModalUser,
    setEditModalUser,
    editName,
    setEditName,
    editEmail,
    setEditEmail,
    editPlan,
    setEditPlan,
    editStatus,
    setEditStatus,
    editExpiresAt,
    setEditExpiresAt,
    savingUser,
    loadUsersData,
    handleExtendLicense,
    handleRevokeLicense,
    handleOpenEditUser,
    handleSaveUserProfile,
    handleToggleBanUser,
    handleExportCSV,
    filteredUsers,
    totalUsers,
    sampleTruncated,
    activePro,
    activeEnt,
    totalAiRuns,
    windowAiCost,
    estimatedMRR,
    proCount,
    entCount,
    freeCount,
    proPct,
    entPct,
  };
}

export type AdminUsers = ReturnType<typeof useAdminUsers>;

import { useCallback, useRef, useState } from 'react';
import { useAdminOperationOwnership } from './useAdminOperationOwnership';
import type { AdminSessionOwnerRef } from './useAdminOperationOwnership';
import type { FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useFeedback } from '../../components/common/FeedbackProvider';
import {
  buildUsersCsv,
  computeAdminUserMetrics,
  downloadTextFile,
  fetchAllPaged,
  resolveExpiresAtInput,
} from '../../lib/admin-utils';
import type { AiUsageRecord, UserProfile, UserStatusFilter } from './types';

/**
 * useAdminUsers — حالات المستخدمين + جلب مقسّم بالصفحات + معالجة الأخطاء +
 * التعديل/الحظر/التمديد/السحب + تصدير CSV + الإحصائيات المتسقة.
 */

export function useAdminUsers(
  supabase: SupabaseClient | null,
  sessionOwnerRef: AdminSessionOwnerRef,
) {
  const { notify, confirmDialog } = useFeedback();
  const { captureOwner, invalidateOwnership } = useAdminOperationOwnership(supabase, sessionOwnerRef);
  const saveReqIdRef = useRef(0);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [aiUsageLogs, setAiUsageLogs] = useState<AiUsageRecord[]>([]);
  const [aiRunsTotal, setAiRunsTotal] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [serverSampleTruncated, setServerSampleTruncated] = useState(false);
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

  const fetchReqIdRef = useRef(0);

  const resetUsersData = useCallback(() => {
    invalidateOwnership();
    saveReqIdRef.current += 1;
    fetchReqIdRef.current += 1;
    setUsers([]);
    setAiUsageLogs([]);
    setAiRunsTotal(0);
    setUsersTotal(0);
    setServerSampleTruncated(false);
    setLoading(false);
    setSearchQuery('');
    setStatusFilter('all');
    setEditModalUser(null);
    setEditName('');
    setEditEmail('');
    setEditPlan('pro');
    setEditStatus('active');
    setEditExpiresAt('');
    setSavingUser(false);
  }, [invalidateOwnership]);

  // Load Dashboard Data (paginated to prevent PostgREST 1000-row silent truncation)
  const loadUsersData = useCallback(async () => {
    const ownsOperation = captureOwner();
    if (!supabase || !ownsOperation()) return;
    const reqId = ++fetchReqIdRef.current;
    const ownsFetch = () => ownsOperation() && reqId === fetchReqIdRef.current;
    setLoading(true);

    try {
      const [profilesRes, aiLogsRes, profilesCountRes, aiCountRes] = await Promise.all([
        fetchAllPaged<UserProfile>((from, to) =>
          !ownsFetch() ? Promise.resolve({ data: [], error: null }) : supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to),
        ),
        supabase.from('ai_usage').select('*').order('used_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('ai_usage').select('*', { count: 'exact', head: true }),
      ]);

      if (!ownsFetch()) return;

      const errors: string[] = [];
      if (profilesRes.error) {
        errors.push(profilesRes.error.message || 'profiles');
      } else {
        setUsers(profilesRes.data);
        setServerSampleTruncated(profilesRes.truncated);
      }

      if (aiLogsRes.error) {
        errors.push(aiLogsRes.error.message || 'ai_usage');
      } else if (aiLogsRes.data) {
        setAiUsageLogs(aiLogsRes.data as AiUsageRecord[]);
      }

      if (profilesCountRes.error) {
        errors.push(profilesCountRes.error.message || 'profiles_count');
      } else if (typeof profilesCountRes.count === 'number') {
        setUsersTotal(profilesCountRes.count);
      }

      if (aiCountRes.error) {
        errors.push(aiCountRes.error.message || 'ai_usage_count');
      } else if (typeof aiCountRes.count === 'number') {
        setAiRunsTotal(aiCountRes.count);
      }

      if (errors.length > 0) {
        console.error('Supabase dashboard query errors:', errors);
        notify(`تعذر تحميل بعض بيانات المستخدمين: ${errors[0]}`, 'error');
      }
    } catch (err) {
      if (!ownsFetch()) return;
      console.error('Error fetching dashboard data:', err);
      notify(
        'تعذر تحميل بيانات المستخدمين: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'),
        'error',
      );
    } finally {
      if (ownsFetch()) {
        setLoading(false);
      }
    }
  }, [supabase, notify, captureOwner]);

  // Operations — capture before confirmation and keep fetch refreshes independent.
  const handleExtendLicense = async (userUUID: string, months: number) => {
    const ownsOperation = captureOwner();
    if (!supabase || !ownsOperation()) return;
    try {
      const { error } = await supabase.rpc('admin_extend_license', {
        p_user_id: userUUID,
        p_additional_months: months,
      });

      if (!ownsOperation()) return;
      if (error) throw error;
      notify(`تم تمديد صلاحية الحساب بمقدار ${months} شهر بنجاح.`, 'success');
      if (ownsOperation()) await loadUsersData();
    } catch (err) {
      if (!ownsOperation()) return;
      notify('فشلت عملية التمديد: ' + (err as Error).message, 'error');
    }
  };

  const handleRevokeLicense = async (userUUID: string) => {
    const ownsOperation = captureOwner();
    if (!supabase || !ownsOperation()) return;
    try {
      const confirmed = await confirmDialog(
        'هل أنت متأكد من سحب ترخيص هذا الحساب؟ سيعود فوراً للباقة المجانية.',
        { confirmLabel: 'سحب الترخيص', danger: true },
      );
      if (!ownsOperation() || !confirmed) return;
      const { error } = await supabase.rpc('admin_revoke_license', {
        p_user_id: userUUID,
      });

      if (!ownsOperation()) return;
      if (error) throw error;
      notify('تم إلغاء الترخيص بنجاح.', 'success');
      if (ownsOperation()) await loadUsersData();
    } catch (err) {
      if (!ownsOperation()) return;
      notify('فشل سحب الترخيص: ' + (err as Error).message, 'error');
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: UserProfile) => {
    if (!captureOwner()()) return;
    setEditModalUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPlan(user.plan || 'free');
    setEditStatus(user.status || 'active');
    const resolvedDate = resolveExpiresAtInput(user.expires_at || '');
    setEditExpiresAt(resolvedDate.valid && resolvedDate.value ? resolvedDate.value.split('T')[0] : '');
  };

  // Save User Edit Modal
  const handleSaveUserProfile = async (e: FormEvent) => {
    e.preventDefault();
    const ownsOperation = captureOwner();
    if (!supabase || !editModalUser || !ownsOperation()) return;

    const expiresResolution = resolveExpiresAtInput(editExpiresAt);
    if (!expiresResolution.valid) {
      notify('تاريخ انتهاء الصلاحية غير صالح.', 'error');
      return;
    }

    const saveReqId = ++saveReqIdRef.current;
    const ownsSave = () => ownsOperation() && saveReqId === saveReqIdRef.current;
    setSavingUser(true);
    try {
      const patchObj: Record<string, string | null> = {
        name: editName,
        plan: editPlan,
        status: editStatus,
        expires_at: expiresResolution.value,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').update(patchObj).eq('id', editModalUser.id);

      if (!ownsSave()) return;
      if (error) throw error;
      notify('تم تحديث بيانات الاشتراك والحساب بنجاح!', 'success');
      if (!ownsSave()) return;
      setEditModalUser(null);
      if (ownsSave()) await loadUsersData();
    } catch (err) {
      if (!ownsSave()) return;
      notify('فشل تحديث بيانات المستخدم: ' + (err as Error).message, 'error');
    } finally {
      if (ownsSave()) setSavingUser(false);
    }
  };

  // Ban / Unban User Toggle
  const handleToggleBanUser = async (user: UserProfile) => {
    const ownsOperation = captureOwner();
    if (!supabase || !ownsOperation()) return;
    const isBanned = user.status === 'banned';
    const actionText = isBanned ? 'إلغاء حظر' : 'حظر';
    try {
      const confirmed = await confirmDialog(`هل أنت متأكد من ${actionText} الحساب ${user.email}؟`, {
        confirmLabel: actionText,
        danger: !isBanned,
      });
      if (!ownsOperation() || !confirmed) return;
      const { error } = await supabase
        .from('profiles')
        .update({ status: isBanned ? 'active' : 'banned', updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (!ownsOperation()) return;
      if (error) throw error;
      notify(`تم ${actionText} المستخدم بنجاح.`, 'success');
      if (ownsOperation()) await loadUsersData();
    } catch (err) {
      if (!ownsOperation()) return;
      notify('فشل إجراء الحظر: ' + (err as Error).message, 'error');
    }
  };

  // Filtering & Sorting Users
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

    downloadTextFile(
      `grido_users_${new Date().toISOString().split('T')[0]}.csv`,
      buildUsersCsv(filteredUsers),
      'text/csv;charset=utf-8;',
    );
  };

  // Dashboard Overview Metrics — حساب موحد من Admin Utils بمقام متسق مع العينة وتكلفة تحفظ الصفر
  const {
    totalUsers,
    sampleTruncated,
    activePro,
    activeEnt,
    windowAiCost,
    estimatedMRR,
    proCount,
    entCount,
    freeCount,
    proPct,
    entPct,
    freePct,
  } = computeAdminUserMetrics(users, usersTotal, aiUsageLogs, serverSampleTruncated);
  const totalAiRuns = aiRunsTotal || aiUsageLogs.length;

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
    resetUsersData,
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
    freePct,
  };
}

export type AdminUsers = ReturnType<typeof useAdminUsers>;

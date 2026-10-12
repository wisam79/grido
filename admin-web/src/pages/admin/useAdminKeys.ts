import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useFeedback } from '../../components/common/FeedbackProvider';
import {
  buildBatchKeysCsv,
  buildCustomKey,
  downloadTextFile,
  randomKeySuffix,
} from '../../lib/admin-utils';
import type { GenMode, GenPlan, KeyStatusFilter, LicenseKey } from './types';

/**
 * useAdminKeys — حالات المفاتيح + توليد مفرد/مجمّع + تصدير + نسخ + فلاتر المفاتيح.
 * منطق verbatim من AdminDashboard.tsx — نفس استعلامات license_keys ونفس منطق التوليد.
 * ملاحظة: تصدير CSV للمستخدمين يعيش في useAdminUsers (handleExportCSV) لأنه
 * يعمل على filteredUsers؛ هنا تصدير الدفعة (handleExportBatch) ونسخ المفتاح.
 */

export function useAdminKeys(supabase: SupabaseClient | null) {
  const { notify } = useFeedback();

  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [keysTotal, setKeysTotal] = useState(0);
  const [unusedKeysTotal, setUnusedKeysTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keySearchQuery, setKeySearchQuery] = useState('');
  const [keyStatusFilter, setKeyStatusFilter] = useState<KeyStatusFilter>('all');

  // Key generator states (Single & Batch)
  const [genMode, setGenMode] = useState<GenMode>('single');
  const [genPlan, setGenPlan] = useState<GenPlan>('pro');
  const [genDuration, setGenDuration] = useState('12');
  const [genCount, setGenCount] = useState('5');
  const [genPrefix, setGenPrefix] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [generatedBatchKeys, setGeneratedBatchKeys] = useState<string[]>([]);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // Load Dashboard Data (keys part — نفس استعلامات الملف الأصلي)
  const loadKeysData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    try {
      const [keysRes, unusedKeysRes, keysCountRes] = await Promise.all([
        supabase.from('license_keys').select('*').order('created_at', { ascending: false }),
        supabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('status', 'unused'),
        supabase.from('license_keys').select('*', { count: 'exact', head: true }),
      ]);

      if (!keysRes.error && keysRes.data) setKeys(keysRes.data as LicenseKey[]);
      if (!keysCountRes.error && typeof keysCountRes.count === 'number')
        setKeysTotal(keysCountRes.count);
      if (!unusedKeysRes.error && typeof unusedKeysRes.count === 'number')
        setUnusedKeysTotal(unusedKeysRes.count);
    } catch (err) {
      console.error('Error fetching keys data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Generate Single License Key
  const handleGenerateKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const duration = parseInt(genDuration, 10);
    const customKey = buildCustomKey(genPrefix, genPlan, randomKeySuffix());

    try {
      const { data, error } = await supabase.rpc('admin_create_license_key', {
        p_plan: genPlan,
        p_duration_months: duration,
        p_custom_key: customKey,
      });

      if (error) throw error;
      const keyVal =
        typeof data === 'object' && data !== null && 'key' in data
          ? (data as { key: string }).key
          : (data as string);
      setGeneratedKey(keyVal);
      notify('تم توليد مفتاح ترخيص وإدراجه سحابياً بنجاح!', 'success');
      loadKeysData();
    } catch (err) {
      notify('فشل توليد المفتاح سحابياً: ' + (err as Error).message, 'error');
    }
  };

  // Generate Batch License Keys
  const handleGenerateBatchKeys = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setGeneratingBatch(true);
    setGeneratedBatchKeys([]);

    const duration = parseInt(genDuration, 10);
    const count = Math.min(50, Math.max(1, parseInt(genCount, 10)));
    const batchList: string[] = [];
    let failedCount = 0;
    let firstError = '';

    try {
      for (let i = 0; i < count; i++) {
        const customPrefix = genPrefix
          ? `${genPrefix.trim().toUpperCase()}-${genPlan.toUpperCase()}-${i + 1}`
          : undefined;
        const { data, error } = await supabase.rpc('admin_create_license_key', {
          p_plan: genPlan,
          p_duration_months: duration,
          p_custom_key: customPrefix,
        });

        if (!error && data) {
          const k =
            typeof data === 'object' && 'key' in data ? (data as { key: string }).key : (data as string);
          batchList.push(k);
        } else {
          failedCount += 1;
          if (!firstError) firstError = error?.message || 'استجابة غير صالحة من الخادم';
        }
      }

      setGeneratedBatchKeys(batchList);
      if (batchList.length === 0) {
        notify(`فشل توليد الدفعة بالكامل: ${firstError || 'خطأ غير معروف'}`, 'error');
      } else if (failedCount > 0) {
        notify(
          `تم توليد ${batchList.length} من ${count} مفتاحاً، وفشل ${failedCount}. أول خطأ: ${firstError}`,
          'warning',
        );
      } else {
        notify(`تم توليد دفعة مكونة من ${batchList.length} مفاتيح سحابية بنجاح!`, 'success');
      }
      loadKeysData();
    } catch (err) {
      notify('فشل توليد الدفعة: ' + (err as Error).message, 'error');
    } finally {
      setGeneratingBatch(false);
    }
  };

  // Export Batch Keys
  const handleExportBatch = (format: 'txt' | 'csv') => {
    if (generatedBatchKeys.length === 0) return;
    const content =
      format === 'csv'
        ? buildBatchKeysCsv(generatedBatchKeys, genPlan)
        : generatedBatchKeys.join('\n');
    downloadTextFile(
      `grido_batch_keys_${genPlan}_${new Date().toISOString().split('T')[0]}.${format}`,
      content,
      format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;',
    );
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      notify('تم نسخ مفتاح الترخيص للحافظة!', 'success');
    }
  };

  // Filtering Keys (verbatim)
  const filteredKeys = keys.filter((key) => {
    const matchesSearch =
      (key.key || '').toLowerCase().includes(keySearchQuery.toLowerCase()) ||
      (key.user_id || '').toLowerCase().includes(keySearchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (keyStatusFilter === 'all') return true;
    return key.status === keyStatusFilter;
  });

  // Dashboard Overview Metrics — جزء المفاتيح
  const totalKeys = keysTotal || keys.length;
  const unusedKeys = unusedKeysTotal || keys.filter((k) => k.status === 'unused').length;

  return {
    keys,
    keysTotal,
    unusedKeysTotal,
    loading,
    keySearchQuery,
    setKeySearchQuery,
    keyStatusFilter,
    setKeyStatusFilter,
    genMode,
    setGenMode,
    genPlan,
    setGenPlan,
    genDuration,
    setGenDuration,
    genCount,
    setGenCount,
    genPrefix,
    setGenPrefix,
    generatedKey,
    generatedBatchKeys,
    generatingBatch,
    loadKeysData,
    handleGenerateKey,
    handleGenerateBatchKeys,
    handleExportBatch,
    handleCopyKey,
    filteredKeys,
    totalKeys,
    unusedKeys,
  };
}

export type AdminKeys = ReturnType<typeof useAdminKeys>;

import { useCallback, useRef, useState } from 'react';
import { useAdminOperationOwnership } from './useAdminOperationOwnership';
import type { AdminSessionOwnerRef } from './useAdminOperationOwnership';
import type { FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useFeedback } from '../../components/common/FeedbackProvider';
import {
  buildBatchCustomKey,
  buildBatchKeysCsv,
  buildCustomKey,
  downloadTextFile,
  fetchAllPaged,
  filterLicenseKeys,
  parsePositiveInt,
  randomKeySuffix,
} from '../../lib/admin-utils';
import type { GenMode, GenPlan, KeyStatusFilter, LicenseKey, UserProfile } from './types';

/**
 * useAdminKeys — حالات المفاتيح + جلب مقسّم بالصفحات + معالجة أخطاء Supabase +
 * توليد مفرد/مجمّع آمن ضد NaN والتصادم + نسخ محروس بالحافظة.
 */

export function useAdminKeys(
  supabase: SupabaseClient | null,
  sessionOwnerRef: AdminSessionOwnerRef,
  usersLookup: Record<string, UserProfile> = {},
) {
  const { notify } = useFeedback();
  const { captureOwner, invalidateOwnership } = useAdminOperationOwnership(supabase, sessionOwnerRef);
  const batchReqIdRef = useRef(0);

  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [keysTotal, setKeysTotal] = useState(0);
  const [unusedKeysTotal, setUnusedKeysTotal] = useState<number | null>(null);
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

  const fetchReqIdRef = useRef(0);

  const resetKeysData = useCallback(() => {
    invalidateOwnership();
    batchReqIdRef.current += 1;
    fetchReqIdRef.current += 1;
    setKeys([]);
    setKeysTotal(0);
    setUnusedKeysTotal(null);
    setLoading(false);
    setKeySearchQuery('');
    setKeyStatusFilter('all');
    setGeneratedKey('');
    setGeneratedBatchKeys([]);
    setGeneratingBatch(false);
  }, [invalidateOwnership]);

  // Load Dashboard Data (paginated to prevent PostgREST 1000-row silent truncation)
  const loadKeysData = useCallback(async (): Promise<boolean> => {
    const ownsOperation = captureOwner();
    if (!supabase || !ownsOperation()) return false;
    const reqId = ++fetchReqIdRef.current;
    const ownsFetch = () => ownsOperation() && reqId === fetchReqIdRef.current;
    setLoading(true);

    try {
      const [keysRes, unusedKeysRes, keysCountRes] = await Promise.all([
        fetchAllPaged<LicenseKey>((from, to) =>
          !ownsFetch() ? Promise.resolve({ data: [], error: null }) : supabase
            .from('license_keys')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to),
        ),
        supabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('status', 'unused'),
        supabase.from('license_keys').select('*', { count: 'exact', head: true }),
      ]);

      if (!ownsFetch()) return false;

      const errors: string[] = [];
      if (keysRes.error) {
        errors.push(keysRes.error.message || 'license_keys');
      } else {
        setKeys(keysRes.data);
      }

      if (keysCountRes.error) {
        errors.push(keysCountRes.error.message || 'license_keys_count');
      } else if (typeof keysCountRes.count === 'number') {
        setKeysTotal(keysCountRes.count);
      }

      if (unusedKeysRes.error) {
        errors.push(unusedKeysRes.error.message || 'unused_keys_count');
      } else if (typeof unusedKeysRes.count === 'number') {
        setUnusedKeysTotal(unusedKeysRes.count);
      }

      if (errors.length > 0) {
        console.error('Error fetching keys data:', errors);
        notify(`تعذر تحميل مفاتيح التراخيص: ${errors[0]}`, 'error');
        return false;
      }
      return true;
    } catch (err) {
      if (!ownsFetch()) return false;
      console.error('Error fetching keys data:', err);
      notify(
        'تعذر تحميل مفاتيح التراخيص: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'),
        'error',
      );
      return false;
    } finally {
      if (ownsFetch()) {
        setLoading(false);
      }
    }
  }, [supabase, notify, captureOwner]);

  // Generate Single License Key
  const handleGenerateKey = async (e: FormEvent) => {
    e.preventDefault();
    const ownsOperation = captureOwner();
    if (!supabase || !ownsOperation()) return;

    const duration = parsePositiveInt(genDuration);
    if (!duration) {
      notify('يرجى تحديد مدة صالحة بالأشهر.', 'warning');
      return;
    }

    const customKey = buildCustomKey(genPrefix, genPlan, randomKeySuffix());

    try {
      const { data, error } = await supabase.rpc('admin_create_license_key', {
        p_plan: genPlan,
        p_duration_months: duration,
        p_custom_key: customKey,
      });

      if (!ownsOperation()) return;
      if (error) throw error;
      const keyVal =
        typeof data === 'object' && data !== null && 'key' in data
          ? (data as { key: string }).key
          : (data as string);
      setGeneratedKey(keyVal);
      if (!ownsOperation()) return;
      notify('تم توليد مفتاح ترخيص وإدراجه سحابياً بنجاح!', 'success');
      if (ownsOperation()) await loadKeysData();
    } catch (err) {
      if (!ownsOperation()) return;
      notify('فشل توليد المفتاح سحابياً: ' + (err as Error).message, 'error');
    }
  };

  // Generate Batch License Keys
  const handleGenerateBatchKeys = async (e: FormEvent) => {
    e.preventDefault();
    const ownsOperation = captureOwner();
    if (!supabase || !ownsOperation()) return;

    const duration = parsePositiveInt(genDuration);
    if (!duration) {
      notify('يرجى تحديد مدة صالحة بالأشهر.', 'warning');
      return;
    }

    const parsedCount = parsePositiveInt(genCount);
    if (!parsedCount) {
      notify('يرجى إدخال عدد مفاتيح صالح بين 1 و 50.', 'warning');
      return;
    }

    const batchReqId = ++batchReqIdRef.current;
    const ownsBatch = () => ownsOperation() && batchReqId === batchReqIdRef.current;
    setGeneratingBatch(true);
    setGeneratedBatchKeys([]);

    const count = Math.min(50, parsedCount);
    const batchList: string[] = [];
    const seenCustomKeys = new Set<string>();
    let failedCount = 0;
    let firstError = '';

    try {
      for (let i = 0; i < count; i++) {
        if (!ownsBatch()) return;
        let customPrefix = buildBatchCustomKey(genPrefix, genPlan, i);
        while (customPrefix && seenCustomKeys.has(customPrefix)) {
          customPrefix = buildBatchCustomKey(genPrefix, genPlan, i);
        }
        if (customPrefix) seenCustomKeys.add(customPrefix);

        const { data, error } = await supabase.rpc('admin_create_license_key', {
          p_plan: genPlan,
          p_duration_months: duration,
          p_custom_key: customPrefix,
        });

        if (!ownsBatch()) return;
        if (!error && data) {
          const k =
            typeof data === 'object' && 'key' in data ? (data as { key: string }).key : (data as string);
          batchList.push(k);
        } else {
          failedCount += 1;
          if (!firstError) firstError = error?.message || 'استجابة غير صالحة من الخادم';
        }
      }

      if (!ownsBatch()) return;
      setGeneratedBatchKeys(batchList);
      if (!ownsBatch()) return;
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
      if (ownsBatch()) await loadKeysData();
    } catch (err) {
      if (!ownsBatch()) return;
      notify('فشل توليد الدفعة: ' + (err as Error).message, 'error');
    } finally {
      if (ownsBatch()) setGeneratingBatch(false);
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

  const handleCopyKey = async () => {
    const ownsOperation = captureOwner();
    if (!generatedKey || !ownsOperation()) return;
    if (!navigator.clipboard?.writeText) {
      notify('النسخ التلقائي غير مدعوم في هذا المتصفح، يرجى النسخ يدوياً.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedKey);
      if (!ownsOperation()) return;
      notify('تم نسخ مفتاح الترخيص للحافظة!', 'success');
    } catch {
      if (!ownsOperation()) return;
      notify('تعذر نسخ مفتاح الترخيص للحافظة، يرجى النسخ يدوياً.', 'error');
    }
  };

  // Filtering Keys
  const filteredKeys = filterLicenseKeys(keys, keySearchQuery, keyStatusFilter, usersLookup);

  // Dashboard Overview Metrics — جزء المفاتيح
  const totalKeys = keysTotal || keys.length;
  const unusedKeys =
    unusedKeysTotal !== null ? unusedKeysTotal : keys.filter((k) => k.status === 'unused').length;

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
    resetKeysData,
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

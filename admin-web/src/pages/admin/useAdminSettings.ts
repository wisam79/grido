import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useFeedback } from '../../components/common/FeedbackProvider';
import { parseStoredLimit } from '../../lib/admin-utils';

/**
 * useAdminSettings — حالات الإعدادات/التنبيه/الصيانة + handleSaveSettings.
 * مستخرج verbatim من AdminDashboard.tsx (سطور ~124-130، ~183-192، ~494-510).
 * الحفظ محلي في المتصفح فقط — لا يُدفع إلى الخادم (نفس السلوك الأصلي).
 */

export function useAdminSettings() {
  const { notify } = useFeedback();

  const [freeAiLimit, setFreeAiLimit] = useState(5);
  const [proAiLimit, setProAiLimit] = useState(15);
  const [enterpriseAiLimit, setEnterpriseAiLimit] = useState(50);
  const [systemNotice, setSystemNotice] = useState(
    'أهلاً بك في استوديو Grido — يتم استعادة الجلسة والخدمات السحابية تلقائياً.',
  );
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // تحميل التفضيلات المحفوظة محلياً (مسودة المتصفح)
  useEffect(() => {
    const savedNotice = localStorage.getItem('grido_sys_notice');
    if (savedNotice) setSystemNotice(savedNotice);
    const savedMaint = localStorage.getItem('grido_sys_maint');
    if (savedMaint) setMaintenanceMode(savedMaint === 'true');
    setFreeAiLimit(parseStoredLimit(localStorage.getItem('grido_free_ai_limit'), 5));
    setProAiLimit(parseStoredLimit(localStorage.getItem('grido_pro_ai_limit'), 15));
    setEnterpriseAiLimit(parseStoredLimit(localStorage.getItem('grido_ent_ai_limit'), 50));
  }, []);

  // Save System Settings
  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      localStorage.setItem('grido_sys_notice', systemNotice);
      localStorage.setItem('grido_sys_maint', maintenanceMode.toString());
      localStorage.setItem('grido_free_ai_limit', freeAiLimit.toString());
      localStorage.setItem('grido_pro_ai_limit', proAiLimit.toString());
      localStorage.setItem('grido_ent_ai_limit', enterpriseAiLimit.toString());
      notify('تم حفظ الإعدادات محلياً في هذا المتصفح (لا تُدفع إلى الخادم).', 'success');
    } catch {
      notify('حدث خطأ أثناء حفظ الإعدادات.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return {
    freeAiLimit,
    setFreeAiLimit,
    proAiLimit,
    setProAiLimit,
    enterpriseAiLimit,
    setEnterpriseAiLimit,
    systemNotice,
    setSystemNotice,
    maintenanceMode,
    setMaintenanceMode,
    savingSettings,
    handleSaveSettings,
  };
}

export type AdminSettings = ReturnType<typeof useAdminSettings>;

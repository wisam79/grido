import { useId, type FormEvent } from 'react';
import { AlertTriangle, Loader2, Settings, Sliders, Zap } from 'lucide-react';

/**
 * SettingsForm — تبويب الإعدادات المحلية (مسودة المتصفح) بهوية Grido المكتبية (Fluent 2).
 */

interface SettingsFormProps {
  freeAiLimit: number;
  proAiLimit: number;
  enterpriseAiLimit: number;
  systemNotice: string;
  maintenanceMode: boolean;
  savingSettings: boolean;
  onFreeLimitChange: (v: number) => void;
  onProLimitChange: (v: number) => void;
  onEnterpriseLimitChange: (v: number) => void;
  onNoticeChange: (v: string) => void;
  onMaintenanceToggle: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function SettingsForm({
  freeAiLimit,
  proAiLimit,
  enterpriseAiLimit,
  systemNotice,
  maintenanceMode,
  savingSettings,
  onFreeLimitChange,
  onProLimitChange,
  onEnterpriseLimitChange,
  onNoticeChange,
  onMaintenanceToggle,
  onSubmit,
}: SettingsFormProps) {
  const id = useId();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pe-0.5">
      <div className="admin-card p-5 space-y-5 max-w-3xl">
      <div className="border-b border-[#333333]/75 pb-3.5">
        <h2 className="text-sm font-semibold text-[#f5f5f5] flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#3b82f6]" aria-hidden="true" />
          تخصيص وإعدادات محلية (مسودة المتصفح)
        </h2>
        <p className="text-xs text-[#a9afaf] mt-1">
          تفضيلات محلية في هذا المتصفح فقط — الحصص الفعلية تُفرض خادمياً عبر قاعدة البيانات
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-[6px] text-xs text-amber-200 leading-relaxed">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
        <span>
          هذه الإعدادات تُحفظ في متصفحك فقط ولا تصل إلى Supabase أو التطبيق — الحدود الفعلية للذكاء
          الاصطناعي خادمية (free ≤ 5، pro ≤ 15، enterprise ≤ 50 طلب/يوم).
        </span>
      </div>

      <form onSubmit={onSubmit} className="divide-y divide-[#333333]/75">
        {/* AI Quotas */}
        <section className="pb-5 space-y-3">
          <h3 className="text-xs font-semibold text-[#f5f5f5] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            حدود الذكاء الاصطناعي اليومية لكل باقة (صور/يومياً)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor={`${id}-free`}
                className="text-[11px] text-[#a9afaf] block mb-1.5"
              >
                الباقة المجانية
              </label>
              <input
                id={`${id}-free`}
                type="number"
                value={freeAiLimit}
                onChange={(e) => onFreeLimitChange(parseInt(e.target.value, 10) || 0)}
                className="admin-input w-full h-8 px-3 text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor={`${id}-pro`}
                className="text-[11px] text-[#a9afaf] block mb-1.5"
              >
                باقة المحترفين
              </label>
              <input
                id={`${id}-pro`}
                type="number"
                value={proAiLimit}
                onChange={(e) => onProLimitChange(parseInt(e.target.value, 10) || 0)}
                className="admin-input w-full h-8 px-3 text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor={`${id}-ent`}
                className="text-[11px] text-[#a9afaf] block mb-1.5"
              >
                باقة المؤسسات
              </label>
              <input
                id={`${id}-ent`}
                type="number"
                value={enterpriseAiLimit}
                onChange={(e) => onEnterpriseLimitChange(parseInt(e.target.value, 10) || 0)}
                className="admin-input w-full h-8 px-3 text-xs font-mono tabular-nums"
              />
            </div>
          </div>
        </section>

        {/* Notice Announcement */}
        <section className="py-5 space-y-2">
          <label
            htmlFor={`${id}-notice`}
            className="text-xs font-semibold text-[#f5f5f5] block"
          >
            رسالة التنبيه العامة للتطبيق
          </label>
          <textarea
            id={`${id}-notice`}
            rows={3}
            value={systemNotice}
            onChange={(e) => onNoticeChange(e.target.value)}
            className="admin-input w-full p-3 text-xs leading-relaxed"
          />
        </section>

        {/* Maintenance Toggle */}
        <section className="py-5">
          <div className="admin-card-inset p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#f5f5f5]">
                وضع الصيانة والتحديثات السحابية
              </div>
              <div className="text-[11px] text-[#a9afaf] mt-0.5">
                إظهار إشعار صيانة للمستخدمين عند التشغيل (محلياً)
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={maintenanceMode}
              onClick={onMaintenanceToggle}
              className={`h-8 px-3.5 rounded-sm border text-xs font-medium cursor-pointer transition-colors shrink-0 ${
                maintenanceMode
                  ? 'bg-red-500/15 text-red-300 border-red-500/35 hover:bg-red-500/25'
                  : 'bg-[#202020] text-[#c9cfcf] border-[#454545] hover:bg-white/[0.08]'
              }`}
            >
              {maintenanceMode ? 'مفعل (وضع الصيانة)' : 'معطل (الوضع الطبيعي)'}
            </button>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={savingSettings}
            className="admin-btn-primary h-9 px-5 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {savingSettings ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Settings className="w-4 h-4" aria-hidden="true" />
            )}
            <span>حفظ التفضيلات</span>
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

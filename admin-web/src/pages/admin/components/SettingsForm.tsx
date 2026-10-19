import type { FormEvent, MouseEvent } from 'react';
import { AlertTriangle, Loader2, Settings, Sliders, Zap } from 'lucide-react';

/**
 * SettingsForm — تبويب الإعدادات المحلية، JSX منقول verbatim من AdminDashboard.tsx.
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
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="spotlight-card p-6 border border-[#2C2C2C] space-y-6 relative z-10 tab-content-reveal"
    >
      <div className="border-b border-[#2C2C2C] pb-4">
        <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
          <Sliders className="w-4 h-4 text-white" />
          تخصيص وإعدادات محلية (مسودة المتصفح)
        </h3>
        <p className="text-xs text-[#9E9E9E] mt-1 font-sans">
          قيم تجريبية في هذا المتصفح فقط — الحصص الفعلية تُفرض خادمياً عبر قاعدة البيانات
        </p>
      </div>

      <div className="flex items-start gap-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 leading-relaxed font-sans">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
        <span>
          هذه الإعدادات تُحفظ في متصفحك فقط ولا تصل إلى Supabase أو التطبيق — الحدود الفعلية للذكاء
          الاصطناعي خادمية (free ≤ 5، pro ≤ 15، enterprise ≤ 50 طلب/يوم).
        </span>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
        {/* AI Quotas */}
        <div className="space-y-3">
          <h4 className="text-xs font-sans font-semibold text-slate-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            حدود الذكاء الاصطناعي اليومية لكل باقة (صور/يومياً)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-sans text-[#9E9E9E] block mb-1.5">الباقة المجانية</label>
              <input
                type="number"
                value={freeAiLimit}
                onChange={(e) => onFreeLimitChange(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-sans text-[#9E9E9E] block mb-1.5">باقة المحترفين</label>
              <input
                type="number"
                value={proAiLimit}
                onChange={(e) => onProLimitChange(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-sans text-[#9E9E9E] block mb-1.5">باقة المؤسسات</label>
              <input
                type="number"
                value={enterpriseAiLimit}
                onChange={(e) => onEnterpriseLimitChange(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Notice Announcement */}
        <div className="space-y-2">
          <label className="text-xs font-sans font-semibold text-slate-300 block">
            رسالة التنبيه العامة للتطبيق
          </label>
          <textarea
            rows={3}
            value={systemNotice}
            onChange={(e) => onNoticeChange(e.target.value)}
            className="w-full px-4 py-3 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white leading-relaxed font-sans"
          />
        </div>

        {/* Maintenance Toggle */}
        <div className="flex items-center justify-between p-5 bg-[#141414] border border-[#2C2C2C] rounded-xl">
          <div>
            <div className="text-xs font-bold text-white">وضع الصيانة والتحديثات السحابية</div>
            <div className="text-[11px] text-[#9E9E9E] mt-0.5">إظهار إشعار صيانة للمستخدمين عند التشغيل</div>
          </div>
          <button
            type="button"
            onClick={onMaintenanceToggle}
            className={`px-4 py-2 rounded-full text-xs font-sans font-bold cursor-pointer transition-colors ${
              maintenanceMode ? 'bg-rose-600 text-white' : 'bg-white/10 text-[#9E9E9E]'
            }`}
          >
            {maintenanceMode ? 'مفعل (وضع الصيانة)' : 'معطل (الوضع الطبيعي)'}
          </button>
        </div>

        <button
          type="submit"
          disabled={savingSettings}
          className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-sans font-bold text-xs rounded-xl cursor-pointer flex items-center gap-2 magnetic-pill"
        >
          {savingSettings ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Settings className="w-4 h-4" />
          )}
          <span>حفظ التفضيلات</span>
        </button>
      </form>
    </div>
  );
}

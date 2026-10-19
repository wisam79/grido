import type { MouseEvent } from 'react';
import { DollarSign, Key, ShieldCheck, Users, Wand2 } from 'lucide-react';

/**
 * StatsCards — بطاقات المؤشرات العلوية، JSX منقول verbatim من AdminDashboard.tsx.
 */

interface StatsCardsProps {
  totalUsers: number;
  usersCount: number;
  activePro: number;
  activeEnt: number;
  unusedKeys: number;
  keysCount: number;
  totalKeys: number;
  totalAiRuns: number;
  aiLogsCount: number;
  windowAiCost: number;
  estimatedMRR: number;
  sampleTruncated: boolean;
}

export function StatsCards({
  totalUsers,
  usersCount,
  activePro,
  activeEnt,
  unusedKeys,
  keysCount,
  totalKeys,
  totalAiRuns,
  aiLogsCount,
  windowAiCost,
  estimatedMRR,
  sampleTruncated,
}: StatsCardsProps) {
  // Mouse Tracking for Spotlight Glow (design.md Section 4.2)
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
      <div onMouseMove={handleMouseMove} className="spotlight-card p-5 space-y-2 border border-[#2C2C2C]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[#9E9E9E] text-[11px] font-medium leading-snug pt-1">
            إجمالي الحسابات
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/25">
            <Users className="w-4 h-4 text-[#60a5fa]" />
          </span>
        </div>
        <div className="text-3xl font-black font-mono text-white tracking-tight">{totalUsers}</div>
        <div className="text-[10px] text-[#9E9E9E]">
          {sampleTruncated ? `حساب مسجل · المعروض ${usersCount}` : 'إجمالي الحسابات المسجلة'}
        </div>
      </div>

      <div onMouseMove={handleMouseMove} className="spotlight-card p-5 space-y-2 border border-[#2C2C2C]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[#9E9E9E] text-[11px] font-medium leading-snug pt-1">
            الاشتراكات المدفوعة
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </span>
        </div>
        <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
          {activePro + activeEnt}
        </div>
        <div className="text-[10px] text-[#9E9E9E]">
          {activePro} احترافي + {activeEnt} مؤسسات{sampleTruncated ? ' (من العينة المعروضة)' : ''}
        </div>
      </div>

      <div onMouseMove={handleMouseMove} className="spotlight-card p-5 space-y-2 border border-[#2C2C2C]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[#9E9E9E] text-[11px] font-medium leading-snug pt-1">
            مفاتيح متاحة
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 border border-amber-500/25">
            <Key className="w-4 h-4 text-amber-400" />
          </span>
        </div>
        <div className="text-3xl font-black font-mono text-amber-400 tracking-tight">{unusedKeys}</div>
        <div className="text-[10px] text-[#9E9E9E]">
          جاهزة للاستخدام · المعروض: {keysCount} من {totalKeys}
        </div>
      </div>

      <div onMouseMove={handleMouseMove} className="spotlight-card p-5 space-y-2 border border-[#2C2C2C]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[#9E9E9E] text-[11px] font-medium leading-snug pt-1">
            عمليات الذكاء الاصطناعي
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-purple-500/10 border border-purple-500/25">
            <Wand2 className="w-4 h-4 text-purple-400" />
          </span>
        </div>
        <div className="text-3xl font-black font-mono text-purple-400 tracking-tight">{totalAiRuns}</div>
        <div className="text-[10px] text-[#9E9E9E]">
          تكلفة آخر {aiLogsCount} عملية: ${windowAiCost.toFixed(2)}
        </div>
      </div>

      <div onMouseMove={handleMouseMove} className="spotlight-card p-5 space-y-2 border border-[#2C2C2C]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[#9E9E9E] text-[11px] font-medium leading-snug pt-1">
            الدخل الشهري التقديري
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </span>
        </div>
        <div className="text-3xl font-black font-mono text-emerald-300 tracking-tight">
          ${estimatedMRR} <span className="text-xs font-normal text-[#9E9E9E]">/شهرياً</span>
        </div>
        <div className="text-[10px] text-[#9E9E9E]">تقدير الاشتراكات النشطة</div>
      </div>
    </div>
  );
}

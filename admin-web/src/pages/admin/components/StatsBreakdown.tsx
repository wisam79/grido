import type { MouseEvent } from 'react';
import { Activity, Coins } from 'lucide-react';

/**
 * StatsBreakdown — تبويب إحصائيات الإيرادات، JSX منقول verbatim من AdminDashboard.tsx.
 */

interface StatsBreakdownProps {
  proCount: number;
  entCount: number;
  freeCount: number;
  proPct: number;
  entPct: number;
  estimatedMRR: number;
  windowAiCost: number;
  aiLogsCount: number;
  sampleTruncated: boolean;
  usersCount: number;
  totalUsers: number;
}

export function StatsBreakdown({
  proCount,
  entCount,
  freeCount,
  proPct,
  entPct,
  estimatedMRR,
  windowAiCost,
  aiLogsCount,
  sampleTruncated,
  usersCount,
  totalUsers,
}: StatsBreakdownProps) {
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 tab-content-reveal">
      <div onMouseMove={handleMouseMove} className="spotlight-card p-6 border border-[#2C2C2C] space-y-5">
        <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
          <Activity className="w-4 h-4 text-emerald-400" />
          توزيع فئات الاشتراكات
        </h3>
        {sampleTruncated && (
          <p className="text-[10px] text-[#9E9E9E] font-mono">
            التوزيع محسوب على أحدث {usersCount} حساب معروض من أصل {totalUsers}
          </p>
        )}
        <div className="space-y-4 text-xs font-mono">
          <div>
            <div className="flex justify-between text-slate-300 mb-1.5 font-sans">
              <span>باقة المحترفين (Pro)</span>
              <span className="font-bold text-blue-400 font-mono">
                {proCount} ({proPct}%)
              </span>
            </div>
            <div className="w-full bg-[#141414] h-2.5 rounded-full overflow-hidden border border-[#2C2C2C]">
              <div className="bg-blue-500 h-full" style={{ width: `${proPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1.5 font-sans">
              <span>باقة المؤسسات (Enterprise)</span>
              <span className="font-bold text-purple-400 font-mono">
                {entCount} ({entPct}%)
              </span>
            </div>
            <div className="w-full bg-[#141414] h-2.5 rounded-full overflow-hidden border border-[#2C2C2C]">
              <div className="bg-purple-500 h-full" style={{ width: `${entPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1.5 font-sans">
              <span>الباقة المجانية</span>
              <span className="font-bold text-[#9E9E9E] font-mono">
                {freeCount} ({100 - proPct - entPct}%)
              </span>
            </div>
            <div className="w-full bg-[#141414] h-2.5 rounded-full overflow-hidden border border-[#2C2C2C]">
              <div className="bg-slate-700 h-full" style={{ width: `${100 - proPct - entPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div onMouseMove={handleMouseMove} className="spotlight-card p-6 border border-[#2C2C2C] space-y-5">
        <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
          <Coins className="w-4 h-4 text-amber-400" />
          المؤشرات المالية والإيرادات
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-[#141414] rounded-xl border border-[#2C2C2C]">
            <div className="text-[#9E9E9E] font-medium font-sans">الدخل الشهري التقديري</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">${estimatedMRR}</div>
          </div>
          <div className="p-4 bg-[#141414] rounded-xl border border-[#2C2C2C]">
            <div className="text-[#9E9E9E] font-medium font-sans">الدخل السنوي المتوقع</div>
            <div className="text-2xl font-black text-emerald-300 mt-1">${estimatedMRR * 12}</div>
          </div>
          <div className="p-4 bg-[#141414] rounded-xl border border-[#2C2C2C]">
            <div className="text-[#9E9E9E] font-medium font-sans">معدل التحويل للاشتراك المدفوع</div>
            <div className="text-2xl font-black text-blue-400 mt-1">{proPct + entPct}%</div>
          </div>
          <div className="p-4 bg-[#141414] rounded-xl border border-[#2C2C2C]">
            <div className="text-[#9E9E9E] font-medium font-sans">تكلفة الذكاء الاصطناعي (آخر {aiLogsCount})</div>
            <div className="text-2xl font-black text-purple-400 mt-1">${windowAiCost.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

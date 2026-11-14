import { DollarSign, Key, ShieldCheck, Users, Wand2 } from 'lucide-react';
import type { ActiveTab, UserStatusFilter } from '../types';

/**
 * StatsCards — شريط المؤشرات التفاعلي الرشيق بهوية Grido Studio المكتبية.
 * يُعرض على الشاشة الرئيسية فقط ويتيـح التصفية والتنقل المباشر مع إتاحة مساحة قصوى للجدول.
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
  onFilterUsers?: (filter: UserStatusFilter) => void;
  onOpenUnusedKeys?: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
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
  onFilterUsers,
  onOpenUnusedKeys,
  onNavigateTab,
}: StatsCardsProps) {
  return (
    <div
      className="shrink-0 grid grid-cols-2 lg:grid-cols-5 gap-2.5"
      role="region"
      aria-label="ملخص المؤشرات السريعة"
    >
      <button
        type="button"
        onClick={() => onFilterUsers?.('all')}
        className="admin-card px-3 py-2 text-right hover:bg-[#252525] hover:border-[#454545] transition-colors cursor-pointer space-y-1"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#a9afaf] text-[11px] font-medium truncate">إجمالي الحسابات</span>
          <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-sm bg-blue-500/12 border border-blue-500/25">
            <Users className="w-3 h-3 text-[#60a5fa]" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold font-mono tabular-nums text-[#f5f5f5] tracking-tight">
            {totalUsers}
          </span>
          <span className="text-[10px] text-[#a9afaf] tabular-nums truncate">
            {sampleTruncated ? `معروض ${usersCount}` : 'كل المشتركين'}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onFilterUsers?.('pro')}
        className="admin-card px-3 py-2 text-right hover:bg-[#252525] hover:border-[#454545] transition-colors cursor-pointer space-y-1"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#a9afaf] text-[11px] font-medium truncate">
            الاشتراكات المدفوعة
          </span>
          <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-sm bg-emerald-500/12 border border-emerald-500/25">
            <ShieldCheck className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold font-mono tabular-nums text-emerald-400 tracking-tight">
            {activePro + activeEnt}
          </span>
          <span className="text-[10px] text-[#a9afaf] tabular-nums truncate">
            {activePro} Pro · {activeEnt} Ent
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => (onOpenUnusedKeys ? onOpenUnusedKeys() : onNavigateTab?.('keys'))}
        className="admin-card px-3 py-2 text-right hover:bg-[#252525] hover:border-[#454545] transition-colors cursor-pointer space-y-1"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#a9afaf] text-[11px] font-medium truncate">مفاتيح متاحة</span>
          <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-sm bg-amber-500/12 border border-amber-500/25">
            <Key className="w-3 h-3 text-amber-400" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold font-mono tabular-nums text-amber-400 tracking-tight">
            {unusedKeys}
          </span>
          <span className="text-[10px] text-[#a9afaf] tabular-nums truncate">
            {keysCount} / {totalKeys}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigateTab?.('usage')}
        className="admin-card px-3 py-2 text-right hover:bg-[#252525] hover:border-[#454545] transition-colors cursor-pointer space-y-1"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#a9afaf] text-[11px] font-medium truncate">عمليات AI</span>
          <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-sm bg-purple-500/12 border border-purple-500/25">
            <Wand2 className="w-3 h-3 text-purple-400" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold font-mono tabular-nums text-purple-400 tracking-tight">
            {totalAiRuns}
          </span>
          <span className="text-[10px] text-[#a9afaf] tabular-nums truncate">
            آخر {aiLogsCount}: ${windowAiCost.toFixed(2)}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigateTab?.('stats')}
        className="admin-card px-3 py-2 text-right hover:bg-[#252525] hover:border-[#454545] transition-colors cursor-pointer space-y-1 col-span-2 lg:col-span-1"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#a9afaf] text-[11px] font-medium truncate">الدخل الشهري</span>
          <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-sm bg-emerald-500/12 border border-emerald-500/25">
            <DollarSign className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold font-mono tabular-nums text-emerald-300 tracking-tight">
            ${estimatedMRR}
          </span>
          <span className="text-[10px] text-[#a9afaf] truncate">/شهرياً (تقديري)</span>
        </div>
      </button>
    </div>
  );
}

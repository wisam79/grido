import { useMemo } from 'react';
import { Activity, Coins, Cpu, ShieldCheck } from 'lucide-react';
import { computeExtendedAdminBreakdown } from '../../../lib/admin-utils';
import type { AiUsageRecord, UserProfile, UserStatusFilter } from '../types';
import { UserIdentityLink } from './admin-badges';

/**
 * StatsBreakdown — تبويب مؤشرات الاشتراكات وصحة الحسابات والذكاء الاصطناعي بهوية Grido المكتبية.
 */

interface StatsBreakdownProps {
  proCount: number;
  entCount: number;
  freeCount: number;
  proPct: number;
  entPct: number;
  freePct: number;
  estimatedMRR: number;
  windowAiCost: number;
  aiLogsCount: number;
  sampleTruncated: boolean;
  usersCount: number;
  totalUsers: number;
  users?: UserProfile[];
  aiUsageLogs?: AiUsageRecord[];
  usersLookup?: Record<string, UserProfile>;
  onInspectUser?: (user: UserProfile) => void;
  onFilterUsers?: (filter: UserStatusFilter) => void;
}

export function StatsBreakdown({
  proCount,
  entCount,
  freeCount,
  proPct,
  entPct,
  freePct,
  estimatedMRR,
  windowAiCost,
  aiLogsCount,
  sampleTruncated,
  usersCount,
  totalUsers,
  users = [],
  aiUsageLogs = [],
  usersLookup,
  onInspectUser,
  onFilterUsers,
}: StatsBreakdownProps) {
  const extended = useMemo(
    () => computeExtendedAdminBreakdown(users, aiUsageLogs),
    [users, aiUsageLogs],
  );

  const denominator = sampleTruncated ? usersCount : totalUsers;
  const trialPct = denominator > 0 ? Math.round((extended.trialCount / denominator) * 100) : 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pe-0.5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Tiers Distribution */}
        <div className="admin-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-[#333333]/75 pb-3">
            <h2 className="text-sm font-semibold text-[#f5f5f5] flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              توزيع فئات الاشتراكات
            </h2>
            {sampleTruncated && (
              <span className="text-[11px] text-[#a9afaf] font-mono tabular-nums">
                عينة {usersCount} / {totalUsers}
              </span>
            )}
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between text-[#c9cfcf] mb-1.5">
                <span>باقة المحترفين (Pro)</span>
                <span className="font-semibold text-[#60a5fa] font-mono tabular-nums">
                  {proCount} ({proPct}%)
                </span>
              </div>
              <div className="w-full bg-[#171717] h-2 rounded-full overflow-hidden border border-[#333333]/75">
                <div className="bg-[#3b82f6] h-full" style={{ width: `${proPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[#c9cfcf] mb-1.5">
                <span>باقة المؤسسات (Enterprise)</span>
                <span className="font-semibold text-purple-400 font-mono tabular-nums">
                  {entCount} ({entPct}%)
                </span>
              </div>
              <div className="w-full bg-[#171717] h-2 rounded-full overflow-hidden border border-[#333333]/75">
                <div className="bg-purple-500 h-full" style={{ width: `${entPct}%` }} />
              </div>
            </div>

            {users.length > 0 && (
              <div>
                <div className="flex justify-between text-[#c9cfcf] mb-1.5">
                  <span>الباقة التجريبية (Trial)</span>
                  <span className="font-semibold text-amber-300 font-mono tabular-nums">
                    {extended.trialCount} ({trialPct}%)
                  </span>
                </div>
                <div className="w-full bg-[#171717] h-2 rounded-full overflow-hidden border border-[#333333]/75">
                  <div className="bg-amber-500 h-full" style={{ width: `${trialPct}%` }} />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-[#c9cfcf] mb-1.5">
                <span>الباقة المجانية (Free)</span>
                <span className="font-semibold text-[#a9afaf] font-mono tabular-nums">
                  {freeCount} ({freePct}%)
                </span>
              </div>
              <div className="w-full bg-[#171717] h-2 rounded-full overflow-hidden border border-[#333333]/75">
                <div className="bg-zinc-600 h-full" style={{ width: `${freePct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Telemetry KPIs */}
        <div className="admin-card p-5 space-y-4">
          <div className="border-b border-[#333333]/75 pb-3">
            <h2 className="text-sm font-semibold text-[#f5f5f5] flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" aria-hidden="true" />
              المؤشرات المالية والإيرادات
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="admin-card-inset p-3.5">
              <div className="text-[11px] text-[#a9afaf]">الدخل الشهري التقديري</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-emerald-400 mt-1">
                ${estimatedMRR}
              </div>
            </div>
            <div className="admin-card-inset p-3.5">
              <div className="text-[11px] text-[#a9afaf]">الدخل السنوي المتوقع</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-emerald-300 mt-1">
                ${estimatedMRR * 12}
              </div>
            </div>
            <div className="admin-card-inset p-3.5">
              <div className="text-[11px] text-[#a9afaf]">معدل التحويل المدفوع</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-[#60a5fa] mt-1">
                {proPct + entPct}%
              </div>
            </div>
            <div className="admin-card-inset p-3.5">
              <div className="text-[11px] text-[#a9afaf]">
                تكلفة AI (آخر {aiLogsCount})
              </div>
              <div className="text-xl font-semibold font-mono tabular-nums text-purple-400 mt-1">
                ${windowAiCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Health & Top AI Consumers */}
      {users.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="admin-card p-5 space-y-4">
            <div className="border-b border-[#333333]/75 pb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#f5f5f5] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#3b82f6]" aria-hidden="true" />
                صحة الحسابات الحالية
              </h2>
              <span className="text-[11px] text-[#a9afaf] font-mono tabular-nums">
                {users.length} حساب
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => onFilterUsers?.('all')}
                className="admin-card-inset p-3 text-right hover:bg-[#252525] transition-colors cursor-pointer"
              >
                <div className="text-[11px] text-[#a9afaf]">نشط</div>
                <div className="text-lg font-semibold font-mono tabular-nums text-emerald-400 mt-0.5">
                  {extended.activeUsersCount}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onFilterUsers?.('expired')}
                className="admin-card-inset p-3 text-right hover:bg-[#252525] transition-colors cursor-pointer"
              >
                <div className="text-[11px] text-[#a9afaf]">منتهي</div>
                <div className="text-lg font-semibold font-mono tabular-nums text-amber-300 mt-0.5">
                  {extended.expiredCount}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onFilterUsers?.('banned')}
                className="admin-card-inset p-3 text-right hover:bg-[#252525] transition-colors cursor-pointer"
              >
                <div className="text-[11px] text-[#a9afaf]">محظور</div>
                <div className="text-lg font-semibold font-mono tabular-nums text-red-400 mt-0.5">
                  {extended.bannedCount}
                </div>
              </button>
            </div>
          </div>

          <div className="admin-card p-5 space-y-4">
            <div className="border-b border-[#333333]/75 pb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#f5f5f5] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" aria-hidden="true" />
                أكثر المستخدمين استهلاكاً لـ AI
              </h2>
              <span className="text-[11px] text-[#a9afaf] font-mono tabular-nums">
                {extended.totalAiMb.toFixed(1)} MB · {extended.avgExecutionSeconds.toFixed(1)}s متوسط
              </span>
            </div>

            {extended.topAiUsers.length === 0 ? (
              <div className="admin-card-inset p-4 text-center text-xs text-[#a9afaf]">
                لا توجد عمليات AI مسجلة ضمن العينة الحالية.
              </div>
            ) : (
              <div className="admin-card-inset divide-y divide-[#333333]/65 text-xs">
                {extended.topAiUsers.map((entry) => {
                  const owner = usersLookup?.[entry.userId];
                  return (
                    <div
                      key={entry.userId}
                      className="px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <UserIdentityLink
                        user={owner}
                        fallbackText={entry.userId}
                        maxWidthClass="max-w-44"
                        onInspectUser={onInspectUser}
                      />

                      <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums text-[11px]">
                        <span className="text-[#c9cfcf]">{entry.runs} عملية</span>
                        <span className="text-emerald-400">${entry.totalCostUsd.toFixed(3)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

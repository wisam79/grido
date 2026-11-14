import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Search, Wand2, X } from 'lucide-react';
import { resolveAiCostUsd } from '../../../lib/admin-utils';
import type { AiUsageRecord, UserProfile } from '../types';
import { UserIdentityLink } from './admin-badges';

/**
 * UsageLogsTable — تبويب سجل الذكاء الاصطناعي بهوية Grido المكتبية مع ربط أسماء المشتركين وتصحيح حساب التكلفة.
 */

interface UsageLogsTableProps {
  aiUsageLogs: AiUsageRecord[];
  totalAiRuns: number;
  usersLookup?: Record<string, UserProfile>;
  loading?: boolean;
  onInspectUser?: (user: UserProfile) => void;
}

const PAGE_SIZE = 25;

export function UsageLogsTable({
  aiUsageLogs,
  totalAiRuns,
  usersLookup,
  loading = false,
  onInspectUser,
}: UsageLogsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return aiUsageLogs;
    return aiUsageLogs.filter((log) => {
      const owner = usersLookup?.[log.user_id];
      return (
        (log.user_id || '').toLowerCase().includes(q) ||
        (log.user_email || '').toLowerCase().includes(q) ||
        (owner?.name || '').toLowerCase().includes(q) ||
        (owner?.email || '').toLowerCase().includes(q)
      );
    });
  }, [aiUsageLogs, searchQuery, usersLookup]);

  const summary = useMemo(() => {
    let totalBytes = 0;
    let totalSeconds = 0;
    let totalCost = 0;
    for (const log of filteredLogs) {
      totalBytes += Number.isFinite(log.image_bytes) && log.image_bytes > 0 ? log.image_bytes : 0;
      totalSeconds +=
        Number.isFinite(log.execution_seconds) && log.execution_seconds > 0
          ? log.execution_seconds
          : 0;
      totalCost += resolveAiCostUsd(log.cost_usd);
    }
    return {
      totalMb: totalBytes / (1024 * 1024),
      avgSec: filteredLogs.length > 0 ? totalSeconds / filteredLogs.length : 0,
      totalCost,
    };
  }, [filteredLogs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageLogs = filteredLogs.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      {/* Telemetry Summary Bar + Filter */}
      <div className="admin-card p-3 space-y-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-[#f5f5f5]">
              سجل استهلاك الذكاء الاصطناعي والترميم
            </h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#a9afaf] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setPage(1);
                  setSearchQuery(e.target.value);
                }}
                aria-label="ابحث في سجل الذكاء الاصطناعي"
                placeholder="ابحث بالاسم، البريد، أو UUID..."
                className="admin-input w-full h-7 ps-8 pe-7 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSearchQuery('');
                  }}
                  aria-label="مسح بحث السجل"
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-sm text-[#a9afaf] hover:text-[#f5f5f5] hover:bg-white/[0.08] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className="admin-card-inset px-3 py-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-[#a9afaf]">العمليات المطابقة</span>
            <span className="text-xs font-semibold font-mono tabular-nums text-[#f5f5f5]">
              {filteredLogs.length}{' '}
              <span className="text-[10px] font-normal text-[#a9afaf]">/ {totalAiRuns}</span>
            </span>
          </div>
          <div className="admin-card-inset px-3 py-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-[#a9afaf]">الحجم الإجمالي</span>
            <span className="text-xs font-semibold font-mono tabular-nums text-[#f5f5f5]">
              {summary.totalMb.toFixed(1)} MB
            </span>
          </div>
          <div className="admin-card-inset px-3 py-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-[#a9afaf]">متوسط التنفيذ</span>
            <span className="text-xs font-semibold font-mono tabular-nums text-[#60a5fa]">
              {summary.avgSec.toFixed(1)} ثانية
            </span>
          </div>
          <div className="admin-card-inset px-3 py-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-[#a9afaf]">إجمالي التكلفة</span>
            <span className="text-xs font-semibold font-mono tabular-nums text-emerald-400">
              ${summary.totalCost.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* Usage Table */}
      <div className="admin-card flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto max-h-[65vh] md:max-h-none">
          <table className="w-full text-right text-xs text-[#f5f5f5]">
            <thead className="admin-table-head sticky top-0 z-10 text-[11px] font-medium">
              <tr>
                <th className="px-3.5 py-2">المستخدم</th>
                <th className="px-3.5 py-2">تاريخ التنفيذ</th>
                <th className="px-3.5 py-2">حجم الصورة</th>
                <th className="px-3.5 py-2">مدة المعالجة</th>
                <th className="px-3.5 py-2">التكلفة</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums text-[11px]">
              {loading && aiUsageLogs.length === 0 ? (
                Array.from({ length: 5 }, (_, idx) => (
                  <tr key={`usk-${idx}`} className="admin-table-row">
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-4 w-44" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-3.5 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-3.5 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-3.5 w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-3.5 w-14" />
                    </td>
                  </tr>
                ))
              ) : pageLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-sans">
                    <div className="space-y-2.5">
                      <p className="text-xs text-[#a9afaf]">
                        {searchQuery
                          ? 'لا توجد عمليات تطابق البحث الحالي.'
                          : 'لا توجد عمليات مسجّلة حتى الآن.'}
                      </p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setPage(1);
                            setSearchQuery('');
                          }}
                          className="admin-btn-secondary h-7 px-3 text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          <span>مسح البحث</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pageLogs.map((log) => {
                  const owner = usersLookup?.[log.user_id];
                  const execSeconds =
                    Number.isFinite(log.execution_seconds) && log.execution_seconds >= 0
                      ? log.execution_seconds
                      : 0;
                  const costUsd = resolveAiCostUsd(log.cost_usd);

                  return (
                    <tr key={log.id} className="admin-table-row">
                      <td className="px-4 py-3 font-sans">
                        <UserIdentityLink
                          user={owner}
                          fallbackText={log.user_email || log.user_id}
                          maxWidthClass="max-w-52"
                          onInspectUser={onInspectUser}
                        />
                      </td>
                      <td className="px-4 py-3 text-[#a9afaf]">
                        {new Date(log.used_at).toLocaleString('ar-SA')}
                      </td>
                      <td className="px-4 py-3 text-[#c9cfcf]">
                        {((log.image_bytes || 0) / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-4 py-3 text-[#c9cfcf]">{execSeconds.toFixed(1)} ثانية</td>
                      <td className="px-4 py-3 text-emerald-400 font-medium">
                        ${costUsd.toFixed(3)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > PAGE_SIZE && (
          <div className="shrink-0 px-3.5 py-1.5 bg-[#1a1a1a] border-t border-[#333333]/75 flex items-center justify-between gap-2 text-[11px] text-[#a9afaf] font-mono tabular-nums">
            <span>
              عرض {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredLogs.length)} من{' '}
              {filteredLogs.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="الصفحة السابقة"
                className="admin-btn-secondary w-7 h-7 flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="px-2 text-[#f5f5f5]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="الصفحة التالية"
                className="admin-btn-secondary w-7 h-7 flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

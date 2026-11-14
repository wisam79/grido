import { useId, useMemo, useState, type FormEvent } from 'react';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Copy,
  Download,
  FileText,
  Key,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { GenMode, GenPlan, KeyStatusFilter, LicenseKey, UserProfile } from '../types';
import { CopyButton, PlanBadge, UserIdentityLink } from './admin-badges';

/**
 * KeysTable — مولد المفاتيح + سجل مفاتيح الترخيص السحابية بهوية Grido المكتبية.
 */

interface KeysTableProps {
  allKeys?: LicenseKey[];
  usersLookup?: Record<string, UserProfile>;
  loading?: boolean;
  genMode: GenMode;
  genPlan: GenPlan;
  genDuration: string;
  genCount: string;
  genPrefix: string;
  generatedKey: string;
  generatedBatchKeys: string[];
  generatingBatch: boolean;
  keysCount: number;
  totalKeys: number;
  keyStatusFilter: KeyStatusFilter;
  keySearchQuery: string;
  filteredKeys: LicenseKey[];
  onGenModeChange: (v: GenMode) => void;
  onGenPlanChange: (v: GenPlan) => void;
  onGenDurationChange: (v: string) => void;
  onGenCountChange: (v: string) => void;
  onGenPrefixChange: (v: string) => void;
  onGenerateKey: (e: FormEvent) => void;
  onGenerateBatchKeys: (e: FormEvent) => void;
  onExportBatch: (format: 'txt' | 'csv') => void;
  onCopyKey: () => void;
  onKeyStatusFilterChange: (v: KeyStatusFilter) => void;
  onKeySearchChange: (v: string) => void;
  onInspectUser?: (user: UserProfile) => void;
}

const PAGE_SIZE = 20;

const KEY_FILTER_OPTIONS: ReadonlyArray<{ id: KeyStatusFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'unused', label: 'متاح' },
  { id: 'used', label: 'مستخدم' },
  { id: 'revoked', label: 'ملغي' },
];

export function KeysTable({
  allKeys,
  usersLookup,
  loading = false,
  genMode,
  genPlan,
  genDuration,
  genCount,
  genPrefix,
  generatedKey,
  generatedBatchKeys,
  generatingBatch,
  keysCount,
  totalKeys,
  keyStatusFilter,
  keySearchQuery,
  filteredKeys,
  onGenModeChange,
  onGenPlanChange,
  onGenDurationChange,
  onGenCountChange,
  onGenPrefixChange,
  onGenerateKey,
  onGenerateBatchKeys,
  onExportBatch,
  onCopyKey,
  onKeyStatusFilterChange,
  onKeySearchChange,
  onInspectUser,
}: KeysTableProps) {
  const formId = useId();
  const [page, setPage] = useState(1);
  const [generatorOpen, setGeneratorOpen] = useState(true);

  const filterCounts = useMemo(() => {
    const source = allKeys ?? filteredKeys;
    let unused = 0;
    let used = 0;
    let revoked = 0;
    for (const item of source) {
      if (item.status === 'unused') unused += 1;
      else if (item.status === 'revoked') revoked += 1;
      else if (item.status === 'used') used += 1;
    }
    return { all: source.length, unused, used, revoked };
  }, [allKeys, filteredKeys]);

  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageKeys = filteredKeys.slice(pageStart, pageStart + PAGE_SIZE);
  const hasActiveFilter = Boolean(keySearchQuery.trim() || keyStatusFilter !== 'all');

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      {/* Key Generator Panel */}
      <div className="admin-card p-3 space-y-2.5 shrink-0 max-h-[44vh] overflow-y-auto">
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            generatorOpen ? 'border-b border-[#333333]/75 pb-2.5' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-[#3b82f6]" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-[#f5f5f5]">توليد مفاتيح الترخيص السحابية</h2>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {generatorOpen && (
              <div
                className="admin-segment inline-flex items-center gap-1"
                role="group"
                aria-label="وضع توليد المفاتيح"
              >
                <button
                  type="button"
                  aria-pressed={genMode === 'single'}
                  onClick={() => onGenModeChange('single')}
                  className="admin-segment-btn h-6 px-2.5 text-[11px] font-medium cursor-pointer"
                >
                  مفتاح فردي
                </button>
                <button
                  type="button"
                  aria-pressed={genMode === 'batch'}
                  onClick={() => onGenModeChange('batch')}
                  className="admin-segment-btn h-6 px-2.5 text-[11px] font-medium cursor-pointer"
                >
                  دفعة مفاتيح
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setGeneratorOpen((prev) => !prev)}
              aria-expanded={generatorOpen}
              aria-label={generatorOpen ? 'طي لوحة التوليد' : 'توسيع لوحة التوليد'}
              className="admin-btn-secondary h-6 px-2 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              {generatorOpen ? (
                <>
                  <ChevronUp className="w-3 h-3" aria-hidden="true" />
                  <span>طي</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                  <span>إظهار المُولّد</span>
                </>
              )}
            </button>
          </div>
        </div>

        {generatorOpen && (
          <>
            {genMode === 'single' ? (
          <form onSubmit={onGenerateKey} className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end">
            <div>
              <label
                htmlFor={`${formId}-single-plan`}
                className="text-[11px] font-medium text-[#a9afaf] block mb-1"
              >
                الباقة
              </label>
              <select
                id={`${formId}-single-plan`}
                value={genPlan}
                onChange={(e) => onGenPlanChange(e.target.value as GenPlan)}
                className="admin-input w-full h-7 px-2.5 text-xs"
              >
                <option value="pro">Pro (احترافي)</option>
                <option value="enterprise">Enterprise (مؤسسات)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-single-duration`}
                className="text-[11px] font-medium text-[#a9afaf] block mb-1"
              >
                مدة الصلاحية
              </label>
              <select
                id={`${formId}-single-duration`}
                value={genDuration}
                onChange={(e) => onGenDurationChange(e.target.value)}
                className="admin-input w-full h-7 px-2.5 text-xs"
              >
                <option value="1">1 شهر</option>
                <option value="3">3 أشهر</option>
                <option value="6">6 أشهر</option>
                <option value="12">12 شهر (سنة)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-single-prefix`}
                className="text-[11px] font-medium text-[#a9afaf] block mb-1"
              >
                بادئة مخصصة
              </label>
              <input
                id={`${formId}-single-prefix`}
                type="text"
                dir="ltr"
                value={genPrefix}
                onChange={(e) => onGenPrefixChange(e.target.value)}
                placeholder="STUDIO-VIP"
                className="admin-input w-full h-7 px-2.5 text-xs font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              className="admin-btn-primary h-7 px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>توليد المفتاح</span>
            </button>
          </form>
        ) : (
          <form
            onSubmit={onGenerateBatchKeys}
            className="grid grid-cols-1 md:grid-cols-5 gap-2.5 items-end"
          >
            <div>
              <label
                htmlFor={`${formId}-batch-plan`}
                className="text-[11px] font-medium text-[#a9afaf] block mb-1"
              >
                الباقة
              </label>
              <select
                id={`${formId}-batch-plan`}
                value={genPlan}
                onChange={(e) => onGenPlanChange(e.target.value as GenPlan)}
                className="admin-input w-full h-7 px-2.5 text-xs"
              >
                <option value="pro">Pro (احترافي)</option>
                <option value="enterprise">Enterprise (مؤسسات)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-batch-duration`}
                className="text-[11px] font-medium text-[#a9afaf] block mb-1"
              >
                المدة
              </label>
              <select
                id={`${formId}-batch-duration`}
                value={genDuration}
                onChange={(e) => onGenDurationChange(e.target.value)}
                className="admin-input w-full h-7 px-2.5 text-xs"
              >
                <option value="1">1 شهر</option>
                <option value="3">3 أشهر</option>
                <option value="6">6 أشهر</option>
                <option value="12">12 شهر (سنة)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-batch-count`}
                className="text-[11px] font-medium text-[#a9afaf] block mb-1"
              >
                عدد المفاتيح (1–50)
              </label>
              <input
                id={`${formId}-batch-count`}
                type="number"
                min="1"
                max="50"
                value={genCount}
                onChange={(e) => onGenCountChange(e.target.value)}
                className="admin-input w-full h-7 px-2.5 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-batch-prefix`}
                className="text-[11px] font-medium text-[#a9afaf] block mb-1"
              >
                بادئة الموزع
              </label>
              <input
                id={`${formId}-batch-prefix`}
                type="text"
                dir="ltr"
                value={genPrefix}
                onChange={(e) => onGenPrefixChange(e.target.value)}
                placeholder="BULK-RESELLER"
                className="admin-input w-full h-7 px-2.5 text-xs font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={generatingBatch}
              className="admin-btn-primary h-7 px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {generatingBatch ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>توليد الدفعة</span>
            </button>
          </form>
            )}

            {/* Single Generated Key Preview */}
        {generatedKey && genMode === 'single' && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-emerald-300 font-semibold">المفتاح المُولَّد:</span>
              <code
                dir="ltr"
                className="admin-card-inset px-3 py-1 text-xs font-mono text-[#f5f5f5]"
              >
                {generatedKey}
              </code>
            </div>
            <button
              type="button"
              onClick={onCopyKey}
              className="h-8 px-3.5 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>نسخ المفتاح</span>
            </button>
          </div>
        )}

        {/* Batch Generated Keys Preview */}
        {generatedBatchKeys.length > 0 && genMode === 'batch' && (
          <div className="admin-card-inset p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#f5f5f5] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>المفاتيح المُولَّدة ({generatedBatchKeys.length})</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <CopyButton
                  value={generatedBatchKeys.join('\n')}
                  label="نسخ جميع مفاتيح الدفعة"
                  text="نسخ الكل"
                />
                <button
                  type="button"
                  onClick={() => onExportBatch('txt')}
                  className="admin-btn-secondary h-7 px-2.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-[#a9afaf]" aria-hidden="true" />
                  <span>تصدير TXT</span>
                </button>
                <button
                  type="button"
                  onClick={() => onExportBatch('csv')}
                  className="admin-btn-secondary h-7 px-2.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                  <span>تصدير CSV</span>
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto bg-[#141414] border border-[#333333]/75 rounded-[4px] divide-y divide-[#333333]/50 font-mono text-xs text-[#c9cfcf]">
              {generatedBatchKeys.map((k, i) => (
                <div key={k} className="px-3 py-1.5 flex items-center justify-between gap-2">
                  <span dir="ltr" className="tabular-nums">
                    {i + 1}. {k}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-400 font-sans">جاهز</span>
                    <CopyButton value={k} label={`نسخ المفتاح ${k}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Keys Table */}
      <div className="admin-card flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 px-3.5 py-2 border-b border-[#333333]/75 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="text-xs font-semibold text-[#f5f5f5] tabular-nums">
            سجل مفاتيح الترخيص المخزنة — المعروض {keysCount} من {totalKeys}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div
              className="admin-segment inline-flex items-center gap-1 flex-wrap"
              role="group"
              aria-label="تصفية المفاتيح حسب الحالة"
            >
              {KEY_FILTER_OPTIONS.map(({ id, label }) => {
                const active = keyStatusFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setPage(1);
                      onKeyStatusFilterChange(id);
                    }}
                    className="admin-segment-btn h-6 px-2 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>{label}</span>
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        active ? 'text-[#93c5fd]' : 'text-[#a9afaf]'
                      }`}
                    >
                      {filterCounts[id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-52">
              <Search
                className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#a9afaf] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={keySearchQuery}
                onChange={(e) => {
                  setPage(1);
                  onKeySearchChange(e.target.value);
                }}
                aria-label="ابحث بمفتاح الترخيص، الباقة، أو اسم وبريد المستخدم"
                placeholder="ابحث بالمفتاح أو المالك..."
                className="admin-input w-full h-7 ps-8 pe-7 text-xs"
              />
              {keySearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    onKeySearchChange('');
                  }}
                  aria-label="مسح بحث المفاتيح"
                  className="absolute end-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-sm text-[#a9afaf] hover:text-[#f5f5f5] hover:bg-white/[0.08] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto max-h-[60vh] md:max-h-none">
          <table className="w-full text-right text-xs text-[#f5f5f5]">
            <thead className="admin-table-head sticky top-0 z-10 text-[11px] font-medium">
              <tr>
                <th className="px-3.5 py-2">مفتاح الترخيص</th>
                <th className="px-3.5 py-2">الباقة</th>
                <th className="px-3.5 py-2">المدة</th>
                <th className="px-3.5 py-2">المستخدم المفعّل</th>
                <th className="px-3.5 py-2">الحالة</th>
                <th className="px-3.5 py-2">تاريخ التوليد</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredKeys.length === 0 ? (
                Array.from({ length: 5 }, (_, idx) => (
                  <tr key={`ksk-${idx}`} className="admin-table-row">
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-5 w-36" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-5 w-14" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-3.5 w-12" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-3.5 w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-4 w-14" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-3.5 w-20" />
                    </td>
                  </tr>
                ))
              ) : pageKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="space-y-2.5">
                      <p className="text-xs text-[#a9afaf]">
                        لا توجد مفاتيح مطابقة للمرشحات الحالية.
                      </p>
                      {hasActiveFilter && (
                        <button
                          type="button"
                          onClick={() => {
                            setPage(1);
                            onKeySearchChange('');
                            onKeyStatusFilterChange('all');
                          }}
                          className="admin-btn-secondary h-7 px-3 text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          <span>إعادة ضبط المرشحات</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pageKeys.map((k) => {
                  const owner = k.user_id && usersLookup ? usersLookup[k.user_id] : undefined;

                  return (
                    <tr key={k.key} className="admin-table-row">
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5">
                          <code
                            dir="ltr"
                            className="admin-card-inset px-2 py-0.5 text-[11px] font-mono text-[#f5f5f5] whitespace-nowrap"
                          >
                            {k.key}
                          </code>
                          <CopyButton value={k.key} label={`نسخ المفتاح ${k.key}`} />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <PlanBadge plan={k.plan} />
                      </td>

                      <td className="px-4 py-3 font-mono tabular-nums text-[11px] text-[#c9cfcf]">
                        {k.duration_months} شهر
                      </td>

                      <td className="px-4 py-3">
                        <UserIdentityLink
                          user={owner}
                          fallbackText={k.user_id || undefined}
                          emptyText="غير مفعّل"
                          maxWidthClass="max-w-44"
                          onInspectUser={onInspectUser}
                        />
                      </td>

                      <td className="px-4 py-3">
                        {k.status === 'unused' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            متاح
                          </span>
                        ) : k.status === 'revoked' ? (
                          <span className="inline-flex items-center gap-1 text-red-400 font-medium text-[11px]">
                            <Ban className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            ملغي
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#a9afaf] text-[11px]">
                            <Circle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            مفعل
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono tabular-nums text-[11px] text-[#a9afaf]">
                        {k.created_at ? new Date(k.created_at).toLocaleDateString('ar-SA') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredKeys.length > PAGE_SIZE && (
          <div className="shrink-0 px-3.5 py-1.5 bg-[#1a1a1a] border-t border-[#333333]/75 flex items-center justify-between gap-2 text-[11px] text-[#a9afaf] font-mono tabular-nums">
            <span>
              عرض {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredKeys.length)} من{' '}
              {filteredKeys.length}
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

import type { FormEvent, MouseEvent } from 'react';
import {
  Ban,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  FileText,
  Key,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import type { GenMode, GenPlan, KeyStatusFilter, LicenseKey } from '../types';

/**
 * KeysTable — أداة التوليد + جدول المفاتيح، JSX منقول verbatim من AdminDashboard.tsx.
 */

interface KeysTableProps {
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
}

export function KeysTable({
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
}: KeysTableProps) {
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div className="space-y-6 relative z-10 tab-content-reveal">
      {/* Key Generator Tool */}
      <div onMouseMove={handleMouseMove} className="spotlight-card p-6 border border-[#2C2C2C] space-y-5">
        <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-4">
          <h3 className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight">
            <Key className="w-4 h-4 text-white" />
            أداة توليد مفاتيح الترخيص السحابية (LICENSE GENERATOR)
          </h3>
          <div className="flex items-center gap-1 bg-[#141414] border border-[#2C2C2C] p-1 rounded-xl font-mono text-xs">
            <button
              onClick={() => onGenModeChange('single')}
              className={`px-3.5 py-1.5 rounded-lg cursor-pointer ${genMode === 'single' ? 'bg-[#3b82f6] text-white font-bold' : 'text-[#9E9E9E]'}`}
            >
              SINGLE KEY
            </button>
            <button
              onClick={() => onGenModeChange('batch')}
              className={`px-3.5 py-1.5 rounded-lg cursor-pointer ${genMode === 'batch' ? 'bg-[#3b82f6] text-white font-bold' : 'text-[#9E9E9E]'}`}
            >
              BATCH KEYS
            </button>
          </div>
        </div>

        {genMode === 'single' ? (
          <form onSubmit={onGenerateKey} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#9E9E9E] block mb-1.5">
                الباقة
              </label>
              <select
                value={genPlan}
                onChange={(e) => onGenPlanChange(e.target.value as GenPlan)}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
              >
                <option value="pro">Pro (احترافي)</option>
                <option value="enterprise">Enterprise (مؤسسات)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#9E9E9E] block mb-1.5">
                مدة الصلاحية
              </label>
              <select
                value={genDuration}
                onChange={(e) => onGenDurationChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
              >
                <option value="1">1 شهر</option>
                <option value="3">3 أشهر</option>
                <option value="6">6 أشهر</option>
                <option value="12">12 شهر (سنة)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#9E9E9E] block mb-1.5">
                بادئة مخصصة
              </label>
              <input
                type="text"
                value={genPrefix}
                onChange={(e) => onGenPrefixChange(e.target.value)}
                placeholder="مثال: STUDIO-VIP"
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              className="py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 magnetic-pill"
            >
              <Plus className="w-4 h-4" />
              GENERATE KEY
            </button>
          </form>
        ) : (
          <form onSubmit={onGenerateBatchKeys} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#9E9E9E] block mb-1.5">
                الباقة
              </label>
              <select
                value={genPlan}
                onChange={(e) => onGenPlanChange(e.target.value as GenPlan)}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
              >
                <option value="pro">Pro (احترافي)</option>
                <option value="enterprise">Enterprise (مؤسسات)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#9E9E9E] block mb-1.5">
                المدة
              </label>
              <select
                value={genDuration}
                onChange={(e) => onGenDurationChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
              >
                <option value="1">1 شهر</option>
                <option value="3">3 أشهر</option>
                <option value="6">6 أشهر</option>
                <option value="12">12 شهر (سنة)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#9E9E9E] block mb-1.5">
                عدد المفاتيح
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={genCount}
                onChange={(e) => onGenCountChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#9E9E9E] block mb-1.5">
                بادئة الموزع
              </label>
              <input
                type="text"
                value={genPrefix}
                onChange={(e) => onGenPrefixChange(e.target.value)}
                placeholder="BULK-RESELLER"
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={generatingBatch}
              className="py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-mono font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 magnetic-pill"
            >
              {generatingBatch ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              GENERATE BATCH
            </button>
          </form>
        )}

        {/* Single Generated Key Preview */}
        {generatedKey && genMode === 'single' && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">KEY GENERATED:</span>
              <code className="text-white text-sm bg-[#141414] px-3 py-1.5 rounded-lg border border-[#2C2C2C]">
                {generatedKey}
              </code>
            </div>
            <button
              onClick={onCopyKey}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer uppercase"
            >
              <Copy className="w-3.5 h-3.5" />
              COPY KEY
            </button>
          </div>
        )}

        {/* Batch Generated Keys Preview */}
        {generatedBatchKeys.length > 0 && genMode === 'batch' && (
          <div className="p-5 bg-[#141414] border border-[#2C2C2C] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                BATCH KEYS GENERATED ({generatedBatchKeys.length})
              </span>
              <div className="flex items-center gap-2 font-mono">
                <button
                  onClick={() => onExportBatch('txt')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                  TXT
                </button>
                <button
                  onClick={() => onExportBatch('csv')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  CSV
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 bg-[#1E1E1E] p-4 rounded-xl border border-[#2C2C2C]">
              {generatedBatchKeys.map((k, i) => (
                <div key={i} className="flex justify-between border-b border-[#2C2C2C]/60 pb-1.5">
                  <span>
                    {i + 1}. {k}
                  </span>
                  <span className="text-emerald-400 font-bold">READY</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Keys Table */}
      <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h4 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
            سجل مفاتيح الترخيص المخزنة في السحابة — المعروض {keysCount} من {totalKeys}
          </h4>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-[#141414] border border-[#2C2C2C] p-1 rounded-xl text-xs font-mono">
              <button
                onClick={() => onKeyStatusFilterChange('all')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${keyStatusFilter === 'all' ? 'bg-[#3b82f6] text-white font-bold' : 'text-[#9E9E9E]'}`}
              >
                ALL
              </button>
              <button
                onClick={() => onKeyStatusFilterChange('unused')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${keyStatusFilter === 'unused' ? 'bg-emerald-500 text-black font-bold' : 'text-[#9E9E9E]'}`}
              >
                UNUSED
              </button>
              <button
                onClick={() => onKeyStatusFilterChange('used')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${keyStatusFilter === 'used' ? 'bg-white/10 text-white' : 'text-[#9E9E9E]'}`}
              >
                USED
              </button>
              <button
                onClick={() => onKeyStatusFilterChange('revoked')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${keyStatusFilter === 'revoked' ? 'bg-rose-600 text-white font-bold' : 'text-[#9E9E9E]'}`}
              >
                REVOKED
              </button>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-[#9E9E9E]" />
              <input
                type="text"
                value={keySearchQuery}
                onChange={(e) => onKeySearchChange(e.target.value)}
                placeholder="ابحث بالمفتاح..."
                className="w-full pr-8 pl-3 py-1.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="sticky top-0 z-10 bg-[#141414] text-[#9E9E9E] font-mono text-[11px] uppercase tracking-wider border-b border-[#2C2C2C]">
              <tr>
                <th className="p-3.5">مفتاح الترخيص</th>
                <th className="p-3.5">الباقة</th>
                <th className="p-3.5">مدة الصلاحية</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">تاريخ التوليد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C2C2C]/70 font-mono">
              {filteredKeys.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-[#9E9E9E] font-mono">
                    لا توجد مفاتيح مطابقة للمرشحات الحالية.
                  </td>
                </tr>
              )}
              {filteredKeys.map((k) => (
                <tr key={k.key} className="hover:bg-white/5 transition-colors">
                  <td className="p-3.5">
                    <code className="inline-block px-2 py-1 rounded-md bg-[#141414] border border-[#2C2C2C] text-[10px] text-white whitespace-nowrap">
                      {k.key}
                    </code>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                      {k.plan}
                    </span>
                  </td>
                  <td className="p-3.5">{k.duration_months} M</td>
                  <td className="p-3.5">
                    {k.status === 'unused' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        UNUSED
                      </span>
                    ) : k.status === 'revoked' ? (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                        <Ban className="w-3 h-3 shrink-0" />
                        REVOKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#9E9E9E]">
                        <Circle className="w-3 h-3 shrink-0" />
                        ACTIVATED
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-[#9E9E9E]">
                    {k.created_at ? new Date(k.created_at).toLocaleDateString('ar-SA') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

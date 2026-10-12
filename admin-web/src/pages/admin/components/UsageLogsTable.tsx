import { Wand2 } from 'lucide-react';
import type { AiUsageRecord } from '../types';

/**
 * UsageLogsTable — تبويب سجل AI، JSX منقول verbatim من AdminDashboard.tsx.
 */

interface UsageLogsTableProps {
  aiUsageLogs: AiUsageRecord[];
  totalAiRuns: number;
}

export function UsageLogsTable({ aiUsageLogs, totalAiRuns }: UsageLogsTableProps) {
  return (
    <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-2xl overflow-hidden p-5 space-y-4 relative z-10 tab-content-reveal">
      <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-4">
        <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" />
          سجل عمليات الترميم ومعالجة الذكاء الاصطناعي (AI USAGE LOGS)
        </h3>
        <span className="text-xs text-[#9E9E9E] font-mono">
          TOTAL RUNS: {totalAiRuns} · المعروض: {aiUsageLogs.length}
        </span>
      </div>

      <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
        <table className="w-full text-right text-xs text-slate-300">
          <thead className="bg-[#141414] text-[#9E9E9E] font-mono text-[11px] uppercase tracking-wider border-b border-[#2C2C2C]">
            <tr>
              <th className="p-3.5">معرف المستخدم</th>
              <th className="p-3.5">تاريخ التنفيذ</th>
              <th className="p-3.5">حجم الصورة</th>
              <th className="p-3.5">مدة المعالجة</th>
              <th className="p-3.5">التكلفة التقديرية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C2C2C]/70 font-mono text-[11px]">
            {aiUsageLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[#9E9E9E] font-mono">
                  لا توجد عمليات مسجّلة حتى الآن.
                </td>
              </tr>
            )}
            {aiUsageLogs.map((log) => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="p-3.5 text-slate-300">
                  <span className="inline-block max-w-[220px] truncate align-middle" title={log.user_id}>
                    {log.user_id}
                  </span>
                </td>
                <td className="p-3.5 text-[#9E9E9E]">{new Date(log.used_at).toLocaleString('ar-SA')}</td>
                <td className="p-3.5">{((log.image_bytes || 0) / 1024 / 1024).toFixed(2)} MB</td>
                <td className="p-3.5">{(log.execution_seconds || 1.2).toFixed(1)}s</td>
                <td className="p-3.5 text-emerald-400">${(log.cost_usd || 0.012).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useMemo, useRef } from 'react';
import { Calendar, Cpu, KeyRound, ShieldAlert, ShieldCheck, Sliders, X } from 'lucide-react';
import { AccessibleDialog } from '../../../components/common/accessible-dialog';
import { useFeedback } from '../../../components/common/FeedbackProvider';
import {
  getUserAccountState,
  getUserDaysRemaining,
  resolveAiCostUsd,
} from '../../../lib/admin-utils';
import type { AiUsageRecord, UserProfile } from '../types';
import { AccountStateBadge, CopyButton, PlanBadge } from './admin-badges';

interface UserDetailsDrawerProps {
  user: UserProfile | null;
  aiUsageLogs: AiUsageRecord[];
  onClose: () => void;
  onOpenEditUser: (user: UserProfile) => void;
  extendingUserId?: string | null;
  onExtendLicense: (id: string, months: number) => void;
  onRevokeLicense: (id: string) => void;
  onToggleBanUser: (user: UserProfile) => void;
}

function formatArabicDateTime(iso?: string | null): string {
  if (!iso) return 'غير محدد';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** لوحة تفاصيل جانبية للمستخدم لعرض الترخيص وسجل الذكاء الاصطناعي وإجراءات الإدارة السريعة. */
export function UserDetailsDrawer({
  user,
  aiUsageLogs,
  onClose,
  onOpenEditUser,
  extendingUserId = null,
  onExtendLicense,
  onRevokeLicense,
  onToggleBanUser,
}: UserDetailsDrawerProps) {
  const { notify } = useFeedback();
  const closeRef = useRef<HTMLButtonElement>(null);

  const userLogs = useMemo(() => {
    if (!user) return [];
    return aiUsageLogs
      .filter((log) => log.user_id === user.id)
      .sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime());
  }, [aiUsageLogs, user]);

  const usageSummary = useMemo(() => {
    let totalBytes = 0;
    let totalCost = 0;
    for (const log of userLogs) {
      totalBytes += Number.isFinite(log.image_bytes) && log.image_bytes > 0 ? log.image_bytes : 0;
      totalCost += resolveAiCostUsd(log.cost_usd);
    }
    return {
      runs: userLogs.length,
      totalMb: totalBytes / (1024 * 1024),
      totalCost,
    };
  }, [userLogs]);

  if (!user) return null;

  const accountState = getUserAccountState(user);
  const daysRemaining = getUserDaysRemaining(user.expires_at);
  const isBanned = user.status === 'banned';
  const initials = (user.name || user.email || 'U').trim().slice(0, 2).toUpperCase();

  return (
    <AccessibleDialog
      open={Boolean(user)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      variant="drawer"
      initialFocusRef={closeRef}
      overlayClassName="fixed inset-0 z-(--z-dialog) bg-black/70 backdrop-blur-[2px]"
      contentClassName="admin-dialog-surface z-(--z-dialog) border-s border-[#333333] rounded-none bg-[#202020] text-[#f5f5f5] shadow-2xl flex flex-col"
      headerClassName="px-5 py-4 bg-[#1a1a1a] border-b border-[#333333]/80 flex items-center justify-between gap-3 sticky top-0 z-10"
      title={
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-[#2563eb]/20 border border-[#3b82f6]/35 flex items-center justify-center text-xs font-semibold text-[#93c5fd] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#f5f5f5] truncate">
              {user.name || 'بدون اسم'}
            </h2>
            <p className="text-[11px] font-mono text-[#a9afaf] truncate" dir="ltr">
              {user.email || '—'}
            </p>
          </div>
        </div>
      }
      closeButton={
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="إغلاق لوحة التفاصيل"
          className="w-8 h-8 rounded-sm border border-[#454545] bg-[#171717] hover:bg-white/[0.08] text-[#a9afaf] hover:text-[#f5f5f5] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      }
    >
      <div className="p-5 space-y-5 flex-1">
        {/* Status & Plan Strip */}
        <div className="admin-card-inset p-3.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <PlanBadge plan={user.plan} />
            <AccountStateBadge state={accountState} />
          </div>
          <div className="text-[11px] font-mono tabular-nums text-[#a9afaf]">
            {daysRemaining === null ? (
              <span>بدون تاريخ انتهاء</span>
            ) : daysRemaining <= 0 ? (
              <span className="text-amber-300">منتهي منذ {Math.abs(daysRemaining)} يوم</span>
            ) : (
              <span className="text-emerald-300">متبقي {daysRemaining} يوم</span>
            )}
          </div>
        </div>

        {/* Account & License Metadata */}
        <section className="space-y-2.5" aria-label="بيانات الترخيص والحساب">
          <h3 className="text-xs font-semibold text-[#c9cfcf] flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#3b82f6]" aria-hidden="true" />
            معلومات الحساب والترخيص
          </h3>

          <div className="admin-card-inset divide-y divide-[#333333]/65 text-xs">
            <div className="p-3 flex items-center justify-between gap-2">
              <span className="text-[#a9afaf]">المعرّف (UUID)</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <code className="text-[11px] font-mono text-[#c9cfcf] truncate max-w-44" dir="ltr">
                  {user.id}
                </code>
                <CopyButton
                  value={user.id}
                  label="نسخ معرف المستخدم"
                  onCopied={() => notify('تم نسخ معرف المستخدم.', 'info')}
                />
              </div>
            </div>

            <div className="p-3 flex items-center justify-between gap-2">
              <span className="text-[#a9afaf]">مفتاح الترخيص</span>
              {user.license_key ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <code className="text-[11px] font-mono text-[#93c5fd] truncate max-w-44" dir="ltr">
                    {user.license_key}
                  </code>
                  <CopyButton
                    value={user.license_key}
                    label="نسخ مفتاح الترخيص"
                    onCopied={() => notify('تم نسخ مفتاح الترخيص.', 'info')}
                  />
                </div>
              ) : (
                <span className="text-[#a9afaf] text-[11px]">غير مرتبط بمفتاح</span>
              )}
            </div>

            <div className="p-3 grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <div className="text-[#a9afaf] mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  تاريخ التسجيل
                </div>
                <div className="font-mono tabular-nums text-[#f5f5f5]">
                  {formatArabicDateTime(user.created_at)}
                </div>
              </div>
              <div>
                <div className="text-[#a9afaf] mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  انتهاء الصلاحية
                </div>
                <div className="font-mono tabular-nums text-[#f5f5f5]">
                  {formatArabicDateTime(user.expires_at)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Operations */}
        <section className="space-y-2.5" aria-label="إجراءات إدارة سريعة">
          <h3 className="text-xs font-semibold text-[#c9cfcf]">إجراءات الحساب</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditUser(user);
              }}
              className="admin-btn-primary h-8 px-3 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              تعديل الحساب
            </button>
            <button
              type="button"
              disabled={extendingUserId === user.id}
              onClick={() => onExtendLicense(user.id, 1)}
              className="admin-btn-secondary h-8 px-3 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              تمديد +1 شهر
            </button>
            {user.plan !== 'free' && (
              <button
                type="button"
                onClick={() => onRevokeLicense(user.id)}
                className="h-8 px-3 rounded-sm border border-amber-500/35 bg-amber-500/12 hover:bg-amber-500/20 text-amber-300 text-xs font-medium cursor-pointer transition-colors"
              >
                سحب الترخيص
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleBanUser(user)}
              className={`h-8 px-3 rounded-sm border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                user.plan === 'free' ? 'col-span-2' : ''
              } ${
                isBanned
                  ? 'border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-300'
                  : 'border-red-500/35 bg-red-500/12 hover:bg-red-500/20 text-red-300'
              }`}
            >
              {isBanned ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  إلغاء الحظر
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                  حظر الحساب
                </>
              )}
            </button>
          </div>
        </section>

        {/* Per-User AI Telemetry History */}
        <section className="space-y-2.5" aria-label="سجل معالجة الذكاء الاصطناعي للمستخدم">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[#c9cfcf] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#3b82f6]" aria-hidden="true" />
              سجل المعالجة السحابية (AI)
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-[#a9afaf]">
              {usageSummary.runs} عملية
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="admin-card-inset p-2.5 text-center">
              <div className="text-[10px] text-[#a9afaf]">العمليات</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-[#f5f5f5]">
                {usageSummary.runs}
              </div>
            </div>
            <div className="admin-card-inset p-2.5 text-center">
              <div className="text-[10px] text-[#a9afaf]">الحجم المعالج</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-[#f5f5f5]">
                {usageSummary.totalMb.toFixed(1)} MB
              </div>
            </div>
            <div className="admin-card-inset p-2.5 text-center">
              <div className="text-[10px] text-[#a9afaf]">التكلفة</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-emerald-300">
                ${usageSummary.totalCost.toFixed(3)}
              </div>
            </div>
          </div>

          {userLogs.length === 0 ? (
            <div className="admin-card-inset p-4 text-center text-xs text-[#a9afaf]">
              لا توجد عمليات معالجة AI مسجلة لهذا المستخدم ضمن العينة الحالية.
            </div>
          ) : (
            <div className="admin-card-inset divide-y divide-[#333333]/65 max-h-60 overflow-y-auto">
              {userLogs.slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
                >
                  <span className="text-[#a9afaf]">
                    {new Date(log.used_at).toLocaleString('ar-SA')}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[#c9cfcf]">
                      {((log.image_bytes || 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <span className="text-[#a9afaf]">{log.execution_seconds || 0}s</span>
                    <span className="text-emerald-300">
                      ${resolveAiCostUsd(log.cost_usd).toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AccessibleDialog>
  );
}

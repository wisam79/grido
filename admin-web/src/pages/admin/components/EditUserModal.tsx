import { useId, useRef, useState, type FormEvent } from 'react';
import { Loader2, Sliders, UserCheck, X } from 'lucide-react';
import { AccessibleDialog } from '../../../components/common/accessible-dialog';
import type { UserProfile } from '../types';

interface EditUserModalProps {
  editModalUser: UserProfile | null;
  editName: string;
  editEmail: string;
  editPlan: string;
  editStatus: string;
  editExpiresAt: string;
  savingUser: boolean;
  onClose: () => void;
  onNameChange: (v: string) => void;
  onPlanChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onExpiresChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

/** Accessible admin form; persistence and operation ownership remain with the caller. */
export function EditUserModal({
  editModalUser, editName, editEmail, editPlan, editStatus, editExpiresAt,
  savingUser, onClose, onNameChange, onPlanChange, onStatusChange,
  onExpiresChange, onSubmit,
}: EditUserModalProps) {
  const id = useId();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<{ userId: string; field: string; message: string } | null>(null);
  const currentError = error?.userId === editModalUser?.id ? error : null;
  const fieldProps = (field: string) => ({
    id: `${id}-${field}`,
    'aria-invalid': currentError?.field === field ? true : undefined,
    'aria-describedby': currentError?.field === field ? `${id}-error` : undefined,
  });
  const close = () => { if (!savingUser) { setError(null); onClose(); } };

  return (
    <AccessibleDialog
      open={editModalUser !== null}
      onOpenChange={(open) => { if (!open) close(); }}
      busy={savingUser}
      initialFocusRef={nameRef}
      overlayClassName="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-(--z-dialog) animate-fadeIn"
      contentClassName="admin-dialog-surface z-(--z-dialog) max-w-lg bg-[#202020] border border-[#333333] rounded-[10px] shadow-2xl p-5 space-y-4"
      headerClassName="flex items-center justify-between border-b border-[#333333]/75 pb-3.5"
      title={<h3 className="font-semibold text-[#f5f5f5] text-sm flex items-center gap-2 tracking-tight"><Sliders className="w-4 h-4 text-[#3b82f6]" aria-hidden="true" />تعديل حساب: {editModalUser?.email}</h3>}
      closeButton={<button type="button" onClick={close} disabled={savingUser} aria-label="إغلاق النافذة" className={`p-1 text-[#a9afaf] hover:text-[#f5f5f5] rounded-sm cursor-pointer disabled:opacity-50 ${FOCUS_RING}`}><X className="w-4 h-4" aria-hidden="true" /></button>}
    >
      <form
        onSubmit={(event) => {
          if (savingUser) { event.preventDefault(); return; }
          setError(null);
          onSubmit(event);
        }}
        onInvalidCapture={(event) => {
          const input = event.target;
          if (input instanceof HTMLInputElement && editModalUser) {
            setError({ userId: editModalUser.id, field: input.id.slice(id.length + 1), message: input.validationMessage });
          }
        }}
        onChange={() => setError(null)}
        aria-busy={savingUser || undefined}
        className="space-y-4 font-sans"
      >
        <div>
          <label htmlFor={`${id}-name`} className="text-xs text-[#c9cfcf] font-medium block mb-1.5">الاسم الكامل</label>
          <input {...fieldProps('name')} ref={nameRef} type="text" disabled={savingUser} value={editName} onChange={(event) => onNameChange(event.target.value)} className={`w-full h-8 px-3 bg-[#171717] border border-[#454545] rounded-[4px] text-xs text-[#f5f5f5] disabled:opacity-50 ${FOCUS_RING}`} />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="text-xs text-[#c9cfcf] font-medium block mb-1.5">البريد الإلكتروني</label>
          <input {...fieldProps('email')} type="email" dir="ltr" disabled value={editEmail} className="w-full h-8 px-3 bg-[#171717]/60 border border-[#333333] rounded-[4px] text-xs text-[#a9afaf] cursor-not-allowed font-mono" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-plan`} className="text-xs text-[#c9cfcf] font-medium block mb-1.5">الباقة المستهدفة</label>
            <select {...fieldProps('plan')} disabled={savingUser} value={editPlan} onChange={(event) => onPlanChange(event.target.value)} className={`w-full h-8 px-2.5 bg-[#171717] border border-[#454545] rounded-[4px] text-xs text-[#f5f5f5] font-sans disabled:opacity-50 ${FOCUS_RING}`}>
              <option value="free">مجاني (Free)</option><option value="trial">تجريبي (Trial)</option><option value="pro">احترافي (Pro)</option><option value="enterprise">مؤسسات (Enterprise)</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-status`} className="text-xs text-[#c9cfcf] font-medium block mb-1.5">حالة الحساب</label>
            <select {...fieldProps('status')} disabled={savingUser} value={editStatus} onChange={(event) => onStatusChange(event.target.value)} className={`w-full h-8 px-2.5 bg-[#171717] border border-[#454545] rounded-[4px] text-xs text-[#f5f5f5] font-sans disabled:opacity-50 ${FOCUS_RING}`}>
              <option value="active">نشط</option><option value="expired">منتهي</option><option value="banned">محظور</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-expires`} className="text-xs text-[#c9cfcf] font-medium block mb-1.5">تاريخ انتهاء الصلاحية</label>
          <input {...fieldProps('expires')} type="date" disabled={savingUser} value={editExpiresAt} onChange={(event) => onExpiresChange(event.target.value)} className={`w-full h-8 px-3 bg-[#171717] border border-[#454545] rounded-[4px] text-xs text-[#f5f5f5] font-mono disabled:opacity-50 ${FOCUS_RING}`} />
        </div>
        {currentError && <p id={`${id}-error`} role="alert" className="text-xs text-red-400">{currentError.message}</p>}
        <div className="flex items-center justify-end gap-2 pt-3.5 border-t border-[#333333]/75">
          <button type="button" onClick={close} disabled={savingUser} className={`h-8 px-3.5 bg-[#171717] border border-[#454545] text-[#f5f5f5] rounded-[4px] text-xs font-sans hover:bg-white/[0.08] cursor-pointer font-medium disabled:opacity-50 ${FOCUS_RING}`}>إلغاء</button>
          <button type="submit" disabled={savingUser} className={`h-8 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[4px] text-xs font-sans font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${FOCUS_RING}`}>
            {savingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" aria-hidden="true" /> : <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />}<span>حفظ التعديلات</span>
          </button>
        </div>
      </form>
    </AccessibleDialog>
  );
}

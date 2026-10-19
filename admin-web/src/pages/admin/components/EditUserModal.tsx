import { useEffect, type FormEvent } from 'react';
import { Loader2, Sliders, UserCheck, X } from 'lucide-react';
import type { UserProfile } from '../types';

/**
 * EditUserModal — نافذة تعديل المستخدم، JSX منقول verbatim من AdminDashboard.tsx.
 */

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

export function EditUserModal({
  editModalUser,
  editName,
  editEmail,
  editPlan,
  editStatus,
  editExpiresAt,
  savingUser,
  onClose,
  onNameChange,
  onPlanChange,
  onStatusChange,
  onExpiresChange,
  onSubmit,
}: EditUserModalProps) {
  useEffect(() => {
    if (!editModalUser) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editModalUser, onClose]);

  if (!editModalUser) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full max-w-lg bg-[#1E1E1E] border border-[#2C2C2C] rounded-2xl shadow-2xl p-6 space-y-5 relative">
        <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-4">
          <h3
            id="edit-user-modal-title"
            className="font-bold text-white text-sm font-display flex items-center gap-2 tracking-tight"
          >
            <Sliders className="w-4 h-4 text-white" />
            تعديل حساب: {editModalUser.email}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="p-1 text-[#9E9E9E] hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 font-sans">
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">الاسم الكامل</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              disabled
              value={editEmail}
              className="w-full px-3.5 py-2.5 bg-[#141414]/60 border border-[#2C2C2C] rounded-xl text-xs text-[#9E9E9E] cursor-not-allowed font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">الباقة المستهدفة</label>
              <select
                value={editPlan}
                onChange={(e) => onPlanChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-sans"
              >
                <option value="free">مجاني (Free)</option>
                <option value="pro">احترافي (Pro)</option>
                <option value="enterprise">مؤسسات (Enterprise)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">حالة الحساب</label>
              <select
                value={editStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-sans"
              >
                <option value="active">نشط</option>
                <option value="expired">منتهي</option>
                <option value="banned">محظور</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              تاريخ انتهاء الصلاحية
            </label>
            <input
              type="date"
              value={editExpiresAt}
              onChange={(e) => onExpiresChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#2C2C2C] rounded-xl text-xs text-white font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2C2C2C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/10 text-slate-300 rounded-xl text-xs font-sans hover:bg-white/20 cursor-pointer font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={savingUser}
              className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl text-xs font-sans font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 magnetic-pill"
            >
              {savingUser ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

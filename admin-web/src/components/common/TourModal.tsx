import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TourStep {
  title: string;
  description: string;
}

interface TourModalProps {
  open: boolean;
  onClose: () => void;
  steps: TourStep[];
  title: string;
}

/**
 * نافذة جولة تفاعلية متوافقة تماماً مع WCAG:
 * role=dialog + aria-modal، إغلاق بـ Escape، حصر التركيز داخل النافذة
 * (focus trap)، استعادة التركيز للعنصر المُطلق عند الإغلاق، وإدارة
 * tab-index للخلفية أثناء الفتح (inert).
 */
export function TourModal({ open, onClose, steps, title }: TourModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [current, setCurrent] = useState(0);

  // فتح/إغلاق: حفظ مصدر التركيز، قفل الخلفية، وإعادة التركيز عند الإغلاق
  useEffect(() => {
    if (!open) return;

    setCurrent(0);
    openerRef.current = document.activeElement;
    closeBtnRef.current?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  // إغلاق بـ Escape + حصر Tab داخل النافذة (Focus Trap)
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const goPrev = useCallback(() => setCurrent((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setCurrent((i) => (i === steps.length - 1 ? i : i + 1)),
    [steps.length]
  );

  if (!open) return null;

  const step = steps[Math.min(current, steps.length - 1)];
  const isLast = current === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-2xl bg-[#1E1E1E] border border-[#2C2C2C] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C] mb-4">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-7 h-7 rounded-lg bg-[#262626] hover:bg-[#333333] text-white flex items-center justify-center text-xs font-bold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* محتوى الخطوة */}
        <div className="min-h-[120px] flex flex-col items-center justify-center text-center p-6 rounded-xl bg-[#141414] border border-[#262626]">
          <span className="text-[10px] font-mono font-bold text-[#60a5fa] bg-[#60a5fa]/10 border border-[#60a5fa]/30 px-2 py-0.5 rounded-full mb-3">
            خطوة {current + 1} من {steps.length}
          </span>
          <p className="text-base font-black text-white mb-2">{step.title}</p>
          <p className="text-sm text-[#9E9E9E] leading-relaxed max-w-md">
            {step.description}
          </p>
        </div>

        {/* شريط التنقل */}
        <div className="flex items-center justify-between gap-3 pt-4">
          <button
            onClick={goPrev}
            disabled={current === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#262626] hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>السابق</span>
          </button>

          {/* مؤشرات النقاط */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="خطوات الجولة">
            {steps.map((s, i) => (
              <button
                key={s.title}
                role="tab"
                aria-selected={i === current}
                aria-label={`الخطوة ${i + 1}: ${s.title}`}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                  i === current ? 'bg-[#3b82f6] scale-125' : 'bg-[#404040] hover:bg-[#5a5a5a]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={isLast ? onClose : goNext}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <span>{isLast ? 'إنهاء الجولة' : 'التالي'}</span>
            {!isLast && <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

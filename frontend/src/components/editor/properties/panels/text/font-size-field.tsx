import React, { useEffect, useRef, useState } from 'react';

import { Minus, Plus } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

import { FONT_SIZE_MAX, FONT_SIZE_MIN, clampFontSize, nextFontSizeStep } from './font-size-utils';

function parseSize(raw: string): number | null {
  const normalized = raw
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? clampFontSize(parsed) : null;
}

const stepButtonClassName =
  'h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground cursor-pointer disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * حقل حجم الخط: كتابة أي قيمة (6–500) + قفز بين درجات السلم.
 * الكتابة لا تُطبَّق لكل حرف — فقط عند Enter أو الخروج من الحقل.
 */
export const FontSizeField = React.memo(function FontSizeField({
  value,
  onCommit,
  className,
}: {
  value: number;
  onCommit: (size: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setDraft(String(value));
  }, [value]);

  const apply = (next: number | null) => {
    if (next === null || next === value) {
      setDraft(String(value));
      return;
    }
    setDraft(String(next));
    onCommit(next);
  };

  return (
    <div
      dir="ltr"
      className={cn(
        'flex h-8 items-center gap-0.5 rounded-md border border-border/60 bg-background p-0.5 focus-within:border-primary/60',
        className,
      )}
    >
      <button
        type="button"
        className={stepButtonClassName}
        onClick={() => apply(nextFontSizeStep(value, -1))}
        disabled={value <= FONT_SIZE_MIN}
        aria-label="تصغير الخط"
        title="تصغير"
      >
        <Minus className="w-3 h-3" weight="bold" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label="حجم الخط"
        value={draft}
        onFocus={(event) => {
          editingRef.current = true;
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          editingRef.current = false;
          apply(parseSize(draft));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            apply(parseSize(draft));
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(String(value));
            editingRef.current = false;
            event.currentTarget.blur();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            apply(clampFontSize(value + (event.key === 'ArrowUp' ? 1 : -1)));
          }
        }}
        className="h-7 min-w-0 flex-1 bg-transparent text-center text-xs font-semibold tabular-nums text-foreground outline-none"
      />
      <button
        type="button"
        className={stepButtonClassName}
        onClick={() => apply(nextFontSizeStep(value, 1))}
        disabled={value >= FONT_SIZE_MAX}
        aria-label="تكبير الخط"
        title="تكبير"
      >
        <Plus className="w-3 h-3" weight="bold" />
      </button>
    </div>
  );
});

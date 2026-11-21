import React, { useEffect, useRef, useState } from 'react';

import { Minus, Plus } from '@/components/ui/icons';
import { getDocumentSession } from '@/lib/io/document-session';
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
  'h-6.5 w-6.5 shrink-0 inline-flex items-center justify-center rounded-sm border border-border/70 bg-card text-muted-foreground shadow-2xs transition-colors duration-150 hover:bg-accent hover:text-foreground cursor-pointer disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10';

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
  const skipBlurCommitRef = useRef(false);
  const dirtyRef = useRef(false);
  const sessionRef = useRef(getDocumentSession());

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

  const commitDraft = () => {
    const ownsDraft = dirtyRef.current && sessionRef.current === getDocumentSession();
    dirtyRef.current = false;
    if (ownsDraft) apply(parseSize(draft));
    else setDraft(String(value));
  };

  return (
    <div
      dir="ltr"
      className={cn(
        'flex h-8 items-center gap-0.5 rounded-md border border-border/70 bg-muted p-0.5 focus-within:border-ring',
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
          skipBlurCommitRef.current = false;
          dirtyRef.current = false;
          sessionRef.current = getDocumentSession();
          setDraft(String(value));
          editingRef.current = true;
          event.currentTarget.select();
        }}
        onChange={(event) => {
          dirtyRef.current = true;
          setDraft(event.target.value);
        }}
        onBlur={() => {
          editingRef.current = false;
          if (skipBlurCommitRef.current) {
            skipBlurCommitRef.current = false;
            return;
          }
          commitDraft();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            skipBlurCommitRef.current = true;
            editingRef.current = false;
            commitDraft();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            skipBlurCommitRef.current = true;
            dirtyRef.current = false;
            setDraft(String(value));
            editingRef.current = false;
            event.currentTarget.blur();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            dirtyRef.current = false;
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

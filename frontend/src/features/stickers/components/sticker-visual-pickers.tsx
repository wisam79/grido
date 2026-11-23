import React, { useMemo, useState } from 'react';

import { MagnifyingGlass } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { FOCUS_RING } from '@/lib/ui/ui-compliance';
import { cn, sanitizeSvgMarkupCached } from '@/lib/utils';

import { getComposerIconById, renderComposerIconPreviewSvg } from '../lib/composer-icons';
import { renderStampShapeThumbnailSvg, type StampShapeId } from '../lib/stamp-composer-v2';
import { normalizeArabicQuery } from '../lib/sticker-text';

import type { StickerField } from '../types';

interface VisualFieldPickerProps {
  field: StickerField;
  value: string;
  onChange: (value: string) => void;
}

/** شبكة اختيار بصرية لأشكال الختم الثمانية باستخدام مصغّرات SVG حقيقية. */
export const ShapeGridPicker = React.memo(function ShapeGridPicker({
  field,
  value,
  onChange,
}: VisualFieldPickerProps) {
  const options = field.options ?? [];
  return (
    <div
      id={`sticker-field-${field.id}`}
      role="group"
      aria-label={field.label}
      className="grid grid-cols-4 gap-1"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        const thumb = renderStampShapeThumbnailSvg(opt.value as StampShapeId);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-7 px-1.5 rounded-md border flex items-center justify-center gap-1 text-micro font-semibold truncate transition-colors cursor-pointer',
              FOCUS_RING,
              selected
                ? 'bg-primary-action hover:bg-primary-action-hover text-primary-foreground border-primary shadow-2xs'
                : 'bg-background/70 hover:bg-accent border-border/50 text-foreground/85',
            )}
          >
            <span
              className="size-3.5 shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkupCached(thumb) }}
            />
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
});

/** شبكة اختيار بصرية للأيقونات المتجهية مع تصفية عربية فورية. */
export const IconGridPicker = React.memo(function IconGridPicker({
  field,
  value,
  onChange,
}: VisualFieldPickerProps) {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const options = field.options ?? [];
    const nq = normalizeArabicQuery(query);
    const qLower = query.trim().toLowerCase();
    if (!nq && !qLower) return options;

    return options.filter((opt) => {
      if (normalizeArabicQuery(opt.label).includes(nq)) return true;
      if (qLower && opt.value.toLowerCase().includes(qLower)) return true;
      const spec = getComposerIconById(opt.value);
      return Boolean(spec?.keywords?.some((kw) => normalizeArabicQuery(kw).includes(nq)));
    });
  }, [field.options, query]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <MagnifyingGlass className="w-3.5 h-3.5 text-muted-foreground absolute start-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="تصفية الأيقونات..."
          aria-label="تصفية الأيقونات"
          className="h-7 ps-7 pe-2 text-mini rounded-md bg-background/80 border-border/50"
        />
      </div>
      <div
        id={`sticker-field-${field.id}`}
        role="group"
        aria-label={field.label}
        className="grid grid-cols-6 gap-1 max-h-36 overflow-y-auto p-1 rounded-md border border-border/50 bg-background/50"
      >
        {filteredOptions.length === 0 ? (
          <p className="col-span-6 py-3 text-center text-mini text-muted-foreground">
            لا توجد أيقونات مطابقة
          </p>
        ) : (
          filteredOptions.map((opt) => {
            const selected = value === opt.value;
            const previewSvg = renderComposerIconPreviewSvg(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.label}
                aria-label={opt.label}
                aria-pressed={selected}
                onClick={() => onChange(opt.value)}
                className={cn(
                  'h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer',
                  FOCUS_RING,
                  selected
                    ? 'bg-primary-action hover:bg-primary-action-hover text-primary-foreground border-primary shadow-2xs'
                    : 'bg-background/80 hover:bg-accent border-border/40 text-foreground/85',
                )}
              >
                <span
                  className="size-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkupCached(previewSvg) }}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

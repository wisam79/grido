import React, { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { FontSelector } from '@/components/ui/font-selector';

import { loadStickerFont } from '../lib/sticker-font-embed';

import type { FontOption } from '@/lib/io/fonts';

const DEFAULT_WEIGHTS = [400] as const;
const cleanFamily = (family: string) => family.split(',')[0].trim().replace(/['"]/g, '');

export interface StickerFontSelectorProps {
  value?: string;
  fontWeights?: readonly number[];
  onChange: (fontFamily: string) => void;
  /** المعاينة لا تكتب في معاملات الحفظ أو سجل التراجع. */
  onPreview?: (fontFamily: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const StickerFontSelector = React.memo(function StickerFontSelector({
  value = 'Cairo',
  fontWeights = DEFAULT_WEIGHTS,
  onChange,
  onPreview,
  onCancel,
  className,
}: StickerFontSelectorProps) {
  const generationRef = useRef(0);
  const previewedRef = useRef(false);
  const onCancelRef = useRef(onCancel);
  const weightsKey = fontWeights.join(',');

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const cancelPreview = useCallback(() => {
    generationRef.current += 1;
    if (!previewedRef.current) return;
    previewedRef.current = false;
    onCancelRef.current?.();
  }, []);

  // تغيير القيمة من Undo/قالب محفوظ، أو إزالة المنتقي، يبطل التحميل القديم.
  useEffect(() => cancelPreview, [value, weightsKey, cancelPreview]);

  const applyFont = async (font: FontOption, commit: boolean) => {
    const generation = ++generationRef.current;
    const family = cleanFamily(font.family);
    if (family.toLowerCase() === cleanFamily(value).toLowerCase()) {
      cancelPreview();
      return;
    }
    const loaded = await loadStickerFont(family, fontWeights);
    if (generation !== generationRef.current) return;
    if (!loaded) {
      cancelPreview();
      if (commit) toast.error('تعذر تحميل الخط');
      return;
    }
    if (commit) {
      cancelPreview();
      onChange(family);
    } else {
      previewedRef.current = true;
      onPreview?.(family);
    }
  };

  return (
    <FontSelector
      value={value}
      className={className}
      onOpen={cancelPreview}
      onPreview={(font) => void applyFont(font, false)}
      onCancel={cancelPreview}
      onChange={(font) => void applyFont(font, true)}
    />
  );
});

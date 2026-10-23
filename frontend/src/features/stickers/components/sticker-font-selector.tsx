import React from 'react';

import { FontSelector } from '@/components/ui/font-selector';

export interface StickerFontSelectorProps {
  value?: string;
  onChange: (fontFamily: string) => void;
  className?: string;
}

export const StickerFontSelector = React.memo(function StickerFontSelector({
  value = 'Cairo',
  onChange,
  className,
}: StickerFontSelectorProps) {
  return (
    <FontSelector
      value={value}
      className={className}
      onChange={(font) => onChange(font.family.split(',')[0].trim().replace(/['"]/g, ''))}
    />
  );
});

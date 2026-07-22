import React from "react";
import { Label } from "@/components/ui/label";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { ARABIC_FONTS, loadGoogleFont } from "@/lib/fonts";

interface TextFontSelectorProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export const TextFontSelector = React.memo(function TextFontSelector({
  element,
  onUpdate,
}: TextFontSelectorProps) {
  const currentFont = element.fontFamily || ARABIC_FONTS[0].family;

  return (
    <div className="space-y-1 font-cairo">
      <Label className="text-[10px] text-muted-foreground font-semibold">نوع الخط العربي/اللاتيني</Label>
      <select
        value={currentFont}
        onChange={(e) => {
          const selectedFamily = e.target.value;
          loadGoogleFont(selectedFamily);
          onUpdate(element.id, { fontFamily: selectedFamily });
          useEditorStore.getState().pushHistory();
        }}
        className="w-full bg-background border border-border/60 rounded-lg p-2 text-xs text-foreground font-bold focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer shadow-2xs transition-all hover:border-primary/40"
      >
        {ARABIC_FONTS.map((font) => (
          <option key={font.id} value={font.family} style={{ fontFamily: font.family }}>
            {font.name}
          </option>
        ))}
      </select>
    </div>
  );
});

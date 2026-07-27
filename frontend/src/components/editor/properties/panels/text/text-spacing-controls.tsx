import React from "react";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { SliderControl } from "../../shared-controls";

interface TextSpacingControlsProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export const TextSpacingControls = React.memo(function TextSpacingControls({
  element,
  onUpdate,
}: TextSpacingControlsProps) {
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(element.text || "");

  return (
    <div className="space-y-3 pt-1 border-t border-border/20 font-cairo">
      {/* تباعد الأسطر (Line Height) */}
      <SliderControl
        label="تباعد الأسطر"
        value={element.lineHeight ?? 1.2}
        min={0.8}
        max={3.0}
        step={0.1}
        unit=""
        onChange={(v: number) => onUpdate(element.id, { lineHeight: v })}
        onCommit={() => useEditorStore.getState().pushHistory()}
      />

      {/* تباعد الكلمات/الحروف الذكي (Smart Word/Letter Spacing) */}
      <SliderControl
        label={isArabic ? "تباعد الكلمات (النص العربي)" : "تباعد الحروف"}
        value={element.letterSpacing ?? 0}
        min={-5}
        max={20}
        step={0.5}
        unit="px"
        onChange={(v: number) => onUpdate(element.id, { letterSpacing: v })}
        onCommit={() => useEditorStore.getState().pushHistory()}
      />
    </div>
  );
});

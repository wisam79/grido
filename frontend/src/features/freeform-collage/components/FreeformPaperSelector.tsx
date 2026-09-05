import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Ruler } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

import { COMMON_PAPER_PRESETS } from "./freeform-paper-presets";

const clampPaperDim = (value: number): number => {
  if (!Number.isFinite(value)) return 20;
  return Math.min(1000, Math.max(20, Math.round(value)));
};

interface PaperDimInputProps {
  value: number;
  onCommit: (v: number) => void;
  ariaLabel: string;
}

/**
 * حقل إدخال أبعاد الورقة المليمتري المتوافق مع معايير Fluent 2
 */
export const PaperDimInput: React.FC<PaperDimInputProps> = ({ value, onCommit, ariaLabel }) => {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) setText(String(value));
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      dir="ltr"
      aria-label={ariaLabel}
      value={text}
      className="h-7 text-[11px] rounded-md w-[54px] font-mono font-bold text-center bg-background border-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all"
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
      onBlur={() => {
        setFocused(false);
        const v = clampPaperDim(Number(text || "0"));
        setText(String(v));
        onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
    />
  );
};

interface FreeformPaperSelectorProps {
  paperWidthMM: number;
  paperHeightMM: number;
  onPaperDimensionsChange: (widthMM: number, heightMM: number) => void;
  className?: string;
}

export const FreeformPaperSelector: React.FC<FreeformPaperSelectorProps> = React.memo(function FreeformPaperSelector({
  paperWidthMM,
  paperHeightMM,
  onPaperDimensionsChange,
  className,
}) {
  const currentPresetId =
    COMMON_PAPER_PRESETS.find(
      (p) =>
        (p.w === paperWidthMM && p.h === paperHeightMM) ||
        (p.w === paperHeightMM && p.h === paperWidthMM)
    )?.id || "custom";

  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 text-xs font-cairo shadow-2xs fluent-specular",
        className
      )}
    >
      <Ruler className="w-3.5 h-3.5 text-primary shrink-0" weight="duotone" />
      <span className="font-semibold text-muted-foreground shrink-0">ورق جاهز:</span>

      <Select
        value={currentPresetId}
        onValueChange={(val) => {
          const found = COMMON_PAPER_PRESETS.find((p) => p.id === val);
          if (found) {
            onPaperDimensionsChange(found.w, found.h);
          }
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-7 text-xs font-semibold rounded-md bg-background border-border/60 min-w-[140px] shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <SelectValue placeholder="اختر قياس..." />
        </SelectTrigger>
        <SelectContent className="font-cairo z-[150] rounded-xl border-border/60">
          <SelectItem value="custom" className="text-xs font-semibold rounded-md">
            مخصص (أرقام)
          </SelectItem>
          {COMMON_PAPER_PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs font-semibold rounded-md">
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="h-3.5 w-px bg-border/60 mx-0.5 shrink-0" />

      <div className="flex items-center gap-1 font-mono shrink-0" dir="ltr">
        <PaperDimInput
          value={paperWidthMM}
          ariaLabel="عرض الورقة بالمليمتر"
          onCommit={(w) => onPaperDimensionsChange(w, paperHeightMM)}
        />
        <span className="text-xs font-extrabold text-muted-foreground">×</span>
        <PaperDimInput
          value={paperHeightMM}
          ariaLabel="ارتفاع الورقة بالمليمتر"
          onCommit={(h) => onPaperDimensionsChange(paperWidthMM, h)}
        />
        <span className="text-[11px] font-semibold text-muted-foreground">مم</span>
      </div>
    </div>
  );
});

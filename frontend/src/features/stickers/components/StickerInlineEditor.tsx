import React, { useEffect, useMemo, useRef } from "react";
import { TextAa, X, Check, ArrowCounterClockwise, CaretUp, CaretDown } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StickerTemplate, StickerField } from "../types";

/** هدف التحرير النشط — القيم تُقرأ لحظياً من params في المكوّن الأم */
export interface ActiveFieldState {
  fieldId: string;
  x: number;
  y: number;
}

export interface ActiveColorState {
  role: "primary" | "secondary" | "background";
  label: string;
  currentColor: string;
  x: number;
  y: number;
}

interface StickerInlineEditorProps {
  activeField: ActiveFieldState | null;
  activeColor: ActiveColorState | null;
  template: StickerTemplate;
  /** قيمة الحقل النشط لحظة العرض — تُقرأ من المصدر لدى المكوّن الأم */
  activeFieldValue?: string;
  onClose: () => void;
  onChangeFieldValue: (fieldId: string, value: string) => void;
  onChangeColor: (role: "primary" | "secondary" | "background", color: string) => void;
  onResetField?: (fieldId: string) => void;
}

const QUICK_COLORS = [
  "#3B82F6", // Fluent Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Crimson
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#0F172A", // Dark Slate
  "#FFFFFF", // Pure White
];

export const StickerInlineEditor = React.memo(function StickerInlineEditor({
  activeField,
  activeColor,
  template,
  activeFieldValue = "",
  onClose,
  onChangeFieldValue,
  onChangeColor,
  onResetField,
}: StickerInlineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fieldId = activeField?.fieldId;
  const activeFieldDef: StickerField | undefined = useMemo(
    () => template.fields.find((f) => f.id === fieldId),
    [template.fields, fieldId]
  );

  // Auto-focus input when field opens
  useEffect(() => {
    if (activeField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeField]);

  // Handle outside click to close
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);

  /** تنقل بين حقول القالب بالترتيب (Tab / Enter + أسهم لوحة المفاتيح) */
  const stepField = (dir: 1 | -1) => {
    if (!activeField) return;
    const ids = template.fields.map((f) => f.id);
    const idx = ids.indexOf(activeField.fieldId);
    if (idx === -1) return;
    const nextIdx = (idx + dir + ids.length) % ids.length;
    const nextId = ids[nextIdx];
    if (nextId === activeField.fieldId) return;
    // نفتح الحقل التالي عبر محاكاة النقر على عنصره في الـ SVG
    const host = containerRef.current?.parentElement?.querySelector(".sticker-svg-interactive");
    const nextEl = host?.querySelector(`[data-field-id="${nextId}"]`) as SVGElement | null;
    if (nextEl) {
      (nextEl as unknown as HTMLElement).click?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      stepField(1);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      stepField(-1);
    }
  };

  if (!activeField && !activeColor) return null;

  const width = activeField ? 300 : 264;
  const estimateH = activeField ? 200 : 216;

  // حدود المسرح (الحاوية الأم) لتثبيت النافذة داخله
  const stageEl = containerRef.current?.parentElement ?? null;
  const stageW = stageEl?.clientWidth ?? 0;
  const stageH = stageEl?.clientHeight ?? 0;

  const active = activeField ?? activeColor!;
  const left = stageW
    ? Math.min(Math.max(8, active.x - width / 2), Math.max(8, stageW - width - 8))
    : Math.max(12, active.x - width / 2);
  const top = stageH
    ? Math.min(Math.max(8, active.y - estimateH), Math.max(8, stageH - estimateH - 8))
    : Math.max(12, active.y - estimateH);

  const shellClass =
    "absolute z-40 bg-card/95 dark:bg-card/90 backdrop-blur-2xl border border-primary/40 rounded-xl shadow-fluent-16 p-3 animate-in fade-in zoom-in-95 duration-150 select-none text-start font-cairo";

  // ── Text Field Editor Popover ──
  if (activeField) {
    return (
      <div
        ref={containerRef}
        dir="rtl"
        className={shellClass}
        style={{ width, left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/30 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <TextAa className="w-3.5 h-3.5" weight="bold" />
            </span>
            <span>{activeFieldDef?.label ?? activeField.fieldId}</span>
          </div>

          <div className="flex items-center gap-1">
            {onResetField && (
              <button
                type="button"
                onClick={() => onResetField(activeField.fieldId)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                title="استعادة الافتراضي"
              >
                <ArrowCounterClockwise className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
              title="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="mt-2.5">
          <Input
            ref={inputRef}
            value={activeFieldValue}
            onChange={(e) => onChangeFieldValue(activeField.fieldId, e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeFieldDef?.placeholder || activeFieldDef?.label || ""}
            className="h-8 text-xs font-semibold bg-muted/40 border-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none rounded-md"
          />
        </div>

        {/* Footer: Field Navigation + Confirm */}
        <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-1 text-micro text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => stepField(-1)}
                className="p-0.5 rounded-md hover:bg-muted/60 hover:text-foreground cursor-pointer"
                title="الحقل السابق (Shift+Tab)"
              >
                <CaretUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => stepField(1)}
                className="p-0.5 rounded-md hover:bg-muted/60 hover:text-foreground cursor-pointer"
                title="الحقل التالي (Tab)"
              >
                <CaretDown className="w-3.5 h-3.5" />
              </button>
            </span>
            <span className="ms-1 font-mono">
              {template.fields.findIndex((f) => f.id === activeField.fieldId) + 1} / {template.fields.length}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="h-7 px-3 text-xs font-bold rounded-md bg-primary text-primary-foreground cursor-pointer gap-1"
          >
            <Check className="w-3.5 h-3.5" weight="bold" />
            تم
          </Button>
        </div>
      </div>
    );
  }

  // ── Color Role Editor Popover ──
  return (
    <div
      ref={containerRef}
      dir="rtl"
      className={shellClass}
      style={{ width, left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/30 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <span
            className="w-3.5 h-3.5 rounded-full border border-border/50"
            style={{ backgroundColor: activeColor!.currentColor }}
          />
          <span>{activeColor!.label}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Swatches */}
      <div className="grid grid-cols-4 gap-1.5 mt-2.5">
        {QUICK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChangeColor(activeColor!.role, c)}
            className={cn(
              "h-7 rounded-md border flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-xs",
              activeColor!.currentColor.toLowerCase() === c.toLowerCase()
                ? "border-primary ring-2 ring-primary/40"
                : "border-border/60"
            )}
            style={{ backgroundColor: c }}
          >
            {activeColor!.currentColor.toLowerCase() === c.toLowerCase() && (
              <Check
                className={cn("w-3.5 h-3.5 font-bold", c === "#FFFFFF" ? "text-black" : "text-white")}
                weight="bold"
              />
            )}
          </button>
        ))}
      </div>

      {/* Custom Hex Input */}
      <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center gap-1.5">
        <input
          type="color"
          value={activeColor!.currentColor}
          onChange={(e) => onChangeColor(activeColor!.role, e.target.value)}
          className="w-8 h-8 rounded-md border border-border/60 cursor-pointer bg-transparent shrink-0"
        />
        <Input
          value={activeColor!.currentColor}
          onChange={(e) => onChangeColor(activeColor!.role, e.target.value)}
          dir="ltr"
          className="h-8 text-xs font-mono font-bold uppercase bg-muted/40 border-border/50 rounded-md flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={onClose}
          className="h-8 px-3 text-xs font-bold rounded-md bg-primary text-primary-foreground shrink-0 cursor-pointer"
        >
          تم
        </Button>
      </div>
    </div>
  );
});

StickerInlineEditor.displayName = "StickerInlineEditor";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Sparkle,
  ArrowsCounterClockwise,
  ArrowClockwise,
  ArrowCounterClockwise,
  IdentificationCard,
  Crop,
  Plus,
  Copy,
  Scan,
  Lightning,
  MagicWand,
  Drop,
  CheckSquareOffset,
  Circle,
  SquaresFour,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DetectedDocument, DocumentAspectType, ScannerFilterMode, DetectionMode } from "../core";
import { DocumentListItem } from "./document-list-item";

export interface ScannerSidebarProps {
  detectionMode?: DetectionMode;
  onModeChange?: (mode: DetectionMode) => void;
  detectedDocs: DetectedDocument[];
  activeDocIndex: number;
  selectedDocIds: string[];
  onSelectDoc: (index: number) => void;
  onToggleCheckDoc: (id: string) => void;
  onSelectAllDocs: () => void;
  onAddDocument?: () => void;
  onDeleteDoc?: (id: string) => void;
  onSplitIdCards?: () => void;
  isDetecting: boolean;
  onAutoDetect: (mode?: DetectionMode) => void;
  onReset: () => void;
  filterMode: ScannerFilterMode;
  onFilterChange: (mode: ScannerFilterMode) => void;
  aspectType: DocumentAspectType;
  onAspectChange: (aspect: DocumentAspectType) => void;
  rotation?: number;
  onRotateClockwise?: () => void;
  onRotateCounterClockwise?: () => void;
}

export const ScannerSidebar: React.FC<ScannerSidebarProps> = ({
  detectionMode = "single",
  onModeChange,
  detectedDocs,
  activeDocIndex,
  selectedDocIds,
  onSelectDoc,
  onToggleCheckDoc,
  onSelectAllDocs,
  onAddDocument,
  onDeleteDoc,
  onSplitIdCards,
  isDetecting,
  onAutoDetect,
  onReset,
  filterMode,
  onFilterChange,
  aspectType,
  onAspectChange,
  rotation = 0,
  onRotateClockwise,
  onRotateCounterClockwise,
}) => {
  const isAllSelected = detectedDocs.length > 0 && selectedDocIds.length === detectedDocs.length;
  const isMultiActive = detectionMode === "multi" || detectedDocs.length > 1;

  return (
    <div className="w-full md:w-72 flex flex-col gap-3 shrink-0 bg-card/60 dark:bg-card/40 p-3 rounded-2xl border border-border/60 overflow-y-auto h-full min-h-0 fluent-specular select-none custom-scrollbar">
      {/* 🔹 1. محدد نمط المسح (المسح المفرد الافتراضي vs المسح المتعدد الثانوي) */}
      <div className="space-y-2 bg-muted/40 dark:bg-muted/20 p-2.5 rounded-xl border border-border/50">
        <div className="flex items-center justify-between">
          <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
            <Scan size={15} weight="duotone" className="text-primary shrink-0" />
            <span>نمط المسح</span>
          </Label>
          <span className="text-[10px] text-muted-foreground font-semibold">
            {detectionMode === "single" ? "مستند واحد" : "متعدد البطاقات"}
          </span>
        </div>

        {/* التبديل بين المفرد (الافتراضي) والمتعدد (الثانوي) */}
        <div className="grid grid-cols-2 p-1 bg-background/80 dark:bg-background/40 rounded-lg border border-border/40 gap-1">
          <button
            type="button"
            onClick={() => {
              onModeChange?.("single");
              onAutoDetect("single");
            }}
            disabled={isDetecting}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer select-none",
              detectionMode === "single"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Sparkle size={13} weight={detectionMode === "single" ? "fill" : "bold"} className="shrink-0" />
            <span>مسح مفرد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onModeChange?.("multi");
              onAutoDetect("multi");
            }}
            disabled={isDetecting}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer select-none",
              detectionMode === "multi"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <SquaresFour size={13} weight={detectionMode === "multi" ? "fill" : "bold"} className="shrink-0" />
            <span>مسح متعدد</span>
          </button>
        </div>

        {/* أزرار الإجراء السريعة للكشف */}
        <div className="pt-1">
          {detectionMode === "single" ? (
            <Button
              variant="default"
              size="sm"
              className="w-full h-8.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.99]"
              onClick={() => onAutoDetect("single")}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <ArrowClockwise size={14} weight="bold" className="shrink-0 animate-spin" />
              ) : (
                <Sparkle size={15} weight="fill" className="shrink-0" />
              )}
              <span>{isDetecting ? "جاري الكشف ..." : "كشف تلقائي ذكي"}</span>
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="default"
                size="sm"
                className="h-8.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.99]"
                onClick={() => onAutoDetect("multi")}
                disabled={isDetecting}
              >
                {isDetecting ? (
                  <ArrowClockwise size={14} weight="bold" className="shrink-0 animate-spin" />
                ) : (
                  <Scan size={14} weight="bold" className="shrink-0" />
                )}
                <span>كشف متعدد</span>
              </Button>

              {onSplitIdCards && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 rounded-lg border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer active:scale-[0.99]"
                  onClick={onSplitIdCards}
                  disabled={isDetecting}
                >
                  <Copy size={13} weight="bold" className="shrink-0" />
                  <span>تقسيم بطاقتين</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🔹 2. قائمة المستندات المتعددة المكتشفة (تظهر عند المسح المتعدد أو عند وجود أكثر من مستند) */}
      {isMultiActive && (
        <div className="space-y-2 bg-emerald-950/15 dark:bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/30 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <Label className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <FileText size={15} weight="duotone" className="shrink-0" />
              <span>المستندات المكتشفة ({detectedDocs.length})</span>
            </Label>
            <div className="flex items-center gap-1">
              {detectedDocs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                  onClick={onSelectAllDocs}
                >
                  {isAllSelected ? "إلغاء الكل" : "تحديد الكل"}
                </Button>
              )}
              {onAddDocument && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer flex items-center gap-0.5"
                      onClick={onAddDocument}
                    >
                      <Plus size={12} weight="bold" />
                      <span>إضافة</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">إضافة مستند أو بطاقة إضافية يدوياً</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {detectedDocs.length > 0 && (
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-0.5 custom-scrollbar">
              {detectedDocs.map((doc, idx) => (
                <DocumentListItem
                  key={doc.id}
                  doc={doc}
                  index={idx}
                  isActive={activeDocIndex === idx}
                  isSelected={selectedDocIds.includes(doc.id)}
                  canDelete={detectedDocs.length > 1}
                  onSelect={onSelectDoc}
                  onToggleCheck={onToggleCheckDoc}
                  onDelete={onDeleteDoc}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🔹 3. معالجة وتصفية الورقة (6 فلاتر نقية) */}
      <div className="space-y-2 bg-muted/40 dark:bg-muted/20 p-2.5 rounded-xl border border-border/50">
        <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
          <MagicWand size={15} weight="duotone" className="text-primary shrink-0" />
          <span>تصفية ومعالجة الورقة</span>
        </Label>
        <div className="grid grid-cols-2 gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "original" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg text-xs font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/50",
                  filterMode === "original"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80 bg-background/60"
                )}
                onClick={() => onFilterChange("original")}
              >
                <FileText size={14} weight={filterMode === "original" ? "fill" : "regular"} className="shrink-0" />
                <span>أصلي</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">الاحتفاظ بألوان وإضاءة الصورة الأصلية</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "magic" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg text-xs font-bold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/50",
                  filterMode === "magic"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "hover:bg-accent/60 text-foreground/80 bg-background/60"
                )}
                onClick={() => onFilterChange("magic")}
              >
                <Sparkle size={14} weight={filterMode === "magic" ? "fill" : "duotone"} className="shrink-0 text-amber-400" />
                <span>تلقائي ذكي</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">تبييض الورقة وإزالة الظلال وتوضيح النصوص</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "grayscale" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg text-xs font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/50",
                  filterMode === "grayscale"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80 bg-background/60"
                )}
                onClick={() => onFilterChange("grayscale")}
              >
                <Circle size={14} weight={filterMode === "grayscale" ? "fill" : "regular"} className="shrink-0 text-muted-foreground" />
                <span>تدرج رمادي</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">تدرج رمادي ناعم لطباعة الليزر</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "bw" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg text-xs font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/50",
                  filterMode === "bw"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80 bg-background/60"
                )}
                onClick={() => onFilterChange("bw")}
              >
                <CheckSquareOffset size={14} weight={filterMode === "bw" ? "fill" : "regular"} className="shrink-0" />
                <span>أبيض وأسود</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">عزل ثنائي عالي التباين للنصوص الرسمية</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "sharpen" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg text-xs font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/50",
                  filterMode === "sharpen"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80 bg-background/60"
                )}
                onClick={() => onFilterChange("sharpen")}
              >
                <Lightning size={14} weight={filterMode === "sharpen" ? "fill" : "duotone"} className="shrink-0 text-cyan-500" />
                <span>شحذ النصوص</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">شحذ فائق للحروف الدقيقة والأختام والباركود</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filterMode === "deyellow" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg text-xs font-semibold justify-start px-2.5 gap-2 cursor-pointer transition-all border-border/50",
                  filterMode === "deyellow"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "hover:bg-accent/60 text-foreground/80 bg-background/60"
                )}
                onClick={() => onFilterChange("deyellow")}
              >
                <Drop size={14} weight={filterMode === "deyellow" ? "fill" : "duotone"} className="shrink-0 text-orange-500" />
                <span>إزالة الاصفرار</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">إزالة الاصفرار من الورق القديم والوثائق التاريخية</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 🔹 4. قياس ونسبة المستند */}
      <div className="space-y-2 bg-muted/40 dark:bg-muted/20 p-2.5 rounded-xl border border-border/50">
        <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
          <Crop size={15} weight="duotone" className="text-primary shrink-0" />
          <span>قياس ونسبة المستند</span>
        </Label>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant={aspectType === "free" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-lg text-xs font-bold cursor-pointer transition-all border-border/50",
              aspectType === "free"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "hover:bg-accent/60 text-foreground/80 bg-background/60"
            )}
            onClick={() => onAspectChange("free")}
          >
            حر
          </Button>

          <Button
            variant={aspectType === "a4_p" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-lg text-xs font-semibold cursor-pointer transition-all border-border/50",
              aspectType === "a4_p"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "hover:bg-accent/60 text-foreground/80 bg-background/60"
            )}
            onClick={() => onAspectChange("a4_p")}
          >
            A4 طولي
          </Button>

          <Button
            variant={aspectType === "a4_l" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-lg text-xs font-semibold cursor-pointer transition-all border-border/50",
              aspectType === "a4_l"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "hover:bg-accent/60 text-foreground/80 bg-background/60"
            )}
            onClick={() => onAspectChange("a4_l")}
          >
            A4 عرضي
          </Button>

          <Button
            variant={aspectType === "id_card" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all border-border/50",
              aspectType === "id_card"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "hover:bg-accent/60 text-foreground/80 bg-background/60"
            )}
            onClick={() => onAspectChange("id_card")}
          >
            <IdentificationCard size={14} weight={aspectType === "id_card" ? "fill" : "regular"} className="shrink-0" />
            <span>بطاقة هوية</span>
          </Button>
        </div>
      </div>

      {/* 🔹 5. تدوير المستند وإعادة الضبط */}
      <div className="space-y-2 bg-muted/40 dark:bg-muted/20 p-2.5 rounded-xl border border-border/50">
        <div className="flex items-center justify-between">
          <Label className="text-[11.5px] font-bold text-foreground/90 flex items-center gap-1.5">
            <ArrowClockwise size={15} weight="duotone" className="text-primary shrink-0" />
            <span>التدوير والضبط</span>
          </Label>
          {(((rotation % 360) + 360) % 360) !== 0 && (
            <span className="text-[10px] font-mono text-primary font-bold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
              {((rotation % 360) + 360) % 360}°
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRotateCounterClockwise}
                className="h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-border/50 bg-background/60 hover:bg-accent"
              >
                <ArrowCounterClockwise size={13} weight="bold" className="shrink-0 text-muted-foreground" />
                <span>90° يساراً</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">تدوير المستند 90 درجة عكس عقارب الساعة</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRotateClockwise}
                className="h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-border/50 bg-background/60 hover:bg-accent"
              >
                <ArrowClockwise size={13} weight="bold" className="shrink-0 text-muted-foreground" />
                <span>90° يميناً</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">تدوير المستند 90 درجة مع عقارب الساعة</TooltipContent>
          </Tooltip>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 rounded-lg border-border/50 hover:bg-accent text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer bg-background/60 mt-1"
          onClick={onReset}
          disabled={isDetecting}
        >
          <ArrowsCounterClockwise size={13} weight="bold" className="text-muted-foreground shrink-0" />
          <span>إعادة ضبط الأركان</span>
        </Button>
      </div>
    </div>
  );
};
